// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';

type ScheduleWeek = {
  week: number;
  label: string;
  type: 'sitting' | 'recess' | 'emergency' | 'budget' | 'qp' | 'debate';
  bills: string[];
  priority?: 'government' | 'opposition' | 'private_member';
  notes?: string;
};

type ScheduleView = 'calendar' | 'agenda' | 'motions';

const SESSION_TYPES = [
  { id: 'sitting', label: 'Regular Sitting', icon: 'gavel', color: Colors.info },
  { id: 'recess', label: 'Parliamentary Recess', icon: 'beach', color: Colors.textMuted },
  { id: 'emergency', label: 'Emergency Session', icon: 'alert', color: Colors.error },
  { id: 'budget', label: 'Budget Day', icon: 'cash-multiple', color: Colors.gold },
  { id: 'qp', label: 'Question Period', icon: 'account-voice', color: Colors.warning },
  { id: 'debate', label: 'Opposition Day', icon: 'account-group', color: Colors.conservative },
];

export default function ParliamentaryScheduleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, bills, scheduleSession, callEmergencySession, callOppositionDay } = useGame();
  const { showAlert } = useAlert();

  const [view, setView] = useState<ScheduleView>('calendar');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const isGoverning = gameState.isGoverning;
  const currentWeek = gameState.currentWeek;

  // Build schedule around current week
  const scheduleWeeks: ScheduleWeek[] = [];
  for (let i = 0; i < 12; i++) {
    const w = currentWeek + i;
    const isRecess = (w % 12 >= 5 && w % 12 <= 7); // Summer/Christmas recess simulation
    const isBudget = w % 52 === 10;
    const week: ScheduleWeek = {
      week: w,
      label: `Week ${w}`,
      type: isRecess ? 'recess' : isBudget ? 'budget' : i === 0 ? 'qp' : 'sitting',
      bills: bills
        .filter(b => !b.passed && b.stage !== 'defeated' && b.stage !== 'royal_assent')
        .slice(0, 3)
        .map(b => b.title),
      priority: isGoverning ? 'government' : 'opposition',
      notes: isBudget ? 'Budget presentation to the House' : isRecess ? 'Parliament not in session' : undefined,
    };
    scheduleWeeks.push(week);
  }

  const activeBills = bills.filter(b => !b.passed && b.stage !== 'defeated' && b.stage !== 'royal_assent');
  const governmentBills = activeBills.filter(b => b.type === 'government');
  const privateBills = activeBills.filter(b => b.type === 'private_member');
  const oppositionBills = activeBills.filter(b => b.type === 'opposition');

  const handleCallEmergency = () => {
    if (!isGoverning) return;
    showAlert(
      'Call Emergency Session?',
      'An emergency session recalls Parliament immediately outside of normal hours. This is typically reserved for national crises.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Emergency Session',
          style: 'destructive',
          onPress: () => {
            callEmergencySession?.();
            showAlert('Emergency Session Called', 'Parliament will convene within 48 hours. All MPs have been recalled.');
          },
        },
      ]
    );
  };

  const handleCallOppositionDay = () => {
    if (isGoverning) return;
    showAlert(
      'Use Opposition Day?',
      'Opposition Days allow the Official Opposition to set the parliamentary agenda and debate a motion of their choosing. Your party is entitled to several per session.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Schedule Opposition Day',
          onPress: () => {
            callOppositionDay?.();
            showAlert('Opposition Day Scheduled', 'Your party will control the parliamentary agenda this week. Choose your debate topic wisely.');
          },
        },
      ]
    );
  };

  const handleScheduleRecess = () => {
    if (!isGoverning) return;
    showAlert(
      'Declare Parliamentary Recess?',
      'A recess suspends parliamentary business. This can be useful for allowing the government time to prepare legislation, but gives the opposition an opportunity to criticize you for avoiding scrutiny.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Schedule Recess',
          onPress: () => {
            scheduleSession?.('recess');
            showAlert('Recess Scheduled', 'Parliament will be in recess next week. Opposition parties have called this politically motivated.');
          },
        },
      ]
    );
  };

  const typeConfig = (type: string) => SESSION_TYPES.find(t => t.id === type) || SESSION_TYPES[0];

  const tabs: { id: ScheduleView; label: string; icon: string }[] = [
    { id: 'calendar', label: 'Calendar', icon: 'calendar-month' },
    { id: 'agenda', label: 'Agenda', icon: 'format-list-bulleted' },
    { id: 'motions', label: 'Motions', icon: 'vote' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Parliamentary Schedule</Text>
          <Text style={styles.headerSub}>House of Commons — {45 + gameState.parliamentNumber - 44}th Parliament</Text>
        </View>
        <View style={[styles.sessionBadge, { backgroundColor: gameState.parliamentInSession ? Colors.success + '22' : Colors.error + '22' }]}>
          <View style={[styles.sessionDot, { backgroundColor: gameState.parliamentInSession ? Colors.success : Colors.error }]} />
          <Text style={[styles.sessionText, { color: gameState.parliamentInSession ? Colors.success : Colors.error }]}>
            {gameState.parliamentInSession ? 'IN SESSION' : 'IN RECESS'}
          </Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <Pressable
            key={tab.id}
            onPress={() => setView(tab.id)}
            style={[styles.tab, view === tab.id && [styles.tabActive, { borderBottomColor: partyColor }]]}
          >
            <MaterialCommunityIcons name={tab.icon as any} size={14} color={view === tab.id ? partyColor : Colors.textMuted} />
            <Text style={[styles.tabText, view === tab.id && { color: partyColor, fontWeight: FontWeight.bold }]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* CALENDAR VIEW */}
        {view === 'calendar' ? (
          <View style={styles.calendarSection}>
            {/* Quick actions */}
            <View style={styles.quickActions}>
              {isGoverning ? (
                <>
                  <Pressable onPress={handleCallEmergency} style={({ pressed }) => [styles.quickBtn, { borderColor: Colors.error + '55' }, pressed && { opacity: 0.8 }]}>
                    <MaterialCommunityIcons name="alert" size={14} color={Colors.error} />
                    <Text style={[styles.quickBtnText, { color: Colors.error }]}>Emergency Session</Text>
                  </Pressable>
                  <Pressable onPress={handleScheduleRecess} style={({ pressed }) => [styles.quickBtn, { borderColor: Colors.textMuted + '55' }, pressed && { opacity: 0.8 }]}>
                    <MaterialCommunityIcons name="calendar-remove" size={14} color={Colors.textMuted} />
                    <Text style={[styles.quickBtnText, { color: Colors.textMuted }]}>Schedule Recess</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={handleCallOppositionDay} style={({ pressed }) => [styles.quickBtn, { borderColor: partyColor + '55', backgroundColor: partyColor + '11' }, pressed && { opacity: 0.8 }]}>
                  <MaterialCommunityIcons name="account-group" size={14} color={partyColor} />
                  <Text style={[styles.quickBtnText, { color: partyColor }]}>Schedule Opposition Day</Text>
                </Pressable>
              )}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              {SESSION_TYPES.slice(0, 4).map(t => (
                <View key={t.id} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: t.color }]} />
                  <Text style={styles.legendText}>{t.label}</Text>
                </View>
              ))}
            </View>

            {/* 12-week grid */}
            <View style={styles.weekGrid}>
              {scheduleWeeks.map(week => {
                const tc = typeConfig(week.type);
                const isCurrent = week.week === currentWeek;
                const isSelected = selectedWeek === week.week;
                return (
                  <Pressable
                    key={week.week}
                    onPress={() => setSelectedWeek(isSelected ? null : week.week)}
                    style={({ pressed }) => [
                      styles.weekCell,
                      { borderColor: tc.color + '44' },
                      isCurrent && { borderColor: partyColor, borderWidth: 2 },
                      isSelected && { backgroundColor: tc.color + '11' },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View style={[styles.weekCellTop, { backgroundColor: tc.color + '22' }]}>
                      <MaterialCommunityIcons name={tc.icon as any} size={14} color={tc.color} />
                      {isCurrent ? <View style={[styles.currentDot, { backgroundColor: partyColor }]} /> : null}
                    </View>
                    <Text style={styles.weekLabel}>Wk {week.week}</Text>
                    <Text style={[styles.weekType, { color: tc.color }]} numberOfLines={2}>{tc.label}</Text>
                    {week.notes ? <Text style={styles.weekNotes} numberOfLines={1}>{week.notes}</Text> : null}
                  </Pressable>
                );
              })}
            </View>

            {/* Week detail */}
            {selectedWeek ? (
              <View style={styles.weekDetail}>
                {(() => {
                  const week = scheduleWeeks.find(w => w.week === selectedWeek);
                  if (!week) return null;
                  const tc = typeConfig(week.type);
                  return (
                    <>
                      <View style={[styles.weekDetailHeader, { borderLeftColor: tc.color }]}>
                        <MaterialCommunityIcons name={tc.icon as any} size={18} color={tc.color} />
                        <View>
                          <Text style={[styles.weekDetailTitle, { color: tc.color }]}>Week {week.week} — {tc.label}</Text>
                          {week.notes ? <Text style={styles.weekDetailNote}>{week.notes}</Text> : null}
                        </View>
                      </View>
                      {week.bills.length > 0 ? (
                        <View style={styles.weekDetailBills}>
                          <Text style={styles.weekDetailBillsTitle}>BILLS SCHEDULED FOR DEBATE</Text>
                          {week.bills.map((b, i) => (
                            <View key={i} style={styles.weekDetailBillRow}>
                              <MaterialCommunityIcons name="file-document" size={11} color={Colors.textMuted} />
                              <Text style={styles.weekDetailBillText} numberOfLines={2}>{b}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.weekDetailNote}>No bills scheduled for this period.</Text>
                      )}
                    </>
                  );
                })()}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* AGENDA VIEW */}
        {view === 'agenda' ? (
          <View style={styles.agendaSection}>
            <View style={styles.agendaNote}>
              <MaterialCommunityIcons name="information" size={13} color={Colors.info} />
              <Text style={styles.agendaNoteText}>
                {isGoverning
                  ? 'As the governing party, you control the parliamentary agenda. Prioritize government bills and use closure to accelerate key legislation.'
                  : 'As the Official Opposition, you can use Opposition Days and procedural tools to delay government business and highlight your priorities.'}
              </Text>
            </View>

            {/* Government bills */}
            {governmentBills.length > 0 ? (
              <View style={styles.agendaGroup}>
                <View style={styles.agendaGroupHeader}>
                  <View style={[styles.agendaGroupDot, { backgroundColor: Colors.liberal }]} />
                  <Text style={styles.agendaGroupTitle}>GOVERNMENT BILLS ({governmentBills.length})</Text>
                </View>
                {governmentBills.map(bill => (
                  <View key={bill.id} style={styles.agendaBillRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.agendaBillTitle} numberOfLines={2}>{bill.title}</Text>
                      <Text style={styles.agendaBillStage}>{bill.stage.replace(/_/g, ' ').toUpperCase()}</Text>
                    </View>
                    <View style={styles.agendaBillWeeks}>
                      <MaterialCommunityIcons name="clock-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.agendaBillWeeksText}>{bill.stageWeeksRemaining}w</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Private member bills */}
            {privateBills.length > 0 ? (
              <View style={styles.agendaGroup}>
                <View style={styles.agendaGroupHeader}>
                  <View style={[styles.agendaGroupDot, { backgroundColor: Colors.gold }]} />
                  <Text style={styles.agendaGroupTitle}>PRIVATE MEMBER BILLS ({privateBills.length})</Text>
                </View>
                {privateBills.map(bill => (
                  <View key={bill.id} style={styles.agendaBillRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.agendaBillTitle} numberOfLines={2}>{bill.title}</Text>
                      <Text style={styles.agendaBillStage}>{bill.stage.replace(/_/g, ' ').toUpperCase()}</Text>
                    </View>
                    <View style={styles.agendaBillWeeks}>
                      <MaterialCommunityIcons name="clock-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.agendaBillWeeksText}>{bill.stageWeeksRemaining}w</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Opposition bills */}
            {oppositionBills.length > 0 ? (
              <View style={styles.agendaGroup}>
                <View style={styles.agendaGroupHeader}>
                  <View style={[styles.agendaGroupDot, { backgroundColor: Colors.conservative }]} />
                  <Text style={styles.agendaGroupTitle}>OPPOSITION BILLS ({oppositionBills.length})</Text>
                </View>
                {oppositionBills.map(bill => (
                  <View key={bill.id} style={styles.agendaBillRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.agendaBillTitle} numberOfLines={2}>{bill.title}</Text>
                      <Text style={styles.agendaBillStage}>{bill.stage.replace(/_/g, ' ').toUpperCase()}</Text>
                    </View>
                    <View style={styles.agendaBillWeeks}>
                      <MaterialCommunityIcons name="clock-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.agendaBillWeeksText}>{bill.stageWeeksRemaining}w</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {activeBills.length === 0 ? (
              <View style={styles.emptyAgenda}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyAgendaText}>No active legislation. Draft a new bill in the Parliament tab.</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* MOTIONS VIEW */}
        {view === 'motions' ? (
          <View style={styles.motionsSection}>
            <Text style={styles.sectionLabel}>PROCEDURAL TOOLS</Text>

            {[
              {
                icon: 'fast-forward',
                title: 'Invoke Closure',
                desc: 'Forces an immediate vote, ending debate. Government only. Triggers opposition outrage.',
                available: isGoverning,
                color: Colors.warning,
                action: () => showAlert('Invoke Closure', 'Use the "Force Vote" button on any bill in the Parliament tab to invoke closure on specific legislation.'),
              },
              {
                icon: 'gavel',
                title: 'Point of Order',
                desc: 'Raise a procedural objection to delay or disrupt government business. Opposition tool.',
                available: !isGoverning,
                color: Colors.info,
                action: () => showAlert('Point of Order', 'Your House Leader has been directed to raise procedural objections to delay government legislation this week. Approval impact: minor.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'File Point of Order', onPress: () => showAlert('Point of Order Filed', 'Your House Leader has raised a point of order. Government business is delayed by approximately one week.') },
                ]),
              },
              {
                icon: 'vote',
                title: 'Confidence Motion',
                desc: 'Force a vote of confidence in the government. Success triggers an election. Opposition only — only works against minority governments.',
                available: !isGoverning && !gameState.isMajority,
                color: Colors.error,
                action: () => router.push('/(tabs)'),
              },
              {
                icon: 'microphone',
                title: 'Opposition Day Debate',
                desc: 'Use an allocated Opposition Day to set the parliamentary agenda and debate your party\'s priorities.',
                available: !isGoverning,
                color: Colors.conservative,
                action: handleCallOppositionDay,
              },
              {
                icon: 'account-group',
                title: 'Recall Parliament',
                desc: 'Emergency power to recall MPs from recess. Only available to the Prime Minister during crises.',
                available: isGoverning,
                color: Colors.error,
                action: handleCallEmergency,
              },
              {
                icon: 'calendar-remove',
                title: 'Prorogue Parliament',
                desc: 'Suspend parliamentary session. Resets all committee work. Controversial — seen as avoiding accountability.',
                available: isGoverning,
                color: Colors.textMuted,
                action: () => showAlert(
                  'Prorogue Parliament?',
                  'Proroguing Parliament suspends all committee and Senate business. This is a controversial move that will damage your approval rating but can reset the legislative agenda.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Prorogue', style: 'destructive', onPress: () => { scheduleSession?.('recess'); showAlert('Parliament Prorogued', 'Parliament is now prorogued. Opposition and media are furious. Your approval rating has dropped.'); } },
                  ]
                ),
              },
            ].map(motion => (
              <Pressable
                key={motion.title}
                onPress={motion.available ? motion.action : () => showAlert('Not Available', `This procedural motion is only available to the ${motion.available === isGoverning ? 'Opposition' : 'Government'}.`)}
                style={({ pressed }) => [
                  styles.motionCard,
                  !motion.available && { opacity: 0.4 },
                  pressed && motion.available && { opacity: 0.8 },
                ]}
              >
                <View style={[styles.motionIcon, { backgroundColor: motion.color + '22' }]}>
                  <MaterialCommunityIcons name={motion.icon as any} size={20} color={motion.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.motionTitleRow}>
                    <Text style={[styles.motionTitle, { color: motion.available ? Colors.textPrimary : Colors.textMuted }]}>
                      {motion.title}
                    </Text>
                    {!motion.available ? (
                      <MaterialCommunityIcons name="lock" size={13} color={Colors.textMuted} />
                    ) : null}
                  </View>
                  <Text style={styles.motionDesc}>{motion.desc}</Text>
                </View>
                {motion.available ? <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} /> : null}
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  sessionBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  sessionDot: { width: 6, height: 6, borderRadius: 3 },
  sessionText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },

  // Calendar
  calendarSection: { gap: Spacing.md },
  quickActions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  quickBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSize.xs, color: Colors.textMuted },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weekCell: {
    width: '30%',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 4,
  },
  weekCellTop: {
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentDot: { width: 6, height: 6, borderRadius: 3 },
  weekLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textSecondary, paddingHorizontal: 8, paddingTop: 2 },
  weekType: { fontSize: 9, lineHeight: 13, paddingHorizontal: 8, paddingBottom: 6 },
  weekNotes: { fontSize: 8, color: Colors.textMuted, paddingHorizontal: 8, paddingBottom: 4 },
  weekDetail: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  weekDetailHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderLeftWidth: 3, paddingLeft: Spacing.sm },
  weekDetailTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  weekDetailNote: { fontSize: FontSize.xs, color: Colors.textMuted },
  weekDetailBills: { gap: 6 },
  weekDetailBillsTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  weekDetailBillRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  weekDetailBillText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },

  // Agenda
  agendaSection: { gap: Spacing.md },
  agendaNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.info + '11',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.info + '22',
  },
  agendaNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 18 },
  agendaGroup: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  agendaGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  agendaGroupDot: { width: 8, height: 8, borderRadius: 4 },
  agendaGroupTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  agendaBillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  agendaBillTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textPrimary, lineHeight: 17 },
  agendaBillStage: { fontSize: 9, color: Colors.textMuted, marginTop: 2, letterSpacing: 0.3 },
  agendaBillWeeks: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  agendaBillWeeksText: { fontSize: FontSize.xs, color: Colors.textMuted },
  emptyAgenda: { alignItems: 'center', paddingVertical: 40, gap: Spacing.sm },
  emptyAgendaText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },

  // Motions
  motionsSection: { gap: Spacing.sm },
  motionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  motionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  motionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  motionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  motionDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
});
