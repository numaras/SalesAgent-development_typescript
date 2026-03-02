import { z } from "zod";

export const AdminDbResetSuccessSchema = z.object({
  status: z.literal("success"),
  message: z.string(),
});

export const AdminDbResetErrorSchema = z.object({
  error: z.string(),
});

export const adminDbResetRouteSchema = {
  description: "Reset DB pool (testing only). Requires ADCP_TESTING=true.",
  tags: ["system", "admin"],
  response: {
    200: AdminDbResetSuccessSchema,
    403: AdminDbResetErrorSchema,
    500: AdminDbResetErrorSchema,
  },
} as const;