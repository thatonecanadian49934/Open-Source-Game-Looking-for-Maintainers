// Powered by OnSpace.AI — Leadership Convention screen after losing leadership review
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';

interface Candidate {
  id: string;
  name: string;
  age: number;
  province: string;
  ideology: string;
  ideologyColor: string;
  fundraising: number;   // 0-100
  regionalSupport: Record<string, number>; // province code -> %
  nationalPoll: number;  // 0-100
  endorsements: string[];
  biography: string;
  weakness: string;
  delegateVotes: number;
}

interface BallotRound {
  round: number;
  results: Record<string, number>;
  eliminated: string | null;
  winner: string | null;
}

type ConventionPhase = 'intro' | 'candidates' | 'endorse' | 'speech' | 'negotiate' | 'balloting' | 'winner';

function generateCandidates(partyId: string): Candidate[] {
  const partyData = PARTIES.find(p => p.id === partyId);
  const partyName = partyData?.shortName || 'Party';

  const basePool: Omit<Candidate, 'id'>[] = [
    {
      name: 'Dr. Eleanor Marchand',
      age: 52,
      province: 'ON',
      ideology: 'Centrist',
      ideologyColor: Colors.info,
      fundraising: 85,
      regionalSupport: { ON: 42, QC: 28, BC: 35, AB: 18, MB: 30 },
      nationalPoll: 38,
      endorsements: ['Toronto Metro Council', 'Canadian Chamber of Commerce', '6 current MPs'],
      biography: 'Former Deputy Finance Minister. Rhodes Scholar. Built a reputation for fiscal discipline while expanding social programs. Known for coalition-building.',
      weakness: 'Seen as too establishment. Bay Street ties alienate progressive wing.',
      delegateVotes: 0,
    },
    {
      name: 'Luc Beauséjour',
      age: 44,
      province: 'QC',
      ideology: 'Centre-Left',
      ideologyColor: Colors.success,
      fundraising: 72,
      regionalSupport: { QC: 58, ON: 22, BC: 30, NB: 45, MB: 18 },
      nationalPoll: 29,
      endorsements: ['Quebec Caucus Bloc', 'CUPE Local Unions', '4 MPs'],
      biography: 'MP for Montarville since 2015. Former union lawyer. Speaks to working-class anxiety with authentic credibility. Bilingual political force.',
      weakness: 'Limited Western appeal. Seen as too Quebec-focused by some national voters.',
      delegateVotes: 0,
    },
    {
      name: 'Priya Subramaniam',
      age: 39,
      province: 'BC',
      ideology: 'Progressive',
      ideologyColor: Colors.ndp,
      fundraising: 61,
      regionalSupport: { BC: 52, ON: 18, AB: 10, SK: 12, NS: 28 },
      nationalPoll: 24,
      endorsements: ['Youth Wing Leadership', 'Climate Coalition', '3 MPs'],
      biography: 'Youngest candidate. Tech entrepreneur turned MP. Climate hawk and digital economy expert. Energizes younger voters.',
      weakness: 'Thin parliamentary experience. Critics say she lacks depth on foreign policy.',
      delegateVotes: 0,
    },
    {
      name: 'Thomas Mackenzie-Dunn',
      age: 61,
      province: 'AB',
      ideology: 'Centre-Right',
      ideologyColor: Colors.warning,
      fundraising: 78,
      regionalSupport: { AB: 65, SK: 55, MB: 42, ON: 28, BC: 20 },
      nationalPoll: 32,
      endorsements: ['Prairie Caucus', 'Canadian Taxpayers Federation', '5 MPs'],
      biography: 'Former Premier of Alberta. Deep roots in resource economy. Promises to rebuild the Western base and challenge resource sector regulations.',
      weakness: 'Divisive in Quebec. Urban voters in Toronto and Vancouver skeptical.',
      delegateVotes: 0,
    },
    {
      name: 'Amara Osei-Bonsu',
      age: 48,
      province: 'ON',
      ideology: 'Progressive Centrist',
      ideologyColor: Colors.gold,
      fundraising: 68,
      regionalSupport: { ON: 35, BC: 30, NS: 40, NB: 35, PE: 50 },
      nationalPoll: 27,
      endorsements: ['Atlantic Caucus', 'Black Entrepreneurship Network', '3 MPs'],
      biography: 'Former Justice Minister. Immigrant success story. Champion of criminal justice reform and multicultural outreach. Broad coalition appeal.',
      weakness: 'Moderate fundraising base. Not yet tested in national campaigns.',
      delegateVotes: 0,
    },
    {
      name: 'Jean-François Côté',
      age: 56,
      province: 'QC',
      ideology: 'Social Democrat',
      ideologyColor: Colors.bloc,
      fundraising: 55,
      regionalSupport: { QC: 45, ON: 15, NB: 38, NS: 22, MB: 14 },
      nationalPoll: 19,
      endorsements: ['Quebec City Caucus', 'Seniors Advocacy Groups', '2 MPs'],
      biography: 'Senate-side champion for social programs. Three-term MP known for cross-party deal-making. Quebec nationalist-friendly but committed to federalism.',
      weakness: 'Low name recognition outside Quebec. Seen as too narrowly focused.',
      delegateVotes: 0,
    },
  ];

  return basePool.slice(0, 5).map((c, i) => ({ ...c, id: `candidate_${i}` }));
}

