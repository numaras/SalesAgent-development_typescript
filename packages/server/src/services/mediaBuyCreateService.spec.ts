/**
 * Unit tests for mediaBuyCreateService.
 *
 * DB and workflow/adapter are mocked; no real PostgreSQL or adapter calls.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/client.js", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock("./workflowStepService.js", () => ({
  createWorkflowStep: vi.fn(),
  updateWorkflowStep: vi.fn(),
}));
vi.mock("./mediaBuyAdapterCall.js", () => ({
  createMediaBuyViaAdapter: vi.fn(),
}));

import { db } from "../db/client.js";
import { createMediaBuyViaAdapter } from "./mediaBuyAdapterCall.js";
import { createMediaBuy } from "./mediaBuyCreateService.js";
import { createWorkflowStep, updateWorkflowStep } from "./workflowStepService.js";

const ctx = { tenantId: "t1", principalId: "pr1" };

function mockSelectChain(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
}

function mockSelectLimitChain<T>(rows: T[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}

const validRequest = {
  brand_manifest: "https://example.com/brand.json",
  buyer_ref: "ref1",
  packages: [
    {
      budget: { total: 100, currency: "USD" },
      product_id: "prod-1",
      pricing_option_id: "opt1",
    },
  ],
  start_time: "asap" as const,
  end_time: "2030-12-31T23:59:59Z",
};

describe("createMediaBuy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createWorkflowStep).mockResolvedValue({ stepId: "step_abc" });
    vi.mocked(updateWorkflowStep).mockResolvedValue(undefined);
    vi.mocked(createMediaBuyViaAdapter).mockResolvedValue({
      media_buy_id: "mb_1",
      buyer_ref: validRequest.buyer_ref,
      packages: [{ package_id: "pkg_1", status: "draft" }],
    });
  });

  it("returns error when total budget is zero", async () => {
    const result = await createMediaBuy(ctx, {
      ...validRequest,
      packages: [{ ...validRequest.packages[0], budget: 0 }],
    });
    expect("errors" in result && result.errors).toContain(
      "Invalid budget. Budget must be positive.",
    );
  });

  it("returns error when end_time is not after start_time", async () => {
    const result = await createMediaBuy(ctx, {
      ...validRequest,
      start_time: "2030-12-31T00:00:00Z",
      end_time: "2030-12-30T00:00:00Z",
    });
    expect("errors" in result && result.errors).toContain(
      "Invalid time range: end_time must be after start_time.",
    );
  });

  it("returns error when product_ids are not found in DB", async () => {
    vi.mocked(db).select = vi.fn().mockReturnValue(mockSelectChain([]));
    const result = await createMediaBuy(ctx, validRequest);
    expect("errors" in result && result.errors).toContain(
      "Product(s) not found: prod-1.",
    );
  });

  it("returns success with workflow_step_id when valid", async () => {
    vi.mocked(db).select = vi
      .fn()
      .mockReturnValueOnce(mockSelectChain([{ productId: "prod-1" }]))
      .mockReturnValueOnce(mockSelectLimitChain([{ maxDailyPackageSpend: "200.00" }]));
    const result = await createMediaBuy(ctx, validRequest);
    expect("packages" in result && result.packages).toHaveLength(1);
    expect(result).toHaveProperty("workflow_step_id", "step_abc");
    expect(createWorkflowStep).toHaveBeenCalledWith({
      contextId: "default_t1_pr1",
      stepType: "media_buy_creation",
      toolName: "create_media_buy",
      requestData: expect.any(Object),
    });
    expect(createMediaBuyViaAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ ...ctx, stepId: "step_abc" }),
      expect.any(Object),
    );
  });

  // --- Missing parity tests (ADCP-011-D) ---

  it("throws schema error when packages array is empty (schema min(1) enforced)", async () => {
    await expect(
      createMediaBuy(ctx, { ...validRequest, packages: [] }),
    ).rejects.toThrow();
  });

  it("throws schema error when start_time is null (schema enforced)", async () => {
    await expect(
      createMediaBuy(ctx, { ...validRequest, start_time: null as unknown as "asap" }),
    ).rejects.toThrow();
  });

  it("throws schema error when end_time is null (schema enforced)", async () => {
    await expect(
      createMediaBuy(ctx, { ...validRequest, end_time: null as unknown as string }),
    ).rejects.toThrow();
  });

  it("returns error when start_time is in the past", async () => {
    const result = await createMediaBuy(ctx, {
      ...validRequest,
      start_time: "2020-01-01T00:00:00Z",
      end_time: "2030-12-31T23:59:59Z",
    });
    expect("errors" in result && (result.errors as string[]).join("")).toContain(
      "Start time cannot be in the past",
    );
  });

  it("asap start_time resolves to now and does not trigger past-time error", async () => {
    vi.mocked(db).select = vi
      .fn()
      .mockReturnValueOnce(mockSelectChain([{ productId: "prod-1" }]))
      .mockReturnValueOnce(mockSelectLimitChain([{ maxDailyPackageSpend: "200.00" }]));
    const result = await createMediaBuy(ctx, {
      ...validRequest,
      start_time: "asap",
    });
    expect("errors" in result).toBe(false);
    expect(result).toHaveProperty("workflow_step_id");
  });

  it("returns error when duplicate product_ids are in packages", async () => {
    const result = await createMediaBuy(ctx, {
      ...validRequest,
      packages: [
        { budget: { total: 50, currency: "USD" }, product_id: "prod-1", pricing_option_id: "opt1" },
        { budget: { total: 50, currency: "USD" }, product_id: "prod-1", pricing_option_id: "opt1" },
      ],
    });
    expect("errors" in result && (result.errors as string[]).join("")).toContain(
      "Duplicate product_id(s)",
    );
  });

  it("returns error when package has empty product_id", async () => {
    const result = await createMediaBuy(ctx, {
      ...validRequest,
      packages: [{ budget: { total: 100, currency: "USD" }, product_id: "", pricing_option_id: "opt1" }],
    });
    expect("errors" in result && (result.errors as string[]).join("")).toContain("product_id");
  });

  it("updates workflow step to failed when product lookup fails", async () => {
    vi.mocked(db).select = vi.fn().mockReturnValue(mockSelectChain([]));
    await createMediaBuy(ctx, validRequest);
    expect(updateWorkflowStep).toHaveBeenCalledWith("step_abc", {
      status: "failed",
      errorMessage: expect.stringContaining("Product(s) not found"),
    });
  });

  it("returns error when package daily budget exceeds max_daily_package_spend", async () => {
    vi.mocked(db).select = vi
      .fn()
      .mockReturnValueOnce(mockSelectChain([{ productId: "prod-1" }]))
      .mockReturnValueOnce(mockSelectLimitChain([{ maxDailyPackageSpend: "1.00" }]));

    const result = await createMediaBuy(ctx, {
      ...validRequest,
      start_time: "2030-01-01T00:00:00Z",
      end_time: "2030-01-03T00:00:00Z",
      packages: [
        {
          budget: { total: 100, currency: "USD" },
          product_id: "prod-1",
          pricing_option_id: "opt1",
        },
      ],
    });

    expect("errors" in result && (result.errors as string[]).join(" ")).toContain(
      "exceeds maximum",
    );
    expect(updateWorkflowStep).toHaveBeenCalledWith("step_abc", {
      status: "failed",
      errorMessage: expect.stringContaining("exceeds maximum"),
    });
  });

  it("returns error when currency is not configured in tenant currency limits", async () => {
    vi.mocked(db).select = vi
      .fn()
      .mockReturnValueOnce(mockSelectChain([{ productId: "prod-1" }]))
      .mockReturnValueOnce(mockSelectLimitChain([]));

    const result = await createMediaBuy(ctx, {
      ...validRequest,
      packages: [
        {
          budget: { total: 100, currency: "EUR" },
          product_id: "prod-1",
          pricing_option_id: "opt1",
        },
      ],
    });

    expect("errors" in result && result.errors).toContain(
      "Currency EUR is not supported by this publisher.",
    );
    expect(updateWorkflowStep).toHaveBeenCalledWith("step_abc", {
      status: "failed",
      errorMessage: "Currency EUR is not supported by this publisher.",
    });
  });

  it("returns error when packages contain mixed currencies", async () => {
    vi.mocked(db).select = vi
      .fn()
      .mockReturnValueOnce(mockSelectChain([{ productId: "prod-1" }, { productId: "prod-2" }]))
      .mockReturnValueOnce(mockSelectLimitChain([{ maxDailyPackageSpend: "200.00" }]));

    const result = await createMediaBuy(ctx, {
      ...validRequest,
      packages: [
        {
          budget: { total: 100, currency: "USD" },
          product_id: "prod-1",
          pricing_option_id: "opt1",
        },
        {
          budget: { total: 50, currency: "EUR" },
          product_id: "prod-2",
          pricing_option_id: "opt2",
        },
      ],
    });

    expect("errors" in result && (result.errors as string[]).join(" ")).toContain(
      "Mixed package currencies are not allowed",
    );
    expect(updateWorkflowStep).toHaveBeenCalledWith("step_abc", {
      status: "failed",
      errorMessage: expect.stringContaining("Mixed package currencies are not allowed"),
    });
  });

  it("returns error when package budget is below product min_spend_per_package", async () => {
    vi.mocked(db).select = vi
      .fn()
      .mockReturnValueOnce(
        mockSelectChain([
          {
            productId: "prod-1",
            implementationConfig: {
              pricing_options: [
                {
                  pricing_option_id: "opt1",
                  min_spend_per_package: 250,
                  currency: "USD",
                },
              ],
            },
          },
        ]),
      )
      .mockReturnValueOnce(
        mockSelectLimitChain([{ maxDailyPackageSpend: "500.00", minPackageBudget: "10.00" }]),
      );

    const result = await createMediaBuy(ctx, {
      ...validRequest,
      packages: [
        {
          budget: { total: 100, currency: "USD" },
          product_id: "prod-1",
          pricing_option_id: "opt1",
        },
      ],
    });

    expect("errors" in result && (result.errors as string[]).join(" ")).toContain(
      "below minimum required spend",
    );
    expect(updateWorkflowStep).toHaveBeenCalledWith("step_abc", {
      status: "failed",
      errorMessage: expect.stringContaining("below minimum required spend"),
    });
  });

  it("returns error when package attaches creative not in approved status", async () => {
    vi.mocked(db).select = vi
      .fn()
      .mockReturnValueOnce(
        mockSelectChain([
          {
            productId: "prod-1",
            implementationConfig: {
              pricing_options: [{ pricing_option_id: "opt1", min_spend_per_package: 10 }],
            },
          },
        ]),
      )
      .mockReturnValueOnce(
        mockSelectChain([{ creativeId: "cr_1", status: "pending" }]),
      );

    const result = await createMediaBuy(ctx, {
      ...validRequest,
      packages: [
        {
          budget: { total: 100, currency: "USD" },
          product_id: "prod-1",
          pricing_option_id: "opt1",
          creative_ids: ["cr_1"],
        },
      ],
    });

    expect("errors" in result && (result.errors as string[]).join(" ")).toContain(
      "must be approved before attachment",
    );
    expect(updateWorkflowStep).toHaveBeenCalledWith("step_abc", {
      status: "failed",
      errorMessage: expect.stringContaining("must be approved before attachment"),
    });
  });
});
