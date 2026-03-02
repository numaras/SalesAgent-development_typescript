/**
 * A2A skill: update_media_buy — auth required, legacy updates.packages → packages,
 * require media_buy_id or buyer_ref, call mediaBuyUpdateService.
 *
 * Legacy equivalent: _legacy/src/a2a_server/adcp_a2a_server.py → _handle_update_media_buy_skill()
 */
import {
  UpdateMediaBuyRequestSchema,
} from "../../schemas/mediaBuyUpdate.js";
import { updateMediaBuy } from "../../services/mediaBuyUpdateService.js";
import { stripInternalFields } from "../../services/internalFieldStripper.js";
import { isToolContext } from "../authExtractor.js";
import { registerSkill, ServerError } from "../dispatcher.js";

const INVALID_PARAMS_CODE = -32602;

async function updateMediaBuyHandler(
  params: Record<string, unknown>,
  _authToken: string | null,
  context: import("../authExtractor.js").A2AContext,
): Promise<unknown> {
  if (!isToolContext(context)) {
    throw new ServerError(
      -32600,
      "update_media_buy requires authentication (invalid or missing token)",
    );
  }

  const preprocessed = { ...params } as Record<string, unknown>;
  if (!("packages" in preprocessed) && "updates" in preprocessed) {
    const updates = preprocessed.updates;
    if (
      updates != null &&
      typeof updates === "object" &&
      "packages" in updates &&
      Array.isArray((updates as { packages: unknown }).packages)
    ) {
      preprocessed.packages = (updates as { packages: unknown[] }).packages;
    }
    delete preprocessed.updates;
  }

  const hasMediaBuyId =
    typeof preprocessed.media_buy_id === "string" &&
    preprocessed.media_buy_id.trim().length > 0;
  const hasBuyerRef =
    typeof preprocessed.buyer_ref === "string" &&
    preprocessed.buyer_ref.trim().length > 0;
  if (!hasMediaBuyId && !hasBuyerRef) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "One of media_buy_id or buyer_ref is required.",
      { required: ["media_buy_id", "buyer_ref"] },
    );
  }

  const parsed = UpdateMediaBuyRequestSchema.safeParse(preprocessed);
  if (!parsed.success) {
    throw new ServerError(
      INVALID_PARAMS_CODE,
      "Invalid update_media_buy params",
      parsed.error.flatten(),
    );
  }

  const response = await updateMediaBuy(
    {
      tenantId: context.tenantId,
      principalId: context.principalId,
    },
    parsed.data,
  );

  return stripInternalFields(response);
}

registerSkill("update_media_buy", updateMediaBuyHandler);
