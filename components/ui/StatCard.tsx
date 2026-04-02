// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  compact?: boolean;
}

export const StatCard = React.memo(function StatCard({ 
  label, value, subtitle, color, trend, trendValue, compact 
}: StatCardProps) {
  const trendColor = trend === 'up' ? Colors.success : trend === 'down' ? Colors.error : Colors.textSecondary;
  const trendIcon = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—';
  
  return (
    <View style={[styles.card, compact && styles.compact]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, color ? { color } : null]}>
        {value}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {trend && trendValue ? (
        <View style={styles.trendRow}>
          <Text style={[styles.trendText, { color: trendColor }]}>
            {trendIcon} {trendValue}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    flex: 1,
  },
  compact: {
    padding: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  trendRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
