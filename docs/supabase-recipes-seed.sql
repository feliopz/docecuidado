-- Doce Cuidado — Recipes Table + Seed Data
-- Paste AFTER the schema SQL (supabase-schema.sql) in Supabase SQL Editor.

-- ── Recipes table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  meal_slots TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  allergens TEXT[] DEFAULT '{}',
  prep_minutes INT DEFAULT 30,
  difficulty TEXT DEFAULT 'facil',
  ingredients TEXT[] DEFAULT '{}',
  steps TEXT[] DEFAULT '{}',
  nutrition JSONB DEFAULT '{}',
  diabetes_notes TEXT,
  tags TEXT[] DEFAULT '{}'
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "anon_all_recipes" ON recipes FOR ALL USING (true) WITH CHECK (true);

-- ── Seed: 12 starter recipes ─────────────────────────────────────────────────
INSERT INTO recipes (id, title, description, image_url, meal_slots, categories, allergens, prep_minutes, difficulty, ingredients, steps, nutrition, diabetes_notes, tags)
VALUES

-- 1. Omelete de vegetais
('omelete-vegetais',
 'Omelete de Vegetais',
 'Omelete fofa com abobrinha, cenoura e queijo cottage. Rica em proteína, poucos carboidratos e de preparo rápido.',
 NULL,
 ARRAY['cafe_da_manha','lanche'],
 ARRAY['baixo_carbo','rica_proteina','equilibrada'],
 ARRAY['ovo'],
 15, 'facil',
 ARRAY['2 ovos', '2 colheres de abobrinha ralada', '2 colheres de cenoura ralada', '2 colheres de queijo cottage', 'Sal e azeite a gosto'],
 ARRAY['Bata os ovos com sal.', 'Misture os vegetais ralados.', 'Aqueça uma frigideira antiaderente com azeite.', 'Despeje a mistura e cozinhe em fogo médio por 3 min.', 'Dobre ao meio e sirva quente.'],
 '{"servings":1,"calories":180,"carbs_g":5,"protein_g":16,"fat_g":11,"glycemic_index":"baixo"}'::jsonb,
 'Omelete é uma das melhores opções para crianças com DM1: riquíssimo em proteína, estabiliza a glicemia e não tem carboidratos suficientes para elevá-la rapidamente.',
 ARRAY['café','proteina','rápido']
),

-- 2. Aveia com frutas vermelhas
('aveia-frutas-vermelhas',
 'Aveia com Frutas Vermelhas',
 'Mingau de aveia com morangos e mirtilos. Fibras que retardam a absorção de glicose — ótimo para o café da manhã.',
 NULL,
 ARRAY['cafe_da_manha'],
 ARRAY['rica_fibra','baixo_indice_glicemico','equilibrada'],
 ARRAY['leite'],
 10, 'facil',
 ARRAY['5 colheres de aveia em flocos', '200 ml de leite desnatado (ou bebida vegetal)', '6 morangos cortados', '1 colher de chia', 'Adoçante culinário a gosto'],
 ARRAY['Ferva o leite e adicione a aveia.', 'Cozinhe por 5 min mexendo sempre.', 'Adicione a chia e mexa.', 'Sirva com os morangos por cima.'],
 '{"servings":1,"calories":220,"carbs_g":32,"protein_g":9,"fat_g":5,"fiber_g":6,"glycemic_index":"baixo"}'::jsonb,
 'A aveia tem beta-glucana, uma fibra que reduz a velocidade de absorção de carboidratos. Prefira aveia em flocos (não instantânea) — o índice glicêmico é mais baixo.',
 ARRAY['café','fibra','aveia']
),

-- 3. Frango grelhado com arroz integral e brócolis
('frango-arroz-brocolis',
 'Frango Grelhado com Arroz Integral e Brócolis',
 'Almoço completo e equilibrado. O arroz integral libera energia lentamente e o brócolis é rico em fibras e vitaminas.',
 NULL,
 ARRAY['almoco'],
 ARRAY['equilibrada','rica_proteina','carbo_complexo'],
 ARRAY[],
 35, 'media',
 ARRAY['1 filé de frango (120g)', '4 colheres de arroz integral cozido', '1 xícara de brócolis no vapor', 'Azeite, sal, alho e limão a gosto'],
 ARRAY['Tempere o frango com sal, alho e limão.', 'Grelhe por 6 min de cada lado.', 'Cozinhe o brócolis no vapor por 5 min.', 'Sirva com o arroz integral.'],
 '{"servings":1,"calories":380,"carbs_g":35,"protein_g":32,"fat_g":8,"fiber_g":4,"glycemic_index":"baixo"}'::jsonb,
 'Arroz integral tem índice glicêmico menor que o branco. O frango sem pele é a proteína mais indicada: não interfere na glicemia e ajuda na saciedade.',
 ARRAY['almoço','proteina','integral']
),

