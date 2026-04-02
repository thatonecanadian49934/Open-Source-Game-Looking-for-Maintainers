// Powered by OnSpace.AI — Create Bill with full text + sponsor selection
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
  'Justice', 'Defence', 'Immigration', 'Education', 'Infrastructure', 'Agriculture',
  'Technology', 'Fiscal Policy', 'Foreign Affairs', 'Indigenous Affairs',
];

const PORTFOLIOS = [
  'Finance', 'Foreign Affairs', 'Immigration', 'Public Safety', 'Defence',
  'Health', 'Environment', 'Justice', 'Treasury Board', 'Transport',
];

// AI MP names for sponsor selection
const DEFAULT_MP_NAMES = [
  'Dr. Angela Nguyen', 'Marcus Thompson', 'Claire Beaumont', 'James Okafor',
  'Patricia Williams', 'Robert Singh', 'Dr. Kevin Fraser', 'Amanda Crawford',
  'Thomas Bergeron', 'Lisa Park', 'William Tran', 'Diane Malik',
  'Hassan Fontaine', 'Jennifer Chen', 'Michael Santos', 'Anita Wilson',
  'David Lapointe', 'Rachel Kim', 'Steven Patel', 'Monica Leblanc',
];

export default function CreateBillScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, createBill, shadowCabinet } = useGame();
  const { showAlert } = useAlert();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fullText, setFullText] = useState('');
  const [topic, setTopic] = useState('');
  const [fiscalImpact, setFiscalImpact] = useState('');
  const [selectedSponsor, setSelectedSponsor] = useState('');
  const [customMPName, setCustomMPName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'fulltext'>('summary');

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const isGoverning = gameState.isGoverning;

  // Build sponsor list
  const getSponsorOptions = (): string[] => {
    if (isGoverning) {
      // Ministers from cabinet
      return gameState.cabinet.map(m => `${m.name} (Minister of ${m.portfolio})`);
    } else {
      // Shadow ministers or generic MP names
      const shadowNames = shadowCabinet.map(m => `${m.name} (Shadow ${m.portfolio})`);
      const genericMPs = DEFAULT_MP_NAMES.filter(n => !shadowCabinet.some(s => s.name === n)).slice(0, 8);
      return [...shadowNames, ...genericMPs];
    }
  };

  const sponsorOptions = getSponsorOptions();

  const handleCreate = () => {
    if (!title.trim() || !description.trim() || !topic) {
      showAlert('Incomplete Bill', 'Please fill in the title, summary, and select a policy area.');
      return;
    }

    let sponsor = customMPName.trim() || (selectedSponsor ? selectedSponsor.split(' (')[0] : '');
    let billType = isGoverning ? 'Government Bill' : "Private Member's Bill";

    if (isGoverning && !sponsor) {
      // PM didn't choose a minister — auto-assign random MP, becomes Private Member's Bill
      const randomMP = DEFAULT_MP_NAMES[Math.floor(Math.random() * DEFAULT_MP_NAMES.length)];
      sponsor = randomMP;
      billType = "Private Member's Bill";
    } else if (!isGoverning && !sponsor) {
      showAlert('No Sponsor', 'Select an MP or Shadow Minister. The Leader of the Opposition cannot directly sponsor bills.');
      return;
    }

    const billTitle = title.startsWith('Bill') || title.startsWith('Private')
      ? title
      : `Bill C-${Math.floor(Math.random() * 500) + 100}: ${title}`;

    const fullDescription = fullText.trim()
      ? `${description.trim()}\n\n--- BILL TEXT ---\n${fullText.trim()}`
      : description.trim();

    createBill(billTitle, fullDescription, topic, fiscalImpact.trim() || 'Fiscal impact TBD');

    const autoNote = isGoverning && !selectedSponsor && !customMPName.trim()
      ? `\n\nNo minister selected — automatically assigned to ${sponsor} as a Private Member's Bill.`
      : '';

    showAlert(
      'Bill Introduced',
      `${billType} "${billTitle}" has been introduced by ${sponsor} in the House of Commons at First Reading.${autoNote}`,
      [{ text: 'View in Parliament', onPress: () => router.replace('/(tabs)/parliament') }]
    );
    router.back();
  };

  const partyColor = party?.color || Colors.primary;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Draft Bill</Text>
          <Text style={styles.headerSub}>
            {isGoverning ? 'Government Bill — requires Minister sponsor' : "Private Member's Bill — requires MP sponsor"}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Note: PM/Opposition Leader cannot sponsor */}
      <View style={[styles.sponsorNote, { borderColor: partyColor + '33', backgroundColor: partyColor + '0D' }]}>
        <MaterialCommunityIcons name="information" size={13} color={partyColor} />
        <Text style={styles.sponsorNoteText}>
          {isGoverning
            ? 'Select a Cabinet Minister to sponsor this as a Government Bill. If no minister is chosen, a random MP will be auto-assigned and it becomes a Private Member\'s Bill.'
            : 'You must assign an MP or Shadow Minister. The Leader of the Opposition cannot personally sponsor bills.'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
                  topic === t && { backgroundColor: partyColor + '22', borderColor: partyColor },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={[styles.topicChipText, topic === t && { color: partyColor, fontWeight: FontWeight.bold }]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Summary / Full Text tabs */}
        <View style={styles.field}>
          <View style={styles.tabRow}>
            <Pressable
              onPress={() => setActiveTab('summary')}
              style={[styles.tabBtn, activeTab === 'summary' && [styles.tabBtnActive, { borderBottomColor: partyColor }]]}
            >
              <Text style={[styles.tabBtnText, activeTab === 'summary' && { color: partyColor, fontWeight: FontWeight.bold }]}>Bill Summary *</Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('fulltext')}
              style={[styles.tabBtn, activeTab === 'fulltext' && [styles.tabBtnActive, { borderBottomColor: partyColor }]]}
            >
              <Text style={[styles.tabBtnText, activeTab === 'fulltext' && { color: partyColor, fontWeight: FontWeight.bold }]}>Full Bill Text</Text>
            </Pressable>
          </View>

          {activeTab === 'summary' ? (
            <>
              <TextInput
                style={[styles.textArea, { minHeight: 120 }]}
                multiline
                placeholder="Describe what this bill will do, who it affects, and the key provisions. This appears in Parliament as the bill summary..."
                placeholderTextColor={Colors.textMuted}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />
              <Text style={styles.fieldHint}>{description.trim().split(/\s+/).filter(Boolean).length} words</Text>
            </>
          ) : (
            <>
              <TextInput
                style={[styles.textArea, { minHeight: 280, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12 }]}
                multiline
                placeholder={`BILL C-XXX\nAN ACT respecting [topic]

WHEREAS [preamble]...

Her Majesty, by and with the advice and consent of the Senate and House of Commons of Canada, enacts as follows:

SHORT TITLE
1. This Act may be cited as the [Name] Act.

INTERPRETATION
2. In this Act...

MAIN PROVISIONS
3. The Minister shall...

COMING INTO FORCE
4. This Act comes into force on [date]...`}
                placeholderTextColor={Colors.textMuted}
                value={fullText}
                onChangeText={setFullText}
                textAlignVertical="top"
              />
              <Text style={styles.fieldHint}>Full legislative text is optional but recommended for Private Members Bills</Text>
            </>
          )}
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

        {/* Sponsor Selection */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{isGoverning ? 'MINISTER SPONSOR *' : 'MP SPONSOR *'}</Text>
          <Text style={styles.fieldHint}>
            {isGoverning
              ? 'Select the Cabinet Minister who will introduce this government bill in the House'
              : 'Select the MP or Shadow Minister who will sponsor this Private Member\'s Bill'}
          </Text>

          <View style={styles.sponsorList}>
            {sponsorOptions.length > 0 ? sponsorOptions.map((name, idx) => {
              const isSelected = selectedSponsor === name;
              return (
                <Pressable
                  key={idx}
                  onPress={() => { setSelectedSponsor(name); setShowCustomInput(false); setCustomMPName(''); }}
                  style={({ pressed }) => [
                    styles.sponsorOption,
                    isSelected && [styles.sponsorOptionSelected, { borderColor: partyColor }],
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={isGoverning ? 'account-tie' : 'account'}
                    size={16}
                    color={isSelected ? partyColor : Colors.textSecondary}
                  />
                  <Text style={[styles.sponsorOptionText, isSelected && { color: partyColor, fontWeight: FontWeight.semibold }]}>
                    {name}
                  </Text>
                  {isSelected ? <MaterialCommunityIcons name="check-circle" size={14} color={partyColor} /> : null}
                </Pressable>
              );
            }) : (
              <View style={styles.noSponsorNote}>
                <MaterialCommunityIcons name="information" size={13} color={Colors.warning} />
                <Text style={styles.noSponsorText}>
                  {isGoverning
                    ? 'No ministers appointed yet. Go to Cabinet to appoint ministers first.'
                    : 'No shadow ministers appointed. You can still use a generic MP below.'}
                </Text>
              </View>
            )}

            {/* Custom MP name input */}
            <Pressable
              onPress={() => { setShowCustomInput(!showCustomInput); setSelectedSponsor(''); }}
              style={({ pressed }) => [
                styles.sponsorOption,
                showCustomInput && [styles.sponsorOptionSelected, { borderColor: Colors.gold }],
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons name="account-plus" size={16} color={showCustomInput ? Colors.gold : Colors.textMuted} />
              <Text style={[styles.sponsorOptionText, showCustomInput && { color: Colors.gold }]}>
                Enter a custom MP name...
              </Text>
            </Pressable>

            {showCustomInput ? (
              <TextInput
                style={styles.customNameInput}
                placeholder="Enter MP's full name (e.g., Maria Santos)"
                placeholderTextColor={Colors.textMuted}
                value={customMPName}
                onChangeText={setCustomMPName}
                autoFocus
              />
            ) : null}
          </View>

          {(selectedSponsor || customMPName.trim()) ? (
            <View style={styles.selectedSponsorCard}>
              <MaterialCommunityIcons name="check-circle" size={14} color={partyColor} />
              <Text style={[styles.selectedSponsorText, { color: partyColor }]}>
                Sponsor: {customMPName.trim() || selectedSponsor.split(' (')[0]}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Parliamentary Process Quick View */}
        <View style={styles.processInfo}>
          <Text style={styles.processTitleText}>Parliamentary Journey</Text>
          <View style={styles.pipelineRow}>
            {[
              { label: '1st\nReading', color: Colors.liberal },
              { label: '2nd\nReading', color: Colors.liberal },
              { label: 'Committee', color: Colors.liberal },
              { label: '3rd\nReading', color: Colors.liberal },
              { label: 'Senate\n3 Readings', color: Colors.info },
              { label: 'Royal\nAssent', color: Colors.gold },
            ].map((step, i) => (
              <React.Fragment key={i}>
                <View style={[styles.pipelineStep, { backgroundColor: step.color + '22', borderColor: step.color + '44' }]}>
                  <Text style={[styles.pipelineStepText, { color: step.color }]}>{step.label}</Text>
                </View>
                {i < 5 ? <MaterialCommunityIcons name="arrow-right" size={9} color={Colors.textMuted} /> : null}
              </React.Fragment>
            ))}
          </View>
          <Text style={styles.processNote}>Default 6 weeks per stage. {isGoverning ? 'As PM, you can invoke closure to force a vote.' : 'Government can accelerate any bill.'}</Text>
        </View>

        <Pressable
          onPress={handleCreate}
          style={({ pressed }) => [
            styles.createBtn,
            { backgroundColor: partyColor },
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },
  sponsorNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: 1 },
  sponsorNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  content: { padding: Spacing.md, gap: Spacing.md },
  field: { gap: 8 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  input: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.sm, color: Colors.textPrimary },
  fieldHint: { fontSize: FontSize.xs, color: Colors.textMuted },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder, backgroundColor: Colors.surfaceElevated },
  topicChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, marginBottom: 8 },
  tabBtn: { paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: {},
  tabBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  textArea: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22 },
  sponsorList: { gap: 6 },
  sponsorOption: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm },
  sponsorOptionSelected: { borderWidth: 1.5 },
  sponsorOptionText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  noSponsorNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.warning + '0D', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.warning + '22' },
  noSponsorText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, lineHeight: 17 },
  customNameInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.gold + '55', paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: FontSize.sm, color: Colors.textPrimary },
  selectedSponsorCard: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.success + '0D', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.success + '22' },
  selectedSponsorText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  processInfo: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  processTitleText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  pipelineRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 3 },
  pipelineStep: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1 },
  pipelineStepText: { fontSize: 8, fontWeight: FontWeight.bold, textAlign: 'center', lineHeight: 12 },
  processNote: { fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic' },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  createBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
});
