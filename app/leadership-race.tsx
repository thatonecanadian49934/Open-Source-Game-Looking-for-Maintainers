// Powered by OnSpace.AI — Full Leadership Race for player MP after losing leadership review
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
type RacePhase = 'declare' | 'fundraise' | 'province_tour' | 'debate' | 'ballot' | 'result';

interface Candidate {
  id: string;
  name: string;
  ideology: string;
  fundraisingStrength: number; // 1-10
  regionalSupport: Record<string, number>; // province -> %
  delegates: number;
  eliminated: boolean;
  isPlayer: boolean;
  description: string;
  weaknesses: string;
}

interface ProvinceStop {
  code: string;
  name: string;
  delegateWeight: number;
  playerVisited: boolean;
  speechGiven: string;
}

interface DebateAnswer {
  question: string;
  answer: string;
  topic: string;
  impact: number; // -10 to +10 on delegate count
}

interface BallotRound {
  round: number;
  results: Record<string, number>;
  eliminated: string | null;
}

const PROVINCE_STOPS: ProvinceStop[] = [
  { code: 'ON', name: 'Ontario', delegateWeight: 35, playerVisited: false, speechGiven: '' },
  { code: 'QC', name: 'Quebec', delegateWeight: 22, playerVisited: false, speechGiven: '' },
  { code: 'BC', name: 'British Columbia', delegateWeight: 14, playerVisited: false, speechGiven: '' },
  { code: 'AB', name: 'Alberta', delegateWeight: 11, playerVisited: false, speechGiven: '' },
  { code: 'MB', name: 'Manitoba', delegateWeight: 4, playerVisited: false, speechGiven: '' },
  { code: 'SK', name: 'Saskatchewan', delegateWeight: 3, playerVisited: false, speechGiven: '' },
  { code: 'NS', name: 'Nova Scotia', delegateWeight: 4, playerVisited: false, speechGiven: '' },
  { code: 'NB', name: 'New Brunswick', delegateWeight: 3, playerVisited: false, speechGiven: '' },
  { code: 'NL', name: 'Newfoundland', delegateWeight: 2, playerVisited: false, speechGiven: '' },
  { code: 'PE', name: 'PEI', delegateWeight: 1, playerVisited: false, speechGiven: '' },
];

function generateCandidates(playerName: string, partyId: string): Candidate[] {
  const party = PARTIES.find(p => p.id === partyId);
  const base: Omit<Candidate, 'delegates' | 'isPlayer'>[] = [
    {
      id: 'player',
      name: playerName,
      ideology: party?.ideology || 'Centre',
      fundraisingStrength: 6,
      regionalSupport: { ON: 22, QC: 18, BC: 20, AB: 16, MB: 20, SK: 18, NS: 22, NB: 20, NL: 20, PE: 20 },
      description: `Experienced MP and former leader. Known for resilience and grassroots organizing.`,
      weaknesses: 'Recent election loss raises questions about electability.',
    },
    {
      id: 'frontrunner',
      name: generateName(),
      ideology: party?.ideology === 'Centre-left' ? 'Centre-left populist' : 'Right-wing populist',
      fundraisingStrength: 9,
      regionalSupport: { ON: 28, QC: 22, BC: 25, AB: 30, MB: 28, SK: 30, NS: 24, NB: 25, NL: 22, PE: 28 },
      description: 'Party insider with strong donor network and national profile. Seen as the presumed front-runner.',
      weaknesses: 'Perceived as establishment — grassroots skeptical.',
    },
    {
      id: 'reformer',
      name: generateName(),
      ideology: 'Progressive reformer',
      fundraisingStrength: 7,
      regionalSupport: { ON: 25, QC: 30, BC: 28, AB: 14, MB: 22, SK: 18, NS: 26, NB: 22, NL: 28, PE: 25 },
      description: 'First-term MP who ran on renewal and fresh ideas. Strong in urban centres and among young voters.',
      weaknesses: 'Limited caucus support. Seen as inexperienced by some delegates.',
    },
    {
      id: 'western',
      name: generateName(),
      ideology: 'Regional advocate',
      fundraisingStrength: 6,
      regionalSupport: { ON: 14, QC: 10, BC: 20, AB: 38, MB: 32, SK: 42, NS: 15, NB: 16, NL: 18, PE: 14 },
      description: 'Multi-term MP from the Prairies. Strong regional base, limited Eastern support.',
      weaknesses: 'Cannot win nationally without Quebec and Ontario.',
    },
    {
      id: 'moderate',
      name: generateName(),
      ideology: 'Fiscal moderate',
      fundraisingStrength: 7,
      regionalSupport: { ON: 26, QC: 20, BC: 22, AB: 18, MB: 20, SK: 18, NS: 28, NB: 28, NL: 26, PE: 30 },
      description: 'Former cabinet minister known for competence and cross-regional appeal.',
      weaknesses: 'Lacks a compelling electoral narrative — seen as "safe but uninspiring."',
    },
  ];

  return base.map((c, idx) => ({
    ...c,
    delegates: Math.floor(c.fundraisingStrength * 8 + Math.random() * 30),
    isPlayer: c.id === 'player',
  }));
}

function generateName(): string {
  const firsts = ['Alexandra', 'David', 'Sophie', 'Thomas', 'Jasmine', 'Robert', 'Claire', 'Raj', 'Michelle', 'Patrick'];
  const lasts = ['Morrison', 'Fontaine', 'Bergeron', 'MacLeod', 'Patel', 'Okafor', 'Tremblay', 'Walsh', 'Kim', 'Crawford'];
  return `${firsts[Math.floor(Math.random() * firsts.length)]} ${lasts[Math.floor(Math.random() * lasts.length)]}`;
}

