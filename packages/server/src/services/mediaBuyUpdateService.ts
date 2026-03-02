/**
 * Update media buy service: resolve id, verify ownership, delegate to adapter.
 *
 * Legacy equivalent: _legacy/src/core/tools/media_buy_update.py
 *   _update_media_buy_impl() — resolve media_buy_id from buyer_ref, verify principal, apply updates.
 */
import { and, eq, inArray } from "drizzle-orm";

import { db } from "../db/client.js";
import { auditLogs } from "../db/schema/auditLogs.js";
import { contexts } from "../db/schema/contexts.js";
import { creatives } from "../db/schema/creatives.js";
import { currencyLimits } from "../db/schema/currencyLimits.js";
import { mediaBuys, mediaPackages } from "../db/schema/mediaBuys.js";
import { products } from "../db/schema/products.js";
import {
  objectWorkflowMappings,
  workflowSteps,
} from "../db/schema/workflowSteps.js";
import type { UpdateMediaBuyRequest } from "../schemas/mediaBuyUpdate.js";
import {
  UpdateMediaBuyRequestSchema,
  type UpdateMediaBuyError,
  type UpdateMediaBuyResponse,
  type UpdateMediaBuySuccess,
} from "../schemas/mediaBuyUpdate.js";
import {
  MediaBuyForbiddenError,
  MediaBuyNotFoundError,
  lookupMediaBuy,
} from "./mediaBuyLookup.js";
import { updateMediaBuyViaAdapter } from "./mediaBuyAdapterCall.js";

export interface MediaBuyUpdateContext {
  tenantId: string;
  principalId: string;
  /** Optional: x-context-id header value for workflow step scoping. */
  contextId?: string;
}

function toError(errors: string[]): UpdateMediaBuyError {
  return { errors: errors.map((msg) => ({ code: "error", message: msg })) };
}

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

async function validateCreativeAssignments(
  ctx: MediaBuyUpdateContext,
  parsed: UpdateMediaBuyRequest,
): Promise<UpdateMediaBuyError | null> {
  const creativeIds: string[] = [];
  for (const pkg of parsed.packages ?? []) {
    if (!Array.isArray(pkg.creative_ids)) continue;
    for (const id of pkg.creative_ids) {
      const trimmed = typeof id === "string" ? id.trim() : "";
      if (trimmed) creativeIds.push(trimmed);
    }
  }

  const uniqueIds = [...new Set(creativeIds)];
  if (uniqueIds.length === 0) return null;

  const rows = await db
    .select({ creativeId: creatives.creativeId, status: creatives.status })
    .from(creatives)
    .where(
      and(
        eq(creatives.tenantId, ctx.tenantId),
        inArray(creatives.creativeId, uniqueIds),
      ),
    );

  const byId = new Map(rows.map((row) => [row.creativeId, row]));
  const missing = uniqueIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    return {
      errors: [
        {
          code: "creative_not_found",
          message: `Creative(s) not found: ${missing.sort().join(", ")}.`,
        },
      ],
    };
  }

  const disallowed: string[] = [];
  for (const id of uniqueIds) {
    const status = byId.get(id)?.status?.toLowerCase() ?? "unknown";
    if (status !== "approved" && status !== "active") {
      disallowed.push(`${id} (${status})`);
    }
  }

  if (disallowed.length > 0) {
    return {
      errors: [
        {
          code: "creative_not_approved",
          message: `Creative(s) must be approved before attachment: ${disallowed.join(", ")}.`,
        },
      ],
    };
  }

  return null;
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

/**
 * Validate currency limits for the update request.
 * Python equivalent: _update_media_buy_impl L287-397.
 * Returns an error response if validation fails, or null if the request passes.
 */
