// Powered by OnSpace.AI — Order in Council & Governor General Interactions
// Real Canadian procedure: OIC appointments, GG reserve powers, prorogation, dissolution
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';
import { getSupabaseClient } from '@/template';

type OICView = 'overview' | 'appointments' | 'prorogation' | 'proclamations';

interface OICAppointment {
  id: string;
  position: string;
  category: string;
  incumbent: string;
  description: string;
  governorInCouncil: boolean; // requires full cabinet
  term: string;
  approvalRequired: boolean;
  significance: 'critical' | 'high' | 'medium';
}

interface ProrogationScenario {
  reason: string;
  duration: number; // weeks
  constitutionalRisk: 'low' | 'medium' | 'high';
  description: string;
  ggLikelihood: number; // % GG grants it
}

const KEY_APPOINTMENTS: OICAppointment[] = [
  { id: 'gg', position: 'Governor General', category: 'Vice-Regal', incumbent: 'Mary Simon', description: 'The Queen\'s/King\'s representative. Appointed on PM\'s advice. 5-year term.', governorInCouncil: false, term: '5 years', approvalRequired: false, significance: 'critical' },
  { id: 'lt_gov', position: 'Lieutenant Governors (10)', category: 'Vice-Regal', incumbent: 'Various', description: 'GG-in-Council appoints LGs on PM advice. Represent Crown in provinces.', governorInCouncil: true, term: '5 years', approvalRequired: false, significance: 'high' },
  { id: 'scc_justice', position: 'Supreme Court Justice', category: 'Judiciary', incumbent: '[Vacancy]', description: 'Appointed by GIC on PM\'s recommendation. Mandatory consultation with bar associations and parliamentary committee.', governorInCouncil: true, term: 'Until age 75', approvalRequired: false, significance: 'critical' },
  { id: 'fed_court', position: 'Federal Court Judge', category: 'Judiciary', incumbent: '[Vacancy]', description: 'Recommended by JAC (Judicial Appointments Commission). Appointed by GIC.', governorInCouncil: true, term: 'Until age 75', approvalRequired: false, significance: 'high' },
  { id: 'ag_canada', position: 'Auditor General of Canada', category: 'Officers of Parliament', incumbent: 'Karen Hogan', description: 'OAG independent from government. Fixed 10-year non-renewable term. Appointed by GIC after consultation with party leaders.', governorInCouncil: true, term: '10 years (fixed)', approvalRequired: true, significance: 'critical' },
  { id: 'pbo', position: 'Parliamentary Budget Officer', category: 'Officers of Parliament', incumbent: 'Yves Giroux', description: 'Non-partisan fiscal analysis. 5-year renewable term. Appointed by GIC after committee recommendation.', governorInCouncil: true, term: '5 years', approvalRequired: true, significance: 'high' },
  { id: 'ethics_comm', position: 'Conflict of Interest & Ethics Commissioner', category: 'Officers of Parliament', incumbent: 'Konrad von Finckenstein', description: 'Investigates ministerial and MP conflicts. 5-year term. Removed only by address of both chambers.', governorInCouncil: true, term: '5 years', approvalRequired: true, significance: 'high' },
  { id: 'info_comm', position: 'Information Commissioner', category: 'Officers of Parliament', incumbent: 'Caroline Maynard', description: 'Oversees access to information requests. Critical for government accountability.', governorInCouncil: true, term: '7 years', approvalRequired: true, significance: 'medium' },
  { id: 'rcmp_comm', position: 'RCMP Commissioner', category: 'Security', incumbent: 'Mike Duheme', description: 'Head of Royal Canadian Mounted Police. Appointed by GIC. Serves at pleasure of PM.', governorInCouncil: true, term: 'Pleasure of PM', approvalRequired: false, significance: 'high' },
  { id: 'cds', position: 'Chief of Defence Staff', category: 'Security', incumbent: 'Gen. Wayne Eyre', description: 'Commander of Canadian Armed Forces. Cabinet appointment.', governorInCouncil: true, term: 'Pleasure of PM', approvalRequired: false, significance: 'high' },
  { id: 'ambassador', position: 'Ambassador to the United States', category: 'Foreign Affairs', incumbent: 'Kirsten Hillman', description: 'Most important diplomatic posting. GIC appointment.', governorInCouncil: true, term: 'Pleasure of PM', approvalRequired: false, significance: 'high' },
  { id: 'un_ambassador', position: 'Ambassador to the United Nations', category: 'Foreign Affairs', incumbent: '[Vacancy]', description: 'Canada\'s voice at the UN Security Council and General Assembly.', governorInCouncil: true, term: 'Pleasure of PM', approvalRequired: false, significance: 'medium' },
];

