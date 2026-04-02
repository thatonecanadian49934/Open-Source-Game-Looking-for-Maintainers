// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { DEBATE_QUESTIONS, DebateQuestion } from '@/services/electionService';
import { PARTIES } from '@/constants/parties';

type DebatePhase = 'intro' | 'question' | 'complete';

export default function DebateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, answerQuestion } = useGame();
  const [phase, setPhase] = useState<DebatePhase>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [totalEffect, setTotalEffect] = useState(0);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const question = DEBATE_QUESTIONS[currentQuestion];

  const handleSelectAnswer = (answerId: string, effect: number) => {
    setSelectedAnswers(prev => ({ ...prev, [currentQuestion]: answerId }));
  };

  const handleNextQuestion = () => {
    const answer = selectedAnswers[currentQuestion];
    if (!answer) return;
    
    const selectedAnswer = question.answers.find(a => a.id === answer);
    const effect = selectedAnswer?.effect || 0;
    setTotalEffect(prev => prev + effect);
    
    const performance = effect >= 6 ? 'excellent' : effect >= 2 ? 'good' : 'poor';
    answerQuestion(question.question, answer, performance);
    
    if (currentQuestion < DEBATE_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setPhase('complete');
    }
  };

  const getDebateRating = () => {
    const avg = totalEffect / DEBATE_QUESTIONS.length;
    if (avg >= 6) return { label: 'DOMINANT', color: Colors.success, icon: 'trophy' };
    if (avg >= 3) return { label: 'STRONG', color: Colors.info, icon: 'thumb-up' };
    if (avg >= 0) return { label: 'ADEQUATE', color: Colors.warning, icon: 'minus' };
    return { label: 'POOR', color: Colors.error, icon: 'thumb-down' };
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Image
        source={require('@/assets/images/debate_bg.jpg')}
        style={styles.bg}
        contentFit="cover"
      />
      <View style={styles.overlay} />

      {phase === 'intro' ? (
        <View style={styles.introContent}>
          <Text style={styles.debateTitle}>FEDERAL LEADERS DEBATE</Text>
          <Text style={styles.debateSub}>Campaign Week 2 — National Broadcast</Text>
          
          <View style={styles.introCard}>
            <MaterialCommunityIcons name="microphone" size={48} color={Colors.gold} />
            <Text style={styles.introCardTitle}>You are about to face 4 questions from the moderator</Text>
            <Text style={styles.introCardText}>
              Your answers will affect voter opinion across Canada. Choose your responses carefully — bold answers carry risk and reward.
            </Text>
            
            <View style={styles.rivalsList}>
              <Text style={styles.rivalsTitle}>TONIGHT'S PARTICIPANTS:</Text>
              {gameState.rivals.slice(0, 4).map(rival => (
                <View key={rival.partyId} style={styles.rivalItem}>
                  <View style={[styles.rivalDot, { backgroundColor: PARTIES.find(p => p.id === rival.partyId)?.color }]} />
                  <Text style={styles.rivalName}>{rival.name.split(' (')[0]}</Text>
                  <Text style={styles.rivalPartyLabel}>{rival.party}</Text>
                </View>
              ))}
              <View style={styles.rivalItem}>
                <View style={[styles.rivalDot, { backgroundColor: party?.color }]} />
                <Text style={[styles.rivalName, { color: Colors.gold }]}>You — {gameState.playerName}</Text>
                <Text style={styles.rivalPartyLabel}>{party?.name}</Text>
              </View>
            </View>
          </View>
          
          <Pressable
            onPress={() => setPhase('question')}
            style={({ pressed }) => [styles.startDebateBtn, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="microphone" size={20} color="#fff" />
            <Text style={styles.startDebateBtnText}>Begin Debate</Text>
          </Pressable>
        </View>
      ) : phase === 'question' ? (
        <ScrollView
          contentContainerStyle={[styles.questionContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.questionProgress}>
            {DEBATE_QUESTIONS.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.progressDot,
                  currentQuestion > idx && { backgroundColor: Colors.success },
                  currentQuestion === idx && { backgroundColor: Colors.gold },
                ]}
              />
            ))}
          </View>
          
          <View style={styles.questionBadge}>
            <Text style={styles.questionTopic}>{question.topic}</Text>
            <Text style={styles.questionNumber}>Question {currentQuestion + 1} of {DEBATE_QUESTIONS.length}</Text>
          </View>
          
          <View style={styles.questionCard}>
            <MaterialCommunityIcons name="format-quote-open" size={24} color={Colors.gold} />
            <Text style={styles.questionText}>{question.question}</Text>
            <Text style={styles.questionAttribution}>— Debate Moderator</Text>
          </View>
          
          <Text style={styles.chooseAnswerLabel}>YOUR RESPONSE:</Text>
          
          {question.answers.map(answer => {
            const isSelected = selectedAnswers[currentQuestion] === answer.id;
            const boldnessColor = answer.boldness === 'bold' ? Colors.warning : 
              answer.boldness === 'moderate' ? Colors.info : Colors.textSecondary;
            
            return (
              <Pressable
                key={answer.id}
                onPress={() => handleSelectAnswer(answer.id, answer.effect)}
                style={({ pressed }) => [
                  styles.answerCard,
                  isSelected && { borderColor: party?.color || Colors.gold, backgroundColor: (party?.color || Colors.gold) + '15' },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.answerHeader}>
                  <View style={[styles.boldnessBadge, { backgroundColor: boldnessColor + '22' }]}>
                    <Text style={[styles.boldnessText, { color: boldnessColor }]}>
                      {answer.boldness.toUpperCase()}
                    </Text>
                  </View>
                  {isSelected ? (
                    <MaterialCommunityIcons name="check-circle" size={20} color={party?.color || Colors.gold} />
                  ) : null}
                </View>
                <Text style={[styles.answerText, isSelected && { color: Colors.textPrimary }]}>
                  "{answer.text}"
                </Text>
              </Pressable>
            );
          })}
          
          <Pressable
            onPress={handleNextQuestion}
            disabled={!selectedAnswers[currentQuestion]}
            style={({ pressed }) => [
              styles.nextBtn,
              { backgroundColor: party?.color || Colors.primary },
              !selectedAnswers[currentQuestion] && { opacity: 0.4 },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.nextBtnText}>
              {currentQuestion < DEBATE_QUESTIONS.length - 1 ? 'Next Question' : 'Complete Debate'}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#fff" />
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.completeContent}>
          {(() => {
            const rating = getDebateRating();
            return (
              <>
                <View style={[styles.ratingCard, { borderColor: rating.color + '66' }]}>
                  <MaterialCommunityIcons name={rating.icon as any} size={64} color={rating.color} />
                  <Text style={[styles.ratingLabel, { color: rating.color }]}>DEBATE PERFORMANCE</Text>
                  <Text style={[styles.ratingTitle, { color: rating.color }]}>{rating.label}</Text>
                  <Text style={styles.ratingEffect}>
                    {totalEffect > 0 ? `+${totalEffect}` : totalEffect} points across {DEBATE_QUESTIONS.length} questions
                  </Text>
                  <Text style={styles.ratingDesc}>
                    {rating.label === 'DOMINANT' 
                      ? 'Canadians were impressed. Expect a polling boost heading into election day.'
                      : rating.label === 'STRONG'
                      ? 'A solid performance. The party faithful are energized.'
                      : rating.label === 'ADEQUATE'
                      ? 'An average debate. No major momentum shift expected.'
                      : 'A difficult night. The media will be harsh. Recovery campaigns needed.'
                    }
                  </Text>
                </View>
                
                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.doneBtnText}>Return to Campaign Trail</Text>
                </Pressable>
              </>
            );
          })()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.88)',
  },
  introContent: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  debateTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  debateSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  introCard: {
    backgroundColor: Colors.card + 'CC',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gold + '33',
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  introCardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
  introCardText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  rivalsList: {
    width: '100%',
    gap: 8,
    marginTop: Spacing.sm,
  },
  rivalsTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  rivalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rivalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
  rivalName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    flex: 1,
  },
  rivalPartyLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  startDebateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    width: '100%',
    justifyContent: 'center',
  },
  startDebateBtnText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  questionContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  questionProgress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.sm,
  },
  progressDot: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceBorder,
  },
  questionBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionTopic: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  questionNumber: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  questionCard: {
    backgroundColor: Colors.card + 'CC',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gold + '33',
    padding: Spacing.md,
    gap: 8,
  },
  questionText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  questionAttribution: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  chooseAnswerLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  answerCard: {
    backgroundColor: Colors.card + 'CC',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: 8,
  },
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boldnessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  boldnessText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  answerText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  nextBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  completeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  ratingCard: {
    backgroundColor: Colors.card + 'CC',
    borderRadius: Radius.xl,
    borderWidth: 2,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  ratingLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 2,
  },
  ratingTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 2,
  },
  ratingEffect: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  ratingDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.xs,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});
