/**
 * Public signup routes. Parity with _legacy public.py:
 * GET /signup (landing), GET /signup/start (start OAuth); redirect if on tenant subdomain.
 */
import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";

import { resolveTenantFromHeaders } from "../../../auth/resolveTenantFromHost.js";
import { getAdminSession, setAdminSessionValue } from "../../services/sessionService.js";

function getScriptRoot(request: FastifyRequest): string {
  const r = request as FastifyRequest & { scriptRoot?: string };
  return r.scriptRoot ?? "";
}

const signupRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/signup", async (request, reply) => {
    const root = getScriptRoot(request);

    const tenant = await resolveTenantFromHeaders(request.headers);
    if (tenant) {
      return reply.redirect(`${root}/login`, 302);
    }

    const session = getAdminSession(request);
    if (session.user) {
      if (session.tenant_id) {
        return reply.redirect(`${root}/tenant/${encodeURIComponent(String(session.tenant_id))}`, 302);
      }
      if (session.is_super_admin) {
        return reply.redirect(`${root}/`, 302);
      }
    }

    return reply.send({ page: "landing" });
  });

  fastify.get("/signup/start", async (request, reply) => {
    const root = getScriptRoot(request);

    const tenant = await resolveTenantFromHeaders(request.headers);
    if (tenant) {
      return reply.redirect(`${root}/login`, 302);
    }

    setAdminSessionValue(request, "signup_flow", true);
    setAdminSessionValue(request, "signup_step", "oauth");

    return reply.redirect(`${root}/auth/google`, 302);
  });
};

export default signupRoute;
