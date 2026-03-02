import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { currencyLimits } from "../../../db/schema/currencyLimits.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBooleanFlag(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    return lower === "true" || lower === "on" || lower === "1";
  }
  return false;
}

function normalizeCurrencyCode(code: string): string | null {
  const normalized = code.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

/**
 * Mirrors Python is_valid_currency_code() — uses Intl (ICU) to reject non-ISO-4217 codes.
 * Babel returns the code itself for unknown currencies; Intl throws RangeError.
 */
function isValidCurrencyCode(code: string): boolean {
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: code });
    return true;
  } catch {
    return false;
  }
}

async function upsertCurrencyLimitsFromBody(
  tenantId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const raw = body["currency_limits"];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return;
  }
  const limitsMap = raw as Record<string, unknown>;
  for (const [rawCode, rawLimit] of Object.entries(limitsMap)) {
    const code = normalizeCurrencyCode(rawCode);
    if (!code || !rawLimit || typeof rawLimit !== "object" || Array.isArray(rawLimit)) {
      continue;
    }
    if (!isValidCurrencyCode(code)) {
      continue;
    }
    const limit = rawLimit as Record<string, unknown>;
    if (asBooleanFlag(limit["_delete"])) {
      await db
        .delete(currencyLimits)
        .where(and(eq(currencyLimits.tenantId, tenantId), eq(currencyLimits.currencyCode, code)));
      continue;
    }

    const minRaw = asNonEmptyString(limit["min_package_budget"]);
    const maxRaw = asNonEmptyString(limit["max_daily_package_spend"]);
    await db
      .insert(currencyLimits)
      .values({
        tenantId,
        currencyCode: code,
        minPackageBudget: minRaw,
        maxDailyPackageSpend: maxRaw,
      })
      .onConflictDoUpdate({
        target: [currencyLimits.tenantId, currencyLimits.currencyCode],
        set: {
          minPackageBudget: minRaw,
          maxDailyPackageSpend: maxRaw,
          updatedAt: new Date(),
        },
      });
  }
}

async function handleGeneralUpdate(
  tenantId: string,
  body: Record<string, unknown>,
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const name = asNonEmptyString(body["name"]);
  if (!name) {
    return { status: 400, payload: { error: "Tenant name is required" } };
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.tenantId, tenantId))
    .limit(1);
  if (!tenant) {
    return { status: 404, payload: { error: "Tenant not found" } };
  }

  // Python update_general does NOT update subdomain or billing_plan
  const virtualHost = asNonEmptyString(body["virtual_host"]);

  if (virtualHost) {
    if (
      virtualHost.includes("..") ||
      virtualHost.startsWith(".") ||
      virtualHost.endsWith(".")
    ) {
      return {
        status: 400,
        payload: { error: "Virtual host cannot contain consecutive/start/end dots" },
      };
    }
    if (!virtualHost.replace(/[-._]/g, "").match(/^[a-zA-Z0-9]+$/)) {
      return {
        status: 400,
        payload: {
          error:
            "Virtual host must contain only alphanumeric characters, dots, hyphens, and underscores",
        },
      };
    }
    const [existingVirtualHost] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.virtualHost, virtualHost))
      .limit(1);
    if (existingVirtualHost && existingVirtualHost.tenantId !== tenantId) {
      return {
        status: 409,
        payload: { error: "This virtual host is already in use by another tenant" },
      };
    }
  }

  await db
    .update(tenants)
    .set({
      name,
      virtualHost: virtualHost ?? null,
      enableAxeSignals: asBooleanFlag(body["enable_axe_signals"]),
      humanReviewRequired: asBooleanFlag(body["human_review_required"]),
      updatedAt: new Date(),
    })
    .where(eq(tenants.tenantId, tenantId));

  await upsertCurrencyLimitsFromBody(tenantId, body);
  return {
    status: 200,
    payload: {
      success: true,
      message: "General settings updated successfully",
    },
  };
}

const generalSettingsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/settings/general", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({
        tenant_id: tenants.tenantId,
        name: tenants.name,
        subdomain: tenants.subdomain,
        billing_plan: tenants.billingPlan,
        virtual_host: tenants.virtualHost,
        enable_axe_signals: tenants.enableAxeSignals,
        human_review_required: tenants.humanReviewRequired,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) {
      return reply.code(404).send({ error: "Tenant not found" });
    }

    const limits = await db
      .select({
        currency_code: currencyLimits.currencyCode,
        min_package_budget: currencyLimits.minPackageBudget,
        max_daily_package_spend: currencyLimits.maxDailyPackageSpend,
      })
      .from(currencyLimits)
      .where(eq(currencyLimits.tenantId, id));

    return reply.send({ tenant, currency_limits: limits });
  });

  fastify.post("/tenant/:id/settings/general", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const result = await handleGeneralUpdate(id, body);
    if (result.status === 200) {
      const actor = typeof session.user === "string" ? session.user : "unknown";
      try {
        await db.insert(auditLogs).values({
          tenantId: id,
          operation: "update_general_settings",
          principalName: actor,
          adapterId: "admin_ui",
          success: true,
          details: { event_type: "update_general_settings" },
        });
      } catch { /* audit failure must not block response */ }
    }
    return reply.code(result.status).send(result.payload);
  });

  fastify.post("/tenant/:id/update", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const result = await handleGeneralUpdate(id, body);
    if (result.status === 200) {
      const actor = typeof session.user === "string" ? session.user : "unknown";
      try {
        await db.insert(auditLogs).values({
          tenantId: id,
          operation: "update_general_settings",
          principalName: actor,
          adapterId: "admin_ui",
          success: true,
          details: { event_type: "update_general_settings" },
        });
      } catch { /* audit failure must not block response */ }
    }
    return reply.code(result.status).send(result.payload);
  });
};

export default generalSettingsRoute;