function simulateBallotRound(
  candidates: Candidate[],
  previousResults: Record<string, number>,
  eliminatedIds: string[],
  playerEndorsement: string | null,
  playerSpeechBonus: number
): BallotRound {
  const active = candidates.filter(c => !eliminatedIds.includes(c.id));
  const results: Record<string, number> = {};
  let totalDelegates = 1000;

  active.forEach(c => {
    let votes = c.nationalPoll * 8 + c.fundraising * 2 + Math.random() * 60 - 20;
    if (playerEndorsement === c.id) votes += playerSpeechBonus + 40;
    if (previousResults[c.id]) votes = previousResults[c.id] * 0.6 + votes * 0.4; // momentum
    results[c.id] = Math.max(10, Math.round(votes));
  });

  // Normalize to 1000 delegates
  const total = Object.values(results).reduce((s, v) => s + v, 0);
  Object.keys(results).forEach(id => { results[id] = Math.round((results[id] / total) * totalDelegates); });

  // Check winner (>500 delegates = majority of 1000)
  const winner = Object.entries(results).find(([, v]) => v > 500)?.[0] || null;
  // Eliminate lowest if no winner
  const eliminated = winner ? null : Object.entries(results).sort(([, a], [, b]) => a - b)[0]?.[0] || null;

  return { round: eliminatedIds.length + 1, results, eliminated, winner };
}

