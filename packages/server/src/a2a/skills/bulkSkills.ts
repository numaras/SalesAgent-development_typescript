/**
 * A2A bulk skills: 6 thin skill handlers that delegate to existing services.
 *
 * - get_media_buy_delivery → deliveryQueryService
 * - update_performance_index → performanceIndexService
 * - sync_creatives → creativeSyncService
 * - list_creatives → creativeQueryService + buildPagination
 * - approve_creative → stub (not yet implemented)
 * - get_media_buy_status → stub (not yet implemented)
 *
 * Legacy equivalent: _legacy/src/a2a_server/adcp_a2a_server.py
 *   _handle_get_media_buy_delivery_skill, _handle_update_performance_index_skill,
 *   _handle_sync_creatives_skill, _handle_list_creatives_skill,
 *   _handle_approve_creative_skill, _handle_get_media_buy_status_skill.
 */
import {
  ListCreativesRequestSchema,
  ListCreativesResponseSchema,
} from "../../schemas/creative.js";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "../../db/client.js";
import { creativeReviews, creatives } from "../../db/schema/creatives.js";
import { mediaBuys } from "../../db/schema/mediaBuys.js";
import { ListCreativeFormatsRequestSchema } from "../../schemas/creativeFormats.js";
import { GetMediaBuyDeliveryRequestSchema } from "../../schemas/mediaBuyDelivery.js";
import { GetMediaBuysRequestSchema } from "../../schemas/mediaBuyList.js";
import { listMediaBuys } from "../../services/mediaBuyListService.js";
import { UpdatePerformanceIndexRequestSchema } from "../../schemas/performanceIndex.js";
import { ListAuthorizedPropertiesRequestSchema } from "../../schemas/authorizedProperties.js";
import { SyncCreativesRequestSchema } from "../../schemas/syncCreatives.js";
import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { buildPagination } from "../../services/creativePagination.js";
import { queryCreatives } from "../../services/creativeQueryService.js";
import { syncCreatives } from "../../services/creativeSyncService.js";
import { getMediaBuyDelivery } from "../../services/deliveryQueryService.js";
import { listFormats } from "../../services/formatService.js";
import {
  computeReadinessState,
  extractPackagesTotal,
} from "../../services/mediaBuyReadinessService.js";
import { listAuthorizedProperties } from "../../services/propertiesService.js";
import { updatePerformanceIndex } from "../../services/performanceIndexService.js";
import type { ToolContext } from "../../auth/toolContext.js";
import { isToolContext } from "../authExtractor.js";
import { registerSkill, ServerError } from "../dispatcher.js";

const INVALID_PARAMS_CODE = -32602;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 1000;

type A2AContext = import("../authExtractor.js").A2AContext;

function requireToolContext(context: A2AContext, skillName: string): ToolContext {
  if (!isToolContext(context)) {
    throw new ServerError(
      -32600,
      `${skillName} requires authentication (invalid or missing token)`,
    );
  }
  return context;
}

async function resolveTenantIdForOptionalAuth(
  context: A2AContext,
): Promise<string> {
  if (isToolContext(context)) {
    return context.tenantId;
  }

  const tenant = await resolveTenantFromHeaders(context.headers);
  if (!tenant) {
    throw new ServerError(
      -32600,
      "Unable to determine tenant from request headers for this skill",
    );
  }
  return tenant.tenantId;
}

async function getMediaBuyDeliveryHandler(
  params: Record<string, unknown>,
  _authToken: string | null,
  context: A2AContext,
): Promise<unknown> {
  const ctx = requireToolContext(context, "get_media_buy_delivery");

  // Legacy pre-processing: singular media_buy_id → media_buy_ids array
  // Python _handle_get_media_buy_delivery_skill L2077-2078
  const normalizedParams = { ...params };
  if (
    !("media_buy_ids" in normalizedParams) &&
    "media_buy_id" in normalizedParams
  ) {
    normalizedParams["media_buy_ids"] = [normalizedParams["media_buy_id"]];
    delete normalizedParams["media_buy_id"];
  }

  const parsed = GetMediaBuyDeliveryRequestSchema.safeParse(
    normalizedParams ?? {},
  );
  if (!parsed.success) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "Invalid get_media_buy_delivery params",
      parsed.error.flatten(),
    );
  }
  return getMediaBuyDelivery(
    { tenantId: ctx.tenantId, principalId: ctx.principalId },
    parsed.data,
  );
}

