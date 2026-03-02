/**
 * A2A skill: create_media_buy — auth required, field alias (custom_targeting → targeting_overlay),
 * required field validation (brand_manifest, packages, start_time, end_time), call mediaBuyCreateService.
 *
 * Legacy equivalent: _legacy/src/a2a_server/adcp_a2a_server.py → _handle_create_media_buy_skill()
 */
import { CreateMediaBuyRequestSchema } from "../../schemas/mediaBuyCreate.js";
import { createMediaBuy } from "../../services/mediaBuyCreateService.js";
import { stripInternalFields } from "../../services/internalFieldStripper.js";
import { isToolContext } from "../authExtractor.js";
import { registerSkill, ServerError } from "../dispatcher.js";

const INVALID_PARAMS_CODE = -32602;

async function createMediaBuyHandler(
  params: Record<string, unknown>,
  _authToken: string | null,
  context: import("../authExtractor.js").A2AContext,
): Promise<unknown> {
  if (!isToolContext(context)) {
    throw new ServerError(
      -32600,
      "create_media_buy requires authentication (invalid or missing token)",
    );
  }

  const preprocessed = { ...params } as Record<string, unknown>;
  if ("custom_targeting" in preprocessed) {
    preprocessed.targeting_overlay = preprocessed.custom_targeting;
    delete preprocessed.custom_targeting;
  }
  preprocessed.po_number ??= `A2A-${crypto.randomUUID().slice(0, 8)}`;
  preprocessed.buyer_ref ??= `A2A-${context.principalId}`;

  const required = ["brand_manifest", "packages", "start_time", "end_time"];
  const missing = required.filter(
    (k) =>
      !(k in preprocessed) ||
      preprocessed[k] === undefined ||
      preprocessed[k] === null,
  );
  if (missing.length > 0) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      `Missing required AdCP parameters: ${missing.join(", ")}`,
      { required_parameters: required, missing },
    );
  }

  const parsed = CreateMediaBuyRequestSchema.safeParse(preprocessed);
  if (!parsed.success) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "Invalid create_media_buy params",
      parsed.error.flatten(),
    );
  }

  const response = await createMediaBuy(
    {
      tenantId: context.tenantId,
      principalId: context.principalId,
    },
    parsed.data,
  );

  return stripInternalFields(response);
}

registerSkill("create_media_buy", createMediaBuyHandler);
