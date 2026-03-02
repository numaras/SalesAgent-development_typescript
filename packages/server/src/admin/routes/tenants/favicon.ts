import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import path from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";

import { db } from "../../../db/client.js";
import { auditLogs } from "../../../db/schema/auditLogs.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

const ALLOWED_EXTENSIONS = new Set(["ico", "png", "svg", "jpg", "jpeg"]);
const MAX_FAVICON_SIZE_BYTES = 1 * 1024 * 1024;

function isValidTenantId(tenantId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(tenantId);
}

function getFaviconBaseDir(): string {
  return path.resolve(process.cwd(), "../static/favicons");
}

function isSafeFaviconUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (!(lower.startsWith("http://") || lower.startsWith("https://"))) return false;
  if (lower.includes("javascript:") || lower.includes("data:")) return false;
  return true;
}

/**
 * Mirrors Python's _is_safe_favicon_path(): realpath guard preventing path traversal.
 */
function isSafeFaviconPath(baseDir: string, tenantId: string): boolean {
  const tenantDir = path.join(baseDir, tenantId);
  const resolvedBase = path.resolve(baseDir);
  const resolvedTenant = path.resolve(tenantDir);
  return resolvedTenant.startsWith(resolvedBase + path.sep);
}

const tenantFaviconRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/tenant/:id/upload_favicon", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);
    if (!isValidTenantId(id)) {
      return reply.code(400).send({ error: "Invalid tenant ID" });
    }

    const req = request as unknown as {
      file?: () => Promise<{ filename: string; toBuffer: () => Promise<Buffer> } | null>;
    };
    const part = req.file ? await req.file() : null;
    if (!part || !part.filename) {
      return reply.code(400).send({ error: "No file selected" });
    }

    const ext = part.filename.includes(".")
      ? part.filename.split(".").pop()?.toLowerCase() ?? ""
      : "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return reply
        .code(400)
        .send({ error: `Invalid file type. Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}` });
    }

    const bytes = await part.toBuffer();
    if (bytes.length > MAX_FAVICON_SIZE_BYTES) {
      return reply.code(400).send({
        error: `File too large. Maximum size: ${MAX_FAVICON_SIZE_BYTES / 1024}KB`,
      });
    }

    const baseDir = getFaviconBaseDir();
    const tenantDir = path.join(baseDir, id);
    await mkdir(tenantDir, { recursive: true });

    for (const oldExt of ALLOWED_EXTENSIONS) {
      const oldPath = path.join(tenantDir, `favicon.${oldExt}`);
      await rm(oldPath, { force: true });
    }

    const filename = `favicon.${ext}`;
    const filePath = path.join(tenantDir, filename);
    await writeFile(filePath, bytes);

    await db
      .update(tenants)
      .set({
        faviconUrl: `/static/favicons/${id}/${filename}`,
        updatedAt: new Date(),
      })
      .where(eq(tenants.tenantId, id));

    const actor = typeof session.user === "string" ? session.user : "unknown";
    try {
      await db.insert(auditLogs).values({
        tenantId: id,
        operation: "upload_favicon",
        principalName: actor,
        adapterId: "admin_ui",
        success: true,
        details: { event_type: "upload_favicon", favicon_url: `/static/favicons/${id}/${filename}` },
      });
    } catch { /* audit failure must not block response */ }

    return reply.send({ success: true, favicon_url: `/static/favicons/${id}/${filename}` });
  });

  fastify.post("/tenant/:id/update_favicon_url", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);

    const body = (request.body ?? {}) as Record<string, unknown>;
    const faviconUrlRaw = typeof body.favicon_url === "string" ? body.favicon_url.trim() : "";
    if (faviconUrlRaw && !isSafeFaviconUrl(faviconUrlRaw)) {
      return reply.code(400).send({
        error: "Invalid favicon URL. Only HTTP and HTTPS URLs are allowed.",
      });
    }

    await db
      .update(tenants)
      .set({
        faviconUrl: faviconUrlRaw || null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.tenantId, id));

    const actor = typeof session.user === "string" ? session.user : "unknown";
    try {
      await db.insert(auditLogs).values({
        tenantId: id,
        operation: "update_favicon_url",
        principalName: actor,
        adapterId: "admin_ui",
        success: true,
        details: { event_type: "update_favicon_url", favicon_url: faviconUrlRaw || null },
      });
    } catch { /* audit failure must not block response */ }

    return reply.send({
      success: true,
      message: faviconUrlRaw
        ? "Favicon URL updated successfully"
        : "Favicon URL cleared - using default favicon",
      favicon_url: faviconUrlRaw || null,
    });
  });

  fastify.post("/tenant/:id/remove_favicon", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const session = getAdminSession(request);
    if (!isValidTenantId(id)) {
      return reply.code(400).send({ error: "Invalid tenant ID" });
    }

    const baseDir = getFaviconBaseDir();

    // Mirror Python: only delete local files if favicon_url is a /static/favicons/ path
    const [tenantRow] = await db
      .select({ faviconUrl: tenants.faviconUrl })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);

    if (tenantRow?.faviconUrl?.startsWith("/static/favicons/")) {
      if (isSafeFaviconPath(baseDir, id)) {
        const tenantDir = path.join(baseDir, id);
        for (const ext of ALLOWED_EXTENSIONS) {
          await rm(path.join(tenantDir, `favicon.${ext}`), { force: true });
        }
      }
    }

    await db
      .update(tenants)
      .set({
        faviconUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.tenantId, id));

    const actor = typeof session.user === "string" ? session.user : "unknown";
    try {
      await db.insert(auditLogs).values({
        tenantId: id,
        operation: "remove_favicon",
        principalName: actor,
        adapterId: "admin_ui",
        success: true,
        details: { event_type: "remove_favicon" },
      });
    } catch { /* audit failure must not block response */ }

    return reply.send({
      success: true,
      message: "Favicon removed - using default favicon",
    });
  });
};

export default tenantFaviconRoute;
