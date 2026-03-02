/**
 * Push notification service: DB-backed CRUD for A2A push notification configs,
 * plus webhook delivery utility.
 *
 * CRUD operations are DB-backed (Drizzle, push_notification_configs table):
 *   - getPushNotificationConfig: lookup by config_id + tenant + principal + is_active
 *   - setPushNotificationConfig: upsert with `pnc_<uuid>` id generation
 *   - listPushNotificationConfigs: list all active configs for principal
 *   - deletePushNotificationConfig: soft-delete (is_active=false)
 *
 * Legacy equivalent: _legacy/src/a2a_server/adcp_a2a_server.py
 *   on_get_task_push_notification_config L1072-1128
 *   on_set_task_push_notification_config L1130-1252
 *   on_list_task_push_notification_config L1254-1307
 *   on_delete_task_push_notification_config L1309-1366
 *   (webhook delivery: _legacy/src/services/protocol_webhook_service.py)
 */
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { pushNotificationConfigs } from "../db/schema/pushNotificationConfigs.js";
import { validateOutboundUrl } from "../security/outboundUrl.js";
import type { PushNotificationConfig } from "../schemas/pushNotification.js";

// ---------------------------------------------------------------------------
// Shared context type
// ---------------------------------------------------------------------------

export interface PushNotificationContext {
  tenantId: string;
  principalId: string;
}

// ---------------------------------------------------------------------------
// CRUD errors
// ---------------------------------------------------------------------------

