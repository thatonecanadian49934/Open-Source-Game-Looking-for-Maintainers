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

const BILL_TOPICS = [
  'Healthcare', 'Economy', 'Environment', 'Housing',
  'Justice', 'Defence', 'Immigration', 'Education', 'Infrastructure', 'Agriculture'
];

export default function CreateBillScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, createBill } = useGame();
  const { showAlert } = useAlert();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [fiscalImpact, setFiscalImpact] = useState('');

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);

  const handleCreate = () => {
    if (!title.trim() || !description.trim() || !topic) {
      showAlert('Incomplete Bill', 'Please fill in the title, description, and select a topic.');
      return;
    }
    
    const billTitle = title.startsWith('Bill') ? title : `Bill C-${Math.floor(Math.random() * 500) + 100}: ${title}`;
    createBill(billTitle, description.trim(), topic, fiscalImpact.trim() || 'Fiscal impact TBD');
    
    showAlert(
      'Bill Introduced',
      `Your bill has been introduced in the House of Commons at First Reading. It will need 3 readings, committee review, and Senate passage.`,
      [{ text: 'View in Parliament', onPress: () => router.replace('/(tabs)/parliament') }]
    );
    router.back();
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
        <Text style={styles.headerTitle}>Draft New Bill</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Process Info */}
        <View style={styles.processInfo}>
          <Text style={styles.processTitle}>Parliamentary Process</Text>
          <View style={styles.processList}>
            {[
              'House — First Reading (introduction)',
              'House — Second Reading (debate)',
              'Committee Review (amendments)',
              'House — Third Reading (final vote)',
              'Senate — Three Readings + Committee',
              'Royal Assent (becomes law)',
            ].map((step, idx) => (
              <View key={idx} style={styles.processStep}>
                <View style={[styles.processStepNum, { backgroundColor: party?.color + '22' }]}>
                  <Text style={[styles.processStepNumText, { color: party?.color }]}>{idx + 1}</Text>
                </View>
                <Text style={styles.processStepText}>{step}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.processNote}>Default: 6 weeks per stage. Government can force a vote at any time.</Text>
        </View>

        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>BILL TITLE *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Universal Basic Housing Act"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
          <Text style={styles.fieldHint}>Will be formatted as "Bill C-XXX: [Your Title]"</Text>
        </View>

        {/* Topic */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>POLICY AREA *</Text>
          <View style={styles.topicGrid}>
            {BILL_TOPICS.map(t => (
              <Pressable
                key={t}
                onPress={() => setTopic(t)}
                style={({ pressed }) => [
                  styles.topicChip,
                  topic === t && { backgroundColor: (party?.color || Colors.gold) + '22', borderColor: party?.color || Colors.gold },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.topicChipText, topic === t && { color: party?.color || Colors.gold, fontWeight: FontWeight.bold }]}>
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>BILL SUMMARY *</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={5}
            placeholder="Describe what this bill will do, who it affects, and the key provisions..."
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
        </View>

        {/* Fiscal Impact */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>FISCAL IMPACT (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., -$5B/year, +$2.3B revenue over 10 years, Cost neutral"
            placeholderTextColor={Colors.textMuted}
            value={fiscalImpact}
            onChangeText={setFiscalImpact}
          />
        </View>

        {/* Sponsor info */}
        <View style={styles.sponsorInfo}>
          <MaterialCommunityIcons name="account-tie" size={16} color={Colors.textSecondary} />
          <Text style={styles.sponsorText}>
            Sponsored by: {gameState.playerName}, {party?.name} Leader
          </Text>
        </View>

        <Pressable
          onPress={handleCreate}
          style={({ pressed }) => [
            styles.createBtn,
            { backgroundColor: party?.color || Colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <MaterialCommunityIcons name="gavel" size={20} color="#fff" />
          <Text style={styles.createBtnText}>Introduce Bill in Parliament</Text>
        </Pressable>
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
  processInfo: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  processTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  processList: {
    gap: 6,
  },
  processStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processStepNumText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  processStepText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  processNote: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  fieldHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  topicChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  textArea: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 130,
    lineHeight: 22,
  },
  sponsorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.sm,
  },
  sponsorText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  createBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});
