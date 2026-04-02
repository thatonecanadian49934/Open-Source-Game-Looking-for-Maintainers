// Powered by OnSpace.AI — Supreme Court system and bill challenges
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  KeyboardAvoidingView, Platform,
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

export type CourtLevel = 'provincial_superior' | 'federal_court_of_appeal' | 'supreme_court';
export type CaseStatus = 'filed' | 'hearing' | 'decided' | 'appealed' | 'final';
export type CaseOutcome = 'government_wins' | 'citizens_win' | 'partial' | 'pending';

interface CourtQuestion {
  question: string;
  topic: string;
}

interface CourtCase {
  id: string;
  billTitle: string;
  plaintiff: string;
  rightViolated: string;
  description: string;
  level: CourtLevel;
  status: CaseStatus;
  outcome: CaseOutcome;
  weekFiled: number;
  weekDecided?: number;
  agAnswers: string[];
  questions: CourtQuestion[];
  canEscalate: boolean;
  escalatedFrom?: CourtLevel;
}

const COURT_LEVEL_NAMES: Record<CourtLevel, string> = {
  provincial_superior: 'Provincial Superior Court',
  federal_court_of_appeal: 'Federal Court of Appeal',
  supreme_court: 'Supreme Court of Canada',
};

const COURT_LEVEL_ICONS: Record<CourtLevel, string> = {
  provincial_superior: 'domain',
  federal_court_of_appeal: 'bank',
  supreme_court: 'gavel',
};

const COURT_LEVEL_ORDER: CourtLevel[] = ['provincial_superior', 'federal_court_of_appeal', 'supreme_court'];

const CHARTER_RIGHTS = [
  'Section 2 — Freedom of Expression',
  'Section 7 — Right to Life, Liberty & Security',
  'Section 8 — Freedom from Unreasonable Search',
  'Section 9 — Right against Arbitrary Detention',
  'Section 10 — Right to Retain Counsel',
  'Section 11 — Rights of Accused Persons',
  'Section 12 — Right against Cruel Treatment',
  'Section 15 — Right to Equality',
  'Section 6 — Mobility Rights',
];

const SAMPLE_CASES: CourtCase[] = [
  {
    id: 'case_001',
    billTitle: 'Bill C-121: Digital Surveillance Act',
    plaintiff: 'Canadian Civil Liberties Association',
    rightViolated: 'Section 8 — Freedom from Unreasonable Search',
    description: 'The CCLA argues that warrantless access to Canadians\' digital communications violates Section 8 of the Charter. The legislation enables CSIS to access metadata without judicial oversight.',
    level: 'provincial_superior',
    status: 'hearing',
    outcome: 'pending',
    weekFiled: 1,
    agAnswers: [],
    questions: [],
    canEscalate: false,
  },
];

function getNextCourtLevel(current: CourtLevel): CourtLevel | null {
  const idx = COURT_LEVEL_ORDER.indexOf(current);
  return idx < COURT_LEVEL_ORDER.length - 1 ? COURT_LEVEL_ORDER[idx + 1] : null;
}

