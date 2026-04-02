// Powered by OnSpace.AI
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
import { MAJORITY_SEATS } from '@/constants/provinces';

type DealType = 'no_confidence' | 'bill_support' | 'supply_confidence' | 'coalition';

interface ProposedDeal {
  rivalPartyId: string;
  dealType: DealType;
  terms: string;
  offeredSeats?: number;
  offeredConcession?: string;
}

interface DealResponse {
  accepted: boolean;
  response: string;
  conditions: string[];
  chanceOfSuccess: number;
}

function getDealTypeLabel(t: DealType): string {
  return {
    no_confidence: 'No-Confidence Vote Agreement',
    bill_support: 'Bill Passage Support',
    supply_confidence: 'Supply & Confidence Agreement',
    coalition: 'Coalition Proposal',
  }[t];
}

function getDealTypeDescription(t: DealType): string {
  return {
    no_confidence: 'Negotiate for another opposition party to vote with you on a no-confidence motion, triggering an election.',
    bill_support: 'Negotiate for an opposition party to support a specific piece of legislation in exchange for concessions.',
    supply_confidence: 'Offer to support the government\'s budget and maintain confidence in exchange for policy commitments.',
    coalition: 'Propose a formal coalition partnership with cabinet positions and a shared policy agenda.',
  }[t];
}

