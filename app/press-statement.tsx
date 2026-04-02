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

const STATEMENT_TEMPLATES = [
  { label: 'Respond to Criticism', text: 'Today, I want to address the unfounded attacks on our party\'s record. The facts are clear: we have delivered for Canadians while our opponents have offered nothing but opposition without alternatives.' },
  { label: 'Policy Announcement', text: 'I am proud to announce a new policy direction that will directly benefit Canadian families. This initiative reflects our core values and our commitment to governing for all Canadians.' },
  { label: 'National Unity', text: 'Canada is stronger when we work together. I am calling on all parliamentarians to rise above partisan differences and work in the national interest on the pressing challenges facing our country.' },
  { label: 'Economic Message', text: 'The economic data this week confirms what Canadians are feeling: costs are too high and families need relief. Our party has a credible plan to grow the economy and restore affordability.' },
];

export default function PressStatementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, issuePressStatement } = useGame();
  const { showAlert } = useAlert();
  const [statement, setStatement] = useState('');
  const [title, setTitle] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);

  const handleSubmit = () => {
    if (!statement.trim()) return;
    issuePressStatement(statement.trim());
    setSubmitted(true);
    showAlert(
      'Statement Issued',
      'Your press statement has been distributed to all major media outlets. Expect news coverage in the next cycle.'
    );
  };

  const handleUseTemplate = (text: string) => {
    setStatement(text);
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
        <Text style={styles.headerTitle}>Issue Press Statement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.letterhead, { borderTopColor: party?.color || Colors.primary }]}>
          <View style={styles.letterheadTop}>
            <Text style={styles.letterheadParty}>{party?.name}</Text>
            <Text style={styles.letterheadRole}>Office of the Party Leader</Text>
          </View>
          <View style={styles.letterheadBottom}>
            <MaterialCommunityIcons name="maple-leaf" size={20} color={Colors.primary} />
            <Text style={styles.letterheadDate}>
              Parliament Hill, Ottawa — Week {gameState.currentWeek}
            </Text>
          </View>
        </View>

        {submitted ? (
          <View style={styles.submittedState}>
            <MaterialCommunityIcons name="check-circle" size={64} color={Colors.success} />
            <Text style={styles.submittedTitle}>Statement Distributed</Text>
            <Text style={styles.submittedText}>
              Your press statement has been sent to CBC News, Globe and Mail, Toronto Star, National Post, CTV News, and all major outlets.
            </Text>
            <View style={styles.statementPreview}>
              <Text style={styles.statementPreviewText}>{statement}</Text>
            </View>
            <Pressable
              onPress={() => { setSubmitted(false); setStatement(''); setTitle(''); }}
              style={({ pressed }) => [styles.newStatementBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.newStatementBtnText}>Issue Another Statement</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Templates */}
            <View style={styles.templatesSection}>
              <Text style={styles.sectionLabel}>QUICK TEMPLATES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.templatesRow}>
                  {STATEMENT_TEMPLATES.map(template => (
                    <Pressable
                      key={template.label}
                      onPress={() => handleUseTemplate(template.text)}
                      style={({ pressed }) => [styles.templateChip, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={styles.templateChipText}>{template.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Statement Input */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>STATEMENT TEXT</Text>
              <TextInput
                style={styles.statementInput}
                multiline
                numberOfLines={8}
                placeholder="Write your press statement here. Use clear, confident language that reflects your party's values and positions..."
                placeholderTextColor={Colors.textMuted}
                value={statement}
                onChangeText={setStatement}
                textAlignVertical="top"
              />
              <View style={styles.inputMeta}>
                <Text style={styles.charCount}>{statement.length} characters</Text>
                <Text style={[
                  styles.impactLabel,
                  statement.length > 200 ? { color: Colors.success } : { color: Colors.textMuted }
                ]}>
                  {statement.length > 200 ? '● High Impact' : statement.length > 100 ? '● Moderate Impact' : '● Low Impact'}
                </Text>
              </View>
            </View>

            {/* Media Tip */}
            <View style={styles.mediaTip}>
              <MaterialCommunityIcons name="lightbulb-outline" size={16} color={Colors.gold} />
              <Text style={styles.mediaTipText}>
                Tip: Longer, more detailed statements receive wider media coverage and have greater impact on your approval rating.
              </Text>
            </View>

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={!statement.trim()}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: party?.color || Colors.primary },
                !statement.trim() && { opacity: 0.4 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons name="send" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Release to Media</Text>
            </Pressable>
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
  letterhead: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderTopWidth: 3,
    padding: Spacing.md,
    gap: 8,
  },
  letterheadTop: {
    gap: 2,
  },
  letterheadParty: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  letterheadRole: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  letterheadBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  letterheadDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  templatesSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  templatesRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  templateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  templateChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  inputSection: {
    gap: 8,
  },
  statementInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 160,
    lineHeight: 24,
  },
  inputMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  charCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  impactLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  mediaTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.gold + '11',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gold + '22',
  },
  mediaTipText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  submitBtnText: {
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
  statementPreview: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    width: '100%',
  },
  statementPreviewText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  newStatementBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  newStatementBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
});
