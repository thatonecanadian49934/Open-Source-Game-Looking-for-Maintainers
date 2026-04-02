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
import { initializeCampaign, campaignInProvince } from '@/services/electionService';

const { width } = Dimensions.get('window');

type ElectionPhase = 'campaign' | 'election_night' | 'results';

export default function ElectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, campaignState, campaignInRegion, completeCampaign, electionResult } = useGame();
  const [phase, setPhase] = useState<ElectionPhase>('campaign');
  const [revealedProvinces, setRevealedProvinces] = useState<string[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [phase]);

  if (!gameState || !campaignState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const campaignWeek = campaignState.week;
  const isDebateWeek = campaignWeek === 2;

  const startElectionNight = () => {
    completeCampaign();
    setPhase('election_night');
    startProvinceReveal();
  };

  const startProvinceReveal = () => {
    setIsRevealing(true);
    const provinces = REAL_PROVINCES.map(p => p.code);
    let idx = 0;
    
    const revealNext = () => {
      if (idx < provinces.length) {
        setRevealedProvinces(prev => [...prev, provinces[idx]]);
        idx++;
        setTimeout(revealNext, 800 + Math.random() * 400);
      } else {
        setIsRevealing(false);
        setTimeout(() => setPhase('results'), 1500);
      }
    };
    
    setTimeout(revealNext, 1000);
  };

  if (phase === 'election_night') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Image
          source={require('@/assets/images/election_night.jpg')}
          style={styles.electionNightBg}
          contentFit="cover"
        />
        <View style={styles.electionNightOverlay} />
        <View style={styles.electionNightContent}>
          <Text style={styles.electionNightTitle}>ELECTION NIGHT</Text>
          <Text style={styles.electionNightSub}>Results coming in...</Text>
          
          <View style={styles.electionMapContainer}>
            {electionResult ? (
              <ElectoralMap
                seats={electionResult.totalSeats}
                provincialSeats={electionResult.provinceResults.reduce((acc, r) => {
                  acc[r.provinceCode] = r.seats;
                  return acc;
                }, {} as any)}
                playerPartyId={gameState.playerPartyId}
                animated={true}
                revealedProvinces={revealedProvinces}
              />
            ) : null}
          </View>
          
          {electionResult ? (
            <View style={styles.runningTotal}>
              {PARTIES.filter(p => (electionResult.totalSeats[p.id] || 0) > 0)
                .sort((a, b) => (electionResult.totalSeats[b.id] || 0) - (electionResult.totalSeats[a.id] || 0))
                .map(p => (
                  <View key={p.id} style={styles.runningPartyItem}>
                    <View style={[styles.runningDot, { backgroundColor: p.color }]} />
                    <Text style={[styles.runningShortName, { color: p.color }]}>{p.shortName}</Text>
                    <Text style={styles.runningSeats}>{electionResult.totalSeats[p.id] || 0}</Text>
                  </View>
                ))}
            </View>
          ) : null}
          
          <Text style={styles.provinceCount}>{revealedProvinces.length} / {REAL_PROVINCES.length} ridings declared</Text>
        </View>
      </View>
    );
  }

  if (phase === 'results' && electionResult) {
    const playerSeats = electionResult.playerSeats;
    const playerWon = gameState.isGoverning;
    const isMajority = gameState.isMajority;
    
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={[styles.resultsContent, { paddingBottom: insets.bottom + 40 }]}>
          <View style={[styles.resultsBanner, { backgroundColor: playerWon ? Colors.success + '22' : Colors.error + '22' }]}>
            <Text style={[styles.resultsBannerTitle, { color: playerWon ? Colors.success : Colors.error }]}>
              {playerWon 
                ? isMajority ? '🎉 MAJORITY GOVERNMENT!' : '🇨🇦 MINORITY GOVERNMENT'
                : '⚔️ OFFICIAL OPPOSITION'
              }
            </Text>
            <Text style={[styles.resultsBannerSub, { color: playerWon ? Colors.success : Colors.error }]}>
              {party?.shortName} — {playerSeats} seats ({electionResult.playerVotePct.toFixed(1)}% of vote)
            </Text>
          </View>
          
          <View style={styles.resultsMapContainer}>
            <ElectoralMap
              seats={electionResult.totalSeats}
              provincialSeats={electionResult.provinceResults.reduce((acc, r) => {
                acc[r.provinceCode] = r.seats;
                return acc;
              }, {} as any)}
              playerPartyId={gameState.playerPartyId}
            />
          </View>
          
          <View style={styles.fullResults}>
            <Text style={styles.sectionTitle}>FINAL RESULTS — {gameState.parliamentNumber}th PARLIAMENT</Text>
            {PARTIES
              .filter(p => (electionResult.totalSeats[p.id] || 0) > 0)
              .sort((a, b) => (electionResult.totalSeats[b.id] || 0) - (electionResult.totalSeats[a.id] || 0))
              .map(p => {
                const seats = electionResult.totalSeats[p.id] || 0;
                const isPlayer = p.id === gameState.playerPartyId;
                return (
                  <View key={p.id} style={[styles.resultRow, isPlayer && { borderLeftColor: p.color, borderLeftWidth: 3 }]}>
                    <View style={[styles.resultDot, { backgroundColor: p.color }]} />
                    <Text style={[styles.resultPartyName, isPlayer && { color: Colors.gold }]}>
                      {p.name} {isPlayer ? '★' : ''}
                    </Text>
                    <View style={styles.resultBarContainer}>
                      <View style={[styles.resultBar, { width: `${(seats / 343) * 100}%` as any, backgroundColor: p.color }]} />
                    </View>
                    <Text style={[styles.resultSeats, { color: p.color }]}>{seats}</Text>
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
            style={({ pressed }) => [
              styles.continueBtn,
              { backgroundColor: playerWon ? Colors.success : Colors.primary },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.continueBtnText}>
              {gameState.inLeadershipReview ? 'Face Leadership Review' : 'Begin New Parliament'}
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    );
  }

  // Campaign Phase
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.campaignHeader}>
        <View>
          <Text style={styles.campaignTitle}>Election Campaign</Text>
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
        {isDebateWeek ? (
          <Pressable
            onPress={() => router.push('/debate')}
            style={({ pressed }) => [styles.debateAlert, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.debateAlertLeft}>
              <MaterialCommunityIcons name="microphone" size={32} color={Colors.gold} />
              <View>
                <Text style={styles.debateAlertTitle}>LEADERSHIP DEBATE TONIGHT</Text>
                <Text style={styles.debateAlertSub}>Face the other party leaders. Your performance will shape voter opinion.</Text>
              </View>
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
              {campaignState.polls[0]?.results?.[gameState.playerPartyId]?.toFixed(1) || '0.0'}%
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
            <Text style={styles.sectionTitle}>RECENT CAMPAIGN EVENTS</Text>
            {campaignState.campaignEvents.slice(-3).map(event => (
              <View key={event.id} style={styles.campaignEventCard}>
                <MaterialCommunityIcons name="map-marker-check" size={16} color={Colors.success} />
                <Text style={styles.campaignEventText}>{event.description}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Province Campaign Buttons */}
        <View style={styles.provinceCampaignSection}>
          <Text style={styles.sectionTitle}>CAMPAIGN IN A PROVINCE</Text>
          <View style={styles.provinceGrid}>
            {REAL_PROVINCES.map(province => {
              const hasVisited = campaignState.campaignedProvinces.includes(province.code);
              return (
                <Pressable
                  key={province.code}
                  onPress={() => campaignInRegion(province.code)}
                  style={({ pressed }) => [
                    styles.provinceBtn,
                    hasVisited && { backgroundColor: (party?.color || Colors.gold) + '22', borderColor: party?.color || Colors.gold },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <Text style={[styles.provinceBtnCode, hasVisited && { color: party?.color || Colors.gold }]}>
                    {province.code}
                  </Text>
                  <Text style={styles.provinceBtnSeats}>{province.seats} seats</Text>
                  {hasVisited ? <MaterialCommunityIcons name="check-circle" size={12} color={party?.color || Colors.gold} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Proceed to Election Night */}
        {campaignWeek >= 4 || campaignState.campaignedProvinces.length >= 3 ? (
          <Pressable
            onPress={startElectionNight}
            style={({ pressed }) => [styles.electionNightBtn, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="vote" size={22} color="#fff" />
            <Text style={styles.electionNightBtnText}>ELECTION NIGHT — Count the Votes</Text>
          </Pressable>
        ) : (
          <View style={styles.campaignMoreInfo}>
            <MaterialCommunityIcons name="information" size={16} color={Colors.info} />
            <Text style={styles.campaignMoreText}>
              Campaign in at least 3 provinces before election night. Week 2 includes the leadership debate.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  electionNightBg: {
    ...StyleSheet.absoluteFillObject,
  },
  electionNightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,10,25,0.85)',
  },
  electionNightContent: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
  },
  electionNightTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    letterSpacing: 4,
    marginTop: Spacing.md,
  },
  electionNightSub: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  electionMapContainer: {
    width: '100%',
    backgroundColor: Colors.card + 'AA',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  runningTotal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  runningPartyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card + 'CC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  runningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  runningShortName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  runningSeats: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  provinceCount: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  resultsContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  resultsBanner: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  resultsBannerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    textAlign: 'center',
  },
  resultsBannerSub: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  resultsMapContainer: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  fullResults: {
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
    paddingLeft: 4,
    borderRadius: Radius.sm,
  },
  resultDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resultPartyName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    width: 100,
  },
  resultBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  resultBar: {
    height: '100%',
    borderRadius: 4,
  },
  resultSeats: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    minWidth: 30,
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
    justifyContent: 'space-between',
    backgroundColor: Colors.gold + '15',
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.gold + '66',
    padding: Spacing.md,
  },
  debateAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
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
  },
  campaignStatValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  campaignStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  eventsSection: {
    gap: Spacing.sm,
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
  provinceCampaignSection: {
    gap: Spacing.sm,
  },
  provinceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  provinceBtn: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 2,
  },
  provinceBtnCode: {
    fontSize: FontSize.sm,
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
  campaignMoreInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.info + '11',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.info + '22',
  },
  campaignMoreText: {
    fontSize: FontSize.xs,
    color: Colors.info,
    flex: 1,
    lineHeight: 18,
  },
});
