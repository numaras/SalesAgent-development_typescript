import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import {
  broadstreetTestConnectionRouteSchema,
  broadstreetZonesRouteSchema,
} from "../../../routes/schemas/admin/adapters/broadstreet.schema.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const BROADSTREET_BASE_URL = "https://api.broadstreetads.com/api/0";

type TestConnectionBody = { network_id?: string; api_key?: string };

type BroadstreetZone = { id: number | string; name?: string };

async function broadstreetGet(path: string, accessToken: string): Promise<unknown> {
  const url = `${BROADSTREET_BASE_URL}${path}?access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Broadstreet API error (HTTP ${res.status}): ${body}`);
  }
  return res.json() as Promise<unknown>;
}

const broadstreetRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/api/tenant/:id/adapters/broadstreet/test-connection", { schema: broadstreetTestConnectionRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const body = (request.body ?? {}) as TestConnectionBody;
    const networkId = typeof body.network_id === "string" ? body.network_id.trim() : "";
    const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";

    if (!networkId || !apiKey) {
      return reply.code(400).send({
        success: false,
        error: "network_id and api_key are required",
      });
    }

    try {
      const result = (await broadstreetGet(`/networks/${networkId}`, apiKey)) as Record<string, unknown>;
      const networkData = (result?.network ?? result) as Record<string, unknown>;
      const networkName = typeof networkData?.name === "string" ? networkData.name : "Unknown";

      if (!networkData) {
        return reply.send({ success: false, error: "Could not retrieve network information" });
      }

      return reply.send({
        success: true,
        network_name: networkName,
        network_id: networkId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ success: false, error: message });
    }
  });

  fastify.get("/api/tenant/:id/adapters/broadstreet/zones", { schema: broadstreetZonesRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [adapterConfig] = await db
      .select({ configJson: adapterConfigs.configJson })
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, id))
      .limit(1);

    const config = (adapterConfig?.configJson ?? {}) as Record<string, unknown>;
    const networkId = config.network_id ?? config.networkId;
    const apiKey = config.api_key ?? config.apiKey;

    if (!networkId || !apiKey) {
      return reply.send({ zones: [], error: "Broadstreet not configured" });
    }

    try {
      const result = (await broadstreetGet(
        `/networks/${networkId}/zones`,
        String(apiKey),
      )) as Record<string, unknown>;
      const rawZones = Array.isArray(result?.zones) ? (result.zones as BroadstreetZone[]) : [];
      const zones = rawZones.map((z) => ({
        id: String(z.id),
        name: z.name ?? `Zone ${z.id}`,
      }));
      return reply.send({ zones });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ zones: [], error: message });
    }
  });
};

export default broadstreetRoute;
