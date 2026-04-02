// Powered by OnSpace.AI
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { GameEvent } from '@/services/gameEngine';

interface EventCardProps {
  event: GameEvent;
  onChoice: (eventId: string, choiceId: string) => void;
  selectedChoice?: string;
  isGoverning?: boolean;
}

const TYPE_ICONS: Record<string, any> = {
  economic: 'chart-line',
  political: 'vote',
  social: 'account-group',
  international: 'earth',
  environmental: 'leaf',
  emergency: 'alert-circle',
  scandal: 'alert-octagon',
  opportunity: 'star-circle',
};

const URGENCY_COLORS: Record<string, string> = {
  low: Colors.info,
  medium: Colors.warning,
  high: Colors.error,
  critical: '#FF0000',
};

export const EventCard = React.memo(function EventCard({ event, onChoice, selectedChoice, isGoverning }: EventCardProps) {
  const [expanded, setExpanded] = useState(true);
  const iconName = TYPE_ICONS[event.type] || 'information';
  const urgencyColor = URGENCY_COLORS[event.urgency] || Colors.info;

  return (
    <View style={[styles.card, { borderLeftColor: urgencyColor }]}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: urgencyColor + '22' }]}>
          <MaterialCommunityIcons name={iconName} size={20} color={urgencyColor} />
        </View>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={styles.urgencyTag}>{event.urgency.toUpperCase()}</Text>
            <Text style={styles.typeTag}>{event.type.toUpperCase()}</Text>
          </View>
          <Text style={styles.title}>{event.title}</Text>
        </View>
        <MaterialCommunityIcons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={Colors.textSecondary} 
        />
      </Pressable>
      
      {expanded ? (
        <View style={styles.body}>
          <Text style={styles.description}>{event.description}</Text>
          
          <Text style={styles.chooseLabel}>
            {isGoverning ? 'Government response:' : 'Opposition response:'}
          </Text>
          
          {event.choices.map(choice => {
            const isSelected = selectedChoice === choice.id;
            return (
              <Pressable
                key={choice.id}
                onPress={() => onChoice(event.id, choice.id)}
                style={({ pressed }) => [
                  styles.choice,
                  isSelected && styles.choiceSelected,
                  pressed && styles.choicePressed,
                ]}
              >
                <View style={styles.choiceRow}>
                  <View style={[styles.choiceRadio, isSelected && styles.choiceRadioSelected]}>
                    {isSelected ? <View style={styles.choiceRadioDot} /> : null}
                  </View>
                  <View style={styles.choiceContent}>
                    <Text style={[styles.choiceLabel, isSelected && styles.choiceLabelSelected]}>
                      {choice.label}
                    </Text>
                    <Text style={styles.choiceDesc}>{choice.description}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderLeftWidth: 3,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  urgencyTag: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.error,
    backgroundColor: Colors.error + '22',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  typeTag: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  body: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  chooseLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  choice: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.sm,
    marginBottom: 8,
    backgroundColor: Colors.surfaceElevated,
  },
  choiceSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold + '15',
  },
  choicePressed: {
    opacity: 0.8,
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  choiceRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  choiceRadioSelected: {
    borderColor: Colors.gold,
  },
  choiceRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
  choiceContent: {
    flex: 1,
  },
  choiceLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  choiceLabelSelected: {
    color: Colors.goldLight,
  },
  choiceDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
