// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';
import { SeatCount } from '@/services/gameEngine';
import { MAJORITY_SEATS, TOTAL_SEATS } from '@/constants/provinces';

interface ParliamentBarProps {
  seats: SeatCount;
  playerPartyId: string;
}

export function ParliamentBar({ seats, playerPartyId }: ParliamentBarProps) {
  const sortedParties = PARTIES
    .filter(p => (seats[p.id] || 0) > 0)
    .sort((a, b) => (seats[b.id] || 0) - (seats[a.id] || 0));
  
  const playerSeats = seats[playerPartyId] || 0;
  const govStatus = playerSeats >= MAJORITY_SEATS ? 'MAJORITY' : 
    playerSeats > 0 && playerSeats === Math.max(...Object.values(seats)) ? 'MINORITY' : 'OPPOSITION';
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>House of Commons — {TOTAL_SEATS} Seats</Text>
        <View style={[
          styles.govBadge,
          govStatus === 'MAJORITY' ? { backgroundColor: Colors.success + '22', borderColor: Colors.success + '44' } :
          govStatus === 'MINORITY' ? { backgroundColor: Colors.warning + '22', borderColor: Colors.warning + '44' } :
          { backgroundColor: Colors.error + '22', borderColor: Colors.error + '44' }
        ]}>
          <Text style={[
            styles.govBadgeText,
            govStatus === 'MAJORITY' ? { color: Colors.success } :
            govStatus === 'MINORITY' ? { color: Colors.warning } :
            { color: Colors.error }
          ]}>
            {govStatus}
          </Text>
        </View>
      </View>
      
      {/* Seat bar */}
      <View style={styles.seatBar}>
        {sortedParties.map(party => {
          const pct = ((seats[party.id] || 0) / TOTAL_SEATS) * 100;
          const isPlayer = party.id === playerPartyId;
          return (
            <View
              key={party.id}
              style={[
                styles.segment,
                { 
                  width: `${pct}%` as any,
                  backgroundColor: party.color,
                  borderWidth: isPlayer ? 2 : 0,
                  borderColor: Colors.gold,
                }
              ]}
            />
          );
        })}
      </View>
      
      {/* Majority line */}
      <View style={styles.majorityContainer}>
        <View style={[styles.majorityLine, { left: `${(MAJORITY_SEATS / TOTAL_SEATS) * 100}%` as any }]}>
          <View style={styles.majorityBar} />
          <Text style={styles.majorityText}>172</Text>
        </View>
      </View>
      
      {/* Party breakdown */}
      <View style={styles.breakdown}>
        {sortedParties.map(party => {
          const isPlayer = party.id === playerPartyId;
          return (
            <View key={party.id} style={[styles.partyItem, isPlayer && styles.partyItemPlayer]}>
              <View style={[styles.partyDot, { backgroundColor: party.color }]} />
              <View style={styles.partyInfo}>
                <Text style={[styles.partyName, isPlayer && { color: Colors.gold }]}>
                  {party.shortName}
                  {isPlayer ? ' ★' : ''}
                </Text>
                <Text style={[styles.partySeats, { color: party.color }]}>
                  {seats[party.id] || 0}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  govBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  govBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  seatBar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceBorder,
    marginBottom: 4,
  },
  segment: {
    height: '100%',
  },
  majorityContainer: {
    position: 'relative',
    height: 18,
    marginBottom: Spacing.sm,
  },
  majorityLine: {
    position: 'absolute',
    alignItems: 'center',
  },
  majorityBar: {
    width: 2,
    height: 10,
    backgroundColor: Colors.gold,
  },
  majorityText: {
    fontSize: 9,
    color: Colors.gold,
    fontWeight: FontWeight.bold,
  },
  breakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  partyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  partyItemPlayer: {
    borderWidth: 1,
    borderColor: Colors.gold + '44',
    backgroundColor: Colors.gold + '11',
  },
  partyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  partyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  partyName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  partySeats: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
});
