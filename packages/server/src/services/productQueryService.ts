/**
 * Product query service: get-products business logic.
 *
 * Legacy equivalent: _legacy/src/core/tools/products.py → _get_products_impl()
 *   Loads products for a tenant, applies filters, converts to AdCP Product shape.
 *   Policy checks, ranking, and pricing_options join are added in later tasks.
 */
import { asc, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { products as productsTable } from "../db/schema/products.js";
import type { GetProductsRequest, GetProductsResponse } from "../schemas/getProducts.js";
import { GetProductsResponseSchema } from "../schemas/getProducts.js";
import type { Product } from "../schemas/product.js";

export interface ProductQueryContext {
  tenantId: string;
  /** Authenticated principal ID; null/undefined means anonymous request. */
  principalId?: string | null;
}

/**
 * Build AdCP publisher_properties array from DB row.
 * At least one entry required per AdCP spec; prefer property_tags, then property_ids, then properties.
 */
function rowToPublisherProperties(row: {
  propertyTags?: string[] | null;
  propertyIds?: string[] | null;
  properties?: Record<string, unknown>[] | null;
}): Product["publisher_properties"] {
  if (row.propertyTags && row.propertyTags.length > 0) {
    return [{ selection_type: "by_tag", property_tags: row.propertyTags }];
  }
  if (row.propertyIds && row.propertyIds.length > 0) {
    return row.propertyIds.map((id) => ({ property_id: id }));
  }
  if (row.properties && row.properties.length > 0) {
    return row.properties as Product["publisher_properties"];
  }
  return [{ selection_type: "by_tag", property_tags: ["all_inventory"] }];
}

function toPricingOptions(
  row: typeof productsTable.$inferSelect,
): Product["pricing_options"] {
  const fromConfig = row.implementationConfig?.["pricing_options"];
  if (!Array.isArray(fromConfig)) {
    return [];
  }

  return fromConfig
    .filter(
      (item): item is Record<string, unknown> =>
        item != null && typeof item === "object",
    )
    .map((item, index) => ({
      pricing_option_id:
        typeof item["pricing_option_id"] === "string"
          ? item["pricing_option_id"]
          : `${row.productId}_po_${index}`,
      pricing_model:
        typeof item["pricing_model"] === "string"
          ? (item["pricing_model"].toLowerCase() as Product["pricing_options"][number]["pricing_model"])
          : "cpm",
      currency: typeof item["currency"] === "string" ? item["currency"] : "USD",
      fixed_price:
        typeof item["fixed_price"] === "number" ? item["fixed_price"] : undefined,
      floor_price:
        typeof item["floor_price"] === "number" ? item["floor_price"] : undefined,
      price_guidance:
        item["price_guidance"] != null &&
        typeof item["price_guidance"] === "object"
          ? (item["price_guidance"] as Record<string, unknown>)
          : undefined,
      min_spend_per_package:
        typeof item["min_spend_per_package"] === "number"
          ? item["min_spend_per_package"]
          : undefined,
      parameters:
        item["parameters"] != null && typeof item["parameters"] === "object"
          ? (item["parameters"] as Record<string, unknown>)
          : undefined,
    }));
}

function inferChannelsFromFormats(formats: Product["format_ids"]): string[] {
  const channels = new Set<string>();
  for (const format of formats) {
    const prefix = format.id.split("_")[0]?.toLowerCase();
    if (prefix) {
      channels.add(prefix === "video" ? "olv" : prefix);
    }
  }
  return [...channels];
}

function extractFilterChannels(filters: Record<string, unknown>): string[] {
  const raw = filters["channels"];
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (typeof entry === "string") return entry.toLowerCase();
      if (
        entry != null &&
        typeof entry === "object" &&
        typeof entry["value"] === "string"
      ) {
        return entry["value"].toLowerCase();
      }
      return null;
    })
    .filter((entry): entry is string => entry != null);
}

const STANDARD_FORMAT_PREFIXES = ["display_", "video_", "audio_", "native_"];

