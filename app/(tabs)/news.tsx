// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '@/hooks/useGame';
import { NewsCard } from '@/components/ui/NewsCard';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { OUTLET_PROFILES } from '@/services/newsService';

type NewsFilter = 'all' | 'positive' | 'negative' | 'neutral' | string;
type TopicFilter = 'all' | string;

const TOPICS = ['All', 'Economy', 'Politics', 'Parliament', 'Housing', 'Healthcare', 'Environment', 'Defence', 'Policy', 'international', 'scandal'];

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const { gameState } = useGame();
  const [selectedOutlet, setSelectedOutlet] = useState<NewsFilter>('all');
  const [selectedTopic, setSelectedTopic] = useState<TopicFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!gameState) return null;

  const articles = gameState.newsHistory;

  // Apply filters
  const filtered = articles.filter(a => {
    const outletMatch =
      selectedOutlet === 'all' ? true :
      selectedOutlet === 'positive' ? a.sentiment === 'positive' :
      selectedOutlet === 'negative' ? a.sentiment === 'negative' :
      selectedOutlet === 'neutral' ? a.sentiment === 'neutral' :
      a.outlet === selectedOutlet;
    const topicMatch = selectedTopic === 'all' ? true : a.topic?.toLowerCase() === selectedTopic.toLowerCase();
    return outletMatch && topicMatch;
  });

  const positiveCount = articles.filter(a => a.sentiment === 'positive').length;
  const negativeCount = articles.filter(a => a.sentiment === 'negative').length;
  const neutralCount = articles.filter(a => a.sentiment === 'neutral').length;
  const total = articles.length;

  // Sentiment bar widths
  const posPct = total > 0 ? (positiveCount / total) * 100 : 0;
  const negPct = total > 0 ? (negativeCount / total) * 100 : 0;
  const neuPct = total > 0 ? (neutralCount / total) * 100 : 0;

  // Latest per outlet for outlet dashboard
  const outletLatest: Record<string, { sentiment: string; count: number }> = {};
  OUTLET_PROFILES.forEach(o => {
    const outletArticles = articles.filter(a => a.outlet === o.name);
    if (outletArticles.length > 0) {
      const sentiments = outletArticles.reduce((acc, a) => {
        acc[a.sentiment] = (acc[a.sentiment] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const dominant = Object.entries(sentiments).sort(([, a], [, b]) => b - a)[0][0];
      outletLatest[o.name] = { sentiment: dominant, count: outletArticles.length };
    }
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Media Coverage</Text>
          <Text style={styles.headerSub}>
            {total} article{total !== 1 ? 's' : ''} — Week {gameState.currentWeek}
          </Text>
        </View>
        <View style={styles.aiNewsBadge}>
          <MaterialCommunityIcons name="robot" size={12} color={Colors.gold} />
          <Text style={styles.aiNewsText}>AI-Generated</Text>
        </View>
      </View>

      {/* Sentiment dashboard */}
      {total > 0 ? (
        <View style={styles.sentimentDashboard}>
          {/* Combined sentiment bar */}
          <View style={styles.sentimentBar}>
            <View style={[styles.sentimentSegPos, { flex: posPct }]} />
            <View style={[styles.sentimentSegNeu, { flex: neuPct }]} />
            <View style={[styles.sentimentSegNeg, { flex: negPct }]} />
          </View>
          {/* Counts */}
          <View style={styles.sentimentCounts}>
            <Pressable
              onPress={() => setSelectedOutlet(prev => prev === 'positive' ? 'all' : 'positive')}
              style={[styles.sentimentCount, selectedOutlet === 'positive' && styles.sentimentCountActive]}
            >
              <MaterialCommunityIcons name="trending-up" size={14} color={Colors.success} />
              <Text style={[styles.sentimentNum, { color: Colors.success }]}>{positiveCount}</Text>
              <Text style={styles.sentimentLabel}>Positive</Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedOutlet(prev => prev === 'neutral' ? 'all' : 'neutral')}
              style={[styles.sentimentCount, selectedOutlet === 'neutral' && styles.sentimentCountActive]}
            >
              <MaterialCommunityIcons name="minus" size={14} color={Colors.textSecondary} />
              <Text style={[styles.sentimentNum, { color: Colors.textSecondary }]}>{neutralCount}</Text>
              <Text style={styles.sentimentLabel}>Neutral</Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedOutlet(prev => prev === 'negative' ? 'all' : 'negative')}
              style={[styles.sentimentCount, selectedOutlet === 'negative' && styles.sentimentCountActive]}
            >
              <MaterialCommunityIcons name="trending-down" size={14} color={Colors.error} />
              <Text style={[styles.sentimentNum, { color: Colors.error }]}>{negativeCount}</Text>
              <Text style={styles.sentimentLabel}>Negative</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Outlet tracker — horizontal strip */}
      {total > 0 ? (
        <View style={styles.outletStrip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.outletStripContent}
          >
            <Pressable
              onPress={() => setSelectedOutlet('all')}
              style={[styles.outletChip, selectedOutlet === 'all' && [styles.outletChipActive, { borderColor: Colors.gold }]]}
            >
              <MaterialCommunityIcons name="newspaper-variant" size={13} color={selectedOutlet === 'all' ? Colors.gold : Colors.textMuted} />
              <Text style={[styles.outletChipText, selectedOutlet === 'all' && { color: Colors.gold }]}>All Outlets</Text>
            </Pressable>
            {OUTLET_PROFILES.map(outlet => {
              const info = outletLatest[outlet.name];
              if (!info) return null;
              const isSelected = selectedOutlet === outlet.name;
              const sentColor = info.sentiment === 'positive' ? Colors.success : info.sentiment === 'negative' ? Colors.error : Colors.textMuted;
              return (
                <Pressable
                  key={outlet.name}
                  onPress={() => setSelectedOutlet(isSelected ? 'all' : outlet.name)}
                  style={[
                    styles.outletChip,
                    isSelected && [styles.outletChipActive, { borderColor: outlet.color }],
                  ]}
                >
                  <MaterialCommunityIcons
                    name={outlet.logo as any}
                    size={13}
                    color={isSelected ? outlet.color : Colors.textMuted}
                  />
                  <View style={styles.outletChipContent}>
                    <Text style={[styles.outletChipText, isSelected && { color: outlet.color }]} numberOfLines={1}>
                      {outlet.name.replace(' News', '').replace(' and ', ' & ')}
                    </Text>
                    <View style={[styles.outletSentDot, { backgroundColor: sentColor }]} />
                  </View>
                  <View style={[styles.outletCount, { backgroundColor: outlet.color + '33' }]}>
                    <Text style={[styles.outletCountText, { color: outlet.color }]}>{info.count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Topic filter */}
      {total > 0 ? (
        <View style={styles.topicStrip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topicStripContent}
          >
            {TOPICS.map(topic => {
              const id = topic.toLowerCase() === 'all' ? 'all' : topic.toLowerCase();
              const isActive = selectedTopic === id;
              return (
                <Pressable
                  key={topic}
                  onPress={() => setSelectedTopic(isActive ? 'all' : id)}
                  style={[styles.topicChip, isActive && styles.topicChipActive]}
                >
                  <Text style={[styles.topicChipText, isActive && { color: Colors.textPrimary, fontWeight: FontWeight.bold }]}>
                    {topic}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Articles list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="newspaper-variant-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{total === 0 ? 'No News Yet' : 'No Matching Articles'}</Text>
            <Text style={styles.emptySubtitle}>
              {total === 0
                ? 'Take actions — press statements, event responses, policies, and Question Period answers all generate AI media coverage.'
                : 'Try a different filter combination.'}
            </Text>
            {total > 0 ? (
              <Pressable
                onPress={() => { setSelectedOutlet('all'); setSelectedTopic('all'); }}
                style={styles.clearFiltersBtn}
              >
                <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <ExpandableNewsCard
            article={item}
            isExpanded={expandedId === item.id}
            onToggle={() => setExpandedId(prev => prev === item.id ? null : item.id)}
          />
        )}
      />
    </View>
  );
}

function ExpandableNewsCard({ article, isExpanded, onToggle }: { article: any; isExpanded: boolean; onToggle: () => void }) {
  const outlet = OUTLET_PROFILES.find(o => o.name === article.outlet);
  const sentimentColor = article.sentiment === 'positive' ? Colors.success : article.sentiment === 'negative' ? Colors.error : Colors.textSecondary;
  const sentimentIcon = article.sentiment === 'positive' ? 'trending-up' : article.sentiment === 'negative' ? 'trending-down' : 'minus';

  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [styles.newsCard, pressed && { opacity: 0.95 }]}>
      {/* Outlet header */}
      <View style={styles.newsCardHeader}>
        <View style={[styles.newsOutletBadge, { backgroundColor: (outlet?.color || '#333') + '22' }]}>
          <MaterialCommunityIcons
            name={(outlet?.logo as any) || 'newspaper'}
            size={13}
            color={outlet?.color || Colors.textSecondary}
          />
          <Text style={[styles.newsOutletName, { color: outlet?.color || Colors.textSecondary }]}>
            {article.outlet}
          </Text>
        </View>
        <View style={styles.newsCardRight}>
          <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor + '22', borderColor: sentimentColor + '44' }]}>
            <MaterialCommunityIcons name={sentimentIcon as any} size={11} color={sentimentColor} />
            <Text style={[styles.sentimentBadgeText, { color: sentimentColor }]}>
              {article.sentiment.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.newsWeek}>Wk {article.week}</Text>
        </View>
      </View>

      {/* Bias indicator */}
      {outlet ? (
        <View style={styles.biasRow}>
          <View style={styles.biasBar}>
            <View style={[styles.biasIndicator, {
              left: `${Math.max(0, Math.min(90, ((outlet.spinFactor + 1) / 2) * 90))}%` as any,
              backgroundColor: outlet.color,
            }]} />
          </View>
          <Text style={styles.biasLabel}>{outlet.bias}</Text>
        </View>
      ) : null}

      {/* Headline */}
      <Text style={[styles.newsHeadline, isExpanded ? undefined : styles.newsHeadlineCollapsed]}>
        {article.headline}
      </Text>

      {/* Body — expanded */}
      {isExpanded && article.body ? (
        <Text style={styles.newsBody}>{article.body}</Text>
      ) : null}

      {/* Footer */}
      <View style={styles.newsCardFooter}>
        <View style={[styles.topicTag, { backgroundColor: Colors.surfaceElevated }]}>
          <Text style={styles.topicTagText}>{article.topic?.toUpperCase()}</Text>
        </View>
        <MaterialCommunityIcons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={Colors.textMuted}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

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
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  aiNewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gold + '22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gold + '44',
  },
  aiNewsText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.gold },

  sentimentDashboard: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    gap: 8,
  },
  sentimentBar: {
    height: 8,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceBorder,
  },
  sentimentSegPos: { backgroundColor: Colors.success },
  sentimentSegNeu: { backgroundColor: Colors.textMuted },
  sentimentSegNeg: { backgroundColor: Colors.error },
  sentimentCounts: { flexDirection: 'row' },
  sentimentCount: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  sentimentCountActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  sentimentNum: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  sentimentLabel: { fontSize: FontSize.xs, color: Colors.textMuted },

  outletStrip: {
    height: 52,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  outletStripContent: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  outletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  outletChipActive: {},
  outletChipContent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  outletChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  outletSentDot: { width: 6, height: 6, borderRadius: 3 },
  outletCount: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.full,
    minWidth: 18,
    alignItems: 'center',
  },
  outletCountText: { fontSize: 9, fontWeight: FontWeight.bold },

  topicStrip: {
    height: 44,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  topicStripContent: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: 6,
    alignItems: 'center',
    paddingVertical: 6,
  },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  topicChipActive: {
    backgroundColor: Colors.gold + '22',
    borderColor: Colors.gold + '66',
  },
  topicChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },

  listContent: { padding: Spacing.md, gap: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  clearFiltersBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.sm,
  },
  clearFiltersBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },

  // Expanded news card
  newsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 8,
  },
  newsCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newsOutletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  newsOutletName: { fontSize: 11, fontWeight: FontWeight.semibold },
  newsCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  sentimentBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.3 },
  newsWeek: { fontSize: FontSize.xs, color: Colors.textMuted },
  biasRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  biasBar: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  biasIndicator: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: -2.5,
    marginLeft: -4,
  },
  biasLabel: { fontSize: 9, color: Colors.textMuted, width: 70, textAlign: 'right' },
  newsHeadline: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, lineHeight: 22 },
  newsHeadlineCollapsed: {},
  newsBody: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  newsCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topicTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  topicTagText: { fontSize: 10, fontWeight: FontWeight.medium, color: Colors.textSecondary, letterSpacing: 0.5 },
});
