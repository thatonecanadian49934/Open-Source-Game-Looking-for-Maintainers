// Powered by OnSpace.AI — AI-generated debate questions with crowd meter and post-debate poll
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

type DebatePhase = 'intro' | 'loading' | 'question' | 'complete';

interface AIQuestion {
  question: string;
  topic: string;
  askedBy: string;
  difficulty: 'medium' | 'hard' | 'brutal';
}

interface DebateAnswer {
  questionIdx: number;
  answer: string;
  crowdReaction: number; // -1 to +1
}

const CROWD_REACTIONS = [
  { threshold: 0.6, label: 'CROWD CHEERS', icon: 'emoticon-excited', color: Colors.success },
  { threshold: 0.2, label: 'POLITE APPLAUSE', icon: 'hand-clap', color: Colors.info },
  { threshold: -0.2, label: 'MURMURING', icon: 'minus', color: Colors.warning },
  { threshold: -0.6, label: 'CROWD BOOS', icon: 'emoticon-angry', color: Colors.error },
];

function getCrowdReaction(crowdScore: number) {
  for (const r of CROWD_REACTIONS) {
    if (crowdScore >= r.threshold) return r;
  }
  return CROWD_REACTIONS[CROWD_REACTIONS.length - 1];
}

const DIFFICULTY_COLORS = {
  medium: Colors.info,
  hard: Colors.warning,
  brutal: Colors.error,
};

