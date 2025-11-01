// Edge runtime types
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

export const ALLOWED_MODELS = [
  "GPT-5",
  "Gemini-2.5-Pro",
  "Claude-4.5-Sonnet",
] as const;

export type ModelId = typeof ALLOWED_MODELS[number];

export function assertAllowedModel(model: string): asserts model is ModelId {
  if (!ALLOWED_MODELS.includes(model as ModelId)) {
    throw new Error(
      `Unsupported model. Allowed: GPT-5, Gemini-2.5-Pro, Claude-4.5-Sonnet`
    );
  }
}

// Provider-facing identifiers (no user-facing normalization)
export const OPENAI_MODEL_MAP: Record<Extract<ModelId, "GPT-5">, string> = {
  "GPT-5": "gpt-5",
};
export const GEMINI_MODEL_MAP: Record<Extract<ModelId, "Gemini-2.5-Pro">, string> = {
  "Gemini-2.5-Pro": "gemini-2.5-pro",
};
export const CLAUDE_MODEL_MAP: Record<Extract<ModelId, "Claude-4.5-Sonnet">, string> = {
  "Claude-4.5-Sonnet": "claude-4.5-sonnet",
};
