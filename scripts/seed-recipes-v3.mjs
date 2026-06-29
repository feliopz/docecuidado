/**
 * Seed 50 distinct, varied diabetic-friendly recipes into Supabase.
 *  - Wipes the existing `recipes` table and the `recipe-images` storage bucket
 *  - Inserts 50 hand-authored recipes (no images yet — image_url left empty)
 *  - Writes a reference JSON to docs/recipes/recipes-v3.json (with image_prompt
 *    per dish, for later AI image generation)
 *  - Validates category coverage (each category has café + almoço + jantar)
 *
 * Run from repo root:  node scripts/seed-recipes-v3.mjs
 */
import { createClient } from '../src/node_modules/@supabase/supabase-js/dist/main/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envText = fs.readFileSync(path.join(root, 'src/.env.local'), 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// nutrition helper: n(servings, kcal, carbs, protein, fat, fiber, sugar, gi)
const n = (servings, calories, carbs_g, protein_g, fat_g, fiber_g, sugar_g, glycemic_index) =>
  ({ servings, calories, carbs_g, protein_g, fat_g, fiber_g, sugar_g, glycemic_index });

// r(title, desc, slots, cats, allergens, prep, diff, ingredients, steps, nutrition, notes)
const r = (title, description, meal_slots, categories, allergens, prep_minutes, difficulty, ingredients, steps, nutrition, diabetes_notes) =>
  ({ title, description, meal_slots, categories, allergens, prep_minutes, difficulty, ingredients, steps, nutrition, diabetes_notes });

