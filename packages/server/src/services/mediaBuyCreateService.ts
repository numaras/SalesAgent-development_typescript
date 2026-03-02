/**
 * Create media buy service: validate packages, budget, start/end; lookup products; create step; call adapter.
 *
 * Legacy equivalent: _legacy/src/core/tools/media_buy_create.py
 *   _create_media_buy_impl() validation portion — budget check, product validation, workflow step, adapter call.
 */
import { and, eq, inArray } from "drizzle-orm";

import { db } from "../db/client.js";
import { creatives } from "../db/schema/creatives.js";
import { currencyLimits } from "../db/schema/currencyLimits.js";
import { products } from "../db/schema/products.js";
import type {
  CreateMediaBuyRequest,
  PackageRequest,
} from "../schemas/mediaBuyCreate.js";
import { CreateMediaBuyRequestSchema } from "../schemas/mediaBuyCreate.js";
import type {
  CreateMediaBuyError,
  CreateMediaBuyResponse,
  CreateMediaBuySuccess,
} from "../schemas/mediaBuyCreateResponse.js";
import { createMediaBuyViaAdapter } from "./mediaBuyAdapterCall.js";
import { createWorkflowStep, updateWorkflowStep } from "./workflowStepService.js";

export interface MediaBuyCreateContext {
  tenantId: string;
  principalId: string;
  /** Forwarded to adapter for ObjectWorkflowMapping linkage. */
  stepId?: string;
}

function getTotalBudget(request: CreateMediaBuyRequest): number {
  let total = 0;
  for (const pkg of request.packages) {
    const b = pkg.budget;
    if (typeof b === "number") total += b;
    else if (b && typeof b === "object" && "total" in b) total += Number((b as { total: number }).total);
  }
  return total;
}

function getProductIds(request: CreateMediaBuyRequest): string[] {
  const ids = request.packages
    .map((p) => p.product_id?.trim())
    .filter((id): id is string => !!id);
  return [...new Set(ids)];
}

function getCreativeIds(request: CreateMediaBuyRequest): string[] {
  const ids: string[] = [];
  for (const pkg of request.packages) {
    if (!Array.isArray(pkg.creative_ids)) continue;
    for (const creativeId of pkg.creative_ids) {
      const trimmed = typeof creativeId === "string" ? creativeId.trim() : "";
      if (trimmed) ids.push(trimmed);
    }
  }
  return [...new Set(ids)];
}

function toError(errors: string[]): CreateMediaBuyError {
  return { errors };
}

function getPackageBudgetAmount(pkg: PackageRequest): number {
  const b = pkg.budget;
  if (typeof b === "number") return b;
  if (b && typeof b === "object" && "total" in b) {
    return Number((b as { total: number }).total);
  }
  return 0;
}

function extractMinSpendFromProductPricingOption(
  implementationConfig: Record<string, unknown> | null | undefined,
  pricingOptionId: string,
): number | undefined {
  const pricingOptions = implementationConfig?.["pricing_options"];
  if (!Array.isArray(pricingOptions)) return undefined;

  for (const option of pricingOptions) {
    if (!option || typeof option !== "object") continue;
    const record = option as Record<string, unknown>;
    if (record["pricing_option_id"] !== pricingOptionId) continue;
    if (typeof record["min_spend_per_package"] === "number") {
      return record["min_spend_per_package"];
    }
  }

  return undefined;
}

function getPackageCurrency(
  pkg: PackageRequest,
  fallbackCurrency: string,
): string {
  const b = pkg.budget;
  if (
    b &&
    typeof b === "object" &&
    "currency" in b &&
    typeof (b as { currency?: string }).currency === "string"
  ) {
    return (b as { currency: string }).currency.toUpperCase();
  }
  return fallbackCurrency;
}

function getAuthoritativeCurrency(request: CreateMediaBuyRequest): string {
  const firstCurrencyPackage = request.packages.find(
    (pkg) =>
      typeof pkg.budget === "object" &&
      pkg.budget !== null &&
      "currency" in pkg.budget &&
      typeof (pkg.budget as { currency?: string }).currency === "string",
  );
  if (!firstCurrencyPackage || typeof firstCurrencyPackage.budget !== "object") {
    return "USD";
  }
  return ((firstCurrencyPackage.budget as { currency: string }).currency ?? "USD").toUpperCase();
}

