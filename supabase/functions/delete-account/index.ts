import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ── Doce Cuidado — full account erasure (LGPD Art. 18) ──────────────────────
// Deletes the caller's auth user AND all data they own, server-side, using the
// service role. verify_jwt = true + getUser() ensures only the authenticated
// account itself can trigger its own deletion (never another user's).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CHILD_TABLES = [
  "glucose_readings",
  "insulin_logs",
  "meals",
  "emergency_contacts",
  "lesson_progress",
  "caregivers",
  "invite_codes",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  // Identify the caller from their JWT (rejects the bare publishable/anon key).
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return json({ ok: false, error: "unauthorized" }, 401);

  if (!SERVICE_ROLE_KEY) return json({ ok: false, error: "not_configured" }, 500);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // Delete every child this user owns, with all related rows.
    const { data: owned } = await admin.from("children").select("id").eq("user_id", user.id);
    for (const child of owned ?? []) {
      for (const t of CHILD_TABLES) {
        await admin.from(t).delete().eq("child_id", (child as { id: string }).id);
      }
      await admin.from("children").delete().eq("id", (child as { id: string }).id);
    }

    // Remove this user's caregiver links to children owned by others.
    await admin.from("caregivers").delete().eq("user_id", user.id);

    // Finally, delete the auth user itself.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return json({ ok: false, error: delErr.message }, 500);

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
