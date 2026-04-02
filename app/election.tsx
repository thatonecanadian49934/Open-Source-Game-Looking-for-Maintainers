// Powered by OnSpace.AI
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { ElectoralMap } from '@/components/feature/ElectoralMap';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';
import { REAL_PROVINCES, MAJORITY_SEATS } from '@/constants/provinces';
import {
  simulateElectionResults,
  ElectionNightResult,
  ProvinceResult,
  campaignInProvince,
} from '@/services/electionService';

const { width } = Dimensions.get('window');

const REVEAL_ORDER = ['NL', 'PE', 'NS', 'NB', 'QC', 'ON', 'MB', 'SK', 'AB', 'BC', 'YT', 'NT', 'NU'];
const REGION_ANNOUNCEMENTS: Record<string, string> = {
  NL: 'Newfoundland & Labrador reporting...',
  PE: 'Prince Edward Island reporting...',
  NS: 'Nova Scotia results coming in...',
  NB: 'New Brunswick declaring...',
  QC: 'QUÉBEC — 78 ridings reporting!',
  ON: 'ONTARIO — 122 ridings! The decisive province is reporting!',
  MB: 'Manitoba results arriving...',
  SK: 'Saskatchewan declaring...',
  AB: 'ALBERTA — 37 ridings reporting...',
  BC: 'BRITISH COLUMBIA — Final major province! 43 ridings.',
  YT: 'Yukon declaring...',
  NT: 'Northwest Territories reporting...',
  NU: 'Nunavut — Final riding declared. Canada has spoken.',
};

// Key ridings for Ontario
const ON_KEY_RIDINGS = [
  'Ajax', 'Aurora—Oak Ridges—Richmond Hill', 'Barrie—Innisfil',
  'Bay of Quinte', 'Brampton Centre', 'Brampton East', 'Brampton West',
  'Burlington', 'Cambridge', 'Davenport', 'Don Valley East', 'Don Valley North',
  'Don Valley West', 'Durham', 'Eglinton—Lawrence', 'Essex',
  'Etobicoke Centre', 'Etobicoke—Lakeshore', 'Etobicoke North',
  'Guelph', 'Hamilton Centre', 'Hamilton East—Stoney Creek', 'Hamilton Mountain',
  'Hastings—Lennox and Addington', 'Humber River—Black Creek', 'Huron—Bruce',
  'Kingston and the Islands', 'Kitchener Centre', 'Kitchener—Conestoga',
  'Kitchener South—Hespeler', 'London—Fanshawe', 'London North Centre',
  'London West', 'Markham—Stouffville', 'Markham—Unionville',
  'Mississauga—Erin Mills', 'Mississauga—Lakeshore', 'Mississauga—Malton',
  'Mississauga—Streetsville', 'Newmarket—Aurora', 'Niagara Falls',
  'Niagara West', 'Northumberland—Peterborough South', 'Oakville',
  'Oakville North—Burlington', 'Oshawa', 'Ottawa Centre', 'Ottawa—Vanier',
  'Ottawa West—Nepean', 'Peterborough—Kawartha', 'Pickering—Uxbridge',
  'Richmond Hill', 'Scarborough—Agincourt', 'Scarborough Centre',
  'Scarborough—Guildwood—Rouge Park', 'Scarborough North', 'Simcoe North',
  'Spadina—Harbourfront', 'St. Catharines', 'Stormont—Dundas—South Glengarry',
  'Sudbury', 'Thunder Bay—Rainy River', 'Thunder Bay—Superior North',
  'Thornhill', 'Toronto Centre', 'Toronto—Danforth', 'Toronto—St. Paul\'s',
  'University—Rosedale', 'Vaughan—Woodbridge', 'Waterloo', 'Whitby',
  'Willowdale', 'Windsor—Tecumseh', 'Windsor West', 'York Centre',
  'York—Simcoe', 'York South—Weston', 'Haldimand—Norfolk',
  'Nipissing—Timiskaming', 'Parry Sound—Muskoka', 'Prince Edward—Hastings',
  'Sault Ste. Marie', 'Algoma—Manitoulin—Kapuskasing', 'Bruce—Grey—Owen Sound',
  'Dufferin—Caledon', 'Flamborough—Glanbrook', 'Glengarry—Prescott—Russell',
  'Lanark—Frontenac—Kingston', 'Leeds—Grenville—Thousand Islands',
  'Nepean', 'North Bay—Nipissing', 'Ontario', 'Oxford', 'Perth—Wellington',
  'Renfrew—Nipissing—Pembroke', 'Sarnia—Lambton', 'Simcoe—Grey',
  'Elgin—Middlesex—London', 'Beaches—East York', 'Fleetwood—Port Kells',
  'Mississauga East—Cooksville', 'North York—Pointe-Claire', 'Don Valley East 2',
  'East York', 'Scarborough East', 'Scarborough Southwest',
  'Humber—Mimico', 'King—Vaughan', 'Kanata—Carleton',
  'Orléans', 'Carleton', 'Leeds—Grenville 2',
];