-- 4. Sopa de lentilha
('sopa-lentilha',
 'Sopa de Lentilha com Legumes',
 'Sopa quente e nutritiva. A lentilha é uma das leguminosas com menor índice glicêmico e altamente saciante.',
 NULL,
 ARRAY['almoco','jantar'],
 ARRAY['baixo_indice_glicemico','rica_fibra','rica_proteina'],
 ARRAY[],
 40, 'media',
 ARRAY['1 xícara de lentilha', '1 cenoura em cubos', '2 talos de salsão', '1 tomate', '1 cebola', 'Sal, azeite e temperos a gosto'],
 ARRAY['Refogue a cebola no azeite.', 'Adicione os legumes e refogue 3 min.', 'Adicione a lentilha e 600 ml de água.', 'Cozinhe em fogo médio por 30 min.', 'Tempere e sirva.'],
 '{"servings":2,"calories":290,"carbs_g":40,"protein_g":18,"fat_g":5,"fiber_g":10,"glycemic_index":"baixo"}'::jsonb,
 'Lentilha tem índice glicêmico de apenas 32 — um dos mais baixos entre os alimentos com carboidratos. Rica em proteína vegetal, ferro e fibras. Excelente para crianças com DM1.',
 ARRAY['sopa','lentilha','inverno']
),

-- 5. Wrap de frango com salada
('wrap-frango',
 'Wrap Integral de Frango com Salada',
 'Wrap leve com peito de frango desfiado, alface, tomate e pasta de abacate. Rápido e nutritivo para o almoço.',
 NULL,
 ARRAY['almoco','lanche'],
 ARRAY['equilibrada','rica_proteina'],
 ARRAY['gluten'],
 20, 'facil',
 ARRAY['1 tortilha integral', '80g de peito de frango desfiado', '2 folhas de alface', '4 rodelas de tomate', '2 colheres de pasta de abacate (ou abacate amassado)', 'Sal e limão a gosto'],
 ARRAY['Espalhe o abacate na tortilha.', 'Distribua o frango, a alface e o tomate.', 'Tempere com sal e limão.', 'Enrole e sirva imediatamente.'],
 '{"servings":1,"calories":320,"carbs_g":28,"protein_g":28,"fat_g":10,"glycemic_index":"médio"}'::jsonb,
 'A gordura do abacate retarda a absorção dos carboidratos da tortilha, ajudando a controlar o pico de glicemia pós-refeição.',
 ARRAY['almoço','rápido','wrap']
),

-- 6. Panqueca de banana com aveia
('panqueca-banana-aveia',
 'Panqueca de Banana com Aveia',
 'Panqueca sem farinha de trigo, feita só com banana, aveia e ovo. Doce naturalmente — sem açúcar adicionado.',
 NULL,
 ARRAY['cafe_da_manha','lanche'],
 ARRAY['baixo_indice_glicemico','rica_fibra'],
 ARRAY['ovo'],
 15, 'facil',
 ARRAY['1 banana madura amassada', '3 colheres de aveia em flocos', '1 ovo', 'Canela a gosto', 'Óleo de coco para untar'],
 ARRAY['Misture a banana amassada, o ovo e a aveia.', 'Adicione canela a gosto.', 'Aqueça uma frigideira untada em fogo baixo.', 'Despeje pequenas porções e cozinhe 2 min de cada lado.'],
 '{"servings":1,"calories":240,"carbs_g":34,"protein_g":9,"fat_g":6,"fiber_g":4,"glycemic_index":"médio"}'::jsonb,
 'A banana madura tem índice glicêmico mais alto — prefira bananas ainda ligeiramente verdes. A aveia e o ovo compensam com fibra e proteína, moderando o pico de glicemia.',
 ARRAY['café','doce','sem-açucar']
),

