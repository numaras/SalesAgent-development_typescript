import { z } from "zod";

import { A2AJsonRpcResponseSchema } from "../../../schemas/a2a.js";

export const a2aJsonRpcBodySchema = z.unknown();

export const a2aJsonRpcRouteSchema = {
  description: "A2A JSON-RPC 2.0 endpoint.",
  tags: ["a2a", "jsonrpc"],
  body: a2aJsonRpcBodySchema,
  response: {
    200: A2AJsonRpcResponseSchema,
    400: A2AJsonRpcResponseSchema,
  },
} as const;

export const a2aJsonRpcTrailingSlashRouteSchema = {
  ...a2aJsonRpcRouteSchema,
  description: "A2A JSON-RPC 2.0 endpoint (trailing slash).",
} as const;