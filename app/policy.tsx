// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';

const POLICY_TOPICS = [
  'Healthcare', 'Economy', 'Environment', 'Housing',
  'Immigration', 'Defence', 'Indigenous Affairs', 'Justice', 'Education', 'Infrastructure',
  'Foreign Policy', 'Social Programs', 'Technology', 'Agriculture',
];

interface AISimulationResult {
  approvalChange: number;
  partyStandingChange: number;
  gdpImpact: string;
  debtImpact: string;
  regionalBreakdown: { region: string; impact: string; change: number }[];
  oppositionReaction: string;
  mediaReaction: string;
  likelyPassage: string;
  keyRisks: string[];
  keyBenefits: string[];
  overallVerdict: string;
}

export default function PolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, submitPolicy } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [policyText, setPolicyText] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState<AISimulationResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [aiError, setAiError] = useState(false);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleSimulate = async () => {
    if (!policyText.trim()) return;
    setSimulating(true);
    setSimulation(null);
    setAiError(false);

    try {
      const { data, error } = await supabase.functions.invoke('ai-policy-simulation', {
        body: {
          policyTitle: title || 'Untitled Policy',
          policyText,
          selectedTopics,
          partyName: party?.name,
          partyShortName: party?.shortName,
          partyIdeology: party?.ideology,
          leaderName: gameState.playerName,
          isGoverning: gameState.isGoverning,
          isMajority: gameState.isMajority,
          stats: gameState.stats,
          seats: gameState.seats,
          currentWeek: gameState.currentWeek,
          parliamentNumber: gameState.parliamentNumber,
        },
      });

      if (error) {
        let errMsg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { const txt = await error.context?.text(); errMsg = txt || errMsg; } catch { }
        }
        console.warn('Policy simulation error:', errMsg);
        setAiError(true);
        setSimulation(getFallbackSimulation(selectedTopics, policyText, gameState.isGoverning));
      } else if (data?.simulation) {
        setSimulation(data.simulation);
      } else {
        setAiError(true);
        setSimulation(getFallbackSimulation(selectedTopics, policyText, gameState.isGoverning));
      }
    } catch (e) {
      setAiError(true);
      setSimulation(getFallbackSimulation(selectedTopics, policyText, gameState.isGoverning));
    } finally {
      setSimulating(false);
    }
  };

  const handleSubmit = () => {
    if (!policyText.trim()) return;
    submitPolicy(policyText.trim());
    setSubmitted(true);
    showAlert(
      'Policy Platform Published',
      'Your policy platform has been released. News outlets are already analyzing the implications.'
    );
  };

  if (submitted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Policy Platform</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.submittedState}>
          <MaterialCommunityIcons name="file-check" size={64} color={Colors.success} />
          <Text style={styles.submittedTitle}>Platform Published</Text>
          <Text style={styles.submittedText}>
            Your policy platform is now public. News outlets are reporting on it — check the News tab for reactions.
          </Text>
          <Pressable
            onPress={() => { setSubmitted(false); setPolicyText(''); setTitle(''); setSelectedTopics([]); setSimulation(null); }}
            style={({ pressed }) => [styles.newPolicyBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.newPolicyBtnText}>Write Another Policy</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>Policy Platform</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Role banner */}
        <View style={[styles.roleBanner, { borderColor: partyColor + '44', backgroundColor: partyColor + '11' }]}>
          <MaterialCommunityIcons name="file-document-edit" size={20} color={partyColor} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.roleBannerTitle, { color: partyColor }]}>AI Policy Simulator</Text>
            <Text style={styles.roleBannerSub}>
              {gameState.isGoverning
                ? 'As Prime Minister, your policies become government bills and receive immediate media scrutiny.'
                : 'As Opposition leader, your policies sharpen your critique and build your electoral platform.'}
            </Text>
          </View>
          {aiError ? null : (
            <View style={styles.aiBadge}>
              <MaterialCommunityIcons name="robot" size={12} color={Colors.gold} />
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          )}
        </View>

        {/* Topics */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>POLICY AREAS</Text>
          <View style={styles.topicsGrid}>
            {POLICY_TOPICS.map(topic => (
              <Pressable
                key={topic}
                onPress={() => toggleTopic(topic)}
                style={({ pressed }) => [
                  styles.topicTag,
                  selectedTopics.includes(topic) && { backgroundColor: partyColor + '22', borderColor: partyColor },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.topicTagText, selectedTopics.includes(topic) && { color: partyColor, fontWeight: FontWeight.bold }]}>
                  {topic}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>POLICY TITLE</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="e.g., A New Deal for Canadian Families"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Policy text */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PLATFORM DETAILS</Text>
          <TextInput
            style={styles.policyInput}
            multiline
            numberOfLines={8}
            placeholder="Describe your full policy. Include specific commitments, dollar figures, timelines, and which Canadians will benefit. The AI will simulate realistic political, economic, and electoral effects..."
            placeholderTextColor={Colors.textMuted}
            value={policyText}
            onChangeText={setPolicyText}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{policyText.split(' ').filter(Boolean).length} words</Text>
        </View>

        {/* Simulate Button */}
        <Pressable
          onPress={handleSimulate}
          disabled={!policyText.trim() || simulating}
          style={({ pressed }) => [
            styles.simulateBtn,
            (!policyText.trim() || simulating) && { opacity: 0.4 },
            pressed && { opacity: 0.85 },
          ]}
        >
          {simulating ? (
            <>
              <ActivityIndicator size="small" color={Colors.gold} />
              <Text style={styles.simulateBtnText}>AI Analyzing Policy Impact...</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="robot" size={18} color={Colors.gold} />
              <Text style={styles.simulateBtnText}>Run AI Policy Simulation</Text>
            </>
          )}
        </Pressable>

        {/* AI Simulation Results */}
        {simulation ? (
          <View style={styles.simulationResults}>
            {aiError ? (
              <View style={styles.aiErrorNote}>
                <MaterialCommunityIcons name="information" size={12} color={Colors.textMuted} />
                <Text style={styles.aiErrorText}>Static simulation (AI unavailable)</Text>
              </View>
            ) : null}

            {/* Verdict */}
            <View style={[styles.verdictCard, {
              borderColor: simulation.approvalChange >= 3 ? Colors.success + '66' : simulation.approvalChange >= 0 ? Colors.warning + '66' : Colors.error + '66',
              backgroundColor: simulation.approvalChange >= 3 ? Colors.success + '11' : simulation.approvalChange >= 0 ? Colors.warning + '11' : Colors.error + '11',
            }]}>
              <Text style={styles.verdictLabel}>AI ASSESSMENT</Text>
              <Text style={[styles.verdictText, {
                color: simulation.approvalChange >= 3 ? Colors.success : simulation.approvalChange >= 0 ? Colors.warning : Colors.error,
              }]}>
                {simulation.overallVerdict}
              </Text>
              <Text style={styles.likelyPassage}>{simulation.likelyPassage}</Text>
            </View>

            {/* Stat impacts */}
            <View style={styles.impactGrid}>
              <View style={styles.impactItem}>
                <MaterialCommunityIcons
                  name={simulation.approvalChange >= 0 ? 'trending-up' : 'trending-down'}
                  size={18}
                  color={simulation.approvalChange >= 0 ? Colors.success : Colors.error}
                />
                <Text style={[styles.impactValue, { color: simulation.approvalChange >= 0 ? Colors.success : Colors.error }]}>
                  {simulation.approvalChange > 0 ? '+' : ''}{simulation.approvalChange}%
                </Text>
                <Text style={styles.impactLabel}>Approval</Text>
              </View>
              <View style={styles.impactItem}>
                <MaterialCommunityIcons
                  name={simulation.partyStandingChange >= 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
                  size={18}
                  color={simulation.partyStandingChange >= 0 ? Colors.success : Colors.error}
                />
                <Text style={[styles.impactValue, { color: simulation.partyStandingChange >= 0 ? Colors.success : Colors.error }]}>
                  {simulation.partyStandingChange > 0 ? '+' : ''}{simulation.partyStandingChange}%
                </Text>
                <Text style={styles.impactLabel}>Party Standing</Text>
              </View>
              <View style={styles.impactItem}>
                <MaterialCommunityIcons name="chart-line" size={18} color={Colors.info} />
                <Text style={[styles.impactValue, { color: Colors.info }]}>{simulation.gdpImpact}</Text>
                <Text style={styles.impactLabel}>GDP</Text>
              </View>
              <View style={styles.impactItem}>
                <MaterialCommunityIcons name="bank" size={18} color={Colors.warning} />
                <Text style={[styles.impactValue, { color: Colors.warning }]}>{simulation.debtImpact}</Text>
                <Text style={styles.impactLabel}>Debt</Text>
              </View>
            </View>

            {/* Regional breakdown */}
            {simulation.regionalBreakdown.length > 0 ? (
              <View style={styles.regionSection}>
                <Text style={styles.resultSectionTitle}>REGIONAL IMPACT</Text>
                {simulation.regionalBreakdown.map((r, i) => (
                  <View key={i} style={styles.regionRow}>
                    <Text style={styles.regionName}>{r.region}</Text>
                    <Text style={styles.regionImpactText} numberOfLines={1}>{r.impact}</Text>
                    <Text style={[styles.regionChange, { color: r.change >= 0 ? Colors.success : Colors.error }]}>
                      {r.change > 0 ? '+' : ''}{r.change}%
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Benefits & Risks */}
            <View style={styles.twoColSection}>
              <View style={[styles.colCard, { borderColor: Colors.success + '33' }]}>
                <Text style={[styles.colCardTitle, { color: Colors.success }]}>
                  <MaterialCommunityIcons name="check-circle" size={12} color={Colors.success} /> BENEFITS
                </Text>
                {simulation.keyBenefits.map((b, i) => (
                  <Text key={i} style={styles.colCardItem}>• {b}</Text>
                ))}
              </View>
              <View style={[styles.colCard, { borderColor: Colors.error + '33' }]}>
                <Text style={[styles.colCardTitle, { color: Colors.error }]}>
                  <MaterialCommunityIcons name="alert-circle" size={12} color={Colors.error} /> RISKS
                </Text>
                {simulation.keyRisks.map((r, i) => (
                  <Text key={i} style={styles.colCardItem}>• {r}</Text>
                ))}
              </View>
            </View>

            {/* Opposition & Media reaction */}
            <View style={styles.reactionSection}>
              <View style={styles.reactionItem}>
                <View style={styles.reactionHeader}>
                  <MaterialCommunityIcons name="account-voice" size={13} color={Colors.error} />
                  <Text style={styles.reactionLabel}>OPPOSITION REACTION</Text>
                </View>
                <Text style={styles.reactionText}>{simulation.oppositionReaction}</Text>
              </View>
              <View style={styles.reactionItem}>
                <View style={styles.reactionHeader}>
                  <MaterialCommunityIcons name="newspaper" size={13} color={Colors.info} />
                  <Text style={styles.reactionLabel}>MEDIA REACTION</Text>
                </View>
                <Text style={styles.reactionText}>{simulation.mediaReaction}</Text>
              </View>
            </View>

            {/* Publish */}
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.publishBtn,
                { backgroundColor: partyColor },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons name="send" size={18} color="#fff" />
              <Text style={styles.publishBtnText}>Publish Policy Platform</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getFallbackSimulation(topics: string[], text: string, isGoverning: boolean): AISimulationResult {
  const hasEconomy = topics.includes('Economy') || topics.includes('Infrastructure');
  const hasSocial = topics.includes('Healthcare') || topics.includes('Social Programs');
  const hasEnv = topics.includes('Environment');
  return {
    approvalChange: hasSocial ? 4 : hasEconomy ? 2 : 1,
    partyStandingChange: 3,
    gdpImpact: hasEconomy ? '+0.3%' : 'Neutral',
    debtImpact: hasSocial ? '+$12B' : '+$3B',
    regionalBreakdown: [
      { region: 'Ontario', impact: 'Strong urban support', change: 4 },
      { region: 'Quebec', impact: 'Mixed reaction', change: 1 },
      { region: 'Prairies', impact: 'Skeptical reception', change: -2 },
      { region: 'British Columbia', impact: 'Largely positive', change: 3 },
      { region: 'Atlantic', impact: 'Moderate support', change: 2 },
    ],
    oppositionReaction: 'Opposition critics immediately challenged the costing of the plan and questioned whether the numbers add up.',
    mediaReaction: 'National outlets covered the announcement as a major policy signal, with editorials divided on fiscal impact.',
    likelyPassage: isGoverning ? 'Likely to pass with governing majority.' : 'Would require coalition support to pass as legislation.',
    keyRisks: ['Cost overruns possible if implementation is rushed', 'Provincial opposition may slow rollout'],
    keyBenefits: ['Addresses a key voter concern', 'Differentiates your platform from rivals'],
    overallVerdict: 'Solid policy with moderate political upside and manageable risks.',
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  content: { padding: Spacing.md, gap: Spacing.md },

  roleBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  roleBannerTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: 3 },
  roleBannerSub: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.gold + '22',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  aiBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.gold },

  section: { gap: 8 },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  topicsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicTag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  topicTagText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },

  titleInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  policyInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 180,
    lineHeight: 24,
  },
  charCount: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' },

  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gold + '44',
    backgroundColor: Colors.gold + '11',
  },
  simulateBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.gold },

  simulationResults: { gap: Spacing.md },
  aiErrorNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  aiErrorText: { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic' },

  verdictCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 6,
    alignItems: 'center',
  },
  verdictLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  verdictText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center' },
  likelyPassage: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },

  impactGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  impactItem: { flex: 1, alignItems: 'center', gap: 3 },
  impactValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  impactLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },

  regionSection: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: 8,
  },
  resultSectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  regionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  regionName: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textPrimary, width: 80 },
  regionImpactText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  regionChange: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, minWidth: 35, textAlign: 'right' },

  twoColSection: { flexDirection: 'row', gap: Spacing.sm },
  colCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 6,
  },
  colCardTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.5, marginBottom: 2 },
  colCardItem: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },

  reactionSection: {
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  reactionItem: { gap: 4 },
  reactionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reactionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.8 },
  reactionText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },

  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  publishBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },

  submittedState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  submittedTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.success },
  submittedText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  newPolicyBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.sm,
  },
  newPolicyBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
});
