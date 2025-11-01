import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { getUserSupabaseClient, getSupabaseClient } from "../_shared/supabase.ts";
import { callByModel, type AllowedModel } from "../_shared/providers.ts";

interface ExecuteRequest {
  job_id: string;
}

const TOOL_CONFIG = {
  "gemini-query": { timeout: 30000, defaultModel: "Gemini-2.5-Pro" as AllowedModel },
  "gpt-query": { timeout: 30000, defaultModel: "GPT-5" as AllowedModel },
  "claude-query": { timeout: 30000, defaultModel: "Claude-4.5-Sonnet" as AllowedModel },
  "multi-model-query": { timeout: 45000, defaultModel: "GPT-5" as AllowedModel },
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin, null);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }

  const startTime = Date.now();

  try {
    const { supabase, user } = await getUserSupabaseClient(req);
    const body = (await req.json()) as ExecuteRequest;

    if (!body?.job_id) {
      return new Response(
        JSON.stringify({ error: "Missing field: job_id" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const { data: job, error: fetchErr } = await supabase
      .from("mcp_jobs")
      .select("id, status, tool, params, attempts, max_attempts, model, metadata")
      .eq("id", body.job_id)
      .single();

    if (fetchErr || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    if (job.status !== "queued") {
      return new Response(
        JSON.stringify({ error: `Job is already ${job.status}` }),
        { status: 409, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const svc = getSupabaseClient(true);
    const { data: claimed, error: claimErr } = await svc
      .from("mcp_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("owner_id", user.id)
      .eq("status", "queued")
      .select("id")
      .single();

    if (claimErr || !claimed) {
      console.log(`Failed to claim job ${job.id}: already taken or ownership mismatch`);
      return new Response(
        JSON.stringify({ error: "Job already taken or not accessible" }),
        { status: 409, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    let result: any = null;
    let err: string | null = null;
    let provider: string | null = null;
    let model: AllowedModel | null = null;
    const execStartTime = Date.now();

    try {
      console.log(`Executing job ${job.id}: tool=${job.tool}, attempt=${job.attempts + 1}`);

      const config = TOOL_CONFIG[job.tool as keyof typeof TOOL_CONFIG];
      if (!config) {
        throw new Error(`Unknown tool: ${job.tool}`);
      }

      model = job.model || config.defaultModel;
      const timeout = config.timeout;

      if (model === "GPT-5") {
        provider = "openai";
      } else if (model === "Gemini-2.5-Pro") {
        provider = "google";
      } else if (model === "Claude-4.5-Sonnet") {
        provider = "anthropic";
      }

      const executePromise = executeJob(job.tool, job.params, model);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Job execution timeout")), timeout)
      );

      result = await Promise.race([executePromise, timeoutPromise]);
    } catch (ex: any) {
      err = ex?.message ?? String(ex);
      console.error(`Execution error for job ${job.id}:`, ex);
    }

    const executionMs = Date.now() - execStartTime;
    const attempts = job.attempts + 1;

    const enhancedMetadata = {
      ...job.metadata,
      execution_ms: executionMs,
      provider,
      model,
      attempt: attempts,
      completed_at: new Date().toISOString(),
    };

    if (err && attempts < job.max_attempts) {
      const baseDelay = 10 * Math.pow(2, attempts - 1);
      const jitter = Math.random() * 5;
      const delaySec = Math.min(300, baseDelay + jitter);
      const nextAt = new Date(Date.now() + delaySec * 1000).toISOString();

      console.log(`Job ${job.id} failed attempt ${attempts}, retrying at ${nextAt}`);

      await svc
        .from("mcp_jobs")
        .update({
          status: "queued",
          error: err,
          attempts: attempts,
          next_at: nextAt,
          started_at: null,
          execution_ms: executionMs,
          metadata: enhancedMetadata,
        })
        .eq("id", job.id)
        .eq("owner_id", user.id);

      return new Response(
        JSON.stringify({
          job_id: job.id,
          status: "requeued",
          attempts: attempts,
          next_at: nextAt,
          error: err,
          execution_ms: executionMs,
        }),
        { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    } else {
      const finalStatus = err ? "failed" : "completed";

      await svc
        .from("mcp_jobs")
        .update({
          status: finalStatus,
          result: result ?? null,
          error: err,
          attempts: attempts,
          completed_at: new Date().toISOString(),
          execution_ms: executionMs,
          provider,
          model,
          metadata: enhancedMetadata,
        })
        .eq("id", job.id)
        .eq("owner_id", user.id);

      const totalMs = Date.now() - startTime;
      console.log(`Job ${job.id} ${finalStatus} in ${totalMs}ms (exec: ${executionMs}ms)`);

      return new Response(
        JSON.stringify({
          job_id: job.id,
          status: finalStatus,
          attempts: attempts,
          result,
          error: err,
          execution_ms: executionMs,
          total_ms: totalMs,
        }),
        { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }
  } catch (e: any) {
    console.error("Execute run error:", e);
    return new Response(
      JSON.stringify({ error: e.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});

async function executeJob(tool: string, params: any, model: AllowedModel): Promise<any> {
  switch (tool) {
    case "gemini-query":
      return executeModelQuery(params, model);
    case "gpt-query":
      return executeModelQuery(params, model);
    case "claude-query":
      return executeModelQuery(params, model);
    case "multi-model-query":
      return executeMultiModelQuery(params, model);
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

async function executeModelQuery(params: any, model: AllowedModel) {
  const { input, system, temperature, max_tokens } = params;

  if (!input || typeof input !== "string") {
    throw new Error("Missing or invalid 'input' parameter");
  }

  const result = await callByModel(
    model,
    input,
    system,
    temperature,
    max_tokens
  );

  return {
    output: result.output_text,
    provider: result.provider,
    model: result.model,
  };
}

async function executeMultiModelQuery(params: any, primaryModel: AllowedModel) {
  const { input, system, models } = params;

  if (!input || typeof input !== "string") {
    throw new Error("Missing or invalid 'input' parameter");
  }

  const modelsToQuery: AllowedModel[] = models && Array.isArray(models)
    ? models
    : [primaryModel];

  const results = await Promise.allSettled(
    modelsToQuery.map((m) => callByModel(m, input, system))
  );

  return {
    results: results.map((r, i) => {
      if (r.status === "fulfilled") {
        return {
          model: modelsToQuery[i],
          provider: r.value.provider,
          output: r.value.output_text,
          success: true,
        };
      } else {
        return {
          model: modelsToQuery[i],
          error: r.reason?.message ?? String(r.reason),
          success: false,
        };
      }
    }),
  };
}
