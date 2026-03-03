/**
 * List media buys for a principal with optional filters and pagination.
 *
 * Legacy equivalent: _legacy/src/core/tools/media_buy_list.py
 *   _get_media_buys_impl() — filter by principal, status, ids, buyer_refs; paginate.
 */
import { and, count, desc, eq, inArray } from "drizzle-orm";

import { db } from "../db/client.js";
import { mediaBuys } from "../db/schema/mediaBuys.js";
import type {
  GetMediaBuysRequest,
  GetMediaBuysResponse,
  MediaBuySummary,
} from "../schemas/mediaBuyList.js";
import {
  GetMediaBuysRequestSchema,
  GetMediaBuysResponseSchema,
} from "../schemas/mediaBuyList.js";

export interface MediaBuyListContext {
  tenantId: string;
  principalId: string;
}

/**
 * List media buys owned by the given principal, with optional filtering and pagination.
 */
export async function listMediaBuys(
  ctx: MediaBuyListContext,
  request: GetMediaBuysRequest,
): Promise<GetMediaBuysResponse> {
  const parsed = GetMediaBuysRequestSchema.parse(request);
  const { media_buy_ids, buyer_refs, status_filter, limit, offset } = parsed;

  // Build WHERE conditions — always scope to tenant + principal
  const conditions: ReturnType<typeof eq>[] = [
    eq(mediaBuys.tenantId, ctx.tenantId),
    eq(mediaBuys.principalId, ctx.principalId),
  ];

  if (media_buy_ids && media_buy_ids.length > 0) {
    conditions.push(inArray(mediaBuys.mediaBuyId, media_buy_ids) as ReturnType<typeof eq>);
  }

  if (buyer_refs && buyer_refs.length > 0) {
    conditions.push(inArray(mediaBuys.buyerRef, buyer_refs) as ReturnType<typeof eq>);
  }

  if (status_filter && status_filter !== "all") {
    const statuses = Array.isArray(status_filter) ? status_filter : [status_filter];
    if (statuses.length === 1) {
      conditions.push(eq(mediaBuys.status, statuses[0]) as ReturnType<typeof eq>);
    } else if (statuses.length > 1) {
      conditions.push(inArray(mediaBuys.status, statuses) as ReturnType<typeof eq>);
    }
  }

  const whereClause = and(...conditions);

  const countResult = await db
    .select({ value: count() })
    .from(mediaBuys)
    .where(whereClause);
  const total = Number(countResult[0]?.value ?? 0);

  const rows = await db
    .select()
    .from(mediaBuys)
    .where(whereClause)
    .orderBy(desc(mediaBuys.createdAt))
    .limit(limit)
    .offset(offset);

  const summaries: MediaBuySummary[] = rows.map((row) => ({
    media_buy_id: row.mediaBuyId,
    buyer_ref: row.buyerRef ?? null,
    order_name: row.orderName,
    advertiser_name: row.advertiserName,
    status: row.status,
    budget: row.budget !== null && row.budget !== undefined ? Number(row.budget) : null,
    currency: row.currency ?? undefined,
    start_date: row.startDate,
    end_date: row.endDate,
    created_at:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
    updated_at:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : String(row.updatedAt),
  }));

  return GetMediaBuysResponseSchema.parse({
    media_buys: summaries,
    total,
    offset,
    limit,
    has_more: offset + limit < total,
  });
}
