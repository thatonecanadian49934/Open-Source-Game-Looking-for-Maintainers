// Powered by OnSpace.AI — Emergencies Act (based on actual Canadian Emergencies Act 1988)
// PM-only standalone screen: toggle real emergency types and orders, parliamentary safeguards
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Animated, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';
import { getSupabaseClient } from '@/template';

// ── Types ─────────────────────────────────────────────────────────────────────
type EmergencyType = 'public_welfare' | 'public_order' | 'international' | 'war';
type ActStatus = 'not_invoked' | 'deliberating' | 'invoked' | 'parliament_review' | 'lifted';

interface EmergencyOrder {
  id: string;
  label: string;
  description: string;
  charterSection?: string;
  constitutionalRisk: number; // 0-100
  approvalImpact: number;
  enabled: boolean;
  applicableTypes: EmergencyType[];
}

interface ParliamentarySafeguard {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  required: boolean;
}

// ── Real Emergencies Act emergency types ──────────────────────────────────────
const EMERGENCY_TYPES: Record<EmergencyType, {
  label: string;
  description: string;
  icon: string;
  color: string;
  expiryDays: number;
  triggers: string[];
  legalThreshold: string;
}> = {
  public_welfare: {
    label: 'Public Welfare Emergency',
    description: 'A national emergency caused by a real or imminent fire, flood, drought, storm, earthquake, disease in humans/animals/plants, accident, or pollution — resulting in danger to life or property, social disruption, or breakdown in essential goods/services.',
    icon: 'weather-hurricane',
    color: Colors.info,
    expiryDays: 90,
    triggers: ['Natural disaster', 'Disease outbreak', 'Environmental accident', 'Critical infrastructure failure'],
    legalThreshold: 'Must seriously endanger lives, health or safety of Canadians AND exceed provincial capacity AND cannot be dealt with under any other law.',
  },
  public_order: {
    label: 'Public Order Emergency',
    description: 'A national emergency arising from threats to the security of Canada severe enough to constitute a national emergency, including espionage, sabotage, foreign-influenced activities, violence or threats, and insurrection.',
    icon: 'shield-alert',
    color: Colors.warning,
    expiryDays: 30,
    triggers: ['Domestic terrorism', 'Foreign-influenced activities', 'Armed insurrection', 'Critical infrastructure blockade'],
    legalThreshold: 'Must constitute a national emergency as defined under the CSIS Act — threats to security of Canada that are serious and credible.',
  },
  international: {
    label: 'International Emergency',
    description: 'A national emergency caused by an act of intimidation or coercion, or an actual or imminent use of serious force or violence, from outside Canada that is so serious as to be a national emergency.',
    icon: 'earth-off',
    color: Colors.gold,
    expiryDays: 60,
    triggers: ['Foreign state aggression', 'International coercion', 'Cross-border armed violence', 'Diplomatic crisis with serious threat'],
    legalThreshold: 'Must involve actual or imminent use of serious force or violence from outside Canada, or threats of intimidation/coercion of international scope.',
  },
  war: {
    label: 'War Emergency',
    description: 'A national emergency arising from real or imminent armed conflict involving Canada or its allies — including a state of war, or armed conflict of a magnitude that is a national emergency.',
    icon: 'sword-cross',
    color: Colors.error,
    expiryDays: 120,
    triggers: ['Declaration of war', 'Armed attack on Canada', 'Allied state under attack', 'Major armed conflict involving Canadian forces'],
    legalThreshold: 'Must involve real or imminent armed conflict involving Canada or its allies that constitutes a national emergency.',
  },
};