const PROROGATION_SCENARIOS: ProrogationScenario[] = [
  {
    reason: 'Reset government agenda between sessions',
    duration: 4,
    constitutionalRisk: 'low',
    description: 'Standard prorogation to end a parliamentary session and prepare a new Throne Speech with updated priorities. Parliament prorogues automatically between sessions.',
    ggLikelihood: 99,
  },
  {
    reason: 'Avoid confidence vote',
    duration: 8,
    constitutionalRisk: 'high',
    description: 'Controversial use — proroguing to avoid an imminent confidence defeat. The GG may refuse this advice if government has clearly lost confidence of the House. Precedent: Harper 2008 prorogation.',
    ggLikelihood: 55,
  },
  {
    reason: 'Parliamentary committee investigation',
    duration: 6,
    constitutionalRisk: 'high',
    description: 'Proroguing to shut down a damaging parliamentary committee investigation. Extremely controversial. Opposition will allege obstruction. GG may refuse.',
    ggLikelihood: 35,
  },
  {
    reason: 'Government needs time to reset (COVID-style)',
    duration: 12,
    constitutionalRisk: 'medium',
    description: 'Extended prorogation during national crisis or to prepare major policy reset. Used by PM Trudeau in August 2020.',
    ggLikelihood: 78,
  },
];