const RAW = [
  // ── CAFÉ DA MANHÃ ──────────────────────────────────────────────────────────
  r('Crepioca de Queijo', 'Massa de tapioca com ovo e queijo, dourada na frigideira.',
    ['cafe_da_manha'], ['rica_proteina', 'baixo_carbo'], ['leite', 'ovo'], 10, 'facil',
    ['1 ovo', '2 colheres de sopa de goma de tapioca', '1 fatia de queijo minas', 'Sal a gosto'],
    ['Bata o ovo com a tapioca e o sal.', 'Despeje numa frigideira antiaderente quente.', 'Coloque o queijo, dobre e doure dos dois lados.'],
    n(1, 190, 16, 12, 8, 1, 1, 'médio'),
    'Combina proteína do ovo e do queijo com pouco carboidrato, dando saciedade pela manhã.'),

  r('Tapioca com Frango Desfiado', 'Tapioca leve recheada com frango temperado.',
    ['cafe_da_manha'], ['equilibrada', 'carbo_complexo'], [], 15, 'facil',
    ['3 colheres de sopa de goma de tapioca', '50 g de frango cozido e desfiado', 'Tomate picado', 'Cheiro-verde'],
    ['Espalhe a goma na frigideira até formar a massa.', 'Recheie com o frango, o tomate e o cheiro-verde.', 'Dobre e sirva quente.'],
    n(1, 220, 30, 14, 3, 1, 1, 'médio'),
    'A tapioca dá energia e o frango adiciona proteína, equilibrando a glicemia da manhã.'),

  r('Mingau de Aveia com Canela', 'Aveia cozida no leite com canela, sem açúcar.',
    ['cafe_da_manha'], ['carbo_complexo', 'rica_fibra'], ['leite'], 10, 'facil',
    ['3 colheres de sopa de aveia em flocos', '1 xícara de leite desnatado', '1 pitada de canela', 'Adoçante a gosto'],
    ['Leve a aveia e o leite ao fogo baixo, mexendo.', 'Cozinhe até engrossar.', 'Finalize com canela e adoçante.'],
    n(1, 200, 28, 10, 4, 4, 6, 'baixo'),
    'A fibra solúvel da aveia retarda a absorção da glicose, evitando picos.'),

  r('Omelete de Espinafre', 'Omelete fofinha com espinafre fresco.',
    ['cafe_da_manha'], ['baixo_carbo', 'rica_proteina'], ['ovo'], 10, 'facil',
    ['2 ovos', '1 punhado de espinafre', '1 colher de chá de azeite', 'Sal e pimenta'],
    ['Bata os ovos com sal e pimenta.', 'Refogue o espinafre no azeite.', 'Adicione os ovos e cozinhe até firmar.'],
    n(1, 180, 3, 13, 13, 1, 1, 'baixo'),
    'Quase sem carboidrato, ideal quando a glicemia está mais alta.'),

  r('Vitamina de Banana e Aveia', 'Bebida cremosa de banana, aveia e leite.',
    ['cafe_da_manha', 'lanche'], ['carbo_complexo', 'pos_hipo'], ['leite'], 5, 'facil',
    ['1 banana pequena', '1 xícara de leite desnatado', '2 colheres de sopa de aveia', 'Canela a gosto'],
    ['Bata tudo no liquidificador.', 'Sirva imediatamente.'],
    n(1, 230, 38, 9, 3, 4, 18, 'médio'),
    'Boa opção de recuperação após hipoglicemia, com carboidrato e proteína juntos.'),

  r('Pão Integral com Ricota e Tomate', 'Torrada integral com pasta de ricota e tomate.',
    ['cafe_da_manha'], ['equilibrada', 'rica_fibra'], ['leite', 'gluten'], 8, 'facil',
    ['2 fatias de pão integral', '3 colheres de sopa de ricota amassada', 'Rodelas de tomate', 'Orégano'],
    ['Amasse a ricota com um fio de azeite e sal.', 'Espalhe sobre o pão.', 'Cubra com tomate e orégano.'],
    n(1, 240, 30, 14, 7, 5, 3, 'médio'),
    'O pão integral e a ricota oferecem fibras e proteína para uma manhã equilibrada.'),

  r('Iogurte com Chia e Morango', 'Iogurte natural com chia e morangos frescos.',
    ['cafe_da_manha', 'lanche'], ['baixo_indice_glicemico', 'lanche_leve'], ['leite'], 5, 'facil',
    ['1 pote de iogurte natural sem açúcar', '1 colher de sopa de chia', '5 morangos picados'],
    ['Misture a chia no iogurte.', 'Adicione os morangos.', 'Deixe descansar 5 minutos e sirva.'],
    n(1, 150, 14, 10, 5, 4, 9, 'baixo'),
    'A chia e o iogurte sem açúcar mantêm a glicemia estável e dão saciedade.'),

  r('Cuscuz Nordestino com Ovo', 'Cuscuz de milho com ovo cozido.',
    ['cafe_da_manha'], ['carbo_complexo', 'equilibrada'], ['ovo'], 15, 'facil',
    ['4 colheres de sopa de flocão de milho', 'Água e sal', '1 ovo cozido', 'Azeite'],
    ['Hidrate o flocão com água e sal.', 'Cozinhe na cuscuzeira até soltar vapor.', 'Sirva com o ovo e um fio de azeite.'],
    n(1, 230, 34, 9, 6, 2, 1, 'médio'),
    'O milho fornece energia e o ovo equilibra com proteína.'),

  r('Panqueca de Banana e Aveia', 'Panqueca natural sem farinha e sem açúcar.',
    ['cafe_da_manha', 'lanche'], ['pos_hipo', 'rica_fibra'], ['ovo'], 12, 'facil',
    ['1 banana amassada', '1 ovo', '2 colheres de sopa de aveia', 'Canela'],
    ['Misture todos os ingredientes.', 'Doure pequenas porções na frigideira antiaderente.'],
    n(1, 210, 30, 9, 6, 4, 12, 'médio'),
    'Carboidrato com fibra e proteína, útil para recompor após uma hipoglicemia.'),

  r('Smoothie Verde de Abacate', 'Bebida cremosa de abacate, couve e limão.',
    ['cafe_da_manha', 'lanche'], ['baixo_carbo', 'pos_hiper'], [], 7, 'facil',
    ['1/2 abacate pequeno', '1 folha de couve', 'Suco de 1/2 limão', 'Água gelada', 'Adoçante a gosto'],
    ['Bata tudo no liquidificador com água.', 'Sirva gelado.'],
    n(1, 170, 9, 3, 14, 5, 2, 'baixo'),
    'Gordura boa e poucos carboidratos, uma opção leve quando a glicemia está elevada.'),

  r('Ovos Mexidos com Tomate', 'Ovos mexidos cremosos com tomate e queijo.',
    ['cafe_da_manha'], ['rica_proteina', 'baixo_carbo'], ['leite', 'ovo'], 8, 'facil',
    ['2 ovos', '1 tomate picado', '1 colher de sopa de queijo ralado', 'Cebolinha'],
    ['Refogue o tomate rapidamente.', 'Adicione os ovos batidos e mexa.', 'Finalize com queijo e cebolinha.'],
    n(1, 200, 5, 15, 13, 1, 3, 'baixo'),
    'Rico em proteína e com baixo carboidrato, ajuda no controle glicêmico matinal.'),

  r('Pudim de Chia com Cacau', 'Chia hidratada no leite com cacau, sem açúcar.',
    ['cafe_da_manha', 'lanche'], ['baixo_indice_glicemico', 'rica_fibra'], ['leite'], 8, 'facil',
    ['3 colheres de sopa de chia', '1 xícara de leite desnatado', '1 colher de chá de cacau em pó', 'Adoçante'],
    ['Misture tudo e mexa bem.', 'Leve à geladeira por 4 horas.', 'Sirva gelado.'],
    n(1, 180, 16, 8, 9, 8, 4, 'baixo'),
    'Muita fibra e baixo índice glicêmico — ótima para estabilizar a glicemia.'),

  // ── ALMOÇO ─────────────────────────────────────────────────────────────────
  r('Frango Grelhado com Brócolis', 'Filé de frango grelhado com brócolis no vapor.',
    ['almoco'], ['rica_proteina', 'baixo_carbo'], [], 25, 'facil',
    ['1 filé de peito de frango', '1 xícara de brócolis', 'Alho, sal e pimenta', '1 colher de chá de azeite'],
    ['Tempere e grelhe o frango.', 'Cozinhe o brócolis no vapor.', 'Sirva com um fio de azeite.'],
    n(1, 240, 6, 34, 8, 3, 1, 'baixo'),
    'Proteína magra e vegetal de baixo carboidrato, excelente para o controle glicêmico.'),

  r('Arroz Integral com Feijão e Couve', 'O clássico brasileiro em versão integral.',
    ['almoco'], ['carbo_complexo', 'rica_fibra', 'equilibrada'], [], 40, 'media',
    ['1/2 xícara de arroz integral cozido', '1/2 concha de feijão', '1 punhado de couve refogada', 'Alho e azeite'],
    ['Refogue a couve no alho e azeite.', 'Sirva o arroz integral com o feijão.', 'Acompanhe com a couve.'],
    n(1, 320, 48, 12, 7, 9, 2, 'médio'),
    'Arroz e feijão integrais combinam fibras e proteína vegetal, liberando glicose devagar.'),

  r('Tilápia Assada com Legumes', 'Filé de tilápia ao forno com legumes coloridos.',
    ['almoco'], ['rica_proteina', 'baixo_indice_glicemico'], ['peixe'], 30, 'media',
    ['1 filé de tilápia', 'Abobrinha e cenoura em rodelas', 'Limão, alho e ervas', 'Azeite'],
    ['Tempere o peixe com limão e alho.', 'Disponha com os legumes numa assadeira.', 'Asse a 200°C por 20 minutos.'],
    n(1, 250, 12, 30, 9, 3, 4, 'baixo'),
    'Peixe magro e legumes de baixo índice glicêmico, leve e nutritivo.'),

  r('Lentilha Refogada com Cenoura', 'Lentilha cozida e refogada com cenoura.',
    ['almoco', 'jantar'], ['rica_fibra', 'baixo_indice_glicemico'], [], 35, 'media',
    ['1 xícara de lentilha cozida', '1 cenoura em cubos', 'Cebola e alho', 'Azeite e salsinha'],
    ['Refogue cebola e alho no azeite.', 'Adicione a cenoura e a lentilha.', 'Cozinhe por 10 minutos e finalize com salsinha.'],
    n(1, 230, 32, 14, 4, 11, 3, 'baixo'),
    'A lentilha tem baixo índice glicêmico e muita fibra e proteína vegetal.'),

  r('Quinoa com Legumes e Grão-de-bico', 'Salada morna de quinoa, grão-de-bico e legumes.',
    ['almoco'], ['carbo_complexo', 'rica_fibra'], [], 30, 'media',
    ['1/2 xícara de quinoa cozida', '1/2 xícara de grão-de-bico cozido', 'Pepino e tomate picados', 'Azeite e limão'],
    ['Misture a quinoa com o grão-de-bico.', 'Adicione os legumes picados.', 'Tempere com azeite e limão.'],
    n(1, 300, 42, 14, 8, 9, 4, 'baixo'),
    'Combinação de carboidrato complexo, fibra e proteína vegetal completa.'),

  r('Strogonoff de Frango Leve', 'Versão leve com iogurte no lugar do creme de leite.',
    ['almoco'], ['rica_proteina', 'equilibrada'], ['leite'], 25, 'media',
    ['1 filé de frango em cubos', '3 colheres de sopa de iogurte natural', 'Mostarda e tomate', 'Cebola e alho'],
    ['Refogue o frango com cebola e alho.', 'Acrescente tomate e mostarda.', 'Desligue o fogo e misture o iogurte.'],
    n(1, 260, 12, 30, 9, 2, 5, 'médio'),
    'Troca o creme de leite por iogurte, reduzindo gordura e mantendo a proteína.'),

  r('Salada de Atum com Folhas', 'Salada fresca de atum, folhas verdes e grão-de-bico.',
    ['almoco'], ['rica_proteina', 'baixo_carbo', 'pos_hiper', 'lanche_leve'], ['peixe'], 12, 'facil',
    ['1 lata de atum em água', 'Mix de folhas verdes', '2 colheres de sopa de grão-de-bico', 'Azeite e limão'],
    ['Escorra o atum.', 'Monte as folhas com o atum e o grão-de-bico.', 'Tempere com azeite e limão.'],
    n(1, 220, 10, 26, 9, 4, 2, 'baixo'),
    'Leve e proteica, boa escolha quando a glicemia está mais alta.'),

  r('Escondidinho de Batata-doce', 'Purê de batata-doce sobre carne moída magra.',
    ['almoco'], ['carbo_complexo', 'rica_proteina', 'pos_hipo'], ['leite'], 40, 'media',
    ['1 batata-doce média', '100 g de patinho moído', '1 colher de sopa de queijo ralado', 'Cebola e alho'],
    ['Cozinhe e amasse a batata-doce.', 'Refogue a carne com cebola e alho.', 'Monte a carne, cubra com o purê e o queijo e gratine.'],
    n(1, 330, 38, 24, 9, 5, 6, 'médio'),
    'Carboidrato complexo da batata-doce com proteína — bom para repor após hipoglicemia.'),

  r('Abobrinha Recheada com Carne', 'Barquinhos de abobrinha recheados com carne moída.',
    ['almoco'], ['baixo_carbo', 'rica_proteina'], [], 35, 'media',
    ['2 abobrinhas', '100 g de carne moída magra', 'Tomate, cebola e alho', 'Orégano'],
    ['Corte as abobrinhas ao meio e retire o miolo.', 'Refogue a carne com os temperos.', 'Recheie e asse por 20 minutos.'],
    n(1, 230, 12, 22, 10, 4, 5, 'baixo'),
    'Pouco carboidrato e boa proteína, com vegetais que aumentam a saciedade.'),

  r('Sopa de Legumes com Frango', 'Sopa reconfortante de legumes com frango desfiado.',
    ['almoco', 'jantar'], ['baixo_indice_glicemico', 'pos_hiper'], [], 35, 'facil',
    ['50 g de frango desfiado', 'Cenoura, chuchu e abobrinha', 'Cebola e alho', 'Salsinha'],
    ['Refogue cebola e alho.', 'Adicione os legumes e água.', 'Cozinhe, acrescente o frango e finalize com salsinha.'],
    n(1, 180, 16, 16, 5, 5, 5, 'baixo'),
    'Leve, hidratante e de baixo índice glicêmico — boa após hiperglicemia.'),

  r('Macarrão Integral ao Sugo com Frango', 'Massa integral com molho de tomate caseiro e frango.',
    ['almoco'], ['carbo_complexo', 'equilibrada'], ['gluten'], 30, 'media',
    ['1 xícara de macarrão integral cozido', 'Molho de tomate caseiro', '50 g de frango grelhado', 'Manjericão'],
    ['Prepare o molho de tomate.', 'Misture o macarrão e o frango.', 'Finalize com manjericão.'],
    n(1, 330, 46, 20, 6, 7, 6, 'médio'),
    'A massa integral tem mais fibra, liberando glicose mais lentamente que a comum.'),

  r('Berinjela à Parmegiana Leve', 'Berinjela assada com molho de tomate e queijo.',
    ['almoco'], ['equilibrada', 'rica_fibra'], ['leite', 'gluten'], 40, 'media',
    ['1 berinjela em fatias', 'Molho de tomate', '2 colheres de sopa de queijo', '1 colher de sopa de farinha integral'],
    ['Passe a berinjela na farinha e asse.', 'Monte camadas com molho e queijo.', 'Gratine no forno por 15 minutos.'],
    n(1, 260, 24, 12, 12, 7, 8, 'médio'),
    'Berinjela assada (não frita) com fibra; porção controlada de queijo.'),

  // ── JANTAR ───────────────────────────────────────────────────────────────
  r('Omelete de Forno com Legumes', 'Omelete assada com legumes picados.',
    ['jantar'], ['rica_proteina', 'baixo_carbo'], ['ovo'], 30, 'facil',
    ['3 ovos', 'Abobrinha, tomate e cebola', 'Cheiro-verde', 'Sal e azeite'],
    ['Bata os ovos com sal.', 'Misture os legumes picados.', 'Asse em forma untada a 180°C por 20 minutos.'],
    n(1, 210, 7, 16, 13, 2, 4, 'baixo'),
    'Jantar leve, rico em proteína e com pouco carboidrato.'),

  r('Sopa de Abóbora com Gengibre', 'Creme aveludado de abóbora com toque de gengibre.',
    ['jantar'], ['baixo_indice_glicemico', 'pos_hiper'], [], 30, 'facil',
    ['2 xícaras de abóbora cabotiá', '1 pedaço de gengibre', 'Cebola e alho', 'Sal e azeite'],
    ['Cozinhe a abóbora com cebola, alho e gengibre.', 'Bata até virar creme.', 'Ajuste o sal e sirva.'],
    n(1, 150, 22, 4, 5, 5, 6, 'baixo'),
    'Reconfortante e de baixo índice glicêmico, boa para a noite após hiperglicemia.'),

  r('Wrap Integral de Frango', 'Tortilha integral recheada com frango e folhas.',
    ['jantar'], ['equilibrada', 'carbo_complexo'], ['gluten'], 15, 'facil',
    ['1 tortilha integral', '60 g de frango desfiado', 'Alface e tomate', 'Iogurte temperado'],
    ['Aqueça a tortilha.', 'Recheie com o frango, as folhas e o molho de iogurte.', 'Enrole e sirva.'],
    n(1, 280, 30, 22, 8, 5, 3, 'médio'),
    'Refeição prática e equilibrada, com carboidrato integral e proteína magra.'),

  r('Peixe ao Papillote', 'Filé de peixe assado no papel com legumes e ervas.',
    ['jantar'], ['rica_proteina', 'baixo_indice_glicemico'], ['peixe'], 30, 'media',
    ['1 filé de peixe branco', 'Tomate-cereja e abobrinha', 'Limão, alho e ervas', 'Azeite'],
    ['Monte o peixe e os legumes sobre papel-manteiga.', 'Tempere e feche o pacote.', 'Asse a 200°C por 20 minutos.'],
    n(1, 230, 10, 30, 8, 3, 4, 'baixo'),
    'Cozimento sem gordura extra, mantendo a proteína magra e os nutrientes.'),

  r('Purê de Couve-flor com Frango', 'Purê cremoso de couve-flor com frango desfiado.',
    ['jantar'], ['baixo_carbo', 'rica_proteina'], [], 30, 'facil',
    ['1/2 couve-flor cozida', '60 g de frango desfiado', 'Alho e azeite', 'Noz-moscada'],
    ['Bata a couve-flor cozida até virar purê.', 'Tempere com alho e noz-moscada.', 'Sirva com o frango por cima.'],
    n(1, 200, 10, 24, 7, 4, 4, 'baixo'),
    'Substitui o purê de batata por couve-flor, reduzindo bastante o carboidrato.'),

  r('Caldo Verde Fit', 'Versão leve do caldo verde com batata e couve.',
    ['jantar'], ['carbo_complexo', 'rica_fibra'], [], 35, 'media',
    ['1 batata média', 'Couve fatiada fininha', 'Cebola e alho', 'Sal e azeite'],
    ['Cozinhe a batata e bata para engrossar o caldo.', 'Refogue a couve rapidamente.', 'Junte tudo e sirva quente.'],
    n(1, 190, 28, 6, 5, 6, 3, 'médio'),
    'A batata dá carboidrato complexo e a couve adiciona fibra e volume.'),

  r('Tofu Grelhado com Legumes', 'Cubos de tofu grelhados com legumes salteados.',
    ['jantar'], ['rica_proteina', 'baixo_carbo'], ['soja'], 25, 'media',
    ['150 g de tofu firme', 'Brócolis e pimentão', 'Alho e gengibre', 'Azeite e sal'],
    ['Grelhe o tofu até dourar.', 'Salteie os legumes com alho e gengibre.', 'Misture e sirva.'],
    n(1, 220, 12, 18, 12, 4, 4, 'baixo'),
    'Proteína vegetal com baixo carboidrato — boa alternativa sem carne.'),

  r('Sopa de Lentilha', 'Sopa encorpada de lentilha com legumes.',
    ['jantar'], ['rica_fibra', 'carbo_complexo', 'pos_hipo'], [], 35, 'facil',
    ['1 xícara de lentilha', 'Cenoura e tomate', 'Cebola e alho', 'Cominho e salsinha'],
    ['Refogue cebola, alho e legumes.', 'Adicione a lentilha e água.', 'Cozinhe até amaciar e ajuste o tempero.'],
    n(1, 250, 36, 16, 4, 12, 4, 'baixo'),
    'Carboidrato complexo e fibra com boa proteína — ajuda a estabilizar após hipoglicemia.'),

  r('Frango Xadrez com Pimentões', 'Frango em cubos salteado com pimentões coloridos.',
    ['jantar'], ['equilibrada', 'baixo_carbo'], ['soja'], 25, 'media',
    ['1 filé de frango em cubos', 'Pimentões vermelho e verde', '1 colher de sopa de shoyu leve', 'Alho e gengibre'],
    ['Doure o frango.', 'Acrescente os pimentões, o alho e o gengibre.', 'Finalize com o shoyu.'],
    n(1, 240, 12, 30, 7, 3, 6, 'baixo'),
    'Refeição colorida e equilibrada, com poucos carboidratos.'),

  r('Almôndegas ao Molho de Tomate', 'Almôndegas magras assadas no molho caseiro.',
    ['jantar'], ['rica_proteina', 'equilibrada'], ['ovo'], 35, 'media',
    ['150 g de carne moída magra', '1 ovo', 'Molho de tomate caseiro', 'Cebola, alho e salsinha'],
    ['Misture a carne com o ovo e os temperos e modele as almôndegas.', 'Doure e cozinhe no molho de tomate.', 'Sirva com salsinha.'],
    n(1, 270, 12, 26, 13, 3, 6, 'médio'),
    'Boa fonte de proteína; o molho de tomate caseiro evita açúcar adicionado.'),

  r('Creme de Espinafre com Ovo Poché', 'Creme de espinafre leve com ovo poché por cima.',
    ['jantar'], ['baixo_carbo', 'pos_hiper'], ['leite', 'ovo'], 25, 'media',
    ['2 punhados de espinafre', '1/2 xícara de leite desnatado', '1 ovo', 'Alho e noz-moscada'],
    ['Refogue o espinafre e bata com o leite.', 'Faça o ovo poché em água com vinagre.', 'Sirva o creme com o ovo por cima.'],
    n(1, 190, 9, 14, 11, 3, 5, 'baixo'),
    'Leve e com pouco carboidrato, indicado para a noite após hiperglicemia.'),

  // ── LANCHE ─────────────────────────────────────────────────────────────────
  r('Hummus com Palitos de Cenoura', 'Pasta de grão-de-bico com palitos de cenoura.',
    ['lanche'], ['rica_fibra', 'lanche_leve'], ['gergelim'], 12, 'facil',
    ['1 xícara de grão-de-bico cozido', '1 colher de sopa de tahine', 'Suco de limão e alho', 'Cenoura em palitos'],
    ['Bata o grão-de-bico com tahine, limão e alho.', 'Sirva com os palitos de cenoura.'],
    n(2, 170, 20, 7, 7, 6, 3, 'baixo'),
    'Fibra e proteína vegetal num lanche que sacia sem elevar muito a glicemia.'),

  r('Mix de Castanhas e Amêndoas', 'Porção controlada de oleaginosas.',
    ['lanche'], ['lanche_leve', 'rica_proteina'], ['castanhas'], 2, 'facil',
    ['10 amêndoas', '5 castanhas-do-pará', '5 nozes'],
    ['Misture as oleaginosas.', 'Sirva uma porção pequena (cerca de 30 g).'],
    n(1, 200, 6, 6, 18, 3, 1, 'baixo'),
    'Gorduras boas e baixo carboidrato; ótimo lanche, em porção controlada.'),

  r('Maçã com Pasta de Amendoim', 'Fatias de maçã com pasta de amendoim integral.',
    ['lanche'], ['lanche_leve', 'pos_hipo'], ['amendoim'], 5, 'facil',
    ['1 maçã pequena', '1 colher de sopa de pasta de amendoim integral'],
    ['Corte a maçã em fatias.', 'Sirva com a pasta de amendoim.'],
    n(1, 190, 22, 5, 9, 4, 15, 'baixo'),
    'Carboidrato da fruta com gordura e proteína do amendoim, que suavizam o pico.'),

  r('Iogurte com Granola sem Açúcar', 'Iogurte natural com granola caseira sem açúcar.',
    ['lanche', 'cafe_da_manha'], ['lanche_leve', 'carbo_complexo'], ['leite'], 5, 'facil',
    ['1 pote de iogurte natural', '2 colheres de sopa de granola sem açúcar'],
    ['Coloque a granola sobre o iogurte.', 'Sirva imediatamente para manter a crocância.'],
    n(1, 200, 24, 10, 6, 4, 8, 'médio'),
    'Lanche equilibrado; a granola sem açúcar evita picos de glicose.'),

  r('Palitos de Pepino com Cream Cheese', 'Pepino em palitos com cream cheese light.',
    ['lanche'], ['lanche_leve', 'baixo_carbo'], ['leite'], 5, 'facil',
    ['1 pepino', '2 colheres de sopa de cream cheese light', 'Cebolinha'],
    ['Corte o pepino em palitos.', 'Sirva com o cream cheese e cebolinha.'],
    n(1, 110, 6, 4, 7, 1, 3, 'baixo'),
    'Lanche refrescante e com baixíssimo carboidrato.'),

  r('Espetinho de Frutas Vermelhas', 'Espetinhos de morango, uva e amora.',
    ['lanche'], ['lanche_leve', 'pos_hiper'], [], 8, 'facil',
    ['5 morangos', '5 uvas', '1 punhado de amoras'],
    ['Lave as frutas.', 'Monte os espetinhos alternando as frutas.'],
    n(1, 90, 20, 1, 0, 4, 14, 'baixo'),
    'Frutas com fibra e baixo índice glicêmico, em porção pequena.'),

  r('Biscoito Integral de Aveia', 'Biscoitos caseiros de aveia e banana, sem açúcar.',
    ['lanche'], ['carbo_complexo', 'lanche_leve'], ['ovo'], 25, 'media',
    ['1 xícara de aveia', '1 banana amassada', '1 ovo', 'Canela'],
    ['Misture todos os ingredientes.', 'Modele e asse a 180°C por 15 minutos.'],
    n(2, 160, 26, 6, 4, 4, 7, 'médio'),
    'Lanche caseiro com fibra; adoçado naturalmente pela banana.'),

  r('Gelatina Diet com Frutas', 'Gelatina sem açúcar com pedaços de fruta.',
    ['lanche'], ['lanche_leve', 'pos_hiper'], [], 10, 'facil',
    ['1 gelatina diet', 'Pedaços de pêssego ou morango'],
    ['Prepare a gelatina diet.', 'Acrescente as frutas antes de gelar.', 'Leve à geladeira.'],
    n(1, 60, 10, 2, 0, 1, 6, 'baixo'),
    'Sobremesa leve e de baixa caloria, sem açúcar adicionado.'),

  r('Ovo Cozido Temperado', 'Ovos cozidos com sal, pimenta e ervas.',
    ['lanche'], ['rica_proteina', 'baixo_carbo'], ['ovo'], 12, 'facil',
    ['2 ovos', 'Sal, pimenta e orégano'],
    ['Cozinhe os ovos por 9 minutos.', 'Descasque, corte e tempere.'],
    n(1, 150, 1, 13, 10, 0, 1, 'baixo'),
    'Proteína prática e sem carboidrato, ideal entre as refeições.'),

  r('Bolinho de Banana de Frigideira', 'Bolinho rápido de banana e aveia na frigideira.',
    ['lanche', 'cafe_da_manha'], ['pos_hipo', 'carbo_complexo'], ['ovo'], 12, 'facil',
    ['1 banana', '1 ovo', '2 colheres de sopa de aveia', 'Canela'],
    ['Amasse a banana e misture o ovo e a aveia.', 'Doure colheradas na frigideira antiaderente.'],
    n(1, 210, 30, 8, 6, 4, 12, 'médio'),
    'Carboidrato com fibra e proteína; prático para repor após hipoglicemia.'),

  // ── EXTRAS (variedade e cobertura) ──────────────────────────────────────────
  r('Salada de Grão-de-bico', 'Salada fresca de grão-de-bico, tomate e pepino.',
    ['almoco', 'jantar'], ['rica_fibra', 'baixo_indice_glicemico'], [], 12, 'facil',
    ['1 xícara de grão-de-bico cozido', 'Tomate e pepino picados', 'Cebola roxa', 'Azeite e limão'],
    ['Misture o grão-de-bico com os legumes.', 'Tempere com azeite, limão e sal.'],
    n(1, 240, 30, 11, 8, 9, 4, 'baixo'),
    'Proteína vegetal e muita fibra, com baixo índice glicêmico.'),

  r('Panqueca Proteica de Claras', 'Panqueca leve feita com claras e aveia.',
    ['cafe_da_manha'], ['rica_proteina', 'baixo_carbo'], ['ovo'], 12, 'facil',
    ['3 claras', '2 colheres de sopa de aveia', 'Canela', 'Adoçante'],
    ['Bata as claras com a aveia.', 'Doure na frigideira antiaderente dos dois lados.'],
    n(1, 150, 14, 14, 3, 3, 1, 'baixo'),
    'Alta proteína e baixo carboidrato, boa para começar o dia saciado.'),

  r('Creme de Abobrinha', 'Sopa-creme leve de abobrinha.',
    ['jantar'], ['pos_hiper', 'baixo_carbo', 'lanche_leve'], [], 25, 'facil',
    ['2 abobrinhas', 'Cebola e alho', '1/2 xícara de caldo de legumes', 'Sal e azeite'],
    ['Cozinhe a abobrinha com cebola e alho.', 'Bata com o caldo até virar creme.', 'Ajuste o sal e sirva.'],
    n(1, 120, 10, 4, 7, 3, 5, 'baixo'),
    'Muito leve e com pouco carboidrato, indicado para a noite após hiperglicemia.'),

  r('Risoto Integral de Legumes', 'Risoto de arroz integral com legumes e queijo.',
    ['almoco'], ['carbo_complexo', 'equilibrada'], ['leite'], 40, 'dificil',
    ['1/2 xícara de arroz integral', 'Abobrinha, cenoura e ervilha', 'Caldo de legumes', '1 colher de sopa de queijo ralado'],
    ['Refogue os legumes.', 'Acrescente o arroz e o caldo aos poucos, mexendo.', 'Finalize com o queijo.'],
    n(1, 320, 46, 11, 8, 7, 4, 'médio'),
    'Arroz integral libera glicose lentamente; porção controlada de queijo.'),

  r('Smoothie de Morango Pós-treino', 'Vitamina de morango com iogurte, para depois de atividade.',
    ['lanche', 'cafe_da_manha'], ['pos_hipo', 'rica_proteina'], ['leite'], 5, 'facil',
    ['1 xícara de morangos', '1 pote de iogurte natural', '2 colheres de sopa de aveia'],
    ['Bata tudo no liquidificador.', 'Sirva gelado.'],
    n(1, 220, 30, 14, 4, 5, 16, 'médio'),
    'Carboidrato e proteína juntos — ajuda a repor após exercício ou hipoglicemia.'),
];

