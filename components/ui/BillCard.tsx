// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { Bill, BILL_STAGE_NAMES, VOTE_STAGES, getStageProgress } from '@/services/billService';
import { PARTIES } from '@/constants/parties';

interface BillCardProps {
  bill: Bill;
  onVote?: (vote: 'yea' | 'nay' | 'abstain') => void;
  onAccelerate?: () => void;
  onPress?: () => void;
  isExpanded?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  government: Colors.liberal,
  private_member: Colors.gold,
  opposition: Colors.conservative,
};

const TYPE_LABELS: Record<string, string> = {
  government: "GOV'T BILL",
  private_member: 'PRIVATE',
  opposition: 'OPPOSITION',
};

export const BillCard = React.memo(function BillCard({ bill, onVote, onAccelerate, onPress, isExpanded }: BillCardProps) {
  const party = PARTIES.find(p => p.id === bill.sponsorParty);
  const typeColor = TYPE_COLORS[bill.type] || Colors.textSecondary;
  const progress = getStageProgress(bill);

  const isDefeated = bill.stage === 'defeated';
  const isPassed = bill.stage === 'royal_assent' || bill.passed;
  const isVoteStage = VOTE_STAGES.has(bill.stage);
  const stageColor = isDefeated ? Colors.error : isPassed ? Colors.success : isVoteStage ? Colors.warning : Colors.gold;
  const stageName = BILL_STAGE_NAMES[bill.stage] || bill.stage;

  const yeas = bill.votesFor;
  const nays = bill.votesAgainst;
  const total = yeas + nays || 1;
  const yeaPct = (yeas / total) * 100;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isExpanded && styles.cardExpanded,
        pressed && styles.pressed,
      ]}
    >
      {/* Type + status header */}
      <View style={styles.header}>
        <View style={styles.typeBadges}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '22', borderColor: typeColor + '44' }]}>
            <Text style={[styles.typeText, { color: typeColor }]}>{TYPE_LABELS[bill.type] || bill.type}</Text>
          </View>
          {bill.isPlayerBill ? (
            <View style={styles.playerBillBadge}>
              <Text style={styles.playerBillText}>YOUR BILL</Text>
            </View>
          ) : null}
          {bill.accelerated ? (
            <View style={styles.acceleratedBadge}>
              <MaterialCommunityIcons name="fast-forward" size={8} color={Colors.error} />
              <Text style={styles.acceleratedText}>CLOSURE</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: stageColor + '22' }]}>
            {isVoteStage ? <MaterialCommunityIcons name="gavel" size={9} color={stageColor} /> : null}
            <Text style={[styles.statusText, { color: stageColor }]}>
              {isPassed ? '✓ PASSED' : isDefeated ? '✗ DEFEATED' : stageName}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textMuted}
          />
        </View>
      </View>

      {/* Title + sponsor */}
      <Text style={styles.title} numberOfLines={isExpanded ? undefined : 2}>{bill.title}</Text>
      <View style={styles.sponsorRow}>
        <View style={[styles.sponsorDot, { backgroundColor: party?.color || Colors.textMuted }]} />
        <Text style={styles.sponsor} numberOfLines={1}>{bill.sponsorName}</Text>
      </View>

      {/* Progress bar — full pipeline */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {
            width: `${progress}%` as any,
            backgroundColor: isPassed ? Colors.success : isDefeated ? Colors.error : stageColor,
          }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>

      {/* Vote tally */}
      {(yeas > 0 || nays > 0) ? (
        <View style={styles.tally}>
          <View style={styles.tallyBar}>
            <View style={[styles.tallyYea, { width: `${yeaPct}%` as any }]} />
          </View>
          <View style={styles.tallyLabels}>
            <View style={styles.tallyItem}>
              <View style={[styles.tallyDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.tallyText}>{yeas} Yea</Text>
            </View>
            <View style={styles.tallyItem}>
              <View style={[styles.tallyDot, { backgroundColor: Colors.error }]} />
              <Text style={styles.tallyText}>{nays} Nay</Text>
            </View>
            <Text style={styles.fiscalText}>{bill.fiscalImpact}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.tallyLabels}>
          <Text style={styles.fiscalText}>{bill.fiscalImpact}</Text>
        </View>
      )}

      {/* Weeks remaining indicator */}
      {!isDefeated && !isPassed ? (
        <View style={styles.weeksRow}>
          <MaterialCommunityIcons name="clock-outline" size={11} color={Colors.textMuted} />
          <Text style={styles.weeksText}>
            {bill.accelerated
              ? 'Vote forced — this week'
              : isVoteStage
              ? `Vote in ${bill.stageWeeksRemaining} week${bill.stageWeeksRemaining !== 1 ? 's' : ''}`
              : `Advances in ${bill.stageWeeksRemaining} week${bill.stageWeeksRemaining !== 1 ? 's' : ''}`}
          </Text>
          {bill.amendments.length > 0 ? (
            <View style={styles.amendmentsBadge}>
              <Text style={styles.amendmentsCount}>{bill.amendments.length} amend.</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Vote buttons */}
      {onVote && !isDefeated && !isPassed ? (
        <View style={styles.voteSection}>
          <Text style={styles.voteLabel}>YOUR VOTE — Party will follow your lead:</Text>
          <View style={styles.voteButtons}>
            {(['yea', 'nay', 'abstain'] as const).map(vote => (
              <Pressable
                key={vote}
                onPress={() => onVote(vote)}
                style={({ pressed }) => [
                  styles.voteBtn,
                  bill.playerVote === vote && vote === 'yea' && styles.voteBtnYea,
                  bill.playerVote === vote && vote === 'nay' && styles.voteBtnNay,
                  bill.playerVote === vote && vote === 'abstain' && styles.voteBtnAbstain,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[
                  styles.voteBtnText,
                  bill.playerVote === vote && vote === 'yea' && { color: Colors.success },
                  bill.playerVote === vote && vote === 'nay' && { color: Colors.error },
                  bill.playerVote === vote && vote === 'abstain' && { color: Colors.textSecondary },
                ]}>
                  {vote === 'yea' ? '✓ YEA' : vote === 'nay' ? '✗ NAY' : '— ABSTAIN'}
                </Text>
              </Pressable>
            ))}
          </View>
          {bill.playerVote ? (
            <Text style={styles.voteFollowNote}>
              ~85% of your party's MPs will follow your {bill.playerVote.toUpperCase()} vote.
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Accelerate button */}
      {onAccelerate && !isDefeated && !isPassed ? (
        <Pressable
          onPress={onAccelerate}
          style={({ pressed }) => [styles.accelerateBtn, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons name="fast-forward" size={13} color={Colors.warning} />
          <Text style={styles.accelerateText}>Invoke Closure — Force Immediate Vote</Text>
        </Pressable>
      ) : null}

      {/* Pipeline hint */}
      {!isExpanded ? (
        <View style={styles.expandHint}>
          <MaterialCommunityIcons name="sitemap" size={10} color={Colors.textMuted} />
          <Text style={styles.expandHintText}>Tap to view full legislative pipeline</Text>
        </View>
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
  },
  cardExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: 'transparent',
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
    gap: 5,
    flexWrap: 'wrap',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 7,
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
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.gold + '22',
    borderWidth: 1,
    borderColor: Colors.gold + '55',
  },
  playerBillText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  acceleratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.error + '22',
    borderWidth: 1,
    borderColor: Colors.error + '44',
  },
  acceleratedText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.error,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
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
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: Spacing.sm,
  },
  sponsorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sponsor: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: Colors.textMuted,
    minWidth: 30,
    textAlign: 'right',
  },
  tally: {
    gap: 4,
    marginBottom: 6,
  },
  tallyBar: {
    height: 4,
    backgroundColor: Colors.error + '44',
    borderRadius: 2,
    overflow: 'hidden',
  },
  tallyYea: {
    height: '100%',
    backgroundColor: Colors.success + 'AA',
    borderRadius: 2,
  },
  tallyLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  tallyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tallyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tallyText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  fiscalText: {
    fontSize: FontSize.xs,
    color: Colors.gold,
    fontWeight: FontWeight.medium,
    marginLeft: 'auto',
  },
  weeksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  weeksText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    flex: 1,
  },
  amendmentsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.warning + '22',
  },
  amendmentsCount: {
    fontSize: 9,
    color: Colors.warning,
    fontWeight: FontWeight.medium,
  },
  voteSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    gap: 8,
  },
  voteLabel: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  voteBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  voteBtnYea: {
    backgroundColor: Colors.success + '22',
    borderColor: Colors.success,
  },
  voteBtnNay: {
    backgroundColor: Colors.error + '22',
    borderColor: Colors.error,
  },
  voteBtnAbstain: {
    backgroundColor: Colors.textMuted + '22',
    borderColor: Colors.textMuted,
  },
  voteBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  voteFollowNote: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  accelerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.warning + '55',
    backgroundColor: Colors.warning + '11',
    marginTop: Spacing.xs,
  },
  accelerateText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.warning,
  },
  expandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  expandHintText: {
    fontSize: 9,
    color: Colors.textMuted,
  },
});
