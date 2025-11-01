import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";

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

  try {
    const internalKey = req.headers.get("x-internal-key");
    const expectedKey = Deno.env.get("INTERNAL_KEY");

    if (!expectedKey || internalKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const svc = getSupabaseClient(true);

    const { data: healedCount, error: healErr } = await svc.rpc("heal_stuck_jobs");

    if (healErr) {
      console.error("Failed to heal stuck jobs:", healErr);
    } else if (healedCount > 0) {
      console.log(`Healed ${healedCount} stuck jobs`);
    }

    const { data: nextJobData, error: fetchErr } = await svc
      .rpc("get_next_mcp_job")
      .maybeSingle();

    if (fetchErr) {
      console.error("Failed to get next job:", fetchErr);
      return new Response(
        JSON.stringify({ error: "Failed to fetch next job", details: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    if (!nextJobData?.job_id) {
      return new Response(
        JSON.stringify({
          message: "No jobs to process",
          healed: healedCount || 0,
        }),
        { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const { data: job, error: jobErr } = await svc
      .from("mcp_jobs")
      .select("*")
      .eq("id", nextJobData.job_id)
      .single();

    if (jobErr || !job) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch job details" }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const executeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/execute-run`;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const executeRes = await fetch(executeUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ job_id: job.id }),
    });

    const result = await executeRes.json();

    return new Response(
      JSON.stringify({
        message: "Job processed",
        job_id: job.id,
        status: result.status,
        healed: healedCount || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e: any) {
    console.error("Process next error:", e);
    return new Response(
      JSON.stringify({ error: e.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
