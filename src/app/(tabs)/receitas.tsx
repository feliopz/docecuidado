import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fontSize, spacing } from '../../constants/theme';
import { Card } from '../../components/Card';
import ChildSwitcher from '../../components/ChildSwitcher';
import Icon from '../../components/Icon';
import { getChild, getLinkedChildren, getActiveChildId, getAccountType, LinkedChild } from '../../lib/store';
import { fetchGlucoseReadingsDB, fetchRecipesDB } from '../../lib/supabase-db';
import { analyzeSituation, getDailyRecommendations, getRecommendations, DAILY_SLOTS } from '../../lib/recipes';
import { recommendRecipeCategories } from '../../lib/llm';
import {
  Child, GlucoseReading, MealSlot, RecipeCategory, Recipe, AccountType,
  MEAL_SLOT_LABELS, RECIPE_CATEGORY_LABELS, ALLERGEN_LABELS,
} from '../../types';

const ALL_CATEGORIES = Object.keys(RECIPE_CATEGORY_LABELS) as RecipeCategory[];
const SLOT_TABS: MealSlot[] = ['cafe_da_manha', 'almoco', 'jantar', 'lanche'];

export default function Receitas() {
  const insets = useSafeAreaInsets();
  const [child, setChild] = useState<Child | null>(null);
  const [linked, setLinked] = useState<LinkedChild[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('responsavel');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Record<MealSlot, RecipeCategory> | null>(null);
  const [slot, setSlot] = useState<MealSlot>('almoco');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const total = recipes.length;

  const load = useCallback(async (force = false) => {
    const [c, lk, act, at, allRecipes] = await Promise.all([
      getChild(), getLinkedChildren(), getActiveChildId(), getAccountType(), fetchRecipesDB(),
    ]);
    setChild(c); setLinked(lk); setActiveChildId(act); setAccountType(at); setRecipes(allRecipes);
    const readings = await fetchGlucoseReadingsDB(c?.id ?? 'local');
    const fallback = analyzeSituation(c, readings);
    setCategories(fallback);

    // AI only picks a category per meal; deterministic fallback otherwise.
    if (allRecipes.length > 0) {
      const cats = await recommendRecipeCategories(
        c?.name ?? 'a criança',
        {
          lastValue: readings[0]?.reading_value ?? null,
          recent: readings.slice(0, 6).map((r: GlucoseReading) => r.reading_value),
          targetMin: c?.glucose_target_min ?? 70,
          targetMax: c?.glucose_target_max ?? 180,
        },
        ALL_CATEGORIES,
        fallback,
        force,
      );
      setCategories(cats);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(false); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const allergies = child?.allergies ?? [];
  const daily = categories ? getDailyRecommendations(recipes, categories, allergies) : {};
  const list = categories ? getRecommendations({ recipes, slot, category: categories[slot], allergies, limit: 10 }) : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.topbar}>
        {linked.length > 0 ? (
          <ChildSwitcher children={linked} activeChildId={activeChildId} accountType={accountType} onChange={() => load(false)} />
        ) : (
          <View style={styles.titleRow}>
            <Icon name="meal" size={20} color={colors.green} />
            <Text style={styles.title}>Receitas</Text>
          </View>
        )}
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={refreshing}>
          {refreshing ? <ActivityIndicator size="small" color={colors.red} /> : <Icon name="swap" size={16} color={colors.red} />}
        </TouchableOpacity>
      </View>

      <Text style={styles.intro}>
        Sugestões pensadas para a situação atual de {child?.name ?? 'a criança'}
        {allergies.length > 0 ? ' · respeitando as alergias cadastradas' : ''}.
      </Text>

      {/* Recipe book not yet populated */}
      {total === 0 ? (
        <Card style={{ alignItems: 'center' }}>
          <Image source={require('../../assets/empty-recipes.png')} style={styles.emptyImg} resizeMode="contain" />
          <Text style={styles.emptyTitle}>Livro de receitas em construção</Text>
          <Text style={styles.emptyText}>
            Em breve, dezenas de receitas serão recomendadas automaticamente conforme a glicemia,
            o horário e as alergias da criança. A estrutura já está pronta.
          </Text>
        </Card>
      ) : (
        <>
          {/* Today's recommendation — one recipe per meal */}
          <Text style={styles.sectionHeading}>Recomendações de hoje</Text>
          {DAILY_SLOTS.map(s => {
            const rec = daily[s];
            return (
              <View key={s} style={styles.dailyRow}>
                <View style={styles.dailySlotTag}>
                  <Text style={styles.dailySlotText}>{MEAL_SLOT_LABELS[s]}</Text>
                </View>
                {rec ? (
                  <RecipeCard recipe={rec} expanded={expandedId === `daily_${rec.id}`} onToggle={() => setExpandedId(expandedId === `daily_${rec.id}` ? null : `daily_${rec.id}`)} />
                ) : (
                  <Card style={{ flex: 1 }}><Text style={styles.noneText}>Sem opção compatível para esta refeição.</Text></Card>
                )}
              </View>
            );
          })}

          {/* Top 10 by meal slot */}
          <Text style={styles.sectionHeading}>Top 10 recomendadas</Text>
          <View style={styles.slotTabs}>
            {SLOT_TABS.map(s => (
              <TouchableOpacity key={s} style={[styles.slotTab, slot === s && styles.slotTabActive]} onPress={() => setSlot(s)}>
                <Text style={[styles.slotTabText, slot === s && styles.slotTabTextActive]}>{MEAL_SLOT_LABELS[s]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {list.length === 0 ? (
            <Card><Text style={styles.noneText}>Nenhuma receita compatível para esta refeição ainda.</Text></Card>
          ) : (
            list.map(r => (
              <RecipeCard key={r.id} recipe={r} expanded={expandedId === r.id} onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)} />
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

function RecipeCard({ recipe, expanded, onToggle }: { recipe: Recipe; expanded: boolean; onToggle: () => void }) {
  return (
    <Card style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
        {recipe.image_url ? (
          <Image source={{ uri: recipe.image_url }} style={styles.recipeImg} resizeMode="cover" />
        ) : (
          <View style={[styles.recipeImg, styles.recipeImgPlaceholder]}>
            <Icon name="meal" size={32} color={colors.text3} />
          </View>
        )}
        <View style={styles.recipeBody}>
          <View style={styles.recipeHeadRow}>
            <Text style={styles.recipeTitle}>{recipe.title}</Text>
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text2} />
          </View>
          <Text style={styles.recipeDesc} numberOfLines={expanded ? undefined : 2}>{recipe.description}</Text>
          <View style={styles.recipeMetaRow}>
            <View style={styles.metaPill}><Icon name="clock" size={11} color={colors.text2} /><Text style={styles.metaPillText}>{recipe.prep_minutes} min</Text></View>
            <View style={styles.metaPill}><Icon name="nutrition" size={11} color={colors.green} /><Text style={styles.metaPillText}>{recipe.nutrition.carbs_g}g carbo</Text></View>
            <View style={styles.metaPill}><Text style={styles.metaPillText}>{recipe.nutrition.calories} kcal</Text></View>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.recipeDetail}>
          {recipe.allergens.length > 0 && (
            <Text style={styles.allergenWarn}>
              Contém: {recipe.allergens.map(a => ALLERGEN_LABELS[a]).join(', ')}
            </Text>
          )}
          <Text style={styles.detailHead}>Ingredientes</Text>
          {recipe.ingredients.map((ing, i) => <Text key={i} style={styles.detailItem}>• {ing}</Text>)}
          <Text style={styles.detailHead}>Modo de preparo</Text>
          {recipe.steps.map((st, i) => <Text key={i} style={styles.detailItem}>{i + 1}. {st}</Text>)}
          <Text style={styles.detailHead}>Informação nutricional (por porção)</Text>
          <Text style={styles.detailItem}>
            {recipe.nutrition.calories} kcal · {recipe.nutrition.carbs_g}g carbo · {recipe.nutrition.protein_g}g proteína · {recipe.nutrition.fat_g}g gordura
            {recipe.nutrition.fiber_g != null ? ` · ${recipe.nutrition.fiber_g}g fibra` : ''}
          </Text>
          {recipe.diabetes_notes ? (
            <View style={styles.notesBox}>
              <Icon name="heart" size={13} color={colors.red} />
              <Text style={styles.notesText}>{recipe.diabetes_notes}</Text>
            </View>
          ) : null}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, padding: 12, borderRadius: radius.lg,
    marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.red,
    alignItems: 'center', justifyContent: 'center',
  },
  intro: { fontSize: 13, color: colors.text2, marginBottom: 14, lineHeight: 19 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 10, textAlign: 'center' },
  emptyImg: { width: 160, height: 160 },
  emptyText: { fontSize: 13, color: colors.text2, textAlign: 'center', lineHeight: 19, marginTop: 6 },
  sectionHeading: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 10 },
  dailyRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  dailySlotTag: { width: 64, paddingTop: 8 },
  dailySlotText: { fontSize: 12, fontWeight: '700', color: colors.text2 },
  noneText: { fontSize: 13, color: colors.text3 },
  slotTabs: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  slotTab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  slotTabActive: { backgroundColor: colors.green, borderColor: colors.green },
  slotTabText: { fontSize: 12, fontWeight: '600', color: colors.text2 },
  slotTabTextActive: { color: '#fff' },
  recipeImg: { width: '100%', height: 140 },
  recipeImgPlaceholder: { backgroundColor: '#F4F4F4', alignItems: 'center', justifyContent: 'center' },
  recipeBody: { padding: 14 },
  recipeHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  recipeTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  recipeDesc: { fontSize: 13, color: colors.text2, lineHeight: 19, marginTop: 4 },
  recipeMetaRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F4F4F4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  metaPillText: { fontSize: 11, fontWeight: '600', color: colors.text2 },
  recipeDetail: { paddingHorizontal: 14, paddingBottom: 14, gap: 4 },
  allergenWarn: { fontSize: 12, fontWeight: '700', color: colors.red, marginBottom: 4 },
  detailHead: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 10 },
  detailItem: { fontSize: 13, color: colors.text2, lineHeight: 20 },
  notesBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.rose, borderRadius: radius.md, padding: 10, marginTop: 10 },
  notesText: { flex: 1, fontSize: 12, color: colors.text2, lineHeight: 18 },
});
