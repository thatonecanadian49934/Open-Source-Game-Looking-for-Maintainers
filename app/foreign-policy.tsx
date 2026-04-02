// Powered by OnSpace.AI
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

interface ActiveWar {
  country: string;
  flag: string;
  weekDeclared: number;
  casualties: number;
  approvalImpact: number;
}

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
            Foreign policy powers — trade deal negotiations, military alliances, and declarations of war — are exercised exclusively by the Prime Minister and Cabinet.
            Win the next election to unlock these powers.
          </Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtnLarge, pressed && { opacity: 0.8 }]}>
            <Text style={styles.backBtnLargeText}>Return to Dashboard</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const handleProposeTrade = (country: string) => {
    setProposingDeal(country);
    setDealTerms('');
  };

  const handleConfirmTrade = (country: string, action: 'propose' | 'accept' | 'decline') => {
    const partner = tradePartners.find(p => p.country === country);
    if (!partner) return;

    if (action === 'decline') {
      setTradePartners(prev => prev.map(p =>
        p.country === country ? { ...p, dealStatus: 'none' } : p
      ));
      setProposingDeal(null);
      showAlert('Deal Declined', `Canada has declined trade deal negotiations with ${country}.`);
      executeForeignPolicy?.('trade_decline', country, -1, -2);
      return;
    }

    if (action === 'accept') {
      setTradePartners(prev => prev.map(p =>
        p.country === country ? { ...p, dealStatus: 'active', existingDeal: true } : p
      ));
      setProposingDeal(null);
      showAlert(
        'Trade Deal Signed',
        `Canada has signed a new trade agreement with ${country}. Expect GDP growth of +0.2-0.4% over the next 12 weeks as trade volume increases.`
      );
      executeForeignPolicy?.('trade_deal', country, 3, 2);
      return;
    }

    // Propose
    if (!dealTerms.trim()) return;
    setTradePartners(prev => prev.map(p =>
      p.country === country ? { ...p, dealStatus: 'negotiating' } : p
    ));
    setProposingDeal(null);
    setDealTerms('');
    const accepted = partner.status !== 'rival' && partner.status !== 'sanctioned' && Math.random() > 0.3;
    setTimeout(() => {
      showAlert(
        accepted ? 'Trade Deal Progress' : 'Negotiations Stalled',
        accepted
          ? `${country} has responded positively to Canada's trade proposal. Formal negotiations are underway.`
          : `${country} has declined Canada's initial trade proposal. Diplomatic efforts continue.`
      );
      if (accepted) {
        setTradePartners(prev => prev.map(p =>
          p.country === country ? { ...p, dealStatus: 'active', existingDeal: true } : p
        ));
        executeForeignPolicy?.('trade_deal', country, 2, 1);
      }
    }, 1500);
  };

  const handleMilitaryAlliance = (country: string, newStatus: 'allied' | 'partner' | 'none') => {
    const partner = militaryAlliances.find(p => p.country === country);
    if (!partner) return;

    showAlert(
      newStatus === 'allied' ? 'Form Military Alliance' : newStatus === 'partner' ? 'Establish Partnership' : 'Withdraw from Alliance',
      `This will ${newStatus === 'none' ? 'end' : 'establish'} Canada's ${newStatus === 'allied' ? 'formal military alliance' : 'defence partnership'} with ${country}. ${newStatus === 'allied' ? 'This commits Canadian forces to mutual defence obligations.' : newStatus === 'none' ? 'This may damage bilateral relations.' : 'This enhances intelligence and military cooperation.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus === 'none' ? 'Withdraw' : 'Confirm',
          style: newStatus === 'none' ? 'destructive' : 'default',
          onPress: () => {
            setMilitaryAlliances(prev => prev.map(p =>
              p.country === country ? { ...p, status: newStatus } : p
            ));
            const approvalChange = newStatus === 'allied' ? 3 : newStatus === 'partner' ? 1 : -4;
            const gdpChange = newStatus === 'none' ? -1 : 0;
            executeForeignPolicy?.('military_alliance', country, approvalChange, gdpChange);
            showAlert(
              newStatus === 'none' ? 'Alliance Withdrawn' : newStatus === 'allied' ? 'Alliance Formed' : 'Partnership Established',
              newStatus === 'allied'
                ? `Canada and ${country} are now formal military allies. Mutual defence commitments are in effect.`
                : newStatus === 'partner'
                ? `Canada has established a defence partnership with ${country}.`
                : `Canada has withdrawn from its alliance commitments with ${country}.`
            );
          },
        },
      ]
    );
  };

  const handleDeclareWar = (country: string) => {
    const partner = militaryAlliances.find(p => p.country === country);
    const trade = tradePartners.find(p => p.country === country);
    const isAlly = partner?.status === 'allied';

    if (isAlly) {
      showAlert('Cannot Declare War', `${country} is a current military ally. You must withdraw from the alliance first.`);
      return;
    }

    showAlert(
      `Declare War on ${country}?`,
      `This is an irreversible action with severe consequences:\n\n• Immediate -8% approval rating\n• GDP impact: -0.5% per week\n• International condemnation\n• NATO/allies may withdraw support if unjustified\n\nWar should only be declared in extreme national security emergencies. Are you certain?`,
      [
        { text: 'Do Not Proceed', style: 'cancel' },
        {
          text: 'Declare War',
          style: 'destructive',
          onPress: () => {
            const newWar: ActiveWar = {
              country,
              flag: trade?.flag || partner?.flag || '🏳️',
              weekDeclared: gameState.currentWeek,
              casualties: 0,
              approvalImpact: -8,
            };
            setActiveWars(prev => [...prev, newWar]);
            executeForeignPolicy?.('declare_war', country, -8, -5);
            showAlert(
              'War Declared',
              `Canada has declared war on ${country}. Parliament will be recalled for an emergency session. Expect massive domestic and international political fallout.`
            );
          },
        },
      ]
    );
  };

  const handlePeaceTreaty = (country: string) => {
    showAlert(
      `Seek Peace with ${country}?`,
      'Negotiating a peace treaty will end the conflict but requires concessions. Your approval may improve with war-weary Canadians.',
      [
        { text: 'Continue Fighting', style: 'cancel' },
        {
          text: 'Seek Peace Treaty',
          onPress: () => {
            setActiveWars(prev => prev.filter(w => w.country !== country));
            executeForeignPolicy?.('peace_treaty', country, 5, 3);
            showAlert('Peace Treaty Signed', `Canada and ${country} have signed a peace agreement. The conflict is over.`);
          },
        },
      ]
    );
  };

  const tabs: { id: FPView; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'earth' },
    { id: 'trade', label: 'Trade Deals', icon: 'handshake' },
    { id: 'military', label: 'Alliances', icon: 'shield-account' },
    { id: 'war', label: 'War & Peace', icon: 'sword-cross' },
  ];

  const activeDeals = tradePartners.filter(p => p.dealStatus === 'active').length;
  const alliedCount = militaryAlliances.filter(p => p.status === 'allied').length;
  const warCount = activeWars.length;

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

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <Pressable
            key={tab.id}
            onPress={() => setView(tab.id)}
            style={[styles.tab, view === tab.id && [styles.tabActive, { borderBottomColor: partyColor }]]}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={14}
              color={view === tab.id ? partyColor : Colors.textMuted}
            />
            <Text style={[styles.tabText, view === tab.id && { color: partyColor, fontWeight: FontWeight.bold }]}>
              {tab.label}
            </Text>
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
        {/* OVERVIEW */}
        {view === 'overview' ? (
          <View style={styles.overviewSection}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialCommunityIcons name="handshake" size={22} color={Colors.success} />
                <Text style={[styles.statValue, { color: Colors.success }]}>{activeDeals}</Text>
                <Text style={styles.statLabel}>Trade Agreements</Text>
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
                  <Text style={styles.warAlertTitle}>Active Military Conflict</Text>
                  {activeWars.map(w => (
                    <Text key={w.country} style={styles.warAlertText}>
                      {w.flag} War with {w.country} — Week {gameState.currentWeek - w.weekDeclared + 1} of conflict.
                      Approval impact: {w.approvalImpact}%/wk
                    </Text>
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
                <Pressable
                  key={btn.label}
                  onPress={btn.action}
                  style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.8 }]}
                >
                  <MaterialCommunityIcons name={btn.icon as any} size={18} color={btn.color} />
                  <Text style={[styles.quickActionText, { color: btn.color }]}>{btn.label}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
                </Pressable>
              ))}
            </View>

            {/* Key relationships */}
            <Text style={styles.sectionLabel}>KEY RELATIONSHIPS</Text>
            {tradePartners.slice(0, 5).map(p => (
              <View key={p.country} style={styles.relationshipRow}>
                <Text style={styles.countryFlag}>{p.flag}</Text>
                <Text style={styles.countryName}>{p.country}</Text>
                <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[p.status] + '22' }]}>
                  <Text style={[styles.statusPillText, { color: STATUS_COLORS[p.status] }]}>{p.status.toUpperCase()}</Text>
                </View>
                <Text style={[styles.dealStatusText, { color: STATUS_COLORS[p.dealStatus] }]}>
                  {p.dealStatus === 'active' ? '✓ Trade Deal' : p.dealStatus === 'negotiating' ? '⟳ Negotiating' : p.dealStatus === 'proposed' ? '→ Proposed' : 'No Deal'}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* TRADE DEALS */}
        {view === 'trade' ? (
          <View style={styles.tradeSection}>
            <View style={styles.sectionNote}>
              <MaterialCommunityIcons name="information" size={13} color={Colors.info} />
              <Text style={styles.sectionNoteText}>
                As PM, you can propose, accept, or decline trade deals with foreign nations. Active deals boost GDP growth.
                Deals with rivals may trigger domestic controversy.
              </Text>
            </View>
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

                  <View style={styles.tradeDealStatus}>
                    <View style={[styles.dealStatusBadge, { backgroundColor: STATUS_COLORS[partner.dealStatus] + '22' }]}>
                      <Text style={[styles.dealStatusBadgeText, { color: STATUS_COLORS[partner.dealStatus] }]}>
                        {partner.dealStatus === 'active' ? '✓ TRADE DEAL ACTIVE' : partner.dealStatus === 'negotiating' ? '⟳ NEGOTIATING' : partner.dealStatus === 'proposed' ? '→ PROPOSAL SENT' : 'NO TRADE DEAL'}
                      </Text>
                    </View>
                  </View>

                  {partner.status !== 'sanctioned' ? (
                    <View style={styles.tradeActions}>
                      {partner.dealStatus === 'active' ? (
                        <Pressable
                          onPress={() => {
                            showAlert(
                              `Renegotiate with ${partner.country}?`,
                              'Reopening trade deal negotiations may affect the current agreement.',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Renegotiate',
                                  onPress: () => {
                                    setTradePartners(prev => prev.map(p => p.country === partner.country ? { ...p, dealStatus: 'negotiating' } : p));
                                    executeForeignPolicy?.('trade_renegotiate', partner.country, -1, 0);
                                  },
                                },
                              ]
                            );
                          }}
                          style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.warning + '55' }, pressed && { opacity: 0.8 }]}
                        >
                          <Text style={[styles.tradeBtnText, { color: Colors.warning }]}>Renegotiate</Text>
                        </Pressable>
                      ) : partner.dealStatus === 'negotiating' ? (
                        <View style={styles.tradeActionsRow}>
                          <Pressable
                            onPress={() => handleConfirmTrade(partner.country, 'accept')}
                            style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.success + '55', backgroundColor: Colors.success + '11', flex: 1 }, pressed && { opacity: 0.8 }]}
                          >
                            <Text style={[styles.tradeBtnText, { color: Colors.success }]}>Sign Deal</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleConfirmTrade(partner.country, 'decline')}
                            style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.error + '55', flex: 1 }, pressed && { opacity: 0.8 }]}
                          >
                            <Text style={[styles.tradeBtnText, { color: Colors.error }]}>Decline</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => handleProposeTrade(partner.country)}
                          style={({ pressed }) => [styles.tradeBtn, { borderColor: partyColor + '55', backgroundColor: partyColor + '11' }, pressed && { opacity: 0.8 }]}
                        >
                          <Text style={[styles.tradeBtnText, { color: partyColor }]}>Propose Trade Deal</Text>
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <View style={styles.sanctionedNote}>
                      <MaterialCommunityIcons name="cancel" size={12} color={Colors.error} />
                      <Text style={styles.sanctionedNoteText}>Country is under Canadian sanctions. Trade deals are prohibited.</Text>
                    </View>
                  )}

                  {isProposing ? (
                    <View style={styles.proposeForm}>
                      <Text style={styles.proposeFormLabel}>PROPOSED DEAL TERMS:</Text>
                      <TextInput
                        style={styles.proposeInput}
                        multiline
                        numberOfLines={3}
                        placeholder={`Outline your trade deal proposal with ${partner.country}. Include key sectors, tariff reductions, and Canadian interests...`}
                        placeholderTextColor={Colors.textMuted}
                        value={dealTerms}
                        onChangeText={setDealTerms}
                        textAlignVertical="top"
                        autoFocus
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => setProposingDeal(null)}
                          style={({ pressed }) => [styles.tradeBtn, { flex: 1 }, pressed && { opacity: 0.8 }]}
                        >
                          <Text style={[styles.tradeBtnText, { color: Colors.textSecondary }]}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleConfirmTrade(partner.country, 'propose')}
                          disabled={!dealTerms.trim()}
                          style={({ pressed }) => [
                            styles.tradeBtn,
                            { flex: 1, borderColor: partyColor + '55', backgroundColor: partyColor + '11' },
                            !dealTerms.trim() && { opacity: 0.4 },
                            pressed && { opacity: 0.8 },
                          ]}
                        >
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

        {/* MILITARY ALLIANCES */}
        {view === 'military' ? (
          <View style={styles.militarySection}>
            <View style={styles.sectionNote}>
              <MaterialCommunityIcons name="shield-star" size={13} color={Colors.info} />
              <Text style={styles.sectionNoteText}>
                Manage Canada's military alliances and defence partnerships. Allied nations provide mutual defence. Partnerships enhance intelligence sharing.
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
                    <Pressable
                      onPress={() => handleMilitaryAlliance(m.country, 'allied')}
                      style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.success + '55', backgroundColor: Colors.success + '11', flex: 1 }, pressed && { opacity: 0.8 }]}
                    >
                      <MaterialCommunityIcons name="shield-star" size={12} color={Colors.success} />
                      <Text style={[styles.tradeBtnText, { color: Colors.success }]}>Form Alliance</Text>
                    </Pressable>
                  ) : null}
                  {m.status !== 'partner' ? (
                    <Pressable
                      onPress={() => handleMilitaryAlliance(m.country, 'partner')}
                      style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.info + '55', flex: 1 }, pressed && { opacity: 0.8 }]}
                    >
                      <MaterialCommunityIcons name="handshake" size={12} color={Colors.info} />
                      <Text style={[styles.tradeBtnText, { color: Colors.info }]}>Partnership</Text>
                    </Pressable>
                  ) : null}
                  {m.status !== 'none' ? (
                    <Pressable
                      onPress={() => handleMilitaryAlliance(m.country, 'none')}
                      style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.error + '44' }, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={[styles.tradeBtnText, { color: Colors.error }]}>Withdraw</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* WAR & PEACE */}
        {view === 'war' ? (
          <View style={styles.warSection}>
            <View style={[styles.sectionNote, { borderColor: Colors.error + '33', backgroundColor: Colors.error + '0A' }]}>
              <MaterialCommunityIcons name="alert" size={13} color={Colors.error} />
              <Text style={[styles.sectionNoteText, { color: Colors.error }]}>
                Declaring war triggers massive approval loss and economic damage. This should only be used in extreme national security emergencies.
                Consider all diplomatic options first.
              </Text>
            </View>

            {activeWars.length > 0 ? (
              <View style={styles.activeWarsSection}>
                <Text style={styles.sectionLabel}>ACTIVE CONFLICTS</Text>
                {activeWars.map(war => (
                  <View key={war.country} style={[styles.activeWarCard, { borderColor: Colors.error + '55' }]}>
                    <View style={styles.activeWarHeader}>
                      <Text style={styles.tradeFlag}>{war.flag}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.tradeCountry, { color: Colors.error }]}>⚔️ War with {war.country}</Text>
                        <Text style={styles.allianceNotes}>
                          Week {gameState.currentWeek - war.weekDeclared + 1} of conflict • Approval impact: {war.approvalImpact}%/wk
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handlePeaceTreaty(war.country)}
                      style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.success + '55', backgroundColor: Colors.success + '11' }, pressed && { opacity: 0.8 }]}
                    >
                      <MaterialCommunityIcons name="handshake" size={14} color={Colors.success} />
                      <Text style={[styles.tradeBtnText, { color: Colors.success }]}>Seek Peace Treaty</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>POTENTIAL ADVERSARIES</Text>
            <Text style={styles.warDisclaimer}>
              Declaring war should only be considered against nations that have directly threatened Canadian sovereignty or committed acts of aggression. NATO allies cannot be targeted.
            </Text>
            {tradePartners
              .filter(p => p.status === 'rival' || p.status === 'sanctioned')
              .concat(tradePartners.filter(p => p.status === 'neutral'))
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
                        <Text style={styles.allianceNotes}>
                          Relations: {partner.status} {isAllied ? '• NATO Ally (cannot declare war)' : ''}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[partner.status] + '22' }]}>
                        <Text style={[styles.statusPillText, { color: STATUS_COLORS[partner.status] }]}>{partner.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    {isAtWar ? (
                      <View style={[styles.dealStatusBadge, { backgroundColor: Colors.error + '22' }]}>
                        <Text style={[styles.dealStatusBadgeText, { color: Colors.error }]}>⚔️ AT WAR</Text>
                      </View>
                    ) : !isAllied ? (
                      <Pressable
                        onPress={() => handleDeclareWar(partner.country)}
                        style={({ pressed }) => [
                          styles.tradeBtn,
                          { borderColor: Colors.error + '55', backgroundColor: Colors.error + '11' },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <MaterialCommunityIcons name="sword-cross" size={13} color={Colors.error} />
                        <Text style={[styles.tradeBtnText, { color: Colors.error }]}>Declare War</Text>
                      </Pressable>
                    ) : (
                      <View style={[styles.dealStatusBadge, { backgroundColor: Colors.success + '22' }]}>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  pmBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1 },
  pmBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
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
    gap: 3,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  warBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warBadgeText: { fontSize: 8, fontWeight: FontWeight.bold, color: '#fff' },
  content: { padding: Spacing.md, gap: Spacing.md },

  restrictedState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  restrictedTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  restrictedText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  backBtnLarge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginTop: Spacing.sm,
  },
  backBtnLargeText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },

  overviewSection: { gap: Spacing.md },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  statLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
  warAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.error + '11',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error + '33',
    padding: Spacing.md,
  },
  warAlertTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.error },
  warAlertText: { fontSize: FontSize.xs, color: Colors.error, lineHeight: 18, marginTop: 2 },
  quickActions: { gap: Spacing.sm },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  quickActionText: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  relationshipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  countryFlag: { fontSize: 18 },
  countryName: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusPillText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  dealStatusText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },

  tradeSection: { gap: Spacing.md },
  tradeCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  tradeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tradeFlag: { fontSize: 22 },
  tradeCountry: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  tradeVolume: { fontSize: FontSize.xs, color: Colors.textMuted },
  tradeDealStatus: {},
  dealStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, alignSelf: 'flex-start' },
  dealStatusBadgeText: { fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.3 },
  tradeActions: {},
  tradeActionsRow: { flexDirection: 'row', gap: 8 },
  tradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tradeBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  sanctionedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error + '0D',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  sanctionedNoteText: { fontSize: FontSize.xs, color: Colors.error, flex: 1 },
  proposeForm: { gap: 8, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  proposeFormLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.5 },
  proposeInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 80,
    lineHeight: 20,
  },

  militarySection: { gap: Spacing.md },
  allianceCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  allianceHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  allianceGroup: { fontSize: FontSize.xs, color: Colors.info, fontWeight: FontWeight.medium, marginTop: 1 },
  allianceNotes: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  allianceActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

  warSection: { gap: Spacing.md },
  activeWarsSection: { gap: Spacing.sm },
  activeWarCard: {
    backgroundColor: Colors.error + '0D',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  activeWarHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  warDisclaimer: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18, marginBottom: 4 },
  warCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },

  sectionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.info + '11',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.info + '22',
  },
  sectionNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 18 },
});
