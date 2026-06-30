import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { colors, radius, fontSize, spacing } from '../../constants/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import Icon from '../../components/Icon';
import { getChild } from '../../lib/store';
import {
  saveLessonProgressDB,
  fetchLessonProgressDB,
  fetchLessonsDB,
  fetchQuizDB,
} from '../../lib/supabase-db';
import { Lesson, QuizQuestion } from '../../types';

/** Renders a lesson's custom SVG icon (tinted via currentColor), with fallback. */
function LessonIcon({ svg, size, color }: { svg: string; size: number; color: string }) {
  if (svg && svg.trim().startsWith('<svg')) {
    return <SvgXml xml={svg} width={size} height={size} color={color} />;
  }
  return <Icon name="book" size={size} color={color} />;
}

type Screen = 'list' | 'lesson' | 'quiz';

export default function Aprender() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('list');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
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
        const [lessonsData, quizData, progress] = await Promise.all([
          fetchLessonsDB(),
          fetchQuizDB(),
          fetchLessonProgressDB(id),
        ]);
        setLessons(lessonsData);
        setQuiz(quizData);
        setCompletedLessons(progress);
        setLoading(false);
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
    if (optionIdx === quiz[quizIndex].correct_index) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (quizIndex + 1 < quiz.length) {
      setQuizIndex(i => i + 1);
      setAnswered(null);
    } else {
      setQuizDone(true);
    }
  };

  const progressNum = lessons.length > 0
    ? Math.round((completedLessons.length / lessons.length) * 100)
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
            <LessonIcon svg={activeLesson.icon_svg} size={48} color={colors.text2} />
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
      const passMark = Math.ceil(quiz.length * 0.8);
      return (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
        >
          <View style={styles.quizResult}>
            <Icon name='trophy' size={64} color={score >= passMark ? colors.green : colors.yellow} />
            <Text style={styles.lessonTitle}>Quiz finalizado!</Text>
            <Text style={[styles.scoreText, { color: score >= passMark ? colors.green : colors.yellow }]}>
              {score}/{quiz.length} acertos
            </Text>
            <Text style={styles.quizFeedback}>
              {score === quiz.length
                ? 'Perfeito! Você já domina os cuidados.'
                : score >= passMark
                  ? 'Bom! Continue práticando.'
                  : 'Sem culpa! Cada tentativa é aprendizado.'}
            </Text>
            <Button title="Repetir" onPress={startQuiz} style={{ marginTop: 16 }} />
            <Button title="Voltar" variant="outline" onPress={() => setScreen('list')} style={{ marginTop: 8 }} />
          </View>
        </ScrollView>
      );
    }

    const q = quiz[quizIndex];
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
          <Text style={styles.quizProgress}>{quizIndex + 1}/{quiz.length}</Text>
          <Text style={styles.quizQuestion}>{q.question}</Text>
          {q.options.map((opt, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.quizOption,
                answered !== null && i === q.correct_index && styles.quizCorrect,
                answered === i && i !== q.correct_index && styles.quizWrong,
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
                color: answered === q.correct_index ? colors.green : colors.red,
                fontSize: 14,
                lineHeight: 20,
              }}>
                {answered === q.correct_index ? q.explanation_correct : q.explanation_wrong}
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
          <Text style={styles.tagText}>{completedLessons.length}/{lessons.length} lições</Text>
        </View>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressNum}%` as `${number}%` }]} />
      </View>

      {loading && lessons.length === 0 ? (
        <ActivityIndicator size="large" color={colors.red} style={{ marginTop: 32 }} />
      ) : (
        <>
          {lessons.map(lesson => {
            const done = completedLessons.includes(lesson.id);
            return (
              <TouchableOpacity key={lesson.id} onPress={() => openLesson(lesson)}>
                <Card style={[styles.lessonCard, done ? styles.lessonCardDone : null]}>
                  <View style={styles.lessonCardRow}>
                    <LessonIcon svg={lesson.icon_svg} size={28} color={done ? colors.green : colors.text2} />
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

          {quiz.length > 0 && (
            <TouchableOpacity onPress={startQuiz}>
              <Card style={styles.lessonCard}>
                <View style={styles.lessonCardRow}>
                  <Icon name='quiz' size={28} color={colors.yellow} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lessonCardTitle}>Quiz: O que você já sabe?</Text>
                    <Text style={styles.lessonCardDesc}>Teste seus conhecimentos com {quiz.length} perguntas práticas.</Text>
                  </View>
                  <Icon name='star' size={20} color={colors.yellow} />
                </View>
              </Card>
            </TouchableOpacity>
          )}
        </>
      )}
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
