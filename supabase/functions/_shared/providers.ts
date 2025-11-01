export type AllowedModel = "GPT-5" | "Gemini-2.5-Pro" | "Claude-4.5-Sonnet";
export const ALLOWED_MODELS: AllowedModel[] = ["GPT-5","Gemini-2.5-Pro","Claude-4.5-Sonnet"];

export type ProviderResult = {
  output_text: string;
  raw: unknown;
  provider: "openai" | "google" | "anthropic";
  model: AllowedModel;
};

export function assertAllowed(model: string): asserts model is AllowedModel {
  if (!ALLOWED_MODELS.includes(model as AllowedModel)) {
    throw new Error("Unsupported model. Allowed: GPT-5, Gemini-2.5-Pro, Claude-4.5-Sonnet");
  }
}

export async function callOpenAI(model: AllowedModel, input: string, system?: string, temperature=1, max_completion_tokens=4096): Promise<ProviderResult> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  const url = "https://api.openai.com/v1/chat/completions";
  const messages = [
    ...(system ? [{ role: "system", content: system }] as any[] : []),
    { role: "user", content: input }
  ];
  const payload = { model, messages, temperature, max_completion_tokens };
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${key}` },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${JSON.stringify(data)}`);
  const output_text = data?.choices?.[0]?.message?.content ?? "";
  return { output_text, raw: data, provider: "openai", model };
}

export async function callGemini(model: AllowedModel, input: string, system?: string): Promise<ProviderResult> {
  const key = Deno.env.get("GOOGLE_API_KEY");
  if (!key) throw new Error("Missing GOOGLE_API_KEY");
  const base = "https://generativelanguage.googleapis.com/v1beta";
  const url = `${base}/models/${encodeURIComponent(model)}:generateContent?key=${key}`;
  const parts: any[] = [];
  if (system) parts.push({ text: system });
  parts.push({ text: input });
  const payload = { contents: [{ role: "user", parts }] };
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error: ${res.status} ${JSON.stringify(data)}`);
  let output_text = "";
  try {
    const p = data?.candidates?.[0]?.content?.parts ?? [];
    output_text = p.map((q: any) => q?.text ?? "").join("");
  } catch {}
  return { output_text, raw: data, provider: "google", model };
}

export async function callAnthropic(model: AllowedModel, input: string, system?: string, temperature=0, max_tokens=1024): Promise<ProviderResult> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  const url = "https://api.anthropic.com/v1/messages";
  const payload: any = { model, max_tokens, messages: [{ role: "user", content: input }] };
  if (system) payload.system = system;
  if (typeof temperature === "number") payload.temperature = temperature;
  const res = await fetch(url, { method: "POST", headers: { "content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01" }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${JSON.stringify(data)}`);
  let output_text = "";
  try { output_text = (data?.content ?? []).map((p: any) => p?.text ?? "").join(""); } catch {}
  return { output_text, raw: data, provider: "anthropic", model };
}

export async function callByModel(model: AllowedModel, input: string, system?: string, temperature?: number, max_tokens?: number): Promise<ProviderResult> {
  switch (model) {
    case "GPT-5":
      return callOpenAI(model, input, system, temperature ?? 1, max_tokens ?? 4096);
    case "Gemini-2.5-Pro":
      return callGemini(model, input, system);
    case "Claude-4.5-Sonnet":
      return callAnthropic(model, input, system, temperature ?? 0, max_tokens ?? 4096);
  }
}
