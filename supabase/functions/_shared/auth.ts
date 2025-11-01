import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGINS = (Deno.env.get("CORS_ORIGINS") ?? "http://localhost:5173")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

export function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ORIGINS.includes(origin) ? origin : ORIGINS[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Vary": "Origin",
  };
}

export function successResponse(req: Request, data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeadersFor(req),
      "Content-Type": "application/json",
    },
  });
}

export function errorResponse(req: Request, message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...corsHeadersFor(req),
      "Content-Type": "application/json",
    },
  });
}
