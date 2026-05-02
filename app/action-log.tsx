// Powered by OnSpace.AI — Action Log Screen
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { ActionLogEntry } from '@/contexts/GameContext';

const CATEGORY_ICONS: Record<ActionLogEntry['category'], string> = {
  bill: 'file-document', vote: 'vote', alliance: 'handshake', law: 'gavel',
  foreign_policy: 'earth', cabinet: 'briefcase', debate: 'comment-question',
  scandal: 'alert-octagon', election: 'ballot', emergency: 'alert-octagram',
  court: 'scale-balance', other: 'information',
};

const CATEGORY_COLORS: Record<ActionLogEntry['category'], string> = {
  bill: Colors.info, vote: Colors.liberal, alliance: Colors.gold, law: Colors.success,
  foreign_policy: Colors.ndp, cabinet: Colors.warning, debate: Colors.info,
  scandal: Colors.error, election: Colors.gold, emergency: Colors.error,
  court: Colors.gold, other: Colors.textMuted,
};

const SEVERITY_COLORS: Record<string, string> = {
  low: Colors.textMuted, medium: Colors.info, high: Colors.warning, critical: Colors.error,
};

type FilterCat = 'all' | ActionLogEntry['category'];

export default function ActionLogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { actionLog } = useGame();
  const [filter, setFilter] = useState<FilterCat>('all');

  const filtered = filter === 'all' ? actionLog : actionLog.filter(e => e.category === filter);

  const categories: FilterCat[] = ['all', 'bill', 'vote', 'election', 'foreign_policy', 'cabinet', 'scandal', 'court', 'emergency'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Parliamentary Action Log</Text>
          <Text style={styles.headerSub}>{actionLog.length} actions recorded</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={item => item}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 8, paddingVertical: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setFilter(item)}
              style={[styles.filterTab, filter === item && { backgroundColor: Colors.gold + '22', borderColor: Colors.gold }]}
            >
              {item !== 'all' ? <MaterialCommunityIcons name={CATEGORY_ICONS[item as ActionLogEntry['category']] as any} size={11} color={filter === item ? Colors.gold : Colors.textMuted} /> : null}
              <Text style={[styles.filterTabText, filter === item && { color: Colors.gold, fontWeight: FontWeight.bold }]}>
                {item === 'all' ? 'All' : item.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </Pressable>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="book-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No actions recorded in this category</Text>
          </View>
        }
        renderItem={({ item }) => {
          const catColor = CATEGORY_COLORS[item.category] || Colors.textMuted;
          const sevColor = SEVERITY_COLORS[item.severity || 'low'];
          return (
            <View style={styles.logEntry}>
              <View style={[styles.logIconWrap, { backgroundColor: catColor + '22' }]}>
                <MaterialCommunityIcons name={CATEGORY_ICONS[item.category] as any} size={15} color={catColor} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.logEntryHeader}>
                  <Text style={styles.logAction}>{item.action}</Text>
                  <View style={[styles.weekBadge]}>
                    <Text style={styles.weekBadgeText}>W{item.week}</Text>
                  </View>
                  {item.severity && item.severity !== 'low' ? (
                    <View style={[styles.severityDot, { backgroundColor: sevColor }]} />
                  ) : null}
                </View>
                <Text style={styles.logDesc} numberOfLines={2}>{item.description}</Text>
                {item.impact ? <Text style={styles.logImpact}>{item.impact}</Text> : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  filterRow: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  filterTabText: { fontSize: FontSize.xs, color: Colors.textMuted },
  listContent: { padding: Spacing.md, gap: 6 },
  logEntry: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm },
  logIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logEntryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  logAction: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary, flex: 1 },
  weekBadge: { backgroundColor: Colors.surfaceElevated, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  weekBadgeText: { fontSize: 9, color: Colors.textMuted, fontWeight: FontWeight.bold },
  severityDot: { width: 6, height: 6, borderRadius: 3 },
  logDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  logImpact: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.medium },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted },
});
