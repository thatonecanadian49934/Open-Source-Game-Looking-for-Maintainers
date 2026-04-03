// Powered by OnSpace.AI
// Updated Question Period — PM answers opposition attacks; opposition asks their own questions
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, Animated, ActivityIndicator,
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

// ── Types ─────────────────────────────────────────────────────────────────────
interface AIQuestion {
  question: string;
  topic: string;
  askedBy: string;    // For PM: the opposition leader/critic asking. For Opposition: the target (PM/minister)
  targetMinister?: string; // Which minister is being questioned (if PM)
  difficulty: 'medium' | 'hard' | 'brutal';
}

interface OppositionQuestion {
  question: string;
  targetMinister: string; // who the opposition player is directing question at
  topic: string;
}

interface SessionAnswer {
  question: AIQuestion | OppositionQuestion;
  answer: string;
  wordCount: number;
  performance: 'excellent' | 'good' | 'poor';
  approvalEffect: number;
  isOppositionAsking?: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  medium: Colors.info,
  hard: Colors.warning,
  brutal: Colors.error,
};

const TOPIC_ICONS: Record<string, string> = {
  Economy: 'chart-line', Housing: 'home-city', Healthcare: 'hospital-box', Defence: 'shield',
  Environment: 'leaf', Governance: 'gavel', Immigration: 'account-arrow-right', Indigenous: 'earth',
  Justice: 'scale-balance', Leadership: 'account-star', 'Fiscal Policy': 'bank', 'Foreign Policy': 'earth',
};

// Fallback questions for when AI is unavailable
const PM_FALLBACK: AIQuestion[] = [
  { question: 'Canadians are being squeezed by the cost of living. What specific measures will your government commit to this week?', topic: 'Economy', askedBy: 'Leader of the Official Opposition', difficulty: 'hard' },
  { question: 'Emergency room wait times are at record highs. Why has your government failed Canadians on healthcare?', topic: 'Healthcare', askedBy: 'NDP Leader', difficulty: 'brutal' },
  { question: 'Young Canadians still cannot buy a home. After years in power, why has your government failed to deliver?', topic: 'Housing', askedBy: 'Conservative House Leader', difficulty: 'hard' },
  { question: 'The national debt is growing every week. When does fiscal responsibility become a priority for your government?', topic: 'Fiscal Policy', askedBy: 'Bloc Québécois Leader', difficulty: 'brutal' },
];

// For opposition player: they ASK these at the PM/ministers
const OPPOSITION_QUESTION_TOPICS = [
  { topic: 'Economy', minister: 'Minister of Finance' },
  { topic: 'Healthcare', minister: 'Prime Minister' },
  { topic: 'Housing', minister: 'Minister of Housing' },
  { topic: 'Environment', minister: 'Minister of Environment' },
  { topic: 'Foreign Policy', minister: 'Prime Minister' },
  { topic: 'Fiscal Policy', minister: 'Minister of Finance' },
  { topic: 'Indigenous', minister: 'Minister of Indigenous Affairs' },
  { topic: 'Justice', minister: 'Prime Minister' },
  { topic: 'Defence', minister: 'Minister of National Defence' },
  { topic: 'Governance', minister: 'Prime Minister' },
];

