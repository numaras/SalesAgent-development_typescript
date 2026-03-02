import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomBytes } from "node:crypto";

import { db } from "../../../db/client.js";
import { tenants } from "../../../db/schema/tenants.js";
import { TenantCreateSchema } from "../../schemas/tenant.js";
import { getAdminSession } from "../../services/sessionService.js";

function slugifySubdomain(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const createTenantRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/create_tenant", async (request, reply) => {
    const session = getAdminSession(request);
    if (session.role !== "super_admin") {
      return reply.code(403).send({ error: "FORBIDDEN" });
    }

    const parseResult = TenantCreateSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply
        .code(400)
        .send({ error: parseResult.error.issues[0]?.message ?? "Invalid input" });
    }
    const input = parseResult.data;

    if (!input.name) {
      return reply.code(400).send({ error: "Tenant name is required" });
    }

    let subdomain = input.subdomain ?? slugifySubdomain(input.name);
    if (!subdomain) {
      return reply.code(400).send({ error: "Unable to derive subdomain" });
    }

    const tenantId = `tenant_${subdomain}`;
    const [existing] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);
    if (existing) {
      return reply.code(409).send({ error: `Tenant with ID ${tenantId} already exists` });
    }

    const creatorEmail = typeof session.user === "string" ? session.user : null;
    const providedEmails = input.authorized_emails;
    const authorizedEmails =
      creatorEmail && !providedEmails.includes(creatorEmail)
        ? [...providedEmails, creatorEmail]
        : providedEmails;
    const authorizedDomains = input.authorized_domains;

    const adServer = input.ad_server ?? null;

    await db.insert(tenants).values({
      tenantId,
      name: input.name,
      subdomain,
      isActive: true,
      adServer,
      adminToken:
        input.admin_token ?? randomBytes(24).toString("hex").slice(0, 32),
      enableAxeSignals: input.enable_axe_signals,
      humanReviewRequired: input.human_review_required,
      authorizedEmails,
      authorizedDomains,
      measurementProviders: {
        providers: ["Publisher Ad Server"],
        default: "Publisher Ad Server",
      },
      ...(input.favicon_url ? { faviconUrl: input.favicon_url } : {}),
      updatedAt: new Date(),
    });

    return reply.code(201).send({
      success: true,
      tenant_id: tenantId,
      redirect: `/tenant/${encodeURIComponent(tenantId)}`,
    });
  });
};

export default createTenantRoute;