export default function SupremeCourtScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [cases, setCases] = useState<CourtCase[]>(SAMPLE_CASES);
  const [selectedCase, setSelectedCase] = useState<CourtCase | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [agAnswers, setAgAnswers] = useState<string[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [useAIAG, setUseAIAG] = useState<Record<string, boolean>>({}); // per-case: true = AI AG handles
  const [aiAGNotifications, setAIAGNotifications] = useState<{ caseId: string; message: string; week: number }[]>([]);
  const [activeView, setActiveView] = useState<'list' | 'hearing'>('list');

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const isGoverning = gameState.isGoverning;

  // ── PM ONLY GATE ──
  if (!isGoverning) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <MaterialCommunityIcons name="gavel" size={18} color={Colors.gold} />
            <Text style={styles.headerTitle}>Canadian Court System</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md }}>
          <MaterialCommunityIcons name="lock" size={48} color={Colors.textMuted} />
          <Text style={{ fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textSecondary, textAlign: 'center' }}>Prime Minister Only</Text>
          <Text style={{ fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
            The court system interface is only accessible to the Prime Minister. Courts handle Charter challenges to government legislation.
          </Text>
        </View>
      </View>
    );
  }

  const generateCourtQuestions = async (courtCase: CourtCase): Promise<CourtQuestion[]> => {
    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-question-period', {
        body: {
          partyName: party?.name,
          leaderName: `Attorney General speaking for ${gameState.playerName}\'s government`,
          isGoverning: true,
          stats: gameState.stats,
          currentEvents: [],
          rivals: [],
          weekNumber: gameState.currentWeek,
          parliamentNumber: gameState.parliamentNumber,
          recentNewsHeadlines: [],
          context: `This is a court hearing — ${COURT_LEVEL_NAMES[courtCase.level]}. The case is: ${courtCase.billTitle}. The plaintiff is ${courtCase.plaintiff}. The right allegedly violated is ${courtCase.rightViolated}. Generate 3 sharp legal questions for the Attorney General defending the legislation. Questions should focus on Charter compliance, proportionality, and legislative intent.`,
        },
      });
      if (!error && data?.questions) {
        return data.questions.slice(0, 3).map((q: any) => ({ question: q.question, topic: q.topic || 'Charter' }));
      }
    } catch {}
    setLoadingQuestions(false);
    // Fallback questions
    return [
      { question: `The ${courtCase.rightViolated} guarantee is explicit in the Charter. How does ${courtCase.billTitle} satisfy the Section 1 reasonable limits test?`, topic: 'Charter Analysis' },
      { question: 'Critics argue this legislation is overbroad and captures innocent Canadians in its scope. What evidence supports a proportionate approach?', topic: 'Proportionality' },
      { question: `Is there a less rights-limiting alternative that would achieve the same legislative objective? Why did the government reject those alternatives?`, topic: 'Alternatives' },
    ];
  };

  const handleChooseRepresentation = (courtCase: CourtCase) => {
    showAlert(
      'Attorney General Representation',
      'Choose how to handle this case:\n\n• Respond yourself: You answer 3 judicial questions directly.\n• AI Attorney General: The AG automatically defends the legislation. You receive weekly notifications on case updates.',
      [
        { text: 'I will respond myself', onPress: () => openHearing(courtCase) },
        {
          text: 'AI Attorney General',
          onPress: () => {
            setUseAIAG(prev => ({ ...prev, [courtCase.id]: true }));
            // Simulate AI AG handling
            const govWins = Math.random() > 0.4;
            const outcome: CaseOutcome = govWins ? 'government_wins' : Math.random() > 0.5 ? 'citizens_win' : 'partial';
            const notification = `Week ${gameState?.currentWeek || 0}: AI Attorney General has argued the government's case before ${COURT_LEVEL_NAMES[courtCase.level]}. The court will deliver its ruling next week.`;
            setAIAGNotifications(prev => [...prev, { caseId: courtCase.id, message: notification, week: gameState?.currentWeek || 0 }]);
            // Decide ruling after delay
            setTimeout(() => {
              setCases(prev => prev.map(c => c.id === courtCase.id ? { ...c, status: 'decided', outcome, canEscalate: true, agAnswers: ['[AI Attorney General argued on government\'s behalf]'] } : c));
              const rulingNotif = `${COURT_LEVEL_NAMES[courtCase.level]} ruled on ${courtCase.billTitle}: ${outcome === 'government_wins' ? 'Government prevails — legislation upheld.' : outcome === 'citizens_win' ? 'Citizens win — legislation struck down.' : 'Partial ruling — amendments required.'}`;
              setAIAGNotifications(prev => [...prev, { caseId: courtCase.id, message: rulingNotif, week: (gameState?.currentWeek || 0) + 1 }]);
              showAlert('Court Ruling', rulingNotif);
            }, 2000);
            showAlert('AI AG Engaged', `The Attorney General will argue this case before ${COURT_LEVEL_NAMES[courtCase.level]}. You will receive a notification when the ruling is delivered.`);
          },
        },
      ]
    );
  };

  const openHearing = async (courtCase: CourtCase) => {
    setSelectedCase(courtCase);
    setAgAnswers([]);
    setCurrentQIdx(0);
    setCurrentAnswer('');
    if (courtCase.questions.length === 0) {
      const questions = await generateCourtQuestions(courtCase);
      setCases(prev => prev.map(c => c.id === courtCase.id ? { ...c, questions } : c));
      setSelectedCase(prev => prev ? { ...prev, questions } : null);
    }
    setLoadingQuestions(false);
    setActiveView('hearing');
  };

  const submitAgAnswer = () => {
    if (!currentAnswer.trim() || !selectedCase) return;
    const newAnswers = [...agAnswers, currentAnswer];
    setAgAnswers(newAnswers);
    setCurrentAnswer('');
    if (newAnswers.length >= selectedCase.questions.length) {
      // Render verdict
      const words = newAnswers.reduce((s, a) => s + a.split(' ').length, 0);
      const govWins = words > 150 ? Math.random() > 0.35 : Math.random() > 0.6;
      const outcome: CaseOutcome = govWins ? 'government_wins' : Math.random() > 0.5 ? 'citizens_win' : 'partial';
      setCases(prev => prev.map(c => c.id === selectedCase.id ? {
        ...c, status: 'decided', outcome, weekDecided: gameState.currentWeek,
        agAnswers: newAnswers, canEscalate: true,
      } : c));
      setSelectedCase(prev => prev ? { ...prev, status: 'decided', outcome, canEscalate: true, agAnswers: newAnswers } : null);
    } else {
      setCurrentQIdx(prev => prev + 1);
    }
  };

  const handleEscalate = (courtCase: CourtCase, byGov: boolean) => {
    const nextLevel = getNextCourtLevel(courtCase.level);
    if (!nextLevel) {
      showAlert('No Higher Court', 'This case has reached the Supreme Court of Canada — the final arbiter.');
      return;
    }
    showAlert(
      `Appeal to ${COURT_LEVEL_NAMES[nextLevel]}?`,
      `The case will be escalated to a higher court. A new 3-question hearing will be conducted. Legal costs increase.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'File Appeal',
          onPress: () => {
            const escalatedCase: CourtCase = {
              ...courtCase,
              id: `case_${Date.now()}`,
              level: nextLevel,
              status: 'hearing',
              outcome: 'pending',
              weekFiled: gameState.currentWeek,
              agAnswers: [],
              questions: [],
              canEscalate: false,
              escalatedFrom: courtCase.level,
            };
            setCases(prev => [...prev, escalatedCase]);
            setCases(prev => prev.map(c => c.id === courtCase.id ? { ...c, canEscalate: false } : c));
            showAlert('Appeal Filed', `The case has been escalated to ${COURT_LEVEL_NAMES[nextLevel]}.`);
            setActiveView('list');
          },
        },
      ]
    );
  };

  const getOutcomeColor = (outcome: CaseOutcome) => {
    if (outcome === 'government_wins') return Colors.success;
    if (outcome === 'citizens_win') return Colors.error;
    if (outcome === 'partial') return Colors.warning;
    return Colors.textMuted;
  };

  const getOutcomeLabel = (outcome: CaseOutcome) => {
    if (outcome === 'government_wins') return 'Government Prevails';
    if (outcome === 'citizens_win') return 'Legislation Struck Down';
    if (outcome === 'partial') return 'Partial — Legislation Modified';
    return 'Pending Decision';
  };

  // ── HEARING VIEW ──
  if (activeView === 'hearing' && selectedCase) {
    const currentQ = selectedCase.questions[currentQIdx];
    const isAnsweringPhase = agAnswers.length < selectedCase.questions.length && selectedCase.status === 'hearing';
    const isDecided = selectedCase.status === 'decided';
    const outcomeColor = getOutcomeColor(selectedCase.outcome);

    return (
      <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.hearingHeader, { borderBottomColor: Colors.gold + '44' }]}>
          <Pressable onPress={() => setActiveView('list')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.hearingHeaderCenter}>
            <MaterialCommunityIcons name={COURT_LEVEL_ICONS[selectedCase.level] as any} size={16} color={Colors.gold} />
            <Text style={styles.hearingHeaderTitle}>{COURT_LEVEL_NAMES[selectedCase.level]}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.hearingContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Case card */}
          <View style={styles.caseCard}>
            <Text style={styles.caseTitle}>{selectedCase.billTitle}</Text>
            <Text style={[styles.casePlaintiff]}>Plaintiff: <Text style={{ color: Colors.error }}>{selectedCase.plaintiff}</Text></Text>
            <View style={styles.rightViolatedPill}>
              <MaterialCommunityIcons name="scale-balance" size={12} color={Colors.warning} />
              <Text style={styles.rightViolatedText}>{selectedCase.rightViolated}</Text>
            </View>
            <Text style={styles.caseDesc}>{selectedCase.description}</Text>
          </View>

          {/* VERDICT */}
          {isDecided ? (
            <View style={[styles.verdictCard, { borderColor: outcomeColor + '55', backgroundColor: outcomeColor + '08' }]}>
              <MaterialCommunityIcons name={selectedCase.outcome === 'government_wins' ? 'check-decagram' : selectedCase.outcome === 'citizens_win' ? 'close-circle' : 'alert-decagram'} size={48} color={outcomeColor} />
              <Text style={[styles.verdictTitle, { color: outcomeColor }]}>{getOutcomeLabel(selectedCase.outcome)}</Text>
              <Text style={styles.verdictDesc}>
                {selectedCase.outcome === 'government_wins'
                  ? `${COURT_LEVEL_NAMES[selectedCase.level]} upheld the legislation. The Attorney General\'s arguments satisfied the Section 1 reasonable limits test.`
                  : selectedCase.outcome === 'citizens_win'
                  ? `The Court found ${selectedCase.billTitle} violates the Charter. The legislation is suspended pending amendment.`
                  : `The Court issued a modified ruling. Certain provisions must be amended within 12 months to comply with Charter standards.`}
              </Text>
              <View style={styles.escalateSection}>
                <Text style={styles.escalateTitle}>APPEAL OPTIONS</Text>
                {getNextCourtLevel(selectedCase.level) ? (
                  <>
                    {selectedCase.outcome !== 'government_wins' ? (
                      <Pressable onPress={() => handleEscalate(selectedCase, true)} style={({ pressed }) => [styles.escalateBtn, { borderColor: partyColor + '66' }, pressed && { opacity: 0.85 }]}>
                        <MaterialCommunityIcons name="arrow-up-circle" size={16} color={partyColor} />
                        <Text style={[styles.escalateBtnText, { color: partyColor }]}>
                          Government appeals to {COURT_LEVEL_NAMES[getNextCourtLevel(selectedCase.level)!]}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable onPress={() => handleEscalate(selectedCase, false)} style={({ pressed }) => [styles.escalateBtn, { borderColor: Colors.warning + '66' }, pressed && { opacity: 0.85 }]}>
                      <MaterialCommunityIcons name="arrow-up-circle" size={16} color={Colors.warning} />
                      <Text style={[styles.escalateBtnText, { color: Colors.warning }]}>
                        Citizens appeal to {COURT_LEVEL_NAMES[getNextCourtLevel(selectedCase.level)!]}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.finalRuling}>
                    <MaterialCommunityIcons name="gavel" size={14} color={Colors.gold} />
                    <Text style={styles.finalRulingText}>Supreme Court ruling is final and binding on all courts and governments.</Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {/* QUESTIONS */}
          {!isDecided && isAnsweringPhase ? (
            <>
              {loadingQuestions ? (
                <View style={styles.loadingCard}>
                  <MaterialCommunityIcons name="robot" size={24} color={Colors.gold} />
                  <Text style={styles.loadingText}>Generating legal questions...</Text>
                </View>
              ) : currentQ ? (
                <>
                  <View style={styles.agRoleCard}>
                    <MaterialCommunityIcons name="briefcase" size={14} color={partyColor} />
                    <Text style={[styles.agRoleText, { color: partyColor }]}>You are the Attorney General defending {party?.shortName} government legislation</Text>
                  </View>
                  <View style={styles.qProgress}>
                    {selectedCase.questions.map((_, idx) => (
                      <View key={idx} style={[styles.qDot, agAnswers.length > idx && { backgroundColor: Colors.success }, currentQIdx === idx && { backgroundColor: Colors.gold }]} />
                    ))}
                    <Text style={styles.qProgressText}>Question {currentQIdx + 1}/{selectedCase.questions.length}</Text>
                  </View>
                  <View style={[styles.courtQuestionCard, { borderColor: Colors.gold + '33' }]}>
                    <View style={styles.courtJudgeRow}>
                      <MaterialCommunityIcons name="scale-balance" size={14} color={Colors.gold} />
                      <Text style={styles.courtJudgeText}>Justice of the {COURT_LEVEL_NAMES[selectedCase.level]}</Text>
                      <View style={styles.topicPill}>
                        <Text style={styles.topicPillText}>{currentQ.topic}</Text>
                      </View>
                    </View>
                    <Text style={styles.courtQuestionText}>{currentQ.question}</Text>
                  </View>
                  <View style={styles.agAnswerSection}>
                    <Text style={styles.sectionLabel}>ATTORNEY GENERAL'S RESPONSE:</Text>
                    <TextInput
                      style={styles.agAnswerInput}
                      multiline
                      placeholder="Defend the legislation on constitutional grounds. Address proportionality, legislative purpose, and Charter compliance. Longer, substantive answers carry more weight..."
                      placeholderTextColor={Colors.textMuted}
                      value={currentAnswer}
                      onChangeText={setCurrentAnswer}
                      textAlignVertical="top"
                    />
                    <Pressable
                      onPress={submitAgAnswer}
                      disabled={!currentAnswer.trim()}
                      style={({ pressed }) => [styles.submitBtn, { backgroundColor: partyColor }, !currentAnswer.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
                    >
                      <MaterialCommunityIcons name="gavel" size={16} color="#fff" />
                      <Text style={styles.submitBtnText}>
                        {currentQIdx < selectedCase.questions.length - 1 ? 'Submit — Next Question' : 'Final Response — Await Ruling'}
                      </Text>
                    </Pressable>
                  </View>
                  {agAnswers.length > 0 ? (
                    <View style={styles.prevAnswers}>
                      <Text style={styles.sectionLabel}>PREVIOUS ANSWERS</Text>
                      {agAnswers.map((a, idx) => (
                        <View key={idx} style={styles.prevAnswerItem}>
                          <Text style={styles.prevQ} numberOfLines={2}>{selectedCase.questions[idx]?.question}</Text>
                          <Text style={styles.prevA} numberOfLines={3}>{a}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── CASE LIST VIEW ──
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="gavel" size={18} color={Colors.gold} />
          <Text style={styles.headerTitle}>Canadian Court System</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Court hierarchy */}
      <View style={styles.hierarchyBar}>
        {COURT_LEVEL_ORDER.map((level, idx) => (
          <React.Fragment key={level}>
            <View style={[styles.hierarchyItem, { flex: 1 }]}>
              <MaterialCommunityIcons name={COURT_LEVEL_ICONS[level] as any} size={12} color={Colors.gold} />
              <Text style={styles.hierarchyLabel}>{level === 'provincial_superior' ? 'Superior' : level === 'federal_court_of_appeal' ? 'Appeal' : 'Supreme'}</Text>
            </View>
            {idx < 2 ? <MaterialCommunityIcons name="arrow-right" size={12} color={Colors.textMuted} /> : null}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {/* AI AG notifications */}
        {aiAGNotifications.length > 0 ? (
          <View style={styles.agNotifSection}>
            <Text style={styles.sectionLabel}>AI ATTORNEY GENERAL UPDATES</Text>
            {aiAGNotifications.map((n, idx) => (
              <View key={idx} style={styles.agNotifCard}>
                <MaterialCommunityIcons name="robot" size={13} color={Colors.info} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.agNotifWeek}>Week {n.week}</Text>
                  <Text style={styles.agNotifText}>{n.message}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.courtIntro}>
          <MaterialCommunityIcons name="scale-balance" size={14} color={Colors.info} />
          <Text style={styles.courtIntroText}>
            {isGoverning
              ? 'As PM, you must defend government legislation against Charter challenges. The Attorney General answers 3 judicial questions per hearing. Citizens or government can appeal through all 3 court levels.'
              : 'Opposition parties can initiate court challenges against government bills that violate Charter rights. Citizens may also sue governments that invoke the Emergencies Act.'}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>ACTIVE CASES</Text>
        {cases.map(c => {
          const outcomeColor = getOutcomeColor(c.outcome);
          const isDecided = c.status === 'decided';
          return (
            <View key={c.id} style={styles.caseListCard}>
              <View style={styles.caseListHeader}>
                <MaterialCommunityIcons name={COURT_LEVEL_ICONS[c.level] as any} size={16} color={Colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.caseListTitle}>{c.billTitle}</Text>
                  <Text style={styles.caseListPlaintiff}>{c.plaintiff} v. Her Majesty the King</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: isDecided ? outcomeColor + '22' : Colors.warning + '22' }]}>
                  <Text style={[styles.statusBadgeText, { color: isDecided ? outcomeColor : Colors.warning }]}>
                    {isDecided ? 'DECIDED' : 'HEARING'}
                  </Text>
                </View>
              </View>
              <View style={styles.caseListMeta}>
                <Text style={styles.caseListCourt}>{COURT_LEVEL_NAMES[c.level]}</Text>
                <Text style={styles.caseListRight}>{c.rightViolated}</Text>
              </View>
              {isDecided ? (
                <View style={[styles.caseOutcomeRow, { backgroundColor: outcomeColor + '11' }]}>
                  <MaterialCommunityIcons name={c.outcome === 'government_wins' ? 'check-circle' : c.outcome === 'citizens_win' ? 'close-circle' : 'alert-circle'} size={12} color={outcomeColor} />
                  <Text style={[styles.caseOutcomeText, { color: outcomeColor }]}>{getOutcomeLabel(c.outcome)}</Text>
                </View>
              ) : null}
              <View style={styles.caseListActions}>
                {!isDecided ? (
                  <Pressable onPress={() => useAIAG[c.id] ? showAlert('AI AG Active', aiAGNotifications.filter(n => n.caseId === c.id).slice(-1)[0]?.message || 'AI Attorney General is handling this case.') : handleChooseRepresentation(c)} style={({ pressed }) => [styles.hearingBtn, { backgroundColor: useAIAG[c.id] ? Colors.textMuted : partyColor }, pressed && { opacity: 0.85 }]}>
                    <MaterialCommunityIcons name={useAIAG[c.id] ? 'robot' : 'gavel'} size={13} color="#fff" />
                    <Text style={styles.hearingBtnText}>{useAIAG[c.id] ? 'AI AG Handling' : 'Choose Representation'}</Text>
                  </Pressable>
                ) : c.canEscalate && getNextCourtLevel(c.level) ? (
                  <Pressable onPress={() => handleEscalate(c, true)} style={({ pressed }) => [styles.appealBtn, pressed && { opacity: 0.85 }]}>
                    <MaterialCommunityIcons name="arrow-up-circle" size={13} color={Colors.warning} />
                    <Text style={styles.appealBtnText}>File Appeal</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => { setSelectedCase(c); setActiveView('hearing'); }} style={({ pressed }) => [styles.viewBtn, pressed && { opacity: 0.8 }]}>
                    <Text style={styles.viewBtnText}>View Ruling</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {cases.length === 0 ? (
          <View style={styles.emptyCases}>
            <MaterialCommunityIcons name="scale-balance" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyCasesTitle}>No Active Court Cases</Text>
            <Text style={styles.emptyCasesDesc}>When bills are passed that may infringe Charter rights, citizens or opposition parties can challenge them in court. Cases will appear here.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  hierarchyBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  hierarchyItem: { alignItems: 'center', gap: 2 },
  hierarchyLabel: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.gold, letterSpacing: 0.5 },
  listContent: { padding: Spacing.md, gap: Spacing.md },
  courtIntro: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.info + '11', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.info + '22' },
  courtIntroText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 18 },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  agNotifSection: { gap: 6 },
  agNotifCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.info + '0D', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.info + '22' },
  agNotifWeek: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.info, marginBottom: 2 },
  agNotifText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  caseListCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  caseListHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  caseListTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  caseListPlaintiff: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusBadgeText: { fontSize: 9, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },
  caseListMeta: { gap: 2 },
  caseListCourt: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: FontWeight.semibold },
  caseListRight: { fontSize: FontSize.xs, color: Colors.textMuted },
  caseOutcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.sm, padding: 6 },
  caseOutcomeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, flex: 1 },
  caseListActions: { flexDirection: 'row', gap: 8 },
  hearingBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.sm },
  hearingBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#fff' },
  appealBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.sm, backgroundColor: Colors.warning + '22', borderWidth: 1, borderColor: Colors.warning + '44' },
  appealBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.warning },
  viewBtn: { paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: Radius.sm, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  viewBtnText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  emptyCases: { alignItems: 'center', paddingVertical: 48, gap: Spacing.sm },
  emptyCasesTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  emptyCasesDesc: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.md },
  // Hearing view
  hearingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, backgroundColor: Colors.surface },
  hearingHeaderCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  hearingHeaderTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.gold },
  hearingContent: { padding: Spacing.md, gap: Spacing.md },
  caseCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  caseTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  casePlaintiff: { fontSize: FontSize.xs, color: Colors.textSecondary },
  rightViolatedPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.warning + '11', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.warning + '33' },
  rightViolatedText: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.medium },
  caseDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  verdictCard: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  verdictTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, textAlign: 'center' },
  verdictDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  escalateSection: { width: '100%', gap: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  escalateTitle: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  escalateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: Spacing.md, borderRadius: Radius.sm, borderWidth: 1, backgroundColor: Colors.card },
  escalateBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, flex: 1 },
  finalRuling: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.gold + '11', borderRadius: Radius.sm, padding: Spacing.sm },
  finalRulingText: { flex: 1, fontSize: FontSize.xs, color: Colors.gold, lineHeight: 17 },
  loadingCard: { alignItems: 'center', gap: 8, padding: Spacing.xl },
  loadingText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  agRoleCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  agRoleText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, flex: 1 },
  qProgress: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qDot: { width: 20, height: 6, borderRadius: 3, backgroundColor: Colors.surfaceBorder },
  qProgressText: { fontSize: FontSize.xs, color: Colors.textMuted, marginLeft: 'auto' },
  courtQuestionCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 8 },
  courtJudgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  courtJudgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.gold, flex: 1 },
  topicPill: { backgroundColor: Colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder },
  topicPillText: { fontSize: 9, color: Colors.textMuted },
  courtQuestionText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, lineHeight: 24 },
  agAnswerSection: { gap: 8 },
  agAnswerInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 140, lineHeight: 22 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  submitBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  prevAnswers: { gap: 6 },
  prevAnswerItem: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: Spacing.sm, gap: 4 },
  prevQ: { fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic' },
  prevA: { fontSize: FontSize.xs, color: Colors.textSecondary },
});
