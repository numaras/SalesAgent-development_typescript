import { asc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { products } from "../../../db/schema/products.js";
import {
  listTenantProductsRouteSchema,
  productSuggestionsRouteSchema,
} from "../../../routes/schemas/admin/api/productsList.schema.js";
import { getAdminSession } from "../../services/sessionService.js";

interface SuggestedProduct {
  product_id: string;
  name: string;
  description: string;
  delivery_type: string;
  cpm?: number | null;
  price_guidance?: { min: number; max: number };
  formats: string[];
  countries?: string[] | null;
  targeting_template?: Record<string, unknown>;
}

function defaultProducts(): SuggestedProduct[] {
  return [
    {
      product_id: "run_of_site_display",
      name: "Run of Site - Display",
      description: "Non-guaranteed display advertising across all available inventory. Supports standard IAB display formats.",
      delivery_type: "non_guaranteed",
      cpm: null,
      formats: ["display_300x250", "display_728x90", "display_320x50", "display_300x600"],
    },
    {
      product_id: "homepage_takeover",
      name: "Homepage Takeover",
      description: "Premium guaranteed placement on homepage with high viewability. Desktop and mobile optimized.",
      delivery_type: "guaranteed",
      cpm: 25,
      formats: ["display_970x250", "display_728x90", "display_320x50"],
    },
    {
      product_id: "mobile_interstitial",
      name: "Mobile Interstitial",
      description: "Full-screen mobile interstitial ads with frequency capping. High engagement rates.",
      delivery_type: "guaranteed",
      cpm: 15,
      formats: ["display_320x480", "display_300x250"],
    },
    {
      product_id: "video_preroll",
      name: "Video Pre-Roll",
      description: "Standard pre-roll video advertising. VAST 4.0 compliant with viewability measurement.",
      delivery_type: "non_guaranteed",
      cpm: null,
      formats: ["video_vast"],
    },
    {
      product_id: "native_infeed",
      name: "Native In-Feed",
      description: "Native advertising that matches your site's look and feel. Appears within content feeds.",
      delivery_type: "non_guaranteed",
      cpm: null,
      formats: ["native_infeed"],
    },
    {
      product_id: "contextual_display",
      name: "Contextual Display",
      description: "Display advertising with contextual targeting based on page content. No cookies required.",
      delivery_type: "non_guaranteed",
      cpm: null,
      formats: ["display_300x250", "display_728x90", "display_160x600"],
    },
  ];
}

const INDUSTRY_PRODUCTS: Record<string, SuggestedProduct[]> = {
  news: [
    {
      product_id: "breaking_news_alert",
      name: "Breaking News Alert Sponsorship",
      description: "Sponsor breaking news alerts with guaranteed placement at top of article pages.",
      delivery_type: "guaranteed",
      cpm: 30,
      formats: ["display_728x90", "display_300x250"],
    },
  ],
  sports: [
    {
      product_id: "game_day_takeover",
      name: "Game Day Takeover",
      description: "Own the site on game days with synchronized creative across all placements.",
      delivery_type: "guaranteed",
      cpm: 40,
      formats: ["display_970x250", "display_300x600", "video_vast"],
    },
  ],
  entertainment: [
    {
      product_id: "video_companion",
      name: "Video Companion Display",
      description: "Display ads that appear alongside video content for maximum engagement.",
      delivery_type: "non_guaranteed",
      price_guidance: { min: 5, max: 20 },
      formats: ["display_300x250", "display_300x600"],
    },
  ],
  ecommerce: [
    {
      product_id: "product_retargeting",
      name: "Product Retargeting Display",
      description: "Dynamic product ads for retargeting shoppers who viewed specific products.",
      delivery_type: "non_guaranteed",
      price_guidance: { min: 3, max: 15 },
      formats: ["display_300x250", "display_728x90", "native_infeed"],
    },
  ],
};

function getIndustrySpecificProducts(industry: string): SuggestedProduct[] {
  const key = industry.trim().toLowerCase();
  const base = defaultProducts();
  const specific = INDUSTRY_PRODUCTS[key];
  if (specific) return [...base, ...specific];
  return base;
}

function avgCpm(product: SuggestedProduct): number {
  if (typeof product.cpm === "number") return product.cpm;
  if (product.price_guidance) {
    return (product.price_guidance.min + product.price_guidance.max) / 2;
  }
  return 0;
}

const productsListApiRoute: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.get("/api/tenant/:id/products", { schema: listTenantProductsRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });

    const rows = await db
      .select({
        product_id: products.productId,
        name: products.name,
        description: products.description,
        delivery_type: products.deliveryType,
      })
      .from(products)
      .where(eq(products.tenantId, id))
      .orderBy(asc(products.name));

    return reply.send({ products: rows });
  });

  fastify.get("/api/tenant/:id/products/suggestions", { schema: productSuggestionsRouteSchema }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = getAdminSession(request);
    if (!session.user) return reply.code(401).send({ error: "UNAUTHENTICATED" });

    const query = (request.query ?? {}) as Record<string, unknown>;
    const industry = typeof query.industry === "string" ? query.industry : "";
    const includeStandard =
      typeof query.include_standard === "string"
        ? query.include_standard.toLowerCase() === "true"
        : true;
    const deliveryType =
      typeof query.delivery_type === "string" ? query.delivery_type : null;
    const maxCpm =
      typeof query.max_cpm === "string" ? Number(query.max_cpm) : null;
    const formats = Array.isArray(query.formats)
      ? query.formats.filter((item): item is string => typeof item === "string")
      : typeof query.formats === "string"
        ? [query.formats]
        : [];

    const suggestions: SuggestedProduct[] = [];
    if (industry) {
      suggestions.push(...getIndustrySpecificProducts(industry));
    } else if (includeStandard) {
      suggestions.push(...defaultProducts());
    }

    const filtered = suggestions.filter((product) => {
      if (deliveryType && product.delivery_type !== deliveryType) return false;
      const effectiveCpm = avgCpm(product);
      if (typeof maxCpm === "number" && !Number.isNaN(maxCpm) && effectiveCpm > maxCpm) {
        return false;
      }
      if (formats.length > 0) {
        const intersection = product.formats.filter((fmt) => formats.includes(fmt));
        if (intersection.length === 0) return false;
      }
      return true;
    });

    const existingRows = await db
      .select({ product_id: products.productId })
      .from(products)
      .where(eq(products.tenantId, id));
    const existingIds = new Set(existingRows.map((row) => row.product_id));
    const standardIds = new Set(defaultProducts().map((product) => product.product_id));

    const withMetadata = filtered
      .map((product) => {
        const matchingFormats = formats.length
          ? product.formats.filter((format) => formats.includes(format)).length
          : 0;
        let score = 100;
        if (deliveryType && product.delivery_type === deliveryType) score += 20;
        if (industry && !standardIds.has(product.product_id)) score += 30;
        score += matchingFormats * 10;
        return {
          ...product,
          already_exists: existingIds.has(product.product_id),
          is_industry_specific: !standardIds.has(product.product_id),
          match_score: Math.min(score, 100),
        };
      })
      .sort((a, b) => {
        const aIndustry = a.is_industry_specific ? 1 : 0;
        const bIndustry = b.is_industry_specific ? 1 : 0;
        if (aIndustry !== bIndustry) return bIndustry - aIndustry;
        const aCpm = avgCpm(a);
        const bCpm = avgCpm(b);
        if (aCpm !== bCpm) return aCpm - bCpm;
        return b.formats.length - a.formats.length;
      });

    return reply.send({
      suggestions: withMetadata,
      total_count: withMetadata.length,
      criteria: {
        industry: industry || null,
        delivery_type: deliveryType,
        max_cpm: maxCpm,
        formats,
      },
    });
  });
};

export default productsListApiRoute;
