// Powered by OnSpace.AI — Parliamentary Motions: Table Documents, Point of Privilege, Emergency Debate
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';

type MotionType = 'table_document' | 'point_of_privilege' | 'emergency_debate';
type MotionStatus = 'draft' | 'submitted' | 'recognized' | 'not_recognized' | 'approved' | 'rejected';

interface Motion {
  id: string;
  type: MotionType;
  title: string;
  text: string;
  submittedBy: string;
  partyId: string;
  week: number;
  status: MotionStatus;
  speakerRuling?: string;
  outcome?: string;
}

const MOTION_INFO: Record<MotionType, {
  label: string;
  icon: string;
  color: string;
  description: string;
  procedure: string;
  speakerApprovalRequired: boolean;
  examples: string[];
}> = {
  table_document: {
    label: 'Table a Document',
    icon: 'file-document',
    color: Colors.info,
    description: 'Any member may table a document of public interest in the House. Documents become part of the official parliamentary record and may be cited in debate.',
    procedure: 'Member rises and states they wish to table a document. Speaker recognizes the member. Document is tabled and becomes part of the official record without debate.',
    speakerApprovalRequired: false,
    examples: [
      'Tabling a report from a department that has not been released publicly',
      'Tabling correspondence from a minister related to ongoing legislation',
      'Tabling a petition signed by constituents',
      'Tabling an independent legal opinion on a bill\'s constitutionality',
      'Tabling a document released under Access to Information',
    ],
  },
  point_of_privilege: {
    label: 'Point of Privilege',
    icon: 'shield-alert',
    color: Colors.warning,
    description: 'A point of privilege may be raised when a member believes their ability to perform their parliamentary duties has been obstructed or their privilege as a member of Parliament has been breached.',
    procedure: 'Member rises and states they wish to raise a point of privilege. Speaker decides if the matter appears prima facie to be a breach of privilege. If so, the matter is referred to PROC committee.',
    speakerApprovalRequired: true,
    examples: [
      'Being misrepresented in Hansard',
      'Threats or intimidation against a member',
      'Contempt of Parliament',
      'Interference with a member\'s ability to attend Parliament',
      'Access denied to government documents requested by committee',
      'A minister misled the House',
    ],
  },
  emergency_debate: {
    label: 'Emergency Debate Motion',
    icon: 'alert-circle',
    color: Colors.error,
    description: 'Any member may request an emergency debate on a matter of urgent national importance under Standing Order 52. The Speaker decides if the matter is urgent enough to interrupt regular House business.',
    procedure: 'Member submits request to Speaker before 2:00 PM. At start of afternoon sitting, Speaker rules on whether the debate is warranted. If approved, the emergency debate takes place that evening for up to 3 hours.',
    speakerApprovalRequired: true,
    examples: [
      'Natural disaster requiring immediate federal response',
      'Urgent international crisis affecting Canadian interests',
      'Sudden collapse of a major industry',
      'Public health emergency',
      'A government minister\'s conduct requiring immediate parliamentary scrutiny',
    ],
  },
};

const SPEAKER_RULINGS = {
  table_document: {
    approved: [
      'The document will be tabled. The Clerk will receive the document from the Honourable Member.',
      'So ordered. The document is now tabled and forms part of the official proceedings of this House.',
    ],
  },
  point_of_privilege: {
    recognized: [
      'I have heard the Honourable Member and I am prepared to rule that, on its face, this matter appears to constitute a prima facie breach of privilege. I am therefore referring this matter to the Standing Committee on Procedure and House Affairs.',
      'The Chair has considered the matter raised by the Honourable Member. Having done so, I find that there is a prima facie case of privilege. The Honourable Member may now move the appropriate motion.',
    ],
    not_recognized: [
      'I have heard the Honourable Member on this matter and I must rule that this does not, in my view, constitute a prima facie breach of privilege. The matter raised is more properly a grievance, not a breach of privilege.',
      'The Chair has considered the matter raised. Regrettably, what the member describes, while it may be a cause for concern, does not meet the threshold for a breach of parliamentary privilege.',
    ],
  },
  emergency_debate: {
    approved: [
      'I have received the request of the Honourable Member for an emergency debate on this matter. I am satisfied that the conditions of Standing Order 52 have been met. The debate will begin this evening.',
      'I find the matter raised to be sufficiently urgent to warrant an emergency debate. The House will convene for debate following the ordinary hour of adjournment.',
    ],
    rejected: [
      'I have reviewed the request of the Honourable Member. While I understand the importance of the issue, I do not find that the conditions for an emergency debate under Standing Order 52 have been established in this case.',
      'Having carefully considered the matter, I am of the view that while the issue is serious, it does not rise to the level of urgency required under the Standing Orders to warrant an emergency debate.',
    ],
  },
};

