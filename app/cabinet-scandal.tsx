// Powered by OnSpace.AI — Cabinet Scandal Event System
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
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

export type ScandalType = 'expense_fraud' | 'conflict_of_interest' | 'leak' | 'misconduct' | 'bribery';

export interface CabinetScandal {
  id: string;
  ministerName: string;
  portfolio: string;
  scandalType: ScandalType;
  description: string;
  severity: 'minor' | 'major' | 'catastrophic';
  weekDiscovered: number;
  resolved: boolean;
}

interface ScandalResponse {
  action: 'fire' | 'defend' | 'inquiry';
  label: string;
  description: string;
  approvalImpact: number;
  caucusLoyaltyImpact: number;
  mediaImpact: 'positive' | 'neutral' | 'negative';
  risk: string;
}

const SCANDAL_RESPONSES: ScandalResponse[] = [
  {
    action: 'fire',
    label: 'Fire the Minister',
    description: 'Immediately terminate the minister\'s appointment and issue a statement condemning the conduct.',
    approvalImpact: 3,
    caucusLoyaltyImpact: -8,
    mediaImpact: 'neutral',
    risk: 'Caucus may see this as heavy-handed. Loyal MPs may distance themselves.',
  },
  {
    action: 'defend',
    label: 'Publicly Defend',
    description: 'Stand by your minister. Declare the allegations are unfounded partisan attacks.',
    approvalImpact: -6,
    caucusLoyaltyImpact: 5,
    mediaImpact: 'negative',
    risk: 'Media will amplify the scandal. If proven true, the entire government is implicated.',
  },
  {
    action: 'inquiry',
    label: 'Launch Independent Inquiry',
    description: 'Order an independent ethics investigation. Minister is temporarily suspended pending findings.',
    approvalImpact: 1,
    caucusLoyaltyImpact: 2,
    mediaImpact: 'positive',
    risk: 'Inquiry takes 6 weeks. Results are unpredictable. Media coverage sustained.',
  },
];

const SCANDAL_ICONS: Record<ScandalType, string> = {
  expense_fraud: 'credit-card-off',
  conflict_of_interest: 'scale-unbalanced',
  leak: 'comment-alert',
  misconduct: 'account-alert',
  bribery: 'cash-remove',
};

const SCANDAL_LABELS: Record<ScandalType, string> = {
  expense_fraud: 'Expense Fraud',
  conflict_of_interest: 'Conflict of Interest',
  leak: 'Classified Information Leak',
  misconduct: 'Personal Misconduct',
  bribery: 'Alleged Bribery',
};

const SEVERITY_COLORS: Record<string, string> = {
  minor: Colors.warning,
  major: Colors.error,
  catastrophic: '#FF0000',
};

