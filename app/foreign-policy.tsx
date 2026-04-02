// Powered by OnSpace.AI — Improved Foreign Policy with continuous war mechanics
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';

type FPView = 'overview' | 'trade' | 'military' | 'war';

interface TradePartner {
  country: string;
  flag: string;
  gdpBillion: number;
  tradeVolumeBillion: number;
  status: 'ally' | 'neutral' | 'rival' | 'sanctioned';
  existingDeal: boolean;
  dealStatus: 'active' | 'proposed' | 'negotiating' | 'none';
}

interface MilitaryAlliance {
  country: string;
  flag: string;
  alliance: string;
  status: 'allied' | 'partner' | 'none';
  notes: string;
}

type WarPhase = 'active' | 'negotiating' | 'peace_rejected';

interface PeaceDealOption {
  id: string;
  label: string;
  description: string;
  territory?: string;  // province/state name if territory seizure
  selected: boolean;
}

interface ActiveWar {
  country: string;
  flag: string;
  weekDeclared: number;
  weeksActive: number;
  casualties: number;
  approvalImpact: number;
  landGained: number;          // 0-100 — affects peace deal acceptance
  warProgress: 'losing' | 'stalemate' | 'winning' | 'dominant';
  phase: WarPhase;
  peaceTermsRejected: boolean;
  aiSurrenderOffer?: string;   // if AI offers peace
  peaceOptions: PeaceDealOption[];
}

const CANADIAN_PROVINCES_STATES = [
  'Ontario (Canada)', 'Quebec (Canada)', 'British Columbia (Canada)', 'Alberta (Canada)',
  'Manitoba (Canada)', 'Saskatchewan (Canada)', 'Nova Scotia (Canada)', 'New Brunswick (Canada)',
  'Newfoundland & Labrador (Canada)', 'PEI (Canada)', 'Yukon (Canada)', 'NWT (Canada)', 'Nunavut (Canada)',
];

const ENEMY_TERRITORIES: Record<string, string[]> = {
  'Russia': ['Kaliningrad', 'Eastern Ukraine', 'Crimea', 'Karelia'],
  'China': ['Tibet', 'Xinjiang', 'Hainan Province', 'Inner Mongolia'],
  'North Korea': ['Pyongyang Province', 'Hamgyong Province', 'Kangwon Province'],
  'Iran': ['Khuzestan', 'Kurdistan Region', 'Sistan Province'],
  'default': ['Northern Region', 'Eastern Province', 'Coastal Territory', 'Border Region'],
};

const TRADE_PARTNERS: TradePartner[] = [
  { country: 'United States', flag: '🇺🇸', gdpBillion: 26000, tradeVolumeBillion: 850, status: 'ally', existingDeal: true, dealStatus: 'active' },
  { country: 'European Union', flag: '🇪🇺', gdpBillion: 18000, tradeVolumeBillion: 110, status: 'ally', existingDeal: true, dealStatus: 'active' },
  { country: 'United Kingdom', flag: '🇬🇧', gdpBillion: 3000, tradeVolumeBillion: 40, status: 'ally', existingDeal: false, dealStatus: 'negotiating' },
  { country: 'Japan', flag: '🇯🇵', gdpBillion: 4000, tradeVolumeBillion: 35, status: 'ally', existingDeal: true, dealStatus: 'active' },
  { country: 'China', flag: '🇨🇳', gdpBillion: 19000, tradeVolumeBillion: 95, status: 'rival', existingDeal: false, dealStatus: 'none' },
  { country: 'India', flag: '🇮🇳', gdpBillion: 3700, tradeVolumeBillion: 12, status: 'neutral', existingDeal: false, dealStatus: 'none' },
  { country: 'Mexico', flag: '🇲🇽', gdpBillion: 1300, tradeVolumeBillion: 60, status: 'ally', existingDeal: true, dealStatus: 'active' },
  { country: 'South Korea', flag: '🇰🇷', gdpBillion: 1700, tradeVolumeBillion: 20, status: 'ally', existingDeal: false, dealStatus: 'none' },
  { country: 'Brazil', flag: '🇧🇷', gdpBillion: 2100, tradeVolumeBillion: 8, status: 'neutral', existingDeal: false, dealStatus: 'none' },
  { country: 'Australia', flag: '🇦🇺', gdpBillion: 1700, tradeVolumeBillion: 15, status: 'ally', existingDeal: false, dealStatus: 'none' },
  { country: 'Saudi Arabia', flag: '🇸🇦', gdpBillion: 1100, tradeVolumeBillion: 5, status: 'neutral', existingDeal: false, dealStatus: 'none' },
  { country: 'Russia', flag: '🇷🇺', gdpBillion: 2200, tradeVolumeBillion: 2, status: 'sanctioned', existingDeal: false, dealStatus: 'none' },
];

