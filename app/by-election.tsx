// Powered by OnSpace.AI
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';
import { REAL_PROVINCES } from '@/constants/provinces';

// ── Riding data ───────────────────────────────────────────────────────────────
interface Riding {
  name: string;
  province: string;
  provinceCode: string;
  currentHolder: string; // partyId
  marginPct: number;     // how close the last election was (lower = more competitive)
  battleground: boolean;
  population: string;
  incumbentName: string;
  vacancyReason: 'resignation' | 'death' | 'expulsion';
  vacancyWeek: number;
}

interface ByElectionCandidate {
  name: string;
  occupation: string;
  strength: number; // 0-100
  local: boolean;   // local vs parachute candidate
}

interface CampaignResource {
  label: string;
  icon: string;
  cost: number;
  effect: number;
  used: boolean;
}

type ByElectionPhase = 'announcement' | 'candidate' | 'campaign' | 'results';

function generateRiding(trigger: ByElectionTrigger): Riding {
  const ridings: Record<string, string[]> = {
    ON: ['Scarborough Centre', 'Ottawa West—Nepean', 'Brampton North', 'Hamilton East—Stoney Creek', 'Kingston and the Islands', 'Mississauga—Erin Mills', 'London West', 'Niagara Falls', 'Peterborough—Kawartha', 'Toronto—Danforth'],
    QC: ['Abitibi—Témiscamingue', 'Bourassa', 'Chicoutimi—Le Fjord', 'Laval—Les Îles', 'Longueuil—Charles-LeMoyne', 'Montarville', 'Papineau', 'Québec', 'Rimouski-Neigette', 'Sherbrooke'],
    BC: ['Burnaby South', 'Cloverdale—Langley', 'Delta—Richmond East', 'Kelowna—Lake Country', 'North Island—Powell River', 'Saanich—Gulf Islands', 'Surrey Central', 'Vancouver East', 'Victoria', 'West Vancouver—Sunshine Coast'],
    AB: ['Calgary Centre', 'Calgary Nose Hill', 'Edmonton Griesbach', 'Fort McMurray—Cold Lake', 'Lethbridge', 'Peace River—Westlock', 'Red Deer—Mountain View', 'Sherwood Park—Fort Saskatchewan', 'Yellowhead', 'Banff—Airdrie'],
    MB: ['Elmwood—Transcona', 'Kildonan—St. Paul', 'Portage—Lisgar', 'Saint-Boniface—Saint-Vital', 'Selkirk—Interlake—Eastman', 'Winnipeg Centre', 'Winnipeg North', 'Winnipeg South'],
    SK: ['Battlefords—Lloydminster', 'Moose Jaw—Lake Centre—Lanigan', 'Prince Albert', 'Regina—Wascana', 'Saskatoon West', 'Yorkton—Melville'],
    NS: ['Cape Breton—Canso', 'Cumberland—Colchester', 'Dartmouth—Cole Harbour', 'Halifax West', 'South Shore—St. Margarets'],
    NB: ['Acadie—Bathurst', 'Fredericton', 'Miramichi—Grand Lake', 'New Brunswick Southwest', 'Tobique—Mactaquac'],
    NL: ['Avalon', 'Bonavista—Burin—Trinity', 'Labrador', 'Long Range Mountains', 'St. John\'s East'],
    PE: ['Cardigan', 'Charlottetown', 'Egmont', 'Malpeque'],
  };

  const provinceCode = trigger.provinceCode;
  const provinceRidings = ridings[provinceCode] || ridings['ON'];
  const ridingName = provinceRidings[Math.floor(Math.random() * provinceRidings.length)];
  const province = REAL_PROVINCES.find(p => p.code === provinceCode)?.name || provinceCode;

  const firstNames = ['James', 'Marie', 'David', 'Patricia', 'Kevin', 'Susan', 'Thomas', 'Linda', 'Robert', 'Denise'];
  const lastNames = ['Wilson', 'Tremblay', 'MacDonald', 'Singh', 'Chen', 'Williams', 'LeBlanc', 'Park', 'Okafor', 'Kumar'];
  const incumbentName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

  return {
    name: ridingName,
    province,
    provinceCode,
    currentHolder: trigger.partyId,
    marginPct: 3 + Math.random() * 15,
    battleground: Math.random() > 0.5,
    population: `${Math.floor(60 + Math.random() * 60)}K residents`,
    incumbentName,
    vacancyReason: trigger.reason,
    vacancyWeek: trigger.week,
  };
}

