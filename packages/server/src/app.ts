import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter as BullBoardFastifyAdapter } from "@bull-board/fastify";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import authPlugin from "./auth/authPlugin.js";
import adminRoutes from "./admin/routes/index.js";
import { getGamSyncQueue } from "./jobs/queues.js";
import { getAdminSession } from "./admin/services/sessionService.js";
import jsonRpcRoute from "./routes/a2a/jsonRpc.js";
import agentCardRoute from "./routes/a2a/agentCard.js";
import adminDbResetRoute from "./routes/adminDbReset.js";
import debugRoute from "./routes/debug.js";
import healthRoute from "./routes/health.js";
import healthConfigRoute from "./routes/healthConfig.js";
import completeTaskRoute from "./routes/mcp/completeTask.js";
import createMediaBuyRoute from "./routes/mcp/createMediaBuy.js";
import getAdcpCapabilitiesRoute from "./routes/mcp/getAdcpCapabilities.js";
import getMediaBuyDeliveryRoute from "./routes/mcp/getMediaBuyDelivery.js";
import getMediaBuysRoute from "./routes/mcp/getMediaBuys.js";
import getProductsRoute from "./routes/mcp/getProducts.js";
import getTaskRoute from "./routes/mcp/getTask.js";
import listAuthorizedPropertiesRoute from "./routes/mcp/listAuthorizedProperties.js";
import listCreativeFormatsRoute from "./routes/mcp/listCreativeFormats.js";
import listCreativesRoute from "./routes/mcp/listCreatives.js";
import listTasksRoute from "./routes/mcp/listTasks.js";
import syncCreativesRoute from "./routes/mcp/syncCreatives.js";
import updateMediaBuyRoute from "./routes/mcp/updateMediaBuy.js";
import updatePerformanceIndexRoute from "./routes/mcp/updatePerformanceIndex.js";
import schemasRootRoute from "./routes/schemas/root.js";

export interface AppOptions {
  logger?: boolean | object;
  registerDefaultRoutes?: boolean;
}

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? {
      level: process.env.LOG_LEVEL ?? "info",
    },
    // Trust nginx X-Forwarded-* headers so request.ip and protocol are correct
    trustProxy: true,
  });

  // Zod validation + serialization (replaces Pydantic in the legacy server)
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      error: "NOT_FOUND",
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
    });
  });

  app.setErrorHandler(async (error, request, reply) => {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));

    const maybeStatusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : undefined;

    const statusCode =
      typeof maybeStatusCode === "number" && maybeStatusCode >= 400
        ? maybeStatusCode
        : 500;

    if (statusCode >= 500) {
      request.log.error(
        { err: error, statusCode, method: request.method, url: request.url },
        "Unhandled route error",
      );
    } else {
      request.log.warn(
        { err: error, statusCode, method: request.method, url: request.url },
        "Handled route error",
      );
    }

    const message =
      statusCode >= 500 ? "Internal server error" : normalizedError.message;

    return reply.status(statusCode).send({
      error: statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
      message,
      statusCode,
    });
  });

  if (opts.registerDefaultRoutes ?? true) {
    // Cookie + session middleware (must be registered before any route that reads/writes session).
    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      secret: process.env.SESSION_SECRET ?? "adcp-sales-agent-dev-secret-change-in-production",
      cookieName: "adcp_session",
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: "lax",
      },
      saveUninitialized: false,
    });

    await app.register(authPlugin);

    // Utility/system routes.
    await app.register(healthRoute);
    await app.register(healthConfigRoute);
    await app.register(adminDbResetRoute);
    await app.register(debugRoute);

    // MCP tool routes.
    await app.register(getAdcpCapabilitiesRoute, { prefix: "/mcp" });
    await app.register(getProductsRoute, { prefix: "/mcp" });
    await app.register(listCreativeFormatsRoute, { prefix: "/mcp" });
    await app.register(listCreativesRoute, { prefix: "/mcp" });
    await app.register(syncCreativesRoute, { prefix: "/mcp" });
    await app.register(listAuthorizedPropertiesRoute, { prefix: "/mcp" });
    await app.register(createMediaBuyRoute, { prefix: "/mcp" });
    await app.register(updateMediaBuyRoute, { prefix: "/mcp" });
    await app.register(getMediaBuyDeliveryRoute, { prefix: "/mcp" });
    await app.register(getMediaBuysRoute, { prefix: "/mcp" });
    await app.register(updatePerformanceIndexRoute, { prefix: "/mcp" });
    await app.register(listTasksRoute, { prefix: "/mcp" });
    await app.register(getTaskRoute, { prefix: "/mcp" });
    await app.register(completeTaskRoute, { prefix: "/mcp" });

    // A2A routes.
    await app.register(agentCardRoute);
    await app.register(jsonRpcRoute);

    // Schema service routes.
    await app.register(schemasRootRoute, { prefix: "/schemas" });

    // Admin routes (auth, tenants, settings, GAM, products, etc.)
    await app.register(adminRoutes);

    // Bull-Board queue monitoring dashboard — only when Redis is configured.
    // Skipped in test environments (NODE_ENV=test) and when REDIS_URL is absent
    // to prevent connection errors from polluting unit test output.
    if (process.env.NODE_ENV !== "test" && process.env.REDIS_URL) {
      const serverAdapter = new BullBoardFastifyAdapter();
      serverAdapter.setBasePath("/admin/queues");

      createBullBoard({
        queues: [new BullMQAdapter(getGamSyncQueue())],
        serverAdapter,
      });

      await app.register(async function bullBoardScope(scoped) {
        scoped.addHook(
          "preHandler",
          async (request: FastifyRequest, reply: FastifyReply) => {
            const session = getAdminSession(request);
            if (!session.user) {
              return reply.code(401).send({ error: "Unauthorized" });
            }
          },
        );
        await scoped.register(serverAdapter.registerPlugin(), {
          prefix: "/admin/queues",
          logLevel: "warn",
        });
      });
    }
  }

  return app;
}
