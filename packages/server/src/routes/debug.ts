/**
 * Debug routes (testing / diagnostics).
 *
 * Legacy equivalent: _legacy/src/core/main.py
 *   - GET /debug/db-state (ADCP_TESTING only)
 *   - GET /debug/tenant (tenant detection from headers)
 *   - GET /debug/root (virtual host + tenant debug info)
 *   - GET /debug/landing (landing page HTML or 404)
 *   - GET /debug/root-logic (step-by-step root logic)
 */
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyRequest,
} from "fastify";
import type { HeaderBag } from "../auth/resolveTenantFromHost.js";
import {
  debugDbStateRouteSchema,
  debugLandingRouteSchema,
  debugRootLogicRouteSchema,
  debugRootRouteSchema,
  debugTenantRouteSchema,
} from "./schemas/system/debugRoutes.schema.js";
import {
  getDebugDbStatePayload,
  resolveLandingDebugPayload,
  resolveRootDebugPayload,
  resolveRootLogicDebugPayload,
  resolveTenantDebugPayload,
} from "../services/debugRouteService.js";

const DEBUG_FORBIDDEN = "Only available in testing mode";

type DebugHeadersRequest = FastifyRequest<{ Headers: HeaderBag }>;

const debugRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /debug/db-state — testing only
  fastify.get(
    "/debug/db-state",
    {
      schema: debugDbStateRouteSchema,
    },
    async (_request, reply) => {
      if (process.env["ADCP_TESTING"] !== "true") {
        return reply.status(403).send({ error: DEBUG_FORBIDDEN });
      }
      const payload = await getDebugDbStatePayload();
      return reply.send(payload);
    },
  );

  // GET /debug/tenant — tenant detection from headers
  fastify.get(
    "/debug/tenant",
    {
      schema: debugTenantRouteSchema,
    },
    async (request: DebugHeadersRequest, reply) => {
      const headers = request.headers;
      const payload = await resolveTenantDebugPayload(headers);

      if (payload.tenant_id) {
        return reply.header("X-Tenant-Id", payload.tenant_id).send(payload);
      }

      return reply.send(payload);
    },
  );

  // GET /debug/root — virtual host + tenant debug info
  fastify.get(
    "/debug/root",
    {
      schema: debugRootRouteSchema,
    },
    async (request: DebugHeadersRequest, reply) => {
      const headers = request.headers;
      const payload = await resolveRootDebugPayload(headers);
      return reply.send(payload);
    },
  );

  // GET /debug/landing — landing HTML or 404
  fastify.get(
    "/debug/landing",
    {
      schema: debugLandingRouteSchema,
    },
    async (request: DebugHeadersRequest, reply) => {
      const headers = request.headers;
      const html = await resolveLandingDebugPayload(headers);

      if (!html) {
        return reply.status(404).send({ error: "No tenant found" });
      }

      return reply.type("text/html").send(html);
    },
  );

  // GET /debug/root-logic — step-by-step root logic
  fastify.get(
    "/debug/root-logic",
    {
      schema: debugRootLogicRouteSchema,
    },
    async (request: DebugHeadersRequest, reply) => {
      const headers = request.headers;
      const payload = await resolveRootLogicDebugPayload(headers);
      return reply.send(payload);
    },
  );
};

export default debugRoute;