async function validateCurrencyLimits(
  ctx: MediaBuyUpdateContext,
  parsed: UpdateMediaBuyRequest,
  mediaBuyId: string,
): Promise<UpdateMediaBuyError | null> {
  const hasBudgetOrDateChange =
    parsed.start_time != null ||
    parsed.end_time != null ||
    parsed.budget != null ||
    parsed.packages?.some((p) => p.budget != null);

  if (!hasBudgetOrDateChange) return null;

  const rows = await db
    .select()
    .from(mediaBuys)
    .where(eq(mediaBuys.mediaBuyId, mediaBuyId))
    .limit(1);
  const buy = rows[0];
  if (!buy) return null;

  // Determine effective currency for this update
  let requestCurrency: string;
  if (parsed.budget && typeof parsed.budget === "object" && "currency" in parsed.budget) {
    requestCurrency = (parsed.budget as { total: number; currency: string }).currency;
  } else {
    requestCurrency = buy.currency ?? "USD";
  }

  // Look up currency limit for this tenant+currency
  const limitRows = await db
    .select()
    .from(currencyLimits)
    .where(
      and(
        eq(currencyLimits.tenantId, ctx.tenantId),
        eq(currencyLimits.currencyCode, requestCurrency),
      ),
    )
    .limit(1);
  const limit = limitRows[0];

  if (!limit) {
    return {
      errors: [
        {
          code: "currency_not_supported",
          message: `Currency ${requestCurrency} is not supported by this publisher.`,
        },
      ],
    };
  }

  // Validate max_daily_package_spend per package
  if (limit.maxDailyPackageSpend && parsed.packages) {
    const startRaw =
      parsed.start_time === "asap"
        ? new Date().toISOString()
        : (parsed.start_time ?? buy.startTime?.toISOString() ?? buy.startDate);
    const endRaw =
      parsed.end_time ?? buy.endTime?.toISOString() ?? buy.endDate;

    const startDt = new Date(startRaw as string);
    const endDt = new Date(endRaw as string);
    let flightDays = Math.floor(
      (endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (flightDays <= 0) flightDays = 1;

    const maxDaily = parseFloat(limit.maxDailyPackageSpend);

    for (const pkg of parsed.packages) {
      if (!pkg.budget) continue;
      const pkgAmount =
        typeof pkg.budget === "number"
          ? pkg.budget
          : (pkg.budget as { total: number }).total;
      const dailySpend = pkgAmount / flightDays;

      if (dailySpend > maxDaily) {
        return {
          errors: [
            {
              code: "budget_limit_exceeded",
              message:
                `Updated package daily budget (${dailySpend.toFixed(2)} ${requestCurrency}) ` +
                `exceeds maximum (${maxDaily} ${requestCurrency}). ` +
                `Flight date changes that reduce daily budget are not allowed to bypass limits.`,
            },
          ],
        };
      }
    }
  }

  // Validate min spend per package against both currency minimum and product pricing option minimum.
  if (parsed.packages?.some((p) => p.budget != null)) {
    const packageIds = parsed.packages.map((p) => p.package_id);
    const existingPackages = await db
      .select({
        packageId: mediaPackages.packageId,
        packageConfig: mediaPackages.packageConfig,
      })
      .from(mediaPackages)
      .where(
        and(
          eq(mediaPackages.mediaBuyId, mediaBuyId),
          inArray(mediaPackages.packageId, packageIds),
        ),
      );

    const packageConfigById = new Map(
      existingPackages.map((pkg) => [pkg.packageId, pkg.packageConfig as Record<string, unknown> | null]),
    );

    const productIds = new Set<string>();
    for (const cfg of packageConfigById.values()) {
      const productId = typeof cfg?.["product_id"] === "string" ? cfg["product_id"] : null;
      if (productId) productIds.add(productId);
    }

    const productRows = productIds.size
      ? await db
          .select({
            productId: products.productId,
            implementationConfig: products.implementationConfig,
          })
          .from(products)
          .where(
            and(
              eq(products.tenantId, ctx.tenantId),
              inArray(products.productId, [...productIds]),
            ),
          )
      : [];

    const productById = new Map(
      productRows.map((row) => [row.productId, row]),
    );

    const currencyMin =
      limit.minPackageBudget != null
        ? Number.parseFloat(limit.minPackageBudget)
        : undefined;

    for (const pkg of parsed.packages) {
      if (!pkg.budget) continue;

      const packageCurrency =
        typeof pkg.budget === "object" && "currency" in pkg.budget
          ? String((pkg.budget as { currency: string }).currency)
          : requestCurrency;
      if (packageCurrency !== requestCurrency) {
        return {
          errors: [
            {
              code: "mixed_currency_not_allowed",
              message: `Mixed package currencies are not allowed. Expected ${requestCurrency} for all packages.`,
            },
          ],
        };
      }

      const packageBudget =
        typeof pkg.budget === "number"
          ? pkg.budget
          : (pkg.budget as { total: number }).total;

      const packageConfig = packageConfigById.get(pkg.package_id) ?? null;
      const productId = typeof packageConfig?.["product_id"] === "string" ? packageConfig["product_id"] : null;
      const pricingOptionId =
        typeof packageConfig?.["pricing_option_id"] === "string"
          ? packageConfig["pricing_option_id"]
          : null;

      const minCandidates: number[] = [];
      if (currencyMin != null) minCandidates.push(currencyMin);

      if (productId && pricingOptionId) {
        const product = productById.get(productId);
        const optionMin = product
          ? extractMinSpendFromProductPricingOption(product.implementationConfig, pricingOptionId)
          : undefined;
        if (optionMin != null) minCandidates.push(optionMin);
      }

      if (minCandidates.length > 0) {
        const minimumRequired = Math.max(...minCandidates);
        if (packageBudget < minimumRequired) {
          return {
            errors: [
              {
                code: "minimum_spend_violation",
                message:
                  `Updated package budget (${packageBudget.toFixed(2)} ${requestCurrency}) ` +
                  `is below minimum required spend (${minimumRequired} ${requestCurrency}).`,
              },
            ],
          };
        }
      }
    }
  }

  return null;
}

/**
 * Ensure a context row exists for the given contextId.
 * Creates one if absent so the workflow_steps FK constraint is satisfied.
 */
async function ensureContext(
  ctx: MediaBuyUpdateContext,
  contextId: string,
): Promise<void> {
  const existing = await db
    .select()
    .from(contexts)
    .where(eq(contexts.contextId, contextId))
    .limit(1);
  if (!existing[0]) {
    await db.insert(contexts).values({
      contextId,
      tenantId: ctx.tenantId,
      principalId: ctx.principalId,
    });
  }
}

/**
 * Update a media buy: validate request, resolve media_buy_id, verify ownership,
 * validate currency limits, call adapter, manage workflow step, write audit log.
 */
export async function updateMediaBuy(
  ctx: MediaBuyUpdateContext,
  request: UpdateMediaBuyRequest,
): Promise<UpdateMediaBuyResponse> {
  const parsed = UpdateMediaBuyRequestSchema.parse(request);

  // Resolve media_buy_id from buyer_ref if needed
  let mediaBuyId: string;
  if (parsed.media_buy_id?.trim()) {
    mediaBuyId = parsed.media_buy_id.trim();
  } else if (parsed.buyer_ref?.trim()) {
    try {
      const row = await lookupMediaBuy(ctx, { buyerRef: parsed.buyer_ref.trim() });
      mediaBuyId = row.mediaBuyId;
    } catch (e) {
      if (e instanceof MediaBuyNotFoundError) return toError([e.message]);
      if (e instanceof MediaBuyForbiddenError) return toError([e.message]);
      throw e;
    }
  } else {
    return toError(["Either media_buy_id or buyer_ref is required."]);
  }

  // Verify principal ownership
  try {
    await lookupMediaBuy(ctx, { mediaBuyId });
  } catch (e) {
    if (e instanceof MediaBuyNotFoundError) return toError([e.message]);
    if (e instanceof MediaBuyForbiddenError) return toError([e.message]);
    throw e;
  }

  const creativeError = await validateCreativeAssignments(ctx, parsed);
  if (creativeError) {
    return { ...creativeError, context: parsed.context };
  }

  // Dry-run mode: return simulated affected_packages without any DB writes.
  // Python equivalent: _update_media_buy_impl L233-258.
  const isDryRun =
    parsed.context?.["dry_run"] === true ||
    (parsed.ext as Record<string, unknown> | undefined)?.["dry_run"] === true;
  if (isDryRun) {
    const simulatedPackages =
      parsed.packages?.map((p) => ({
        package_id: p.package_id,
        paused: p.paused,
        changes_applied: { dry_run: true, would_update: p },
      })) ?? [];
    return {
      media_buy_id: mediaBuyId,
      buyer_ref: parsed.buyer_ref,
      affected_packages: simulatedPackages,
      context: parsed.context,
    };
  }

  // Create workflow step to track this operation.
  // Python equivalent: ctx_manager.create_workflow_step(...) L203-210.
  const stepId = generateId("step");
  const contextId = ctx.contextId ?? generateId("ctx");
  await ensureContext(ctx, contextId);
  await db.insert(workflowSteps).values({
    stepId,
    contextId,
    stepType: "tool_call",
    toolName: "update_media_buy",
    status: "in_progress",
    owner: "principal",
    requestData: parsed as unknown as Record<string, unknown>,
  });

  const failStep = async (errorMsg: string): Promise<void> => {
    await db
      .update(workflowSteps)
      .set({ status: "failed", errorMessage: errorMsg })
      .where(eq(workflowSteps.stepId, stepId));
    await db.insert(auditLogs).values({
      tenantId: ctx.tenantId,
      operation: "update_media_buy",
      principalId: ctx.principalId,
      adapterId: "mcp_server",
      success: false,
      errorMessage: errorMsg,
      details: {
        media_buy_id: mediaBuyId,
        buyer_ref: parsed.buyer_ref ?? null,
      },
    });
  };

  // Currency limit validation (Python L287-397).
  const currencyError = await validateCurrencyLimits(ctx, parsed, mediaBuyId);
  if (currencyError) {
    const msg =
      currencyError.errors[0]?.message ?? "Currency validation failed";
    await failStep(msg);
    return { ...currencyError, context: parsed.context };
  }

  // Invoke adapter (per-field orchestration for pause/budget/dates deferred to adapter client).
  const adapterResponse = await updateMediaBuyViaAdapter(ctx, mediaBuyId, parsed);
  if ("errors" in adapterResponse) {
    const errMsg =
      (adapterResponse as UpdateMediaBuyError).errors[0]?.message ??
      "Adapter error";
    await failStep(errMsg);
    return adapterResponse;
  }

  // Link the media buy to the workflow step via ObjectWorkflowMapping.
  await db.insert(objectWorkflowMappings).values({
    objectType: "media_buy",
    objectId: mediaBuyId,
    stepId,
    action: "update",
  });

  const successData = adapterResponse as UpdateMediaBuySuccess;

  // Mark workflow step completed.
  await db
    .update(workflowSteps)
    .set({
      status: "completed",
      responseData: successData as unknown as Record<string, unknown>,
    })
    .where(eq(workflowSteps.stepId, stepId));

  // Audit log success (Python equivalent: audit_logger.log_operation L428-441).
  await db.insert(auditLogs).values({
    tenantId: ctx.tenantId,
    operation: "update_media_buy",
    principalId: ctx.principalId,
    adapterId: "mcp_server",
    success: true,
    details: {
      media_buy_id: mediaBuyId,
      buyer_ref: parsed.buyer_ref ?? null,
      affected_packages_count: successData.affected_packages?.length ?? 0,
      has_budget_update: parsed.budget != null,
      has_pause_update: parsed.paused != null,
      has_packages_update: (parsed.packages?.length ?? 0) > 0,
    },
  });

  const success: UpdateMediaBuySuccess = {
    ...successData,
    workflow_step_id: stepId,
    context: parsed.context,
  };
  return success;
}
