import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  ALLOWED_MODELS,
  ModelId,
  OPENAI_MODEL_MAP,
  GEMINI_MODEL_MAP,
  CLAUDE_MODEL_MAP,
  assertAllowedModel,
} from "./model-guard.ts";

export type ProviderName = "openai" | "google" | "anthropic";

export interface ProviderResult {
  provider: ProviderName;
  model: ModelId;
  used_params:
    | "openai:max_completion_tokens"
    | "google:gemini-generateContent"
    | "anthropic:max_tokens";
  text: string | null;
  raw: any;
}

type OpenAIMessage = { role: "system" | "user" | "assistant"; content: string };

export async function callOpenAI(opts: {
  model: Extract<ModelId, "GPT-5">;
  messages: OpenAIMessage[];
  /** GPT‑5 ONLY: you must pass max_completion_tokens */
  max_completion_tokens: number;
  /** GPT‑5 REQUIRED default = 1 (do not default to 0) */
  temperature?: number; // will be forced to 1 if omitted
}): Promise<ProviderResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const modelId = OPENAI_MODEL_MAP[opts.model];

  const payload = {
    model: modelId,
    messages: opts.messages,
    // CRITICAL: GPT‑5 temperature MUST be 1 (your requirement)
    temperature: 1,
    // CRITICAL: GPT‑5 uses max_completion_tokens (not max_tokens)
    max_completion_tokens: opts.max_completion_tokens,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const text =
    json?.choices?.[0]?.message?.content ??
    json?.choices?.[0]?.text ??
    null;

  return {
    provider: "openai",
    model: opts.model,
    used_params: "openai:max_completion_tokens",
    text,
    raw: json,
  };
}

export async function callGemini(opts: {
  model: Extract<ModelId, "Gemini-2.5-Pro">;
  prompt: string;
  config?: Record<string, unknown>;
}): Promise<ProviderResult> {
  const key = Deno.env.get("GOOGLE_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GOOGLE_API_KEY (or GEMINI_API_KEY) not configured");

  const modelId = GEMINI_MODEL_MAP[opts.model];

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: opts.config ?? {},
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

  return {
    provider: "google",
    model: opts.model,
    used_params: "google:gemini-generateContent",
    text,
    raw: json,
  };
}

export async function callAnthropic(opts: {
  model: Extract<ModelId, "Claude-4.5-Sonnet">;
  prompt: string;
  /** CLAUDE ONLY: pass max_tokens */
  max_tokens: number;
  temperature?: number; // optional, default flexible
}): Promise<ProviderResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const modelId = CLAUDE_MODEL_MAP[opts.model];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: opts.max_tokens,
      temperature: opts.temperature ?? 0,
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const text = json?.content?.[0]?.text ?? null;

  return {
    provider: "anthropic",
    model: opts.model,
    used_params: "anthropic:max_tokens",
    text,
    raw: json,
  };
}

/** Unified router by explicit model id (no normalization). */
export async function callByModel(input: {
  model: ModelId;
  prompt?: string;
  messages?: OpenAIMessage[];
  max_completion_tokens?: number; // GPT‑5
  max_tokens?: number; // Claude
  gemini_config?: Record<string, unknown>;
}): Promise<ProviderResult> {
  assertAllowedModel(input.model);

  switch (input.model) {
    case "GPT-5": {
      const messages =
        input.messages ??
        (input.prompt ? [{ role: "user", content: input.prompt } as OpenAIMessage] : null);
      if (!messages) throw new Error("GPT-5 requires messages[] or prompt");
      const max_completion_tokens = input.max_completion_tokens ?? 512;
      return callOpenAI({
        model: "GPT-5",
        messages,
        max_completion_tokens,
        temperature: 1, // enforced
      });
    }
    case "Gemini-2.5-Pro": {
      if (!input.prompt) throw new Error("Gemini-2.5-Pro requires prompt");
      return callGemini({
        model: "Gemini-2.5-Pro",
        prompt: input.prompt,
        config: input.gemini_config,
      });
    }
    case "Claude-4.5-Sonnet": {
      const prompt = input.prompt ?? input.messages?.map(m => m.content).join("\n");
      if (!prompt) throw new Error("Claude-4.5-Sonnet requires prompt or messages");
      const max_tokens = input.max_tokens ?? 1024;
      return callAnthropic({
        model: "Claude-4.5-Sonnet",
        prompt,
        max_tokens,
      });
    }
  }
}
