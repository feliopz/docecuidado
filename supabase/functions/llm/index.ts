import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ── Doce Cuidado — server-side LLM proxy ────────────────────────────────────
// All AI keys stay OUT of the mobile bundle. Two auth layers:
//   1) verify_jwt = true rejects requests with no/invalid token at the gateway.
//   2) getUser() below rejects the bare publishable/anon key (which ships in the
//      app and would pass verify_jwt as `anon`) — only a real authenticated USER
//      session (incl. anonymous-auth caregivers) passes.
//
// Provider fallback order (per the product owner):
//   TEXT  : Groq (direct)  →  OpenRouter (routing)
//   VISION: Cohere (direct)  →  Gemini/Gemma (direct)  →  OpenRouter (Gemma)
//
// Each provider attempt is recorded in public.app_logs (source='server') so the
// owner can monitor AI health in real time. No prompt/image content is logged —
// only the provider, mode, ok flag and a short error class/status.

// ── Secrets (set in Supabase → Edge Functions → Secrets) ────────────────────
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const COHERE_API_KEY = Deno.env.get("COHERE_API_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

// ── Model ids (overridable via secrets; sensible defaults) ──────────────────
const GROQ_TEXT_MODEL = Deno.env.get("GROQ_TEXT_MODEL") ?? "llama-3.3-70b-versatile";
const COHERE_VISION_MODEL = Deno.env.get("COHERE_VISION_MODEL") ?? "command-a-vision-07-2025";
const GEMINI_VISION_MODEL = Deno.env.get("GEMINI_VISION_MODEL") ?? "gemma-3-27b-it";
const OPENROUTER_TEXT_MODELS = (Deno.env.get("OPENROUTER_TEXT_MODELS") ??
  "google/gemma-3-27b-it:free,meta-llama/llama-3.3-70b-instruct:free,nvidia/nemotron-nano-9b-v2:free")
  .split(",").map((s) => s.trim()).filter(Boolean);
const OPENROUTER_VISION_MODELS = (Deno.env.get("OPENROUTER_VISION_MODELS") ??
  "google/gemma-3-27b-it:free,google/gemini-2.0-flash-exp:free")
  .split(",").map((s) => s.trim()).filter(Boolean);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

// Per-provider cap. Kept tight so the full fallback chain (vision: 3 providers)
// stays well under the client-side ceiling and never appears to "hang".
const TIMEOUT_MS = 14_000;

async function fetchJson(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    let data: any = null;
    try { data = await r.json(); } catch { /* non-json body */ }
    return { ok: r.ok, status: r.status, data };
  } finally {
    clearTimeout(t);
  }
}

// ── Provider attempts (each returns trimmed text or throws) ─────────────────

async function tryGroqText(messages: unknown, maxTokens: number, temperature: number): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("no_key");
  const { ok, status, data } = await fetchJson("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: GROQ_TEXT_MODEL, messages, max_completion_tokens: maxTokens, temperature, stream: false }),
  });
  if (!ok) throw new Error(`http_${status}`);
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty");
  return text;
}

async function tryOpenRouterText(messages: unknown, maxTokens: number, temperature: number): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error("no_key");
  let lastErr = "empty";
  for (const model of OPENROUTER_TEXT_MODELS) {
    const { ok, status, data } = await fetchJson("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://docecuidado.com",
        "X-Title": "Doce Cuidado",
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
    });
    if (!ok) { lastErr = `http_${status}`; continue; }
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (text) return text;
    lastErr = "empty";
  }
  throw new Error(lastErr);
}