export default function CabinetScandalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, fireMinister, instructMinister } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [selectedResponse, setSelectedResponse] = useState<ScandalResponse | null>(null);
  const [resolved, setResolved] = useState(false);
  const [generatingNews, setGeneratingNews] = useState(false);
  const [newsArticles, setNewsArticles] = useState<string[]>([]);

  // Get scandal from navigation params — fallback to generating a random one
  const [scandal] = useState<CabinetScandal>(() => {
    if (!gameState?.cabinet?.length) return {
      id: 'no_scandal',
      ministerName: 'Unknown Minister',
      portfolio: 'Unknown Portfolio',
      scandalType: 'expense_fraud',
      description: 'No active scandal.',
      severity: 'minor',
      weekDiscovered: 1,
      resolved: false,
    };
    const minister = gameState.cabinet[Math.floor(Math.random() * gameState.cabinet.length)];
    const types: ScandalType[] = ['expense_fraud', 'conflict_of_interest', 'leak', 'misconduct', 'bribery'];
    const type = types[Math.floor(Math.random() * types.length)];
    const severities: Array<'minor' | 'major' | 'catastrophic'> = ['minor', 'major', 'catastrophic'];
    const severity = Math.random() < 0.5 ? 'minor' : Math.random() < 0.7 ? 'major' : 'catastrophic';
    const descriptions: Record<ScandalType, string[]> = {
      expense_fraud: [
        `${minister.name} allegedly submitted $${Math.floor(Math.random() * 80 + 20)}K in fraudulent expense claims, including luxury travel and personal hotel stays billed to taxpayers.`,
        `Internal audit reveals the Minister of ${minister.portfolio} charged $${Math.floor(Math.random() * 150 + 30)}K to departmental accounts for personal items including a vacation home renovation.`,
      ],
      conflict_of_interest: [
        `${minister.name} awarded a $${Math.floor(Math.random() * 200 + 50)}M government contract to a firm where their spouse holds equity. The Ethics Commissioner has opened an investigation.`,
        `The Globe and Mail reports the Minister of ${minister.portfolio} met secretly with lobbyists from an industry they now regulate — without disclosing the meetings.`,
      ],
      leak: [
        `Classified cabinet documents reportedly provided by ${minister.name} to a political ally have been published by a foreign media outlet, triggering a CSIS review.`,
        `RCMP has launched an investigation into whether the Minister of ${minister.portfolio} leaked confidential defence briefings to a private equity firm.`,
      ],
      misconduct: [
        `Multiple staff members have filed formal complaints alleging workplace harassment and intimidation by ${minister.name}. The House of Commons ethics office confirmed the allegations.`,
        `Former staffers allege the Minister of ${minister.portfolio} created a toxic work environment, with several formal complaints now under review by the Parliamentary HR office.`,
      ],
      bribery: [
        `A whistleblower alleges that ${minister.name} accepted payments from a foreign-owned corporation in exchange for regulatory approvals worth billions.`,
        `Opposition sources allege the Minister of ${minister.portfolio} received undisclosed payments totalling $${Math.floor(Math.random() * 500 + 100)}K from a defense contractor before awarding them a sole-source contract.`,
      ],
    };
    const descList = descriptions[type];
    return {
      id: `scandal_${Date.now()}`,
      ministerName: minister.name,
      portfolio: minister.portfolio,
      scandalType: type,
      description: descList[Math.floor(Math.random() * descList.length)],
      severity,
      weekDiscovered: gameState.currentWeek,
      resolved: false,
    };
  });

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const severityColor = SEVERITY_COLORS[scandal.severity];

  const generateNewsReaction = async (action: 'fire' | 'defend' | 'inquiry') => {
    setGeneratingNews(true);
    const headlines = {
      fire: [
        `PM fires Minister ${scandal.ministerName.split(' ').pop()} over ${SCANDAL_LABELS[scandal.scandalType]} scandal`,
        `${party?.shortName} government acts quickly as ${scandal.ministerName} ousted amid controversy`,
        `Cabinet purge: PM distances government from ${SCANDAL_LABELS[scandal.scandalType]} allegations`,
      ],
      defend: [
        `PM defends embattled minister despite mounting ${SCANDAL_LABELS[scandal.scandalType]} allegations`,
        `Opposition demands answers as PM shields ${scandal.ministerName} from scandal scrutiny`,
        `Government stonewalls media on ${scandal.ministerName} controversy — editorial: 'A culture of impunity?'`,
      ],
      inquiry: [
        `${party?.shortName} government orders independent inquiry into ${scandal.ministerName} allegations`,
        `Ethics probe launched: ${scandal.ministerName} temporarily removed from portfolio pending results`,
        `PM declares transparency after launching ${SCANDAL_LABELS[scandal.scandalType]} inquiry`,
      ],
    };
    const chosen = headlines[action][Math.floor(Math.random() * headlines[action].length)];
    setNewsArticles(prev => [...prev, chosen]);
    setGeneratingNews(false);
  };

  const handleResponse = (response: ScandalResponse) => {
    if (resolved) return;
    setSelectedResponse(response);

    showAlert(
      `Confirm: ${response.label}`,
      `${response.description}\n\nEstimated effects:\n• Approval: ${response.approvalImpact > 0 ? '+' : ''}${response.approvalImpact}%\n• Caucus loyalty: ${response.caucusLoyaltyImpact > 0 ? '+' : ''}${response.caucusLoyaltyImpact}\n\nRisk: ${response.risk}`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setSelectedResponse(null) },
        {
          text: response.label,
          style: response.action === 'fire' ? 'destructive' : 'default',
          onPress: () => {
            setResolved(true);
            if (response.action === 'fire') {
              fireMinister(scandal.portfolio);
            } else if (response.action === 'inquiry') {
              instructMinister(scandal.portfolio, 'Suspended pending ethics inquiry');
            }
            generateNewsReaction(response.action);
            const msgMap = {
              fire: `${scandal.ministerName} has been removed from Cabinet. A statement has been issued to the media.`,
              defend: `You have publicly defended ${scandal.ministerName}. The media will now scrutinize the government closely.`,
              inquiry: `An independent inquiry has been ordered. ${scandal.ministerName} is temporarily suspended pending findings in approximately 6 weeks.`,
            };
            setTimeout(() => {
              showAlert('Response Issued', msgMap[response.action], [
                { text: 'Return to Dashboard', onPress: () => router.back() },
              ]);
            }, 500);
          },
        },
      ]
    );
  };

  const severityIcon = scandal.severity === 'catastrophic' ? 'fire' : scandal.severity === 'major' ? 'alert' : 'alert-circle';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: severityColor + '44' }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.scandalTypeBadge, { backgroundColor: severityColor + '22', borderColor: severityColor + '44' }]}>
            <MaterialCommunityIcons name={severityIcon as any} size={12} color={severityColor} />
            <Text style={[styles.scandalTypeText, { color: severityColor }]}>{scandal.severity.toUpperCase()} SCANDAL</Text>
          </View>
          <Text style={styles.headerTitle}>Cabinet Crisis</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {/* Scandal card */}
        <View style={[styles.scandalCard, { borderColor: severityColor + '55', backgroundColor: severityColor + '08' }]}>
          <View style={styles.scandalCardHeader}>
            <MaterialCommunityIcons name={SCANDAL_ICONS[scandal.scandalType] as any} size={32} color={severityColor} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.scandalTypeLabel, { color: severityColor }]}>{SCANDAL_LABELS[scandal.scandalType]}</Text>
              <Text style={styles.scandalMinister}>{scandal.ministerName}</Text>
              <Text style={styles.scandalPortfolio}>Minister of {scandal.portfolio}</Text>
            </View>
          </View>
          <View style={styles.scandalBreaking}>
            <View style={styles.breakingBadge}>
              <View style={styles.breakingDot} />
              <Text style={styles.breakingText}>BREAKING</Text>
            </View>
            <Text style={styles.scandalDesc}>{scandal.description}</Text>
          </View>
          <View style={styles.scandalMeta}>
            <View style={styles.scandalMetaItem}>
              <MaterialCommunityIcons name="calendar" size={12} color={Colors.textMuted} />
              <Text style={styles.scandalMetaText}>Week {scandal.weekDiscovered}</Text>
            </View>
            <View style={styles.scandalMetaItem}>
              <MaterialCommunityIcons name="newspaper" size={12} color={Colors.textMuted} />
              <Text style={styles.scandalMetaText}>Media Rating: {scandal.severity === 'catastrophic' ? 'FRENZY' : scandal.severity === 'major' ? 'HIGH' : 'MODERATE'}</Text>
            </View>
          </View>
        </View>

        {/* Media pressure */}
        <View style={styles.mediaPressureCard}>
          <Text style={styles.sectionLabel}>MEDIA PRESSURE</Text>
          <View style={styles.mediaRow}>
            {[
              { outlet: 'CBC', stance: scandal.severity === 'catastrophic' ? 'Demanding resignation' : 'Seeking comment', color: Colors.error },
              { outlet: 'Globe', stance: 'Editorial board weighing in', color: Colors.warning },
              { outlet: 'Post', stance: scandal.scandalType === 'expense_fraud' ? 'Calls it an outrage' : 'Covering closely', color: Colors.info },
            ].map(m => (
              <View key={m.outlet} style={[styles.mediaItem, { borderColor: m.color + '33' }]}>
                <Text style={[styles.mediaOutlet, { color: m.color }]}>{m.outlet}</Text>
                <Text style={styles.mediaStance}>{m.stance}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Caucus impact */}
        <View style={styles.caucusCard}>
          <Text style={styles.sectionLabel}>CAUCUS SENTIMENT</Text>
          <View style={styles.caucusRow}>
            <MaterialCommunityIcons name="account-group" size={14} color={Colors.textSecondary} />
            <Text style={styles.caucusText}>
              {scandal.severity === 'catastrophic'
                ? `Multiple caucus members are calling for ${scandal.ministerName.split(' ').pop()}\'s resignation. Two backbenchers have already spoken to the media.`
                : scandal.severity === 'major'
                ? 'Several MPs have privately expressed concern. Caucus solidarity is strained but holding for now.'
                : 'Most caucus members are watching cautiously. Your response will set the tone.'}
            </Text>
          </View>
        </View>

        {/* Response options */}
        {!resolved ? (
          <View style={styles.responseSection}>
            <Text style={styles.sectionLabel}>PRIME MINISTER'S RESPONSE</Text>
            <Text style={styles.responseInstructions}>You must respond to the scandal immediately. Each choice triggers AI news coverage and affects approval and caucus loyalty.</Text>
            {SCANDAL_RESPONSES.map(response => {
              const isSelected = selectedResponse?.action === response.action;
              const responseColor = response.action === 'fire' ? Colors.error : response.action === 'defend' ? Colors.warning : Colors.success;
              return (
                <Pressable
                  key={response.action}
                  onPress={() => handleResponse(response)}
                  style={({ pressed }) => [
                    styles.responseCard,
                    isSelected && { borderColor: responseColor, backgroundColor: responseColor + '11' },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={[styles.responseIconContainer, { backgroundColor: responseColor + '22' }]}>
                    <MaterialCommunityIcons
                      name={response.action === 'fire' ? 'account-remove' : response.action === 'defend' ? 'shield' : 'magnify'}
                      size={22}
                      color={responseColor}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.responseLabel, { color: responseColor }]}>{response.label}</Text>
                    <Text style={styles.responseDesc}>{response.description}</Text>
                    <View style={styles.responseEffects}>
                      <View style={[styles.effectBadge, { backgroundColor: response.approvalImpact > 0 ? Colors.success + '22' : Colors.error + '22' }]}>
                        <Text style={[styles.effectText, { color: response.approvalImpact > 0 ? Colors.success : Colors.error }]}>
                          Approval: {response.approvalImpact > 0 ? '+' : ''}{response.approvalImpact}%
                        </Text>
                      </View>
                      <View style={[styles.effectBadge, { backgroundColor: response.caucusLoyaltyImpact > 0 ? Colors.success + '22' : Colors.error + '22' }]}>
                        <Text style={[styles.effectText, { color: response.caucusLoyaltyImpact > 0 ? Colors.success : Colors.error }]}>
                          Caucus: {response.caucusLoyaltyImpact > 0 ? '+' : ''}{response.caucusLoyaltyImpact}
                        </Text>
                      </View>
                      <View style={[styles.effectBadge, { backgroundColor: response.mediaImpact === 'positive' ? Colors.success + '22' : response.mediaImpact === 'negative' ? Colors.error + '22' : Colors.textMuted + '22' }]}>
                        <Text style={[styles.effectText, { color: response.mediaImpact === 'positive' ? Colors.success : response.mediaImpact === 'negative' ? Colors.error : Colors.textMuted }]}>
                          Media: {response.mediaImpact.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.riskRow}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.riskText}>{response.risk}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.resolvedSection}>
            <MaterialCommunityIcons name="check-circle" size={32} color={Colors.success} />
            <Text style={styles.resolvedTitle}>Response Issued</Text>
            <Text style={styles.resolvedDesc}>The Prime Minister has responded to the scandal. Media coverage is ongoing. Monitor news for public reaction.</Text>
          </View>
        )}

        {/* AI News Coverage */}
        {newsArticles.length > 0 ? (
          <View style={styles.newsSection}>
            <Text style={styles.sectionLabel}>AI MEDIA REACTION</Text>
            {newsArticles.map((headline, idx) => (
              <View key={idx} style={styles.newsItem}>
                <MaterialCommunityIcons name="newspaper" size={13} color={Colors.gold} />
                <Text style={styles.newsHeadline}>{headline}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {generatingNews ? (
          <View style={styles.generatingBanner}>
            <MaterialCommunityIcons name="robot" size={14} color={Colors.gold} />
            <Text style={styles.generatingText}>Generating AI media reaction...</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, backgroundColor: Colors.surface },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  scandalTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  scandalTypeText: { fontSize: 10, fontWeight: FontWeight.extrabold, letterSpacing: 1 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  content: { padding: Spacing.md, gap: Spacing.md },
  scandalCard: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  scandalCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  scandalTypeLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1 },
  scandalMinister: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  scandalPortfolio: { fontSize: FontSize.xs, color: Colors.textSecondary },
  scandalBreaking: { gap: 8 },
  breakingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  breakingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error },
  breakingText: { fontSize: 10, fontWeight: FontWeight.extrabold, color: Colors.error, letterSpacing: 1.5 },
  scandalDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },
  scandalMeta: { flexDirection: 'row', gap: Spacing.md },
  scandalMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scandalMetaText: { fontSize: FontSize.xs, color: Colors.textMuted },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  mediaPressureCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  mediaRow: { flexDirection: 'row', gap: 8 },
  mediaItem: { flex: 1, borderRadius: Radius.sm, padding: 8, borderWidth: 1, backgroundColor: Colors.surfaceElevated, gap: 4 },
  mediaOutlet: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  mediaStance: { fontSize: 10, color: Colors.textMuted, lineHeight: 14 },
  caucusCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  caucusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  caucusText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  responseSection: { gap: Spacing.sm },
  responseInstructions: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
  responseCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  responseIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  responseLabel: { fontSize: FontSize.base, fontWeight: FontWeight.bold, marginBottom: 4 },
  responseDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  responseEffects: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  effectBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  effectText: { fontSize: 10, fontWeight: FontWeight.bold },
  riskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  riskText: { flex: 1, fontSize: 10, color: Colors.textMuted, lineHeight: 15, fontStyle: 'italic' },
  resolvedSection: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.xl, backgroundColor: Colors.success + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.success + '33' },
  resolvedTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.success },
  resolvedDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  newsSection: { gap: Spacing.sm },
  newsItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.card, borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.gold + '22' },
  newsHeadline: { flex: 1, fontSize: FontSize.xs, color: Colors.textPrimary, lineHeight: 18, fontStyle: 'italic' },
  generatingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.gold + '11', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.gold + '22' },
  generatingText: { fontSize: FontSize.xs, color: Colors.gold },
});
