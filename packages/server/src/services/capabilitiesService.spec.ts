/**
 * Unit tests for getAdcpCapabilities service.
 *
 * Legacy equivalent: _legacy/tests/unit/test_get_adcp_capabilities.py
 */
import { describe, expect, it } from "vitest";

import {
  GetAdcpCapabilitiesResponseSchema,
  MINIMAL_CAPABILITIES_RESPONSE,
} from "../schemas/adcpCapabilities.js";
import { getAdcpCapabilities } from "./capabilitiesService.js";

describe("getAdcpCapabilities", () => {
  it("returns minimal response when tenantContext is null", async () => {
    const result = await getAdcpCapabilities(null);

    expect(GetAdcpCapabilitiesResponseSchema.safeParse(result).success).toBe(
      true,
    );
    expect(result.adcp.major_versions).toEqual([{ root: 3 }]);
    expect(result.supported_protocols).toEqual(["media_buy"]);
    expect(result.media_buy).toBeUndefined();
    expect(result.last_updated).toBeUndefined();
    expect(result).toMatchObject({
      adcp: MINIMAL_CAPABILITIES_RESPONSE.adcp,
      supported_protocols: MINIMAL_CAPABILITIES_RESPONSE.supported_protocols,
    });
  });

  it("returns minimal response when tenantContext is undefined", async () => {
    const result = await getAdcpCapabilities(undefined);

    expect(result.media_buy).toBeUndefined();
    expect(result.supported_protocols).toEqual(["media_buy"]);
  });

  it("returns full response with media_buy when tenantContext is set", async () => {
    const result = await getAdcpCapabilities({
      tenantId: "acme",
      tenantName: "Acme Corp",
    });

    expect(GetAdcpCapabilitiesResponseSchema.safeParse(result).success).toBe(
      true,
    );
    expect(result.adcp.major_versions).toEqual([{ root: 3 }]);
    expect(result.supported_protocols).toEqual(["media_buy"]);
    expect(result.media_buy).toBeDefined();
    expect(result.media_buy?.portfolio?.description).toContain("Acme Corp");
    expect(result.media_buy?.portfolio?.primary_channels).toEqual(["display"]);
    expect(result.media_buy?.portfolio?.publisher_domains).toEqual([
      { root: "acme.example.com" },
    ]);
    expect(result.media_buy?.features).toEqual({
      content_standards: false,
      inline_creative_management: true,
      property_list_filtering: false,
    });
    expect(result.media_buy?.execution?.targeting).toMatchObject({
      geo_countries: true,
      geo_regions: true,
    });
    expect(result.last_updated).toBeDefined();
    expect(typeof result.last_updated).toBe("string");
  });

  it("uses tenantId for publisher domain when tenantName is omitted", async () => {
    const result = await getAdcpCapabilities({ tenantId: "foo" });

    expect(result.media_buy?.portfolio?.publisher_domains).toEqual([
      { root: "foo.example.com" },
    ]);
    expect(result.media_buy?.portfolio?.description).toContain("Unknown");
  });
});
