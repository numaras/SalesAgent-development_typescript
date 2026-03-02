import { and, desc, eq, gte } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { mediaBuys } from "../../../db/schema/mediaBuys.js";
import { principals } from "../../../db/schema/principals.js";
import { revenueChartRouteSchema } from "../../../routes/schemas/admin/api/revenueChart.schema.js";
import { getAdminSession } from "../../services/sessionService.js";

function parsePeriodDays(period: string | undefined): number {
  if (period === "30d") return 30;
  if (period === "90d") return 90;
  return 7;
}

const revenueChartRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/api/tenant/:id/revenue-chart", { schema: revenueChartRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });

    const query = (request.query ?? {}) as Record<string, unknown>;
    const period = typeof query.period === "string" ? query.period : "7d";
    const days = parsePeriodDays(period);
    const dateStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const principalRows = await db
      .select({ principalId: principals.principalId, name: principals.name })
      .from(principals)
      .where(eq(principals.tenantId, id));
    const principalNames = new Map(
      principalRows.map((row) => [row.principalId, row.name]),
    );

    const rows = await db
      .select({
        principalId: mediaBuys.principalId,
        budget: mediaBuys.budget,
        status: mediaBuys.status,
      })
      .from(mediaBuys)
      .where(
        and(
          eq(mediaBuys.tenantId, id),
          gte(mediaBuys.createdAt, dateStart),
        ),
      );

    const allowedStatuses = new Set(["active", "completed"]);
    const revenueByPrincipal = new Map<string, number>();
    for (const row of rows) {
      if (!allowedStatuses.has(row.status)) continue;
      const current = revenueByPrincipal.get(row.principalId) ?? 0;
      const budgetValue =
        typeof row.budget === "string" ? Number(row.budget) : Number(row.budget ?? 0);
      revenueByPrincipal.set(row.principalId, current + (Number.isFinite(budgetValue) ? budgetValue : 0));
    }

    const sorted = Array.from(revenueByPrincipal.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const labels = sorted.map(([principalId]) => principalNames.get(principalId) ?? "Unknown");
    const values = sorted.map(([, value]) => value);
    return reply.send({ labels, values });
  });
};

export default revenueChartRoute;
