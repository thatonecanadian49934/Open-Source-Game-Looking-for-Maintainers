// Powered by OnSpace.AI
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '@/hooks/useGame';
import { ElectoralMap } from '@/components/feature/ElectoralMap';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { REAL_PROVINCES } from '@/constants/provinces';
import { PARTIES } from '@/constants/parties';

// ── Riding data ───────────────────────────────────────────────────────────────
interface Riding {
  name: string;
  mp: string;
  partyId: string;
  marginPct: number;
  demographic: string;
}

const PROVINCE_RIDINGS: Record<string, Riding[]> = {
  ON: [
    { name: 'Scarborough Centre', mp: 'James Chen', partyId: 'liberal', marginPct: 3.2, demographic: 'Urban multicultural' },
    { name: 'Ottawa West–Nepean', mp: 'Sarah Williams', partyId: 'liberal', marginPct: 7.8, demographic: 'Federal public servants' },
    { name: 'Brampton North', mp: 'Priya Singh', partyId: 'conservative', marginPct: 1.9, demographic: 'South Asian suburban' },
    { name: 'Hamilton East–Stoney Creek', mp: 'Kevin MacDonald', partyId: 'ndp', marginPct: 5.6, demographic: 'Industrial working class' },
    { name: 'Kingston and the Islands', mp: 'Dr. Claire Beaumont', partyId: 'liberal', marginPct: 11.2, demographic: 'University town' },
    { name: 'Mississauga–Erin Mills', mp: 'Robert Park', partyId: 'conservative', marginPct: 4.1, demographic: 'Professional suburban' },
    { name: 'London West', mp: 'Amanda Okafor', partyId: 'liberal', marginPct: 8.9, demographic: 'University & healthcare' },
    { name: 'Niagara Falls', mp: 'Thomas Fontaine', partyId: 'conservative', marginPct: 2.7, demographic: 'Tourism & manufacturing' },
    { name: 'Peterborough–Kawartha', mp: 'Lisa Crawford', partyId: 'conservative', marginPct: 6.3, demographic: 'Semi-rural communities' },
    { name: 'Toronto–Danforth', mp: 'Marcus Johnson', partyId: 'ndp', marginPct: 14.5, demographic: 'Young urban progressive' },
    { name: 'York–Simcoe', mp: 'David Fraser', partyId: 'conservative', marginPct: 9.1, demographic: 'Exurban commuter' },
    { name: 'Sudbury', mp: 'Denise Tremblay', partyId: 'liberal', marginPct: 3.8, demographic: 'Mining & healthcare' },
  ],
  QC: [
    { name: 'Abitibi–Témiscamingue', mp: 'Luc Bergeron', partyId: 'bloc', marginPct: 8.4, demographic: 'Resource extraction' },
    { name: 'Bourassa', mp: 'Fatima Malik', partyId: 'liberal', marginPct: 2.1, demographic: 'Urban francophone' },
    { name: 'Chicoutimi–Le Fjord', mp: 'Pierre Lavoie', partyId: 'bloc', marginPct: 12.7, demographic: 'Aluminum industry' },
    { name: 'Laval–Les Îles', mp: 'Claire Tran', partyId: 'liberal', marginPct: 4.9, demographic: 'Suburban immigrant community' },
    { name: 'Longueuil–Charles-LeMoyne', mp: 'Hassan Nkosi', partyId: 'bloc', marginPct: 6.2, demographic: 'South shore suburban' },
    { name: 'Papineau', mp: 'Diane Santos', partyId: 'liberal', marginPct: 3.3, demographic: 'Multicultural urban' },
    { name: 'Québec', mp: 'Anita Beaumont', partyId: 'conservative', marginPct: 1.6, demographic: 'Provincial capital civil servants' },
    { name: 'Rimouski-Neigette', mp: 'William Fontaine', partyId: 'bloc', marginPct: 18.2, demographic: 'Rural maritime' },
    { name: 'Sherbrooke', mp: 'Patricia LeBlanc', partyId: 'ndp', marginPct: 2.8, demographic: 'University & bilingual' },
    { name: 'Saint-Laurent', mp: 'Michael Carrier', partyId: 'liberal', marginPct: 5.7, demographic: 'Jewish & immigrant community' },
  ],
  BC: [
    { name: 'Burnaby South', mp: 'Jenny Kwan', partyId: 'ndp', marginPct: 9.1, demographic: 'Working class urban' },
    { name: 'Kelowna–Lake Country', mp: 'Tracy Gray', partyId: 'conservative', marginPct: 15.4, demographic: 'Retirement & winery country' },
    { name: 'Saanich–Gulf Islands', mp: 'Elizabeth May', partyId: 'green', marginPct: 7.6, demographic: 'Environmental suburban' },
    { name: 'Surrey Central', mp: 'Randeep Sarai', partyId: 'liberal', marginPct: 3.1, demographic: 'South Asian diaspora' },
    { name: 'Vancouver East', mp: 'Jenny Wu', partyId: 'ndp', marginPct: 22.3, demographic: 'Working class & Chinese community' },
    { name: 'Victoria', mp: 'Laurel Collins', partyId: 'ndp', marginPct: 11.8, demographic: 'University & government workers' },
    { name: 'Cloverdale–Langley', mp: 'Mark Strahl', partyId: 'conservative', marginPct: 6.7, demographic: 'Suburban & agricultural' },
  ],
  AB: [
    { name: 'Calgary Centre', mp: 'Greg McLean', partyId: 'conservative', marginPct: 4.2, demographic: 'Oil & professional' },
    { name: 'Edmonton Griesbach', mp: 'Blake Desjarlais', partyId: 'ndp', marginPct: 2.9, demographic: 'Indigenous & working class' },
    { name: 'Lethbridge', mp: 'Rachael Thomas', partyId: 'conservative', marginPct: 21.6, demographic: 'Agricultural & religious conservative' },
    { name: 'Fort McMurray–Cold Lake', mp: 'Brian Jean', partyId: 'conservative', marginPct: 35.1, demographic: 'Oil sands workers' },
    { name: 'Banff–Airdrie', mp: 'Blake Richards', partyId: 'conservative', marginPct: 18.3, demographic: 'Tourism & suburban' },
  ],
  MB: [
    { name: 'Elmwood–Transcona', mp: 'Daniel Blaikie', partyId: 'ndp', marginPct: 7.3, demographic: 'Working class east Winnipeg' },
    { name: 'Portage–Lisgar', mp: 'Candice Bergen', partyId: 'conservative', marginPct: 24.6, demographic: 'Agricultural & rural' },
    { name: 'Winnipeg Centre', mp: 'Leah Gazan', partyId: 'ndp', marginPct: 13.2, demographic: 'Indigenous & inner city' },
    { name: 'Winnipeg North', mp: 'Kevin Lamoureux', partyId: 'liberal', marginPct: 1.8, demographic: 'Diverse immigrant neighbourhood' },
    { name: 'Saint-Boniface–Saint-Vital', mp: 'Dan Vandal', partyId: 'liberal', marginPct: 3.4, demographic: 'Franco-Manitoban community' },
  ],
  SK: [
    { name: 'Regina–Wascana', mp: 'Michael Wernick', partyId: 'conservative', marginPct: 5.1, demographic: 'Provincial capital civil servants' },
    { name: 'Saskatoon West', mp: 'Brad Redekopp', partyId: 'conservative', marginPct: 8.7, demographic: 'University & suburban' },
    { name: 'Prince Albert', mp: 'Randy Hoback', partyId: 'conservative', marginPct: 14.3, demographic: 'Resource & forestry' },
    { name: 'Yorkton–Melville', mp: 'Cathay Wagantall', partyId: 'conservative', marginPct: 28.9, demographic: 'Agricultural heartland' },
  ],
  NS: [
    { name: 'Dartmouth–Cole Harbour', mp: 'Darren Fisher', partyId: 'liberal', marginPct: 6.2, demographic: 'Suburban Halifax' },
    { name: 'Halifax West', mp: 'Lena Metlege Diab', partyId: 'liberal', marginPct: 9.4, demographic: 'Coastal professional' },
    { name: 'Cape Breton–Canso', mp: 'Mike Kelloway', partyId: 'liberal', marginPct: 11.7, demographic: 'Coal mining heritage' },
    { name: 'Cumberland–Colchester', mp: 'Stephen Ellis', partyId: 'conservative', marginPct: 7.1, demographic: 'Rural & agricultural' },
  ],
  NB: [
    { name: 'Fredericton', mp: 'Jenica Atwin', partyId: 'liberal', marginPct: 3.8, demographic: 'University & government' },
    { name: 'Acadie–Bathurst', mp: 'Serge Cormier', partyId: 'liberal', marginPct: 5.9, demographic: 'Francophone Acadian' },
    { name: 'Tobique–Mactaquac', mp: 'John Williamson', partyId: 'conservative', marginPct: 12.4, demographic: 'Rural agricultural' },
  ],
  NL: [
    { name: 'Avalon', mp: 'Ken McDonald', partyId: 'liberal', marginPct: 4.6, demographic: 'Rural coastal' },
    { name: "St. John's East", mp: 'Jack Harris', partyId: 'ndp', marginPct: 2.3, demographic: 'Urban professional' },
    { name: 'Labrador', mp: 'Yvonne Jones', partyId: 'liberal', marginPct: 8.1, demographic: 'Remote Indigenous & resource' },
  ],
  PE: [
    { name: 'Cardigan', mp: 'Lawrence MacAulay', partyId: 'liberal', marginPct: 14.2, demographic: 'Rural & fishing' },
    { name: 'Charlottetown', mp: 'Sean Casey', partyId: 'liberal', marginPct: 9.7, demographic: 'Capital city & tourism' },
    { name: 'Egmont', mp: 'Bobby Morrissey', partyId: 'liberal', marginPct: 6.4, demographic: 'Agricultural & coastal' },
  ],
  YT: [
    { name: 'Yukon', mp: 'Brendan Hanley', partyId: 'liberal', marginPct: 3.1, demographic: 'Indigenous & resource economy' },
  ],
  NT: [
    { name: 'Northwest Territories', mp: 'Michael McLeod', partyId: 'liberal', marginPct: 5.2, demographic: 'Indigenous & northern communities' },
  ],
  NU: [
    { name: 'Nunavut', mp: 'Lori Idlout', partyId: 'ndp', marginPct: 4.7, demographic: 'Inuit majority' },
  ],
};

