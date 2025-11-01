import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { getUserSupabaseClient } from "../_shared/supabase.ts";
import { assertAllowed, type AllowedModel } from "../_shared/providers.ts";

interface QueueRequest {
  tool: string;
  model?: AllowedModel;
  params: Record<string, any>;
  priority?: number;
  metadata?: Record<string, any>;
}

const ALLOWED_TOOLS = new Set(["gemini-query", "gpt-query", "claude-query", "multi-model-query"]);

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
    const { supabase, user } = await getUserSupabaseClient(req);
    const body = (await req.json()) as QueueRequest;

    if (!body?.tool || !ALLOWED_TOOLS.has(body.tool)) {
      return new Response(
        JSON.stringify({ error: `Invalid tool. Allowed: ${Array.from(ALLOWED_TOOLS).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    if (body.model) {
      try {
        assertAllowed(body.model);
      } catch (e: any) {
        return new Response(
          JSON.stringify({ error: e.message }),
          { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
        );
      }
    }

    if (!body.params || typeof body.params !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid params object" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const priority = typeof body.priority === "number" ? Math.max(-100, Math.min(100, body.priority)) : 0;

    const { data: job, error: insertErr } = await supabase
      .from("mcp_jobs")
      .insert({
        tool: body.tool,
        params: body.params,
        priority,
        metadata: body.metadata || {},
        model: body.model || null,
        status: "queued",
      })
      .select("id, tool, status, priority, created_at")
      .single();

    if (insertErr) {
      console.error("Failed to create job:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to create job", details: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        job_id: job.id,
        tool: job.tool,
        status: job.status,
        priority: job.priority,
        created_at: job.created_at,
      }),
      { status: 201, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (e: any) {
    console.error("Queue dispatcher error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
