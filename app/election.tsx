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
import { REAL_PROVINCES } from '@/constants/provinces';
import { MAJORITY_SEATS } from '@/constants/provinces';
import { simulateElectionResults, ElectionNightResult, campaignInProvince } from '@/services/electionService';

const { width } = Dimensions.get('window');

// Province reveal order: Atlantic → Quebec → Ontario → Prairies → West → North
const REVEAL_ORDER = ['NL', 'PE', 'NS', 'NB', 'QC', 'ON', 'MB', 'SK', 'AB', 'BC', 'YT', 'NT', 'NU'];
const REGION_ANNOUNCEMENTS: Record<string, string> = {
  NL: 'Newfoundland & Labrador reporting...',
  PE: 'Prince Edward Island reporting...',
  NS: 'Nova Scotia results coming in...',
  NB: 'New Brunswick declaring...',
  QC: 'QUÉBEC — Major results incoming!',
  ON: 'ONTARIO — The decisive province is reporting!',
  MB: 'Manitoba results arriving...',
  SK: 'Saskatchewan declaring...',
  AB: 'ALBERTA reporting...',
  BC: 'BRITISH COLUMBIA — Final major province!',
  YT: 'Yukon declaring...',
  NT: 'Northwest Territories reporting...',
  NU: 'Nunavut — Final riding declared.',
};