export default function DebateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, answerQuestion } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [phase, setPhase] = useState<DebatePhase>('intro');
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answers, setAnswers] = useState<DebateAnswer[]>([]);
  const [crowdScore, setCrowdScore] = useState(0); // running crowd meter
  const [crowdMomentum, setCrowdMomentum] = useState(0); // last answer impact
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const crowdAnim = useRef(new Animated.Value(0.5)).current; // 0=hostile, 1=supportive
  const crowdFlashAnim = useRef(new Animated.Value(0)).current;
  const fadAnim = useRef(new Animated.Value(1)).current;

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;

  const fetchAIQuestions = async () => {
    setPhase('loading');
    setLoadingError(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-question-period', {
        body: {
          partyName: party?.name,
          leaderName: gameState.playerName,
          isGoverning: gameState.isGoverning,
          stats: gameState.stats,
          currentEvents: gameState.currentEvents.slice(0, 3),
          rivals: gameState.rivals.slice(0, 4).map(r => ({ name: r.name, party: r.party, approval: r.approval })),
          weekNumber: gameState.currentWeek,
          parliamentNumber: gameState.parliamentNumber,
          recentNewsHeadlines: gameState.newsHistory.slice(0, 5).map(n => n.headline),
        },
      });

      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { msg = await error.context.text(); } catch {}
        }
        throw new Error(msg);
      }

      if (data?.questions?.length > 0) {
        setAiQuestions(data.questions.slice(0, 4));
        setPhase('question');
      } else {
        throw new Error('No questions returned');
      }
    } catch (e: any) {
      // Fallback questions
      setAiQuestions([
        {
          question: `${gameState.playerName}, with inflation at ${gameState.stats.inflationRate.toFixed(1)}% and families struggling, what concrete policy will you implement in the next 30 days?`,
          topic: 'Economy',
          askedBy: `${gameState.rivals[0]?.name?.split(' (')[0] || 'Opposition Leader'}`,
          difficulty: 'brutal',
        },
        {
          question: `The national debt stands at $${Math.round(gameState.stats.nationalDebt)}B. At what point does your party accept fiscal responsibility?`,
          topic: 'Fiscal Policy',
          askedBy: 'Globe and Mail Moderator',
          difficulty: 'hard',
        },
        {
          question: `Your approval rating is ${gameState.stats.approvalRating.toFixed(0)}%. Canadians are losing confidence. Why should they trust your party to govern?`,
          topic: 'Leadership',
          askedBy: 'CTV News Moderator',
          difficulty: 'brutal',
        },
        {
          question: `On housing, your party has been in the House for ${gameState.currentWeek} weeks with no results. What is your specific plan for affordability?`,
          topic: 'Housing',
          askedBy: 'NDP Leader',
          difficulty: 'hard',
        },
      ]);
      setPhase('question');
    }
  };

  const handleSubmitAnswer = () => {
    if (!currentAnswer.trim()) return;
    const words = currentAnswer.trim().split(/\s+/).filter(Boolean).length;
    const question = aiQuestions[currentQuestion];
    const difficultyPenalty = question.difficulty === 'brutal' ? -0.15 : question.difficulty === 'hard' ? -0.05 : 0.05;
    const lengthBonus = words > 80 ? 0.3 : words > 40 ? 0.15 : words > 20 ? 0.05 : -0.1;
    const reaction = Math.max(-1, Math.min(1, difficultyPenalty + lengthBonus + (Math.random() * 0.3 - 0.1)));
    const newCrowdScore = Math.max(-1, Math.min(1, crowdScore + reaction * 0.4));

    Animated.sequence([
      Animated.timing(crowdFlashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(crowdFlashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    Animated.timing(crowdAnim, { toValue: (newCrowdScore + 1) / 2, duration: 600, useNativeDriver: false }).start();

    const performance = reaction > 0.2 ? 'excellent' : reaction > -0.1 ? 'good' : 'poor';
    answerQuestion(question.question, currentAnswer, performance);

    setAnswers(prev => [...prev, { questionIdx: currentQuestion, answer: currentAnswer, crowdReaction: reaction }]);
    setCrowdScore(newCrowdScore);
    setCrowdMomentum(reaction);
    setCurrentAnswer('');

    if (currentQuestion < aiQuestions.length - 1) {
      Animated.sequence([
        Animated.timing(fadAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setCurrentQuestion(prev => prev + 1);
        Animated.timing(fadAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    } else {
      setTimeout(() => setPhase('complete'), 800);
    }
  };

  const getDebateRating = () => {
    const avgCrowd = answers.reduce((s, a) => s + a.crowdReaction, 0) / Math.max(1, answers.length);
    if (avgCrowd > 0.3) return { label: 'DOMINANT PERFORMANCE', color: Colors.success, icon: 'trophy', pollShift: '+8%' };
    if (avgCrowd > 0.05) return { label: 'STRONG PERFORMANCE', color: Colors.info, icon: 'thumb-up', pollShift: '+4%' };
    if (avgCrowd > -0.1) return { label: 'ADEQUATE', color: Colors.warning, icon: 'minus', pollShift: '+1%' };
    return { label: 'POOR PERFORMANCE', color: Colors.error, icon: 'thumb-down', pollShift: '-3%' };
  };

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Image source={require('@/assets/images/debate_bg.jpg')} style={styles.bg} contentFit="cover" />
        <View style={styles.overlay} />
        <View style={styles.introContent}>
          <Text style={styles.debateTitle}>FEDERAL LEADERS DEBATE</Text>
          <Text style={styles.debateSub}>Campaign Week 3 — National Broadcast</Text>
          <View style={styles.introCard}>
            <MaterialCommunityIcons name="microphone" size={48} color={Colors.gold} />
            <Text style={styles.introCardTitle}>AI-Generated Questions from Current Events</Text>
            <Text style={styles.introCardText}>
              Moderators and opposition critics will challenge you with 4 sharp questions tailored to current economic conditions, recent events, and your party record. Your word count and depth affect the crowd meter. A 30-second post-debate poll reveals the momentum shift.
            </Text>
            <View style={styles.debateFeatureList}>
              {[
                { icon: 'robot', label: 'AI questions based on live game stats' },
                { icon: 'account-group', label: 'Live crowd reaction meter' },
                { icon: 'poll', label: 'Post-debate polling impact' },
              ].map(f => (
                <View key={f.label} style={styles.debateFeatureItem}>
                  <MaterialCommunityIcons name={f.icon as any} size={13} color={Colors.gold} />
                  <Text style={styles.debateFeatureText}>{f.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.rivalsList}>
              <Text style={styles.rivalsTitle}>TONIGHT'S PARTICIPANTS:</Text>
              {gameState.rivals.slice(0, 3).map(rival => (
                <View key={rival.partyId} style={styles.rivalItem}>
                  <View style={[styles.rivalDot, { backgroundColor: PARTIES.find(p => p.id === rival.partyId)?.color }]} />
                  <Text style={styles.rivalName}>{rival.name.split(' (')[0]}</Text>
                  <Text style={styles.rivalPartyLabel}>{rival.party}</Text>
                </View>
              ))}
              <View style={styles.rivalItem}>
                <View style={[styles.rivalDot, { backgroundColor: partyColor }]} />
                <Text style={[styles.rivalName, { color: Colors.gold }]}>You — {gameState.playerName}</Text>
                <Text style={styles.rivalPartyLabel}>{party?.name}</Text>
              </View>
            </View>
          </View>
          <Pressable onPress={fetchAIQuestions} style={({ pressed }) => [styles.startDebateBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="robot" size={18} color="#fff" />
            <Text style={styles.startDebateBtnText}>Generate Questions & Begin Debate</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── LOADING ──
  if (phase === 'loading') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Image source={require('@/assets/images/debate_bg.jpg')} style={styles.bg} contentFit="cover" />
        <View style={styles.overlay} />
        <View style={styles.loadingContent}>
          <MaterialCommunityIcons name="robot" size={56} color={Colors.gold} />
          <Text style={styles.loadingTitle}>Generating AI Questions</Text>
          <Text style={styles.loadingSubtitle}>Tailoring questions to your current game state...</Text>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.loadingDot, { opacity: 0.4 + i * 0.3 }]} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ── QUESTION ──
  if (phase === 'question' && aiQuestions.length > 0) {
    const question = aiQuestions[currentQuestion];
    const diffColor = DIFFICULTY_COLORS[question.difficulty];
    const crowdInfo = getCrowdReaction(crowdScore);
    const wordCount = currentAnswer.trim().split(/\s+/).filter(Boolean).length;
    const lastAnswer = answers[answers.length - 1];

    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Image source={require('@/assets/images/debate_bg.jpg')} style={styles.bg} contentFit="cover" />
        <View style={styles.overlay} />

        {/* Header */}
        <View style={styles.questionHeader}>
          <Text style={styles.questionHeaderTitle}>FEDERAL LEADERS DEBATE</Text>
          <View style={styles.progressRow}>
            {aiQuestions.map((_, idx) => (
              <View key={idx} style={[styles.progDot, currentQuestion > idx && { backgroundColor: Colors.success }, currentQuestion === idx && { backgroundColor: Colors.gold }]} />
            ))}
          </View>
        </View>

        {/* Crowd meter */}
        <View style={styles.crowdMeterContainer}>
          <MaterialCommunityIcons name="account-group" size={13} color={Colors.textMuted} />
          <Text style={styles.crowdMeterLabel}>CROWD</Text>
          <View style={styles.crowdMeterTrack}>
            <Animated.View style={[styles.crowdMeterFill, {
              width: crowdAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: crowdAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [Colors.error, Colors.warning, Colors.success] }),
            }]} />
          </View>
          <View style={[styles.crowdReactionBadge, { backgroundColor: crowdInfo.color + '22' }]}>
            <MaterialCommunityIcons name={crowdInfo.icon as any} size={11} color={crowdInfo.color} />
            <Text style={[styles.crowdReactionText, { color: crowdInfo.color }]}>{crowdInfo.label}</Text>
          </View>
        </View>

        {/* Last answer momentum */}
        {lastAnswer && (
          <View style={[styles.momentumBanner, {
            backgroundColor: lastAnswer.crowdReaction > 0 ? Colors.success + '22' : Colors.error + '22',
            borderColor: lastAnswer.crowdReaction > 0 ? Colors.success + '44' : Colors.error + '44',
          }]}>
            <MaterialCommunityIcons
              name={lastAnswer.crowdReaction > 0.2 ? 'arrow-up-circle' : lastAnswer.crowdReaction > -0.1 ? 'minus-circle' : 'arrow-down-circle'}
              size={13}
              color={lastAnswer.crowdReaction > 0 ? Colors.success : Colors.error}
            />
            <Text style={[styles.momentumText, { color: lastAnswer.crowdReaction > 0 ? Colors.success : Colors.error }]}>
              {lastAnswer.crowdReaction > 0.2 ? 'Strong answer — crowd momentum +' : lastAnswer.crowdReaction > -0.1 ? 'Adequate response — neutral impact' : 'Weak answer — crowd turned against you'}
            </Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[styles.questionScrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Question metadata */}
          <View style={styles.questionMeta}>
            <View style={[styles.difficultyBadge, { backgroundColor: diffColor + '22' }]}>
              <MaterialCommunityIcons name="alert-circle" size={11} color={diffColor} />
              <Text style={[styles.difficultyText, { color: diffColor }]}>{question.difficulty.toUpperCase()}</Text>
            </View>
            <View style={styles.topicBadge}>
              <Text style={styles.topicBadgeText}>{question.topic}</Text>
            </View>
            <Text style={styles.questionNum}>Q{currentQuestion + 1}/{aiQuestions.length}</Text>
          </View>

          {/* Question card */}
          <Animated.View style={[styles.questionCard, { opacity: fadAnim }]}>
            <View style={styles.questionAsker}>
              <MaterialCommunityIcons name="account-tie" size={14} color={Colors.gold} />
              <Text style={styles.questionAskerText}>{question.askedBy}</Text>
            </View>
            <MaterialCommunityIcons name="format-quote-open" size={20} color={Colors.gold + '88'} />
            <Text style={styles.questionText}>{question.question}</Text>
            <Text style={styles.questionAttrib}>— Directed at {gameState.playerName} ({party?.shortName})</Text>
          </Animated.View>

          {/* Answer input */}
          <View style={styles.answerSection}>
            <Text style={styles.answerLabel}>YOUR RESPONSE (type your answer):</Text>
            <TextInput
              style={styles.answerInput}
              multiline
              placeholder={`Answer directly and confidently. Address the specific point raised. Longer, substantive answers (40+ words) resonate better with the crowd and voters watching at home...`}
              placeholderTextColor={Colors.textMuted}
              value={currentAnswer}
              onChangeText={setCurrentAnswer}
              textAlignVertical="top"
              autoFocus={false}
            />
            {/* Word count guide */}
            <View style={styles.answerGuideRow}>
              <View style={styles.wordCountRow}>
                <Text style={[styles.wordCount, wordCount > 40 ? { color: Colors.success } : wordCount > 20 ? { color: Colors.warning } : { color: Colors.error }]}>
                  {wordCount} words
                </Text>
                <Text style={styles.wordCountHint}>
                  {wordCount === 0 ? 'Required' : wordCount < 20 ? '— brief, may hurt crowd' : wordCount < 40 ? '— adequate' : '— strong response'}
                </Text>
              </View>
              <View style={styles.wordQualityBar}>
                {[10, 25, 40, 80].map((t, i) => (
                  <View key={i} style={[styles.wordQualitySegment, wordCount >= t && {
                    backgroundColor: i === 0 ? Colors.error : i === 1 ? Colors.warning : i === 2 ? Colors.info : Colors.success,
                  }]} />
                ))}
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleSubmitAnswer}
            disabled={!currentAnswer.trim()}
            style={({ pressed }) => [
              styles.submitAnswerBtn,
              { backgroundColor: partyColor },
              !currentAnswer.trim() && { opacity: 0.4 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <MaterialCommunityIcons name="send" size={18} color="#fff" />
            <Text style={styles.submitAnswerBtnText}>
              {currentQuestion < aiQuestions.length - 1 ? 'Submit Answer — Next Question' : 'Final Answer — Complete Debate'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── COMPLETE ──
  if (phase === 'complete') {
    const rating = getDebateRating();
    const pollBeforeParty = Math.round(gameState.stats.approvalRating);
    const pollAfterParty = Math.round(Math.max(5, Math.min(95, gameState.stats.approvalRating + (rating.label.includes('DOMINANT') ? 8 : rating.label.includes('STRONG') ? 4 : rating.label.includes('ADEQUATE') ? 1 : -3))));
    const rivalShifts = gameState.rivals.slice(0, 3).map(r => ({
      name: r.name.split(' (')[0],
      party: PARTIES.find(p => p.id === r.partyId),
      shift: Math.round((Math.random() * 4 - 2) * (rating.label.includes('DOMINANT') ? 1.5 : 1)),
    }));

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Image source={require('@/assets/images/debate_bg.jpg')} style={styles.bg} contentFit="cover" />
        <View style={styles.overlay} />
        <ScrollView
          contentContainerStyle={[styles.completeContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Rating card */}
          <View style={[styles.ratingCard, { borderColor: rating.color + '66' }]}>
            <MaterialCommunityIcons name={rating.icon as any} size={56} color={rating.color} />
            <Text style={[styles.ratingLabel, { color: rating.color }]}>DEBATE PERFORMANCE</Text>
            <Text style={[styles.ratingTitle, { color: rating.color }]}>{rating.label}</Text>
            <Text style={styles.ratingSubtitle}>{answers.length} questions answered</Text>
          </View>

          {/* Post-debate poll */}
          <View style={styles.pollCard}>
            <View style={styles.pollHeader}>
              <MaterialCommunityIcons name="poll" size={18} color={Colors.gold} />
              <Text style={styles.pollTitle}>POST-DEBATE SNAP POLL</Text>
              <Text style={styles.pollSubtitle}>Nanos Research — 30-min after broadcast</Text>
            </View>
            <View style={styles.pollPartyRow}>
              <View style={[styles.pollPartyBadge, { backgroundColor: partyColor + '22' }]}>
                <Text style={[styles.pollPartyName, { color: partyColor }]}>{party?.shortName}</Text>
              </View>
              <View style={styles.pollBarContainer}>
                <View style={[styles.pollBarBefore, { flex: pollBeforeParty, backgroundColor: partyColor + '44' }]} />
                <View style={[styles.pollBarAfter, { flex: Math.max(0, pollAfterParty - pollBeforeParty), backgroundColor: partyColor }]} />
              </View>
              <Text style={[styles.pollNum, { color: partyColor }]}>{pollAfterParty}%</Text>
              <Text style={[styles.pollShift, { color: rating.color }]}>({rating.pollShift})</Text>
            </View>
            {rivalShifts.map(r => (
              <View key={r.name} style={styles.pollPartyRow}>
                <View style={[styles.pollPartyBadge, { backgroundColor: (r.party?.color || Colors.textMuted) + '22' }]}>
                  <Text style={[styles.pollPartyName, { color: r.party?.color || Colors.textMuted }]}>{r.party?.shortName}</Text>
                </View>
                <View style={styles.pollBarContainer}>
                  <View style={[styles.pollBarBefore, { flex: 30, backgroundColor: (r.party?.color || Colors.textMuted) + '33' }]} />
                </View>
                <Text style={[styles.pollNum, { color: r.party?.color || Colors.textMuted }]}>est.</Text>
                <Text style={[styles.pollShift, { color: r.shift > 0 ? Colors.success : r.shift < 0 ? Colors.error : Colors.textMuted }]}>
                  ({r.shift > 0 ? '+' : ''}{r.shift}%)
                </Text>
              </View>
            ))}
          </View>

          {/* Answer review */}
          <View style={styles.reviewCard}>
            <Text style={styles.reviewTitle}>YOUR DEBATE ANSWERS</Text>
            {answers.map((a, idx) => {
              const q = aiQuestions[idx];
              const reaction = getCrowdReaction(a.crowdReaction);
              return (
                <View key={idx} style={styles.reviewItem}>
                  <View style={styles.reviewItemHeader}>
                    <Text style={styles.reviewTopic}>{q?.topic}</Text>
                    <View style={[styles.reviewReaction, { backgroundColor: reaction.color + '22' }]}>
                      <MaterialCommunityIcons name={reaction.icon as any} size={11} color={reaction.color} />
                      <Text style={[styles.reviewReactionText, { color: reaction.color }]}>{reaction.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewQ} numberOfLines={2}>{q?.question}</Text>
                  <Text style={styles.reviewA} numberOfLines={3}>"{a.answer}"</Text>
                </View>
              );
            })}
          </View>

          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.doneBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}>
            <Text style={styles.doneBtnText}>Return to Campaign Trail</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bg: { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,14,26,0.90)' },

  introContent: { flex: 1, alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  debateTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, letterSpacing: 3, textAlign: 'center', marginTop: Spacing.md },
  debateSub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  introCard: { backgroundColor: Colors.card + 'CC', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, width: '100%' },
  introCardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary, textAlign: 'center', lineHeight: 24 },
  introCardText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  debateFeatureList: { gap: 6, alignSelf: 'stretch' },
  debateFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.gold + '0D', borderRadius: Radius.sm, padding: 8 },
  debateFeatureText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  rivalsList: { width: '100%', gap: 6, marginTop: Spacing.xs },
  rivalsTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  rivalItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rivalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textMuted },
  rivalName: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary, flex: 1 },
  rivalPartyLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  startDebateBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, width: '100%', justifyContent: 'center' },
  startDebateBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },

  loadingContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  loadingSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary },
  loadingDots: { flexDirection: 'row', gap: 8 },
  loadingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gold },

  questionHeader: { alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface + 'CC', gap: 6 },
  questionHeaderTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold, letterSpacing: 2 },
  progressRow: { flexDirection: 'row', gap: 6 },
  progDot: { width: 24, height: 6, borderRadius: 3, backgroundColor: Colors.surfaceBorder },

  crowdMeterContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: 8, backgroundColor: Colors.surface + 'CC', borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  crowdMeterLabel: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  crowdMeterTrack: { flex: 1, height: 10, backgroundColor: Colors.surfaceBorder, borderRadius: 5, overflow: 'hidden' },
  crowdMeterFill: { height: '100%', borderRadius: 5 },
  crowdReactionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  crowdReactionText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },

  momentumBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: 6, borderBottomWidth: 1 },
  momentumText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, flex: 1 },

  questionScrollContent: { padding: Spacing.md, gap: Spacing.md },
  questionMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  difficultyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  difficultyText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  topicBadge: { backgroundColor: Colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder },
  topicBadgeText: { fontSize: 9, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  questionNum: { fontSize: FontSize.xs, color: Colors.textMuted, marginLeft: 'auto' },

  questionCard: { backgroundColor: Colors.card + 'EE', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.md, gap: 8 },
  questionAsker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  questionAskerText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.gold },
  questionText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, lineHeight: 26 },
  questionAttrib: { fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic' },

  answerSection: { gap: 8 },
  answerLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.2 },
  answerInput: { backgroundColor: Colors.surfaceElevated + 'DD', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 120, lineHeight: 22 },
  answerGuideRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordCountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wordCount: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  wordCountHint: { fontSize: FontSize.xs, color: Colors.textMuted },
  wordQualityBar: { flexDirection: 'row', gap: 3 },
  wordQualitySegment: { width: 20, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceBorder },

  submitAnswerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Radius.md, paddingVertical: Spacing.md },
  submitAnswerBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },

  completeContent: { padding: Spacing.md, gap: Spacing.md, paddingTop: 40 },
  ratingCard: { borderRadius: Radius.xl, borderWidth: 2, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card + 'CC' },
  ratingLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 2 },
  ratingTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, letterSpacing: 1, textAlign: 'center' },
  ratingSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary },

  pollCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.md, gap: Spacing.sm },
  pollHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  pollTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  pollSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, flex: 1 },
  pollPartyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pollPartyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, minWidth: 40, alignItems: 'center' },
  pollPartyName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  pollBarContainer: { flex: 1, height: 8, flexDirection: 'row', borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.surfaceBorder },
  pollBarBefore: { height: '100%' },
  pollBarAfter: { height: '100%' },
  pollNum: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, minWidth: 32, textAlign: 'right' },
  pollShift: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, minWidth: 40 },

  reviewCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  reviewTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  reviewItem: { gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  reviewItemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewTopic: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.gold },
  reviewReaction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  reviewReactionText: { fontSize: 9, fontWeight: FontWeight.bold },
  reviewQ: { fontSize: FontSize.xs, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 16 },
  reviewA: { fontSize: FontSize.xs, color: Colors.textPrimary, lineHeight: 17 },

  doneBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md },
  doneBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
});
