import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeadersFor, errorResponse, successResponse } from "../_shared/auth.ts";
import { callByModel } from "../_shared/providers.ts";
import { assertAllowedModel } from "../_shared/model-guard.ts";

type Body = {
  model: string;
  prompt?: string;
  messages?: { role: "system" | "user" | "assistant"; content: string }[];
  max_completion_tokens?: number;
  max_tokens?: number;
  gemini_config?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersFor(req), status: 204 });
  }
  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  try {
    const body = (await req.json()) as Body;
    assertAllowedModel(body.model);

    if (body.model === "GPT-5" && body.max_completion_tokens === undefined) {
      return errorResponse(req, "GPT-5 requires max_completion_tokens", 400);
    }
    if (body.model === "Claude-4.5-Sonnet" && body.max_tokens === undefined) {
      return errorResponse(req, "Claude-4.5-Sonnet requires max_tokens", 400);
    }

    const result = await callByModel({
      model: body.model as any,
      prompt: body.prompt,
      messages: body.messages,
      max_completion_tokens: body.max_completion_tokens,
      max_tokens: body.max_tokens,
      gemini_config: body.gemini_config,
    });

    return successResponse(req, {
      ok: true,
      provider: result.provider,
      model: result.model,
      used_params: result.used_params,
      text: result.text,
    });
  } catch (e: any) {
    return errorResponse(req, e?.message ?? "Internal error", 500);
  }
});
