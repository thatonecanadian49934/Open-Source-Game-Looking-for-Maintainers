// Powered by OnSpace.AI — Ethics Commissioner & Auditor General (Canadian procedure)
// Conflict of Interest Act, Access to Information, Value for Money audits
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

type AccountabilityView = 'overview' | 'ethics' | 'auditor' | 'atip' | 'lobbying';

interface EthicsCase {
  id: string;
  subject: string;
  allegation: string;
  severity: 'minor' | 'serious' | 'critical';
  status: 'open' | 'investigation' | 'finding' | 'closed';
  weekFiled: number;
  response?: string;
  outcome?: 'no_violation' | 'reprimand' | 'fine' | 'recommend_removal';
}

interface AuditReport {
  id: string;
  chapter: string;
  department: string;
  finding: string;
  severity: 'clean' | 'qualified' | 'adverse';
  recommendation: string;
  governmentResponse?: string;
}

const INITIAL_ETHICS_CASES: EthicsCase[] = [
  {
    id: 'e1',
    subject: 'Finance Minister',
    allegation: 'Alleged conflict of interest: Minister awarded government contract to firm in which they hold shares.',
    severity: 'critical',
    status: 'investigation',
    weekFiled: 1,
  },
  {
    id: 'e2',
    subject: 'Infrastructure Minister',
    allegation: 'Failure to file required disclosure of gifts received from lobbyists.',
    severity: 'serious',
    status: 'open',
    weekFiled: 2,
  },
];

const INITIAL_AUDIT_REPORTS: AuditReport[] = [
  {
    id: 'ag1',
    chapter: 'Chapter 2: Housing Programs',
    department: 'CMHC',
    finding: 'The Office of the Auditor General found significant gaps in program delivery. Of 28 performance targets, only 11 were met. $1.4B in housing funds did not reach intended recipients.',
    severity: 'adverse',
    recommendation: 'The government should establish clear accountability frameworks and report annually on housing outcomes.',
  },
  {
    id: 'ag2',
    chapter: 'Chapter 5: Indigenous Services',
    department: 'Indigenous Services Canada',
    finding: 'Long-standing gaps in water systems on First Nations reserves persist. 28 communities remain under long-term drinking water advisories despite government commitments.',
    severity: 'adverse',
    recommendation: 'Immediate investment in water infrastructure and timelines for ending all advisories.',
  },
  {
    id: 'ag3',
    chapter: 'Chapter 8: Federal Procurement',
    department: 'Public Services & Procurement',
    finding: 'IT procurement processes generally followed established guidelines. Some non-competitive contracts reviewed.',
    severity: 'qualified',
    recommendation: 'Strengthen sole-source contract justification documentation.',
  },
];

