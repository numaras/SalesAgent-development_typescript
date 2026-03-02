/**
 * Validate startup requirements without full initialization.
 *
 * Legacy equivalent: _legacy/src/core/startup.py → validate_startup_requirements()
 * Checks required environment variables and logs warnings for optional ones.
 */

const REQUIRED_ENV: string[] = ["DATABASE_URL"];

const RECOMMENDED_ENV: Array<{ key: string; reason: string }> = [
  { key: "REDIS_URL", reason: "BullMQ background job processing will not work without Redis" },
  { key: "GAM_OAUTH_CLIENT_ID", reason: "GAM OAuth integration requires this" },
  { key: "GAM_OAUTH_CLIENT_SECRET", reason: "GAM OAuth integration requires this" },
];

export function validateStartupRequirements(): void {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Set them in your .env file or process environment.",
    );
  }

  for (const { key, reason } of RECOMMENDED_ENV) {
    if (!process.env[key]) {
      console.warn(`[startup] WARNING: ${key} is not set — ${reason}`);
    }
  }
}
