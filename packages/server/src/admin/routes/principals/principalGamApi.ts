import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import { tenants } from "../../../db/schema/tenants.js";
import { buildGamClient } from "../../../gam/gamClient.js";
import { requireTenantAccess } from "../../services/authGuard.js";

/**
 * POST /tenant/:id/api/gam/get-advertisers
 * Mirrors Python principals.py L392-498 — get_gam_advertisers().
 * Uses CompanyService.getCompaniesByStatement with TYPE = 'ADVERTISER' filter.
 */
const principalGamApiRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/tenant/:id/api/gam/get-advertisers", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    request.auditOperation = "get_gam_advertisers";

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, adServer: tenants.adServer })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [adapter] = await db
      .select({ gamNetworkCode: adapterConfigs.gamNetworkCode })
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, id))
      .limit(1);

    // Python uses tenant.is_gam_tenant (ad_server == "google_ad_manager" + gam_network_code set)
    const gamEnabled =
      tenant.adServer === "google_ad_manager" && adapter?.gamNetworkCode != null && adapter.gamNetworkCode !== "";

    if (!gamEnabled) {
      return reply.code(400).send({ error: "Google Ad Manager not configured" });
    }

    const body = (request.body ?? {}) as Record<string, unknown>;
    const search = typeof body.search === "string" ? body.search : undefined;
    const limit = typeof body.limit === "number" ? Math.min(500, Math.max(1, body.limit)) : 500;
    const fetchAll = body.fetch_all === true;

    try {
      const [adapterRow] = await db
        .select()
        .from(adapterConfigs)
        .where(eq(adapterConfigs.tenantId, id))
        .limit(1);

      if (!adapterRow) {
        return reply.code(400).send({ error: "Adapter config not found" });
      }

      const gamClient = buildGamClient(adapterRow);
      const companyService = await gamClient.getService("CompanyService");

      // Build PQL: filter to ADVERTISER type, optionally filter by name
      const PAGE_LIMIT = fetchAll ? 500 : Math.min(limit, 500);
      const whereClause = search
        ? `WHERE type = 'ADVERTISER' AND name LIKE '%${search.replace(/'/g, "''")}%'`
        : `WHERE type = 'ADVERTISER'`;

      const allAdvertisers: Array<{ id: string; name: string }> = [];
      let offset = 0;
      for (;;) {
        const statement = `${whereClause} LIMIT ${PAGE_LIMIT} OFFSET ${offset}`;
        const page = (await (companyService as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)
          .getCompaniesByStatement({ query: statement })) as Record<string, unknown>;

        const results = (page["results"] as unknown[]) ?? [];
        if (results.length === 0) break;

        for (const c of results) {
          const co = c as Record<string, unknown>;
          allAdvertisers.push({
            id: String(co["id"]),
            name: typeof co["name"] === "string" ? co["name"] : String(co["id"]),
          });
        }

        if (!fetchAll || results.length < PAGE_LIMIT) break;
        offset += PAGE_LIMIT;
      }

      const advertisers = allAdvertisers.slice(0, limit);

      return reply.send({
        success: true,
        advertisers,
        count: advertisers.length,
        search: search ?? null,
        fetch_all: fetchAll,
        limit,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: `Failed to fetch advertisers: ${msg}` });
    }
  });
};

export default principalGamApiRoute;