async function validateCreativeAssignments(
  ctx: MediaBuyCreateContext,
  parsed: CreateMediaBuyRequest,
): Promise<CreateMediaBuyError | null> {
  const creativeIds = getCreativeIds(parsed);
  if (creativeIds.length === 0) return null;

  const rows = await db
    .select({
      creativeId: creatives.creativeId,
      status: creatives.status,
    })
    .from(creatives)
    .where(
      and(
        eq(creatives.tenantId, ctx.tenantId),
        inArray(creatives.creativeId, creativeIds),
      ),
    );

  const byId = new Map(rows.map((row) => [row.creativeId, row]));
  const missing = creativeIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    return {
      errors: [`Creative(s) not found: ${missing.sort().join(", ")}.`],
    };
  }

  const disallowed: string[] = [];
  for (const id of creativeIds) {
    const status = byId.get(id)?.status?.toLowerCase() ?? "unknown";
    if (status !== "approved" && status !== "active") {
      disallowed.push(`${id} (${status})`);
    }
  }

  if (disallowed.length > 0) {
    return {
      errors: [
        `Creative(s) must be approved before attachment: ${disallowed.join(", ")}.`,
      ],
    };
  }

  return null;
}

async function validateCreateCurrencyLimits(
  ctx: MediaBuyCreateContext,
  parsed: CreateMediaBuyRequest,
  startVal: Date,
  endVal: Date,
  productRows: Array<{ productId: string; implementationConfig: Record<string, unknown> | null }>,
): Promise<CreateMediaBuyError | null> {
  const authoritativeCurrency = getAuthoritativeCurrency(parsed);

  for (const pkg of parsed.packages) {
    const packageCurrency = getPackageCurrency(pkg as PackageRequest, authoritativeCurrency);
    if (packageCurrency !== authoritativeCurrency) {
      return {
        errors: [
          `Mixed package currencies are not allowed. Expected ${authoritativeCurrency} for all packages.`,
        ],
      };
    }
  }

  const [limit] = await db
    .select({
      maxDailyPackageSpend: currencyLimits.maxDailyPackageSpend,
      minPackageBudget: currencyLimits.minPackageBudget,
    })
    .from(currencyLimits)
    .where(
      and(
        eq(currencyLimits.tenantId, ctx.tenantId),
        eq(currencyLimits.currencyCode, authoritativeCurrency),
      ),
    )
    .limit(1);

  if (!limit) {
    return {
      errors: [
        `Currency ${authoritativeCurrency} is not supported by this publisher.`,
      ],
    };
  }

  let flightDays = Math.floor(
    (endVal.getTime() - startVal.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (flightDays <= 0) flightDays = 1;

  const productById = new Map(
    productRows.map((row) => [row.productId, row]),
  );
  const currencyMin =
    limit.minPackageBudget != null
      ? Number.parseFloat(limit.minPackageBudget)
      : undefined;

  for (const pkg of parsed.packages) {
    const packageBudget = getPackageBudgetAmount(pkg as PackageRequest);

    const minCandidates: number[] = [];
    if (currencyMin != null) minCandidates.push(currencyMin);

    const productId = (pkg as PackageRequest).product_id;
    const pricingOptionId = (pkg as PackageRequest).pricing_option_id;
    const product = productId ? productById.get(productId) : undefined;
    const pricingOptionMin =
      product && pricingOptionId
        ? extractMinSpendFromProductPricingOption(product.implementationConfig, pricingOptionId)
        : undefined;
    if (pricingOptionMin != null) minCandidates.push(pricingOptionMin);

    if (minCandidates.length > 0) {
      const minimumRequired = Math.max(...minCandidates);
      if (packageBudget < minimumRequired) {
        return {
          errors: [
            `Package budget (${packageBudget.toFixed(2)} ${authoritativeCurrency}) is below minimum required spend (${minimumRequired} ${authoritativeCurrency}).`,
          ],
        };
      }
    }

    if (!limit.maxDailyPackageSpend) continue;

    const dailySpend = packageBudget / flightDays;
    const maxDaily = Number.parseFloat(limit.maxDailyPackageSpend);

    if (dailySpend > maxDaily) {
      return {
        errors: [
          `Package daily budget (${dailySpend.toFixed(2)} ${authoritativeCurrency}) exceeds maximum (${maxDaily} ${authoritativeCurrency}).`,
        ],
      };
    }
  }

  return null;
}

/**
 * Create a media buy: validate request, ensure products exist, create workflow step, call adapter.
 */
export async function createMediaBuy(
  ctx: MediaBuyCreateContext,
  request: CreateMediaBuyRequest,
): Promise<CreateMediaBuyResponse> {
  const parsed = CreateMediaBuyRequestSchema.parse(request);

  if (!parsed.packages?.length) {
    return toError(["At least one package is required."]);
  }

  for (const pkg of parsed.packages) {
    if (!pkg.product_id?.trim()) {
      return toError([
        `Package ${(pkg as PackageRequest).buyer_ref ?? "?"} must specify product_id.`,
      ]);
    }
  }

  const productIds = getProductIds(parsed);
  if (productIds.length === 0) {
    return toError(["At least one product is required."]);
  }

  const productIdCounts: Record<string, number> = {};
  for (const p of parsed.packages) {
    if (p.product_id) {
      productIdCounts[p.product_id] = (productIdCounts[p.product_id] ?? 0) + 1;
    }
  }
  const duplicates = Object.entries(productIdCounts)
    .filter(([, c]) => c > 1)
    .map(([id]) => id);
  if (duplicates.length) {
    return toError([
      `Duplicate product_id(s) found in packages: ${duplicates.join(", ")}. Each product can only be used once per media buy.`,
    ]);
  }

  const totalBudget = getTotalBudget(parsed);
  if (totalBudget <= 0) {
    return toError(["Invalid budget. Budget must be positive."]);
  }

  if (parsed.start_time == null) {
    return toError(["start_time is required."]);
  }
  if (parsed.end_time == null) {
    return toError(["end_time is required."]);
  }

  const now = new Date();
  const startVal =
    parsed.start_time === "asap"
      ? now
      : new Date(parsed.start_time as string);
  const endVal = new Date(parsed.end_time);
  if (Number.isNaN(startVal.getTime())) {
    return toError(["Invalid start_time."]);
  }
  if (Number.isNaN(endVal.getTime())) {
    return toError(["Invalid end_time."]);
  }

  // Parity with Python L1396: start_time cannot be in the past (only for non-asap)
  if (parsed.start_time !== "asap" && startVal < now) {
    return toError([
      `Invalid start time: ${parsed.start_time}. Start time cannot be in the past.`,
    ]);
  }

  if (endVal <= startVal) {
    return toError([
      "Invalid time range: end_time must be after start_time.",
    ]);
  }

  // Create the workflow step BEFORE DB lookups so it can be updated to "failed" if they fail.
  // Parity with Python L1296-1303 (step created before product/currency validation).
  const contextId = `default_${ctx.tenantId}_${ctx.principalId}`;
  const { stepId } = await createWorkflowStep({
    contextId,
    stepType: "media_buy_creation",
    toolName: "create_media_buy",
    requestData: parsed as unknown as Record<string, unknown>,
  });

  try {
    const productRows = await db
      .select({
        productId: products.productId,
        implementationConfig: products.implementationConfig,
      })
      .from(products)
      .where(
        and(
          eq(products.tenantId, ctx.tenantId),
          inArray(products.productId, productIds),
        ),
      );
    const foundIds = new Set(productRows.map((r) => r.productId));
    const missing = productIds.filter((id) => !foundIds.has(id));
    if (missing.length) {
      const errorMsg = `Product(s) not found: ${missing.sort().join(", ")}.`;
      await updateWorkflowStep(stepId, { status: "failed", errorMessage: errorMsg });
      return toError([errorMsg]);
    }

    const creativeError = await validateCreativeAssignments(ctx, parsed);
    if (creativeError) {
      const errorMsg = creativeError.errors[0] ?? "Creative validation failed.";
      await updateWorkflowStep(stepId, { status: "failed", errorMessage: errorMsg });
      return creativeError;
    }

    const currencyError = await validateCreateCurrencyLimits(ctx, parsed, startVal, endVal, productRows);
    if (currencyError) {
      const errorMsg = currencyError.errors[0] ?? "Currency validation failed.";
      await updateWorkflowStep(stepId, { status: "failed", errorMessage: errorMsg });
      return currencyError;
    }

    const adapterResponse = await createMediaBuyViaAdapter({ ...ctx, stepId }, parsed);
    if ("errors" in adapterResponse) {
      await updateWorkflowStep(stepId, {
        status: "failed",
        errorMessage: adapterResponse.errors.join("; "),
      });
      return adapterResponse;
    }

    const success: CreateMediaBuySuccess = {
      ...adapterResponse,
      workflow_step_id: stepId,
    };
    return success;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await updateWorkflowStep(stepId, { status: "failed", errorMessage: errorMsg }).catch(() => undefined);
    return toError([errorMsg]);
  }
}