export default function QuestionPeriodScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, answerQuestion } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  // PM mode: answer AI questions
  const [pmQuestions, setPmQuestions] = useState<AIQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Opposition mode: pick topic + write question
  const [oppQuestionTopic, setOppQuestionTopic] = useState<typeof OPPOSITION_QUESTION_TOPICS[0] | null>(null);
  const [oppQuestionText, setOppQuestionText] = useState('');
  const [oppAnswerText, setOppAnswerText] = useState('');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [phase, setPhase] = useState<'questioning' | 'complete'>('questioning');
  const [oppPhase, setOppPhase] = useState<'select_topic' | 'write_question' | 'receive_answer' | 'complete'>('select_topic');
  const [qpSecondsLeft, setQpSecondsLeft] = useState(120);
  const [currentSupplementary, setCurrentSupplementary] = useState(0);
  const [speakerRuling, setSpeakerRuling] = useState('');

  const questionFade = useRef(new Animated.Value(1)).current;
  const scoreFade = useRef(new Animated.Value(0)).current;

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const isGoverning = gameState.isGoverning;

  // Get opposition leaders for PM mode
  const getRivalLeaderName = (partyId: string): string => {
    const rival = gameState.rivals.find(r => r.partyId === partyId);
    if (rival) return rival.name.split(' (')[0];
    const names: Record<string, string> = { liberal: 'Alex Moreau', conservative: 'Pierre Fontaine', ndp: 'Rachel Lavoie', bloc: 'Marc Tremblay', green: 'Lisa Chen', ppc: 'Derek Sloan' };
    return names[partyId] || 'Opposition Leader';
  };

  // Fetch AI questions for PM
  const fetchPMQuestions = async () => {
    setLoadingQuestions(true);
    setAiError(false);
    try {
      const { data, error } = await supabase.functions.invoke('ai-question-period', {
        body: {
          partyName: party?.name || '',
          leaderName: gameState.playerName,
          isGoverning: true,
          stats: gameState.stats,
          currentEvents: gameState.currentEvents.map(e => ({ title: e.title, description: e.description })),
          rivals: gameState.rivals.map(r => ({ name: r.name, party: r.party, approval: r.approval })),
          weekNumber: gameState.currentWeek,
          parliamentNumber: gameState.parliamentNumber,
          recentNewsHeadlines: gameState.newsHistory.slice(0, 5).map(n => n.headline),
        },
      });
      if (error || !data?.questions?.length) {
        setAiError(true);
        setPmQuestions(PM_FALLBACK);
      } else {
        setPmQuestions(data.questions.slice(0, 4));
      }
    } catch {
      setAiError(true);
      setPmQuestions(PM_FALLBACK);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    if (isGoverning) fetchPMQuestions();
  }, []);

  useEffect(() => {
    if (qpSecondsLeft <= 0) {
      setPhase('complete');
      return;
    }
    const timer = setTimeout(() => setQpSecondsLeft(qpSecondsLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [qpSecondsLeft]);

  const getPerformance = (wordCount: number): { perf: 'excellent' | 'good' | 'poor'; effect: number; label: string } => {
    if (wordCount >= 80) return { perf: 'excellent', effect: 5, label: 'COMMANDING' };
    if (wordCount >= 45) return { perf: 'excellent', effect: 4, label: 'STRONG' };
    if (wordCount >= 25) return { perf: 'good', effect: 2, label: 'SOLID' };
    if (wordCount >= 10) return { perf: 'poor', effect: -2, label: 'WEAK' };
    return { perf: 'poor', effect: -4, label: 'DISMAL' };
  };

  // ── PM ANSWER SUBMISSION ────────────────────────────────────────────────────
  const handlePMSubmitAnswer = () => {
    if (!answer.trim() || submitting) return;
    const q = pmQuestions[currentIndex];
    if (!q) return;
    setSubmitting(true);
    const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
    const { perf, effect, label } = getPerformance(wordCount);
    answerQuestion(q.question, answer, perf);
    const nonResponsive = wordCount < 20;
    if (nonResponsive) setSpeakerRuling('Speaker: This response is non-responsive. Supplementary question may be requested.');
    const sa: SessionAnswer = { question: q, answer: answer.trim(), wordCount, performance: perf, approvalEffect: effect };
    const newAnswers = [...sessionAnswers, sa];
    setSessionAnswers(newAnswers);
    setTimeout(() => {
      setAnswer('');
      setSubmitting(false);
      if (currentIndex < pmQuestions.length - 1) {
        questionFade.setValue(0);
        setCurrentIndex(prev => prev + 1);
        Animated.timing(questionFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      } else {
        setPhase('complete');
        Animated.timing(scoreFade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
      }
    }, 300);
  };

  const handlePMSkip = () => {
    const q = pmQuestions[currentIndex];
    if (!q) return;
    setSpeakerRuling('Speaker: The answer was skipped. The member is non-responsive under House rules.');
    answerQuestion(q.question, '[Skipped]', 'poor');
    const sa: SessionAnswer = { question: q, answer: '[Question skipped — no response given]', wordCount: 0, performance: 'poor', approvalEffect: -4 };
    const newAnswers = [...sessionAnswers, sa];
    setSessionAnswers(newAnswers);
    setAnswer('');
    if (currentIndex < pmQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setPhase('complete');
    }
  };

  const tableDocument = () => {
    setSpeakerRuling('Document tabled: The Minister has tabled documents for the House record.');
    answerQuestion('Table document', 'Document tabled', 'good');
    setQpSecondsLeft(prev => Math.max(0, prev - 8));
  };

  const raisePointPrivilege = () => {
    setSpeakerRuling('Point of privilege raised: Speaker acknowledges and reserves judgment.');
    answerQuestion('Point of privilege', 'Privilege raised', 'good');
    setQpSecondsLeft(prev => Math.max(0, prev - 6));
  };

  const moveEmergencyDebate = () => {
    setSpeakerRuling('Emergency debate motion moved: House will consider urgent debate agenda.');
    answerQuestion('Emergency debate', 'Emergency debate moved', 'excellent');
    setQpSecondsLeft(prev => Math.max(0, prev - 10));
  };

  const requestSupplementary = () => {
    if (currentSupplementary >= 2) {
      setSpeakerRuling('Speaker: No more supplementary questions available this session.');
      return;
    }
    setCurrentSupplementary(prev => prev + 1);
    setSpeakerRuling('Speaker permits a supplementary question.');
    setQpSecondsLeft(prev => Math.max(0, prev - 4));
  };

  // ── OPPOSITION QUESTION TO PM ─────────────────────────────────────────────
  const generateGovResponse = (topic: string, minister: string, questionText: string): string => {
    const responses: Record<string, string[]> = {
      Economy: [
        `The Honourable Member raises an important question. Our government has delivered record job creation and maintained economic growth during a challenging global period. We reject the false premise that nothing has been done — the data speaks for itself.`,
        `With all due respect to the Honourable Member, our economic record is one we will defend on any stage. Three years of consecutive GDP growth, the lowest unemployment rate in a generation, and a AAA credit rating — these are the facts.`,
      ],
      Healthcare: [
        `The government has committed $25 billion in new health transfers to the provinces. The Honourable Member's party would cut these transfers — our government is actually building the system, not dismantling it.`,
        `We take healthcare very seriously. The transfers negotiated with the provinces represent the largest investment in a generation. We continue to work with provincial partners to reduce wait times.`,
      ],
      Housing: [
        `The government has announced 500,000 new units in the housing plan. The opposition voted against every measure we have brought forward. Perhaps the member should explain why their party consistently blocks solutions.`,
        `We have brought forward the most ambitious housing plan in Canadian history. The member would know this if they had read the legislation their party voted against. We are building — the opposition is obstructing.`,
      ],
      Environment: [
        `The carbon price is working — emissions are down and the rebate is returning money to Canadians. The member knows their party's only plan is to eliminate climate policy entirely.`,
        `Canada is a world leader on climate action. Our government has more than doubled clean energy investment since taking office. We will not apologize for protecting the environment.`,
      ],
      'Fiscal Policy': [
        `The deficit is declining as a share of GDP — every economist will tell you that is the correct metric. Our government has been fiscally responsible while investing in Canadians.`,
        `With interest rates rising globally, our government has demonstrated prudent fiscal management. The AAA credit rating, maintained through our tenure, speaks to the confidence international markets have in our plan.`,
      ],
    };
    const pool = responses[topic] || [
      `The government takes this matter very seriously. We are working on a comprehensive response and will bring forward details to the House at the appropriate time.`,
      `The Honourable Member is entitled to their opinion. The facts, however, show that this government has been working hard on behalf of Canadians on this very issue.`,
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const handleSubmitOppQuestion = () => {
    if (!oppQuestionTopic || !oppQuestionText.trim()) return;
    const govResponse = generateGovResponse(oppQuestionTopic.topic, oppQuestionTopic.minister, oppQuestionText);
    setOppAnswerText(govResponse);
    setOppPhase('receive_answer');
  };

  const handleOppFollowUp = (critique: string) => {
    // Player rates how they feel the exchange went
    const wordCount = oppQuestionText.trim().split(/\s+/).filter(Boolean).length;
    const { perf, effect } = getPerformance(wordCount);
    const adjustedEffect = critique === 'strong' ? Math.min(5, effect + 2) : critique === 'weak' ? Math.max(-4, effect - 2) : effect;
    answerQuestion(oppQuestionText, oppAnswerText, perf);
    const sa: SessionAnswer = {
      question: { question: oppQuestionText, targetMinister: oppQuestionTopic?.minister || 'Prime Minister', topic: oppQuestionTopic?.topic || 'Governance' },
      answer: `[Question to ${oppQuestionTopic?.minister}] ${oppQuestionText}`,
      wordCount,
      performance: perf,
      approvalEffect: adjustedEffect,
      isOppositionAsking: true,
    };
    setSessionAnswers([sa]);
    setOppPhase('complete');
  };

  const currentPMQuestion = pmQuestions[currentIndex];
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const { label: currentPerfLabel } = getPerformance(wordCount);

  // ── COMPLETE SCREEN (shared PM & opposition) ─────────────────────────────
  if (phase === 'complete' || oppPhase === 'complete') {
    const totalEffect = sessionAnswers.reduce((sum, a) => sum + a.approvalEffect, 0);
    const avgEffect = sessionAnswers.length > 0 ? totalEffect / sessionAnswers.length : 0;
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
          style={{ opacity: isGoverning ? scoreFade : undefined }}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
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
                ? totalEffect >= 0 ? 'You defended the government effectively in Question Period.' : 'The opposition landed several damaging blows today.'
                : totalEffect >= 0 ? 'Your questions put the government on the defensive.' : 'The government effectively deflected your questions today.'}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>SESSION RECAP</Text>
          {sessionAnswers.map((sa, idx) => {
            const c = sa.performance === 'excellent' ? Colors.success : sa.performance === 'good' ? Colors.info : Colors.error;
            const topicKey = 'topic' in sa.question ? sa.question.topic : 'Governance';
            return (
              <View key={idx} style={styles.answerReviewCard}>
                <View style={styles.answerReviewHeader}>
                  <MaterialCommunityIcons name={(TOPIC_ICONS[topicKey] || 'help-circle') as any} size={14} color={Colors.textSecondary} />
                  <Text style={styles.answerReviewTopic}>{topicKey}</Text>
                  <View style={{ flex: 1 }} />
                  <View style={[styles.perfBadge, { backgroundColor: c + '22' }]}>
                    <Text style={[styles.perfBadgeText, { color: c }]}>{sa.performance.toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.effectText, { color: sa.approvalEffect >= 0 ? Colors.success : Colors.error }]}>
                    {sa.approvalEffect > 0 ? '+' : ''}{sa.approvalEffect}%
                  </Text>
                </View>
                {'askedBy' in sa.question ? (
                  <Text style={styles.reviewQuestion} numberOfLines={2}>
                    {sa.question.askedBy}: "{sa.question.question}"
                  </Text>
                ) : (
                  <Text style={styles.reviewQuestion} numberOfLines={2}>
                    You asked ({sa.question.targetMinister}): "{sa.question.question}"
                  </Text>
                )}
                <Text style={styles.reviewAnswer} numberOfLines={2}>{sa.answer}</Text>
              </View>
            );
          })}

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.doneBtnText}>Return to Parliament</Text>
          </Pressable>
        </Animated.ScrollView>
      </View>
    );
  }

  // ── PM MODE: Answer opposition questions ──────────────────────────────────
  if (isGoverning) {
    if (loadingQuestions) {
      return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Question Period</Text>
              <Text style={styles.headerSub}>Prime Minister at dispatch box</Text>
            </View>
            <View style={[styles.sessionBadge, { backgroundColor: Colors.liberal + '22' }]}>
              <Text style={[styles.sessionText, { color: Colors.liberal }]}>IN SESSION</Text>
            </View>
          </View>
          <View style={styles.loadingContainer}>
            <MaterialCommunityIcons name="robot-excited" size={56} color={Colors.gold} />
            <Text style={styles.loadingTitle}>Opposition Preparing Questions</Text>
            <Text style={styles.loadingSubtitle}>
              The opposition is preparing their attacks on your government's record. Prepare your defence...
            </Text>
            <View style={styles.loadingDots}>
              {[0, 1, 2].map(i => <View key={i} style={[styles.loadingDot, { opacity: 0.4 + i * 0.2 }]} />)}
            </View>
          </View>
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
            <Text style={styles.headerSub}>Prime Minister — defend your government</Text>
          </View>
          <View style={[styles.sessionBadge, { backgroundColor: Colors.liberal + '22' }]}>
            <Text style={[styles.sessionText, { color: Colors.liberal }]}>PM</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* PM context banner */}
          <View style={[styles.contextBanner, { backgroundColor: Colors.error + '0D', borderColor: Colors.error + '33' }]}>
            <MaterialCommunityIcons name="shield-crown" size={16} color={Colors.liberal} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.contextTitle, { color: Colors.liberal }]}>Prime Minister at the Dispatch Box</Text>
              <Text style={styles.contextText}>
                The opposition is attacking your government's record. Rise and defend it. Each question comes from a named opposition leader or critic. Longer, more detailed answers perform better.
              </Text>
            </View>
            {!aiError ? <View style={styles.aiBadge}><MaterialCommunityIcons name="robot" size={11} color={Colors.gold} /><Text style={styles.aiBadgeText}>AI</Text></View> : null}
          </View>

          {/* Progress */}
          <View style={styles.progressRow}>
            {pmQuestions.map((_, idx) => (
              <View key={idx} style={[styles.progressDot,
                idx < currentIndex && { backgroundColor: Colors.success },
                idx === currentIndex && { backgroundColor: partyColor },
                idx > currentIndex && { backgroundColor: Colors.surfaceBorder },
              ]} />
            ))}
            <Text style={styles.progressLabel}>Question {currentIndex + 1} of {pmQuestions.length}</Text>
          </View>

          {/* Speaker & allocation */}
          <View style={[styles.contextBanner, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.surfaceBorder }]}> 
            <Text style={[styles.contextText, { fontWeight: FontWeight.bold }]}>QP Timer: {Math.floor(qpSecondsLeft / 60)}:{String(qpSecondsLeft % 60).padStart(2, '0')}</Text>
            <Text style={styles.contextText}>Firm spots remaining: {currentSupplementary}/2 supplementary questions.</Text>
            <Text style={styles.contextText}>Dispatch Box time split approximates seat share: {[...Object.entries(gameState.seats)].map(([party, seats]) => `${party.toUpperCase()}:${Math.round((seats / 338) * 100)}%`).join(' • ')}</Text>
            {speakerRuling ? <Text style={[styles.contextText, { color: Colors.error }]}>{speakerRuling}</Text> : null}
          </View>

          {/* Current question */}
          {currentPMQuestion ? (
            <Animated.View style={[styles.questionBlock, { opacity: questionFade }]}>
              <View style={styles.questionMeta}>
                <View style={styles.topicTag}>
                  <MaterialCommunityIcons name={(TOPIC_ICONS[currentPMQuestion.topic] || 'help-circle') as any} size={12} color={Colors.textSecondary} />
                  <Text style={styles.topicText}>{currentPMQuestion.topic}</Text>
                </View>
                <View style={[styles.difficultyTag, { backgroundColor: DIFFICULTY_COLORS[currentPMQuestion.difficulty] + '22' }]}>
                  <Text style={[styles.difficultyText, { color: DIFFICULTY_COLORS[currentPMQuestion.difficulty] }]}>
                    {currentPMQuestion.difficulty.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.questionerRow}>
                <MaterialCommunityIcons name="account-voice" size={16} color={Colors.error} />
                <Text style={[styles.questionerName, { color: Colors.error }]}>
                  {currentPMQuestion.askedBy}:
                </Text>
              </View>

              <View style={[styles.questionCard, { borderLeftColor: Colors.error }]}>
                <Text style={styles.questionText}>"{currentPMQuestion.question}"</Text>
              </View>

              <View style={styles.answerLabelRow}>
                <MaterialCommunityIcons name="shield-crown" size={14} color={partyColor} />
                <Text style={[styles.answerLabel, { color: partyColor }]}>
                  {gameState.playerName} — Rise and respond:
                </Text>
              </View>

              <TextInput
                style={styles.answerInput}
                multiline
                numberOfLines={6}
                placeholder="Defend your government's record. Cite specific policies, progress, and commitments. Address the questioner directly. Aim for 50+ words for strong performance..."
                placeholderTextColor={Colors.textMuted}
                value={answer}
                onChangeText={setAnswer}
                textAlignVertical="top"
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
                <Pressable onPress={handlePMSkip} style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.skipBtnText}>Skip (−4%)</Text>
                </Pressable>
                <Pressable
                  onPress={handlePMSubmitAnswer}
                  disabled={!answer.trim() || submitting}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    { backgroundColor: partyColor },
                    (!answer.trim() || submitting) && { opacity: 0.4 },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <MaterialCommunityIcons name="send" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {currentIndex < pmQuestions.length - 1 ? 'Submit Answer' : 'Complete Session'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.qpExtras}>
                <Pressable onPress={tableDocument} style={styles.smallBtn}><Text style={styles.smallBtnText}>Table Document</Text></Pressable>
                <Pressable onPress={raisePointPrivilege} style={styles.smallBtn}><Text style={styles.smallBtnText}>Point of Privilege</Text></Pressable>
                <Pressable onPress={moveEmergencyDebate} style={styles.smallBtn}><Text style={styles.smallBtnText}>Emergency Debate</Text></Pressable>
                <Pressable onPress={requestSupplementary} style={styles.smallBtn}><Text style={styles.smallBtnText}>Supplementary</Text></Pressable>
              </View>
            </Animated.View>
          ) : null}

          {/* Prior answers this session */}
          {sessionAnswers.length > 0 ? (
            <View style={styles.prevAnswers}>
              <Text style={styles.sectionTitle}>COMPLETED THIS SESSION</Text>
              {sessionAnswers.map((sa, idx) => {
                const c = sa.performance === 'excellent' ? Colors.success : sa.performance === 'good' ? Colors.info : Colors.error;
                const topicKey = 'topic' in sa.question ? sa.question.topic : 'Governance';
                return (
                  <View key={idx} style={styles.prevAnswerRow}>
                    <View style={[styles.prevPerfDot, { backgroundColor: c }]} />
                    <Text style={styles.prevTopic}>{topicKey}</Text>
                    <Text style={[styles.prevPerf, { color: c }]}>{sa.performance.toUpperCase()}</Text>
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

  // ── OPPOSITION MODE: Ask questions of PM/ministers ───────────────────────
  // Phase: select_topic
  if (oppPhase === 'select_topic') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Question Period</Text>
            <Text style={styles.headerSub}>Leader of the Opposition</Text>
          </View>
          <View style={[styles.sessionBadge, { backgroundColor: Colors.conservative + '22' }]}>
            <Text style={[styles.sessionText, { color: Colors.conservative }]}>OPP</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Opposition context */}
          <View style={[styles.contextBanner, { backgroundColor: partyColor + '0D', borderColor: partyColor + '33' }]}>
            <MaterialCommunityIcons name="account-voice" size={16} color={partyColor} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.contextTitle, { color: partyColor }]}>Opposition Dispatch Box</Text>
              <Text style={styles.contextText}>
                You have the floor to question the Prime Minister and Cabinet ministers. Choose a portfolio to question, then craft a sharp, evidence-based question. The government will be forced to respond.
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>CHOOSE A PORTFOLIO TO QUESTION</Text>
          {OPPOSITION_QUESTION_TOPICS.map((item, idx) => (
            <Pressable
              key={idx}
              onPress={() => { setOppQuestionTopic(item); setOppPhase('write_question'); }}
              style={({ pressed }) => [styles.portfolioCard, pressed && { opacity: 0.85 }]}
            >
              <MaterialCommunityIcons
                name={(TOPIC_ICONS[item.topic] || 'help-circle') as any}
                size={20}
                color={Colors.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.portfolioTopic}>{item.topic}</Text>
                <Text style={styles.portfolioMinister}>Directed at: {item.minister}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Phase: write_question
  if (oppPhase === 'write_question') {
    const qWordCount = oppQuestionText.trim().split(/\s+/).filter(Boolean).length;
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable onPress={() => setOppPhase('select_topic')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{oppQuestionTopic?.topic}</Text>
            <Text style={styles.headerSub}>Directed at: {oppQuestionTopic?.minister}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.contextBanner, { backgroundColor: partyColor + '0D', borderColor: partyColor + '33' }]}>
            <MaterialCommunityIcons name="lightbulb" size={14} color={partyColor} />
            <Text style={styles.contextText}>
              Write a sharp, evidence-based question. Reference specific failings, dollar figures, or broken promises. The more specific and pointed your question, the more it damages the government's credibility.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>YOUR QUESTION TO {oppQuestionTopic?.minister?.toUpperCase()}</Text>
          <TextInput
            style={styles.answerInput}
            multiline
            numberOfLines={5}
            placeholder={`Ask the ${oppQuestionTopic?.minister} about ${oppQuestionTopic?.topic}. Use specific evidence — cite broken promises, statistics, or government failures. Start strong. Aim for 30+ words.`}
            placeholderTextColor={Colors.textMuted}
            value={oppQuestionText}
            onChangeText={setOppQuestionText}
            textAlignVertical="top"
          />
          <View style={styles.answerMeta}>
            <Text style={styles.wordCountText}>{qWordCount} words</Text>
            <View style={styles.wordGuide}>
              {[10, 20, 30, 50].map((t, i) => (
                <View key={i} style={[styles.wordGuideSeg, qWordCount >= t && {
                  backgroundColor: i === 0 ? Colors.warning : i < 3 ? Colors.info : Colors.success,
                }]} />
              ))}
            </View>
          </View>

          <Pressable
            onPress={handleSubmitOppQuestion}
            disabled={!oppQuestionText.trim()}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: partyColor, paddingHorizontal: Spacing.lg },
              !oppQuestionText.trim() && { opacity: 0.4 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <MaterialCommunityIcons name="send" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>Rise and Ask the Question</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Phase: receive_answer
  if (oppPhase === 'receive_answer') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Government Response</Text>
            <Text style={styles.headerSub}>{oppQuestionTopic?.minister}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Your question */}
          <View style={styles.oppQuestionDisplay}>
            <Text style={styles.sectionTitle}>YOUR QUESTION</Text>
            <View style={[styles.questionCard, { borderLeftColor: partyColor }]}>
              <Text style={[styles.questionerName, { color: partyColor }]}>{gameState.playerName} ({party?.shortName}):</Text>
              <Text style={styles.questionText}>"{oppQuestionText}"</Text>
            </View>
          </View>

          {/* Gov response */}
          <View>
            <Text style={styles.sectionTitle}>GOVERNMENT RESPONSE</Text>
            <View style={[styles.questionCard, { borderLeftColor: Colors.liberal }]}>
              <Text style={[styles.questionerName, { color: Colors.liberal }]}>{oppQuestionTopic?.minister}:</Text>
              <Text style={styles.questionText}>"{oppAnswerText}"</Text>
            </View>
          </View>

          {/* Rate the exchange */}
          <View style={styles.rateSection}>
            <Text style={styles.sectionTitle}>HOW EFFECTIVE WAS YOUR QUESTION?</Text>
            <Text style={styles.rateDesc}>
              Assess how the exchange went. Did your question land effectively? Did the government dodge or actually address it?
            </Text>
            <View style={styles.rateRow}>
              <Pressable
                onPress={() => handleOppFollowUp('strong')}
                style={({ pressed }) => [styles.rateBtn, { borderColor: Colors.success + '55', backgroundColor: Colors.success + '11' }, pressed && { opacity: 0.8 }]}
              >
                <MaterialCommunityIcons name="thumb-up" size={20} color={Colors.success} />
                <Text style={[styles.rateBtnText, { color: Colors.success }]}>Strong question</Text>
                <Text style={styles.rateBtnEffect}>+7% approval</Text>
              </Pressable>
              <Pressable
                onPress={() => handleOppFollowUp('neutral')}
                style={({ pressed }) => [styles.rateBtn, { borderColor: Colors.warning + '55', backgroundColor: Colors.warning + '11' }, pressed && { opacity: 0.8 }]}
              >
                <MaterialCommunityIcons name="minus" size={20} color={Colors.warning} />
                <Text style={[styles.rateBtnText, { color: Colors.warning }]}>Mixed result</Text>
                <Text style={styles.rateBtnEffect}>+2% approval</Text>
              </Pressable>
              <Pressable
                onPress={() => handleOppFollowUp('weak')}
                style={({ pressed }) => [styles.rateBtn, { borderColor: Colors.error + '55', backgroundColor: Colors.error + '11' }, pressed && { opacity: 0.8 }]}
              >
                <MaterialCommunityIcons name="thumb-down" size={20} color={Colors.error} />
                <Text style={[styles.rateBtnText, { color: Colors.error }]}>Weak impact</Text>
                <Text style={styles.rateBtnEffect}>-1% approval</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  sessionBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  sessionText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  loadingTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  loadingSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  loadingDots: { flexDirection: 'row', gap: 8, marginTop: 8 },
  loadingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gold },
  content: { padding: Spacing.md, gap: Spacing.md },
  contextBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1,
  },
  contextTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginBottom: 3 },
  contextText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.gold + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  aiBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.gold },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressDot: { width: 32, height: 6, borderRadius: 3 },
  progressLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginLeft: 4 },
  questionBlock: { gap: Spacing.sm },
  questionMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  topicTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceElevated, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder },
  topicText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  difficultyTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  difficultyText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  questionerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  questionerName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.3 },
  questionCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, borderLeftWidth: 4, padding: Spacing.md, gap: 6 },
  questionText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary, lineHeight: 26, fontStyle: 'italic' },
  answerLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  answerLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1 },
  answerInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 140, lineHeight: 22 },
  answerMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordCountText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  wordGuide: { flexDirection: 'row', gap: 3 },
  wordGuideSeg: { width: 20, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceBorder },
  answerActions: { flexDirection: 'row', gap: Spacing.sm },
  qpExtras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm },
  skipBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: 'center', justifyContent: 'center' },
  skipBtnText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  submitBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
  submitBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
  prevAnswers: { gap: Spacing.xs },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  prevAnswerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  prevPerfDot: { width: 8, height: 8, borderRadius: 4 },
  prevTopic: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  prevPerf: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 70, textAlign: 'right' },
  prevEffect: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 35, textAlign: 'right' },

  // Opposition topic selection
  portfolioCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, marginBottom: 8 },
  portfolioTopic: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  portfolioMinister: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  // Opposition answer receive
  oppQuestionDisplay: { gap: Spacing.sm },
  rateSection: { gap: Spacing.sm },
  rateDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  rateRow: { flexDirection: 'row', gap: Spacing.sm },
  rateBtn: { flex: 1, alignItems: 'center', gap: 4, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.sm },
  rateBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'center' },
  rateBtnEffect: { fontSize: 10, color: Colors.textMuted },

  // Complete screen
  completeContent: { padding: Spacing.md, gap: Spacing.md },
  overallScoreCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 2, padding: Spacing.xl, alignItems: 'center', gap: 8 },
  overallScoreLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 2 },
  overallScoreTitle: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, letterSpacing: 2 },
  overallScoreEffect: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  roleContext: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', fontStyle: 'italic', marginTop: 4 },
  answerReviewCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  answerReviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  answerReviewTopic: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  perfBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  perfBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  effectText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, minWidth: 35, textAlign: 'right' },
  reviewQuestion: { fontSize: FontSize.xs, color: Colors.textPrimary, fontStyle: 'italic', lineHeight: 18 },
  reviewAnswer: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  doneBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, borderRadius: Radius.md, marginTop: Spacing.sm },
  doneBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
});