function simulateLeaderResponse(
  playerPartyId: string,
  rivalPartyId: string,
  dealType: DealType,
  terms: string,
  playerSeats: number,
  rivalSeats: number,
  govSeats: number,
  playerApproval: number
): DealResponse {
  const player = PARTIES.find(p => p.id === playerPartyId);
  const rival = PARTIES.find(p => p.id === rivalPartyId);

  // Ideological compatibility
  const ideologicalDistance: Record<string, Record<string, number>> = {
    liberal: { conservative: 60, ndp: 25, bloc: 45, green: 30, ppc: 85 },
    conservative: { liberal: 60, ndp: 75, bloc: 50, green: 80, ppc: 35 },
    ndp: { liberal: 25, conservative: 75, bloc: 40, green: 20, ppc: 90 },
    bloc: { liberal: 45, conservative: 50, ndp: 40, green: 55, ppc: 70 },
    green: { liberal: 30, conservative: 80, ndp: 20, bloc: 55, ppc: 95 },
    ppc: { liberal: 85, conservative: 35, ndp: 90, bloc: 70, green: 95 },
  };

  const distance = (ideologicalDistance[playerPartyId]?.[rivalPartyId] ?? 50) / 100;
  const detailBonus = terms.split(' ').filter(Boolean).length > 20 ? 0.1 : 0;
  const approvalFactor = playerApproval / 100 * 0.2;
  const seatsFactor = (playerSeats / 172) * 0.15;

  let baseChance = 0.5 - distance * 0.4 + detailBonus + approvalFactor + seatsFactor;

  if (dealType === 'no_confidence') {
    baseChance -= 0.15; // Harder to get no-confidence support
  } else if (dealType === 'coalition') {
    baseChance -= 0.10; // Coalitions are hard
  } else if (dealType === 'bill_support') {
    baseChance += 0.05;
  }

  const chanceOfSuccess = Math.max(5, Math.min(90, Math.round(baseChance * 100)));
  const accepted = Math.random() * 100 < chanceOfSuccess;

  const acceptResponses: Record<DealType, string[]> = {
    no_confidence: [
      `After careful deliberation within our caucus, the ${rival?.shortName} is prepared to support a non-confidence motion under the terms you have outlined. Our members believe the current government has lost the moral authority to govern.`,
      `You have my commitment. We will vote with you when the time comes. The government has failed Canadians and this Parliament must hold them accountable.`,
    ],
    bill_support: [
      `We are willing to support this legislation provided the concessions you have outlined are embedded in the final text. Our caucus has reviewed the terms and finds them acceptable.`,
      `The ${rival?.shortName} will vote in favour. We have reviewed the terms and believe this represents a reasonable compromise that advances shared goals.`,
    ],
    supply_confidence: [
      `A supply-and-confidence agreement is something we would consider. The terms you have proposed are a reasonable starting point for formal negotiations.`,
      `We are prepared to support the government on budget and confidence matters in exchange for the commitments outlined. Let's move to a formal written agreement.`,
    ],
    coalition: [
      `A coalition is a serious proposition. After internal consultation, our caucus is open to exploring a formal arrangement. We would want to begin formal negotiations immediately.`,
      `The ${rival?.shortName} would be willing to enter coalition talks on the basis you have described. We have conditions of our own which must be addressed in negotiations.`,
    ],
  };

  const declineResponses: Record<DealType, string[]> = {
    no_confidence: [
      `I appreciate the approach, but the ${rival?.shortName} will not be supporting a non-confidence motion at this time. The political risk to our own party is too high.`,
      `Our caucus reviewed this proposal carefully. We are not prepared to bring down the government on these terms. Perhaps we can discuss alternatives.`,
    ],
    bill_support: [
      `We cannot support this legislation under these conditions. The terms do not go far enough on the issues that matter most to our voters.`,
      `I am afraid the ${rival?.shortName} will have to oppose this. The concessions on offer do not adequately address our core priorities.`,
    ],
    supply_confidence: [
      `A supply-and-confidence arrangement is not something we can agree to at this time. The terms as presented do not serve our voters' interests.`,
      `We have reviewed the terms carefully and cannot accept. The policy commitments offered fall well short of what our members would require.`,
    ],
    coalition: [
      `A formal coalition is not something the ${rival?.shortName} can support at this moment. The ideological gaps between our parties are too significant.`,
      `While we appreciate the offer, our caucus does not believe a coalition would serve either of our parties or Canadian voters well at this time.`,
    ],
  };

  const responsePool = accepted ? acceptResponses[dealType] : declineResponses[dealType];
  const response = responsePool[Math.floor(Math.random() * responsePool.length)];

  const conditions = accepted ? [
    dealType === 'no_confidence' ? 'Motion must be tabled within 2 parliamentary weeks' : '',
    dealType === 'bill_support' ? 'Concessions must be in final bill text, not amendments' : '',
    dealType === 'coalition' ? `Minimum ${Math.floor(rivalSeats * 0.3)} cabinet positions for ${rival?.shortName} MPs` : '',
    dealType === 'supply_confidence' ? 'Written agreement signed by both House leaders before budget vote' : '',
    'Full caucus ratification required before any public announcement',
    terms.length > 50 ? 'All terms as discussed must be honoured without modification' : '',
  ].filter(Boolean) : [];

  return { accepted, response, conditions, chanceOfSuccess };
}

