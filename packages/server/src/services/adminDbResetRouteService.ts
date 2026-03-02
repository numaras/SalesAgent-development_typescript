import { resetDbPool } from "../db/client.js";

export const ADMIN_DB_RESET_FORBIDDEN_MESSAGE =
  "This endpoint is only available in testing mode";
export const ADMIN_DB_RESET_SUCCESS_MESSAGE =
  "Database connection pool and tenant context reset successfully";

export function isTestingModeEnabled(): boolean {
  return process.env["ADCP_TESTING"] === "true";
}

export async function resetDatabasePool(): Promise<void> {
  await resetDbPool();
}
