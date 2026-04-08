// Powered by OnSpace.AI — Speaker of the House Election
// Preferential balloting (instant runoff), Speaker rulings, points of order
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';

interface SpeakerCandidate {
  id: string;
  name: string;
  partyId: string;
  region: string;
  experience: number; // years as MP
  neutralityScore: number; // 0-100, higher = more neutral
  description: string;
  votes: number[];       // votes in each round
  eliminated: boolean;
}

interface SpeakerRuling {
  id: string;
  type: 'point_of_order' | 'time_allocation' | 'emergency_debate' | 'privilege';
  motionTitle: string;
  ruling: string;
  week: number;
  ruled: 'in_order' | 'out_of_order' | 'prima_facie';
}

// ── Candidate pool ───────────────────────────────────────────────────────────
const CANDIDATE_POOL: Omit<SpeakerCandidate, 'votes' | 'eliminated'>[] = [
  {
    id: 'cand_1',
    name: 'Margaret O\'Sullivan',
    partyId: 'liberal',
    region: 'Ontario',
    experience: 18,
    neutralityScore: 82,
    description: 'Former House Leader with deep procedural knowledge. Known for impartiality and firm management of debate.',
  },
  {
    id: 'cand_2',
    name: 'Robert Tremblay',
    partyId: 'conservative',
    region: 'Quebec',
    experience: 14,
    neutralityScore: 76,
    description: 'Bilingual MP with strong parliamentary background. Committed to upholding the rights of all members.',
  },
  {
    id: 'cand_3',
    name: 'Priya Sharma',
    partyId: 'ndp',
    region: 'British Columbia',
    experience: 10,
    neutralityScore: 88,
    description: 'Regarded as one of the most procedure-savvy MPs. Has cross-party respect and a reputation for fairness.',
  },
  {
    id: 'cand_4',
    name: 'Jean-François Côté',
    partyId: 'bloc',
    region: 'Quebec',
    experience: 12,
    neutralityScore: 71,
    description: 'Expert in bilingual parliamentary procedure. Would be the first Québécois Speaker in two decades.',
  },
  {
    id: 'cand_5',
    name: 'Linda MacPherson',
    partyId: 'liberal',
    region: 'Nova Scotia',
    experience: 22,
    neutralityScore: 85,
    description: 'Longest-serving female MP. Has chaired multiple committee proceedings and has strong backbench support.',
  },
  {
    id: 'cand_6',
    name: 'David Park',
    partyId: 'conservative',
    region: 'Alberta',
    experience: 8,
    neutralityScore: 68,
    description: 'Former lawyer and constitutional scholar. Would bring legal rigor to procedural rulings.',
  },
];

const POINTS_OF_ORDER = [
  {
    type: 'time_allocation' as const,
    title: 'Time Allocation Motion',
    description: 'The government has moved time allocation on third reading debate. Is this motion in order?',
    governmentPosition: 'Time allocation is a legitimate procedural tool to manage government business.',
    oppositionPosition: 'This motion is premature and violates the rights of members to debate.',
  },
  {
    type: 'emergency_debate' as const,
    title: 'Emergency Debate Request',
    description: 'The opposition has requested an emergency debate on the economic situation. Does this meet the prima facie threshold?',
    governmentPosition: 'The matter is already being addressed through normal parliamentary channels.',
    oppositionPosition: 'The urgency of the economic situation warrants immediate parliamentary attention.',
  },
  {
    type: 'point_of_order' as const,
    title: 'Point of Order — Relevance',
    description: 'A member has been questioned about the relevance of their remarks to the question before the House.',
    governmentPosition: 'The remarks are clearly irrelevant and should be ruled out of order.',
    oppositionPosition: 'The remarks are directly relevant to the broader policy question.',
  },
  {
    type: 'privilege' as const,
    title: 'Question of Privilege',
    description: 'A member alleges their privilege was breached by early disclosure of budget documents to the media before tabling in Parliament.',
    governmentPosition: 'There is no evidence of a breach of parliamentary privilege.',
    oppositionPosition: 'This constitutes a prima facie breach of parliamentary privilege.',
  },
];

