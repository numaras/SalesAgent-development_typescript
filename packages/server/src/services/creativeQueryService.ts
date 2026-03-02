/**
 * List creatives query service (DB query with filters).
 *
 * Legacy equivalent: _legacy/src/core/tools/creatives/listing.py → _list_creatives_impl()
 *   Filters: media_buy_id, buyer_ref, status, format, tags, date range, search.
 *   This implementation supports status, format, created_after/created_before, name_contains.
 *   media_buy_ids/buyer_refs require assignment join (TODO when table exists).
 */
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";

import { db } from "../db/client.js";
import { creatives as creativesTable } from "../db/schema/creatives.js";
import type { Creative, ListCreativesRequest } from "../schemas/creative.js";

export interface CreativeQueryContext {
  tenantId: string;
  principalId: string;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 1000;

function getDataObject(
  row: typeof creativesTable.$inferSelect,
): Record<string, unknown> {
  return row.data ?? {};
}

function extractStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function extractAssignments(
  row: typeof creativesTable.$inferSelect,
): Array<Record<string, unknown>> {
  const data = getDataObject(row);
  const assignments = data["assignments"];
  if (!Array.isArray(assignments)) {
    return [];
  }
  return assignments.filter(
    (entry): entry is Record<string, unknown> =>
      entry != null && typeof entry === "object",
  );
}

function rowMatchesExtendedFilters(
  row: typeof creativesTable.$inferSelect,
  filters: NonNullable<ListCreativesRequest["filters"]>,
): boolean {
  const data = getDataObject(row);
  const assignments = extractAssignments(row);

  // Global: filter out creatives without valid assets (parity with Python L215)
  if (data["assets"] == null) {
    return false;
  }

  if (filters.tags?.length) {
    // Python uses name.contains(tag) per tag with AND semantics (listing.py L241-243)
    const nameLower = row.name.toLowerCase();
    const allTagsMatch = filters.tags.every((tag) =>
      nameLower.includes(tag.toLowerCase()),
    );
    if (!allTagsMatch) {
      return false;
    }
  }

  if (filters.media_buy_ids?.length) {
    const requestedIds = new Set(filters.media_buy_ids);
    const assignmentIds = assignments
      .map((assignment) => assignment["media_buy_id"])
      .filter((id): id is string => typeof id === "string");
    const hasMediaBuyMatch = assignmentIds.some((id) => requestedIds.has(id));
    if (!hasMediaBuyMatch) {
      return false;
    }
  }

  if (filters.buyer_refs?.length) {
    const requestedRefs = new Set(filters.buyer_refs);
    const assignmentRefs = assignments
      .map((assignment) => assignment["buyer_ref"])
      .filter((value): value is string => typeof value === "string");
    const hasBuyerRefMatch = assignmentRefs.some((ref) => requestedRefs.has(ref));
    if (!hasBuyerRefMatch) {
      return false;
    }
  }

  const textFilter = filters.name_contains?.toLowerCase().trim();
  if (textFilter) {
    const description =
      typeof data["description"] === "string" ? data["description"] : "";
    const searchable = `${row.name} ${description}`.toLowerCase();
    if (!searchable.includes(textFilter)) {
      return false;
    }
  }

  return true;
}

function rowToCreative(row: typeof creativesTable.$inferSelect): Creative {
  const created = row.createdAt ?? new Date();
  const updated = row.updatedAt ?? row.createdAt ?? created;
  let status = row.status;
  if (status === "pending") {
    status = "pending_review";
  }

  // Build format_id with optional format_parameters (parity with Python L302-316)
  const formatId: Record<string, unknown> = {
    agent_url: row.agentUrl,
    id: row.format,
  };
  if (row.formatParameters) {
    const params = row.formatParameters;
    if (params["width"] != null) formatId["width"] = params["width"];
    if (params["height"] != null) formatId["height"] = params["height"];
    if (params["duration_ms"] != null)
      formatId["duration_ms"] = params["duration_ms"];
  }

  const creative: Creative = {
    creative_id: row.creativeId,
    name: row.name,
    format_id: formatId as Creative["format_id"],
    created_date: created.toISOString(),
    updated_date: updated.toISOString(),
    status: status as Creative["status"],
  };

  const data = row.data ?? {};
  if (data["assets"]) {
    creative.assets = data["assets"] as Record<string, unknown>;
  }

  // Snippet/content_uri handling (parity with Python L282-296)
  const snippet =
    typeof data["snippet"] === "string" ? data["snippet"] : null;
  if (snippet) {
    creative.media_url =
      typeof data["url"] === "string"
        ? data["url"]
        : "<script>/* Snippet-based creative */</script>";
  } else {
    creative.media_url =
      typeof data["url"] === "string"
        ? data["url"]
        : "https://placeholder.example.com/missing.jpg";
  }

  return creative;
}

/**
 * Query creatives for a tenant/principal with filters, sort, and offset/limit.
 *
 * Returns creatives array and total count (for pagination). Does not build
 * Pagination object (use creativePagination.buildPagination).
 */
export async function queryCreatives(
  ctx: CreativeQueryContext,
  request: ListCreativesRequest,
): Promise<{ creatives: Creative[]; totalCount: number }> {
  const filters = request.filters ?? {};
  const pagination = request.pagination ?? {};
  const sort = request.sort ?? {};
  const offset = Math.max(0, pagination.offset ?? 0);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, pagination.limit ?? DEFAULT_LIMIT),
  );
  const direction = sort.direction === "asc" ? asc : desc;
  const orderByField = sort.field ?? "created_date";

  const conditions = [
    eq(creativesTable.tenantId, ctx.tenantId),
    eq(creativesTable.principalId, ctx.principalId),
  ];

  if (filters.statuses?.length) {
    const statusList = filters.statuses.map((status) =>
      status === "pending_review" ? "pending" : status,
    );
    conditions.push(inArray(creativesTable.status, statusList));
  }
  if (filters.formats?.length) {
    conditions.push(inArray(creativesTable.format, filters.formats));
  }
  if (filters.created_after) {
    const t = new Date(filters.created_after);
    if (!Number.isNaN(t.getTime())) {
      conditions.push(gte(creativesTable.createdAt, t));
    }
  }
  if (filters.created_before) {
    const t = new Date(filters.created_before);
    if (!Number.isNaN(t.getTime())) {
      conditions.push(lte(creativesTable.createdAt, t));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const orderColumn =
    orderByField === "name"
      ? creativesTable.name
      : orderByField === "status"
        ? creativesTable.status
        : creativesTable.createdAt;

  const rows = await db
    .select()
    .from(creativesTable)
    .where(whereClause)
    .orderBy(direction(orderColumn));

  const filteredRows = rows.filter((row) => rowMatchesExtendedFilters(row, filters));
  const totalCount = filteredRows.length;
  const pagedRows = filteredRows.slice(offset, offset + limit);
  const creatives = pagedRows.map(rowToCreative);
  return { creatives, totalCount };
}
