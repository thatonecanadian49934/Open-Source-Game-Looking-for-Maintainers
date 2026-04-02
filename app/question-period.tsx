// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';

const SAMPLE_QUESTIONS = [
  'Why has your party failed to address the housing crisis despite years in parliament?',
  'What is your position on the carbon tax, and will you commit to keeping it?',
  'How do you plan to defend Canadian sovereignty against US economic pressure?',
  'Critics say your immigration policy is incoherent. How do you respond?',
  'What is your plan to reduce the federal deficit without cutting healthcare?',
  'Do you support Indigenous land rights over resource development?',
  'Your party\'s Quebec policy is alienating voters in the West. Respond.',
  'What emergency powers would you be willing to use in a national security crisis?',
];

export default function QuestionPeriodScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, answerQuestion } = useGame();
  const { showAlert } = useAlert();
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState<{ q: string; a: string; rating: string }[]>([]);
  const [questionPool, setQuestionPool] = useState(SAMPLE_QUESTIONS);
  const [customQuestion, setCustomQuestion] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);

  const startQuestion = (q: string) => {
    setCurrentQuestion(q);
    setAnswer('');
    setQuestionPool(prev => prev.filter(pq => pq !== q));
  };

  const generateQuestion = () => {
    const remaining = SAMPLE_QUESTIONS.filter(q => !submitted.find(s => s.q === q));
    if (remaining.length > 0) {
      const random = remaining[Math.floor(Math.random() * remaining.length)];
      startQuestion(random);
    } else {
      setShowCustomInput(true);
    }
  };

  const submitAnswer = () => {
    if (!currentQuestion || !answer.trim()) return;
    
    const wordCount = answer.trim().split(' ').length;
    const rating = wordCount > 60 ? 'excellent' : wordCount > 30 ? 'good' : 'poor';
    const performance = rating as 'excellent' | 'good' | 'poor';
    
    answerQuestion(currentQuestion, answer, performance);
    
    setSubmitted(prev => [...prev, { q: currentQuestion, a: answer.trim(), rating }]);
    setCurrentQuestion(null);
    setAnswer('');
    
    const ratingMessages = {
      excellent: 'Strong answer! Detailed and commanding. The galleries approved.',
      good: 'Solid response. You held your ground in the House.',
      poor: 'Brief answer. The opposition benches jeered. Try to be more comprehensive.',
    };
    
    showAlert(
      `Question Period — ${rating.charAt(0).toUpperCase() + rating.slice(1)} Performance`,
      ratingMessages[rating]
    );
  };

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
          <Text style={styles.headerSub}>House of Commons</Text>
        </View>
        <View style={styles.sessionBadge}>
          <Text style={styles.sessionText}>{gameState.parliamentInSession ? 'IN SESSION' : 'RECESS'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Parliament Context */}
        <View style={styles.contextBanner}>
          <MaterialCommunityIcons name="gavel" size={20} color={Colors.gold} />
          <Text style={styles.contextText}>
            {gameState.isGoverning 
              ? 'As party leader, answer opposition questions. Strong performances boost approval. Weak answers fuel opposition attacks.'
              : 'As opposition leader, use Question Period to hold the government accountable. Sharp questions score political points.'
            }
          </Text>
        </View>

        {/* Current Question */}
        {currentQuestion ? (
          <View style={styles.activeQuestion}>
            <View style={styles.questionerInfo}>
              <MaterialCommunityIcons name="account-voice" size={20} color={Colors.error} />
              <Text style={styles.questionerLabel}>
                {gameState.isGoverning 
                  ? `${gameState.rivals[0]?.name?.split(' (')[0] || 'Opposition Leader'}:` 
                  : 'Moderator Question:'}
              </Text>
            </View>
            <Text style={styles.activeQuestionText}>"{currentQuestion}"</Text>
            
            <Text style={styles.answerLabel}>YOUR ANSWER:</Text>
            <TextInput
              style={styles.answerInput}
              multiline
              numberOfLines={5}
              placeholder="Rise in the House and respond... (Longer, more detailed answers perform better)"
              placeholderTextColor={Colors.textMuted}
              value={answer}
              onChangeText={setAnswer}
              textAlignVertical="top"
              autoFocus
            />
            
            <View style={styles.answerMeta}>
              <Text style={styles.wordCount}>{answer.trim().split(/\s+/).filter(Boolean).length} words</Text>
              <Text style={styles.wordCountTarget}>Target: 50+ words for best result</Text>
            </View>
            
            <View style={styles.answerActions}>
              <Pressable
                onPress={() => { setCurrentQuestion(null); setAnswer(''); }}
                style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.skipBtnText}>Skip Question</Text>
              </Pressable>
              <Pressable
                onPress={submitAnswer}
                disabled={!answer.trim()}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: party?.color || Colors.primary },
                  !answer.trim() && { opacity: 0.4 },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <MaterialCommunityIcons name="send" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Answer</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.noActiveQuestion}>
            {submitted.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="comment-question-outline" size={64} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Question Period</Text>
                <Text style={styles.emptySubtitle}>Tap below to receive a question from the opposition or moderator</Text>
              </View>
            ) : (
              <View style={styles.sessionSummary}>
                <Text style={styles.sectionTitle}>SESSION SUMMARY</Text>
                {submitted.map((s, idx) => (
                  <View key={idx} style={styles.answeredItem}>
                    <View style={[
                      styles.ratingBadge,
                      s.rating === 'excellent' ? { backgroundColor: Colors.success + '22' } :
                      s.rating === 'good' ? { backgroundColor: Colors.info + '22' } :
                      { backgroundColor: Colors.error + '22' }
                    ]}>
                      <Text style={[
                        styles.ratingText,
                        s.rating === 'excellent' ? { color: Colors.success } :
                        s.rating === 'good' ? { color: Colors.info } :
                        { color: Colors.error }
                      ]}>
                        {s.rating.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.answeredContent}>
                      <Text style={styles.answeredQ} numberOfLines={1}>{s.q}</Text>
                      <Text style={styles.answeredA} numberOfLines={2}>{s.a}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Question Generation */}
        {!currentQuestion ? (
          <View style={styles.generateSection}>
            <Pressable
              onPress={generateQuestion}
              style={({ pressed }) => [
                styles.generateBtn,
                { backgroundColor: party?.color || Colors.primary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons name="comment-question" size={20} color="#fff" />
              <Text style={styles.generateBtnText}>Receive Next Question</Text>
            </Pressable>
            
            {showCustomInput ? (
              <View style={styles.customQuestion}>
                <Text style={styles.customLabel}>Custom Question:</Text>
                <TextInput
                  style={styles.customInput}
                  placeholder="Type a question from the opposition..."
                  placeholderTextColor={Colors.textMuted}
                  value={customQuestion}
                  onChangeText={setCustomQuestion}
                />
                <Pressable
                  onPress={() => { startQuestion(customQuestion); setCustomQuestion(''); setShowCustomInput(false); }}
                  disabled={!customQuestion.trim()}
                  style={({ pressed }) => [styles.customSubmit, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.customSubmitText}>Use This Question</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowCustomInput(true)}
                style={({ pressed }) => [styles.customBtn, pressed && { opacity: 0.7 }]}
              >
                <MaterialCommunityIcons name="pencil" size={14} color={Colors.textSecondary} />
                <Text style={styles.customBtnText}>Write custom question</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  sessionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.success + '22',
  },
  sessionText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.success,
    letterSpacing: 0.5,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.gold + '11',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gold + '22',
  },
  contextText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  activeQuestion: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  questionerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  questionerLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.error,
    letterSpacing: 0.5,
  },
  activeQuestionText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  answerLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginTop: Spacing.xs,
  },
  answerInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 120,
    lineHeight: 22,
  },
  answerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wordCount: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  wordCountTarget: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  answerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  submitBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  noActiveQuestion: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  sessionSummary: {
    width: '100%',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  answeredItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  ratingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  ratingText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  answeredContent: {
    flex: 1,
  },
  answeredQ: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  answeredA: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  generateSection: {
    gap: Spacing.sm,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  generateBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  customBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  customQuestion: {
    gap: 8,
  },
  customLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  customInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  customSubmit: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  customSubmitText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
});
