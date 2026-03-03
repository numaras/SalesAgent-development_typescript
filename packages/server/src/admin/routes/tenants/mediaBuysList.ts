import { desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { mediaBuys } from "../../../db/schema/mediaBuys.js";
import { principals } from "../../../db/schema/principals.js";
import { products } from "../../../db/schema/products.js";
import { tenants } from "../../../db/schema/tenants.js";
import { computeReadinessState, extractPackagesTotal } from "../../../services/mediaBuyReadinessService.js";
import { requireTenantAccess } from "../../services/authGuard.js";

function extractPackageProductIds(rawRequest: unknown): string[] {
  if (!rawRequest || typeof rawRequest !== "object") return [];
  const record = rawRequest as Record<string, unknown>;
  const packages = record["packages"];
  if (!Array.isArray(packages)) return [];
  const ids: string[] = [];
  for (const pkg of packages) {
    if (!pkg || typeof pkg !== "object") continue;
    const id = (pkg as Record<string, unknown>)["product_id"];
    if (typeof id === "string" && id.trim()) {
      ids.push(id.trim());
    }
  }
  return ids;
}

const mediaBuysListRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.get("/tenant/:id/media-buys", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = (request.query ?? {}) as Record<string, unknown>;
    const statusFilter =
      typeof query.status === "string" ? query.status.trim() : "";

    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId, name: tenants.name })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) {
      return reply.code(404).send({ error: "Tenant not found" });
    }

    const allMediaBuys = await db
      .select()
      .from(mediaBuys)
      .where(eq(mediaBuys.tenantId, id))
      .orderBy(desc(mediaBuys.createdAt));

    const principalIds = Array.from(
      new Set(
        allMediaBuys
          .map((item) => item.principalId)
          .filter((item): item is string => typeof item === "string" && item.length > 0),
      ),
    );
    const principalRows = principalIds.length
      ? await db
          .select({
            principalId: principals.principalId,
            name: principals.name,
          })
          .from(principals)
          .where(eq(principals.tenantId, id))
      : [];
    const principalById = new Map(
      principalRows.map((row) => [row.principalId, row.name]),
    );

    const productIds = Array.from(
      new Set(
        allMediaBuys.flatMap((item) => extractPackageProductIds(item.rawRequest)),
      ),
    );
    const productRows = productIds.length
      ? await db
          .select({
            productId: products.productId,
            name: products.name,
          })
          .from(products)
          .where(eq(products.tenantId, id))
      : [];
    const productById = new Map(productRows.map((row) => [row.productId, row.name]));

    const media_buys_with_state = allMediaBuys.map((item) => {
      const packagesTotal = extractPackagesTotal(item.rawRequest);
      const packageProductIds = extractPackageProductIds(item.rawRequest);
      const productNames = packageProductIds
        .map((productId) => productById.get(productId))
        .filter((name): name is string => typeof name === "string");

      const readiness = computeReadinessState(
        item.status,
        item.startDate,
        item.endDate,
        item.startTime,
        item.endTime,
        packagesTotal,
      );

      return {
        media_buy: item,
        readiness_state: readiness.state,
        is_ready: readiness.is_ready_to_activate,
        principal_name: principalById.get(item.principalId) ?? "Unknown",
        product_names: productNames,
        packages_ready: readiness.is_ready_to_activate ? packagesTotal : 0,
        packages_total: packagesTotal,
        blocking_issues: readiness.blocking_issues,
      };
    });

    const filtered = statusFilter
      ? media_buys_with_state.filter((entry) => entry.readiness_state === statusFilter)
      : media_buys_with_state;

    return reply.send({
      tenant: {
        tenant_id: tenant.tenantId,
        name: tenant.name,
      },
      tenant_id: id,
      status_filter: statusFilter || null,
      media_buys: filtered,
    });
  });
};

export default mediaBuysListRoute;
