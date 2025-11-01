import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getSupabaseClient(useServiceRole = false) {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("Missing SUPABASE_URL");

  if (useServiceRole) {
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  } else {
    const key = Deno.env.get("SUPABASE_ANON_KEY");
    if (!key) throw new Error("Missing SUPABASE_ANON_KEY");
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
}

export function serviceClient() {
  return getSupabaseClient(true);
}

export function userClient(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";

  if (!token) {
    throw new Error("Missing authorization token");
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");

  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function getUserSupabaseClient(req: Request) {
  const supabase = userClient(req);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized: Invalid or missing token");
  }

  return { supabase, user };
}
