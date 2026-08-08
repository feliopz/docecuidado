-- ============================================================================
-- Doce Cuidado — seed do quiz (tabela public.quiz_questions)
-- Equipe Synapse · gerado a partir de docs/content/licoes.md
--
-- Regra de escrita das explicações (docs/content/GUIA_DE_LINGUAGEM.md):
-- a explicação da resposta errada NUNCA culpa quem errou. Ela corrige o fato
-- e devolve a informação certa.
--
-- Conduta clínica: SBEM-SP, Guia educacional para população: Diabetes, 2025,
-- ISBN 978-65-986752-1-9.
-- Rodar com service_role. Idempotente: upsert por id.
-- ============================================================================

insert into public.quiz_questions
  (id, question, options, correct_index, explanation_correct, explanation_wrong, order_index) values

('q-hipo-primeiro-passo',
 'A criança está tremendo, suando frio e diz que está com muita fome. Qual o primeiro passo?',
 '["Oferecer 15 g de carboidrato de ação rápida e medir de novo em 15 minutos","Esperar meia hora para ver se melhora sozinho","Oferecer uma refeição completa com arroz e feijão","Aplicar insulina para estabilizar"]'::jsonb,
 0,
 'Isso mesmo. Esses são sinais clássicos de hipoglicemia: 15 g de carboidrato rápido e nova medida em 15 minutos.',
 'A conduta na hipoglicemia é oferecer 15 g de carboidrato de ação rápida e medir de novo em 15 minutos. Esperar deixa a glicemia cair mais, e insulina baixaria ainda mais a glicose.',
 1),

('q-regra-15',
 'Depois de oferecer o suco numa hipoglicemia, quanto tempo esperar antes de medir de novo?',
 '["5 minutos","15 minutos","1 hora","Não precisa medir de novo"]'::jsonb,
 1,
 'Exato. É a regra dos 15: 15 g de carboidrato, 15 minutos de espera, nova medida — e repetir se ainda estiver baixa.',
 'O intervalo recomendado é de 15 minutos. Menos que isso não dá tempo do carboidrato agir; muito mais que isso atrasa uma nova correção se for necessária.',
 2),

('q-hipo-inconsciente',
 'A criança está desacordada e não responde. O que fazer?',
 '["Colocar açúcar embaixo da língua","Dar suco aos poucos, com cuidado","Não dar nada pela boca e ligar 192 imediatamente","Deitar de lado e esperar acordar"]'::jsonb,
 2,
 'Correto. Quem está sem consciência ou sem conseguir engolir pode engasgar. Nada pela boca — acione o 192 na hora.',
 'Nessa situação não se oferece nada pela boca, nem líquido nem açúcar: há risco de engasgo. O certo é ligar 192 imediatamente.',
 3),

('q-sinais-hipo',
 'Qual destes NÃO é um sinal típico de hipoglicemia?',
 '["Tremores e suor frio","Hálito com cheiro de acetona","Fome intensa","Confusão e irritação"]'::jsonb,
 1,
 'Isso. Hálito com cheiro de acetona aponta para o lado oposto: falta de insulina e presença de cetonas.',
 'Tremor, suor frio, fome intensa e confusão são sinais de hipoglicemia. Hálito de acetona não é: ele sugere cetonas, e pede avaliação de urgência.',
 4),

('q-emocao',
 'A glicemia subiu e a criança não comeu nada diferente. Isso é possível?',
 '["Não, glicemia só sobe com comida","Sim — emoção forte, estresse e doença também elevam a glicemia","Só se o aparelho estiver com defeito","Só em adultos"]'::jsonb,
 1,
 'Sim. Raiva, susto, ansiedade, febre e infecção liberam energia extra e elevam a glicose mesmo sem comida.',
 'A comida não é a única causa. Emoções fortes, estresse, febre e crescimento também elevam a glicemia — por isso vale anotar o contexto, não só o número.',
 5),

('q-sensor-hipo',
 'O sensor marca 62 mg/dL, mas a criança está brincando normalmente e sem sintomas. O que fazer?',
 '["Tratar como hipoglicemia na hora","Confirmar na ponta de dedo antes de tratar","Ignorar, porque ela está bem","Trocar o sensor imediatamente"]'::jsonb,
 1,
 'Correto. O sensor lê o líquido entre as células e vem com atraso; a ponta de dedo confirma o que está acontecendo agora.',
 'O melhor caminho é confirmar na ponta de dedo. O sensor tem atraso em relação ao sangue e pode marcar baixo por compressão — mas ignorar um valor baixo também não é seguro.',
 6),