export default function ParliamentaryMotionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, speakerName, issuePressStatement } = useGame();
  const { showAlert } = useAlert();

  const [selectedMotionType, setSelectedMotionType] = useState<MotionType | null>(null);
  const [motionTitle, setMotionTitle] = useState('');
  const [motionText, setMotionText] = useState('');
  const [submittedMotions, setSubmittedMotions] = useState<Motion[]>([]);
  const [view, setView] = useState<'select' | 'draft' | 'result'>('select');
  const [lastMotion, setLastMotion] = useState<Motion | null>(null);

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const speakerDisplay = speakerName || 'The Speaker';

  const handleSubmitMotion = () => {
    if (!selectedMotionType || !motionTitle.trim() || !motionText.trim()) {
      showAlert('Complete the Motion', 'Provide both a title and the full motion text.');
      return;
    }

    const info = MOTION_INFO[selectedMotionType];

    // Speaker recognition logic
    let status: MotionStatus;
    let speakerRuling: string;
    let outcome: string;

    if (!info.speakerApprovalRequired) {
      // Table documents: always recognized
      status = 'approved';
      const rulings = SPEAKER_RULINGS.table_document.approved;
      speakerRuling = rulings[Math.floor(Math.random() * rulings.length)];
      outcome = `The document "${motionTitle}" has been tabled and is now part of the official parliamentary record.`;
    } else if (selectedMotionType === 'point_of_privilege') {
      // Point of privilege: 55% chance Speaker recognizes
      const recognized = Math.random() > 0.45;
      status = recognized ? 'recognized' : 'not_recognized';
      const rulings = recognized ? SPEAKER_RULINGS.point_of_privilege.recognized : SPEAKER_RULINGS.point_of_privilege.not_recognized;
      speakerRuling = rulings[Math.floor(Math.random() * rulings.length)];
      outcome = recognized
        ? 'The matter has been referred to the Standing Committee on Procedure and House Affairs for investigation. Political momentum generated.'
        : 'The Speaker did not find a prima facie breach. The matter may be raised in other ways.';
    } else {
      // Emergency debate: 50% chance Speaker approves
      const approved = Math.random() > 0.5;
      status = approved ? 'approved' : 'rejected';
      const rulings = approved ? SPEAKER_RULINGS.emergency_debate.approved : SPEAKER_RULINGS.emergency_debate.rejected;
      speakerRuling = rulings[Math.floor(Math.random() * rulings.length)];
      outcome = approved
        ? 'The emergency debate has been approved. The House will sit late tonight for up to 3 hours of debate on this urgent matter.'
        : 'The emergency debate request was denied. You may try again under different circumstances or raise the matter during Question Period.';
    }

    const motion: Motion = {
      id: `motion_${Date.now()}`,
      type: selectedMotionType,
      title: motionTitle,
      text: motionText,
      submittedBy: gameState.playerName,
      partyId: gameState.playerPartyId,
      week: gameState.currentWeek,
      status,
      speakerRuling,
      outcome,
    };

    setSubmittedMotions(prev => [motion, ...prev]);
    setLastMotion(motion);
    setView('result');

    // Generate news for approved motions
    if (status === 'approved' || status === 'recognized') {
      issuePressStatement(`${party?.shortName} successfully ${selectedMotionType === 'table_document' ? 'tabled documents' : selectedMotionType === 'emergency_debate' ? 'called emergency debate' : 'raised point of privilege'} regarding ${motionTitle}.`);
    }
  };

  const resetForm = () => {
    setSelectedMotionType(null);
    setMotionTitle('');
    setMotionText('');
    setView('select');
    setLastMotion(null);
  };

  // ── RESULT VIEW ────────────────────────────────────────────────────────────
  if (view === 'result' && lastMotion) {
    const info = MOTION_INFO[lastMotion.type];
    const approved = lastMotion.status === 'approved' || lastMotion.status === 'recognized';
    const statusColor = approved ? Colors.success : Colors.error;
    const statusLabel = lastMotion.status === 'approved' ? 'APPROVED'
      : lastMotion.status === 'recognized' ? 'PRIMA FACIE FOUND'
      : lastMotion.status === 'rejected' ? 'REJECTED'
      : 'NOT RECOGNIZED';

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={resetForm} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Speaker's Ruling</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          {/* Status */}
          <View style={[styles.rulingStatusCard, { borderColor: statusColor + '55', backgroundColor: statusColor + '08' }]}>
            <MaterialCommunityIcons
              name={approved ? 'check-decagram' : 'close-octagon'}
              size={40}
              color={statusColor}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rulingStatusLabel, { color: statusColor }]}>{statusLabel}</Text>
              <Text style={[styles.rulingMotionType, { color: info.color }]}>{info.label}</Text>
              <Text style={styles.rulingTitle}>{lastMotion.title}</Text>
            </View>
          </View>

          {/* Speaker ruling */}
          <View style={styles.speakerRulingCard}>
            <View style={styles.speakerRulingHeader}>
              <MaterialCommunityIcons name="gavel" size={16} color={Colors.gold} />
              <Text style={styles.speakerRulingName}>{speakerDisplay}:</Text>
            </View>
            <Text style={styles.speakerRulingText}>"{lastMotion.speakerRuling}"</Text>
          </View>

          {/* Outcome */}
          <View style={[styles.outcomeCard, { borderColor: statusColor + '33' }]}>
            <Text style={styles.outcomeTitle}>PARLIAMENTARY OUTCOME</Text>
            <Text style={styles.outcomeText}>{lastMotion.outcome}</Text>
          </View>

          {/* Approval/standing effect */}
          <View style={styles.effectCard}>
            <MaterialCommunityIcons name="trending-up" size={14} color={approved ? Colors.success : Colors.warning} />
            <Text style={[styles.effectText, { color: approved ? Colors.success : Colors.warning }]}>
              {approved
                ? 'Political momentum generated. Party standing improves slightly.'
                : 'No immediate political gain, but the issue is on the record.'}
            </Text>
          </View>

          <Pressable
            onPress={resetForm}
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.doneBtnText}>Submit Another Motion</Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn2, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.backBtn2Text}>Return to Parliament</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── DRAFT VIEW ─────────────────────────────────────────────────────────────
  if (view === 'draft' && selectedMotionType) {
    const info = MOTION_INFO[selectedMotionType];
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { borderBottomColor: info.color + '44' }]}>
          <Pressable onPress={() => setView('select')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{info.label}</Text>
            <Text style={styles.headerSub}>
              {info.speakerApprovalRequired ? `Speaker recognition required` : 'No vote required'}
            </Text>
          </View>
          <MaterialCommunityIcons name={info.icon as any} size={22} color={info.color} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Procedure */}
          <View style={[styles.procedureCard, { borderColor: info.color + '33', backgroundColor: info.color + '08' }]}>
            <MaterialCommunityIcons name="information" size={13} color={info.color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.procedureTitle, { color: info.color }]}>Procedure</Text>
              <Text style={styles.procedureText}>{info.procedure}</Text>
              {info.speakerApprovalRequired ? (
                <View style={styles.speakerApprovalNote}>
                  <MaterialCommunityIcons name="gavel" size={10} color={Colors.gold} />
                  <Text style={styles.speakerApprovalText}>
                    {speakerDisplay} will rule on this motion. Approval is not guaranteed.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Examples */}
          <Text style={styles.sectionLabel}>EXAMPLES</Text>
          {info.examples.map((ex, idx) => (
            <Pressable
              key={idx}
              onPress={() => setMotionTitle(ex)}
              style={({ pressed }) => [
                styles.exampleCard,
                motionTitle === ex && { borderColor: info.color, backgroundColor: info.color + '0D' },
                pressed && { opacity: 0.8 },
              ]}
            >
              <MaterialCommunityIcons
                name={motionTitle === ex ? 'radiobox-marked' : 'radiobox-blank'}
                size={16}
                color={motionTitle === ex ? info.color : Colors.textMuted}
              />
              <Text style={[styles.exampleText, motionTitle === ex && { color: info.color, fontWeight: FontWeight.medium }]}>
                {ex}
              </Text>
            </Pressable>
          ))}

          <Text style={styles.sectionLabel}>MOTION TITLE *</Text>
          <TextInput
            style={styles.titleInput}
            placeholder={`Enter the subject of your ${info.label.toLowerCase()}...`}
            placeholderTextColor={Colors.textMuted}
            value={motionTitle}
            onChangeText={setMotionTitle}
          />

          <Text style={styles.sectionLabel}>MOTION TEXT *</Text>
          <TextInput
            style={styles.motionTextInput}
            multiline
            numberOfLines={5}
            placeholder={
              selectedMotionType === 'table_document'
                ? 'Describe what document you are tabling and its significance...'
                : selectedMotionType === 'point_of_privilege'
                ? 'Explain how your parliamentary privilege has been breached. Be specific about dates, persons involved, and the nature of the interference...'
                : 'Explain the urgent national importance of this matter and why it cannot wait for the regular schedule. Reference specific recent events...'
            }
            placeholderTextColor={Colors.textMuted}
            value={motionText}
            onChangeText={setMotionText}
            textAlignVertical="top"
          />

          {/* Speaker indicator */}
          {!speakerName ? (
            <View style={styles.noSpeakerWarning}>
              <MaterialCommunityIcons name="alert" size={13} color={Colors.warning} />
              <Text style={styles.noSpeakerWarningText}>
                No Speaker has been elected. Motions cannot be recognized until a Speaker is in place.
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSubmitMotion}
            disabled={!motionTitle.trim() || !motionText.trim() || !speakerName}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: info.color },
              (!motionTitle.trim() || !motionText.trim() || !speakerName) && { opacity: 0.4 },
              pressed && { opacity: 0.85 },
            ]}
          >
            <MaterialCommunityIcons name="gavel" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>
              {info.speakerApprovalRequired ? 'Rise and Submit for Speaker Recognition' : 'Table this Document'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── SELECT VIEW ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Parliamentary Motions</Text>
          <Text style={styles.headerSub}>House of Commons — Standing Orders</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Speaker status */}
        <View style={[
          styles.speakerStatusCard,
          speakerName ? { borderColor: Colors.success + '33', backgroundColor: Colors.success + '08' } : { borderColor: Colors.warning + '33', backgroundColor: Colors.warning + '08' }
        ]}>
          <MaterialCommunityIcons
            name="gavel"
            size={16}
            color={speakerName ? Colors.success : Colors.warning}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.speakerStatusTitle, { color: speakerName ? Colors.success : Colors.warning }]}>
              {speakerName ? `Speaker: ${speakerName}` : 'No Speaker Elected'}
            </Text>
            <Text style={styles.speakerStatusSub}>
              {speakerName
                ? 'The Speaker will recognize motions and issue rulings. Recognition is not guaranteed.'
                : 'A Speaker must be elected before the House can sit. Motions requiring recognition cannot proceed.'}
            </Text>
          </View>
          {!speakerName ? (
            <Pressable
              onPress={() => router.push('/speaker-election')}
              style={[styles.electSpeakerBtn, { backgroundColor: Colors.gold + '22' }]}
            >
              <Text style={[styles.electSpeakerBtnText, { color: Colors.gold }]}>Elect</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>SELECT MOTION TYPE</Text>
        <Text style={styles.sectionNote}>
          Parliamentary motions are formal requests for action from the House. Different motion types follow different procedures. The Speaker plays a critical role in recognizing and ruling on motions.
        </Text>

        {(Object.entries(MOTION_INFO) as [MotionType, typeof MOTION_INFO[MotionType]][]).map(([type, info]) => (
          <Pressable
            key={type}
            onPress={() => { setSelectedMotionType(type); setView('draft'); }}
            style={({ pressed }) => [styles.motionTypeCard, { borderColor: info.color + '33' }, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.motionTypeIcon, { backgroundColor: info.color + '22' }]}>
              <MaterialCommunityIcons name={info.icon as any} size={24} color={info.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.motionTypeHeader}>
                <Text style={[styles.motionTypeTitle, { color: info.color }]}>{info.label}</Text>
                {info.speakerApprovalRequired ? (
                  <View style={[styles.speakerBadge, { backgroundColor: Colors.gold + '22' }]}>
                    <MaterialCommunityIcons name="gavel" size={10} color={Colors.gold} />
                    <Text style={styles.speakerBadgeText}>Speaker rules</Text>
                  </View>
                ) : (
                  <View style={[styles.speakerBadge, { backgroundColor: Colors.success + '22' }]}>
                    <MaterialCommunityIcons name="check" size={10} color={Colors.success} />
                    <Text style={[styles.speakerBadgeText, { color: Colors.success }]}>Automatic</Text>
                  </View>
                )}
              </View>
              <Text style={styles.motionTypeDesc}>{info.description}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
          </Pressable>
        ))}

        {/* Past motions */}
        {submittedMotions.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>YOUR MOTIONS THIS SESSION</Text>
            {submittedMotions.slice(0, 5).map(motion => {
              const info = MOTION_INFO[motion.type];
              const approved = motion.status === 'approved' || motion.status === 'recognized';
              return (
                <View key={motion.id} style={styles.pastMotionCard}>
                  <MaterialCommunityIcons
                    name={approved ? 'check-circle' : 'close-circle'}
                    size={14}
                    color={approved ? Colors.success : Colors.error}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pastMotionTitle}>{motion.title}</Text>
                    <Text style={[styles.pastMotionType, { color: info.color }]}>{info.label}</Text>
                  </View>
                  <Text style={styles.pastMotionWeek}>W{motion.week}</Text>
                </View>
              );
            })}
          </>
        ) : null}

        {/* Reference guide */}
        <View style={styles.referenceCard}>
          <Text style={styles.referenceTitle}>PARLIAMENTARY REFERENCE</Text>
          <Text style={styles.referenceText}>
            Parliamentary motions are governed by the Standing Orders of the House of Commons. Key rules:{'\n\n'}
            • Table Documents (SO 32): Any member may table a document without debate or vote.{'\n'}
            • Points of Privilege: Must be raised at the earliest opportunity after the incident.{'\n'}
            • Emergency Debates (SO 52): Request must be submitted to the Speaker before 2:00 PM.{'\n\n'}
            The Speaker is the impartial arbiter of all procedural matters and their ruling is final.
          </Text>
        </View>
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
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  sectionNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
  speakerStatusCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  speakerStatusTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: 3 },
  speakerStatusSub: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  electSpeakerBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm },
  electSpeakerBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  motionTypeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  motionTypeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  motionTypeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  motionTypeTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  speakerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  speakerBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.gold },
  motionTypeDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  pastMotionCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm },
  pastMotionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  pastMotionType: { fontSize: FontSize.xs, marginTop: 2 },
  pastMotionWeek: { fontSize: FontSize.xs, color: Colors.textMuted },
  referenceCard: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  referenceTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  referenceText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 19 },
  // Draft view
  procedureCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  procedureTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginBottom: 4 },
  procedureText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  speakerApprovalNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, backgroundColor: Colors.gold + '11', borderRadius: Radius.sm, padding: 6 },
  speakerApprovalText: { flex: 1, fontSize: 10, color: Colors.gold, lineHeight: 15 },
  exampleCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm },
  exampleText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  titleInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.sm, paddingVertical: 10, fontSize: FontSize.sm, color: Colors.textPrimary },
  motionTextInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, fontSize: FontSize.xs, color: Colors.textPrimary, minHeight: 120, lineHeight: 20 },
  noSpeakerWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.warning + '0D', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.warning + '33' },
  noSpeakerWarningText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, lineHeight: 17 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  submitBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
  // Result view
  rulingStatusCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  rulingStatusLabel: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold, letterSpacing: 1 },
  rulingMotionType: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginTop: 2 },
  rulingTitle: { fontSize: FontSize.sm, color: Colors.textPrimary, marginTop: 4, fontStyle: 'italic' },
  speakerRulingCard: { backgroundColor: Colors.gold + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.md, gap: 8 },
  speakerRulingHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  speakerRulingName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.gold },
  speakerRulingText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 24, fontStyle: 'italic' },
  outcomeCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 8 },
  outcomeTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  outcomeText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22 },
  effectCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: Spacing.sm },
  effectText: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.medium, lineHeight: 17 },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md },
  doneBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  backBtn2: { alignItems: 'center', paddingVertical: Spacing.sm },
  backBtn2Text: { fontSize: FontSize.sm, color: Colors.textMuted },
});
