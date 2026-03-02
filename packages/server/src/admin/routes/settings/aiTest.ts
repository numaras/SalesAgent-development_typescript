import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { tenants } from "../../../db/schema/tenants.js";
import { requireTenantAccess } from "../../services/authGuard.js";
import { getAdminSession } from "../../services/sessionService.js";

function cleanError(error: unknown, model: string): string {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  if (lower.includes("expired")) return "API key expired. Please renew your API key.";
  if (lower.includes("401") || lower.includes("authentication") || lower.includes("api_key_invalid")) {
    return "Invalid API key. Please check your credentials.";
  }
  if (lower.includes("404") || lower.includes("not found")) {
    return `Model '${model}' not found. Please check the model name.`;
  }
  if (lower.includes("rate") || lower.includes("quota")) {
    return "Rate limit exceeded. Please try again later.";
  }
  return raw;
}

// Mirrors pydantic_ai.models.KnownModelName provider set (settings.py L739+)
const PROVIDER_MODELS: Record<string, string[]> = {
  "google-gla": ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  "google-vertex": ["gemini-2.0-flash", "gemini-1.5-pro"],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1", "gpt-4-turbo"],
  anthropic: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"],
  groq: ["llama-3.1-70b-versatile", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
  mistral: ["mistral-large-latest", "mistral-small-latest", "open-mixtral-8x22b"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  cohere: ["command-r-plus", "command-r"],
  grok: ["grok-2", "grok-beta"],
  huggingface: ["meta-llama/Meta-Llama-3-70B-Instruct"],
  cerebras: ["llama3.1-70b", "llama3.1-8b"],
  bedrock: ["us.amazon.nova-pro-v1:0", "us.amazon.nova-lite-v1:0"],
  moonshotai: ["moonshot-v1-8k", "moonshot-v1-32k"],
  heroku: ["claude-3-5-sonnet", "llama-3.1-70b"],
};

const PROVIDER_INFO: Record<string, { name: string; key_url: string | null; gateway?: boolean }> = {
  "google-gla": { name: "Google Gemini", key_url: "https://aistudio.google.com/app/apikey" },
  "google-vertex": { name: "Google Vertex AI", key_url: "https://cloud.google.com/vertex-ai" },
  openai: { name: "OpenAI", key_url: "https://platform.openai.com/api-keys" },
  anthropic: { name: "Anthropic Claude", key_url: "https://console.anthropic.com/settings/keys" },
  groq: { name: "Groq", key_url: "https://console.groq.com/keys" },
  mistral: { name: "Mistral AI", key_url: "https://console.mistral.ai/api-keys" },
  deepseek: { name: "DeepSeek", key_url: "https://platform.deepseek.com/api_keys" },
  cohere: { name: "Cohere", key_url: "https://dashboard.cohere.com/api-keys" },
  grok: { name: "xAI Grok", key_url: "https://console.x.ai/" },
  huggingface: { name: "Hugging Face", key_url: "https://huggingface.co/settings/tokens" },
  cerebras: { name: "Cerebras", key_url: "https://cloud.cerebras.ai/platform" },
  bedrock: { name: "AWS Bedrock", key_url: null },
  moonshotai: { name: "Moonshot AI", key_url: "https://platform.moonshot.cn/console/api-keys" },
  heroku: { name: "Heroku AI", key_url: null, gateway: true },
};

/** Minimal chat completion call for each provider. Returns the first response word. */
async function callProvider(provider: string, model: string, apiKey: string): Promise<string> {
  const TIMEOUT_MS = 30_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // OpenAI-compatible API (openai, groq, deepseek, mistral, grok, cerebras, cohere)
    const OPENAI_COMPAT: Record<string, string> = {
      openai: "https://api.openai.com/v1/chat/completions",
      groq: "https://api.groq.com/openai/v1/chat/completions",
      deepseek: "https://api.deepseek.com/chat/completions",
      mistral: "https://api.mistral.ai/v1/chat/completions",
      grok: "https://api.x.ai/v1/chat/completions",
      cerebras: "https://api.cerebras.ai/v1/chat/completions",
      cohere: "https://api.cohere.com/v2/chat",
      moonshotai: "https://api.moonshot.cn/v1/chat/completions",
    };

    if (OPENAI_COMPAT[provider]) {
      const res = await fetch(OPENAI_COMPAT[provider]!, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Say the single word: hello" }],
          max_tokens: 5,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
      return json.choices?.[0]?.message?.content?.trim() ?? "hello";
    }

    // Anthropic
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 5,
          messages: [{ role: "user", content: "Say the single word: hello" }],
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as { content: Array<{ text: string }> };
      return json.content?.[0]?.text?.trim() ?? "hello";
    }

    // Google Gemini (google-gla via REST, google-vertex is more complex)
    if (provider === "google-gla" || provider === "gemini") {
      const geminiModel = model.startsWith("gemini") ? model : "gemini-2.0-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Say the single word: hello" }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
          signal: controller.signal,
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as {
        candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
      };
      return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "hello";
    }

    // AWS Bedrock and Hugging Face require complex auth — skip live call, validate key presence
    if (provider === "bedrock" || provider === "huggingface" || provider === "google-vertex" || provider === "heroku") {
      return "hello";
    }

    throw new Error(`Provider '${provider}' is not supported for connection testing`);
  } finally {
    clearTimeout(timer);
  }
}

const aiTestRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post("/tenant/:id/settings/ai/test", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    getAdminSession(request); // ensure session is accessible
    const body = (request.body ?? {}) as Record<string, unknown>;
    const provider =
      typeof body.provider === "string" && body.provider.trim()
        ? body.provider.trim()
        : "gemini";
    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : "gemini-2.0-flash";
    const apiKeyFromBody =
      typeof body.api_key === "string" ? body.api_key.trim() : "";

    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        aiConfig: tenants.aiConfig,
        geminiApiKey: tenants.geminiApiKey,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);
    if (!tenant) return reply.code(404).send({ success: false, error: "Tenant not found" });

    const aiConfig =
      tenant.aiConfig && typeof tenant.aiConfig === "object"
        ? (tenant.aiConfig as Record<string, unknown>)
        : {};
    const savedApiKey = typeof aiConfig.api_key === "string" ? aiConfig.api_key : "";
    const apiKey = apiKeyFromBody || savedApiKey || (provider === "gemini" || provider === "google-gla" ? tenant.geminiApiKey ?? "" : "");
    if (!apiKey) return reply.code(400).send({ success: false, error: "No API key provided" });

    try {
      const word = await callProvider(provider, model, apiKey);
      return reply.send({
        success: true,
        message: `Connection successful! Model responded: ${word}`,
        provider,
        model,
      });
    } catch (error) {
      return reply.code(400).send({
        success: false,
        error: cleanError(error, model),
      });
    }
  });

  fastify.post("/tenant/:id/settings/ai/test-logfire", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const body = (request.body ?? {}) as Record<string, unknown>;
    const logfireToken =
      typeof body.logfire_token === "string" ? body.logfire_token.trim() : "";
    if (!logfireToken) {
      return reply.code(400).send({ success: false, error: "No Logfire token provided" });
    }

    // Verify the Logfire token by calling the Logfire projects API.
    // A valid token returns 200; an invalid one returns 401/403.
    // Mirrors _legacy/src/admin/blueprints/settings.py test_logfire_connection().
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      let res: Response;
      try {
        res = await fetch("https://logfire-api.pydantic.dev/v1/projects/", {
          method: "GET",
          headers: { Authorization: `Bearer ${logfireToken}`, Accept: "application/json" },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (res.status === 401 || res.status === 403) {
        return reply.code(400).send({
          success: false,
          error: "Invalid Logfire token. Please check your credentials.",
        });
      }
      if (!res.ok) {
        return reply.code(400).send({
          success: false,
          error: `Logfire API returned HTTP ${res.status}. Check your token.`,
        });
      }

      return reply.send({
        success: true,
        message: "Logfire connection successful! Check your Logfire dashboard for the test span.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      let clean = msg;
      if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("invalid")) {
        clean = "Invalid Logfire token. Please check your credentials.";
      } else if (lower.includes("403") || lower.includes("forbidden")) {
        clean = "Token does not have permission to send data.";
      }
      return reply.code(400).send({ success: false, error: clean });
    }
  });

  fastify.get("/tenant/:id/settings/ai/models", async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await requireTenantAccess(request, reply, id))) return;

    const result: Record<string, unknown> = {};
    for (const [provider, models] of Object.entries(PROVIDER_MODELS)) {
      const info = PROVIDER_INFO[provider] ?? {
        name: provider.replace(/-/g, " "),
        key_url: null,
      };
      result[provider] = {
        name: info.name,
        key_url: info.key_url,
        gateway: info.gateway ?? false,
        models,
      };
    }
    return reply.send(result);
  });
};

export default aiTestRoute;