// Build full records (slug ids + image prompt + empty image).
const buildPrompt = r => `Realistic top-down food photograph of "${r.title}": ${r.description} ` +
  `Served on a simple white ceramic plate or bowl on a light wooden table, bright natural daylight, ` +
  `fresh and appetizing, healthy home-cooked Brazilian meal, professional food photography, high detail, shallow depth of field.`;

const recipes = RAW.map(x => ({
  id: slug(x.title),
  title: x.title,
  description: x.description,
  image_url: '',
  image_prompt: buildPrompt(x),
  meal_slots: x.meal_slots,
  categories: x.categories,
  allergens: x.allergens,
  prep_minutes: x.prep_minutes,
  difficulty: x.difficulty,
  ingredients: x.ingredients,
  steps: x.steps,
  nutrition: x.nutrition,
  diabetes_notes: x.diabetes_notes,
  tags: [],
}));

// ── Coverage validation ──────────────────────────────────────────────────────
const CATS = ['equilibrada','baixo_indice_glicemico','rica_fibra','rica_proteina','baixo_carbo','carbo_complexo','pos_hipo','pos_hiper','lanche_leve'];
const NEED = ['cafe_da_manha','almoco','jantar'];
console.log(`\nTotal recipes: ${recipes.length}`);
const dupIds = recipes.map(r => r.id).filter((v,i,a)=>a.indexOf(v)!==i);
if (dupIds.length) console.log('!! DUPLICATE IDS:', dupIds);
let gaps = 0;
for (const c of CATS) {
  const have = NEED.filter(slot => recipes.some(r => r.categories.includes(c) && r.meal_slots.includes(slot)));
  const missing = NEED.filter(s => !have.includes(s));
  console.log(`  ${c.padEnd(24)} café/almoço/jantar -> ${missing.length ? 'FALTA: '+missing.join(',') : 'OK'}`);
  gaps += missing.length;
}
console.log(`Coverage gaps: ${gaps}`);
const noAllergen = recipes.filter(r => r.allergens.length === 0).length;
console.log(`Allergen-free recipes: ${noAllergen}`);