// ── Orders & Regulations (based on real Emergencies Act powers) ───────────────
const ALL_ORDERS: EmergencyOrder[] = [
  // Public Welfare orders
  {
    id: 'regulate_distribution',
    label: 'Regulate Distribution of Essential Goods',
    description: 'Regulate or prohibit the distribution, hoarding, disposal, or use of essential goods, food, water, fuel, medicines, or other supplies necessary for public health or safety.',
    constitutionalRisk: 25,
    approvalImpact: -2,
    enabled: false,
    applicableTypes: ['public_welfare'],
  },
  {
    id: 'authority_evacuation',
    label: 'Authorize Evacuation Orders',
    description: 'Authorize or order the evacuation of persons and the removal of property from disaster areas, and make provisions for shelter, welfare, and registration of evacuees.',
    constitutionalRisk: 20,
    approvalImpact: 2,
    enabled: false,
    applicableTypes: ['public_welfare'],
  },
  {
    id: 'requisition_property',
    label: 'Requisition Private Property',
    description: 'Authorize federal authorities to commandeer private property, facilities, and resources necessary to respond to the emergency. Compensation is paid to owners.',
    charterSection: 'Section 7 — Property Rights (Common Law)',
    constitutionalRisk: 35,
    approvalImpact: -4,
    enabled: false,
    applicableTypes: ['public_welfare', 'war'],
  },
  {
    id: 'emergency_spending',
    label: 'Authorize Emergency Expenditures',
    description: 'Authorize emergency government spending without the normal parliamentary appropriations process. Subject to audit and full parliamentary reporting within 60 days.',
    constitutionalRisk: 22,
    approvalImpact: -1,
    enabled: false,
    applicableTypes: ['public_welfare', 'public_order', 'international', 'war'],
  },
  // Public Order orders
  {
    id: 'prohibit_assemblies',
    label: 'Regulate & Prohibit Certain Public Assemblies',
    description: 'Regulate or prohibit public assemblies constituting an emergency threat — excluding lawful advocacy, protest, or dissent. Applies only to assemblies posing a direct threat to public safety.',
    charterSection: 'Section 2(c) — Freedom of Peaceful Assembly',
    constitutionalRisk: 80,
    approvalImpact: -10,
    enabled: false,
    applicableTypes: ['public_order'],
  },
  {
    id: 'designate_protected',
    label: 'Designate & Secure Protected Areas',
    description: 'Designate and secure places where emergency activities must not occur — such as international border crossings, critical infrastructure, Parliament Hill, and government facilities.',
    constitutionalRisk: 45,
    approvalImpact: -3,
    enabled: false,
    applicableTypes: ['public_order', 'international'],
  },
  {
    id: 'essential_services',
    label: 'Direct Persons to Render Essential Services',
    description: 'Direct specified persons and groups to provide essential services required during the emergency, including transport operators, healthcare workers, and utility personnel.',
    charterSection: 'Section 6 — Mobility Rights',
    constitutionalRisk: 55,
    approvalImpact: -6,
    enabled: false,
    applicableTypes: ['public_order', 'public_welfare', 'war'],
  },
  {
    id: 'financial_regulation',
    label: 'Authorize Financial Institution Measures',
    description: 'Authorize or direct specified financial institutions to render essential services and regulate or prohibit the use of property to finance or facilitate emergency-related illegal activities.',
    charterSection: 'Section 8 — Freedom from Unreasonable Search',
    constitutionalRisk: 62,
    approvalImpact: -6,
    enabled: false,
    applicableTypes: ['public_order'],
  },
  {
    id: 'rcmp_provincial',
    label: 'Authorize RCMP to Enforce Provincial Laws',
    description: 'Authorize the Royal Canadian Mounted Police to enforce municipal and provincial laws by means of incorporation by reference where local authorities cannot act effectively.',
    constitutionalRisk: 38,
    approvalImpact: -2,
    enabled: false,
    applicableTypes: ['public_order', 'public_welfare'],
  },
  // International/War orders
  {
    id: 'military_deployment',
    label: 'Deploy Canadian Armed Forces Domestically',
    description: 'Authorize the deployment of the Canadian Armed Forces in support of law enforcement and public safety operations within Canada during the emergency.',
    charterSection: 'Section 7 — Right to Security of the Person',
    constitutionalRisk: 42,
    approvalImpact: -5,
    enabled: false,
    applicableTypes: ['international', 'war', 'public_order'],
  },
  {
    id: 'control_foreign_nationals',
    label: 'Regulate Entry and Movements of Persons',
    description: 'Regulate or prohibit travel to or from Canada or any specified area of Canada, and control movements of persons within Canada during the international or war emergency.',
    charterSection: 'Section 6 — Mobility Rights',
    constitutionalRisk: 58,
    approvalImpact: -7,
    enabled: false,
    applicableTypes: ['international', 'war'],
  },
  {
    id: 'war_production',
    label: 'Direct War/Emergency Production',
    description: 'Authorize and direct the production and distribution of essential goods, services, and materials needed for the war or emergency effort — including military equipment and supplies.',
    constitutionalRisk: 30,
    approvalImpact: -2,
    enabled: false,
    applicableTypes: ['war', 'international'],
  },
  {
    id: 'media_regulation',
    label: 'Regulate Information Related to Emergency',
    description: 'Regulate specified information relating to the emergency, including restricting access to active emergency zones for security reasons. Does NOT apply to news, comment, or opinion.',
    charterSection: 'Section 2(b) — Freedom of Expression',
    constitutionalRisk: 88,
    approvalImpact: -14,
    enabled: false,
    applicableTypes: ['public_order', 'war'],
  },
];

