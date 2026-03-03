/**
 * Tenant Management API. Parity with _legacy/src/admin/tenant_management_api.py
 * Register with prefix: /api/v1/tenant-management
 * Auth: X-Tenant-Management-API-Key header (stored in superadmin_config).
 */
import { count, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomBytes } from "node:crypto";

import { db } from "../../db/client.js";
import { adapterConfigs } from "../../db/schema/adapterConfigs.js";
import { auditLogs } from "../../db/schema/auditLogs.js";
import { mediaBuys } from "../../db/schema/mediaBuys.js";
import { principals } from "../../db/schema/principals.js";
import { products } from "../../db/schema/products.js";
import { tenantManagementConfig } from "../../db/schema/tenantManagementConfig.js";
import { tenants } from "../../db/schema/tenants.js";
import { users } from "../../db/schema/users.js";
import type { NewAdapterConfig } from "../../db/schema/adapterConfigs.js";
import type { NewTenant } from "../../db/schema/tenants.js";

const API_KEY_CONFIG_KEY = "tenant_management_api_key";
const BOOTSTRAP_KEY_ENV = "TENANT_MANAGEMENT_BOOTSTRAP_KEY";
const BOOTSTRAP_KEY_HEADER = "x-tenant-management-bootstrap-key";

// ── SSRF protection — mirrors Python WebhookURLValidator ────────────────────── //

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "169.254.169.254",
  "metadata",
  "instance-data",
]);

const BLOCKED_CIDRS = [
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "127.0.0.0/8",
  "169.254.0.0/16",
];

function ipToUint32(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return (((nums[0]! << 24) | (nums[1]! << 16) | (nums[2]! << 8) | nums[3]!) >>> 0);
}

function isInCidr(ip: string, cidr: string): boolean {
  const slashIdx = cidr.lastIndexOf("/");
  const networkStr = cidr.slice(0, slashIdx);
  const prefix = parseInt(cidr.slice(slashIdx + 1), 10);
  const networkNum = ipToUint32(networkStr);
  const ipNum = ipToUint32(ip);
  if (networkNum === null || ipNum === null) return false;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipNum & mask) === (networkNum & mask);
}

function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "Webhook URL must use http or https protocol" };
  }
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) return { valid: false, error: "Webhook URL must have a valid hostname" };
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, error: `Hostname '${hostname}' is blocked for security reasons` };
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    for (const cidr of BLOCKED_CIDRS) {
      if (isInCidr(hostname, cidr)) {
        return { valid: false, error: `IP address ${hostname} falls in blocked range ${cidr}` };
      }
    }
  }
  return { valid: true };
}

// ── API key auth ─────────────────────────────────────────────────────────────── //

function getHeader(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const v = headers[name];
  return Array.isArray(v) ? v[0] : v;
}

async function requireApiKey(
  request: { headers: Record<string, string | string[] | undefined> },
  reply: { code: (n: number) => { send: (p: object) => unknown } }
): Promise<string | null> {
  const apiKey = getHeader(request.headers, "x-tenant-management-api-key");
  if (!apiKey) {
    reply.code(401).send({ error: "Missing API key" });
    return null;
  }
  const [row] = await db
    .select({ configValue: tenantManagementConfig.configValue })
    .from(tenantManagementConfig)
    .where(eq(tenantManagementConfig.configKey, API_KEY_CONFIG_KEY))
    .limit(1);
  if (!row?.configValue) {
    reply.code(503).send({ error: "API not configured" });
    return null;
  }
  if (apiKey !== row.configValue) {
    reply.code(401).send({ error: "Invalid API key" });
    return null;
  }
  return row.configValue;
}

const WEBHOOK_FIELDS: Record<string, string> = {
  slack_webhook_url: "Slack webhook URL",
  slack_audit_webhook_url: "Slack audit webhook URL",
  hitl_webhook_url: "HITL webhook URL",
};

const tenantManagementApiRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/health", async (request, reply) => {
    const _key = await requireApiKey(request, reply);
    if (_key === null) return;
    return reply.send({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  });

  // GET /tenants — ordered DESC by created_at, mirrors Python Tenant.created_at.desc()
  fastify.get("/tenants", async (request, reply) => {
    const _key = await requireApiKey(request, reply);
    if (_key === null) return;

    const allTenants = await db
      .select({
        tenantId: tenants.tenantId,
        name: tenants.name,
        subdomain: tenants.subdomain,
        isActive: tenants.isActive,
        billingPlan: tenants.billingPlan,
        adServer: tenants.adServer,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .orderBy(desc(tenants.createdAt));

    const adapterTenantIds = new Set(
      (await db.select({ tenantId: adapterConfigs.tenantId }).from(adapterConfigs)).map(
        (r) => r.tenantId
      )
    );

    const results = allTenants.map((t) => ({
      tenant_id: t.tenantId,
      name: t.name,
      subdomain: t.subdomain,
      is_active: Boolean(t.isActive),
      billing_plan: t.billingPlan,
      ad_server: t.adServer,
      created_at: t.createdAt?.toISOString() ?? null,
      adapter_configured: adapterTenantIds.has(t.tenantId),
    }));

    return reply.send({ tenants: results, count: results.length });
  });

  fastify.post("/tenants", async (request, reply) => {
    const _key = await requireApiKey(request, reply);
    if (_key === null) return;

    const body = (request.body ?? {}) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const subdomain = typeof body.subdomain === "string" ? body.subdomain.trim() : "";
    const adServer = typeof body.ad_server === "string" ? body.ad_server.trim() : "";

    if (!name || !subdomain || !adServer) {
      return reply.code(400).send({
        error: "Missing required field: name, subdomain, or ad_server",
      });
    }

    // SSRF validation for webhook URLs — mirrors Python WebhookURLValidator.validate_webhook_url
    for (const [fieldName, fieldLabel] of Object.entries(WEBHOOK_FIELDS)) {
      const url = body[fieldName];
      if (typeof url === "string" && url) {
        const check = validateWebhookUrl(url);
        if (!check.valid) {
          return reply.code(400).send({ error: `Invalid ${fieldLabel}: ${check.error}` });
        }
      }
    }

    const tenantId = `tenant_${randomBytes(4).toString("hex")}`;
    const adminToken = randomBytes(24).toString("base64url").slice(0, 32);

    let authorizedEmails: string[] = Array.isArray(body.authorized_emails)
      ? (body.authorized_emails as string[]).map((e) => String(e).trim())
      : [];
    const creatorEmail = typeof body.creator_email === "string" ? body.creator_email.trim() : "";
    if (creatorEmail && !authorizedEmails.includes(creatorEmail)) authorizedEmails.push(creatorEmail);

    const authorizedDomains: string[] = Array.isArray(body.authorized_domains)
      ? (body.authorized_domains as string[]).map((d) => String(d).trim())
      : [];

    if (authorizedEmails.length === 0 && authorizedDomains.length === 0 && !creatorEmail) {
      return reply.code(400).send({
        error:
          "Must specify at least one authorized email or domain. Provide 'authorized_emails', 'authorized_domains', or 'creator_email'.",
      });
    }
    if (authorizedEmails.length === 0 && creatorEmail) authorizedEmails = [creatorEmail];

    const tenantRow: NewTenant = {
      tenantId,
      name,
      subdomain,
      adServer,
      isActive: body.is_active !== false,
      billingPlan: typeof body.billing_plan === "string" ? body.billing_plan : "standard",
      billingContact: typeof body.billing_contact === "string" ? body.billing_contact : null,
      adminToken,
      authorizedEmails,
      authorizedDomains,
      slackWebhookUrl: typeof body.slack_webhook_url === "string" ? body.slack_webhook_url : null,
      slackAuditWebhookUrl:
        typeof body.slack_audit_webhook_url === "string" ? body.slack_audit_webhook_url : null,
      hitlWebhookUrl: typeof body.hitl_webhook_url === "string" ? body.hitl_webhook_url : null,
      autoApproveFormatIds: Array.isArray(body.auto_approve_format_ids)
        ? (body.auto_approve_format_ids as string[])
        : ["display_300x250"],
      humanReviewRequired: body.human_review_required !== false,
      policySettings:
        body.policy_settings && typeof body.policy_settings === "object"
          ? (body.policy_settings as Record<string, unknown>)
          : {},
      enableAxeSignals: body.enable_axe_signals !== false,
    };

    await db.insert(tenants).values(tenantRow);

    const adapterRow: NewAdapterConfig = {
      tenantId,
      adapterType: adServer,
      mockDryRun: adServer === "mock" ? Boolean(body.mock_dry_run) : null,
      gamNetworkCode: typeof (body as any).gam_network_code === "string" ? (body as any).gam_network_code : null,
      gamRefreshToken: typeof (body as any).gam_refresh_token === "string" ? (body as any).gam_refresh_token : null,
      gamTrafickerId: typeof (body as any).gam_trafficker_id === "string" ? (body as any).gam_trafficker_id : null,
      gamManualApprovalRequired: (body as any).gam_manual_approval_required === true,
      kevelNetworkId: typeof (body as any).kevel_network_id === "string" ? (body as any).kevel_network_id : null,
      kevelApiKey: typeof (body as any).kevel_api_key === "string" ? (body as any).kevel_api_key : null,
      kevelManualApprovalRequired: (body as any).kevel_manual_approval_required === true,
      tritonStationId: typeof (body as any).triton_station_id === "string" ? (body as any).triton_station_id : null,
      tritonApiKey: typeof (body as any).triton_api_key === "string" ? (body as any).triton_api_key : null,
    };
    await db.insert(adapterConfigs).values(adapterRow);

    let defaultPrincipalToken: string | null = null;
    if (body.create_default_principal !== false) {
      const principalId = `principal_${randomBytes(4).toString("hex")}`;
      defaultPrincipalToken = randomBytes(24).toString("base64url").slice(0, 32);
      const defaultMappings: Record<string, unknown> =
        adServer === "google_ad_manager"
          ? { google_ad_manager: { enabled: false } }
          : adServer === "kevel"
            ? { kevel: { enabled: false } }
            : adServer === "triton"
              ? { triton: { enabled: false } }
              : { mock: { advertiser_id: "default" } };
      await db.insert(principals).values({
        tenantId,
        principalId,
        name: `${name} Default Principal`,
        platformMappings: defaultMappings as Record<string, string>,
        accessToken: defaultPrincipalToken,
      });
    }

    const result: Record<string, unknown> = {
      tenant_id: tenantId,
      name,
      subdomain,
      admin_token: adminToken,
      admin_ui_url: `http://${subdomain}.localhost:8001/tenant/${tenantId}`,
    };
    if (defaultPrincipalToken) result.default_principal_token = defaultPrincipalToken;
    return reply.code(201).send(result);
  });

  // GET /tenants/:id — includes principals_count + adapter_config with masked token fields
  fastify.get("/tenants/:id", async (request, reply) => {
    const _key = await requireApiKey(request, reply);
    if (_key === null) return;
    const { id } = request.params as { id: string };

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [adapter] = await db
      .select()
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, id))
      .limit(1);

    // principals_count — mirrors Python func.count(Principal).filter_by(tenant_id)
    const [pcRow] = await db
      .select({ cnt: count() })
      .from(principals)
      .where(eq(principals.tenantId, id));
    const principalsCount = pcRow?.cnt ?? 0;

    const result: Record<string, unknown> = {
      tenant_id: tenant.tenantId,
      name: tenant.name,
      subdomain: tenant.subdomain,
      is_active: tenant.isActive,
      billing_plan: tenant.billingPlan,
      billing_contact: tenant.billingContact,
      ad_server: tenant.adServer,
      created_at: tenant.createdAt?.toISOString() ?? null,
      updated_at: tenant.updatedAt?.toISOString() ?? null,
      principals_count: principalsCount,
      settings: {
        enable_axe_signals: tenant.enableAxeSignals,
        authorized_emails: tenant.authorizedEmails ?? [],
        authorized_domains: tenant.authorizedDomains ?? [],
        slack_webhook_url: tenant.slackWebhookUrl,
        slack_audit_webhook_url: tenant.slackAuditWebhookUrl,
        hitl_webhook_url: tenant.hitlWebhookUrl,
        auto_approve_formats: tenant.autoApproveFormatIds ?? [],
        human_review_required: tenant.humanReviewRequired,
        policy_settings: tenant.policySettings ?? {},
      },
    };

    if (adapter) {
      // Mask sensitive token fields — mirrors Python has_refresh_token/has_api_key booleans
      const adapterData: Record<string, unknown> = {
        adapter_type: adapter.adapterType,
        created_at: adapter.createdAt?.toISOString() ?? null,
      };
      if (adapter.adapterType === "google_ad_manager") {
        adapterData["gam_network_code"] = adapter.gamNetworkCode;
        adapterData["has_refresh_token"] = Boolean(adapter.gamRefreshToken);
        adapterData["gam_trafficker_id"] = adapter.gamTrafickerId;
        adapterData["gam_manual_approval_required"] = Boolean(adapter.gamManualApprovalRequired);
      } else if (adapter.adapterType === "kevel") {
        adapterData["kevel_network_id"] = adapter.kevelNetworkId;
        adapterData["has_api_key"] = Boolean(adapter.kevelApiKey);
        adapterData["kevel_manual_approval_required"] = Boolean(adapter.kevelManualApprovalRequired);
      } else if (adapter.adapterType === "triton") {
        adapterData["triton_station_id"] = adapter.tritonStationId;
        adapterData["has_api_key"] = Boolean(adapter.tritonApiKey);
      } else if (adapter.adapterType === "mock") {
        adapterData["mock_dry_run"] = Boolean(adapter.mockDryRun);
      }
      result["adapter_config"] = adapterData;
    }

    return reply.send(result);
  });

  // PUT /tenants/:id — SSRF validation + adapter_config update block
  fastify.put("/tenants/:id", async (request, reply) => {
    const _key = await requireApiKey(request, reply);
    if (_key === null) return;
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as Record<string, unknown>;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    // SSRF validation for webhook URLs — mirrors Python L404-413
    for (const [fieldName, fieldLabel] of Object.entries(WEBHOOK_FIELDS)) {
      const url = body[fieldName];
      if (typeof url === "string" && url) {
        const check = validateWebhookUrl(url);
        if (!check.valid) {
          return reply.code(400).send({ error: `Invalid ${fieldLabel}: ${check.error}` });
        }
      }
    }

    const updates: Partial<NewTenant> = {};
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.is_active === "boolean") updates.isActive = body.is_active;
    if (typeof body.billing_plan === "string") updates.billingPlan = body.billing_plan;
    if (typeof body.billing_contact === "string") updates.billingContact = body.billing_contact;
    if (typeof body.enable_axe_signals === "boolean") updates.enableAxeSignals = body.enable_axe_signals;
    if (Array.isArray(body.authorized_emails)) updates.authorizedEmails = body.authorized_emails as string[];
    if (Array.isArray(body.authorized_domains)) updates.authorizedDomains = body.authorized_domains as string[];
    if (typeof body.slack_webhook_url === "string") updates.slackWebhookUrl = body.slack_webhook_url;
    if (typeof body.slack_audit_webhook_url === "string")
      updates.slackAuditWebhookUrl = body.slack_audit_webhook_url;
    if (typeof body.hitl_webhook_url === "string") updates.hitlWebhookUrl = body.hitl_webhook_url;
    if (Array.isArray(body.auto_approve_format_ids))
      updates.autoApproveFormatIds = body.auto_approve_format_ids as string[];
    if (typeof body.human_review_required === "boolean")
      updates.humanReviewRequired = body.human_review_required;
    if (body.policy_settings && typeof body.policy_settings === "object")
      updates.policySettings = body.policy_settings as Record<string, unknown>;

    updates.updatedAt = new Date();
    await db.update(tenants).set(updates).where(eq(tenants.tenantId, id));

    // adapter_config update block — mirrors Python L448-485
    if (body.adapter_config && typeof body.adapter_config === "object") {
      const adapterData = body.adapter_config as Record<string, unknown>;
      const [adapter] = await db
        .select()
        .from(adapterConfigs)
        .where(eq(adapterConfigs.tenantId, id))
        .limit(1);

      if (adapter) {
        const adapterUpdates: Record<string, unknown> = { updatedAt: new Date() };

        if (adapter.adapterType === "google_ad_manager") {
          if ("gam_network_code" in adapterData) adapterUpdates["gamNetworkCode"] = adapterData["gam_network_code"];
          if ("gam_refresh_token" in adapterData) adapterUpdates["gamRefreshToken"] = adapterData["gam_refresh_token"];
          if ("gam_trafficker_id" in adapterData) adapterUpdates["gamTrafickerId"] = adapterData["gam_trafficker_id"];
          if ("gam_manual_approval_required" in adapterData)
            adapterUpdates["gamManualApprovalRequired"] = adapterData["gam_manual_approval_required"];
        } else if (adapter.adapterType === "kevel") {
          if ("kevel_network_id" in adapterData) adapterUpdates["kevelNetworkId"] = adapterData["kevel_network_id"];
          if ("kevel_api_key" in adapterData) adapterUpdates["kevelApiKey"] = adapterData["kevel_api_key"];
          if ("kevel_manual_approval_required" in adapterData)
            adapterUpdates["kevelManualApprovalRequired"] = adapterData["kevel_manual_approval_required"];
        } else if (adapter.adapterType === "triton") {
          if ("triton_station_id" in adapterData) adapterUpdates["tritonStationId"] = adapterData["triton_station_id"];
          if ("triton_api_key" in adapterData) adapterUpdates["tritonApiKey"] = adapterData["triton_api_key"];
        } else if (adapter.adapterType === "mock") {
          if ("mock_dry_run" in adapterData) adapterUpdates["mockDryRun"] = adapterData["mock_dry_run"];
        }

        await db.update(adapterConfigs).set(adapterUpdates as Partial<NewAdapterConfig>).where(eq(adapterConfigs.tenantId, id));
      }
    }

    const [updated] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    return reply.send({
      tenant_id: id,
      name: updated?.name,
      updated_at: updated?.updatedAt?.toISOString() ?? null,
    });
  });

  // DELETE /tenants/:id — hard-delete cascades mirrors Python L524-529
  fastify.delete("/tenants/:id", async (request, reply) => {
    const _key = await requireApiKey(request, reply);
    if (_key === null) return;
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const hardDelete = body.hard_delete === true;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    if (hardDelete) {
      // Delete in dependency order to satisfy foreign key constraints
      await db.delete(auditLogs).where(eq(auditLogs.tenantId, id));
      await db.delete(mediaBuys).where(eq(mediaBuys.tenantId, id));
      await db.delete(products).where(eq(products.tenantId, id));
      await db.delete(users).where(eq(users.tenantId, id));
      await db.delete(adapterConfigs).where(eq(adapterConfigs.tenantId, id));
      await db.delete(principals).where(eq(principals.tenantId, id));
      await db.delete(tenants).where(eq(tenants.tenantId, id));
      return reply.send({
        message: "Tenant and all related data permanently deleted",
        tenant_id: id,
      });
    }
    await db.update(tenants).set({ isActive: false, updatedAt: new Date() }).where(eq(tenants.tenantId, id));
    return reply.send({ message: "Tenant deactivated successfully", tenant_id: id });
  });

  fastify.post("/init-api-key", async (request, reply) => {
    const configuredBootstrapKey = process.env[BOOTSTRAP_KEY_ENV]?.trim();
    if (!configuredBootstrapKey) {
      request.log.error({ envVar: BOOTSTRAP_KEY_ENV }, "Tenant management bootstrap key is not configured");
      return reply.code(503).send({
        error: "Bootstrap key is not configured",
      });
    }

    const providedBootstrapKey = getHeader(request.headers, BOOTSTRAP_KEY_HEADER);
    if (!providedBootstrapKey || providedBootstrapKey !== configuredBootstrapKey) {
      request.log.warn(
        {
          ip: request.ip,
          userAgent: getHeader(request.headers, "user-agent") ?? null,
        },
        "Rejected tenant management API key bootstrap attempt",
      );
      return reply.code(401).send({ error: "Invalid bootstrap key" });
    }

    const [existing] = await db
      .select()
      .from(tenantManagementConfig)
      .where(eq(tenantManagementConfig.configKey, API_KEY_CONFIG_KEY))
      .limit(1);
    if (existing) {
      return reply.code(409).send({ error: "API key already initialized" });
    }
    const apiKey = `sk-${randomBytes(24).toString("base64url")}`;
    await db.insert(tenantManagementConfig).values({
      configKey: API_KEY_CONFIG_KEY,
      configValue: apiKey,
      description: "Tenant management API key for tenant administration",
      updatedBy: "system",
    });
    return reply.code(201).send({
      message: "Tenant management API key initialized",
      api_key: apiKey,
      warning: "Save this key securely. It cannot be retrieved again.",
    });
  });
};

export default tenantManagementApiRoute;
