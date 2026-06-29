import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, fontSize, spacing } from '../../constants/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import Icon, { IconName } from '../../components/Icon';
import { getChild, getLessonProgress } from '../../lib/store';
import { saveLessonProgressDB, fetchLessonProgressDB } from '../../lib/supabase-db';

interface Lesson {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  content: string;
}

const LESSONS: Lesson[] = [
  {
    id: 'hipo',
    icon: 'warning',
    title: 'Reconhecendo a Hipoglicemia',
    description: 'Tremor, suor frio, tontura — saiba identificar os sinais antes que piore.',
    content:
      'Glicose abaixo de 70 mg/dL.\n\nSinais:\n• Tremor\n• Suor frio\n• Tontura\n• Fome intensa\n• Confusão\n\nO que fazer:\n1. Oferecer 15g de carboidrato rápido (meio copo de suco, 1 colher de mel)\n2. Medir em 15 minutos\n3. Se não subir, repetir\n4. Se a criança estiver inconsciente: NÃO dê nada pela boca, ligue 192',
  },
  {
    id: 'hiper',
    icon: 'thermometer',
    title: 'Hiperglicemia: o que fazer',
    description: 'Muita sede, muito xixi, cansaço. Entenda quando é hora de agir.',
    content:
      'Glicose acima de 180 mg/dL.\n\nSinais:\n• Muita sede\n• Urina frequente\n• Cansaço\n• Visão turva\n\nO que fazer:\n1. Beber água\n2. Verificar se a insulina foi aplicada corretamente\n3. Evitar alimentos com muito carboidrato\n4. Se persistir por mais de 4h ou se houver vômito: procurar atendimento médico',
  },
  {
    id: 'ceto',
    icon: 'emergency',
    title: 'Cetoacidose: sinais de alerta',
    description: 'Hálito de maçã, respiração rápida, vômito. Emergência — saiba reconhecer.',
    content:
      'EMERGÊNCIA\n\nSinais:\n• Hálito de maçã/acetona\n• Respiração rápida e profunda\n• Náusea/vômito\n• Dor abdominal\n• Confusão, sonolência\n\nA cetoacidose pode ser a primeira manifestação do diabetes em crianças não diagnosticadas.\n\nO que fazer:\nLEVE AO PRONTO-SOCORRO IMEDIATAMENTE\n\nÉ uma emergência que precisa de tratamento hospitalar. Não tente tratar em casa.',
  },
  {
    id: 'carboidratos',
    icon: 'nutrition',
    title: 'Contagem de Carboidratos',
    description: 'Aprenda a calcular carbs nas refeições e entenda como eles afetam a glicemia.',
    content:
      'Carboidratos elevam a glicemia.\n\nFontes comuns:\n• Arroz, massas, pães: ~15g por porção\n• Frutas: 10-20g por unidade média\n• Sucos: 20-30g por copo\n• Leite: 12g por copo\n\nComo contar:\n1. Leia o rótulo (porção x gramas de carbo)\n2. Use tabelas TACO para alimentos sem rótulo\n3. Anote junto com a glicemia para aprender padrões\n\nDica: cada família é diferente. O endocrinologista ajuda a calibrar a relação insulina/carbo.',
  },
  {
    id: 'insulina-aplicacao',
    icon: 'insulin',
    title: 'Aplicando a Insulina Corretamente',
    description: 'Técnica certa, local certo, hora certa. Detalhes que fazem diferença.',
    content:
      'Técnica de aplicação:\n1. Lave as mãos\n2. Limpe o local com álcool e deixe secar\n3. Faça uma prega na pele (para crianças)\n4. Insira a agulha em 45 graus\n5. Injete devagar\n6. Conte até 10 antes de retirar\n\nRotação dos locais:\n• Abdômen: absorção mais rápida\n• Coxas: absorção moderada\n• Braço: evitar em crianças pequenas\n\nImportante:\n• Nunca reutilize a agulha\n• Guarde a insulina em uso em temperatura ambiente\n• Insulina refrigerada (não aberta) dura até a validade',
  },
  {
    id: 'diabetes-escola',
    icon: 'learn',
    title: 'Diabetes na Escola',
    description: 'Como orientar professores, lidar com festas e garantir segurança na escola.',
    content:
      'Comunicar é fundamental:\n• Fale com a direção e com o professor da turma\n• Entregue um "Plano de Ação" por escrito com sinais de hipo e o que fazer\n• Autorize a escola a medir a glicemia se necessário\n\nMateriais na escola:\n• Glicosímetro e fitas\n• Carboidrato rápido (suco, bala de glicose)\n• Glucagon (se prescrito pelo médico)\n\nFestas e lanches:\n• A criança pode participar! Com planejamento.\n• Avise com antecedência para saber o cardápio\n• Meça antes e depois\n\nDireitos:\n• A escola é obrigada por lei a aceitar a criança com diabetes\n• Em caso de discriminação, procure o Conselho Tutelar',
  },
  {
    id: 'sus-insumos',
    icon: 'cart',
    title: 'Onde Consigo (SUS)',
    description: 'Insulinas, fitas e insumos gratuitos pelo SUS — onde e como conseguir.',
    content:
      'O SUS garante insumos para o tratamento. Onde conseguir:\n\n• Insulina NPH e Regular: Farmácia Popular (gratuito com receita)\n• Fitas de glicemia: Farmácia do Estado (cerca de 30/mês)\n• Glargina (Lantus): fornecida pelo Estado mediante processo\n• Seringas e agulhas: Farmácia Popular / Unidade Básica de Saúde\n\nComo solicitar:\n1. Tenha a receita médica atualizada (com CID E10)\n2. Cadastre-se na Farmácia Popular com CPF e receita\n3. Para itens do Estado, abra processo na Secretaria de Saúde\n\nImportante:\n• A bomba de insulina geralmente NÃO é fornecida pelo SUS\n• Em caso de negativa, é possível recorrer via Defensoria Pública\n• Guarde sempre cópias das receitas e protocolos',
  },
];

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanationCorrect: string;
  explanationWrong: string;
}

