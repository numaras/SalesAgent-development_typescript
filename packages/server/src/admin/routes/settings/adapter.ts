import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs, type NewAdapterConfig } from "../../../db/schema/adapterConfigs.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

function asStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asOptStr(value: unknown): string | null {
  const s = asStr(value);
  return s.length > 0 ? s : null;
}

function asBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    return lower === "true" || lower === "on" || lower === "1";
  }
  return false;
}

const adapterSettingsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/tenant/:id/settings/adapter", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);
    const body = (request.body ?? {}) as Record<string, unknown>;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, adServer: tenants.adServer })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) {
      return reply.code(404).send({ success: false, error: "Tenant not found" });
    }

    const requestedAdapter = asOptStr(body["adapter"]);
    const newAdapter = requestedAdapter ?? tenant.adServer;
    if (!newAdapter) {
      return reply.code(400).send({ success: false, error: "No adapter configured" });
    }

    // ── AXE keys (adapter-agnostic) ───────────────────────────────────────
    const axeIncludeKey = asOptStr(body["axe_include_key"]);
    const axeExcludeKey = asOptStr(body["axe_exclude_key"]);
    const axeMacroKey = asOptStr(body["axe_macro_key"]);

    // Build typed upsert objects
    const insertValues: NewAdapterConfig = {
      tenantId: id,
      adapterType: newAdapter,
      updatedAt: new Date(),
      ...(axeIncludeKey !== null ? { axeIncludeKey } : {}),
      ...(axeExcludeKey !== null ? { axeExcludeKey } : {}),
      ...(axeMacroKey !== null ? { axeMacroKey } : {}),
    };

    // Separate partial object for the conflict-update set
    const updateSet: Partial<NewAdapterConfig> = {
      adapterType: newAdapter,
      updatedAt: new Date(),
      ...(axeIncludeKey !== null ? { axeIncludeKey } : {}),
      ...(axeExcludeKey !== null ? { axeExcludeKey } : {}),
      ...(axeMacroKey !== null ? { axeMacroKey } : {}),
    };

    // ── Adapter-specific fields ───────────────────────────────────────────
    if (newAdapter === "google_ad_manager") {
      const action = asOptStr(body["action"]);

      if (action === "edit_config") {
        // Clear network code + trafficker so UI shows config wizard again (preserves refresh token)
        insertValues.gamNetworkCode = null;
        insertValues.gamTrafickerId = null;
        updateSet.gamNetworkCode = null;
        updateSet.gamTrafickerId = null;
      } else {
        const networkCode = asOptStr(body["gam_network_code"]);
        const refreshToken = asOptStr(body["gam_refresh_token"]);
        const traffickerId = asOptStr(body["gam_trafficker_id"]);
        const orderNameTemplate = asOptStr(body["order_name_template"]);
        const lineItemNameTemplate = asOptStr(body["line_item_name_template"]);
        const manualApproval = asBool(body["gam_manual_approval"]);
        const networkCurrencyRaw = asOptStr(body["network_currency"]);
        const networkCurrency = networkCurrencyRaw
          ? networkCurrencyRaw.slice(0, 3).toUpperCase()
          : null;
        const rawSecondary = body["secondary_currencies"];
        const secondaryCurrencies = Array.isArray(rawSecondary)
          ? rawSecondary
              .filter((c): c is string => Boolean(c))
              .map((c) => String(c).trim().slice(0, 3).toUpperCase())
          : [];
        const networkTimezone = asOptStr(body["network_timezone"])?.slice(0, 100) ?? null;

        insertValues.gamManualApprovalRequired = manualApproval;
        updateSet.gamManualApprovalRequired = manualApproval;

        if (networkCode) { insertValues.gamNetworkCode = networkCode; updateSet.gamNetworkCode = networkCode; }
        if (refreshToken) { insertValues.gamRefreshToken = refreshToken; updateSet.gamRefreshToken = refreshToken; }
        if (traffickerId) { insertValues.gamTrafickerId = traffickerId; updateSet.gamTrafickerId = traffickerId; }
        if (orderNameTemplate) { insertValues.gamOrderNameTemplate = orderNameTemplate; updateSet.gamOrderNameTemplate = orderNameTemplate; }
        if (lineItemNameTemplate) { insertValues.gamLineItemNameTemplate = lineItemNameTemplate; updateSet.gamLineItemNameTemplate = lineItemNameTemplate; }
        if (networkCurrency) { insertValues.gamNetworkCurrency = networkCurrency; updateSet.gamNetworkCurrency = networkCurrency; }
        if (secondaryCurrencies.length > 0) { insertValues.gamSecondaryCurrencies = secondaryCurrencies; updateSet.gamSecondaryCurrencies = secondaryCurrencies; }
        if (networkTimezone) { insertValues.gamNetworkTimezone = networkTimezone; updateSet.gamNetworkTimezone = networkTimezone; }
      }
    } else if (newAdapter === "mock") {
      const dryRun = asBool(body["mock_dry_run"]);
      const manualApproval = asBool(body["mock_manual_approval"]);
      insertValues.mockDryRun = dryRun;
      insertValues.mockManualApprovalRequired = manualApproval;
      updateSet.mockDryRun = dryRun;
      updateSet.mockManualApprovalRequired = manualApproval;
    }

    await db
      .insert(adapterConfigs)
      .values(insertValues)
      .onConflictDoUpdate({
        target: adapterConfigs.tenantId,
        set: updateSet,
      });

    await db
      .update(tenants)
      .set({ adServer: newAdapter, updatedAt: new Date() })
      .where(eq(tenants.tenantId, id));

    const actor = typeof session.user === "string" ? session.user : "unknown";
    try {
      await db.insert(auditLogs).values({
        tenantId: id,
        operation: "update_adapter",
        principalName: actor,
        adapterId: "admin_ui",
        success: true,
        details: { event_type: "update_adapter", adapter: newAdapter },
      });
    } catch { /* audit failure must not block response */ }

    return reply.send({
      success: true,
      adapter: newAdapter,
      message: `Adapter updated to ${newAdapter}`,
    });
  });
};

export default adapterSettingsRoute;
