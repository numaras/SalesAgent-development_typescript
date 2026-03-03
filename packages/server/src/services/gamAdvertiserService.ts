import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { adapterConfigs } from "../db/schema/adapterConfigs.js";
import { buildGamClient } from "../gam/gamClient.js";

export interface FetchGamAdvertisersInput {
  tenantId: string;
  search?: string;
  limit?: number;
  fetchAll?: boolean;
}

export interface GamAdvertiser {
  id: string;
  name: string;
}

export interface FetchGamAdvertisersResult {
  advertisers: GamAdvertiser[];
  count: number;
  search: string | null;
  fetch_all: boolean;
  limit: number;
}

export async function fetchGamAdvertisers(
  input: FetchGamAdvertisersInput,
): Promise<FetchGamAdvertisersResult> {
  const search = typeof input.search === "string" ? input.search.trim() : "";
  const limitRaw = typeof input.limit === "number" ? input.limit : 500;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(500, Math.max(1, Math.trunc(limitRaw)))
    : 500;
  const fetchAll = input.fetchAll === true;

  const [adapterRow] = await db
    .select()
    .from(adapterConfigs)
    .where(eq(adapterConfigs.tenantId, input.tenantId))
    .limit(1);
  if (!adapterRow) {
    throw new Error("Adapter config not found");
  }

  const gamClient = buildGamClient(adapterRow);
  const companyService = await gamClient.getService("CompanyService");

  const pageLimit = fetchAll ? 500 : Math.min(limit, 500);
  const whereClause = search
    ? `WHERE type = 'ADVERTISER' AND name LIKE '%${search.replace(/'/g, "''")}%'`
    : "WHERE type = 'ADVERTISER'";

  const allAdvertisers: GamAdvertiser[] = [];
  let offset = 0;
  for (;;) {
    const statement = `${whereClause} LIMIT ${pageLimit} OFFSET ${offset}`;
    const page = (await (
      companyService as unknown as Record<
        string,
        (...a: unknown[]) => Promise<unknown>
      >
    ).getCompaniesByStatement({ query: statement })) as Record<string, unknown>;

    const results = (page["results"] as unknown[]) ?? [];
    if (results.length === 0) break;

    for (const c of results) {
      const co = c as Record<string, unknown>;
      allAdvertisers.push({
        id: String(co["id"]),
        name: typeof co["name"] === "string" ? co["name"] : String(co["id"]),
      });
    }

    if (!fetchAll || results.length < pageLimit) break;
    offset += pageLimit;
  }

  const advertisers = allAdvertisers.slice(0, limit);
  return {
    advertisers,
    count: advertisers.length,
    search: search || null,
    fetch_all: fetchAll,
    limit,
  };
}