export default function LeadershipConventionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, resolveLeadershipReview } = useGame();
  const { showAlert } = useAlert();

  const [phase, setPhase] = useState<ConventionPhase>('intro');
  const [candidates] = useState<Candidate[]>(() => gameState ? generateCandidates(gameState.playerPartyId) : []);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [endorsedCandidate, setEndorsedCandidate] = useState<string | null>(null);
  const [speechText, setSpeechText] = useState('');
  const [speechBonus, setSpeechBonus] = useState(0);
  const [negotiating, setNegotiating] = useState<string | null>(null);
  const [delegateDeals, setDelegateDeals] = useState<Record<string, number>>({});
  const [ballotRounds, setBallotRounds] = useState<BallotRound[]>([]);
  const [eliminatedIds, setEliminatedIds] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [winnerCandidate, setWinnerCandidate] = useState<Candidate | null>(null);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);

  const barAnims = useRef<Record<string, Animated.Value>>({});
  candidates.forEach(c => {
    if (!barAnims.current[c.id]) barAnims.current[c.id] = new Animated.Value(0);
  });

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;

  const getSpeechBonus = (text: string) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return words > 120 ? 60 : words > 80 ? 45 : words > 40 ? 30 : words > 20 ? 15 : 0;
  };

  const handleEndorse = (candidateId: string) => {
    setEndorsedCandidate(candidateId);
    setPhase('speech');
  };

  const handleSubmitSpeech = () => {
    const bonus = getSpeechBonus(speechText);
    setSpeechBonus(bonus);
    setPhase('negotiate');
  };

  const handleNegotiateDelegates = (candidateId: string) => {
    const deal = Math.round(20 + Math.random() * 40);
    setDelegateDeals(prev => ({ ...prev, [candidateId]: deal }));
    showAlert('Delegate Deal', `Negotiated ${deal} delegate votes from ${candidates.find(c => c.id === candidateId)?.name}. They'll transfer their support to your endorsed candidate if eliminated.`);
    setNegotiating(null);
  };

  const startBalloting = () => {
    setPhase('balloting');
    runBallotAnimation([]);
  };

  const runBallotAnimation = (currentEliminated: string[]) => {
    setIsAnimating(true);
    const round = simulateBallotRound(candidates, ballotRounds[ballotRounds.length - 1]?.results || {}, currentEliminated, endorsedCandidate, speechBonus);

    // Animate bars
    const total = Object.values(round.results).reduce((s, v) => s + v, 0);
    const animations = Object.entries(round.results).map(([id, votes]) =>
      Animated.timing(barAnims.current[id], { toValue: votes / total, duration: 1200, useNativeDriver: false })
    );

    setTimeout(() => {
      setBallotRounds(prev => [...prev, round]);
      Animated.parallel(animations).start(() => {
        setIsAnimating(false);
        if (round.winner) {
          const winner = candidates.find(c => c.id === round.winner);
          setWinnerCandidate(winner || null);
          setTimeout(() => setPhase('winner'), 1000);
        } else if (round.eliminated) {
          setEliminatedIds(prev => [...prev, round.eliminated!]);
          const newEliminated = [...currentEliminated, round.eliminated!];
          const remainingActive = candidates.filter(c => !newEliminated.includes(c.id));
          if (remainingActive.length <= 1) {
            setWinnerCandidate(remainingActive[0] || null);
            setTimeout(() => setPhase('winner'), 1000);
          } else {
            setTimeout(() => runBallotAnimation(newEliminated), 2500);
          }
        }
      });
    }, 800);
  };

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.introHeader}>
          <MaterialCommunityIcons name="domain" size={36} color={partyColor} />
          <Text style={[styles.introTitle, { color: partyColor }]}>{party?.name}</Text>
          <Text style={styles.introSubtitle}>Leadership Convention</Text>
          <Text style={styles.introDesc}>Following the leadership review, the party must elect a new leader. You will endorse a candidate, give a nominating speech, negotiate delegate votes, and watch the convention balloting unfold live.</Text>
        </View>
        <View style={styles.introPhases}>
          {['Review Candidates', 'Endorse a Candidate', 'Deliver Speech', 'Negotiate Delegates', 'Live Balloting'].map((p, i) => (
            <View key={i} style={styles.introPhaseRow}>
              <View style={[styles.introPhaseDot, { backgroundColor: partyColor }]}>
                <Text style={styles.introPhaseNum}>{i + 1}</Text>
              </View>
              <Text style={styles.introPhaseLabel}>{p}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={() => setPhase('candidates')} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}>
          <Text style={styles.primaryBtnText}>Open Convention Floor</Text>
        </Pressable>
      </View>
    );
  }

  // ── CANDIDATES ──
  if (phase === 'candidates') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.sectionHeader}>
          <Pressable onPress={() => setPhase('intro')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.sectionTitle}>Convention Candidates</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.instructNote}>Tap a candidate to expand their profile. You must endorse one before the first ballot.</Text>
          {candidates.map(c => {
            const isSelected = selectedCandidate === c.id;
            return (
              <Pressable key={c.id} onPress={() => setSelectedCandidate(isSelected ? null : c.id)} style={({ pressed }) => [styles.candidateCard, isSelected && { borderColor: c.ideologyColor }, pressed && { opacity: 0.95 }]}>
                <View style={styles.candidateHeader}>
                  <View style={[styles.candidateAvatar, { backgroundColor: c.ideologyColor + '22' }]}>
                    <MaterialCommunityIcons name="account-tie" size={24} color={c.ideologyColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.candidateName}>{c.name}</Text>
                    <Text style={[styles.candidateIdeology, { color: c.ideologyColor }]}>{c.ideology} · {c.province} · Age {c.age}</Text>
                  </View>
                  <View style={[styles.pollBadge, { backgroundColor: c.ideologyColor + '22' }]}>
                    <Text style={[styles.pollNum, { color: c.ideologyColor }]}>{c.nationalPoll}%</Text>
                    <Text style={styles.pollLabel}>national</Text>
                  </View>
                </View>

                {/* Stats bars */}
                <View style={styles.candidateStats}>
                  {[
                    { label: 'Fundraising', value: c.fundraising, color: Colors.gold },
                    { label: 'National Poll', value: c.nationalPoll, color: c.ideologyColor },
                  ].map(s => (
                    <View key={s.label} style={styles.candidateStat}>
                      <Text style={styles.candidateStatLabel}>{s.label}</Text>
                      <View style={styles.candidateStatBarTrack}>
                        <View style={[styles.candidateStatBarFill, { width: `${s.value}%` as any, backgroundColor: s.color }]} />
                      </View>
                      <Text style={[styles.candidateStatValue, { color: s.color }]}>{s.value}%</Text>
                    </View>
                  ))}
                </View>

                {isSelected ? (
                  <View style={styles.candidateExpanded}>
                    <Text style={styles.candidateBio}>{c.biography}</Text>
                    <View style={[styles.weaknessCard, { borderColor: Colors.warning + '44' }]}>
                      <MaterialCommunityIcons name="alert-circle" size={12} color={Colors.warning} />
                      <Text style={styles.weaknessText}>{c.weakness}</Text>
                    </View>
                    <Text style={styles.endorsementsTitle}>KEY ENDORSEMENTS:</Text>
                    {c.endorsements.map((e, i) => (
                      <View key={i} style={styles.endorsementItem}>
                        <MaterialCommunityIcons name="check" size={11} color={Colors.success} />
                        <Text style={styles.endorsementText}>{e}</Text>
                      </View>
                    ))}
                    <Text style={styles.regionalTitle}>REGIONAL STRENGTH:</Text>
                    <View style={styles.regionalGrid}>
                      {Object.entries(c.regionalSupport).map(([prov, pct]) => (
                        <View key={prov} style={styles.regionalItem}>
                          <Text style={styles.regionalProv}>{prov}</Text>
                          <Text style={[styles.regionalPct, { color: c.ideologyColor }]}>{pct}%</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable onPress={() => setPhase('endorse')} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}>
            <Text style={styles.primaryBtnText}>Proceed to Endorsement</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── ENDORSE ──
  if (phase === 'endorse') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.sectionHeader}>
          <Pressable onPress={() => setPhase('candidates')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.sectionTitle}>Choose Your Endorsement</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.endorseNote}>
            <MaterialCommunityIcons name="information" size={14} color={Colors.gold} />
            <Text style={styles.endorseNoteText}>Your endorsement carries weight with delegates and unlocks the ability to give a nominating speech. Choose carefully — this shapes the party's direction.</Text>
          </View>
          {candidates.map(c => {
            const isEndorsed = endorsedCandidate === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => handleEndorse(c.id)}
                style={({ pressed }) => [styles.endorseCard, isEndorsed && { borderColor: partyColor, backgroundColor: partyColor + '11' }, pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.endorseRadio, isEndorsed && { backgroundColor: partyColor, borderColor: partyColor }]}>
                  {isEndorsed ? <MaterialCommunityIcons name="check" size={14} color="#fff" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.endorseName, isEndorsed && { color: partyColor }]}>{c.name}</Text>
                  <Text style={[styles.endorseIdeology, { color: c.ideologyColor }]}>{c.ideology} · {c.province}</Text>
                  <Text style={styles.endorsePoll}>National polling: {c.nationalPoll}%</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ── SPEECH ──
  if (phase === 'speech') {
    const endorsed = candidates.find(c => c.id === endorsedCandidate);
    const currentBonus = getSpeechBonus(speechText);
    const words = speechText.trim().split(/\s+/).filter(Boolean).length;
    return (
      <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sectionHeader}>
          <Pressable onPress={() => setPhase('endorse')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.sectionTitle}>Nominating Speech</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.endorsedBanner, { backgroundColor: endorsed?.ideologyColor + '22', borderColor: endorsed?.ideologyColor + '44' }]}>
            <MaterialCommunityIcons name="account-tie" size={16} color={endorsed?.ideologyColor} />
            <Text style={[styles.endorsedBannerText, { color: endorsed?.ideologyColor }]}>You are nominating {endorsed?.name} for party leader</Text>
          </View>
          <View style={styles.speechGuide}>
            <Text style={styles.guideTitle}>SPEECH IMPACT ON DELEGATES</Text>
            {[
              { label: '120+ words', bonus: '+60 delegates', color: Colors.success },
              { label: '80–120 words', bonus: '+45 delegates', color: Colors.info },
              { label: '40–80 words', bonus: '+30 delegates', color: Colors.warning },
              { label: '20–40 words', bonus: '+15 delegates', color: Colors.warning },
              { label: 'Under 20 words', bonus: 'No bonus', color: Colors.error },
            ].map(row => (
              <View key={row.label} style={styles.guideRow}>
                <Text style={styles.guideLabel}>{row.label}</Text>
                <Text style={[styles.guideBonus, { color: row.color }]}>{row.bonus}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.fieldLabel}>YOUR NOMINATING SPEECH</Text>
          <TextInput
            style={styles.speechInput}
            multiline
            placeholder={`Tell the convention why ${endorsed?.name} is the right choice. Draw on their strengths, regional appeal, and vision. An emotional, concrete, detailed speech moves delegates more than platitudes...`}
            placeholderTextColor={Colors.textMuted}
            value={speechText}
            onChangeText={setSpeechText}
            textAlignVertical="top"
          />
          <View style={styles.speechMetaRow}>
            <Text style={[styles.wordCount, words > 80 ? { color: Colors.success } : words > 40 ? { color: Colors.warning } : { color: Colors.error }]}>{words} words</Text>
            <Text style={styles.bonusText}>+{currentBonus} delegate impact</Text>
          </View>
          <Pressable onPress={handleSubmitSpeech} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="microphone" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Deliver Speech — Proceed to Negotiations</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── NEGOTIATE ──
  if (phase === 'negotiate') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.sectionHeader}>
          <View style={{ width: 40 }} />
          <Text style={styles.sectionTitle}>Delegate Negotiations</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.negotiateNote}>
            <MaterialCommunityIcons name="handshake" size={14} color={Colors.gold} />
            <Text style={styles.negotiateNoteText}>You can negotiate delegate transfer deals with other candidates. If they are eliminated, their delegates will transfer to your endorsed candidate.</Text>
          </View>
          {candidates.filter(c => c.id !== endorsedCandidate).map(c => {
            const hasDeal = !!delegateDeals[c.id];
            return (
              <View key={c.id} style={styles.negotiateCard}>
                <View style={styles.negotiateCardHeader}>
                  <View style={[styles.candidateAvatar, { backgroundColor: c.ideologyColor + '22' }]}>
                    <MaterialCommunityIcons name="account-tie" size={20} color={c.ideologyColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.candidateName}>{c.name}</Text>
                    <Text style={[styles.candidateIdeology, { color: c.ideologyColor }]}>{c.ideology} · {c.nationalPoll}% polling</Text>
                  </View>
                  {hasDeal ? (
                    <View style={styles.dealBadge}>
                      <MaterialCommunityIcons name="check-circle" size={13} color={Colors.success} />
                      <Text style={styles.dealBadgeText}>{delegateDeals[c.id]} delegates</Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => handleNegotiateDelegates(c.id)} style={({ pressed }) => [styles.negotiateBtn, pressed && { opacity: 0.8 }]}>
                      <Text style={styles.negotiateBtnText}>Negotiate</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
        <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable onPress={startBalloting} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="vote" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Open Convention Balloting</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── BALLOTING ──
  if (phase === 'balloting') {
    const latestRound = ballotRounds[ballotRounds.length - 1];
    const totalDelegates = latestRound ? Object.values(latestRound.results).reduce((s, v) => s + v, 0) : 1000;

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.ballotHeader}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.ballotHeaderTitle}>LEADERSHIP CONVENTION</Text>
          <Text style={styles.ballotHeaderSub}>{party?.name} · Round {ballotRounds.length}</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
          {candidates.filter(c => !eliminatedIds.includes(c.id)).map(c => {
            const votes = latestRound?.results[c.id] || 0;
            const pct = totalDelegates > 0 ? votes / totalDelegates : 0;
            const isEndorsed = endorsedCandidate === c.id;
            return (
              <View key={c.id} style={[styles.ballotRow, isEndorsed && { borderColor: partyColor, borderWidth: 1.5 }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.ballotRowHeader}>
                    <Text style={[styles.ballotCandName, isEndorsed && { color: partyColor }]}>{c.name} {isEndorsed ? '★' : ''}</Text>
                    <Text style={[styles.ballotVotes, { color: c.ideologyColor }]}>{votes} delegates</Text>
                    <Text style={styles.ballotPct}>{Math.round(pct * 100)}%</Text>
                  </View>
                  <View style={styles.ballotBarTrack}>
                    <Animated.View style={[styles.ballotBarFill, {
                      width: barAnims.current[c.id].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                      backgroundColor: c.ideologyColor,
                    }]} />
                  </View>
                </View>
              </View>
            );
          })}

          {/* Eliminated candidates */}
          {eliminatedIds.length > 0 ? (
            <View style={styles.eliminatedSection}>
              <Text style={styles.eliminatedTitle}>ELIMINATED</Text>
              {eliminatedIds.map(id => {
                const c = candidates.find(ca => ca.id === id);
                return c ? (
                  <View key={id} style={styles.eliminatedRow}>
                    <MaterialCommunityIcons name="close-circle" size={14} color={Colors.error} />
                    <Text style={styles.eliminatedName}>{c.name}</Text>
                    <Text style={styles.eliminatedRound}>Round {eliminatedIds.indexOf(id) + 1}</Text>
                  </View>
                ) : null;
              })}
            </View>
          ) : null}

          <View style={styles.majorityNote}>
            <Text style={styles.majorityNoteText}>501+ delegates needed for a majority ({totalDelegates} total delegates)</Text>
          </View>

          {isAnimating ? (
            <View style={styles.countingBanner}>
              <MaterialCommunityIcons name="loading" size={16} color={Colors.gold} />
              <Text style={styles.countingText}>Ballots being counted...</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  // ── WINNER ──
  if (phase === 'winner' && winnerCandidate) {
    const isEndorsedWinner = endorsedCandidate === winnerCandidate.id;
    const resultColor = isEndorsedWinner ? Colors.success : Colors.warning;

    return (
      <ScrollView contentContainerStyle={[styles.winnerContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.winnerBanner, { borderColor: resultColor + '55' }]}>
          <MaterialCommunityIcons name="crown" size={64} color={resultColor} />
          <Text style={[styles.winnerTitle, { color: resultColor }]}>NEW PARTY LEADER</Text>
          <Text style={styles.winnerName}>{winnerCandidate.name}</Text>
          <Text style={[styles.winnerIdeology, { color: winnerCandidate.ideologyColor }]}>{winnerCandidate.ideology} · {winnerCandidate.province}</Text>
          <View style={[styles.endorsedResultBadge, { backgroundColor: resultColor + '22', borderColor: resultColor + '44' }]}>
            <Text style={[styles.endorsedResultText, { color: resultColor }]}>
              {isEndorsedWinner ? '✓ Your endorsed candidate WON' : `Your endorsed candidate lost — ${winnerCandidate.name} prevailed`}
            </Text>
          </View>
        </View>

        {/* Ballot summary */}
        <View style={styles.ballotSummaryCard}>
          <Text style={styles.sectionLabel}>CONVENTION BALLOT RESULTS</Text>
          {ballotRounds.map(round => (
            <View key={round.round} style={styles.roundRow}>
              <Text style={styles.roundLabel}>Round {round.round}</Text>
              {Object.entries(round.results).sort(([, a], [, b]) => b - a).map(([id, votes]) => {
                const c = candidates.find(ca => ca.id === id);
                return c ? (
                  <View key={id} style={styles.roundResultItem}>
                    <Text style={[styles.roundCandName, { color: c.ideologyColor }]}>{c.name.split(' ')[0]}</Text>
                    <Text style={styles.roundVotes}>{votes}</Text>
                    {round.eliminated === id ? <MaterialCommunityIcons name="close-circle" size={11} color={Colors.error} /> : null}
                    {round.winner === id ? <MaterialCommunityIcons name="crown" size={11} color={Colors.gold} /> : null}
                  </View>
                ) : null;
              })}
            </View>
          ))}
        </View>

        <View style={styles.consequencesCard}>
          <Text style={styles.sectionLabel}>{isEndorsedWinner ? 'YOUR INFLUENCE IN THE NEW LEADERSHIP' : 'YOUR POSITION IN THE NEW LEADERSHIP'}</Text>
          {(isEndorsedWinner ? [
            `${winnerCandidate.name} publicly thanked you for your support`,
            'You are positioned for a prominent shadow cabinet role',
            'Your faction has significant influence in the new leadership',
            'Party observers note your strong convention performance',
          ] : [
            `${winnerCandidate.name} won without your endorsement`,
            'You may need to prove your loyalty to the new leader',
            'Your political future depends on how you navigate this transition',
            'Some allies are already reaching out about your next move',
          ]).map((c, i) => (
            <View key={i} style={styles.consequenceRow}>
              <MaterialCommunityIcons name={isEndorsedWinner ? 'check' : 'information'} size={12} color={isEndorsedWinner ? Colors.success : Colors.textMuted} />
              <Text style={styles.consequenceText}>{c}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => {
            resolveLeadershipReview(false);
            router.replace('/(tabs)');
          }}
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.primaryBtnText}>Continue as {party?.shortName} MP</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  introHeader: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  introTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, letterSpacing: 1 },
  introSubtitle: { fontSize: FontSize.lg, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  introDesc: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.md },
  introPhases: { padding: Spacing.md, gap: 10, flex: 1 },
  introPhaseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  introPhaseDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  introPhaseNum: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
  introPhaseLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  scrollContent: { padding: Spacing.md, gap: Spacing.md },
  instructNote: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', fontStyle: 'italic' },

  candidateCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: 'hidden' },
  candidateHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  candidateAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  candidateName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  candidateIdeology: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, marginTop: 2 },
  pollBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm },
  pollNum: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  pollLabel: { fontSize: 9, color: Colors.textMuted },
  candidateStats: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: 6 },
  candidateStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  candidateStatLabel: { fontSize: 10, color: Colors.textMuted, width: 80 },
  candidateStatBarTrack: { flex: 1, height: 6, backgroundColor: Colors.surfaceBorder, borderRadius: 3, overflow: 'hidden' },
  candidateStatBarFill: { height: '100%', borderRadius: 3 },
  candidateStatValue: { fontSize: 10, fontWeight: FontWeight.bold, width: 30, textAlign: 'right' },
  candidateExpanded: { padding: Spacing.md, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  candidateBio: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  weaknessCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderRadius: Radius.sm, padding: 8, borderWidth: 1, borderColor: Colors.warning + '33', backgroundColor: Colors.warning + '0D' },
  weaknessText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, lineHeight: 16 },
  endorsementsTitle: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  endorsementItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  endorsementText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  regionalTitle: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  regionalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  regionalItem: { alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  regionalProv: { fontSize: 9, color: Colors.textMuted, fontWeight: FontWeight.bold },
  regionalPct: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  endorseNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.gold + '11', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.gold + '33' },
  endorseNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.gold, lineHeight: 18 },
  endorseCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  endorseRadio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.surfaceBorder, alignItems: 'center', justifyContent: 'center' },
  endorseName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  endorseIdeology: { fontSize: FontSize.xs, marginTop: 2 },
  endorsePoll: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  endorsedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1 },
  endorsedBannerText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, flex: 1 },
  speechGuide: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 6 },
  guideTitle: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  guideRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guideLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  guideBonus: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.2 },
  speechInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 180, lineHeight: 22 },
  speechMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordCount: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  bonusText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semibold },

  negotiateNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.gold + '11', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.gold + '33' },
  negotiateNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.gold, lineHeight: 18 },
  negotiateCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  negotiateCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dealBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.success + '22', borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  dealBadgeText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.bold },
  negotiateBtn: { backgroundColor: Colors.gold + '22', borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.gold + '44' },
  negotiateBtnText: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: FontWeight.bold },

  ballotHeader: { alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface, gap: 4 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.error, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.sm },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { fontSize: 10, fontWeight: FontWeight.extrabold, color: '#fff', letterSpacing: 2 },
  ballotHeaderTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, letterSpacing: 2 },
  ballotHeaderSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  ballotRow: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  ballotRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ballotCandName: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  ballotVotes: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  ballotPct: { fontSize: FontSize.xs, color: Colors.textMuted, minWidth: 30, textAlign: 'right' },
  ballotBarTrack: { height: 10, backgroundColor: Colors.surfaceBorder, borderRadius: 5, overflow: 'hidden' },
  ballotBarFill: { height: '100%', borderRadius: 5 },
  eliminatedSection: { gap: 6, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  eliminatedTitle: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.error, letterSpacing: 1 },
  eliminatedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.6 },
  eliminatedName: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted },
  eliminatedRound: { fontSize: FontSize.xs, color: Colors.textMuted },
  majorityNote: { backgroundColor: Colors.gold + '11', borderRadius: Radius.sm, padding: 8, borderWidth: 1, borderColor: Colors.gold + '22', alignItems: 'center' },
  majorityNoteText: { fontSize: FontSize.xs, color: Colors.gold },
  countingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.gold + '22', borderRadius: Radius.sm, padding: Spacing.sm },
  countingText: { fontSize: FontSize.sm, color: Colors.gold, fontWeight: FontWeight.semibold },

  winnerContent: { padding: Spacing.md, gap: Spacing.md },
  winnerBanner: { borderRadius: Radius.xl, borderWidth: 2, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card },
  winnerTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 2 },
  winnerName: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, textAlign: 'center' },
  winnerIdeology: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  endorsedResultBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, marginTop: 4 },
  endorsedResultText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'center' },
  ballotSummaryCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  roundRow: { gap: 4, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  roundLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  roundResultItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roundCandName: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, flex: 1 },
  roundVotes: { fontSize: FontSize.xs, color: Colors.textSecondary },
  consequencesCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  consequenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  consequenceText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  bottomAction: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
});
