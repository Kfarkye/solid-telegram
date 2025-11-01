import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { getUserSupabaseClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin, null);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }

  try {
    const { supabase } = await getUserSupabaseClient(req);
    const url = new URL(req.url);
    const jobId = url.searchParams.get("job_id");

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "Missing job_id query parameter" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const { data: job, error: fetchErr } = await supabase
      .from("mcp_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchErr || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        job_id: job.id,
        status: job.status,
        tool: job.tool,
        model: job.model,
        provider: job.provider,
        priority: job.priority,
        attempts: job.attempts,
        max_attempts: job.max_attempts,
        result: job.result,
        error: job.error,
        execution_ms: job.execution_ms,
        created_at: job.created_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
        next_at: job.next_at,
      }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e: any) {
    console.error("Get status error:", e);
    return new Response(
      JSON.stringify({ error: e.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
