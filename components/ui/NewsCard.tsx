// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { NewsArticle } from '@/services/gameEngine';
import { OUTLET_PROFILES } from '@/services/newsService';

interface NewsCardProps {
  article: NewsArticle;
  compact?: boolean;
}

export const NewsCard = React.memo(function NewsCard({ article, compact }: NewsCardProps) {
  const outlet = OUTLET_PROFILES.find(o => o.name === article.outlet);
  const sentimentColor = article.sentiment === 'positive' ? Colors.success 
    : article.sentiment === 'negative' ? Colors.error 
    : Colors.textSecondary;
  const sentimentIcon = article.sentiment === 'positive' ? 'trending-up' 
    : article.sentiment === 'negative' ? 'trending-down' 
    : 'minus';

  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.header}>
        <View style={[styles.outletBadge, { backgroundColor: (outlet?.color || '#333') + '33' }]}>
          <MaterialCommunityIcons 
            name={(outlet?.logo as any) || 'newspaper'} 
            size={14} 
            color={outlet?.color || Colors.textSecondary} 
          />
          <Text style={[styles.outletName, { color: outlet?.color || Colors.textSecondary }]}>
            {article.outlet}
          </Text>
        </View>
        <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor + '22' }]}>
          <MaterialCommunityIcons name={sentimentIcon as any} size={12} color={sentimentColor} />
        </View>
        <Text style={styles.weekLabel}>Wk {article.week}</Text>
      </View>
      
      <Text style={styles.headline} numberOfLines={compact ? 2 : 3}>
        {article.headline}
      </Text>
      
      {!compact ? (
        <Text style={styles.body} numberOfLines={3}>
          {article.body}
        </Text>
      ) : null}
      
      <View style={styles.footer}>
        <View style={[styles.topicTag, { backgroundColor: Colors.surfaceElevated }]}>
          <Text style={styles.topicText}>{article.topic}</Text>
        </View>
      </View>
    </View>
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
  compact: {
    padding: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: 8,
  },
  outletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  outletName: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  sentimentBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: {
    marginLeft: 'auto',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  headline: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 8,
  },
  body: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  topicText: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