async function tryCohereVision(prompt: string, imageBase64: string, mime: string, temperature: number): Promise<string> {
  if (!COHERE_API_KEY) throw new Error("no_key");
  const { ok, status, data } = await fetchJson("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `bearer ${COHERE_API_KEY}` },
    body: JSON.stringify({
      model: COHERE_VISION_MODEL,
      temperature,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mime};base64,${imageBase64}` } },
        ],
      }],
    }),
  });
  if (!ok) throw new Error(`http_${status}`);
  // Cohere v2: { message: { content: [{ type:"text", text:"..." }] } }
  const parts = data?.message?.content;
  const text = Array.isArray(parts)
    ? parts.map((p: any) => p?.text ?? "").join("").trim()
    : (typeof parts === "string" ? parts.trim() : "");
  if (!text) throw new Error("empty");
  return text;
}

async function tryGeminiVision(prompt: string, imageBase64: string, mime: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("no_key");
  // Gemma on the Gemini API does not support systemInstruction or tools — keep it minimal.
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const { ok, status, data } = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: mime, data: imageBase64 } },
          { text: prompt },
        ],
      }],
    }),
  });
  if (!ok) throw new Error(`http_${status}`);
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p: any) => p?.text ?? "").join("").trim() : "";
  if (!text) throw new Error("empty");
  return text;
}

async function tryOpenRouterVision(prompt: string, imageBase64: string, mime: string, maxTokens: number): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error("no_key");
  const messages = [{
    role: "user",
    content: [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: `data:${mime};base64,${imageBase64}` } },
    ],
  }];
  let lastErr = "empty";
  for (const model of OPENROUTER_VISION_MODELS) {
    const { ok, status, data } = await fetchJson("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://docecuidado.com",
        "X-Title": "Doce Cuidado",
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.1 }),
    });
    if (!ok) { lastErr = `http_${status}`; continue; }
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (text) return text;
    lastErr = "empty";
  }
  throw new Error(lastErr);
}

// ── Server-side log buffer (flushed to app_logs in one batch) ───────────────
type LogRow = {
  user_id: string | null; level: string; event: string; area: string;
  detail: string; provider: string | null; ok: boolean; source: "server";
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ content: null, error: "method_not_allowed" }, 405);

  // Require a real authenticated user (rejects the bare publishable/anon key).
  const authHeader = req.headers.get("Authorization") ?? "";
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authErr } = await authClient.auth.getUser();
  if (authErr || !user) return json({ content: null, error: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ content: null, error: "bad_request" }, 400);
  }

  const mode = body.mode === "vision" ? "vision" : "text";
  const maxTokens = Math.min(Math.max(Number(body.maxTokens) || 180, 16), 500);
  const logs: LogRow[] = [];
  const pushLog = (provider: string, ok: boolean, detail: string, level = ok ? "info" : "warn") =>
    logs.push({ user_id: user.id, level, event: `ai.${mode}`, area: "edge.llm", detail, provider, ok, source: "server" });

  async function flushLogs(finalLevel?: string, finalDetail?: string) {
    if (finalLevel) {
      logs.push({ user_id: user.id, level: finalLevel, event: `ai.${mode}.result`, area: "edge.llm", detail: finalDetail ?? "", provider: null, ok: finalLevel !== "error", source: "server" });
    }
    if (!SUPABASE_SERVICE_ROLE_KEY || logs.length === 0) return;
    try {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      await admin.from("app_logs").insert(logs);
    } catch (_) { /* logging must never break the request */ }
  }

  // ── TEXT: Groq → OpenRouter ───────────────────────────────────────────────
  if (mode === "text") {
    const temperature = typeof body.temperature === "number" ? body.temperature : 0.7;
    const messages = [
      { role: "system", content: String(body.system ?? "") },
      { role: "user", content: String(body.user ?? "") },
    ];

    try {
      const text = await tryGroqText(messages, maxTokens, temperature);
      pushLog("groq", true, "ok");
      await flushLogs();
      return json({ content: text, provider: "groq" }, 200);
    } catch (e) { pushLog("groq", false, String((e as Error).message)); }

    try {
      const text = await tryOpenRouterText(messages, maxTokens, temperature);
      pushLog("openrouter", true, "ok");
      await flushLogs();
      return json({ content: text, provider: "openrouter" }, 200);
    } catch (e) { pushLog("openrouter", false, String((e as Error).message)); }

    await flushLogs("error", "all_text_providers_failed");
    return json({ content: null, error: "all_failed" }, 200);
  }

  // ── VISION: Cohere → Gemini/Gemma → OpenRouter ────────────────────────────
  const prompt = String(body.prompt ?? "");
  const imageBase64 = String(body.imageBase64 ?? "");
  const mime = typeof body.mimeType === "string" && body.mimeType ? String(body.mimeType) : "image/jpeg";
  if (!imageBase64) return json({ content: null, error: "bad_request" }, 400);

  try {
    const text = await tryCohereVision(prompt, imageBase64, mime, 0.3);
    pushLog("cohere", true, "ok");
    await flushLogs();
    return json({ content: text, provider: "cohere" }, 200);
  } catch (e) { pushLog("cohere", false, String((e as Error).message)); }

  try {
    const text = await tryGeminiVision(prompt, imageBase64, mime);
    pushLog("gemini", true, "ok");
    await flushLogs();
    return json({ content: text, provider: "gemini" }, 200);
  } catch (e) { pushLog("gemini", false, String((e as Error).message)); }

  try {
    const text = await tryOpenRouterVision(prompt, imageBase64, mime, maxTokens);
    pushLog("openrouter", true, "ok");
    await flushLogs();
    return json({ content: text, provider: "openrouter" }, 200);
  } catch (e) { pushLog("openrouter", false, String((e as Error).message)); }

  await flushLogs("error", "all_vision_providers_failed");
  return json({ content: null, error: "all_failed" }, 200);
});
