/**
 * A2A push notification config skills.
 *
 * Four A2A protocol handlers mirroring Python's push notification config CRUD:
 *   on_get_task_push_notification_config    – DB lookup by config_id
 *   on_set_task_push_notification_config    – upsert config (create or update)
 *   on_list_task_push_notification_config   – list all active for principal
 *   on_delete_task_push_notification_config – soft-delete (is_active = false)
 *
 * Also retains send_push_notification (TS-only webhook delivery utility;
 * Python triggers push notifications internally, not via A2A skill).
 *
 * Legacy equivalent: _legacy/src/a2a_server/adcp_a2a_server.py
 *   on_get_task_push_notification_config    L1072-1128
 *   on_set_task_push_notification_config    L1130-1252
 *   on_list_task_push_notification_config   L1254-1307
 *   on_delete_task_push_notification_config L1309-1366
 */
import type { ToolContext } from "../../auth/toolContext.js";
import {
  PushNotificationConfigSchema,
  SendPushNotificationRequestSchema,
} from "../../schemas/pushNotification.js";
import {
  PushNotificationConfigNotFoundError,
  deletePushNotificationConfig,
  getPushNotificationConfig,
  listPushNotificationConfigs,
  sendPushNotification,
  setPushNotificationConfig,
} from "../../services/pushNotificationService.js";
import { isToolContext } from "../authExtractor.js";
import { registerSkill, ServerError } from "../dispatcher.js";

const INVALID_PARAMS_CODE = -32602;
const INTERNAL_ERROR_CODE = -32603;
const NOT_FOUND_CODE = -32001;

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

// ---------------------------------------------------------------------------
// on_get_task_push_notification_config
// Python: adcp_a2a_server.py L1072-1128
// ---------------------------------------------------------------------------

async function getTaskPushNotificationConfigHandler(
  params: Record<string, unknown>,
  _authToken: string | null,
  context: A2AContext,
): Promise<unknown> {
  const ctx = requireToolContext(context, "on_get_task_push_notification_config");

  const configId = params["id"];
  if (!configId || typeof configId !== "string") {
    throw new ServerError(INVALID_PARAMS_CODE, "Missing required parameter: id");
  }

  try {
    return await getPushNotificationConfig(
      { tenantId: ctx.tenantId, principalId: ctx.principalId },
      { id: configId },
    );
  } catch (err) {
    if (err instanceof PushNotificationConfigNotFoundError) {
      throw new ServerError(NOT_FOUND_CODE, err.message);
    }
    throw new ServerError(
      INTERNAL_ERROR_CODE,
      `Failed to get push notification config: ${String(err)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// on_set_task_push_notification_config
// Python: adcp_a2a_server.py L1130-1252
// ---------------------------------------------------------------------------

async function setTaskPushNotificationConfigHandler(
  params: Record<string, unknown>,
  _authToken: string | null,
  context: A2AContext,
): Promise<unknown> {
  const ctx = requireToolContext(context, "on_set_task_push_notification_config");

  const pushConfig = params["push_notification_config"];
  if (!pushConfig || typeof pushConfig !== "object") {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "Missing required parameter: push_notification_config",
    );
  }

  const url = (pushConfig as Record<string, unknown>)["url"];
  if (!url || typeof url !== "string") {
    throw new ServerError(INVALID_PARAMS_CODE, "Missing required parameter: url");
  }

  try {
    return await setPushNotificationConfig(
      { tenantId: ctx.tenantId, principalId: ctx.principalId },
      {
        task_id:
          typeof params["task_id"] === "string" ? params["task_id"] : undefined,
        push_notification_config: pushConfig as {
          id?: string;
          url: string;
          authentication?: { schemes?: string[]; credentials?: string } | null;
          token?: string | null;
        },
      },
    );
  } catch (err) {
    throw new ServerError(
      INTERNAL_ERROR_CODE,
      `Failed to set push notification config: ${String(err)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// on_list_task_push_notification_config
// Python: adcp_a2a_server.py L1254-1307
// ---------------------------------------------------------------------------

async function listTaskPushNotificationConfigHandler(
  _params: Record<string, unknown>,
  _authToken: string | null,
  context: A2AContext,
): Promise<unknown> {
  const ctx = requireToolContext(
    context,
    "on_list_task_push_notification_config",
  );

  try {
    return await listPushNotificationConfigs({
      tenantId: ctx.tenantId,
      principalId: ctx.principalId,
    });
  } catch (err) {
    throw new ServerError(
      INTERNAL_ERROR_CODE,
      `Failed to list push notification configs: ${String(err)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// on_delete_task_push_notification_config
// Python: adcp_a2a_server.py L1309-1366
// ---------------------------------------------------------------------------

async function deleteTaskPushNotificationConfigHandler(
  params: Record<string, unknown>,
  _authToken: string | null,
  context: A2AContext,
): Promise<unknown> {
  const ctx = requireToolContext(
    context,
    "on_delete_task_push_notification_config",
  );

  const configId = params["id"];
  if (!configId || typeof configId !== "string") {
    throw new ServerError(INVALID_PARAMS_CODE, "Missing required parameter: id");
  }

  try {
    return await deletePushNotificationConfig(
      { tenantId: ctx.tenantId, principalId: ctx.principalId },
      { id: configId },
    );
  } catch (err) {
    if (err instanceof PushNotificationConfigNotFoundError) {
      throw new ServerError(NOT_FOUND_CODE, err.message);
    }
    throw new ServerError(
      INTERNAL_ERROR_CODE,
      `Failed to delete push notification config: ${String(err)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// send_push_notification (TS-only webhook delivery utility)
// No Python A2A equivalent; Python triggers push notifications internally.
// ---------------------------------------------------------------------------

async function sendPushNotificationHandler(
  params: Record<string, unknown>,
  _authToken: string | null,
  context: A2AContext,
): Promise<unknown> {
  const ctx = requireToolContext(context, "send_push_notification");

  const parsed = SendPushNotificationRequestSchema.safeParse(params);
  if (!parsed.success) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "Invalid send_push_notification params",
      parsed.error.flatten(),
    );
  }

  const configParsed = PushNotificationConfigSchema.safeParse(
    parsed.data.push_notification_config,
  );
  if (!configParsed.success || !configParsed.data.url) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "send_push_notification requires push_notification_config with url",
    );
  }

  const payload = (parsed.data.payload as Record<string, unknown>) ?? {};
  const metadata = {
    task_type: "send_push_notification",
    tenant_id: ctx.tenantId,
    principal_id: ctx.principalId,
  };

  const sent = await sendPushNotification(configParsed.data, payload, metadata);

  return { sent };
}

registerSkill(
  "on_get_task_push_notification_config",
  getTaskPushNotificationConfigHandler,
);
registerSkill(
  "on_set_task_push_notification_config",
  setTaskPushNotificationConfigHandler,
);
registerSkill(
  "on_list_task_push_notification_config",
  listTaskPushNotificationConfigHandler,
);
registerSkill(
  "on_delete_task_push_notification_config",
  deleteTaskPushNotificationConfigHandler,
);
registerSkill("send_push_notification", sendPushNotificationHandler);