export default function OrderInCouncilScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, issuePressStatement } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [view, setView] = useState<OICView>('overview');
  const [completedAppointments, setCompletedAppointments] = useState<Set<string>>(new Set());
  const [customAppointee, setCustomAppointee] = useState<Record<string, string>>({});
  const [selectedProrogation, setSelectedProrogation] = useState<ProrogationScenario | null>(null);
  const [prorogue, setProrogue] = useState(false);

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const isGoverning = gameState.isGoverning;

  if (!isGoverning) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}><MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} /></Pressable>
          <Text style={styles.headerTitle}>Orders in Council</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
          <MaterialCommunityIcons name="lock" size={48} color={Colors.textMuted} />
          <Text style={{ fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textSecondary, textAlign: 'center' }}>Prime Minister Only</Text>
        </View>
      </View>
    );
  }

  const handleAppointment = (appt: OICAppointment) => {
    const appointee = customAppointee[appt.id]?.trim() || 'Recommended Candidate';
    showAlert(
      `Order in Council — ${appt.position}`,
      `Appoint: ${appointee}\n\nThis Order in Council (PC ${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}) will be signed by the Governor General and published in the Canada Gazette. ${appt.approvalRequired ? '\n⚠️ This appointment requires prior consultation with Parliament.' : ''}\n\nTerm: ${appt.term}\nRequires full Cabinet: ${appt.governorInCouncil ? 'Yes' : 'No'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Order in Council',
          onPress: () => {
            setCompletedAppointments(prev => new Set([...prev, appt.id]));
            issuePressStatement(`Governor in Council Order signed: ${appointee} appointed as ${appt.position}. The appointment takes effect immediately.`);
            showAlert('OIC Signed', `PC ${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)} — ${appointee} appointed as ${appt.position}. Published in today's Canada Gazette.`);
          },
        },
      ]
    );
  };

  const handleProrogation = (scenario: ProrogationScenario) => {
    showAlert(
      'Request Prorogation from Governor General',
      `Reason: ${scenario.reason}\nDuration: ${scenario.duration} weeks\nConstitutional risk: ${scenario.constitutionalRisk.toUpperCase()}\nGG grant likelihood: ${scenario.ggLikelihood}%\n\n${scenario.description}\n\nProrogation ends the current session. All bills not passed die on the Order Paper unless you seek a special order to carry them forward.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Advise GG to Prorogue',
          style: scenario.constitutionalRisk === 'high' ? 'destructive' : 'default',
          onPress: () => {
            const granted = Math.random() * 100 < scenario.ggLikelihood;
            if (granted) {
              setProrogue(true);
              issuePressStatement(`Parliament has been prorogued on the advice of the Prime Minister. The ${gameState.parliamentNumber}th Parliament will resume in approximately ${scenario.duration} weeks with a new Speech from the Throne.`);
              showAlert('Prorogation Granted', `His/Her Excellency the Governor General has granted prorogation. Parliament stands prorogued. A new session will begin in ${scenario.duration} weeks.`);
            } else {
              showAlert(
                'Prorogation Refused',
                `His/Her Excellency the Governor General has declined to prorogue Parliament on the advice of the Prime Minister. The GG has determined that Parliament should have the opportunity to express confidence in the government through normal parliamentary means.\n\nThis is an extraordinary exercise of the GG's reserve powers.`
              );
            }
          },
        },
      ]
    );
  };

  const tabs = [
    { id: 'overview' as OICView, label: 'Overview', icon: 'crown' },
    { id: 'appointments' as OICView, label: 'Appointments', icon: 'account-star' },
    { id: 'prorogation' as OICView, label: 'Prorogation', icon: 'sleep' },
    { id: 'proclamations' as OICView, label: 'Proclamations', icon: 'seal' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}><MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Orders in Council</Text>
          <Text style={styles.headerSub}>Privy Council — Governor General in Council</Text>
        </View>
        <View style={[styles.pmBadge, { backgroundColor: partyColor + '22', borderColor: partyColor + '44' }]}>
          <Text style={[styles.pmBadgeText, { color: partyColor }]}>PM</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map(t => (
          <Pressable key={t.id} onPress={() => setView(t.id)} style={[styles.tab, view === t.id && [styles.tabActive, { borderBottomColor: partyColor }]]}>
            <MaterialCommunityIcons name={t.icon as any} size={13} color={view === t.id ? partyColor : Colors.textMuted} />
            <Text style={[styles.tabText, view === t.id && { color: partyColor, fontWeight: FontWeight.bold }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {view === 'overview' ? (
          <>
            <View style={styles.oicExplainCard}>
              <MaterialCommunityIcons name="crown" size={20} color={Colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Orders in Council</Text>
                <Text style={styles.cardDesc}>
                  Orders in Council (OIC) are decisions made by the Governor General in Council (the Governor General acting on the advice of Cabinet). They are published in the Canada Gazette. OICs are used for key appointments, regulations, proclamations, and prorogation/dissolution.
                </Text>
              </View>
            </View>
            {[
              { icon: 'account-star', title: `${KEY_APPOINTMENTS.length} Active OIC Appointments`, sub: `${completedAppointments.size} signed this session`, color: partyColor, action: () => setView('appointments') },
              { icon: 'sleep', title: 'Prorogation & Dissolution', sub: prorogue ? 'Parliament is prorogued' : 'Parliament in session', color: Colors.warning, action: () => setView('prorogation') },
              { icon: 'seal', title: 'Royal Proclamations', sub: 'Issue Orders, Summon Parliament, Gazette notices', color: Colors.gold, action: () => setView('proclamations') },
            ].map((item, i) => (
              <Pressable key={i} onPress={item.action} style={({ pressed }) => [styles.overviewItem, pressed && { opacity: 0.85 }]}>
                <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.overviewItemTitle}>{item.title}</Text>
                  <Text style={styles.overviewItemSub}>{item.sub}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
              </Pressable>
            ))}
          </>
        ) : null}

        {view === 'appointments' ? (
          <>
            <Text style={styles.sectionLabel}>GOVERNOR IN COUNCIL APPOINTMENTS</Text>
            <Text style={styles.sectionNote}>These positions require an Order in Council signed by the Governor General on the advice of Cabinet. All Orders are published in the Canada Gazette within 48 hours.</Text>
            {['critical', 'high', 'medium'].map(sig => {
              const sigAppts = KEY_APPOINTMENTS.filter(a => a.significance === sig);
              return (
                <View key={sig}>
                  <Text style={[styles.sigLabel, { color: sig === 'critical' ? Colors.error : sig === 'high' ? Colors.warning : Colors.info }]}>
                    {sig.toUpperCase()} SIGNIFICANCE
                  </Text>
                  {sigAppts.map(appt => (
                    <View key={appt.id} style={[styles.apptCard, completedAppointments.has(appt.id) && { borderColor: Colors.success + '44', backgroundColor: Colors.success + '05' }]}>
                      <View style={styles.apptHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.apptTitle}>{appt.position}</Text>
                          <Text style={styles.apptCategory}>{appt.category}</Text>
                          <Text style={styles.apptIncumbent}>Current: {appt.incumbent}</Text>
                        </View>
                        <View style={[styles.termBadge, { backgroundColor: Colors.surfaceElevated }]}>
                          <Text style={styles.termText}>{appt.term}</Text>
                        </View>
                      </View>
                      <Text style={styles.apptDesc}>{appt.description}</Text>
                      {appt.approvalRequired ? (
                        <View style={styles.approvalNote}>
                          <MaterialCommunityIcons name="information" size={11} color={Colors.warning} />
                          <Text style={styles.approvalNoteText}>Requires parliamentary consultation before appointment</Text>
                        </View>
                      ) : null}
                      {!completedAppointments.has(appt.id) && appt.incumbent.includes('Vacancy') ? (
                        <View style={styles.apptForm}>
                          <TextInput
                            style={styles.appointeeInput}
                            placeholder={`Name your appointee for ${appt.position}...`}
                            placeholderTextColor={Colors.textMuted}
                            value={customAppointee[appt.id] || ''}
                            onChangeText={text => setCustomAppointee(prev => ({ ...prev, [appt.id]: text }))}
                          />
                          <Pressable onPress={() => handleAppointment(appt)} disabled={!customAppointee[appt.id]?.trim()} style={({ pressed }) => [styles.apptBtn, { backgroundColor: partyColor }, !customAppointee[appt.id]?.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
                            <MaterialCommunityIcons name="seal" size={13} color="#fff" />
                            <Text style={styles.apptBtnText}>Issue OIC</Text>
                          </Pressable>
                        </View>
                      ) : completedAppointments.has(appt.id) ? (
                        <View style={styles.completedBadge}>
                          <MaterialCommunityIcons name="check-circle" size={13} color={Colors.success} />
                          <Text style={styles.completedText}>OIC Signed — Published in Canada Gazette</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              );
            })}
          </>
        ) : null}

        {view === 'prorogation' ? (
          <>
            <Text style={styles.sectionLabel}>PROROGATION OF PARLIAMENT</Text>
            <View style={styles.prorogNote}>
              <MaterialCommunityIcons name="information" size={13} color={Colors.warning} />
              <Text style={styles.prorogNoteText}>
                Prorogation ends a session of Parliament without dissolving it. Bills die on the Order Paper. Parliament resumes with a new Throne Speech. The GG may refuse to grant prorogation if the government has clearly lost the confidence of the House — this is a reserve power.
              </Text>
            </View>
            {prorogue ? (
              <View style={[styles.prorogStatus, { borderColor: Colors.warning + '44' }]}>
                <MaterialCommunityIcons name="sleep" size={32} color={Colors.warning} />
                <Text style={[styles.prorogStatusTitle, { color: Colors.warning }]}>Parliament is Prorogued</Text>
                <Text style={styles.prorogStatusDesc}>No parliamentary business may be conducted. A new session will begin with a Speech from the Throne.</Text>
              </View>
            ) : (
              <>
                {PROROGATION_SCENARIOS.map((scenario, i) => (
                  <Pressable key={i} onPress={() => handleProrogation(scenario)} style={({ pressed }) => [styles.prorogCard, { borderColor: scenario.constitutionalRisk === 'high' ? Colors.error + '44' : scenario.constitutionalRisk === 'medium' ? Colors.warning + '33' : Colors.success + '33' }, pressed && { opacity: 0.85 }]}>
                    <View style={styles.prorogCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.prorogReason}>{scenario.reason}</Text>
                        <Text style={styles.prorogDuration}>{scenario.duration} weeks · GG will grant: {scenario.ggLikelihood}%</Text>
                      </View>
                      <View style={[styles.riskBadge, { backgroundColor: scenario.constitutionalRisk === 'high' ? Colors.error + '22' : scenario.constitutionalRisk === 'medium' ? Colors.warning + '22' : Colors.success + '22' }]}>
                        <Text style={[styles.riskText, { color: scenario.constitutionalRisk === 'high' ? Colors.error : scenario.constitutionalRisk === 'medium' ? Colors.warning : Colors.success }]}>{scenario.constitutionalRisk.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.prorogDesc}>{scenario.description}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </>
        ) : null}

        {view === 'proclamations' ? (
          <>
            <Text style={styles.sectionLabel}>ROYAL PROCLAMATIONS & GAZETTE NOTICES</Text>
            <Text style={styles.sectionNote}>Proclamations are formal orders signed by the Governor General that bring acts into force, summon Parliament, or make other constitutional declarations.</Text>
            {[
              { title: 'Proclaim Legislation in Force', desc: 'Bring a passed bill into force on a specific date. Required for bills with commencement clauses.', icon: 'gavel' },
              { title: 'Summon Parliament After Prorogation', desc: 'Issue the proclamation summoning Parliament to return from prorogation.', icon: 'domain' },
              { title: 'Writs of Election (Dissolution)', desc: 'Issue the writs that formally start the election after dissolution.', icon: 'ballot' },
              { title: 'Canada Gazette Notice', desc: 'Publish regulatory changes, OIC decisions, and government notices in the official Canada Gazette.', icon: 'newspaper' },
              { title: 'National Emergency Proclamation', desc: 'Proclaim a state of emergency under the Emergencies Act. Requires parliamentary confirmation within 7 days.', icon: 'alert-octagram' },
              { title: 'Special Committee Establishment', desc: 'Establish a royal commission or task force by OIC to study a matter of national importance.', icon: 'account-group' },
            ].map((item, i) => (
              <Pressable key={i} onPress={() => showAlert(item.title, item.desc + '\n\nThis action would be signed as an Order in Council and published in the Canada Gazette.', [{ text: 'Issue Proclamation', onPress: () => issuePressStatement(`Royal Proclamation: ${item.title}`) }, { text: 'Cancel', style: 'cancel' }])} style={({ pressed }) => [styles.procCard, pressed && { opacity: 0.85 }]}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color={Colors.gold} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.procTitle}>{item.title}</Text>
                  <Text style={styles.procDesc}>{item.desc}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  pmBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1 },
  pmBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: Spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: {},
  tabText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  sectionNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
  oicExplainCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.gold + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.md },
  cardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold, marginBottom: 4 },
  cardDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  overviewItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  overviewItemTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  overviewItemSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  sigLabel: { fontSize: 10, fontWeight: FontWeight.extrabold, letterSpacing: 1, marginBottom: 4 },
  apptCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  apptHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  apptTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  apptCategory: { fontSize: FontSize.xs, color: Colors.gold, fontWeight: FontWeight.medium },
  apptIncumbent: { fontSize: FontSize.xs, color: Colors.textMuted },
  termBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  termText: { fontSize: 9, color: Colors.textMuted, fontWeight: FontWeight.medium },
  apptDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  approvalNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.warning + '0D', borderRadius: Radius.sm, padding: 6 },
  approvalNoteText: { fontSize: 10, color: Colors.warning },
  apptForm: { flexDirection: 'row', gap: 8 },
  appointeeInput: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.sm, paddingVertical: 8, fontSize: FontSize.xs, color: Colors.textPrimary },
  apptBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm },
  apptBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#fff' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.success + '0D', borderRadius: Radius.sm, padding: 6 },
  completedText: { fontSize: FontSize.xs, color: Colors.success },
  prorogNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.warning + '0D', borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.warning + '33', padding: Spacing.sm },
  prorogNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, lineHeight: 18 },
  prorogCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 8 },
  prorogCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  prorogReason: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  prorogDuration: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  prorogDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  riskText: { fontSize: 9, fontWeight: FontWeight.extrabold },
  prorogStatus: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  prorogStatusTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  prorogStatusDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  procCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  procTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, flex: 1 },
  procDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17, flex: 1 },
});
