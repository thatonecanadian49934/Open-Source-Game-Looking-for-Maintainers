// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';

const POLICY_TOPICS = [
  'Healthcare', 'Economy', 'Environment', 'Housing', 
  'Immigration', 'Defence', 'Indigenous Affairs', 'Justice', 'Education', 'Infrastructure'
];

export default function PolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, submitPolicy } = useGame();
  const { showAlert } = useAlert();
  const [policyText, setPolicyText] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [simulatedEffects, setSimulatedEffects] = useState<string[]>([]);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const simulateEffects = () => {
    const effects: string[] = [];
    
    if (selectedTopics.includes('Healthcare')) effects.push('📈 +3-5% approval among seniors and families');
    if (selectedTopics.includes('Economy')) effects.push('📊 Potential GDP growth impact: +0.2-0.5%');
    if (selectedTopics.includes('Environment')) effects.push('🌿 +4% green voter approval, -2% industry sector');
    if (selectedTopics.includes('Housing')) effects.push('🏠 +6% youth voter approval');
    if (selectedTopics.includes('Immigration')) effects.push('👥 Mixed reaction: +3% urban, -4% rural');
    if (selectedTopics.includes('Defence')) effects.push('🛡️ +2% national security credibility');
    if (selectedTopics.includes('Indigenous Affairs')) effects.push('🦅 +5% reconciliation approval score');
    if (selectedTopics.includes('Justice')) effects.push('⚖️ +2% law and order credibility');
    
    if (policyText.length > 300) effects.push('📰 Comprehensive policy — expect major media coverage');
    if (policyText.length > 500) effects.push('📋 Detailed platform — strong credibility boost');
    
    return effects;
  };

  const handleSimulate = () => {
    if (!policyText.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      const effects = simulateEffects();
      setSimulatedEffects(effects);
      setSubmitting(false);
    }, 1200);
  };

  const handleSubmit = () => {
    if (!policyText.trim()) return;
    submitPolicy(policyText.trim());
    setSubmitted(true);
    showAlert(
      'Policy Platform Published',
      'Your policy platform has been released. News outlets are already analyzing the implications for the next election.'
    );
  };

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
        {submitted ? (
          <View style={styles.submittedState}>
            <MaterialCommunityIcons name="file-check" size={64} color={Colors.success} />
            <Text style={styles.submittedTitle}>Platform Published</Text>
            <Text style={styles.submittedText}>
              Your policy platform is now public. Canadians, journalists, and rival parties are reviewing it. Watch the News tab for reactions.
            </Text>
            <Pressable
              onPress={() => { setSubmitted(false); setPolicyText(''); setTitle(''); setSelectedTopics([]); setSimulatedEffects([]); }}
              style={({ pressed }) => [styles.newPolicyBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.newPolicyBtnText}>Write Another Policy</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.intro}>
              <MaterialCommunityIcons name="file-document-edit" size={24} color={Colors.gold} />
              <View style={styles.introText}>
                <Text style={styles.introTitle}>AI Policy Simulator</Text>
                <Text style={styles.introSubtitle}>
                  Write your policy platform. The AI will simulate realistic effects on your approval, economy, and electoral outcomes.
                </Text>
              </View>
            </View>

            {/* Topic Tags */}
            <View style={styles.topicsSection}>
              <Text style={styles.sectionLabel}>POLICY AREAS (select all that apply)</Text>
              <View style={styles.topicsGrid}>
                {POLICY_TOPICS.map(topic => (
                  <Pressable
                    key={topic}
                    onPress={() => toggleTopic(topic)}
                    style={({ pressed }) => [
                      styles.topicTag,
                      selectedTopics.includes(topic) && { 
                        backgroundColor: (party?.color || Colors.gold) + '22',
                        borderColor: party?.color || Colors.gold,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={[
                      styles.topicTagText,
                      selectedTopics.includes(topic) && { color: party?.color || Colors.gold, fontWeight: FontWeight.bold }
                    ]}>
                      {topic}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Policy Title */}
            <View style={styles.fieldSection}>
              <Text style={styles.sectionLabel}>POLICY TITLE</Text>
              <TextInput
                style={styles.titleInput}
                placeholder="e.g., A New Deal for Canadian Families"
                placeholderTextColor={Colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Policy Text */}
            <View style={styles.fieldSection}>
              <Text style={styles.sectionLabel}>PLATFORM DETAILS</Text>
              <TextInput
                style={styles.policyInput}
                multiline
                numberOfLines={8}
                placeholder="Describe your full policy platform in detail. Include specific commitments, dollar figures, timelines, and which Canadians will benefit. The more detailed your platform, the stronger the AI simulation..."
                placeholderTextColor={Colors.textMuted}
                value={policyText}
                onChangeText={setPolicyText}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{policyText.length} characters — {policyText.split(' ').filter(Boolean).length} words</Text>
            </View>

            {/* Simulate Button */}
            <Pressable
              onPress={handleSimulate}
              disabled={!policyText.trim() || submitting}
              style={({ pressed }) => [
                styles.simulateBtn,
                (!policyText.trim() || submitting) && { opacity: 0.4 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons name="robot" size={18} color={Colors.gold} />
              <Text style={styles.simulateBtnText}>
                {submitting ? 'AI Simulating Effects...' : 'Simulate Policy Impact'}
              </Text>
            </Pressable>

            {/* Simulated Effects */}
            {simulatedEffects.length > 0 ? (
              <View style={styles.effectsSection}>
                <Text style={styles.sectionLabel}>PROJECTED EFFECTS (AI SIMULATION)</Text>
                {simulatedEffects.map((effect, idx) => (
                  <View key={idx} style={styles.effectItem}>
                    <Text style={styles.effectText}>{effect}</Text>
                  </View>
                ))}
                
                <Pressable
                  onPress={handleSubmit}
                  style={({ pressed }) => [
                    styles.publishBtn,
                    { backgroundColor: party?.color || Colors.primary },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <MaterialCommunityIcons name="send" size={18} color="#fff" />
                  <Text style={styles.publishBtnText}>Publish Policy Platform</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.gold + '11',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gold + '22',
    padding: Spacing.md,
  },
  introText: {
    flex: 1,
  },
  introTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  topicsSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicTag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  topicTagText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  fieldSection: {
    gap: 8,
  },
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
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'right',
  },
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
  simulateBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.gold,
  },
  effectsSection: {
    gap: Spacing.sm,
  },
  effectItem: {
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.sm,
  },
  effectText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  publishBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  submittedState: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  submittedTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  submittedText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  newPolicyBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.sm,
  },
  newPolicyBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
});
