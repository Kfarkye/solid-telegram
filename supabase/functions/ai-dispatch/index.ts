import { buildCorsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { sha256Hex } from "../_shared/hash.ts";
import { callByModel, type AllowedModel, ALLOWED_MODELS } from "../_shared/providers.ts";

type Body = {
  model: AllowedModel;
  input: string;
  system?: string;
  temperature?: number;
  max_tokens?: number;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = buildCorsHeaders(origin, (Deno.env.get("CORS_ORIGINS") ?? "").split(",").filter(Boolean) || null);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    const body = await req.json() as Body;
    const { model, input, system, temperature = 0, max_tokens = 1024 } = body || {};

    if (!model || !ALLOWED_MODELS.includes(model)) {
      return new Response(JSON.stringify({ error: "Unsupported model. Allowed: GPT-5, Gemini-2.5-Pro, Claude-4.5-Sonnet" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }
    if (!input || typeof input !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'input' string" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }

    const res = await callByModel(model, input, system, temperature, max_tokens);

    // metanotes
    try {
      const supabase = serviceClient();
      const input_sha256 = await sha256Hex(input);
      await supabase.from("metanotes").insert({
        run_id: crypto.randomUUID(),
        model,
        provider: res.provider,
        input_sha256,
        prompt_preview: input.slice(0, 200),
        notes: {
          worker: { name: "ai-dispatch", version: "1.0.0" },
          routing_policy: { strict_model_ids: ALLOWED_MODELS, chosen_model: model }
        }
      });
    } catch (e) { console.error("metanotes insert failed:", e); }

    return new Response(JSON.stringify({ success: true, model, provider: res.provider, output_text: res.output_text, raw: res.raw }), { status: 200, headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { "content-type": "application/json" } });
  }
});
