// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { Bill, BILL_STAGE_NAMES, getStageProgress } from '@/services/billService';
import { PARTIES } from '@/constants/parties';

interface BillCardProps {
  bill: Bill;
  onVote?: (vote: 'yea' | 'nay' | 'abstain') => void;
  onAccelerate?: () => void;
  onPress?: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  government: Colors.liberal,
  private_member: Colors.gold,
  opposition: Colors.conservative,
};

export const BillCard = React.memo(function BillCard({ bill, onVote, onAccelerate, onPress }: BillCardProps) {
  const party = PARTIES.find(p => p.id === bill.sponsorParty);
  const typeColor = TYPE_COLORS[bill.type] || Colors.textSecondary;
  const progress = getStageProgress(bill);
  const stageName = BILL_STAGE_NAMES[bill.stage] || bill.stage;
  
  const isDefeated = bill.stage === 'defeated';
  const isPassed = bill.stage === 'royal_assent' || bill.passed;
  
  const stageColor = isDefeated ? Colors.error : isPassed ? Colors.success : Colors.gold;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.typeBadges}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '22', borderColor: typeColor + '44' }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>
              {bill.type === 'government' ? 'GOV\'T BILL' : bill.type === 'private_member' ? 'PRIVATE' : 'OPPOSITION'}
            </Text>
          </View>
          {bill.isPlayerBill ? (
            <View style={styles.playerBillBadge}>
              <Text style={styles.playerBillText}>YOUR BILL</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: stageColor + '22' }]}>
          <Text style={[styles.statusText, { color: stageColor }]}>
            {isPassed ? '✓ PASSED' : isDefeated ? '✗ DEFEATED' : stageName}
          </Text>
        </View>
      </View>
      
      <Text style={styles.title} numberOfLines={2}>{bill.title}</Text>
      <Text style={styles.sponsor}>{bill.sponsorName}</Text>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: stageColor }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>
      
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="check-circle" size={12} color={Colors.success} />
          <Text style={styles.metaText}>{bill.votesFor} Yea</Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="close-circle" size={12} color={Colors.error} />
          <Text style={styles.metaText}>{bill.votesAgainst} Nay</Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="cash" size={12} color={Colors.gold} />
          <Text style={styles.metaText}>{bill.fiscalImpact}</Text>
        </View>
      </View>
      
      {onVote && !isDefeated && !isPassed ? (
        <View style={styles.voteSection}>
          <Text style={styles.voteLabel}>YOUR VOTE:</Text>
          <View style={styles.voteButtons}>
            {(['yea', 'nay', 'abstain'] as const).map(vote => (
              <Pressable
                key={vote}
                onPress={() => onVote(vote)}
                style={({ pressed }) => [
                  styles.voteBtn,
                  bill.playerVote === vote && styles.voteBtnSelected,
                  vote === 'yea' && bill.playerVote === vote && { backgroundColor: Colors.success + '33', borderColor: Colors.success },
                  vote === 'nay' && bill.playerVote === vote && { backgroundColor: Colors.error + '33', borderColor: Colors.error },
                  pressed && styles.voteBtnPressed,
                ]}
              >
                <Text style={[
                  styles.voteBtnText,
                  vote === 'yea' && bill.playerVote === vote && { color: Colors.success },
                  vote === 'nay' && bill.playerVote === vote && { color: Colors.error },
                ]}>
                  {vote.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      
      {onAccelerate && !isDefeated && !isPassed && !bill.accelerated ? (
        <Pressable
          onPress={onAccelerate}
          style={({ pressed }) => [styles.accelerateBtn, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons name="fast-forward" size={14} color={Colors.warning} />
          <Text style={styles.accelerateText}>Force Vote</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.sm,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
    gap: 6,
  },
  typeBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  playerBillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.gold + '22',
    borderWidth: 1,
    borderColor: Colors.gold + '44',
  },
  playerBillText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  sponsor: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: Colors.textMuted,
    minWidth: 30,
    textAlign: 'right',
  },
  meta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  voteSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  voteLabel: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voteBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  voteBtnSelected: {},
  voteBtnPressed: {
    opacity: 0.7,
  },
  voteBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  accelerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.warning + '44',
    backgroundColor: Colors.warning + '11',
    marginTop: Spacing.xs,
  },
  accelerateText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
  },
});