async function updatePerformanceIndexHandler(
  params: Record<string, unknown>,
  _authToken: string | null,
  context: A2AContext,
): Promise<unknown> {
  const ctx = requireToolContext(context, "update_performance_index");
  const parsed = UpdatePerformanceIndexRequestSchema.safeParse(params);
  if (!parsed.success) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "Invalid update_performance_index params",
      parsed.error.flatten(),
    );
  }
  return updatePerformanceIndex(
    { tenantId: ctx.tenantId, principalId: ctx.principalId },
    parsed.data,
  );
}

async function syncCreativesHandler(
  params: Record<string, unknown>,
  _authToken: string | null,
  context: A2AContext,
): Promise<unknown> {
  const ctx = requireToolContext(context, "sync_creatives");
  const parsed = SyncCreativesRequestSchema.safeParse(params);
  if (!parsed.success) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "Invalid sync_creatives params",
      parsed.error.flatten(),
    );
  }
  return syncCreatives(
    { tenantId: ctx.tenantId, principalId: ctx.principalId },
    parsed.data,
  );
}

async function listCreativesHandler(
  params: Record<string, unknown>,
  _authToken: string | null,
  context: A2AContext,
): Promise<unknown> {
  const ctx = requireToolContext(context, "list_creatives");
  const parsed = ListCreativesRequestSchema.safeParse(params ?? {});
  if (!parsed.success) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "Invalid list_creatives params",
      parsed.error.flatten(),
    );
  }
  const pagination = parsed.data.pagination ?? {};
  const offset = Math.max(0, pagination.offset ?? 0);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, pagination.limit ?? DEFAULT_LIMIT),
  );
  const { creatives, totalCount } = await queryCreatives(
    { tenantId: ctx.tenantId, principalId: ctx.principalId },
    parsed.data,
  );
  const paginationObj = buildPagination(offset, limit, totalCount);
  const response = {
    creatives,
    pagination: paginationObj,
    query_summary: {
      returned: creatives.length,
      total_matching: totalCount,
    },
  };
  return ListCreativesResponseSchema.parse(response);
}

async function listCreativeFormatsHandler(
  params: Record<string, unknown>,
  _authToken: string | null,
  context: A2AContext,
): Promise<unknown> {
  const tenantId = await resolveTenantIdForOptionalAuth(context);
  const parsed = ListCreativeFormatsRequestSchema.safeParse(params ?? {});
  if (!parsed.success) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "Invalid list_creative_formats params",
      parsed.error.flatten(),
    );
  }

  return listFormats({ tenantId }, parsed.data);
}

async function listAuthorizedPropertiesHandler(
  params: Record<string, unknown>,
  _authToken: string | null,
  context: A2AContext,
): Promise<unknown> {
  const tenantId = await resolveTenantIdForOptionalAuth(context);
  const parsed = ListAuthorizedPropertiesRequestSchema.safeParse(params ?? {});
  if (!parsed.success) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "Invalid list_authorized_properties params",
      parsed.error.flatten(),
    );
  }

  return listAuthorizedProperties({ tenantId }, parsed.data);
}

