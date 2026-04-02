// Powered by OnSpace.AI
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, ScrollView } from 'react-native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { REAL_PROVINCES } from '@/constants/provinces';
import { PARTIES } from '@/constants/parties';
import { SeatCount, ProvinceSeatCount } from '@/services/gameEngine';

interface ElectoralMapProps {
  seats: SeatCount;
  provincialSeats: ProvinceSeatCount;
  playerPartyId: string;
  highlightProvince?: string;
  onProvincePress?: (code: string) => void;
  animated?: boolean;
  revealedProvinces?: string[];
}

// Map layout: province grid positions
const PROVINCE_LAYOUT = [
  // Row 1: North
  [null, null, { code: 'YT' }, { code: 'NT' }, null, null, null, { code: 'NU' }],
  // Row 2: West/Prairies
  [{ code: 'BC' }, { code: 'AB' }, { code: 'SK' }, { code: 'MB' }, { code: 'ON' }, { code: 'QC' }, { code: 'NB' }, { code: 'NS' }],
  // Row 3: Atlantic
  [null, null, null, null, null, null, { code: 'PE' }, { code: 'NL' }],
];

export function ElectoralMap({ seats, provincialSeats, playerPartyId, highlightProvince, onProvincePress, animated, revealedProvinces }: ElectoralMapProps) {
  const fadeAnims = useRef<Record<string, Animated.Value>>({});
  
  REAL_PROVINCES.forEach(p => {
    if (!fadeAnims.current[p.code]) {
      fadeAnims.current[p.code] = new Animated.Value(animated ? 0 : 1);
    }
  });
  
  useEffect(() => {
    if (animated && revealedProvinces) {
      revealedProvinces.forEach((code, idx) => {
        setTimeout(() => {
          Animated.timing(fadeAnims.current[code], {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }).start();
        }, idx * 200);
      });
    }
  }, [revealedProvinces, animated]);

  const getDominantParty = (code: string): string => {
    const provSeats = provincialSeats[code];
    if (!provSeats) return 'independent';
    const maxSeats = Math.max(...Object.values(provSeats));
    return Object.keys(provSeats).find(k => provSeats[k] === maxSeats) || 'independent';
  };

  const getPartyColor = (partyId: string): string => {
    const party = PARTIES.find(p => p.id === partyId);
    return party?.color || Colors.textMuted;
  };

  const getTotalSeatsForProvince = (code: string): number => {
    const provSeats = provincialSeats[code];
    if (!provSeats) return 0;
    return Object.values(provSeats).reduce((a, b) => a + b, 0);
  };

  const getPlayerSeatsForProvince = (code: string): number => {
    return provincialSeats[code]?.[playerPartyId] || 0;
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapGrid}>
        {PROVINCE_LAYOUT.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((cell, colIdx) => {
              if (!cell) return <View key={colIdx} style={styles.emptyCell} />;
              
              const code = cell.code;
              const dominantParty = getDominantParty(code);
              const partyColor = getPartyColor(dominantParty);
              const isRevealed = !animated || (revealedProvinces?.includes(code) ?? true);
              const totalSeats = getTotalSeatsForProvince(code);
              const playerSeats = getPlayerSeatsForProvince(code);
              const isHighlighted = highlightProvince === code;
              const isPlayer = dominantParty === playerPartyId;
              
              return (
                <Animated.View
                  key={code}
                  style={[
                    styles.cellWrapper,
                    { opacity: fadeAnims.current[code] || 1 },
                  ]}
                >
                  <Pressable
                    onPress={() => onProvincePress?.(code)}
                    style={({ pressed }) => [
                      styles.provinceCell,
                      {
                        backgroundColor: isRevealed ? partyColor + '33' : Colors.surfaceBorder,
                        borderColor: isHighlighted ? Colors.gold : isPlayer ? partyColor : Colors.surfaceBorder,
                        borderWidth: isHighlighted || isPlayer ? 2 : 1,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={[
                      styles.provinceCode,
                      { color: isRevealed ? partyColor : Colors.textMuted },
                    ]}>
                      {code}
                    </Text>
                    {isRevealed ? (
                      <Text style={[styles.seatsText, { color: partyColor }]}>
                        {totalSeats}
                      </Text>
                    ) : (
                      <Text style={styles.unknownText}>?</Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        {PARTIES.filter(p => seats[p.id] > 0).map(party => (
          <View key={party.id} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: party.color }]} />
            <Text style={styles.legendText}>{party.shortName}</Text>
            <Text style={[styles.legendSeats, { color: party.color }]}>
              {seats[party.id] || 0}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Seat bar with majority marker */}
      <View style={styles.seatBarWrapper}>
        <View style={styles.seatBar}>
          {PARTIES.filter(p => (seats[p.id] || 0) > 0).map(party => {
            const pct = ((seats[party.id] || 0) / 343) * 100;
            return (
              <View
                key={party.id}
                style={[styles.seatBarSegment, { width: `${pct}%` as any, backgroundColor: party.color }]}
              />
            );
          })}
        </View>
        {/* Majority line at exactly 172/343 = 50.15% */}
        <View style={[styles.majorityMarker, { left: '50.1%' }]} />
      </View>
      <View style={styles.majorityLine}>
        <Text style={styles.majorityLabel}>▲ 172 seats = majority</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  mapGrid: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  emptyCell: {
    width: 40,
    height: 44,
  },
  cellWrapper: {
    width: 40,
    height: 44,
  },
  provinceCell: {
    flex: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  provinceCode: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
  },
  seatsText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  unknownText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  legendSeats: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  seatBarWrapper: {
    position: 'relative',
  },
  seatBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceBorder,
  },
  seatBarSegment: {
    height: '100%',
  },
  majorityMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 14,
    backgroundColor: Colors.gold,
  },
  majorityLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  majorityLabel: {
    fontSize: FontSize.xs,
    color: Colors.gold,
    fontWeight: '600' as const,
  },
});
