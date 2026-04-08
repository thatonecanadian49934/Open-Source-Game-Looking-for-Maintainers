// Powered by OnSpace.AI — Updated Parliament screen with bill types, opposition prioritize, whip
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { BillCard } from '@/components/ui/BillCard';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import {
  Bill,
  BillStage,
  BILL_STAGE_NAMES,
  BILL_STAGE_ORDER,
  VOTE_STAGES,
  DEFAULT_STAGE_WEEKS,
  getPipelineSteps,
  getBillStageDescription,
  getBillTypeLabel,
  getBillTypeColor,
} from '@/services/billService';
import { PARTIES } from '@/constants/parties';

type FilterTab = 'all' | 'government' | 'pmb' | 'my_bills' | 'committee' | 'passed' | 'defeated';

const CHAMBER_COLOR: Record<string, string> = {
  house: Colors.liberal,
  senate: Colors.info,
  crown: Colors.gold,
};

export default function ParliamentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, bills, voteOnBill, accelerateBill, prioritizeBill, whipEvents } = useGame();
  const { showAlert } = useAlert();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const canAccelerate = gameState.isGoverning;
  const canPrioritize = !gameState.isGoverning;

  const filters: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'All Bills', count: bills.filter(b => b.stage !== 'defeated').length },
    { id: 'government', label: 'Gov\'t Bills', count: bills.filter(b => b.type === 'government' && b.isMinisterSponsored).length },
    { id: 'pmb', label: 'PMBs', count: bills.filter(b => b.type === 'private_member' || !b.isMinisterSponsored).length },
    { id: 'my_bills', label: 'My Bills', count: bills.filter(b => b.isPlayerBill || b.sponsorParty === gameState.playerPartyId).length },
    { id: 'committee', label: 'Committee', count: bills.filter(b => b.stage === 'house_committee' || b.stage === 'senate_committee').length },
    { id: 'passed', label: 'Passed', count: bills.filter(b => b.stage === 'royal_assent' || b.passed).length },
    { id: 'defeated', label: 'Defeated', count: bills.filter(b => b.stage === 'defeated').length },
  ];

  const filteredBills = bills.filter(bill => {
    switch (activeFilter) {
      case 'government': return bill.type === 'government' && bill.isMinisterSponsored;
      case 'pmb': return bill.type === 'private_member' || !bill.isMinisterSponsored;
      case 'my_bills': return bill.isPlayerBill || bill.sponsorParty === gameState.playerPartyId;
      case 'committee': return bill.stage === 'house_committee' || bill.stage === 'senate_committee';
      case 'passed': return bill.stage === 'royal_assent' || bill.passed;
      case 'defeated': return bill.stage === 'defeated';
      default: return true;
    }
  });

  const houseStats = {
    active: bills.filter(b => b.stage.startsWith('house') && b.stage !== 'defeated').length,
    senate: bills.filter(b => b.stage.startsWith('senate') && b.stage !== 'defeated').length,
    passed: bills.filter(b => b.stage === 'royal_assent' || b.passed).length,
    defeated: bills.filter(b => b.stage === 'defeated').length,
  };

  const recentWhipEvent = whipEvents?.[0] ?? null;

  const handleAccelerate = (bill: Bill) => {
    if (!canAccelerate) return;
    showAlert(
      'Invoke Closure — Force Vote',
      `As the governing party, you can invoke closure and force an immediate vote on "${bill.title}". This bypasses the normal debate period.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Invoke Closure',
          style: 'destructive',
          onPress: () => {
            accelerateBill(bill.id);
            showAlert('Closure Invoked', `The vote on "${bill.title}" has been accelerated. The opposition is furious.`);
          },
        },
      ]
    );
  };

  const handlePrioritize = (bill: Bill) => {
    if (!canPrioritize) return;
    showAlert(
      'Prioritize Bill — Force Vote',
      `As opposition leader, you can prioritize "${bill.title}" and force an immediate vote. This puts pressure on the government to respond.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Force Vote',
          onPress: () => {
            prioritizeBill?.(bill.id);
            showAlert('Bill Prioritized', `"${bill.title}" has been prioritized. The government must now respond.`);
          },
        },
      ]
    );
  };

  const renderPipeline = (bill: Bill) => {
    const steps = getPipelineSteps();
    const currentIdx = BILL_STAGE_ORDER.indexOf(bill.stage);
    const isDefeated = bill.stage === 'defeated';
    const isPassed = bill.stage === 'royal_assent' || bill.passed;
    const billTypeColor = getBillTypeColor(bill);
    const billTypeLabel = getBillTypeLabel(bill);

    return (
      <View style={pipelineStyles.container}>
        {/* Bill type indicator */}
        <View style={[pipelineStyles.billTypeBadge, { backgroundColor: billTypeColor + '22', borderColor: billTypeColor + '44' }]}>
          <MaterialCommunityIcons
            name={bill.isMinisterSponsored ? 'domain' : 'account'}
            size={11}
            color={billTypeColor}
          />
          <Text style={[pipelineStyles.billTypeText, { color: billTypeColor }]}>{billTypeLabel}</Text>
          {bill.prioritized ? (
            <View style={pipelineStyles.prioritizedBadge}>
              <Text style={pipelineStyles.prioritizedText}>PRIORITIZED</Text>
            </View>
          ) : null}
        </View>

        {/* Chamber sections */}
        <View style={pipelineStyles.chambers}>
          <View style={pipelineStyles.chamber}>
            <View style={[pipelineStyles.chamberBadge, { backgroundColor: Colors.liberal + '22' }]}>
              <MaterialCommunityIcons name="domain" size={10} color={Colors.liberal} />
              <Text style={[pipelineStyles.chamberLabel, { color: Colors.liberal }]}>HOUSE</Text>
            </View>
          </View>
          <View style={pipelineStyles.chamber}>
            <View style={[pipelineStyles.chamberBadge, { backgroundColor: Colors.info + '22' }]}>
              <MaterialCommunityIcons name="bank" size={10} color={Colors.info} />
              <Text style={[pipelineStyles.chamberLabel, { color: Colors.info }]}>SENATE</Text>
            </View>
          </View>
          <View style={[pipelineStyles.chamber, { flex: 0.6 }]}>
            <View style={[pipelineStyles.chamberBadge, { backgroundColor: Colors.gold + '22' }]}>
              <MaterialCommunityIcons name="crown" size={10} color={Colors.gold} />
              <Text style={[pipelineStyles.chamberLabel, { color: Colors.gold }]}>ROYAL</Text>
            </View>
          </View>
        </View>

        {/* Step dots */}
        <View style={pipelineStyles.steps}>
          {steps.map((step, idx) => {
            const isCompleted = !isDefeated && !isPassed && currentIdx > idx;
            const isCurrent = !isDefeated && !isPassed && currentIdx === idx;
            const isVoteStage = VOTE_STAGES.has(step.stage);
            const chamberColor = CHAMBER_COLOR[step.chamber] || Colors.textMuted;

            return (
              <React.Fragment key={step.stage}>
                <Pressable
                  onPress={() => {
                    showAlert(
                      BILL_STAGE_NAMES[step.stage],
                      getBillStageDescription(step.stage) +
                      (isCurrent ? `\n\nCurrently at this stage. ${bill.stageWeeksRemaining} weeks remaining.` : isCompleted ? '\n\nCompleted.' : '\n\nNot yet reached.')
                    );
                  }}
                  style={[
                    pipelineStyles.step,
                    { borderColor: chamberColor + '44' },
                    isCompleted && { backgroundColor: chamberColor + '33', borderColor: chamberColor },
                    isCurrent && { backgroundColor: chamberColor, borderColor: chamberColor },
                    isVoteStage && isCurrent && pipelineStyles.voteStep,
                    isDefeated && isCurrent && { backgroundColor: Colors.error, borderColor: Colors.error },
                    isPassed && { backgroundColor: Colors.gold, borderColor: Colors.gold },
                  ]}
                >
                  {isVoteStage ? (
                    <MaterialCommunityIcons name="gavel" size={9} color={isCurrent || isCompleted || isPassed ? '#fff' : chamberColor + '66'} />
                  ) : (
                    <MaterialCommunityIcons name={isCompleted || isCurrent ? 'check' : 'circle-small'} size={isCurrent ? 10 : 9} color={isCurrent || isCompleted || isPassed ? '#fff' : chamberColor + '44'} />
                  )}
                </Pressable>
                {idx < steps.length - 1 && (
                  <View style={[pipelineStyles.connector, isCompleted && { backgroundColor: chamberColor + '66' }, isCurrent && { backgroundColor: chamberColor + '33' }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Stage info */}
        {!isDefeated && !isPassed && currentIdx >= 0 ? (
          <View style={pipelineStyles.stageInfo}>
            <View style={pipelineStyles.stageInfoLeft}>
              <Text style={pipelineStyles.stageInfoLabel}>CURRENT STAGE</Text>
              <Text style={pipelineStyles.stageInfoValue}>{BILL_STAGE_NAMES[bill.stage]}</Text>
            </View>
            <View style={pipelineStyles.stageInfoRight}>
              {VOTE_STAGES.has(bill.stage) ? (
                <View style={pipelineStyles.voteStageBadge}>
                  <MaterialCommunityIcons name="gavel" size={10} color={Colors.warning} />
                  <Text style={pipelineStyles.voteStageBadgeText}>VOTE REQUIRED</Text>
                </View>
              ) : null}
              <Text style={pipelineStyles.weeksLabel}>
                {bill.accelerated || bill.prioritized ? 'Vote forced this week' : `${bill.stageWeeksRemaining}w remaining`}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Vote history */}
        {bill.voteHistory.length > 0 ? (
          <View style={pipelineStyles.voteHistory}>
            <Text style={pipelineStyles.voteHistoryTitle}>VOTE HISTORY</Text>
            {bill.voteHistory.map((v, i) => (
              <View key={i} style={pipelineStyles.voteRecord}>
                <MaterialCommunityIcons name={v.majority ? 'check-circle' : 'close-circle'} size={12} color={v.majority ? Colors.success : Colors.error} />
                <Text style={pipelineStyles.voteRecordStage}>{BILL_STAGE_NAMES[v.stage]}</Text>
                <Text style={[pipelineStyles.voteRecordResult, { color: v.majority ? Colors.success : Colors.error }]}>
                  {v.yea}–{v.nay} {v.majority ? 'PASSED' : 'DEFEATED'}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Amendments */}
        {bill.amendments.length > 0 ? (
          <View style={pipelineStyles.amendments}>
            <Text style={pipelineStyles.amendmentsTitle}>
              <MaterialCommunityIcons name="pencil" size={10} color={Colors.warning} /> AMENDMENTS ({bill.amendments.length})
            </Text>
            {bill.amendments.map((a, i) => <Text key={i} style={pipelineStyles.amendment}>• {a}</Text>)}
          </View>
        ) : null}

        {/* Government closure or opposition prioritize */}
        {canAccelerate && !isDefeated && !isPassed && !bill.accelerated ? (
          <View style={pipelineStyles.closureInfo}>
            <MaterialCommunityIcons name="fast-forward" size={11} color={Colors.warning} />
            <Text style={pipelineStyles.closureInfoText}>As governing party you can invoke closure to force an immediate vote.</Text>
          </View>
        ) : canPrioritize && !isDefeated && !isPassed && !bill.prioritized && (bill.isPlayerBill || bill.sponsorParty === gameState.playerPartyId) ? (
          <View style={[pipelineStyles.closureInfo, { borderColor: partyColor + '44', backgroundColor: partyColor + '11' }]}>
            <MaterialCommunityIcons name="account-voice" size={11} color={partyColor} />
            <Text style={[pipelineStyles.closureInfoText, { color: partyColor }]}>As opposition leader you can prioritize this bill to force an immediate vote.</Text>
          </View>
        ) : bill.accelerated || bill.prioritized ? (
          <View style={[pipelineStyles.closureInfo, { borderColor: Colors.error + '44', backgroundColor: Colors.error + '11' }]}>
            <MaterialCommunityIcons name="alert" size={11} color={Colors.error} />
            <Text style={[pipelineStyles.closureInfoText, { color: Colors.error }]}>
              {bill.accelerated ? 'Closure invoked' : 'Bill prioritized'} — vote scheduled this week.
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Parliament</Text>
          <Text style={styles.headerSub}>House of Commons & Senate — {45 + gameState.parliamentNumber - 44}th Parliament</Text>
        </View>
        <Pressable
          onPress={() => router.push('/create-bill')}
          style={({ pressed }) => [styles.createBillBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.8 }]}
        >
          <MaterialCommunityIcons name="plus" size={14} color="#fff" />
          <Text style={styles.createBillText}>Bill</Text>
        </Pressable>
      </View>

      {/* Parliament summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{houseStats.active}</Text>
          <Text style={styles.summaryLabel}>In House</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{houseStats.senate}</Text>
          <Text style={styles.summaryLabel}>In Senate</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: Colors.success }]}>{houseStats.passed}</Text>
          <Text style={styles.summaryLabel}>Passed</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: Colors.error }]}>{houseStats.defeated}</Text>
          <Text style={styles.summaryLabel}>Defeated</Text>
        </View>
      </View>

      {/* Whip event banner */}
      {recentWhipEvent ? (
        <View style={[styles.whipBanner, { borderColor: recentWhipEvent.event === 'floor_crossing' ? Colors.error + '33' : Colors.warning + '33', backgroundColor: recentWhipEvent.event === 'floor_crossing' ? Colors.error + '08' : Colors.warning + '08' }]}>
          <MaterialCommunityIcons
            name={recentWhipEvent.event === 'floor_crossing' ? 'transfer' : 'account-alert'}
            size={13}
            color={recentWhipEvent.event === 'floor_crossing' ? Colors.error : Colors.warning}
          />
          <Text style={[styles.whipBannerText, { color: recentWhipEvent.event === 'floor_crossing' ? Colors.error : Colors.warning }]} numberOfLines={1}>
            {recentWhipEvent.description}
          </Text>
        </View>
      ) : null}

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="information-outline" size={13} color={Colors.info} />
          <Text style={styles.infoText}>
            Pipeline: 3 House Readings → Committee → 3 Senate Readings → Royal Assent.
            {canAccelerate ? ' Gov\'t can invoke closure to force votes.' : ' Opposition can prioritize their own PMBs.'}
          </Text>
        </View>
        <View style={styles.infoLegend}>
          <View style={styles.legendItem}>
            <MaterialCommunityIcons name="domain" size={10} color={Colors.liberal} />
            <Text style={styles.legendText}>Gov't Bill</Text>
          </View>
          <View style={styles.legendItem}>
            <MaterialCommunityIcons name="account" size={10} color={Colors.info} />
            <Text style={styles.legendText}>PMB</Text>
          </View>
          <View style={styles.legendItem}>
            <MaterialCommunityIcons name="gavel" size={10} color={Colors.warning} />
            <Text style={styles.legendText}>Vote required</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {filters.map(f => (
            <Pressable
              key={f.id}
              onPress={() => setActiveFilter(f.id)}
              style={[styles.filterTab, activeFilter === f.id && [styles.filterTabActive, { borderColor: partyColor }]]}
            >
              <Text style={[styles.filterTabText, activeFilter === f.id && { color: partyColor, fontWeight: FontWeight.bold }]}>
                {f.label}
              </Text>
              {f.count !== undefined && f.count > 0 ? (
                <View style={[styles.filterBadge, activeFilter === f.id && { backgroundColor: partyColor }]}>
                  <Text style={styles.filterBadgeText}>{f.count}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Bills List */}
      <FlatList
        data={filteredBills}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="gavel" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No bills in this category</Text>
            <Pressable onPress={() => router.push('/create-bill')} style={styles.emptyAction}>
              <Text style={styles.emptyActionText}>Draft a bill</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item: bill }) => (
          <View style={styles.billWrapper}>
            <BillCard
              bill={bill}
              onVote={(vote) => voteOnBill(bill.id, vote)}
              onAccelerate={canAccelerate && !bill.accelerated && !bill.prioritized && bill.stage !== 'royal_assent' && bill.stage !== 'defeated'
                ? () => handleAccelerate(bill)
                : undefined}
              onPrioritize={canPrioritize && !bill.accelerated && !bill.prioritized && bill.stage !== 'royal_assent' && bill.stage !== 'defeated' && (bill.isPlayerBill || bill.sponsorParty === gameState.playerPartyId)
                ? () => handlePrioritize(bill)
                : undefined}
              onPress={() => setExpandedBillId(prev => prev === bill.id ? null : bill.id)}
              isExpanded={expandedBillId === bill.id}
            />
            {expandedBillId === bill.id ? renderPipeline(bill) : null}
          </View>
        )}
      />
    </View>
  );
}

const pipelineStyles = StyleSheet.create({
  container: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, marginTop: -8, marginBottom: Spacing.sm, gap: Spacing.sm, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  billTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  billTypeText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  prioritizedBadge: { backgroundColor: Colors.success + '33', paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radius.full },
  prioritizedText: { fontSize: 8, fontWeight: FontWeight.extrabold, color: Colors.success },
  chambers: { flexDirection: 'row', gap: 2 },
  chamber: { flex: 1, alignItems: 'center' },
  chamberBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  chamberLabel: { fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 1 },
  steps: { flexDirection: 'row', alignItems: 'center' },
  step: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card },
  voteStep: { borderWidth: 2 },
  connector: { flex: 1, height: 2, backgroundColor: Colors.surfaceBorder },
  stageInfo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: Colors.card, borderRadius: Radius.sm, padding: 10 },
  stageInfoLeft: { gap: 2 },
  stageInfoLabel: { fontSize: 9, color: Colors.textMuted, letterSpacing: 1, fontWeight: FontWeight.bold },
  stageInfoValue: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  stageInfoRight: { alignItems: 'flex-end', gap: 4 },
  voteStageBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.warning + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  voteStageBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.warning, letterSpacing: 0.5 },
  weeksLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  voteHistory: { gap: 4 },
  voteHistoryTitle: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  voteRecord: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voteRecordStage: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  voteRecordResult: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  amendments: { gap: 3 },
  amendmentsTitle: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.warning, letterSpacing: 0.5 },
  amendment: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  closureInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.warning + '11', borderRadius: Radius.sm, padding: 8, borderWidth: 1, borderColor: Colors.warning + '33' },
  closureInfoText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, lineHeight: 16 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  createBillBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 7, borderRadius: Radius.sm, maxWidth: 80 },
  createBillText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#fff' },
  summaryRow: { flexDirection: 'row', backgroundColor: Colors.surface, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNumber: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, height: '80%', backgroundColor: Colors.surfaceBorder, alignSelf: 'center' },
  whipBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: 8, borderBottomWidth: 1 },
  whipBannerText: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  infoBanner: { backgroundColor: Colors.info + '0D', borderBottomWidth: 1, borderBottomColor: Colors.info + '22', paddingHorizontal: Spacing.md, paddingVertical: 8, gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  infoText: { flex: 1, fontSize: 11, color: Colors.info, lineHeight: 16 },
  infoLegend: { flexDirection: 'row', gap: Spacing.md, paddingLeft: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 10, color: Colors.textMuted },
  filterScroll: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  filterContainer: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 8, alignItems: 'center', paddingVertical: 8 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  filterTabActive: { backgroundColor: 'transparent' },
  filterTabText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  filterBadge: { backgroundColor: Colors.textMuted, borderRadius: 8, minWidth: 16, paddingHorizontal: 4, height: 16, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, color: '#fff' },
  listContent: { padding: Spacing.md, gap: Spacing.xs },
  billWrapper: { marginBottom: Spacing.sm },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.base, color: Colors.textMuted },
  emptyAction: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.gold + '22', borderWidth: 1, borderColor: Colors.gold + '44' },
  emptyActionText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.gold },
});