export class PushNotificationConfigNotFoundError extends Error {
  constructor(configId: string) {
    super(`Push notification config not found: ${configId}`);
    this.name = "PushNotificationConfigNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// DB row → A2A response helper
// ---------------------------------------------------------------------------

function rowToConfig(row: {
  id: string;
  url: string;
  authenticationType: string | null;
  authenticationToken: string | null;
  validationToken: string | null;
  createdAt: Date;
}): Record<string, unknown> {
  return {
    id: row.id,
    url: row.url,
    authentication:
      row.authenticationType
        ? { type: row.authenticationType, token: row.authenticationToken }
        : null,
    token: row.validationToken,
    created_at: row.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Get push notification config by id (auth required)
// ---------------------------------------------------------------------------

export async function getPushNotificationConfig(
  ctx: PushNotificationContext,
  params: { id: string },
): Promise<Record<string, unknown>> {
  const rows = await db
    .select()
    .from(pushNotificationConfigs)
    .where(
      and(
        eq(pushNotificationConfigs.id, params.id),
        eq(pushNotificationConfigs.tenantId, ctx.tenantId),
        eq(pushNotificationConfigs.principalId, ctx.principalId),
        eq(pushNotificationConfigs.isActive, true),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw new PushNotificationConfigNotFoundError(params.id);
  }

  return rowToConfig(row);
}

// ---------------------------------------------------------------------------
// Set (create or update) push notification config (auth required)
// ---------------------------------------------------------------------------

export interface SetPushNotificationConfigParams {
  task_id?: string;
  push_notification_config: {
    id?: string;
    url: string;
    authentication?: {
      schemes?: string[];
      credentials?: string;
      [key: string]: unknown;
    } | null;
    token?: string | null;
  };
}

export interface SetPushNotificationConfigResult {
  task_id: string;
  push_notification_config: Record<string, unknown>;
}

export async function setPushNotificationConfig(
  ctx: PushNotificationContext,
  params: SetPushNotificationConfigParams,
): Promise<SetPushNotificationConfigResult> {
  const pushConfig = params.push_notification_config;
  const configId =
    pushConfig.id ?? `pnc_${crypto.randomBytes(8).toString("hex")}`;
  const taskId = params.task_id ?? "*";
  const url = pushConfig.url;
  const validationToken = pushConfig.token ?? null;

  // Extract auth from A2A schemes/credentials format
  // Python: schemes[0] → authentication_type, credentials → authentication_token
  let authenticationType: string | null = null;
  let authenticationToken: string | null = null;
  const auth = pushConfig.authentication;
  if (auth) {
    const schemes = Array.isArray(auth["schemes"]) ? (auth["schemes"] as string[]) : [];
    authenticationType = schemes[0] ?? null;
    authenticationToken =
      typeof auth["credentials"] === "string" ? auth["credentials"] : null;
  }

  // Upsert: update if exists, insert otherwise
  const existing = await db
    .select({ id: pushNotificationConfigs.id })
    .from(pushNotificationConfigs)
    .where(
      and(
        eq(pushNotificationConfigs.id, configId),
        eq(pushNotificationConfigs.tenantId, ctx.tenantId),
        eq(pushNotificationConfigs.principalId, ctx.principalId),
      ),
    )
    .limit(1);

  const now = new Date();

  if (existing.length > 0) {
    await db
      .update(pushNotificationConfigs)
      .set({
        url,
        authenticationType,
        authenticationToken,
        validationToken,
        updatedAt: now,
        isActive: true,
      })
      .where(
        and(
          eq(pushNotificationConfigs.id, configId),
          eq(pushNotificationConfigs.tenantId, ctx.tenantId),
          eq(pushNotificationConfigs.principalId, ctx.principalId),
        ),
      );
  } else {
    await db.insert(pushNotificationConfigs).values({
      id: configId,
      tenantId: ctx.tenantId,
      principalId: ctx.principalId,
      sessionId: null,
      url,
      authenticationType,
      authenticationToken,
      validationToken,
      isActive: true,
    });
  }

  // Build auth info for response (A2A PushNotificationAuthenticationInfo format)
  const authInfo =
    authenticationType && authenticationToken
      ? { schemes: [authenticationType], credentials: authenticationToken }
      : null;

  return {
    task_id: taskId,
    push_notification_config: {
      id: configId,
      url,
      authentication: authInfo,
      token: validationToken,
    },
  };
}

// ---------------------------------------------------------------------------
// List all active push notification configs for principal
// ---------------------------------------------------------------------------

export interface ListPushNotificationConfigsResult {
  configs: Record<string, unknown>[];
  total_count: number;
}

export async function listPushNotificationConfigs(
  ctx: PushNotificationContext,
): Promise<ListPushNotificationConfigsResult> {
  const rows = await db
    .select()
    .from(pushNotificationConfigs)
    .where(
      and(
        eq(pushNotificationConfigs.tenantId, ctx.tenantId),
        eq(pushNotificationConfigs.principalId, ctx.principalId),
        eq(pushNotificationConfigs.isActive, true),
      ),
    );

  const configs = rows.map(rowToConfig);
  return { configs, total_count: configs.length };
}

// ---------------------------------------------------------------------------
// Delete (soft-delete) push notification config
// ---------------------------------------------------------------------------

export interface DeletePushNotificationConfigResult {
  id: string;
  status: "deleted";
  message: string;
}

export async function deletePushNotificationConfig(
  ctx: PushNotificationContext,
  params: { id: string },
): Promise<DeletePushNotificationConfigResult> {
  const rows = await db
    .select({ id: pushNotificationConfigs.id })
    .from(pushNotificationConfigs)
    .where(
      and(
        eq(pushNotificationConfigs.id, params.id),
        eq(pushNotificationConfigs.tenantId, ctx.tenantId),
        eq(pushNotificationConfigs.principalId, ctx.principalId),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    throw new PushNotificationConfigNotFoundError(params.id);
  }

  await db
    .update(pushNotificationConfigs)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(pushNotificationConfigs.id, params.id),
        eq(pushNotificationConfigs.tenantId, ctx.tenantId),
        eq(pushNotificationConfigs.principalId, ctx.principalId),
      ),
    );

  return {
    id: params.id,
    status: "deleted",
    message: "Push notification configuration deleted successfully",
  };
}

// ---------------------------------------------------------------------------
// Webhook delivery utility (TS-only; no Python equivalent)
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 10_000;
const USER_AGENT = "AdCP-Sales-Agent/1.0";

function getAuthHeaders(
  config: PushNotificationConfig,
  payloadJson: string,
): Record<string, string> {
  const headers: Record<string, string> = {};
  const auth = config.authentication as
    | { type?: string; token?: string; authentication_token?: string }
    | undefined;
  if (!auth) return headers;

  const token = auth.token ?? auth.authentication_token;
  const type = (auth.type ?? "Bearer").toString();

  if (type === "Bearer" && token) {
    headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }

  if (type === "HMAC-SHA256" && token) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac("sha256", token)
      .update(timestamp + payloadJson)
      .digest("hex");
    headers["X-Adcp-Timestamp"] = timestamp;
    headers["X-Adcp-Signature"] = signature;
    return headers;
  }

  return headers;
}

/**
 * Send a push notification to the configured webhook URL.
 *
 * @param config - Push notification config (url required; optional authentication).
 * @param payload - JSON-serializable payload to send in the request body.
 * @param _metadata - Optional metadata (e.g. task_type, tenant_id) for logging; not sent in body.
 * @returns true if the request succeeded (2xx), false otherwise.
 */
export async function sendPushNotification(
  config: PushNotificationConfig,
  payload: Record<string, unknown>,
  _metadata: Record<string, unknown> = {},
): Promise<boolean> {
  const url = config.url?.trim();
  if (!url) {
    return false;
  }

  const urlCheck = validateOutboundUrl(url, { allowHttp: true });
  if (!urlCheck.valid) {
    return false;
  }

  const payloadJson = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    ...getAuthHeaders(config, payloadJson),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: payloadJson,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
