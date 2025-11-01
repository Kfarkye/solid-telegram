import { buildCorsHeaders } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { callByModel, type AllowedModel } from "../_shared/providers.ts";

type Body = {
  vision: string;
  defaultModel?: AllowedModel;
  wizard_data?: any;
  project_name?: string;
};
const LANES = ["spec","sql","ui","test","cicd"] as const;
type Lane = typeof LANES[number];

function chooseLaneModel(lane: Lane, fallback: AllowedModel): AllowedModel {
  switch (lane) {
    case "ui": return "Gemini-2.5-Pro";
    case "spec": return "Claude-4.5-Sonnet";
    case "test": return "Claude-4.5-Sonnet";
    case "sql": return "GPT-5";
    case "cicd": return "GPT-5";
  }
}

function laneSystemPrompt(lane: Lane) {
  if (lane === "spec") return "You are a principal software architect. Output only valid JSON with keys: title, overview, functional_requirements[], non_functional_requirements[], decisions[], risks[].";
  if (lane === "sql") return "You are a senior data engineer. Output only valid JSON with keys: ddl (string SQL), tables[{name, columns[{name,type,nullable,desc}], indexes[], fks[]}].";
  if (lane === "ui") return "You are a product designer. Output only valid JSON with keys: component_tree, routes[], design_tokens, wireframes[].";
  if (lane === "test") return "You are a QA lead. Output only valid JSON with keys: strategy, test_matrix[], unit_samples[], e2e_scenarios[].";
  if (lane === "cicd") return "You are a DevOps engineer. Output only valid JSON with keys: pipeline_yaml (string), jobs[], secrets[], notes.";
  return "";
}

function laneUserPrompt(lane: Lane, vision: string) {
  return `Vision:\n${vision}\n\nProduce the ${lane.toUpperCase()} artifact as JSON only.`;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = buildCorsHeaders(origin, (Deno.env.get("CORS_ORIGINS") ?? "").split(",").filter(Boolean) || null);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  try {
    const body = await req.json() as Body;
    const vision = body?.vision?.trim();
    if (!vision) return new Response(JSON.stringify({ error: "vision required" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });

    const supabase = serviceClient();

    // create run
    const insertData: any = {
      vision,
      status: "running",
      meta: { version: "1.0.0" }
    };
    if (body.wizard_data) insertData.wizard_data = body.wizard_data;
    if (body.project_name) insertData.project_name = body.project_name;

    const { data: runRows, error: runErr } = await supabase.from("arch_runs").insert(insertData).select().limit(1);
    if (runErr || !runRows?.length) {
      console.error("create run error:", runErr);
      throw new Error("Failed to create run");
    }
    const run = runRows[0];
    const run_id = run.id as string;

    // seed lane rows
    for (const lane of LANES) {
      await supabase.from("lane_events").insert({ run_id, lane, status: "queued" });
    }

    // process sequentially
    for (const lane of LANES) {
      const model = chooseLaneModel(lane, (body?.defaultModel ?? "GPT-5"));
      await supabase.from("lane_events").update({ status: "running", meta: { model } }).eq("run_id", run_id).eq("lane", lane);

      const system = laneSystemPrompt(lane);
      const user = laneUserPrompt(lane, vision);

      try {
        const res = await callByModel(model, user, system, 0, 2000);
        let out: any = null;
        try { out = JSON.parse(res.output_text); } catch { out = { text: res.output_text }; }
        await supabase.from("lane_events").update({ status: "succeeded", output: out, meta: { model, provider: res.provider } }).eq("run_id", run_id).eq("lane", lane);
      } catch (e) {
        console.error(`lane ${lane} failed:`, e);
        await supabase.from("lane_events").update({ status: "failed", meta: { error: String(e) } }).eq("run_id", run_id).eq("lane", lane);
        await supabase.from("arch_runs").update({ status: "failed" }).eq("id", run_id);
        return new Response(JSON.stringify({ success: false, run_id, error: `lane ${lane} failed` }), { status: 200, headers: { ...cors, "content-type": "application/json" } });
      }
    }

    await supabase.from("arch_runs").update({ status: "succeeded" }).eq("id", run_id);
    return new Response(JSON.stringify({ success: true, run_id }), { status: 200, headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { "content-type": "application/json" } });
  }
});
