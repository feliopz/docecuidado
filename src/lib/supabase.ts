import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from './log';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * The authenticated user's id (auth.uid()), or null when signed out.
 * This is the identity every RLS policy is keyed on — rows synced to Supabase
 * must carry it as `user_id` to be readable/writable later.
 */
export async function getAuthUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Guarantee a Supabase auth session exists, returning the user id.
 * Caregivers/doctors don't create an e-mail account, but RLS still requires a
 * real auth.uid() to link them to a child — so we transparently use an
 * anonymous session for them. Returns null if no session could be established
 * (e.g. anonymous sign-ins disabled in the project), letting callers degrade
 * gracefully instead of crashing.
 *
 * NOTE: requires "Anonymous sign-ins" enabled in Supabase → Auth → Providers.
 */
export async function ensureSession(): Promise<string | null> {
  const existing = await getAuthUserId();
  if (existing) return existing;
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) { logError('ensureSession', error); return null; }
    return data.user?.id ?? null;
  } catch (e) {
    logError('ensureSession', e);
    return null;
  }
}
