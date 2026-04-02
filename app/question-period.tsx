// Powered by OnSpace.AI
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';

interface AIQuestion {
  question: string;
  topic: string;
  askedBy: string;
  difficulty: 'medium' | 'hard' | 'brutal';
}

interface SessionAnswer {
  question: AIQuestion;
  answer: string;
  wordCount: number;
  performance: 'excellent' | 'good' | 'poor';
  approvalEffect: number;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  medium: Colors.info,
  hard: Colors.warning,
  brutal: Colors.error,
};

const TOPIC_ICONS: Record<string, string> = {
  Economy: 'chart-line',
  Housing: 'home-city',
  Healthcare: 'hospital-box',
  Defence: 'shield',
  Environment: 'leaf',
  Governance: 'gavel',
  Immigration: 'account-arrow-right',
  Indigenous: 'earth',
  Justice: 'scale-balance',
  Leadership: 'account-star',
  'Fiscal Policy': 'bank',
  'Foreign Policy': 'earth',
};

const GOVERNING_FALLBACK: AIQuestion[] = [
  {
    question: 'Canadians are being squeezed by the cost of living. What specific measures will your government commit to this week?',
    topic: 'Economy',
    askedBy: 'Leader of the Opposition',
    difficulty: 'hard',
  },
  {
    question: 'Emergency room wait times are at record highs. Why has your government failed Canadians on healthcare?',
    topic: 'Healthcare',
    askedBy: 'NDP Leader',
    difficulty: 'brutal',
  },
  {
    question: 'Young Canadians still cannot buy a home. After years in power, why has your government failed to deliver?',
    topic: 'Housing',
    askedBy: 'Conservative House Leader',
    difficulty: 'hard',
  },
  {
    question: 'The national debt is growing every week. When does fiscal responsibility become a priority for your government?',
    topic: 'Fiscal Policy',
    askedBy: 'Bloc Québécois Leader',
    difficulty: 'brutal',
  },
];

const OPPOSITION_FALLBACK: AIQuestion[] = [
  {
    question: "Your party has been in opposition for some time. What concrete alternative would you offer Canadians on the economy?",
    topic: 'Economy',
    askedBy: 'Parliamentary Press Gallery',
    difficulty: 'hard',
  },
  {
    question: "Critics say your party has blocked important legislation. How do you justify your opposition strategy to Canadians?",
    topic: 'Governance',
    askedBy: 'Government House Leader',
    difficulty: 'hard',
  },
  {
    question: "You have been attacking the government — but what specifically would your party do differently on housing?",
    topic: 'Housing',
    askedBy: 'NDP Critic',
    difficulty: 'medium',
  },
  {
    question: "If you were to win the next election, what is your single most important commitment to Canadians?",
    topic: 'Leadership',
    askedBy: 'Toronto Star journalist',
    difficulty: 'medium',
  },
];

