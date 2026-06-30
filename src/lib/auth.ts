import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { logError, logEvent } from './log';
import { ensureResponsibleCaregiver } from './supabase-db';
import {
  getGlucoseReadings,
  getAuthPrompted,
  setAuthPrompted,
  getChild,
  getInsulinLogs,
  getMeals,
  getEmergencyContacts,
  getLessonProgress,
  getLinkedChildren,
  getAccountType,
  getAccountName,
} from './store';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Maps Supabase/GoTrue English auth errors to friendly Portuguese messages. */
export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  if (m.includes('user already registered') || m.includes('already been registered')) return 'Este e-mail já está cadastrado. Tente entrar.';
  if (m.includes('password should be at least')) return 'A senha deve ter no mínimo 8 caracteres.';
  if (m.includes('unable to validate email') || m.includes('invalid format') || m.includes('invalid email')) return 'E-mail inválido. Verifique e tente novamente.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'Cadastros estão temporariamente desativados.';
  if (m.includes('email rate limit') || m.includes('over_email_send_rate_limit')) return 'Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.';
  if (m.includes('for security purposes') || m.includes('you can only request this after')) return 'Aguarde alguns segundos antes de tentar novamente.';
  if (m.includes('weak password')) return 'Senha muito fraca. Use letras e números.';
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) return 'Erro de conexão. Verifique sua internet e tente novamente.';
  if (m.includes('user not found')) return 'Não encontramos uma conta com esse e-mail.';
  if (m.includes('same as the old') || m.includes('should be different')) return 'A nova senha deve ser diferente da atual.';
  return 'Algo deu errado. Tente novamente em instantes.';
}

/** Resend the signup confirmation e-mail. */
export async function resendConfirmation(email: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  return { error: error ? new Error(translateAuthError(error.message)) : null };
}

export async function shouldPromptAuth(): Promise<boolean> {
  // Check if there are enough readings to justify an auth prompt
  const readings = await getGlucoseReadings();
  if (readings.length < 5) return false;

  // Check if already authenticated
  const { data } = await supabase.auth.getSession();
  if (data.session) return false;

  // Check if we prompted recently
  const lastPrompted = await getAuthPrompted();
  if (lastPrompted) {
    const elapsed = Date.now() - parseInt(lastPrompted, 10);
    if (elapsed < ONE_DAY_MS) return false;
  }

  // Mark as prompted
  await setAuthPrompted(String(Date.now()));
  return true;
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<{ error: Error | null; needsConfirmation: boolean }> {
  // Deep link back into the app after the user confirms via e-mail.
  // In Expo Go this resolves to an exp:// URL; in a standalone build, docecuidado://.
  const emailRedirectTo = Linking.createURL('/auth-callback');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
  if (error) {
    void logEvent('auth.signup', { level: 'warn', area: 'auth', ok: false, detail: 'failed' });
    return { error: new Error(translateAuthError(error.message)), needsConfirmation: false };
  }
  void logEvent('auth.signup', { area: 'auth', ok: true });
  // When e-mail confirmation is enabled, signUp succeeds but returns no session.
  return { error: null, needsConfirmation: !data.session };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  void logEvent('auth.signin', { level: error ? 'warn' : 'info', area: 'auth', ok: !error, detail: error ? 'failed' : undefined });
  return { error: error ? new Error(translateAuthError(error.message)) : null };
}

export async function getSession() {
  return supabase.auth.getSession();
}

export async function isAuthenticated(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function migrateLocalData(userId: string): Promise<void> {
  const child = await getChild();
  if (!child) return;

  const childId = child.id;

  // Only the responsible OWNER syncs local data into cloud ownership.
  // Caregivers/doctors gain access through the invite RPC (which records their
  // membership under their own auth.uid()) — they must never re-own a child's
  // record, so we skip migration for them.
  const linked = await getLinkedChildren();
  const role = linked.find((c) => c.id === childId)?.role;
  if ((await getAccountType()) !== 'responsavel' || (role && role !== 'owner')) return;

  // 1) Child profile FIRST: every child-linked RLS policy authorizes rows via
  //    can_access_child(child_id), which requires the owned child row to exist.
  try {
    await supabase.from('children').upsert({ ...child, user_id: userId });
  } catch (e) {
    logError('migrate.child', e);
    return; // without an owned child row, nothing below would be authorized
  }

  // 2) Establish the owner's caregiver row (role=responsavel) under auth.uid().
  await ensureResponsibleCaregiver(childId, userId, (await getAccountName()) || 'Responsável');

  // 3) Child-linked records (user_id set where the column exists).
  const readings = await getGlucoseReadings();
  if (readings.length > 0) {
    try { await supabase.from('glucose_readings').upsert(readings.map((r) => ({ ...r, user_id: userId }))); }
    catch (e) { logError('migrate.glucose', e); }
  }

  const insulinLogs = await getInsulinLogs();
  if (insulinLogs.length > 0) {
    try { await supabase.from('insulin_logs').upsert(insulinLogs.map((l) => ({ ...l, user_id: userId }))); }
    catch (e) { logError('migrate.insulin', e); }
  }

  const meals = await getMeals();
  if (meals.length > 0) {
    try { await supabase.from('meals').upsert(meals.map((m) => ({ ...m, user_id: userId }))); }
    catch (e) { logError('migrate.meals', e); }
  }

  // emergency_contacts has no user_id column — sync as-is.
  const contacts = await getEmergencyContacts();
  if (contacts.length > 0) {
    try { await supabase.from('emergency_contacts').upsert(contacts); }
    catch (e) { logError('migrate.contacts', e); }
  }

  const progress = await getLessonProgress();
  if (progress.length > 0) {
    const rows = progress.map((lessonId) => ({ child_id: childId, lesson_id: lessonId, user_id: userId }));
    try { await supabase.from('lesson_progress').upsert(rows); }
    catch (e) { logError('migrate.lessons', e); }
  }
}
