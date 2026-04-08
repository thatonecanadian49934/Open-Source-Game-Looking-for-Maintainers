// Powered by OnSpace.AI — Press Conference with multiple news organizations
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, Animated, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

interface NewsOrgQuestion {
  outlet: string;
  bias: string;
  biasIcon: string;
  question: string;
  topic: string;
  answered: boolean;
  answer: string;
  performance: 'excellent' | 'good' | 'poor' | null;
}

const NEWS_ORGANIZATIONS = [
  { outlet: 'CBC News', bias: 'Centre', biasIcon: '🍁', color: Colors.liberal, topics: ['Healthcare', 'Indigenous', 'National Unity', 'Government'] },
  { outlet: 'Globe and Mail', bias: 'Centre-Right', biasIcon: '📰', color: Colors.conservative, topics: ['Economy', 'Fiscal Policy', 'Business', 'Markets'] },
  { outlet: 'Toronto Star', bias: 'Centre-Left', biasIcon: '⭐', color: Colors.ndp, topics: ['Housing', 'Labour', 'Immigration', 'Social Policy'] },
  { outlet: 'National Post', bias: 'Right', biasIcon: '🦅', color: Colors.conservative, topics: ['Fiscal Policy', 'Defence', 'Crime', 'Economy'] },
  { outlet: 'La Presse', bias: 'Centre', biasIcon: '🔵', color: Colors.liberal, topics: ['Quebec', 'Bilingualism', 'Culture', 'National Unity'] },
  { outlet: 'CTV News', bias: 'Centre', biasIcon: '📺', color: Colors.gold, topics: ['Politics', 'Healthcare', 'Crime', 'Economy'] },
  { outlet: 'Rebel News', bias: 'Far-Right', biasIcon: '🔥', color: Colors.error, topics: ['Immigration', 'Taxes', 'Governance', 'Freedom'] },
  { outlet: 'iPolitics', bias: 'Centre', biasIcon: '💻', color: Colors.info, topics: ['Parliament', 'Policy', 'Governance', 'Elections'] },
];

const FALLBACK_QUESTIONS: Record<string, Record<string, string>> = {
  'CBC News': {
    Healthcare: 'The Prime Minister continues to face questions about healthcare wait times. What specific commitments will you make today to reduce them?',
    Government: 'Canadians are watching this press conference closely. What is the single most important thing you want them to take away today?',
    default: 'CBC News asks: What is your government\'s top priority for the coming weeks, and how does it affect everyday Canadians?',
  },
  'Globe and Mail': {
    Economy: 'The markets are watching. What concrete fiscal measures will you announce today to address the deficit trajectory?',
    'Fiscal Policy': 'Bond markets are concerned about Canada\'s debt-to-GDP ratio. Will you commit to a specific debt reduction timeline today?',
    default: 'Globe and Mail: How does your government plan to balance the books while still investing in the priorities Canadians care about?',
  },
  'Toronto Star': {
    Housing: 'Young Canadians still cannot afford homes. After years of promises, what is your concrete plan to deliver affordability?',
    Immigration: 'Integration services are overwhelmed. What additional resources will you commit today to settlement programs?',
    default: 'Toronto Star: Workers and families are struggling with cost of living. What relief will your government deliver this week?',
  },
  'National Post': {
    'Fiscal Policy': 'Government spending has reached record highs. When does fiscal responsibility become a priority for this government?',
    Defence: 'Canada\'s NATO commitments remain unmet. Will you commit today to a specific timeline for reaching the 2% GDP defence target?',
    default: 'National Post: Critics say your government is fiscally reckless. How do you respond to those who say spending is out of control?',
  },
  'La Presse': {
    Quebec: 'Comment votre gouvernement entend-il répondre aux demandes du Québec concernant les transferts en santé?',
    default: 'La Presse asks: How will today\'s announcement affect Quebec, and has the province been consulted on this initiative?',
  },
  'CTV News': {
    Politics: 'Polls show your approval rating has been declining. What do you say to Canadians who are losing confidence in your leadership?',
    default: 'CTV News: Canadians watching at home want to know — what does this mean for their lives, and when will they see results?',
  },
  'Rebel News': {
    Immigration: 'Immigration levels are at historic highs. Will you commit today to reducing numbers back to historical averages?',
    Taxes: 'Canadians are overtaxed. Will you commit to meaningful tax cuts today, not just targeted credits?',
    default: 'Rebel News: Many Canadians feel the government is out of touch. What do you say to those who believe Ottawa is the problem, not the solution?',
  },
  'iPolitics': {
    Parliament: 'Parliamentary observers note the government has used closure repeatedly. Do you commit to allowing full debate on upcoming legislation?',
    default: 'iPolitics: On the procedural side — will your government commit to a more open and transparent parliamentary process this session?',
  },
};

