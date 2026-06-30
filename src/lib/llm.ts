import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { logError, logEvent } from './log';
import { MealSlot, RecipeCategory } from '../types';

// All LLM traffic goes through the `llm` Supabase Edge Function (verify_jwt),
// which holds the OpenRouter key server-side. The key is NEVER in the client
// bundle. Model selection / fallback also live in the function.

// ─── Privacy ─────────────────────────────────────────────────────────────────
// LGPD: the child's data is only sent to the third-party AI provider after the
// responsible explicitly consents (opt-in checkbox at onboarding). When consent
// is absent, every LLM path is short-circuited and callers fall back to the
// deterministic local messages.
const AI_CONSENT_KEY = 'dc:ai_consent';

async function hasAIConsent(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(AI_CONSENT_KEY)) === 'true';
  } catch {
    return false;
  }
}

/**
 * Reduce a full name to its first name only before it ever leaves the device.
 * A bare first name is not, on its own, personally identifying, which keeps the
 * outbound payload non-sensitive even though the provider is third-party.
 */
function firstNameOnly(name: string): string {
  return (name || '').trim().split(/\s+/)[0] || 'a criança';
}

// ─── Throttle / Cache ────────────────────────────────────────────────────────

const LLM_CACHE_KEY = 'dc:llm_cache';
const LLM_GLOBAL_THROTTLE_KEY = 'dc:llm_last_auto';
const THROTTLE_MS = 15 * 60 * 1000;

type LLMCache = Record<string, { response: string; timestamp: number }>;

async function getCachedResponse(promptType: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(LLM_CACHE_KEY);
    if (!raw) return null;
    const cache: LLMCache = JSON.parse(raw);
    const entry = cache[promptType];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > THROTTLE_MS) return null;
    return entry.response;
  } catch {
    return null;
  }
}

async function setCachedResponse(promptType: string, response: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LLM_CACHE_KEY);
    const cache: LLMCache = raw ? JSON.parse(raw) : {};
    cache[promptType] = { response, timestamp: Date.now() };
    await AsyncStorage.setItem(LLM_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// Global throttle for auto-triggered insights (not user-triggered OCR/report)
async function isAutoThrottled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(LLM_GLOBAL_THROTTLE_KEY);
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < THROTTLE_MS;
  } catch {
    return false;
  }
}

async function markAutoThrottle(): Promise<void> {
  try {
    await AsyncStorage.setItem(LLM_GLOBAL_THROTTLE_KEY, String(Date.now()));
  } catch {}
}

export async function resetLLMThrottle(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LLM_GLOBAL_THROTTLE_KEY);
    await AsyncStorage.removeItem(LLM_CACHE_KEY);
  } catch {}
}

// ─── Fallbacks ───────────────────────────────────────────────────────────────

const FALLBACK_MESSAGES = [
  'Tudo bem por aqui. Continue acompanhando!',
  'A Gotinha está com você. Continue registrando!',
  'Cada anotação conta. Você está cuidando muito bem.',
  'Continue assim! O cuidado de cada dia faz diferença.',
  'Dados salvos. Mostre ao médico na próxima consulta.',
  'Registrado! A Gotinha está orgulhosa do seu cuidado.',
];

export function getFallbackMessage(): string {
  return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
}

// ─── Core LLM call (text) ────────────────────────────────────────────────────

async function callTextLLM(systemPrompt: string, userPrompt: string, maxTokens = 180): Promise<string | null> {
  if (!(await hasAIConsent())) return null;
  try {
    const { data, error } = await supabase.functions.invoke('llm', {
      body: { mode: 'text', system: systemPrompt, user: userPrompt, maxTokens },
    });
    if (error) { logError('callTextLLM', error); return null; }
    const text = (data as { content?: string } | null)?.content;
    return text && text.length > 0 ? text : null;
  } catch (e) {
    logError('callTextLLM', e);
    return null;
  }
}

// ─── Core LLM call (vision + JSON) ──────────────────────────────────────────

/**
 * Why a vision call did or didn't produce a result. Callers map this to UX:
 *  - 'offline'    → no connection; ask the user to connect to use AI.
 *  - 'no_consent' → AI is opt-out for this family; fall back silently.
 *  - 'failed'     → every provider failed server-side; show "couldn't analyze".
 *  - 'ok'         → content present (may still be unreadable when parsed).
 */
export type AIReason = 'ok' | 'offline' | 'no_consent' | 'failed';

interface VisionCall {
  content: string | null;
  reason: AIReason;
}

/** True when an error from functions.invoke is a connectivity failure, not a server error. */
function isNetworkError(error: unknown): boolean {
  const name = (error as { name?: string })?.name ?? '';
  const msg = String((error as { message?: string })?.message ?? '').toLowerCase();
  return (
    name === 'FunctionsFetchError' ||
    msg.includes('failed to send a request') ||
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error')
  );
}

