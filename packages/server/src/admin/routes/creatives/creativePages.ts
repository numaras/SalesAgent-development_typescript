import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { creatives } from "../../../db/schema/creatives.js";
import { mediaBuys } from "../../../db/schema/mediaBuys.js";
import { principals } from "../../../db/schema/principals.js";
import { products } from "../../../db/schema/products.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";

const creativePagesRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/creatives", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    return reply.redirect(`/tenant/${encodeURIComponent(id)}/creatives/review`);
  });

  fastify.get("/tenant/:id/creatives/list", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    return reply.redirect(`/tenant/${encodeURIComponent(id)}/creatives/review`);
  });

  fastify.get("/tenant/:id/creatives/add/ai", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    return reply.send({
      tenant_id: id,
      mode: "ai_creative_format_discovery",
    });
  });

  fastify.get("/tenant/:id/creatives/review", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        name: tenants.name,
        geminiApiKey: tenants.geminiApiKey,
        creativeReviewCriteria: tenants.creativeReviewCriteria,
        approvalMode: tenants.approvalMode,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const principalRows = await db
      .select({
        principalId: principals.principalId,
        name: principals.name,
      })
      .from(principals)
      .where(eq(principals.tenantId, id));
    const principalNameById = new Map(
      principalRows.map((row) => [row.principalId, row.name]),
    );

    const creativeRows = await db
      .select()
      .from(creatives)
      .where(eq(creatives.tenantId, id))
      .orderBy(desc(creatives.createdAt));

    // Batch-fetch all creative assignments for this tenant in one query (avoids N+1).
    // creative_assignments has no Drizzle schema — accessed via raw SQL for DB parity.
    // Python: select(CreativeAssignment).filter_by(tenant_id=tenant_id, creative_id=...) per creative.
    const assignmentRows = await db.execute(
      sql`SELECT creative_id, media_buy_id, package_id FROM creative_assignments WHERE tenant_id = ${id}`,
    ) as unknown as Array<{ creative_id: string; media_buy_id: string; package_id: string | null }>;

    // Group assignments by creative_id
    const assignmentsByCreative = new Map<
      string,
      Array<{ media_buy_id: string; package_id: string | null }>
    >();
    for (const row of assignmentRows) {
      const existing = assignmentsByCreative.get(row.creative_id) ?? [];
      existing.push({ media_buy_id: row.media_buy_id, package_id: row.package_id });
      assignmentsByCreative.set(row.creative_id, existing);
    }

    // Batch-fetch media buy details for all referenced media buys
    const allMediaBuyIds = [...new Set(assignmentRows.map((r) => r.media_buy_id))];
    const mediaBuyRows =
      allMediaBuyIds.length > 0
        ? await db
            .select({
              mediaBuyId: mediaBuys.mediaBuyId,
              orderName: mediaBuys.orderName,
              status: mediaBuys.status,
              startDate: mediaBuys.startDate,
              endDate: mediaBuys.endDate,
              rawRequest: mediaBuys.rawRequest,
            })
            .from(mediaBuys)
            .where(inArray(mediaBuys.mediaBuyId, allMediaBuyIds))
        : [];
    const mediaBuyById = new Map(mediaBuyRows.map((r) => [r.mediaBuyId, r]));

    // Collect product IDs from first package of each media buy for promoted_offering
    const allProductIds = new Set<string>();
    for (const buy of mediaBuyRows) {
      const pkgs = Array.isArray(buy.rawRequest?.packages)
        ? (buy.rawRequest.packages as Array<Record<string, unknown>>)
        : [];
      const pid = pkgs[0]?.product_id;
      if (typeof pid === "string") allProductIds.add(pid);
    }
    const productRows =
      allProductIds.size > 0
        ? await db
            .select({ productId: products.productId, name: products.name })
            .from(products)
            .where(and(eq(products.tenantId, id), inArray(products.productId, [...allProductIds])))
        : [];
    const productNameById = new Map(productRows.map((r) => [r.productId, r.name]));

    const creativeList = creativeRows
      .sort((a, b) => {
        if (a.status === "pending_review" && b.status !== "pending_review") return -1;
        if (a.status !== "pending_review" && b.status === "pending_review") return 1;
        const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTs - aTs;
      })
      .map((creative) => {
        const assignments = assignmentsByCreative.get(creative.creativeId) ?? [];

        // Python: for assignment in assignments → select MediaBuy → append to media_buys list
        const mediaBuyList = assignments.flatMap(({ media_buy_id, package_id }) => {
          const buy = mediaBuyById.get(media_buy_id);
          if (!buy) return [];
          return [
            {
              media_buy_id: buy.mediaBuyId,
              order_name: buy.orderName,
              package_id,
              status: buy.status,
              start_date: buy.startDate,
              end_date: buy.endDate,
            },
          ];
        });

        // Python: promoted_offering resolved from first media buy's raw_request.packages[0].product_id
        let promotedOffering: string | null = null;
        if (mediaBuyList.length > 0) {
          const firstBuy = mediaBuyById.get(mediaBuyList[0].media_buy_id);
          if (firstBuy) {
            const pkgs = Array.isArray(firstBuy.rawRequest?.packages)
              ? (firstBuy.rawRequest.packages as Array<Record<string, unknown>>)
              : [];
            const productId =
              typeof pkgs[0]?.product_id === "string" ? pkgs[0].product_id : null;
            if (productId) promotedOffering = productNameById.get(productId) ?? null;
          }
        }

        return {
          creative_id: creative.creativeId,
          name: creative.name,
          format: creative.format,
          status: creative.status,
          principal_name:
            principalNameById.get(creative.principalId) ?? creative.principalId,
          principal_id: creative.principalId,
          group_id: creative.groupId,
          data: creative.data,
          created_at: creative.createdAt,
          approved_at: creative.approvedAt,
          approved_by: creative.approvedBy,
          media_buys: mediaBuyList,
          assignment_count: mediaBuyList.length,
          promoted_offering: promotedOffering,
        };
      });

    return reply.send({
      tenant_id: id,
      tenant_name: tenant.name,
      creatives: creativeList,
      has_ai_review: Boolean(
        tenant.geminiApiKey && tenant.creativeReviewCriteria,
      ),
      approval_mode: tenant.approvalMode,
    });
  });
};

export default creativePagesRoute;
