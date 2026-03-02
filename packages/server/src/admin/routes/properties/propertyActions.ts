import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { authorizedProperties } from "../../../db/schema/authorizedProperties.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";

/** In-memory rate-limit store: tenantId → last sync timestamp (ms). */
const lastSyncTimestamps = new Map<string, number>();
const SYNC_RATE_LIMIT_MS = 60_000;

const propertyActionsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/tenant/:id/authorized-properties/verify-all", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "verify_all_properties";

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const pending = await db
      .select({ propertyId: authorizedProperties.propertyId })
      .from(authorizedProperties)
      .where(
        and(
          eq(authorizedProperties.tenantId, id),
          eq(authorizedProperties.verificationStatus, "pending"),
        ),
      );
    const totalChecked = pending.length;
    const verified = 0;
    const failed = totalChecked;
    const errors: string[] = totalChecked > 0 ? ["Property verification service not yet integrated"] : [];

    return reply.send({
      success: true,
      verified,
      failed,
      total_checked: totalChecked,
      errors,
      message:
        totalChecked === 0
          ? "No pending properties to verify"
          : `Verification requested for ${totalChecked} properties; integration pending.`,
    });
  });

  fastify.post("/tenant/:id/authorized-properties/sync-from-adagents", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "sync_properties_from_adagents";

    const [tenant] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    // Rate limiting: 60s cooldown per tenant (mirrors Python tenant.metadata.last_property_sync)
    const now = Date.now();
    const lastSync = lastSyncTimestamps.get(id);
    if (lastSync !== undefined) {
      const elapsed = now - lastSync;
      if (elapsed < SYNC_RATE_LIMIT_MS) {
        const remaining = Math.ceil((SYNC_RATE_LIMIT_MS - elapsed) / 1000);
        return reply.code(429).send({
          error: `Please wait ${remaining} seconds before syncing again (rate limit)`,
        });
      }
    }
    lastSyncTimestamps.set(id, now);

    const body = (request.body ?? {}) as Record<string, unknown>;
    const dryRun = body.dry_run === true;

    return reply.send({
      success: true,
      dry_run: dryRun,
      stats: {
        domains_synced: 0,
        properties_found: 0,
        properties_created: 0,
        properties_updated: 0,
        tags_found: 0,
        tags_created: 0,
        errors: 0,
      },
      errors: [],
      message: dryRun
        ? "Dry run: property discovery service not yet integrated."
        : "Sync completed; property discovery service not yet integrated.",
    });
  });

  fastify.post("/tenant/:id/authorized-properties/:propertyId/verify-auto", async (request, reply) => {
    const { id, propertyId } = request.params as { id: string; propertyId: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "verify_property_auto";

    const [prop] = await db
      .select({ propertyId: authorizedProperties.propertyId })
      .from(authorizedProperties)
      .where(
        and(
          eq(authorizedProperties.tenantId, id),
          eq(authorizedProperties.propertyId, propertyId),
        ),
      )
      .limit(1);
    if (!prop) return reply.code(404).send({ error: "Property not found" });

    return reply.send({
      success: false,
      verified: false,
      error: "Property verification service not yet integrated",
      message: "Verification requested; integration pending.",
    });
  });
};

export default propertyActionsRoute;
