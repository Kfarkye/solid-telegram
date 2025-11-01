export function buildCorsHeaders(origin: string | null, allowed: string[] | null) {
  const allowAll = !allowed || allowed.length === 0;
  const allowOrigin = allowAll ? "*" : (origin && allowed.includes(origin) ? origin : allowed[0] ?? "*");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
