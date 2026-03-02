import { z } from "zod";

import {
  errorMessageResponseSchema,
  successErrorResponseSchema,
  tenantAndSyncIdParamsSchema,
  tenantIdParamsSchema,
} from "./_common.schema.js";

const syncStatusResponseSchema = z.object({
  sync_id: z.string(),
  status: z.string(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable().optional(),
  progress: z.string().optional(),
  summary: z.unknown().optional(),
  error: z.string().optional(),
});

const latestSyncStatusResponseSchema = z.object({
  sync_id: z.string(),
  status: z.string(),
  started_at: z.string().nullable(),
  progress: z.string().optional(),
});

const resetSyncSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  reset_sync_id: z.string(),
});

const notFoundMessageSchema = z.object({
  message: z.string(),
});

const resetSyncNotFoundSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export const syncStatusByIdRouteSchema = {
  description: "Get GAM sync status by sync id.",
  tags: ["admin", "gam", "sync"],
  params: tenantAndSyncIdParamsSchema,
  response: {
    200: syncStatusResponseSchema,
    404: errorMessageResponseSchema,
  },
} as const;

export const latestSyncStatusRouteSchema = {
  description: "Get latest running inventory sync status.",
  tags: ["admin", "gam", "sync"],
  params: tenantIdParamsSchema,
  response: {
    200: latestSyncStatusResponseSchema,
    404: notFoundMessageSchema,
  },
} as const;

export const resetStuckSyncRouteSchema = {
  description: "Reset currently running stuck inventory sync job.",
  tags: ["admin", "gam", "sync"],
  params: tenantIdParamsSchema,
  response: {
    200: resetSyncSuccessSchema,
    403: successErrorResponseSchema,
    404: resetSyncNotFoundSchema,
    500: successErrorResponseSchema,
  },
} as const;