const MILITARY_PARTNERS: MilitaryAlliance[] = [
  { country: 'United States', flag: '🇺🇸', alliance: 'NORAD / NATO', status: 'allied', notes: 'Core defence partnership. Joint continental defence.' },
  { country: 'United Kingdom', flag: '🇬🇧', alliance: 'NATO / Five Eyes', status: 'allied', notes: 'Intelligence sharing and joint operations.' },
  { country: 'France', flag: '🇫🇷', alliance: 'NATO', status: 'allied', notes: 'NATO ally, strong diplomatic ties.' },
  { country: 'Germany', flag: '🇩🇪', alliance: 'NATO', status: 'allied', notes: 'Key European security partner.' },
  { country: 'Australia', flag: '🇦🇺', alliance: 'Five Eyes / AUKUS', status: 'allied', notes: 'Pacific intelligence and security partner.' },
  { country: 'Japan', flag: '🇯🇵', alliance: 'Bilateral', status: 'partner', notes: 'Growing Indo-Pacific security cooperation.' },
  { country: 'Poland', flag: '🇵🇱', alliance: 'NATO', status: 'allied', notes: 'NATO eastern flank partner.' },
  { country: 'Ukraine', flag: '🇺🇦', alliance: 'Support', status: 'partner', notes: 'Military and humanitarian support partner.' },
  { country: 'India', flag: '🇮🇳', alliance: 'None', status: 'none', notes: 'Large democracy, strategic opportunity.' },
  { country: 'Brazil', flag: '🇧🇷', alliance: 'None', status: 'none', notes: 'Hemisphere partner. No formal alliance.' },
];

const STATUS_COLORS: Record<string, string> = {
  ally: Colors.success,
  neutral: Colors.textSecondary,
  rival: Colors.warning,
  sanctioned: Colors.error,
  allied: Colors.success,
  partner: Colors.info,
  none: Colors.textMuted,
  active: Colors.success,
  negotiating: Colors.warning,
  proposed: Colors.info,
};

function buildDefaultPeaceOptions(country: string): PeaceDealOption[] {
  const territories = ENEMY_TERRITORIES[country] || ENEMY_TERRITORIES['default'];
  return [
    {
      id: 'territory',
      label: 'Seize Territory',
      description: `Annex captured regions from ${country}. The more land gained, the easier this is to enforce.`,
      territory: territories[0],
      selected: false,
    },
    {
      id: 'federal_reserves',
      label: 'Seize Federal Reserves',
      description: `Demand transfer of a portion of ${country}'s gold and currency reserves to Canada.`,
      selected: false,
    },
    {
      id: 'observe',
      label: 'Impose Observation Treaty',
      description: `Canada and allied nations maintain observer status in ${country}, monitoring military activities for 10 years.`,
      selected: false,
    },
    {
      id: 'democracy',
      label: 'Impose Democratic System',
      description: `Require ${country} to hold internationally supervised elections and adopt constitutional reforms.`,
      selected: false,
    },
  ];
}

function getWarProgress(landGained: number, weeksActive: number): ActiveWar['warProgress'] {
  if (landGained >= 60) return 'dominant';
  if (landGained >= 35) return 'winning';
  if (landGained >= 15) return 'stalemate';
  return 'losing';
}

function getPeaceDealAcceptanceChance(war: ActiveWar): number {
  // Base: higher land gained = higher acceptance chance
  let base = 20 + war.landGained * 0.7;
  // More demanding terms = lower acceptance
  const selectedTerms = war.peaceOptions.filter(o => o.selected).length;
  base -= selectedTerms * 12;
  // Rejected before = harder
  if (war.peaceTermsRejected) base -= 15;
  return Math.max(5, Math.min(90, Math.round(base)));
}

