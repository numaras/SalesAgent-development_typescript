import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { tenants } from "../../../db/schema/tenants.js";
import {
  redirectToNextOrDefault,
  setAdminSessionValue,
} from "../../services/sessionService.js";

type TestUserRole = "super_admin" | "tenant_admin" | "tenant_user";

interface TestUserConfig {
  password: string;
  name: string;
  role: TestUserRole;
}

function isSingleTenantMode(): boolean {
  return process.env["SINGLE_TENANT_MODE"]?.toLowerCase() === "true";
}

function isEnvTestModeEnabled(): boolean {
  return process.env["ADCP_AUTH_TEST_MODE"]?.toLowerCase() === "true";
}

function parseCsvEnv(name: string): string[] {
  const value = process.env[name];
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

function isSuperAdmin(email: string): boolean {
  const normalized = email.toLowerCase();
  if (!normalized) return false;

  const superAdminEmails = parseCsvEnv("SUPER_ADMIN_EMAILS");
  if (superAdminEmails.includes(normalized)) return true;

  const domain = normalized.includes("@") ? normalized.split("@")[1] : "";
  const superAdminDomains = parseCsvEnv("SUPER_ADMIN_DOMAINS");
  return !!domain && superAdminDomains.includes(domain);
}

function titleCaseFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  if (!localPart) return "User";
  return localPart.charAt(0).toUpperCase() + localPart.slice(1);
}

function buildTestUsers(): Record<string, TestUserConfig> {
  return {
    [process.env["TEST_SUPER_ADMIN_EMAIL"] ?? "test_super_admin@example.com"]: {
      password: process.env["TEST_SUPER_ADMIN_PASSWORD"] ?? "test123",
      name: "Test Super Admin",
      role: "super_admin",
    },
    [process.env["TEST_TENANT_ADMIN_EMAIL"] ?? "test_tenant_admin@example.com"]: {
      password: process.env["TEST_TENANT_ADMIN_PASSWORD"] ?? "test123",
      name: "Test Tenant Admin",
      role: "tenant_admin",
    },
    [process.env["TEST_TENANT_USER_EMAIL"] ?? "test_tenant_user@example.com"]: {
      password: process.env["TEST_TENANT_USER_PASSWORD"] ?? "test123",
      name: "Test Tenant User",
      role: "tenant_user",
    },
  };
}

async function canUseTestAuth(tenantId: string | null): Promise<boolean> {
  if (isEnvTestModeEnabled()) return true;
  if (!tenantId) return false;

  const [tenant] = await db
    .select({ authSetupMode: tenants.authSetupMode })
    .from(tenants)
    .where(and(eq(tenants.tenantId, tenantId), eq(tenants.isActive, true)))
    .limit(1);
  return Boolean(tenant?.authSetupMode);
}

function normalizeTenantId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const testAuthRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/test/auth", async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const emailRaw = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const email = emailRaw.trim().toLowerCase();

    let tenantId = normalizeTenantId(body.tenant_id);
    if (isSingleTenantMode() && !tenantId) {
      tenantId = "default";
    }

    if (!(await canUseTestAuth(tenantId))) {
      return reply.code(404).send({ error: "NOT_FOUND" });
    }

    const testUsers = buildTestUsers();
    const matchingUser = testUsers[email];
    const isSuperAdminLogin = isSuperAdmin(email) && password === "test123";

    if (!isSuperAdminLogin && (!matchingUser || matchingUser.password !== password)) {
      return reply.redirect("/login");
    }

    const userName = isSuperAdminLogin ? titleCaseFromEmail(email) : matchingUser.name;
    const role = isSuperAdminLogin ? "super_admin" : matchingUser.role;

    setAdminSessionValue(request, "test_user", email);
    setAdminSessionValue(request, "test_user_name", userName);
    setAdminSessionValue(request, "test_user_role", role);
    setAdminSessionValue(request, "user", email);
    setAdminSessionValue(request, "user_name", userName);
    setAdminSessionValue(request, "role", role);
    setAdminSessionValue(request, "authenticated", true);
    setAdminSessionValue(request, "email", email);
    if (role === "super_admin") {
      setAdminSessionValue(request, "is_super_admin", true);
    }

    if (tenantId) {
      setAdminSessionValue(request, "test_tenant_id", tenantId);
      setAdminSessionValue(request, "tenant_id", tenantId);
      return redirectToNextOrDefault(
        request,
        reply,
        `/tenant/${encodeURIComponent(tenantId)}/dashboard`,
      );
    }

    return redirectToNextOrDefault(request, reply, "/");
  });

  fastify.get("/test/login", async (_request, reply) => {
    if (!isEnvTestModeEnabled()) {
      return reply.code(404).send({ error: "NOT_FOUND" });
    }

    return reply.send({
      test_mode: true,
      test_only: true,
      single_tenant_mode: isSingleTenantMode(),
    });
  });
};

export default testAuthRoute;
