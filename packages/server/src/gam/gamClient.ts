/**
 * GAM client factory.
 *
 * Builds an authenticated AdManagerClient from an adapter config row.
 * Supports both OAuth refresh-token and service-account auth methods,
 * mirroring _legacy/src/adapters/google_ad_manager.py → build_gam_config_from_adapter().
 */
import {
  AdManagerClient,
  GoogleRefreshTokenCredential,
  GoogleSACredential,
} from "@guardian/google-admanager-api";
import type { JWTInput } from "google-auth-library";

/** Minimal shape of adapterConfigs row needed to build a client. */
export interface GamAdapterConfig {
  gamNetworkCode: string | null;
  gamAuthMethod?: string | null;
  gamRefreshToken?: string | null;
  gamServiceAccountJson?: string | null;
}

const APP_NAME = "AdCP SalesAgent";

/**
 * Build an authenticated AdManagerClient from an adapter config row.
 * Throws with a user-friendly message if required fields are missing.
 */
export function buildGamClient(config: GamAdapterConfig): AdManagerClient {
  const networkCode = config.gamNetworkCode?.trim();
  if (!networkCode) throw new Error("GAM network code not configured for this tenant");

  const networkCodeNum = parseInt(networkCode, 10);
  if (isNaN(networkCodeNum)) throw new Error(`Invalid GAM network code: ${networkCode}`);

  if (config.gamAuthMethod === "service_account") {
    if (!config.gamServiceAccountJson) {
      throw new Error("GAM service account JSON not configured");
    }
    let saJson: JWTInput;
    try {
      saJson = JSON.parse(config.gamServiceAccountJson) as JWTInput;
    } catch {
      throw new Error("GAM service account JSON is not valid JSON");
    }
    const credential = new GoogleSACredential(saJson);
    return new AdManagerClient(networkCodeNum, credential, APP_NAME);
  }

  // Default: OAuth refresh token
  const clientId = process.env.GAM_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GAM_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "GAM_OAUTH_CLIENT_ID and GAM_OAUTH_CLIENT_SECRET environment variables must be set for OAuth",
    );
  }
  if (!config.gamRefreshToken) throw new Error("GAM refresh token not configured for this tenant");

  const credential = new GoogleRefreshTokenCredential(clientId, clientSecret, config.gamRefreshToken);
  return new AdManagerClient(networkCodeNum, credential, APP_NAME);
}

/**
 * Build a discovery client for network detection.
 * Uses a placeholder network code of 0 — getAllNetworks() returns all accessible
 * networks regardless of the initialisation code (mirrors Python pattern).
 */
export function buildGamDiscoveryClient(
  refreshToken: string,
): AdManagerClient {
  const clientId = process.env.GAM_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GAM_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "GAM_OAUTH_CLIENT_ID and GAM_OAUTH_CLIENT_SECRET environment variables must be set",
    );
  }
  const credential = new GoogleRefreshTokenCredential(clientId, clientSecret, refreshToken);
  return new AdManagerClient(0, credential, APP_NAME);
}