export default function QuestionPeriodScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, answerQuestion } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiError, setAiError] = useState(false);

  const questionFade = useRef(new Animated.Value(0)).current;
  const scoreFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (gameState) fetchAIQuestions();
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      Animated.timing(questionFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [currentIndex, questions.length]);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const isGoverning = gameState.isGoverning;

  const fetchAIQuestions = async () => {
    setLoadingQuestions(true);
    setAiError(false);
    try {
      const { data, error } = await supabase.functions.invoke('ai-question-period', {
        body: {
          partyName: party?.name || 'Unknown Party',
          leaderName: gameState.playerName,
          isGoverning,
          stats: gameState.stats,
          currentEvents: gameState.currentEvents.map(e => ({ title: e.title, description: e.description })),
          rivals: gameState.rivals.map(r => ({ name: r.name, party: r.party, approval: r.approval })),
          weekNumber: gameState.currentWeek,
          parliamentNumber: gameState.parliamentNumber,
          recentNewsHeadlines: gameState.newsHistory.slice(0, 5).map(n => n.headline),
        },
      });

      if (error) {
        let errMsg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { const txt = await error.context?.text(); errMsg = txt || errMsg; } catch { }
        }
        console.warn('AI QP error:', errMsg);
        setAiError(true);
        setQuestions(isGoverning ? GOVERNING_FALLBACK : OPPOSITION_FALLBACK);
      } else if (data?.questions && data.questions.length > 0) {
        setQuestions(data.questions.slice(0, 4));
      } else {
        setAiError(true);
        setQuestions(isGoverning ? GOVERNING_FALLBACK : OPPOSITION_FALLBACK);
      }
    } catch (e) {
      setAiError(true);
      setQuestions(isGoverning ? GOVERNING_FALLBACK : OPPOSITION_FALLBACK);
    } finally {
      setLoadingQuestions(false);
      questionFade.setValue(0);
      Animated.timing(questionFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }
  };

  const getPerformance = (wordCount: number): { perf: 'excellent' | 'good' | 'poor'; effect: number; label: string } => {
    if (wordCount >= 80) return { perf: 'excellent', effect: 5, label: 'COMMANDING' };
    if (wordCount >= 45) return { perf: 'excellent', effect: 4, label: 'STRONG' };
    if (wordCount >= 25) return { perf: 'good', effect: 2, label: 'SOLID' };
    if (wordCount >= 10) return { perf: 'poor', effect: -2, label: 'WEAK' };
    return { perf: 'poor', effect: -4, label: 'DISMAL' };
  };

  const handleSubmitAnswer = () => {
    if (!answer.trim() || submitting) return;
    const q = questions[currentIndex];
    if (!q) return;
    setSubmitting(true);
    const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
    const { perf, effect, label } = getPerformance(wordCount);
    answerQuestion(q.question, answer, perf);
    const sessionAnswer: SessionAnswer = { question: q, answer: answer.trim(), wordCount, performance: perf, approvalEffect: effect };
    const newAnswers = [...sessionAnswers, sessionAnswer];
    setSessionAnswers(newAnswers);
    setTimeout(() => {
      setAnswer('');
      setSubmitting(false);
      if (currentIndex < questions.length - 1) {
        questionFade.setValue(0);
        setCurrentIndex(prev => prev + 1);
        Animated.timing(questionFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      } else {
        Animated.timing(scoreFade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
        setSessionComplete(true);
        const totalEffect = newAnswers.reduce((sum, a) => sum + a.approvalEffect, 0);
        const avgPerf = totalEffect / newAnswers.length;
        const overallLabel = avgPerf >= 4 ? 'DOMINANT' : avgPerf >= 2 ? 'STRONG' : avgPerf >= 0 ? 'ADEQUATE' : 'POOR';
        showAlert(`Question Period Complete — ${overallLabel}`, `You answered ${newAnswers.length} questions. Net approval impact: ${totalEffect > 0 ? '+' : ''}${totalEffect}%.`);
      }
    }, 400);
  };

  const handleSkip = () => {
    const q = questions[currentIndex];
    if (!q) return;
    answerQuestion(q.question, '[Skipped]', 'poor');
    const sessionAnswer: SessionAnswer = { question: q, answer: '[Question skipped]', wordCount: 0, performance: 'poor', approvalEffect: -3 };
    const newAnswers = [...sessionAnswers, sessionAnswer];
    setSessionAnswers(newAnswers);
    setAnswer('');
    if (currentIndex < questions.length - 1) {
      questionFade.setValue(0);
      setCurrentIndex(prev => prev + 1);
      Animated.timing(questionFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } else {
      setSessionComplete(true);
    }
  };

  const currentQuestion = questions[currentIndex];
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const { perf: currentPerf, label: currentPerfLabel } = getPerformance(wordCount);

  if (loadingQuestions) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Question Period</Text>
            <Text style={styles.headerSub}>{isGoverning ? 'Defend your record' : 'Hold the government to account'}</Text>
          </View>
          <View style={styles.sessionBadge}><Text style={styles.sessionText}>IN SESSION</Text></View>
        </View>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="robot-excited" size={56} color={Colors.gold} />
          <Text style={styles.loadingTitle}>AI Generating Questions</Text>
          <Text style={styles.loadingSubtitle}>
            {isGoverning
              ? 'Preparing opposition attacks on your government\'s record...'
              : 'Preparing questions on your opposition strategy and platform...'}
          </Text>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map(i => <View key={i} style={[styles.loadingDot, { opacity: 0.4 + i * 0.2 }]} />)}
          </View>
        </View>
      </View>
    );
  }

  if (sessionComplete) {
    const totalEffect = sessionAnswers.reduce((sum, a) => sum + a.approvalEffect, 0);
    const avgEffect = totalEffect / sessionAnswers.length;
    const overallPerf = avgEffect >= 3 ? 'DOMINANT' : avgEffect >= 1 ? 'STRONG' : avgEffect >= -1 ? 'ADEQUATE' : 'POOR';
    const perfColor = avgEffect >= 3 ? Colors.success : avgEffect >= 1 ? Colors.info : avgEffect >= -1 ? Colors.warning : Colors.error;
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.headerCenter}><Text style={styles.headerTitle}>Session Complete</Text></View>
          <View style={{ width: 40 }} />
        </View>
        <Animated.ScrollView
          style={{ opacity: scoreFade }}
          contentContainerStyle={[styles.completeContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.overallScoreCard, { borderColor: perfColor + '66' }]}>
            <Text style={[styles.overallScoreLabel, { color: perfColor }]}>QUESTION PERIOD PERFORMANCE</Text>
            <Text style={[styles.overallScoreTitle, { color: perfColor }]}>{overallPerf}</Text>
            <Text style={styles.overallScoreEffect}>
              Net approval impact: {totalEffect > 0 ? '+' : ''}{totalEffect}% across {sessionAnswers.length} questions
            </Text>
            <Text style={styles.roleContext}>
              {isGoverning
                ? totalEffect >= 0 ? 'You defended your government effectively.' : 'The opposition landed several damaging blows.'
                : totalEffect >= 0 ? 'You held the government to account effectively.' : 'Your opposition critique lacked punch today.'}
            </Text>
          </View>
          <Text style={styles.sectionTitle}>YOUR ANSWERS</Text>
          {sessionAnswers.map((sa, idx) => {
            const c = sa.performance === 'excellent' ? Colors.success : sa.performance === 'good' ? Colors.info : Colors.error;
            const { label } = getPerformance(sa.wordCount);
            return (
              <View key={idx} style={styles.answerReviewCard}>
                <View style={styles.answerReviewHeader}>
                  <View style={styles.answerReviewLeft}>
                    <MaterialCommunityIcons name={(TOPIC_ICONS[sa.question.topic] || 'help-circle') as any} size={16} color={Colors.textSecondary} />
                    <Text style={styles.answerReviewTopic}>{sa.question.topic}</Text>
                  </View>
                  <View style={[styles.perfBadge, { backgroundColor: c + '22' }]}>
                    <Text style={[styles.perfBadgeText, { color: c }]}>{label}</Text>
                  </View>
                  <Text style={[styles.effectText, { color: sa.approvalEffect >= 0 ? Colors.success : Colors.error }]}>
                    {sa.approvalEffect > 0 ? '+' : ''}{sa.approvalEffect}%
                  </Text>
                </View>
                <Text style={styles.reviewQuestion} numberOfLines={2}>"{sa.question.question}"</Text>
                <Text style={styles.reviewAnswer} numberOfLines={3}>{sa.answer}</Text>
                <Text style={styles.reviewWords}>{sa.wordCount} words</Text>
              </View>
            );
          })}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: party?.color || Colors.primary }, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.doneBtnText}>Return to Parliament</Text>
          </Pressable>
        </Animated.ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Question Period</Text>
          <Text style={styles.headerSub}>{isGoverning ? 'Defending the Government' : 'Official Opposition'}</Text>
        </View>
        <View style={styles.sessionBadge}><Text style={styles.sessionText}>IN SESSION</Text></View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Role context banner */}
        <View style={[styles.contextBanner, {
          backgroundColor: isGoverning ? Colors.liberal + '11' : Colors.conservative + '11',
          borderColor: isGoverning ? Colors.liberal + '33' : Colors.conservative + '33',
        }]}>
          <MaterialCommunityIcons
            name={isGoverning ? 'shield-crown' : 'account-voice'}
            size={16}
            color={isGoverning ? Colors.liberal : Colors.gold}
          />
          <Text style={styles.contextText}>
            {isGoverning
              ? 'You are at the Government dispatch box. Defend your Cabinet\'s decisions — weak answers embolden the opposition and hurt your approval.'
              : 'You are at the Opposition dispatch box. Hold the government to account — powerful questions build your credibility as an alternative PM.'}
          </Text>
          {!aiError ? (
            <View style={styles.aiIndicator}>
              <MaterialCommunityIcons name="robot" size={12} color={Colors.gold} />
              <Text style={styles.aiIndicatorText}>AI</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.progressRow}>
          {questions.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.progressDot,
                idx < currentIndex && { backgroundColor: Colors.success },
                idx === currentIndex && { backgroundColor: party?.color || Colors.gold },
                idx > currentIndex && { backgroundColor: Colors.surfaceBorder },
              ]}
            />
          ))}
          <Text style={styles.progressLabel}>Question {currentIndex + 1} of {questions.length}</Text>
        </View>

        {currentQuestion ? (
          <Animated.View style={[styles.questionBlock, { opacity: questionFade }]}>
            <View style={styles.questionMeta}>
              <View style={styles.topicTag}>
                <MaterialCommunityIcons name={(TOPIC_ICONS[currentQuestion.topic] || 'help-circle') as any} size={12} color={Colors.textSecondary} />
                <Text style={styles.topicText}>{currentQuestion.topic}</Text>
              </View>
              <View style={[styles.difficultyTag, { backgroundColor: DIFFICULTY_COLORS[currentQuestion.difficulty] + '22' }]}>
                <Text style={[styles.difficultyText, { color: DIFFICULTY_COLORS[currentQuestion.difficulty] }]}>
                  {currentQuestion.difficulty.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.questionerRow}>
              <MaterialCommunityIcons
                name={isGoverning ? 'account-voice' : 'account-question'}
                size={16}
                color={isGoverning ? Colors.error : Colors.info}
              />
              <Text style={[styles.questionerName, { color: isGoverning ? Colors.error : Colors.info }]}>
                {currentQuestion.askedBy}:
              </Text>
            </View>

            <View style={[styles.questionCard, { borderLeftColor: isGoverning ? Colors.error : Colors.info }]}>
              <Text style={styles.questionText}>"{currentQuestion.question}"</Text>
            </View>

            <Text style={styles.answerLabel}>
              {isGoverning ? 'YOUR RESPONSE — Rise and defend your government:' : 'YOUR RESPONSE — Rise and challenge the government:'}
            </Text>
            <TextInput
              style={styles.answerInput}
              multiline
              numberOfLines={6}
              placeholder={isGoverning
                ? 'Defend your government\'s record. Cite specific policies, progress, and commitments. Longer, detailed answers perform better — aim for 50+ words.'
                : 'Critique the government with specific evidence. Propose clear alternatives. Challenge their record. Aim for 50+ words for best performance.'}
              placeholderTextColor={Colors.textMuted}
              value={answer}
              onChangeText={setAnswer}
              textAlignVertical="top"
              autoFocus={false}
            />

            <View style={styles.answerMeta}>
              <Text style={styles.wordCountText}>{wordCount} words{wordCount > 0 ? ` — ${currentPerfLabel}` : ''}</Text>
              <View style={styles.wordGuide}>
                {[10, 25, 45, 80].map((threshold, i) => (
                  <View key={i} style={[styles.wordGuideSeg, wordCount >= threshold && {
                    backgroundColor: i === 0 ? Colors.error : i === 1 ? Colors.warning : i === 2 ? Colors.info : Colors.success,
                  }]} />
                ))}
              </View>
            </View>

            <View style={styles.answerActions}>
              <Pressable onPress={handleSkip} style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}>
                <Text style={styles.skipBtnText}>Skip (−3%)</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitAnswer}
                disabled={!answer.trim() || submitting}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: party?.color || Colors.primary },
                  (!answer.trim() || submitting) && { opacity: 0.4 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <MaterialCommunityIcons name="send" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>
                  {currentIndex < questions.length - 1 ? 'Submit Answer' : 'Complete Session'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : null}

        {sessionAnswers.length > 0 ? (
          <View style={styles.prevAnswers}>
            <Text style={styles.sectionTitle}>COMPLETED THIS SESSION</Text>
            {sessionAnswers.map((sa, idx) => {
              const c = sa.performance === 'excellent' ? Colors.success : sa.performance === 'good' ? Colors.info : Colors.error;
              const { label } = getPerformance(sa.wordCount);
              return (
                <View key={idx} style={styles.prevAnswerRow}>
                  <View style={[styles.prevPerfDot, { backgroundColor: c }]} />
                  <Text style={styles.prevTopic}>{sa.question.topic}</Text>
                  <Text style={[styles.prevPerf, { color: c }]}>{label}</Text>
                  <Text style={[styles.prevEffect, { color: sa.approvalEffect >= 0 ? Colors.success : Colors.error }]}>
                    {sa.approvalEffect > 0 ? '+' : ''}{sa.approvalEffect}%
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  sessionBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm, backgroundColor: Colors.success + '22' },
  sessionText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.success, letterSpacing: 0.5 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  loadingTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  loadingSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  loadingDots: { flexDirection: 'row', gap: 8, marginTop: 8 },
  loadingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gold },
  content: { padding: Spacing.md, gap: Spacing.md },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
  },
  contextText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.gold + '22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  aiIndicatorText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.gold },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressDot: { width: 32, height: 6, borderRadius: 3 },
  progressLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginLeft: 4 },
  questionBlock: { gap: Spacing.sm },
  questionMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  topicTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  topicText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  difficultyTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  difficultyText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  questionerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  questionerName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.3 },
  questionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderLeftWidth: 4,
    padding: Spacing.md,
  },
  questionText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary, lineHeight: 26, fontStyle: 'italic' },
  answerLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  answerInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 140,
    lineHeight: 22,
  },
  answerMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordCountText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  wordGuide: { flexDirection: 'row', gap: 3 },
  wordGuideSeg: { width: 20, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceBorder },
  answerActions: { flexDirection: 'row', gap: Spacing.sm },
  skipBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  submitBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
  prevAnswers: { gap: Spacing.xs },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  prevAnswerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  prevPerfDot: { width: 8, height: 8, borderRadius: 4 },
  prevTopic: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  prevPerf: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 70, textAlign: 'right' },
  prevEffect: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 35, textAlign: 'right' },
  completeContent: { padding: Spacing.md, gap: Spacing.md },
  overallScoreCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 2,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  overallScoreLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 2 },
  overallScoreTitle: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, letterSpacing: 2 },
  overallScoreEffect: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  roleContext: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', fontStyle: 'italic', marginTop: 4 },
  answerReviewCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: 8,
  },
  answerReviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  answerReviewLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  answerReviewTopic: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  perfBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  perfBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  effectText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, minWidth: 35, textAlign: 'right' },
  reviewQuestion: { fontSize: FontSize.xs, color: Colors.textPrimary, fontStyle: 'italic', lineHeight: 18 },
  reviewAnswer: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  reviewWords: { fontSize: 9, color: Colors.textMuted },
  doneBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, borderRadius: Radius.md, marginTop: Spacing.sm },
  doneBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
});
