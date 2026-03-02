import { z } from "zod";

const DebugErrorSchema = z.object({
  error: z.string(),
});

const DebugDbStateSchema = z.object({
  total_products: z.number(),
  principal: z
    .object({
      principal_id: z.string(),
      tenant_id: z.string(),
    })
    .nullable(),
  tenant: z
    .object({
      tenant_id: z.string(),
      name: z.string(),
      is_active: z.boolean(),
    })
    .nullable(),
  tenant_products_count: z.number(),
  tenant_product_ids: z.array(z.string()),
});

const DebugTenantSchema = z.object({
  tenant_id: z.string().nullable(),
  tenant_name: z.string().nullable(),
  detection_method: z.string().nullable(),
  apx_incoming_host: z.string().nullable(),
  host: z.string().nullable(),
});

const DebugRootSchema = z
  .object({
    all_headers: z.record(z.string(), z.unknown()),
    apx_host: z.string().nullable(),
    host_header: z.string().nullable(),
    virtual_host: z.string().nullable(),
    tenant_found: z.boolean(),
    tenant_id: z.string().nullable(),
    tenant_name: z.string().nullable(),
    landing_page_generated: z.boolean().optional(),
    landing_page_length: z.number().optional(),
  })
  .catchall(z.unknown());

const DebugRootLogicSchema = z
  .object({
    step: z.string(),
    virtual_host: z.string().nullable(),
    apx_host: z.string().nullable(),
    host_header: z.string().nullable(),
    would_return: z.string().optional(),
  })
  .catchall(z.unknown());

export const debugDbStateRouteSchema = {
  description: "Debug DB state (testing mode only).",
  tags: ["debug", "system"],
  response: {
    200: DebugDbStateSchema,
    403: DebugErrorSchema,
  },
} as const;

export const debugTenantRouteSchema = {
  description: "Debug tenant detection using request headers.",
  tags: ["debug", "tenant"],
  response: {
    200: DebugTenantSchema,
  },
} as const;

export const debugRootRouteSchema = {
  description: "Debug root tenant resolution details.",
  tags: ["debug", "tenant"],
  response: {
    200: DebugRootSchema,
  },
} as const;

export const debugLandingRouteSchema = {
  description: "Debug tenant landing page output.",
  tags: ["debug", "tenant"],
  response: {
    200: z.string(),
    404: DebugErrorSchema,
  },
} as const;

export const debugRootLogicRouteSchema = {
  description: "Debug step-by-step root decision flow.",
  tags: ["debug", "tenant"],
  response: {
    200: DebugRootLogicSchema,
  },
} as const;