type ElectionPhase = 'campaign' | 'election_night' | 'results';

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

    // Compute results locally — avoids async race with context state
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

    // Initialize running seats to 0
    const initSeats: Record<string, number> = {};
    PARTIES.forEach(p => { initSeats[p.id] = 0; });
    setRunningSeats(initSeats);

    setPhase('election_night');

    // Start reveal after dramatic pause
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
        // All declared — wait then show results
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
        // Add this province's seats to running totals
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

        // Check majority crossing
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

  // ---------- ELECTION NIGHT PHASE ----------
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
          {/* Header */}
          <Animated.View style={[styles.enHeader, { opacity: headerFade }]}>
            <View style={styles.enLiveBadge}>
              <View style={styles.enLiveDot} />
              <Text style={styles.enLiveText}>LIVE</Text>
            </View>
            <Text style={styles.enTitle}>ELECTION NIGHT {year}</Text>
            <Text style={styles.enSubtitle}>Canada Federal Election • {declaredCount}/{totalDeclared} Regions Declared</Text>
          </Animated.View>

          {/* Announcement Ticker */}
          <View style={styles.ticker}>
            <MaterialCommunityIcons name="broadcast" size={14} color={Colors.gold} />
            <Text style={styles.tickerText} numberOfLines={1}>{currentAnnouncement || 'Polls have closed across Canada. Results incoming...'}</Text>
          </View>

          {/* Electoral Map */}
          <View style={styles.enMapContainer}>
            <ElectoralMap
              seats={runningSeats}
              provincialSeats={runningProvSeats}
              playerPartyId={gameState.playerPartyId}
              animated={true}
              revealedProvinces={revealedProvinces}
            />
          </View>

          {/* Majority Flash Overlay */}
          {majorityWinner ? (
            <Animated.View style={[styles.majorityFlashBanner, { opacity: majorityFlash }]}>
              <MaterialCommunityIcons name="trophy" size={20} color="#fff" />
              <Text style={styles.majorityFlashText}>
                {PARTIES.find(p => p.id === majorityWinner)?.shortName} MAJORITY!
              </Text>
            </Animated.View>
          ) : null}

          {/* Running Seat Counts */}
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
                      <View style={[styles.runningBarFill, {
                        width: `${Math.min(100, pct * 1.8)}%` as any,
                        backgroundColor: p.color,
                      }]} />
                      {hasMaj ? <View style={styles.majorityCheckmark} /> : null}
                    </View>
                  </View>
                );
              })}
          </View>

          {/* Majority threshold indicator */}
          <View style={styles.majorityThreshold}>
            <View style={styles.majorityLine} />
            <Text style={styles.majorityThresholdText}>172 seats for majority</Text>
            <View style={styles.majorityLine} />
          </View>

          {/* Progress */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
          </View>
        </View>
      </View>
    );
  }

  // ---------- RESULTS PHASE ----------
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
            backgroundColor: playerWon
              ? (isMajority ? Colors.success : Colors.info) + '22'
              : Colors.error + '22',
            borderColor: playerWon
              ? (isMajority ? Colors.success : Colors.info) + '55'
              : Colors.error + '55',
          }]}>
            <Text style={styles.resultsBannerEmoji}>
              {playerWon ? (isMajority ? '🎉' : '🇨🇦') : '⚔️'}
            </Text>
            <Text style={[styles.resultsBannerTitle, {
              color: playerWon ? (isMajority ? Colors.success : Colors.info) : Colors.error
            }]}>
              {playerWon
                ? isMajority ? 'MAJORITY GOVERNMENT' : 'MINORITY GOVERNMENT'
                : 'OFFICIAL OPPOSITION'}
            </Text>
            <Text style={[styles.resultsBannerSub, {
              color: playerWon ? (isMajority ? Colors.success : Colors.info) : Colors.error
            }]}>
              {party?.name} — {playerSeats} seats
            </Text>
            <Text style={styles.resultsBannerVote}>
              {localResult.playerVotePct.toFixed(1)}% of the national vote
            </Text>
            {playerWon && !isMajority ? (
              <View style={styles.minorityWarning}>
                <MaterialCommunityIcons name="alert" size={14} color={Colors.warning} />
                <Text style={styles.minorityWarningText}>
                  Minority government — you need 172 seats to hold a majority. The opposition can bring you down.
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
                      <View style={[styles.resultBar, {
                        width: `${pct}%` as any,
                        backgroundColor: p.color + 'CC',
                      }]} />
                    </View>
                    <Text style={[styles.resultSeats, { color: p.color }]}>{seats}</Text>
                  </View>
                );
              })}

            {/* Majority line indicator */}
            <View style={styles.resultsMajorityLine}>
              <View style={styles.resultsMajorityDash} />
              <Text style={styles.resultsMajorityLabel}>— 172 Majority Threshold —</Text>
              <View style={styles.resultsMajorityDash} />
            </View>
          </View>

          {/* Province-by-province results */}
          <View style={styles.provinceResultsCard}>
            <Text style={styles.sectionTitle}>PROVINCE-BY-PROVINCE</Text>
            {localResult.provinceResults.map(pr => {
              const province = REAL_PROVINCES.find(p => p.code === pr.provinceCode);
              const playerProvSeats = pr.seats[gameState.playerPartyId] || 0;
              const dominantPartyId = Object.entries(pr.seats).sort(([,a],[,b]) => b-a)[0]?.[0];
              const dominantParty = PARTIES.find(p => p.id === dominantPartyId);
              return (
                <View key={pr.provinceCode} style={styles.provResultRow}>
                  <Text style={styles.provResultCode}>{pr.provinceCode}</Text>
                  <View style={[styles.provResultDot, { backgroundColor: dominantParty?.color || Colors.textMuted }]} />
                  <Text style={styles.provResultSeats}>{province?.seats || 0} seats</Text>
                  <View style={styles.provResultBar}>
                    {PARTIES.filter(p => (pr.seats[p.id] || 0) > 0).map(p => (
                      <View
                        key={p.id}
                        style={[styles.provResultBarSeg, {
                          flex: pr.seats[p.id] || 0,
                          backgroundColor: p.color,
                        }]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.provPlayerSeats, { color: party?.color }]}>
                    {playerProvSeats}★
                  </Text>
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

  // ---------- CAMPAIGN PHASE ----------
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.campaignHeader}>
        <View>
          <Text style={styles.campaignTitle}>Election Campaign {year}</Text>
          <Text style={styles.campaignSub}>Week {campaignWeek} of 4</Text>
        </View>
        <View style={styles.weekIndicators}>
          {[1, 2, 3, 4].map(w => (
            <View
              key={w}
              style={[styles.weekDot, campaignWeek >= w && { backgroundColor: party?.color || Colors.gold }]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.campaignContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Debate alert for week 2 */}
        {isDebateWeek ? (
          <Pressable
            onPress={() => router.push('/debate')}
            style={({ pressed }) => [styles.debateAlert, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="microphone" size={32} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.debateAlertTitle}>🔴 LEADERSHIP DEBATE TONIGHT</Text>
              <Text style={styles.debateAlertSub}>Face the other party leaders. Your performance will sway millions of voters.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.gold} />
          </Pressable>
        ) : null}

        {/* Campaign Stats */}
        <View style={styles.campaignStats}>
          <View style={styles.campaignStat}>
            <Text style={styles.campaignStatValue}>{campaignState.campaignedProvinces.length}</Text>
            <Text style={styles.campaignStatLabel}>Provinces Visited</Text>
          </View>
          <View style={styles.campaignStat}>
            <Text style={[styles.campaignStatValue, { color: Colors.success }]}>
              {campaignState.polls[0]?.results?.[gameState.playerPartyId]?.toFixed(1) || gameState.stats.approvalRating.toFixed(1)}%
            </Text>
            <Text style={styles.campaignStatLabel}>Polling</Text>
          </View>
          <View style={styles.campaignStat}>
            <Text style={[styles.campaignStatValue, { color: Colors.warning }]}>
              ${(campaignState.rallyCosts / 1000000).toFixed(1)}M
            </Text>
            <Text style={styles.campaignStatLabel}>Campaign Spend</Text>
          </View>
        </View>

        {/* Campaign Events */}
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

        {/* Province Buttons */}
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
                  {hasVisited ? (
                    <MaterialCommunityIcons name="check-circle" size={10} color={party?.color || Colors.gold} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Launch Election Night */}
        {campaignState.campaignedProvinces.length >= 3 ? (
          <Pressable
            onPress={startElectionNight}
            style={({ pressed }) => [styles.electionNightBtn, pressed && { opacity: 0.85 }]}
          >
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

  // Election Night
  electionNightWrapper: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  enHeader: {
    alignItems: 'center',
    gap: 4,
  },
  enLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  enLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  enLiveText: {
    fontSize: 10,
    fontWeight: FontWeight.extrabold,
    color: '#fff',
    letterSpacing: 2,
  },
  enTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    letterSpacing: 3,
    textAlign: 'center',
  },
  enSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  ticker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.gold + '22',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.gold + '33',
  },
  tickerText: {
    fontSize: FontSize.xs,
    color: Colors.gold,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  enMapContainer: {
    backgroundColor: Colors.card + 'CC',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  majorityFlashBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: Radius.sm,
    paddingVertical: 8,
  },
  majorityFlashText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.extrabold,
    color: '#fff',
    letterSpacing: 2,
  },
  runningTotals: {
    gap: 6,
  },
  runningParty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card + 'CC',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderColor: 'transparent',
    borderWidth: 1,
  },
  runningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  runningShortName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    width: 38,
  },
  runningSeats: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    width: 36,
    textAlign: 'center',
  },
  runningBar: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  runningBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  majorityCheckmark: {
    position: 'absolute',
    right: 4,
    top: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gold,
  },
  majorityThreshold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  majorityLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gold + '44',
  },
  majorityThresholdText: {
    fontSize: 9,
    color: Colors.gold,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 2,
  },

  // Results
  resultsContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  resultsBanner: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  resultsBannerEmoji: {
    fontSize: 40,
  },
  resultsBannerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    textAlign: 'center',
    letterSpacing: 1,
  },
  resultsBannerSub: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  resultsBannerVote: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  minorityWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.warning + '11',
    borderRadius: Radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.warning + '33',
    marginTop: 4,
  },
  minorityWarningText: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    flex: 1,
    lineHeight: 16,
  },
  resultsMapCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  fullResultsCard: {
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
    marginBottom: 4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 6,
    borderRadius: Radius.sm,
    borderLeftWidth: 0,
  },
  resultDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  resultPartyInfo: {
    width: 55,
  },
  resultPartyName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  resultPartyFull: {
    fontSize: 8,
    color: Colors.textMuted,
    lineHeight: 10,
  },
  resultBarContainer: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 5,
    overflow: 'hidden',
  },
  resultBar: {
    height: '100%',
    borderRadius: 5,
  },
  resultSeats: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    minWidth: 32,
    textAlign: 'right',
  },
  resultsMajorityLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  resultsMajorityDash: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gold + '44',
  },
  resultsMajorityLabel: {
    fontSize: 9,
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  provinceResultsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: 8,
  },
  provResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  provResultCode: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    width: 28,
  },
  provResultDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  provResultSeats: {
    fontSize: 9,
    color: Colors.textMuted,
    width: 42,
  },
  provResultBar: {
    flex: 1,
    height: 8,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceBorder,
  },
  provResultBarSeg: {
    height: '100%',
  },
  provPlayerSeats: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    width: 28,
    textAlign: 'right',
  },
  continueBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  continueBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },

  // Campaign
  campaignHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  campaignTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  campaignSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  weekIndicators: {
    flexDirection: 'row',
    gap: 6,
  },
  weekDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.surfaceBorder,
  },
  campaignContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  debateAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gold + '15',
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.gold + '66',
    padding: Spacing.md,
  },
  debateAlertTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },
  debateAlertSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  campaignStats: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  campaignStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  campaignStatValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  campaignStatLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  eventsSection: {
    gap: Spacing.xs,
  },
  campaignEventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  campaignEventText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  provinceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  provinceBtn: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 1,
    minWidth: 52,
  },
  provinceBtnCode: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  provinceBtnSeats: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  electionNightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  electionNightBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#fff',
    letterSpacing: 0.5,
  },
  campaignTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.info + '11',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.info + '22',
  },
  campaignTipText: {
    fontSize: FontSize.xs,
    color: Colors.info,
    flex: 1,
    lineHeight: 18,
  },
});
