/**
 * POST /tenant/:id/creatives/add — Admin UI direct creative upload.
 *
 * Creates a creative record in the DB with status "pending_review"
 * so it appears in the review queue. The admin selects a principal,
 * picks a format, provides an asset URL and optional click URL.
 */
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";

import { db } from "../../../db/client.js";
import { creatives } from "../../../db/schema/creatives.js";
import { principals } from "../../../db/schema/principals.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";
import { validateOutboundUrl } from "../../../security/outboundUrl.js";

const addCreativeRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/tenant/:id/creatives/add", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;
    request.auditOperation = "add_creative";

    const session = getAdminSession(request);
    const body = (request.body ?? {}) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const principalId = typeof body.principal_id === "string" ? body.principal_id.trim() : "";
    const formatId = typeof body.format_id === "string" ? body.format_id.trim() : "";
    const agentUrl = typeof body.agent_url === "string" ? body.agent_url.trim() : "";
    const assetUrl = typeof body.asset_url === "string" ? body.asset_url.trim() : "";
    const clickUrl = typeof body.click_url === "string" ? body.click_url.trim() : "";
    const width = typeof body.width === "number" ? body.width : null;
    const height = typeof body.height === "number" ? body.height : null;

    if (!name) return reply.code(400).send({ error: "Creative name is required" });
    if (!principalId) return reply.code(400).send({ error: "Principal is required" });
    if (!formatId) return reply.code(400).send({ error: "Format is required" });
    if (!agentUrl) return reply.code(400).send({ error: "Agent URL is required" });
    if (!assetUrl) return reply.code(400).send({ error: "Asset URL is required" });

    // Validate asset URL for SSRF
    const urlCheck = validateOutboundUrl(assetUrl, { allowHttp: true });
    if (!urlCheck.valid) {
      return reply.code(400).send({ error: `Invalid asset URL: ${urlCheck.error}` });
    }

    // Verify principal belongs to this tenant
    const [principal] = await db
      .select({ principalId: principals.principalId })
      .from(principals)
      .where(eq(principals.tenantId, id))
      .then((rows) => rows.filter((r) => r.principalId === principalId));

    if (!principal) {
      return reply.code(400).send({ error: "Principal not found in this tenant" });
    }

    const creativeId = `cr_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
    const now = new Date();

    const data: Record<string, unknown> = {
      asset_url: assetUrl,
      uploaded_by: typeof session.user === "string" ? session.user : "admin",
    };
    if (clickUrl) data.click_url = clickUrl;

    const formatParameters: Record<string, unknown> = {};
    if (width) formatParameters.width = width;
    if (height) formatParameters.height = height;

    await db.insert(creatives).values({
      creativeId,
      tenantId: id,
      principalId,
      name,
      agentUrl,
      format: formatId,
      status: "pending_review",
      data,
      formatParameters: Object.keys(formatParameters).length > 0 ? formatParameters : null,
      createdAt: now,
      updatedAt: now,
    });

    return reply.code(201).send({
      success: true,
      creative_id: creativeId,
      message: `Creative "${name}" uploaded and pending review.`,
    });
  });
};

export default addCreativeRoute;