('q-cetoacidose',
 'Respiração rápida e profunda, hálito adocicado e vômitos que não param. O que isso sugere?',
 '["Hipoglicemia grave","Possível cetoacidose — procurar emergência","Virose comum, é só hidratar","Reação normal a glicemia alta"]'::jsonb,
 1,
 'Isso mesmo. Esse conjunto sugere cetoacidose diabética, que é emergência: procure atendimento imediatamente.',
 'Esse conjunto de sinais sugere cetoacidose diabética, uma emergência. Não é quadro para observar em casa: procure atendimento imediatamente.',
 7),

('q-bolo',
 'Uma criança com diabetes tipo 1 pode comer bolo de aniversário?',
 '["Não, açúcar é proibido","Só se for versão diet","Pode, com a contagem e a insulina orientadas pela equipe de saúde","Só uma vez por ano"]'::jsonb,
 2,
 'Isso. Não há alimento proibido: o que se ajusta é a porção e a dose, conforme a orientação da equipe.',
 'Não existe alimento proibido no tipo 1. Com contagem de carboidratos e a insulina orientada pela equipe de saúde, a criança come de tudo — inclusive bolo de aniversário.',
 8),

('q-insulina-guarda',
 'Onde guardar um frasco de insulina que ainda NÃO foi aberto?',
 '["Na porta da geladeira","Na geladeira, parte central, entre 2 °C e 8 °C","No congelador","Em cima da mesa, em temperatura ambiente"]'::jsonb,
 1,
 'Correto. Frasco fechado vai na parte central da geladeira, entre 2 °C e 8 °C — a porta varia demais de temperatura.',
 'Frasco fechado vai na geladeira entre 2 °C e 8 °C, na parte central. A porta oscila de temperatura, e o congelador inutiliza a insulina. Depois de aberto, o frasco em uso costuma ficar em temperatura ambiente por cerca de 28 dias — confira a bula.',
 9),

('q-mito-doce',
 'Um colega pergunta se a criança ficou com diabetes por comer muito doce. Qual resposta está correta?',
 '["Sim, doce em excesso causa diabetes tipo 1","Não — no tipo 1 o corpo para de produzir insulina","Só se já houver obesidade","Sim, mas só em criança"]'::jsonb,
 1,
 'Exato. No tipo 1 o corpo deixa de produzir insulina. Nenhuma escolha alimentar da família causou isso.',
 'Comer doce não causa diabetes tipo 1. Nessa condição o corpo para de produzir insulina — e nenhuma escolha alimentar da família provocou o diagnóstico.',
 10),

('q-pedir-ajuda',
 'Você está exausto e alguém da família se oferece para dividir as madrugadas. O que fazer?',
 '["Recusar, porque o cuidado é responsabilidade sua","Aceitar e ensinar essa pessoa — dividir faz parte do tratamento","Aceitar só se a glicemia estiver difícil","Recusar para não assustar a pessoa"]'::jsonb,
 1,
 'Isso. Ter mais de um adulto treinado protege a criança e protege você. Pedir ajuda é parte do cuidado, não falha.',
 'O melhor caminho é aceitar e treinar essa pessoa. Ter só um adulto capaz de medir e aplicar é frágil para a criança e insustentável para quem cuida.',
 11),

('q-dose-nao-funcionou',
 'A glicemia não desce mesmo depois da correção orientada. O que verificar antes de repetir?',
 '["O caminho da insulina: local de aplicação, agulha, validade e armazenamento","Nada, é só repetir a dose","Se a criança comeu escondido","Trocar a marca da insulina por conta própria"]'::jsonb,
 0,
 'Correto. Sítio que não absorve, agulha entupida, caneta quase vazia ou insulina guardada errado dão o mesmo resultado de uma dose insuficiente.',
 'Antes de repetir, vale conferir o caminho da insulina: local de aplicação, agulha, quantidade na caneta, validade e armazenamento. Repetir dose por conta própria ou trocar a insulina sem orientação não é seguro — fale com a equipe de saúde.',
 12)

on conflict (id) do update set
  question            = excluded.question,
  options             = excluded.options,
  correct_index       = excluded.correct_index,
  explanation_correct = excluded.explanation_correct,
  explanation_wrong   = excluded.explanation_wrong,
  order_index         = excluded.order_index;