export default function AccountabilityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, issuePressStatement } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [view, setView] = useState<AccountabilityView>('overview');
  const [ethicsCases, setEthicsCases] = useState<EthicsCase[]>(INITIAL_ETHICS_CASES);
  const [auditReports, setAuditReports] = useState<AuditReport[]>(INITIAL_AUDIT_REPORTS);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [generatingAI, setGeneratingAI] = useState(false);
  const supabaseClient = getSupabaseClient();

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const isGoverning = gameState.isGoverning;

  const handleEthicsResponse = (caseItem: EthicsCase) => {
    const response = responses[caseItem.id]?.trim();
    if (!response) { showAlert('Write a response', 'The government must provide a written response to the Ethics Commissioner.'); return; }
    const success = response.split(' ').length > 50 && caseItem.severity !== 'critical';
    const outcome: EthicsCase['outcome'] = success ? 'no_violation' : caseItem.severity === 'critical' ? 'recommend_removal' : caseItem.severity === 'serious' ? 'fine' : 'reprimand';
    setEthicsCases(prev => prev.map(c => c.id === caseItem.id ? { ...c, status: 'finding', outcome, response } : c));
    showAlert(
      `Ethics Finding: ${caseItem.subject}`,
      outcome === 'no_violation' ? `The Ethics Commissioner found no violation. The government's explanation was deemed satisfactory.`
        : outcome === 'reprimand' ? `The Ethics Commissioner has issued a formal reprimand to ${caseItem.subject}. A letter will be tabled in Parliament.`
        : outcome === 'fine' ? `The Ethics Commissioner has assessed a fine and issued a public report. ${caseItem.subject} must pay $500 under the Conflict of Interest Act.`
        : `The Ethics Commissioner has recommended the Prime Minister consider the removal of ${caseItem.subject} from Cabinet. The finding will be tabled in Parliament.`
    );
  };

  const handleAuditResponse = (report: AuditReport) => {
    const response = responses[report.id]?.trim();
    if (!response) { showAlert('Write a response', 'The government must respond to Auditor General findings.'); return; }
    setAuditReports(prev => prev.map(r => r.id === report.id ? { ...r, governmentResponse: response } : r));
    issuePressStatement(`Government Response to Auditor General Chapter: ${report.chapter}: "${response.substring(0, 120)}..."`);
    showAlert('Response Tabled', `The government's response to ${report.chapter} has been tabled before the Standing Committee on Public Accounts (PAC). The committee will schedule hearings.`);
  };

  const generateATIPRequest = async () => {
    setGeneratingAI(true);
    try {
      const { data } = await supabaseClient.functions.invoke('ai-question-period', {
        body: {
          partyName: party?.name, leaderName: gameState.playerName, isGoverning, stats: gameState.stats,
          currentEvents: [], rivals: [], weekNumber: gameState.currentWeek, parliamentNumber: gameState.parliamentNumber,
          recentNewsHeadlines: [],
          context: `Generate a realistic Access to Information (ATIP) request summary that has been released by the federal government. The request was filed by a journalist/opposition researcher. Context: government party is ${party?.name}, week ${gameState.currentWeek}. Create one revealing document description (2 sentences) that might be embarrassing or interesting for the government.`,
        },
      });
      if (data?.questions?.[0]?.question) {
        showAlert('ATIP Release', `📄 ATIP Release #A-${gameState.currentWeek}-${Math.floor(Math.random() * 900 + 100)}\n\n${data.questions[0].question}\n\nThis document is now public under the Access to Information Act.`);
      }
    } catch { showAlert('ATIP Release', 'Documents released show routine government correspondence. No significant revelations.'); }
    setGeneratingAI(false);
  };

  const getSeverityColor = (s: string) => s === 'critical' || s === 'adverse' ? Colors.error : s === 'serious' || s === 'qualified' ? Colors.warning : Colors.success;

  const tabs = [
    { id: 'overview' as AccountabilityView, label: 'Overview', icon: 'shield-account' },
    { id: 'ethics' as AccountabilityView, label: 'Ethics', icon: 'scale-balance' },
    { id: 'auditor' as AccountabilityView, label: 'Auditor General', icon: 'magnify' },
    { id: 'atip' as AccountabilityView, label: 'ATIP', icon: 'file-search' },
    { id: 'lobbying' as AccountabilityView, label: 'Lobbying', icon: 'handshake' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}><MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Parliamentary Accountability</Text>
          <Text style={styles.headerSub}>Ethics Commissioner · Auditor General · ATIP</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map(t => (
          <Pressable key={t.id} onPress={() => setView(t.id)} style={[styles.tab, view === t.id && [styles.tabActive, { borderBottomColor: partyColor }]]}>
            <Text style={[styles.tabText, view === t.id && { color: partyColor, fontWeight: FontWeight.bold }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {view === 'overview' ? (
          <>
            {[
              { icon: 'scale-balance', title: 'Conflict of Interest & Ethics Commissioner', sub: `${ethicsCases.filter(c => c.status !== 'closed').length} active cases`, desc: 'Independent officer who investigates conflicts of interest under the Conflict of Interest Act (2006). Can fine, reprimand, and recommend removal from Cabinet.', color: Colors.warning, action: () => setView('ethics') },
              { icon: 'magnify', title: 'Auditor General of Canada', sub: `${auditReports.filter(r => !r.governmentResponse).length} unresponded findings`, desc: 'Examines government spending for value for money and compliance. Reports to Parliament, not the government. Findings are reviewed by the Standing Committee on Public Accounts.', color: Colors.info, action: () => setView('auditor') },
              { icon: 'file-search', title: 'Access to Information (ATIP)', sub: 'Documents released under ATI Act', desc: 'Under the Access to Information Act, journalists and the public can request government documents. Released documents often embarrass governments.', color: Colors.gold, action: () => setView('atip') },
              { icon: 'handshake', title: 'Lobbying Commissioner', sub: 'Registered lobbyists & compliance', desc: 'All paid lobbying of public office holders must be registered. The Commissioner investigates violations and can refer cases to the RCMP.', color: Colors.success, action: () => setView('lobbying') },
            ].map((item, i) => (
              <Pressable key={i} onPress={item.action} style={({ pressed }) => [styles.overviewCard, pressed && { opacity: 0.85 }]}>
                <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.overviewTitle}>{item.title}</Text>
                  <Text style={[styles.overviewSub, { color: item.color }]}>{item.sub}</Text>
                  <Text style={styles.overviewDesc}>{item.desc}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
              </Pressable>
            ))}
          </>
        ) : null}

        {view === 'ethics' ? (
          <>
            <View style={styles.commissionerCard}>
              <MaterialCommunityIcons name="scale-balance" size={18} color={Colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.commTitle}>Conflict of Interest & Ethics Commissioner</Text>
                <Text style={styles.commDesc}>Investigates under the Conflict of Interest Act. Powers: impose fines up to $500, issue public reports, recommend removal from Cabinet to PM.</Text>
              </View>
            </View>
            {ethicsCases.map(c => (
              <View key={c.id} style={[styles.caseCard, { borderColor: getSeverityColor(c.severity) + '44' }]}>
                <View style={styles.caseHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.caseSubject}>{c.subject}</Text>
                    <Text style={styles.caseAllegation}>{c.allegation}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getSeverityColor(c.severity) + '22' }]}>
                    <Text style={[styles.statusText, { color: getSeverityColor(c.severity) }]}>{c.severity.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={[styles.caseStatusRow, { backgroundColor: (c.status === 'finding' ? Colors.warning : c.status === 'closed' ? Colors.success : Colors.info) + '11' }]}>
                  <Text style={[styles.caseStatusText, { color: c.status === 'finding' ? Colors.warning : c.status === 'closed' ? Colors.success : Colors.info }]}>
                    STATUS: {c.status.toUpperCase()}{c.outcome ? ` — ${c.outcome.replace(/_/g, ' ').toUpperCase()}` : ''}
                  </Text>
                </View>
                {c.status !== 'closed' && c.status !== 'finding' && isGoverning ? (
                  <>
                    <Text style={styles.sectionLabel}>GOVERNMENT RESPONSE TO ETHICS COMMISSIONER:</Text>
                    <TextInput
                      style={styles.responseInput}
                      multiline
                      placeholder="Provide the government's formal response. Explain the minister's actions, disclose any potential conflict, and outline remedial steps taken. Longer, detailed responses are more persuasive..."
                      placeholderTextColor={Colors.textMuted}
                      value={responses[c.id] || ''}
                      onChangeText={text => setResponses(prev => ({ ...prev, [c.id]: text }))}
                      textAlignVertical="top"
                    />
                    <Pressable onPress={() => handleEthicsResponse(c)} disabled={!responses[c.id]?.trim()} style={({ pressed }) => [styles.responseBtn, { backgroundColor: partyColor }, !responses[c.id]?.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
                      <Text style={styles.responseBtnText}>Submit to Ethics Commissioner</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        {view === 'auditor' ? (
          <>
            <View style={styles.commissionerCard}>
              <MaterialCommunityIcons name="magnify" size={18} color={Colors.info} />
              <View style={{ flex: 1 }}>
                <Text style={styles.commTitle}>Office of the Auditor General</Text>
                <Text style={styles.commDesc}>Reports twice yearly to Parliament on value-for-money and compliance audits. The government must respond to all findings. The Standing Committee on Public Accounts (PAC) holds hearings.</Text>
              </View>
            </View>
            {auditReports.map(r => (
              <View key={r.id} style={[styles.auditCard, { borderColor: getSeverityColor(r.severity) + '44' }]}>
                <View style={styles.auditHeader}>
                  <MaterialCommunityIcons name={r.severity === 'clean' ? 'check-circle' : r.severity === 'qualified' ? 'alert-circle' : 'close-circle'} size={16} color={getSeverityColor(r.severity)} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.auditChapter}>{r.chapter}</Text>
                    <Text style={styles.auditDept}>{r.department}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getSeverityColor(r.severity) + '22' }]}>
                    <Text style={[styles.statusText, { color: getSeverityColor(r.severity) }]}>{r.severity.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.auditFinding}>{r.finding}</Text>
                <View style={styles.recommendationBox}>
                  <Text style={styles.recommendationLabel}>AG RECOMMENDATION:</Text>
                  <Text style={styles.recommendationText}>{r.recommendation}</Text>
                </View>
                {!r.governmentResponse && isGoverning ? (
                  <>
                    <Text style={styles.sectionLabel}>GOVERNMENT RESPONSE:</Text>
                    <TextInput
                      style={styles.responseInput}
                      multiline
                      placeholder="Provide the government's formal response to this Auditor General finding. Acknowledge findings, outline corrective action, and commit to implementation timelines..."
                      placeholderTextColor={Colors.textMuted}
                      value={responses[r.id] || ''}
                      onChangeText={text => setResponses(prev => ({ ...prev, [r.id]: text }))}
                      textAlignVertical="top"
                    />
                    <Pressable onPress={() => handleAuditResponse(r)} disabled={!responses[r.id]?.trim()} style={({ pressed }) => [styles.responseBtn, { backgroundColor: Colors.info }, !responses[r.id]?.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
                      <Text style={styles.responseBtnText}>Table Response to Public Accounts Committee</Text>
                    </Pressable>
                  </>
                ) : r.governmentResponse ? (
                  <View style={styles.responseSubmitted}>
                    <MaterialCommunityIcons name="check-circle" size={13} color={Colors.success} />
                    <Text style={styles.responseSubmittedText}>Government response tabled: "{r.governmentResponse.substring(0, 80)}..."</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        {view === 'atip' ? (
          <>
            <View style={styles.commissionerCard}>
              <MaterialCommunityIcons name="file-search" size={18} color={Colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.commTitle}>Access to Information Act</Text>
                <Text style={styles.commDesc}>Any person may request government records under the ATI Act. The government has 30 days to respond. Journalists and opposition researchers routinely file requests to expose government decisions.</Text>
              </View>
            </View>
            <Pressable onPress={generateATIPRequest} disabled={generatingAI} style={({ pressed }) => [styles.responseBtn, { backgroundColor: Colors.gold }, generatingAI && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
              <MaterialCommunityIcons name="file-search" size={16} color="#fff" />
              <Text style={styles.responseBtnText}>{generatingAI ? 'Processing...' : 'Release ATIP Documents (Simulated Request)'}</Text>
            </Pressable>
            <View style={styles.atipInfo}>
              <Text style={styles.sectionLabel}>HOW ATIP WORKS</Text>
              {[
                'Any person or organization can file an ATIP request for $5',
                'Government has 30 days to respond (extensions available)',
                'Information Commissioner oversees compliance',
                'Exemptions: Cabinet confidences, national security, personal privacy',
                'Released documents are posted on open.canada.ca',
                'Parliamentary opposition researchers file thousands per year',
              ].map((item, i) => (
                <View key={i} style={styles.atipRow}>
                  <MaterialCommunityIcons name="information" size={12} color={Colors.gold} />
                  <Text style={styles.atipRowText}>{item}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {view === 'lobbying' ? (
          <>
            <View style={styles.commissionerCard}>
              <MaterialCommunityIcons name="handshake" size={18} color={Colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.commTitle}>Office of the Commissioner of Lobbying</Text>
                <Text style={styles.commDesc}>The Lobbying Act requires registration of all paid lobbyists. The Commissioner investigates violations and can refer to the RCMP. Lobbying public office holders must be disclosed in the Registry of Lobbyists.</Text>
              </View>
            </View>
            {[
              { company: 'Canadian Pharmaceutical Association', issue: 'National pharmacare pricing negotiations', type: 'In-house', registrant: 'Dr. Amanda Clarke', contact: 'Health Minister', legitimate: true },
              { company: 'Big Tech Alliance of Canada', issue: 'Digital services tax regulation', type: 'Consultant', registrant: 'Thompson & Associates', contact: 'Finance Minister, PMO', legitimate: true },
              { company: 'Canadian Oil Producers Council', issue: 'Carbon pricing exemptions for export oil', type: 'In-house', registrant: 'James MacLeod VP', contact: 'Environment Minister', legitimate: true },
              { company: 'Unnamed Construction Firm', issue: 'Government contract procurement — unregistered', type: '⚠️ UNREGISTERED', registrant: 'POTENTIAL VIOLATION', contact: 'Infrastructure Minister', legitimate: false },
            ].map((l, i) => (
              <View key={i} style={[styles.lobbyCard, !l.legitimate && { borderColor: Colors.error + '44', backgroundColor: Colors.error + '05' }]}>
                <View style={styles.lobbyHeader}>
                  <MaterialCommunityIcons name={l.legitimate ? 'check-circle' : 'alert-circle'} size={16} color={l.legitimate ? Colors.success : Colors.error} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lobbyCompany}>{l.company}</Text>
                    <Text style={styles.lobbyIssue}>{l.issue}</Text>
                  </View>
                  <View style={[styles.typeBadge, { backgroundColor: l.legitimate ? Colors.success + '22' : Colors.error + '22' }]}>
                    <Text style={[styles.typeText, { color: l.legitimate ? Colors.success : Colors.error }]}>{l.type}</Text>
                  </View>
                </View>
                <Text style={styles.lobbyMeta}>Contact: {l.contact} · Registrant: {l.registrant}</Text>
                {!l.legitimate ? (
                  <Pressable onPress={() => showAlert('Refer to RCMP?', `Unregistered lobbying is a violation of the Lobbying Act. Refer ${l.company} to the RCMP for investigation?`, [{ text: 'Refer to RCMP', style: 'destructive', onPress: () => showAlert('RCMP Notified', 'The Commissioner of Lobbying has referred the matter to the RCMP for investigation under the Lobbying Act.') }, { text: 'Cancel', style: 'cancel' }])} style={({ pressed }) => [styles.responseBtn, { backgroundColor: Colors.error }, pressed && { opacity: 0.85 }]}>
                    <Text style={styles.responseBtnText}>Refer to Commissioner for Investigation</Text>
                  </Pressable>
                ) : null}
              </View>
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
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: {},
  tabText: { fontSize: 10, fontWeight: FontWeight.medium, color: Colors.textMuted },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  overviewCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  overviewTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  overviewSub: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginBottom: 2 },
  overviewDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  commissionerCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  commTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 3 },
  commDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  caseCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 8 },
  caseHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  caseSubject: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  caseAllegation: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { fontSize: 9, fontWeight: FontWeight.extrabold },
  caseStatusRow: { borderRadius: Radius.sm, padding: 6 },
  caseStatusText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  auditCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 8 },
  auditHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  auditChapter: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  auditDept: { fontSize: FontSize.xs, color: Colors.info, fontWeight: FontWeight.medium },
  auditFinding: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  recommendationBox: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: 8, gap: 3 },
  recommendationLabel: { fontSize: 9, fontWeight: FontWeight.extrabold, color: Colors.textMuted, letterSpacing: 0.5 },
  recommendationText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  responseInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: FontSize.xs, color: Colors.textPrimary, minHeight: 90, lineHeight: 20 },
  responseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  responseBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#fff' },
  responseSubmitted: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.success + '0D', borderRadius: Radius.sm, padding: 6 },
  responseSubmittedText: { flex: 1, fontSize: FontSize.xs, color: Colors.success, lineHeight: 17 },
  atipInfo: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  atipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  atipRowText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  lobbyCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  lobbyHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  lobbyCompany: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  lobbyIssue: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  lobbyMeta: { fontSize: FontSize.xs, color: Colors.textMuted },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  typeText: { fontSize: 9, fontWeight: FontWeight.extrabold },
});
