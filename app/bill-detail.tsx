// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { BILL_STAGE_NAMES, BILL_STAGE_ORDER, getStageProgress } from '@/services/billService';
import { PARTIES } from '@/constants/parties';

export default function BillDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { gameState, bills, voteOnBill, accelerateBill } = useGame();

  const bill = bills.find(b => b.id === id);
  if (!bill || !gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const sponsorParty = PARTIES.find(p => p.id === bill.sponsorParty);
  const progress = getStageProgress(bill);
  const isGov = gameState.isGoverning;
  const isPassed = bill.stage === 'royal_assent' || bill.passed;
  const isDefeated = bill.stage === 'defeated';

  const currentStageIdx = BILL_STAGE_ORDER.indexOf(bill.stage);
  const weeksRemaining = bill.accelerated ? 0 : Math.max(0, bill.defaultStageWeeks - bill.weeksAtStage);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Bill Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Bill Header */}
        <View style={[styles.billHeader, { borderTopColor: sponsorParty?.color || Colors.gold }]}>
          <View style={styles.billBadges}>
            <View style={[styles.typeBadge, { backgroundColor: (sponsorParty?.color || Colors.gold) + '22' }]}>
              <Text style={[styles.typeText, { color: sponsorParty?.color || Colors.gold }]}>
                {bill.type === 'government' ? "GOVERNMENT BILL" : bill.type === 'private_member' ? "PRIVATE MEMBER'S BILL" : "OPPOSITION BILL"}
              </Text>
            </View>
            {bill.isPlayerBill ? (
              <View style={styles.yourBillBadge}>
                <Text style={styles.yourBillText}>YOUR BILL ★</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.billTitle}>{bill.title}</Text>
          <Text style={styles.billSponsor}>Sponsored by: {bill.sponsorName}</Text>
          <Text style={styles.billTopic}>Topic: {bill.topic}</Text>
        </View>

        {/* Status */}
        <View style={[styles.statusCard, { 
          borderColor: isPassed ? Colors.success + '44' : isDefeated ? Colors.error + '44' : Colors.gold + '44',
          backgroundColor: isPassed ? Colors.success + '11' : isDefeated ? Colors.error + '11' : Colors.gold + '11',
        }]}>
          <Text style={[styles.statusLabel, { color: isPassed ? Colors.success : isDefeated ? Colors.error : Colors.gold }]}>
            {isPassed ? '✓ ROYAL ASSENT — NOW LAW' : isDefeated ? '✗ BILL DEFEATED' : `CURRENT STAGE: ${BILL_STAGE_NAMES[bill.stage]}`}
          </Text>
          {!isPassed && !isDefeated ? (
            <Text style={styles.statusMeta}>
              {bill.accelerated ? 'Vote forced — proceeding immediately' : `${weeksRemaining} weeks remaining at this stage`}
            </Text>
          ) : null}
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>LEGISLATIVE PROGRESS</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: isPassed ? Colors.success : isDefeated ? Colors.error : Colors.gold }]} />
          </View>
          <View style={styles.stageTimeline}>
            {BILL_STAGE_ORDER.map((stage, idx) => {
              const isCompleted = currentStageIdx > idx;
              const isCurrent = currentStageIdx === idx;
              const stageColor = isCompleted ? Colors.success : isCurrent ? Colors.gold : Colors.textMuted;
              return (
                <View key={stage} style={styles.stageItem}>
                  <View style={[styles.stageDot, { backgroundColor: stageColor }]} />
                  <Text style={[styles.stageLabel, { color: stageColor }]} numberOfLines={2}>
                    {BILL_STAGE_NAMES[stage]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>BILL SUMMARY</Text>
          <Text style={styles.descriptionText}>{bill.description}</Text>
        </View>

        {/* Fiscal Impact */}
        <View style={styles.fiscalSection}>
          <MaterialCommunityIcons name="cash-multiple" size={18} color={Colors.gold} />
          <View>
            <Text style={styles.fiscalLabel}>Fiscal Impact</Text>
            <Text style={styles.fiscalValue}>{bill.fiscalImpact}</Text>
          </View>
        </View>

        {/* Votes */}
        <View style={styles.votesSection}>
          <Text style={styles.sectionTitle}>PARLIAMENTARY VOTES</Text>
          <View style={styles.votesRow}>
            <View style={styles.voteItem}>
              <Text style={[styles.voteCount, { color: Colors.success }]}>{bill.votesFor}</Text>
              <Text style={styles.voteLabel}>Yea</Text>
            </View>
            <View style={styles.voteDivider} />
            <View style={styles.voteItem}>
              <Text style={[styles.voteCount, { color: Colors.error }]}>{bill.votesAgainst}</Text>
              <Text style={styles.voteLabel}>Nay</Text>
            </View>
            <View style={styles.voteDivider} />
            <View style={styles.voteItem}>
              <Text style={[styles.voteCount, { color: Colors.textSecondary }]}>
                {bill.votesFor > bill.votesAgainst ? 'Passing' : 'Failing'}
              </Text>
              <Text style={styles.voteLabel}>Status</Text>
            </View>
          </View>
        </View>

        {/* Amendments */}
        {bill.amendments.length > 0 ? (
          <View style={styles.amendmentsSection}>
            <Text style={styles.sectionTitle}>AMENDMENTS ({bill.amendments.length})</Text>
            {bill.amendments.map((amendment, idx) => (
              <View key={idx} style={styles.amendmentItem}>
                <MaterialCommunityIcons name="pencil" size={14} color={Colors.warning} />
                <Text style={styles.amendmentText}>{amendment}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Player Actions */}
        {!isPassed && !isDefeated ? (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>YOUR VOTE ON THIS BILL</Text>
            <View style={styles.voteButtons}>
              {(['yea', 'nay', 'abstain'] as const).map(vote => (
                <Pressable
                  key={vote}
                  onPress={() => voteOnBill(bill.id, vote)}
                  style={({ pressed }) => [
                    styles.voteBtn,
                    bill.playerVote === vote && styles.voteBtnSelected,
                    vote === 'yea' && bill.playerVote === vote && { backgroundColor: Colors.success + '33', borderColor: Colors.success },
                    vote === 'nay' && bill.playerVote === vote && { backgroundColor: Colors.error + '33', borderColor: Colors.error },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <MaterialCommunityIcons 
                    name={vote === 'yea' ? 'thumb-up' : vote === 'nay' ? 'thumb-down' : 'minus'} 
                    size={18} 
                    color={
                      vote === 'yea' && bill.playerVote === 'yea' ? Colors.success :
                      vote === 'nay' && bill.playerVote === 'nay' ? Colors.error :
                      Colors.textSecondary
                    } 
                  />
                  <Text style={styles.voteBtnText}>{vote.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
            
            {isGov && !bill.accelerated ? (
              <Pressable
                onPress={() => accelerateBill(bill.id)}
                style={({ pressed }) => [styles.accelerateBtn, pressed && { opacity: 0.7 }]}
              >
                <MaterialCommunityIcons name="fast-forward" size={16} color={Colors.warning} />
                <Text style={styles.accelerateBtnText}>Force Immediate Vote (Government Privilege)</Text>
              </Pressable>
            ) : null}
            
            {bill.accelerated ? (
              <View style={styles.acceleratedBadge}>
                <MaterialCommunityIcons name="lightning-bolt" size={14} color={Colors.warning} />
                <Text style={styles.acceleratedText}>Vote forced by government — will advance this week</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  billHeader: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderTopWidth: 3,
    padding: Spacing.md,
    gap: 8,
  },
  billBadges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  typeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  yourBillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.gold + '22',
  },
  yourBillText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  billTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  billSponsor: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  billTopic: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  statusCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 4,
  },
  statusLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  statusMeta: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  progressSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  stageTimeline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stageLabel: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
  descriptionSection: {
    gap: 8,
  },
  descriptionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  fiscalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.gold + '11',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gold + '22',
  },
  fiscalLabel: {
    fontSize: FontSize.xs,
    color: Colors.gold,
    fontWeight: FontWeight.semibold,
  },
  fiscalValue: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  votesSection: {
    gap: 8,
  },
  votesRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  voteItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  voteCount: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  voteLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  voteDivider: {
    width: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  amendmentsSection: {
    gap: 8,
  },
  amendmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  amendmentText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  actionsSection: {
    gap: Spacing.sm,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voteBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  voteBtnSelected: {},
  voteBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  accelerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.warning + '44',
    backgroundColor: Colors.warning + '11',
  },
  accelerateBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
  },
  acceleratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  acceleratedText: {
    fontSize: FontSize.xs,
    color: Colors.warning,
  },
});