// ── Write reference JSON ─────────────────────────────────────────────────────
const outDir = path.join(root, 'docs/recipes');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'recipes-v3.json'), JSON.stringify(recipes, null, 2));
console.log(`\nWrote docs/recipes/recipes-v3.json`);

if (process.argv.includes('--write-only')) { console.log('write-only: skipping DB.'); process.exit(0); }

// ── Reset DB + storage, then insert ──────────────────────────────────────────
const run = async () => {
  // clear storage bucket
  const { data: files } = await supabase.storage.from('recipe-images').list('', { limit: 1000 });
  if (files && files.length) {
    await supabase.storage.from('recipe-images').remove(files.map(f => f.name));
    console.log(`Cleared ${files.length} storage images.`);
  }
  // wipe table
  await supabase.from('recipes').delete().neq('id', '');
  console.log('Cleared recipes table.');
  // insert
  let inserted = 0;
  for (let i = 0; i < recipes.length; i += 25) {
    const batch = recipes.slice(i, i + 25);
    const { error } = await supabase.from('recipes').insert(batch);
    if (error) console.error('  ! insert error:', error.message);
    else { inserted += batch.length; console.log(`  ✓ inserted ${inserted}/${recipes.length}`); }
  }
  const { count } = await supabase.from('recipes').select('*', { count: 'exact', head: true });
  console.log(`DONE. recipes table now has ${count} rows.`);
};
run();
