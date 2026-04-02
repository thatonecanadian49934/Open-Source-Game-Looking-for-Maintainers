// Powered by OnSpace.AI
// Shadow minister assignment + minister directive screens in one file
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
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

// ── Portfolios ────────────────────────────────────────────────────────────────
const PORTFOLIOS = [
  { portfolio: 'Finance', icon: 'bank', color: Colors.success },
  { portfolio: 'Foreign Affairs', icon: 'earth', color: Colors.info },
  { portfolio: 'Immigration', icon: 'account-arrow-right', color: Colors.warning },
  { portfolio: 'Public Safety', icon: 'shield', color: Colors.error },
  { portfolio: 'Defence', icon: 'sword', color: '#8B5CF6' },
  { portfolio: 'Health', icon: 'hospital-box', color: Colors.success },
  { portfolio: 'Environment', icon: 'leaf', color: Colors.green },
  { portfolio: 'Justice', icon: 'scale-balance', color: Colors.gold },
  { portfolio: 'Treasury Board', icon: 'cash-multiple', color: Colors.warning },
  { portfolio: 'Transport', icon: 'train', color: Colors.info },
];

const SHADOW_NAMES = [
  'Dr. Angela Nguyen', 'Marcus Thompson', 'Claire Beaumont', 'James Okafor',
  'Patricia Williams', 'Robert Singh', 'Dr. Kevin Fraser', 'Amanda Crawford',
  'Thomas Bergeron', 'Lisa Park', 'William Tran', 'Diane Malik',
  'Hassan Fontaine', 'Jennifer Chen', 'Michael Santos', 'Anita Wilson',
];

type CabinetMode = 'governing' | 'shadow';
type DirectiveType = 'research' | 'critique' | 'bill' | 'project';

interface DirectiveTask {
  portfolioIndex: number;
  type: DirectiveType;
  description: string;
  result?: string;
  loading?: boolean;
}