async function callVisionLLM(
  prompt: string,
  imageBase64: string,
  maxTokens = 60,
): Promise<VisionCall> {
  if (!(await hasAIConsent())) return { content: null, reason: 'no_consent' };
  try {
    const { data, error } = await supabase.functions.invoke('llm', {
      body: { mode: 'vision', prompt, imageBase64, maxTokens, mimeType: 'image/jpeg' },
    });
    if (error) {
      if (isNetworkError(error)) {
        void logEvent('ai.vision', { level: 'warn', area: 'llm', detail: 'offline', ok: false });
        return { content: null, reason: 'offline' };
      }
      logError('callVisionLLM', error);
      return { content: null, reason: 'failed' };
    }
    const text = (data as { content?: string } | null)?.content;
    if (text && text.length > 0) return { content: text, reason: 'ok' };
    // Server reached but every provider failed / returned empty.
    void logEvent('ai.vision', { level: 'warn', area: 'llm', detail: 'all_failed', ok: false });
    return { content: null, reason: 'failed' };
  } catch (e) {
    if (isNetworkError(e)) {
      void logEvent('ai.vision', { level: 'warn', area: 'llm', detail: 'offline', ok: false });
      return { content: null, reason: 'offline' };
    }
    logError('callVisionLLM', e);
    return { content: null, reason: 'failed' };
  }
}

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_BASE = `Você é a Gotinha do Cuidado, assistente virtual do app Doce Cuidado.
Você ajuda famílias que cuidam de crianças com Diabetes Tipo 1.

REGRAS ABSOLUTAS:
- Responda SEMPRE em português brasileiro
- Seja calorosa e acolhedora, nunca clínica ou fria
- NUNCA sugira doses de insulina ou mudanças de médicação
- NUNCA diagnostique ou interprete resultados clínicamente
- Redirecione sempre: "converse com o médico" quando houver dúvida
- Não use emojis
- Seja OBJETIVA e COMPLETA: termine a ideia dentro dos tokens disponíveis
- Máximo 2 frases curtas e diretas
- Você é ferramenta de APOIO, não substitui médico`;

// ─── Public functions ────────────────────────────────────────────────────────

export async function getGlucoseInsight(
  value: number,
  childName: string,
  targetMin: number,
  targetMax: number,
  moment: string,
): Promise<string> {
  const cacheKey = `glucose_${value}_${moment}`;
  const cached = await getCachedResponse(cacheKey);
  if (cached) return cached;
  if (await isAutoThrottled()) return getFallbackMessage();

  const text = await callTextLLM(
    SYSTEM_BASE,
    `Glicemia de ${value} mg/dL para ${firstNameOnly(childName)}. Meta: ${targetMin}-${targetMax} mg/dL. Momento: ${moment}. Feedback caloroso em 1-2 frases completas. Se fora da meta, oriente sem alarmar.`,
    120,
  );

  const result = text ?? getFallbackMessage();
  if (text) { await setCachedResponse(cacheKey, result); await markAutoThrottle(); }
  return result;
}

export async function getPatternInsight(
  readings: { value: number; moment: string; time: string }[],
  childName: string,
  targetMin: number,
  targetMax: number,
): Promise<string> {
  if (readings.length < 3) {
    return 'Ainda poucos registros para identificar padrões. Continue anotando!';
  }

  const cacheKey = `pattern_${readings.length}_${readings[0]?.value}`;
  const cached = await getCachedResponse(cacheKey);
  if (cached) return cached;
  if (await isAutoThrottled()) return 'Continue registrando para identificar padrões ao longo do tempo.';

  const summary = readings.slice(0, 10).map(r => `${r.value}mg/dL (${r.moment})`).join(', ');

  const text = await callTextLLM(
    SYSTEM_BASE,
    `Padrões de ${firstNameOnly(childName)}. Meta: ${targetMin}-${targetMax}. Leituras: ${summary}. Identifique 1 padrão descritivo em 2 frases completas. Nunca prescreva.`,
    160,
  );

  const result = text ?? 'Continue registrando para identificar padrões ao longo do tempo.';
  if (text) { await setCachedResponse(cacheKey, result); await markAutoThrottle(); }
  return result;
}

