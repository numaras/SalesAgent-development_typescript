import { z } from "zod";

export const McpErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});