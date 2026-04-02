// Powered by OnSpace.AI
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '@/hooks/useGame';
import { ElectoralMap } from '@/components/feature/ElectoralMap';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { REAL_PROVINCES } from '@/constants/provinces';
import { PARTIES } from '@/constants/parties';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { gameState } = useGame();
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const selectedProvinceData = selectedProvince 
    ? REAL_PROVINCES.find(p => p.code === selectedProvince) 
    : null;
  const selectedProvinceSeats = selectedProvince 
    ? gameState.provincialSeats[selectedProvince] 
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Electoral Map</Text>
        <Text style={styles.headerSub}>Canada — 343 Seats</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mapContainer}>
          <ElectoralMap
            seats={gameState.seats}
            provincialSeats={gameState.provincialSeats}
            playerPartyId={gameState.playerPartyId}
            highlightProvince={selectedProvince || undefined}
            onProvincePress={setSelectedProvince}
          />
        </View>

        {/* Province Detail */}
        {selectedProvinceData && selectedProvinceSeats ? (
          <View style={styles.provinceDetail}>
            <View style={styles.provinceDetailHeader}>
              <View>
                <Text style={styles.provinceName}>{selectedProvinceData.name}</Text>
                <Text style={styles.provinceCode}>{selectedProvinceData.code} • {selectedProvinceData.seats} seats • {selectedProvinceData.region}</Text>
              </View>
              <Pressable onPress={() => setSelectedProvince(null)}>
                <MaterialCommunityIcons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.provinceSeatBreakdown}>
              {Object.entries(selectedProvinceSeats)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([partyId, count]) => {
                  const partyInfo = PARTIES.find(p => p.id === partyId);
                  const pct = (count / selectedProvinceData.seats) * 100;
                  const isPlayer = partyId === gameState.playerPartyId;
                  return (
                    <View key={partyId} style={[styles.provincePartyRow, isPlayer && styles.provincePartyRowPlayer]}>
                      <View style={[styles.partyColorBar, { backgroundColor: partyInfo?.color || Colors.textMuted }]} />
                      <Text style={[styles.provincePartyName, isPlayer && { color: Colors.gold }]}>
                        {partyInfo?.shortName || partyId}
                        {isPlayer ? ' ★' : ''}
                      </Text>
                      <View style={styles.provinceBarContainer}>
                        <View style={[styles.provinceBar, { width: `${pct}%` as any, backgroundColor: partyInfo?.color || Colors.textMuted }]} />
                      </View>
                      <Text style={[styles.provinceSeats, { color: partyInfo?.color || Colors.textMuted }]}>
                        {count}
                      </Text>
                    </View>
                  );
                })}
            </View>

            <View style={styles.playerProvinceStat}>
              <Text style={styles.playerProvinceLabel}>Your seats in {selectedProvinceData.code}:</Text>
              <Text style={[styles.playerProvinceSeatCount, { color: party?.color }]}>
                {selectedProvinceSeats[gameState.playerPartyId] || 0} / {selectedProvinceData.seats}
              </Text>
            </View>
          </View>
        ) : null}

        {/* National Seat Summary */}
        <View style={styles.nationalSummary}>
          <Text style={styles.sectionTitle}>NATIONAL STANDING</Text>
          {PARTIES
            .filter(p => (gameState.seats[p.id] || 0) > 0)
            .sort((a, b) => (gameState.seats[b.id] || 0) - (gameState.seats[a.id] || 0))
            .map(p => {
              const seatCount = gameState.seats[p.id] || 0;
              const pct = (seatCount / 343) * 100;
              const isPlayer = p.id === gameState.playerPartyId;
              return (
                <View key={p.id} style={[styles.nationalPartyRow, isPlayer && { borderLeftColor: p.color, borderLeftWidth: 3 }]}>
                  <View style={styles.nationalPartyLeft}>
                    <View style={[styles.nationalDot, { backgroundColor: p.color }]} />
                    <View>
                      <Text style={[styles.nationalPartyName, isPlayer && { color: Colors.gold }]}>
                        {p.name} {isPlayer ? '★' : ''}
                      </Text>
                      <Text style={styles.nationalPartyIdeology}>{p.ideology}</Text>
                    </View>
                  </View>
                  <View style={styles.nationalPartyRight}>
                    <Text style={[styles.nationalSeatCount, { color: p.color }]}>{seatCount}</Text>
                    <Text style={styles.nationalSeatPct}>{pct.toFixed(1)}%</Text>
                  </View>
                </View>
              );
            })}
        </View>

        {/* Regional Breakdown */}
        <View style={styles.regionalBreakdown}>
          <Text style={styles.sectionTitle}>REGIONAL BREAKDOWN</Text>
          {['West', 'Prairies', 'Ontario', 'Quebec', 'Atlantic', 'North'].map(region => {
            const regionProvinces = REAL_PROVINCES.filter(p => p.region === region);
            const totalRegionSeats = regionProvinces.reduce((sum, p) => sum + p.seats, 0);
            const playerRegionSeats = regionProvinces.reduce((sum, p) => 
              sum + (gameState.provincialSeats[p.code]?.[gameState.playerPartyId] || 0), 0);
            
            return (
              <View key={region} style={styles.regionRow}>
                <View style={styles.regionLeft}>
                  <Text style={styles.regionName}>{region}</Text>
                  <Text style={styles.regionProvinces}>{regionProvinces.map(p => p.code).join(', ')}</Text>
                </View>
                <View style={styles.regionBarContainer}>
                  <View style={[styles.regionBar, { 
                    width: `${(playerRegionSeats / totalRegionSeats) * 100}%` as any, 
                    backgroundColor: party?.color || Colors.primary 
                  }]} />
                </View>
                <Text style={[styles.regionSeats, { color: party?.color }]}>
                  {playerRegionSeats}/{totalRegionSeats}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  mapContainer: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  provinceDetail: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gold + '44',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  provinceDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  provinceName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  provinceCode: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  provinceSeatBreakdown: {
    gap: 8,
  },
  provincePartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingLeft: 8,
    borderRadius: Radius.sm,
  },
  provincePartyRowPlayer: {
    backgroundColor: Colors.gold + '11',
  },
  partyColorBar: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  provincePartyName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    width: 40,
  },
  provinceBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  provinceBar: {
    height: '100%',
    borderRadius: 3,
  },
  provinceSeats: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    minWidth: 25,
    textAlign: 'right',
  },
  playerProvinceStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  playerProvinceLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  playerProvinceSeatCount: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  nationalSummary: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  nationalPartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingLeft: 8,
    borderRadius: Radius.sm,
    borderLeftWidth: 0,
  },
  nationalPartyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  nationalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nationalPartyName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  nationalPartyIdeology: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  nationalPartyRight: {
    alignItems: 'flex-end',
  },
  nationalSeatCount: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  nationalSeatPct: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  regionalBreakdown: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  regionLeft: {
    width: 80,
  },
  regionName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  regionProvinces: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  regionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  regionBar: {
    height: '100%',
    borderRadius: 4,
  },
  regionSeats: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    minWidth: 45,
    textAlign: 'right',
  },
});
