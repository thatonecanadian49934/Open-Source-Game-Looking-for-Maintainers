
// Powered by OnSpace.AI — Supply & Opposition Days
// 22 annual allotted days, Main/Supplementary Estimates, Spring Economic Statement
// Confidence crisis if supply not passed by June 23 (week ~25)
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';

type SupplyView = 'overview' | 'opposition_day' | 'estimates' | 'spring_statement';
type EstimatesType = 'main' | 'supplementary_a' | 'supplementary_b' | 'supplementary_c';

interface OppositionDay {
  id: string;
  week: number;
  party: string;
  partyId: string;
  topic: string;
  motion: string;
  debated: boolean;
  votePassed: boolean | null;
  isConfidenceMotion: boolean;
  daysUsed: number; // cumulative
}

interface EstimatesVote {
  type: EstimatesType;
  amount: number;
  passed: boolean | null;
  week: number;
  departments: string[];
}

const ESTIMATES_INFO: Record<EstimatesType, { label: string; description: string; deadline: string; amount: string }> = {
  main: {
    label: 'Main Estimates',
    description: 'The primary spending plan for the fiscal year, tabled in February. Committees review departmental spending plans before the June 23 deadline.',
    deadline: 'June 23 (Week 25)',
    amount: '$420.6B',
  },
  supplementary_a: {
    label: 'Supplementary Estimates (A)',
    description: 'First set of supplementary spending requests, typically tabled in May. Covers additional spending requirements identified after Main Estimates.',
    deadline: 'May (Week 20)',
    amount: '$8.2B',
  },
  supplementary_b: {
    label: 'Supplementary Estimates (B)',
    description: 'Second supplementary estimates, tabled in November. Largest of the three supplementary estimates cycles.',
    deadline: 'November (Week 45)',
    amount: '$18.7B',
  },
  supplementary_c: {
    label: 'Supplementary Estimates (C)',
    description: 'Final supplementary estimates, tabled in February before year-end. Covers urgent spending needs and technical adjustments.',
    deadline: 'February (Week 8)',
    amount: '$4.1B',
  },
};

const OPPOSITION_DAY_TOPICS = [
  'Housing Affordability Crisis — Government Failure',
  'Cost of Living and Inflation — Demand Immediate Relief',
  'Healthcare System Collapse — Demand Federal Action',
  'Carbon Tax Impact on Working Canadians',
  'Foreign Interference — Call for Public Inquiry',
  'National Defence Underfunding — NATO Obligations',
  'Indigenous Reconciliation — Government Inaction',
  'Parliamentary Ethics — Conflict of Interest Failures',
  'Immigration System Backlog — Call for Reform',
  'Arctic Sovereignty — Demand Strategy',
  'Supply Chain Resilience — Critical Failures',
  'National Pharmacare — Failed Promises',
];

const DEPARTMENT_SPENDING: Record<string, { amount: string; icon: string; color: string }> = {
  'National Defence': { amount: '$36.8B', icon: 'shield-star', color: Colors.conservative },
  'Health Canada': { amount: '$62.3B', icon: 'hospital-box', color: Colors.error },
  'Infrastructure Canada': { amount: '$28.1B', icon: 'bridge', color: Colors.info },
  'IRCC': { amount: '$4.2B', icon: 'account-arrow-right', color: Colors.ndp },
  'Environment & Climate Change': { amount: '$11.7B', icon: 'leaf', color: Colors.green },
  'Indigenous Services': { amount: '$19.8B', icon: 'earth', color: Colors.gold },
  'Transport Canada': { amount: '$6.4B', icon: 'train', color: Colors.liberal },
  'Finance (Transfers)': { amount: '$97.3B', icon: 'cash-multiple', color: Colors.success },
  'National Security': { amount: '$8.9B', icon: 'eye', color: Colors.warning },
  'Science & Innovation': { amount: '$7.2B', icon: 'flask', color: Colors.ppc },
};

