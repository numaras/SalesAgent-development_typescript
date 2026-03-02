import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import { tenants } from "../../../db/schema/tenants.js";
import { buildGamDiscoveryClient } from "../../../gam/gamClient.js";
import {
  configureGamRouteSchema,
  detectGamNetworkRouteSchema,
  getGamConfigRouteSchema,
} from "../../../routes/schemas/admin/gam/detectConfigure.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";

type DetectNetworkBody = {
  refresh_token?: string;
  network_code?: string;
};

type ConfigureGamBody = {
  auth_method?: "oauth" | "service_account";
  network_code?: string;
  refresh_token?: string;
  service_account_json?: string;
  trafficker_id?: string | number;
  order_name_template?: string;
  line_item_name_template?: string;
  network_currency?: string;
  secondary_currencies?: unknown;
  network_timezone?: string;
};

const detectConfigureRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /tenant/:id/gam/config
   * Returns the saved GAM adapter configuration for pre-filling the config form.
   * Credentials (refresh_token, service_account_json) are masked — only their
   * presence is reported so the UI can indicate "saved" without exposing secrets.
   */
  fastify.get("/tenant/:id/gam/config", { schema: getGamConfigRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [row] = await db
      .select({
        gamNetworkCode:          adapterConfigs.gamNetworkCode,
        gamAuthMethod:           adapterConfigs.gamAuthMethod,
        gamRefreshToken:         adapterConfigs.gamRefreshToken,
        gamServiceAccountJson:   adapterConfigs.gamServiceAccountJson,
        gamServiceAccountEmail:  adapterConfigs.gamServiceAccountEmail,
        gamTrafickerId:          adapterConfigs.gamTrafickerId,
        gamNetworkCurrency:      adapterConfigs.gamNetworkCurrency,
        gamSecondaryCurrencies:  adapterConfigs.gamSecondaryCurrencies,
        gamNetworkTimezone:      adapterConfigs.gamNetworkTimezone,
        gamOrderNameTemplate:    adapterConfigs.gamOrderNameTemplate,
        gamLineItemNameTemplate: adapterConfigs.gamLineItemNameTemplate,
      })
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, id))
      .limit(1);

    if (!row || !row.gamNetworkCode) {
      return reply.send({ configured: false });
    }

    return reply.send({
      configured: true,
      network_code:              row.gamNetworkCode,
      auth_method:               row.gamAuthMethod ?? "oauth",
      has_refresh_token:         Boolean(row.gamRefreshToken),
      has_service_account:       Boolean(row.gamServiceAccountJson),
      service_account_email:     row.gamServiceAccountEmail ?? null,
      trafficker_id:             row.gamTrafickerId ?? "",
      network_currency:          row.gamNetworkCurrency ?? "",
      secondary_currencies:      row.gamSecondaryCurrencies ?? [],
      network_timezone:          row.gamNetworkTimezone ?? "",
      order_name_template:       row.gamOrderNameTemplate ?? "",
      line_item_name_template:   row.gamLineItemNameTemplate ?? "",
    });
  });

  fastify.post("/tenant/:id/gam/detect-network", { schema: detectGamNetworkRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "detect_gam_network";

    const body = (request.body ?? {}) as DetectNetworkBody;
    const refreshToken = body.refresh_token?.trim();
    if (!refreshToken) {
      return reply.code(400).send({ success: false, error: "Refresh token required" });
    }

    const clientId = process.env.GAM_OAUTH_CLIENT_ID?.trim();
    const clientSecret = process.env.GAM_OAUTH_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      return reply.code(500).send({
        success: false,
        error: "GAM OAuth credentials not configured",
      });
    }

    try {
      const gamClient = buildGamDiscoveryClient(refreshToken);
      const networkService = await gamClient.getService("NetworkService");
      const networks = (await (networkService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
        .getAllNetworks()) as Array<Record<string, unknown>>;

      if (!networks || networks.length === 0) {
        return reply.code(400).send({
          success: false,
          error: "No GAM networks found for this refresh token",
        });
      }

      // If caller specified a network_code, validate it; otherwise use the first network
      const requestedCode = body.network_code?.trim();
      const selected = requestedCode
        ? (networks.find((n) => String(n["networkCode"]) === requestedCode) ?? networks[0]!)
        : networks[0]!;

      const networkCode = String(selected["networkCode"]);
      const currency = selected["currencyCode"] as string | undefined;
      const timezone = selected["timeZone"] as string | undefined;

      return reply.send({
        success: true,
        network_code: networkCode,
        network_name: selected["displayName"] ?? selected["networkCode"],
        network_id: networkCode,
        network_count: networks.length,
        trafficker_id: null,
        currency_code: currency ?? "USD",
        secondary_currencies: [],
        timezone: timezone ?? "America/New_York",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ success: false, error: `GAM network detection failed: ${msg}` });
    }
  });

  fastify.post("/tenant/:id/gam/configure", { schema: configureGamRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "configure_gam";

    const body = (request.body ?? {}) as ConfigureGamBody;
    const authMethod = body.auth_method === "service_account" ? "service_account" : "oauth";
    const networkCode = body.network_code?.trim() || null;
    const refreshToken = authMethod === "oauth" ? body.refresh_token?.trim() || null : null;
    const serviceAccountJson =
      authMethod === "service_account" ? body.service_account_json?.trim() || null : null;

    if (!networkCode) {
      return reply.code(400).send({ success: false, errors: ["Network code is required"] });
    }
    if (authMethod === "oauth" && !refreshToken) {
      return reply.code(400).send({ success: false, errors: ["Refresh token is required for OAuth"] });
    }
    if (authMethod === "service_account" && !serviceAccountJson) {
      return reply
        .code(400)
        .send({ success: false, errors: ["Service account JSON is required for service_account auth"] });
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ success: false, error: "Tenant not found" });

    const sanitizedSecondaryCurrencies = Array.isArray(body.secondary_currencies)
      ? body.secondary_currencies
          .map((value) => (typeof value === "string" ? value.trim().slice(0, 3).toUpperCase() : ""))
          .filter((value) => value.length === 3)
      : [];

    const updatePayload = {
      adapterType: "google_ad_manager",
      gamNetworkCode: networkCode,
      gamAuthMethod: authMethod,
      gamRefreshToken: authMethod === "oauth" ? refreshToken : null,
      gamServiceAccountJson: authMethod === "service_account" ? serviceAccountJson : null,
      gamTrafickerId: body.trafficker_id ? String(body.trafficker_id).trim() : null,
      gamNetworkCurrency: body.network_currency?.trim().slice(0, 3).toUpperCase() || null,
      gamSecondaryCurrencies: sanitizedSecondaryCurrencies.length ? sanitizedSecondaryCurrencies : null,
      gamNetworkTimezone: body.network_timezone?.trim().slice(0, 100) || null,
      gamOrderNameTemplate: body.order_name_template?.trim() || null,
      gamLineItemNameTemplate: body.line_item_name_template?.trim() || null,
      updatedAt: new Date(),
    };

    const existing = await db
      .select({ tenantId: adapterConfigs.tenantId })
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, id))
      .limit(1);

    if (existing.length) {
      await db.update(adapterConfigs).set(updatePayload).where(eq(adapterConfigs.tenantId, id));
    } else {
      await db.insert(adapterConfigs).values({
        tenantId: id,
        ...updatePayload,
      });
    }

    await db
      .update(tenants)
      .set({
        adServer: "google_ad_manager",
        updatedAt: new Date(),
      })
      .where(and(eq(tenants.tenantId, id), eq(tenants.isActive, true)));

    return reply.send({
      success: true,
      message: "GAM configuration saved successfully",
    });
  });
};

export default detectConfigureRoute;