const QC_KEY_RIDINGS = [
  'Abitibi—Baie-James—Nunavik—Eeyou', 'Abitibi—Témiscamingue', 'Alfred-Pellan',
  'Argenteuil—La Petite-Nation', 'Beauce', 'Beauharnois—Salaberry',
  'Beauport—Côte-de-Beaupré—Île d\'Orléans—Charlevoix', 'Beauport—Limoilou',
  'Bellechasse—Les Etchemins—Lévis', 'Berthier—Maskinongé', 'Blainville',
  'Bourassa', 'Brome—Missisquoi', 'Brossard—Saint-Lambert',
  'Châteauguay—Lacolle', 'Chicoutimi—Le Fjord', 'Compton—Stanstead',
  'Dorval—Lachine—LaSalle', 'Drummond', 'Gaspésie—Les-Îles-de-la-Madeleine',
  'Hochelaga', 'Honoré-Mercier', 'Hull—Aylmer', 'Joliette',
  'Jonquière', 'La Pointe-de-l\'Île', 'La Prairie', 'Lac-Saint-Jean',
  'LaSalle—Émard—Verdun', 'Laurentides—Labelle', 'Laurier—Sainte-Marie',
  'Laval—Les Îles', 'Laval—Nord', 'Laval—Ouest', 'Lévis—Lotbinière',
  'L\'Assomption—Montcalm', 'Longueuil—Charles-LeMoyne', 'Longueuil—Saint-Hubert',
  'Louis-Hébert', 'Louis-Saint-Laurent', 'Marc-Aurèle-Fortin',
  'Manicouagan', 'Megantic—L\'Érable', 'Mirabel', 'Mont-Royal—Outremont',
  'Montarville', 'Montmagny—L\'Islet—Kamouraska—Rivière-du-Loup',
  'Notre-Dame-de-Grâce—Westmount', 'Papineau', 'Pierre-Boucher—Les Patriotes—Verchères',
  'Pierrefonds—Dollard', 'Portneuf—Jacques-Cartier', 'Québec',
  'Repentigny', 'Richmond—Arthabaska', 'Rimouski-Neigette—Témiscouata—Les Basques',
  'Rivière-des-Mille-Îles', 'Rivière-du-Nord', 'Rosemont—La Petite-Patrie',
  'Saint-Bruno—Saint-Hubert', 'Saint-Hyacinthe—Bagot', 'Saint-Jean',
  'Saint-Laurent', 'Saint-Léonard—Saint-Michel', 'Saint-Maurice—Champlain',
  'Salaberry—Suroît', 'Shefford', 'Sherbrooke',
  'Soulanges—Hudson', 'Terrebonne', 'Thérèse-De Blainville',
  'Trois-Rivières', 'Vaudreuil—Soulanges', 'Ville-Marie—Le Sud-Ouest—Île-des-Soeurs',
  'Vimy', 'Abitibi 2', 'Laval Centre', 'Québec-Est',
];

type ElectionPhase = 'campaign' | 'election_night' | 'results';

interface RidingResult {
  name: string;
  winner: string;
  margin: number;
  flipped: boolean;
}

function generateRidings(pr: ProvinceResult, playerPartyId: string): RidingResult[] {
  const province = REAL_PROVINCES.find(p => p.code === pr.provinceCode);
  if (!province) return [];
  const ridingNames = pr.provinceCode === 'QC' ? QC_KEY_RIDINGS : ON_KEY_RIDINGS;
  const partyIds = Object.keys(pr.seats).filter(id => (pr.seats[id] || 0) > 0);
  const results: RidingResult[] = [];

  // Track how many seats we've allocated per party
  const allocated: Record<string, number> = {};
  partyIds.forEach(id => { allocated[id] = 0; });

  for (let i = 0; i < province.seats; i++) {
    const ridingName = ridingNames[i] || `Riding ${i + 1}`;

    // Pick winner: weight by seat allocation vs what's been given
    let winner = partyIds[0];
    let bestScore = -1;
    partyIds.forEach(id => {
      const needed = (pr.seats[id] || 0) - (allocated[id] || 0);
      if (needed <= 0) return;
      const score = (needed / province.seats) * (0.7 + Math.random() * 0.6);
      if (score > bestScore) {
        bestScore = score;
        winner = id;
      }
    });

    allocated[winner] = (allocated[winner] || 0) + 1;
    const margin = Math.round(1 + Math.random() * 22);
    const flipped = margin < 5 && Math.random() > 0.6;
    results.push({ name: ridingName, winner, margin, flipped });
  }
  return results;
}

