// Powered by OnSpace.AI — Peace Negotiations Screen
// Multi-stage diplomacy: back-channel, UN mediator, ceasefire, territory, reparations
// Weekly AI-generated updates spanning multiple weeks
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { ActiveWarState } from '@/contexts/GameContext';

type NegotiationStage =
  | 'back_channel'
  | 'un_mediator'
  | 'ceasefire'
  | 'territory_exchange'
  | 'reparations'
  | 'final_agreement';

interface NegotiationUpdate {
  week: number;
  stage: NegotiationStage;
  message: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  progressChange: number;
}

interface NegotiationState {
  country: string;
  flag: string;
  currentStage: NegotiationStage;
  progress: number; // 0-100 toward peace deal
  unMediatorEngaged: boolean;
  ceasefireActive: boolean;
  territoryOffered: string[];
  reparationsOffered: number; // billions
  weekStarted: number;
  updates: NegotiationUpdate[];
  enemyDemands: string[];
  canadianOffers: string[];
  stageWeeksSpent: number;
}

const STAGE_ORDER: NegotiationStage[] = [
  'back_channel', 'un_mediator', 'ceasefire', 'territory_exchange', 'reparations', 'final_agreement'
];

const STAGE_INFO: Record<NegotiationStage, {
  label: string;
  description: string;
  icon: string;
  color: string;
  minWeeks: number;
  progressNeeded: number;
}> = {
  back_channel: {
    label: 'Back-Channel Talks',
    description: 'Secret diplomatic contacts through third-party intermediaries. No public commitment. Exploratory discussions on the possibility of negotiations.',
    icon: 'message-lock',
    color: Colors.textSecondary,
    minWeeks: 1,
    progressNeeded: 15,
  },
  un_mediator: {
    label: 'UN Mediator Engaged',
    description: 'United Nations Secretary-General appoints a special envoy to facilitate negotiations. Both parties agree to formal talks under UN auspices.',
    icon: 'earth',
    color: Colors.info,
    minWeeks: 2,
    progressNeeded: 30,
  },
  ceasefire: {
    label: 'Ceasefire Negotiations',
    description: 'Formal talks on halting hostilities. Both sides negotiate terms of a temporary cessation of conflict — a prerequisite for broader peace.',
    icon: 'white-balance-sunny',
    color: Colors.warning,
    minWeeks: 2,
    progressNeeded: 50,
  },
  territory_exchange: {
    label: 'Territory Negotiations',
    description: 'Detailed talks on borders, occupied territories, and sovereignty arrangements. The most contentious phase of any peace process.',
    icon: 'map-marker-multiple',
    color: Colors.gold,
    minWeeks: 3,
    progressNeeded: 70,
  },
  reparations: {
    label: 'Reparations & Reconstruction',
    description: 'Financial terms for post-war reconstruction. Canada and the opposing state negotiate compensation for war damages and reconstruction costs.',
    icon: 'currency-usd',
    color: Colors.success,
    minWeeks: 2,
    progressNeeded: 85,
  },
  final_agreement: {
    label: 'Final Peace Agreement',
    description: 'Drafting and signing of the comprehensive peace treaty. Includes all terms agreed in previous stages. Ratification by both parliaments required.',
    icon: 'file-sign',
    color: Colors.gold,
    minWeeks: 1,
    progressNeeded: 100,
  },
};

const TERRITORY_OPTIONS: Record<string, string[]> = {
  Russia: ['Kaliningrad', 'Eastern Ukraine DMZ', 'Crimea Status Quo', 'Karelia Buffer Zone'],
  China: ['South China Sea Freedom of Navigation', 'Tibet Autonomy Zone', 'Hainan Maritime Boundary'],
  'North Korea': ['DMZ Expansion', 'Kaesong Special Zone', 'Rason Free Trade Port'],
  Iran: ['Khuzestan Autonomy', 'Strait of Hormuz Agreement', 'Kurdistan Buffer Zone'],
  default: ['Border Demarcation', 'Buffer Zone Treaty', 'Neutral Territory', 'Joint Administration Zone'],
};

