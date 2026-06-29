import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import {
  getGlucoseReadings,
  getAuthPrompted,
  setAuthPrompted,
  getChild,
  getInsulinLogs,
  getMeals,
  getCaregivers,
  getEmergencyContacts,
  getLessonProgress,
} from './store';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Maps Supabase/GoTrue English auth errors to friendly Portuguese messages. */
export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  if (m.includes('user already registered') || m.includes('already been registered')) return 'Este e-mail já está cadastrado. Tente entrar.';
  if (m.includes('password should be at least')) return 'A senha deve ter no mínimo 6 caracteres.';
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
  if (error) return { error: new Error(translateAuthError(error.message)), needsConfirmation: false };
  // When e-mail confirmation is enabled, signUp succeeds but returns no session.
  return { error: null, needsConfirmation: !data.session };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
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

  // Migrate glucose readings
  const readings = await getGlucoseReadings();
  if (readings.length > 0) {
    const withUser = readings.map((r) => ({ ...r, user_id: userId }));
    try { await supabase.from('glucose_readings').upsert(withUser); } catch {}
  }

  // Migrate insulin logs
  const insulinLogs = await getInsulinLogs();
  if (insulinLogs.length > 0) {
    const withUser = insulinLogs.map((l) => ({ ...l, user_id: userId }));
    try { await supabase.from('insulin_logs').upsert(withUser); } catch {}
  }

  // Migrate meals
  const meals = await getMeals();
  if (meals.length > 0) {
    const withUser = meals.map((m) => ({ ...m, user_id: userId }));
    try { await supabase.from('meals').upsert(withUser); } catch {}
  }

  // Migrate child profile
  try {
    await supabase.from('children').upsert({ ...child, user_id: userId });
  } catch {}

  // Migrate caregivers
  const caregivers = await getCaregivers();
  if (caregivers.length > 0) {
    const withUser = caregivers.map((c) => ({ ...c, user_id: userId }));
    try { await supabase.from('caregivers').upsert(withUser); } catch {}
  }

  // Migrate emergency contacts
  const contacts = await getEmergencyContacts();
  if (contacts.length > 0) {
    const withUser = contacts.map((c) => ({ ...c, user_id: userId }));
    try { await supabase.from('emergency_contacts').upsert(withUser); } catch {}
  }

  // Migrate lesson progress
  const progress = await getLessonProgress();
  if (progress.length > 0) {
    const rows = progress.map((lessonId) => ({
      child_id: childId,
      lesson_id: lessonId,
      user_id: userId,
    }));
    try { await supabase.from('lesson_progress').upsert(rows); } catch {}
  }
}