export default function SupplyOppositionDaysScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, callOppositionDay } = useGame();
  const { showAlert } = useAlert();

  const [view, setView] = useState<SupplyView>('overview');
  const [oppositionDays, setOppositionDays] = useState<OppositionDay[]>([]);
  const [estimates, setEstimates] = useState<EstimatesVote[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [motionText, setMotionText] = useState('');
  const [isConfidenceMotion, setIsConfidenceMotion] = useState(false);
  const [springStatementDebated, setSpringStatementDebated] = useState(false);
  const [springStatementImpact, setSpringStatementImpact] = useState<{ gdpChange: number; debtChange: number } | null>(null);

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const isGoverning = gameState.isGoverning;

  // Calculate opposition days used this parliamentary year
  const daysUsedThisYear = oppositionDays.filter(d => d.debated).length;
  const totalAllottedDays = 22;
  const daysRemaining = totalAllottedDays - daysUsedThisYear;

  // Check if we're past June 23 without supply
  const currentParliamentWeek = gameState.currentWeek;
  const isSupplyDeadline = currentParliamentWeek >= 25;
  const mainEstimatesPassed = estimates.some(e => e.type === 'main' && e.passed === true);
  const supplyConfidenceCrisis = isSupplyDeadline && !mainEstimatesPassed;

  // Seat allocation for opposition days (proportional)
  const totalSeats = Object.values(gameState.seats).reduce((a, b) => a + b, 0);
  const seatAllocation = PARTIES.filter(p => p.id !== (isGoverning ? 'liberal' : gameState.playerPartyId))
    .map(p => ({
      party: p,
      seats: gameState.seats[p.id] || 0,
      daysAllotted: Math.round(((gameState.seats[p.id] || 0) / totalSeats) * totalAllottedDays),
    }))
    .filter(a => a.seats > 0)
    .sort((a, b) => b.seats - a.seats);

  const handleDebateOppositionDay = () => {
    const topic = selectedTopic || customTopic;
    if (!topic.trim()) {
      showAlert('Select Topic', 'Choose a debate topic or enter a custom motion.');
      return;
    }
    if (!motionText.trim() || motionText.trim().split(/\s+/).length < 10) {
      showAlert('Motion Required', 'Provide a motion text of at least 10 words to put before the House.');
      return;
    }
    if (daysRemaining <= 0) {
      showAlert('No Days Remaining', 'Your party has used all allocated opposition days for this parliamentary year.');
      return;
    }
    if (isGoverning) {
      showAlert('Government Cannot Use Opposition Days', 'Opposition days are allocated to opposition parties by the House schedule. The government schedules its own business through Government Orders.');
      return;
    }

    // Simulate debate and vote
    const playerSeats = gameState.seats[gameState.playerPartyId] || 0;
    const govSeats = isGoverning ? playerSeats : Math.max(...Object.values(gameState.seats));
    const motionPassesChance = isConfidenceMotion
      ? (govSeats < 172 ? 0.45 : 0.15) // Harder to pass if majority gov
      : 0.35 + (Math.random() * 0.3);

    const votePassed = Math.random() < motionPassesChance;

    const newDay: OppositionDay = {
      id: `oppday_${Date.now()}`,
      week: gameState.currentWeek,
      party: party?.name || '',
      partyId: gameState.playerPartyId,
      topic,
      motion: motionText,
      debated: true,
      votePassed,
      isConfidenceMotion,
      daysUsed: daysUsedThisYear + 1,
    };

    setOppositionDays(prev => [...prev, newDay]);
    callOppositionDay?.();
    setSelectedTopic('');
    setCustomTopic('');
    setMotionText('');

    if (isConfidenceMotion && votePassed) {
      showAlert(
        'Government Falls — Non-Confidence Motion PASSED',
        `The House passed your non-confidence motion on "${topic}". The government has lost the confidence of the House. An election will be called within 36 days.\n\nThis is a historic result.`,
        [{ text: 'Proceed to Election', onPress: () => router.push('/election') }]
      );
    } else if (votePassed) {
      showAlert(
        'Opposition Motion Carried ✓',
        `The House passed your opposition day motion on "${topic}". While not binding on the government, this sends a strong political signal. The media coverage will damage government approval.`
      );
    } else {
      showAlert(
        'Motion Defeated',
        `The government defeated your opposition day motion on "${topic}". The debate put pressure on government ministers and generated media coverage, but did not result in a passed motion.`
      );
    }
  };

  const handleEstimatesVote = (type: EstimatesType) => {
    const info = ESTIMATES_INFO[type];
    const govSeats = isGoverning
      ? gameState.seats[gameState.playerPartyId] || 0
      : Math.max(...Object.values(gameState.seats));
    const passed = isGoverning ? govSeats >= 172 || Math.random() > 0.3 : Math.random() > 0.6;

    const departments = Object.keys(DEPARTMENT_SPENDING).slice(0, 6);
    const newEstimate: EstimatesVote = {
      type,
      amount: parseFloat(info.amount.replace(/[$B,]/g, '')),
      passed,
      week: gameState.currentWeek,
      departments,
    };

    setEstimates(prev => [...prev.filter(e => e.type !== type), newEstimate]);

    if (passed) {
      showAlert(
        `${info.label} Passed ✓`,
        `The House has approved ${info.label} ($${info.amount}). The government is authorized to spend these funds for the fiscal year.${type === 'main' ? ' Supply is secured — no confidence crisis.' : ''}`
      );
    } else {
      if (type === 'main') {
        showAlert(
          'Supply Defeated — CONFIDENCE CRISIS',
          `The House has defeated the Main Estimates (${info.amount}). Without supply, the government cannot spend public money. This constitutes a loss of confidence — an election must be called.`, // Added missing closing backtick and comma
          [{ text: 'Trigger Election', style: 'destructive', onPress: () => router.push('/election') }]
        );
      } else {
        showAlert(
          `${info.label} Defeated`,
          `The House has voted against the ${info.label}. The departments must operate within existing appropriations until a new supply vote is scheduled.`
        );
      }
    }
  };

  const handleSpringStatement = () => {
    const gdpChange = (Math.random() * 2 - 0.5);
    const debtChange = Math.random() * 30 + 5;
    setSpringStatementDebated(true);
    setSpringStatementImpact({ gdpChange, debtChange });

    showAlert(
      'Spring Economic Statement Tabled',
      `The Spring Economic Statement updates the government's fiscal projections.\n\nRevised GDP growth: ${gdpChange > 0 ? '+' : ''}${gdpChange.toFixed(1)}%\nRevised deficit: +$${Math.round(debtChange)}B\n\nOpposition parties are demanding a full budget. The PBO will release an independent analysis.`
    );
  };

  // ── OVERVIEW ───────────────────────────────────────────────────────────────
  if (view === 'overview') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Supply & Opposition Days</Text>
            <Text style={styles.headerSub}>
              {isGoverning ? 'Government Business of Supply' : 'Business of Supply — House of Commons'}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Supply confidence crisis warning */}
          {supplyConfidenceCrisis ? (
            <View style={styles.crisisCard}>
              <MaterialCommunityIcons name="alert-octagram" size={20} color={Colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.crisisTitle}>SUPPLY CONFIDENCE CRISIS</Text>
                <Text style={styles.crisisText}>
                  The June 23 deadline has passed without the Main Estimates being approved. The government cannot legally spend public money. An election may be triggered if supply is not restored.
                </Text>
              </View>
            </View>
          ) : isSupplyDeadline && !mainEstimatesPassed ? (
            <View style={[styles.crisisCard, { borderColor: Colors.warning + '44', backgroundColor: Colors.warning + '08' }]}>
              <MaterialCommunityIcons name="alert" size={18} color={Colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.crisisTitle, { color: Colors.warning }]}>SUPPLY DEADLINE APPROACHING</Text>
                <Text style={styles.crisisText}>
                  Main Estimates must pass before June 23 (Week 25). Current week: {currentParliamentWeek}. Failure to pass supply is a confidence matter.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Opposition Days Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>ALLOTTED DAYS — {new Date().getFullYear()} PARLIAMENTARY YEAR</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryStatValue, { color: partyColor }]}>{daysRemaining}</Text>
                <Text style={styles.summaryStatLabel}>Days Remaining</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryStatValue, { color: Colors.textSecondary }]}>{daysUsedThisYear}</Text>
                <Text style={styles.summaryStatLabel}>Days Used</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryStatValue, { color: Colors.gold }]}>{totalAllottedDays}</Text>
                <Text style={styles.summaryStatLabel}>Total Allotted</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressBarFill, { flex: daysUsedThisYear, backgroundColor: partyColor }]} />
              <View style={{ flex: daysRemaining, backgroundColor: Colors.surfaceBorder }} />
            </View>
            <Text style={styles.summaryNote}>
              The 22 allotted days are distributed among opposition parties proportionally by seat count. These days are typically held at the end of a supply period.
            </Text>
          </View>

          {/* Party day allocations */}
          <Text style={styles.sectionLabel}>PARTY ALLOCATIONS — ALLOTTED DAYS</Text>
          {seatAllocation.slice(0, 4).map(({ party: p, seats, daysAllotted }) => (
            <View key={p.id} style={styles.partyAllocationCard}>
              <View style={[styles.partyColorDot, { backgroundColor: p.color }]} />
              <Text style={styles.partyAllocationName}>{p.name}</Text>
              <Text style={styles.partyAllocationSeats}>{seats} seats</Text>
              <View style={[styles.daysAllottedBadge, { backgroundColor: p.color + '22' }]}>
                <Text style={[styles.daysAllottedText, { color: p.color }]}>{daysAllotted} days</Text>
              </View>
            </View>
          ))}

          {/* Quick navigation */}
          <Text style={styles.sectionLabel}>BUSINESS OF SUPPLY</Text>
          <View style={styles.navGrid}>
            {!isGoverning ? (
              <Pressable
                onPress={() => setView('opposition_day')}
                style={({ pressed }) => [styles.navCard, pressed && { opacity: 0.85 }]}
              >
                <MaterialCommunityIcons name="account-voice" size={28} color={partyColor} />
                <Text style={styles.navCardTitle}>Opposition Day</Text>
                <Text style={styles.navCardDesc}>Debate and vote on your chosen motion</Text>
                <View style={[styles.navCardBadge, { backgroundColor: daysRemaining > 0 ? partyColor + '22' : Colors.error + '22' }]}>
                  <Text style={[styles.navCardBadgeText, { color: daysRemaining > 0 ? partyColor : Colors.error }]}>
                    {daysRemaining} days left
                  </Text>
                </View>
              </Pressable>
            ) : (
              <View style={[styles.navCard, { opacity: 0.6 }]}>
                <MaterialCommunityIcons name="account-voice" size={28} color={Colors.textMuted} />
                <Text style={styles.navCardTitle}>Opposition Days</Text>
                <Text style={styles.navCardDesc}>Allocated to opposition parties. Government schedules Government Orders.</Text>
                <View style={[styles.navCardBadge, { backgroundColor: Colors.textMuted + '22' }]}>
                  <Text style={[styles.navCardBadgeText, { color: Colors.textMuted }]}>Opposition Only</Text>
                </View>
              </View>
            )}
            <Pressable
              onPress={() => setView('estimates')}
              style={({ pressed }) => [styles.navCard, pressed && { opacity: 0.85 }]}
            >
              <MaterialCommunityIcons name="currency-usd" size={28} color={Colors.success} />
              <Text style={styles.navCardTitle}>Estimates</Text>
              <Text style={styles.navCardDesc}>Review and vote on government spending</Text>
              <View style={[styles.navCardBadge, { backgroundColor: mainEstimatesPassed ? Colors.success + '22' : Colors.warning + '22' }]}>
                <Text style={[styles.navCardBadgeText, { color: mainEstimatesPassed ? Colors.success : Colors.warning }]}>
                  {mainEstimatesPassed ? 'Supply secured' : 'Pending vote'}
                </Text>
              </View>
            </Pressable>
          </View>
          <Pressable
            onPress={() => setView('spring_statement')}
            style={({ pressed }) => [styles.springStatementCard, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="chart-timeline-variant" size={22} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.springStatementTitle}>Spring Economic Statement</Text>
              <Text style={styles.springStatementDesc}>Mid-year fiscal update with revised projections</Text>
            </View>
            <View style={[styles.navCardBadge, { backgroundColor: springStatementDebated ? Colors.success + '22' : Colors.gold + '22' }]}>
              <Text style={[styles.navCardBadgeText, { color: springStatementDebated ? Colors.success : Colors.gold }]}>
                {springStatementDebated ? 'Tabled' : 'Pending'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
          </Pressable>

          {/* Past opposition days */}
          {oppositionDays.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>PAST OPPOSITION DAYS</Text>
              {oppositionDays.slice().reverse().map(day => (
                <View key={day.id} style={styles.pastDayCard}>
                  <View style={styles.pastDayHeader}>
                    <MaterialCommunityIcons
                      name={day.votePassed ? 'check-circle' : 'close-circle'}
                      size={14}
                      color={day.votePassed ? Colors.success : Colors.error}
                    />
                    <Text style={[styles.pastDayResult, { color: day.votePassed ? Colors.success : Colors.error }]}>
                      {day.votePassed ? 'MOTION CARRIED' : 'MOTION DEFEATED'}
                    </Text>
                    {day.isConfidenceMotion ? (
                      <View style={styles.confidenceBadge}>
                        <Text style={styles.confidenceBadgeText}>CONFIDENCE</Text>
                      </View>
                    ) : null}
                    <Text style={styles.pastDayWeek}>Week {day.week}</Text>
                  </View>
                  <Text style={styles.pastDayTopic}>{day.topic}</Text>
                  <Text style={styles.pastDayMotion} numberOfLines={2}>{day.motion}</Text>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  // ── OPPOSITION DAY ─────────────────────────────────────────────────────────
  if (view === 'opposition_day') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setView('overview')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Opposition Day</Text>
            <Text style={styles.headerSub}>{daysRemaining} allotted days remaining</Text>
          </View>
          <View style={[styles.daysBadge, { backgroundColor: daysRemaining > 5 ? Colors.success + '22' : Colors.error + '22' }]}>
            <Text style={[styles.daysBadgeText, { color: daysRemaining > 5 ? Colors.success : Colors.error }]}>{daysRemaining} left</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.oppDayInfo}>
            <MaterialCommunityIcons name="information" size={13} color={Colors.info} />
            <Text style={styles.oppDayInfoText}>
              On an opposition day (allotted day), the opposition party chooses the topic for debate. A votable motion is put before the House at the end of the debate. The opposition can also use these days to move non-confidence motions.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>CHOOSE DEBATE TOPIC</Text>
          {OPPOSITION_DAY_TOPICS.map(topic => (
            <Pressable
              key={topic}
              onPress={() => { setSelectedTopic(topic); setCustomTopic(''); }}
              style={({ pressed }) => [
                styles.topicCard,
                selectedTopic === topic && { borderColor: partyColor, backgroundColor: partyColor + '0D' },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons
                name={selectedTopic === topic ? 'radiobox-marked' : 'radiobox-blank'}
                size={18}
                color={selectedTopic === topic ? partyColor : Colors.textMuted}
              />
              <Text style={[styles.topicCardText, selectedTopic === topic && { color: partyColor, fontWeight: FontWeight.semibold }]}>
                {topic}
              </Text>
            </Pressable>
          ))}

          <Text style={styles.sectionLabel}>OR ENTER CUSTOM TOPIC</Text>
          <TextInput
            style={styles.customTopicInput}
            placeholder="Enter a custom debate topic..."
            placeholderTextColor={Colors.textMuted}
            value={customTopic}
            onChangeText={(t) => { setCustomTopic(t); setSelectedTopic(''); }}
          />

          <Text style={styles.sectionLabel}>MOTION TEXT</Text>
          <TextInput
            style={styles.motionInput}
            multiline
            numberOfLines={4}
            placeholder={`Write the votable motion for the House. Example: "That this House condemn the government's failure to address the housing crisis and call for immediate action..."`}
            placeholderTextColor={Colors.textMuted}
            value={motionText}
            onChangeText={setMotionText}
            textAlignVertical="top"
          />

          {/* Confidence motion option */}
          <Pressable
            onPress={() => setIsConfidenceMotion(!isConfidenceMotion)}
            style={[styles.confidenceToggle, isConfidenceMotion && { borderColor: Colors.error + '66', backgroundColor: Colors.error + '08' }]}
          >
            <MaterialCommunityIcons
              name={isConfidenceMotion ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={20}
              color={isConfidenceMotion ? Colors.error : Colors.textMuted}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.confidenceToggleTitle, isConfidenceMotion && { color: Colors.error }]}>
                Non-Confidence Motion
              </Text>
              <Text style={styles.confidenceToggleDesc}>
                If this motion passes, the government falls and an election is called. Higher risk but maximum political impact.
              </Text>
            </View>
          </Pressable>

          {isConfidenceMotion ? (
            <View style={styles.confidenceWarning}>
              <MaterialCommunityIcons name="alert-octagram" size={14} color={Colors.error} />
              <Text style={styles.confidenceWarningText}>
                A passed non-confidence motion triggers a constitutional obligation to call an election within 36 days. This is the nuclear option in parliamentary democracy.
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleDebateOppositionDay}
            disabled={(!selectedTopic && !customTopic) || !motionText.trim() || daysRemaining <= 0}
            style={({ pressed }) => [
              styles.debateBtn,
              { backgroundColor: isConfidenceMotion ? Colors.error : partyColor },
              ((!selectedTopic && !customTopic) || !motionText.trim() || daysRemaining <= 0) && { opacity: 0.4 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <MaterialCommunityIcons name={isConfidenceMotion ? 'vote' : 'account-voice'} size={18} color="#fff" />
            <Text style={styles.debateBtnText}>
              {isConfidenceMotion ? 'Move Non-Confidence Motion' : 'Hold Opposition Day Debate'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── ESTIMATES ──────────────────────────────────────────────────────────────
  if (view === 'estimates') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setView('overview')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Estimates — Business of Supply</Text>
            <Text style={styles.headerSub}>Main and Supplementary Estimates</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.estimatesIntro}>
            <MaterialCommunityIcons name="information" size={13} color={Colors.info} />
            <Text style={styles.estimatesIntroText}>
              Estimates must be approved by Parliament to authorize government spending. The Main Estimates must pass by June 23 (Week 25). Failure to pass supply is a matter of confidence.
            </Text>
          </View>

          {(Object.entries(ESTIMATES_INFO) as [EstimatesType, typeof ESTIMATES_INFO[EstimatesType]][]).map(([type, info]) => {
            const existingVote = estimates.find(e => e.type === type);
            const isMainEstimates = type === 'main';
            const isUrgent = isMainEstimates && currentParliamentWeek >= 20;

            return (
              <View key={type} style={[styles.estimatesCard, isUrgent && !existingVote && { borderColor: Colors.warning + '55' }]}>
                <View style={styles.estimatesCardHeader}>
                  <MaterialCommunityIcons
                    name={existingVote?.passed ? 'check-circle' : existingVote?.passed === false ? 'close-circle' : 'clock-outline'}
                    size={18}
                    color={existingVote?.passed ? Colors.success : existingVote?.passed === false ? Colors.error : Colors.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.estimatesCardTitle}>{info.label}</Text>
                    <Text style={styles.estimatesDeadline}>Deadline: {info.deadline}</Text>
                  </View>
                  <Text style={[styles.estimatesAmount, { color: Colors.success }]}>{info.amount}</Text>
                </View>
                <Text style={styles.estimatesDesc}>{info.description}</Text>

                {isMainEstimates ? (
                  <View style={styles.departmentGrid}>
                    {Object.entries(DEPARTMENT_SPENDING).slice(0, 6).map(([dept, { amount, icon, color }]) => (
                      <View key={dept} style={styles.departmentItem}>
                        <MaterialCommunityIcons name={icon as any} size={12} color={color} />
                        <Text style={styles.departmentName}>{dept}</Text>
                        <Text style={[styles.departmentAmount, { color }]}>{amount}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {existingVote ? (
                  <View style={[styles.voteResultBadge, { backgroundColor: existingVote.passed ? Colors.success + '11' : Colors.error + '11', borderColor: existingVote.passed ? Colors.success + '44' : Colors.error + '44' }]}>
                    <MaterialCommunityIcons name={existingVote.passed ? 'check-decagram' : 'close-octagon'} size={13} color={existingVote.passed ? Colors.success : Colors.error} />
                    <Text style={[styles.voteResultBadgeText, { color: existingVote.passed ? Colors.success : Colors.error }]}>
                      {existingVote.passed ? 'SUPPLY APPROVED' : 'SUPPLY DEFEATED'} — Week {existingVote.week}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.estimatesActions}>
                    <Pressable
                      onPress={() => handleEstimatesVote(type)}
                      style={({ pressed }) => [styles.estimatesVoteBtn, { backgroundColor: isUrgent ? Colors.warning : partyColor }, pressed && { opacity: 0.85 }]}
                    >
                      <MaterialCommunityIcons name="vote" size={14} color="#fff" />
                      <Text style={styles.estimatesVoteBtnText}>
                        {isGoverning ? 'Table & Vote' : 'Force Vote on Estimates'}
                      </Text>
                    </Pressable>
                    {!isGoverning ? (
                      <Pressable
                        onPress={() => showAlert('Block Supply', `Your party can attempt to defeat the ${info.label} as a confidence matter. This would force an election.`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Block Supply', style: 'destructive', onPress: () => handleEstimatesVote(type) },
                        ])}
                        style={({ pressed }) => [styles.blockBtn, pressed && { opacity: 0.8 }]}
                      >
                        <MaterialCommunityIcons name="block-helper" size={14} color={Colors.error} />
                        <Text style={styles.blockBtnText}>Block Supply</Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}

                {isUrgent && !existingVote ? (
                  <View style={styles.urgentNote}>
                    <MaterialCommunityIcons name="alert" size={11} color={Colors.warning} />
                    <Text style={styles.urgentNoteText}>
                      Week {currentParliamentWeek} — supply must pass by Week 25 or a confidence crisis will be triggered.
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ── SPRING ECONOMIC STATEMENT ──────────────────────────────────────────────
  if (view === 'spring_statement') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setView('overview')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Spring Economic Statement</Text>
            <Text style={styles.headerSub}>Mid-year fiscal update</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.springCard}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={32} color={Colors.gold} />
            <Text style={styles.springTitle}>Fall Economic Statement / Spring Update</Text>
            <Text style={styles.springDesc}>
              The Spring Economic Statement provides a mid-year update on the government's fiscal position. Unlike a full budget, it does not require confidence vote but updates projections, announces targeted measures, and prepares Parliament for the Fall Economic Statement.
            </Text>
          </View>

          {springStatementDebated && springStatementImpact ? (
            <>
              <View style={styles.springResultCard}>
                <Text style={styles.sectionLabel}>REVISED PROJECTIONS</Text>
                <View style={styles.springResultRow}>
                  <Text style={styles.springResultLabel}>GDP Growth</Text>
                  <Text style={[styles.springResultValue, { color: springStatementImpact.gdpChange >= 0 ? Colors.success : Colors.error }]}>
                    {springStatementImpact.gdpChange >= 0 ? '+' : ''}{springStatementImpact.gdpChange.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.springResultRow}>
                  <Text style={styles.springResultLabel}>Revised Deficit</Text>
                  <Text style={[styles.springResultValue, { color: Colors.error }]}>
                    +${Math.round(springStatementImpact.debtChange)}B
                  </Text>
                </View>
                <View style={styles.springResultRow}>
                  <Text style={styles.springResultLabel}>PBO Assessment</Text>
                  <Text style={[styles.springResultValue, { color: Colors.warning }]}>Projections diverge</Text>
                </View>
              </View>

              <View style={styles.oppositionResponseCard}>
                <MaterialCommunityIcons name="account-voice" size={16} color={Colors.error} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.oppRespTitle}>Opposition Response</Text>
                  <Text style={styles.oppRespText}>
                    "The Spring Economic Statement shows a government that has lost control of the public finances. The revised deficit figures confirm what we have been saying for months — this government cannot manage the economy."
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              {isGoverning ? (
                <Pressable
                  onPress={handleSpringStatement}
                  style={({ pressed }) => [styles.tableStatementBtn, { backgroundColor: Colors.gold }, pressed && { opacity: 0.85 }]}
                >
                  <MaterialCommunityIcons name="podium" size={18} color="#fff" />
                  <Text style={styles.tableStatementBtnText}>Table Spring Economic Statement</Text>
                </Pressable>
              ) : (
                <View style={styles.noAccessCard}>
                  <MaterialCommunityIcons name="lock" size={32} color={Colors.textMuted} />
                  <Text style={styles.noAccessText}>Only the governing party tables the Economic Statement</Text>
                  <Text style={styles.noAccessSub}>You can debate and critique it during opposition days once tabled.</Text>
                </View>
              )}
            </>
          )}
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
  daysBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  daysBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  crisisCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.error + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error + '44', padding: Spacing.md },
  crisisTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold, color: Colors.error, marginBottom: 4, letterSpacing: 0.5 },
  crisisText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  summaryCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 10 },
  summaryTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryStat: { alignItems: 'center' },
  summaryStatValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  summaryStatLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  progressBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.surfaceBorder },
  progressBarFill: { borderRadius: 4 },
  summaryNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
  partyAllocationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm, gap: 8 },
  partyColorDot: { width: 10, height: 10, borderRadius: 5 },
  partyAllocationName: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  partyAllocationSeats: { fontSize: FontSize.xs, color: Colors.textMuted },
  daysAllottedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  daysAllottedText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  navGrid: { flexDirection: 'row', gap: Spacing.sm },
  navCard: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 6, alignItems: 'flex-start' },
  navCardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  navCardDesc: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
  navCardBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, marginTop: 4 },
  navCardBadgeText: { fontSize: 9, fontWeight: FontWeight.bold },
  springStatementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.md, gap: Spacing.sm },
  springStatementTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  springStatementDesc: { fontSize: FontSize.xs, color: Colors.textSecondary },
  pastDayCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 4 },
  pastDayHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pastDayResult: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },
  confidenceBadge: { backgroundColor: Colors.error + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  confidenceBadgeText: { fontSize: 8, fontWeight: FontWeight.bold, color: Colors.error },
  pastDayWeek: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' },
  pastDayTopic: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  pastDayMotion: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17, fontStyle: 'italic' },
  // Opposition day
  oppDayInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.info + '0D', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.info + '22' },
  oppDayInfoText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 18 },
  topicCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm },
  topicCardText: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary },
  customTopicInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.sm, paddingVertical: 10, fontSize: FontSize.xs, color: Colors.textPrimary },
  motionInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, fontSize: FontSize.xs, color: Colors.textPrimary, minHeight: 100, lineHeight: 20 },
  confidenceToggle: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  confidenceToggleTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  confidenceToggleDesc: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17, marginTop: 2 },
  confidenceWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.error + '0D', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.error + '33' },
  confidenceWarningText: { flex: 1, fontSize: FontSize.xs, color: Colors.error, lineHeight: 17 },
  debateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  debateBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  // Estimates
  estimatesIntro: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.warning + '08', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.warning + '22' },
  estimatesIntroText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, lineHeight: 18 },
  estimatesCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 10 },
  estimatesCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  estimatesCardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, flex: 1 },
  estimatesDeadline: { fontSize: FontSize.xs, color: Colors.textMuted },
  estimatesAmount: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold },
  estimatesDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  departmentGrid: { gap: 4 },
  departmentItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  departmentName: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  departmentAmount: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  voteResultBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.sm, padding: 8, borderWidth: 1 },
  voteResultBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  estimatesActions: { flexDirection: 'row', gap: 8 },
  estimatesVoteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Radius.sm },
  estimatesVoteBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#fff' },
  blockBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.sm, paddingVertical: 10, borderRadius: Radius.sm, backgroundColor: Colors.error + '11', borderWidth: 1, borderColor: Colors.error + '33' },
  blockBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.error },
  urgentNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.warning + '0D', borderRadius: Radius.sm, padding: 6 },
  urgentNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning },
  // Spring statement
  springCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  springTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.gold, textAlign: 'center' },
  springDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  springResultCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 10 },
  springResultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  springResultLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  springResultValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  oppositionResponseCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.error + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error + '22', padding: Spacing.md },
  oppRespTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.error, marginBottom: 4 },
  oppRespText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18, fontStyle: 'italic' },
  tableStatementBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  tableStatementBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  noAccessCard: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  noAccessText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary, textAlign: 'center' },
  noAccessSub: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
