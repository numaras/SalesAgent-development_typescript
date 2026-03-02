import { z } from "zod";

export const OidcProviderSchema = z.enum(["google", "microsoft", "custom"]);
export type OidcProvider = z.infer<typeof OidcProviderSchema>;

export const OidcConfigInputSchema = z.object({
  provider: OidcProviderSchema.default("custom"),
  discovery_url: z.string().trim().min(1).optional(),
  client_id: z.string().trim().min(1),
  client_secret: z.string().optional(),
  scopes: z.string().trim().min(1).default("openid email profile"),
  logout_url: z.string().trim().min(1).optional(),
});
export type OidcConfigInput = z.infer<typeof OidcConfigInputSchema>;

export const OidcConfigSummarySchema = z.object({
  provider: OidcProviderSchema.optional(),
  discovery_url: z.string().nullable(),
  client_id: z.string().nullable(),
  has_client_secret: z.boolean(),
  scopes: z.string(),
  logout_url: z.string().nullable(),
  oidc_enabled: z.boolean(),
  oidc_configured: z.boolean(),
  oidc_valid: z.boolean(),
  oidc_verified: z.boolean(),
  oidc_verified_at: z.string().nullable(),
  oidc_verified_redirect_uri: z.string().nullable(),
  redirect_uri: z.string().nullable(),
  redirect_uri_changed: z.boolean(),
});
export type OidcConfigSummary = z.infer<typeof OidcConfigSummarySchema>;

export const OidcConfigGetResponseSchema = z.object({
  config: OidcConfigSummarySchema,
}).and(OidcConfigSummarySchema);
export type OidcConfigGetResponse = z.infer<typeof OidcConfigGetResponseSchema>;

export const OidcConfigSaveResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  config: OidcConfigSummarySchema,
});
export type OidcConfigSaveResponse = z.infer<typeof OidcConfigSaveResponseSchema>;

