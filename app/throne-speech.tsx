// Powered by OnSpace.AI — Speech from the Throne (real Canadian procedure)
// Opens every new Parliament or session. GG reads PM-written agenda. House debates it.
// Confidence vote on Address in Reply (6 days of debate). Defeat = election.
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

type SpeechPhase = 'ceremony' | 'writing' | 'reading' | 'address_reply' | 'confidence_vote' | 'result';

interface PolicyPriority {
  id: string;
  area: string;
  commitment: string;
  icon: string;
}

const POLICY_AREAS = [
  { area: 'Economy & Fiscal Policy', icon: 'chart-line', placeholder: 'e.g., Reduce deficit by 50% within two years through targeted spending reviews...' },
  { area: 'Healthcare', icon: 'hospital', placeholder: 'e.g., Eliminate ER wait times through $25B provincial health transfer increase...' },
  { area: 'Housing Affordability', icon: 'home-city', placeholder: 'e.g., Build 500,000 new housing units by reforming zoning regulations...' },
  { area: 'Climate & Environment', icon: 'leaf', placeholder: 'e.g., Achieve net-zero by 2050 through a strengthened carbon pricing framework...' },
  { area: 'National Security & Defence', icon: 'shield', placeholder: 'e.g., Meet NATO 2% GDP spending commitment and modernize NORAD...' },
  { area: 'Indigenous Reconciliation', icon: 'hand-heart', placeholder: 'e.g., Implement all 94 Truth and Reconciliation Commission calls to action...' },
  { area: 'Immigration & Integration', icon: 'account-group', placeholder: 'e.g., Reform the immigration system to prioritize skills and community integration...' },
  { area: 'Innovation & Technology', icon: 'rocket', placeholder: 'e.g., Invest $10B in the Strategic Innovation Fund to accelerate Canadian AI leadership...' },
];

const OPPOSITION_AMENDMENTS = [
  'The government has failed to address the cost-of-living crisis facing Canadian families',
  'The Speech contains no credible plan to build the housing Canadians desperately need',
  'The government has broken its fiscal commitments and left Canada with unsustainable debt',
  'The throne speech is silent on the healthcare system\'s critical need for structural reform',
  'The government\'s climate commitments are vague and lack enforceable timelines',
  'The Speech fails to acknowledge the severity of the crime and public safety crisis in Canadian cities',
];

