// Powered by OnSpace.AI
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';

export default function LeadershipReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, resolveLeadershipReview } = useGame();
  const [phase, setPhase] = useState<'setup' | 'vote' | 'result'>('setup');
  const [survivalPct, setSurvivalPct] = useState(0);
  const [survived, setSurvived] = useState(false);
  const [counting, setCounting] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const lastElection = gameState.electionHistory[gameState.electionHistory.length - 1];
  const votePct = lastElection?.votePct || 20;

  const calculateSurvivalChance = () => {
    // Survival depends on: vote percentage, party standing, how long in power
    const baseChance = votePct * 2; // Higher vote % = better chance
    const partyBonus = gameState.stats.partyStanding * 0.3;
    return Math.min(90, Math.max(15, baseChance + partyBonus - 10));
  };

  const handleRunForSurvival = () => {
    setPhase('vote');
    setCounting(true);
    
    const survivalChance = calculateSurvivalChance();
    const targetPct = survivalChance;
    
    Animated.timing(progressAnim, {
      toValue: targetPct,
      duration: 3000,
      useNativeDriver: false,
    }).start(() => {
      const won = Math.random() * 100 < survivalChance;
      setSurvivalPct(Math.round(survivalChance));
      setSurvived(won);
      setCounting(false);
      setPhase('result');
    });
  };

  const handleDecision = (resign: boolean) => {
    resolveLeadershipReview(!resign);
    router.replace('/(tabs)');
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={[styles.warningBadge]}>
          <MaterialCommunityIcons name="alert" size={18} color={Colors.error} />
          <Text style={styles.warningBadgeText}>LEADERSHIP REVIEW</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {phase === 'setup' ? (
          <>
            <View style={styles.crisisCard}>
              <MaterialCommunityIcons name="account-question" size={48} color={Colors.error} />
              <Text style={styles.crisisTitle}>Party Calls Leadership Review</Text>
              <Text style={styles.crisisSubtitle}>
                Following the electoral defeat, significant portions of the {party?.name} caucus have called for a leadership review.
              </Text>
            </View>

            {/* Election Results Summary */}
            <View style={styles.resultsCard}>
              <Text style={styles.resultsTitle}>ELECTION RESULT</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Seats Won</Text>
                <Text style={[styles.resultValue, { color: Colors.error }]}>{lastElection?.playerSeats || 0}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Vote Share</Text>
                <Text style={[styles.resultValue, { color: Colors.error }]}>{votePct.toFixed(1)}%</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Party Standing</Text>
                <Text style={styles.resultValue}>{Math.round(gameState.stats.partyStanding)}%</Text>
              </View>
            </View>

            {/* Voices from Caucus */}
            <View style={styles.caucusCard}>
              <Text style={styles.caucusTitle}>VOICES FROM CAUCUS</Text>
              {[
                { name: 'MP Johnson (ON)', stance: 'support', quote: "Our leader fought a strong campaign under difficult circumstances. We must remain united." },
                { name: 'MP Beaumont (QC)', stance: 'oppose', quote: "We need fresh leadership and a new vision. The party cannot afford another defeat." },
                { name: 'MP Singh (BC)', stance: 'support', quote: "This is not the time for infighting. Let's give our leader a chance to rebuild." },
                { name: 'MP Crawford (AB)', stance: 'oppose', quote: "The results speak for themselves. Change is necessary for the party's survival." },
              ].map((voice, idx) => (
                <View key={idx} style={[styles.caucusVoice, { borderLeftColor: voice.stance === 'support' ? Colors.success : Colors.error }]}>
                  <Text style={[styles.caucusName, { color: voice.stance === 'support' ? Colors.success : Colors.error }]}>
                    {voice.stance === 'support' ? '✓ ' : '✗ '}{voice.name}
                  </Text>
                  <Text style={styles.caucusQuote}>"{voice.quote}"</Text>
                </View>
              ))}
            </View>

            <View style={styles.decisionSection}>
              <Text style={styles.decisionTitle}>YOUR DECISION</Text>
              
              <Pressable
                onPress={handleRunForSurvival}
                style={({ pressed }) => [styles.surviveBtn, pressed && { opacity: 0.85 }]}
              >
                <MaterialCommunityIcons name="shield" size={22} color="#fff" />
                <Text style={styles.surviveBtnText}>Fight for Your Leadership</Text>
              </Pressable>
              
              <Pressable
                onPress={() => handleDecision(true)}
                style={({ pressed }) => [styles.resignBtn, pressed && { opacity: 0.8 }]}
              >
                <MaterialCommunityIcons name="account-arrow-right" size={18} color={Colors.textSecondary} />
                <Text style={styles.resignBtnText}>Resign as Party Leader</Text>
              </Pressable>
            </View>
          </>
        ) : phase === 'vote' ? (
          <View style={styles.votingPhase}>
            <MaterialCommunityIcons name="vote-outline" size={64} color={Colors.gold} />
            <Text style={styles.votingTitle}>Party Vote in Progress</Text>
            <Text style={styles.votingSubtitle}>Members of the {party?.name} are casting their ballots...</Text>
            
            <View style={styles.voteBarContainer}>
              <Animated.View style={[styles.voteBar, { width: progressWidth as any, backgroundColor: party?.color || Colors.primary }]} />
            </View>
            <Text style={styles.votingHint}>Votes being tallied across the country</Text>
          </View>
        ) : (
          <View style={styles.resultPhase}>
            <MaterialCommunityIcons 
              name={survived ? 'check-circle' : 'close-circle'} 
              size={80} 
              color={survived ? Colors.success : Colors.error} 
            />
            <Text style={[styles.resultTitle, { color: survived ? Colors.success : Colors.error }]}>
              {survived ? 'LEADERSHIP CONFIRMED' : 'LEADERSHIP REVIEW LOST'}
            </Text>
            <Text style={styles.resultSupportPct}>
              {survivalPct}% member support
            </Text>
            <Text style={styles.resultDesc}>
              {survived 
                ? `The ${party?.name} has voted to retain you as leader. You emerge from this review with a mandate to rebuild and lead the party to the next election.`
                : `A majority of party members voted for change. You have been removed as leader. The party will hold a leadership convention to select your successor. You leave politics with your legacy intact.`
              }
            </Text>
            
            <Pressable
              onPress={() => handleDecision(!survived)}
              style={({ pressed }) => [
                styles.continueBtn,
                { backgroundColor: survived ? Colors.success : Colors.error },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.continueBtnText}>
                {survived ? 'Lead the Party Forward' : 'End Career'}
              </Text>
            </Pressable>
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
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.error + '44',
    backgroundColor: Colors.error + '11',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningBadgeText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Colors.error,
    letterSpacing: 2,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  crisisCard: {
    alignItems: 'center',
    backgroundColor: Colors.error + '11',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.error + '33',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  crisisTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  crisisSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  resultsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  resultsTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  resultLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  resultValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  caucusCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  caucusTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  caucusVoice: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.sm,
    gap: 4,
    paddingVertical: 4,
  },
  caucusName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  caucusQuote: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  decisionSection: {
    gap: Spacing.sm,
  },
  decisionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  surviveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
  },
  surviveBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  resignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  resignBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  votingPhase: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.lg,
    paddingTop: 80,
  },
  votingTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  votingSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  voteBarContainer: {
    width: '80%',
    height: 12,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 6,
    overflow: 'hidden',
  },
  voteBar: {
    height: '100%',
    borderRadius: 6,
  },
  votingHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  resultPhase: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: 60,
    paddingHorizontal: Spacing.md,
  },
  resultTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 1,
    textAlign: 'center',
  },
  resultSupportPct: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  resultDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  continueBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});
