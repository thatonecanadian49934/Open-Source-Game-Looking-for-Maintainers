// Powered by OnSpace.AI
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Animated,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';

// ── Named MPs that declare positions during the vote ──────────────────────────
interface MP {
  name: string;
  riding: string;
  province: string;
  stance: 'support' | 'oppose' | 'undecided';
  declared: boolean;
  quote: string;
  weight: number; // how many caucus votes this MP carries (senior MPs = more)
}

function generateCaucusMPs(
  playerPartyId: string,
  survivalChance: number,
  speechBonus: number
): MP[] {
  const firstNames = ['James', 'Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Emily', 'Luc', 'Priya', 'Amanda', 'Kevin', 'Fatima', 'Thomas', 'Anita', 'William', 'Diane', 'Hassan', 'Claire', 'Marcus'];
  const lastNames = ['Chen', 'Williams', 'MacDonald', 'Tremblay', 'Singh', 'Okafor', 'LeBlanc', 'Park', 'Wilson', 'Kumar', 'Beaumont', 'Crawford', 'Johnson', 'Fontaine', 'Bergeron', 'Santos', 'Fraser', 'Malik', 'Tran', 'Nkosi'];
  const ridings = ['Scarborough Centre', 'Winnipeg North', 'Halifax West', 'Edmonton Griesbach', 'Mount Royal', 'Burnaby South', 'London Fanshawe', 'Quebec East', 'Ottawa West', 'Calgary Centre', 'Victoria', 'Hamilton Mountain', 'Gatineau', 'Surrey—Newton', 'Laval—Les Îles', 'Nunavut', 'Prince Albert', 'Sudbury', 'Fredericton', 'Dartmouth—Cole Harbour'];
  const provinces = ['ON', 'MB', 'NS', 'AB', 'QC', 'BC', 'ON', 'QC', 'ON', 'AB', 'BC', 'ON', 'QC', 'BC', 'QC', 'NU', 'SK', 'ON', 'NB', 'NS'];

  const supportQuotes = [
    'Our leader fought a difficult campaign with integrity. We must stay united and rebuild.',
    'I have worked alongside our leader for years. This is not the time to tear ourselves apart.',
    'Every caucus member I\'ve spoken to in my riding wants stability. We give that by staying the course.',
    'The party is bigger than one election result. Our leader deserves a chance to prove the critics wrong.',
    'I\'ve seen worse situations turned around. Our leader has the vision — we just need to execute.',
    'Let\'s not hand our opponents the gift of a leadership circus. We fight together or lose divided.',
    'After reflection, I\'m standing with our leader. A leadership race now would be catastrophic.',
    'The platform was sound. Our communication was the problem. That can be fixed — leadership can\'t easily be replaced.',
  ];

  const opposeQuotes = [
    'We lost seats we should have held. Canadians sent us a message — we need fresh leadership.',
    'I\'ve spoken to hundreds of party members in my riding. They\'re asking for change, and I have to listen.',
    'With respect, the results speak for themselves. We cannot go into the next election with the same approach.',
    'My responsibility is to the party\'s future, not to political loyalty. Change is necessary.',
    'The numbers don\'t lie. We need someone who can win over the voters we\'ve lost.',
    'I didn\'t come to Ottawa to be in opposition for another four years. We need a reset.',
    'It\'s nothing personal — it\'s about electoral math. We need a leader who can rebuild our coalition.',
    'The grassroots are speaking. Caucus has to listen to what members are telling us.',
  ];

  const undecidedQuotes = [
    'I\'m listening to all sides before making my decision. This is too important to rush.',
    'My constituency is divided on this — I\'m taking more time to consult.',
    'I haven\'t decided yet. I want to hear the leadership speech before I commit.',
  ];

  const numMPs = 18;
  const adjustedChance = Math.min(90, Math.max(10, survivalChance + speechBonus));
  const supportCount = Math.round((adjustedChance / 100) * numMPs);
  const opposeCount = numMPs - supportCount - 2;
  const undecidedCount = 2;

  const mps: MP[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < numMPs; i++) {
    let name = '';
    let attempts = 0;
    while (!name || usedNames.has(name)) {
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
      name = `${fn} ${ln}`;
      attempts++;
      if (attempts > 50) break;
    }
    usedNames.add(name);

    const idx = i % ridings.length;
    let stance: 'support' | 'oppose' | 'undecided';
    let quote: string;

    if (i < supportCount) {
      stance = 'support';
      quote = supportQuotes[i % supportQuotes.length];
    } else if (i < supportCount + undecidedCount) {
      stance = 'undecided';
      quote = undecidedQuotes[i % undecidedQuotes.length];
    } else {
      stance = 'oppose';
      quote = opposeQuotes[(i - supportCount - undecidedCount) % opposeQuotes.length];
    }

    mps.push({
      name,
      riding: ridings[idx],
      province: provinces[idx],
      stance,
      declared: false,
      quote,
      weight: i < 3 ? 3 : i < 8 ? 2 : 1, // senior MPs weigh more
    });
  }

  // Shuffle so supporters/opponents are mixed
  return mps.sort(() => Math.random() - 0.5);
}

