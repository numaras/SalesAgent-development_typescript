import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../db/client.js";
import { authorizedProperties } from "../../db/schema/authorizedProperties.js";
import { publisherPartners } from "../../db/schema/publisherPartners.js";
import { tenants } from "../../db/schema/tenants.js";
import { validateOutboundUrl } from "../../security/outboundUrl.js";
import { requireTenantAccess } from "../services/authGuard.js";

// ── adagents.json helpers ──────────────────────────────────────────────────── //
// Mirrors adcp.adagents: fetch_adagents / verify_agent_authorization /
// get_properties_by_agent from the Python adcp library.

interface AdagentsAgent {
  url: string;
  authorized_for?: string;
  authorization_type?: string;
  property_ids?: string[];
  property_tags?: string[];
  properties?: Record<string, unknown>[];
  publisher_properties?: Record<string, unknown>[];
}

interface AdagentsData {
  authorized_agents?: AdagentsAgent[];
  properties?: Record<string, unknown>[];
}

/** Normalize URL for comparison: strip trailing slash and lower-case scheme+host. */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`.replace(/\/+$/, "");
  } catch {
    return url.replace(/\/+$/, "").toLowerCase();
  }
}

async function fetchAdagents(domain: string, timeoutMs = 10_000): Promise<AdagentsData> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const url = `https://${cleanDomain}/.well-known/adagents.json`;
  const urlCheck = validateOutboundUrl(url);
  if (!urlCheck.valid) {
    throw Object.assign(new Error(urlCheck.error ?? "Blocked outbound URL"), { code: "ADAGENTS_VALIDATION" });
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (res.status === 404) throw Object.assign(new Error("adagents.json not found"), { code: "ADAGENTS_NOT_FOUND" });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching adagents.json`);
  const data = (await res.json()) as AdagentsData;
  if (!data || !Array.isArray(data.authorized_agents)) {
    throw Object.assign(new Error("Missing authorized_agents field"), { code: "ADAGENTS_VALIDATION" });
  }
  return data;
}

function verifyAgentAuthorization(adagentsData: AdagentsData, agentUrl: string): boolean {
  const agents = adagentsData.authorized_agents ?? [];
  const normalizedTarget = normalizeUrl(agentUrl);
  return agents.some((a) => a.url && normalizeUrl(a.url) === normalizedTarget);
}

interface AuthorizationContext {
  property_ids: string[];
  property_tags: string[];
  raw_properties: Record<string, unknown>[];
}

function getPropertiesByAgent(adagentsData: AdagentsData, agentUrl: string): AuthorizationContext {
  const agents = adagentsData.authorized_agents ?? [];
  const normalizedTarget = normalizeUrl(agentUrl);
  const agent = agents.find((a) => a.url && normalizeUrl(a.url) === normalizedTarget);
  if (!agent) return { property_ids: [], property_tags: [], raw_properties: [] };

  const propertyIds: string[] = agent.property_ids ?? [];
  const propertyTags: string[] = agent.property_tags ?? [];
  const rawProps: Record<string, unknown>[] = agent.properties ?? adagentsData.properties ?? [];

  return { property_ids: propertyIds, property_tags: propertyTags, raw_properties: rawProps };
}

// ── Route plugin ───────────────────────────────────────────────────────────── //

const publisherPartnersRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/publisher-partners", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const partners = await db
      .select()
      .from(publisherPartners)
      .where(eq(publisherPartners.tenantId, id))
      .orderBy(publisherPartners.publisherDomain);

    const counts = await db
      .select({
        publisherDomain: authorizedProperties.publisherDomain,
        count: sql<number>`count(*)::int`,
      })
      .from(authorizedProperties)
      .where(eq(authorizedProperties.tenantId, id))
      .groupBy(authorizedProperties.publisherDomain);

    const countByDomain: Record<string, number> = {};
    for (const row of counts) countByDomain[row.publisherDomain] = row.count;

    const partnersList = partners.map((p) => ({
      id: p.id,
      publisher_domain: p.publisherDomain,
      display_name: p.displayName,
      is_verified: p.isVerified,
      last_synced_at: p.lastSyncedAt?.toISOString() ?? null,
      sync_status: p.syncStatus,
      sync_error: p.syncError,
      created_at: p.createdAt?.toISOString() ?? null,
      property_count: countByDomain[p.publisherDomain] ?? 0,
    }));

    return reply.send({
      partners: partnersList,
      total: partnersList.length,
      verified: partnersList.filter((p) => p.is_verified).length,
      pending: partnersList.filter((p) => p.sync_status === "pending").length,
    });
  });

  fastify.post("/tenant/:id/publisher-partners", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const body = (request.body ?? {}) as Record<string, unknown>;
    let publisherDomain = typeof body.publisher_domain === "string" ? body.publisher_domain.trim().toLowerCase() : "";
    const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";

    if (!publisherDomain) return reply.code(400).send({ error: "Publisher domain is required" });

    publisherDomain = publisherDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [existing] = await db
      .select()
      .from(publisherPartners)
      .where(
        and(eq(publisherPartners.tenantId, id), eq(publisherPartners.publisherDomain, publisherDomain))
      )
      .limit(1);
    if (existing) return reply.code(409).send({ error: "Publisher already exists" });

    const isDev = process.env["NODE_ENV"] === "development";
    const tenantWithAdapter = tenant as { adapterConfig?: { adapter_type?: string } };
    const isMock = Boolean(tenantWithAdapter.adapterConfig && tenantWithAdapter.adapterConfig.adapter_type === "mock");
    const shouldAutoVerify = isDev || isMock;

    const [inserted] = await db
      .insert(publisherPartners)
      .values({
        tenantId: id,
        publisherDomain,
        displayName: displayName || publisherDomain,
        syncStatus: shouldAutoVerify ? "success" : "pending",
        isVerified: shouldAutoVerify,
        lastSyncedAt: shouldAutoVerify ? new Date() : null,
      })
      .returning({
        id: publisherPartners.id,
        publisher_domain: publisherPartners.publisherDomain,
        display_name: publisherPartners.displayName,
        sync_status: publisherPartners.syncStatus,
        is_verified: publisherPartners.isVerified,
      });

    let message = "Publisher added successfully";
    if (shouldAutoVerify) {
      const reasons: string[] = [];
      if (isDev) reasons.push("development environment");
      if (isMock) reasons.push("mock tenant");
      message += ` (auto-verified for ${reasons.join(" and ")})`;
    }

    return reply.code(201).send({
      id: inserted?.id,
      publisher_domain: inserted?.publisher_domain,
      display_name: inserted?.display_name,
      sync_status: inserted?.sync_status,
      is_verified: inserted?.is_verified,
      message,
    });
  });

  fastify.delete("/tenant/:id/publisher-partners/:p_id", async (request, reply) => {
    const { id, p_id } = request.params as { id: string; p_id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const partnerId = parseInt(p_id, 10);
    if (Number.isNaN(partnerId)) return reply.code(400).send({ error: "Invalid partner id" });

    const [partner] = await db
      .select()
      .from(publisherPartners)
      .where(and(eq(publisherPartners.tenantId, id), eq(publisherPartners.id, partnerId)))
      .limit(1);
    if (!partner) return reply.code(404).send({ error: "Publisher not found" });

    await db
      .delete(publisherPartners)
      .where(and(eq(publisherPartners.tenantId, id), eq(publisherPartners.id, partnerId)));
    return reply.send({ message: "Publisher deleted successfully" });
  });

  fastify.post("/tenant/:id/publisher-partners/sync", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const partners = await db
      .select()
      .from(publisherPartners)
      .where(eq(publisherPartners.tenantId, id));

    if (partners.length === 0) {
      return reply.send({ message: "No publishers to sync", synced: 0, verified: 0, errors: 0, total: 0 });
    }

    // Auto-verify for dev or mock tenants (no real adagents.json to check)
    const isDev = process.env["NODE_ENV"] === "development";
    const tenantWithAdapter = tenant as unknown as {
      adapterType?: string;
      adapter_type?: string;
    };
    const adapterType = tenantWithAdapter.adapterType ?? tenantWithAdapter.adapter_type;
    const isMock = adapterType === "mock";
    const shouldAutoVerify = isDev || isMock;

    const now = new Date();

    if (shouldAutoVerify) {
      const reasons: string[] = [];
      if (isDev) reasons.push("development environment");
      if (isMock) reasons.push("mock tenant");
      const reasonStr = reasons.join(", ");

      for (const partner of partners) {
        await db
          .update(publisherPartners)
          .set({ syncStatus: "success", isVerified: true, syncError: null, lastSyncedAt: now })
          .where(eq(publisherPartners.id, partner.id));
      }

      return reply.send({
        message: `Sync completed (${reasonStr} - auto-verified)`,
        synced: partners.length,
        verified: partners.length,
        errors: 0,
        total: partners.length,
      });
    }

    // Real verification: build our agent URL for this tenant
    const salesAgentDomain = process.env["SALES_AGENT_DOMAIN"] ?? "";
    const agentUrl =
      tenant.virtualHost
        ? `https://${tenant.virtualHost}`
        : salesAgentDomain
          ? `https://${tenant.subdomain}.${salesAgentDomain}`
          : null;

    if (!agentUrl) {
      return reply.code(500).send({ error: "Agent URL not configured (SALES_AGENT_DOMAIN not set)" });
    }

    // Check each publisher in parallel with a 30s overall timeout
    type CheckResult = { status: "success" | "error"; is_verified: boolean; error: string | null };
    const checkResults = new Map<string, CheckResult>();

    await Promise.allSettled(
      partners.map(async (partner) => {
        try {
          const adagentsData = await fetchAdagents(partner.publisherDomain, 10_000);
          const isAuthorized = verifyAgentAuthorization(adagentsData, agentUrl);

          if (isAuthorized) {
            checkResults.set(partner.publisherDomain, { status: "success", is_verified: true, error: null });
          } else {
            checkResults.set(partner.publisherDomain, {
              status: "error",
              is_verified: false,
              error: `Agent ${agentUrl} is not authorized by this publisher`,
            });
          }
        } catch (err: unknown) {
          const e = err as { code?: string; name?: string; message?: string };
          let errorMsg = "Unexpected error";
          if (e?.code === "ADAGENTS_NOT_FOUND") errorMsg = "Publisher adagents.json not found (404)";
          else if (e?.code === "ADAGENTS_VALIDATION") errorMsg = `Invalid adagents.json: ${e.message}`;
          else if (e?.name === "TimeoutError" || e?.name === "AbortError") errorMsg = "Request timed out";
          else errorMsg = `Unexpected error: ${e?.message ?? String(err)}`;
          checkResults.set(partner.publisherDomain, { status: "error", is_verified: false, error: errorMsg });
        }
      })
    );

    let synced = 0;
    let verified = 0;
    let errors = 0;

    for (const partner of partners) {
      const result = checkResults.get(partner.publisherDomain);
      if (result?.status === "success") {
        await db
          .update(publisherPartners)
          .set({ syncStatus: "success", isVerified: true, syncError: null, lastSyncedAt: now })
          .where(eq(publisherPartners.id, partner.id));
        synced++;
        if (result.is_verified) verified++;
      } else if (result) {
        await db
          .update(publisherPartners)
          .set({ syncStatus: "error", isVerified: false, syncError: result.error, lastSyncedAt: now })
          .where(eq(publisherPartners.id, partner.id));
        errors++;
      }
    }

    return reply.send({
      message: "Sync completed",
      synced,
      verified,
      errors,
      total: partners.length,
    });
  });

  fastify.get("/tenant/:id/publisher-partners/:p_id/properties", async (request, reply) => {
    const { id, p_id } = request.params as { id: string; p_id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const partnerId = parseInt(p_id, 10);
    if (Number.isNaN(partnerId)) return reply.code(400).send({ error: "Invalid partner id" });

    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, id)).limit(1);
    if (!tenant) return reply.code(404).send({ error: "Tenant not found" });

    const [partner] = await db
      .select()
      .from(publisherPartners)
      .where(and(eq(publisherPartners.tenantId, id), eq(publisherPartners.id, partnerId)))
      .limit(1);
    if (!partner) return reply.code(404).send({ error: "Publisher not found" });

    // Build our agent URL for authorization check
    const salesAgentDomain = process.env["SALES_AGENT_DOMAIN"] ?? "";
    const agentUrl =
      tenant.virtualHost
        ? `https://${tenant.virtualHost}`
        : salesAgentDomain
          ? `https://${tenant.subdomain}.${salesAgentDomain}`
          : null;

    if (!agentUrl) {
      return reply.code(500).send({ error: "Agent URL not configured (SALES_AGENT_DOMAIN not set)" });
    }

    try {
      const adagentsData = await fetchAdagents(partner.publisherDomain, 10_000);
      const isAuthorized = verifyAgentAuthorization(adagentsData, agentUrl);

      if (!isAuthorized) {
        return reply.send({
          error: `Agent ${agentUrl} is not authorized by this publisher`,
          is_authorized: false,
        });
      }

      const ctx = getPropertiesByAgent(adagentsData, agentUrl);
      return reply.send({
        domain: partner.publisherDomain,
        is_authorized: true,
        property_ids: ctx.property_ids,
        property_tags: ctx.property_tags,
        properties: ctx.raw_properties,
      });
    } catch (err: unknown) {
      const e = err as { code?: string; name?: string; message?: string };
      if (e?.code === "ADAGENTS_NOT_FOUND") {
        return reply.send({ error: "Publisher adagents.json not found (404)", is_authorized: false });
      }
      if (e?.code === "ADAGENTS_VALIDATION") {
        return reply.send({ error: `Invalid adagents.json: ${e.message}`, is_authorized: false });
      }
      if (e?.name === "TimeoutError" || e?.name === "AbortError") {
        return reply.send({ error: "Request timed out", is_authorized: false });
      }
      return reply.code(500).send({ error: String(e?.message ?? err) });
    }
  });
};

export default publisherPartnersRoute;
