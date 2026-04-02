// Powered by OnSpace.AI
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/hooks/useGame';
import { NewsCard } from '@/components/ui/NewsCard';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { OUTLET_PROFILES } from '@/services/newsService';
import { Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type NewsFilter = 'all' | 'positive' | 'negative' | string;

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const { gameState } = useGame();
  const [selectedOutlet, setSelectedOutlet] = useState<NewsFilter>('all');

  if (!gameState) return null;

  const filteredNews = gameState.newsHistory.filter(article => {
    if (selectedOutlet === 'all') return true;
    if (selectedOutlet === 'positive') return article.sentiment === 'positive';
    if (selectedOutlet === 'negative') return article.sentiment === 'negative';
    return article.outlet === selectedOutlet;
  });

  const positiveCount = gameState.newsHistory.filter(a => a.sentiment === 'positive').length;
  const negativeCount = gameState.newsHistory.filter(a => a.sentiment === 'negative').length;
  const neutralCount = gameState.newsHistory.filter(a => a.sentiment === 'neutral').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Media Coverage</Text>
          <Text style={styles.headerSub}>{gameState.newsHistory.length} articles this parliament</Text>
        </View>
      </View>

      {/* Sentiment Summary */}
      <View style={styles.sentimentRow}>
        <Pressable 
          onPress={() => setSelectedOutlet(selectedOutlet === 'positive' ? 'all' : 'positive')}
          style={[styles.sentimentItem, selectedOutlet === 'positive' && styles.sentimentItemActive]}
        >
          <MaterialCommunityIcons name="trending-up" size={18} color={Colors.success} />
          <Text style={[styles.sentimentCount, { color: Colors.success }]}>{positiveCount}</Text>
          <Text style={styles.sentimentLabel}>Positive</Text>
        </Pressable>
        <Pressable 
          onPress={() => setSelectedOutlet(selectedOutlet === 'negative' ? 'all' : 'negative')}
          style={[styles.sentimentItem, selectedOutlet === 'negative' && styles.sentimentItemActive]}
        >
          <MaterialCommunityIcons name="trending-down" size={18} color={Colors.error} />
          <Text style={[styles.sentimentCount, { color: Colors.error }]}>{negativeCount}</Text>
          <Text style={styles.sentimentLabel}>Negative</Text>
        </Pressable>
        <View style={styles.sentimentItem}>
          <MaterialCommunityIcons name="minus" size={18} color={Colors.textSecondary} />
          <Text style={[styles.sentimentCount, { color: Colors.textSecondary }]}>{neutralCount}</Text>
          <Text style={styles.sentimentLabel}>Neutral</Text>
        </View>
      </View>

      {/* Outlet Filter */}
      <View style={styles.outletFilter}>
        <FlatList
          horizontal
          data={[{ name: 'All Outlets', bias: 'all', color: Colors.gold }, ...OUTLET_PROFILES]}
          keyExtractor={item => item.name}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.outletFilterContent}
          renderItem={({ item }) => {
            const isSelected = selectedOutlet === (item.bias === 'all' ? 'all' : item.name);
            return (
              <Pressable
                onPress={() => setSelectedOutlet(item.bias === 'all' ? 'all' : item.name)}
                style={[
                  styles.outletChip,
                  isSelected && { borderColor: item.color || Colors.gold, backgroundColor: (item.color || Colors.gold) + '22' }
                ]}
              >
                <Text style={[
                  styles.outletChipText,
                  isSelected && { color: item.color || Colors.gold }
                ]}>
                  {item.name === 'All Outlets' ? 'All' : item.name}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* News Articles */}
      <FlatList
        data={filteredNews}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="newspaper-variant-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No News Yet</Text>
            <Text style={styles.emptySubtitle}>
              Take actions in parliament to generate media coverage. Make press statements, respond to events, and vote on bills.
            </Text>
          </View>
        }
        renderItem={({ item }) => <NewsCard article={item} />}
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
  sentimentRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  sentimentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sentimentItemActive: {
    borderBottomColor: Colors.gold,
  },
  sentimentCount: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  sentimentLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  outletFilter: {
    height: 50,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  outletFilterContent: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: 8,
    alignItems: 'center',
    paddingVertical: 8,
  },
  outletChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  outletChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
