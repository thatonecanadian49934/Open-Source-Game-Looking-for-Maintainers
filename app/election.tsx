// Powered by OnSpace.AI — Election: aligned campaign weeks, riding-level map, province polling, harder elections
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated, Dimensions,
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
  RidingData,
  campaignInProvince,
  spendOnRiding,
  generateProvincePollData,
} from '@/services/electionService';

const REVEAL_ORDER = ['NL', 'PE', 'NS', 'NB', 'QC', 'ON', 'MB', 'SK', 'AB', 'BC', 'YT', 'NT', 'NU'];
const REGION_ANNOUNCEMENTS: Record<string, string> = {
  NL: 'Newfoundland & Labrador reporting...',
  PE: 'Prince Edward Island reporting...',
  NS: 'Nova Scotia results coming in...',
  NB: 'New Brunswick declaring...',
  QC: 'QUÉBEC — 78 ridings reporting!',
  ON: 'ONTARIO — 122 ridings! The decisive province is in!',
  MB: 'Manitoba results arriving...',
  SK: 'Saskatchewan declaring...',
  AB: 'ALBERTA — 37 ridings reporting...',
  BC: 'BRITISH COLUMBIA — Final major province declared!',
  YT: 'Yukon declaring...',
  NT: 'Northwest Territories reporting...',
  NU: 'Nunavut — Final riding declared. Canada has spoken.',
};

type ElectionPhase = 'campaign' | 'election_night' | 'results';
type CampaignTab = 'map' | 'polling' | 'spending';

const VULNERABILITY_COLORS: Record<string, string> = {
  ultra_marginal: Colors.error,
  tossup: Colors.warning,
  lean: Colors.info,
  likely: Colors.success,
  safe: Colors.textMuted,
};

const VULNERABILITY_LABELS: Record<string, string> = {
  ultra_marginal: 'ULTRA MARGINAL',
  tossup: 'TOSS-UP',
  lean: 'LEAN',
  likely: 'LIKELY',
  safe: 'SAFE',
};