const ENEMY_DEMANDS: Record<string, string[]> = {
  Russia: [
    'Sanctions lifted immediately upon ceasefire',
    'NATO expansion moratorium for 20 years',
    'Return of captured military equipment',
    'War crimes amnesty for Russian commanders',
  ],
  China: [
    'Recognition of China\'s South China Sea claims',
    'No Canadian weapons sales to Taiwan',
    'Technology transfer restrictions lifted',
    'Belt and Road partnership agreement',
  ],
  'North Korea': [
    'Formal peace treaty with UN Security Council recognition',
    'Humanitarian aid package $5B over 10 years',
    'Sanctions removal roadmap',
    'Joint economic zones in border regions',
  ],
  Iran: [
    'Nuclear program monitoring only through IAEA',
    'Frozen assets ($30B) released',
    'Military withdrawal from Persian Gulf region',
    'Lifting of all bilateral sanctions',
  ],
  default: [
    'Immediate cessation of all hostilities',
    'Release of all prisoners of war',
    'Humanitarian corridor establishment',
    'Economic reconstruction guarantees',
  ],
};

export default function PeaceNegotiationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, activeWars, removeWar, executeForeignPolicy } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [selectedWar, setSelectedWar] = useState<ActiveWarState | null>(
    activeWars.length === 1 ? activeWars[0] : null
  );
  const [negotiations, setNegotiations] = useState<Record<string, NegotiationState>>({});
  const [loadingAI, setLoadingAI] = useState(false);
  const [offerText, setOfferText] = useState('');

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;

  const currentNeg = selectedWar ? negotiations[selectedWar.country] : null;

  // Initialize negotiation for a war
  const startNegotiations = (war: ActiveWarState) => {
    if (negotiations[war.country]) return; // already started
    const demands = ENEMY_DEMANDS[war.country] || ENEMY_DEMANDS['default'];
    const neg: NegotiationState = {
      country: war.country,
      flag: war.flag,
      currentStage: 'back_channel',
      progress: Math.min(30, war.landGained * 0.4), // progress based on military position
      unMediatorEngaged: false,
      ceasefireActive: false,
      territoryOffered: [],
      reparationsOffered: 0,
      weekStarted: gameState.currentWeek,
      updates: [{
        week: gameState.currentWeek,
        stage: 'back_channel',
        message: `Canada has initiated back-channel diplomatic contacts with ${war.country} through Swiss intermediaries. Both parties have agreed to exploratory talks under conditions of strict confidentiality.`,
        sentiment: 'neutral',
        progressChange: 5,
      }],
      enemyDemands: demands,
      canadianOffers: [],
      stageWeeksSpent: 0,
    };
    setNegotiations(prev => ({ ...prev, [war.country]: neg }));
    setSelectedWar(war);
  };

  const generateAIUpdate = async (neg: NegotiationState, action: string) => {
    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-question-period', {
        body: {
          partyName: party?.name,
          leaderName: gameState.playerName,
          isGoverning: true,
          stats: gameState.stats,
          currentEvents: [],
          rivals: [],
          weekNumber: gameState.currentWeek,
          parliamentNumber: gameState.parliamentNumber,
          recentNewsHeadlines: [],
          context: `Generate a brief (2-3 sentences) diplomatic update from the perspective of a UN peace mediator. Canada is negotiating peace with ${neg.country}. Current stage: ${STAGE_INFO[neg.currentStage].label}. Recent Canadian action: "${action}". Current negotiation progress: ${Math.round(neg.progress)}%. The enemy has demanded: ${neg.enemyDemands.slice(0, 2).join(', ')}. Report on how the negotiations are progressing — be realistic and specific.`,
        },
      });
      if (data?.questions?.[0]?.question) {
        return data.questions[0].question as string;
      }
    } catch (e) {
      let msg = 'Diplomatic contacts remain active.';
      if (e instanceof FunctionsHttpError) {
        try { const t = await e.context?.text(); msg = t || msg; } catch {}
      }
    } finally {
      setLoadingAI(false);
    }
    return null;
  };

  const advanceStage = async (neg: NegotiationState, action: string, progressBoost: number) => {
    const aiMsg = await generateAIUpdate(neg, action);
    const currentStageIdx = STAGE_ORDER.indexOf(neg.currentStage);
    const stageInfo = STAGE_INFO[neg.currentStage];
    const newProgress = Math.min(100, neg.progress + progressBoost);
    const canAdvance = newProgress >= stageInfo.progressNeeded;
    const nextStage = canAdvance && currentStageIdx < STAGE_ORDER.length - 1
      ? STAGE_ORDER[currentStageIdx + 1]
      : neg.currentStage;

    const sentiment: NegotiationUpdate['sentiment'] =
      progressBoost >= 10 ? 'positive' : progressBoost >= 0 ? 'neutral' : 'negative';

    const update: NegotiationUpdate = {
      week: gameState.currentWeek,
      stage: neg.currentStage,
      message: aiMsg || `${action}. Negotiations continue at the ${stageInfo.label} stage.`,
      sentiment,
      progressChange: progressBoost,
    };

    setNegotiations(prev => ({
      ...prev,
      [neg.country]: {
        ...neg,
        progress: newProgress,
        currentStage: nextStage,
        canadianOffers: [...neg.canadianOffers, action].slice(-10),
        updates: [update, ...neg.updates].slice(0, 20),
        stageWeeksSpent: canAdvance ? 0 : neg.stageWeeksSpent + 1,
        ceasefireActive: neg.ceasefireActive || nextStage === 'territory_exchange',
        unMediatorEngaged: neg.unMediatorEngaged || nextStage !== 'back_channel',
      },
    }));

    if (nextStage !== neg.currentStage) {
      showAlert(
        `Negotiations Advance — ${STAGE_INFO[nextStage].label}`,
        `Progress at ${Math.round(newProgress)}%. Both parties have agreed to move to ${STAGE_INFO[nextStage].label}.`
      );
    }
  };

  const handleSignPeaceTreaty = (neg: NegotiationState) => {
    if (neg.progress < 85) {
      showAlert('Not Ready', 'Negotiations have not progressed far enough for a final agreement. Continue talks.');
      return;
    }
    const war = activeWars.find(w => w.country === neg.country);
    const warPopularity = war?.warPopularity || 50;
    const acceptChance = Math.min(90, neg.progress - 5 + (warPopularity < 40 ? 15 : 0));
    const accepted = Math.random() * 100 < acceptChance;

    if (accepted) {
      removeWar?.(neg.country);
      executeForeignPolicy?.('peace_treaty', neg.country, 8, 2);
      setNegotiations(prev => {
        const n = { ...prev };
        delete n[neg.country];
        return n;
      });
      setSelectedWar(null);
      showAlert(
        'Peace Treaty Signed',
        `The comprehensive peace agreement with ${neg.country} has been signed and ratified. Canada and ${neg.country} formally end hostilities. The agreement includes:\n\n${neg.territoryOffered.length > 0 ? `• Territory: ${neg.territoryOffered.join(', ')}\n` : ''}${neg.reparationsOffered > 0 ? `• Reparations: $${neg.reparationsOffered}B\n` : ''}• Ceasefire: Permanent\n• UN monitoring established\n\nThis ends the ${war?.weeksActive || 0}-week conflict.`,
        [{ text: 'Return to Parliament', onPress: () => router.replace('/(tabs)') }]
      );
    } else {
      showAlert(
        'Treaty Rejected',
        `${neg.country} has rejected the final treaty. The sticking point appears to be remaining territorial disputes. Continue negotiations or consider a limited agreement.`
      );
    }
  };

  // Stage-specific action buttons
  const getStageActions = (neg: NegotiationState): { label: string; icon: string; color: string; action: () => void; progress: number }[] => {
    const war = activeWars.find(w => w.country === neg.country);
    switch (neg.currentStage) {
      case 'back_channel':
        return [
          {
            label: 'Send Secret Envoy',
            icon: 'account-secret',
            color: Colors.textSecondary,
            action: () => advanceStage(neg, 'Canada sent a senior diplomat as a secret back-channel envoy', 8),
            progress: 8,
          },
          {
            label: 'Third-Party Intermediary',
            icon: 'account-switch',
            color: Colors.info,
            action: () => advanceStage(neg, 'Canada requested Switzerland to serve as intermediary', 12),
            progress: 12,
          },
          {
            label: 'Signal Openness to Talks',
            icon: 'hand-wave',
            color: Colors.gold,
            action: () => advanceStage(neg, 'Canada publicly signalled openness to negotiations', 5),
            progress: 5,
          },
        ];
      case 'un_mediator':
        return [
          {
            label: 'Request UN Secretary-General',
            icon: 'earth',
            color: Colors.info,
            action: () => advanceStage(neg, 'Canada formally requested UN mediation through the Security Council', 15),
            progress: 15,
          },
          {
            label: 'Agree to UN Framework',
            icon: 'handshake',
            color: Colors.success,
            action: () => advanceStage(neg, 'Canada accepted the UN mediator\'s proposed negotiation framework', 10),
            progress: 10,
          },
          {
            label: 'Brief Allied Governments',
            icon: 'account-group',
            color: Colors.gold,
            action: () => advanceStage(neg, 'Canada briefed G7 allies and NATO partners on the negotiation status', 5),
            progress: 5,
          },
        ];
      case 'ceasefire':
        return [
          {
            label: 'Propose 72-Hour Ceasefire',
            icon: 'pause-circle',
            color: Colors.warning,
            action: () => advanceStage(neg, 'Canada proposed an immediate 72-hour humanitarian ceasefire', 12),
            progress: 12,
          },
          {
            label: 'Offer Prisoner Exchange',
            icon: 'account-convert',
            color: Colors.info,
            action: () => advanceStage(neg, 'Canada offered a full prisoner-of-war exchange as a goodwill gesture', 18),
            progress: 18,
          },
          {
            label: 'Agree to Humanitarian Corridors',
            icon: 'road-variant',
            color: Colors.success,
            action: () => advanceStage(neg, 'Canada agreed to establish humanitarian corridors for civilian evacuation', 10),
            progress: 10,
          },
        ];
      case 'territory_exchange':
        return [
          {
            label: 'Propose Border Demarcation',
            icon: 'map-marker',
            color: Colors.gold,
            action: () => advanceStage(neg, 'Canada proposed UN-monitored border demarcation based on pre-war lines', 15),
            progress: 15,
          },
          {
            label: 'Offer Buffer Zone',
            icon: 'shield-half-full',
            color: Colors.info,
            action: () => advanceStage(neg, 'Canada proposed a demilitarized buffer zone on contested borders', 12),
            progress: 12,
          },
          {
            label: 'Accept Partial Concession',
            icon: 'minus-circle',
            color: Colors.warning,
            action: () => advanceStage(neg, 'Canada accepted a partial territorial concession to advance talks', 20),
            progress: 20,
          },
        ];
      case 'reparations':
        return [
          {
            label: 'Offer $2B Reconstruction Fund',
            icon: 'currency-usd',
            color: Colors.success,
            action: () => {
              setNegotiations(prev => ({ ...prev, [neg.country]: { ...neg, reparationsOffered: 2 } }));
              advanceStage({ ...neg, reparationsOffered: 2 }, 'Canada offered a $2B bilateral reconstruction fund', 15);
            },
            progress: 15,
          },
          {
            label: 'Joint Development Commission',
            icon: 'office-building',
            color: Colors.gold,
            action: () => advanceStage(neg, 'Canada proposed a joint economic development commission for affected regions', 12),
            progress: 12,
          },
          {
            label: 'Debt Relief Package',
            icon: 'bank-minus',
            color: Colors.info,
            action: () => advanceStage(neg, 'Canada offered debt relief as part of the post-conflict reconstruction package', 10),
            progress: 10,
          },
        ];
      case 'final_agreement':
        return [
          {
            label: 'Draft Peace Treaty Text',
            icon: 'file-document',
            color: Colors.gold,
            action: () => advanceStage(neg, 'Canada\'s legal team drafted the comprehensive peace treaty text', 10),
            progress: 10,
          },
          {
            label: 'Sign Peace Treaty',
            icon: 'file-sign',
            color: Colors.success,
            action: () => handleSignPeaceTreaty(neg),
            progress: 0,
          },
        ];
    }
  };

  // ── WAR SELECTION ──────────────────────────────────────────────────────────
  if (!selectedWar || (!currentNeg && !negotiations[selectedWar?.country || ''])) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Peace Negotiations</Text>
            <Text style={styles.headerSub}>Multi-stage diplomatic process</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {activeWars.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="peace" size={48} color={Colors.success} />
              <Text style={styles.emptyTitle}>No Active Conflicts</Text>
              <Text style={styles.emptyDesc}>Canada is not currently engaged in any armed conflicts. Peace negotiations are available when at war.</Text>
            </View>
          ) : (
            <>
              <View style={styles.infoCard}>
                <MaterialCommunityIcons name="information" size={14} color={Colors.info} />
                <Text style={styles.infoText}>
                  Peace negotiations are a multi-stage process spanning several weeks. Each stage — from back-channel talks through UN mediation, ceasefire, territorial negotiations, reparations, and final treaty — requires diplomatic actions and generates weekly AI-updated reports from mediators.
                </Text>
              </View>

              <Text style={styles.sectionLabel}>SELECT CONFLICT TO NEGOTIATE</Text>
              {activeWars.map(war => {
                const existingNeg = negotiations[war.country];
                const progressColor = war.warProgress === 'dominant' ? Colors.success
                  : war.warProgress === 'winning' ? Colors.info
                  : war.warProgress === 'stalemate' ? Colors.warning
                  : Colors.error;

                return (
                  <Pressable
                    key={war.country}
                    onPress={() => {
                      if (existingNeg) {
                        setSelectedWar(war);
                      } else {
                        showAlert(
                          `Begin Peace Talks with ${war.country}?`,
                          `Initiating negotiations will start the back-channel stage. This is a multi-week process. Your military position (${Math.round(war.landGained)}% territory) strengthens your negotiating position.\n\nWar popularity: ${Math.round(war.warPopularity)}%`,
                          [
                            { text: 'Not Yet', style: 'cancel' },
                            { text: 'Begin Negotiations', onPress: () => startNegotiations(war) },
                          ]
                        );
                      }
                    }}
                    style={({ pressed }) => [styles.warCard, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.warFlag}>{war.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.warCardTitle}>War with {war.country}</Text>
                      <Text style={styles.warCardSub}>Week {war.weeksActive} · {war.casualties.toLocaleString()} casualties</Text>
                      {existingNeg ? (
                        <View style={styles.negProgressRow}>
                          <View style={styles.negProgressBar}>
                            <View style={[styles.negProgressFill, { flex: Math.round(existingNeg.progress), backgroundColor: partyColor }]} />
                            <View style={{ flex: 100 - Math.round(existingNeg.progress) }} />
                          </View>
                          <Text style={[styles.negProgressLabel, { color: partyColor }]}>{Math.round(existingNeg.progress)}%</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={[styles.progressPill, { backgroundColor: progressColor + '22' }]}>
                        <Text style={[styles.progressPillText, { color: progressColor }]}>{war.warProgress.toUpperCase()}</Text>
                      </View>
                      {existingNeg ? (
                        <View style={[styles.progressPill, { backgroundColor: partyColor + '22' }]}>
                          <Text style={[styles.progressPillText, { color: partyColor }]}>
                            {STAGE_INFO[existingNeg.currentStage].label.split(' ')[0]}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.beginNegText}>Begin talks →</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // Get or initialize current negotiation
  const neg = negotiations[selectedWar.country];
  if (!neg) return null;

  const stageInfo = STAGE_INFO[neg.currentStage];
  const stageActions = getStageActions(neg);
  const stageIdx = STAGE_ORDER.indexOf(neg.currentStage);
  const progressColor = neg.progress >= 85 ? Colors.success
    : neg.progress >= 50 ? Colors.gold
    : neg.progress >= 25 ? Colors.warning
    : Colors.error;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => setSelectedWar(null)} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{neg.flag} Peace Talks — {neg.country}</Text>
          <Text style={styles.headerSub}>Week {gameState.currentWeek - neg.weekStarted + 1} of negotiations</Text>
        </View>
        <View style={[styles.stageBadge, { backgroundColor: stageInfo.color + '22' }]}>
          <Text style={[styles.stageBadgeText, { color: stageInfo.color }]}>
            Stage {stageIdx + 1}/6
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall progress */}
        <View style={[styles.progressCard, { borderColor: progressColor + '44' }]}>
          <View style={styles.progressCardHeader}>
            <Text style={styles.progressCardLabel}>NEGOTIATION PROGRESS</Text>
            <Text style={[styles.progressCardValue, { color: progressColor }]}>{Math.round(neg.progress)}%</Text>
          </View>
          <View style={styles.progressBarLarge}>
            <View style={[styles.progressBarLargeFill, { flex: Math.round(neg.progress), backgroundColor: progressColor }]} />
            <View style={{ flex: 100 - Math.round(neg.progress) }} />
          </View>
          {/* Stage milestones */}
          <View style={styles.milestonesRow}>
            {STAGE_ORDER.map((stage, idx) => {
              const info = STAGE_INFO[stage];
              const isComplete = neg.progress >= info.progressNeeded;
              const isCurrent = neg.currentStage === stage;
              return (
                <View key={stage} style={styles.milestoneItem}>
                  <MaterialCommunityIcons
                    name={isComplete ? 'check-circle' : isCurrent ? info.icon as any : 'circle-outline'}
                    size={12}
                    color={isComplete ? Colors.success : isCurrent ? info.color : Colors.textMuted}
                  />
                  <Text style={[styles.milestoneLabel, isCurrent && { color: info.color }]} numberOfLines={1}>
                    {idx + 1}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Current stage */}
        <View style={[styles.stageCard, { borderColor: stageInfo.color + '44' }]}>
          <View style={styles.stageCardHeader}>
            <MaterialCommunityIcons name={stageInfo.icon as any} size={22} color={stageInfo.color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.stageCardTitle, { color: stageInfo.color }]}>{stageInfo.label}</Text>
              <Text style={styles.stageCardDesc}>{stageInfo.description}</Text>
            </View>
          </View>

          {/* Ceasefire status */}
          {neg.ceasefireActive ? (
            <View style={styles.ceasefireBadge}>
              <MaterialCommunityIcons name="pause-circle" size={13} color={Colors.success} />
              <Text style={styles.ceasefireBadgeText}>Ceasefire Active — Hostilities Temporarily Suspended</Text>
            </View>
          ) : null}

          {/* UN mediator */}
          {neg.unMediatorEngaged ? (
            <View style={styles.unBadge}>
              <MaterialCommunityIcons name="earth" size={13} color={Colors.info} />
              <Text style={styles.unBadgeText}>UN Special Envoy Engaged — International Oversight Active</Text>
            </View>
          ) : null}
        </View>

        {/* Enemy demands */}
        <View style={styles.demandsCard}>
          <Text style={styles.sectionLabel}>{neg.country.toUpperCase()} DEMANDS</Text>
          {neg.enemyDemands.map((demand, idx) => (
            <View key={idx} style={styles.demandRow}>
              <MaterialCommunityIcons name="alert-circle-outline" size={12} color={Colors.error} />
              <Text style={styles.demandText}>{demand}</Text>
            </View>
          ))}
        </View>

        {/* Stage actions */}
        <View>
          <Text style={styles.sectionLabel}>DIPLOMATIC ACTIONS — {stageInfo.label.toUpperCase()}</Text>
          {loadingAI ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={Colors.gold} />
              <Text style={styles.loadingText}>Generating diplomatic update...</Text>
            </View>
          ) : null}
          {stageActions.map((action, idx) => (
            <Pressable
              key={idx}
              onPress={action.action}
              disabled={loadingAI}
              style={({ pressed }) => [
                styles.actionCard,
                { borderColor: action.color + '44' },
                loadingAI && { opacity: 0.5 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons name={action.icon as any} size={20} color={action.color} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionCardLabel, { color: action.color }]}>{action.label}</Text>
                {action.progress > 0 ? (
                  <Text style={styles.actionCardProgress}>+{action.progress}% progress</Text>
                ) : null}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Territory offers */}
        {neg.currentStage === 'territory_exchange' || neg.currentStage === 'final_agreement' ? (
          <View>
            <Text style={styles.sectionLabel}>TERRITORIAL ARRANGEMENTS</Text>
            <View style={styles.territoryGrid}>
              {(TERRITORY_OPTIONS[neg.country] || TERRITORY_OPTIONS['default']).map(territory => {
                const isSelected = neg.territoryOffered.includes(territory);
                return (
                  <Pressable
                    key={territory}
                    onPress={() => {
                      setNegotiations(prev => ({
                        ...prev,
                        [neg.country]: {
                          ...neg,
                          territoryOffered: isSelected
                            ? neg.territoryOffered.filter(t => t !== territory)
                            : [...neg.territoryOffered, territory],
                        },
                      }));
                    }}
                    style={[styles.territoryChip, isSelected && { backgroundColor: Colors.gold + '22', borderColor: Colors.gold }]}
                  >
                    <MaterialCommunityIcons
                      name={isSelected ? 'check-circle' : 'map-marker-outline'}
                      size={12}
                      color={isSelected ? Colors.gold : Colors.textMuted}
                    />
                    <Text style={[styles.territoryChipText, isSelected && { color: Colors.gold }]}>{territory}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Negotiation log */}
        {neg.updates.length > 0 ? (
          <View>
            <Text style={styles.sectionLabel}>DIPLOMATIC LOG — WEEKLY UPDATES</Text>
            {neg.updates.map((update, idx) => {
              const sentColor = update.sentiment === 'positive' ? Colors.success
                : update.sentiment === 'negative' ? Colors.error
                : Colors.textSecondary;
              return (
                <View key={idx} style={[styles.updateCard, { borderLeftColor: sentColor + '66' }]}>
                  <View style={styles.updateHeader}>
                    <MaterialCommunityIcons
                      name={update.sentiment === 'positive' ? 'trending-up' : update.sentiment === 'negative' ? 'trending-down' : 'minus'}
                      size={12}
                      color={sentColor}
                    />
                    <Text style={[styles.updateStage, { color: sentColor }]}>{STAGE_INFO[update.stage]?.label}</Text>
                    <Text style={styles.updateWeek}>Week {update.week}</Text>
                    {update.progressChange !== 0 ? (
                      <Text style={[styles.updateProgress, { color: update.progressChange > 0 ? Colors.success : Colors.error }]}>
                        {update.progressChange > 0 ? '+' : ''}{update.progressChange}%
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.updateMessage}>{update.message}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  stageBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  stageBadgeText: { fontSize: 9, fontWeight: FontWeight.bold },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  emptyCard: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  emptyDesc: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.md },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.info + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.info + '22', padding: Spacing.md },
  infoText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 18 },
  warCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  warFlag: { fontSize: 28 },
  warCardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  warCardSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  negProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  negProgressBar: { flex: 1, flexDirection: 'row', height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden' },
  negProgressFill: { height: '100%', borderRadius: 2 },
  negProgressLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 35, textAlign: 'right' },
  progressPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  progressPillText: { fontSize: 9, fontWeight: FontWeight.bold },
  beginNegText: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: FontWeight.semibold },
  // Progress card
  progressCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 10 },
  progressCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressCardLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  progressCardValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  progressBarLarge: { flexDirection: 'row', height: 12, backgroundColor: Colors.surfaceBorder, borderRadius: 6, overflow: 'hidden' },
  progressBarLargeFill: { height: '100%', borderRadius: 6, minWidth: 4 },
  milestonesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneItem: { alignItems: 'center', gap: 2 },
  milestoneLabel: { fontSize: 9, color: Colors.textMuted },
  // Stage card
  stageCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 10 },
  stageCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stageCardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  stageCardDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18, marginTop: 3 },
  ceasefireBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.success + '11', borderRadius: Radius.sm, padding: 8, borderWidth: 1, borderColor: Colors.success + '33' },
  ceasefireBadgeText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.semibold },
  unBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.info + '11', borderRadius: Radius.sm, padding: 8, borderWidth: 1, borderColor: Colors.info + '33' },
  unBadgeText: { fontSize: FontSize.xs, color: Colors.info, fontWeight: FontWeight.semibold },
  // Demands
  demandsCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error + '22', padding: Spacing.md, gap: 8 },
  demandRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  demandText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  // Actions
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm, marginBottom: 8 },
  actionCardLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  actionCardProgress: { fontSize: FontSize.xs, color: Colors.success, marginTop: 2 },
  loadingCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: Spacing.md },
  loadingText: { fontSize: FontSize.xs, color: Colors.textMuted },
  // Territory
  territoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  territoryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, backgroundColor: Colors.card },
  territoryChipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  // Log
  updateCard: { backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, borderLeftWidth: 3, padding: Spacing.sm, gap: 6, marginBottom: 8 },
  updateHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  updateStage: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  updateWeek: { fontSize: FontSize.xs, color: Colors.textMuted },
  updateProgress: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  updateMessage: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
});