async function approveCreativeHandler(
  parameters: Record<string, unknown>,
  _authToken: string | null,
  context: A2AContext,
): Promise<unknown> {
  const ctx = requireToolContext(context, "approve_creative");

  const creativeId =
    typeof parameters["creative_id"] === "string"
      ? parameters["creative_id"].trim()
      : "";
  if (!creativeId) {
    return {
      success: false,
      message: "creative_id is required",
      parameters_received: parameters,
    };
  }

  const [creative] = await db
    .select()
    .from(creatives)
    .where(
      and(
        eq(creatives.tenantId, ctx.tenantId),
        eq(creatives.creativeId, creativeId),
      ),
    )
    .limit(1);

  if (!creative) {
    return { success: false, message: "Creative not found", creative_id: creativeId };
  }
  if (creative.principalId !== ctx.principalId) {
    return {
      success: false,
      message: "Creative does not belong to authenticated principal",
      creative_id: creativeId,
    };
  }

  if (["approved", "active"].includes(creative.status)) {
    return {
      success: true,
      creative_id: creativeId,
      status: "approved",
      already_approved: true,
    };
  }

  const approvedBy =
    typeof parameters["approved_by"] === "string" &&
    parameters["approved_by"].trim()
      ? parameters["approved_by"].trim()
      : ctx.principalId;

  await db.insert(creativeReviews).values({
    reviewId: `review_${randomUUID().slice(0, 12)}`,
    creativeId,
    tenantId: ctx.tenantId,
    reviewType: "human",
    reviewerEmail: approvedBy,
    reason:
      typeof parameters["reason"] === "string" && parameters["reason"].trim()
        ? parameters["reason"].trim()
        : "Approved via A2A skill",
    humanOverride: false,
    finalDecision: "approved",
  });

  const approvedAt = new Date();
  await db
    .update(creatives)
    .set({
      status: "approved",
      approvedAt,
      approvedBy,
      updatedAt: approvedAt,
    })
    .where(
      and(
        eq(creatives.tenantId, ctx.tenantId),
        eq(creatives.creativeId, creativeId),
      ),
    );

  return {
    success: true,
    creative_id: creativeId,
    status: "approved",
    approved_at: approvedAt.toISOString(),
  };
}

async function getMediaBuyStatusHandler(
  parameters: Record<string, unknown>,
  _authToken: string | null,
  context: A2AContext,
): Promise<unknown> {
  const ctx = requireToolContext(context, "get_media_buy_status");

  const mediaBuyId =
    typeof parameters["media_buy_id"] === "string"
      ? parameters["media_buy_id"].trim()
      : "";
  const buyerRef =
    typeof parameters["buyer_ref"] === "string"
      ? parameters["buyer_ref"].trim()
      : "";

  if (!mediaBuyId && !buyerRef) {
    return {
      success: false,
      message: "Either media_buy_id or buyer_ref is required",
      parameters_received: parameters,
    };
  }

  const basePredicate = and(
    eq(mediaBuys.tenantId, ctx.tenantId),
    eq(mediaBuys.principalId, ctx.principalId),
  );
  const [row] = await db
    .select()
    .from(mediaBuys)
    .where(
      mediaBuyId
        ? and(basePredicate, eq(mediaBuys.mediaBuyId, mediaBuyId))
        : and(basePredicate, eq(mediaBuys.buyerRef, buyerRef)),
    )
    .limit(1);

  if (!row) {
    return {
      success: false,
      message: "Media buy not found",
      media_buy_id: mediaBuyId || null,
      buyer_ref: buyerRef || null,
    };
  }

  const readiness = computeReadinessState(
    row.status,
    row.startDate,
    row.endDate,
    row.startTime,
    row.endTime,
    extractPackagesTotal(row.rawRequest),
  );

  return {
    success: true,
    media_buy_id: row.mediaBuyId,
    buyer_ref: row.buyerRef,
    status: row.status,
    readiness_state: readiness.state,
    is_ready_to_activate: readiness.is_ready_to_activate,
    blocking_issues: readiness.blocking_issues,
    start_time: row.startTime?.toISOString() ?? null,
    end_time: row.endTime?.toISOString() ?? null,
  };
}

async function getMediaBuysHandler(
  params: Record<string, unknown>,
  _authToken: string | null,
  context: A2AContext,
): Promise<unknown> {
  const ctx = requireToolContext(context, "get_media_buys");
  const parsed = GetMediaBuysRequestSchema.safeParse(params ?? {});
  if (!parsed.success) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "Invalid get_media_buys params",
      parsed.error.flatten(),
    );
  }
  return listMediaBuys(
    { tenantId: ctx.tenantId, principalId: ctx.principalId },
    parsed.data,
  );
}

registerSkill("get_media_buy_delivery", getMediaBuyDeliveryHandler);
registerSkill("update_performance_index", updatePerformanceIndexHandler);
registerSkill("sync_creatives", syncCreativesHandler);
registerSkill("list_creatives", listCreativesHandler);
registerSkill("list_creative_formats", listCreativeFormatsHandler);
registerSkill("list_authorized_properties", listAuthorizedPropertiesHandler);
registerSkill("approve_creative", approveCreativeHandler);
registerSkill("get_media_buy_status", getMediaBuyStatusHandler);
registerSkill("get_media_buys", getMediaBuysHandler);