export default function ForeignPolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, executeForeignPolicy } = useGame();
  const { showAlert } = useAlert();

  const [view, setView] = useState<FPView>('overview');
  const [tradePartners, setTradePartners] = useState<TradePartner[]>(TRADE_PARTNERS);
  const [militaryAlliances, setMilitaryAlliances] = useState<MilitaryAlliance[]>(MILITARY_PARTNERS);
  const [activeWars, setActiveWars] = useState<ActiveWar[]>([]);
  const [proposingDeal, setProposingDeal] = useState<string | null>(null);
  const [dealTerms, setDealTerms] = useState('');
  const [selectedWarForPeace, setSelectedWarForPeace] = useState<string | null>(null);
  const [selectedTerritories, setSelectedTerritories] = useState<Record<string, string>>({});

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;

  if (!gameState.isGoverning) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Foreign Policy</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.restrictedState}>
          <MaterialCommunityIcons name="lock" size={56} color={Colors.textMuted} />
          <Text style={styles.restrictedTitle}>Government Only</Text>
          <Text style={styles.restrictedText}>
            Foreign policy powers — trade deals, military alliances, declarations of war, and peace negotiations — are exercised exclusively by the Prime Minister.
          </Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtnLarge, pressed && { opacity: 0.8 }]}>
            <Text style={styles.backBtnLargeText}>Return to Dashboard</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── War simulation: each week war continues, land gained changes ────────────
  const simulateWeekOfWar = (war: ActiveWar): ActiveWar => {
    const weekGain = Math.random() * 10 - 3; // -3 to +7 each week
    const newLandGained = Math.max(0, Math.min(100, war.landGained + weekGain));
    const newCasualties = war.casualties + Math.floor(Math.random() * 50 + 10);
    const newWeeks = war.weeksActive + 1;
    const progress = getWarProgress(newLandGained, newWeeks);
    // AI may offer peace if losing badly
    const aiSurrenderOffer = newLandGained >= 70 && !war.aiSurrenderOffer
      ? `${war.country} has reached out via back channels requesting ceasefire negotiations.`
      : war.aiSurrenderOffer;
    return { ...war, landGained: newLandGained, casualties: newCasualties, weeksActive: newWeeks, warProgress: progress, aiSurrenderOffer };
  };

  const handleProposeTrade = (country: string) => {
    setProposingDeal(country);
    setDealTerms('');
  };

  const handleConfirmTrade = (country: string, action: 'propose' | 'accept' | 'decline') => {
    const partner = tradePartners.find(p => p.country === country);
    if (!partner) return;

    if (action === 'decline') {
      setTradePartners(prev => prev.map(p => p.country === country ? { ...p, dealStatus: 'none' } : p));
      setProposingDeal(null);
      showAlert('Deal Declined', `Canada has declined trade deal negotiations with ${country}.`);
      executeForeignPolicy?.('trade_decline', country, -1, -2);
      return;
    }

    if (action === 'accept') {
      setTradePartners(prev => prev.map(p => p.country === country ? { ...p, dealStatus: 'active', existingDeal: true } : p));
      setProposingDeal(null);
      showAlert('Trade Deal Signed', `Canada has signed a new trade agreement with ${country}. Expect GDP growth of +0.2-0.4% over the next 12 weeks.`);
      executeForeignPolicy?.('trade_deal', country, 3, 2);
      return;
    }

    if (!dealTerms.trim()) return;
    setTradePartners(prev => prev.map(p => p.country === country ? { ...p, dealStatus: 'negotiating' } : p));
    setProposingDeal(null);
    setDealTerms('');
    const accepted = partner.status !== 'rival' && partner.status !== 'sanctioned' && Math.random() > 0.3;
    setTimeout(() => {
      showAlert(
        accepted ? 'Trade Deal Progress' : 'Negotiations Stalled',
        accepted
          ? `${country} has responded positively to Canada's trade proposal. Formal negotiations are underway.`
          : `${country} has declined Canada's initial trade proposal.`
      );
      if (accepted) {
        setTradePartners(prev => prev.map(p => p.country === country ? { ...p, dealStatus: 'active', existingDeal: true } : p));
        executeForeignPolicy?.('trade_deal', country, 2, 1);
      }
    }, 1500);
  };

  const handleMilitaryAlliance = (country: string, newStatus: 'allied' | 'partner' | 'none') => {
    showAlert(
      newStatus === 'none' ? 'Withdraw from Alliance' : newStatus === 'allied' ? 'Form Military Alliance' : 'Establish Partnership',
      `This will ${newStatus === 'none' ? 'end' : 'establish'} Canada's ${newStatus === 'allied' ? 'formal military alliance' : 'defence partnership'} with ${country}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus === 'none' ? 'Withdraw' : 'Confirm',
          style: newStatus === 'none' ? 'destructive' : 'default',
          onPress: () => {
            setMilitaryAlliances(prev => prev.map(p => p.country === country ? { ...p, status: newStatus } : p));
            const approvalChange = newStatus === 'allied' ? 3 : newStatus === 'partner' ? 1 : -4;
            executeForeignPolicy?.('military_alliance', country, approvalChange, 0);
            showAlert(
              newStatus === 'none' ? 'Alliance Withdrawn' : newStatus === 'allied' ? 'Alliance Formed' : 'Partnership Established',
              newStatus === 'allied' ? `Canada and ${country} are now formal military allies.`
                : newStatus === 'partner' ? `Canada has established a defence partnership with ${country}.`
                : `Canada has withdrawn from its alliance with ${country}.`
            );
          },
        },
      ]
    );
  };

  const handleDeclareWar = (country: string) => {
    const partner = militaryAlliances.find(p => p.country === country);
    if (partner?.status === 'allied') {
      showAlert('Cannot Declare War', `${country} is a current military ally.`);
      return;
    }
    if (activeWars.some(w => w.country === country)) {
      showAlert('Already at War', `Canada is already in conflict with ${country}.`);
      return;
    }

    const tradeP = tradePartners.find(p => p.country === country);
    showAlert(
      `Declare War on ${country}?`,
      `WARNING: Declaring war is a permanent action until peace is achieved.\n\n• Immediate -8% approval\n• GDP impact: -0.5%/week\n• War continues until surrender or peace deal\n• Peace terms can only be edited if rejected\n\nAre you certain?`,
      [
        { text: 'Do Not Proceed', style: 'cancel' },
        {
          text: 'Declare War',
          style: 'destructive',
          onPress: () => {
            const newWar: ActiveWar = {
              country,
              flag: tradeP?.flag || '🏳️',
              weekDeclared: gameState.currentWeek,
              weeksActive: 1,
              casualties: Math.floor(Math.random() * 100 + 50),
              approvalImpact: -8,
              landGained: 5,
              warProgress: 'stalemate',
              phase: 'active',
              peaceTermsRejected: false,
              aiSurrenderOffer: undefined,
              peaceOptions: buildDefaultPeaceOptions(country),
            };
            setActiveWars(prev => [...prev, newWar]);
            executeForeignPolicy?.('declare_war', country, -8, -5);
            showAlert('War Declared', `Canada has declared war on ${country}. The conflict will continue until one side surrenders or a peace deal is reached.`);
          },
        },
      ]
    );
  };

  const togglePeaceOption = (country: string, optionId: string) => {
    setActiveWars(prev => prev.map(w => {
      if (w.country !== country) return w;
      return {
        ...w,
        peaceOptions: w.peaceOptions.map(o => o.id === optionId ? { ...o, selected: !o.selected } : o),
      };
    }));
  };

  const updateTerritoryChoice = (country: string, territory: string) => {
    setSelectedTerritories(prev => ({ ...prev, [country]: territory }));
    setActiveWars(prev => prev.map(w => {
      if (w.country !== country) return w;
      return {
        ...w,
        peaceOptions: w.peaceOptions.map(o => o.id === 'territory' ? { ...o, territory } : o),
      };
    }));
  };

  const handleProposePeaceDeal = (country: string) => {
    const war = activeWars.find(w => w.country === country);
    if (!war) return;
    const selectedTerms = war.peaceOptions.filter(o => o.selected);
    if (selectedTerms.length === 0) {
      showAlert('No Terms Selected', 'Select at least one peace term before proposing.');
      return;
    }
    const acceptanceChance = getPeaceDealAcceptanceChance(war);
    const accepted = Math.random() * 100 < acceptanceChance;

    if (accepted) {
      setActiveWars(prev => prev.filter(w => w.country !== country));
      const termsList = selectedTerms.map(t => `• ${t.label}`).join('\n');
      executeForeignPolicy?.('peace_treaty', country, 6, 3);
      showAlert(
        'Peace Deal Accepted',
        `${country} has accepted Canada's peace terms:\n\n${termsList}\n\nThe conflict is over. Canada's international standing improves.`
      );
    } else {
      setActiveWars(prev => prev.map(w => {
        if (w.country !== country) return w;
        return { ...w, peaceTermsRejected: true, phase: 'peace_rejected' };
      }));
      showAlert(
        'Peace Terms Rejected',
        `${country} has rejected the proposed terms (acceptance probability was ${acceptanceChance}%). Your terms were too demanding given the current military situation. You may modify and resubmit.`
      );
      // After rejection, set phase back to active but allow editing (they can modify terms)
      setTimeout(() => {
        setActiveWars(prev => prev.map(w => {
          if (w.country !== country) return w;
          return { ...w, phase: 'active' };
        }));
      }, 2000);
    }
  };

  const handlePlayerSurrender = (country: string) => {
    showAlert(
      `Surrender to ${country}?`,
      'This will end the war with significant concessions — approval will drop and Canada loses international standing.',
      [
        { text: 'Keep Fighting', style: 'cancel' },
        {
          text: 'Surrender',
          style: 'destructive',
          onPress: () => {
            setActiveWars(prev => prev.filter(w => w.country !== country));
            executeForeignPolicy?.('surrender', country, -12, -3);
            showAlert('Canada Surrenders', `Canada has accepted ${country}'s terms. The conflict is over, but at great political cost.`);
          },
        },
      ]
    );
  };

  const tabs: { id: FPView; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'earth' },
    { id: 'trade', label: 'Trade', icon: 'handshake' },
    { id: 'military', label: 'Alliances', icon: 'shield-account' },
    { id: 'war', label: 'War & Peace', icon: 'sword-cross' },
  ];

  const warCount = activeWars.length;
  const activeDeals = tradePartners.filter(p => p.dealStatus === 'active').length;
  const alliedCount = militaryAlliances.filter(p => p.status === 'allied').length;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Foreign Policy</Text>
          <Text style={styles.headerSub}>Prime Minister — Global Affairs Canada</Text>
        </View>
        <View style={[styles.pmBadge, { backgroundColor: partyColor + '22', borderColor: partyColor + '44' }]}>
          <Text style={[styles.pmBadgeText, { color: partyColor }]}>PM</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <Pressable
            key={tab.id}
            onPress={() => setView(tab.id)}
            style={[styles.tab, view === tab.id && [styles.tabActive, { borderBottomColor: partyColor }]]}
          >
            <MaterialCommunityIcons name={tab.icon as any} size={14} color={view === tab.id ? partyColor : Colors.textMuted} />
            <Text style={[styles.tabText, view === tab.id && { color: partyColor, fontWeight: FontWeight.bold }]}>{tab.label}</Text>
            {tab.id === 'war' && warCount > 0 ? (
              <View style={styles.warBadge}><Text style={styles.warBadgeText}>{warCount}</Text></View>
            ) : null}
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── OVERVIEW ── */}
        {view === 'overview' ? (
          <View style={styles.overviewSection}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="handshake" size={22} color={Colors.success} />
                <Text style={[styles.statValue, { color: Colors.success }]}>{activeDeals}</Text>
                <Text style={styles.statLabel}>Trade Deals</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="shield-account" size={22} color={Colors.info} />
                <Text style={[styles.statValue, { color: Colors.info }]}>{alliedCount}</Text>
                <Text style={styles.statLabel}>Military Allies</Text>
              </View>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="sword-cross" size={22} color={warCount > 0 ? Colors.error : Colors.textMuted} />
                <Text style={[styles.statValue, { color: warCount > 0 ? Colors.error : Colors.textMuted }]}>{warCount}</Text>
                <Text style={styles.statLabel}>Active Conflicts</Text>
              </View>
            </View>

            {warCount > 0 ? (
              <View style={styles.warAlert}>
                <MaterialCommunityIcons name="alert" size={16} color={Colors.error} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warAlertTitle}>Active Military Conflicts</Text>
                  {activeWars.map(w => (
                    <View key={w.country} style={styles.warAlertRow}>
                      <Text style={styles.warAlertText}>{w.flag} {w.country} — Week {w.weeksActive} — {w.warProgress.toUpperCase()}</Text>
                      <Text style={[styles.warLandBadge, { color: w.landGained > 40 ? Colors.success : Colors.warning }]}>
                        {Math.round(w.landGained)}% territory
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.quickActions}>
              <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
              {[
                { icon: 'handshake', label: 'Propose New Trade Deal', action: () => setView('trade'), color: Colors.success },
                { icon: 'shield-account', label: 'Manage Military Alliances', action: () => setView('military'), color: Colors.info },
                { icon: 'sword-cross', label: 'War & Peace Options', action: () => setView('war'), color: warCount > 0 ? Colors.error : Colors.textSecondary },
              ].map(btn => (
                <Pressable key={btn.label} onPress={btn.action} style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.8 }]}>
                  <MaterialCommunityIcons name={btn.icon as any} size={18} color={btn.color} />
                  <Text style={[styles.quickActionText, { color: btn.color }]}>{btn.label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── TRADE ── */}
        {view === 'trade' ? (
          <View style={styles.tradeSection}>
            {tradePartners.map(partner => {
              const isProposing = proposingDeal === partner.country;
              return (
                <View key={partner.country} style={styles.tradeCard}>
                  <View style={styles.tradeCardHeader}>
                    <Text style={styles.tradeFlag}>{partner.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tradeCountry}>{partner.country}</Text>
                      <Text style={styles.tradeVolume}>${partner.tradeVolumeBillion}B annual trade</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[partner.status] + '22' }]}>
                      <Text style={[styles.statusPillText, { color: STATUS_COLORS[partner.status] }]}>{partner.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={[styles.dealStatusBadge, { backgroundColor: STATUS_COLORS[partner.dealStatus] + '22', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.dealStatusBadgeText, { color: STATUS_COLORS[partner.dealStatus] }]}>
                      {partner.dealStatus === 'active' ? '✓ TRADE DEAL ACTIVE' : partner.dealStatus === 'negotiating' ? '⟳ NEGOTIATING' : 'NO DEAL'}
                    </Text>
                  </View>
                  {partner.status !== 'sanctioned' ? (
                    <View style={styles.tradeActions}>
                      {partner.dealStatus === 'active' ? (
                        <Pressable
                          onPress={() => {
                            showAlert('Renegotiate?', 'Reopening may affect the current deal.',
                              [{ text: 'Cancel', style: 'cancel' },
                               { text: 'Renegotiate', onPress: () => {
                                 setTradePartners(prev => prev.map(p => p.country === partner.country ? { ...p, dealStatus: 'negotiating' } : p));
                               }}]
                            );
                          }}
                          style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.warning + '55' }, pressed && { opacity: 0.8 }]}
                        >
                          <Text style={[styles.tradeBtnText, { color: Colors.warning }]}>Renegotiate</Text>
                        </Pressable>
                      ) : partner.dealStatus === 'negotiating' ? (
                        <View style={styles.tradeActionsRow}>
                          <Pressable onPress={() => handleConfirmTrade(partner.country, 'accept')} style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.success + '55', backgroundColor: Colors.success + '11', flex: 1 }, pressed && { opacity: 0.8 }]}>
                            <Text style={[styles.tradeBtnText, { color: Colors.success }]}>Sign Deal</Text>
                          </Pressable>
                          <Pressable onPress={() => handleConfirmTrade(partner.country, 'decline')} style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.error + '55', flex: 1 }, pressed && { opacity: 0.8 }]}>
                            <Text style={[styles.tradeBtnText, { color: Colors.error }]}>Decline</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable onPress={() => handleProposeTrade(partner.country)} style={({ pressed }) => [styles.tradeBtn, { borderColor: partyColor + '55', backgroundColor: partyColor + '11' }, pressed && { opacity: 0.8 }]}>
                          <Text style={[styles.tradeBtnText, { color: partyColor }]}>Propose Trade Deal</Text>
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <View style={styles.sanctionedNote}>
                      <MaterialCommunityIcons name="cancel" size={12} color={Colors.error} />
                      <Text style={styles.sanctionedNoteText}>Under Canadian sanctions. Trade prohibited.</Text>
                    </View>
                  )}
                  {isProposing ? (
                    <View style={styles.proposeForm}>
                      <Text style={styles.proposeFormLabel}>PROPOSED TERMS:</Text>
                      <TextInput
                        style={styles.proposeInput}
                        multiline
                        numberOfLines={3}
                        placeholder={`Outline your trade deal proposal with ${partner.country}...`}
                        placeholderTextColor={Colors.textMuted}
                        value={dealTerms}
                        onChangeText={setDealTerms}
                        textAlignVertical="top"
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable onPress={() => setProposingDeal(null)} style={({ pressed }) => [styles.tradeBtn, { flex: 1 }, pressed && { opacity: 0.8 }]}>
                          <Text style={[styles.tradeBtnText, { color: Colors.textSecondary }]}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={() => handleConfirmTrade(partner.country, 'propose')} disabled={!dealTerms.trim()} style={({ pressed }) => [styles.tradeBtn, { flex: 1, borderColor: partyColor + '55', backgroundColor: partyColor + '11' }, !dealTerms.trim() && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}>
                          <Text style={[styles.tradeBtnText, { color: partyColor }]}>Send Proposal</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* ── MILITARY ALLIANCES ── */}
        {view === 'military' ? (
          <View style={styles.militarySection}>
            <View style={styles.sectionNote}>
              <MaterialCommunityIcons name="shield-star" size={13} color={Colors.info} />
              <Text style={styles.sectionNoteText}>
                Manage Canada's military alliances and defence partnerships.
              </Text>
            </View>
            {militaryAlliances.map(m => (
              <View key={m.country} style={styles.allianceCard}>
                <View style={styles.allianceHeader}>
                  <Text style={styles.tradeFlag}>{m.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tradeCountry}>{m.country}</Text>
                    <Text style={styles.allianceGroup}>{m.alliance}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[m.status] + '22' }]}>
                    <Text style={[styles.statusPillText, { color: STATUS_COLORS[m.status] }]}>
                      {m.status === 'allied' ? 'ALLIED' : m.status === 'partner' ? 'PARTNER' : 'NONE'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.allianceNotes}>{m.notes}</Text>
                <View style={styles.allianceActions}>
                  {m.status !== 'allied' ? (
                    <Pressable onPress={() => handleMilitaryAlliance(m.country, 'allied')} style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.success + '55', backgroundColor: Colors.success + '11', flex: 1 }, pressed && { opacity: 0.8 }]}>
                      <MaterialCommunityIcons name="shield-star" size={12} color={Colors.success} />
                      <Text style={[styles.tradeBtnText, { color: Colors.success }]}>Form Alliance</Text>
                    </Pressable>
                  ) : null}
                  {m.status !== 'partner' ? (
                    <Pressable onPress={() => handleMilitaryAlliance(m.country, 'partner')} style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.info + '55', flex: 1 }, pressed && { opacity: 0.8 }]}>
                      <Text style={[styles.tradeBtnText, { color: Colors.info }]}>Partnership</Text>
                    </Pressable>
                  ) : null}
                  {m.status !== 'none' ? (
                    <Pressable onPress={() => handleMilitaryAlliance(m.country, 'none')} style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.error + '44' }, pressed && { opacity: 0.8 }]}>
                      <Text style={[styles.tradeBtnText, { color: Colors.error }]}>Withdraw</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── WAR & PEACE ── */}
        {view === 'war' ? (
          <View style={styles.warSection}>
            <View style={[styles.sectionNote, { borderColor: Colors.error + '33', backgroundColor: Colors.error + '0A' }]}>
              <MaterialCommunityIcons name="alert" size={13} color={Colors.error} />
              <Text style={[styles.sectionNoteText, { color: Colors.error }]}>
                War is continuous until surrender or a peace deal is accepted. Peace terms can only be modified if rejected. The more territory gained, the more likely terms are accepted.
              </Text>
            </View>

            {/* Active Conflicts */}
            {activeWars.length > 0 ? (
              <View style={styles.activeWarsSection}>
                <Text style={styles.sectionLabel}>ACTIVE CONFLICTS</Text>
                {activeWars.map(war => {
                  const isNegotiating = selectedWarForPeace === war.country;
                  const selectedTermsCount = war.peaceOptions.filter(o => o.selected).length;
                  const acceptChance = getPeaceDealAcceptanceChance(war);
                  const progressColor = war.warProgress === 'dominant' ? Colors.success : war.warProgress === 'winning' ? Colors.info : war.warProgress === 'stalemate' ? Colors.warning : Colors.error;

                  return (
                    <View key={war.country} style={[styles.activeWarCard, { borderColor: Colors.error + '55' }]}>
                      {/* War header */}
                      <View style={styles.activeWarHeader}>
                        <Text style={styles.tradeFlag}>{war.flag}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.tradeCountry, { color: Colors.error }]}>⚔️ War with {war.country}</Text>
                          <Text style={styles.allianceNotes}>Week {war.weeksActive} of conflict • {war.casualties.toLocaleString()} casualties</Text>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: progressColor + '22' }]}>
                          <Text style={[styles.statusPillText, { color: progressColor }]}>{war.warProgress.toUpperCase()}</Text>
                        </View>
                      </View>

                      {/* Territory progress */}
                      <View style={styles.territoryProgress}>
                        <View style={styles.territoryBar}>
                          <View style={[styles.territoryFill, { flex: Math.round(war.landGained), backgroundColor: progressColor }]} />
                          <View style={{ flex: 100 - Math.round(war.landGained) }} />
                        </View>
                        <Text style={[styles.territoryLabel, { color: progressColor }]}>{Math.round(war.landGained)}% territory held</Text>
                      </View>

                      {/* AI surrender offer */}
                      {war.aiSurrenderOffer ? (
                        <View style={styles.aiOfferCard}>
                          <MaterialCommunityIcons name="flag-variant" size={12} color={Colors.warning} />
                          <Text style={styles.aiOfferText}>{war.aiSurrenderOffer}</Text>
                        </View>
                      ) : null}

                      {/* Peace rejected banner */}
                      {war.peaceTermsRejected ? (
                        <View style={[styles.aiOfferCard, { borderColor: Colors.error + '44', backgroundColor: Colors.error + '0D' }]}>
                          <MaterialCommunityIcons name="close-circle" size={12} color={Colors.error} />
                          <Text style={[styles.aiOfferText, { color: Colors.error }]}>Peace terms rejected. You may modify terms and resubmit.</Text>
                        </View>
                      ) : null}

                      {/* Peace deal builder */}
                      {!isNegotiating ? (
                        <View style={styles.warActionsRow}>
                          <Pressable
                            onPress={() => setSelectedWarForPeace(war.country)}
                            style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.success + '55', backgroundColor: Colors.success + '11', flex: 1 }, pressed && { opacity: 0.8 }]}
                          >
                            <MaterialCommunityIcons name="handshake" size={13} color={Colors.success} />
                            <Text style={[styles.tradeBtnText, { color: Colors.success }]}>Propose Peace Deal</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handlePlayerSurrender(war.country)}
                            style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.error + '44' }, pressed && { opacity: 0.8 }]}
                          >
                            <MaterialCommunityIcons name="flag-variant" size={13} color={Colors.error} />
                            <Text style={[styles.tradeBtnText, { color: Colors.error }]}>Surrender</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={styles.peaceBuilder}>
                          <Text style={styles.peaceBuilderTitle}>PEACE DEAL TERMS — SELECT TO INCLUDE</Text>
                          <Text style={styles.peaceBuilderSub}>
                            Acceptance probability: <Text style={{ color: acceptChance > 50 ? Colors.success : Colors.warning, fontWeight: FontWeight.bold }}>{acceptChance}%</Text> (based on territory held + demands)
                          </Text>

                          {war.peaceOptions.map(opt => (
                            <View key={opt.id}>
                              <Pressable
                                onPress={() => {
                                  // Can only edit terms if not rejected yet OR if already rejected (editable after rejection)
                                  togglePeaceOption(war.country, opt.id);
                                }}
                                style={({ pressed }) => [
                                  styles.peaceOptionCard,
                                  opt.selected && [styles.peaceOptionSelected, { borderColor: Colors.success }],
                                  pressed && { opacity: 0.85 },
                                ]}
                              >
                                <View style={[styles.peaceOptionCheck, opt.selected && { backgroundColor: Colors.success }]}>
                                  {opt.selected ? <MaterialCommunityIcons name="check" size={12} color="#fff" /> : null}
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.peaceOptionLabel, opt.selected && { color: Colors.success }]}>{opt.label}</Text>
                                  <Text style={styles.peaceOptionDesc}>{opt.description}</Text>
                                  {opt.id === 'territory' && opt.selected ? (
                                    <View style={styles.territorySelector}>
                                      <Text style={styles.territorySelectorLabel}>Select territory to annex:</Text>
                                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={styles.territorySelectorRow}>
                                          {(ENEMY_TERRITORIES[war.country] || ENEMY_TERRITORIES['default']).map(t => (
                                            <Pressable
                                              key={t}
                                              onPress={() => updateTerritoryChoice(war.country, t)}
                                              style={[
                                                styles.territorySelectorChip,
                                                opt.territory === t && { backgroundColor: Colors.success + '22', borderColor: Colors.success },
                                              ]}
                                            >
                                              <Text style={[styles.territorySelectorChipText, opt.territory === t && { color: Colors.success }]}>{t}</Text>
                                            </Pressable>
                                          ))}
                                        </View>
                                      </ScrollView>
                                    </View>
                                  ) : null}
                                </View>
                              </Pressable>
                            </View>
                          ))}

                          <View style={styles.peaceSubmitRow}>
                            <Pressable
                              onPress={() => setSelectedWarForPeace(null)}
                              style={({ pressed }) => [styles.tradeBtn, { flex: 1 }, pressed && { opacity: 0.8 }]}
                            >
                              <Text style={[styles.tradeBtnText, { color: Colors.textSecondary }]}>Cancel</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleProposePeaceDeal(war.country)}
                              disabled={selectedTermsCount === 0}
                              style={({ pressed }) => [
                                styles.tradeBtn,
                                { flex: 2, borderColor: Colors.success + '55', backgroundColor: Colors.success + '11' },
                                selectedTermsCount === 0 && { opacity: 0.4 },
                                pressed && { opacity: 0.8 },
                              ]}
                            >
                              <MaterialCommunityIcons name="send" size={13} color={Colors.success} />
                              <Text style={[styles.tradeBtnText, { color: Colors.success }]}>
                                Submit {selectedTermsCount} Term{selectedTermsCount !== 1 ? 's' : ''} ({acceptChance}% chance)
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : null}

            {/* Declare War section */}
            <Text style={styles.sectionLabel}>POTENTIAL ADVERSARIES</Text>
            <Text style={styles.warDisclaimer}>
              War is continuous and has severe economic consequences. Consider all diplomatic options first. Allied nations cannot be targeted.
            </Text>
            {tradePartners
              .filter(p => p.status === 'rival' || p.status === 'sanctioned' || p.status === 'neutral')
              .map(partner => {
                const allianceStatus = militaryAlliances.find(m => m.country === partner.country)?.status;
                const isAllied = allianceStatus === 'allied';
                const isAtWar = activeWars.some(w => w.country === partner.country);
                return (
                  <View key={partner.country} style={styles.warCard}>
                    <View style={styles.allianceHeader}>
                      <Text style={styles.tradeFlag}>{partner.flag}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tradeCountry}>{partner.country}</Text>
                        <Text style={styles.allianceNotes}>Relations: {partner.status}{isAllied ? ' — Allied (war prohibited)' : ''}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[partner.status] + '22' }]}>
                        <Text style={[styles.statusPillText, { color: STATUS_COLORS[partner.status] }]}>{partner.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    {isAtWar ? (
                      <View style={[styles.dealStatusBadge, { backgroundColor: Colors.error + '22', alignSelf: 'flex-start' }]}>
                        <Text style={[styles.dealStatusBadgeText, { color: Colors.error }]}>⚔️ AT WAR</Text>
                      </View>
                    ) : !isAllied ? (
                      <Pressable
                        onPress={() => handleDeclareWar(partner.country)}
                        style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.error + '55', backgroundColor: Colors.error + '11' }, pressed && { opacity: 0.8 }]}
                      >
                        <MaterialCommunityIcons name="sword-cross" size={13} color={Colors.error} />
                        <Text style={[styles.tradeBtnText, { color: Colors.error }]}>Declare War</Text>
                      </Pressable>
                    ) : (
                      <View style={[styles.dealStatusBadge, { backgroundColor: Colors.success + '22', alignSelf: 'flex-start' }]}>
                        <Text style={[styles.dealStatusBadgeText, { color: Colors.success }]}>Allied — War Prohibited</Text>
                      </View>
                    )}
                  </View>
                );
              })}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  pmBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1 },
  pmBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: Spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: {},
  tabText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  warBadge: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
  warBadgeText: { fontSize: 8, fontWeight: FontWeight.bold, color: '#fff' },
  content: { padding: Spacing.md, gap: Spacing.md },
  restrictedState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  restrictedTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  restrictedText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  backBtnLarge: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl, borderWidth: 1, borderColor: Colors.surfaceBorder, marginTop: Spacing.sm },
  backBtnLargeText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  overviewSection: { gap: Spacing.md },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, alignItems: 'center', gap: 4 },
  statValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  statLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
  warAlert: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.error + '11', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error + '33', padding: Spacing.md },
  warAlertTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.error },
  warAlertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  warAlertText: { fontSize: FontSize.xs, color: Colors.error, flex: 1 },
  warLandBadge: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  quickActions: { gap: Spacing.sm },
  quickActionBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  quickActionText: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  tradeSection: { gap: Spacing.md },
  tradeCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  tradeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tradeFlag: { fontSize: 22 },
  tradeCountry: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  tradeVolume: { fontSize: FontSize.xs, color: Colors.textMuted },
  dealStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  dealStatusBadgeText: { fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.3 },
  tradeActions: {},
  tradeActionsRow: { flexDirection: 'row', gap: 8 },
  tradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: Spacing.md, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  tradeBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusPillText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  sanctionedNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.error + '0D', borderRadius: Radius.sm, padding: Spacing.sm },
  sanctionedNoteText: { fontSize: FontSize.xs, color: Colors.error, flex: 1 },
  proposeForm: { gap: 8, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  proposeFormLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted },
  proposeInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.sm, paddingVertical: 8, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 80, lineHeight: 20 },
  militarySection: { gap: Spacing.md },
  allianceCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  allianceHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  allianceGroup: { fontSize: FontSize.xs, color: Colors.info, fontWeight: FontWeight.medium, marginTop: 1 },
  allianceNotes: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  allianceActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  warSection: { gap: Spacing.md },
  activeWarsSection: { gap: Spacing.sm },
  activeWarCard: { backgroundColor: Colors.error + '0D', borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  activeWarHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  territoryProgress: { gap: 4 },
  territoryBar: { flexDirection: 'row', height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden' },
  territoryFill: { height: '100%', borderRadius: 4, minWidth: 4 },
  territoryLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'right' },
  aiOfferCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.warning + '0D', borderRadius: Radius.sm, padding: 8, borderWidth: 1, borderColor: Colors.warning + '33' },
  aiOfferText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, lineHeight: 16 },
  warActionsRow: { flexDirection: 'row', gap: 8 },
  peaceBuilder: { gap: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  peaceBuilderTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  peaceBuilderSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  peaceOptionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, backgroundColor: Colors.card, marginBottom: 6 },
  peaceOptionSelected: { backgroundColor: Colors.success + '08' },
  peaceOptionCheck: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: Colors.surfaceBorder, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  peaceOptionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 2 },
  peaceOptionDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  territorySelector: { marginTop: 6, gap: 4 },
  territorySelectorLabel: { fontSize: 10, color: Colors.textMuted },
  territorySelectorRow: { flexDirection: 'row', gap: 6, paddingBottom: 4 },
  territorySelectorChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder, backgroundColor: Colors.surfaceElevated },
  territorySelectorChipText: { fontSize: 10, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  peaceSubmitRow: { flexDirection: 'row', gap: 8 },
  warDisclaimer: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18, marginBottom: 4 },
  warCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  sectionNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.info + '11', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.info + '22' },
  sectionNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 18 },
});
