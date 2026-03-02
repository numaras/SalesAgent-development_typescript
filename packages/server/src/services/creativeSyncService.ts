/**
 * Sync creatives service: validate assets; apply dry_run / delete_missing / validation_mode.
 *
 * Legacy equivalent: _legacy/src/core/tools/creatives/_sync.py → _sync_creatives_impl()
 *   Validates creatives, filters by creative_ids, applies dry_run (no persist),
 *   delete_missing, validation_mode (strict vs lenient).
 */
import type {
  CreativeAsset,
  SyncCreativesRequest,
  SyncCreativesResponse,
  SyncCreativeResult,
} from "../schemas/syncCreatives.js";
import {
  CreativeActionSchema,
  SyncCreativesRequestSchema,
  SyncCreativesSuccessSchema,
} from "../schemas/syncCreatives.js";
import {
  type CreativeSyncContext,
  syncCreativesViaAdapter,
} from "./creativeSyncAdapterCall.js";

export type { CreativeSyncContext };

/**
 * Validate a single creative for sync (strict: require name and format_id.id).
 */
function validateCreative(
  c: CreativeAsset,
  validationMode: "strict" | "lenient",
): { ok: true } | { ok: false; error: string } {
  if (!c.creative_id?.trim()) {
    return { ok: false, error: "creative_id is required" };
  }
  if (!c.format_id?.id?.trim()) {
    return { ok: false, error: "format_id.id is required" };
  }
  if (validationMode === "strict" && !c.name?.trim()) {
    return { ok: false, error: "name is required in strict mode" };
  }
  return { ok: true };
}

/**
 * Sync creatives: validate request, filter by creative_ids, apply dry_run or call adapter.
 */
export async function syncCreatives(
  ctx: CreativeSyncContext,
  request: SyncCreativesRequest,
): Promise<SyncCreativesResponse> {
  if (!ctx.principalId) {
    throw new Error(
      "Authentication required. Please include your token in the 'x-adcp-auth' header.",
    );
  }

  const parsed = SyncCreativesRequestSchema.parse(request);
  let creatives = [...parsed.creatives];
  const validationMode = parsed.validation_mode ?? "strict";
  const dryRun = parsed.dry_run ?? false;

  if (parsed.creative_ids?.length) {
    const idSet = new Set(parsed.creative_ids);
    creatives = creatives.filter((c) => idSet.has(c.creative_id));
  }

  const results: SyncCreativeResult[] = [];
  for (const c of creatives) {
    const v = validateCreative(c, validationMode);
    if (!v.ok) {
      results.push({
        creative_id: c.creative_id,
        action: "failed",
        errors: [v.error],
      });
      continue;
    }
    if (dryRun) {
      results.push({
        creative_id: c.creative_id,
        action: "created",
      });
    }
  }

  if (dryRun) {
    const response: SyncCreativesResponse = {
      creatives: results,
      dry_run: true,
    };
    SyncCreativesSuccessSchema.parse(response);
    return response;
  }

  const creativesToSync = creatives.filter((c) => {
    const v = validateCreative(c, validationMode);
    return v.ok;
  });
  const adapterResponse = await syncCreativesViaAdapter(ctx, {
    ...parsed,
    creatives: creativesToSync,
  });
  if ("errors" in adapterResponse) {
    return adapterResponse;
  }
  return {
    ...adapterResponse,
    creatives: [...results, ...adapterResponse.creatives],
  };
}
