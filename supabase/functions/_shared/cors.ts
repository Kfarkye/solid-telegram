export function buildCorsHeaders(origin: string | null, allowed: string[] | null) {
  const defaultOrigins = ["http://localhost:5173"];
  const allowAll = !allowed || allowed.length === 0;
  const allowedOrigins = allowAll ? defaultOrigins : allowed;
  const allowOrigin = allowAll && !origin ? defaultOrigins[0] : (origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? "*");

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}