const PARLIAMENTARY_SAFEGUARDS: ParliamentarySafeguard[] = [
  {
    id: 'consult_provinces',
    label: 'Consult Provinces & Territories',
    description: 'The Governor in Council must consult with the lieutenant governors in council of the provinces before declaring a public order or welfare emergency, unless urgency prevents adequate consultation.',
    completed: false,
    required: true,
  },
  {
    id: 'report_parliament',
    label: 'Report to Parliament Within 7 Days',
    description: 'A declaration of emergency must be reported to Parliament immediately. If Parliament is not sitting, Parliament must be recalled within 7 days of the declaration.',
    completed: false,
    required: true,
  },
  {
    id: 'house_confirmation',
    label: 'House of Commons Confirmation Vote',
    description: 'Both the House of Commons must consider and confirm the declaration. If either chamber votes to revoke the declaration, the emergency ends immediately.',
    completed: false,
    required: true,
  },
  {
    id: 'senate_confirmation',
    label: 'Senate Confirmation Vote',
    description: 'The Senate must also confirm the declaration. The declaration expires within 30 days unless confirmed and extended by both chambers.',
    completed: false,
    required: true,
  },
  {
    id: 'special_committee',
    label: 'Establish Parliamentary Review Committee',
    description: 'A Special Joint Committee of the House of Commons and Senate must be established to review the exercise of powers under the emergency on an ongoing basis.',
    completed: false,
    required: true,
  },
  {
    id: 'public_inquiry',
    label: 'Commit to Public Inquiry After Emergency',
    description: 'After the emergency ends, the government must initiate a public inquiry into the circumstances and use of emergency powers within 60 days.',
    completed: false,
    required: false,
  },
];

