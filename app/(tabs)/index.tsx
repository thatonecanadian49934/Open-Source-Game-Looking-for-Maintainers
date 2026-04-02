// Powered by OnSpace.AI — Dashboard with save game, fixed election navigation, fixed advance button
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { EventCard } from '@/components/ui/EventCard';
import { StatCard } from '@/components/ui/StatCard';
import { ParliamentBar } from '@/components/feature/ParliamentBar';
import { PARTIES } from '@/constants/parties';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { MAJORITY_SEATS } from '@/constants/provinces';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const {
    gameState, bills, advanceWeek, callConfidenceVote, dissolveParliament,
    byElectionTrigger, dismissByElection, saveGame,
  } = useGame();
  const [eventChoices, setEventChoices] = useState<Record<string, string>>({});
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Auto-navigate to election when election is triggered via week advance
  useEffect(() => {
    if (gameState?.inElection && gameState?.electionTriggered) {
      router.push('/election');
    }
  }, [gameState?.inElection, gameState?.electionTriggered]);

  if (!gameState) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: Colors.textSecondary }}>Loading game...</Text>
      </View>
    );
  }

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const playerSeats = gameState.seats[gameState.playerPartyId] || 0;
  const govStatus = playerSeats >= MAJORITY_SEATS ? 'Majority Government' :
    gameState.isGoverning ? 'Minority Government' : 'Official Opposition';

  const year = 2025 + Math.floor(gameState.totalWeeks / 52);

  const handleEventChoice = useCallback((eventId: string, choiceId: string) => {
    setEventChoices(prev => ({ ...prev, [eventId]: choiceId }));
  }, []);

  // Gate: can only advance if all events responded + all vote-stage bills voted on
  const pendingEvents = gameState.currentEvents.filter(e => !eventChoices[e.id]);
  const voteStageBills = (bills || []).filter(b =>
    (b.stage === 'house_second_reading' || b.stage === 'house_third_reading' ||
     b.stage === 'senate_second_reading' || b.stage === 'senate_third_reading') &&
    b.stage !== 'defeated' && b.stage !== 'royal_assent'
  );
  const unvotedBills = voteStageBills.filter(b => !b.playerVote);
  const canAdvance = pendingEvents.length === 0 && unvotedBills.length === 0;

  const handleAdvanceWeek = useCallback(() => {
    if (isAdvancing || !canAdvance) return;
    setIsAdvancing(true);
    setTimeout(() => {
      advanceWeek(eventChoices);
      setEventChoices({});
      setIsAdvancing(false);
    }, 300);
  }, [isAdvancing, canAdvance, eventChoices, advanceWeek]);

  const handleAdvanceAttempt = useCallback(() => {
    if (pendingEvents.length > 0) {
      showAlert('Respond to Events First', `You must respond to ${pendingEvents.length} event(s) before advancing.`);
      return;
    }
    if (unvotedBills.length > 0) {
      showAlert('Vote Required', `${unvotedBills.length} bill(s) need your vote in the Parliament tab.`);
      return;
    }
    handleAdvanceWeek();
  }, [pendingEvents, unvotedBills, handleAdvanceWeek, showAlert]);

  const handleConfidenceVote = useCallback(() => {
    showAlert(
      'Call Confidence Vote',
      'Force a vote on whether the government retains House confidence. If the government falls, an election is called immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Vote',
          style: 'destructive',
          onPress: () => {
            const result = callConfidenceVote();
            if (result.passed) {
              // Context sets inElection = true; navigate directly to election
              router.push('/election');
            } else {
              showAlert('Government Survives', result.message);
            }
          },
        },
      ]
    );
  }, [callConfidenceVote, showAlert, router]);

  const handleDissolveParliament = useCallback(() => {
    showAlert(
      'Dissolve Parliament',
      'Call a snap election immediately. The 4-week campaign starts now.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dissolve',
          style: 'destructive',
          onPress: () => {
            dissolveParliament();
            // Context initializes campaign and sets inElection = true
            router.push('/election');
          },
        },
      ]
    );
  }, [dissolveParliament, showAlert, router]);

  const handleSaveGame = useCallback(async () => {
    await saveGame();
    showAlert('Game Saved', 'Your progress has been saved. You can load it from the main menu.');
  }, [saveGame, showAlert]);

  const handleBackToMenu = useCallback(() => {
    showAlert(
      'Return to Main Menu?',
      'Your current session will not be auto-saved. Save first to keep your progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save & Exit', onPress: async () => { await saveGame(); router.replace('/setup'); } },
        { text: 'Exit Without Saving', style: 'destructive', onPress: () => router.replace('/setup') },
      ]
    );
  }, [saveGame, router, showAlert]);

  const electionsIn = 208 - gameState.currentWeek;
  const partyColor = party?.color || Colors.primary;

  const advanceBtnLabel = isAdvancing ? 'Processing...'
    : pendingEvents.length > 0 ? `Respond to ${pendingEvents.length} event(s) first`
    : unvotedBills.length > 0 ? `Vote on ${unvotedBills.length} bill(s) first`
    : `Advance to Week ${gameState.currentWeek + 1}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: partyColor + '44' }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.partyBadge, { backgroundColor: partyColor + '22', borderColor: partyColor + '44' }]}>
            <Text style={[styles.partyBadgeText, { color: partyColor }]}>{party?.shortName}</Text>
          </View>
          <View>
            <Text style={styles.playerName}>{gameState.playerName}</Text>
            <Text style={styles.playerRole}>Party Leader</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.timeDisplay}>
            <Text style={styles.timeWeek}>Week {gameState.currentWeek}</Text>
            <Text style={styles.timeYear}>{year}</Text>
          </View>
          <View style={[styles.govStatusBadge, gameState.isGoverning ? { backgroundColor: Colors.success + '22' } : { backgroundColor: Colors.warning + '22' }]}>
            <Text style={[styles.govStatusText, gameState.isGoverning ? { color: Colors.success } : { color: Colors.warning }]}>
              {gameState.isGoverning ? '⚡ PM' : '⚔ OPP'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 130 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Parliament Status */}
        <View style={styles.section}>
          <ParliamentBar seats={gameState.seats} playerPartyId={gameState.playerPartyId} />
        </View>

        {/* Key Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PARTY LEADERSHIP METRICS</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Approval" value={`${Math.round(gameState.stats.approvalRating)}%`} color={gameState.stats.approvalRating > 40 ? Colors.success : Colors.error} trend={gameState.stats.approvalRating > 40 ? 'up' : 'down'} />
            <StatCard label="Party Standing" value={`${Math.round(gameState.stats.partyStanding)}%`} color={Colors.gold} />
          </View>
          <View style={styles.statsGrid}>
            <StatCard label="GDP Growth" value={`${gameState.stats.gdpGrowth.toFixed(1)}%`} color={gameState.stats.gdpGrowth > 0 ? Colors.success : Colors.error} trend={gameState.stats.gdpGrowth > 0 ? 'up' : 'down'} />
            <StatCard label="Inflation" value={`${gameState.stats.inflationRate.toFixed(1)}%`} color={gameState.stats.inflationRate > 3 ? Colors.error : Colors.success} />
          </View>
          <View style={styles.statsGrid}>
            <StatCard label="Unemployment" value={`${gameState.stats.unemploymentRate.toFixed(1)}%`} color={gameState.stats.unemploymentRate > 7 ? Colors.error : Colors.success} />
            <StatCard label="Nat'l Debt" value={`$${Math.round(gameState.stats.nationalDebt)}B`} color={Colors.textSecondary} />
          </View>
          {gameState.isGoverning ? (
            <View style={styles.statsGrid}>
              <StatCard label="Gov't Approval" value={`${Math.round(gameState.stats.governmentApproval)}%`} color={gameState.stats.governmentApproval > 40 ? Colors.success : Colors.error} />
              <StatCard label="Your Seats" value={playerSeats} subtitle={govStatus} color={partyColor} />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <StatCard label="Your Seats" value={playerSeats} subtitle={govStatus} color={partyColor} />
              <StatCard label="To Majority" value={Math.max(0, MAJORITY_SEATS - playerSeats)} subtitle="seats needed" color={Colors.warning} />
            </View>
          )}
        </View>

        {/* Minority government warning */}
        {gameState.isGoverning && !gameState.isMajority ? (
          <View style={styles.minorityWarning}>
            <MaterialCommunityIcons name="alert" size={14} color={Colors.warning} />
            <Text style={styles.minorityWarningText}>
              Minority government — keep approval high or opposition may trigger a confidence vote.
            </Text>
          </View>
        ) : null}

        {/* By-Election Alert */}
        {byElectionTrigger ? (
          <View style={styles.byElectionBanner}>
            <View style={styles.byElectionBannerLeft}>
              <MaterialCommunityIcons name="alert-circle" size={18} color={Colors.warning} />
              <View>
                <Text style={styles.byElectionTitle}>By-Election Triggered</Text>
                <Text style={styles.byElectionSub}>{byElectionTrigger.provinceCode} — {byElectionTrigger.reason}</Text>
              </View>
            </View>
            <View style={styles.byElectionActions}>
              <Pressable onPress={() => router.push('/by-election')} style={({ pressed }) => [styles.byElectionBtn, { backgroundColor: Colors.warning }, pressed && { opacity: 0.85 }]}>
                <Text style={styles.byElectionBtnText}>Campaign</Text>
              </Pressable>
              <Pressable onPress={() => dismissByElection?.()} style={({ pressed }) => [styles.byElectionDismiss, pressed && { opacity: 0.7 }]}>
                <MaterialCommunityIcons name="close" size={14} color={Colors.textMuted} />
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Election Countdown */}
        <View style={styles.electionCountdown}>
          <View style={styles.electionCountdownLeft}>
            <MaterialCommunityIcons name="calendar-clock" size={20} color={Colors.gold} />
            <View>
              <Text style={styles.electionCountdownTitle}>Next Election</Text>
              <Text style={styles.electionCountdownSub}>
                {electionsIn > 0 ? `In ${electionsIn} weeks (${Math.ceil(electionsIn / 52)} yrs)` : 'ELECTION IMMINENT'}
              </Text>
            </View>
          </View>
          {gameState.isGoverning ? (
            <Pressable onPress={handleDissolveParliament} style={({ pressed }) => [styles.dissolveBtn, pressed && { opacity: 0.7 }]}>
              <Text style={styles.dissolveBtnText}>Dissolve</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Week gate indicator */}
        {(pendingEvents.length > 0 || unvotedBills.length > 0) ? (
          <View style={styles.gateCard}>
            <MaterialCommunityIcons name="lock-clock" size={16} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.gateTitle}>Complete before advancing:</Text>
              {pendingEvents.length > 0 ? <Text style={styles.gateItem}>• Respond to {pendingEvents.length} event(s) below</Text> : null}
              {unvotedBills.length > 0 ? <Text style={styles.gateItem}>• Vote on {unvotedBills.length} bill(s) in Parliament tab</Text> : null}
            </View>
          </View>
        ) : (
          <View style={styles.gateReadyCard}>
            <MaterialCommunityIcons name="check-circle" size={14} color={Colors.success} />
            <Text style={styles.gateReadyText}>All actions complete — ready to advance</Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIONS THIS WEEK</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.actionsRow}>
              <Pressable onPress={() => router.push('/press-statement')} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}>
                <MaterialCommunityIcons name="microphone" size={22} color={Colors.gold} />
                <Text style={styles.actionText}>Press Statement</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/question-period')} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}>
                <MaterialCommunityIcons name="comment-question" size={22} color={Colors.info} />
                <Text style={styles.actionText}>Question Period</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/policy')} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}>
                <MaterialCommunityIcons name="file-document-edit" size={22} color={Colors.success} />
                <Text style={styles.actionText}>Policy Platform</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/party-leader-contact')} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}>
                <MaterialCommunityIcons name="handshake" size={22} color={Colors.gold} />
                <Text style={styles.actionText}>Leader Contacts</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/parliamentary-schedule')} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}>
                <MaterialCommunityIcons name="calendar-month" size={22} color={Colors.info} />
                <Text style={styles.actionText}>Parl. Schedule</Text>
              </Pressable>
              {gameState.isGoverning ? (
                <Pressable onPress={() => router.push('/foreign-policy')} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}>
                  <MaterialCommunityIcons name="earth" size={22} color={Colors.success} />
                  <Text style={styles.actionText}>Foreign Policy</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={handleSaveGame} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}>
                <MaterialCommunityIcons name="content-save" size={22} color={Colors.success} />
                <Text style={styles.actionText}>Save Game</Text>
              </Pressable>
              <Pressable onPress={handleBackToMenu} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}>
                <MaterialCommunityIcons name="home-import-outline" size={22} color={Colors.textSecondary} />
                <Text style={styles.actionText}>Main Menu</Text>
              </Pressable>
              {gameState.isGoverning ? (
                <Pressable onPress={() => router.push('/emergencies-act')} style={({ pressed }) => [styles.actionBtn, styles.actionBtnDanger, pressed && { opacity: 0.8 }]}>
                  <MaterialCommunityIcons name="alert-octagram" size={22} color={Colors.error} />
                  <Text style={[styles.actionText, { color: Colors.error }]}>Emergencies Act</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => router.push('/supreme-court')} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}>
                <MaterialCommunityIcons name="gavel" size={22} color={Colors.gold} />
                <Text style={styles.actionText}>Courts</Text>
              </Pressable>
              {gameState.isGoverning && (gameState.cabinet?.length || 0) > 0 ? (
                <Pressable onPress={() => router.push('/cabinet-scandal')} style={({ pressed }) => [styles.actionBtn, styles.actionBtnDanger, pressed && { opacity: 0.8 }]}>
                  <MaterialCommunityIcons name="alert" size={22} color={Colors.error} />
                  <Text style={[styles.actionText, { color: Colors.error }]}>Scandal Alert</Text>
                </Pressable>
              ) : null}
              {!gameState.isGoverning && gameState.confidenceVoteAvailable ? (
                <Pressable onPress={handleConfidenceVote} style={({ pressed }) => [styles.actionBtn, styles.actionBtnDanger, pressed && { opacity: 0.8 }]}>
                  <MaterialCommunityIcons name="vote" size={22} color={Colors.error} />
                  <Text style={[styles.actionText, { color: Colors.error }]}>Confidence Vote</Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        </View>

        {/* Bill voting reminder */}
        {unvotedBills.length > 0 ? (
          <Pressable onPress={() => router.push('/(tabs)/parliament')} style={({ pressed }) => [styles.billVoteReminder, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="gavel" size={16} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.billVoteReminderTitle}>{unvotedBills.length} Bill{unvotedBills.length > 1 ? 's' : ''} Awaiting Your Vote</Text>
              <Text style={styles.billVoteReminderSub}>{unvotedBills.map(b => b.title.split(':')[0]).join(', ')}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.warning} />
          </Pressable>
        ) : null}

        {/* Events — role-specific */}
        {gameState.currentEvents.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {gameState.isGoverning ? 'THIS WEEK IN PARLIAMENT — GOVERN' : 'THIS WEEK IN PARLIAMENT — OPPOSE'}
            </Text>
            <View style={[styles.eventRoleHint, gameState.isGoverning ? {} : { backgroundColor: partyColor + '0D', borderColor: partyColor + '22' }]}>
              <MaterialCommunityIcons name={gameState.isGoverning ? 'shield-crown' : 'account-voice'} size={12} color={gameState.isGoverning ? Colors.liberal : partyColor} />
              <Text style={styles.eventRoleHintText}>
                {gameState.isGoverning
                  ? 'As Prime Minister, your responses set government policy and affect approval.'
                  : 'As Opposition Leader, your responses shape your critique and attack the government\'s record.'}
              </Text>
            </View>
            {gameState.currentEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onChoice={handleEventChoice}
                selectedChoice={eventChoices[event.id]}
                isGoverning={gameState.isGoverning}
              />
            ))}
          </View>
        ) : null}

        {/* Rivals */}
        {gameState.rivals.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RIVAL PARTY LEADERS</Text>
            {gameState.rivals.slice(0, 3).map(rival => {
              const rivalParty = PARTIES.find(p => p.id === rival.partyId);
              return (
                <View key={rival.partyId} style={styles.rivalCard}>
                  <View style={[styles.rivalColorDot, { backgroundColor: rivalParty?.color || Colors.textMuted }]} />
                  <View style={styles.rivalInfo}>
                    <Text style={styles.rivalName}>{rival.name.split(' (')[0]}</Text>
                    <Text style={styles.rivalParty}>{rivalParty?.name || rival.party}</Text>
                  </View>
                  <View style={styles.rivalStats}>
                    <Text style={[styles.rivalApproval, { color: rival.approval > 40 ? Colors.success : Colors.warning }]}>{Math.round(rival.approval)}%</Text>
                    <Text style={styles.rivalApprovalLabel}>approval</Text>
                  </View>
                  <View style={styles.rivalSeats}>
                    <Text style={[styles.rivalSeatCount, { color: rivalParty?.color || Colors.textMuted }]}>{gameState.seats[rival.partyId] || 0}</Text>
                    <Text style={styles.rivalSeatsLabel}>seats</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {/* Advance Week Button — no gap, flush against tab bar */}
      <View style={[styles.advanceContainer, { paddingBottom: insets.bottom }]}>
        <Pressable
          onPress={handleAdvanceAttempt}
          style={({ pressed }) => [
            styles.advanceBtn,
            { backgroundColor: canAdvance ? partyColor : Colors.surfaceElevated },
            isAdvancing && { opacity: 0.7 },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          disabled={isAdvancing}
        >
          <MaterialCommunityIcons name={canAdvance ? 'skip-next' : 'lock'} size={20} color={canAdvance ? '#fff' : Colors.textMuted} />
          <Text style={[styles.advanceBtnText, !canAdvance && { color: Colors.textMuted }]}>{advanceBtnLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, backgroundColor: Colors.surface },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  partyBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm, borderWidth: 1 },
  partyBadgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, letterSpacing: 1 },
  playerName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  playerRole: { fontSize: FontSize.xs, color: Colors.textSecondary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  timeDisplay: { alignItems: 'flex-end' },
  timeWeek: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  timeYear: { fontSize: FontSize.xs, color: Colors.textSecondary },
  govStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  govStatusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: Spacing.md },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  minorityWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.warning + '11', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.warning + '33' },
  minorityWarningText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, lineHeight: 17 },
  byElectionBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.warning + '11', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.warning + '44', padding: Spacing.md, gap: Spacing.sm },
  byElectionBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  byElectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.warning },
  byElectionSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  byElectionActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  byElectionBtn: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.sm },
  byElectionBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#fff' },
  byElectionDismiss: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  electionCountdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.gold + '11', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.md },
  electionCountdownLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  electionCountdownTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.gold },
  electionCountdownSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  dissolveBtn: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.error + '22', borderWidth: 1, borderColor: Colors.error + '44' },
  dissolveBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.error },
  gateCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.warning + '11', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.warning + '33', padding: Spacing.sm },
  gateTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.warning, marginBottom: 3 },
  gateItem: { fontSize: FontSize.xs, color: Colors.textSecondary },
  gateReadyCard: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.success + '0D', borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.success + '22', padding: Spacing.sm },
  gateReadyText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.medium },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.xs },
  actionBtn: { alignItems: 'center', gap: 6, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minWidth: 90 },
  actionBtnDanger: { borderColor: Colors.error + '44', backgroundColor: Colors.error + '11' },
  actionText: { fontSize: 11, fontWeight: FontWeight.medium, color: Colors.textSecondary, textAlign: 'center' },
  billVoteReminder: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.warning + '11', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.warning + '44', padding: Spacing.md },
  billVoteReminderTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.warning },
  billVoteReminderSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  eventRoleHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.liberal + '0D', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.liberal + '22' },
  eventRoleHintText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  rivalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm, gap: Spacing.sm },
  rivalColorDot: { width: 10, height: 10, borderRadius: 5 },
  rivalInfo: { flex: 1 },
  rivalName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  rivalParty: { fontSize: FontSize.xs, color: Colors.textSecondary },
  rivalStats: { alignItems: 'center' },
  rivalApproval: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  rivalApprovalLabel: { fontSize: 9, color: Colors.textMuted },
  rivalSeats: { alignItems: 'center', minWidth: 40 },
  rivalSeatCount: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  rivalSeatsLabel: { fontSize: 9, color: Colors.textMuted },
  // Advance button — no gap with tab bar
  advanceContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: 6,
    backgroundColor: Colors.background,
  },
  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    marginBottom: 4,
  },
  advanceBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
});
