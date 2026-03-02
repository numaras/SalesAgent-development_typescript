/**
 * Adapter call for sync creatives: persist to DB with upsert semantics.
 *
 * Legacy equivalent: _legacy/src/core/tools/creatives/_sync.py L150-334
 *   - Savepoint-per-creative transaction isolation (per-creative try/catch here)
 *   - Upsert semantics: look up existing by (tenant_id, principal_id, creative_id)
 *   - Returns action "created" or "updated" per creative
 *   - action "failed" on per-creative errors
 *
 * Not yet implemented (requires additional services):
 *   - Workflow step creation for creatives needing approval (_workflow.py)
 *   - Notification sending (_workflow.py _send_creative_notifications)
 *   - Assignment processing (_assignments.py _process_assignments)
 *   - Format registry validation (creative_agent_registry)
 */
import { and, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { creatives as creativesTable } from "../db/schema/creatives.js";
import type {
  CreativeAsset,
  SyncCreativesRequest,
  SyncCreativesResponse,
  SyncCreativeResult,
} from "../schemas/syncCreatives.js";
import { SyncCreativesSuccessSchema } from "../schemas/syncCreatives.js";

export interface CreativeSyncContext {
  tenantId: string;
  principalId: string;
}

/** Derive a stable creative_id from the creative asset. */
function resolveCreativeId(creative: CreativeAsset): string {
  return creative.creative_id ?? crypto.randomUUID();
}

/** Build the JSONB data blob stored in the `data` column. */
function buildDataBlob(
  creative: CreativeAsset,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (creative.assets != null) data["assets"] = creative.assets;
  if (creative.click_url != null) data["url"] = creative.click_url;
  // Prefer media_url as the canonical URL stored in data.url
  if (creative.media_url != null) data["url"] = creative.media_url;
  if (creative.tags != null) data["tags"] = creative.tags;
  return data;
}

/** Build format_parameters from FormatId extended fields. */
function buildFormatParameters(
  creative: CreativeAsset,
): Record<string, unknown> | undefined {
  const fid = creative.format_id as Record<string, unknown> | undefined;
  if (!fid) return undefined;
  const params: Record<string, unknown> = {};
  if (fid["width"] != null) params["width"] = fid["width"];
  if (fid["height"] != null) params["height"] = fid["height"];
  if (fid["duration_ms"] != null) params["duration_ms"] = fid["duration_ms"];
  return Object.keys(params).length > 0 ? params : undefined;
}

/**
 * Perform creative sync via DB with upsert semantics.
 *
 * Each creative is processed independently — an error in one does not abort
 * others (equivalent to Python's savepoint-per-creative isolation).
 */
export async function syncCreativesViaAdapter(
  ctx: CreativeSyncContext,
  request: SyncCreativesRequest,
): Promise<SyncCreativesResponse> {
  const results: SyncCreativeResult[] = [];

  for (const rawCreative of request.creatives) {
    const creative = rawCreative as CreativeAsset;
    const creativeId = resolveCreativeId(creative);

    try {
      const agentUrl =
        typeof (creative.format_id as Record<string, unknown>)?.["agent_url"] ===
        "string"
          ? ((creative.format_id as Record<string, unknown>)["agent_url"] as string)
          : "";
      const formatId =
        typeof (creative.format_id as Record<string, unknown>)?.["id"] ===
        "string"
          ? ((creative.format_id as Record<string, unknown>)["id"] as string)
          : "";

      // SECURITY: Must filter by principal_id to prevent cross-principal access
      const existing = await db
        .select({ creativeId: creativesTable.creativeId })
        .from(creativesTable)
        .where(
          and(
            eq(creativesTable.tenantId, ctx.tenantId),
            eq(creativesTable.principalId, ctx.principalId),
            eq(creativesTable.creativeId, creativeId),
          ),
        )
        .limit(1);

      const dataBlob = buildDataBlob(creative);
      const formatParams = buildFormatParameters(creative);
      const now = new Date();

      if (existing.length > 0) {
        // Update existing creative
        await db
          .update(creativesTable)
          .set({
            ...(creative.name != null && { name: creative.name }),
            agentUrl,
            format: formatId,
            data: dataBlob,
            ...(formatParams != null && { formatParameters: formatParams }),
            updatedAt: now,
          })
          .where(
            and(
              eq(creativesTable.tenantId, ctx.tenantId),
              eq(creativesTable.principalId, ctx.principalId),
              eq(creativesTable.creativeId, creativeId),
            ),
          );

        results.push({ creative_id: creativeId, action: "updated" });
      } else {
        // Insert new creative
        await db.insert(creativesTable).values({
          creativeId,
          tenantId: ctx.tenantId,
          principalId: ctx.principalId,
          name: creative.name ?? creativeId,
          agentUrl,
          format: formatId,
          status: "pending",
          data: dataBlob,
          ...(formatParams != null && { formatParameters: formatParams }),
        });

        results.push({ creative_id: creativeId, action: "created" });
      }
    } catch (err) {
      // Per-creative isolation: one failure does not abort the rest
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({
        creative_id: creativeId,
        action: "failed",
        errors: [errorMsg],
      });
    }
  }

  const response: SyncCreativesResponse = {
    creatives: results,
    dry_run: request.dry_run ?? false,
  };
  SyncCreativesSuccessSchema.parse(response);
  return response;
}