type Phase = 'crisis' | 'speech' | 'voting' | 'result';

export default function LeadershipReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, resolveLeadershipReview } = useGame();
  const { showAlert } = useAlert();

  const [phase, setPhase] = useState<Phase>('crisis');
  const [speechText, setSpeechText] = useState('');
  const [speechSubmitted, setSpeechSubmitted] = useState(false);
  const [speechBonus, setSpeechBonus] = useState(0);
  const [mps, setMps] = useState<MP[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [supportVotes, setSupportVotes] = useState(0);
  const [opposeVotes, setOpposeVotes] = useState(0);
  const [survived, setSurvived] = useState(false);
  const [finalPct, setFinalPct] = useState(0);

  const barAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [phase]);

  useEffect(() => {
    return () => { if (revealTimerRef.current) clearTimeout(revealTimerRef.current); };
  }, []);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.primary;
  const lastElection = gameState.electionHistory[gameState.electionHistory.length - 1];
  const votePct = lastElection?.votePct || 20;
  const playerSeats = lastElection?.playerSeats || gameState.seats[gameState.playerPartyId] || 0;

  const calculateSurvivalChance = () => {
    const base = votePct * 2.5;
    const partyBonus = gameState.stats.partyStanding * 0.25;
    return Math.min(88, Math.max(12, base + partyBonus - 8));
  };

  const getSpeechBonus = (text: string): number => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words === 0) return -8;
    if (words < 20) return -4;
    if (words < 50) return 2;
    if (words < 100) return 7;
    if (words < 150) return 12;
    return 15;
  };

  const getSpeechQualityLabel = (bonus: number) => {
    if (bonus >= 12) return { label: 'POWERFUL SPEECH', color: Colors.success };
    if (bonus >= 7) return { label: 'STRONG SPEECH', color: Colors.info };
    if (bonus >= 2) return { label: 'ADEQUATE', color: Colors.warning };
    if (bonus >= -4) return { label: 'WEAK SPEECH', color: Colors.error };
    return { label: 'NO SPEECH', color: Colors.textMuted };
  };

  const handleSubmitSpeech = () => {
    const bonus = getSpeechBonus(speechText);
    setSpeechBonus(bonus);
    setSpeechSubmitted(true);
  };

  const handleStartVote = () => {
    const survivalChance = calculateSurvivalChance();
    const bonus = speechSubmitted ? speechBonus : getSpeechBonus(speechText);
    const generatedMPs = generateCaucusMPs(gameState.playerPartyId, survivalChance, bonus);
    setMps(generatedMPs);
    setRevealedCount(0);
    setSupportVotes(0);
    setOpposeVotes(0);
    fadeAnim.setValue(0);
    setPhase('voting');
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    // Reveal MPs one by one
    let idx = 0;
    let support = 0;
    let oppose = 0;
    const revealNext = () => {
      if (idx >= generatedMPs.length) {
        // All revealed — compute result
        const totalWeightSupport = generatedMPs.filter(m => m.stance === 'support').reduce((s, m) => s + m.weight, 0);
        const totalWeightOppose = generatedMPs.filter(m => m.stance === 'oppose').reduce((s, m) => s + m.weight, 0);
        const totalUndecided = generatedMPs.filter(m => m.stance === 'undecided');
        // Undecideds go to support if speech was strong, else oppose
        const undecidedBonus = bonus >= 7 ? totalUndecided.reduce((s, m) => s + m.weight, 0) : 0;
        const undecidedOppose = bonus < 7 ? totalUndecided.reduce((s, m) => s + m.weight, 0) : 0;
        const finalSupport = totalWeightSupport + undecidedBonus;
        const finalOppose = totalWeightOppose + undecidedOppose;
        const totalWeight = finalSupport + finalOppose;
        const supportPct = Math.round((finalSupport / totalWeight) * 100);
        const won = supportPct > 50;
        setTimeout(() => {
          setSurvived(won);
          setFinalPct(supportPct);
          fadeAnim.setValue(0);
          setPhase('result');
          Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        }, 1200);
        return;
      }
      const mp = generatedMPs[idx];
      idx++;
      setRevealedCount(idx);
      setMps(prev => prev.map((m, i) => i === idx - 1 ? { ...m, declared: true } : m));
      if (mp.stance === 'support') {
        support += mp.weight;
        setSupportVotes(support);
        Animated.timing(barAnim, { toValue: support / (support + oppose + 1), duration: 400, useNativeDriver: false }).start();
      } else if (mp.stance === 'oppose') {
        oppose += mp.weight;
        setOpposeVotes(oppose);
      }
      const delay = idx < 5 ? 600 : idx < 12 ? 450 : 350;
      revealTimerRef.current = setTimeout(revealNext, delay);
    };
    revealTimerRef.current = setTimeout(revealNext, 800);
  };

  const handleResign = () => {
    showAlert(
      'Resign as Leader?',
      'This will end your leadership. The party will hold a leadership convention. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resign',
          style: 'destructive',
          onPress: () => {
            resolveLeadershipReview(false);
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    if (!survived) {
      resolveLeadershipReview(false);
      router.replace('/leadership-convention');
    } else {
      resolveLeadershipReview(true);
      router.replace('/(tabs)');
    }
  };

  const survivalChance = calculateSurvivalChance();
  const currentSpeechBonus = getSpeechBonus(speechText);
  const speechQuality = getSpeechQualityLabel(currentSpeechBonus);
  const wordCount = speechText.trim().split(/\s+/).filter(Boolean).length;
  const totalDeclared = mps.filter(m => m.declared).length;
  const supportDeclared = mps.filter(m => m.declared && m.stance === 'support').length;
  const opposeDeclared = mps.filter(m => m.declared && m.stance === 'oppose').length;
  const undecidedDeclared = mps.filter(m => m.declared && m.stance === 'undecided').length;

  // ── CRISIS PHASE ────────────────────────────────────────────────────────────
  if (phase === 'crisis') {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.crisisHeader}>
          <MaterialCommunityIcons name="alert" size={16} color={Colors.error} />
          <Text style={styles.crisisHeaderText}>LEADERSHIP REVIEW</Text>
          <MaterialCommunityIcons name="alert" size={16} color={Colors.error} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 60 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Dramatic opener */}
          <View style={[styles.crisisCard, { borderColor: Colors.error + '55' }]}>
            <View style={styles.crisisIconRow}>
              <MaterialCommunityIcons name="account-question" size={52} color={Colors.error} />
              <View style={[styles.crisisPartyBadge, { backgroundColor: partyColor + '22', borderColor: partyColor + '44' }]}>
                <Text style={[styles.crisisPartyText, { color: partyColor }]}>{party?.shortName}</Text>
              </View>
            </View>
            <Text style={styles.crisisTitle}>Party Caucus Calls Leadership Review</Text>
            <Text style={styles.crisisDesc}>
              Following the federal election, a significant number of {party?.name} MPs have filed notice demanding
              a leadership review. The caucus will meet to declare their position. Your leadership is on the line.
            </Text>
          </View>

          {/* Election autopsy */}
          <View style={styles.autopsyCard}>
            <Text style={styles.sectionLabel}>ELECTION RESULTS — POST-MORTEM</Text>
            <View style={styles.autopsyRow}>
              <MaterialCommunityIcons name="seat" size={14} color={Colors.error} />
              <Text style={styles.autopsyLabel}>Seats Won</Text>
              <Text style={[styles.autopsyValue, { color: Colors.error }]}>{playerSeats} / 341</Text>
            </View>
            <View style={styles.autopsyRow}>
              <MaterialCommunityIcons name="percent" size={14} color={Colors.error} />
              <Text style={styles.autopsyLabel}>National Vote Share</Text>
              <Text style={[styles.autopsyValue, { color: Colors.error }]}>{votePct.toFixed(1)}%</Text>
            </View>
            <View style={styles.autopsyRow}>
              <MaterialCommunityIcons name="poll" size={14} color={Colors.textSecondary} />
              <Text style={styles.autopsyLabel}>Party Standing</Text>
              <Text style={styles.autopsyValue}>{Math.round(gameState.stats.partyStanding)}%</Text>
            </View>
            <View style={styles.autopsyRow}>
              <MaterialCommunityIcons name="shield" size={14} color={Colors.textSecondary} />
              <Text style={styles.autopsyLabel}>Base Survival Chance</Text>
              <Text style={[styles.autopsyValue, { color: survivalChance > 50 ? Colors.success : Colors.warning }]}>
                {Math.round(survivalChance)}%
              </Text>
            </View>
          </View>

          {/* Early whispers from caucus */}
          <View style={styles.caucusWhispersCard}>
            <Text style={styles.sectionLabel}>EARLY CAUCUS WHISPERS</Text>
            {[
              { name: 'Senior Cabinet Ally', stance: 'support', quote: 'I\'m standing with our leader. Now is not the time for division.' },
              { name: 'Backbench Rebel', stance: 'oppose', quote: 'We lost ground we cannot afford to lose. The caucus must send a message.' },
              { name: 'Regional Deputy', stance: 'undecided', quote: 'I haven\'t decided. I need to hear what our leader has to say first.' },
              { name: 'Long-Serving MP', stance: 'oppose', quote: 'In 20 years I\'ve seen parties survive change. It\'s not going away.' },
              { name: 'Rising Star MP', stance: 'support', quote: 'We rebuild together — firing the leader now only helps our opponents.' },
            ].map((mp, idx) => (
              <View
                key={idx}
                style={[
                  styles.whisperRow,
                  { borderLeftColor: mp.stance === 'support' ? Colors.success : mp.stance === 'oppose' ? Colors.error : Colors.warning },
                ]}
              >
                <View style={styles.whisperHeader}>
                  <MaterialCommunityIcons
                    name={mp.stance === 'support' ? 'thumb-up' : mp.stance === 'oppose' ? 'thumb-down' : 'help'}
                    size={12}
                    color={mp.stance === 'support' ? Colors.success : mp.stance === 'oppose' ? Colors.error : Colors.warning}
                  />
                  <Text style={[styles.whisperName, {
                    color: mp.stance === 'support' ? Colors.success : mp.stance === 'oppose' ? Colors.error : Colors.warning,
                  }]}>
                    {mp.name}
                  </Text>
                </View>
                <Text style={styles.whisperQuote}>"{mp.quote}"</Text>
              </View>
            ))}
          </View>

          {/* Decision */}
          <View style={styles.decisionSection}>
            <Text style={styles.sectionLabel}>YOUR RESPONSE</Text>
            <Pressable
              onPress={() => { fadeAnim.setValue(0); setPhase('speech'); Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }}
              style={({ pressed }) => [styles.fightBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}
            >
              <MaterialCommunityIcons name="microphone" size={20} color="#fff" />
              <Text style={styles.fightBtnText}>Fight for Your Leadership</Text>
            </Pressable>
            <Pressable
              onPress={handleResign}
              style={({ pressed }) => [styles.resignBtn, pressed && { opacity: 0.8 }]}
            >
              <MaterialCommunityIcons name="account-arrow-right" size={16} color={Colors.textSecondary} />
              <Text style={styles.resignBtnText}>Resign Immediately</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── SPEECH PHASE ────────────────────────────────────────────────────────────
  if (phase === 'speech') {
    const finalBonus = speechSubmitted ? speechBonus : currentSpeechBonus;
    const { label: qualityLabel, color: qualityColor } = getSpeechQualityLabel(finalBonus);
    const adjustedSurvival = Math.min(92, Math.max(8, survivalChance + (speechSubmitted ? speechBonus : 0)));

    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <View style={styles.speechHeader}>
            <Pressable onPress={() => setPhase('crisis')} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.textSecondary} />
            </Pressable>
            <View style={styles.speechHeaderCenter}>
              <Text style={styles.speechHeaderTitle}>Address to Caucus</Text>
              <Text style={styles.speechHeaderSub}>House of Commons, Ottawa</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Context */}
            <View style={[styles.speechContextCard, { borderColor: partyColor + '44' }]}>
              <MaterialCommunityIcons name="podium" size={28} color={partyColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.speechContextTitle, { color: partyColor }]}>Address the Caucus</Text>
                <Text style={styles.speechContextDesc}>
                  You have one opportunity to speak to your fellow MPs before the vote begins.
                  A powerful, detailed speech can sway undecided members and flip some wavering opponents.
                  The quality of your words will directly affect the outcome.
                </Text>
              </View>
            </View>

            {/* Speech impact guide */}
            <View style={styles.speechGuideCard}>
              <Text style={styles.sectionLabel}>SPEECH IMPACT GUIDE</Text>
              {[
                { threshold: '150+ words', bonus: '+15%', quality: 'POWERFUL' },
                { threshold: '100–150 words', bonus: '+12%', quality: 'STRONG' },
                { threshold: '50–100 words', bonus: '+7%', quality: 'SOLID' },
                { threshold: '20–50 words', bonus: '+2%', quality: 'ADEQUATE' },
                { threshold: 'Under 20 words', bonus: '−4%', quality: 'WEAK' },
                { threshold: 'No speech', bonus: '−8%', quality: 'DISMAL' },
              ].map((row, idx) => (
                <View key={idx} style={styles.speechGuideRow}>
                  <MaterialCommunityIcons
                    name={idx < 3 ? 'check-circle' : idx < 4 ? 'minus-circle' : 'close-circle'}
                    size={12}
                    color={idx < 3 ? Colors.success : idx < 4 ? Colors.warning : Colors.error}
                  />
                  <Text style={styles.speechGuideThreshold}>{row.threshold}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.speechGuideBonus, { color: idx < 3 ? Colors.success : idx < 4 ? Colors.warning : Colors.error }]}>
                    {row.bonus}
                  </Text>
                  <View style={styles.speechGuideQualityBadge}>
                    <Text style={styles.speechGuideQualityText}>{row.quality}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Text input */}
            <View style={styles.speechInputSection}>
              <Text style={styles.sectionLabel}>YOUR LEADERSHIP SPEECH</Text>
              <TextInput
                style={[styles.speechInput, speechSubmitted && { opacity: 0.7 }]}
                multiline
                numberOfLines={10}
                placeholder="Speak to your caucus. Remind them why you are the right leader for this party. Address the election result honestly, show your plan to rebuild, and inspire unity. MPs are watching every word. Aim for 100+ words for the strongest impact..."
                placeholderTextColor={Colors.textMuted}
                value={speechText}
                onChangeText={speechSubmitted ? undefined : setSpeechText}
                editable={!speechSubmitted}
                textAlignVertical="top"
              />

              {/* Word count & quality bar */}
              <View style={styles.speechMeta}>
                <View style={styles.speechMetaLeft}>
                  <Text style={styles.speechWordCount}>{wordCount} words</Text>
                  {wordCount > 0 ? (
                    <Text style={[styles.speechQualityLabel, { color: qualityColor }]}> — {speechSubmitted ? qualityLabel : getSpeechQualityLabel(currentSpeechBonus).label}</Text>
                  ) : null}
                </View>
                <View style={styles.speechQualityBar}>
                  {[20, 50, 100, 150].map((threshold, i) => (
                    <View
                      key={i}
                      style={[
                        styles.speechQualitySegment,
                        wordCount >= threshold && {
                          backgroundColor: i === 0 ? Colors.error : i === 1 ? Colors.warning : i === 2 ? Colors.info : Colors.success,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              {!speechSubmitted ? (
                <Pressable
                  onPress={handleSubmitSpeech}
                  style={({ pressed }) => [
                    styles.speechSubmitBtn,
                    { backgroundColor: partyColor },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <MaterialCommunityIcons name="microphone" size={18} color="#fff" />
                  <Text style={styles.speechSubmitBtnText}>Deliver Speech to Caucus</Text>
                </Pressable>
              ) : (
                <View style={[styles.speechDeliveredBanner, { backgroundColor: qualityColor + '22', borderColor: qualityColor + '55' }]}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={qualityColor} />
                  <Text style={[styles.speechDeliveredText, { color: qualityColor }]}>
                    Speech delivered — {qualityLabel}. Survival odds: ~{Math.round(adjustedSurvival)}%
                  </Text>
                </View>
              )}
            </View>

            {/* Proceed to vote */}
            <Pressable
              onPress={handleStartVote}
              disabled={!speechSubmitted && wordCount === 0}
              style={({ pressed }) => [
                styles.proceedBtn,
                { borderColor: partyColor + '66' },
                !speechSubmitted && wordCount === 0 && { opacity: 0.4 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons name="vote" size={18} color={partyColor} />
              <Text style={[styles.proceedBtnText, { color: partyColor }]}>
                {speechSubmitted ? 'Proceed to Caucus Vote' : 'Skip Speech & Face the Vote'}
              </Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  }

  // ── VOTING PHASE ────────────────────────────────────────────────────────────
  if (phase === 'voting') {
    const totalWeight = supportVotes + opposeVotes;
    const supportPct = totalWeight > 0 ? Math.round((supportVotes / totalWeight) * 100) : 50;
    const barColor = supportPct > 50 ? Colors.success : Colors.error;

    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        {/* Live ticker header */}
        <View style={[styles.votingHeader, { borderBottomColor: Colors.gold + '33' }]}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.votingHeaderTitle}>Caucus Vote in Progress</Text>
          <Text style={styles.votingHeaderSub}>{party?.name} — Leadership Review</Text>
        </View>

        {/* Running vote tally */}
        <View style={styles.tallyPanel}>
          <View style={styles.tallyRow}>
            <View style={styles.tallySupport}>
              <MaterialCommunityIcons name="thumb-up" size={18} color={Colors.success} />
              <Text style={[styles.tallyNumber, { color: Colors.success }]}>{supportDeclared}</Text>
              <Text style={styles.tallyLabel}>Support</Text>
            </View>
            <View style={styles.tallySeparator}>
              <Text style={styles.tallySeparatorText}>{revealedCount}/{mps.length}</Text>
              <Text style={styles.tallySeparatorSub}>MPs declared</Text>
            </View>
            <View style={styles.tallyOppose}>
              <MaterialCommunityIcons name="thumb-down" size={18} color={Colors.error} />
              <Text style={[styles.tallyNumber, { color: Colors.error }]}>{opposeDeclared}</Text>
              <Text style={styles.tallyLabel}>Oppose</Text>
            </View>
          </View>

          {/* Vote bar */}
          <View style={styles.voteBarTrack}>
            <Animated.View style={[styles.voteBarFill, {
              flex: supportVotes + 1,
              backgroundColor: barColor,
            }]} />
            <View style={[styles.voteBarFill, {
              flex: Math.max(1, opposeVotes),
              backgroundColor: Colors.error + '33',
            }]} />
          </View>
          <View style={styles.voteBarLabels}>
            <Text style={[styles.voteBarPct, { color: Colors.success }]}>{supportPct}%</Text>
            <Text style={styles.voteBarMajority}>50% needed</Text>
            <Text style={[styles.voteBarPct, { color: Colors.error }]}>{100 - supportPct}%</Text>
          </View>
        </View>

        {/* MP declarations — scrollable live feed */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.mpFeed, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {mps.map((mp, idx) => {
            if (!mp.declared) {
              return (
                <View key={idx} style={styles.mpRowPending}>
                  <View style={styles.mpPendingDot} />
                  <Text style={styles.mpPendingName}>{mp.name} ({mp.province})</Text>
                  <Text style={styles.mpPendingRiding}>{mp.riding}</Text>
                </View>
              );
            }
            const c = mp.stance === 'support' ? Colors.success : mp.stance === 'oppose' ? Colors.error : Colors.warning;
            const icon = mp.stance === 'support' ? 'thumb-up' : mp.stance === 'oppose' ? 'thumb-down' : 'help-circle';
            return (
              <View key={idx} style={[styles.mpRowDeclared, { borderLeftColor: c }]}>
                <View style={styles.mpDeclaredLeft}>
                  <MaterialCommunityIcons name={icon as any} size={14} color={c} />
                  <View>
                    <Text style={[styles.mpDeclaredName, { color: c }]}>{mp.name}</Text>
                    <Text style={styles.mpDeclaredRiding}>{mp.riding} · {mp.province}</Text>
                  </View>
                </View>
                <Text style={styles.mpDeclaredQuote} numberOfLines={2}>"{mp.quote}"</Text>
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>
    );
  }

  // ── RESULT PHASE ────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const resultColor = survived ? Colors.success : Colors.error;
    const resultIcon = survived ? 'check-decagram' : 'close-circle';
    const finalBonus = speechSubmitted ? speechBonus : -8;
    const adjustedChance = Math.min(92, Math.max(8, survivalChance + finalBonus));
    const totalMPs = mps.length;
    const supportMPs = mps.filter(m => m.stance === 'support' || (m.stance === 'undecided' && finalBonus >= 7)).length;
    const opposeMPs = totalMPs - supportMPs;

    const mandate = survived
      ? finalPct >= 75 ? 'OVERWHELMING MANDATE'
        : finalPct >= 60 ? 'STRONG MANDATE'
        : 'NARROWLY SURVIVED'
      : finalPct >= 45 ? 'NARROWLY DEFEATED'
      : 'DECISIVE DEFEAT';

    const mandateColor = survived
      ? finalPct >= 75 ? Colors.success
        : finalPct >= 60 ? Colors.info
        : Colors.warning
      : finalPct >= 45 ? Colors.warning : Colors.error;

    const consequences = survived
      ? finalPct >= 75
        ? ['Leadership is unquestionable — critics silenced', 'Full caucus now united behind your rebuilding plan', '+8% Party Standing boost', 'Immediate approval bump as party shows unity']
        : finalPct >= 60
        ? ['Mandate secured but rebels remain watchful', 'Party united behind you with conditions', '+5% Party Standing boost', 'Media coverage focuses on your resilience']
        : ['Won by the skin of your teeth — wounds remain', 'Several critics will continue to cause trouble', '+2% Party Standing, but -3% approval from chaos', 'A strong early performance is critical to solidify position']
      : finalPct >= 45
        ? ['Resigned honourably after close result', 'Legacy preserved — caucus thanks you for service', 'Party will hold leadership convention in 6 weeks', 'Your faction remains influential in future leadership race']
        : ['Decisive removal — party demanded change', 'Leadership convention called immediately', 'Your political legacy divided — some allies, many critics', 'Party begins rebuild under interim leader'];

    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Verdict */}
          <View style={[styles.verdictCard, { borderColor: resultColor + '55' }]}>
            <MaterialCommunityIcons name={resultIcon as any} size={72} color={resultColor} />
            <Text style={[styles.verdictOutcome, { color: resultColor }]}>
              {survived ? 'LEADERSHIP CONFIRMED' : 'LEADERSHIP REMOVED'}
            </Text>
            <View style={[styles.mandateBadge, { backgroundColor: mandateColor + '22', borderColor: mandateColor + '44' }]}>
              <Text style={[styles.mandateLabel, { color: mandateColor }]}>{mandate}</Text>
            </View>
            <Text style={styles.verdictPct}>{finalPct}% caucus support</Text>
            <Text style={styles.verdictBreakdown}>
              {supportMPs} MPs in favour · {opposeMPs} MPs opposed
            </Text>
          </View>

          {/* Vote breakdown */}
          <View style={styles.voteBreakdownCard}>
            <Text style={styles.sectionLabel}>FINAL CAUCUS VOTE BREAKDOWN</Text>
            <View style={styles.voteBreakdownBar}>
              <View style={[styles.voteBreakdownSegSupport, { flex: finalPct }]} />
              <View style={[styles.voteBreakdownSegOppose, { flex: 100 - finalPct }]} />
            </View>
            <View style={styles.voteBreakdownRow}>
              <View style={styles.voteBreakdownItem}>
                <MaterialCommunityIcons name="thumb-up" size={14} color={Colors.success} />
                <Text style={[styles.voteBreakdownNum, { color: Colors.success }]}>{supportMPs} MPs</Text>
                <Text style={styles.voteBreakdownLbl}>Support ({finalPct}%)</Text>
              </View>
              <View style={styles.voteBreakdownItem}>
                <MaterialCommunityIcons name="thumb-down" size={14} color={Colors.error} />
                <Text style={[styles.voteBreakdownNum, { color: Colors.error }]}>{opposeMPs} MPs</Text>
                <Text style={styles.voteBreakdownLbl}>Oppose ({100 - finalPct}%)</Text>
              </View>
            </View>

            {/* Speech impact */}
            <View style={styles.speechImpactRow}>
              <MaterialCommunityIcons name="microphone" size={12} color={Colors.textMuted} />
              <Text style={styles.speechImpactText}>
                {speechSubmitted
                  ? `Your ${speechText.trim().split(/\s+/).filter(Boolean).length}-word speech ${finalBonus >= 0 ? 'boosted' : 'reduced'} support by ${Math.abs(finalBonus)}%`
                  : 'No speech delivered — maximum impact missed'}
              </Text>
            </View>
          </View>

          {/* Consequences */}
          <View style={styles.consequencesCard}>
            <Text style={styles.sectionLabel}>{survived ? 'YOUR MANDATE' : 'WHAT COMES NEXT'}</Text>
            {consequences.map((c, i) => (
              <View key={i} style={styles.consequenceRow}>
                <MaterialCommunityIcons
                  name={survived ? 'check' : 'information'}
                  size={13}
                  color={survived ? Colors.success : Colors.textSecondary}
                />
                <Text style={styles.consequenceText}>{c}</Text>
              </View>
            ))}
          </View>

          {/* Notable declarations */}
          <View style={styles.notableCard}>
            <Text style={styles.sectionLabel}>NOTABLE DECLARATIONS</Text>
            {mps
              .filter(m => m.weight >= 2)
              .slice(0, 6)
              .map((mp, idx) => {
                const c = mp.stance === 'support' ? Colors.success : mp.stance === 'oppose' ? Colors.error : Colors.warning;
                return (
                  <View key={idx} style={[styles.notableRow, { borderLeftColor: c }]}>
                    <View style={styles.notableLeft}>
                      <MaterialCommunityIcons
                        name={mp.stance === 'support' ? 'thumb-up' : mp.stance === 'oppose' ? 'thumb-down' : 'help'}
                        size={11}
                        color={c}
                      />
                      <View>
                        <Text style={[styles.notableName, { color: c }]}>{mp.name}</Text>
                        <Text style={styles.notableRiding}>{mp.riding} · {mp.province}</Text>
                      </View>
                    </View>
                    <Text style={styles.notableQuote} numberOfLines={2}>"{mp.quote}"</Text>
                  </View>
                );
              })}
          </View>

          {/* CTA */}
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.continueBtn,
              { backgroundColor: resultColor },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.continueBtnText}>
              {survived ? 'Lead the Party Forward' : 'Accept the Result'}
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  crisisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.error + '44',
    backgroundColor: Colors.error + '0D',
  },
  crisisHeaderText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Colors.error,
    letterSpacing: 2,
  },
  content: { padding: Spacing.md, gap: Spacing.md },

  crisisCard: {
    backgroundColor: Colors.error + '0D',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  crisisIconRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  crisisPartyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  crisisPartyText: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold, letterSpacing: 1.5 },
  crisisTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  crisisDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  autopsyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: 8,
  },
  autopsyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  autopsyLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  autopsyValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },

  caucusWhispersCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  whisperRow: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.sm,
    paddingVertical: 4,
    gap: 3,
  },
  whisperHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  whisperName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  whisperQuote: { fontSize: FontSize.xs, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 17 },

  decisionSection: { gap: Spacing.sm },
  fightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
  },
  fightBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  resignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  resignBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },

  // Speech phase
  speechHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  speechHeaderCenter: { flex: 1, alignItems: 'center' },
  speechHeaderTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  speechHeaderSub: { fontSize: FontSize.xs, color: Colors.textSecondary },

  speechContextCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    backgroundColor: Colors.card,
  },
  speechContextTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: 4 },
  speechContextDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  speechGuideCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: 6,
  },
  speechGuideRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  speechGuideThreshold: { fontSize: FontSize.xs, color: Colors.textSecondary },
  speechGuideBonus: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, minWidth: 35, textAlign: 'right' },
  speechGuideQualityBadge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginLeft: 4,
  },
  speechGuideQualityText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.textMuted },

  speechInputSection: { gap: 8 },
  speechInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 200,
    lineHeight: 22,
  },
  speechMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  speechMetaLeft: { flexDirection: 'row', alignItems: 'center' },
  speechWordCount: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  speechQualityLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  speechQualityBar: { flexDirection: 'row', gap: 3 },
  speechQualitySegment: { width: 24, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceBorder },

  speechSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  speechSubmitBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  speechDeliveredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  speechDeliveredText: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: Colors.card,
  },
  proceedBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold },

  // Voting phase
  votingHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    backgroundColor: Colors.surface,
    gap: 2,
  },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error },
  liveText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, color: Colors.error, letterSpacing: 1 },
  votingHeaderTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  votingHeaderSub: { fontSize: FontSize.xs, color: Colors.textSecondary },

  tallyPanel: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  tallyRow: { flexDirection: 'row', alignItems: 'center' },
  tallySupport: { flex: 1, alignItems: 'center', gap: 4 },
  tallyOppose: { flex: 1, alignItems: 'center', gap: 4 },
  tallyNumber: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold },
  tallyLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  tallySeparator: { alignItems: 'center', paddingHorizontal: Spacing.md },
  tallySeparatorText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  tallySeparatorSub: { fontSize: 9, color: Colors.textMuted },

  voteBarTrack: {
    height: 10,
    flexDirection: 'row',
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceBorder,
  },
  voteBarFill: { minWidth: 4 },
  voteBarLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  voteBarPct: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  voteBarMajority: { fontSize: 9, color: Colors.textMuted },

  mpFeed: { padding: Spacing.sm, gap: 6 },
  mpRowPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.xs,
    opacity: 0.3,
  },
  mpPendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textMuted },
  mpPendingName: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted },
  mpPendingRiding: { fontSize: FontSize.xs, color: Colors.textMuted },

  mpRowDeclared: {
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderLeftWidth: 4,
    padding: Spacing.sm,
    gap: 4,
  },
  mpDeclaredLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mpDeclaredName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  mpDeclaredRiding: { fontSize: 10, color: Colors.textMuted },
  mpDeclaredQuote: { fontSize: FontSize.xs, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 16 },

  // Result phase
  verdictCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 2,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  verdictOutcome: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, letterSpacing: 1, textAlign: 'center' },
  mandateBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  mandateLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, letterSpacing: 1.5 },
  verdictPct: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  verdictBreakdown: { fontSize: FontSize.xs, color: Colors.textMuted },

  voteBreakdownCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  voteBreakdownBar: {
    height: 12,
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceBorder,
  },
  voteBreakdownSegSupport: { backgroundColor: Colors.success },
  voteBreakdownSegOppose: { backgroundColor: Colors.error + '66' },
  voteBreakdownRow: { flexDirection: 'row' },
  voteBreakdownItem: { flex: 1, alignItems: 'center', gap: 3 },
  voteBreakdownNum: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  voteBreakdownLbl: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  speechImpactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  speechImpactText: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic' },

  consequencesCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: 8,
  },
  consequenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  consequenceText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  notableCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: 8,
  },
  notableRow: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  notableLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notableName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  notableRiding: { fontSize: 9, color: Colors.textMuted },
  notableQuote: { fontSize: FontSize.xs, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 16 },

  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },

  continueBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  continueBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
});