function generateCandidates(playerPartyId: string, playerName: string): ByElectionCandidate[] {
  const localCandidates = [
    { name: 'Dr. Angela Nguyen', occupation: 'Family physician', strength: 78 + Math.floor(Math.random() * 15), local: true },
    { name: 'Marcus Thompson', occupation: 'City councillor (12 yrs)', strength: 72 + Math.floor(Math.random() * 15), local: true },
    { name: 'Claire Beaumont', occupation: 'School board chair', strength: 65 + Math.floor(Math.random() * 15), local: true },
    { name: 'James Okafor', occupation: 'Business association president', strength: 60 + Math.floor(Math.random() * 15), local: true },
  ];
  const parachuteCandidates = [
    { name: 'Alexandra Chen', occupation: `Adviser to ${playerName}`, strength: 80 + Math.floor(Math.random() * 12), local: false },
    { name: 'Robert Singh', occupation: 'Party national director', strength: 74 + Math.floor(Math.random() * 12), local: false },
    { name: 'Dr. Patricia Williams', occupation: 'Party policy director', strength: 68 + Math.floor(Math.random() * 12), local: false },
  ];
  const all = [...localCandidates, ...parachuteCandidates].sort(() => Math.random() - 0.5);
  return all.slice(0, 5);
}

function generateCampaignResources(): CampaignResource[] {
  return [
    { label: 'Ground Campaign', icon: 'account-group', cost: 500000, effect: 8, used: false },
    { label: 'Digital Ad Blitz', icon: 'broadcast', cost: 300000, effect: 5, used: false },
    { label: 'Leader Visit', icon: 'star-circle', cost: 0, effect: 12, used: false },
    { label: 'Mail Campaign', icon: 'email-newsletter', cost: 150000, effect: 3, used: false },
    { label: 'Volunteer Surge', icon: 'hand-heart', cost: 0, effect: 6, used: false },
    { label: 'Endorsement Drive', icon: 'certificate', cost: 100000, effect: 4, used: false },
  ];
}

export interface ByElectionTrigger {
  partyId: string;
  provinceCode: string;
  reason: 'resignation' | 'death' | 'expulsion';
  week: number;
}

