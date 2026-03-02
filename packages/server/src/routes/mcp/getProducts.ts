/**
 * POST /mcp/get-products — AdCP get-products (optional auth).
 *
 * Legacy equivalent: _legacy/src/core/tools/products.py → get_products_raw();
 *   _legacy/src/core/main.py → @mcp.tool() registration.
 *
 * Resolves tenant from headers; optionally requires auth or brand_manifest per
 * tenant brand_manifest_policy. Chains: productQueryService → productRankingService
 * (stub) → v2CompatTransform when client adcp_version < 3.
 *
 * Register with prefix: await app.register(getProductsRoute, { prefix: '/mcp' })
 * Ensure authPlugin is registered so request.auth is set when token present.
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { GetProductsRequestSchema } from "../../schemas/getProducts.js";
import type { GetProductsResponse } from "../../schemas/getProducts.js";
import { getProductsRouteSchema } from "../schemas/mcp/getProducts.schema.js";
import { queryProducts } from "../../services/productQueryService.js";
import {
  checkBrandManifestPolicy,
  rankProductsByBrief,
} from "../../services/productRankingService.js";
import {
  addV2CompatToProducts,
  needsV2Compat,
} from "../../services/v2CompatTransform.js";

const getProductsRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.post(
    "/get-products",
    {
      schema: getProductsRouteSchema,
    },
    async (request, reply) => {
      const headers = request.headers as Record<
        string,
        string | string[] | undefined
      >;
      const tenant = await resolveTenantFromHeaders(headers);
      if (!tenant) {
        return reply.code(400).send({
          error: "NO_TENANT",
          message:
            "Cannot determine tenant. Set Host, x-adcp-tenant, or use a known tenant host.",
        });
      }

      const body = request.body as Record<string, unknown> | undefined;
      const parsed = body
        ? GetProductsRequestSchema.parse(body)
        : GetProductsRequestSchema.parse({});

      const policyResult = checkBrandManifestPolicy(
        tenant.brandManifestPolicy ?? "require_auth",
        {
          principalId: request.auth?.principalId ?? null,
          hasBrandManifest: parsed.brand_manifest != null,
        },
      );
      if (!policyResult.allowed) {
        return reply.code(403).send({
          error: "POLICY_VIOLATION",
          message: policyResult.error,
        });
      }

      const response = await queryProducts(
        { tenantId: tenant.tenantId },
        parsed,
      );
      const ranked = rankProductsByBrief(
        tenant.tenantId,
        parsed.brief ?? "",
        tenant.productRankingPrompt ?? undefined,
        response.products,
      );

      const adcpVersion =
        (typeof headers["x-adcp-version"] === "string"
          ? headers["x-adcp-version"]
          : Array.isArray(headers["x-adcp-version"])
            ? headers["x-adcp-version"][0]
            : undefined) ??
        (parsed.ext as { adcp_version?: string } | undefined)?.adcp_version ??
        null;

      let payload: GetProductsResponse;
      if (needsV2Compat(adcpVersion)) {
        const productDicts = ranked.map((p) => ({ ...p })) as Record<
          string,
          unknown
        >[];
        addV2CompatToProducts(productDicts);
        payload = { products: productDicts as GetProductsResponse["products"] };
      } else {
        payload = { products: ranked };
      }

      return reply.send(payload);
    },
  );
};

export default getProductsRoute;