export default function SpeakerElectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, electSpeaker } = useGame();
  const { showAlert } = useAlert();

  const [phase, setPhase] = useState<'intro' | 'voting' | 'results' | 'ruling'>('intro');
  const [candidates, setCandidates] = useState<SpeakerCandidate[]>(
    CANDIDATE_POOL.map(c => ({ ...c, votes: [], eliminated: false }))
  );
  const [currentRound, setCurrentRound] = useState(1);
  const [playerRanking, setPlayerRanking] = useState<string[]>([]); // candidate IDs in preference order
  const [electedSpeaker, setElectedSpeaker] = useState<SpeakerCandidate | null>(null);
  const [rulings, setRulings] = useState<SpeakerRuling[]>([]);
  const [selectedRuling, setSelectedRuling] = useState<typeof POINTS_OF_ORDER[0] | null>(null);
  const [roundResults, setRoundResults] = useState<{ round: number; votes: Record<string, number>; eliminated?: string }[]>([]);
  const [animating, setAnimating] = useState(false);
  const ballotAnim = useRef(new Animated.Value(0)).current;

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const totalSeats = Object.values(gameState.seats).reduce((a, b) => a + b, 0);

  // Preferential ballot simulation
  const runElection = () => {
    const activeCandidates = candidates.filter(c => !c.eliminated);
    let round = 1;
    let roundData: typeof roundResults = [];
    let remaining = [...activeCandidates];
    let elected: SpeakerCandidate | null = null;

    // Simulate up to 6 rounds of preferential balloting
    while (remaining.length > 1 && round <= 6) {
      // Calculate votes for this round
      const roundVotes: Record<string, number> = {};
      remaining.forEach(c => { roundVotes[c.id] = 0; });

      remaining.forEach(c => {
        // Base votes from party strength, neutrality, experience
        const partySeats = gameState.seats[c.partyId] || 0;
        const partyBonus = (partySeats / totalSeats) * 0.4;
        const neutralityBonus = (c.neutralityScore / 100) * 0.35;
        const experienceBonus = Math.min(c.experience / 25, 1) * 0.25;
        // Cross-party appeal (Speakers are elected by secret ballot regardless of party)
        const crossPartyFactor = c.neutralityScore > 80 ? 0.15 : 0;
        const rawVotes = Math.round(totalSeats * (partyBonus + neutralityBonus + experienceBonus + crossPartyFactor + Math.random() * 0.1));
        roundVotes[c.id] = Math.max(1, rawVotes);
      });

      // Add player preference bonus
      if (playerRanking.length > 0) {
        const preferredId = playerRanking.find(id => roundVotes[id] !== undefined);
        if (preferredId && roundVotes[preferredId] !== undefined) {
          const loyaltySeats = gameState.seats[gameState.playerPartyId] || 0;
          roundVotes[preferredId] = (roundVotes[preferredId] || 0) + Math.floor(loyaltySeats * 0.7);
        }
      }

      // Normalize to total seats
      const totalVotes = Object.values(roundVotes).reduce((a, b) => a + b, 0);
      Object.keys(roundVotes).forEach(id => {
        roundVotes[id] = Math.round((roundVotes[id]! / totalVotes) * totalSeats);
      });

      const majority = Math.floor(totalSeats / 2) + 1;
      const maxVotes = Math.max(...Object.values(roundVotes));
      const winnerId = Object.keys(roundVotes).find(id => roundVotes[id] === maxVotes);

      if (maxVotes >= majority && winnerId) {
        elected = remaining.find(c => c.id === winnerId) || null;
        roundData.push({ round, votes: roundVotes });
        break;
      }

      // Eliminate lowest
      const minVotes = Math.min(...Object.values(roundVotes));
      const eliminatedId = Object.keys(roundVotes).find(id => roundVotes[id] === minVotes);
      roundData.push({ round, votes: roundVotes, eliminated: eliminatedId });
      remaining = remaining.filter(c => c.id !== eliminatedId);
      round++;
    }

    // If no majority after 6 rounds, winner is candidate with most votes
    if (!elected && remaining.length > 0) {
      const lastRound = roundData[roundData.length - 1];
      if (lastRound) {
        const maxV = Math.max(...Object.values(lastRound.votes));
        const winnerId = Object.keys(lastRound.votes).find(id => lastRound.votes[id] === maxV);
        elected = remaining.find(c => c.id === winnerId) || remaining[0] || null;
      } else {
        elected = remaining[0] || null;
      }
    }

    setRoundResults(roundData);
    setElectedSpeaker(elected);
    setCandidates(prev => prev.map(c => ({
      ...c,
      eliminated: roundData.some(r => r.eliminated === c.id),
      votes: roundData.map(r => r.votes[c.id] || 0),
    })));
    setCurrentRound(round);
    // Persist the elected speaker to game context
    if (elected) {
      electSpeaker?.(elected.name);
    }
    setPhase('results');
  };

  const togglePreference = (candidateId: string) => {
    setPlayerRanking(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      }
      return [...prev, candidateId];
    });
  };

  const makeRuling = (point: typeof POINTS_OF_ORDER[0], ruling: 'in_order' | 'out_of_order' | 'prima_facie') => {
    if (!electedSpeaker) return;
    const newRuling: SpeakerRuling = {
      id: `ruling_${Date.now()}`,
      type: point.type,
      motionTitle: point.title,
      ruling: ruling === 'in_order'
        ? `The Speaker finds the motion in order and rules it may proceed. "${point.governmentPosition}"`
        : ruling === 'prima_facie'
        ? `The Speaker finds a prima facie case has been made and the matter will be referred to the appropriate committee.`
        : `The Speaker rules the motion out of order. Members must direct their remarks to the question before the House.`,
      week: gameState.currentWeek,
      ruled: ruling,
    };
    setRulings(prev => [...prev, newRuling]);
    setSelectedRuling(null);

    showAlert(
      `Speaker's Ruling`,
      `${electedSpeaker.name} has ruled the ${point.title} ${ruling === 'prima_facie' ? 'has a prima facie case' : ruling.replace('_', ' ')}.\n\n${newRuling.ruling}`,
    );
  };

  const getPartyColor = (partyId: string) => {
    return PARTIES.find(p => p.id === partyId)?.color || Colors.textMuted;
  };

  const getPartyShortName = (partyId: string) => {
    return PARTIES.find(p => p.id === partyId)?.shortName || partyId.toUpperCase();
  };

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Speaker Election</Text>
            <Text style={styles.headerSub}>Opening of the {45 + gameState.parliamentNumber - 44}th Parliament</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Ceremony intro */}
          <View style={styles.ceremonyCard}>
            <MaterialCommunityIcons name="gavel" size={48} color={Colors.gold} />
            <Text style={styles.ceremonyTitle}>Election of the Speaker</Text>
            <Text style={styles.ceremonyDesc}>
              Before Parliament can conduct any business, the House of Commons must elect a Speaker. The Speaker presides over debates, maintains order, recognizes members, and makes rulings on points of order and privilege.{'\n\n'}The election uses a preferential ballot system. MPs vote in secret for their preferred candidates, and the candidate with the fewest first-preference votes is eliminated each round until one candidate achieves a majority.{'\n\n'}The Speaker is expected to be politically neutral and act as an impartial referee for all members.
            </Text>
          </View>

          {/* Rules */}
          <View style={styles.rulesCard}>
            <Text style={styles.rulesTitle}>SPEAKER'S DUTIES</Text>
            {[
              'Presides over House debates and maintains order',
              'Recognizes members who wish to speak',
              'Rules on points of order and privilege',
              'Decides admissibility of time allocation motions',
              'Manages debate time and recognizes emergency debates',
              'Represents the House in all official capacities',
            ].map((rule, idx) => (
              <View key={idx} style={styles.ruleItem}>
                <MaterialCommunityIcons name="check-circle-outline" size={13} color={Colors.gold} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => setPhase('voting')}
            style={({ pressed }) => [styles.beginBtn, { backgroundColor: Colors.gold }, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="vote" size={18} color="#fff" />
            <Text style={styles.beginBtnText}>Begin Speaker Election</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── VOTING ────────────────────────────────────────────────────────────────
  if (phase === 'voting') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setPhase('intro')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Cast Your Ballot</Text>
            <Text style={styles.headerSub}>Rank candidates in order of preference (tap to select)</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.ballotInfo}>
            <MaterialCommunityIcons name="ballot" size={14} color={Colors.info} />
            <Text style={styles.ballotInfoText}>
              This is a secret ballot. Tap candidates in your order of preference. Your vote will influence which candidates gain momentum. You may select 1-3 candidates.
            </Text>
          </View>

          {playerRanking.length > 0 ? (
            <View style={styles.rankingDisplay}>
              <Text style={styles.sectionLabel}>YOUR BALLOT</Text>
              {playerRanking.map((id, idx) => {
                const cand = candidates.find(c => c.id === id);
                if (!cand) return null;
                return (
                  <View key={id} style={styles.rankingItem}>
                    <View style={[styles.rankBadge, { backgroundColor: idx === 0 ? Colors.gold : idx === 1 ? Colors.textSecondary : Colors.textMuted }]}>
                      <Text style={styles.rankBadgeText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.rankingName}>{cand.name}</Text>
                    <Text style={[styles.rankingParty, { color: getPartyColor(cand.partyId) }]}>{getPartyShortName(cand.partyId)}</Text>
                    <Pressable onPress={() => togglePreference(id)} style={styles.removeBtn}>
                      <MaterialCommunityIcons name="close" size={14} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>CANDIDATES — {45 + gameState.parliamentNumber - 44}TH PARLIAMENT</Text>
          {candidates.map(cand => {
            const isSelected = playerRanking.includes(cand.id);
            const rankPosition = playerRanking.indexOf(cand.id) + 1;
            const candPartyColor = getPartyColor(cand.partyId);
            const candPartyShort = getPartyShortName(cand.partyId);

            return (
              <Pressable
                key={cand.id}
                onPress={() => playerRanking.length < 3 || isSelected ? togglePreference(cand.id) : showAlert('Ballot Full', 'You have already selected 3 candidates. Remove one to add another.')}
                style={({ pressed }) => [
                  styles.candidateCard,
                  isSelected && { borderColor: Colors.gold + '88', backgroundColor: Colors.gold + '0A' },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={[styles.candPartyBar, { backgroundColor: candPartyColor }]} />
                <View style={styles.candContent}>
                  <View style={styles.candHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.candName, isSelected && { color: Colors.gold }]}>{cand.name}</Text>
                      <Text style={styles.candMeta}>{candPartyShort} · {cand.region} · {cand.experience} yrs as MP</Text>
                    </View>
                    {isSelected ? (
                      <View style={[styles.rankBadge, { backgroundColor: rankPosition === 1 ? Colors.gold : Colors.textSecondary, width: 28, height: 28 }]}>
                        <Text style={styles.rankBadgeText}>{rankPosition}</Text>
                      </View>
                    ) : (
                      <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={20} color={Colors.textMuted} />
                    )}
                  </View>
                  <Text style={styles.candDesc}>{cand.description}</Text>
                  <View style={styles.candStats}>
                    <View style={styles.candStat}>
                      <Text style={styles.candStatLabel}>Neutrality</Text>
                      <View style={styles.candStatBar}>
                        <View style={[styles.candStatBarFill, { flex: cand.neutralityScore, backgroundColor: cand.neutralityScore > 80 ? Colors.success : cand.neutralityScore > 65 ? Colors.warning : Colors.error }]} />
                        <View style={{ flex: 100 - cand.neutralityScore }} />
                      </View>
                      <Text style={styles.candStatValue}>{cand.neutralityScore}%</Text>
                    </View>
                    <View style={styles.candStat}>
                      <Text style={styles.candStatLabel}>Experience</Text>
                      <View style={styles.candStatBar}>
                        <View style={[styles.candStatBarFill, { flex: Math.min(cand.experience, 25), backgroundColor: Colors.info }]} />
                        <View style={{ flex: 25 - Math.min(cand.experience, 25) }} />
                      </View>
                      <Text style={styles.candStatValue}>{cand.experience} yrs</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.voteFooter, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable
            onPress={runElection}
            style={({ pressed }) => [styles.voteBtn, { backgroundColor: Colors.gold }, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="vote" size={18} color="#fff" />
            <Text style={styles.voteBtnText}>Cast Ballot & Conduct Election</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── RESULTS ────────────────────────────────────────────────────────────────
  if (phase === 'results' && electedSpeaker) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <MaterialCommunityIcons name="gavel" size={16} color={Colors.gold} />
            <Text style={styles.headerTitle}>Speaker Elected</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Elected speaker */}
          <View style={styles.electedCard}>
            <MaterialCommunityIcons name="crown" size={40} color={Colors.gold} />
            <Text style={styles.electedLabel}>ELECTED SPEAKER</Text>
            <Text style={styles.electedName}>{electedSpeaker.name}</Text>
            <Text style={styles.electedDesc}>{electedSpeaker.description}</Text>
            <View style={styles.electedMeta}>
              <View style={[styles.electedPartyBadge, { backgroundColor: getPartyColor(electedSpeaker.partyId) + '22' }]}>
                <Text style={[styles.electedPartyText, { color: getPartyColor(electedSpeaker.partyId) }]}>
                  {getPartyShortName(electedSpeaker.partyId)}
                </Text>
              </View>
              <Text style={styles.electedRegion}>{electedSpeaker.region} · {electedSpeaker.experience} yrs experience</Text>
            </View>
          </View>

          {/* Round-by-round results */}
          <Text style={styles.sectionLabel}>PREFERENTIAL BALLOT RESULTS — {roundResults.length} ROUND{roundResults.length > 1 ? 'S' : ''}</Text>
          {roundResults.map(round => (
            <View key={round.round} style={styles.roundCard}>
              <View style={styles.roundHeader}>
                <Text style={styles.roundTitle}>Round {round.round}</Text>
                {round.eliminated ? (
                  <View style={styles.eliminatedBadge}>
                    <Text style={styles.eliminatedBadgeText}>
                      {candidates.find(c => c.id === round.eliminated)?.name} eliminated
                    </Text>
                  </View>
                ) : (
                  <View style={styles.electedBadge}>
                    <Text style={styles.electedBadgeText}>Speaker elected</Text>
                  </View>
                )}
              </View>
              {Object.entries(round.votes)
                .sort(([, a], [, b]) => b - a)
                .map(([id, votes]) => {
                  const cand = candidates.find(c => c.id === id);
                  if (!cand) return null;
                  const pct = Math.round((votes / Object.values(round.votes).reduce((a, b) => a + b, 0)) * 100);
                  const isElected = !round.eliminated && id === Object.keys(round.votes).reduce((a, b) => round.votes[a]! > round.votes[b]! ? a : b);
                  const isEliminated = round.eliminated === id;

                  return (
                    <View key={id} style={[styles.roundVoteRow, isEliminated && { opacity: 0.5 }]}>
                      <Text style={[styles.roundVoteName, isElected && { color: Colors.gold }]} numberOfLines={1}>{cand.name}</Text>
                      <View style={styles.roundVoteBar}>
                        <View style={[styles.roundVoteBarFill, { flex: pct, backgroundColor: isElected ? Colors.gold : isEliminated ? Colors.error : Colors.info }]} />
                        <View style={{ flex: Math.max(0, 100 - pct) }} />
                      </View>
                      <Text style={styles.roundVoteCount}>{votes}</Text>
                      {isEliminated ? <MaterialCommunityIcons name="close-circle" size={14} color={Colors.error} /> : null}
                      {isElected ? <MaterialCommunityIcons name="crown" size={14} color={Colors.gold} /> : null}
                    </View>
                  );
                })}
            </View>
          ))}

          {/* Speaker rulings */}
          <Pressable
            onPress={() => setPhase('ruling')}
            style={({ pressed }) => [styles.rulingBtn, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="gavel" size={16} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rulingBtnTitle}>Speaker's Rulings</Text>
              <Text style={styles.rulingBtnDesc}>Present points of order and privilege for Speaker {electedSpeaker.name.split(' ')[1]} to rule on</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
          </Pressable>

          {rulings.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>PAST RULINGS</Text>
              {rulings.map(ruling => (
                <View key={ruling.id} style={[styles.rulingCard, {
                  borderColor: ruling.ruled === 'in_order' ? Colors.success + '44' : ruling.ruled === 'prima_facie' ? Colors.warning + '44' : Colors.error + '44',
                }]}>
                  <View style={styles.rulingCardHeader}>
                    <MaterialCommunityIcons
                      name={ruling.ruled === 'in_order' ? 'check-circle' : ruling.ruled === 'prima_facie' ? 'alert-circle' : 'close-circle'}
                      size={14}
                      color={ruling.ruled === 'in_order' ? Colors.success : ruling.ruled === 'prima_facie' ? Colors.warning : Colors.error}
                    />
                    <Text style={[styles.rulingCardStatus, { color: ruling.ruled === 'in_order' ? Colors.success : ruling.ruled === 'prima_facie' ? Colors.warning : Colors.error }]}>
                      {ruling.ruled === 'prima_facie' ? 'PRIMA FACIE' : ruling.ruled.replace('_', ' ').toUpperCase()}
                    </Text>
                    <Text style={styles.rulingCardWeek}>Week {ruling.week}</Text>
                  </View>
                  <Text style={styles.rulingCardTitle}>{ruling.motionTitle}</Text>
                  <Text style={styles.rulingCardText}>{ruling.ruling}</Text>
                </View>
              ))}
            </>
          ) : null}

          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={({ pressed }) => [styles.continueBtn, { backgroundColor: Colors.gold }, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="home" size={16} color="#fff" />
            <Text style={styles.continueBtnText}>Parliament Is Now In Session</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── RULINGS ────────────────────────────────────────────────────────────────
  if (phase === 'ruling' && electedSpeaker) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setPhase('results')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Speaker's Rulings</Text>
            <Text style={styles.headerSub}>The Speaker: {electedSpeaker.name}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.speakerChairCard}>
            <MaterialCommunityIcons name="gavel" size={18} color={Colors.gold} />
            <Text style={styles.speakerChairText}>
              {electedSpeaker.name} is in the Chair. The Speaker rules on matters of procedure, order, and privilege. Their decisions are final and cannot be appealed.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>POINTS OF ORDER & PRIVILEGE</Text>
          {POINTS_OF_ORDER.map((point, idx) => {
            const alreadyRuled = rulings.some(r => r.motionTitle === point.title);
            return (
              <View key={idx} style={[styles.pointCard, alreadyRuled && { opacity: 0.6 }]}>
                <View style={styles.pointCardHeader}>
                  <MaterialCommunityIcons
                    name={point.type === 'privilege' ? 'shield-alert' : point.type === 'emergency_debate' ? 'chat-alert' : 'gavel'}
                    size={16}
                    color={Colors.gold}
                  />
                  <Text style={styles.pointTitle}>{point.title}</Text>
                  {alreadyRuled ? (
                    <View style={styles.ruledBadge}>
                      <Text style={styles.ruledBadgeText}>RULED</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.pointDesc}>{point.description}</Text>

                <View style={styles.positionsRow}>
                  <View style={[styles.positionCard, { borderColor: Colors.liberal + '44', backgroundColor: Colors.liberal + '06' }]}>
                    <Text style={[styles.positionTitle, { color: Colors.liberal }]}>Government</Text>
                    <Text style={styles.positionText}>{point.governmentPosition}</Text>
                  </View>
                  <View style={[styles.positionCard, { borderColor: Colors.conservative + '44', backgroundColor: Colors.conservative + '06' }]}>
                    <Text style={[styles.positionTitle, { color: Colors.conservative }]}>Opposition</Text>
                    <Text style={styles.positionText}>{point.oppositionPosition}</Text>
                  </View>
                </View>

                {!alreadyRuled ? (
                  <View style={styles.rulingOptions}>
                    <Text style={styles.rulingOptionsLabel}>SPEAKER'S RULING:</Text>
                    <View style={styles.rulingBtns}>
                      <Pressable
                        onPress={() => makeRuling(point, 'in_order')}
                        style={({ pressed }) => [styles.rulingOptionBtn, { borderColor: Colors.success + '55', backgroundColor: Colors.success + '11' }, pressed && { opacity: 0.8 }]}
                      >
                        <MaterialCommunityIcons name="check-circle" size={14} color={Colors.success} />
                        <Text style={[styles.rulingOptionText, { color: Colors.success }]}>In Order</Text>
                      </Pressable>
                      {point.type === 'privilege' || point.type === 'emergency_debate' ? (
                        <Pressable
                          onPress={() => makeRuling(point, 'prima_facie')}
                          style={({ pressed }) => [styles.rulingOptionBtn, { borderColor: Colors.warning + '55', backgroundColor: Colors.warning + '11' }, pressed && { opacity: 0.8 }]}
                        >
                          <MaterialCommunityIcons name="alert-circle" size={14} color={Colors.warning} />
                          <Text style={[styles.rulingOptionText, { color: Colors.warning }]}>Prima Facie</Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        onPress={() => makeRuling(point, 'out_of_order')}
                        style={({ pressed }) => [styles.rulingOptionBtn, { borderColor: Colors.error + '55', backgroundColor: Colors.error + '11' }, pressed && { opacity: 0.8 }]}
                      >
                        <MaterialCommunityIcons name="close-circle" size={14} color={Colors.error} />
                        <Text style={[styles.rulingOptionText, { color: Colors.error }]}>Out of Order</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  // Intro
  ceremonyCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.gold + '44', padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  ceremonyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.gold },
  ceremonyDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 24, textAlign: 'center' },
  rulesCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  rulesTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  ruleItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  ruleText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  beginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  beginBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  // Voting
  ballotInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.info + '0D', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.info + '22' },
  ballotInfoText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 18 },
  rankingDisplay: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '44', padding: Spacing.md, gap: 8 },
  rankingItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rankBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, color: '#fff' },
  rankingName: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  rankingParty: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  removeBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  candidateCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: 'hidden', flexDirection: 'row' },
  candPartyBar: { width: 4, alignSelf: 'stretch' },
  candContent: { flex: 1, padding: Spacing.md, gap: 6 },
  candHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  candName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  candMeta: { fontSize: FontSize.xs, color: Colors.textMuted },
  candDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  candStats: { gap: 6 },
  candStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  candStatLabel: { fontSize: FontSize.xs, color: Colors.textMuted, width: 65 },
  candStatBar: { flex: 1, flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: Colors.surfaceBorder },
  candStatBarFill: { borderRadius: 3 },
  candStatValue: { fontSize: FontSize.xs, color: Colors.textSecondary, width: 40, textAlign: 'right' },
  voteFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.md, paddingTop: 8, backgroundColor: Colors.background },
  voteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.sm + 2, borderRadius: Radius.md, marginBottom: 4 },
  voteBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  // Results
  electedCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, borderWidth: 2, borderColor: Colors.gold + '66', padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  electedLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, color: Colors.textMuted, letterSpacing: 2 },
  electedName: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.gold },
  electedDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  electedMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  electedPartyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  electedPartyText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  electedRegion: { fontSize: FontSize.xs, color: Colors.textMuted },
  roundCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  roundHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  eliminatedBadge: { backgroundColor: Colors.error + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  eliminatedBadgeText: { fontSize: FontSize.xs, color: Colors.error, fontWeight: FontWeight.medium },
  electedBadge: { backgroundColor: Colors.gold + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  electedBadgeText: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: FontWeight.bold },
  roundVoteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundVoteName: { fontSize: FontSize.xs, color: Colors.textSecondary, width: 100 },
  roundVoteBar: { flex: 1, flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: Colors.surfaceBorder },
  roundVoteBarFill: { borderRadius: 3 },
  roundVoteCount: { fontSize: FontSize.xs, color: Colors.textMuted, width: 35, textAlign: 'right' },
  rulingBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '44', padding: Spacing.md, gap: 10 },
  rulingBtnTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  rulingBtnDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  rulingCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 6 },
  rulingCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rulingCardStatus: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, letterSpacing: 0.5, flex: 1 },
  rulingCardWeek: { fontSize: FontSize.xs, color: Colors.textMuted },
  rulingCardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  rulingCardText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  continueBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  // Rulings
  speakerChairCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.gold + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.md },
  speakerChairText: { flex: 1, fontSize: FontSize.xs, color: Colors.gold, lineHeight: 18 },
  pointCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 10 },
  pointCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pointTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  ruledBadge: { backgroundColor: Colors.success + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  ruledBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.success },
  pointDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  positionsRow: { flexDirection: 'row', gap: Spacing.sm },
  positionCard: { flex: 1, borderRadius: Radius.sm, borderWidth: 1, padding: Spacing.sm, gap: 4 },
  positionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  positionText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  rulingOptions: { gap: 6 },
  rulingOptionsLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  rulingBtns: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  rulingOptionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: Radius.sm, borderWidth: 1, minWidth: 90 },
  rulingOptionText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});