export default function ByElectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, completeByElection } = useGame();
  const { showAlert } = useAlert();

  const [phase, setPhase] = useState<ByElectionPhase>('announcement');
  const [riding, setRiding] = useState<Riding | null>(null);
  const [candidates, setCandidates] = useState<ByElectionCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<ByElectionCandidate | null>(null);
  const [resources, setResources] = useState<CampaignResource[]>(generateCampaignResources());
  const [campaignBudgetUsed, setCampaignBudgetUsed] = useState(0);
  const [totalBonus, setTotalBonus] = useState(0);
  const [result, setResult] = useState<{
    won: boolean;
    playerPct: number;
    rivalPct: number;
    margin: number;
    classification: string;
  } | null>(null);

  const resultFade = useRef(new Animated.Value(0)).current;
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (gameState) {
      // Generate a riding based on game state
      const provinces = Object.keys(gameState.seats);
      const provinceCode = gameState.seats['liberal'] > 0 ? 'ON' : 'BC';
      const trigger: ByElectionTrigger = {
        partyId: 'liberal', // could be any party with a vacancy
        provinceCode,
        reason: Math.random() > 0.7 ? 'death' : 'resignation',
        week: gameState.currentWeek,
      };
      setRiding(generateRiding(trigger));
      setCandidates(generateCandidates(gameState.playerPartyId, gameState.playerName));
    }
  }, []);

  if (!gameState || !riding) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const isPlayerPartyRiding = riding.currentHolder === gameState.playerPartyId;
  const incumbentParty = PARTIES.find(p => p.id === riding.currentHolder);

  const reasonLabel = {
    resignation: 'MP Resigned',
    death: 'MP Passed Away',
    expulsion: 'MP Expelled from Caucus',
  }[riding.vacancyReason];

  const handleSelectCandidate = (candidate: ByElectionCandidate) => {
    setSelectedCandidate(candidate);
  };

  const handleUseResource = (idx: number) => {
    const resource = resources[idx];
    if (resource.used) return;
    if (resource.cost > 0 && campaignBudgetUsed + resource.cost > 1500000) {
      showAlert('Budget Exceeded', 'You have exhausted your campaign budget for this by-election.');
      return;
    }
    const newResources = resources.map((r, i) => i === idx ? { ...r, used: true } : r);
    setResources(newResources);
    setCampaignBudgetUsed(prev => prev + resource.cost);
    setTotalBonus(prev => prev + resource.effect);
  };

  const handleRunCampaign = () => {
    if (!selectedCandidate) {
      showAlert('Select a Candidate', 'Choose your candidate before launching the campaign.');
      return;
    }
    setPhase('results');
    simulateResult();
  };

  const simulateResult = () => {
    if (!selectedCandidate) return;

    // Base player chance from approval + candidate strength + campaign bonus
    const baseChance = (gameState.stats.approvalRating * 0.3)
      + (selectedCandidate.strength * 0.3)
      + (totalBonus * 0.8)
      + (isPlayerPartyRiding ? 10 : 0)
      + (selectedCandidate.local ? 5 : -3)
      + (Math.random() * 14 - 7); // ±7 variance

    const playerPct = Math.max(18, Math.min(68, baseChance));
    const rivalPct = Math.max(15, Math.min(65, 100 - playerPct - (5 + Math.random() * 10)));
    const otherPct = Math.max(0, 100 - playerPct - rivalPct);
    const won = playerPct > rivalPct;
    const margin = Math.abs(playerPct - rivalPct);
    const classification = won
      ? margin > 15 ? 'DECISIVE WIN' : margin > 7 ? 'SOLID WIN' : 'NARROW WIN'
      : margin > 15 ? 'HEAVY LOSS' : margin > 7 ? 'CLEAR LOSS' : 'NEAR MISS';

    setTimeout(() => {
      setResult({ won, playerPct: Math.round(playerPct), rivalPct: Math.round(rivalPct), margin: Math.round(margin), classification });
      Animated.timing(resultFade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
      Animated.timing(barAnim, { toValue: playerPct / 100, duration: 1800, useNativeDriver: false }).start();
    }, 600);
  };

  const handleFinish = () => {
    if (!result || !selectedCandidate) return;
    completeByElection?.(riding.provinceCode, riding.name, result.won, gameState.playerPartyId, riding.currentHolder, selectedCandidate.name);
    router.back();
  };

  const BUDGET_LIMIT = 1500000;
  const budgetPct = (campaignBudgetUsed / BUDGET_LIMIT) * 100;

  // ── ANNOUNCEMENT ─────────────────────────────────────────────────────────────
  if (phase === 'announcement') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>By-Election Called</Text>
            <Text style={styles.headerSub}>{riding.province} · {riding.name}</Text>
          </View>
          <View style={[styles.urgencyBadge, { backgroundColor: Colors.warning + '22' }]}>
            <Text style={[styles.urgencyText, { color: Colors.warning }]}>URGENT</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Breaking news style header */}
          <View style={styles.breakingCard}>
            <View style={styles.breakingTag}>
              <MaterialCommunityIcons name="newspaper" size={12} color={Colors.error} />
              <Text style={styles.breakingTagText}>BREAKING NEWS</Text>
            </View>
            <Text style={styles.breakingHeadline}>
              {riding.name} ({riding.province}) By-Election Triggered: {reasonLabel}
            </Text>
            <Text style={styles.breakingBody}>
              A federal by-election has been called in {riding.name} following the {riding.vacancyReason} of
              {' '}{riding.incumbentName}. Elections Canada has set the voting date for 4 weeks from today.
              All major parties are expected to field candidates.
            </Text>
          </View>

          {/* Riding profile */}
          <View style={styles.ridingCard}>
            <Text style={styles.sectionLabel}>RIDING PROFILE</Text>
            <View style={styles.ridingHeader}>
              <View style={[styles.ridingPartyBadge, { backgroundColor: (incumbentParty?.color || Colors.textMuted) + '22', borderColor: (incumbentParty?.color || Colors.textMuted) + '44' }]}>
                <Text style={[styles.ridingPartyText, { color: incumbentParty?.color || Colors.textMuted }]}>
                  {incumbentParty?.shortName || 'IND'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ridingName}>{riding.name}</Text>
                <Text style={styles.ridingProvince}>{riding.province} · {riding.population}</Text>
              </View>
              {riding.battleground ? (
                <View style={styles.battlegroundBadge}>
                  <MaterialCommunityIcons name="sword-cross" size={10} color={Colors.gold} />
                  <Text style={styles.battlegroundText}>BATTLEGROUND</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.ridingStats}>
              <View style={styles.ridingStatItem}>
                <MaterialCommunityIcons name="account-question" size={14} color={Colors.textMuted} />
                <Text style={styles.ridingStatLabel}>Vacancy</Text>
                <Text style={styles.ridingStatValue}>{reasonLabel}</Text>
              </View>
              <View style={styles.ridingStatItem}>
                <MaterialCommunityIcons name="chart-bar" size={14} color={Colors.textMuted} />
                <Text style={styles.ridingStatLabel}>Last Margin</Text>
                <Text style={[styles.ridingStatValue, { color: riding.marginPct < 5 ? Colors.error : Colors.textPrimary }]}>
                  {riding.marginPct.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.ridingStatItem}>
                <MaterialCommunityIcons name="flag" size={14} color={Colors.textMuted} />
                <Text style={styles.ridingStatLabel}>Current Holder</Text>
                <Text style={[styles.ridingStatValue, { color: incumbentParty?.color || Colors.textMuted }]}>
                  {incumbentParty?.shortName || 'IND'}
                </Text>
              </View>
            </View>

            {/* Local issues */}
            <View style={styles.localIssues}>
              <Text style={styles.localIssuesLabel}>KEY LOCAL ISSUES</Text>
              {[
                riding.provinceCode === 'ON' || riding.provinceCode === 'BC' ? 'Housing affordability crisis' : 'Economic development & jobs',
                riding.provinceCode === 'QC' ? 'Language and identity' : 'Healthcare wait times',
                riding.marginPct < 7 ? 'Strong incumbent advantage fading' : 'Competitive multi-party race expected',
              ].map((issue, i) => (
                <View key={i} style={styles.localIssueRow}>
                  <MaterialCommunityIcons name="circle-small" size={14} color={Colors.textMuted} />
                  <Text style={styles.localIssueText}>{issue}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Stakes */}
          <View style={styles.stakesCard}>
            <Text style={styles.sectionLabel}>WHAT'S AT STAKE</Text>
            <View style={styles.stakesRow}>
              <MaterialCommunityIcons name={isPlayerPartyRiding ? 'shield-check' : 'target'} size={16} color={isPlayerPartyRiding ? Colors.warning : Colors.info} />
              <Text style={styles.stakesText}>
                {isPlayerPartyRiding
                  ? `This is a ${party?.shortName} seat — losing it would damage your party\'s standing and signal weakness going into the next general election.`
                  : `This is an opportunity to steal a seat from ${incumbentParty?.name}. A win here sends a powerful signal about your party\'s momentum.`}
              </Text>
            </View>
            <View style={styles.stakesRow}>
              <MaterialCommunityIcons name="poll" size={16} color={Colors.gold} />
              <Text style={styles.stakesText}>
                By-election results affect national seat counts and can shift the balance of power in a minority Parliament.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setPhase('candidate')}
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="account-plus" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Select Your Candidate</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── CANDIDATE SELECTION ───────────────────────────────────────────────────────
  if (phase === 'candidate') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setPhase('announcement')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Choose Your Candidate</Text>
            <Text style={styles.headerSub}>{riding.name} · {riding.province}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.candidateIntro}>
            <MaterialCommunityIcons name="information" size={13} color={Colors.info} />
            <Text style={styles.candidateIntroText}>
              Local candidates have community roots and name recognition. Parachute candidates bring party connections and campaign experience but may face local backlash.
              Choose wisely — your candidate is the face of the party in this riding for the next 4 weeks.
            </Text>
          </View>

          {candidates.map((c, idx) => {
            const isSelected = selectedCandidate?.name === c.name;
            return (
              <Pressable
                key={idx}
                onPress={() => handleSelectCandidate(c)}
                style={({ pressed }) => [
                  styles.candidateCard,
                  isSelected && [styles.candidateCardSelected, { borderColor: partyColor }],
                  pressed && { opacity: 0.9 },
                ]}
              >
                <View style={styles.candidateCardHeader}>
                  <View style={[styles.candidateAvatar, { backgroundColor: partyColor + '33' }]}>
                    <MaterialCommunityIcons
                      name={c.local ? 'home-account' : 'account-tie'}
                      size={22}
                      color={partyColor}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.candidateName}>{c.name}</Text>
                    <Text style={styles.candidateOccupation}>{c.occupation}</Text>
                  </View>
                  <View style={[styles.candidateTypeBadge, {
                    backgroundColor: c.local ? Colors.success + '22' : Colors.warning + '22',
                    borderColor: c.local ? Colors.success + '44' : Colors.warning + '44',
                  }]}>
                    <Text style={[styles.candidateTypeText, { color: c.local ? Colors.success : Colors.warning }]}>
                      {c.local ? 'LOCAL' : 'PARACHUTE'}
                    </Text>
                  </View>
                  {isSelected ? (
                    <MaterialCommunityIcons name="check-circle" size={20} color={partyColor} />
                  ) : null}
                </View>

                {/* Strength bar */}
                <View style={styles.candidateStrengthRow}>
                  <Text style={styles.candidateStrengthLabel}>Candidate Strength</Text>
                  <View style={styles.candidateStrengthTrack}>
                    <View style={[styles.candidateStrengthFill, {
                      flex: c.strength,
                      backgroundColor: c.strength >= 75 ? Colors.success : c.strength >= 60 ? Colors.info : Colors.warning,
                    }]} />
                    <View style={{ flex: 100 - c.strength }} />
                  </View>
                  <Text style={[styles.candidateStrengthValue, {
                    color: c.strength >= 75 ? Colors.success : c.strength >= 60 ? Colors.info : Colors.warning,
                  }]}>{c.strength}</Text>
                </View>

                {/* Tags */}
                <View style={styles.candidateTags}>
                  {c.local ? (
                    <View style={styles.candidateTag}><Text style={styles.candidateTagText}>+5% local advantage</Text></View>
                  ) : (
                    <View style={[styles.candidateTag, { borderColor: Colors.warning + '44' }]}>
                      <Text style={[styles.candidateTagText, { color: Colors.warning }]}>−3% outsider penalty</Text>
                    </View>
                  )}
                  <View style={styles.candidateTag}>
                    <Text style={styles.candidateTagText}>Strength bonus: +{Math.round(c.strength * 0.3)}%</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

          <Pressable
            onPress={() => selectedCandidate ? setPhase('campaign') : showAlert('Select a Candidate', 'You must choose a candidate before proceeding.')}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: selectedCandidate ? partyColor : Colors.surfaceElevated },
              !selectedCandidate && { opacity: 0.5 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <MaterialCommunityIcons name="flag-checkered" size={18} color={selectedCandidate ? '#fff' : Colors.textMuted} />
            <Text style={[styles.primaryBtnText, !selectedCandidate && { color: Colors.textMuted }]}>
              {selectedCandidate ? `Campaign with ${selectedCandidate.name.split(' ')[0]}` : 'Select a Candidate First'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── CAMPAIGN ─────────────────────────────────────────────────────────────────
  if (phase === 'campaign') {
    const resourcesUsed = resources.filter(r => r.used).length;
    const effectTotal = resources.filter(r => r.used).reduce((s, r) => s + r.effect, 0);

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setPhase('candidate')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Campaign Resources</Text>
            <Text style={styles.headerSub}>{riding.name} · 4 weeks remaining</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Candidate summary */}
          {selectedCandidate ? (
            <View style={[styles.selectedCandidateBanner, { borderColor: partyColor + '44' }]}>
              <MaterialCommunityIcons name="account-star" size={18} color={partyColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectedCandidateName, { color: partyColor }]}>
                  {selectedCandidate.name}
                </Text>
                <Text style={styles.selectedCandidateOcc}>{selectedCandidate.occupation}</Text>
              </View>
              <Text style={styles.selectedCandidateStrength}>Strength: {selectedCandidate.strength}</Text>
            </View>
          ) : null}

          {/* Budget tracker */}
          <View style={styles.budgetCard}>
            <Text style={styles.sectionLabel}>CAMPAIGN BUDGET — $1.5M LIMIT</Text>
            <View style={styles.budgetBarTrack}>
              <View style={[styles.budgetBarFill, {
                flex: budgetPct,
                backgroundColor: budgetPct > 80 ? Colors.error : budgetPct > 60 ? Colors.warning : Colors.success,
              }]} />
              <View style={{ flex: Math.max(0, 100 - budgetPct) }} />
            </View>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetUsed}>${(campaignBudgetUsed / 1000000).toFixed(2)}M used</Text>
              <Text style={styles.budgetRemaining}>${((BUDGET_LIMIT - campaignBudgetUsed) / 1000000).toFixed(2)}M remaining</Text>
            </View>
          </View>

          {/* Campaign bonus */}
          <View style={[styles.campaignBonusCard, { borderColor: partyColor + '44' }]}>
            <View style={styles.campaignBonusLeft}>
              <Text style={styles.campaignBonusLabel}>CURRENT WIN PROBABILITY BOOST</Text>
              <Text style={[styles.campaignBonusValue, { color: partyColor }]}>+{totalBonus}%</Text>
            </View>
            <View style={styles.campaignBonusRight}>
              <Text style={styles.campaignBonusResourceLabel}>{resourcesUsed} of {resources.length} resources deployed</Text>
            </View>
          </View>

          {/* Resources */}
          <Text style={styles.sectionLabel}>AVAILABLE CAMPAIGN RESOURCES</Text>
          {resources.map((resource, idx) => (
            <Pressable
              key={idx}
              onPress={() => !resource.used && handleUseResource(idx)}
              style={({ pressed }) => [
                styles.resourceCard,
                resource.used && [styles.resourceCardUsed, { borderColor: partyColor + '44' }],
                !resource.used && pressed && { opacity: 0.85 },
                !resource.used && { borderColor: Colors.surfaceBorder },
              ]}
            >
              <View style={[styles.resourceIcon, {
                backgroundColor: resource.used ? partyColor + '22' : Colors.surfaceElevated,
              }]}>
                <MaterialCommunityIcons
                  name={resource.icon as any}
                  size={20}
                  color={resource.used ? partyColor : Colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.resourceLabel, resource.used && { color: partyColor }]}>
                  {resource.label}
                </Text>
                <Text style={styles.resourceDetails}>
                  {resource.cost > 0 ? `$${(resource.cost / 1000).toFixed(0)}K budget` : 'No budget cost'}
                  {' · '}Win probability: +{resource.effect}%
                </Text>
              </View>
              {resource.used ? (
                <View style={[styles.resourceUsedBadge, { backgroundColor: partyColor + '22' }]}>
                  <MaterialCommunityIcons name="check" size={14} color={partyColor} />
                  <Text style={[styles.resourceUsedText, { color: partyColor }]}>Deployed</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => handleUseResource(idx)}
                  style={({ pressed }) => [styles.deployBtn, { borderColor: partyColor + '55' }, pressed && { opacity: 0.8 }]}
                >
                  <Text style={[styles.deployBtnText, { color: partyColor }]}>Deploy</Text>
                </Pressable>
              )}
            </Pressable>
          ))}

          {/* Campaign simulation note */}
          <View style={styles.simulationNote}>
            <MaterialCommunityIcons name="information" size={13} color={Colors.info} />
            <Text style={styles.simulationNoteText}>
              Your win probability depends on: candidate strength ({Math.round(selectedCandidate ? selectedCandidate.strength * 0.3 : 0)}%), party approval ({Math.round(gameState.stats.approvalRating * 0.3)}%), campaign resources (+{totalBonus}%), and local factors ({riding.battleground ? 'competitive riding' : 'safer seat'}).
            </Text>
          </View>
        </ScrollView>

        {/* Launch button */}
        <View style={[styles.campaignFooter, { paddingBottom: insets.bottom + 80 }]}>
          <Pressable
            onPress={handleRunCampaign}
            style={({ pressed }) => [styles.launchBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="flag-checkered" size={20} color="#fff" />
            <Text style={styles.launchBtnText}>Launch Campaign & Get Results</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────────
  if (phase === 'results') {
    const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

    if (!result) {
      return (
        <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
          <MaterialCommunityIcons name="vote-outline" size={56} color={Colors.gold} />
          <Text style={styles.loadingTitle}>Counting Ballots</Text>
          <Text style={styles.loadingSubtitle}>{riding.name} · {riding.province}</Text>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map(i => <View key={i} style={[styles.loadingDot, { opacity: 0.4 + i * 0.2 }]} />)}
          </View>
        </View>
      );
    }

    const resultColor = result.won ? Colors.success : Colors.error;
    const resultIcon = result.won ? 'check-decagram' : 'close-circle';

    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: resultFade }]}>
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>By-Election Results</Text>
            <Text style={styles.headerSub}>{riding.name} · {riding.province}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* RESULT CARD */}
          <View style={[styles.resultCard, { borderColor: resultColor + '55' }]}>
            <MaterialCommunityIcons name={resultIcon as any} size={64} color={resultColor} />
            <Text style={[styles.resultOutcome, { color: resultColor }]}>
              {result.won ? `${party?.shortName} WINS ${riding.name}!` : `${party?.shortName} LOSES ${riding.name}`}
            </Text>
            <View style={[styles.classificationBadge, { backgroundColor: resultColor + '22', borderColor: resultColor + '44' }]}>
              <Text style={[styles.classificationText, { color: resultColor }]}>{result.classification}</Text>
            </View>
            <Text style={styles.resultMargin}>
              {result.won ? 'Won by' : 'Lost by'} {result.margin} points
            </Text>
          </View>

          {/* Vote bar */}
          <View style={styles.voteResultCard}>
            <Text style={styles.sectionLabel}>VOTE SHARE — {riding.name}</Text>
            <View style={styles.voteResultBarTrack}>
              <Animated.View style={[styles.voteResultBarPlayer, { width: barWidth as any, backgroundColor: partyColor }]} />
            </View>
            <View style={styles.voteResultRow}>
              <View style={styles.voteResultItem}>
                <View style={[styles.voteResultDot, { backgroundColor: partyColor }]} />
                <Text style={styles.voteResultParty}>{party?.shortName}</Text>
                <Text style={[styles.voteResultPct, { color: partyColor }]}>{result.playerPct}%</Text>
              </View>
              <View style={styles.voteResultItem}>
                <View style={[styles.voteResultDot, { backgroundColor: Colors.error }]} />
                <Text style={styles.voteResultParty}>Rivals</Text>
                <Text style={[styles.voteResultPct, { color: Colors.error }]}>{result.rivalPct}%</Text>
              </View>
              <View style={styles.voteResultItem}>
                <View style={[styles.voteResultDot, { backgroundColor: Colors.textMuted }]} />
                <Text style={styles.voteResultParty}>Other</Text>
                <Text style={[styles.voteResultPct, { color: Colors.textMuted }]}>
                  {Math.max(0, 100 - result.playerPct - result.rivalPct)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Candidate result */}
          {selectedCandidate ? (
            <View style={[styles.candidateResultCard, { borderColor: resultColor + '44' }]}>
              <MaterialCommunityIcons name={result.won ? 'account-check' : 'account-remove'} size={20} color={resultColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.candidateResultName, { color: resultColor }]}>
                  {result.won ? `Elect ${selectedCandidate.name}` : `${selectedCandidate.name} is Defeated`}
                </Text>
                <Text style={styles.candidateResultOcc}>{selectedCandidate.occupation} · {selectedCandidate.local ? 'Local candidate' : 'National party candidate'}</Text>
              </View>
            </View>
          ) : null}

          {/* Seat impact */}
          <View style={styles.seatImpactCard}>
            <Text style={styles.sectionLabel}>SEAT COUNT IMPACT</Text>
            <View style={styles.seatImpactRow}>
              <MaterialCommunityIcons name={result.won ? 'plus-circle' : 'minus-circle'} size={18} color={resultColor} />
              <Text style={[styles.seatImpactText, { color: resultColor }]}>
                {result.won
                  ? isPlayerPartyRiding
                    ? `${party?.shortName} retains the ${riding.name} seat — count holds steady`
                    : `${party?.shortName} gains 1 seat from ${incumbentParty?.shortName} — national count now ${(gameState.seats[gameState.playerPartyId] || 0) + 1}`
                  : isPlayerPartyRiding
                    ? `${party?.shortName} loses the ${riding.name} seat — count drops by 1`
                    : `${party?.shortName} fails to capture ${riding.name} — count unchanged`}
              </Text>
            </View>
            <View style={styles.seatImpactRow}>
              <MaterialCommunityIcons name="poll" size={18} color={Colors.info} />
              <Text style={styles.seatImpactText}>
                National approval impact: {result.won ? '+2% for a strong by-election performance' : '-2% from a disappointing result'}
              </Text>
            </View>
          </View>

          {/* Campaign breakdown */}
          <View style={styles.campaignBreakdownCard}>
            <Text style={styles.sectionLabel}>CAMPAIGN PERFORMANCE BREAKDOWN</Text>
            {[
              { label: 'Party approval', contribution: Math.round(gameState.stats.approvalRating * 0.3), icon: 'poll' },
              { label: 'Candidate strength', contribution: Math.round((selectedCandidate?.strength || 0) * 0.3), icon: 'account-star' },
              { label: 'Campaign resources', contribution: totalBonus, icon: 'flag' },
              { label: 'Local factors', contribution: selectedCandidate?.local ? 5 : -3, icon: 'home-city' },
            ].map((item, i) => (
              <View key={i} style={styles.campaignBreakdownRow}>
                <MaterialCommunityIcons name={item.icon as any} size={13} color={Colors.textMuted} />
                <Text style={styles.campaignBreakdownLabel}>{item.label}</Text>
                <Text style={[styles.campaignBreakdownValue, { color: item.contribution >= 0 ? Colors.success : Colors.error }]}>
                  {item.contribution > 0 ? '+' : ''}{item.contribution}%
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={handleFinish}
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: resultColor }, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.primaryBtnText}>
              {result.won ? 'Congratulations — Return to Parliament' : 'Accept Result — Return to Parliament'}
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    );
  }

  return null;
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
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  urgencyText: { fontSize: 9, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },

  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },

  // Breaking news
  breakingCard: {
    backgroundColor: Colors.error + '0D',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error + '33',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  breakingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.error + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  breakingTagText: { fontSize: 9, fontWeight: FontWeight.extrabold, color: Colors.error, letterSpacing: 0.5 },
  breakingHeadline: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, lineHeight: 24 },
  breakingBody: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },

  // Riding card
  ridingCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  ridingHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ridingPartyBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm, borderWidth: 1 },
  ridingPartyText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, letterSpacing: 1 },
  ridingName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  ridingProvince: { fontSize: FontSize.xs, color: Colors.textSecondary },
  battlegroundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.gold + '22',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gold + '44',
  },
  battlegroundText: { fontSize: 8, fontWeight: FontWeight.extrabold, color: Colors.gold, letterSpacing: 0.5 },
  ridingStats: { flexDirection: 'row' },
  ridingStatItem: { flex: 1, alignItems: 'center', gap: 3 },
  ridingStatLabel: { fontSize: 9, color: Colors.textMuted },
  ridingStatValue: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  localIssues: { gap: 4 },
  localIssuesLabel: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  localIssueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  localIssueText: { fontSize: FontSize.xs, color: Colors.textSecondary },

  // Stakes
  stakesCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  stakesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  stakesText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },

  // Candidate cards
  candidateIntro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.info + '11',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.info + '22',
  },
  candidateIntroText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 18 },
  candidateCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: 8,
  },
  candidateCardSelected: { borderWidth: 2 },
  candidateCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  candidateAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candidateName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  candidateOccupation: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  candidateTypeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  candidateTypeText: { fontSize: 9, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },
  candidateStrengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  candidateStrengthLabel: { fontSize: FontSize.xs, color: Colors.textMuted, width: 100 },
  candidateStrengthTrack: {
    flex: 1,
    height: 6,
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceBorder,
  },
  candidateStrengthFill: { minWidth: 2 },
  candidateStrengthValue: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 28, textAlign: 'right' },
  candidateTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  candidateTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  candidateTagText: { fontSize: 9, color: Colors.textMuted, fontWeight: FontWeight.medium },

  // Campaign
  selectedCandidateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  selectedCandidateName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  selectedCandidateOcc: { fontSize: FontSize.xs, color: Colors.textSecondary },
  selectedCandidateStrength: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textSecondary },

  budgetCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  budgetBarTrack: {
    height: 8,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceBorder,
  },
  budgetBarFill: { minWidth: 2 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetUsed: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  budgetRemaining: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.medium },

  campaignBonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  campaignBonusLeft: { flex: 1, gap: 2 },
  campaignBonusLabel: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  campaignBonusValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  campaignBonusRight: { alignItems: 'flex-end' },
  campaignBonusResourceLabel: { fontSize: FontSize.xs, color: Colors.textMuted },

  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  resourceCardUsed: { backgroundColor: Colors.card },
  resourceIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: 2 },
  resourceDetails: { fontSize: FontSize.xs, color: Colors.textSecondary },
  resourceUsedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  resourceUsedText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  deployBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  deployBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  simulationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.info + '0D',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.info + '22',
  },
  simulationNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 18 },

  campaignFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  launchBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },

  // Loading
  loadingContainer: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  loadingSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary },
  loadingDots: { flexDirection: 'row', gap: 8 },
  loadingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gold },

  // Results
  resultCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 2,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resultOutcome: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, letterSpacing: 0.5, textAlign: 'center' },
  classificationBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  classificationText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, letterSpacing: 1 },
  resultMargin: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },

  voteResultCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  voteResultBarTrack: {
    height: 12,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 6,
    overflow: 'hidden',
  },
  voteResultBarPlayer: { height: '100%', borderRadius: 6 },
  voteResultRow: { flexDirection: 'row' },
  voteResultItem: { flex: 1, alignItems: 'center', gap: 4 },
  voteResultDot: { width: 10, height: 10, borderRadius: 5 },
  voteResultParty: { fontSize: FontSize.xs, color: Colors.textSecondary },
  voteResultPct: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },

  candidateResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  candidateResultName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  candidateResultOcc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  seatImpactCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  seatImpactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  seatImpactText: { flex: 1, fontSize: FontSize.xs, lineHeight: 18, color: Colors.textSecondary },

  campaignBreakdownCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: 8,
  },
  campaignBreakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  campaignBreakdownLabel: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  campaignBreakdownValue: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 40, textAlign: 'right' },
});
