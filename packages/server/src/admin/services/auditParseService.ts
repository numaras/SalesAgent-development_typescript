/**
 * Parse audit log operation strings for display.
 * Parity with Python activity_stream.py format_activity_from_audit_log():
 * content-based type taxonomy ("media-buy", "creative", "error", "product-query",
 * "human-task", "a2a", "api-call") derived from method-name substring checks.
 */

export type ActivityType =
  | "media-buy"
  | "creative"
  | "error"
  | "product-query"
  | "human-task"
  | "a2a"
  | "api-call";

export interface ParsedAuditOperation {
  type: ActivityType;
  displayLabel: string;
  adapterName: string;
  method: string;
}

/**
 * Parse an audit log operation string into a content-based activity type and
 * human-readable display label. Mirrors Python format_activity_from_audit_log()
 * type-classification logic 1:1.
 *
 * Note: caller must override type to "error" when log.success is false.
 */
export function parseAuditOperation(operation: string | null | undefined): ParsedAuditOperation {
  const op = operation ?? "";
  const parts = op.split(".", 2);
  const adapterName = parts.length > 1 ? (parts[0] ?? "system") : "system";
  const method = parts.length > 1 ? (parts[1] ?? op) : op;
  const methodLower = method.toLowerCase();

  let type: ActivityType = "api-call";
  if (methodLower.includes("media_buy")) type = "media-buy";
  else if (methodLower.includes("creative")) type = "creative";
  else if (methodLower.includes("get_products")) type = "product-query";
  else if (methodLower.includes("human") || methodLower.includes("approval")) type = "human-task";
  else if (adapterName === "A2A" || op.startsWith("A2A.")) type = "a2a";

  return { type, displayLabel: method, adapterName, method };
}
