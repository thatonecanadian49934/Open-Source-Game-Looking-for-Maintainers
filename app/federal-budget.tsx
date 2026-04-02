// Powered by OnSpace.AI — Federal Budget Day (real Canadian procedure)
// Finance Minister presents budget. Confidence matter. PBO costing. AG oversight.
// Supply: Main Estimates, Supplementary Estimates. Opposition responds.
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Slider,
  Animated, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';
import { getSupabaseClient } from '@/template';

type BudgetPhase = 'intro' | 'allocate' | 'statement' | 'pbo_costing' | 'opposition_day' | 'confidence' | 'result';

interface SpendingCategory {
  id: string;
  name: string;
  icon: string;
  baseline: number; // $ billions baseline
  allocation: number; // player's allocation
  min: number;
  max: number;
  description: string;
  approvalImpact: string;
}

const SPENDING_CATEGORIES: SpendingCategory[] = [
  { id: 'healthcare', name: 'Health Transfers (CHT)', icon: 'hospital', baseline: 52, allocation: 52, min: 40, max: 80, description: 'Canada Health Transfer to provinces for universal healthcare.', approvalImpact: '+3% if increased, -4% if cut' },
  { id: 'social', name: 'Social Programs', icon: 'account-heart', baseline: 34, allocation: 34, min: 20, max: 55, description: 'EI, disability, child benefits, social safety net.', approvalImpact: '+4% if increased, -5% if cut' },
  { id: 'defence', name: 'National Defence', icon: 'shield', baseline: 27, allocation: 27, min: 20, max: 50, description: 'Canadian Armed Forces, NORAD, NATO commitments.', approvalImpact: 'Moderate impact' },
  { id: 'infrastructure', name: 'Infrastructure Bank', icon: 'road', baseline: 15, allocation: 15, min: 5, max: 30, description: 'Federal infrastructure investments, transit, broadband.', approvalImpact: '+2% if increased' },
  { id: 'environment', name: 'Climate & Environment', icon: 'leaf', baseline: 12, allocation: 12, min: 5, max: 25, description: 'Clean energy transition, carbon tax rebates, conservation.', approvalImpact: 'Urban +, rural -' },
  { id: 'indigenous', name: 'Indigenous Services', icon: 'hand-heart', baseline: 8, allocation: 8, min: 5, max: 20, description: 'First Nations, Métis, Inuit services and reconciliation.', approvalImpact: '+2% nationally if increased' },
  { id: 'housing', name: 'Canada Mortgage & Housing', icon: 'home-city', baseline: 10, allocation: 10, min: 5, max: 30, description: 'Affordable housing, CMHC programs, rent supplements.', approvalImpact: '+5% among renters if increased' },
  { id: 'debt_service', name: 'Debt Servicing Costs', icon: 'bank', baseline: 44, allocation: 44, min: 30, max: 60, description: 'Interest on federal debt. Cannot go below minimum.', approvalImpact: 'No direct impact — mandatory' },
];

const REVENUE_SOURCES = [
  { name: 'Personal Income Tax', amount: 182, adjustable: true },
  { name: 'Corporate Income Tax', amount: 56, adjustable: true },
  { name: 'GST/HST', amount: 49, adjustable: false },
  { name: 'Employment Insurance', amount: 22, adjustable: false },
  { name: 'Carbon Pricing Revenue', amount: 11, adjustable: true },
  { name: 'Non-Tax Revenue', amount: 28, adjustable: false },
];

