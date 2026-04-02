// Powered by OnSpace.AI — Emergencies Act scenario with Charter challenges, media scrutiny, opposition attacks
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';
import { getSupabaseClient } from '@/template';

// ── Types ─────────────────────────────────────────────────────────────────────
type EmergencyType = 'riot' | 'pandemic' | 'natural_disaster' | 'national_security' | 'economic_crisis';
type ActPhase = 'crisis_alert' | 'deliberate' | 'invoked' | 'inquiry' | 'lifted' | 'court_challenge';

interface EmergencyMeasure {
  id: string;
  label: string;
  description: string;
  approvalImpact: number;
  constitutionalRisk: number; // 0-100
  effectiveness: number; // 0-100
  selected: boolean;
  charter: string; // Charter section at risk
}

interface OppositionAttack {
  partyName: string;
  leaderName: string;
  attack: string;
  intensity: 'mild' | 'fierce' | 'scathing';
}

interface MediaStory {
  outlet: string;
  headline: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

const EMERGENCY_TYPE_META: Record<EmergencyType, { icon: string; color: string; label: string; threshold: string }> = {
  riot: { icon: 'fire', color: Colors.error, label: 'Civil Unrest / Riots', threshold: 'War popularity below 20% or sustained public unrest' },
  pandemic: { icon: 'virus', color: Colors.warning, label: 'Public Health Emergency', threshold: 'Disease event reaches critical severity' },
  natural_disaster: { icon: 'weather-hurricane', color: Colors.info, label: 'Natural Disaster', threshold: 'Catastrophic weather or geological event' },
  national_security: { icon: 'shield-alert', color: Colors.error, label: 'National Security Threat', threshold: 'Foreign threat or domestic terrorism reaches crisis level' },
  economic_crisis: { icon: 'chart-line-variant', color: Colors.warning, label: 'Economic Emergency', threshold: 'GDP collapse or financial system failure' },
};

const EMERGENCY_MEASURES: EmergencyMeasure[] = [
  {
    id: 'curfew',
    label: 'National Curfew (10pm-6am)',
    description: 'Restrict movement during overnight hours in affected areas. Military assists police in enforcement.',
    approvalImpact: -8,
    constitutionalRisk: 72,
    effectiveness: 65,
    selected: false,
    charter: 'Section 9 — Freedom from Arbitrary Detention',
  },
  {
    id: 'assembly_ban',
    label: 'Ban Public Gatherings (50+)',
    description: 'Prohibit public assemblies of 50 or more persons until the emergency is declared over.',
    approvalImpact: -10,
    constitutionalRisk: 85,
    effectiveness: 70,
    selected: false,
    charter: 'Section 2(c) — Freedom of Peaceful Assembly',
  },
  {
    id: 'freeze_accounts',
    label: 'Freeze Suspicious Financial Accounts',
    description: 'Grant FINTRAC authority to freeze accounts of persons financing illegal activity during the emergency.',
    approvalImpact: -6,
    constitutionalRisk: 60,
    effectiveness: 55,
    selected: false,
    charter: 'Section 8 — Freedom from Unreasonable Search',
  },
  {
    id: 'military_deployment',
    label: 'Deploy Military in Major Cities',
    description: 'Authorize Canadian Armed Forces to maintain order in Toronto, Montreal, and Vancouver.',
    approvalImpact: -5,
    constitutionalRisk: 45,
    effectiveness: 80,
    selected: false,
    charter: 'Section 7 — Right to Security of the Person',
  },
  {
    id: 'media_restriction',
    label: 'Restrict Coverage of Emergency Zones',
    description: 'Restrict media access to active emergency zones for security reasons.',
    approvalImpact: -15,
    constitutionalRisk: 90,
    effectiveness: 30,
    selected: false,
    charter: 'Section 2(b) — Freedom of Expression',
  },
  {
    id: 'quarantine',
    label: 'Mandatory Quarantine Orders',
    description: 'Require exposed or symptomatic individuals to isolate. CBSA empowered to enforce at borders.',
    approvalImpact: -3,
    constitutionalRisk: 40,
    effectiveness: 85,
    selected: false,
    charter: 'Section 6 — Mobility Rights',
  },
  {
    id: 'supply_requisition',
    label: 'Requisition Private Resources',
    description: 'Government may commandeer private vehicles, buildings, and medical supplies for emergency use.',
    approvalImpact: -4,
    constitutionalRisk: 35,
    effectiveness: 75,
    selected: false,
    charter: 'Section 7 — Right to Property (Common Law)',
  },
  {
    id: 'emergency_spending',
    label: 'Authorize Emergency Spending (no Parliament)',
    description: 'Bypass normal parliamentary appropriations for emergency expenditures up to $25B.',
    approvalImpact: -2,
    constitutionalRisk: 25,
    effectiveness: 90,
    selected: false,
    charter: 'Parliamentary Privilege — Spending Accountability',
  },
];

const OPPOSITION_ATTACKS: Record<string, OppositionAttack[]> = {
  riot: [
    { partyName: 'NDP', leaderName: 'Opposition Leader', attack: 'The Emergencies Act is being weaponized against peaceful protesters exercising their constitutional rights. This is a dark day for Canadian democracy.', intensity: 'scathing' },
    { partyName: 'Conservative', leaderName: 'Conservative Leader', attack: 'The PM has once again chosen to invoke extraordinary powers rather than engage in dialogue. Canadians deserve answers, not jackboots.', intensity: 'fierce' },
  ],
  pandemic: [
    { partyName: 'Conservative', leaderName: 'Conservative Leader', attack: 'Unelected bureaucrats are now dictating which Canadians can leave their homes. The government must be held accountable in Parliament — not by royal proclamation.', intensity: 'fierce' },
    { partyName: 'Bloc', leaderName: 'Bloc Leader', attack: 'Quebec has its own health competencies. The federal government is using this emergency as a pretext to centralize power at the expense of provincial autonomy.', intensity: 'fierce' },
  ],
  natural_disaster: [
    { partyName: 'NDP', leaderName: 'NDP Leader', attack: 'We support emergency response — but the Emergencies Act is a significant step. We will be watching closely to ensure it is not used to silence critics or limit aid organizations.', intensity: 'mild' },
    { partyName: 'Conservative', leaderName: 'Conservative Leader', attack: 'Why was Parliament not recalled first? The government should convene emergency sittings — not suspend democratic oversight entirely.', intensity: 'fierce' },
  ],
  national_security: [
    { partyName: 'NDP', leaderName: 'NDP Leader', attack: 'Indefinite invocation of the Emergencies Act sets a chilling precedent. We need clear timelines, parliamentary review, and a sunset clause. This cannot become permanent.', intensity: 'fierce' },
    { partyName: 'Bloc', leaderName: 'Bloc Leader', attack: 'We will not be silenced by vague security concerns. Parliament must sit and scrutinize every measure being taken in the name of national security.', intensity: 'mild' },
  ],
  economic_crisis: [
    { partyName: 'Conservative', leaderName: 'Conservative Leader', attack: 'This government created the conditions for economic collapse through reckless spending, and now they want emergency powers to cover it up. Canadians will not accept this.', intensity: 'scathing' },
    { partyName: 'NDP', leaderName: 'NDP Leader', attack: 'We support economic intervention — but the Emergencies Act cannot be an excuse to bypass workers rights protections or environmental regulations.', intensity: 'mild' },
  ],
};

function generateMediaReaction(type: EmergencyType, measures: EmergencyMeasure[]): MediaStory[] {
  const highRisk = measures.filter(m => m.selected && m.constitutionalRisk > 70);
  const stories: MediaStory[] = [
    { outlet: 'CBC News', headline: `PM invokes Emergencies Act — ${highRisk.length > 0 ? 'legal experts warn of overreach' : 'government cites extraordinary circumstances'}`, sentiment: highRisk.length > 1 ? 'negative' : 'neutral' },
    { outlet: 'The Globe and Mail', headline: `Emergencies Act: ${measures.filter(m => m.selected).length} measures invoked — Charter experts divided on constitutionality`, sentiment: 'neutral' },
    { outlet: 'National Post', headline: `Trudeau-style power grab? PM's Emergencies Act invocation draws fierce criticism from civil libertarians`, sentiment: 'negative' },
    { outlet: 'Toronto Star', headline: `${type === 'riot' ? 'Protests' : type === 'pandemic' ? 'Health crisis' : 'Emergency'} forces government action — but at what constitutional cost?`, sentiment: 'neutral' },
    { outlet: 'CTV News', headline: `Emergencies Act LIVE: ${measures.filter(m => m.selected).length} extraordinary measures now in effect — RCMP activating enforcement protocols`, sentiment: 'neutral' },
  ];
  return stories;
}

export default function EmergenciesActScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, executeForeignPolicy, issuePressStatement } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [phase, setPhase] = useState<ActPhase>('crisis_alert');
  const [emergencyType, setEmergencyType] = useState<EmergencyType>('riot');
  const [measures, setMeasures] = useState<EmergencyMeasure[]>(EMERGENCY_MEASURES.map(m => ({ ...m })));
  const [oppositionAttacks, setOppositionAttacks] = useState<OppositionAttack[]>([]);
  const [mediaStories, setMediaStories] = useState<MediaStory[]>([]);
  const [pgResponse, setPgResponse] = useState('');
  const [inquiryStatement, setInquiryStatement] = useState('');
  const [agAnswers, setAgAnswers] = useState<string[]>([]);
  const [agCurrentQ, setAgCurrentQ] = useState(0);
  const [agAnswer, setAgAnswer] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<{ question: string; topic: string }[]>([]);
  const [actInvoked, setActInvoked] = useState(false);
  const [weeksActive, setWeeksActive] = useState(0);
  const [courtChallengeResult, setCourtChallengeResult] = useState<'upheld' | 'struck_down' | 'partial' | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).default;

  useEffect(() => {
    // Determine emergency type from game state (riots from war, or narrative events)
    if (gameState) {
      // Check for riot conditions
      const stats = gameState.stats;
      if (stats.approvalRating < 22) setEmergencyType('riot');
      else if (stats.gdpGrowth < -3) setEmergencyType('economic_crisis');
      else setEmergencyType('riot'); // default
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [gameState]);

  if (!gameState || !gameState.isGoverning) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}><MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} /></Pressable>
          <Text style={styles.headerTitle}>Emergencies Act</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.notGovCard}>
          <MaterialCommunityIcons name="lock" size={48} color={Colors.textMuted} />
          <Text style={styles.notGovTitle}>PM Only</Text>
          <Text style={styles.notGovDesc}>The Emergencies Act can only be invoked by the Prime Minister of Canada.</Text>
        </View>
      </View>
    );
  }

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const selectedMeasures = measures.filter(m => m.selected);
  const avgConstitutionalRisk = selectedMeasures.length > 0 ? Math.round(selectedMeasures.reduce((s, m) => s + m.constitutionalRisk, 0) / selectedMeasures.length) : 0;
  const totalApprovalImpact = selectedMeasures.reduce((s, m) => s + m.approvalImpact, 0);
  const typeInfo = EMERGENCY_TYPE_META[emergencyType];

  const transitionPhase = (next: ActPhase) => {
    setPhase(next);
  };

  const toggleMeasure = (id: string) => {
    setMeasures(prev => prev.map(m => m.id === id ? { ...m, selected: !m.selected } : m));
  };

  const handleInvokeAct = () => {
    if (selectedMeasures.length === 0) {
      showAlert('Select Measures', 'You must select at least one emergency measure before invoking the Act.');
      return;
    }
    showAlert(
      'Invoke the Emergencies Act?',
      `You are about to invoke the Emergencies Act with ${selectedMeasures.length} emergency measures.\n\nEstimated approval impact: ${totalApprovalImpact}%\nConstitutional risk: ${avgConstitutionalRisk}%\n\nThis will trigger:\n• Parliament must ratify within 7 days\n• Charter challenges filed immediately\n• International media scrutiny\n• Opposition confidence vote threat\n\nAre you certain?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'INVOKE EMERGENCIES ACT',
          style: 'destructive',
          onPress: () => {
            setActInvoked(true);
            setWeeksActive(1);
            const attacks = OPPOSITION_ATTACKS[emergencyType] || OPPOSITION_ATTACKS['riot'];
            setOppositionAttacks(attacks);
            const media = generateMediaReaction(emergencyType, measures);
            setMediaStories(media);
            issuePressStatement(`The Government of Canada has invoked the Emergencies Act in response to a ${typeInfo.label} emergency. ${selectedMeasures.map(m => m.label).join(', ')} are now in effect.`);
            transitionPhase('invoked');
          },
        },
      ]
    );
  };

  const fetchCourtQuestions = async () => {
    setLoadingAI(true);
    try {
      const { data } = await supabase.functions.invoke('ai-question-period', {
        body: {
          partyName: party?.name, leaderName: gameState.playerName, isGoverning: true,
          stats: gameState.stats, currentEvents: [], rivals: [], weekNumber: gameState.currentWeek,
          parliamentNumber: gameState.parliamentNumber, recentNewsHeadlines: [],
          context: `This is a Supreme Court of Canada challenge to the Emergencies Act invocation. The government invoked: ${selectedMeasures.map(m => m.label).join(', ')}. The Charter sections at risk are: ${selectedMeasures.map(m => m.charter).join('; ')}. Generate 3 hard legal questions for the Attorney General defending the emergency measures. Focus on Section 1 reasonable limits, proportionality, and whether less intrusive options existed.`,
        },
      });
      if (data?.questions?.length >= 2) {
        setAiQuestions(data.questions.slice(0, 3).map((q: any) => ({ question: q.question, topic: q.topic || 'Charter' })));
      } else {
        setAiQuestions([
          { question: `The Emergencies Act requires a "national emergency" that cannot be dealt with under any other law. How does ${typeInfo.label} meet this high legal threshold? Could existing legislation have sufficed?`, topic: 'Threshold Test' },
          { question: `The measures include ${selectedMeasures[0]?.label}. Is this proportionate? Specifically, how does the severity of the restriction match the scale of the threat?`, topic: 'Proportionality' },
          { question: `Several experts argue the emergency will be used beyond its stated duration. What are the precise review mechanisms and sunset clauses built into these measures to prevent indefinite use?`, topic: 'Duration & Oversight' },
        ]);
      }
    } catch {
      setAiQuestions([
        { question: `The Emergencies Act requires a "national emergency" that cannot be dealt with under any other law. How does ${typeInfo.label} meet this high legal threshold?`, topic: 'Threshold Test' },
        { question: `How is the principle of proportionality satisfied when ${selectedMeasures.map(m => m.label).slice(0, 2).join(' and ')} are implemented?`, topic: 'Proportionality' },
        { question: 'What specific review mechanisms ensure Parliamentary oversight and prevent indefinite use of these extraordinary powers?', topic: 'Oversight' },
      ]);
    }
    setLoadingAI(false);
  };

  const handleAgAnswer = () => {
    if (!agAnswer.trim()) return;
    const words = agAnswer.trim().split(/\s+/).filter(Boolean).length;
    const quality = words > 80 ? 'strong' : words > 40 ? 'adequate' : 'weak';
    const newAnswers = [...agAnswers, agAnswer];
    setAgAnswers(newAnswers);
    setAgAnswer('');
    if (newAnswers.length >= aiQuestions.length) {
      // Compute result
      const totalWords = newAnswers.reduce((s, a) => s + a.split(/\s+/).filter(Boolean).length, 0);
      const upheld = avgConstitutionalRisk < 60 || totalWords > 250;
      const result: 'upheld' | 'struck_down' | 'partial' = upheld && avgConstitutionalRisk < 80 ? 'upheld' : avgConstitutionalRisk > 75 ? 'struck_down' : 'partial';
      setCourtChallengeResult(result);
      transitionPhase('lifted');
    } else {
      setAgCurrentQ(prev => prev + 1);
    }
  };

  // ── CRISIS ALERT ──────────────────────────────────────────────────────────────
  if (phase === 'crisis_alert') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.crisisHeader, { borderBottomColor: typeInfo.color + '44' }]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <MaterialCommunityIcons name={typeInfo.icon as any} size={22} color={typeInfo.color} />
          </Animated.View>
          <Text style={[styles.crisisHeaderText, { color: typeInfo.color }]}>NATIONAL EMERGENCY</Text>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <MaterialCommunityIcons name={typeInfo.icon as any} size={22} color={typeInfo.color} />
          </Animated.View>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.crisisCard, { borderColor: typeInfo.color + '55', backgroundColor: typeInfo.color + '08' }]}>
            <MaterialCommunityIcons name={typeInfo.icon as any} size={56} color={typeInfo.color} />
            <Text style={[styles.crisisTypeLabel, { color: typeInfo.color }]}>{typeInfo.label.toUpperCase()}</Text>
            <Text style={styles.crisisDesc}>
              A crisis has reached a critical threshold. The Prime Minister is being briefed by the Clerk of the Privy Council, the RCMP Commissioner, CSIS Director, and the Chief of the Defence Staff.
            </Text>
            <View style={[styles.thresholdNote, { borderColor: typeInfo.color + '33' }]}>
              <MaterialCommunityIcons name="alert-circle" size={13} color={typeInfo.color} />
              <Text style={[styles.thresholdNoteText, { color: typeInfo.color }]}>Trigger: {typeInfo.threshold}</Text>
            </View>
          </View>

          {/* Emergency type selection */}
          <Text style={styles.sectionLabel}>EMERGENCY CLASSIFICATION</Text>
          <View style={styles.typeGrid}>
            {(Object.entries(EMERGENCY_TYPE_META) as [EmergencyType, typeof EMERGENCY_TYPE_META[keyof typeof EMERGENCY_TYPE_META]][]).map(([type, meta]) => (
              <Pressable key={type} onPress={() => setEmergencyType(type)} style={[styles.typeCard, emergencyType === type && { borderColor: meta.color, backgroundColor: meta.color + '11' }]}>
                <MaterialCommunityIcons name={meta.icon as any} size={20} color={emergencyType === type ? meta.color : Colors.textMuted} />
                <Text style={[styles.typeCardLabel, emergencyType === type && { color: meta.color }]}>{meta.label.split(' / ')[0]}</Text>
              </Pressable>
            ))}
          </View>

          {/* Intelligence briefing */}
          <View style={styles.briefingCard}>
            <Text style={styles.sectionLabel}>PRIVY COUNCIL BRIEFING</Text>
            <View style={styles.briefingRow}>
              <MaterialCommunityIcons name="police-badge" size={13} color={Colors.error} />
              <Text style={styles.briefingText}><Text style={styles.briefingSource}>RCMP Commissioner:</Text> Existing law enforcement resources are insufficient. Requesting extraordinary authorities.</Text>
            </View>
            <View style={styles.briefingRow}>
              <MaterialCommunityIcons name="shield" size={13} color={Colors.info} />
              <Text style={styles.briefingText}><Text style={styles.briefingSource}>CSIS Director:</Text> Intelligence indicates escalation is likely without decisive federal action this week.</Text>
            </View>
            <View style={styles.briefingRow}>
              <MaterialCommunityIcons name="scale-balance" size={13} color={Colors.warning} />
              <Text style={styles.briefingText}><Text style={styles.briefingSource}>Justice Minister:</Text> Any invocation must satisfy the Section 1 proportionality test. Constitutional risk is significant.</Text>
            </View>
            <View style={styles.briefingRow}>
              <MaterialCommunityIcons name="finance" size={13} color={Colors.gold} />
              <Text style={styles.briefingText}><Text style={styles.briefingSource}>Finance Minister:</Text> Economic cost of inaction exceeds $3B/week. Fiscal case for intervention is strong.</Text>
            </View>
          </View>

          {/* Options */}
          <View style={styles.responseOptions}>
            <Pressable onPress={() => transitionPhase('deliberate')} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: typeInfo.color }, pressed && { opacity: 0.85 }]}>
              <MaterialCommunityIcons name="gavel" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Deliberate — Select Emergency Measures</Text>
            </Pressable>
            <Pressable onPress={() => { showAlert('Act Not Invoked', 'You have chosen not to invoke the Emergencies Act. Conventional law enforcement will handle the crisis. Approval may drop due to perceived inaction.'); router.back(); }} style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}>
              <Text style={styles.secondaryBtnText}>Do Not Invoke — Handle via Conventional Powers</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── DELIBERATE — SELECT MEASURES ─────────────────────────────────────────────
  if (phase === 'deliberate') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => transitionPhase('crisis_alert')} style={styles.backBtn}><MaterialCommunityIcons name="arrow-left" size={20} color={Colors.textSecondary} /></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Select Emergency Measures</Text>
            <Text style={styles.headerSub}>{selectedMeasures.length} measures selected</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          {/* Risk meter */}
          <View style={[styles.riskMeter, { borderColor: avgConstitutionalRisk > 70 ? Colors.error + '55' : avgConstitutionalRisk > 40 ? Colors.warning + '55' : Colors.success + '55' }]}>
            <View style={styles.riskMeterRow}>
              <Text style={styles.riskMeterLabel}>CONSTITUTIONAL RISK</Text>
              <Text style={[styles.riskMeterValue, { color: avgConstitutionalRisk > 70 ? Colors.error : avgConstitutionalRisk > 40 ? Colors.warning : Colors.success }]}>{avgConstitutionalRisk}%</Text>
            </View>
            <View style={styles.riskBar}>
              <View style={[styles.riskBarFill, { flex: avgConstitutionalRisk, backgroundColor: avgConstitutionalRisk > 70 ? Colors.error : avgConstitutionalRisk > 40 ? Colors.warning : Colors.success }]} />
              <View style={{ flex: 100 - avgConstitutionalRisk }} />
            </View>
            <Text style={styles.riskMeterNote}>Approval impact if invoked: {totalApprovalImpact}% | High-risk measures trigger automatic Charter challenges</Text>
          </View>

          <Text style={styles.sectionNote}>Select the measures you wish to include in the Emergencies Act proclamation. Each measure carries constitutional risk — measures above 70% will be automatically challenged in court.</Text>

          {measures.map(m => (
            <Pressable key={m.id} onPress={() => toggleMeasure(m.id)} style={({ pressed }) => [styles.measureCard, m.selected && { borderColor: typeInfo.color, backgroundColor: typeInfo.color + '08' }, pressed && { opacity: 0.85 }]}>
              <View style={[styles.measureCheck, m.selected && { backgroundColor: typeInfo.color, borderColor: typeInfo.color }]}>
                {m.selected ? <MaterialCommunityIcons name="check" size={12} color="#fff" /> : null}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.measureLabel, m.selected && { color: typeInfo.color }]}>{m.label}</Text>
                <Text style={styles.measureDesc}>{m.description}</Text>
                <View style={styles.measureStats}>
                  <View style={[styles.measureStat, { backgroundColor: m.constitutionalRisk > 70 ? Colors.error + '22' : m.constitutionalRisk > 40 ? Colors.warning + '22' : Colors.success + '22' }]}>
                    <MaterialCommunityIcons name="scale-balance" size={10} color={m.constitutionalRisk > 70 ? Colors.error : m.constitutionalRisk > 40 ? Colors.warning : Colors.success} />
                    <Text style={[styles.measureStatText, { color: m.constitutionalRisk > 70 ? Colors.error : m.constitutionalRisk > 40 ? Colors.warning : Colors.success }]}>Risk: {m.constitutionalRisk}%</Text>
                  </View>
                  <View style={[styles.measureStat, { backgroundColor: Colors.success + '22' }]}>
                    <MaterialCommunityIcons name="check-circle" size={10} color={Colors.success} />
                    <Text style={[styles.measureStatText, { color: Colors.success }]}>Effectiveness: {m.effectiveness}%</Text>
                  </View>
                  <View style={[styles.measureStat, { backgroundColor: m.approvalImpact > 0 ? Colors.success + '22' : Colors.error + '22' }]}>
                    <MaterialCommunityIcons name="thumb-up" size={10} color={m.approvalImpact > 0 ? Colors.success : Colors.error} />
                    <Text style={[styles.measureStatText, { color: m.approvalImpact > 0 ? Colors.success : Colors.error }]}>Approval: {m.approvalImpact}%</Text>
                  </View>
                </View>
                <View style={[styles.charterNote, { borderColor: Colors.warning + '33' }]}>
                  <MaterialCommunityIcons name="book-open" size={10} color={Colors.warning} />
                  <Text style={styles.charterNoteText}>Charter concern: {m.charter}</Text>
                </View>
              </View>
            </Pressable>
          ))}

          <Pressable onPress={handleInvokeAct} disabled={selectedMeasures.length === 0} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: typeInfo.color }, selectedMeasures.length === 0 && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="gavel" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>INVOKE EMERGENCIES ACT ({selectedMeasures.length} measures)</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── INVOKED — ACTIVE EMERGENCY ────────────────────────────────────────────────
  if (phase === 'invoked') {
    const highRiskMeasures = selectedMeasures.filter(m => m.constitutionalRisk > 70);
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.crisisHeader, { borderBottomColor: Colors.error + '44', backgroundColor: Colors.error + '08' }]}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>EMERGENCIES ACT ACTIVE</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          {/* Status panel */}
          <View style={[styles.actStatusCard, { borderColor: Colors.error + '44' }]}>
            <View style={styles.actStatusRow}>
              <MaterialCommunityIcons name="alert" size={20} color={Colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actStatusTitle, { color: Colors.error }]}>Emergencies Act — In Force</Text>
                <Text style={styles.actStatusSub}>{typeInfo.label} · {selectedMeasures.length} measures active · Week {weeksActive}</Text>
              </View>
              <Pressable onPress={() => showAlert('Lift Act?', 'Lifting the Act immediately removes all emergency measures. Parliament must be notified.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Lift Act', onPress: () => transitionPhase('inquiry') }])} style={[styles.liftBtn]}>
                <Text style={styles.liftBtnText}>Lift Act</Text>
              </Pressable>
            </View>
            <View style={styles.activeMeasuresList}>
              {selectedMeasures.map(m => (
                <View key={m.id} style={styles.activeMeasureItem}>
                  <MaterialCommunityIcons name="check-circle" size={12} color={typeInfo.color} />
                  <Text style={styles.activeMeasureText}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Court challenge alert for high-risk measures */}
          {highRiskMeasures.length > 0 ? (
            <View style={[styles.courtAlert, { borderColor: Colors.warning + '55' }]}>
              <MaterialCommunityIcons name="gavel" size={16} color={Colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.courtAlertTitle}>Charter Challenges Filed Automatically</Text>
                <Text style={styles.courtAlertDesc}>{highRiskMeasures.length} high-risk measure{highRiskMeasures.length > 1 ? 's' : ''} triggered immediate legal challenges: {highRiskMeasures.map(m => m.label).join(', ')}. The Attorney General must appear before the Supreme Court.</Text>
              </View>
              <Pressable onPress={async () => { await fetchCourtQuestions(); transitionPhase('court_challenge'); }} style={[styles.courtBtn, loadingAI && { opacity: 0.5 }]} disabled={loadingAI}>
                <Text style={styles.courtBtnText}>{loadingAI ? 'Loading...' : 'Defend'}</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Opposition attacks */}
          <Text style={styles.sectionLabel}>OPPOSITION ATTACKS</Text>
          {oppositionAttacks.map((attack, idx) => {
            const intensityColor = attack.intensity === 'scathing' ? Colors.error : attack.intensity === 'fierce' ? Colors.warning : Colors.info;
            return (
              <View key={idx} style={[styles.attackCard, { borderColor: intensityColor + '44' }]}>
                <View style={styles.attackHeader}>
                  <MaterialCommunityIcons name="account-voice" size={14} color={intensityColor} />
                  <Text style={[styles.attackLeader, { color: intensityColor }]}>{attack.leaderName} ({attack.partyName})</Text>
                  <View style={[styles.intensityBadge, { backgroundColor: intensityColor + '22' }]}>
                    <Text style={[styles.intensityText, { color: intensityColor }]}>{attack.intensity.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.attackText}>"{attack.attack}"</Text>
              </View>
            );
          })}

          {/* Media stories */}
          <Text style={styles.sectionLabel}>MEDIA COVERAGE</Text>
          {mediaStories.map((story, idx) => {
            const sentColor = story.sentiment === 'positive' ? Colors.success : story.sentiment === 'negative' ? Colors.error : Colors.textSecondary;
            return (
              <View key={idx} style={styles.mediaStoryCard}>
                <View style={styles.mediaStoryHeader}>
                  <MaterialCommunityIcons name="newspaper" size={13} color={sentColor} />
                  <Text style={[styles.mediaStoryOutlet, { color: sentColor }]}>{story.outlet}</Text>
                  <View style={[styles.sentBadge, { backgroundColor: sentColor + '22' }]}>
                    <Text style={[styles.sentBadgeText, { color: sentColor }]}>{story.sentiment.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.mediaStoryHeadline}>{story.headline}</Text>
              </View>
            );
          })}

          {/* PM response */}
          <View style={styles.pmResponseSection}>
            <Text style={styles.sectionLabel}>PRIME MINISTER'S STATEMENT TO PARLIAMENT</Text>
            <TextInput
              style={styles.pgResponseInput}
              multiline
              placeholder="Issue a formal statement to Parliament and the Canadian public justifying the invocation. Address the specific emergency, the measures being taken, and your commitment to lifting the Act as soon as possible..."
              placeholderTextColor={Colors.textMuted}
              value={pgResponse}
              onChangeText={setPgResponse}
              textAlignVertical="top"
            />
            <Pressable onPress={() => { if (pgResponse.trim()) { issuePressStatement(pgResponse); showAlert('Statement Issued', 'Your parliamentary statement has been issued. Media coverage updated.'); } }} disabled={!pgResponse.trim()} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, !pgResponse.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
              <MaterialCommunityIcons name="send" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Issue Statement to Parliament</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => transitionPhase('inquiry')} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: Colors.warning }, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="gavel" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Lift the Emergencies Act — Begin Public Inquiry</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── COURT CHALLENGE ───────────────────────────────────────────────────────────
  if (phase === 'court_challenge') {
    const currentQ = aiQuestions[agCurrentQ];
    const hearingDone = agAnswers.length >= aiQuestions.length;
    return (
      <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.header, { borderBottomColor: Colors.gold + '44' }]}>
          <MaterialCommunityIcons name="gavel" size={18} color={Colors.gold} />
          <Text style={styles.headerTitle}>Supreme Court Challenge</Text>
          {!hearingDone ? <Text style={styles.headerSub}>Q{agCurrentQ + 1}/{aiQuestions.length}</Text> : null}
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.courtContextCard, { borderColor: Colors.gold + '33' }]}>
            <MaterialCommunityIcons name="scale-balance" size={16} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.courtContextTitle}>Emergency Measures Charter Challenge</Text>
              <Text style={styles.courtContextDesc}>The Canadian Civil Liberties Association and provinces have filed an emergency constitutional challenge. The Attorney General must defend the government's measures before the Supreme Court of Canada.</Text>
            </View>
          </View>
          {hearingDone ? (
            <View style={styles.hearingDoneCard}>
              <MaterialCommunityIcons name="check-decagram" size={48} color={Colors.success} />
              <Text style={styles.hearingDoneTitle}>Hearing Complete</Text>
              <Text style={styles.hearingDoneDesc}>The Court will rule next week. Return to the emergency dashboard.</Text>
              <Pressable onPress={() => transitionPhase('invoked')} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}>
                <Text style={styles.primaryBtnText}>Return to Emergency Dashboard</Text>
              </Pressable>
            </View>
          ) : currentQ ? (
            <>
              <View style={styles.questionProgress}>
                {aiQuestions.map((_, idx) => (
                  <View key={idx} style={[styles.questionDot, agAnswers.length > idx && { backgroundColor: Colors.success }, agCurrentQ === idx && { backgroundColor: Colors.gold }]} />
                ))}
              </View>
              <View style={[styles.courtQuestionCard, { borderColor: Colors.gold + '33' }]}>
                <View style={styles.judgeRow}>
                  <MaterialCommunityIcons name="scale-balance" size={14} color={Colors.gold} />
                  <Text style={styles.judgeText}>Chief Justice of Canada</Text>
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
                  placeholder="Defend the emergency measures on constitutional grounds. Address the necessity, proportionality, and limited duration of each measure. Reference the Section 1 reasonable limits clause..."
                  placeholderTextColor={Colors.textMuted}
                  value={agAnswer}
                  onChangeText={setAgAnswer}
                  textAlignVertical="top"
                />
                <Text style={styles.wordCount}>{agAnswer.trim().split(/\s+/).filter(Boolean).length} words</Text>
                <Pressable onPress={handleAgAnswer} disabled={!agAnswer.trim()} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, !agAnswer.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
                  <MaterialCommunityIcons name="gavel" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>{agCurrentQ < aiQuestions.length - 1 ? 'Submit — Next Question' : 'Final Response'}</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── INQUIRY / LIFTED ──────────────────────────────────────────────────────────
  if (phase === 'inquiry' || phase === 'lifted') {
    const resultColor = courtChallengeResult === 'upheld' ? Colors.success : courtChallengeResult === 'struck_down' ? Colors.error : Colors.warning;
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}><MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} /></Pressable>
          <Text style={styles.headerTitle}>Emergency Concluded</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.conclusionCard, { borderColor: partyColor + '44' }]}>
            <MaterialCommunityIcons name="check-circle" size={48} color={partyColor} />
            <Text style={[styles.conclusionTitle, { color: partyColor }]}>Emergencies Act Lifted</Text>
            <Text style={styles.conclusionDesc}>All emergency measures have been revoked. A mandatory public inquiry will examine the government's use of the Emergencies Act over the next 6 months.</Text>
          </View>

          {courtChallengeResult ? (
            <View style={[styles.courtResultCard, { borderColor: resultColor + '55' }]}>
              <MaterialCommunityIcons name={courtChallengeResult === 'upheld' ? 'check-decagram' : courtChallengeResult === 'struck_down' ? 'close-circle' : 'alert-decagram'} size={32} color={resultColor} />
              <Text style={[styles.courtResultTitle, { color: resultColor }]}>
                {courtChallengeResult === 'upheld' ? 'Supreme Court: Emergency Measures Upheld' : courtChallengeResult === 'struck_down' ? 'Supreme Court: Measures Struck Down' : 'Partial Ruling — Some Measures Invalidated'}
              </Text>
              <Text style={styles.courtResultDesc}>
                {courtChallengeResult === 'upheld' ? 'The Supreme Court found the emergency measures proportionate and constitutionally sound under Section 1 of the Charter.' : courtChallengeResult === 'struck_down' ? 'The Supreme Court struck down the emergency measures as unconstitutional. The government must compensate affected Canadians.' : 'A mixed ruling — some measures were upheld, others struck down. Targeted compensation required.'}
              </Text>
            </View>
          ) : null}

          <View style={styles.inquiryOutcomes}>
            <Text style={styles.sectionLabel}>PUBLIC INQUIRY FINDINGS</Text>
            {[
              `The Public Inquiry Commission will examine ${selectedMeasures.length} emergency measures`,
              courtChallengeResult === 'struck_down' ? 'Government ordered to pay legal costs and Charter damages' : 'Government counsel of record acknowledged proportionality requirements',
              `Approval rating impact: ${totalApprovalImpact}% from emergency period`,
              'Parliament will receive a full report within 6 months',
              'Opposition parties will have full access to classified briefings during the inquiry',
            ].map((item, idx) => (
              <View key={idx} style={styles.inquiryItem}>
                <MaterialCommunityIcons name="information" size={12} color={Colors.info} />
                <Text style={styles.inquiryText}>{item}</Text>
              </View>
            ))}
          </View>

          <Pressable onPress={() => router.replace('/(tabs)')} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}>
            <Text style={styles.primaryBtnText}>Return to Parliament</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  crisisHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, borderBottomWidth: 1, backgroundColor: Colors.error + '08' },
  crisisHeaderText: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, letterSpacing: 1.5 },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  sectionNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  secondaryBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  // Crisis alert
  crisisCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  crisisTypeLabel: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, textAlign: 'center', letterSpacing: 1 },
  crisisDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  thresholdNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderRadius: Radius.sm, padding: 8, borderWidth: 1, backgroundColor: Colors.surfaceElevated },
  thresholdNoteText: { flex: 1, fontSize: FontSize.xs, lineHeight: 17, fontStyle: 'italic' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: { width: '45%', alignItems: 'center', gap: 6, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm },
  typeCardLabel: { fontSize: 10, fontWeight: FontWeight.semibold, color: Colors.textMuted, textAlign: 'center' },
  briefingCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  briefingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  briefingSource: { fontWeight: FontWeight.bold, color: Colors.textPrimary },
  briefingText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  responseOptions: { gap: 8 },
  // Deliberate
  riskMeter: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 8 },
  riskMeterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  riskMeterLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  riskMeterValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  riskBar: { flexDirection: 'row', height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden' },
  riskBarFill: { minWidth: 4, borderRadius: 4 },
  riskMeterNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
  measureCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  measureCheck: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: Colors.surfaceBorder, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  measureLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 4 },
  measureDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  measureStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  measureStat: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  measureStatText: { fontSize: 9, fontWeight: FontWeight.bold },
  charterNote: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.sm, padding: 5, borderWidth: 1, backgroundColor: Colors.warning + '08' },
  charterNoteText: { flex: 1, fontSize: 10, color: Colors.warning, lineHeight: 15 },
  // Invoked
  actStatusCard: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm, backgroundColor: Colors.error + '08' },
  actStatusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  actStatusTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  actStatusSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  liftBtn: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.sm, backgroundColor: Colors.warning + '22', borderWidth: 1, borderColor: Colors.warning + '44' },
  liftBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.warning },
  activeMeasuresList: { gap: 4 },
  activeMeasureItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeMeasureText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  courtAlert: { backgroundColor: Colors.warning + '0D', borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  courtAlertTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.warning },
  courtAlertDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  courtBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 7, borderRadius: Radius.sm, backgroundColor: Colors.warning, alignSelf: 'flex-start' },
  courtBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#fff' },
  attackCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 6 },
  attackHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attackLeader: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  intensityBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  intensityText: { fontSize: 9, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },
  attackText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18, fontStyle: 'italic' },
  mediaStoryCard: { backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm, gap: 6 },
  mediaStoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mediaStoryOutlet: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  sentBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  sentBadgeText: { fontSize: 9, fontWeight: FontWeight.bold },
  mediaStoryHeadline: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17, fontStyle: 'italic' },
  pmResponseSection: { gap: 8 },
  pgResponseInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 120, lineHeight: 22 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.error },
  liveText: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold, color: Colors.error, letterSpacing: 1 },
  // Court challenge
  courtContextCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  courtContextTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold, marginBottom: 4 },
  courtContextDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  questionProgress: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  questionDot: { width: 24, height: 6, borderRadius: 3, backgroundColor: Colors.surfaceBorder },
  courtQuestionCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 8 },
  judgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  judgeText: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.gold },
  topicPill: { backgroundColor: Colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder },
  topicPillText: { fontSize: 9, color: Colors.textMuted },
  courtQuestionText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, lineHeight: 24 },
  agAnswerSection: { gap: 8 },
  agAnswerInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 130, lineHeight: 22 },
  wordCount: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' },
  hearingDoneCard: { alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.success + '44', padding: Spacing.xl },
  hearingDoneTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  hearingDoneDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  // Inquiry / Lifted
  conclusionCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card },
  conclusionTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, textAlign: 'center' },
  conclusionDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  courtResultCard: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm, alignItems: 'center', backgroundColor: Colors.card },
  courtResultTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, textAlign: 'center' },
  courtResultDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  inquiryOutcomes: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  inquiryItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  inquiryText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  // Not governing
  notGovCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  notGovTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  notGovDesc: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