-- 7. Iogurte grego com chia e nozes
('iogurte-chia-nozes',
 'Iogurte Grego com Chia e Nozes',
 'Lanche rápido, proteico e sem carboidratos de alto índice glicêmico. Ótimo entre refeições.',
 NULL,
 ARRAY['lanche'],
 ARRAY['rica_proteina','baixo_carbo','equilibrada'],
 ARRAY['leite','castanhas'],
 5, 'facil',
 ARRAY['1 pote de iogurte grego natural (sem açúcar, 130g)', '1 colher de chia', '6 nozes ou castanhas', 'Canela a gosto'],
 ARRAY['Coloque o iogurte em um pote.', 'Adicione a chia e misture levemente.', 'Coloque as nozes por cima.', 'Polvilhe canela e sirva.'],
 '{"servings":1,"calories":220,"carbs_g":12,"protein_g":16,"fat_g":12,"glycemic_index":"baixo"}'::jsonb,
 'Iogurte grego natural tem o dobro de proteína do iogurte comum e muito menos carboidrato. Confirme no rótulo que não tem açúcar adicionado.',
 ARRAY['lanche','proteina','rápido']
),

-- 8. Macarrão integral com molho de tomate caseiro
('macarrao-integral-tomate',
 'Macarrão Integral com Molho de Tomate Caseiro',
 'Massa integral ao molho de tomate fresco com ervas. Carboidrato complexo que libera energia de forma gradual.',
 NULL,
 ARRAY['almoco','jantar'],
 ARRAY['carbo_complexo','equilibrada'],
 ARRAY['gluten'],
 30, 'media',
 ARRAY['80g de macarrão integral', '3 tomates maduros picados', '2 dentes de alho', '1/2 cebola', 'Manjericão, sal e azeite a gosto'],
 ARRAY['Cozinhe o macarrão al dente conforme a embalagem.', 'Refogue o alho e a cebola no azeite.', 'Adicione o tomate e cozinhe por 15 min.', 'Tempere com sal e manjericão.', 'Misture com a massa e sirva.'],
 '{"servings":1,"calories":340,"carbs_g":58,"protein_g":11,"fat_g":7,"fiber_g":6,"glycemic_index":"médio"}'::jsonb,
 'O macarrão integral tem índice glicêmico 20 pontos menor que o convencional. Cozinhe al dente: a massa mais firme é digerida mais lentamente, elevando a glicemia com menos velocidade.',
 ARRAY['jantar','integral','macarrão']
),

-- 9. Filé de peixe com batata-doce e salada
('peixe-batata-doce',
 'Filé de Peixe com Batata-Doce Assada',
 'Peixe grelhado com batata-doce: combinação equilibrada de proteína magra e carboidrato de baixo índice glicêmico.',
 NULL,
 ARRAY['almoco','jantar'],
 ARRAY['baixo_indice_glicemico','rica_proteina','equilibrada'],
 ARRAY['peixe'],
 35, 'media',
 ARRAY['1 filé de tilápia ou merluza (120g)', '1 batata-doce média', 'Azeite, sal, alho e ervas a gosto', 'Folhas verdes para salada'],
 ARRAY['Corte a batata-doce em rodelas e asse com azeite a 200°C por 25 min.', 'Tempere o peixe com sal, alho e ervas.', 'Grelhe o peixe por 4 min de cada lado.', 'Sirva com a batata-doce e a salada.'],
 '{"servings":1,"calories":350,"carbs_g":30,"protein_g":30,"fat_g":9,"fiber_g":4,"glycemic_index":"baixo"}'::jsonb,
 'Batata-doce tem índice glicêmico significativamente menor que a batata inglesa. O peixe é uma proteína magra excelente para crianças.',
 ARRAY['jantar','peixe','batata-doce']
),