export default function ElectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, campaignState, campaignInRegion, completeCampaign } = useGame();

  const [phase, setPhase] = useState<ElectionPhase>('campaign');
  const [localResult, setLocalResult] = useState<ElectionNightResult | null>(null);
  const [revealedProvinces, setRevealedProvinces] = useState<string[]>([]);
  const [runningSeats, setRunningSeats] = useState<Record<string, number>>({});
  const [runningProvSeats, setRunningProvSeats] = useState<Record<string, Record<string, number>>>({});
  const [currentAnnouncement, setCurrentAnnouncement] = useState('');
  const [declaredCount, setDeclaredCount] = useState(0);
  const [majorityWinner, setMajorityWinner] = useState<string | null>(null);
  const [majorityFlash] = useState(new Animated.Value(0));
  const [headerFade] = useState(new Animated.Value(0));
  const [isRevealing, setIsRevealing] = useState(false);
  const [ridingDrilldown, setRidingDrilldown] = useState<string | null>(null);
  const [cachedRidings, setCachedRidings] = useState<Record<string, RidingResult[]>>({});

  useEffect(() => {
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [phase]);

  if (!gameState || !campaignState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const campaignWeek = campaignState.week;
  const isDebateWeek = campaignWeek === 2;
  const year = 2025 + Math.floor(gameState.totalWeeks / 52);

  const flashMajority = () => {
    Animated.sequence([
      Animated.timing(majorityFlash, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(majorityFlash, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(majorityFlash, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(majorityFlash, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(majorityFlash, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const startElectionNight = () => {
    if (!gameState || !campaignState) return;
    const result = simulateElectionResults(
      gameState.playerPartyId,
      gameState.stats,
      campaignState,
      gameState.seats
    );
    setLocalResult(result);
    setRunningSeats({});
    setRunningProvSeats({});
    setRevealedProvinces([]);
    setDeclaredCount(0);
    setMajorityWinner(null);
    const initSeats: Record<string, number> = {};
    PARTIES.forEach(p => { initSeats[p.id] = 0; });
    setRunningSeats(initSeats);
    setPhase('election_night');
    setTimeout(() => startProvinceReveal(result), 2000);
  };

  const startProvinceReveal = (result: ElectionNightResult) => {
    setIsRevealing(true);
    let idx = 0;
    let cumulativeSeats: Record<string, number> = {};
    let cumulativeProvSeats: Record<string, Record<string, number>> = {};
    let hasMajority = false;
    PARTIES.forEach(p => { cumulativeSeats[p.id] = 0; });

    const revealNext = () => {
      if (idx >= REVEAL_ORDER.length) {
        setIsRevealing(false);
        setCurrentAnnouncement('All ridings declared. Counting complete.');
        setTimeout(() => {
          completeCampaign(result);
          setPhase('results');
        }, 2000);
        return;
      }

      const code = REVEAL_ORDER[idx];
      const provResult = result.provinceResults.find(r => r.provinceCode === code);

      if (provResult) {
        Object.entries(provResult.seats).forEach(([partyId, seats]) => {
          cumulativeSeats[partyId] = (cumulativeSeats[partyId] || 0) + seats;
        });
        cumulativeProvSeats[code] = provResult.seats;

        const snapshot = { ...cumulativeSeats };
        const provSnapshot = { ...cumulativeProvSeats };

        setRevealedProvinces(prev => [...prev, code]);
        setRunningSeats(snapshot);
        setRunningProvSeats(provSnapshot);
        setDeclaredCount(prev => prev + 1);
        setCurrentAnnouncement(REGION_ANNOUNCEMENTS[code] || `${code} declaring...`);

        if (!hasMajority) {
          const majorityParty = Object.entries(snapshot).find(([, seats]) => seats >= MAJORITY_SEATS);
          if (majorityParty) {
            hasMajority = true;
            setMajorityWinner(majorityParty[0]);
            flashMajority();
          }
        }
      }
      idx++;
      const delay = code === 'QC' || code === 'ON' ? 2200 : code === 'BC' || code === 'AB' ? 1800 : 1400;
      setTimeout(revealNext, delay + Math.random() * 500);
    };
    setTimeout(revealNext, 800);
  };

  const handleProvinceDrilldown = (code: string, pr: ProvinceResult) => {
    if (code !== 'ON' && code !== 'QC') return;
    if (ridingDrilldown === code) {
      setRidingDrilldown(null);
      return;
    }
    // Cache riding results so they don't regenerate on re-render
    if (!cachedRidings[code]) {
      setCachedRidings(prev => ({ ...prev, [code]: generateRidings(pr, gameState.playerPartyId) }));
    }
    setRidingDrilldown(code);
  };

  // ── ELECTION NIGHT ──────────────────────────────────────────────────────────
  if (phase === 'election_night') {
    const totalDeclared = REAL_PROVINCES.length;
    const progressPct = (declaredCount / totalDeclared) * 100;

    return (
      <View style={styles.container}>
        <Image
          source={require('@/assets/images/election_night.jpg')}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
        <View style={styles.darkOverlay} />
        <View style={[styles.electionNightWrapper, { paddingTop: insets.top + 10 }]}>
          <Animated.View style={[styles.enHeader, { opacity: headerFade }]}>
            <View style={styles.enLiveBadge}>
              <View style={styles.enLiveDot} />
              <Text style={styles.enLiveText}>LIVE</Text>
            </View>
            <Text style={styles.enTitle}>ELECTION NIGHT {year}</Text>
            <Text style={styles.enSubtitle}>Canada Federal Election • {declaredCount}/{totalDeclared} Regions Declared</Text>
          </Animated.View>

          <View style={styles.ticker}>
            <MaterialCommunityIcons name="broadcast" size={14} color={Colors.gold} />
            <Text style={styles.tickerText} numberOfLines={1}>
              {currentAnnouncement || 'Polls have closed across Canada. Results incoming...'}
            </Text>
          </View>

          <View style={styles.enMapContainer}>
            <ElectoralMap
              seats={runningSeats}
              provincialSeats={runningProvSeats}
              playerPartyId={gameState.playerPartyId}
              animated={true}
              revealedProvinces={revealedProvinces}
            />
          </View>

          {majorityWinner ? (
            <Animated.View style={[styles.majorityFlashBanner, { opacity: majorityFlash }]}>
              <MaterialCommunityIcons name="trophy" size={20} color="#fff" />
              <Text style={styles.majorityFlashText}>
                {PARTIES.find(p => p.id === majorityWinner)?.shortName} MAJORITY!
              </Text>
            </Animated.View>
          ) : null}

          <View style={styles.runningTotals}>
            {PARTIES
              .filter(p => (p.baseSupport > 3 || (runningSeats[p.id] || 0) > 0))
              .sort((a, b) => (runningSeats[b.id] || 0) - (runningSeats[a.id] || 0))
              .slice(0, 5)
              .map(p => {
                const seats = runningSeats[p.id] || 0;
                const pct = (seats / 343) * 100;
                const isPlayer = p.id === gameState.playerPartyId;
                const hasMaj = seats >= MAJORITY_SEATS;
                return (
                  <View key={p.id} style={[styles.runningParty, isPlayer && { borderColor: p.color, borderWidth: 1.5 }]}>
                    <View style={[styles.runningDot, { backgroundColor: p.color }]} />
                    <Text style={[styles.runningShortName, { color: p.color }]}>
                      {p.shortName}{isPlayer ? ' ★' : ''}
                    </Text>
                    <Text style={[styles.runningSeats, hasMaj ? { color: Colors.gold } : { color: Colors.textPrimary }]}>
                      {seats}
                    </Text>
                    <View style={styles.runningBar}>
                      <View style={[styles.runningBarFill, { width: `${Math.min(100, pct * 1.8)}%` as any, backgroundColor: p.color }]} />
                      {hasMaj ? <View style={styles.majorityCheckmark} /> : null}
                    </View>
                  </View>
                );
              })}
          </View>

          <View style={styles.majorityThreshold}>
            <View style={styles.majorityLine} />
            <Text style={styles.majorityThresholdText}>172 seats for majority</Text>
            <View style={styles.majorityLine} />
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
          </View>
        </View>
      </View>
    );
  }

  // ── RESULTS ─────────────────────────────────────────────────────────────────
  if (phase === 'results' && localResult) {
    const playerSeats = localResult.playerSeats;
    const playerWon = playerSeats >= MAJORITY_SEATS || playerSeats === Math.max(...Object.values(localResult.totalSeats));
    const isMajority = playerSeats >= MAJORITY_SEATS;

    return (
      <Animated.View style={[styles.container, { opacity: headerFade }]}>
        <ScrollView
          contentContainerStyle={[styles.resultsContent, { paddingBottom: insets.bottom + 40, paddingTop: insets.top }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Result Banner */}
          <View style={[styles.resultsBanner, {
            backgroundColor: (playerWon ? (isMajority ? Colors.success : Colors.info) : Colors.error) + '22',
            borderColor: (playerWon ? (isMajority ? Colors.success : Colors.info) : Colors.error) + '55',
          }]}>
            <Text style={styles.resultsBannerEmoji}>{playerWon ? (isMajority ? '🎉' : '🇨🇦') : '⚔️'}</Text>
            <Text style={[styles.resultsBannerTitle, {
              color: playerWon ? (isMajority ? Colors.success : Colors.info) : Colors.error,
            }]}>
              {playerWon ? (isMajority ? 'MAJORITY GOVERNMENT' : 'MINORITY GOVERNMENT') : 'OFFICIAL OPPOSITION'}
            </Text>
            <Text style={[styles.resultsBannerSub, {
              color: playerWon ? (isMajority ? Colors.success : Colors.info) : Colors.error,
            }]}>
              {party?.name} — {playerSeats} seats
            </Text>
            <Text style={styles.resultsBannerVote}>{localResult.playerVotePct.toFixed(1)}% of the national vote</Text>
            {playerWon && !isMajority ? (
              <View style={styles.minorityWarning}>
                <MaterialCommunityIcons name="alert" size={14} color={Colors.warning} />
                <Text style={styles.minorityWarningText}>
                  Minority government — you need 172 seats to hold a majority. The opposition can bring you down with a confidence vote.
                </Text>
              </View>
            ) : null}
          </View>

          {/* Electoral Map */}
          <View style={styles.resultsMapCard}>
            <ElectoralMap
              seats={localResult.totalSeats}
              provincialSeats={localResult.provinceResults.reduce((acc, r) => {
                acc[r.provinceCode] = r.seats;
                return acc;
              }, {} as Record<string, Record<string, number>>)}
              playerPartyId={gameState.playerPartyId}
            />
          </View>

          {/* Full Results Table */}
          <View style={styles.fullResultsCard}>
            <Text style={styles.sectionTitle}>
              FINAL RESULTS — {gameState.parliamentNumber + 1}th PARLIAMENT
            </Text>
            {PARTIES
              .filter(p => (localResult.totalSeats[p.id] || 0) > 0)
              .sort((a, b) => (localResult.totalSeats[b.id] || 0) - (localResult.totalSeats[a.id] || 0))
              .map(p => {
                const seats = localResult.totalSeats[p.id] || 0;
                const pct = (seats / 343) * 100;
                const isPlayer = p.id === gameState.playerPartyId;
                const hasMaj = seats >= MAJORITY_SEATS;
                return (
                  <View key={p.id} style={[styles.resultRow, isPlayer && { borderLeftColor: p.color, borderLeftWidth: 3 }]}>
                    <View style={[styles.resultDot, { backgroundColor: p.color }]} />
                    <View style={styles.resultPartyInfo}>
                      <Text style={[styles.resultPartyName, isPlayer && { color: Colors.gold }]}>
                        {p.shortName} {isPlayer ? '★' : ''}{hasMaj ? ' ✓' : ''}
                      </Text>
                      <Text style={styles.resultPartyFull}>{p.name}</Text>
                    </View>
                    <View style={styles.resultBarContainer}>
                      <View style={[styles.resultBar, { width: `${pct}%` as any, backgroundColor: p.color + 'CC' }]} />
                    </View>
                    <Text style={[styles.resultSeats, { color: p.color }]}>{seats}</Text>
                  </View>
                );
              })}
            <View style={styles.resultsMajorityLine}>
              <View style={styles.resultsMajorityDash} />
              <Text style={styles.resultsMajorityLabel}>— 172 Majority Threshold —</Text>
              <View style={styles.resultsMajorityDash} />
            </View>
          </View>

          {/* Province-by-province + riding drilldown */}
          <View style={styles.provinceResultsCard}>
            <Text style={styles.sectionTitle}>PROVINCE-BY-PROVINCE</Text>
            <Text style={styles.ridingHint}>
              <MaterialCommunityIcons name="map-marker" size={10} color={Colors.gold} /> Tap ON or QC for riding-level results
            </Text>
            {localResult.provinceResults.map(pr => {
              const province = REAL_PROVINCES.find(p => p.code === pr.provinceCode);
              const playerProvSeats = pr.seats[gameState.playerPartyId] || 0;
              const sortedEntries = Object.entries(pr.seats).sort(([, a], [, b]) => b - a);
              const dominantPartyId = sortedEntries[0]?.[0];
              const dominantParty = PARTIES.find(p => p.id === dominantPartyId);
              const hasRidings = pr.provinceCode === 'ON' || pr.provinceCode === 'QC';
              const isExpanded = ridingDrilldown === pr.provinceCode;

              return (
                <View key={pr.provinceCode} style={styles.provResultWrapper}>
                  <Pressable
                    onPress={() => handleProvinceDrilldown(pr.provinceCode, pr)}
                    style={({ pressed }) => [
                      styles.provResultRow,
                      hasRidings && { backgroundColor: Colors.surfaceElevated },
                      pressed && hasRidings && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={styles.provResultCode}>{pr.provinceCode}</Text>
                    <View style={[styles.provResultDot, { backgroundColor: dominantParty?.color || Colors.textMuted }]} />
                    <Text style={styles.provResultSeats}>{province?.seats || 0}s</Text>
                    <View style={styles.provResultBar}>
                      {PARTIES.filter(p => (pr.seats[p.id] || 0) > 0).map(p => (
                        <View
                          key={p.id}
                          style={[styles.provResultBarSeg, { flex: pr.seats[p.id] || 0, backgroundColor: p.color }]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.provPlayerSeats, { color: party?.color }]}>
                      {playerProvSeats}★
                    </Text>
                    {hasRidings ? (
                      <MaterialCommunityIcons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={13}
                        color={Colors.gold}
                      />
                    ) : null}
                  </Pressable>

                  {/* Riding-level drilldown for ON and QC */}
                  {isExpanded ? (
                    <View style={styles.ridingDrilldownContainer}>
                      <View style={styles.ridingDrilldownHeader}>
                        <Text style={styles.ridingDrilldownTitle}>
                          {province?.name} — {province?.seats} Ridings
                        </Text>
                        <Text style={styles.ridingDrilldownSub}>Riding-by-riding results</Text>
                      </View>

                      {/* Party seat summary for this province */}
                      <View style={styles.ridingProvSummary}>
                        {PARTIES.filter(p => (pr.seats[p.id] || 0) > 0)
                          .sort((a, b) => (pr.seats[b.id] || 0) - (pr.seats[a.id] || 0))
                          .map(p => (
                            <View key={p.id} style={styles.ridingProvParty}>
                              <View style={[styles.ridingProvDot, { backgroundColor: p.color }]} />
                              <Text style={[styles.ridingProvShort, { color: p.color }]}>{p.shortName}</Text>
                              <Text style={[styles.ridingProvSeats, { color: p.color }]}>{pr.seats[p.id] || 0}</Text>
                            </View>
                          ))}
                      </View>

                      {/* Individual ridings */}
                      <ScrollView style={styles.ridingsList} nestedScrollEnabled>
                        {(cachedRidings[pr.provinceCode] || generateRidings(pr, gameState.playerPartyId)).map((riding, idx) => {
                          const winnerParty = PARTIES.find(p => p.id === riding.winner);
                          const isPlayerRiding = riding.winner === gameState.playerPartyId;
                          const isClose = riding.margin <= 5;
                          return (
                            <View key={idx} style={[
                              styles.ridingRow,
                              isPlayerRiding && { backgroundColor: (party?.color || Colors.gold) + '11' },
                              isClose && { borderLeftWidth: 2, borderLeftColor: Colors.warning },
                            ]}>
                              <View style={[styles.ridingDot, { backgroundColor: winnerParty?.color || Colors.textMuted }]} />
                              <Text style={styles.ridingName} numberOfLines={1}>{riding.name}</Text>
                              <Text style={[styles.ridingWinner, { color: winnerParty?.color }]}>
                                {winnerParty?.shortName}{isPlayerRiding ? ' ★' : ''}
                              </Text>
                              <View style={styles.ridingMarginContainer}>
                                <Text style={[
                                  styles.ridingMargin,
                                  isClose ? { color: Colors.warning } : { color: Colors.textMuted },
                                ]}>
                                  +{riding.margin}%
                                </Text>
                                {isClose ? (
                                  <Text style={styles.ridingCloseLabel}>CLOSE</Text>
                                ) : null}
                              </View>
                            </View>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* CTA */}
          <Pressable
            onPress={() => {
              if (gameState.inLeadershipReview) {
                router.replace('/leadership-review');
              } else {
                router.replace('/(tabs)');
              }
            }}
            style={({ pressed }) => [
              styles.continueBtn,
              { backgroundColor: playerWon ? (isMajority ? Colors.success : Colors.info) : Colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.continueBtnText}>
              {gameState.inLeadershipReview ? '⚠️ Face Leadership Review' : `Begin ${gameState.parliamentNumber + 1}th Parliament`}
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    );
  }

  // ── CAMPAIGN ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.campaignHeader}>
        <View>
          <Text style={styles.campaignTitle}>Election Campaign {year}</Text>
          <Text style={styles.campaignSub}>Week {campaignWeek} of 4</Text>
        </View>
        <View style={styles.weekIndicators}>
          {[1, 2, 3, 4].map(w => (
            <View key={w} style={[styles.weekDot, campaignWeek >= w && { backgroundColor: party?.color || Colors.gold }]} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.campaignContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {isDebateWeek ? (
          <Pressable onPress={() => router.push('/debate')} style={({ pressed }) => [styles.debateAlert, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="microphone" size={32} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.debateAlertTitle}>🔴 LEADERSHIP DEBATE TONIGHT</Text>
              <Text style={styles.debateAlertSub}>Face the other party leaders. Your performance will sway millions of voters.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.gold} />
          </Pressable>
        ) : null}

        <View style={styles.campaignStats}>
          {[
            { value: campaignState.campaignedProvinces.length.toString(), label: 'Provinces Visited', color: Colors.textPrimary },
            {
              value: `${(campaignState.polls[0]?.results?.[gameState.playerPartyId] || gameState.stats.approvalRating).toFixed(1)}%`,
              label: 'Polling',
              color: Colors.success,
            },
            { value: `$${(campaignState.rallyCosts / 1000000).toFixed(1)}M`, label: 'Spend', color: Colors.warning },
          ].map(s => (
            <View key={s.label} style={styles.campaignStat}>
              <Text style={[styles.campaignStatValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.campaignStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {campaignState.campaignEvents.length > 0 ? (
          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>RECENT EVENTS</Text>
            {campaignState.campaignEvents.slice(-3).reverse().map(event => (
              <View key={event.id} style={styles.campaignEventCard}>
                <MaterialCommunityIcons name="map-marker-check" size={14} color={Colors.success} />
                <Text style={styles.campaignEventText}>{event.description}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View>
          <Text style={styles.sectionTitle}>CAMPAIGN IN A PROVINCE</Text>
          <View style={styles.provinceGrid}>
            {REAL_PROVINCES.map(province => {
              const hasVisited = campaignState.campaignedProvinces.includes(province.code);
              return (
                <Pressable
                  key={province.code}
                  onPress={() => !hasVisited && campaignInRegion(province.code)}
                  style={({ pressed }) => [
                    styles.provinceBtn,
                    hasVisited && { backgroundColor: (party?.color || Colors.gold) + '22', borderColor: party?.color || Colors.gold },
                    pressed && !hasVisited && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                    hasVisited && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.provinceBtnCode, hasVisited && { color: party?.color || Colors.gold }]}>
                    {province.code}
                  </Text>
                  <Text style={styles.provinceBtnSeats}>{province.seats}s</Text>
                  {hasVisited ? <MaterialCommunityIcons name="check-circle" size={10} color={party?.color || Colors.gold} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {campaignState.campaignedProvinces.length >= 3 ? (
          <Pressable onPress={startElectionNight} style={({ pressed }) => [styles.electionNightBtn, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="television-play" size={22} color="#fff" />
            <Text style={styles.electionNightBtnText}>ELECTION NIGHT — Count the Votes</Text>
          </Pressable>
        ) : (
          <View style={styles.campaignTip}>
            <MaterialCommunityIcons name="information" size={14} color={Colors.info} />
            <Text style={styles.campaignTipText}>
              Visit at least 3 provinces to unlock Election Night. Week 2 features the leadership debate.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,10,22,0.88)' },
  electionNightWrapper: { flex: 1, paddingHorizontal: Spacing.sm, gap: Spacing.sm },
  enHeader: { alignItems: 'center', gap: 4 },
  enLiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.error, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.sm },
  enLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  enLiveText: { fontSize: 10, fontWeight: FontWeight.extrabold, color: '#fff', letterSpacing: 2 },
  enTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, letterSpacing: 3, textAlign: 'center' },
  enSubtitle: { fontSize: FontSize.xs, color: Colors.textSecondary },
  ticker: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.gold + '22', borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderWidth: 1, borderColor: Colors.gold + '33' },
  tickerText: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: FontWeight.semibold, flex: 1 },
  enMapContainer: { backgroundColor: Colors.card + 'CC', borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  majorityFlashBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.gold, borderRadius: Radius.sm, paddingVertical: 8 },
  majorityFlashText: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold, color: '#fff', letterSpacing: 2 },
  runningTotals: { gap: 6 },
  runningParty: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card + 'CC', borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderColor: 'transparent', borderWidth: 1 },
  runningDot: { width: 8, height: 8, borderRadius: 4 },
  runningShortName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 38 },
  runningSeats: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, width: 36, textAlign: 'center' },
  runningBar: { flex: 1, height: 10, backgroundColor: Colors.surfaceBorder, borderRadius: 5, overflow: 'hidden', position: 'relative' },
  runningBarFill: { height: '100%', borderRadius: 5 },
  majorityCheckmark: { position: 'absolute', right: 4, top: 2, width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.gold },
  majorityThreshold: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  majorityLine: { flex: 1, height: 1, backgroundColor: Colors.gold + '44' },
  majorityThresholdText: { fontSize: 9, color: Colors.gold, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  progressBar: { height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden', marginBottom: Spacing.sm },
  progressFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 2 },

  // Results
  resultsContent: { padding: Spacing.md, gap: Spacing.md },
  resultsBanner: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, alignItems: 'center', gap: 6 },
  resultsBannerEmoji: { fontSize: 40 },
  resultsBannerTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, textAlign: 'center', letterSpacing: 1 },
  resultsBannerSub: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, textAlign: 'center' },
  resultsBannerVote: { fontSize: FontSize.sm, color: Colors.textSecondary },
  minorityWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.warning + '11', borderRadius: Radius.sm, padding: 8, borderWidth: 1, borderColor: Colors.warning + '33', marginTop: 4 },
  minorityWarningText: { fontSize: FontSize.xs, color: Colors.warning, flex: 1, lineHeight: 16 },
  resultsMapCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  fullResultsCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 6, borderRadius: Radius.sm, borderLeftWidth: 0 },
  resultDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  resultPartyInfo: { width: 55 },
  resultPartyName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  resultPartyFull: { fontSize: 8, color: Colors.textMuted, lineHeight: 10 },
  resultBarContainer: { flex: 1, height: 10, backgroundColor: Colors.surfaceBorder, borderRadius: 5, overflow: 'hidden' },
  resultBar: { height: '100%', borderRadius: 5 },
  resultSeats: { fontSize: FontSize.base, fontWeight: FontWeight.bold, minWidth: 32, textAlign: 'right' },
  resultsMajorityLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  resultsMajorityDash: { flex: 1, height: 1, backgroundColor: Colors.gold + '44' },
  resultsMajorityLabel: { fontSize: 9, color: Colors.gold, letterSpacing: 0.5 },

  // Province results + drilldown
  provinceResultsCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 6 },
  ridingHint: { fontSize: 10, color: Colors.gold, marginBottom: 4, fontStyle: 'italic' },
  provResultWrapper: { gap: 0 },
  provResultRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 6, borderRadius: Radius.sm },
  provResultCode: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textSecondary, width: 24 },
  provResultDot: { width: 6, height: 6, borderRadius: 3 },
  provResultSeats: { fontSize: 9, color: Colors.textMuted, width: 26 },
  provResultBar: { flex: 1, height: 8, flexDirection: 'row', borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.surfaceBorder },
  provResultBarSeg: { height: '100%' },
  provPlayerSeats: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 26, textAlign: 'right' },

  // Riding drilldown
  ridingDrilldownContainer: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gold + '33',
    marginBottom: 4,
    overflow: 'hidden',
  },
  ridingDrilldownHeader: {
    padding: Spacing.sm,
    backgroundColor: Colors.gold + '11',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold + '22',
  },
  ridingDrilldownTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  ridingDrilldownSub: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  ridingProvSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  ridingProvParty: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ridingProvDot: { width: 6, height: 6, borderRadius: 3 },
  ridingProvShort: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  ridingProvSeats: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  ridingsList: { maxHeight: 300 },
  ridingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  ridingDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  ridingName: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 15 },
  ridingWinner: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 50, textAlign: 'right' },
  ridingMarginContainer: { alignItems: 'flex-end', minWidth: 46 },
  ridingMargin: { fontSize: 10, fontWeight: FontWeight.medium },
  ridingCloseLabel: { fontSize: 8, color: Colors.warning, fontWeight: FontWeight.bold, letterSpacing: 0.5 },

  continueBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, borderRadius: Radius.md, marginTop: Spacing.sm },
  continueBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },

  // Campaign
  campaignHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  campaignTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  campaignSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  weekIndicators: { flexDirection: 'row', gap: 6 },
  weekDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.surfaceBorder },
  campaignContent: { padding: Spacing.md, gap: Spacing.md },
  debateAlert: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.gold + '15', borderRadius: Radius.md, borderWidth: 2, borderColor: Colors.gold + '66', padding: Spacing.md },
  debateAlertTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  debateAlertSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  campaignStats: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  campaignStat: { flex: 1, alignItems: 'center', gap: 2 },
  campaignStatValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  campaignStatLabel: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  eventsSection: { gap: Spacing.xs },
  campaignEventCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.card, borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  campaignEventText: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  provinceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  provinceBtn: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: 1, minWidth: 52 },
  provinceBtnCode: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  provinceBtnSeats: { fontSize: 9, color: Colors.textMuted },
  electionNightBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.lg, marginTop: Spacing.sm },
  electionNightBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff', letterSpacing: 0.5 },
  campaignTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.info + '11', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.info + '22' },
  campaignTipText: { fontSize: FontSize.xs, color: Colors.info, flex: 1, lineHeight: 18 },
});
