/**
 * Media buy lookup: by media_buy_id or buyer_ref (tenant-scoped); enforces principal ownership.
 *
 * Legacy equivalent: _legacy/src/core/tools/media_buy_update.py
 *   _verify_principal() — lookup by media_buy_id then buyer_ref; raise if not found or wrong principal.
 */
import { and, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { mediaBuys, type MediaBuy } from "../db/schema/mediaBuys.js";

export interface MediaBuyLookupContext {
  tenantId: string;
  principalId: string;
}

export interface MediaBuyLookupParams {
  mediaBuyId?: string;
  buyerRef?: string;
}

/** Thrown when no media buy matches the given id or buyer_ref in the tenant. */
export class MediaBuyNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Media buy '${identifier}' not found.`);
    this.name = "MediaBuyNotFoundError";
  }
}

/** Thrown when the principal does not own the media buy. */
export class MediaBuyForbiddenError extends Error {
  constructor(mediaBuyId: string) {
    super(`Principal does not own media buy '${mediaBuyId}'.`);
    this.name = "MediaBuyForbiddenError";
  }
}

/**
 * Lookup media buy by media_buy_id or buyer_ref (tenant-scoped).
 * Verifies principal ownership; throws if not found or forbidden.
 */
export async function lookupMediaBuy(
  ctx: MediaBuyLookupContext,
  params: MediaBuyLookupParams,
): Promise<MediaBuy> {
  const { mediaBuyId, buyerRef } = params;
  if (!mediaBuyId?.trim() && !buyerRef?.trim()) {
    throw new MediaBuyNotFoundError("(no id or buyer_ref provided)");
  }

  let row: MediaBuy | undefined;

  if (mediaBuyId?.trim()) {
    const rows = await db
      .select()
      .from(mediaBuys)
      .where(
        and(
          eq(mediaBuys.mediaBuyId, mediaBuyId.trim()),
          eq(mediaBuys.tenantId, ctx.tenantId),
        ),
      )
      .limit(1);
    row = rows[0];
  }

  if (!row && buyerRef?.trim()) {
    const rows = await db
      .select()
      .from(mediaBuys)
      .where(
        and(
          eq(mediaBuys.buyerRef, buyerRef.trim()),
          eq(mediaBuys.tenantId, ctx.tenantId),
        ),
      )
      .limit(1);
    row = rows[0];
  }

  if (!row) {
    const identifier = mediaBuyId?.trim() ?? buyerRef?.trim() ?? "(unknown)";
    throw new MediaBuyNotFoundError(identifier);
  }

  if (row.principalId !== ctx.principalId) {
    throw new MediaBuyForbiddenError(row.mediaBuyId);
  }

  return row;
}
