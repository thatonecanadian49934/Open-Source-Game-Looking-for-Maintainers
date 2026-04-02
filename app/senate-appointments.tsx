// Powered by OnSpace.AI — Senate Appointments (PM only, real Canadian procedure)
// PM advises GG on Senate appointments. IAC process. Regional representation. Independent senators.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';

interface Senator {
  id: string;
  name: string;
  province: string;
  alignment: 'government_friendly' | 'independent' | 'opposition_friendly';
  ideology: string;
  background: string;
  loyaltyToGov: number; // 0-100
  chamberInfluence: number; // 0-100
  appointed: boolean;
  divisionRecord: { yea: number; nay: number };
}

interface SenateVacancy {
  province: string;
  provinceQuota: number; // max senators for that region
  current: number;
  vacancies: number;
}

const SENATE_DIVISIONS: Record<string, number> = {
  Ontario: 24, Quebec: 24, 'Western Canada': 24, 'Maritime Provinces': 24,
  'Newfoundland & Labrador': 6, 'Northwest Territories': 1, 'Yukon': 1, 'Nunavut': 1,
};

const SENATE_CANDIDATES: Omit<Senator, 'appointed' | 'divisionRecord'>[] = [
  { id: 's1', name: 'Dr. Priya Mehta', province: 'Ontario', alignment: 'government_friendly', ideology: 'Progressive centrist', background: 'Former university president and Royal Commission chair.', loyaltyToGov: 72, chamberInfluence: 78 },
  { id: 's2', name: 'Robert Lacroix', province: 'Quebec', alignment: 'independent', ideology: 'Fiscal conservative, social moderate', background: 'Retired Court of Appeal justice.', loyaltyToGov: 45, chamberInfluence: 85 },
  { id: 's3', name: 'Margaret Thorburn', province: 'British Columbia', alignment: 'independent', ideology: 'Environmental pragmatist', background: 'Former RCMP Commissioner.', loyaltyToGov: 52, chamberInfluence: 70 },
  { id: 's4', name: 'James Anikwue', province: 'Alberta', alignment: 'opposition_friendly', ideology: 'Western conservative', background: 'Former Premier\'s chief of staff.', loyaltyToGov: 28, chamberInfluence: 74 },
  { id: 's5', name: 'Sophie Lacombe', province: 'Quebec', alignment: 'government_friendly', ideology: 'Progressive federalist', background: 'Former federal deputy minister.', loyaltyToGov: 80, chamberInfluence: 68 },
  { id: 's6', name: 'David Running Bear', province: 'Saskatchewan', alignment: 'independent', ideology: 'Indigenous rights advocate', background: 'Former National Chief, Assembly of First Nations.', loyaltyToGov: 55, chamberInfluence: 82 },
  { id: 's7', name: 'Catherine Walsh', province: 'Nova Scotia', alignment: 'government_friendly', ideology: 'Atlantic liberal', background: 'Prominent environmental lawyer.', loyaltyToGov: 75, chamberInfluence: 66 },
  { id: 's8', name: 'Marcus Fontaine', province: 'New Brunswick', alignment: 'independent', ideology: 'Bilingualism advocate, centrist', background: 'Former Commissioner of Official Languages.', loyaltyToGov: 60, chamberInfluence: 75 },
  { id: 's9', name: 'Dr. Helen Ng', province: 'Ontario', alignment: 'government_friendly', ideology: 'Science-based policy', background: 'Former Chief Science Advisor of Canada.', loyaltyToGov: 68, chamberInfluence: 72 },
  { id: 's10', name: 'Pierre Beaumont', province: 'Quebec', alignment: 'opposition_friendly', ideology: 'Quebec nationalist, conservative', background: 'Former MNA and provincial cabinet minister.', loyaltyToGov: 25, chamberInfluence: 78 },
];