export async function getMealInsight(
  description: string,
  _calories: number,
  carbs: number,
  _protein: number,
  _fat: number,
): Promise<string> {
  const cacheKey = `meal_${description.slice(0, 20)}_${carbs}`;
  const cached = await getCachedResponse(cacheKey);
  if (cached) return cached;
  if (await isAutoThrottled()) return getFallbackMessage();

  const text = await callTextLLM(
    SYSTEM_BASE,
    `Refeição registrada: ${description}${carbs ? `, ~${carbs}g carboidratos` : ''}. Comente em 1-2 frases completas como pode afetar a glicemia. Nunca prescreva.`,
    120,
  );

  const result = text ?? getFallbackMessage();
  if (text) { await setCachedResponse(cacheKey, result); await markAutoThrottle(); }
  return result;
}

export async function getCrisisGuidance(
  symptoms: { color: string; sweating: string; breathing: string },
  childName: string,
): Promise<string> {
  const cacheKey = `crisis_${symptoms.color}_${symptoms.sweating}_${symptoms.breathing}`;
  const cached = await getCachedResponse(cacheKey);
  if (cached) return cached;

  const text = await callTextLLM(
    `${SYSTEM_BASE}\nCONTEXTO DE EMERGÊNCIA: Seja DIRETA e CLARA. Use linguagem simples. Diga o que fazer AGORA. Se grave, diga para ligar 192.`,
    `Família em crise com ${firstNameOnly(childName)}. Cor: ${symptoms.color}. Sudorese: ${symptoms.sweating}. Respiração: ${symptoms.breathing}. Oriente em 2-3 frases completas sobre hipo/hiper/cetoacidose.`,
    200,
  );

  const result = text ?? 'Monitore os sinais vitais. Se houver piora, ligue 192 imediatamente.';
  if (text) await setCachedResponse(cacheKey, result);
  return result;
}

export async function generateDoctorReport(
  childName: string,
  period: 'week' | 'month' | 'all',
  glucoseData: { value: number; moment: string; time: string }[],
  insulinData: { type: string; dose: number; time: string }[],
  mealData: { description: string; carbs: number; time: string }[],
  stats: { avg: number; peak: number; low: number; inTargetPct: number; targetMin: number; targetMax: number },
): Promise<string> {
  const periodLabel = period === 'week' ? 'última semana' : period === 'month' ? 'último mês' : 'todo o período';

  const text = await callTextLLM(
    `${SYSTEM_BASE}\nGere um RELATÓRIO organizado para o médico. Sem emojis. Formato limpo. Nunca interprete clínicamente. Apenas descreva os dados.`,
    `Relatório de ${firstNameOnly(childName)} — ${periodLabel}.
Estatísticas: Média ${stats.avg} mg/dL, Pico ${stats.peak}, Mínima ${stats.low}, Na meta ${stats.inTargetPct}% (${stats.targetMin}-${stats.targetMax} mg/dL).
Glicemias (${glucoseData.length}): ${glucoseData.slice(0, 10).map(r => `${r.value}mg/dL ${r.moment}`).join('; ')}.
Insulinas (${insulinData.length}): ${insulinData.slice(0, 5).map(l => `${l.dose}u ${l.type}`).join('; ')}.
Refeições (${mealData.length}): ${mealData.slice(0, 3).map(m => m.description).join('; ')}.
Escreva um parágrafo descritivo completo e objetivo.`,
    400,
  );

  return text ?? `Relatório de ${firstNameOnly(childName)} — ${periodLabel}.\nMédia: ${stats.avg} mg/dL | Pico: ${stats.peak} | Mínima: ${stats.low} | Na meta: ${stats.inTargetPct}%.\n${glucoseData.length} medições registradas.`;
}

// ─── Vision: Read Glucometer (JSON) ─────────────────────────────────────────

/** 'ok' carries a value; 'unreadable' means AI replied but no number could be read. */
export type GlucometerStatus = 'ok' | 'unreadable' | 'offline' | 'no_consent' | 'failed';
export interface GlucometerResult {
  status: GlucometerStatus;
  value?: number;
}

export async function readGlucometer(imageBase64: string): Promise<GlucometerResult> {
  const prompt = `Look at this glucometer display photo. Read the glucose number shown on the screen.
Return ONLY valid JSON in this exact format: {"value": 106} where 106 is replaced by the actual number.
If you cannot read the display clearly, return: {"value": null}
Do not include any other text, only the JSON object.`;

  const { content: raw, reason } = await callVisionLLM(prompt, imageBase64, 30);
  if (reason !== 'ok' || !raw) return { status: reason === 'ok' ? 'unreadable' : reason };

  const toValue = (n: number): GlucometerResult =>
    (!isNaN(n) && n >= 20 && n <= 700) ? { status: 'ok', value: n } : { status: 'unreadable' };

  try {
    const match = raw.match(/\{[^}]*"value"\s*:\s*(\d+|null)[^}]*\}/);
    if (!match) return { status: 'unreadable' };
    const parsed = JSON.parse(match[0]);
    if (parsed.value === null || parsed.value === undefined) return { status: 'unreadable' };
    return toValue(Number(parsed.value));
  } catch {
    // Fallback: extract any reasonable number from the response
    const numMatch = raw.match(/\b(\d{2,3})\b/);
    if (numMatch) return toValue(parseInt(numMatch[1], 10));
    return { status: 'unreadable' };
  }
}

