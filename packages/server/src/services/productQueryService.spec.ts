/**
 * Unit tests for productQueryService.
 *
 * DB is mocked via vi.mock so no real PostgreSQL connection is needed.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/client.js", () => ({
  db: {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
  },
}));

import { db } from "../db/client.js";
import { GetProductsResponseSchema } from "../schemas/getProducts.js";
import { queryProducts } from "./productQueryService.js";

/** Fluent mock for db.select().from().where() returning a Promise of rows. */
function mockSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
  };
}

describe("queryProducts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns empty products when tenant has no products", async () => {
    vi.mocked(db).select = vi.fn().mockReturnValue(mockSelectChain([]));

    const result = await queryProducts(
      { tenantId: "tenant-a" },
      {},
    );

    expect(GetProductsResponseSchema.safeParse(result).success).toBe(true);
    expect(result.products).toEqual([]);
  });

  it("returns products in AdCP shape with publisher_properties from property_tags", async () => {
    const row = {
      productId: "prod-1",
      name: "Display 300x250",
      description: "Standard display",
      formatIds: [{ agent_url: "https://creative.example.org", id: "display_300x250" }],
      deliveryType: "guaranteed",
      propertyTags: ["premium"],
      propertyIds: null,
      properties: null,
      isCustom: false,
      deliveryMeasurement: null,
      measurement: null,
      creativePolicy: null,
      productCard: null,
      productCardDetailed: null,
      placements: null,
      reportingCapabilities: null,
    };
    vi.mocked(db).select = vi.fn().mockReturnValue(mockSelectChain([row]));

    const result = await queryProducts(
      { tenantId: "tenant-a" },
      { brief: "display" },
    );

    expect(GetProductsResponseSchema.safeParse(result).success).toBe(true);
    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({
      product_id: "prod-1",
      name: "Display 300x250",
      description: "Standard display",
      format_ids: [{ agent_url: "https://creative.example.org", id: "display_300x250" }],
      delivery_type: "guaranteed",
      publisher_properties: [{ selection_type: "by_tag", property_tags: ["premium"] }],
      pricing_options: [],
      is_custom: false,
    });
  });

  it("uses all_inventory when row has no property_tags or property_ids", async () => {
    const row = {
      productId: "prod-2",
      name: "Video",
      description: null,
      formatIds: [],
      deliveryType: "non_guaranteed",
      propertyTags: null,
      propertyIds: null,
      properties: null,
      isCustom: true,
      deliveryMeasurement: null,
      measurement: null,
      creativePolicy: null,
      productCard: null,
      productCardDetailed: null,
      placements: null,
      reportingCapabilities: null,
    };
    vi.mocked(db).select = vi.fn().mockReturnValue(mockSelectChain([row]));

    const result = await queryProducts({ tenantId: "t" }, {});

    expect(result.products[0].publisher_properties).toEqual([
      { selection_type: "by_tag", property_tags: ["all_inventory"] },
    ]);
  });

  it("applies format/channel/pricing filters", async () => {
    const rows = [
      {
        productId: "prod-fixed-display",
        name: "Display Fixed",
        description: null,
        formatIds: [{ agent_url: "https://creative.example.org", id: "display_300x250" }],
        deliveryType: "guaranteed",
        propertyTags: ["premium"],
        propertyIds: null,
        properties: null,
        isCustom: false,
        deliveryMeasurement: null,
        measurement: null,
        creativePolicy: null,
        productCard: null,
        productCardDetailed: null,
        placements: null,
        reportingCapabilities: null,
        channels: ["display"],
        implementationConfig: {
          pricing_options: [
            {
              pricing_option_id: "po-fixed",
              pricing_model: "cpm",
              currency: "USD",
              fixed_price: 12,
            },
          ],
        },
      },
      {
        productId: "prod-auction-video",
        name: "Video Auction",
        description: null,
        formatIds: [{ agent_url: "https://creative.example.org", id: "video_16:9_1920x1080" }],
        deliveryType: "non_guaranteed",
        propertyTags: ["premium"],
        propertyIds: null,
        properties: null,
        isCustom: false,
        deliveryMeasurement: null,
        measurement: null,
        creativePolicy: null,
        productCard: null,
        productCardDetailed: null,
        placements: null,
        reportingCapabilities: null,
        channels: ["olv"],
        implementationConfig: {
          pricing_options: [
            {
              pricing_option_id: "po-auction",
              pricing_model: "cpm",
              currency: "USD",
              floor_price: 2,
            },
          ],
        },
      },
    ];
    vi.mocked(db).select = vi.fn().mockReturnValue(mockSelectChain(rows));

    const filtered = await queryProducts(
      { tenantId: "tenant-a", principalId: "principal-a" },
      {
        filters: {
          format_types: ["display"],
          is_fixed_price: true,
          channels: ["display"],
        },
      } as never,
    );

    expect(filtered.products).toHaveLength(1);
    expect(filtered.products[0]?.product_id).toBe("prod-fixed-display");
    expect(filtered.products[0]?.pricing_options[0]).toMatchObject({
      pricing_option_id: "po-fixed",
      fixed_price: 12,
    });
  });
});
