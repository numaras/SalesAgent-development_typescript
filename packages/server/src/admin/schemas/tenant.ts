import { z } from "zod";

const NonEmptyString = z.string().trim().min(1);
const OptionalUrl = z.string().trim().url().optional();

export const TenantIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9][a-z0-9-_]*$/i, "Invalid tenant_id format");

/**
 * Input schema for tenant creation.
 * Note: tenant_id is NOT accepted from callers — it is derived by the route as
 * `tenant_${subdomain}` (mirrors Python core.py L436). subdomain is optional and
 * derived from name when absent.
 */
export const TenantCreateSchema = z.object({
  name: NonEmptyString.max(200),
  subdomain: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/i, "Invalid subdomain format")
    .optional(),
  virtual_host: z.string().trim().min(1).optional(),
  ad_server: z.string().trim().min(1).max(50).optional(),
  auth_setup_mode: z.boolean().default(true),
  enable_axe_signals: z.boolean().default(false),
  human_review_required: z.boolean().default(false),
  authorized_emails: z.array(z.string().trim().email()).default([]),
  authorized_domains: z.array(z.string().trim().min(1)).default([]),
  admin_token: z.string().trim().min(1).optional(),
  favicon_url: OptionalUrl,
});
export type TenantCreateInput = z.infer<typeof TenantCreateSchema>;

export const TenantUpdateSchema = z
  .object({
    name: NonEmptyString.max(200).optional(),
    subdomain: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/i, "Invalid subdomain format")
      .optional(),
    virtual_host: z.string().trim().optional(),
    ad_server: z.string().trim().max(50).optional(),
    auth_setup_mode: z.boolean().optional(),
    enable_axe_signals: z.boolean().optional(),
    human_review_required: z.boolean().optional(),
    authorized_emails: z.array(z.string().trim().email()).optional(),
    authorized_domains: z.array(z.string().trim().min(1)).optional(),
    admin_token: z.string().trim().optional(),
    favicon_url: z.string().trim().url().optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required for update",
  );
export type TenantUpdateInput = z.infer<typeof TenantUpdateSchema>;
