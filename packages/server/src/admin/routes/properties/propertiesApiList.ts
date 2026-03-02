import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { authorizedProperties } from "../../../db/schema/authorizedProperties.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const propertiesApiListRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/authorized-properties/api/list", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const properties = await db
      .select()
      .from(authorizedProperties)
      .where(eq(authorizedProperties.tenantId, id))
      .orderBy(authorizedProperties.publisherDomain, authorizedProperties.name);

    const propertiesData = properties.map((prop) => {
      const identifiers = Array.isArray(prop.identifiers) ? prop.identifiers : [];
      const propertyIds = identifiers
        .filter((idn): idn is Record<string, unknown> => idn != null && typeof idn === "object" && "value" in idn)
        .map((idn) => String(idn.value ?? ""));
      return {
        publisher_domain: prop.publisherDomain,
        property_name: prop.name,
        property_type: prop.propertyType,
        property_ids: propertyIds,
        property_tags: prop.tags ?? [],
      };
    });

    return reply.send({
      properties: propertiesData,
      total: propertiesData.length,
    });
  });
};

export default propertiesApiListRoute;
