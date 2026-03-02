import { describe, expect, it } from "vitest";

import { validateOutboundUrl } from "./outboundUrl.js";

describe("validateOutboundUrl", () => {
  it("accepts public https URL", () => {
    const result = validateOutboundUrl("https://example.com/webhook");
    expect(result.valid).toBe(true);
  });

  it("blocks localhost hostnames", () => {
    const result = validateOutboundUrl("https://localhost/hook");
    expect(result.valid).toBe(false);
  });

  it("blocks link-local metadata IP", () => {
    const result = validateOutboundUrl("https://169.254.169.254/latest/meta-data");
    expect(result.valid).toBe(false);
  });

  it("blocks RFC1918 private IPv4", () => {
    const result = validateOutboundUrl("https://10.20.30.40/hook");
    expect(result.valid).toBe(false);
  });

  it("blocks non-https by default", () => {
    const result = validateOutboundUrl("http://example.com/hook");
    expect(result.valid).toBe(false);
  });

  it("allows http when explicitly enabled", () => {
    const result = validateOutboundUrl("http://example.com/hook", { allowHttp: true });
    expect(result.valid).toBe(true);
  });

  it("blocks invalid URL format", () => {
    const result = validateOutboundUrl("not-a-url");
    expect(result.valid).toBe(false);
  });
});
