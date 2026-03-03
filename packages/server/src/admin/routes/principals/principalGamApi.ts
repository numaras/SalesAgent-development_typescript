import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import { tenants } from "../../../db/schema/tenants.js";
import { fetchGamAdvertisers } from "../../../services/gamAdvertiserService.js";
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
    const limit =
      typeof body.limit === "number"
        ? body.limit
        : typeof body.limit === "string"
          ? Number(body.limit)
          : undefined;
    const fetchAll = body.fetch_all === true;

    try {
      const result = await fetchGamAdvertisers({
        tenantId: id,
        search,
        limit,
        fetchAll,
      });
      return reply.send({ success: true, ...result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: `Failed to fetch advertisers: ${msg}` });
    }
  });
};

export default principalGamApiRoute;
