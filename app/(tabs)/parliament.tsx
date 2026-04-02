// Powered by OnSpace.AI
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { BillCard } from '@/components/ui/BillCard';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { BillStage, BILL_STAGE_NAMES } from '@/services/billService';

type FilterTab = 'all' | 'house' | 'senate' | 'passed' | 'defeated' | 'my_bills';

export default function ParliamentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, bills, voteOnBill, accelerateBill } = useGame();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  if (!gameState) return null;

  const filters: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All Bills' },
    { id: 'my_bills', label: 'My Bills' },
    { id: 'house', label: 'In House' },
    { id: 'senate', label: 'In Senate' },
    { id: 'passed', label: 'Passed' },
    { id: 'defeated', label: 'Defeated' },
  ];

  const filteredBills = bills.filter(bill => {
    switch (activeFilter) {
      case 'my_bills': return bill.isPlayerBill || bill.sponsorParty === gameState.playerPartyId;
      case 'house': return bill.stage.startsWith('house') || bill.stage === 'committee';
      case 'senate': return bill.stage.startsWith('senate');
      case 'passed': return bill.stage === 'royal_assent' || bill.passed;
      case 'defeated': return bill.stage === 'defeated';
      default: return true;
    }
  });

  const canAccelerate = gameState.isGoverning;

  const houseStats = {
    active: bills.filter(b => b.stage.startsWith('house') || b.stage === 'committee').length,
    senate: bills.filter(b => b.stage.startsWith('senate')).length,
    passed: bills.filter(b => b.stage === 'royal_assent' || b.passed).length,
    defeated: bills.filter(b => b.stage === 'defeated').length,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Parliament</Text>
          <Text style={styles.headerSub}>House of Commons & Senate</Text>
        </View>
        <Pressable
          onPress={() => router.push('/create-bill')}
          style={({ pressed }) => [styles.createBillBtn, pressed && { opacity: 0.8 }]}
        >
          <MaterialCommunityIcons name="plus" size={16} color="#fff" />
          <Text style={styles.createBillText}>New Bill</Text>
        </Pressable>
      </View>

      {/* Parliament Summary */}
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

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <MaterialCommunityIcons name="information" size={14} color={Colors.info} />
        <Text style={styles.infoText}>
          Bills need 3 readings in the House, then Committee, then 3 Senate readings. Default: 6 weeks per stage.
          {gameState.isGoverning ? ' As governing party, you can force a vote on any bill.' : ''}
        </Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {filters.map(f => (
          <Pressable
            key={f.id}
            onPress={() => setActiveFilter(f.id)}
            style={[styles.filterTab, activeFilter === f.id && styles.filterTabActive]}
          >
            <Text style={[styles.filterTabText, activeFilter === f.id && styles.filterTabTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

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
          </View>
        }
        renderItem={({ item: bill }) => (
          <BillCard
            bill={bill}
            onVote={(vote) => voteOnBill(bill.id, vote)}
            onAccelerate={canAccelerate ? () => accelerateBill(bill.id) : undefined}
            onPress={() => router.push({ pathname: '/bill-detail', params: { id: bill.id } })}
          />
        )}
      />
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
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  createBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  createBillText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: '80%',
    backgroundColor: Colors.surfaceBorder,
    alignSelf: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.info + '11',
    borderBottomWidth: 1,
    borderBottomColor: Colors.info + '22',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: Colors.info,
    lineHeight: 16,
  },
  filterScroll: {
    maxHeight: 50,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  filterTabActive: {
    backgroundColor: Colors.gold + '22',
    borderColor: Colors.gold,
  },
  filterTabText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.gold,
    fontWeight: FontWeight.bold,
  },
  listContent: {
    padding: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.base,
    color: Colors.textMuted,
  },
});