const STATEMENT_TEMPLATES = [
  { label: 'Policy Statement', text: 'Today, I am pleased to announce a significant policy commitment that will directly benefit Canadian families. Our government has been working closely with partners across the country to develop this initiative, and I am confident it reflects our core values.' },
  { label: 'Economy Defence', text: 'The economic data speaks for itself: our government has created jobs, maintained growth, and delivered on our commitments to Canadians. We reject the opposition\'s characterization of our record and we will defend it on any stage.' },
  { label: 'Crisis Response', text: 'Let me be clear about the situation Canadians are facing. Our government takes this issue extremely seriously. We have been working around the clock and I am here today to outline exactly what we are doing and the timeline you can expect.' },
  { label: 'National Unity', text: 'Canada is stronger together. This week\'s events have reminded us of what unites us as Canadians: our shared values, our commitment to one another, and our belief in a government that works for everyone. I am here to speak to all Canadians today.' },
];

export default function PressStatementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, issuePressStatement } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [mode, setMode] = useState<'statement' | 'conference'>('statement');
  const [statement, setStatement] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [conferenceStarted, setConferenceStarted] = useState(false);
  const [orgQuestions, setOrgQuestions] = useState<NewsOrgQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [conferenceComplete, setConferenceComplete] = useState(false);
  const fadeFn = useRef(new Animated.Value(1)).current;

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;

  const selectedOrgs = NEWS_ORGANIZATIONS.slice(0, 5); // 5 news orgs per conference

  const generateConferenceQuestions = async (): Promise<NewsOrgQuestion[]> => {
    const questions: NewsOrgQuestion[] = [];

    // Try AI for first 3 orgs
    for (let i = 0; i < Math.min(3, selectedOrgs.length); i++) {
      const org = selectedOrgs[i];
      const topic = org.topics[Math.floor(Math.random() * org.topics.length)];
      let aiQuestion: string | null = null;

      try {
        const { data, error } = await supabase.functions.invoke('ai-question-period', {
          body: {
            partyName: party?.name,
            leaderName: gameState.playerName,
            isGoverning: gameState.isGoverning,
            stats: gameState.stats,
            currentEvents: gameState.currentEvents.slice(0, 2).map(e => ({ title: e.title, description: e.description })),
            rivals: [],
            weekNumber: gameState.currentWeek,
            parliamentNumber: gameState.parliamentNumber,
            recentNewsHeadlines: [],
            context: `Generate ONE sharp press conference question from a ${org.bias} journalist at ${org.outlet} about ${topic}. The question should reflect the outlet's political perspective (${org.bias}) and focus on ${topic}. Make it a realistic, tough question that a journalist would actually ask. Return just the question.`,
          },
        });
        if (data?.questions?.[0]?.question && !error) {
          aiQuestion = data.questions[0].question;
        }
      } catch {}

      const fallback = FALLBACK_QUESTIONS[org.outlet]?.[topic] || FALLBACK_QUESTIONS[org.outlet]?.default || `${org.outlet}: What is your response to ongoing concerns about ${topic}?`;

      questions.push({
        outlet: org.outlet,
        bias: org.bias,
        biasIcon: org.biasIcon,
        question: aiQuestion || fallback,
        topic,
        answered: false,
        answer: '',
        performance: null,
      });
    }

    // Fallback for remaining orgs
    for (let i = 3; i < selectedOrgs.length; i++) {
      const org = selectedOrgs[i];
      const topic = org.topics[Math.floor(Math.random() * org.topics.length)];
      const fallback = FALLBACK_QUESTIONS[org.outlet]?.[topic] || FALLBACK_QUESTIONS[org.outlet]?.default || `${org.outlet}: What is your message to Canadians on ${topic} today?`;
      questions.push({
        outlet: org.outlet,
        bias: org.bias,
        biasIcon: org.biasIcon,
        question: fallback,
        topic,
        answered: false,
        answer: '',
        performance: null,
      });
    }

    return questions;
  };

  const startPressConference = async () => {
    setLoadingQuestions(true);
    const questions = await generateConferenceQuestions();
    setOrgQuestions(questions);
    setCurrentQuestionIdx(0);
    setLoadingQuestions(false);
    setConferenceStarted(true);
  };

  const getPerformance = (wordCount: number): { perf: 'excellent' | 'good' | 'poor'; effect: number } => {
    if (wordCount >= 60) return { perf: 'excellent', effect: 4 };
    if (wordCount >= 30) return { perf: 'good', effect: 2 };
    if (wordCount >= 10) return { perf: 'poor', effect: -1 };
    return { perf: 'poor', effect: -3 };
  };

  const handleAnswerQuestion = () => {
    if (!currentAnswer.trim()) return;
    const wordCount = currentAnswer.trim().split(/\s+/).filter(Boolean).length;
    const { perf, effect } = getPerformance(wordCount);

    setOrgQuestions(prev => prev.map((q, i) =>
      i === currentQuestionIdx ? { ...q, answered: true, answer: currentAnswer, performance: perf } : q
    ));

    setCurrentAnswer('');
    Animated.sequence([
      Animated.timing(fadeFn, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeFn, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    if (currentQuestionIdx < orgQuestions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      setConferenceComplete(true);
      // Apply total effect
      const totalEffect = orgQuestions.reduce((sum, q) => {
        const wc = q.answer.trim().split(/\s+/).filter(Boolean).length;
        return sum + getPerformance(wc).effect;
      }, getPerformance(wordCount).effect);
      issuePressStatement(`Press conference responses on ${orgQuestions.map(q => q.topic).join(', ')}`);
    }
  };

  const handleSkipQuestion = () => {
    setOrgQuestions(prev => prev.map((q, i) =>
      i === currentQuestionIdx ? { ...q, answered: true, answer: '[No comment]', performance: 'poor' } : q
    ));
    setCurrentAnswer('');
    if (currentQuestionIdx < orgQuestions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      setConferenceComplete(true);
    }
  };

  const handleIssueStatement = () => {
    if (!statement.trim()) return;
    issuePressStatement(statement.trim());
    setSubmitted(true);
    showAlert('Statement Issued', 'Your press statement has been distributed to all major media outlets.');
  };

  const currentQ = orgQuestions[currentQuestionIdx];
  const currentOrg = NEWS_ORGANIZATIONS.find(o => o.outlet === currentQ?.outlet);
  const wordCount = currentAnswer.trim().split(/\s+/).filter(Boolean).length;

  // ── CONFERENCE COMPLETE ────────────────────────────────────────────────────
  if (conferenceComplete) {
    const totalEffect = orgQuestions.reduce((sum, q) => {
      const wc = q.answer.trim().split(/\s+/).filter(Boolean).length;
      return sum + getPerformance(wc).effect;
    }, 0);
    const overallPerf = totalEffect >= 12 ? 'DOMINANT' : totalEffect >= 6 ? 'STRONG' : totalEffect >= 0 ? 'ADEQUATE' : 'POOR';
    const perfColor = totalEffect >= 12 ? Colors.success : totalEffect >= 6 ? Colors.info : totalEffect >= 0 ? Colors.warning : Colors.error;

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Conference Complete</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.overallCard, { borderColor: perfColor + '55' }]}>
            <Text style={[styles.overallTitle, { color: perfColor }]}>{overallPerf}</Text>
            <Text style={styles.overallSub}>Press Conference Performance</Text>
            <Text style={styles.overallEffect}>Net approval impact: {totalEffect > 0 ? '+' : ''}{totalEffect}%</Text>
          </View>
          <Text style={styles.sectionLabel}>QUESTIONS & ANSWERS</Text>
          {orgQuestions.map((q, idx) => {
            const c = q.performance === 'excellent' ? Colors.success : q.performance === 'good' ? Colors.info : Colors.error;
            const org = NEWS_ORGANIZATIONS.find(o => o.outlet === q.outlet);
            return (
              <View key={idx} style={styles.qaCard}>
                <View style={styles.qaHeader}>
                  <Text style={styles.qaOutletIcon}>{q.biasIcon}</Text>
                  <Text style={[styles.qaOutlet, { color: org?.color || Colors.textSecondary }]}>{q.outlet}</Text>
                  <Text style={styles.qaTopic}>{q.topic}</Text>
                  <View style={{ flex: 1 }} />
                  <View style={[styles.perfBadge, { backgroundColor: c + '22' }]}>
                    <Text style={[styles.perfBadgeText, { color: c }]}>{q.performance?.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.qaQuestion}>Q: "{q.question}"</Text>
                <Text style={styles.qaAnswer} numberOfLines={2}>A: {q.answer || '[No comment]'}</Text>
              </View>
            );
          })}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.doneBtnText}>Return to Parliament</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── CONFERENCE IN PROGRESS ────────────────────────────────────────────────
  if (conferenceStarted && currentQ) {
    return (
      <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <View style={styles.backBtn} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Press Conference</Text>
            <Text style={styles.headerSub}>Question {currentQuestionIdx + 1} of {orgQuestions.length}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress dots */}
        <View style={styles.progressDotsRow}>
          {orgQuestions.map((q, idx) => (
            <View
              key={idx}
              style={[
                styles.progressDot,
                idx < currentQuestionIdx && { backgroundColor: Colors.success },
                idx === currentQuestionIdx && { backgroundColor: partyColor },
                idx > currentQuestionIdx && { backgroundColor: Colors.surfaceBorder },
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Outlet info */}
          <Animated.View style={{ opacity: fadeFn }}>
            <View style={[styles.outletCard, { borderColor: (currentOrg?.color || Colors.textSecondary) + '44' }]}>
              <Text style={styles.outletIcon}>{currentQ.biasIcon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.outletName, { color: currentOrg?.color || Colors.textSecondary }]}>{currentQ.outlet}</Text>
                <Text style={styles.outletBias}>{currentQ.bias} · {currentQ.topic}</Text>
              </View>
              <View style={[styles.biasBadge, { backgroundColor: (currentOrg?.color || Colors.textSecondary) + '22' }]}>
                <Text style={[styles.biasBadgeText, { color: currentOrg?.color || Colors.textSecondary }]}>{currentQ.bias}</Text>
              </View>
            </View>

            <View style={[styles.questionCard, { borderLeftColor: currentOrg?.color || Colors.textSecondary }]}>
              <Text style={[styles.journalistLabel, { color: currentOrg?.color || Colors.textSecondary }]}>
                {currentQ.outlet} journalist:
              </Text>
              <Text style={styles.questionText}>"{currentQ.question}"</Text>
            </View>
          </Animated.View>

          <View style={styles.answerSection}>
            <Text style={[styles.answerLabel, { color: partyColor }]}>{gameState.playerName} — Respond:</Text>
            <TextInput
              style={styles.answerInput}
              multiline
              numberOfLines={5}
              placeholder="Give a clear, substantive answer. Address the question directly. Aim for 30+ words for a strong performance..."
              placeholderTextColor={Colors.textMuted}
              value={currentAnswer}
              onChangeText={setCurrentAnswer}
              textAlignVertical="top"
            />
            <View style={styles.answerMeta}>
              <Text style={styles.wordCount}>{wordCount} words</Text>
              <View style={styles.wordBar}>
                {[10, 30, 60, 100].map((t, i) => (
                  <View key={i} style={[styles.wordBarSeg, wordCount >= t && {
                    backgroundColor: i === 0 ? Colors.error : i === 1 ? Colors.warning : i === 2 ? Colors.info : Colors.success,
                  }]} />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.answerActions}>
            <Pressable onPress={handleSkipQuestion} style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>Skip (−3%)</Text>
            </Pressable>
            <Pressable
              onPress={handleAnswerQuestion}
              disabled={!currentAnswer.trim()}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: partyColor },
                !currentAnswer.trim() && { opacity: 0.4 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons name="send" size={16} color="#fff" />
              <Text style={styles.submitBtnText}>
                {currentQuestionIdx < orgQuestions.length - 1 ? 'Answer — Next Question' : 'Final Answer — End Conference'}
              </Text>
            </Pressable>
          </View>

          {/* Prior answers */}
          {orgQuestions.filter(q => q.answered).length > 0 ? (
            <View style={styles.priorAnswers}>
              <Text style={styles.sectionLabel}>ANSWERED</Text>
              {orgQuestions.filter(q => q.answered).map((q, idx) => {
                const c = q.performance === 'excellent' ? Colors.success : q.performance === 'good' ? Colors.info : Colors.error;
                return (
                  <View key={idx} style={styles.priorRow}>
                    <Text style={styles.priorOutlet}>{q.biasIcon} {q.outlet}</Text>
                    <Text style={styles.priorTopic}>{q.topic}</Text>
                    <View style={[styles.priorPerf, { backgroundColor: c + '22' }]}>
                      <Text style={[styles.priorPerfText, { color: c }]}>{q.performance?.toUpperCase()}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── MODE SELECTION / STATEMENT ─────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>Media Relations</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mode selection */}
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode('statement')}
            style={[styles.modeBtn, mode === 'statement' && [styles.modeBtnActive, { borderColor: partyColor }]]}
          >
            <MaterialCommunityIcons name="newspaper" size={20} color={mode === 'statement' ? partyColor : Colors.textMuted} />
            <Text style={[styles.modeBtnText, mode === 'statement' && { color: partyColor }]}>Press Statement</Text>
            <Text style={styles.modeBtnDesc}>Release a written statement to all outlets</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('conference')}
            style={[styles.modeBtn, mode === 'conference' && [styles.modeBtnActive, { borderColor: partyColor }]]}
          >
            <MaterialCommunityIcons name="microphone" size={20} color={mode === 'conference' ? partyColor : Colors.textMuted} />
            <Text style={[styles.modeBtnText, mode === 'conference' && { color: partyColor }]}>Press Conference</Text>
            <Text style={styles.modeBtnDesc}>Face questions from {selectedOrgs.length} news organizations</Text>
          </Pressable>
        </View>

        {mode === 'statement' ? (
          submitted ? (
            <View style={styles.submittedCard}>
              <MaterialCommunityIcons name="check-circle" size={48} color={Colors.success} />
              <Text style={styles.submittedTitle}>Statement Distributed</Text>
              <Text style={styles.submittedSub}>Sent to CBC, Globe, Star, Post, CTV, and all major outlets</Text>
              <View style={styles.statementPreview}>
                <Text style={styles.statementPreviewText}>{statement}</Text>
              </View>
              <Pressable
                onPress={() => { setSubmitted(false); setStatement(''); }}
                style={styles.newStatementBtn}
              >
                <Text style={styles.newStatementBtnText}>Issue Another Statement</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Templates */}
              <Text style={styles.sectionLabel}>QUICK TEMPLATES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.templatesRow}>
                  {STATEMENT_TEMPLATES.map(t => (
                    <Pressable
                      key={t.label}
                      onPress={() => setStatement(t.text)}
                      style={({ pressed }) => [styles.templateChip, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={styles.templateChipText}>{t.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.sectionLabel}>STATEMENT</Text>
              <TextInput
                style={styles.statementInput}
                multiline
                numberOfLines={8}
                placeholder="Write your press statement..."
                placeholderTextColor={Colors.textMuted}
                value={statement}
                onChangeText={setStatement}
                textAlignVertical="top"
              />
              <View style={styles.inputMeta}>
                <Text style={styles.charCount}>{statement.length} characters</Text>
                <Text style={{ fontSize: FontSize.xs, color: statement.length > 200 ? Colors.success : Colors.textMuted }}>
                  {statement.length > 200 ? '● High Impact' : statement.length > 100 ? '● Moderate Impact' : '● Low Impact'}
                </Text>
              </View>

              <Pressable
                onPress={handleIssueStatement}
                disabled={!statement.trim()}
                style={({ pressed }) => [styles.conferenceStartBtn, { backgroundColor: partyColor }, !statement.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
              >
                <MaterialCommunityIcons name="send" size={18} color="#fff" />
                <Text style={styles.conferenceStartBtnText}>Release to Media</Text>
              </Pressable>
            </>
          )
        ) : (
          <>
            <View style={styles.conferenceInfo}>
              <MaterialCommunityIcons name="microphone" size={16} color={Colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.conferenceInfoTitle}>Press Conference Format</Text>
                <Text style={styles.conferenceInfoDesc}>
                  You will face questions from {selectedOrgs.length} news organizations with different political perspectives. Each outlet asks one tough question based on their editorial bias and current events. Longer, more substantive answers score higher. Your performance affects approval rating.
                </Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>ATTENDING ORGANIZATIONS</Text>
            {selectedOrgs.map(org => (
              <View key={org.outlet} style={styles.orgPreviewCard}>
                <Text style={styles.orgIcon}>{org.biasIcon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.orgName, { color: org.color }]}>{org.outlet}</Text>
                  <Text style={styles.orgBias}>{org.bias} · Topics: {org.topics.slice(0, 2).join(', ')}</Text>
                </View>
              </View>
            ))}

            {loadingQuestions ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="small" color={Colors.gold} />
                <Text style={styles.loadingText}>Preparing journalist questions...</Text>
              </View>
            ) : (
              <Pressable
                onPress={startPressConference}
                style={({ pressed }) => [styles.conferenceStartBtn, { backgroundColor: Colors.gold }, pressed && { opacity: 0.85 }]}
              >
                <MaterialCommunityIcons name="microphone" size={18} color="#fff" />
                <Text style={styles.conferenceStartBtnText}>Begin Press Conference</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  modeRow: { flexDirection: 'row', gap: Spacing.sm },
  modeBtn: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, alignItems: 'center', gap: 4 },
  modeBtnActive: { borderWidth: 2 },
  modeBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary, textAlign: 'center' },
  modeBtnDesc: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', lineHeight: 16 },
  templatesRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  templateChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  templateChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  statementInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 160, lineHeight: 24 },
  inputMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  charCount: { fontSize: FontSize.xs, color: Colors.textMuted },
  conferenceInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.gold + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.md },
  conferenceInfoTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold, marginBottom: 4 },
  conferenceInfoDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  orgPreviewCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm },
  orgIcon: { fontSize: 20 },
  orgName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  orgBias: { fontSize: FontSize.xs, color: Colors.textMuted },
  loadingCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: Spacing.md },
  loadingText: { fontSize: FontSize.xs, color: Colors.textMuted },
  conferenceStartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  conferenceStartBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  submittedCard: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  submittedTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.success },
  submittedSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  statementPreview: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, width: '100%' },
  statementPreviewText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, fontStyle: 'italic' },
  newStatementBtn: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl, borderWidth: 1, borderColor: Colors.surfaceBorder },
  newStatementBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  // Conference
  progressDotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  progressDot: { width: 28, height: 6, borderRadius: 3 },
  outletCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  outletIcon: { fontSize: 24 },
  outletName: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  outletBias: { fontSize: FontSize.xs, color: Colors.textMuted },
  biasBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  biasBadgeText: { fontSize: 9, fontWeight: FontWeight.bold },
  questionCard: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, borderLeftWidth: 4, padding: Spacing.md, gap: 6 },
  journalistLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  questionText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary, lineHeight: 26, fontStyle: 'italic' },
  answerSection: { gap: 8 },
  answerLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1 },
  answerInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 120, lineHeight: 22 },
  answerMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordCount: { fontSize: FontSize.xs, color: Colors.textSecondary },
  wordBar: { flexDirection: 'row', gap: 3 },
  wordBarSeg: { width: 20, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceBorder },
  answerActions: { flexDirection: 'row', gap: Spacing.sm },
  skipBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  skipBtnText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  submitBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
  submitBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
  priorAnswers: { gap: Spacing.xs },
  priorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  priorOutlet: { fontSize: FontSize.xs, color: Colors.textSecondary, width: 100 },
  priorTopic: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted },
  priorPerf: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  priorPerfText: { fontSize: 9, fontWeight: FontWeight.bold },
  // Complete
  overallCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 2, padding: Spacing.xl, alignItems: 'center', gap: 8 },
  overallTitle: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold },
  overallSub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  overallEffect: { fontSize: FontSize.base, color: Colors.textSecondary },
  qaCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 6 },
  qaHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qaOutletIcon: { fontSize: 14 },
  qaOutlet: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  qaTopic: { fontSize: FontSize.xs, color: Colors.textMuted },
  perfBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  perfBadgeText: { fontSize: 9, fontWeight: FontWeight.bold },
  qaQuestion: { fontSize: FontSize.xs, color: Colors.textPrimary, fontStyle: 'italic', lineHeight: 18 },
  qaAnswer: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  doneBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, borderRadius: Radius.md },
  doneBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
});