// ─── Vision: Analyze Meal Photo (JSON) ──────────────────────────────────────

export interface MealAnalysis {
  description: string;
  estimated_carbs_g: number | null;
  foods_identified: string[];
}

export type MealPhotoStatus = 'ok' | 'unreadable' | 'offline' | 'no_consent' | 'failed';
export interface MealPhotoResult {
  status: MealPhotoStatus;
  analysis?: MealAnalysis;
}

export async function analyzeMealPhoto(imageBase64: string): Promise<MealPhotoResult> {
  const prompt = `Look at this photo of a meal or food.
Return ONLY valid JSON in this exact format:
{"description": "arroz, feijão e frango grelhádo", "estimated_carbs_g": 45, "foods_identified": ["arroz", "feijão", "frango"]}
- description: brief description in Portuguese
- estimated_carbs_g: estimated total carbohydrates in grams (integer), or null if impossible to estimate
- foods_identified: array of food items identified
Return ONLY the JSON object, no other text.`;

  const { content: raw, reason } = await callVisionLLM(prompt, imageBase64, 120);
  if (reason !== 'ok' || !raw) return { status: reason === 'ok' ? 'unreadable' : reason };

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { status: 'unreadable' };
    const parsed = JSON.parse(match[0]);
    return {
      status: 'ok',
      analysis: {
        description: String(parsed.description ?? ''),
        estimated_carbs_g: parsed.estimated_carbs_g != null ? Number(parsed.estimated_carbs_g) : null,
        foods_identified: Array.isArray(parsed.foods_identified) ? parsed.foods_identified : [],
      },
    };
  } catch {
    return { status: 'unreadable' };
  }
}

// ─── Recipe recommendation: AI only picks a category per meal ───────────────

/**
 * The AI's ONLY job for recipes: given the child's recent glucose situation,
 * choose ONE allowed RecipeCategory per daily meal. The system then pulls and
 * ranks recipes for those categories deterministically (no further AI).
 * Falls back to the deterministic `fallback` when the AI is throttled/unavailable.
 * Pass `force = true` (e.g. a manual "atualizar" tap) to bypass the auto-throttle —
 * useful when the situation changed during the day (e.g. an afternoon crisis).
 */
export async function recommendRecipeCategories(
  childName: string,
  context: { lastValue: number | null; recent: number[]; targetMin: number; targetMax: number },
  allowed: RecipeCategory[],
  fallback: Record<MealSlot, RecipeCategory>,
  force = false,
): Promise<Record<MealSlot, RecipeCategory>> {
  const sig = `recipecat_${context.lastValue ?? 'na'}_${context.recent.slice(0, 4).join('-')}`;
  if (!force) {
    const cached = await getCachedResponse(sig);
    if (cached) { try { return JSON.parse(cached) as Record<MealSlot, RecipeCategory>; } catch {} }
    if (await isAutoThrottled()) return fallback;
  }

  const text = await callTextLLM(
    `${SYSTEM_BASE}\nVocê classifica qual CATEGORIA de receita é mais indicada para cada refeição, com base na situação glicêmica recente. Responda APENAS em JSON, sem markdown.`,
    `Criança: ${firstNameOnly(childName)}. Última glicemia: ${context.lastValue ?? 'sem dados'} mg/dL (meta ${context.targetMin}-${context.targetMax}). Recentes: ${context.recent.slice(0, 6).join(', ') || 'sem dados'}.
Categorias permitidas: ${allowed.join(', ')}.
Escolha UMA categoria por refeição. Responda só: {"cafe_da_manha":"...","almoco":"...","jantar":"..."}`,
    120,
  );
  if (!text) return fallback;

  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return fallback;
    const parsed = JSON.parse(m[0]);
    const pick = (v: unknown, fb: RecipeCategory): RecipeCategory =>
      (typeof v === 'string' && (allowed as string[]).includes(v)) ? (v as RecipeCategory) : fb;
    const result: Record<MealSlot, RecipeCategory> = {
      cafe_da_manha: pick(parsed.cafe_da_manha, fallback.cafe_da_manha),
      almoco: pick(parsed.almoco, fallback.almoco),
      jantar: pick(parsed.jantar, fallback.jantar),
      lanche: fallback.lanche,
    };
    await setCachedResponse(sig, JSON.stringify(result));
    if (!force) await markAutoThrottle();
    return result;
  } catch {
    return fallback;
  }
}
