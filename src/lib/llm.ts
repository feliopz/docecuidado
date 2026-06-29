import AsyncStorage from '@react-native-async-storage/async-storage';
import { MealSlot, RecipeCategory } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? '';
const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Text-only models (no image support needed)
const TEXT_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-nano-omni:free',
  'poolside/laguna-xs.2:free',
  'cohere/north-mini-code:free',
  'nvidia/nemotron-3-super:free',
  'nvidia/nemotron-3-ultra:free',
  'poolside/laguna-m.1:free',
  'liquidai/lfm2-5-1.2b-thinking:free',
] as const;

// Vision-capable models — must support image_url content type
const VISION_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
] as const;

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
  if (!API_KEY) return null;

  for (const model of TEXT_MODELS) {
    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
          'HTTP-Referer': 'https://doce-cuidado.app',
          'X-Title': 'Doce Cuidado',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      });

      if (!response.ok) continue;
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text && text.length > 5) return text;
    } catch {
      continue;
    }
  }
  return null;
}

// ─── Core LLM call (vision + JSON) ──────────────────────────────────────────

async function callVisionLLM(
  prompt: string,
  imageBase64: string,
  maxTokens = 60,
): Promise<string | null> {
  if (!API_KEY) return null;

  for (const model of VISION_MODELS) {
    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
          'HTTP-Referer': 'https://doce-cuidado.app',
          'X-Title': 'Doce Cuidado',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
                },
              ],
            },
          ],
          max_tokens: maxTokens,
          temperature: 0.1,
        }),
      });

      if (!response.ok) continue;
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text && text.length > 1) return text;
    } catch {
      continue;
    }
  }
  return null;
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
    `Glicemia de ${value} mg/dL para ${childName}. Meta: ${targetMin}-${targetMax} mg/dL. Momento: ${moment}. Feedback caloroso em 1-2 frases completas. Se fora da meta, oriente sem alarmar.`,
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
    `Padrões de ${childName}. Meta: ${targetMin}-${targetMax}. Leituras: ${summary}. Identifique 1 padrão descritivo em 2 frases completas. Nunca prescreva.`,
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
    `Família em crise com ${childName}. Cor: ${symptoms.color}. Sudorese: ${symptoms.sweating}. Respiração: ${symptoms.breathing}. Oriente em 2-3 frases completas sobre hipo/hiper/cetoacidose.`,
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
    `Relatório de ${childName} — ${periodLabel}.
Estatísticas: Média ${stats.avg} mg/dL, Pico ${stats.peak}, Mínima ${stats.low}, Na meta ${stats.inTargetPct}% (${stats.targetMin}-${stats.targetMax} mg/dL).
Glicemias (${glucoseData.length}): ${glucoseData.slice(0, 10).map(r => `${r.value}mg/dL ${r.moment}`).join('; ')}.
Insulinas (${insulinData.length}): ${insulinData.slice(0, 5).map(l => `${l.dose}u ${l.type}`).join('; ')}.
Refeições (${mealData.length}): ${mealData.slice(0, 3).map(m => m.description).join('; ')}.
Escreva um parágrafo descritivo completo e objetivo.`,
    400,
  );

  return text ?? `Relatório de ${childName} — ${periodLabel}.\nMédia: ${stats.avg} mg/dL | Pico: ${stats.peak} | Mínima: ${stats.low} | Na meta: ${stats.inTargetPct}%.\n${glucoseData.length} medições registradas.`;
}

// ─── Vision: Read Glucometer (JSON) ─────────────────────────────────────────

export async function readGlucometer(imageBase64: string): Promise<number | null> {
  const prompt = `Look at this glucometer display photo. Read the glucose number shown on the screen.
Return ONLY valid JSON in this exact format: {"value": 106} where 106 is replaced by the actual number.
If you cannot read the display clearly, return: {"value": null}
Do not include any other text, only the JSON object.`;

  const raw = await callVisionLLM(prompt, imageBase64, 30);
  if (!raw) return null;

  try {
    const match = raw.match(/\{[^}]*"value"\s*:\s*(\d+|null)[^}]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const val = parsed.value;
    if (val === null || val === undefined) return null;
    const num = Number(val);
    if (isNaN(num) || num < 20 || num > 700) return null;
    return num;
  } catch {
    // Fallback: extract any reasonable number from the response
    const numMatch = raw.match(/\b(\d{2,3})\b/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num >= 20 && num <= 700) return num;
    }
    return null;
  }
}

// ─── Vision: Analyze Meal Photo (JSON) ──────────────────────────────────────

export interface MealAnalysis {
  description: string;
  estimated_carbs_g: number | null;
  foods_identified: string[];
}

export async function analyzeMealPhoto(imageBase64: string): Promise<MealAnalysis | null> {
  const prompt = `Look at this photo of a meal or food.
Return ONLY valid JSON in this exact format:
{"description": "arroz, feijão e frango grelhádo", "estimated_carbs_g": 45, "foods_identified": ["arroz", "feijão", "frango"]}
- description: brief description in Portuguese
- estimated_carbs_g: estimated total carbohydrates in grams (integer), or null if impossible to estimate
- foods_identified: array of food items identified
Return ONLY the JSON object, no other text.`;

  const raw = await callVisionLLM(prompt, imageBase64, 120);
  if (!raw) return null;

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    return {
      description: String(parsed.description ?? ''),
      estimated_carbs_g: parsed.estimated_carbs_g != null ? Number(parsed.estimated_carbs_g) : null,
      foods_identified: Array.isArray(parsed.foods_identified) ? parsed.foods_identified : [],
    };
  } catch {
    return null;
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
    `Criança: ${childName}. Última glicemia: ${context.lastValue ?? 'sem dados'} mg/dL (meta ${context.targetMin}-${context.targetMax}). Recentes: ${context.recent.slice(0, 6).join(', ') || 'sem dados'}.
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

export async function generateQuiz(
  childName: string,
  insulinTypes: string[],
  targetMin: number,
  targetMax: number,
): Promise<{
  question: string;
  options: string[];
  correctIndex: number;
  explanationCorrect: string;
  explanationWrong: string;
} | null> {
  const text = await callTextLLM(
    `${SYSTEM_BASE}\nGere uma pergunta de quiz educativo para cuidadores. Responda APENAS em JSON válido, sem markdown.`,
    `Pergunta sobre cuidados com diabetes para cuidadores de ${childName}. Insulinas: ${insulinTypes.join(', ')}. Meta: ${targetMin}-${targetMax}. JSON: {"question":"...","options":["A...","B...","C...","D..."],"correctIndex":0,"explanationCorrect":"...","explanationWrong":"..."}`,
    300,
  );

  if (!text) return null;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}