function matchesProductFilters(
  product: Product,
  request: GetProductsRequest,
  row: typeof productsTable.$inferSelect,
): boolean {
  const filters = request.filters;
  if (!filters) return true;

  if (
    filters.delivery_type != null &&
    product.delivery_type !== filters.delivery_type
  ) {
    return false;
  }

  if (filters.format_ids?.length) {
    const requestFormatIds = new Set(filters.format_ids.map((f) => f.id));
    const productFormatIds = new Set(product.format_ids.map((f) => f.id));
    const hasFormatMatch = [...requestFormatIds].some((id) =>
      productFormatIds.has(id),
    );
    if (!hasFormatMatch) {
      return false;
    }
  }

  if (filters.format_types?.length) {
    const formatTypes = new Set(
      product.format_ids.map((f) => f.id.split("_")[0]?.toLowerCase() ?? ""),
    );
    const hasTypeMatch = filters.format_types.some((type) =>
      formatTypes.has(type.toLowerCase()),
    );
    if (!hasTypeMatch) {
      return false;
    }
  }

  if (filters.is_fixed_price != null) {
    const hasFixedPricing =
      product.pricing_options.some((option) => option.fixed_price != null) ||
      (product.pricing_options.length === 0 &&
        product.delivery_type === "guaranteed");

    if (filters.is_fixed_price !== hasFixedPricing) {
      return false;
    }
  }

  // standard_formats_only: all format_ids must start with IAB standard prefixes
  if (filters.standard_formats_only) {
    const hasOnlyStandard = product.format_ids.every((f) =>
      STANDARD_FORMAT_PREFIXES.some((prefix) => f.id.startsWith(prefix)),
    );
    if (!hasOnlyStandard) {
      return false;
    }
  }

  // countries: if product has country restrictions, at least one must match the filter
  if (filters.countries?.length) {
    const productCountries = row.countries;
    if (productCountries && productCountries.length > 0) {
      const requestCountries = new Set(
        filters.countries.map((c) => c.toUpperCase()),
      );
      const productCountrySet = new Set(
        productCountries.map((c) => c.toUpperCase()),
      );
      const hasCountryMatch = [...requestCountries].some((c) =>
        productCountrySet.has(c),
      );
      if (!hasCountryMatch) {
        return false;
      }
    }
    // Products with no country restrictions are visible to any country filter
  }

  const channels = extractFilterChannels(filters as Record<string, unknown>);
  if (channels.length > 0) {
    const productChannels =
      row.channels?.map((channel) => channel.toLowerCase()) ??
      inferChannelsFromFormats(product.format_ids);
    const channelSet = new Set(productChannels);
    if (!channels.some((channel) => channelSet.has(channel))) {
      return false;
    }
  }

  return true;
}

/**
 * Map a single products table row to AdCP Product shape (snake_case).
 * pricing_options are stubbed empty until a pricing_options table/service exists.
 */
function rowToProduct(row: typeof productsTable.$inferSelect): Product {
  const product: Product = {
    product_id: row.productId,
    name: row.name,
    description: row.description ?? undefined,
    format_ids: row.formatIds ?? [],
    delivery_type: row.deliveryType,
    publisher_properties: rowToPublisherProperties(row),
    pricing_options: toPricingOptions(row),
    is_custom: row.isCustom,
  };
  if (row.deliveryMeasurement) {
    product.delivery_measurement = row.deliveryMeasurement as Product["delivery_measurement"];
  }
  if (row.measurement) {
    product.measurement = row.measurement;
  }
  if (row.creativePolicy) {
    product.creative_policy = row.creativePolicy;
  }
  if (row.productCard) {
    product.product_card = row.productCard as Product["product_card"];
  }
  if (row.productCardDetailed) {
    product.product_card_detailed = row.productCardDetailed;
  }
  if (row.placements && row.placements.length > 0) {
    product.placements = row.placements;
  }
  if (row.reportingCapabilities) {
    product.reporting_capabilities = row.reportingCapabilities;
  }
  return product;
}

/**
 * Query products for a tenant and return GetProductsResponse.
 * Applies allowed_principal_ids access control, request filters, and strips
 * pricing_options for anonymous (unauthenticated) callers — matching Python
 * _get_products_impl() parity.
 */
export async function queryProducts(
  ctx: ProductQueryContext,
  request: GetProductsRequest,
): Promise<GetProductsResponse> {
  const rows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.tenantId, ctx.tenantId))
    .orderBy(asc(productsTable.productId));

  const principalId = ctx.principalId ?? null;

  // allowed_principal_ids access control (Python L377-406)
  const accessibleRows = rows.filter((row) => {
    const allowedIds = row.allowedPrincipalIds;
    if (!allowedIds || allowedIds.length === 0) {
      return true;
    }
    if (principalId && allowedIds.includes(principalId)) {
      return true;
    }
    return false;
  });

  let products: Product[] = accessibleRows
    .map((row) => ({ row, product: rowToProduct(row) }))
    .filter(({ row, product }) => matchesProductFilters(product, request, row))
    .map(({ product }) => product);

  // Anonymous user pricing strip: remove pricing_options for unauthenticated callers (Python L726-730)
  if (principalId === null) {
    products = products.map((p) => ({ ...p, pricing_options: [] }));
  }

  const response: GetProductsResponse = {
    products,
    errors: undefined,
    context: request.context,
  };
  GetProductsResponseSchema.parse(response);
  return response;
}