export default function ThroneSpeechScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, issuePressStatement, executeForeignPolicy, dissolveParliament } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [phase, setPhase] = useState<SpeechPhase>('ceremony');
  const [priorities, setPriorities] = useState<PolicyPriority[]>([]);
  const [speechDraft, setSpeechDraft] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  const [areaCommitments, setAreaCommitments] = useState<Record<string, string>>({});
  const [addressReplyDebate, setAddressReplyDebate] = useState(0); // days 1-6
  const [oppositionAmendment, setOppositionAmendment] = useState('');
  const [playerResponse, setPlayerResponse] = useState('');
  const [governmentSurvived, setGovernmentSurvived] = useState<boolean | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ggScroll = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [phase]);

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const isGoverning = gameState.isGoverning;

  const generateAISpeech = async () => {
    setGeneratingAI(true);
    const selected = Array.from(selectedAreas);
    const commitments = selected.map(a => `${a}: ${areaCommitments[a] || 'Government priority'}`).join('; ');
    try {
      const { data } = await supabase.functions.invoke('ai-question-period', {
        body: {
          partyName: party?.name, leaderName: gameState.playerName, isGoverning: true,
          stats: gameState.stats, currentEvents: [], rivals: [], weekNumber: gameState.currentWeek,
          parliamentNumber: gameState.parliamentNumber, recentNewsHeadlines: [],
          context: `Generate a formal Speech from the Throne for the ${gameState.parliamentNumber}th Parliament of Canada. The government is led by ${party?.name}. Policy priorities: ${commitments}. Write it in the style of an actual Canadian Speech from the Throne read by the Governor General — formal, aspirational, referencing "My Government" throughout. 3-4 paragraphs. Start with "Members of the Senate, Members of the House of Commons:" and end with "Members of the Senate and of the House of Commons, I pray that Divine Providence may guide you in your deliberations."`,
        },
      });
      if (data?.questions?.[0]?.question) setSpeechDraft(data.questions[0].question);
    } catch {}
    setGeneratingAI(false);
  };

  const handleCeremonyProceed = () => {
    if (isGoverning) {
      setPhase('writing');
    } else {
      setPhase('reading');
    }
  };

  const handleSelectArea = (area: string) => {
    setSelectedAreas(prev => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area); else if (next.size < 5) next.add(area);
      return next;
    });
  };

  const handleProceedToReading = async () => {
    if (selectedAreas.size < 3) { showAlert('Select at least 3 priorities', 'The Throne Speech must address at least 3 policy areas.'); return; }
    if (!speechDraft.trim()) await generateAISpeech();
    setPhase('reading');
  };

  const handleAddressReply = () => {
    // Opposition gets to deliver Address in Reply — 6 days of debate
    const amendment = OPPOSITION_AMENDMENTS[Math.floor(Math.random() * OPPOSITION_AMENDMENTS.length)];
    setOppositionAmendment(amendment);
    setAddressReplyDebate(1);
    setPhase('address_reply');
  };

  const handleSubmitResponse = () => {
    if (!playerResponse.trim()) { showAlert('Write a response', 'Defend your Throne Speech on the floor of the House.'); return; }
    const words = playerResponse.trim().split(/\s+/).filter(Boolean).length;
    if (addressReplyDebate < 6) {
      setAddressReplyDebate(prev => prev + 1);
      setPlayerResponse('');
    } else {
      setPhase('confidence_vote');
    }
  };

  const handleConfidenceVote = () => {
    // Address in Reply confidence vote
    // Government survives if majority or if approval is decent
    const playerSeats = gameState.seats[gameState.playerPartyId] || 0;
    const hasMajority = playerSeats >= 172;
    const words = playerResponse.trim().split(/\s+/).filter(Boolean).length;
    const speechBonus = words > 100 ? 15 : words > 50 ? 5 : 0;
    const baseChance = hasMajority ? 90 : 50 + (gameState.stats.governmentApproval - 40) * 0.5 + speechBonus;
    const survives = Math.random() * 100 < Math.max(10, Math.min(95, baseChance));
    setGovernmentSurvived(survives);
    setPhase('result');
    if (survives) {
      issuePressStatement(`The Speech from the Throne has passed its confidence vote. Parliament is now officially open for the ${gameState.parliamentNumber}th Parliament. The government will pursue the priorities outlined in the Throne Speech.`);
    }
  };

  // ── CEREMONY PHASE ────────────────────────────────────────────────────────────
  if (phase === 'ceremony') {
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Speech from the Throne</Text>
            <Text style={styles.headerSub}>Opening of the {gameState.parliamentNumber}th Parliament of Canada</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          {/* Senate Chamber visual */}
          <View style={[styles.ceremonialCard, { borderColor: Colors.gold + '55' }]}>
            <MaterialCommunityIcons name="crown" size={56} color={Colors.gold} />
            <Text style={[styles.ceremonialTitle, { color: Colors.gold }]}>State Opening of Parliament</Text>
            <Text style={styles.ceremonialDesc}>
              The {gameState.parliamentNumber}th Parliament of Canada is called to order. The Governor General, representing His Majesty King Charles III, will read the Speech from the Throne in the Senate Chamber.
            </Text>
          </View>

          <View style={styles.ceremonySteps}>
            <Text style={styles.sectionLabel}>THE CEREMONY</Text>
            {[
              { icon: 'gavel', title: 'Usher of the Black Rod', desc: 'The Usher knocks three times on the doors of the House of Commons, summoning MPs to the Senate Chamber.' },
              { icon: 'crown', title: 'Governor General Arrives', desc: 'The GG takes the Throne in the Senate Chamber. MPs stand at the bar of the Senate — they may not enter the Red Chamber.' },
              { icon: 'book-open-variant', title: 'Speech is Read', desc: `The Governor General reads the Speech written by ${isGoverning ? party?.name + "'s government" : 'the governing party'}. All 338 MPs, 105 senators, and Supreme Court justices attend.` },
              { icon: 'home', title: 'House Returns', desc: 'MPs return to the House. Bill C-1 is introduced (pro forma bill asserting House independence), then debate on the Address in Reply begins — 6 days, ending in a confidence vote.' },
            ].map((step, idx) => (
              <View key={idx} style={styles.ceremonyStep}>
                <View style={[styles.ceremonyStepIcon, { backgroundColor: Colors.gold + '22' }]}>
                  <MaterialCommunityIcons name={step.icon as any} size={18} color={Colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ceremonyStepTitle}>{step.title}</Text>
                  <Text style={styles.ceremonyStepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.constitutionalNote, { borderColor: Colors.info + '33' }]}>
            <MaterialCommunityIcons name="information" size={13} color={Colors.info} />
            <Text style={styles.constitutionalNoteText}>
              Under the Constitution Act 1867, Parliament cannot conduct public business until after the Speech from the Throne is read. The Address in Reply to the Throne Speech is a confidence matter — defeat triggers an election.
            </Text>
          </View>

          <Pressable onPress={handleCeremonyProceed} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: Colors.gold }, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="play" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{isGoverning ? 'Write the Throne Speech' : 'Attend the Ceremony'}</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    );
  }

  // ── WRITING PHASE (PM only) ───────────────────────────────────────────────────
  if (phase === 'writing') {
    return (
      <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Pressable onPress={() => setPhase('ceremony')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Draft Your Throne Speech</Text>
            <Text style={styles.headerSub}>Select up to 5 government priorities</Text>
          </View>
          <View style={[styles.pmBadge, { backgroundColor: partyColor + '22', borderColor: partyColor + '44' }]}>
            <Text style={[styles.pmBadgeText, { color: partyColor }]}>PM</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>SELECT GOVERNMENT PRIORITIES ({selectedAreas.size}/5)</Text>
          <Text style={styles.sectionNote}>The Throne Speech outlines your government's legislative agenda for this session. Choose your priorities wisely — they will be the basis for your confidence vote.</Text>

          {POLICY_AREAS.map(area => {
            const isSelected = selectedAreas.has(area.area);
            return (
              <View key={area.area}>
                <Pressable onPress={() => handleSelectArea(area.area)} style={({ pressed }) => [styles.areaCard, isSelected && { borderColor: partyColor, backgroundColor: partyColor + '0A' }, pressed && { opacity: 0.85 }]}>
                  <MaterialCommunityIcons name={area.icon as any} size={20} color={isSelected ? partyColor : Colors.textMuted} />
                  <Text style={[styles.areaCardTitle, isSelected && { color: partyColor }]}>{area.area}</Text>
                  {isSelected ? <MaterialCommunityIcons name="check-circle" size={16} color={partyColor} /> : null}
                </Pressable>
                {isSelected ? (
                  <TextInput
                    style={styles.commitmentInput}
                    placeholder={area.placeholder}
                    placeholderTextColor={Colors.textMuted}
                    value={areaCommitments[area.area] || ''}
                    onChangeText={text => setAreaCommitments(prev => ({ ...prev, [area.area]: text }))}
                    multiline
                    textAlignVertical="top"
                  />
                ) : null}
              </View>
            );
          })}

          {selectedAreas.size >= 3 ? (
            <View style={styles.speechPreview}>
              <Text style={styles.sectionLabel}>AI-GENERATED THRONE SPEECH PREVIEW</Text>
              {speechDraft ? (
                <Text style={styles.speechText}>{speechDraft}</Text>
              ) : (
                <Text style={styles.sectionNote}>The full speech will be AI-generated when you proceed.</Text>
              )}
            </View>
          ) : null}

          <Pressable onPress={handleProceedToReading} disabled={selectedAreas.size < 3 || generatingAI} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, (selectedAreas.size < 3 || generatingAI) && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="robot" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{generatingAI ? 'Generating Speech...' : 'Proceed to Reading Ceremony'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── READING PHASE ─────────────────────────────────────────────────────────────
  if (phase === 'reading') {
    const speechContent = speechDraft || `Members of the Senate, Members of the House of Commons:\n\nMy Government's agenda for the ${gameState.parliamentNumber}th Parliament is guided by a commitment to strengthen Canada's social contract, grow the economy for all Canadians, and position our nation as a global leader in the 21st century.\n\n${Array.from(selectedAreas).map(a => `My Government will take decisive action on ${a}. ${areaCommitments[a] || 'Concrete measures will be introduced in the coming weeks.'}`).join('\n\n')}\n\nMembers of the Senate and of the House of Commons, I pray that Divine Providence may guide you in your deliberations.`;
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <View style={[styles.header, { borderBottomColor: Colors.gold + '44' }]}>
          <MaterialCommunityIcons name="crown" size={18} color={Colors.gold} />
          <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>Speech from the Throne</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.speechReadingCard, { borderColor: Colors.gold + '44' }]}>
            <View style={styles.ggHeader}>
              <MaterialCommunityIcons name="crown" size={24} color={Colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.ggTitle, { color: Colors.gold }]}>His Excellency the Governor General</Text>
                <Text style={styles.ggSub}>Senate Chamber, Parliament Hill, Ottawa</Text>
              </View>
            </View>
            <Text style={styles.speechText}>{speechContent}</Text>
          </View>

          <View style={styles.speechPoliciesCard}>
            <Text style={styles.sectionLabel}>GOVERNMENT PRIORITIES ANNOUNCED</Text>
            {Array.from(selectedAreas).map(area => {
              const areaInfo = POLICY_AREAS.find(a => a.area === area);
              return (
                <View key={area} style={styles.priorityRow}>
                  <MaterialCommunityIcons name={(areaInfo?.icon || 'check') as any} size={14} color={partyColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.priorityTitle}>{area}</Text>
                    {areaCommitments[area] ? <Text style={styles.priorityCommitment}>{areaCommitments[area]}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={[styles.constitutionalNote, { borderColor: Colors.warning + '33' }]}>
            <MaterialCommunityIcons name="alert" size={13} color={Colors.warning} />
            <Text style={[styles.constitutionalNoteText, { color: Colors.warning }]}>
              The Speech from the Throne is a confidence measure. Parliament will now debate the Address in Reply for 6 days. The opposition will move amendments attacking the government's agenda. The government must survive the confidence vote.
            </Text>
          </View>

          <Pressable onPress={handleAddressReply} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: isGoverning ? partyColor : Colors.warning }, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="gavel" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{isGoverning ? 'Begin Address in Reply Debate' : 'Respond to Throne Speech'}</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    );
  }

  // ── ADDRESS IN REPLY ──────────────────────────────────────────────────────────
  if (phase === 'address_reply') {
    return (
      <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Address in Reply — Day {addressReplyDebate}/6</Text>
            <Text style={styles.headerSub}>Debate on the Speech from the Throne</Text>
          </View>
          <View style={styles.debateDayPills}>
            {[1,2,3,4,5,6].map(d => (
              <View key={d} style={[styles.dayDot, addressReplyDebate >= d && { backgroundColor: partyColor }]} />
            ))}
          </View>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {addressReplyDebate === 1 ? (
            <View style={[styles.oppositionAmendmentCard, { borderColor: Colors.error + '44' }]}>
              <MaterialCommunityIcons name="alert-circle" size={16} color={Colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.amendmentTitle}>Opposition Amendment — Wrecking Motion</Text>
                <Text style={styles.amendmentText}>"{oppositionAmendment}"</Text>
                <Text style={styles.amendmentNote}>This amendment, if adopted, would signal non-confidence and trigger an election. The government must defeat it on Day 6.</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.debateContextCard}>
            <Text style={styles.sectionLabel}>DAY {addressReplyDebate} — FLOOR DEBATE</Text>
            <Text style={styles.sectionNote}>
              {addressReplyDebate <= 2
                ? 'The mover and seconder of the Address in Reply are delivering speeches. Opposition leaders are attacking the Throne Speech priorities.'
                : addressReplyDebate <= 4
                ? 'Backbench MPs and party critics are debating clause by clause. The opposition is moving sub-amendments to weaken the government\'s position.'
                : addressReplyDebate <= 5
                ? 'The opposition House Leader and Deputy Leader are delivering major speeches. The Speaker has ruled several points of order.'
                : 'FINAL DAY — The Prime Minister and Opposition Leader deliver closing speeches before the confidence vote.'}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>YOUR {isGoverning ? 'GOVERNMENT\'S DEFENCE' : 'OPPOSITION RESPONSE'}</Text>
          <TextInput
            style={styles.debateInput}
            multiline
            placeholder={isGoverning
              ? `Day ${addressReplyDebate}/6: Defend your Throne Speech priorities. Address the opposition amendment directly. Explain why your government's agenda deserves parliamentary confidence...`
              : `Day ${addressReplyDebate}/6: Attack the government's agenda. Support or extend the opposition amendment. Challenge specific commitments as vague or unaffordable...`}
            placeholderTextColor={Colors.textMuted}
            value={playerResponse}
            onChangeText={setPlayerResponse}
            textAlignVertical="top"
          />
          <Text style={styles.wordCount}>{playerResponse.trim().split(/\s+/).filter(Boolean).length} words</Text>

          <Pressable onPress={handleSubmitResponse} disabled={!playerResponse.trim()} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, !playerResponse.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name={addressReplyDebate < 6 ? 'arrow-right' : 'vote'} size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{addressReplyDebate < 6 ? `Submit Day ${addressReplyDebate} Speech — Advance Debate` : 'Final Speech — Call Confidence Vote'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── CONFIDENCE VOTE ───────────────────────────────────────────────────────────
  if (phase === 'confidence_vote') {
    const playerSeats = gameState.seats[gameState.playerPartyId] || 0;
    const hasMajority = playerSeats >= 172;
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>Confidence Vote — Address in Reply</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.voteContextCard}>
            <MaterialCommunityIcons name="vote" size={32} color={Colors.gold} />
            <Text style={styles.voteContextTitle}>The House Divides</Text>
            <Text style={styles.voteContextDesc}>
              After 6 days of debate on the Address in Reply to the Speech from the Throne, the House of Commons will now vote on the opposition's amendment.
            </Text>
            <Text style={styles.voteContextDesc}>
              {isGoverning
                ? `${hasMajority ? 'Your majority government is expected to defeat the amendment easily.' : 'As a minority government, you will need support from at least one other party to survive.'}`
                : 'If the opposition amendment passes, the government falls and an election is called.'}
            </Text>
          </View>

          <View style={styles.seatsSummary}>
            <Text style={styles.sectionLabel}>SEAT COUNT</Text>
            {Object.entries(gameState.seats).filter(([_, v]) => v > 0).map(([id, seats]) => {
              const p = PARTIES.find(x => x.id === id);
              return (
                <View key={id} style={styles.seatRow}>
                  <View style={[styles.seatDot, { backgroundColor: p?.color || Colors.textMuted }]} />
                  <Text style={styles.seatParty}>{p?.shortName || id}</Text>
                  <Text style={[styles.seatCount, { color: p?.color || Colors.textMuted }]}>{seats}</Text>
                </View>
              );
            })}
            <View style={[styles.majorityLine, { borderColor: Colors.gold + '44' }]}>
              <MaterialCommunityIcons name="chevron-right" size={12} color={Colors.gold} />
              <Text style={styles.majorityLineText}>172 seats needed for majority</Text>
            </View>
          </View>

          <Pressable onPress={handleConfidenceVote} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: Colors.gold }, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="vote" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Call the Vote — House Divides</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.resultCard, { borderColor: (governmentSurvived ? Colors.success : Colors.error) + '55' }]}>
            <MaterialCommunityIcons name={governmentSurvived ? 'check-decagram' : 'close-circle'} size={72} color={governmentSurvived ? Colors.success : Colors.error} />
            <Text style={[styles.resultTitle, { color: governmentSurvived ? Colors.success : Colors.error }]}>
              {governmentSurvived ? (isGoverning ? 'Government Survives' : 'Amendment Defeated') : (isGoverning ? 'Government Falls' : 'Amendment Carries')}
            </Text>
            <Text style={styles.resultDesc}>
              {governmentSurvived
                ? `The House has adopted the Address in Reply to the Speech from the Throne. Parliament is now officially open. The government may proceed with its legislative agenda for the ${gameState.parliamentNumber}th Parliament.`
                : `The House has adopted the opposition amendment, indicating non-confidence in the government. The Governor General has been advised. Parliament will be dissolved and a general election will be held.`}
            </Text>
          </View>
          {governmentSurvived ? (
            <View style={styles.nextStepsCard}>
              <Text style={styles.sectionLabel}>NEXT STEPS</Text>
              {[
                'Bill C-1 (pro forma bill) has been introduced — Parliament is now open for business',
                'Standing Committees will be established within the next few weeks',
                'The government\'s first Budget will be tabled in the coming months',
                'Government legislation will begin appearing on the Order Paper',
                '22 Opposition Days per year will be designated as supply (allotted) days',
              ].map((s, i) => (
                <View key={i} style={styles.nextStepRow}>
                  <MaterialCommunityIcons name="check" size={12} color={Colors.success} />
                  <Text style={styles.nextStepText}>{s}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Pressable onPress={() => { if (!governmentSurvived && isGoverning) dissolveParliament(); router.replace('/(tabs)'); }} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: governmentSurvived ? partyColor : Colors.error }, pressed && { opacity: 0.85 }]}>
            <Text style={styles.primaryBtnText}>{governmentSurvived ? 'Return to Parliament' : 'Proceed to Election'}</Text>
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
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  pmBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1 },
  pmBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  sectionNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
  ceremonialCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  ceremonialTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, textAlign: 'center' },
  ceremonialDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  ceremonySteps: { gap: Spacing.sm },
  ceremonyStep: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  ceremonyStepIcon: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  ceremonyStepTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 3 },
  ceremonyStepDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  constitutionalNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, backgroundColor: Colors.info + '08' },
  constitutionalNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 18 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  areaCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  areaCardTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  commitmentInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 70, lineHeight: 20, marginTop: 4, marginBottom: 4 },
  speechPreview: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.md, gap: Spacing.sm },
  speechReadingCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 2, padding: Spacing.lg, gap: Spacing.md },
  ggHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.gold + '33' },
  ggTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  ggSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  speechText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 24, fontStyle: 'italic' },
  speechPoliciesCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  priorityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  priorityTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  priorityCommitment: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  oppositionAmendmentCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.error + '08', borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  amendmentTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.error, marginBottom: 4 },
  amendmentText: { fontSize: FontSize.sm, color: Colors.textPrimary, fontStyle: 'italic', lineHeight: 20, marginBottom: 4 },
  amendmentNote: { fontSize: FontSize.xs, color: Colors.error + 'cc', lineHeight: 17 },
  debateContextCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 6 },
  debateInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 140, lineHeight: 22 },
  wordCount: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' },
  debateDayPills: { flexDirection: 'row', gap: 4 },
  dayDot: { width: 16, height: 6, borderRadius: 3, backgroundColor: Colors.surfaceBorder },
  voteContextCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '44', padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  voteContextTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  voteContextDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  seatsSummary: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  seatRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seatDot: { width: 10, height: 10, borderRadius: 5 },
  seatParty: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  seatCount: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  majorityLine: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: Spacing.sm, borderTopWidth: 1, marginTop: 4 },
  majorityLineText: { fontSize: FontSize.xs, color: Colors.gold, fontStyle: 'italic' },
  resultCard: { borderRadius: Radius.xl, borderWidth: 2, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card },
  resultTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, textAlign: 'center' },
  resultDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  nextStepsCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.success + '33', padding: Spacing.md, gap: 10 },
  nextStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  nextStepText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
});