export default function FederalBudgetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, issuePressStatement, executeForeignPolicy } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [phase, setPhase] = useState<BudgetPhase>('intro');
  const [categories, setCategories] = useState<SpendingCategory[]>(SPENDING_CATEGORIES);
  const [taxRate, setTaxRate] = useState(0); // -2 to +2 percentage points on income tax
  const [corporateTax, setCorporateTax] = useState(0);
  const [budgetStatement, setBudgetStatement] = useState('');
  const [pboAnalysis, setPboAnalysis] = useState('');
  const [oppositionResponse, setOppositionResponse] = useState('');
  const [playerResponse, setPlayerResponse] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [budgetPassed, setBudgetPassed] = useState<boolean | null>(null);
  const [budgetType, setBudgetType] = useState<'expansionary' | 'austerity' | 'balanced'>('balanced');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [phase]);

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const isGoverning = gameState.isGoverning;

  const totalSpending = categories.reduce((s, c) => s + c.allocation, 0);
  const baseRevenue = REVENUE_SOURCES.reduce((s, r) => s + r.amount, 0);
  const adjustedRevenue = baseRevenue + (taxRate * 12) + (corporateTax * 4);
  const deficit = totalSpending - adjustedRevenue;
  const deficitBn = Math.abs(Math.round(deficit));
  const isDeficit = deficit > 0;

  const getBudgetType = (): 'expansionary' | 'austerity' | 'balanced' => {
    if (deficit > 20) return 'expansionary';
    if (deficit < -10) return 'austerity';
    return 'balanced';
  };

  const getApprovalImpact = () => {
    const type = getBudgetType();
    const healthDelta = categories.find(c => c.id === 'healthcare')!.allocation - 52;
    const socialDelta = categories.find(c => c.id === 'social')!.allocation - 34;
    const housingDelta = categories.find(c => c.id === 'housing')!.allocation - 10;
    let base = type === 'expansionary' ? 5 : type === 'austerity' ? -8 : 1;
    base += Math.min(5, Math.floor(healthDelta / 5));
    base += Math.min(5, Math.floor(socialDelta / 4));
    base += Math.min(3, Math.floor(housingDelta / 3));
    base -= taxRate * 3;
    return Math.max(-15, Math.min(12, base));
  };

  const updateCategory = (id: string, value: number) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, allocation: value } : c));
  };

  const generatePBOCosting = async () => {
    setGeneratingAI(true);
    try {
      const { data } = await supabase.functions.invoke('ai-question-period', {
        body: {
          partyName: party?.name, leaderName: gameState.playerName, isGoverning: true,
          stats: gameState.stats, currentEvents: [], rivals: [], weekNumber: gameState.currentWeek,
          parliamentNumber: gameState.parliamentNumber, recentNewsHeadlines: [],
          context: `You are the Parliamentary Budget Officer of Canada. Analyze this federal budget:\n\nTotal spending: $${Math.round(totalSpending)}B\nTotal revenue: $${Math.round(adjustedRevenue)}B\n${isDeficit ? 'Deficit' : 'Surplus'}: $${deficitBn}B\nBudget type: ${getBudgetType()}\nKey changes: Healthcare +${categories[0].allocation - 52}B, Social ${categories[1].allocation - 34}B, Defence ${categories[2].allocation - 27}B.\n\nProvide a 2-3 sentence independent fiscal analysis as the PBO. Be specific about sustainability, debt trajectory, and whether projections are realistic. Be direct and non-partisan.`,
        },
      });
      if (data?.questions?.[0]?.question) setPboAnalysis(data.questions[0].question);
    } catch {}
    setGeneratingAI(false);
    setPhase('opposition_day');
  };

  const generateOppositionResponse = async () => {
    setGeneratingAI(true);
    try {
      const { data } = await supabase.functions.invoke('ai-question-period', {
        body: {
          partyName: party?.name, leaderName: gameState.playerName, isGoverning: false,
          stats: gameState.stats, currentEvents: [], rivals: [], weekNumber: gameState.currentWeek,
          parliamentNumber: gameState.parliamentNumber, recentNewsHeadlines: [],
          context: `Generate a tough 2-sentence opposition response to this federal budget. Budget: $${Math.round(totalSpending)}B spending, $${deficitBn}B ${isDeficit ? 'deficit' : 'surplus'}, type: ${getBudgetType()}. The opposition should attack either overspending and growing debt (if deficit) or cruel cuts (if austerity). Make it punchy and political.`,
        },
      });
      if (data?.questions?.[0]?.question) setOppositionResponse(data.questions[0].question);
    } catch {
      setOppositionResponse(`This government's budget is a betrayal of fiscal responsibility. Canadians deserve better than $${deficitBn}B in additional debt while core services remain underfunded.`);
    }
    setGeneratingAI(false);
  };

  const handleConfidenceVote = () => {
    const playerSeats = gameState.seats[gameState.playerPartyId] || 0;
    const hasMajority = playerSeats >= 172;
    const approvalImpact = getApprovalImpact();
    const words = playerResponse.trim().split(/\s+/).filter(Boolean).length;
    const speechBonus = words > 80 ? 10 : words > 40 ? 3 : 0;
    const baseChance = hasMajority ? 92 : 48 + (gameState.stats.governmentApproval - 38) + speechBonus + (approvalImpact > 0 ? 10 : -5);
    const passed = Math.random() * 100 < Math.max(5, Math.min(96, baseChance));
    setBudgetPassed(passed);
    setBudgetType(getBudgetType());
    if (passed) {
      issuePressStatement(`The federal budget has passed the House of Commons. The government's fiscal plan — with $${Math.round(totalSpending)}B in spending and a $${deficitBn}B ${isDeficit ? 'deficit' : 'surplus'} — is now law.`);
      executeForeignPolicy?.('budget_passed', 'domestic', approvalImpact, (getBudgetType() === 'expansionary' ? 0.5 : getBudgetType() === 'austerity' ? -0.3 : 0.1));
    }
    setPhase('result');
  };

  // ── INTRO ────────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>Federal Budget Day</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroCard, { borderColor: Colors.gold + '44' }]}>
            <MaterialCommunityIcons name="cash-multiple" size={56} color={Colors.gold} />
            <Text style={[styles.heroTitle, { color: Colors.gold }]}>Budget Day</Text>
            <Text style={styles.heroDesc}>
              The Minister of Finance presents the government's fiscal plan to the House of Commons. The budget is a confidence matter — defeat triggers an election.
            </Text>
          </View>
          <View style={styles.procedureSteps}>
            <Text style={styles.sectionLabel}>BUDGET PROCEDURE</Text>
            {[
              { icon: 'lock', title: 'Budget Lockup', desc: 'Journalists and analysts receive budget documents under embargo hours before tabling.' },
              { icon: 'cash-multiple', title: 'Budget Speech', desc: 'The Finance Minister rises in the House to deliver the Budget Speech — typically 45-90 minutes.' },
              { icon: 'magnify', title: 'PBO Independent Analysis', desc: 'The Parliamentary Budget Officer provides an independent non-partisan fiscal assessment.' },
              { icon: 'calendar', title: 'Four-Day Budget Debate', desc: 'House debates the budget for 4 days. Opposition moves non-confidence amendments.' },
              { icon: 'vote', title: 'Confidence Vote', desc: 'The budget vote is a confidence matter. Government defeat triggers dissolution and election.' },
              { icon: 'gavel', title: 'Supply Bills', desc: 'If passed, supply bills (appropriation acts) are introduced to authorize government spending.' },
            ].map((s, i) => (
              <View key={i} style={styles.procRow}>
                <View style={[styles.procIcon, { backgroundColor: Colors.gold + '22' }]}>
                  <MaterialCommunityIcons name={s.icon as any} size={16} color={Colors.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.procTitle}>{s.title}</Text>
                  <Text style={styles.procDesc}>{s.desc}</Text>
                </View>
              </View>
            ))}
          </View>
          {isGoverning ? (
            <Pressable onPress={() => setPhase('allocate')} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}>
              <MaterialCommunityIcons name="cash-multiple" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Open Budget Lockup — Allocate Spending</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setPhase('opposition_day')} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: Colors.warning }, pressed && { opacity: 0.85 }]}>
              <MaterialCommunityIcons name="account-voice" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Prepare Opposition Budget Response</Text>
            </Pressable>
          )}
        </ScrollView>
      </Animated.View>
    );
  }

  // ── ALLOCATE ─────────────────────────────────────────────────────────────────
  if (phase === 'allocate') {
    const approvalImpact = getApprovalImpact();
    const type = getBudgetType();
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setPhase('intro')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>Budget Allocation</Text>
          <View style={[styles.deficitBadge, { backgroundColor: isDeficit ? Colors.error + '22' : Colors.success + '22' }]}>
            <Text style={[styles.deficitText, { color: isDeficit ? Colors.error : Colors.success }]}>
              {isDeficit ? 'DEF' : 'SUR'} ${deficitBn}B
            </Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 60 }]} showsVerticalScrollIndicator={false}>
          {/* Fiscal summary */}
          <View style={styles.fiscalSummary}>
            <View style={[styles.fiscalItem, { backgroundColor: Colors.error + '11' }]}>
              <Text style={styles.fiscalLabel}>Total Spending</Text>
              <Text style={[styles.fiscalValue, { color: Colors.error }]}>${Math.round(totalSpending)}B</Text>
            </View>
            <View style={[styles.fiscalItem, { backgroundColor: Colors.success + '11' }]}>
              <Text style={styles.fiscalLabel}>Revenue</Text>
              <Text style={[styles.fiscalValue, { color: Colors.success }]}>${Math.round(adjustedRevenue)}B</Text>
            </View>
            <View style={[styles.fiscalItem, { backgroundColor: (isDeficit ? Colors.error : Colors.success) + '11' }]}>
              <Text style={styles.fiscalLabel}>{isDeficit ? 'Deficit' : 'Surplus'}</Text>
              <Text style={[styles.fiscalValue, { color: isDeficit ? Colors.error : Colors.success }]}>${deficitBn}B</Text>
            </View>
          </View>

          <View style={[styles.budgetTypeBadge, { backgroundColor: type === 'expansionary' ? Colors.warning + '22' : type === 'austerity' ? Colors.error + '22' : Colors.success + '22' }]}>
            <MaterialCommunityIcons name={type === 'expansionary' ? 'trending-up' : type === 'austerity' ? 'trending-down' : 'trending-neutral'} size={14} color={type === 'expansionary' ? Colors.warning : type === 'austerity' ? Colors.error : Colors.success} />
            <Text style={[styles.budgetTypeText, { color: type === 'expansionary' ? Colors.warning : type === 'austerity' ? Colors.error : Colors.success }]}>
              {type === 'expansionary' ? 'Expansionary Budget' : type === 'austerity' ? 'Austerity Budget' : 'Balanced Budget'} · Approval impact: {approvalImpact > 0 ? '+' : ''}{approvalImpact}%
            </Text>
          </View>

          <Text style={styles.sectionLabel}>SPENDING CATEGORIES ($ Billions)</Text>
          {categories.map(cat => (
            <View key={cat.id} style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <MaterialCommunityIcons name={cat.icon as any} size={18} color={partyColor} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.categoryDesc}>{cat.description}</Text>
                </View>
                <View style={[styles.allocationBadge, { backgroundColor: cat.allocation > cat.baseline ? Colors.success + '22' : cat.allocation < cat.baseline ? Colors.error + '22' : Colors.surfaceElevated }]}>
                  <Text style={[styles.allocationText, { color: cat.allocation > cat.baseline ? Colors.success : cat.allocation < cat.baseline ? Colors.error : Colors.textMuted }]}>
                    ${cat.allocation}B {cat.allocation !== cat.baseline ? (cat.allocation > cat.baseline ? `(+${cat.allocation - cat.baseline})` : `(-${cat.baseline - cat.allocation})`) : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.sliderRow}>
                <Text style={styles.sliderMin}>${cat.min}B</Text>
                <View style={{ flex: 1, paddingHorizontal: 8 }}>
                  {/* Slider substitute */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.sliderBtns}>
                      {[cat.min, Math.round((cat.min + cat.baseline) / 2), cat.baseline, Math.round((cat.baseline + cat.max) / 2), cat.max].filter((v, i, a) => a.indexOf(v) === i).map(v => (
                        <Pressable key={v} onPress={() => updateCategory(cat.id, v)} style={[styles.sliderBtn, cat.allocation === v && { backgroundColor: partyColor, borderColor: partyColor }]}>
                          <Text style={[styles.sliderBtnText, cat.allocation === v && { color: '#fff' }]}>${v}B</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
                <Text style={styles.sliderMax}>${cat.max}B</Text>
              </View>
              <Text style={styles.approvalImpactNote}>{cat.approvalImpact}</Text>
            </View>
          ))}

          <Text style={styles.sectionLabel}>TAX POLICY ADJUSTMENTS</Text>
          <View style={styles.taxCard}>
            <Text style={styles.categoryName}>Personal Income Tax Rate</Text>
            <View style={styles.sliderBtns}>
              {[-2, -1, 0, 1, 2].map(v => (
                <Pressable key={v} onPress={() => setTaxRate(v)} style={[styles.sliderBtn, taxRate === v && { backgroundColor: partyColor, borderColor: partyColor }]}>
                  <Text style={[styles.sliderBtnText, taxRate === v && { color: '#fff' }]}>{v > 0 ? '+' : ''}{v}%</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.approvalImpactNote}>Revenue impact: {taxRate > 0 ? `+$${taxRate * 12}B` : taxRate < 0 ? `-$${Math.abs(taxRate * 12)}B` : 'No change'}</Text>
          </View>
          <View style={styles.taxCard}>
            <Text style={styles.categoryName}>Corporate Income Tax Rate</Text>
            <View style={styles.sliderBtns}>
              {[-2, -1, 0, 1, 2].map(v => (
                <Pressable key={v} onPress={() => setCorporateTax(v)} style={[styles.sliderBtn, corporateTax === v && { backgroundColor: partyColor, borderColor: partyColor }]}>
                  <Text style={[styles.sliderBtnText, corporateTax === v && { color: '#fff' }]}>{v > 0 ? '+' : ''}{v}%</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.approvalImpactNote}>Revenue impact: {corporateTax > 0 ? `+$${corporateTax * 4}B` : corporateTax < 0 ? `-$${Math.abs(corporateTax * 4)}B` : 'No change'}</Text>
          </View>

          <Pressable onPress={() => setPhase('statement')} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="cash-multiple" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Table Budget — Write Finance Minister Speech</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    );
  }

  // ── STATEMENT ─────────────────────────────────────────────────────────────────
  if (phase === 'statement') {
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setPhase('allocate')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>Budget Speech</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.speechContext}>
            <MaterialCommunityIcons name="cash-multiple" size={20} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.speechContextTitle}>Finance Minister Rising in the House</Text>
              <Text style={styles.speechContextSub}>Mr./Madam Speaker, I am pleased to table Budget {new Date().getFullYear() + Math.floor(gameState.currentWeek / 52)}</Text>
            </View>
          </View>

          <View style={styles.budgetSummaryCard}>
            <Text style={styles.sectionLabel}>BUDGET SUMMARY</Text>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total Spending:</Text><Text style={[styles.summaryValue, { color: Colors.error }]}>${Math.round(totalSpending)}B</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total Revenue:</Text><Text style={[styles.summaryValue, { color: Colors.success }]}>${Math.round(adjustedRevenue)}B</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{isDeficit ? 'Deficit:' : 'Surplus:'}</Text><Text style={[styles.summaryValue, { color: isDeficit ? Colors.error : Colors.success }]}>${deficitBn}B</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Budget Type:</Text><Text style={[styles.summaryValue, { color: Colors.gold }]}>{getBudgetType().toUpperCase()}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Approval Impact:</Text><Text style={[styles.summaryValue, { color: getApprovalImpact() >= 0 ? Colors.success : Colors.error }]}>{getApprovalImpact() > 0 ? '+' : ''}{getApprovalImpact()}%</Text></View>
          </View>

          <Text style={styles.sectionLabel}>BUDGET SPEECH — KEY MESSAGES</Text>
          <TextInput
            style={styles.speechInput}
            multiline
            placeholder="Write the Finance Minister's key budget messages. Explain your fiscal choices, highlight investments, defend the deficit/surplus. The media will dissect every word..."
            placeholderTextColor={Colors.textMuted}
            value={budgetStatement}
            onChangeText={setBudgetStatement}
            textAlignVertical="top"
          />
          <Text style={styles.wordCount}>{budgetStatement.trim().split(/\s+/).filter(Boolean).length} words</Text>

          <Pressable onPress={async () => { await generatePBOCosting(); }} disabled={generatingAI || !budgetStatement.trim()} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, (!budgetStatement.trim() || generatingAI) && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="robot" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{generatingAI ? 'PBO Analyzing...' : 'Table Budget — Request PBO Analysis'}</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    );
  }

  // ── OPPOSITION DAY / PBO ──────────────────────────────────────────────────────
  if (phase === 'opposition_day') {
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>Budget Debate — Days 1-4</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {pboAnalysis ? (
            <View style={[styles.pboCard, { borderColor: Colors.info + '44' }]}>
              <View style={styles.pboHeader}>
                <MaterialCommunityIcons name="scale-balance" size={16} color={Colors.info} />
                <Text style={styles.pboTitle}>Parliamentary Budget Officer — Independent Analysis</Text>
              </View>
              <Text style={styles.pboText}>{pboAnalysis}</Text>
            </View>
          ) : null}

          {oppositionResponse ? (
            <View style={[styles.oppositionCard, { borderColor: Colors.error + '44' }]}>
              <Text style={styles.sectionLabel}>OFFICIAL OPPOSITION RESPONSE</Text>
              <Text style={styles.oppositionText}>{oppositionResponse}</Text>
            </View>
          ) : (
            <Pressable onPress={generateOppositionResponse} disabled={generatingAI} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: Colors.warning }, generatingAI && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
              <MaterialCommunityIcons name="robot" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{generatingAI ? 'Generating...' : 'Generate Opposition Budget Response'}</Text>
            </Pressable>
          )}

          {oppositionResponse ? (
            <>
              <Text style={styles.sectionLabel}>YOUR RESPONSE TO OPPOSITION CRITICS</Text>
              <TextInput
                style={styles.speechInput}
                multiline
                placeholder="Defend your budget in the 4-day budget debate. Address the PBO's concerns, counter the opposition's attacks, and make the case for your fiscal vision..."
                placeholderTextColor={Colors.textMuted}
                value={playerResponse}
                onChangeText={setPlayerResponse}
                textAlignVertical="top"
              />
              <Text style={styles.wordCount}>{playerResponse.trim().split(/\s+/).filter(Boolean).length} words</Text>
              <Pressable onPress={() => setPhase('confidence')} disabled={!playerResponse.trim()} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: partyColor }, !playerResponse.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
                <MaterialCommunityIcons name="vote" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Close Debate — Call Budget Confidence Vote</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </Animated.View>
    );
  }

  // ── CONFIDENCE ────────────────────────────────────────────────────────────────
  if (phase === 'confidence') {
    const playerSeats = gameState.seats[gameState.playerPartyId] || 0;
    const hasMajority = playerSeats >= 172;
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]}>Budget Confidence Vote</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.voteCard}>
            <MaterialCommunityIcons name="vote" size={48} color={Colors.gold} />
            <Text style={styles.voteTitle}>The House Divides on Supply</Text>
            <Text style={styles.voteDesc}>
              Budget votes are confidence matters. {hasMajority ? 'Your majority government will carry the vote.' : 'As a minority government, you need support from at least one opposition party.'}
            </Text>
            <View style={styles.budgetFinalSummary}>
              <Text style={[styles.budgetFinalItem, { color: isDeficit ? Colors.error : Colors.success }]}>
                {isDeficit ? `$${deficitBn}B DEFICIT` : `$${deficitBn}B SURPLUS`} · {getBudgetType().toUpperCase()}
              </Text>
              <Text style={styles.budgetFinalItem}>
                Approval forecast: {getApprovalImpact() > 0 ? '+' : ''}{getApprovalImpact()}%
              </Text>
            </View>
          </View>
          <Pressable onPress={handleConfidenceVote} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: Colors.gold }, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="vote" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Call the Vote on Supply</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.resultCard, { borderColor: (budgetPassed ? Colors.success : Colors.error) + '55' }]}>
            <MaterialCommunityIcons name={budgetPassed ? 'check-decagram' : 'close-circle'} size={72} color={budgetPassed ? Colors.success : Colors.error} />
            <Text style={[styles.resultTitle, { color: budgetPassed ? Colors.success : Colors.error }]}>
              {budgetPassed ? 'Budget Passed — Royal Assent Granted' : 'Budget Defeated — Parliament Dissolved'}
            </Text>
            <Text style={styles.resultDesc}>
              {budgetPassed
                ? `The Appropriation Act has received Royal Assent. The Treasury Board may now authorize government spending for the fiscal year. The ${getBudgetType()} budget takes effect immediately.`
                : 'The government has been defeated on the budget — a fundamental confidence matter. The Governor General has accepted the Prime Minister\'s advice to dissolve Parliament. A general election will be held.'}
            </Text>
          </View>
          {budgetPassed ? (
            <View style={styles.nextStepsCard}>
              <Text style={styles.sectionLabel}>BUDGET IMPLEMENTATION</Text>
              {[
                `Appropriation Act: $${Math.round(totalSpending)}B authorized for the fiscal year`,
                `Main Estimates tabled — Standing Committee on Finance will review departmental spending`,
                'Supplementary Estimates (A) to follow in fall to adjust for new spending commitments',
                `National debt ${isDeficit ? 'increases' : 'decreases'} by $${deficitBn}B — PBO will track quarterly`,
                'Spring Economic Statement planned to update economic projections',
              ].map((s, i) => (
                <View key={i} style={styles.nextStepRow}>
                  <MaterialCommunityIcons name="check" size={12} color={Colors.success} />
                  <Text style={styles.nextStepText}>{s}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Pressable onPress={() => router.replace('/(tabs)')} style={({ pressed }) => [styles.primaryBtn, { backgroundColor: budgetPassed ? partyColor : Colors.error }, pressed && { opacity: 0.85 }]}>
            <Text style={styles.primaryBtnText}>{budgetPassed ? 'Return to Parliament' : 'Proceed to Election'}</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  deficitBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  deficitText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  sectionNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  heroCard: { backgroundColor: Colors.card, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  heroTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  heroDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  procedureSteps: { gap: Spacing.sm },
  procRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  procIcon: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  procTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 2 },
  procDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  fiscalSummary: { flexDirection: 'row', gap: 8 },
  fiscalItem: { flex: 1, borderRadius: Radius.sm, padding: Spacing.sm, alignItems: 'center', gap: 3 },
  fiscalLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  fiscalValue: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold },
  budgetTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.sm, padding: Spacing.sm },
  budgetTypeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  categoryCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  categoryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  categoryName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 2 },
  categoryDesc: { fontSize: FontSize.xs, color: Colors.textSecondary },
  allocationBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  allocationText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sliderMin: { fontSize: 9, color: Colors.textMuted, width: 32 },
  sliderMax: { fontSize: 9, color: Colors.textMuted, width: 32, textAlign: 'right' },
  sliderBtns: { flexDirection: 'row', gap: 6 },
  sliderBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, backgroundColor: Colors.surfaceElevated },
  sliderBtnText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  approvalImpactNote: { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic' },
  taxCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 10 },
  speechContext: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.gold + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.md },
  speechContextTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.gold },
  speechContextSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  budgetSummaryCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryValue: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  speechInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 120, lineHeight: 22 },
  wordCount: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' },
  pboCard: { backgroundColor: Colors.info + '08', borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 8 },
  pboHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pboTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.info, flex: 1 },
  pboText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, fontStyle: 'italic' },
  oppositionCard: { backgroundColor: Colors.error + '08', borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 8 },
  oppositionText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22, fontStyle: 'italic' },
  voteCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '44', padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  voteTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  voteDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  budgetFinalSummary: { gap: 4 },
  budgetFinalItem: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: 'center' },
  resultCard: { borderRadius: Radius.xl, borderWidth: 2, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card },
  resultTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, textAlign: 'center' },
  resultDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  nextStepsCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.success + '33', padding: Spacing.md, gap: 10 },
  nextStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  nextStepText: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
});