-- 10. Vitamina de abacate (sem açúcar)
('vitamina-abacate',
 'Vitamina de Abacate Cremosa',
 'Vitamina cremosa com abacate, leite e cacau — sem açúcar adicionado. Rica em gordura boa que retarda a glicemia.',
 NULL,
 ARRAY['lanche','cafe_da_manha'],
 ARRAY['baixo_carbo','equilibrada'],
 ARRAY['leite'],
 5, 'facil',
 ARRAY['1/4 de abacate maduro', '200 ml de leite (ou bebida vegetal)', '1 colher de cacau em pó (sem açúcar)', 'Adoçante culinário a gosto', 'Gelo a gosto'],
 ARRAY['Coloque todos os ingredientes no liquidificador.', 'Bata até ficar homogêneo.', 'Sirva gelado.'],
 '{"servings":1,"calories":250,"carbs_g":14,"protein_g":6,"fat_g":18,"glycemic_index":"baixo"}'::jsonb,
 'Abacate tem gordura monoinsaturada que retarda a absorção de carboidratos. O cacau em pó puro (não achocolatado) tem pouquíssimo açúcar e é rico em antioxidantes.',
 ARRAY['lanche','bebida','abacate']
),

-- 11. Arroz de couve-flor com frango
('arroz-couve-flor-frango',
 'Arroz de Couve-Flor com Frango',
 'Substituto do arroz tradicional com muito menos carboidrato. Crocante, gostoso e aprovado pelas crianças.',
 NULL,
 ARRAY['almoco','jantar'],
 ARRAY['baixo_carbo','rica_proteina','pos_hiper'],
 ARRAY[],
 25, 'media',
 ARRAY['1/2 couve-flor (processada em pedaços pequenos)', '100g de frango desfiado', '1 ovo', '2 dentes de alho', 'Sal, cebolinha e azeite a gosto'],
 ARRAY['Processe a couve-flor até virar "graõzinhos" (tamanho de arroz).', 'Refogue o alho no azeite.', 'Adicione o frango desfiado e misture.', 'Adicione a couve-flor e refogue por 5 min.', 'Abra espaço no centro, adicione o ovo e mexa até incorporar.', 'Finalize com cebolinha e sal.'],
 '{"servings":2,"calories":230,"carbs_g":12,"protein_g":26,"fat_g":9,"fiber_g":5,"glycemic_index":"baixo"}'::jsonb,
 'A couve-flor tem apenas 5g de carboidrato por 100g (vs 25g do arroz). Uma opção excelente para dias com glicemia elevada, sem abrir mão do "arroz com frango" favorito das crianças.',
 ARRAY['jantar','baixo-carbo','couve-flor']
),

-- 12. Feijão tropeiro simplificado
('feijao-tropeiro',
 'Feijão Tropeiro Leve',
 'Versão leve do feijão tropeiro com ovos mexidos e couve. Rico em fibra, proteína e ferro.',
 NULL,
 ARRAY['almoco','jantar'],
 ARRAY['rica_fibra','rica_proteina','equilibrada'],
 ARRAY['ovo'],
 25, 'media',
 ARRAY['1 xícara de feijão cozido', '2 ovos', '1/4 de xícara de farinha de mandioca torrada', '2 folhas de couve fatiadas', 'Sal, alho e azeite a gosto'],
 ARRAY['Refogue o alho no azeite.', 'Adicione o feijão já cozido e misture.', 'Empurre para um lado da panela e faça os ovos mexidos.', 'Misture tudo, adicione a couve e a farinha.', 'Misture bem, ajuste o sal e sirva.'],
 '{"servings":2,"calories":320,"carbs_g":42,"protein_g":18,"fat_g":9,"fiber_g":9,"glycemic_index":"baixo"}'::jsonb,
 'O feijão tem índice glicêmico baixo graças às fibras. A couve é rica em vitamina K e ferro. A farinha de mandioca tem mais impacto glicêmico — use com moderação.',
 ARRAY['almoço','feijão','proteina']
)

ON CONFLICT (id) DO NOTHING;

-- ── Coluna de prompt para geração de imagens ────────────────────────────────
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_prompt TEXT;

-- ── Storage: bucket público para fotos das receitas ─────────────────────────
-- Rode uma vez. Depois disso, o recipes-admin.html faz upload direto.
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY IF NOT EXISTS "recipe_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-images');

CREATE POLICY IF NOT EXISTS "recipe_images_anon_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'recipe-images');

CREATE POLICY IF NOT EXISTS "recipe_images_anon_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'recipe-images');

CREATE POLICY IF NOT EXISTS "recipe_images_anon_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'recipe-images');
