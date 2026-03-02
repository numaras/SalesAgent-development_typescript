/**
 * Strip internal-only fields from objects before sending in protocol responses.
 *
 * Legacy equivalent: _legacy/src/core/schemas.py
 *   NestedModelSerializerMixin + exclude=True fields; internal fields must never
 *   appear in MCP/A2A/REST responses.
 *
 * ADCP-011-C: Removes workflow_step_id, changes_applied, platform_line_item_id,
 * implementation_config (and any other configured keys) from payloads.
 */

/** Default keys that must never appear in protocol responses. */
export const DEFAULT_INTERNAL_KEYS = [
  "workflow_step_id",
  "changes_applied",
  "platform_line_item_id",
  "implementation_config",
] as const;

/**
 * Recursively strip internal keys from a plain object or array.
 * Does not mutate the root reference; returns a new object/array.
 * Non-plain objects (e.g. class instances) are returned as-is.
 */
export function stripInternalFields<T>(
  value: T,
  keys: string[] = [...DEFAULT_INTERNAL_KEYS],
): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      stripInternalFields(item, keys),
    ) as unknown as T;
  }

  if (typeof value === "object" && value.constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (keys.includes(k)) {
        continue;
      }
      out[k] = stripInternalFields(v, keys);
    }
    return out as T;
  }

  return value;
}
