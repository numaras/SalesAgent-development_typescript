import { AgentCardSchema } from "../../../schemas/a2a.js";

export const agentCardRouteSchema = {
  description: "A2A agent card discovery endpoint.",
  tags: ["a2a", "discovery"],
  response: {
    200: AgentCardSchema,
  },
} as const;

export const primaryAgentCardRouteSchema = {
  ...agentCardRouteSchema,
  description: "A2A agent card (primary discovery).",
} as const;

export const legacyAgentCardRouteSchema = {
  ...agentCardRouteSchema,
  description: "A2A agent card (legacy well-known discovery).",
} as const;

export const alternateAgentCardRouteSchema = {
  ...agentCardRouteSchema,
  description: "A2A agent card (alternate discovery).",
} as const;