const SENATE_GROUPS = [
  { id: 'isg', name: 'Independent Senators Group (ISG)', description: 'Largest caucus. Non-partisan. Focus on legislation quality.', memberCount: 41, color: Colors.info },
  { id: 'pso', name: 'Progressive Senate Group (PSG)', description: 'Progressive policy focus. Often supports government priorities.', memberCount: 30, color: Colors.success },
  { id: 'cssd', name: 'Canadian Senators Group (CSG)', description: 'Regional and fiscal focus. Truly independent.', memberCount: 18, color: Colors.gold },
  { id: 'sr', name: 'Senate Republican Caucus (Conservative)', description: 'Aligned with Conservative Party. Opposes Liberal government bills.', memberCount: 12, color: Colors.error },
];

export default function SenateAppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState } = useGame();
  const { showAlert } = useAlert();

  const [candidates, setCandidates] = useState<Senator[]>(SENATE_CANDIDATES.map(c => ({ ...c, appointed: false, divisionRecord: { yea: Math.floor(Math.random() * 50), nay: Math.floor(Math.random() * 30) } })));
  const [appointedSenators, setAppointedSenators] = useState<Senator[]>([]);
  const [searchName, setSearchName] = useState('');
  const [filterAlignment, setFilterAlignment] = useState<string | null>(null);
  const [filterProvince, setFilterProvince] = useState<string | null>(null);
  const [selectedSenator, setSelectedSenator] = useState<Senator | null>(null);
  const [iacReferralSubmitted, setIacReferralSubmitted] = useState<Set<string>>(new Set());

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const isGoverning = gameState.isGoverning;

  if (!isGoverning) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Senate Appointments</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
          <MaterialCommunityIcons name="lock" size={48} color={Colors.textMuted} />
          <Text style={{ fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textSecondary, textAlign: 'center' }}>Prime Minister Only</Text>
          <Text style={{ fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
            Only the Prime Minister can advise the Governor General on Senate appointments under Section 24 of the Constitution Act, 1867.
          </Text>
        </View>
      </View>
    );
  }

  const filteredCandidates = candidates.filter(c => {
    if (c.appointed) return false;
    if (filterAlignment && c.alignment !== filterAlignment) return false;
    if (filterProvince && c.province !== filterProvince) return false;
    if (searchName && !c.name.toLowerCase().includes(searchName.toLowerCase())) return false;
    return true;
  });

  const handleIACReferral = (senator: Senator) => {
    showAlert(
      'Refer to Independent Advisory Board',
      `Submit ${senator.name}'s name to the Independent Advisory Board on Senate Appointments (IAC). The IAC reviews candidates for merit, independence, and regional representation before advising the PM.\n\nThis process takes 2-4 weeks in real time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit to IAC',
          onPress: () => {
            setIacReferralSubmitted(prev => new Set([...prev, senator.id]));
            showAlert('Submitted to IAC', `${senator.name}'s candidacy is now under independent review. You will be notified of the IAC's recommendation.`);
          },
        },
      ]
    );
  };

  const handleAppoint = (senator: Senator) => {
    if (!iacReferralSubmitted.has(senator.id)) {
      showAlert(
        'IAC Process Required',
        'Since 2016, Senate appointments must be submitted to the Independent Advisory Board on Senate Appointments for independent vetting. Submit this candidate to the IAC first.',
        [
          { text: 'Submit to IAC', onPress: () => handleIACReferral(senator) },
          { text: 'Appoint Without IAC (controversial)', style: 'destructive', onPress: () => confirmAppointment(senator) },
        ]
      );
    } else {
      confirmAppointment(senator);
    }
  };

  const confirmAppointment = (senator: Senator) => {
    showAlert(
      `Appoint ${senator.name}?`,
      `Province: ${senator.province}\nAlignment: ${senator.alignment.replace(/_/g, ' ')}\nGovernment loyalty: ${senator.loyaltyToGov}%\nChamber influence: ${senator.chamberInfluence}%\n\nSenate appointments are for life (until age 75). This is irrevocable.\n\nThe Governor General will be advised.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Advise Governor General',
          onPress: () => {
            setCandidates(prev => prev.map(c => c.id === senator.id ? { ...c, appointed: true } : c));
            setAppointedSenators(prev => [...prev, { ...senator, appointed: true }]);
            setSelectedSenator(null);
            showAlert('Senator Appointed', `His/Her Excellency has accepted the Prime Minister's advice. ${senator.name} (${senator.province}) has been appointed to the Senate of Canada.`);
          },
        },
      ]
    );
  };

  const getAlignmentColor = (alignment: string) => {
    if (alignment === 'government_friendly') return Colors.success;
    if (alignment === 'opposition_friendly') return Colors.error;
    return Colors.info;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Senate Appointments</Text>
          <Text style={styles.headerSub}>Section 24, Constitution Act 1867 — PM advises GG</Text>
        </View>
        <View style={[styles.pmBadge, { backgroundColor: partyColor + '22', borderColor: partyColor + '44' }]}>
          <Text style={[styles.pmBadgeText, { color: partyColor }]}>PM</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {/* Senate overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.sectionLabel}>SENATE OF CANADA — CURRENT COMPOSITION</Text>
          {SENATE_GROUPS.map(g => (
            <View key={g.id} style={styles.groupRow}>
              <View style={[styles.groupDot, { backgroundColor: g.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.groupName}>{g.name}</Text>
                <Text style={styles.groupDesc}>{g.description}</Text>
              </View>
              <Text style={[styles.groupCount, { color: g.color }]}>{g.memberCount}</Text>
            </View>
          ))}
          <View style={[styles.constitutionalNote, { borderColor: Colors.gold + '33' }]}>
            <MaterialCommunityIcons name="information" size={12} color={Colors.gold} />
            <Text style={styles.constitutionalText}>
              Since 2016, all appointments go through the Independent Advisory Board on Senate Appointments (IAC). Senators serve until age 75. Regional quotas: Ontario 24, Quebec 24, Western 24, Maritime 24, NL 6, territories 3.
            </Text>
          </View>
        </View>

        {/* Your appointments */}
        {appointedSenators.length > 0 ? (
          <View style={styles.appointedSection}>
            <Text style={styles.sectionLabel}>YOUR APPOINTMENTS ({appointedSenators.length})</Text>
            {appointedSenators.map(s => (
              <View key={s.id} style={[styles.appointedCard, { borderColor: getAlignmentColor(s.alignment) + '44' }]}>
                <View style={[styles.alignmentDot, { backgroundColor: getAlignmentColor(s.alignment) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.senatorName}>{s.name}</Text>
                  <Text style={styles.senatorMeta}>{s.province} · {s.ideology}</Text>
                </View>
                <View style={styles.loyaltyBadge}>
                  <Text style={[styles.loyaltyText, { color: s.loyaltyToGov > 60 ? Colors.success : s.loyaltyToGov > 40 ? Colors.warning : Colors.error }]}>{s.loyaltyToGov}% loyal</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Candidate search */}
        <Text style={styles.sectionLabel}>SENATE CANDIDATES — AVAILABLE APPOINTMENTS</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          placeholderTextColor={Colors.textMuted}
          value={searchName}
          onChangeText={setSearchName}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {[null, 'government_friendly', 'independent', 'opposition_friendly'].map(f => (
              <Pressable key={f || 'all'} onPress={() => setFilterAlignment(f)} style={[styles.filterChip, filterAlignment === f && { backgroundColor: partyColor + '22', borderColor: partyColor }]}>
                <Text style={[styles.filterChipText, filterAlignment === f && { color: partyColor }]}>{f ? f.replace(/_/g, ' ') : 'All'}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {filteredCandidates.map(s => (
          <Pressable key={s.id} onPress={() => setSelectedSenator(selectedSenator?.id === s.id ? null : s)} style={({ pressed }) => [styles.candidateCard, selectedSenator?.id === s.id && { borderColor: partyColor, backgroundColor: partyColor + '08' }, pressed && { opacity: 0.85 }]}>
            <View style={[styles.alignmentDot, { backgroundColor: getAlignmentColor(s.alignment) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.senatorName}>{s.name}</Text>
              <Text style={styles.senatorMeta}>{s.province} · {s.ideology}</Text>
              <Text style={styles.senatorBackground}>{s.background}</Text>
            </View>
            <View style={styles.candidateStats}>
              <Text style={[styles.statNum, { color: s.loyaltyToGov > 60 ? Colors.success : s.loyaltyToGov > 40 ? Colors.warning : Colors.error }]}>{s.loyaltyToGov}%</Text>
              <Text style={styles.statLabel}>loyal</Text>
            </View>
          </Pressable>
        ))}

        {selectedSenator ? (
          <View style={[styles.detailPanel, { borderColor: partyColor + '44' }]}>
            <Text style={styles.sectionLabel}>APPOINTMENT REVIEW — {selectedSenator.name.toUpperCase()}</Text>
            <View style={styles.detailGrid}>
              {[
                { label: 'Province', value: selectedSenator.province },
                { label: 'Ideology', value: selectedSenator.ideology },
                { label: 'Alignment', value: selectedSenator.alignment.replace(/_/g, ' ') },
                { label: 'Gov\'t Loyalty', value: `${selectedSenator.loyaltyToGov}%` },
                { label: 'Chamber Influence', value: `${selectedSenator.chamberInfluence}/100` },
                { label: 'IAC Status', value: iacReferralSubmitted.has(selectedSenator.id) ? 'Reviewed ✓' : 'Not Submitted' },
              ].map((item, i) => (
                <View key={i} style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{item.label}</Text>
                  <Text style={styles.detailValue}>{item.value}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.backgroundText}>{selectedSenator.background}</Text>
            <View style={styles.detailActions}>
              {!iacReferralSubmitted.has(selectedSenator.id) ? (
                <Pressable onPress={() => handleIACReferral(selectedSenator)} style={({ pressed }) => [styles.actionBtn, { borderColor: Colors.info + '55', backgroundColor: Colors.info + '11' }, pressed && { opacity: 0.8 }]}>
                  <MaterialCommunityIcons name="magnify" size={13} color={Colors.info} />
                  <Text style={[styles.actionBtnText, { color: Colors.info }]}>Submit to IAC</Text>
                </Pressable>
              ) : (
                <View style={[styles.actionBtn, { borderColor: Colors.success + '44', backgroundColor: Colors.success + '0D' }]}>
                  <MaterialCommunityIcons name="check" size={13} color={Colors.success} />
                  <Text style={[styles.actionBtnText, { color: Colors.success }]}>IAC Reviewed</Text>
                </View>
              )}
              <Pressable onPress={() => handleAppoint(selectedSenator)} style={({ pressed }) => [styles.actionBtn, { flex: 2, borderColor: partyColor + '55', backgroundColor: partyColor + '11' }, pressed && { opacity: 0.8 }]}>
                <MaterialCommunityIcons name="gavel" size={13} color={partyColor} />
                <Text style={[styles.actionBtnText, { color: partyColor }]}>Advise Governor General to Appoint</Text>
              </Pressable>
            </View>
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
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  pmBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1 },
  pmBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  overviewCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 10 },
  groupRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  groupDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  groupName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  groupDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  groupCount: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, width: 36, textAlign: 'right' },
  constitutionalNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderRadius: Radius.sm, padding: 8, borderWidth: 1, backgroundColor: Colors.gold + '08' },
  constitutionalText: { flex: 1, fontSize: FontSize.xs, color: Colors.gold, lineHeight: 17 },
  appointedSection: { gap: 6 },
  appointedCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, padding: Spacing.sm },
  alignmentDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  senatorName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  senatorMeta: { fontSize: FontSize.xs, color: Colors.textSecondary },
  senatorBackground: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16, marginTop: 2 },
  loyaltyBadge: { alignItems: 'center' },
  loyaltyText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  searchInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: FontSize.sm, color: Colors.textPrimary },
  filterRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder, backgroundColor: Colors.surfaceElevated },
  filterChipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  candidateCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  candidateStats: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold },
  statLabel: { fontSize: 9, color: Colors.textMuted },
  detailPanel: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailItem: { width: '47%', backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: Spacing.sm, gap: 2 },
  detailLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  detailValue: { fontSize: FontSize.xs, color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  backgroundText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18, fontStyle: 'italic' },
  detailActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, flex: 1 },
  actionBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
});
