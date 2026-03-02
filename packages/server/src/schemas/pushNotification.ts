/**
 * Zod schemas for push notification config (AdCP / A2A).
 *
 * Used by create_media_buy, sync_creatives, and push notification service.
 * Legacy equivalent: _legacy adcp PushNotificationConfig, protocol_webhook_service.
 * A2A protocol types: a2a.types.PushNotificationConfig, TaskPushNotificationConfig,
 *   PushNotificationAuthenticationInfo.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// PushNotificationAuthenticationInfo (a2a.types.PushNotificationAuthenticationInfo)
// ---------------------------------------------------------------------------

/** Authentication info per A2A protocol spec: schemes array + optional credentials. */
export const PushNotificationAuthenticationInfoSchema = z.object({
  schemes: z.array(z.string()),
  credentials: z.string().optional(),
});
export type PushNotificationAuthenticationInfo = z.infer<
  typeof PushNotificationAuthenticationInfoSchema
>;

// ---------------------------------------------------------------------------
// PushNotificationConfig (url + optional auth + token; AdCP / A2A spec)
// ---------------------------------------------------------------------------

export const PushNotificationConfigSchema = z
  .object({
    id: z.string().optional(),
    url: z.string().url().optional(),
    /**
     * Authentication: A2A protocol format {schemes, credentials} or legacy
     * webhook sender format {type, token}. Union preserves both use cases.
     */
    authentication: z
      .union([
        PushNotificationAuthenticationInfoSchema,
        z.record(z.string(), z.unknown()),
      ])
      .optional(),
    /**
     * Validation token returned by server in get/set/list responses.
     * Maps to PushNotificationConfig.validation_token in
     * _legacy/src/core/database/models.py L1846.
     */
    token: z.string().optional(),
  })
  .passthrough();
export type PushNotificationConfig = z.infer<typeof PushNotificationConfigSchema>;

// ---------------------------------------------------------------------------
// TaskPushNotificationConfig (a2a.types.TaskPushNotificationConfig)
// Used in set/get push notification config responses.
// ---------------------------------------------------------------------------

export const TaskPushNotificationConfigSchema = z.object({
  task_id: z.string(),
  push_notification_config: PushNotificationConfigSchema,
});
export type TaskPushNotificationConfig = z.infer<
  typeof TaskPushNotificationConfigSchema
>;

// ---------------------------------------------------------------------------
// Request/response shapes for push notification skills (TS-only utility)
// ---------------------------------------------------------------------------

export const SendPushNotificationRequestSchema = z
  .object({
    push_notification_config: PushNotificationConfigSchema,
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type SendPushNotificationRequest = z.infer<
  typeof SendPushNotificationRequestSchema
>;