export default function CabinetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    gameState, shadowCabinet,
    appointMinister, fireMinister, instructMinister,
    appointShadowMinister, removeShadowMinister,
    createBill,
  } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [activeTask, setActiveTask] = useState<DirectiveTask | null>(null);
  const [taskInput, setTaskInput] = useState('');
  const [taskResult, setTaskResult] = useState<string | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [selectedPortfolioIdx, setSelectedPortfolioIdx] = useState<number | null>(null);
  const [appointName, setAppointName] = useState('');
  const [appointingIdx, setAppointingIdx] = useState<number | null>(null);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const isGoverning = gameState.isGoverning;

  const getMinister = (portfolio: string) =>
    gameState.cabinet.find(m => m.portfolio === portfolio);

  const getShadowMinister = (portfolio: string) =>
    shadowCabinet.find(m => m.portfolio === portfolio);

  const handleGoverningDirective = async (portfolioIdx: number, type: 'project' | 'bill', task: string) => {
    const portfolio = PORTFOLIOS[portfolioIdx];
    const minister = getMinister(portfolio.portfolio);
    if (!minister) {
      showAlert('No Minister', `Appoint a minister to ${portfolio.portfolio} before assigning directives.`);
      return;
    }

    setLoadingTask(true);
    setActiveTask({ portfolioIndex: portfolioIdx, type, description: task });

    if (type === 'bill') {
      // AI generate a government bill
      try {
        const { data, error } = await supabase.functions.invoke('ai-question-period', {
          body: {
            partyName: party?.name,
            leaderName: minister.name,
            isGoverning: true,
            stats: gameState.stats,
            currentEvents: [],
            rivals: [],
            weekNumber: gameState.currentWeek,
            parliamentNumber: gameState.parliamentNumber,
            recentNewsHeadlines: [],
            requestType: 'bill_generation',
            portfolio: portfolio.portfolio,
            billDirective: task,
          },
        });

        const billTitle = `Bill C-${100 + Math.floor(Math.random() * 200)}: ${portfolio.portfolio} Reform Act`;
        const billDesc = data?.billDescription ||
          `A government bill introduced by ${minister.name}, Minister of ${portfolio.portfolio}, implementing ${task.substring(0, 100)}.`;
        createBill(billTitle, billDesc, portfolio.portfolio, 'To be determined');
        setTaskResult(`Bill generated: "${billTitle}"\n\nIntroduced by Minister ${minister.name}. The bill is now in House 1st Reading.`);
      } catch {
        const billTitle = `Bill C-${100 + Math.floor(Math.random() * 200)}: ${portfolio.portfolio} Reform Act`;
        createBill(billTitle, `Government bill on ${task.substring(0, 80)}.`, portfolio.portfolio, 'To be determined');
        setTaskResult(`Government bill drafted by Minister ${minister.name} and introduced to the House.`);
      }
    } else {
      // Project directive
      instructMinister(portfolio.portfolio, task);
      const outcomes = [
        `Minister ${minister.name} has launched a ${portfolio.portfolio} initiative: "${task.substring(0, 60)}". Early stakeholder consultations are underway.`,
        `Minister ${minister.name} has directed department officials to begin work on your instruction. A progress report is expected within 4 weeks.`,
        `The ${portfolio.portfolio} department has mobilized resources in response to your directive. Media coverage is already emerging.`,
      ];
      setTaskResult(outcomes[Math.floor(Math.random() * outcomes.length)]);
    }
    setLoadingTask(false);
  };

  const handleShadowDirective = async (portfolioIdx: number, type: 'research' | 'critique' | 'bill', task: string) => {
    const portfolio = PORTFOLIOS[portfolioIdx];
    const shadow = getShadowMinister(portfolio.portfolio);
    if (!shadow) {
      showAlert('No Shadow Minister', `Appoint a shadow minister for ${portfolio.portfolio} first.`);
      return;
    }

    setLoadingTask(true);
    setActiveTask({ portfolioIndex: portfolioIdx, type, description: task });

    if (type === 'bill') {
      // AI generate a Private Members Bill
      try {
        const { data, error } = await supabase.functions.invoke('ai-question-period', {
          body: {
            partyName: party?.name,
            leaderName: shadow.name,
            isGoverning: false,
            stats: gameState.stats,
            currentEvents: [],
            rivals: [],
            weekNumber: gameState.currentWeek,
            parliamentNumber: gameState.parliamentNumber,
            recentNewsHeadlines: [],
            requestType: 'private_bill_generation',
            portfolio: portfolio.portfolio,
            billDirective: task,
          },
        });

        const billNumber = 200 + Math.floor(Math.random() * 200);
        const billTitle = `Private Members Bill C-${billNumber}: ${portfolio.portfolio.split(' ')[0]} Action Act`;
        const billDesc = data?.billDescription ||
          `A private member's bill sponsored by ${shadow.name}, Shadow Minister for ${portfolio.portfolio}, proposing ${task.substring(0, 100)}.`;
        createBill(billTitle, billDesc, portfolio.portfolio, 'Fiscal impact to be costed');
        setTaskResult(`Private Member's Bill created: "${billTitle}"\n\nSponsored by ${shadow.name}. The bill is now in House 1st Reading.`);
      } catch {
        const billNumber = 200 + Math.floor(Math.random() * 200);
        const billTitle = `Private Members Bill C-${billNumber}: ${portfolio.portfolio.split(' ')[0]} Action Act`;
        createBill(billTitle, `Opposition private member's bill on ${task.substring(0, 80)}.`, portfolio.portfolio, 'To be costed');
        setTaskResult(`Private Member's Bill drafted by Shadow Minister ${shadow.name} and introduced to the House.`);
      }
    } else {
      // Research or critique
      const researchResults = {
        research: [
          `Shadow Minister ${shadow.name} has completed research on ${portfolio.portfolio}: "${task.substring(0, 60)}". Key findings: government spending in this area has increased 23% while outcomes deteriorate. Three specific policy failures identified for Question Period use.`,
          `${shadow.name}'s research reveals significant gaps in the government's ${portfolio.portfolio} record. Detailed briefing prepared for caucus, with 5 priority attack lines ready for parliamentary questions.`,
        ],
        critique: [
          `${shadow.name} has prepared a detailed critique of the government's ${portfolio.portfolio} agenda on "${task.substring(0, 60)}". Opposition day motion drafted, press release ready, and NDP support sounded out.`,
          `Shadow Critic ${shadow.name} has produced a comprehensive counter-position on ${task.substring(0, 60)}. The critique identifies three broken promises, two cost overruns, and one under-reported failure. Media lock-up scheduled.`,
        ],
      };
      const pool = researchResults[type];
      setTaskResult(pool[Math.floor(Math.random() * pool.length)]);
    }
    setLoadingTask(false);
  };

  const renderPortfolioCard = (portfolioMeta: typeof PORTFOLIOS[0], idx: number) => {
    const minister = getMinister(portfolioMeta.portfolio);
    const shadow = getShadowMinister(portfolioMeta.portfolio);
    const isSelected = selectedPortfolioIdx === idx;
    const person = isGoverning ? minister : shadow;

    return (
      <Pressable
        key={portfolioMeta.portfolio}
        onPress={() => setSelectedPortfolioIdx(isSelected ? null : idx)}
        style={({ pressed }) => [
          styles.portfolioCard,
          isSelected && [styles.portfolioCardSelected, { borderColor: portfolioMeta.color }],
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={[styles.portfolioIcon, { backgroundColor: portfolioMeta.color + '22' }]}>
          <MaterialCommunityIcons name={portfolioMeta.icon as any} size={22} color={portfolioMeta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.portfolioName}>{portfolioMeta.portfolio}</Text>
          {person ? (
            <Text style={[styles.portfolioMinister, { color: portfolioMeta.color }]}>
              {isGoverning ? '' : 'Shadow: '}{person.name}
            </Text>
          ) : (
            <Text style={styles.portfolioVacant}>
              {isGoverning ? 'Vacant — appoint minister' : 'Unassigned — appoint shadow critic'}
            </Text>
          )}
          {person ? (
            <View style={styles.portfolioStats}>
              <View style={styles.portfolioStatRow}>
                <Text style={styles.portfolioStatLabel}>Loyalty</Text>
                <View style={styles.portfolioStatBar}>
                  <View style={[styles.portfolioStatFill, { flex: person.loyalty, backgroundColor: person.loyalty > 70 ? Colors.success : Colors.warning }]} />
                  <View style={{ flex: 100 - person.loyalty }} />
                </View>
                <Text style={styles.portfolioStatNum}>{person.loyalty}</Text>
              </View>
              <View style={styles.portfolioStatRow}>
                <Text style={styles.portfolioStatLabel}>Competence</Text>
                <View style={styles.portfolioStatBar}>
                  <View style={[styles.portfolioStatFill, { flex: person.competence, backgroundColor: person.competence > 70 ? Colors.success : Colors.warning }]} />
                  <View style={{ flex: 100 - person.competence }} />
                </View>
                <Text style={styles.portfolioStatNum}>{person.competence}</Text>
              </View>
            </View>
          ) : null}
        </View>
        <MaterialCommunityIcons
          name={isSelected ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.textMuted}
        />
      </Pressable>
    );
  };

  const renderPortfolioActions = (portfolioMeta: typeof PORTFOLIOS[0], idx: number) => {
    const minister = getMinister(portfolioMeta.portfolio);
    const shadow = getShadowMinister(portfolioMeta.portfolio);
    const person = isGoverning ? minister : shadow;
    const isAppointing = appointingIdx === idx;

    if (isAppointing) {
      return (
        <View style={styles.appointPanel}>
          <Text style={styles.appointTitle}>
            {isGoverning ? 'Appoint Minister of' : 'Appoint Shadow Critic for'} {portfolioMeta.portfolio}
          </Text>
          <TextInput
            style={styles.appointInput}
            placeholder="Enter name or leave blank for random appointment"
            placeholderTextColor={Colors.textMuted}
            value={appointName}
            onChangeText={setAppointName}
          />
          <View style={styles.appointSuggestions}>
            {SHADOW_NAMES.slice(idx * 2, idx * 2 + 3).map(name => (
              <Pressable key={name} onPress={() => setAppointName(name)} style={styles.appointSuggestion}>
                <Text style={styles.appointSuggestionText}>{name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.appointActions}>
            <Pressable onPress={() => setAppointingIdx(null)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const name = appointName.trim() || SHADOW_NAMES[Math.floor(Math.random() * SHADOW_NAMES.length)];
                if (isGoverning) {
                  appointMinister(portfolioMeta.portfolio, name);
                } else {
                  appointShadowMinister(portfolioMeta.portfolio, name);
                }
                setAppointingIdx(null);
                setAppointName('');
              }}
              style={[styles.confirmBtn, { backgroundColor: portfolioMeta.color }]}
            >
              <Text style={styles.confirmBtnText}>Appoint</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (!person) {
      return (
        <View style={styles.vacantActions}>
          <Pressable
            onPress={() => setAppointingIdx(idx)}
            style={[styles.appointBtn, { borderColor: portfolioMeta.color + '55' }]}
          >
            <MaterialCommunityIcons name="account-plus" size={16} color={portfolioMeta.color} />
            <Text style={[styles.appointBtnText, { color: portfolioMeta.color }]}>
              {isGoverning ? 'Appoint Minister' : 'Appoint Shadow Critic'}
            </Text>
          </Pressable>
        </View>
      );
    }

    // Person appointed — show directives
    if (activeTask?.portfolioIndex === idx) {
      if (loadingTask) {
        return (
          <View style={styles.taskLoadingPanel}>
            <ActivityIndicator size="small" color={portfolioMeta.color} />
            <Text style={[styles.taskLoadingText, { color: portfolioMeta.color }]}>
              {isGoverning ? `Minister ${person.name} working on directive...` : `${person.name} conducting research...`}
            </Text>
          </View>
        );
      }
      if (taskResult) {
        return (
          <View style={[styles.taskResultPanel, { borderColor: portfolioMeta.color + '44' }]}>
            <View style={styles.taskResultHeader}>
              <MaterialCommunityIcons name="check-circle" size={16} color={portfolioMeta.color} />
              <Text style={[styles.taskResultTitle, { color: portfolioMeta.color }]}>
                {activeTask.type === 'bill' ? 'Bill Introduced' : activeTask.type === 'project' ? 'Project Launched' : 'Research Complete'}
              </Text>
            </View>
            <Text style={styles.taskResultText}>{taskResult}</Text>
            <Pressable
              onPress={() => { setActiveTask(null); setTaskResult(null); setTaskInput(''); }}
              style={styles.taskResultClose}
            >
              <Text style={styles.taskResultCloseText}>Close</Text>
            </Pressable>
          </View>
        );
      }
    }

    return (
      <View style={styles.directivesPanel}>
        <Text style={styles.directivesTitle}>
          {isGoverning ? `DIRECT ${person.name.split(' ').pop()?.toUpperCase()}` : `ASSIGN ${person.name.split(' ').pop()?.toUpperCase()}`}
        </Text>
        <TextInput
          style={styles.directiveInput}
          placeholder={isGoverning
            ? `Give ${person.name} a specific directive (e.g., "Develop a new housing affordability strategy", "Propose emergency healthcare funding")`
            : `Assign ${person.name} a task (e.g., "Research government housing failures", "Critique carbon tax impact on seniors", "Sponsor a childcare bill")`}
          placeholderTextColor={Colors.textMuted}
          value={activeTask?.portfolioIndex === idx ? taskInput : ''}
          onChangeText={text => {
            setTaskInput(text);
            if (!activeTask || activeTask.portfolioIndex !== idx) {
              setActiveTask({ portfolioIndex: idx, type: isGoverning ? 'project' : 'research', description: text });
            }
          }}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Action buttons */}
        {isGoverning ? (
          <View style={styles.directiveActions}>
            <Pressable
              onPress={() => taskInput.trim() && handleGoverningDirective(idx, 'project', taskInput)}
              disabled={!taskInput.trim() || loadingTask}
              style={({ pressed }) => [styles.directiveBtn, { borderColor: portfolioMeta.color + '55' }, !taskInput.trim() && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
            >
              <MaterialCommunityIcons name="briefcase-plus" size={14} color={portfolioMeta.color} />
              <Text style={[styles.directiveBtnText, { color: portfolioMeta.color }]}>Launch Project</Text>
            </Pressable>
            <Pressable
              onPress={() => taskInput.trim() && handleGoverningDirective(idx, 'bill', taskInput)}
              disabled={!taskInput.trim() || loadingTask}
              style={({ pressed }) => [styles.directiveBtn, { borderColor: Colors.gold + '55', backgroundColor: Colors.gold + '0D' }, !taskInput.trim() && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
            >
              <MaterialCommunityIcons name="gavel" size={14} color={Colors.gold} />
              <Text style={[styles.directiveBtnText, { color: Colors.gold }]}>Propose Gov Bill</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.directiveActions}>
            <Pressable
              onPress={() => taskInput.trim() && handleShadowDirective(idx, 'research', taskInput)}
              disabled={!taskInput.trim() || loadingTask}
              style={({ pressed }) => [styles.directiveBtn, { borderColor: Colors.info + '55' }, !taskInput.trim() && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
            >
              <MaterialCommunityIcons name="magnify" size={14} color={Colors.info} />
              <Text style={[styles.directiveBtnText, { color: Colors.info }]}>Research Policy</Text>
            </Pressable>
            <Pressable
              onPress={() => taskInput.trim() && handleShadowDirective(idx, 'critique', taskInput)}
              disabled={!taskInput.trim() || loadingTask}
              style={({ pressed }) => [styles.directiveBtn, { borderColor: Colors.error + '55' }, !taskInput.trim() && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
            >
              <MaterialCommunityIcons name="alert-circle" size={14} color={Colors.error} />
              <Text style={[styles.directiveBtnText, { color: Colors.error }]}>Critique Government</Text>
            </Pressable>
            <Pressable
              onPress={() => taskInput.trim() && handleShadowDirective(idx, 'bill', taskInput)}
              disabled={!taskInput.trim() || loadingTask}
              style={({ pressed }) => [styles.directiveBtn, { borderColor: Colors.gold + '55', backgroundColor: Colors.gold + '0D' }, !taskInput.trim() && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
            >
              <MaterialCommunityIcons name="gavel" size={14} color={Colors.gold} />
              <Text style={[styles.directiveBtnText, { color: Colors.gold }]}>Sponsor PMB</Text>
            </Pressable>
          </View>
        )}

        {/* Fire/remove button */}
        <Pressable
          onPress={() => showAlert(
            `Remove ${person.name}?`,
            `${person.name} will be removed from the ${portfolioMeta.portfolio} portfolio.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove', style: 'destructive',
                onPress: () => {
                  if (isGoverning) fireMinister(portfolioMeta.portfolio);
                  else removeShadowMinister(portfolioMeta.portfolio);
                },
              },
            ]
          )}
          style={styles.removeBtn}
        >
          <MaterialCommunityIcons name="account-remove" size={12} color={Colors.error} />
          <Text style={styles.removeBtnText}>Remove {isGoverning ? 'Minister' : 'Shadow Critic'}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: partyColor + '44' }]}>
        <View>
          <Text style={styles.headerTitle}>
            {isGoverning ? 'Cabinet' : 'Shadow Cabinet'}
          </Text>
          <Text style={styles.headerSub}>
            {isGoverning
              ? `Prime Minister ${gameState.playerName} — ${gameState.cabinet.length}/${PORTFOLIOS.length} portfolios filled`
              : `${party?.shortName} Shadow Cabinet — ${shadowCabinet.length}/${PORTFOLIOS.length} critics appointed`}
          </Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: isGoverning ? Colors.liberal + '22' : Colors.conservative + '22' }]}>
          <MaterialCommunityIcons
            name={isGoverning ? 'crown' : 'account-group'}
            size={14}
            color={isGoverning ? Colors.liberal : Colors.conservative}
          />
          <Text style={[styles.roleBadgeText, { color: isGoverning ? Colors.liberal : Colors.conservative }]}>
            {isGoverning ? 'GOVERNMENT' : 'OPPOSITION'}
          </Text>
        </View>
      </View>

      {/* PM/Opposition note */}
      <View style={[styles.noteBanner, { backgroundColor: partyColor + '0D', borderColor: partyColor + '22' }]}>
        <MaterialCommunityIcons name="information" size={13} color={partyColor} />
        <Text style={styles.noteText}>
          {isGoverning
            ? 'As Prime Minister, direct ministers to launch projects or propose government bills. Note: You cannot personally sponsor bills — ministers must do so.'
            : 'As Leader of the Opposition, assign shadow critics to research policies, critique the government, or sponsor Private Members Bills. You cannot personally sponsor bills.'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {PORTFOLIOS.map((p, idx) => (
          <View key={p.portfolio} style={styles.portfolioSection}>
            {renderPortfolioCard(p, idx)}
            {selectedPortfolioIdx === idx ? renderPortfolioActions(p, idx) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
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
    backgroundColor: Colors.surface,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  roleBadgeText: { fontSize: 9, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },
  noteBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  noteText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  content: { padding: Spacing.md, gap: Spacing.xs },

  portfolioSection: { marginBottom: 4 },
  portfolioCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  portfolioCardSelected: { borderWidth: 2, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  portfolioIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  portfolioName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  portfolioMinister: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginTop: 2 },
  portfolioVacant: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  portfolioStats: { marginTop: 6, gap: 4 },
  portfolioStatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  portfolioStatLabel: { fontSize: 9, color: Colors.textMuted, width: 56 },
  portfolioStatBar: { flex: 1, height: 4, flexDirection: 'row', borderRadius: 2, overflow: 'hidden', backgroundColor: Colors.surfaceBorder },
  portfolioStatFill: { minWidth: 2 },
  portfolioStatNum: { fontSize: 9, color: Colors.textMuted, width: 20, textAlign: 'right' },

  // Appoint panel
  appointPanel: {
    backgroundColor: Colors.surfaceElevated,
    borderTopWidth: 0,
    borderRadius: Radius.md,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  appointTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  appointInput: { backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: FontSize.sm, color: Colors.textPrimary },
  appointSuggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  appointSuggestion: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.surfaceBorder },
  appointSuggestionText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  appointActions: { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  cancelBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  confirmBtn: { flex: 2, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.sm },
  confirmBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },

  // Vacant
  vacantActions: { backgroundColor: Colors.surfaceElevated, borderTopWidth: 0, borderRadius: Radius.md, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  appointBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1 },
  appointBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  // Directives panel
  directivesPanel: {
    backgroundColor: Colors.surfaceElevated,
    borderTopWidth: 0,
    borderRadius: Radius.md,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  directivesTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  directiveInput: {
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 80,
    lineHeight: 20,
  },
  directiveActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  directiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    backgroundColor: Colors.card,
  },
  directiveBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeBtnText: { fontSize: FontSize.xs, color: Colors.error },

  // Task loading / result
  taskLoadingPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceElevated,
    borderTopWidth: 0,
    borderRadius: Radius.md,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  taskLoadingText: { fontSize: FontSize.xs, fontStyle: 'italic' },
  taskResultPanel: {
    backgroundColor: Colors.card,
    borderTopWidth: 0,
    borderRadius: Radius.md,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  taskResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskResultTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  taskResultText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 20 },
  taskResultClose: { alignItems: 'center', paddingVertical: 6, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  taskResultCloseText: { fontSize: FontSize.xs, color: Colors.textMuted },
});
