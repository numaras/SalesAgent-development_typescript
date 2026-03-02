/**
 * A2A skill: get_products — optional auth, MinimalContext fallback, validate brief or brand_manifest, call productService.
 *
 * Legacy equivalent: _legacy/src/a2a_server/adcp_a2a_server.py
 *   _handle_get_products_skill(), _handle_products_task().
 */
import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { GetProductsRequestSchema } from "../../schemas/getProducts.js";
import { queryProducts } from "../../services/productQueryService.js";
import { isToolContext } from "../authExtractor.js";
import { registerSkill, ServerError } from "../dispatcher.js";

const INVALID_PARAMS_CODE = -32602;

async function getProductsHandler(
  params: Record<string, unknown>,
  _authToken: string | null,
  context: import("../authExtractor.js").A2AContext,
): Promise<unknown> {
  const parsed = GetProductsRequestSchema.safeParse(params);
  if (!parsed.success) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "Invalid get_products params",
      parsed.error.flatten(),
    );
  }

  const { brief, brand_manifest } = parsed.data;
  if (!brief && brand_manifest === undefined) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "get_products requires at least one of: brief, brand_manifest",
    );
  }

  let tenantId: string;
  if (isToolContext(context)) {
    tenantId = context.tenantId;
  } else {
    const tenant = await resolveTenantFromHeaders(context.headers);
    tenantId = tenant?.tenantId ?? "default";
  }

  const response = await queryProducts(
    { tenantId },
    parsed.data,
  );
  return response;
}

registerSkill("get_products", getProductsHandler);
