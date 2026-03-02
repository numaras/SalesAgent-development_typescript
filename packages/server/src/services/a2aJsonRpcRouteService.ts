import {
  dispatch,
  ServerError,
} from "../a2a/dispatcher.js";
import {
  A2AJsonRpcRequestSchema,
  type A2AJsonRpcResponse,
} from "../schemas/a2a.js";

const INVALID_REQUEST_CODE = -32600;

export function extractAuthToken(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const auth = headers.authorization ?? headers.Authorization;
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }

  const adcpAuth = headers["x-adcp-auth"];
  if (typeof adcpAuth === "string") return adcpAuth.trim() || null;
  if (Array.isArray(adcpAuth) && adcpAuth[0]) {
    return String(adcpAuth[0]).trim() || null;
  }

  return null;
}

export function buildMissingBodyJsonRpcResponse(): A2AJsonRpcResponse {
  return {
    jsonrpc: "2.0",
    error: {
      code: INVALID_REQUEST_CODE,
      message: "Missing request body",
    },
    id: null,
  };
}

export async function handleJsonRpc(
  body: unknown,
  authToken: string | null,
  headers: Record<string, string | string[] | undefined>,
): Promise<A2AJsonRpcResponse> {
  const parsed = A2AJsonRpcRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      jsonrpc: "2.0",
      error: {
        code: INVALID_REQUEST_CODE,
        message: "Invalid JSON-RPC request",
        data: parsed.error.flatten(),
      },
      id: null,
    };
  }

  const { method, params, id } = parsed.data;
  const paramsObj =
    params && typeof params === "object" && !Array.isArray(params)
      ? (params as Record<string, unknown>)
      : {};

  try {
    const result = await dispatch(method, paramsObj, authToken, headers);
    return {
      jsonrpc: "2.0",
      result,
      id,
    };
  } catch (err) {
    if (err instanceof ServerError) {
      return {
        jsonrpc: "2.0",
        error: {
          code: err.code,
          message: err.message,
          data: err.data,
        },
        id,
      };
    }

    return {
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: err instanceof Error ? err.message : "Internal error",
      },
      id,
    };
  }
}