export default function ElectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, campaignState, campaignInRegion, completeCampaign, startElectionCampaign } = useGame();

  const [phase, setPhase] = useState<ElectionPhase>('campaign');
  const [localResult, setLocalResult] = useState<ElectionNightResult | null>(null);
  const [revealedProvinces, setRevealedProvinces] = useState<string[]>([]);
  const [runningSeats, setRunningSeats] = useState<Record<string, number>>({});
  const [runningProvSeats, setRunningProvSeats] = useState<Record<string, Record<string, number>>>({});
  const [currentAnnouncement, setCurrentAnnouncement] = useState('');
  const [declaredCount, setDeclaredCount] = useState(0);
  const [majorityWinner, setMajorityWinner] = useState<string | null>(null);
  const [majorityFlash] = useState(new Animated.Value(0));
  const [headerFade] = useState(new Animated.Value(1));
  const [isRevealing, setIsRevealing] = useState(false);
  const [ridingDrilldown, setRidingDrilldown] = useState<string | null>(null);
  const [campaignTab, setCampaignTab] = useState<CampaignTab>('map');
  const [selectedRiding, setSelectedRiding] = useState<RidingData | null>(null);
  const [showSpendModal, setShowSpendModal] = useState(false);

  useEffect(() => {
    if (gameState && !campaignState && gameState.inElection) {
      startElectionCampaign();
    }
  }, [gameState?.inElection]);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;

  // ALIGNED: campaign week = how many game weeks have elapsed since election was called
  // campaignState.gameWeekStart is set when election is triggered
  const gameWeeksSinceElection = campaignState?.gameWeekStart
    ? Math.max(1, Math.min(4, gameState.currentWeek - campaignState.gameWeekStart + 1))
    : campaignState?.week || 1;
  const currentCampaignWeek = gameWeeksSinceElection;
  const isDebateWeek = currentCampaignWeek === 3;
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
    if (!gameState) return;
    const cs = campaignState || {
      week: 4, gameWeekStart: gameState.currentWeek - 3, playerPartyId: gameState.playerPartyId,
      polls: [], provincePollData: [], campaignedProvinces: [], debateCompleted: false, debateScore: 50,
      campaignEvents: [], rallyCosts: 0, approval: {}, candidateSpending: {}, ridingData: [],
      vulnerableRidings: [], spendingPool: 0, totalBudget: 20_000_000,
    };
    const result = simulateElectionResults(gameState.playerPartyId, gameState.stats, cs, gameState.seats);
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
        setRevealedProvinces(prev => [...prev, code]);
        setRunningSeats({ ...cumulativeSeats });
        setRunningProvSeats({ ...cumulativeProvSeats });
        setDeclaredCount(prev => prev + 1);
        setCurrentAnnouncement(REGION_ANNOUNCEMENTS[code] || `${code} declaring...`);
        if (!hasMajority) {
          const majorityParty = Object.entries(cumulativeSeats).find(([, seats]) => seats >= MAJORITY_SEATS);
          if (majorityParty) { hasMajority = true; setMajorityWinner(majorityParty[0]); flashMajority(); }
        }
      }
      idx++;
      const delay = code === 'QC' || code === 'ON' ? 2200 : code === 'BC' || code === 'AB' ? 1800 : 1400;
      setTimeout(revealNext, delay + Math.random() * 500);
    };
    setTimeout(revealNext, 800);
  };

  const handleCampaignProvince = (code: string) => {
    if (!campaignState) return;
    if (campaignState.campaignedProvinces.includes(code)) return;
    campaignInRegion(code);
  };

  // ── ELECTION NIGHT ─────────────────────────────────────────────────────────
  if (phase === 'election_night') {
    const totalDeclared = REAL_PROVINCES.length;
    const progressPct = (declaredCount / totalDeclared) * 100;

    return (
      <View style={styles.container}>
        <Image source={require('@/assets/images/election_night.jpg')} style={StyleSheet.absoluteFillObject} contentFit="cover" />
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
            <ElectoralMap seats={runningSeats} provincialSeats={runningProvSeats} playerPartyId={gameState.playerPartyId} animated={true} revealedProvinces={revealedProvinces} />
          </View>

          {majorityWinner ? (
            <Animated.View style={[styles.majorityFlashBanner, { opacity: majorityFlash }]}>
              <MaterialCommunityIcons name="trophy" size={20} color="#fff" />
              <Text style={styles.majorityFlashText}>{PARTIES.find(p => p.id === majorityWinner)?.shortName} MAJORITY!</Text>
            </Animated.View>
          ) : null}

          <View style={styles.runningTotals}>
            {PARTIES
              .filter(p => p.baseSupport > 3 || (runningSeats[p.id] || 0) > 0)
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
                    <Text style={[styles.runningShortName, { color: p.color }]}>{p.shortName}{isPlayer ? ' ★' : ''}</Text>
                    <Text style={[styles.runningSeats, hasMaj ? { color: Colors.gold } : { color: Colors.textPrimary }]}>{seats}</Text>
                    <View style={styles.runningBar}>
                      <View style={[styles.runningBarFill, { width: `${Math.min(100, pct * 1.8)}%` as any, backgroundColor: p.color }]} />
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

  // ── RESULTS ────────────────────────────────────────────────────────────────
  if (phase === 'results' && localResult) {
    const playerSeats = localResult.playerSeats;
    const playerWon = playerSeats >= MAJORITY_SEATS || playerSeats === Math.max(...Object.values(localResult.totalSeats).filter(v => typeof v === 'number'));
    const isMajority = playerSeats >= MAJORITY_SEATS;
    const resultColor = playerWon ? (isMajority ? Colors.success : Colors.info) : Colors.error;

    return (
      <Animated.View style={[styles.container, { opacity: headerFade }]}>
        <ScrollView
          contentContainerStyle={[styles.resultsContent, { paddingBottom: insets.bottom + 40, paddingTop: insets.top }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.resultsBanner, { backgroundColor: resultColor + '22', borderColor: resultColor + '55' }]}>
            <Text style={styles.resultsBannerEmoji}>{playerWon ? (isMajority ? '🎉' : '🇨🇦') : '⚔️'}</Text>
            <Text style={[styles.resultsBannerTitle, { color: resultColor }]}>
              {playerWon ? (isMajority ? 'MAJORITY GOVERNMENT' : 'MINORITY GOVERNMENT') : 'OFFICIAL OPPOSITION'}
            </Text>
            <Text style={[styles.resultsBannerSub, { color: resultColor }]}>{party?.name} — {playerSeats} seats</Text>
            <Text style={styles.resultsBannerVote}>{localResult.playerVotePct.toFixed(1)}% of the national vote</Text>
            {playerWon && !isMajority ? (
              <View style={styles.minorityWarning}>
                <MaterialCommunityIcons name="alert" size={14} color={Colors.warning} />
                <Text style={styles.minorityWarningText}>
                  Minority government — you need 172 seats for majority. The opposition can trigger a confidence vote.
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.resultsMapCard}>
            <ElectoralMap
              seats={localResult.totalSeats}
              provincialSeats={localResult.provinceResults.reduce((acc, r) => { acc[r.provinceCode] = r.seats; return acc; }, {} as Record<string, Record<string, number>>)}
              playerPartyId={gameState.playerPartyId}
            />
          </View>

          <View style={styles.fullResultsCard}>
            <Text style={styles.sectionTitle}>FINAL RESULTS — {gameState.parliamentNumber + 1}th PARLIAMENT</Text>
            {PARTIES
              .filter(p => (localResult.totalSeats[p.id] || 0) > 0)
              .sort((a, b) => (localResult.totalSeats[b.id] || 0) - (localResult.totalSeats[a.id] || 0))
              .map(p => {
                const seats = localResult.totalSeats[p.id] || 0;
                const pct = (seats / 343) * 100;
                const isPlayer = p.id === gameState.playerPartyId;
                return (
                  <View key={p.id} style={[styles.resultRow, isPlayer && { borderLeftColor: p.color, borderLeftWidth: 3 }]}>
                    <View style={[styles.resultDot, { backgroundColor: p.color }]} />
                    <View style={styles.resultPartyInfo}>
                      <Text style={[styles.resultPartyName, isPlayer && { color: Colors.gold }]}>
                        {p.shortName}{isPlayer ? ' ★' : ''}{seats >= MAJORITY_SEATS ? ' ✓' : ''}
                      </Text>
                      <Text style={styles.resultPartyFull}>{p.name}</Text>
                    </View>
                    <View style={styles.resultBarContainer}>
                      <View style={[styles.resultBar, { width: `${Math.min(100, pct * 2.2)}%` as any, backgroundColor: p.color + 'CC' }]} />
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

          <View style={styles.provinceResultsCard}>
            <Text style={styles.sectionTitle}>PROVINCE-BY-PROVINCE</Text>
            {localResult.provinceResults.map(pr => {
              const province = REAL_PROVINCES.find(p => p.code === pr.provinceCode);
              const playerProvSeats = pr.seats[gameState.playerPartyId] || 0;
              const dominantId = Object.entries(pr.seats).sort(([, a], [, b]) => b - a)[0]?.[0];
              const dominantParty = PARTIES.find(p => p.id === dominantId);
              const isExpanded = ridingDrilldown === pr.provinceCode;

              return (
                <View key={pr.provinceCode} style={styles.provResultWrapper}>
                  <Pressable
                    onPress={() => setRidingDrilldown(prev => prev === pr.provinceCode ? null : pr.provinceCode)}
                    style={({ pressed }) => [styles.provResultRow, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={styles.provResultCode}>{pr.provinceCode}</Text>
                    <View style={[styles.provResultDot, { backgroundColor: dominantParty?.color || Colors.textMuted }]} />
                    <Text style={styles.provResultSeats}>{province?.seats || 0}s</Text>
                    <View style={styles.provResultBar}>
                      {PARTIES.filter(p => (pr.seats[p.id] || 0) > 0).map(p => (
                        <View key={p.id} style={[styles.provResultBarSeg, { flex: pr.seats[p.id] || 0, backgroundColor: p.color }]} />
                      ))}
                    </View>
                    <Text style={[styles.provPlayerSeats, { color: party?.color }]}>{playerProvSeats}★</Text>
                    <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={Colors.textMuted} />
                  </Pressable>

                  {isExpanded ? (
                    <View style={styles.provExpandDetail}>
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
                      {/* Vote share bars */}
                      <View style={styles.voteShareBars}>
                        {PARTIES.filter(p => (pr.voteShare[p.id] || 0) > 2)
                          .sort((a, b) => (pr.voteShare[b.id] || 0) - (pr.voteShare[a.id] || 0))
                          .map(p => (
                            <View key={p.id} style={styles.voteShareRow}>
                              <Text style={[styles.voteShareParty, { color: p.color }]}>{p.shortName}</Text>
                              <View style={styles.voteShareBarBg}>
                                <View style={[styles.voteShareBarFill, { width: `${pr.voteShare[p.id] || 0}%` as any, backgroundColor: p.color }]} />
                              </View>
                              <Text style={styles.voteSharePct}>{(pr.voteShare[p.id] || 0).toFixed(1)}%</Text>
                            </View>
                          ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={() => {
              if (gameState.inLeadershipReview) {
                router.replace('/leadership-review');
              } else {
                router.replace('/(tabs)');
              }
            }}
            style={({ pressed }) => [styles.continueBtn, { backgroundColor: resultColor }, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.continueBtnText}>
              {gameState.inLeadershipReview ? 'Face Leadership Review' : `Begin ${gameState.parliamentNumber + 1}th Parliament`}
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    );
  }

  // ── CAMPAIGN ───────────────────────────────────────────────────────────────
  const visitedProvinces = campaignState?.campaignedProvinces || [];
  const provincePoll = campaignState?.provincePollData || [];
  const vulnerableRidings = (campaignState?.vulnerableRidings || []).slice(0, 20);
  const spendingPool = campaignState?.spendingPool ?? campaignState?.totalBudget ?? 20_000_000;
  const totalBudget = campaignState?.totalBudget ?? 20_000_000;
  const candidateSpending = campaignState?.candidateSpending || {};

  // Poll accuracy label
  const currentPoll = provincePoll.find(p => p.provinceCode === 'ON');
  const playerNationalPoll = campaignState?.polls?.[0]?.results?.[gameState.playerPartyId] || gameState.stats.approvalRating;

  const canStartElectionNight = visitedProvinces.length >= 3 || currentCampaignWeek >= 4;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Campaign Header */}
      <View style={[styles.campaignHeader, { borderBottomColor: partyColor + '44' }]}>
        <View>
          <Text style={styles.campaignTitle}>Election Campaign {year}</Text>
          <Text style={styles.campaignSub}>
            Week {currentCampaignWeek} of 4 — Game Week {gameState.currentWeek}
          </Text>
        </View>
        <View style={styles.weekIndicators}>
          {[1, 2, 3, 4].map(w => (
            <View key={w} style={[
              styles.weekDot,
              currentCampaignWeek >= w
                ? { backgroundColor: partyColor }
                : { backgroundColor: Colors.surfaceBorder },
            ]}>
              {w === 3 ? <MaterialCommunityIcons name="microphone" size={7} color={currentCampaignWeek >= 3 ? '#fff' : Colors.textMuted} /> : null}
            </View>
          ))}
        </View>
      </View>

      {/* Week Guide */}
      <View style={styles.weekGuide}>
        {[
          { week: 1, label: 'Launch', icon: 'flag' },
          { week: 2, label: 'Blitz', icon: 'run-fast' },
          { week: 3, label: 'Debate', icon: 'microphone' },
          { week: 4, label: 'Final Push', icon: 'vote' },
        ].map(w => (
          <View key={w.week} style={[
            styles.weekGuideItem,
            currentCampaignWeek === w.week && { backgroundColor: partyColor + '22', borderBottomWidth: 2, borderBottomColor: partyColor },
          ]}>
            <MaterialCommunityIcons name={w.icon as any} size={12} color={currentCampaignWeek >= w.week ? partyColor : Colors.textMuted} />
            <Text style={[styles.weekGuideLabel, currentCampaignWeek >= w.week && { color: partyColor }]}>{w.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['map', 'polling', 'spending'] as CampaignTab[]).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setCampaignTab(tab)}
            style={[styles.tabBtn, campaignTab === tab && { borderBottomColor: partyColor, borderBottomWidth: 2 }]}
          >
            <MaterialCommunityIcons
              name={tab === 'map' ? 'map-marker-multiple' : tab === 'polling' ? 'chart-bar' : 'cash'}
              size={14}
              color={campaignTab === tab ? partyColor : Colors.textMuted}
            />
            <Text style={[styles.tabBtnText, campaignTab === tab && { color: partyColor }]}>
              {tab === 'map' ? 'Riding Map' : tab === 'polling' ? 'Polling' : 'Spending'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.campaignContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Debate Alert */}
        {isDebateWeek ? (
          <Pressable
            onPress={() => router.push('/debate')}
            style={({ pressed }) => [styles.debateAlert, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="microphone" size={30} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.debateAlertTitle}>🔴 LEADERSHIP DEBATE — Week 3</Text>
              <Text style={styles.debateAlertSub}>Your performance here could shift millions of votes across the country.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.gold} />
          </Pressable>
        ) : null}

        {/* Campaign summary stats */}
        <View style={styles.campaignStats}>
          <View style={styles.campaignStat}>
            <Text style={[styles.campaignStatValue, { color: Colors.textPrimary }]}>{visitedProvinces.length}</Text>
            <Text style={styles.campaignStatLabel}>Provinces{'\n'}Visited</Text>
          </View>
          <View style={styles.campaignStatDivider} />
          <View style={styles.campaignStat}>
            <Text style={[styles.campaignStatValue, { color: playerNationalPoll > 33 ? Colors.success : Colors.warning }]}>
              {playerNationalPoll.toFixed(1)}%
            </Text>
            <Text style={styles.campaignStatLabel}>National{'\n'}Polling</Text>
          </View>
          <View style={styles.campaignStatDivider} />
          <View style={styles.campaignStat}>
            <Text style={[styles.campaignStatValue, { color: Colors.gold }]}>
              ${(spendingPool / 1_000_000).toFixed(1)}M
            </Text>
            <Text style={styles.campaignStatLabel}>Budget{'\n'}Remaining</Text>
          </View>
          <View style={styles.campaignStatDivider} />
          <View style={styles.campaignStat}>
            <Text style={[styles.campaignStatValue, { color: Colors.info }]}>
              {Math.round((campaignState?.debateScore || 50))}
            </Text>
            <Text style={styles.campaignStatLabel}>Debate{'\n'}Score</Text>
          </View>
        </View>

        {/* HARDER election warning if low approval */}
        {gameState.stats.approvalRating < 38 ? (
          <View style={styles.hardWarning}>
            <MaterialCommunityIcons name="alert" size={14} color={Colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.hardWarningTitle}>Difficult Electoral Conditions</Text>
              <Text style={styles.hardWarningText}>
                Your approval rating of {Math.round(gameState.stats.approvalRating)}% makes a majority unlikely. Campaign intensively in swing ridings and province debates to improve your standing.
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── TAB: RIDING MAP ─────────────────────────────────────────────── */}
        {campaignTab === 'map' ? (
          <>
            <View>
              <Text style={styles.sectionTitle}>PROVINCE CAMPAIGN MAP</Text>
              <Text style={styles.sectionNote}>Tap a province to campaign there. Visited provinces get a +4% regional boost.</Text>
              <View style={styles.provinceGrid}>
                {REAL_PROVINCES.map(province => {
                  const hasVisited = visitedProvinces.includes(province.code);
                  const provincePollForThis = provincePoll.find(p => p.provinceCode === province.code);
                  const playerPct = provincePollForThis?.results?.[gameState.playerPartyId] || 0;
                  const dominantId = provincePollForThis
                    ? Object.entries(provincePollForThis.results).sort(([, a], [, b]) => b - a)[0]?.[0]
                    : gameState.playerPartyId;
                  const isLeading = dominantId === gameState.playerPartyId;
                  return (
                    <Pressable
                      key={province.code}
                      onPress={() => !hasVisited && handleCampaignProvince(province.code)}
                      style={({ pressed }) => [
                        styles.provinceBtn,
                        hasVisited
                          ? { backgroundColor: partyColor + '22', borderColor: partyColor }
                          : isLeading
                          ? { borderColor: Colors.success + '66' }
                          : { borderColor: Colors.surfaceBorder },
                        pressed && !hasVisited && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                      ]}
                    >
                      <Text style={[styles.provinceBtnCode, hasVisited && { color: partyColor }]}>{province.code}</Text>
                      <Text style={styles.provinceBtnSeats}>{province.seats}s</Text>
                      {playerPct > 0 ? (
                        <Text style={[styles.provinceBtnPoll, { color: isLeading ? Colors.success : Colors.warning }]}>
                          {playerPct.toFixed(0)}%
                        </Text>
                      ) : null}
                      {hasVisited ? <MaterialCommunityIcons name="check-circle" size={10} color={partyColor} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Vulnerable Ridings */}
            {vulnerableRidings.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>SWING RIDINGS — TARGET SEATS</Text>
                <Text style={styles.sectionNote}>These ridings could flip. Spend campaign resources to secure or flip them.</Text>
                {vulnerableRidings.slice(0, 12).map((riding, idx) => {
                  const holderParty = PARTIES.find(p => p.id === riding.currentHolder);
                  const projectedParty = PARTIES.find(p => p.id === riding.projectedWinner);
                  const vulnColor = VULNERABILITY_COLORS[riding.vulnerability] || Colors.textMuted;
                  const playerPollInRiding = riding.poll[gameState.playerPartyId] || 0;
                  const isOurSeat = riding.currentHolder === gameState.playerPartyId;
                  const ridingSpend = riding.campaignSpending[gameState.playerPartyId] || 0;
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => setSelectedRiding(riding)}
                      style={({ pressed }) => [
                        styles.ridingCard,
                        isOurSeat && { borderColor: partyColor + '44', backgroundColor: partyColor + '05' },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <View style={styles.ridingCardLeft}>
                        <View style={styles.ridingCardHeader}>
                          <Text style={styles.ridingCardName} numberOfLines={1}>{riding.name}</Text>
                          <Text style={styles.ridingCardProvince}>{riding.provinceCode}</Text>
                        </View>
                        <View style={styles.ridingCardMeta}>
                          <View style={[styles.vulnBadge, { backgroundColor: vulnColor + '22' }]}>
                            <Text style={[styles.vulnBadgeText, { color: vulnColor }]}>
                              {VULNERABILITY_LABELS[riding.vulnerability]}
                            </Text>
                          </View>
                          <Text style={styles.ridingCardMargin}>±{riding.marginPct}%</Text>
                          {isOurSeat ? (
                            <View style={[styles.ourSeatBadge, { backgroundColor: partyColor + '22' }]}>
                              <Text style={[styles.ourSeatText, { color: partyColor }]}>Our seat</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.ridingPollRow}>
                          <View style={[styles.ridingHolderDot, { backgroundColor: holderParty?.color || Colors.textMuted }]} />
                          <Text style={styles.ridingHolderText}>{holderParty?.shortName} holds</Text>
                          <MaterialCommunityIcons name="arrow-right" size={10} color={Colors.textMuted} />
                          <View style={[styles.ridingHolderDot, { backgroundColor: projectedParty?.color || Colors.textMuted }]} />
                          <Text style={[styles.ridingProjected, { color: projectedParty?.color || Colors.textMuted }]}>
                            {projectedParty?.shortName} projected
                          </Text>
                        </View>
                      </View>
                      <View style={styles.ridingCardRight}>
                        <Text style={[styles.ridingPlayerPoll, { color: playerPollInRiding > 40 ? Colors.success : playerPollInRiding > 30 ? Colors.warning : Colors.error }]}>
                          {playerPollInRiding.toFixed(0)}%
                        </Text>
                        <Text style={styles.ridingPlayerPollLabel}>your poll</Text>
                        {ridingSpend > 0 ? (
                          <Text style={[styles.ridingSpendLabel, { color: Colors.gold }]}>
                            ${(ridingSpend / 1000).toFixed(0)}k spent
                          </Text>
                        ) : null}
                        <MaterialCommunityIcons name="chevron-right" size={12} color={Colors.textMuted} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {/* Riding spend modal */}
            {selectedRiding ? (
              <View style={styles.ridingModal}>
                <View style={styles.ridingModalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ridingModalName}>{selectedRiding.name}, {selectedRiding.provinceCode}</Text>
                    <Text style={[styles.ridingModalVuln, { color: VULNERABILITY_COLORS[selectedRiding.vulnerability] }]}>
                      {VULNERABILITY_LABELS[selectedRiding.vulnerability]} — Margin: ±{selectedRiding.marginPct}%
                    </Text>
                  </View>
                  <Pressable onPress={() => setSelectedRiding(null)} style={styles.ridingModalClose}>
                    <MaterialCommunityIcons name="close" size={18} color={Colors.textMuted} />
                  </Pressable>
                </View>

                {/* Poll breakdown */}
                <Text style={styles.ridingModalPollTitle}>RIDING POLL</Text>
                {PARTIES.filter(p => (selectedRiding.poll[p.id] || 0) > 2)
                  .sort((a, b) => (selectedRiding.poll[b.id] || 0) - (selectedRiding.poll[a.id] || 0))
                  .map(p => (
                    <View key={p.id} style={styles.ridingPollBarRow}>
                      <Text style={[styles.ridingPollBarParty, { color: p.color }]}>{p.shortName}</Text>
                      <View style={styles.ridingPollBarBg}>
                        <View style={[styles.ridingPollBarFill, { width: `${selectedRiding.poll[p.id] || 0}%` as any, backgroundColor: p.color }]} />
                      </View>
                      <Text style={[styles.ridingPollBarPct, { color: p.color }]}>{(selectedRiding.poll[p.id] || 0).toFixed(0)}%</Text>
                    </View>
                  ))}

                {/* Spending options */}
                <Text style={[styles.ridingModalPollTitle, { marginTop: 10 }]}>INVEST CAMPAIGN RESOURCES</Text>
                <Text style={styles.ridingModalNote}>Budget remaining: ${(spendingPool / 1_000_000).toFixed(2)}M</Text>
                {[
                  { label: '$250K — Local ads', amount: 250_000, boost: 1.0 },
                  { label: '$500K — Ground canvas', amount: 500_000, boost: 2.0 },
                  { label: '$1M — Full blitz', amount: 1_000_000, boost: 4.0 },
                ].map(opt => (
                  <Pressable
                    key={opt.label}
                    disabled={spendingPool < opt.amount}
                    onPress={() => {
                      // Update through context
                      setSelectedRiding(null);
                    }}
                    style={({ pressed }) => [
                      styles.spendOption,
                      spendingPool < opt.amount && { opacity: 0.35 },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <MaterialCommunityIcons name="cash" size={14} color={Colors.success} />
                    <Text style={styles.spendOptionLabel}>{opt.label}</Text>
                    <Text style={[styles.spendOptionBoost, { color: Colors.success }]}>+{opt.boost}% poll</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Recent events */}
            {(campaignState?.campaignEvents.length || 0) > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>RECENT CAMPAIGN EVENTS</Text>
                {(campaignState?.campaignEvents || []).slice(-4).reverse().map(event => (
                  <View key={event.id} style={styles.campaignEventCard}>
                    <MaterialCommunityIcons name="map-marker-check" size={13} color={Colors.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.campaignEventText}>{event.description}</Text>
                      <Text style={styles.campaignEventWeek}>Campaign Week {event.week}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {/* ── TAB: POLLING ─────────────────────────────────────────────────── */}
        {campaignTab === 'polling' ? (
          <>
            <View>
              <Text style={styles.sectionTitle}>NATIONAL POLLING</Text>
              <View style={styles.nationalPollCard}>
                {PARTIES
                  .filter(p => (campaignState?.polls?.[0]?.results?.[p.id] || 0) > 1)
                  .sort((a, b) => (campaignState?.polls?.[0]?.results?.[b.id] || 0) - (campaignState?.polls?.[0]?.results?.[a.id] || 0))
                  .map(p => {
                    const pct = campaignState?.polls?.[0]?.results?.[p.id] || 0;
                    const isPlayer = p.id === gameState.playerPartyId;
                    return (
                      <View key={p.id} style={styles.pollRow}>
                        <View style={[styles.pollDot, { backgroundColor: p.color }]} />
                        <Text style={[styles.pollParty, isPlayer && { color: partyColor, fontWeight: FontWeight.bold }]}>
                          {p.shortName}{isPlayer ? ' ★' : ''}
                        </Text>
                        <View style={styles.pollBarBg}>
                          <View style={[styles.pollBarFill, { width: `${pct * 2}%` as any, backgroundColor: p.color }]} />
                        </View>
                        <Text style={[styles.pollPct, isPlayer && { color: partyColor }]}>{pct.toFixed(1)}%</Text>
                      </View>
                    );
                  })}
                <Text style={styles.pollNote}>National sample — margin of error ±2.5%</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>PROVINCE-BY-PROVINCE POLLING</Text>
            {REAL_PROVINCES.map(province => {
              const prov = provincePoll.find(p => p.provinceCode === province.code);
              if (!prov) return null;
              const playerPct = prov.results[gameState.playerPartyId] || 0;
              const allResults = Object.entries(prov.results)
                .filter(([, v]) => v > 2)
                .sort(([, a], [, b]) => b - a);
              const leader = allResults[0]?.[0];
              const leaderParty = PARTIES.find(p => p.id === leader);
              const isLeading = leader === gameState.playerPartyId;

              return (
                <View key={province.code} style={styles.provPollCard}>
                  <View style={styles.provPollHeader}>
                    <Text style={styles.provPollCode}>{province.code}</Text>
                    <Text style={styles.provPollName} numberOfLines={1}>{province.name}</Text>
                    <Text style={styles.provPollSeats}>{province.seats} seats</Text>
                    <View style={[styles.provLeadBadge, { backgroundColor: leaderParty?.color + '22' || Colors.surfaceBorder }]}>
                      <Text style={[styles.provLeadText, { color: leaderParty?.color || Colors.textMuted }]}>
                        {leaderParty?.shortName} leads
                      </Text>
                    </View>
                  </View>
                  <View style={styles.provPollBars}>
                    {allResults.slice(0, 4).map(([pid, pct]) => {
                      const p = PARTIES.find(pt => pt.id === pid);
                      const isPlayer2 = pid === gameState.playerPartyId;
                      return (
                        <View key={pid} style={styles.provPollBarRow}>
                          <Text style={[styles.provPollParty, { color: p?.color || Colors.textMuted, fontWeight: isPlayer2 ? FontWeight.bold : FontWeight.regular }]}>
                            {p?.shortName || pid}
                          </Text>
                          <View style={styles.provPollBarBg}>
                            <View style={[styles.provPollBarFill, { width: `${pct * 1.8}%` as any, backgroundColor: p?.color || Colors.textMuted }]} />
                          </View>
                          <Text style={[styles.provPollPct, { color: p?.color || Colors.textMuted }]}>{pct.toFixed(0)}%</Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={styles.provPollMoE}>n={prov.sampleSize} ±{prov.margin.toFixed(1)}%</Text>
                  {visitedProvinces.includes(province.code) ? (
                    <View style={styles.visitedBoostBadge}>
                      <MaterialCommunityIcons name="check" size={10} color={partyColor} />
                      <Text style={[styles.visitedBoostText, { color: partyColor }]}>Visited — +4% boost applied</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </>
        ) : null}

        {/* ── TAB: SPENDING ────────────────────────────────────────────────── */}
        {campaignTab === 'spending' ? (
          <>
            {/* Budget overview */}
            <View style={styles.budgetCard}>
              <Text style={styles.sectionTitle}>CAMPAIGN BUDGET</Text>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>Total Budget</Text>
                <Text style={styles.budgetValue}>${(totalBudget / 1_000_000).toFixed(0)}M</Text>
              </View>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>Spent</Text>
                <Text style={[styles.budgetValue, { color: Colors.error }]}>
                  ${((totalBudget - spendingPool) / 1_000_000).toFixed(2)}M
                </Text>
              </View>
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>Remaining</Text>
                <Text style={[styles.budgetValue, { color: Colors.success }]}>
                  ${(spendingPool / 1_000_000).toFixed(2)}M
                </Text>
              </View>
              <View style={styles.budgetBarBg}>
                <View style={[styles.budgetBarFill, {
                  width: `${((totalBudget - spendingPool) / totalBudget) * 100}%` as any,
                  backgroundColor: spendingPool > totalBudget * 0.3 ? Colors.success : Colors.warning,
                }]} />
              </View>
              <Text style={styles.budgetNote}>
                {((totalBudget - spendingPool) / totalBudget * 100).toFixed(0)}% of budget used
              </Text>
            </View>

            {/* Province-level spending */}
            <Text style={styles.sectionTitle}>SPENDING BY PROVINCE</Text>
            {REAL_PROVINCES.map(province => {
              const spentHere = candidateSpending[province.code] || 0;
              const isVisited = visitedProvinces.includes(province.code);
              if (!isVisited && spentHere === 0) return null;
              return (
                <View key={province.code} style={styles.spendingProvinceRow}>
                  <Text style={[styles.spendingProvinceCode, isVisited && { color: partyColor }]}>{province.code}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.spendingBarBg}>
                      <View style={[styles.spendingBarFill, {
                        width: `${Math.min(100, (spentHere / 2_000_000) * 100)}%` as any,
                        backgroundColor: partyColor,
                      }]} />
                    </View>
                    <Text style={styles.spendingProvinceAmount}>
                      ${(spentHere / 1000).toFixed(0)}k invested
                      {isVisited ? ' · Rally held' : ''}
                    </Text>
                  </View>
                </View>
              );
            })}

            {Object.keys(candidateSpending).length === 0 && visitedProvinces.length === 0 ? (
              <View style={styles.noSpendingCard}>
                <MaterialCommunityIcons name="cash-off" size={32} color={Colors.textMuted} />
                <Text style={styles.noSpendingText}>No spending recorded yet. Campaign in provinces to allocate resources.</Text>
              </View>
            ) : null}

            {/* Spending advice */}
            <View style={styles.spendingAdviceCard}>
              <MaterialCommunityIcons name="lightbulb" size={14} color={Colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.spendingAdviceTitle}>Campaign Strategy Advice</Text>
                <Text style={styles.spendingAdviceText}>
                  {spendingPool > totalBudget * 0.6
                    ? 'You have most of your budget remaining. Focus spending on toss-up ridings (Riding Map tab) for maximum impact.'
                    : spendingPool > totalBudget * 0.2
                    ? 'Good spending pace. Continue targeting swing ridings and provinces where the race is close.'
                    : 'Budget running low. Focus remaining resources on the most critical ridings where a small boost matters most.'}
                </Text>
              </View>
            </View>

            {/* Party spending comparison */}
            <Text style={styles.sectionTitle}>ESTIMATED OPPONENT SPENDING</Text>
            {PARTIES.filter(p => p.id !== gameState.playerPartyId && p.baseSupport > 5).slice(0, 4).map(p => {
              const estSpend = Math.floor(Math.random() * 15 + 8);
              return (
                <View key={p.id} style={styles.opponentSpendRow}>
                  <View style={[styles.opponentSpendDot, { backgroundColor: p.color }]} />
                  <Text style={[styles.opponentSpendName, { color: p.color }]}>{p.shortName}</Text>
                  <View style={styles.spendingBarBg}>
                    <View style={[styles.spendingBarFill, { width: `${estSpend * 5}%` as any, backgroundColor: p.color + '88' }]} />
                  </View>
                  <Text style={styles.opponentSpendAmt}>${estSpend}M est.</Text>
                </View>
              );
            })}
          </>
        ) : null}

        {/* Election Night Button */}
        {canStartElectionNight ? (
          <Pressable
            onPress={startElectionNight}
            style={({ pressed }) => [styles.electionNightBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="television-play" size={22} color="#fff" />
            <Text style={styles.electionNightBtnText}>ELECTION NIGHT — Count the Votes</Text>
          </Pressable>
        ) : (
          <View style={styles.campaignTip}>
            <MaterialCommunityIcons name="information" size={14} color={Colors.info} />
            <Text style={styles.campaignTipText}>
              Visit at least 3 provinces to unlock Election Night. Leadership Debate happens in Week 3.
              Currently visited: {visitedProvinces.length}/3.
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
  // ── Election Night ─────────────────────────────────────────────────────────
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
  runningBar: { flex: 1, height: 10, backgroundColor: Colors.surfaceBorder, borderRadius: 5, overflow: 'hidden' },
  runningBarFill: { height: '100%', borderRadius: 5 },
  majorityThreshold: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  majorityLine: { flex: 1, height: 1, backgroundColor: Colors.gold + '44' },
  majorityThresholdText: { fontSize: 9, color: Colors.gold, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  progressBar: { height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden', marginBottom: Spacing.sm },
  progressFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 2 },
  // ── Results ────────────────────────────────────────────────────────────────
  resultsContent: { padding: Spacing.md, gap: Spacing.md },
  resultsBanner: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, alignItems: 'center', gap: 6 },
  resultsBannerEmoji: { fontSize: 40 },
  resultsBannerTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, textAlign: 'center', letterSpacing: 1 },
  resultsBannerSub: { fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  resultsBannerVote: { fontSize: FontSize.sm, color: Colors.textSecondary },
  minorityWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.warning + '11', borderRadius: Radius.sm, padding: 8, borderWidth: 1, borderColor: Colors.warning + '33', marginTop: 4 },
  minorityWarningText: { fontSize: FontSize.xs, color: Colors.warning, flex: 1, lineHeight: 16 },
  resultsMapCard: { backgroundColor: Colors.card, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  fullResultsCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  sectionNote: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 8 },
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
  provinceResultsCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 6 },
  provResultWrapper: { gap: 0 },
  provResultRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 6, borderRadius: Radius.sm },
  provResultCode: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textSecondary, width: 24 },
  provResultDot: { width: 6, height: 6, borderRadius: 3 },
  provResultSeats: { fontSize: 9, color: Colors.textMuted, width: 26 },
  provResultBar: { flex: 1, height: 8, flexDirection: 'row', borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.surfaceBorder },
  provResultBarSeg: { height: '100%' },
  provPlayerSeats: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 26, textAlign: 'right' },
  provExpandDetail: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: Spacing.sm, gap: 8, marginBottom: 4 },
  ridingProvSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ridingProvParty: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ridingProvDot: { width: 6, height: 6, borderRadius: 3 },
  ridingProvShort: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  ridingProvSeats: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold },
  voteShareBars: { gap: 4 },
  voteShareRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voteShareParty: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 30 },
  voteShareBarBg: { flex: 1, height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden' },
  voteShareBarFill: { height: '100%', borderRadius: 4 },
  voteSharePct: { fontSize: FontSize.xs, color: Colors.textMuted, width: 36, textAlign: 'right' },
  continueBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, borderRadius: Radius.md, marginTop: Spacing.sm },
  continueBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  // ── Campaign ───────────────────────────────────────────────────────────────
  campaignHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1 },
  campaignTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  campaignSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  weekIndicators: { flexDirection: 'row', gap: 6 },
  weekDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.surfaceBorder, alignItems: 'center', justifyContent: 'center' },
  weekGuide: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  weekGuideItem: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8 },
  weekGuideLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: FontWeight.medium },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textMuted },
  campaignContent: { padding: Spacing.md, gap: Spacing.md },
  debateAlert: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.gold + '15', borderRadius: Radius.md, borderWidth: 2, borderColor: Colors.gold + '66', padding: Spacing.md },
  debateAlertTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  debateAlertSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  campaignStats: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  campaignStat: { flex: 1, alignItems: 'center', gap: 2 },
  campaignStatDivider: { width: 1, backgroundColor: Colors.surfaceBorder },
  campaignStatValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  campaignStatLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center', lineHeight: 13 },
  hardWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.error + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error + '44', padding: Spacing.sm },
  hardWarningTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.error, marginBottom: 2 },
  hardWarningText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  // Province grid
  provinceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  provinceBtn: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.card, borderWidth: 1, gap: 2, minWidth: 56 },
  provinceBtnCode: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  provinceBtnSeats: { fontSize: 9, color: Colors.textMuted },
  provinceBtnPoll: { fontSize: 9, fontWeight: FontWeight.bold },
  // Riding cards
  ridingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm, marginBottom: 6 },
  ridingCardLeft: { flex: 1, gap: 4 },
  ridingCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ridingCardName: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  ridingCardProvince: { fontSize: FontSize.xs, color: Colors.textMuted },
  ridingCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vulnBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  vulnBadgeText: { fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 0.3 },
  ridingCardMargin: { fontSize: FontSize.xs, color: Colors.textMuted },
  ourSeatBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  ourSeatText: { fontSize: 8, fontWeight: FontWeight.bold },
  ridingPollRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ridingHolderDot: { width: 6, height: 6, borderRadius: 3 },
  ridingHolderText: { fontSize: FontSize.xs, color: Colors.textMuted },
  ridingProjected: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  ridingCardRight: { alignItems: 'flex-end', gap: 2, minWidth: 60 },
  ridingPlayerPoll: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
  ridingPlayerPollLabel: { fontSize: 9, color: Colors.textMuted },
  ridingSpendLabel: { fontSize: 9, fontWeight: FontWeight.bold },
  // Riding modal
  ridingModal: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '44', padding: Spacing.md, gap: 8 },
  ridingModalHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  ridingModalName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  ridingModalVuln: { fontSize: FontSize.xs, marginTop: 2 },
  ridingModalClose: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  ridingModalPollTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  ridingPollBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  ridingPollBarParty: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 30 },
  ridingPollBarBg: { flex: 1, height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden' },
  ridingPollBarFill: { height: '100%', borderRadius: 4 },
  ridingPollBarPct: { fontSize: FontSize.xs, width: 32, textAlign: 'right' },
  ridingModalNote: { fontSize: FontSize.xs, color: Colors.textMuted },
  spendOption: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.success + '33', marginBottom: 4 },
  spendOptionLabel: { flex: 1, fontSize: FontSize.xs, color: Colors.textPrimary },
  spendOptionBoost: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  // Events
  campaignEventCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.card, borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  campaignEventText: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1, lineHeight: 17 },
  campaignEventWeek: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  // Polling tab
  nationalPollCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8, marginBottom: 8 },
  pollRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pollDot: { width: 8, height: 8, borderRadius: 4 },
  pollParty: { fontSize: FontSize.xs, color: Colors.textSecondary, width: 34 },
  pollBarBg: { flex: 1, height: 10, backgroundColor: Colors.surfaceBorder, borderRadius: 5, overflow: 'hidden' },
  pollBarFill: { height: '100%', borderRadius: 5 },
  pollPct: { fontSize: FontSize.xs, width: 38, textAlign: 'right', color: Colors.textSecondary },
  pollNote: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', marginTop: 4 },
  provPollCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm, marginBottom: 8 },
  provPollHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  provPollCode: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, width: 24 },
  provPollName: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  provPollSeats: { fontSize: 10, color: Colors.textMuted },
  provLeadBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  provLeadText: { fontSize: 9, fontWeight: FontWeight.bold },
  provPollBars: { gap: 4 },
  provPollBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  provPollParty: { fontSize: FontSize.xs, width: 32 },
  provPollBarBg: { flex: 1, height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden' },
  provPollBarFill: { height: '100%', borderRadius: 4 },
  provPollPct: { fontSize: FontSize.xs, width: 30, textAlign: 'right' },
  provPollMoE: { fontSize: 9, color: Colors.textMuted, marginTop: 4 },
  visitedBoostBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  visitedBoostText: { fontSize: 10, fontWeight: FontWeight.medium },
  // Spending tab
  budgetCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  budgetLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  budgetValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  budgetBarBg: { height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  budgetBarFill: { height: '100%', borderRadius: 4 },
  budgetNote: { fontSize: FontSize.xs, color: Colors.textMuted },
  spendingProvinceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  spendingProvinceCode: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary, width: 26 },
  spendingBarBg: { flex: 1, height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden' },
  spendingBarFill: { height: '100%', borderRadius: 4 },
  spendingProvinceAmount: { fontSize: FontSize.xs, color: Colors.textMuted },
  noSpendingCard: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  noSpendingText: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  spendingAdviceCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.gold + '0D', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.gold + '33' },
  spendingAdviceTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.gold, marginBottom: 3 },
  spendingAdviceText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  opponentSpendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  opponentSpendDot: { width: 8, height: 8, borderRadius: 4 },
  opponentSpendName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 32 },
  opponentSpendAmt: { fontSize: FontSize.xs, color: Colors.textMuted, width: 58, textAlign: 'right' },
  // Shared
  electionNightBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.md, paddingVertical: Spacing.lg, marginTop: Spacing.sm },
  electionNightBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff', letterSpacing: 0.5 },
  campaignTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.info + '11', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.info + '22' },
  campaignTipText: { fontSize: FontSize.xs, color: Colors.info, flex: 1, lineHeight: 18 },
});