const QUIZ: QuizQuestion[] = [
  {
    question: 'A criança tomou insulina há 1h e está tremendo e suada. O que fazer primeiro?',
    options: [
      'Oferecer 15g de carboidrato rápido (suco, mel)',
      'Esperar mais 30 minutos para ver se passa',
      'Aplicar mais insulina',
      'Colocar para dormir',
    ],
    correctIndex: 0,
    explanationCorrect: 'Isso mesmo! Tremor e suor após insulina são sinais clássicos de hipoglicemia. Carboidrato rápido é a primeira ação.',
    explanationWrong: 'Tremor e suor após insulina indicam hipoglicemia. O correto é oferecer carboidrato rápido e medir em 15 min.',
  },
  {
    question: 'A glicemia da criança está em 250 mg/dL há 3 horas. O que fazer?',
    options: [
      'Dar mais açúcar para compensar',
      'Oferecer água e verificar se a insulina foi aplicada',
      'Não fazer nada, é normal',
      'Aplicar o dobro da insulina',
    ],
    correctIndex: 1,
    explanationCorrect: 'Correto! Hidratar e verificar a insulina são os primeiros passos. Se persistir, converse com o médico.',
    explanationWrong: 'Na hiperglicemia, o correto é hidratar (água) e verificar se a insulina foi aplicada corretamente. Nunca ajuste a dose por conta própria.',
  },
  {
    question: 'A criança está com hálito de maçã e respiração rápida. O que fazer?',
    options: [
      'Oferecer suco de laranja',
      'Esperar e observar',
      'Levar ao pronto-socorro imediatamente',
      'Aplicar insulina extra',
    ],
    correctIndex: 2,
    explanationCorrect: 'Exato! Esses são sinais de cetoacidose diabética — uma emergência que precisa de hospital.',
    explanationWrong: 'Hálito de maçã + respiração rápida = possível cetoacidose. É EMERGÊNCIA — leve ao pronto-socorro imediatamente.',
  },
  {
    question: 'Qual é a melhor região para injetar insulina de absorção rápida?',
    options: [
      'Braço',
      'Coxa',
      'Abdômen',
      'Costas',
    ],
    correctIndex: 2,
    explanationCorrect: 'Correto! O abdômen tem a absorção mais rápida e previsível para insulinas de ação rápida.',
    explanationWrong: 'O abdômen tem a absorção mais rápida. Coxas são para basal. O braço é menos recomendado para crianças pequenas.',
  },
  {
    question: 'Quanto tempo deve-se esperar para medir a glicemia após tratar uma hipoglicemia?',
    options: [
      '5 minutos',
      '30 minutos',
      '15 minutos',
      '1 hora',
    ],
    correctIndex: 2,
    explanationCorrect: 'Exato! A regra do 15/15: 15g de carbo rápido, medir em 15 minutos.',
    explanationWrong: 'A regra é 15/15: 15g de carboidrato rápido e medir novamente em 15 minutos para ver se subiu.',
  },
];

