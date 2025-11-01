import { buildCorsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { sha256Hex } from "../_shared/hash.ts";
import { ALLOWED_MODELS, type AllowedModel, callByModel } from "../_shared/providers.ts";

type Message = { role: "system" | "user" | "assistant"; content: string };
type Body = { messages: Message[]; hintModel?: AllowedModel };

function chooseModel(messages: Message[], hint?: AllowedModel): AllowedModel {
  if (hint && ALLOWED_MODELS.includes(hint)) return hint;
  const text = messages.map(m => m.content).join(" ");
  const lc = text.toLowerCase();
  if (lc.includes("image") || lc.includes("vision") || lc.includes("diagram")) return "Gemini-2.5-Pro";
  if (text.length > 6000) return "Claude-4.5-Sonnet";
  return "GPT-5";
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = buildCorsHeaders(origin, (Deno.env.get("CORS_ORIGINS") ?? "").split(",").filter(Boolean) || null);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    const body = await req.json() as Body;
    const messages = body?.messages ?? [];
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages[] required" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }
    const model = chooseModel(messages, body?.hintModel);
    const system = messages.find(m => m.role === "system")?.content;
    const joined = messages.filter(m => m.role !== "system").map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
    const res = await callByModel(model, joined, system);

    // metanotes
    try {
      const supabase = serviceClient();
      const input_sha256 = await sha256Hex(joined);
      await supabase.from("metanotes").insert({
        run_id: crypto.randomUUID(),
        model,
        provider: res.provider,
        input_sha256,
        prompt_preview: joined.slice(0, 200),
        notes: {
          worker: { name: "llm-router", version: "1.0.0" },
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