const DEBATE_QUESTIONS = [
  { question: 'The party just lost an election. What is your plan to rebuild our coalition and win back voters in suburban Ontario and Quebec?', topic: 'Electoral Strategy' },
  { question: 'Inflation is at 4.2% and housing affordability is at a crisis point. What are your first three priorities as leader on the economy?', topic: 'Economy' },
  { question: 'The previous leadership made promises it could not keep. What commitments can you make tonight, and how will you be held accountable?', topic: 'Accountability' },
  { question: 'Many in the party believe we need a new direction — not just a new face. What specifically will you change about our policy platform?', topic: 'Party Renewal' },
  { question: 'Describe a time you made a hard political decision that cost you personally. What did it teach you about leadership?', topic: 'Character' },
];

export default function LeadershipRaceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, resolveLeadershipReview, appointMinister } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [phase, setPhase] = useState<RacePhase>('declare');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [provinces, setProvinces] = useState<ProvinceStop[]>(PROVINCE_STOPS);
  const [playerDelegates, setPlayerDelegates] = useState(0);
  const [fundraised, setFundraised] = useState(0);
  const [fundraiseTarget] = useState(500000); // $500K
  const [debateAnswers, setDebateAnswers] = useState<DebateAnswer[]>([]);
  const [currentDebateQ, setCurrentDebateQ] = useState(0);
  const [debateAnswer, setDebateAnswer] = useState('');
  const [speechText, setSpeechText] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<ProvinceStop | null>(null);
  const [ballotRounds, setBallotRounds] = useState<BallotRound[]>([]);
  const [currentBallotRound, setCurrentBallotRound] = useState(0);
  const [ballotAnimating, setBallotAnimating] = useState(false);
  const [winner, setWinner] = useState<Candidate | null>(null);
  const [endorsedCandidate, setEndorsedCandidate] = useState<string | null>(null);
  const [negotiatedWith, setNegotiatedWith] = useState<Set<string>>(new Set());
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<{ question: string; topic: string }[]>(DEBATE_QUESTIONS);

  const barAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (gameState) {
      const cands = generateCandidates(gameState.playerName, gameState.playerPartyId);
      setCandidates(cands);
      const player = cands.find(c => c.isPlayer);
      setPlayerDelegates(player?.delegates || 50);
    }
  }, [gameState]);

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const playerCandidate = candidates.find(c => c.isPlayer);
  const totalDelegates = 1000;

  const transitionPhase = (next: RacePhase) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setPhase(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  };

  // ── FUNDRAISING ──────────────────────────────────────────────────────────────
  const handleFundraise = (amount: number, method: string) => {
    const gained = amount + Math.floor(Math.random() * amount * 0.3);
    setFundraised(prev => {
      const newTotal = Math.min(fundraiseTarget * 1.5, prev + gained);
      const delegateBonus = Math.floor(gained / 10000);
      setPlayerDelegates(d => d + delegateBonus);
      setCandidates(prev => prev.map(c => c.isPlayer ? { ...c, delegates: (c.delegates || 0) + delegateBonus } : c));
      return newTotal;
    });
    showAlert(`$${gained.toLocaleString()} raised via ${method}`, `Delegates gained: +${Math.floor(gained / 10000)}. Total fundraising shows momentum.`);
  };

  // ── PROVINCE TOUR ─────────────────────────────────────────────────────────────
  const handleProvinceSpeech = (province: ProvinceStop) => {
    if (!speechText.trim()) { showAlert('Write a speech first', 'Enter your provincial speech before delivering it.'); return; }
    const words = speechText.trim().split(/\s+/).filter(Boolean).length;
    const quality = words > 100 ? 'strong' : words > 50 ? 'adequate' : 'weak';
    const delegateGain = province.delegateWeight * (quality === 'strong' ? 1.5 : quality === 'adequate' ? 1.0 : 0.5);
    const gained = Math.floor(delegateGain + Math.random() * 10);
    setPlayerDelegates(d => d + gained);
    setCandidates(prev => prev.map(c => c.isPlayer ? { ...c, delegates: (c.delegates || 0) + gained, regionalSupport: { ...c.regionalSupport, [province.code]: Math.min(60, (c.regionalSupport[province.code] || 20) + 8) } } : c));
    setProvinces(prev => prev.map(p => p.code === province.code ? { ...p, playerVisited: true, speechGiven: speechText } : p));
    setSelectedProvince(null);
    setSpeechText('');
    showAlert(`${province.name} Tour — ${quality.toUpperCase()}`, `Your ${words}-word speech earned +${gained} delegates from ${province.name} (${province.delegateWeight}% of convention).`);
  };

  // ── DELEGATE NEGOTIATION ─────────────────────────────────────────────────────
  const handleNegotiate = (candidate: Candidate) => {
    if (negotiatedWith.has(candidate.id)) { showAlert('Already Negotiated', `You have already spoken with ${candidate.name}.`); return; }
    showAlert(
      `Negotiate with ${candidate.name}`,
      `${candidate.name} (${candidate.delegates} delegates) — ${candidate.ideology}.\n\nOffer a deal: if they drop out, what will you offer them?`,
      [
        { text: 'Cabinet Post', onPress: () => completeDeal(candidate, 'cabinet', Math.floor(candidate.delegates * 0.6)) },
        { text: 'Senate Appointment', onPress: () => completeDeal(candidate, 'senate', Math.floor(candidate.delegates * 0.4)) },
        { text: 'Policy Concession', onPress: () => completeDeal(candidate, 'policy', Math.floor(candidate.delegates * 0.3)) },
        { text: 'No Deal', style: 'cancel' },
      ]
    );
  };

  const completeDeal = (candidate: Candidate, offer: string, delegatesTransferred: number) => {
    const accepts = Math.random() > 0.45; // 55% chance deal is accepted
    setNegotiatedWith(prev => new Set([...prev, candidate.id]));
    if (accepts) {
      setPlayerDelegates(d => d + delegatesTransferred);
      setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, eliminated: true, delegates: 0 } : c.isPlayer ? { ...c, delegates: (c.delegates || 0) + delegatesTransferred } : c));
      showAlert(`Deal Accepted — ${candidate.name} withdraws`, `${candidate.name} accepts your ${offer} offer and transfers ${delegatesTransferred} delegates to your campaign. ${candidate.name} will not stand for leader.`);
    } else {
      showAlert(`Deal Rejected`, `${candidate.name} declined your offer. They believe they can win without you. Consider approaching them again after stronger fundraising.`);
    }
  };

  // ── DEBATE ───────────────────────────────────────────────────────────────────
  const fetchAIDebateQuestions = async () => {
    setLoadingAI(true);
    try {
      const { data } = await supabase.functions.invoke('ai-question-period', {
        body: {
          partyName: party?.name, leaderName: gameState.playerName, isGoverning: false,
          stats: gameState.stats, currentEvents: [], rivals: [], weekNumber: gameState.currentWeek,
          parliamentNumber: gameState.parliamentNumber, recentNewsHeadlines: [],
          context: `This is a ${party?.name} leadership convention debate. Generate 5 tough debate questions for leadership candidates. Questions should focus on: party renewal, election loss analysis, policy platform, regional strategy, and leadership character. Make them specific and challenging.`,
        },
      });
      if (data?.questions?.length >= 3) {
        setAiQuestions(data.questions.slice(0, 5).map((q: any) => ({ question: q.question, topic: q.topic || 'Leadership' })));
      }
    } catch {}
    setLoadingAI(false);
  };

  const handleDebateAnswer = () => {
    if (!debateAnswer.trim()) return;
    const words = debateAnswer.trim().split(/\s+/).filter(Boolean).length;
    const quality = words > 80 ? 'excellent' : words > 40 ? 'good' : 'weak';
    const impact = quality === 'excellent' ? Math.floor(Math.random() * 15 + 8) : quality === 'good' ? Math.floor(Math.random() * 8 + 2) : -Math.floor(Math.random() * 8 + 2);
    const answer: DebateAnswer = { question: aiQuestions[currentDebateQ]?.question || '', answer: debateAnswer, topic: aiQuestions[currentDebateQ]?.topic || '', impact };
    setDebateAnswers(prev => [...prev, answer]);
    setPlayerDelegates(d => Math.max(5, d + impact));
    setCandidates(prev => prev.map(c => c.isPlayer ? { ...c, delegates: Math.max(5, (c.delegates || 0) + impact) } : c));
    setDebateAnswer('');
    if (currentDebateQ < aiQuestions.length - 1) {
      setCurrentDebateQ(prev => prev + 1);
    } else {
      transitionPhase('ballot');
    }
  };

  // ── CONVENTION BALLOT ─────────────────────────────────────────────────────────
  const runBallotRounds = async () => {
    setBallotAnimating(true);
    let activeCandidates = [...candidates].filter(c => !c.eliminated);
    let rounds: BallotRound[] = [];
    let roundNum = 1;

    while (activeCandidates.length > 1) {
      // Distribute total delegates proportionally + add noise
      const total = totalDelegates;
      const rawShares: Record<string, number> = {};
      activeCandidates.forEach(c => {
        rawShares[c.id] = Math.max(10, c.delegates + Math.floor(Math.random() * 30 - 10));
      });
      const sum = Object.values(rawShares).reduce((a, b) => a + b, 0);
      const normalized: Record<string, number> = {};
      Object.entries(rawShares).forEach(([id, v]) => { normalized[id] = Math.round((v / sum) * total); });
      // Adjust player specifically
      normalized['player'] = playerDelegates;
      const playerEntry = activeCandidates.find(c => c.isPlayer);

      const round: BallotRound = { round: roundNum, results: normalized, eliminated: null };

      // Eliminate last-place (unless only 2 left)
      if (activeCandidates.length > 2) {
        const sorted = activeCandidates.slice().sort((a, b) => (normalized[b.id] || 0) - (normalized[a.id] || 0));
        const lastPlace = sorted[sorted.length - 1];
        if (!lastPlace.isPlayer) {
          round.eliminated = lastPlace.id;
          setCandidates(prev => prev.map(c => c.id === lastPlace.id ? { ...c, eliminated: true, delegates: 0 } : c));
          // Transfer last-place delegates randomly to remaining
          const transferTo = sorted[Math.floor(Math.random() * (sorted.length - 1))];
          if (transferTo.isPlayer) {
            const bonus = Math.floor((normalized[lastPlace.id] || 0) * 0.4);
            setPlayerDelegates(d => d + bonus);
          }
        }
        activeCandidates = activeCandidates.filter(c => c.id !== lastPlace.id);
      } else {
        // Final round — declare winner
        const winner = activeCandidates.sort((a, b) => (normalized[b.id] || 0) - (normalized[a.id] || 0))[0];
        round.eliminated = null;
        rounds.push(round);
        setBallotRounds(rounds);
        await delay(1200);
        setWinner(winner);
        transitionPhase('result');
        setBallotAnimating(false);
        return;
      }

      rounds.push(round);
      setBallotRounds([...rounds]);
      setCurrentBallotRound(roundNum);
      roundNum++;
      await delay(1500);
    }
    // If one left
    if (activeCandidates.length === 1) {
      setWinner(activeCandidates[0]);
      transitionPhase('result');
    }
    setBallotAnimating(false);
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // ── RENDER PHASES ─────────────────────────────────────────────────────────────

  // DECLARE CANDIDACY
  if (phase === 'declare') {
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="flag-variant" size={20} color={partyColor} />
          <Text style={styles.headerTitle}>{party?.name} Leadership Race</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.declareHero, { borderColor: partyColor + '44' }]}>
            <MaterialCommunityIcons name="account-star" size={60} color={partyColor} />
            <Text style={[styles.declareHeroTitle, { color: partyColor }]}>Declare Your Candidacy</Text>
            <Text style={styles.declareHeroDesc}>
              The leadership review is over. You have lost the leadership — but the race to replace you is just beginning. As a sitting MP with deep party roots, you have the right to run for leader again. The convention will be held in 6 weeks.
            </Text>
          </View>

          <View style={styles.raceOverview}>
            <Text style={styles.sectionLabel}>LEADERSHIP RACE OVERVIEW</Text>
            <View style={styles.overviewGrid}>
              {[
                { icon: 'calendar', label: 'Convention Date', value: '6 Weeks Away' },
                { icon: 'account-group', label: 'Total Delegates', value: '1,000' },
                { icon: 'trophy', label: 'To Win Round 1', value: '501 delegates' },
                { icon: 'currency-usd', label: 'Fundraising Cap', value: '$500,000' },
              ].map((item, idx) => (
                <View key={idx} style={styles.overviewItem}>
                  <MaterialCommunityIcons name={item.icon as any} size={16} color={partyColor} />
                  <Text style={styles.overviewLabel}>{item.label}</Text>
                  <Text style={[styles.overviewValue, { color: partyColor }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.sectionLabel}>YOUR COMPETITORS</Text>
          {candidates.filter(c => !c.isPlayer).map(c => (
            <View key={c.id} style={styles.rivalCard}>
              <View style={styles.rivalHeader}>
                <MaterialCommunityIcons name="account-circle" size={32} color={Colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rivalName}>{c.name}</Text>
                  <Text style={styles.rivalIdeology}>{c.ideology}</Text>
                </View>
                <View style={styles.rivalFundBadge}>
                  <MaterialCommunityIcons name="currency-usd" size={12} color={Colors.gold} />
                  <Text style={styles.rivalFundText}>FR: {c.fundraisingStrength}/10</Text>
                </View>
              </View>
              <Text style={styles.rivalDesc}>{c.description}</Text>
              <View style={[styles.rivalWeakness, { borderColor: Colors.warning + '33' }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={11} color={Colors.warning} />
                <Text style={styles.rivalWeaknessText}>{c.weaknesses}</Text>
              </View>
              <View style={styles.rivalRegional}>
                <Text style={styles.rivalRegionalLabel}>STRONGEST IN:</Text>
                {Object.entries(c.regionalSupport).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([prov, pct]) => (
                  <View key={prov} style={styles.rivalRegionalPill}>
                    <Text style={styles.rivalRegionalPillText}>{prov} {pct}%</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <Pressable
            onPress={() => transitionPhase('fundraise')}
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="bullhorn" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Declare Candidacy — Begin Campaign</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/(tabs)')} style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}>
            <Text style={styles.secondaryBtnText}>Withdraw — Remain as Regular MP</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    );
  }

  // FUNDRAISE
  if (phase === 'fundraise') {
    const pct = Math.min(100, Math.round((fundraised / fundraiseTarget) * 100));
    const otherCandidates = candidates.filter(c => !c.isPlayer && !c.eliminated);
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Pressable onPress={() => transitionPhase('declare')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Fundraising & Endorsements</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Fundraising bar */}
          <View style={[styles.fundCard, { borderColor: partyColor + '44' }]}>
            <View style={styles.fundHeader}>
              <MaterialCommunityIcons name="currency-usd" size={20} color={Colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fundTitle}>Campaign Fundraising</Text>
                <Text style={styles.fundSub}>${fundraised.toLocaleString()} of ${fundraiseTarget.toLocaleString()} target</Text>
              </View>
              <Text style={[styles.fundPct, { color: pct >= 80 ? Colors.success : pct >= 50 ? Colors.warning : Colors.error }]}>{pct}%</Text>
            </View>
            <View style={styles.fundBar}>
              <View style={[styles.fundBarFill, { flex: pct, backgroundColor: pct >= 80 ? Colors.success : pct >= 50 ? Colors.warning : partyColor }]} />
              <View style={{ flex: 100 - pct }} />
            </View>
            <Text style={styles.fundNote}>Fundraising translates directly to delegate momentum. Higher totals attract endorsements.</Text>
          </View>

          <Text style={styles.sectionLabel}>FUNDRAISING METHODS</Text>
          {[
            { method: 'Grassroots Donation Drive', amount: 45000, icon: 'account-group', desc: 'Online small-donor campaign. Broad but slower.', risk: 'low' },
            { method: 'Major Donor Gala', amount: 120000, icon: 'star', desc: 'Bay Street fundraiser. High return but optics risk.', risk: 'medium' },
            { method: 'Union Endorsement Event', amount: 80000, icon: 'handshake', desc: 'Labour movement support rally.', risk: 'low' },
            { method: 'Corporate Sponsorship', amount: 200000, icon: 'domain', desc: 'Large corporate donors. High funds, high scrutiny.', risk: 'high' },
          ].map(method => (
            <Pressable key={method.method} onPress={() => handleFundraise(method.amount, method.method)} style={({ pressed }) => [styles.fundMethodCard, pressed && { opacity: 0.85 }]}>
              <MaterialCommunityIcons name={method.icon as any} size={22} color={partyColor} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fundMethodName}>{method.method}</Text>
                <Text style={styles.fundMethodDesc}>{method.desc}</Text>
              </View>
              <View style={styles.fundMethodRight}>
                <Text style={[styles.fundMethodAmount, { color: Colors.success }]}>+~${(method.amount / 1000).toFixed(0)}K</Text>
                <View style={[styles.fundRiskBadge, { backgroundColor: method.risk === 'high' ? Colors.error + '22' : method.risk === 'medium' ? Colors.warning + '22' : Colors.success + '22' }]}>
                  <Text style={[styles.fundRiskText, { color: method.risk === 'high' ? Colors.error : method.risk === 'medium' ? Colors.warning : Colors.success }]}>{method.risk.toUpperCase()} RISK</Text>
                </View>
              </View>
            </Pressable>
          ))}

          {/* Negotiate with rivals */}
          <Text style={styles.sectionLabel}>NEGOTIATE DELEGATE TRANSFERS</Text>
          <Text style={styles.sectionNote}>Contact other candidates to offer deals — they may drop out and transfer delegates to you.</Text>
          {otherCandidates.map(c => (
            <Pressable key={c.id} onPress={() => handleNegotiate(c)} style={({ pressed }) => [styles.negotiateCard, negotiatedWith.has(c.id) && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}>
              <MaterialCommunityIcons name="account-circle" size={28} color={Colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.negotiateName}>{c.name}</Text>
                <Text style={styles.negotiateDelegates}>{c.delegates} delegates · {c.ideology}</Text>
              </View>
              {negotiatedWith.has(c.id) ? (
                <View style={[styles.negBadge, { backgroundColor: Colors.textMuted + '22' }]}>
                  <Text style={[styles.negBadgeText, { color: Colors.textMuted }]}>CONTACTED</Text>
                </View>
              ) : (
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
              )}
            </Pressable>
          ))}

          <View style={styles.delegateDisplay}>
            <MaterialCommunityIcons name="account-group" size={16} color={partyColor} />
            <Text style={[styles.delegateCount, { color: partyColor }]}>{playerDelegates} delegates secured</Text>
          </View>

          <Pressable onPress={() => transitionPhase('province_tour')} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="map-marker" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Begin Provincial Tour</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    );
  }

  // PROVINCE TOUR
  if (phase === 'province_tour') {
    const visitedCount = provinces.filter(p => p.playerVisited).length;
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Pressable onPress={() => transitionPhase('fundraise')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Provincial Tour</Text>
            <Text style={styles.headerSub}>{visitedCount}/{provinces.length} provinces visited</Text>
          </View>
          <View style={styles.delegatePill}>
            <Text style={[styles.delegatePillText, { color: partyColor }]}>{playerDelegates} del.</Text>
          </View>
        </View>

        {selectedProvince ? (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={[styles.provinceDetailCard, { borderColor: partyColor + '44' }]}>
                <View style={styles.provinceDetailHeader}>
                  <MaterialCommunityIcons name="map-marker" size={24} color={partyColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.provinceDetailName, { color: partyColor }]}>{selectedProvince.name}</Text>
                    <Text style={styles.provinceDetailWeight}>{selectedProvince.delegateWeight}% of convention delegates</Text>
                  </View>
                  <Pressable onPress={() => setSelectedProvince(null)} style={styles.closeBtn}>
                    <MaterialCommunityIcons name="close" size={20} color={Colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
              <Text style={styles.sectionLabel}>YOUR PROVINCIAL SPEECH</Text>
              <Text style={styles.sectionNote}>Tailor your speech to {selectedProvince.name}. Address local concerns — housing in Ontario, bilingualism in Quebec, energy in Alberta. Longer speeches earn more delegates.</Text>
              <TextInput
                style={styles.speechInput}
                multiline
                placeholder={`Address ${selectedProvince.name} voters and delegates. What is your vision for this province? (100+ words recommended)`}
                placeholderTextColor={Colors.textMuted}
                value={speechText}
                onChangeText={setSpeechText}
                textAlignVertical="top"
              />
              <Text style={styles.wordCount}>{speechText.trim().split(/\s+/).filter(Boolean).length} words</Text>
              <Pressable onPress={() => handleProvinceSpeech(selectedProvince)} disabled={!speechText.trim()} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, !speechText.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
                <MaterialCommunityIcons name="microphone" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Deliver Speech in {selectedProvince.name}</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionNote}>Visit provinces to give tailored speeches and win over local delegates. Larger provinces yield more delegates.</Text>
            <View style={styles.provinceGrid}>
              {provinces.map(p => (
                <Pressable key={p.code} onPress={() => !p.playerVisited && setSelectedProvince(p)} style={[styles.provinceCard, p.playerVisited && styles.provinceCardVisited, !p.playerVisited && { borderColor: partyColor + '44' }]}>
                  <Text style={[styles.provinceCode, p.playerVisited && { color: Colors.success }]}>{p.code}</Text>
                  <Text style={styles.provinceName}>{p.name}</Text>
                  <View style={styles.provinceDelegate}>
                    <MaterialCommunityIcons name={p.playerVisited ? 'check-circle' : 'account-group'} size={12} color={p.playerVisited ? Colors.success : partyColor} />
                    <Text style={[styles.provinceDelegateText, { color: p.playerVisited ? Colors.success : partyColor }]}>{p.delegateWeight}%</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={async () => { await fetchAIDebateQuestions(); transitionPhase('debate'); }} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor, marginTop: Spacing.md }, pressed && { opacity: 0.85 }]}>
              <MaterialCommunityIcons name="microphone-variant" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{loadingAI ? 'Preparing Debate...' : 'Proceed to Leadership Debate'}</Text>
            </Pressable>
          </ScrollView>
        )}
      </Animated.View>
    );
  }

  // DEBATE
  if (phase === 'debate') {
    const currentQ = aiQuestions[currentDebateQ];
    const debateDone = debateAnswers.length >= aiQuestions.length;
    const totalImpact = debateAnswers.reduce((s, a) => s + a.impact, 0);
    return (
      <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.header, { borderBottomColor: Colors.gold + '44' }]}>
          <MaterialCommunityIcons name="television-play" size={18} color={Colors.gold} />
          <Text style={styles.headerTitle}>{party?.name} Leadership Debate</Text>
          {!debateDone ? <Text style={styles.headerSub}>Q{currentDebateQ + 1}/{aiQuestions.length}</Text> : null}
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {debateDone ? (
            <View style={styles.debateSummaryCard}>
              <MaterialCommunityIcons name="check-decagram" size={48} color={Colors.success} />
              <Text style={styles.debateSummaryTitle}>Debate Complete</Text>
              <Text style={[styles.debateSummaryImpact, { color: totalImpact >= 0 ? Colors.success : Colors.error }]}>
                Total delegate impact: {totalImpact >= 0 ? '+' : ''}{totalImpact}
              </Text>
              {debateAnswers.map((a, idx) => (
                <View key={idx} style={[styles.debateAnswerReview, { borderColor: a.impact >= 0 ? Colors.success + '44' : Colors.error + '44' }]}>
                  <Text style={styles.debateAnswerQ}>{a.topic}: {a.question.substring(0, 60)}...</Text>
                  <Text style={[styles.debateAnswerImpact, { color: a.impact >= 0 ? Colors.success : Colors.error }]}>{a.impact >= 0 ? '+' : ''}{a.impact} delegates</Text>
                </View>
              ))}
              <Pressable onPress={() => { runBallotRounds(); transitionPhase('ballot'); }} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}>
                <MaterialCommunityIcons name="vote" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Proceed to Convention Ballot</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Debate stage */}
              <View style={[styles.debateStageCard, { borderColor: Colors.gold + '33' }]}>
                <View style={styles.debateCandidateRow}>
                  {candidates.filter(c => !c.eliminated).map(c => (
                    <View key={c.id} style={[styles.debateCandidateChip, c.isPlayer && { borderColor: partyColor, backgroundColor: partyColor + '11' }]}>
                      <MaterialCommunityIcons name="account" size={10} color={c.isPlayer ? partyColor : Colors.textMuted} />
                      <Text style={[styles.debateCandidateChipText, c.isPlayer && { color: partyColor }]} numberOfLines={1}>{c.name.split(' ').pop()}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.questionProgress}>
                {aiQuestions.map((_, idx) => (
                  <View key={idx} style={[styles.questionDot, debateAnswers.length > idx && { backgroundColor: Colors.success }, currentDebateQ === idx && { backgroundColor: Colors.gold }]} />
                ))}
              </View>
              {currentQ ? (
                <View style={[styles.debateQuestionCard, { borderColor: Colors.gold + '44' }]}>
                  <View style={styles.debateModeratorRow}>
                    <MaterialCommunityIcons name="account-tie" size={13} color={Colors.gold} />
                    <Text style={styles.debateModeratorText}>Moderator — {currentQ.topic}</Text>
                  </View>
                  <Text style={styles.debateQuestionText}>{currentQ.question}</Text>
                </View>
              ) : null}
              <View style={styles.debateAnswerSection}>
                <Text style={styles.sectionLabel}>YOUR ANSWER ({gameState.playerName}):</Text>
                <TextInput
                  style={styles.debateAnswerInput}
                  multiline
                  placeholder="Give your response to the debate question. 80+ words gives the strongest performance. Be specific, confident, and attack your opponents' weaknesses..."
                  placeholderTextColor={Colors.textMuted}
                  value={debateAnswer}
                  onChangeText={setDebateAnswer}
                  textAlignVertical="top"
                />
                <Text style={styles.wordCount}>{debateAnswer.trim().split(/\s+/).filter(Boolean).length} words</Text>
                <Pressable onPress={handleDebateAnswer} disabled={!debateAnswer.trim()} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, !debateAnswer.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
                  <MaterialCommunityIcons name="send" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>{currentDebateQ < aiQuestions.length - 1 ? `Submit — Question ${currentDebateQ + 2}` : 'Final Answer — Go to Ballot'}</Text>
                </Pressable>
              </View>
              {debateAnswers.length > 0 ? (
                <View style={styles.prevDebateAnswers}>
                  <Text style={styles.sectionLabel}>PREVIOUS ANSWERS</Text>
                  {debateAnswers.map((a, idx) => (
                    <View key={idx} style={styles.prevDebateItem}>
                      <Text style={styles.prevDebateQ}>{a.topic}</Text>
                      <Text style={[styles.prevDebateImpact, { color: a.impact >= 0 ? Colors.success : Colors.error }]}>{a.impact >= 0 ? '+' : ''}{a.impact} delegates</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // BALLOT ROUNDS
  if (phase === 'ballot') {
    const activeCandidates = candidates.filter(c => !c.eliminated);
    const latestRound = ballotRounds[ballotRounds.length - 1];
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <View style={[styles.header, { borderBottomColor: Colors.gold + '33' }]}>
          <View style={styles.liveIndicator}>
            <View style={[styles.liveDot, { backgroundColor: ballotAnimating ? Colors.error : Colors.success }]} />
            <Text style={[styles.liveText, { color: ballotAnimating ? Colors.error : Colors.success }]}>{ballotAnimating ? 'LIVE' : 'COMPLETE'}</Text>
          </View>
          <Text style={styles.headerTitle}>Convention Ballot</Text>
          {ballotRounds.length > 0 ? <Text style={styles.headerSub}>Round {currentBallotRound}</Text> : null}
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 60 }]} showsVerticalScrollIndicator={false}>
          {!ballotAnimating && ballotRounds.length === 0 ? (
            <View style={styles.ballotStartCard}>
              <MaterialCommunityIcons name="vote" size={48} color={partyColor} />
              <Text style={styles.ballotStartTitle}>Convention Ballot Begins</Text>
              <Text style={styles.ballotStartDesc}>
                {activeCandidates.length} candidates enter the first ballot. Candidates are eliminated after each round. Delegates transfer to remaining candidates. The winner needs 50%+1 to win.
              </Text>
              <Text style={styles.sectionLabel}>YOUR DELEGATE COUNT</Text>
              <Text style={[styles.delegateCountBig, { color: partyColor }]}>{playerDelegates}</Text>
              <Text style={styles.delegateCountSub}>of {totalDelegates} total delegates</Text>
              <Pressable onPress={runBallotRounds} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}>
                <MaterialCommunityIcons name="play" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Begin Ballot Counting</Text>
              </Pressable>
            </View>
          ) : null}

          {ballotRounds.map((round, idx) => (
            <View key={idx} style={styles.ballotRoundCard}>
              <Text style={styles.ballotRoundTitle}>ROUND {round.round}</Text>
              {Object.entries(round.results).map(([id, votes]) => {
                const cand = candidates.find(c => c.id === id);
                if (!cand) return null;
                const pct = Math.round((votes / totalDelegates) * 100);
                const isEliminated = round.eliminated === id;
                return (
                  <View key={id} style={[styles.ballotResultRow, isEliminated && { opacity: 0.5 }]}>
                    <Text style={[styles.ballotCandName, cand.isPlayer && { color: partyColor }, isEliminated && { textDecorationLine: 'line-through' }]} numberOfLines={1}>{cand.name}{isEliminated ? ' ✗' : ''}</Text>
                    <View style={styles.ballotResultBar}>
                      <View style={[styles.ballotResultFill, { flex: pct, backgroundColor: cand.isPlayer ? partyColor : isEliminated ? Colors.error : Colors.textMuted }]} />
                      <View style={{ flex: 100 - pct }} />
                    </View>
                    <Text style={[styles.ballotResultPct, cand.isPlayer && { color: partyColor }]}>{votes}</Text>
                  </View>
                );
              })}
              {round.eliminated ? (
                <View style={styles.eliminatedBanner}>
                  <MaterialCommunityIcons name="close-circle" size={12} color={Colors.error} />
                  <Text style={styles.eliminatedText}>{candidates.find(c => c.id === round.eliminated)?.name} eliminated — delegates redistributed</Text>
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    );
  }

  // RESULT
  if (phase === 'result' && winner) {
    const playerWon = winner.isPlayer;
    const resultColor = playerWon ? Colors.success : Colors.error;
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.resultHero, { borderColor: resultColor + '55' }]}>
            <MaterialCommunityIcons name={playerWon ? 'trophy' : 'account-check'} size={72} color={resultColor} />
            <Text style={[styles.resultTitle, { color: resultColor }]}>{playerWon ? 'YOU ARE THE NEW LEADER' : `${winner.name} WINS`}</Text>
            <Text style={styles.resultSubtitle}>
              {playerWon
                ? `${gameState.playerName} has won the ${party?.name} leadership convention! You are now the party leader once again.`
                : `After a hard-fought convention, ${winner.name} has won the ${party?.name} leadership. You remain as a senior MP and party figure.`}
            </Text>
            <View style={[styles.resultDelegateBadge, { backgroundColor: resultColor + '22', borderColor: resultColor + '44' }]}>
              <Text style={[styles.resultDelegateText, { color: resultColor }]}>
                Your final delegate count: {playerDelegates}/{totalDelegates}
              </Text>
            </View>
          </View>

          {playerWon ? (
            <View style={styles.resultConsequences}>
              <Text style={styles.sectionLabel}>YOUR MANDATE AS NEW LEADER</Text>
              {[
                'Full party leadership restored — you lead the official party',
                `Debate performance earned ${debateAnswers.reduce((s, a) => s + a.impact, 0) > 0 ? 'significant' : 'some'} delegate momentum`,
                `Provincial tour reached ${provinces.filter(p => p.playerVisited).length}/${provinces.length} provinces`,
                'Party fundraising total shows grassroots strength — media coverage imminent',
                'You must now rebuild the caucus and prepare for the next election',
              ].map((c, i) => (
                <View key={i} style={styles.consequenceRow}>
                  <MaterialCommunityIcons name="check" size={13} color={Colors.success} />
                  <Text style={styles.consequenceText}>{c}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.resultConsequences}>
              <Text style={styles.sectionLabel}>YOUR ROLE AS SENIOR MP</Text>
              {[
                `${winner.name} has won — you will serve as a respected senior member`,
                'Your campaign built a strong grassroots network for future opportunities',
                `Your ${provinces.filter(p => p.playerVisited).length} province tour strengthened regional connections`,
                'Continue serving in Parliament as a key opposition or government voice',
                'A future leadership opportunity may arise if the new leader struggles',
              ].map((c, i) => (
                <View key={i} style={styles.consequenceRow}>
                  <MaterialCommunityIcons name="information" size={13} color={Colors.info} />
                  <Text style={styles.consequenceText}>{c}</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable
            onPress={() => {
              if (playerWon) resolveLeadershipReview(true);
              router.replace('/(tabs)');
            }}
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: resultColor }, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.primaryBtnText}>{playerWon ? 'Lead the Party — Return to Parliament' : 'Return to Parliament as Senior MP'}</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
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
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  sectionNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  secondaryBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  // Declare
  declareHero: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card },
  declareHeroTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, textAlign: 'center' },
  declareHeroDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  raceOverview: { gap: Spacing.sm },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  overviewItem: { flex: 1, minWidth: '45%', backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm, gap: 4, alignItems: 'center' },
  overviewLabel: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  overviewValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, textAlign: 'center' },
  rivalCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 6 },
  rivalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rivalName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  rivalIdeology: { fontSize: FontSize.xs, color: Colors.textSecondary, fontStyle: 'italic' },
  rivalFundBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.gold + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  rivalFundText: { fontSize: 10, color: Colors.gold, fontWeight: FontWeight.bold },
  rivalDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  rivalWeakness: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderRadius: Radius.sm, padding: 6, borderWidth: 1, backgroundColor: Colors.warning + '08' },
  rivalWeaknessText: { flex: 1, fontSize: 10, color: Colors.warning, lineHeight: 15 },
  rivalRegional: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rivalRegionalLabel: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.5 },
  rivalRegionalPill: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Colors.surfaceBorder },
  rivalRegionalPillText: { fontSize: 9, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  // Fundraise
  fundCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  fundHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  fundTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  fundSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  fundPct: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  fundBar: { flexDirection: 'row', height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden' },
  fundBarFill: { minWidth: 4, borderRadius: 4 },
  fundNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
  fundMethodCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  fundMethodName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  fundMethodDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  fundMethodRight: { alignItems: 'flex-end', gap: 4 },
  fundMethodAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  fundRiskBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  fundRiskText: { fontSize: 9, fontWeight: FontWeight.bold },
  negotiateCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  negotiateName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  negotiateDelegates: { fontSize: FontSize.xs, color: Colors.textSecondary },
  negBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  negBadgeText: { fontSize: 9, fontWeight: FontWeight.bold },
  delegateDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm, justifyContent: 'center' },
  delegateCount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  // Province tour
  delegatePill: { backgroundColor: Colors.card, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder },
  delegatePillText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  provinceDetailCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  provinceDetailHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  provinceDetailName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  provinceDetailWeight: { fontSize: FontSize.xs, color: Colors.textSecondary },
  provinceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  provinceCard: { width: '30%', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm, gap: 4 },
  provinceCardVisited: { borderColor: Colors.success + '44', backgroundColor: Colors.success + '08' },
  provinceCode: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  provinceName: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
  provinceDelegate: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  provinceDelegateText: { fontSize: 10, fontWeight: FontWeight.bold },
  speechInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 150, lineHeight: 22 },
  wordCount: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' },
  // Debate
  debateStageCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.sm, gap: 8 },
  debateCandidateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  debateCandidateChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.surfaceBorder },
  debateCandidateChipText: { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.medium },
  questionProgress: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  questionDot: { width: 24, height: 6, borderRadius: 3, backgroundColor: Colors.surfaceBorder },
  debateQuestionCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 8 },
  debateModeratorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  debateModeratorText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.gold },
  debateQuestionText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, lineHeight: 24 },
  debateAnswerSection: { gap: 8 },
  debateAnswerInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 120, lineHeight: 22 },
  prevDebateAnswers: { gap: 6 },
  prevDebateItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.card, borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  prevDebateQ: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1 },
  prevDebateImpact: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  debateSummaryCard: { alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.success + '44', padding: Spacing.xl },
  debateSummaryTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  debateSummaryImpact: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  debateAnswerReview: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.sm, borderWidth: 1, padding: 8, backgroundColor: Colors.surfaceElevated },
  debateAnswerQ: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  debateAnswerImpact: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  // Ballot
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, letterSpacing: 1 },
  ballotStartCard: { alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.gold + '44', padding: Spacing.xl },
  ballotStartTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  ballotStartDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  delegateCountBig: { fontSize: 56, fontWeight: FontWeight.extrabold },
  delegateCountSub: { fontSize: FontSize.sm, color: Colors.textMuted },
  ballotRoundCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  ballotRoundTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, color: Colors.gold, letterSpacing: 1.5 },
  ballotResultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ballotCandName: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary, width: 90 },
  ballotResultBar: { flex: 1, flexDirection: 'row', height: 10, backgroundColor: Colors.surfaceBorder, borderRadius: 5, overflow: 'hidden' },
  ballotResultFill: { minWidth: 2, borderRadius: 5 },
  ballotResultPct: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textSecondary, width: 40, textAlign: 'right' },
  eliminatedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.error + '11', borderRadius: Radius.sm, padding: 6 },
  eliminatedText: { fontSize: 10, color: Colors.error, flex: 1 },
  // Result
  resultHero: { borderRadius: Radius.xl, borderWidth: 2, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card },
  resultTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, textAlign: 'center' },
  resultSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  resultDelegateBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1 },
  resultDelegateText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  resultConsequences: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  consequenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  consequenceText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
});