export default function PartyLeaderContactScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, makePartyDeal } = useGame();
  const { showAlert } = useAlert();

  const [selectedLeader, setSelectedLeader] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<DealType>('no_confidence');
  const [terms, setTerms] = useState('');
  const [dealResponse, setDealResponse] = useState<DealResponse | null>(null);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [dealHistory, setDealHistory] = useState<Array<{ partyId: string; dealType: DealType; accepted: boolean; week: number }>>([]);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;

  // Get other party leaders that are in parliament
  const otherParties = PARTIES.filter(p =>
    p.id !== gameState.playerPartyId &&
    (gameState.seats[p.id] || 0) > 0
  );

  const playerSeats = gameState.seats[gameState.playerPartyId] || 0;
  const govSeats = Math.max(...Object.values(gameState.seats));
  const isMinorityGov = govSeats < MAJORITY_SEATS;

  const selectedParty = PARTIES.find(p => p.id === selectedLeader);
  const selectedRival = gameState.rivals.find(r => r.partyId === selectedLeader);

  const DEAL_TYPES: DealType[] = ['no_confidence', 'bill_support', 'supply_confidence', 'coalition'];

  const handleNegotiate = () => {
    if (!selectedLeader || !terms.trim()) return;
    setIsNegotiating(true);
    const rivalSeats = gameState.seats[selectedLeader] || 0;

    setTimeout(() => {
      const response = simulateLeaderResponse(
        gameState.playerPartyId,
        selectedLeader,
        selectedDeal,
        terms,
        playerSeats,
        rivalSeats,
        govSeats,
        gameState.stats.approvalRating
      );
      setDealResponse(response);
      setIsNegotiating(false);

      if (response.accepted) {
        setDealHistory(prev => [...prev, { partyId: selectedLeader, dealType: selectedDeal, accepted: true, week: gameState.currentWeek }]);
        makePartyDeal?.(selectedLeader, selectedDeal, response.accepted);
        if (selectedDeal === 'no_confidence') {
          showAlert(
            'Deal Struck! No-Confidence Agreement',
            `${selectedParty?.name} has agreed to vote with you on a non-confidence motion. This will trigger an election if the motion passes. You have 2 weeks to table the motion.`,
            [
              { text: 'Excellent', style: 'default' },
            ]
          );
        }
      }
    }, 1200);
  };

  const getRivalLeaderName = (partyId: string): string => {
    const rival = gameState.rivals.find(r => r.partyId === partyId);
    if (rival) return rival.name.split(' (')[0];
    const names: Record<string, string> = {
      liberal: 'Alex Moreau', conservative: 'Pierre Fontaine', ndp: 'Rachel Lavoie',
      bloc: 'Marc Tremblay', green: 'Lisa Chen', ppc: 'Derek Sloan',
    };
    return names[partyId] || `${PARTIES.find(p => p.id === partyId)?.name} Leader`;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Party Leader Contacts</Text>
          <Text style={styles.headerSub}>Negotiate cross-party deals</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Context banner */}
        <View style={[styles.contextCard, { borderColor: partyColor + '44', backgroundColor: partyColor + '0D' }]}>
          <MaterialCommunityIcons name="handshake" size={20} color={partyColor} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.contextTitle, { color: partyColor }]}>Parliamentary Diplomacy</Text>
            <Text style={styles.contextSub}>
              {gameState.isGoverning
                ? 'As Prime Minister you can negotiate with opposition parties for bill support, supply-and-confidence agreements, or coalition arrangements.'
                : 'As Leader of the Opposition you can negotiate no-confidence agreements, bill support pacts, or supply-and-confidence deals with other parties.'}
            </Text>
          </View>
        </View>

        {/* Parliament standing */}
        <View style={styles.standingCard}>
          <Text style={styles.sectionLabel}>HOUSE OF COMMONS STANDING</Text>
          <View style={styles.standingRow}>
            <View style={styles.standingItem}>
              <Text style={[styles.standingNum, { color: partyColor }]}>{playerSeats}</Text>
              <Text style={styles.standingLabel}>Your seats</Text>
            </View>
            <View style={styles.standingItem}>
              <Text style={[styles.standingNum, { color: Colors.warning }]}>{MAJORITY_SEATS}</Text>
              <Text style={styles.standingLabel}>For majority</Text>
            </View>
            <View style={styles.standingItem}>
              <Text style={[styles.standingNum, { color: isMinorityGov ? Colors.warning : Colors.error }]}>
                {isMinorityGov ? 'MINORITY' : 'MAJORITY'}
              </Text>
              <Text style={styles.standingLabel}>Parliament type</Text>
            </View>
          </View>
          {isMinorityGov ? (
            <View style={styles.standingAlert}>
              <MaterialCommunityIcons name="information" size={12} color={Colors.info} />
              <Text style={styles.standingAlertText}>
                A minority parliament makes opposition deals more powerful — no single party controls votes.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Leader selection */}
        <View>
          <Text style={styles.sectionLabel}>SELECT A PARTY LEADER TO CONTACT</Text>
          {otherParties.map(p => {
            const leaderName = getRivalLeaderName(p.id);
            const seats = gameState.seats[p.id] || 0;
            const isSelected = selectedLeader === p.id;
            const alreadyDealt = dealHistory.some(d => d.partyId === p.id && d.accepted);
            const rival = gameState.rivals.find(r => r.partyId === p.id);

            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  setSelectedLeader(p.id);
                  setDealResponse(null);
                  setTerms('');
                }}
                style={({ pressed }) => [
                  styles.leaderCard,
                  isSelected && [styles.leaderCardSelected, { borderColor: p.color }],
                  pressed && { opacity: 0.9 },
                ]}
              >
                <View style={[styles.leaderAvatar, { backgroundColor: p.color + '22' }]}>
                  <MaterialCommunityIcons name="account-tie" size={22} color={p.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.leaderName, isSelected && { color: p.color }]}>{leaderName}</Text>
                  <Text style={styles.leaderParty}>{p.name}</Text>
                  <Text style={styles.leaderIdeology}>{p.ideology}</Text>
                </View>
                <View style={styles.leaderRight}>
                  <Text style={[styles.leaderSeats, { color: p.color }]}>{seats}</Text>
                  <Text style={styles.leaderSeatsLabel}>seats</Text>
                  {rival ? (
                    <Text style={styles.leaderApproval}>{Math.round(rival.approval)}% approval</Text>
                  ) : null}
                </View>
                {alreadyDealt ? (
                  <View style={styles.dealBadge}>
                    <MaterialCommunityIcons name="handshake" size={10} color={Colors.success} />
                    <Text style={styles.dealBadgeText}>DEAL</Text>
                  </View>
                ) : null}
                {isSelected ? (
                  <MaterialCommunityIcons name="check-circle" size={18} color={p.color} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Deal type selection */}
        {selectedLeader ? (
          <View>
            <Text style={styles.sectionLabel}>DEAL TYPE</Text>
            {DEAL_TYPES.filter(dt =>
              gameState.isGoverning ? dt !== 'no_confidence' : true
            ).map(dt => (
              <Pressable
                key={dt}
                onPress={() => { setSelectedDeal(dt); setDealResponse(null); }}
                style={({ pressed }) => [
                  styles.dealTypeCard,
                  selectedDeal === dt && [styles.dealTypeCardSelected, { borderColor: partyColor }],
                  pressed && { opacity: 0.85 },
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    dt === 'no_confidence' ? 'vote' :
                    dt === 'bill_support' ? 'gavel' :
                    dt === 'supply_confidence' ? 'shield-check' :
                    'handshake'
                  }
                  size={18}
                  color={selectedDeal === dt ? partyColor : Colors.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dealTypeLabel, selectedDeal === dt && { color: partyColor }]}>
                    {getDealTypeLabel(dt)}
                  </Text>
                  <Text style={styles.dealTypeDesc}>{getDealTypeDescription(dt)}</Text>
                </View>
                {selectedDeal === dt ? (
                  <MaterialCommunityIcons name="check-circle" size={16} color={partyColor} />
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Terms input */}
        {selectedLeader ? (
          <View>
            <Text style={styles.sectionLabel}>
              YOUR PROPOSAL TO {selectedParty?.shortName} — {getRivalLeaderName(selectedLeader)}
            </Text>
            <TextInput
              style={styles.termsInput}
              multiline
              numberOfLines={6}
              placeholder={
                selectedDeal === 'no_confidence'
                  ? 'Outline your proposal for a no-confidence motion. Include: timing, triggering event, what you offer in exchange (e.g., shared platform planks, cabinet positions in future government, policy concessions). Be specific — vague proposals get rejected.'
                  : selectedDeal === 'bill_support'
                  ? 'Which bill? What amendments or concessions are you offering in exchange for their votes? Include specific policy changes, dollar commitments, or regulatory concessions.'
                  : selectedDeal === 'coalition'
                  ? 'Detail the coalition structure: how many cabinet seats, which portfolios, what shared policy agenda, how long the arrangement would last, and what triggers dissolution.'
                  : 'Outline your supply-and-confidence proposal. Include: budget support duration, policy commitments in return, regular review mechanism, and exit conditions.'
              }
              placeholderTextColor={Colors.textMuted}
              value={terms}
              onChangeText={setTerms}
              textAlignVertical="top"
            />
            <Text style={styles.termsWordCount}>{terms.trim().split(/\s+/).filter(Boolean).length} words — more detail increases acceptance odds</Text>
          </View>
        ) : null}

        {/* Negotiate button */}
        {selectedLeader && terms.trim() ? (
          <Pressable
            onPress={handleNegotiate}
            disabled={isNegotiating}
            style={({ pressed }) => [
              styles.negotiateBtn,
              { backgroundColor: selectedParty?.color || partyColor },
              isNegotiating && { opacity: 0.6 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <MaterialCommunityIcons name="handshake" size={20} color="#fff" />
            <Text style={styles.negotiateBtnText}>
              {isNegotiating ? 'Awaiting Response...' : `Contact ${getRivalLeaderName(selectedLeader)}`}
            </Text>
          </Pressable>
        ) : null}

        {/* Response */}
        {dealResponse ? (
          <View style={[styles.responseCard, {
            borderColor: dealResponse.accepted ? Colors.success + '55' : Colors.error + '55',
            backgroundColor: dealResponse.accepted ? Colors.success + '08' : Colors.error + '08',
          }]}>
            {/* Leader response */}
            <View style={styles.responseHeader}>
              <View style={[styles.responseAvatar, { backgroundColor: (selectedParty?.color || Colors.gold) + '22' }]}>
                <MaterialCommunityIcons name="account-tie" size={18} color={selectedParty?.color || Colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.responseName, { color: selectedParty?.color || Colors.gold }]}>
                  {getRivalLeaderName(selectedLeader!)}
                </Text>
                <Text style={styles.responseParty}>{selectedParty?.name}</Text>
              </View>
              <View style={[styles.responseVerdict, {
                backgroundColor: dealResponse.accepted ? Colors.success + '22' : Colors.error + '22',
              }]}>
                <MaterialCommunityIcons
                  name={dealResponse.accepted ? 'check-circle' : 'close-circle'}
                  size={14}
                  color={dealResponse.accepted ? Colors.success : Colors.error}
                />
                <Text style={[styles.responseVerdictText, { color: dealResponse.accepted ? Colors.success : Colors.error }]}>
                  {dealResponse.accepted ? 'ACCEPTED' : 'DECLINED'}
                </Text>
              </View>
            </View>

            {/* Quote */}
            <View style={[styles.responseQuote, { borderLeftColor: selectedParty?.color || Colors.gold }]}>
              <Text style={styles.responseQuoteText}>"{dealResponse.response}"</Text>
            </View>

            {/* Conditions */}
            {dealResponse.conditions.length > 0 ? (
              <View style={styles.conditionsSection}>
                <Text style={styles.conditionsLabel}>CONDITIONS ATTACHED</Text>
                {dealResponse.conditions.map((c, i) => (
                  <View key={i} style={styles.conditionRow}>
                    <MaterialCommunityIcons name="check" size={12} color={Colors.warning} />
                    <Text style={styles.conditionText}>{c}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Chance info */}
            <View style={styles.chanceRow}>
              <MaterialCommunityIcons name="poll" size={12} color={Colors.textMuted} />
              <Text style={styles.chanceText}>
                Deal acceptance probability was {dealResponse.chanceOfSuccess}% based on ideological compatibility, your approval ({Math.round(gameState.stats.approvalRating)}%), and proposal detail.
              </Text>
            </View>

            {/* Actions after response */}
            {dealResponse.accepted && selectedDeal === 'no_confidence' ? (
              <View style={styles.dealActionCard}>
                <MaterialCommunityIcons name="information" size={14} color={Colors.info} />
                <Text style={styles.dealActionText}>
                  You have 2 parliamentary weeks to table a non-confidence motion. Return to the Dashboard and use the Confidence Vote action to trigger it.
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => { setDealResponse(null); setTerms(''); setSelectedLeader(null); }}
              style={({ pressed }) => [styles.tryAgainBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.tryAgainBtnText}>
                {dealResponse.accepted ? 'Close & Return' : 'Try Different Terms'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Deal history */}
        {dealHistory.length > 0 ? (
          <View style={styles.historyCard}>
            <Text style={styles.sectionLabel}>DEAL HISTORY THIS PARLIAMENT</Text>
            {dealHistory.map((d, i) => {
              const p = PARTIES.find(x => x.id === d.partyId);
              return (
                <View key={i} style={styles.historyRow}>
                  <View style={[styles.historyDot, { backgroundColor: p?.color || Colors.textMuted }]} />
                  <Text style={styles.historyParty}>{p?.shortName}</Text>
                  <Text style={styles.historyDeal}>{getDealTypeLabel(d.dealType)}</Text>
                  <View style={[styles.historyBadge, { backgroundColor: Colors.success + '22' }]}>
                    <Text style={[styles.historyBadgeText, { color: Colors.success }]}>AGREED</Text>
                  </View>
                  <Text style={styles.historyWeek}>Wk {d.week}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 6 },

  contextCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  contextTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: 3 },
  contextSub: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  standingCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  standingRow: { flexDirection: 'row' },
  standingItem: { flex: 1, alignItems: 'center', gap: 3 },
  standingNum: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  standingLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
  standingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.info + '11',
    borderRadius: Radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.info + '22',
  },
  standingAlertText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 16 },

  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    marginBottom: 8,
  },
  leaderCardSelected: { borderWidth: 2 },
  leaderAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  leaderParty: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  leaderIdeology: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  leaderRight: { alignItems: 'center', gap: 2 },
  leaderSeats: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  leaderSeatsLabel: { fontSize: 9, color: Colors.textMuted },
  leaderApproval: { fontSize: 9, color: Colors.textMuted },
  dealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.success + '22',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.full,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  dealBadgeText: { fontSize: 8, fontWeight: FontWeight.extrabold, color: Colors.success },

  dealTypeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    marginBottom: 8,
  },
  dealTypeCardSelected: { borderWidth: 2 },
  dealTypeLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: 3 },
  dealTypeDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },

  termsInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 150,
    lineHeight: 22,
  },
  termsWordCount: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },

  negotiateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  negotiateBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },

  responseCard: {
    borderRadius: Radius.lg,
    borderWidth: 2,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  responseHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  responseAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  responseParty: { fontSize: FontSize.xs, color: Colors.textSecondary },
  responseVerdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  responseVerdictText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },

  responseQuote: {
    borderLeftWidth: 4,
    paddingLeft: Spacing.sm,
    paddingVertical: 4,
  },
  responseQuoteText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22, fontStyle: 'italic' },

  conditionsSection: { gap: 6 },
  conditionsLabel: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  conditionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  conditionText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },

  chanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  chanceText: { flex: 1, fontSize: 10, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 15 },

  dealActionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.info + '11',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.info + '22',
  },
  dealActionText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 18 },

  tryAgainBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tryAgainBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },

  historyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: 8,
  },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyParty: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textSecondary, width: 32 },
  historyDeal: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  historyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  historyBadgeText: { fontSize: 9, fontWeight: FontWeight.bold },
  historyWeek: { fontSize: 10, color: Colors.textMuted, width: 32, textAlign: 'right' },
});