type Screen = 'list' | 'lesson' | 'quiz';

export default function Aprender() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('list');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [childId, setChildId] = useState<string>('local');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const child = await getChild();
        const id = child?.id ?? 'local';
        setChildId(id);
        const progress = await fetchLessonProgressDB(id);
        setCompletedLessons(progress);
      })();
    }, []),
  );

  const openLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setScreen('lesson');
  };

  const completeLesson = async (lesson: Lesson) => {
    if (!completedLessons.includes(lesson.id)) {
      await saveLessonProgressDB(childId, {
        lesson_id: lesson.id,
        completed_at: new Date().toISOString(),
      });
      setCompletedLessons(prev => [...prev, lesson.id]);
    }
    setScreen('list');
  };

  const startQuiz = () => {
    setQuizIndex(0);
    setAnswered(null);
    setScore(0);
    setQuizDone(false);
    setScreen('quiz');
  };

  const answerQuiz = (optionIdx: number) => {
    if (answered !== null) return;
    setAnswered(optionIdx);
    if (optionIdx === QUIZ[quizIndex].correctIndex) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (quizIndex + 1 < QUIZ.length) {
      setQuizIndex(i => i + 1);
      setAnswered(null);
    } else {
      setQuizDone(true);
    }
  };

  const progressNum = LESSONS.length > 0
    ? Math.round((completedLessons.length / LESSONS.length) * 100)
    : 0;

  if (screen === 'lesson' && activeLesson) {
    const isCompleted = completedLessons.includes(activeLesson.id);
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
      >
        <TouchableOpacity onPress={() => setScreen('list')} style={styles.backRow}>
          <Icon name='back' size={18} color={colors.text2} />
          <Text style={styles.back}>Voltar</Text>
        </TouchableOpacity>
        <Card>
          <View style={styles.lessonIconBox}>
            <Icon name={activeLesson.icon} size={48} color={colors.text2} />
          </View>
          <Text style={styles.lessonTitle}>{activeLesson.title}</Text>
          <Text style={styles.lessonContent}>{activeLesson.content}</Text>
          <Button
            title={isCompleted ? 'Concluído' : 'Marcar como concluído'}
            onPress={() => completeLesson(activeLesson)}
            style={{ marginTop: 16 }}
          />
          {isCompleted && (
            <Button
              title='Voltar'
              variant='outline'
              onPress={() => setScreen('list')}
              style={{ marginTop: 8 }}
            />
          )}
        </Card>
      </ScrollView>
    );
  }

  if (screen === 'quiz') {
    if (quizDone) {
      return (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
        >
          <View style={styles.quizResult}>
            <Icon name='trophy' size={64} color={score >= 4 ? colors.green : colors.yellow} />
            <Text style={styles.lessonTitle}>Quiz finalizado!</Text>
            <Text style={[styles.scoreText, { color: score >= 4 ? colors.green : colors.yellow }]}>
              {score}/{QUIZ.length} acertos
            </Text>
            <Text style={styles.quizFeedback}>
              {score === QUIZ.length
                ? 'Perfeito! Você já domina os cuidados.'
                : score >= 3
                  ? 'Bom! Continue práticando.'
                  : 'Sem culpa! Cada tentativa é aprendizado.'}
            </Text>
            <Button title="Repetir" onPress={startQuiz} style={{ marginTop: 16 }} />
            <Button title="Voltar" variant="outline" onPress={() => setScreen('list')} style={{ marginTop: 8 }} />
          </View>
        </ScrollView>
      );
    }

    const q = QUIZ[quizIndex];
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
      >
        <TouchableOpacity onPress={() => setScreen('list')} style={styles.backRow}>
          <Icon name='back' size={18} color={colors.text2} />
          <Text style={styles.back}>Voltar</Text>
        </TouchableOpacity>
        <Card>
          <Text style={styles.quizProgress}>{quizIndex + 1}/{QUIZ.length}</Text>
          <Text style={styles.quizQuestion}>{q.question}</Text>
          {q.options.map((opt, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.quizOption,
                answered !== null && i === q.correctIndex && styles.quizCorrect,
                answered === i && i !== q.correctIndex && styles.quizWrong,
              ]}
              onPress={() => answerQuiz(i)}
              disabled={answered !== null}
            >
              <Text style={styles.quizOptionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
          {answered !== null && (
            <View style={{ marginTop: 12 }}>
              <Text style={{
                color: answered === q.correctIndex ? colors.green : colors.red,
                fontSize: 14,
                lineHeight: 20,
              }}>
                {answered === q.correctIndex ? q.explanationCorrect : q.explanationWrong}
              </Text>
              <Button title="Próxima" onPress={nextQuestion} style={{ marginTop: 12 }} />
            </View>
          )}
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
    >
      <View style={styles.topbar}>
        <View style={styles.titleRow}>
          <Icon name='learn' size={20} color={colors.text2} />
          <Text style={styles.title}>Aprender</Text>
        </View>
        <View style={styles.avatar}>
          <Icon name='profile' size={20} color={colors.red} />
        </View>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>Seu progresso</Text>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{completedLessons.length}/{LESSONS.length} lições</Text>
        </View>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressNum}%` as `${number}%` }]} />
      </View>

      {LESSONS.map(lesson => {
        const done = completedLessons.includes(lesson.id);
        return (
          <TouchableOpacity key={lesson.id} onPress={() => openLesson(lesson)}>
            <Card style={[styles.lessonCard, done ? styles.lessonCardDone : null]}>
              <View style={styles.lessonCardRow}>
                <Icon name={lesson.icon} size={28} color={done ? colors.green : colors.text2} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.lessonCardTitle}>{lesson.title}</Text>
                  <Text style={styles.lessonCardDesc}>{lesson.description}</Text>
                </View>
                {done ? (
                  <Icon name='checkmark' size={20} color={colors.green} />
                ) : (
                  <Icon name='book' size={20} color={colors.text3} />
                )}
              </View>
            </Card>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity onPress={startQuiz}>
        <Card style={styles.lessonCard}>
          <View style={styles.lessonCardRow}>
            <Icon name='quiz' size={28} color={colors.yellow} />
            <View style={{ flex: 1 }}>
              <Text style={styles.lessonCardTitle}>Quiz: O que você já sabe?</Text>
              <Text style={styles.lessonCardDesc}>Teste seus conhecimentos com {QUIZ.length} perguntas práticas.</Text>
            </View>
            <Icon name='star' size={20} color={colors.yellow} />
          </View>
        </Card>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, padding: 12, borderRadius: radius.lg,
    marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.peach,
    justifyContent: 'center', alignItems: 'center',
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  back: { fontSize: 14, color: colors.text2, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  progressLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  progressBar: {
    height: 6, backgroundColor: '#E8E8E8', borderRadius: 3,
    marginBottom: 16, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.green, borderRadius: 3 },
  tag: { backgroundColor: colors.mint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 12, fontWeight: '600', color: '#1E8449' },
  lessonCard: { borderLeftWidth: 4, borderLeftColor: colors.sky2, marginBottom: 4 },
  lessonCardDone: { borderLeftColor: colors.green },
  lessonCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lessonCardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  lessonCardDesc: { fontSize: 13, color: colors.text2, lineHeight: 19 },
  lessonIconBox: { alignItems: 'center', marginBottom: 16 },
  lessonTitle: {
    fontSize: fontSize.xl, fontWeight: '700', color: colors.text,
    textAlign: 'center', marginBottom: 12,
  },
  lessonContent: { fontSize: 15, color: colors.text2, lineHeight: 24 },
  quizProgress: { fontSize: 13, color: colors.text3, textAlign: 'center', marginBottom: 8 },
  quizQuestion: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: 16, lineHeight: 24 },
  quizOption: {
    padding: 14, marginBottom: 8, borderWidth: 2, borderColor: colors.border,
    borderRadius: radius.md, backgroundColor: colors.card,
  },
  quizOptionText: { fontSize: 14, color: colors.text },
  quizCorrect: { borderColor: colors.green, backgroundColor: colors.mint },
  quizWrong: { borderColor: colors.red, backgroundColor: colors.rose },
  quizResult: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  scoreText: { fontSize: fontSize.xxl, fontWeight: '700', marginTop: 4 },
  quizFeedback: { fontSize: 15, color: colors.text2, textAlign: 'center', marginTop: 8 },
});