type MapView = 'overview' | 'province';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { gameState } = useGame();
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [mapView, setMapView] = useState<MapView>('overview');
  const [selectedRiding, setSelectedRiding] = useState<Riding | null>(null);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const selectedProvinceData = selectedProvince
    ? REAL_PROVINCES.find(p => p.code === selectedProvince)
    : null;
  const selectedProvinceSeats = selectedProvince
    ? gameState.provincialSeats[selectedProvince]
    : null;

  const handleProvincePress = (code: string) => {
    setSelectedProvince(code);
    setMapView('province');
    setSelectedRiding(null);
  };

  const handleBackToOverview = () => {
    setMapView('overview');
    setSelectedProvince(null);
    setSelectedRiding(null);
  };

  const ridings = selectedProvince ? (PROVINCE_RIDINGS[selectedProvince] || []) : [];

  // Get marginal ridings (margin < 5%)
  const marginalRidings = useMemo(() =>
    ridings.filter(r => r.marginPct < 6).sort((a, b) => a.marginPct - b.marginPct),
    [ridings]
  );

  // Province drilldown view
  if (mapView === 'province' && selectedProvinceData && selectedProvinceSeats) {
    const dominantPartyId = Object.entries(selectedProvinceSeats)
      .filter(([, c]) => c > 0)
      .sort(([, a], [, b]) => b - a)[0]?.[0];
    const dominantParty = PARTIES.find(p => p.id === dominantPartyId);

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Province header */}
        <View style={[styles.provinceHeader, { borderBottomColor: (dominantParty?.color || Colors.gold) + '44' }]}>
          <Pressable onPress={handleBackToOverview} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.provinceHeaderCenter}>
            <Text style={styles.provinceHeaderName}>{selectedProvinceData.name}</Text>
            <Text style={styles.provinceHeaderSub}>
              {selectedProvinceData.seats} seats · {selectedProvinceData.region} · {selectedProvinceData.code}
            </Text>
          </View>
          <View style={[styles.dominantBadge, { backgroundColor: (dominantParty?.color || Colors.gold) + '22' }]}>
            <Text style={[styles.dominantBadgeText, { color: dominantParty?.color || Colors.gold }]}>
              {dominantParty?.shortName}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Seat breakdown bar */}
          <View style={styles.seatBreakdownCard}>
            <Text style={styles.sectionTitle}>SEAT DISTRIBUTION</Text>
            <View style={styles.seatBarContainer}>
              {Object.entries(selectedProvinceSeats)
                .filter(([, c]) => c > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([partyId, count]) => {
                  const p = PARTIES.find(x => x.id === partyId);
                  const pct = (count / selectedProvinceData.seats) * 100;
                  return (
                    <View key={partyId} style={[styles.seatBarSegment, { flex: count, backgroundColor: p?.color || Colors.textMuted }]} />
                  );
                })}
            </View>
            <View style={styles.seatBreakdownList}>
              {Object.entries(selectedProvinceSeats)
                .filter(([, c]) => c > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([partyId, count]) => {
                  const p = PARTIES.find(x => x.id === partyId);
                  const isPlayer = partyId === gameState.playerPartyId;
                  return (
                    <View key={partyId} style={[styles.seatBreakdownRow, isPlayer && { backgroundColor: Colors.gold + '0D' }]}>
                      <View style={[styles.seatDot, { backgroundColor: p?.color || Colors.textMuted }]} />
                      <Text style={[styles.seatPartyName, isPlayer && { color: Colors.gold }]}>
                        {p?.shortName || partyId}{isPlayer ? ' ★' : ''}
                      </Text>
                      <View style={styles.seatBarMini}>
                        <View style={[styles.seatBarMiniFill, { flex: count, backgroundColor: p?.color || Colors.textMuted }]} />
                        <View style={{ flex: selectedProvinceData.seats - count }} />
                      </View>
                      <Text style={[styles.seatCount, { color: p?.color || Colors.textMuted }]}>{count}</Text>
                    </View>
                  );
                })}
            </View>
          </View>

          {/* Marginal ridings alert */}
          {marginalRidings.length > 0 ? (
            <View style={styles.marginalCard}>
              <View style={styles.marginalHeader}>
                <MaterialCommunityIcons name="sword-cross" size={14} color={Colors.warning} />
                <Text style={styles.marginalTitle}>BATTLEGROUND RIDINGS — {marginalRidings.length} under 6% margin</Text>
              </View>
              {marginalRidings.map((r, i) => {
                const rParty = PARTIES.find(p => p.id === r.partyId);
                return (
                  <Pressable
                    key={i}
                    onPress={() => setSelectedRiding(r)}
                    style={({ pressed }) => [styles.marginalRow, pressed && { opacity: 0.8 }]}
                  >
                    <View style={[styles.marginalColorBar, { backgroundColor: rParty?.color || Colors.textMuted }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.marginalRidingName}>{r.name}</Text>
                      <Text style={styles.marginalMPName}>{r.mp} ({rParty?.shortName})</Text>
                    </View>
                    <View style={[styles.marginalBadge, { backgroundColor: r.marginPct < 3 ? Colors.error + '22' : Colors.warning + '22' }]}>
                      <Text style={[styles.marginalMargin, { color: r.marginPct < 3 ? Colors.error : Colors.warning }]}>
                        +{r.marginPct.toFixed(1)}%
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={14} color={Colors.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* All ridings list */}
          <View style={styles.ridingsCard}>
            <Text style={styles.sectionTitle}>ALL RIDINGS — {ridings.length > 0 ? ridings.length : selectedProvinceData.seats} seats</Text>
            {ridings.length > 0 ? ridings.map((r, i) => {
              const rParty = PARTIES.find(p => p.id === r.partyId);
              const isSelected = selectedRiding?.name === r.name;
              return (
                <View key={i}>
                  <Pressable
                    onPress={() => setSelectedRiding(isSelected ? null : r)}
                    style={({ pressed }) => [
                      styles.ridingRow,
                      isSelected && styles.ridingRowSelected,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View style={[styles.ridingColorBar, { backgroundColor: rParty?.color || Colors.textMuted }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ridingName}>{r.name}</Text>
                      <Text style={styles.ridingMP}>{r.mp}</Text>
                    </View>
                    <Text style={[styles.ridingParty, { color: rParty?.color || Colors.textMuted }]}>
                      {rParty?.shortName}
                    </Text>
                    {r.marginPct < 6 ? (
                      <MaterialCommunityIcons name="sword-cross" size={12} color={Colors.warning} style={{ marginLeft: 4 }} />
                    ) : null}
                    <MaterialCommunityIcons
                      name={isSelected ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={Colors.textMuted}
                      style={{ marginLeft: 4 }}
                    />
                  </Pressable>

                  {/* Riding detail expanded */}
                  {isSelected ? (
                    <View style={styles.ridingDetailPanel}>
                      <View style={styles.ridingDetailRow}>
                        <MaterialCommunityIcons name="account-tie" size={13} color={Colors.textMuted} />
                        <Text style={styles.ridingDetailLabel}>Current MP</Text>
                        <Text style={[styles.ridingDetailValue, { color: rParty?.color || Colors.textPrimary }]}>{r.mp}</Text>
                      </View>
                      <View style={styles.ridingDetailRow}>
                        <MaterialCommunityIcons name="flag" size={13} color={Colors.textMuted} />
                        <Text style={styles.ridingDetailLabel}>Party</Text>
                        <Text style={[styles.ridingDetailValue, { color: rParty?.color || Colors.textPrimary }]}>{rParty?.name}</Text>
                      </View>
                      <View style={styles.ridingDetailRow}>
                        <MaterialCommunityIcons name="chart-bar" size={13} color={Colors.textMuted} />
                        <Text style={styles.ridingDetailLabel}>Last margin</Text>
                        <Text style={[styles.ridingDetailValue, {
                          color: r.marginPct < 3 ? Colors.error : r.marginPct < 6 ? Colors.warning : Colors.success,
                        }]}>+{r.marginPct.toFixed(1)}% {r.marginPct < 3 ? '🔥 ULTRA MARGINAL' : r.marginPct < 6 ? '⚠ MARGINAL' : ''}</Text>
                      </View>
                      <View style={styles.ridingDetailRow}>
                        <MaterialCommunityIcons name="account-group" size={13} color={Colors.textMuted} />
                        <Text style={styles.ridingDetailLabel}>Demographics</Text>
                        <Text style={styles.ridingDetailValue}>{r.demographic}</Text>
                      </View>
                      {r.marginPct < 6 ? (
                        <View style={styles.ridingDetailAlert}>
                          <MaterialCommunityIcons name="information" size={12} color={Colors.warning} />
                          <Text style={styles.ridingDetailAlertText}>
                            This is a key swing riding — a strong by-election showing or campaign here could flip the seat.
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            }) : (
              <Text style={styles.ridingNoData}>
                Detailed riding data not available for this province. Seat totals shown above reflect election results.
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── OVERVIEW ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Electoral Map</Text>
        <Text style={styles.headerSub}>Canada — 343 Seats · Tap province for details</Text>
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
            onProvincePress={handleProvincePress}
          />
        </View>

        {/* Tap hint */}
        <View style={styles.tapHint}>
          <MaterialCommunityIcons name="gesture-tap" size={14} color={Colors.info} />
          <Text style={styles.tapHintText}>Tap any province on the map for riding-level details</Text>
        </View>

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
                <View key={p.id} style={[styles.nationalPartyRow, isPlayer && { borderLeftColor: p.color, borderLeftWidth: 3, paddingLeft: 10 }]}>
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

        {/* Province Quick Select */}
        <View style={styles.provinceQuickCard}>
          <Text style={styles.sectionTitle}>PROVINCES — TAP FOR RIDING DETAILS</Text>
          {REAL_PROVINCES.map(prov => {
            const provSeats = gameState.provincialSeats[prov.code] || {};
            const playerProvSeats = provSeats[gameState.playerPartyId] || 0;
            const dominantId = Object.entries(provSeats).sort(([, a], [, b]) => b - a)[0]?.[0];
            const dominantParty = PARTIES.find(p => p.id === dominantId);
            const ridingCount = (PROVINCE_RIDINGS[prov.code] || []).length;
            return (
              <Pressable
                key={prov.code}
                onPress={() => handleProvincePress(prov.code)}
                style={({ pressed }) => [styles.provinceQuickRow, pressed && { opacity: 0.8 }]}
              >
                <View style={[styles.provinceQuickCode, { backgroundColor: (dominantParty?.color || Colors.textMuted) + '22' }]}>
                  <Text style={[styles.provinceQuickCodeText, { color: dominantParty?.color || Colors.textMuted }]}>{prov.code}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.provinceQuickName}>{prov.name}</Text>
                  <Text style={styles.provinceQuickSub}>{prov.seats} seats{ridingCount > 0 ? ` · ${ridingCount} ridings tracked` : ''}</Text>
                </View>
                <Text style={[styles.provinceQuickPlayerSeats, { color: party?.color || Colors.gold }]}>
                  {playerProvSeats} <Text style={styles.provinceQuickPlayerLabel}>yours</Text>
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
              </Pressable>
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
            const pct = totalRegionSeats > 0 ? (playerRegionSeats / totalRegionSeats) * 100 : 0;
            return (
              <View key={region} style={styles.regionRow}>
                <View style={styles.regionLeft}>
                  <Text style={styles.regionName}>{region}</Text>
                  <Text style={styles.regionProvinces}>{regionProvinces.map(p => p.code).join(', ')}</Text>
                </View>
                <View style={styles.regionBarContainer}>
                  <View style={[styles.regionBar, {
                    width: `${pct}%` as any,
                    backgroundColor: party?.color || Colors.primary,
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
  container: { flex: 1, backgroundColor: Colors.background },

  // Overview header
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },

  // Province drilldown header
  provinceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    backgroundColor: Colors.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  provinceHeaderCenter: { flex: 1 },
  provinceHeaderName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  provinceHeaderSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  dominantBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm },
  dominantBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },

  content: { padding: Spacing.md, gap: Spacing.md },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 6 },

  mapContainer: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },

  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.info + '11',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.info + '22',
  },
  tapHintText: { fontSize: FontSize.xs, color: Colors.info, flex: 1 },

  // Seat breakdown (province view)
  seatBreakdownCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  seatBarContainer: {
    height: 14,
    flexDirection: 'row',
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  seatBarSegment: { minWidth: 2 },
  seatBreakdownList: { gap: 8 },
  seatBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: Radius.sm,
  },
  seatDot: { width: 10, height: 10, borderRadius: 5 },
  seatPartyName: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary, width: 38 },
  seatBarMini: {
    flex: 1,
    height: 6,
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceBorder,
  },
  seatBarMiniFill: { minWidth: 2 },
  seatCount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, minWidth: 24, textAlign: 'right' },

  // Marginal ridings
  marginalCard: {
    backgroundColor: Colors.warning + '0D',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.warning + '33',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  marginalHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  marginalTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.warning, flex: 1 },
  marginalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.warning + '22',
  },
  marginalColorBar: { width: 3, height: 32, borderRadius: 2 },
  marginalRidingName: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  marginalMPName: { fontSize: 10, color: Colors.textSecondary },
  marginalBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  marginalMargin: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },

  // Ridings list
  ridingsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  ridingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  ridingRowSelected: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, paddingHorizontal: 6, marginHorizontal: -6 },
  ridingColorBar: { width: 3, height: 28, borderRadius: 2 },
  ridingName: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  ridingMP: { fontSize: 10, color: Colors.textMuted },
  ridingParty: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  ridingNoData: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },

  // Riding detail expanded panel
  ridingDetailPanel: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: 6,
    gap: 8,
    marginHorizontal: -2,
  },
  ridingDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ridingDetailLabel: { fontSize: FontSize.xs, color: Colors.textMuted, width: 90 },
  ridingDetailValue: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  ridingDetailAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.warning + '11',
    borderRadius: Radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.warning + '22',
  },
  ridingDetailAlertText: { flex: 1, fontSize: 10, color: Colors.warning, lineHeight: 15 },

  // Province quick list (overview)
  provinceQuickCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  provinceQuickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  provinceQuickCode: {
    width: 42,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  provinceQuickCodeText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },
  provinceQuickName: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  provinceQuickSub: { fontSize: 10, color: Colors.textMuted },
  provinceQuickPlayerSeats: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  provinceQuickPlayerLabel: { fontSize: 10, fontWeight: FontWeight.regular, color: Colors.textMuted },

  // National summary
  nationalSummary: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
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
  nationalPartyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  nationalDot: { width: 10, height: 10, borderRadius: 5 },
  nationalPartyName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  nationalPartyIdeology: { fontSize: FontSize.xs, color: Colors.textMuted },
  nationalPartyRight: { alignItems: 'flex-end' },
  nationalSeatCount: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  nationalSeatPct: { fontSize: FontSize.xs, color: Colors.textMuted },

  // Regional
  regionalBreakdown: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  regionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  regionLeft: { width: 80 },
  regionName: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  regionProvinces: { fontSize: 9, color: Colors.textMuted },
  regionBarContainer: {
    flex: 1, height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden',
  },
  regionBar: { height: '100%', borderRadius: 4 },
  regionSeats: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, minWidth: 45, textAlign: 'right' },
});
