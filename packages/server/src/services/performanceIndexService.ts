/**
 * Update performance index for a media buy: verify ownership, store performance_data, optional webhook.
 *
 * Legacy equivalent: _legacy/src/core/tools/performance.py
 *   _update_performance_index_impl() — verify principal, call adapter, audit log.
 * Here we store performance_data (in-memory for now; DB can be added later) and optionally POST to webhook_url.
 */
import type {
  UpdatePerformanceIndexRequest,
  UpdatePerformanceIndexResponse,
  ProductPerformance,
} from "../schemas/performanceIndex.js";
import { UpdatePerformanceIndexRequestSchema } from "../schemas/performanceIndex.js";
import {
  MediaBuyForbiddenError,
  MediaBuyNotFoundError,
  lookupMediaBuy,
} from "./mediaBuyLookup.js";

export interface PerformanceIndexContext {
  tenantId: string;
  principalId: string;
}

/** In-memory store of last performance_data per media_buy_id (for testing; DB can replace later). */
const performanceStore = new Map<string, ProductPerformance[]>();

/**
 * Get last stored performance data for a media buy (used by tests).
 */
export function getStoredPerformance(mediaBuyId: string): ProductPerformance[] | undefined {
  return performanceStore.get(mediaBuyId);
}

/**
 * Update performance index: validate request, verify media buy ownership, store data, optionally call webhook.
 */
export async function updatePerformanceIndex(
  ctx: PerformanceIndexContext,
  request: UpdatePerformanceIndexRequest,
): Promise<UpdatePerformanceIndexResponse> {
  const parsed = UpdatePerformanceIndexRequestSchema.parse(request);

  try {
    await lookupMediaBuy(ctx, { mediaBuyId: parsed.media_buy_id });
  } catch (e) {
    if (e instanceof MediaBuyNotFoundError) {
      return {
        status: "failed",
        detail: e.message,
        context: parsed.context,
      };
    }
    if (e instanceof MediaBuyForbiddenError) {
      return {
        status: "failed",
        detail: e.message,
        context: parsed.context,
      };
    }
    throw e;
  }

  performanceStore.set(parsed.media_buy_id, parsed.performance_data);

  const response: UpdatePerformanceIndexResponse = {
    status: "success",
    detail: `Performance index updated for ${parsed.performance_data.length} products`,
    context: parsed.context,
  };

  if (parsed.webhook_url) {
    try {
      await fetch(parsed.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });
    } catch {
      // Best-effort; do not fail the request if webhook fails
    }
  }

  return response;
}
