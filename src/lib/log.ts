import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

/**
 * Lightweight, privacy-safe telemetry.
 *
 * Every event is buffered locally (cap MAX_QUEUE, oldest dropped) and flushed to
 * the `app_logs` table whenever a session exists and the network is up — so the
 * owner can monitor actions and errors in real time, and nothing is lost while
 * the device is offline.
 *
 * PRIVACY: only the minimum is recorded — a short event code, area (screen),
 * level, an optional NON-sensitive detail (error class / status), the AI
 * provider and ok flag, platform, app version and timestamps. NEVER log child
 * names, glucose values, doses, photos or any health content.
 */
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
const QUEUE_KEY = 'dc:log_queue';
const MAX_QUEUE = 100;

export type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  event: string;
  area?: string;
  detail?: string;
  provider?: string | null;
  ok?: boolean | null;
  client_ts: string;
}

const APP_VERSION = (Constants.expoConfig?.version as string) || '';
const PLATFORM = Platform.OS;

let flushing = false;

function truncate(s: string | undefined, n: number): string | undefined {
  if (s == null) return undefined;
  const t = String(s);
  return t.length > n ? t.slice(0, n) : t;
}

/**
 * Turn any thrown value into a verbose, human-readable string. Supabase /
 * Postgrest / Functions errors are plain objects (not Error instances), so the
 * old `String(error)` produced "[object Object]". This pulls out the useful
 * fields (message, code, details, hint, status) and falls back to JSON.
 */
export function serializeError(error: unknown): string {
  if (error == null) return 'unknown';
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const e = error as Record<string, unknown>;
    const parts: string[] = [];
    const push = (k: string, v: unknown) => { if (v != null && v !== '') parts.push(`${k}=${String(v)}`); };
    push('msg', e.message);
    push('code', e.code);
    push('status', (e as { status?: unknown }).status ?? (e as { statusCode?: unknown }).statusCode);
    push('details', e.details);
    push('hint', e.hint);
    if (!parts.length && e.name) push('name', e.name);
    if (parts.length) return parts.join(' | ');
    try {
      const json = JSON.stringify(e, Object.getOwnPropertyNames(e));
      if (json && json !== '{}') return json;
    } catch { /* fall through */ }
  }
  return String(error);
}

async function enqueue(entry: LogEntry): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const q: LogEntry[] = raw ? JSON.parse(raw) : [];
    q.push(entry);
    while (q.length > MAX_QUEUE) q.shift(); // keep the newest MAX_QUEUE
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {}
}

/**
 * Push everything buffered to Supabase. Requires an auth session (RLS keys each
 * row to auth.uid()). On any failure (offline / no session) the buffer is kept
 * intact and retried on the next event or app foreground.
 */
export async function flushLogs(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const q: LogEntry[] = raw ? JSON.parse(raw) : [];
    if (q.length === 0) return;

    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return; // no identity yet → stay buffered

    const rows = q.map((e) => ({
      user_id: uid,
      level: e.level,
      event: e.event,
      area: e.area ?? null,
      detail: e.detail ?? null,
      provider: e.provider ?? null,
      ok: e.ok ?? null,
      source: 'client',
      platform: PLATFORM,
      app_version: APP_VERSION,
      client_ts: e.client_ts,
    }));

    const { error } = await supabase.from('app_logs').insert(rows);
    if (error) return; // offline / rejected → keep buffered

    // Success: drop exactly what we flushed; preserve entries added meanwhile.
    const after = await AsyncStorage.getItem(QUEUE_KEY);
    const current: LogEntry[] = after ? JSON.parse(after) : [];
    const remaining = current.length > q.length ? current.slice(q.length) : [];
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } catch {
    // never throw from logging
  } finally {
    flushing = false;
  }
}

/** Record a structured event (buffered + best-effort flushed). */
export async function logEvent(
  event: string,
  opts: { level?: LogLevel; area?: string; detail?: string; provider?: string | null; ok?: boolean | null } = {},
): Promise<void> {
  const entry: LogEntry = {
    level: opts.level ?? 'info',
    event: truncate(event, 80) || 'event',
    area: truncate(opts.area, 60),
    detail: truncate(opts.detail, 1000),
    provider: opts.provider ?? null,
    ok: opts.ok ?? null,
    client_ts: new Date().toISOString(),
  };
  if (isDev) {
    const fn = entry.level === 'error' || entry.level === 'warn' ? console.warn : console.log;
    fn(`[${entry.event}]${entry.area ? ' ' + entry.area : ''} ${entry.detail ?? ''}`);
  }
  await enqueue(entry);
  void flushLogs();
}

export function logError(scope: string, error: unknown): void {
  void logEvent(scope, { level: 'error', detail: serializeError(error) });
}

export function logInfo(scope: string, message: string): void {
  void logEvent(scope, { level: 'info', detail: message });
}
