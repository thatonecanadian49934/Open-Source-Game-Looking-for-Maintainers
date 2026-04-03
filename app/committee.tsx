// Powered by OnSpace.AI
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { Bill } from '@/services/billService';

export default function StandingCommitteeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, bills, launchCommitteeStudy, assignBillToCommittee, addBillAmendment, whipMPs, offerFloorCrossing } = useGame();
  const { showAlert } = useAlert();

  const [selectedCommittee, setSelectedCommittee] = useState<string | null>(null);
  const [newStudyTopic, setNewStudyTopic] = useState('');
  const [amendmentText, setAmendmentText] = useState('');

  if (!gameState) return null;

  const committees = gameState.committees || [];
  const committee = committees.find(c => c.id === selectedCommittee) || committees[0];

  const committeeBills = committee ? bills.filter(b => committee.billsUnderReview.includes(b.id)) : [];
  const stageBills = bills.filter(b => b.stage === 'house_committee' || b.stage === 'senate_committee');

  const handleLaunchStudy = () => {
    if (!committee || !newStudyTopic.trim()) return;
    launchCommitteeStudy(committee.id, newStudyTopic.trim());
    setNewStudyTopic('');
    showAlert('Study Launched', `${committee.name} has launched a study on ${newStudyTopic.trim()}.`);
  };

  const handleAssignBill = (billId: string) => {
    if (!committee) return;
    assignBillToCommittee(committee.id, billId);
    showAlert('Bill Assigned', `"${bills.find(b => b.id === billId)?.title}" has been assigned to ${committee.name}.`);
  };

  const handleAmendment = (bill: Bill) => {
    if (!amendmentText.trim()) return;
    addBillAmendment(bill.id, amendmentText.trim());
    const desc = amendmentText.trim();
    setAmendmentText('');
    showAlert('Amendment Moved', `A clause amendment has been proposed: "${desc}"`);
  };

  const handleWhip = (bill: Bill) => {
    whipMPs(bill.id);
    showAlert('Whip Deployed', `Party whips are pressing caucus on "${bill.title}" before final vote.`);
  };

  const handleFloorCross = () => {
    const mps = gameState.mpRoster.filter(mp => mp.status === 'active');
    if (mps.length === 0) return;
    const mp = mps[Math.floor(Math.random() * mps.length)];
    const targetParty = gameState.isGoverning ? 'conservative' : 'liberal';
    offerFloorCrossing(mp.id, targetParty);
    showAlert('Floor Crossing Attempted', `${mp.name} is approached about crossing to ${targetParty}.`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Standing Committees</Text>
          <Text style={styles.headerSub}>Select committee, review bills and launch studies.</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Committees (10)</Text>
          {committees.map(c => (
            <Pressable key={c.id} onPress={() => setSelectedCommittee(c.id)} style={({ pressed }) => [styles.committeeRow, selectedCommittee === c.id && { borderColor: Colors.success, backgroundColor: Colors.success + '11' }, pressed && { opacity: 0.75 }]}>
              <Text style={styles.committeeName}>{c.code} — {c.name}</Text>
              <Text style={styles.committeeMembers}>{c.members.length} members • {c.billsUnderReview.length} bills</Text>
            </Pressable>
          ))}
        </View>

        {committee ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{committee.code} Study Area</Text>
              <Text style={styles.sectionText}>{committee.mandate}</Text>
              <TextInput
                style={styles.input}
                value={newStudyTopic}
                onChangeText={setNewStudyTopic}
                placeholder="New study topic"
                placeholderTextColor={Colors.textMuted}
              />
              <Pressable onPress={handleLaunchStudy} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Launch Study</Text>
              </Pressable>
              <Text style={styles.subTitle}>Active Studies</Text>
              {committee.activeStudies.length > 0 ? committee.activeStudies.map(s => (
                <View key={s.id} style={styles.studyRow}>
                  <Text style={styles.studyTitle}>{s.title}</Text>
                  <Text style={styles.studyMeta}>{s.status.toUpperCase()} — started wk {s.launchedWeek}</Text>
                </View>
              )) : <Text style={styles.sectionText}>No active studies yet.</Text>}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Committee Bill Review</Text>
              <Text style={styles.sectionText}>Bills at committee stage ({stageBills.length}) can be assigned for clause-by-clause review.</Text>
              {stageBills.map(b => (
                <View key={b.id} style={styles.billRow}>
                  <Text style={styles.billTitle}>{b.title}</Text>
                  <Text style={styles.billMeta}>{b.stage} • {b.type.toUpperCase()}</Text>
                  <Pressable onPress={() => handleAssignBill(b.id)} style={styles.smallBtn}><Text style={styles.smallBtnText}>Assign</Text></Pressable>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Committee Bills Assigned</Text>
              {committeeBills.length > 0 ? committeeBills.map(b => (
                <View key={b.id} style={styles.billRowAlt}>
                  <Text style={styles.billTitle}>{b.title}</Text>
                  <Text style={styles.billMeta}>{b.stage}</Text>
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.sectionText}>Amendments ({b.amendments.length})</Text>
                    {b.amendments.map((a, i) => (<Text key={i} style={styles.amendmentText}>• {a}</Text>))}
                    <TextInput
                      style={[styles.input, { marginTop: 8 }]}
                      value={amendmentText}
                      onChangeText={setAmendmentText}
                      placeholder="Propose clause amendment"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <Pressable onPress={() => handleAmendment(b)} style={styles.smallBtn}><Text style={styles.smallBtnText}>Propose Amendment</Text></Pressable>
                    <View style={styles.rowGap}>
                      <Pressable onPress={() => handleWhip(b)} style={styles.smallBtn}><Text style={styles.smallBtnText}>Whip Caucus</Text></Pressable>
                      <Pressable onPress={handleFloorCross} style={[styles.smallBtn, { backgroundColor: Colors.warning }]}><Text style={styles.smallBtnText}>Lobby Floor Cross</Text></Pressable>
                    </View>
                  </View>
                </View>
              )) : <Text style={styles.sectionText}>No bills currently assigned.</Text>}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  backBtn: { marginRight: Spacing.sm },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { color: Colors.textSecondary, fontSize: FontSize.sm },
  content: { padding: Spacing.md, gap: Spacing.md },
  section: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sectionText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  subTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, marginTop: Spacing.sm },
  committeeRow: { borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.xs },
  committeeName: { color: Colors.textPrimary, fontWeight: FontWeight.bold },
  committeeMembers: { color: Colors.textSecondary, fontSize: FontSize.xs },
  input: { borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: Radius.sm, padding: Spacing.sm, color: Colors.textPrimary, marginTop: Spacing.sm },
  actionBtn: { backgroundColor: Colors.success, borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.sm, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: FontWeight.bold },
  studyRow: { backgroundColor: Colors.info + '11', padding: Spacing.sm, borderRadius: Radius.sm, marginTop: Spacing.xs },
  studyTitle: { color: Colors.textPrimary, fontWeight: FontWeight.bold },
  studyMeta: { color: Colors.textSecondary, fontSize: FontSize.xs },
  billRow: { backgroundColor: Colors.surface + '22', borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.xs },
  billRowAlt: { backgroundColor: Colors.warning + '10', borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.xs },
  billTitle: { fontWeight: FontWeight.bold },
  billMeta: { fontSize: FontSize.xs, color: Colors.textSecondary },
  amendmentText: { fontSize: FontSize.xs, color: Colors.textSecondary, marginLeft: Spacing.sm },
  smallBtn: { marginTop: Spacing.xs, backgroundColor: Colors.primary, borderRadius: Radius.sm, padding: Spacing.xs, alignItems: 'center' },
  smallBtnText: { color: '#fff', fontSize: FontSize.xs },
  rowGap: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
});
