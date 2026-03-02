/**
 * Zod schemas for A2A (Agent-to-Agent) protocol.
 *
 * Legacy equivalent: _legacy/src/a2a_server/adcp_a2a_server.py
 *   — a2a.types AgentCard, AgentSkill, Task; JSON-RPC request/response.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// AgentSkill (skill entry in AgentCard)
// ---------------------------------------------------------------------------

export const AgentSkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()).optional(),
});
export type AgentSkill = z.infer<typeof AgentSkillSchema>;

// ---------------------------------------------------------------------------
// AgentExtension (extension in capabilities)
// ---------------------------------------------------------------------------

export const AgentExtensionSchema = z.object({
  uri: z.string(),
  description: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});
export type AgentExtension = z.infer<typeof AgentExtensionSchema>;

// ---------------------------------------------------------------------------
// AgentCapabilities
// ---------------------------------------------------------------------------

export const AgentCapabilitiesSchema = z.object({
  push_notifications: z.boolean().optional(),
  extensions: z.array(AgentExtensionSchema).optional(),
});
export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;

// ---------------------------------------------------------------------------
// AgentCard (discovery document at /.well-known/agent-card.json)
// ---------------------------------------------------------------------------

export const AgentCardSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  protocol_version: z.string().optional(),
  url: z.string().optional(),
  documentation_url: z.string().optional(),
  capabilities: AgentCapabilitiesSchema.optional(),
  default_input_modes: z.array(z.string()).optional(),
  default_output_modes: z.array(z.string()).optional(),
  skills: z.array(AgentSkillSchema).optional(),
});
export type AgentCard = z.infer<typeof AgentCardSchema>;

// ---------------------------------------------------------------------------
// A2A Task (in-memory task for JSON-RPC flow)
// ---------------------------------------------------------------------------

export const TaskStateSchema = z.enum([
  "working",
  "completed",
  "failed",
  "submitted",
  "input_required",
  "canceled",
  "rejected",
  "auth_required",
  "unknown",
]);
export type TaskState = z.infer<typeof TaskStateSchema>;

export const TaskStatusSchema = z.object({
  state: TaskStateSchema,
  message: z.unknown().optional(),
  timestamp: z.string().optional(),
});
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const A2ATaskSchema = z.object({
  id: z.string(),
  context_id: z.string(),
  kind: z.literal("task"),
  status: TaskStatusSchema,
  artifacts: z.array(z.unknown()).optional(),
  history: z.array(z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type A2ATask = z.infer<typeof A2ATaskSchema>;

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 request / response
// ---------------------------------------------------------------------------

export const A2AJsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
  id: z.union([z.string(), z.number()]).optional(),
});
export type A2AJsonRpcRequest = z.infer<typeof A2AJsonRpcRequestSchema>;

export const A2AJsonRpcErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
});
export type A2AJsonRpcError = z.infer<typeof A2AJsonRpcErrorSchema>;

export const A2AJsonRpcResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  result: z.unknown().optional(),
  error: A2AJsonRpcErrorSchema.optional(),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
});
export type A2AJsonRpcResponse = z.infer<typeof A2AJsonRpcResponseSchema>;
