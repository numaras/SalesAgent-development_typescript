import type {
  HealthConfigError,
  HealthConfigSuccess,
} from "../schemas/healthConfig.js";
import { validateStartupRequirements } from "../startup/validateStartupRequirements.js";

const HEALTH_CONFIG_SUCCESS_MESSAGE =
  "All configuration validation passed" as const;

export function getHealthConfigSuccessPayload(): HealthConfigSuccess {
  return {
    status: "healthy",
    service: "mcp",
    component: "configuration",
    message: HEALTH_CONFIG_SUCCESS_MESSAGE,
  };
}

export function getHealthConfigErrorPayload(err: unknown): HealthConfigError {
  return {
    status: "unhealthy",
    service: "mcp",
    component: "configuration",
    error: err instanceof Error ? err.message : String(err),
  };
}

export function checkStartupConfiguration(): void {
  validateStartupRequirements();
}