export default function EmergenciesActScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, issuePressStatement, executeForeignPolicy } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [actStatus, setActStatus] = useState<ActStatus>('not_invoked');
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);
  const [orders, setOrders] = useState<EmergencyOrder[]>(ALL_ORDERS);
  const [safeguards, setSafeguards] = useState<ParliamentarySafeguard[]>(PARLIAMENTARY_SAFEGUARDS);
  const [justification, setJustification] = useState('');
  const [weeksActive, setWeeksActive] = useState(0);
  const [parliamentVoteResult, setParliamentVoteResult] = useState<{ house: boolean; senate: boolean } | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (actStatus === 'invoked') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [actStatus]);

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;

  // ── PM Only ─────────────────────────────────────────────────────────────────
  if (!gameState.isGoverning) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Emergencies Act</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md }}>
          <MaterialCommunityIcons name="lock" size={48} color={Colors.textMuted} />
          <Text style={{ fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textSecondary, textAlign: 'center' }}>Prime Minister Only</Text>
          <Text style={{ fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
            Only the Prime Minister can invoke the Emergencies Act on behalf of the Governor in Council.
          </Text>
        </View>
      </View>
    );
  }

  const selectedOrders = orders.filter(o => o.enabled);
  const avgRisk = selectedOrders.length > 0 ? Math.round(selectedOrders.reduce((s, o) => s + o.constitutionalRisk, 0) / selectedOrders.length) : 0;
  const totalApprovalImpact = selectedOrders.reduce((s, o) => s + o.approvalImpact, 0);
  const typeOrders = selectedType ? orders.filter(o => o.applicableTypes.includes(selectedType)) : [];
  const completedSafeguards = safeguards.filter(s => s.completed).length;
  const requiredSafeguardsCompleted = safeguards.filter(s => s.required && s.completed).length;
  const totalRequired = safeguards.filter(s => s.required).length;
  const typeInfo = selectedType ? EMERGENCY_TYPES[selectedType] : null;

  const toggleOrder = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, enabled: !o.enabled } : o));
  };

  const toggleSafeguard = (id: string) => {
    setSafeguards(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const handleInvokeAct = () => {
    if (!selectedType) {
      showAlert('Select Emergency Type', 'Choose one of the four emergency types defined under the Emergencies Act.');
      return;
    }
    if (selectedOrders.length === 0) {
      showAlert('No Orders Selected', 'Enable at least one order or regulation before invoking the Act.');
      return;
    }
    if (!justification.trim() || justification.trim().split(/\s+/).filter(Boolean).length < 20) {
      showAlert('Justification Required', 'Provide a formal justification of at least 20 words explaining how the legal threshold is met.');
      return;
    }

    const typeData = EMERGENCY_TYPES[selectedType];
    const highRiskOrders = selectedOrders.filter(o => o.constitutionalRisk > 70);

    showAlert(
      'Invoke the Emergencies Act?',
      `Emergency Type: ${typeData.label}\n\nOrders enabled: ${selectedOrders.length}\nConstitutional risk: ${avgRisk}%\nApproval impact: ${totalApprovalImpact}%\n${highRiskOrders.length > 0 ? `\n⚠️ ${highRiskOrders.length} high-risk order(s) will face immediate Charter challenges.\n` : ''}\nParliament must confirm within 7 days. Either chamber can revoke the declaration at any time.\n\nAre you certain?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'INVOKE EMERGENCIES ACT',
          style: 'destructive',
          onPress: () => {
            setActStatus('invoked');
            setWeeksActive(1);
            issuePressStatement(`The Government of Canada has invoked the Emergencies Act — ${typeData.label}. The following emergency orders are now in effect: ${selectedOrders.map(o => o.label).join(', ')}. Parliament has been notified and will be recalled within 7 days for confirmation.`);
            executeForeignPolicy?.('emergency_act', 'domestic', totalApprovalImpact, 0);
          },
        },
      ]
    );
  };

  const handleParliamentVote = () => {
    const houseApproves = Math.random() > (avgRisk > 70 ? 0.45 : 0.25);
    const senateApproves = Math.random() > (avgRisk > 70 ? 0.4 : 0.3);
    setParliamentVoteResult({ house: houseApproves, senate: senateApproves });

    if (!houseApproves || !senateApproves) {
      showAlert(
        'Parliament Has Revoked the Emergency',
        `${!houseApproves ? 'The House of Commons' : 'The Senate'} has voted to revoke the emergency declaration. The Emergencies Act is immediately lifted. All emergency orders cease to have effect.`,
        [{ text: 'Accept Ruling', onPress: () => { setActStatus('lifted'); } }]
      );
    } else {
      showAlert('Emergency Confirmed', 'Both the House of Commons and Senate have confirmed the emergency declaration. The Act remains in force.');
      setSafeguards(prev => prev.map(s => s.id === 'house_confirmation' || s.id === 'senate_confirmation' ? { ...s, completed: true } : s));
    }
  };

  const handleLiftAct = () => {
    showAlert(
      'Lift the Emergencies Act?',
      'All emergency orders cease immediately. A public inquiry must be initiated within 60 days as required by law.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Lift Act',
          onPress: () => {
            setActStatus('lifted');
            issuePressStatement('The Prime Minister has revoked the declaration of emergency. The Emergencies Act is no longer in force. All emergency orders have ceased to have effect. A public inquiry will be initiated within 60 days.');
          },
        },
      ]
    );
  };

  // ── NOT INVOKED — Main Configuration ─────────────────────────────────────────
  if (actStatus === 'not_invoked' || actStatus === 'deliberating') {
    return (
      <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Emergencies Act</Text>
            <Text style={styles.headerSub}>Emergencies Act, R.S.C. 1985, c. 22 (4th Supp.)</Text>
          </View>
          <View style={[styles.pmBadge, { backgroundColor: partyColor + '22', borderColor: partyColor + '44' }]}>
            <Text style={[styles.pmBadgeText, { color: partyColor }]}>PM</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Legal context */}
          <View style={styles.legalContextCard}>
            <MaterialCommunityIcons name="scale-balance" size={16} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.legalContextTitle}>Legal Threshold — Section 3</Text>
              <Text style={styles.legalContextText}>
                A national emergency is an urgent and critical situation of a temporary nature that seriously endangers the lives, health or safety of Canadians or seriously threatens Canada's sovereignty, security, or territorial integrity — AND cannot be effectively dealt with under any other law of Canada.
              </Text>
            </View>
          </View>

          {/* Step 1: Emergency Type */}
          <Text style={styles.sectionLabel}>STEP 1 — SELECT EMERGENCY TYPE (Part I–IV)</Text>
          {(Object.entries(EMERGENCY_TYPES) as [EmergencyType, typeof EMERGENCY_TYPES[keyof typeof EMERGENCY_TYPES]][]).map(([type, meta]) => (
            <Pressable
              key={type}
              onPress={() => { setSelectedType(type); setActStatus('deliberating'); }}
              style={({ pressed }) => [
                styles.typeCard,
                selectedType === type && { borderColor: meta.color, backgroundColor: meta.color + '0D' },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.typeCardHeader}>
                <MaterialCommunityIcons name={meta.icon as any} size={22} color={selectedType === type ? meta.color : Colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeCardTitle, selectedType === type && { color: meta.color }]}>{meta.label}</Text>
                  <Text style={styles.typeCardExpiry}>Max {meta.expiryDays} days · Requires parliamentary confirmation</Text>
                </View>
                {selectedType === type ? <MaterialCommunityIcons name="check-circle" size={18} color={meta.color} /> : null}
              </View>
              <Text style={styles.typeCardDesc}>{meta.description}</Text>
              <View style={[styles.thresholdNote, { borderColor: meta.color + '33', backgroundColor: meta.color + '08' }]}>
                <MaterialCommunityIcons name="gavel" size={11} color={meta.color} />
                <Text style={[styles.thresholdNoteText, { color: meta.color }]}>Legal threshold: {meta.legalThreshold}</Text>
              </View>
              <Text style={styles.triggersLabel}>Typical triggers:</Text>
              <View style={styles.triggerPills}>
                {meta.triggers.map(t => (
                  <View key={t} style={[styles.triggerPill, { backgroundColor: meta.color + '11', borderColor: meta.color + '33' }]}>
                    <Text style={[styles.triggerPillText, { color: meta.color }]}>{t}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}

          {/* Step 2: Orders & Regulations */}
          {selectedType ? (
            <>
              <Text style={styles.sectionLabel}>STEP 2 — TOGGLE ORDERS & REGULATIONS</Text>
              <Text style={styles.sectionNote}>Enable only the measures strictly necessary for dealing with the emergency. Each measure must satisfy the Section 1 Charter proportionality test.</Text>

              {/* Risk meter */}
              {selectedOrders.length > 0 ? (
                <View style={[styles.riskMeter, { borderColor: avgRisk > 70 ? Colors.error + '44' : avgRisk > 40 ? Colors.warning + '44' : Colors.success + '44' }]}>
                  <View style={styles.riskMeterRow}>
                    <Text style={styles.riskMeterLabel}>CONSTITUTIONAL RISK</Text>
                    <Text style={[styles.riskMeterValue, { color: avgRisk > 70 ? Colors.error : avgRisk > 40 ? Colors.warning : Colors.success }]}>{avgRisk}%</Text>
                  </View>
                  <View style={styles.riskBar}>
                    <View style={[styles.riskBarFill, { flex: avgRisk, backgroundColor: avgRisk > 70 ? Colors.error : avgRisk > 40 ? Colors.warning : Colors.success }]} />
                    <View style={{ flex: 100 - avgRisk }} />
                  </View>
                  <Text style={styles.riskMeterNote}>
                    {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} enabled · Approval impact: {totalApprovalImpact}% · {avgRisk > 70 ? 'High-risk measures will face immediate Charter challenges' : 'Risk is within acceptable parliamentary range'}
                  </Text>
                </View>
              ) : null}

              {typeOrders.map(order => (
                <View key={order.id} style={[styles.orderCard, order.enabled && { borderColor: typeInfo!.color + '55', backgroundColor: typeInfo!.color + '06' }]}>
                  <View style={styles.orderCardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.orderLabel, order.enabled && { color: typeInfo!.color }]}>{order.label}</Text>
                      <Text style={styles.orderDesc}>{order.description}</Text>
                      {order.charterSection ? (
                        <View style={styles.charterNote}>
                          <MaterialCommunityIcons name="book-open" size={10} color={Colors.warning} />
                          <Text style={styles.charterNoteText}>Charter concern: {order.charterSection}</Text>
                        </View>
                      ) : null}
                      <View style={styles.orderStats}>
                        <View style={[styles.orderStat, { backgroundColor: order.constitutionalRisk > 70 ? Colors.error + '22' : order.constitutionalRisk > 40 ? Colors.warning + '22' : Colors.success + '22' }]}>
                          <Text style={[styles.orderStatText, { color: order.constitutionalRisk > 70 ? Colors.error : order.constitutionalRisk > 40 ? Colors.warning : Colors.success }]}>Risk: {order.constitutionalRisk}%</Text>
                        </View>
                        <View style={[styles.orderStat, { backgroundColor: order.approvalImpact > 0 ? Colors.success + '22' : Colors.error + '22' }]}>
                          <Text style={[styles.orderStatText, { color: order.approvalImpact > 0 ? Colors.success : Colors.error }]}>Approval: {order.approvalImpact}%</Text>
                        </View>
                      </View>
                    </View>
                    <Switch
                      value={order.enabled}
                      onValueChange={() => toggleOrder(order.id)}
                      trackColor={{ false: Colors.surfaceBorder, true: typeInfo!.color + '66' }}
                      thumbColor={order.enabled ? typeInfo!.color : Colors.textMuted}
                    />
                  </View>
                </View>
              ))}

              {typeOrders.length === 0 ? (
                <View style={styles.noOrdersNote}>
                  <MaterialCommunityIcons name="information" size={14} color={Colors.textMuted} />
                  <Text style={styles.noOrdersText}>No specific orders available for this emergency type.</Text>
                </View>
              ) : null}
            </>
          ) : null}

          {/* Step 3: Parliamentary Safeguards */}
          {selectedType ? (
            <>
              <Text style={styles.sectionLabel}>STEP 3 — PARLIAMENTARY SAFEGUARDS</Text>
              <Text style={styles.sectionNote}>These safeguards are legally required under the Emergencies Act. Mark each as completed before invoking the Act.</Text>
              {safeguards.map(s => (
                <Pressable key={s.id} onPress={() => toggleSafeguard(s.id)} style={({ pressed }) => [styles.safeguardCard, s.completed && { borderColor: Colors.success + '44', backgroundColor: Colors.success + '06' }, pressed && { opacity: 0.85 }]}>
                  <View style={[styles.safeguardCheck, s.completed && { backgroundColor: Colors.success, borderColor: Colors.success }]}>
                    {s.completed ? <MaterialCommunityIcons name="check" size={12} color="#fff" /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.safeguardLabelRow}>
                      <Text style={[styles.safeguardLabel, s.completed && { color: Colors.success }]}>{s.label}</Text>
                      {s.required ? (
                        <View style={styles.requiredBadge}>
                          <Text style={styles.requiredBadgeText}>REQUIRED</Text>
                        </View>
                      ) : (
                        <View style={styles.optionalBadge}>
                          <Text style={styles.optionalBadgeText}>RECOMMENDED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.safeguardDesc}>{s.description}</Text>
                  </View>
                </Pressable>
              ))}
              {requiredSafeguardsCompleted < totalRequired ? (
                <View style={styles.safeguardWarning}>
                  <MaterialCommunityIcons name="alert-circle" size={13} color={Colors.warning} />
                  <Text style={styles.safeguardWarningText}>{totalRequired - requiredSafeguardsCompleted} required safeguard(s) not yet completed. The Act can still be invoked in an emergency, but legal challenges are more likely.</Text>
                </View>
              ) : (
                <View style={styles.safeguardReady}>
                  <MaterialCommunityIcons name="check-circle" size={13} color={Colors.success} />
                  <Text style={styles.safeguardReadyText}>All required parliamentary safeguards completed.</Text>
                </View>
              )}
            </>
          ) : null}

          {/* Step 4: Justification */}
          {selectedType ? (
            <>
              <Text style={styles.sectionLabel}>STEP 4 — FORMAL JUSTIFICATION</Text>
              <Text style={styles.sectionNote}>Provide a formal statement explaining how this situation meets the legal threshold under Section 3 of the Emergencies Act. This will be tabled in Parliament.</Text>
              <TextInput
                style={styles.justificationInput}
                multiline
                placeholder={`Describe the urgent and critical situation, why it cannot be dealt with under any other federal or provincial law, and how it endangers the lives, health, or safety of Canadians or threatens Canada's sovereignty or territorial integrity. Reference specific events, timelines, and the measures being taken and why they are proportionate and necessary...`}
                placeholderTextColor={Colors.textMuted}
                value={justification}
                onChangeText={setJustification}
                textAlignVertical="top"
              />
              <Text style={styles.wordCount}>{justification.trim().split(/\s+/).filter(Boolean).length} words (minimum 20 required)</Text>
            </>
          ) : null}

          {/* Invoke button */}
          {selectedType ? (
            <Pressable
              onPress={handleInvokeAct}
              disabled={selectedOrders.length === 0 || !justification.trim() || justification.trim().split(/\s+/).filter(Boolean).length < 20}
              style={({ pressed }) => [
                styles.invokeBtn,
                { backgroundColor: typeInfo?.color || Colors.error },
                (selectedOrders.length === 0 || justification.trim().split(/\s+/).filter(Boolean).length < 20) && { opacity: 0.4 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons name="gavel" size={20} color="#fff" />
              <Text style={styles.invokeBtnText}>INVOKE THE EMERGENCIES ACT</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── INVOKED ──────────────────────────────────────────────────────────────────
  if (actStatus === 'invoked') {
    const typeData = EMERGENCY_TYPES[selectedType!];
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.invokedHeader, { borderBottomColor: typeData.color + '44' }]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <MaterialCommunityIcons name="alert-octagram" size={18} color={typeData.color} />
          </Animated.View>
          <Text style={[styles.invokedHeaderText, { color: typeData.color }]}>EMERGENCIES ACT — IN FORCE</Text>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <MaterialCommunityIcons name="alert-octagram" size={18} color={typeData.color} />
          </Animated.View>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          {/* Status */}
          <View style={[styles.statusCard, { borderColor: typeData.color + '44', backgroundColor: typeData.color + '08' }]}>
            <MaterialCommunityIcons name={typeData.icon as any} size={32} color={typeData.color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: typeData.color }]}>{typeData.label}</Text>
              <Text style={styles.statusSub}>Week {weeksActive} of maximum {typeData.expiryDays / 7} weeks · {selectedOrders.length} orders in effect</Text>
            </View>
          </View>

          {/* Active orders */}
          <Text style={styles.sectionLabel}>ACTIVE ORDERS & REGULATIONS</Text>
          {selectedOrders.map(o => (
            <View key={o.id} style={styles.activeOrderItem}>
              <MaterialCommunityIcons name="check-circle" size={13} color={typeData.color} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeOrderLabel}>{o.label}</Text>
                {o.charterSection ? <Text style={styles.activeOrderCharter}>{o.charterSection}</Text> : null}
              </View>
              {o.constitutionalRisk > 70 ? <View style={styles.challengeBadge}><Text style={styles.challengeBadgeText}>CHALLENGED</Text></View> : null}
            </View>
          ))}

          {/* Parliamentary review */}
          <View style={styles.parlamentaryReviewCard}>
            <MaterialCommunityIcons name="domain" size={16} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.parliamentaryReviewTitle}>Parliamentary Review Required</Text>
              <Text style={styles.parliamentaryReviewDesc}>Parliament must confirm this declaration. Either the House or Senate can revoke it at any time. A Special Joint Parliamentary Committee will review all emergency measures.</Text>
            </View>
          </View>

          {!parliamentVoteResult ? (
            <Pressable onPress={handleParliamentVote} style={({ pressed }) => [styles.parliamentVoteBtn, { backgroundColor: Colors.gold + '22', borderColor: Colors.gold + '55' }, pressed && { opacity: 0.85 }]}>
              <MaterialCommunityIcons name="vote" size={16} color={Colors.gold} />
              <Text style={[styles.parliamentVoteBtnText, { color: Colors.gold }]}>Conduct Parliamentary Confirmation Vote</Text>
            </Pressable>
          ) : (
            <View style={[styles.voteResultCard, { borderColor: (parliamentVoteResult.house && parliamentVoteResult.senate ? Colors.success : Colors.error) + '55' }]}>
              <Text style={styles.sectionLabel}>PARLIAMENTARY VOTE RESULT</Text>
              <View style={styles.voteResultRow}>
                <MaterialCommunityIcons name={parliamentVoteResult.house ? 'check-circle' : 'close-circle'} size={14} color={parliamentVoteResult.house ? Colors.success : Colors.error} />
                <Text style={[styles.voteResultText, { color: parliamentVoteResult.house ? Colors.success : Colors.error }]}>
                  House of Commons: {parliamentVoteResult.house ? 'CONFIRMED' : 'REVOKED'}
                </Text>
              </View>
              <View style={styles.voteResultRow}>
                <MaterialCommunityIcons name={parliamentVoteResult.senate ? 'check-circle' : 'close-circle'} size={14} color={parliamentVoteResult.senate ? Colors.success : Colors.error} />
                <Text style={[styles.voteResultText, { color: parliamentVoteResult.senate ? Colors.success : Colors.error }]}>
                  Senate: {parliamentVoteResult.senate ? 'CONFIRMED' : 'REVOKED'}
                </Text>
              </View>
            </View>
          )}

          <Pressable onPress={handleLiftAct} style={({ pressed }) => [styles.liftBtn, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="check-circle" size={16} color={Colors.warning} />
            <Text style={styles.liftBtnText}>Lift the Emergencies Act</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── LIFTED ───────────────────────────────────────────────────────────────────
  if (actStatus === 'lifted') {
    const typeData = EMERGENCY_TYPES[selectedType!];
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Emergency Concluded</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.liftedCard}>
            <MaterialCommunityIcons name="check-circle" size={56} color={Colors.success} />
            <Text style={styles.liftedTitle}>Emergencies Act Lifted</Text>
            <Text style={styles.liftedDesc}>All emergency orders have ceased to have effect. The {typeData.label} declaration has been revoked.</Text>
          </View>
          <View style={styles.requiredActionsCard}>
            <Text style={styles.sectionLabel}>REQUIRED NEXT STEPS (Emergencies Act, s. 62)</Text>
            {[
              'Initiate a public inquiry within 60 days into the circumstances of the emergency and use of emergency powers',
              'Table a full report to Parliament on all orders and regulations made during the emergency',
              'Provide compensation to persons whose property was requisitioned or whose rights were affected by emergency orders',
              'Dissolve the Special Joint Parliamentary Review Committee',
            ].map((item, idx) => (
              <View key={idx} style={styles.requiredActionRow}>
                <MaterialCommunityIcons name="information" size={12} color={Colors.info} />
                <Text style={styles.requiredActionText}>{item}</Text>
              </View>
            ))}
          </View>
          <Pressable onPress={() => router.replace('/(tabs)')} style={({ pressed }) => [styles.invokeBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}>
            <Text style={styles.invokeBtnText}>Return to Parliament</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  pmBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1 },
  pmBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  sectionNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
  // Legal context
  legalContextCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.gold + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.md },
  legalContextTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold, marginBottom: 4 },
  legalContextText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  // Type cards
  typeCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  typeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  typeCardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  typeCardExpiry: { fontSize: FontSize.xs, color: Colors.textMuted },
  typeCardDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  thresholdNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderRadius: Radius.sm, padding: 7, borderWidth: 1 },
  thresholdNoteText: { flex: 1, fontSize: FontSize.xs, lineHeight: 16, fontStyle: 'italic' },
  triggersLabel: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.5 },
  triggerPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  triggerPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  triggerPillText: { fontSize: 9, fontWeight: FontWeight.medium },
  // Risk meter
  riskMeter: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 8 },
  riskMeterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  riskMeterLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  riskMeterValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  riskBar: { flexDirection: 'row', height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden' },
  riskBarFill: { minWidth: 4, borderRadius: 4 },
  riskMeterNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
  // Order cards
  orderCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  orderCardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  orderLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 4, flex: 1 },
  orderDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  charterNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, backgroundColor: Colors.warning + '08', borderRadius: Radius.sm, padding: 5, borderWidth: 1, borderColor: Colors.warning + '33' },
  charterNoteText: { flex: 1, fontSize: 10, color: Colors.warning, lineHeight: 15 },
  orderStats: { flexDirection: 'row', gap: 6, marginTop: 8 },
  orderStat: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  orderStatText: { fontSize: 9, fontWeight: FontWeight.bold },
  noOrdersNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: Spacing.sm },
  noOrdersText: { fontSize: FontSize.xs, color: Colors.textMuted },
  // Safeguards
  safeguardCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  safeguardCheck: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: Colors.surfaceBorder, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  safeguardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  safeguardLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, flex: 1 },
  safeguardDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  requiredBadge: { backgroundColor: Colors.error + '22', paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  requiredBadgeText: { fontSize: 8, fontWeight: FontWeight.bold, color: Colors.error, letterSpacing: 0.5 },
  optionalBadge: { backgroundColor: Colors.info + '22', paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  optionalBadgeText: { fontSize: 8, fontWeight: FontWeight.bold, color: Colors.info, letterSpacing: 0.5 },
  safeguardWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.warning + '11', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.warning + '33' },
  safeguardWarningText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, lineHeight: 17 },
  safeguardReady: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.success + '0D', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.success + '22' },
  safeguardReadyText: { fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.medium },
  // Justification
  justificationInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 150, lineHeight: 22 },
  wordCount: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' },
  // Invoke
  invokeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  invokeBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  // Invoked header
  invokedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderBottomWidth: 1, backgroundColor: Colors.error + '08' },
  invokedHeaderText: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, letterSpacing: 1.5 },
  // Status card
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  statusTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  statusSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  // Active orders
  activeOrderItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm },
  activeOrderLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  activeOrderCharter: { fontSize: 10, color: Colors.warning, marginTop: 2 },
  challengeBadge: { backgroundColor: Colors.error + '22', paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  challengeBadgeText: { fontSize: 8, fontWeight: FontWeight.bold, color: Colors.error },
  // Parliament review
  parlamentaryReviewCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.gold + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.md },
  parliamentaryReviewTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold, marginBottom: 4 },
  parliamentaryReviewDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  parliamentVoteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  parliamentVoteBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  voteResultCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 8 },
  voteResultRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voteResultText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  liftBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.warning + '55', backgroundColor: Colors.warning + '11' },
  liftBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.warning },
  // Lifted
  liftedCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.success + '44', padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  liftedTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  liftedDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  requiredActionsCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 10 },
  requiredActionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  requiredActionText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
});
