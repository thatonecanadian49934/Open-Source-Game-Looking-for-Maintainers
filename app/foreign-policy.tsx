// Powered by OnSpace.AI — Enhanced Foreign Policy: continuous war, troop ops, detailed trade, multinational deals, sanctions
import React, { useState, useEffect, useCallback } from 'react';
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
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

type FPView = 'overview' | 'trade' | 'military' | 'war';

// ── Trade Types ─────────────────────────────────────────────────────────────
interface TradeTerm {
  id: string;
  label: string;
  description: string;
  selected: boolean;
  value?: string; // for tariff % or resource name
}

interface TradeNegotiation {
  country: string;
  flag: string;
  type: 'propose' | 'ai_offer'; // player proposes or AI proposes
  terms: TradeTerm[];
  aiOfferText?: string; // AI-generated description of the AI's offer
  sanctionReason?: string;
}

interface SanctionBill {
  country: string;
  status: 'pending_vote' | 'approved' | 'rejected';
  weeksUntilVote: number;
}

// ── War Types ────────────────────────────────────────────────────────────────
type CityRole = 'attack' | 'defend' | 'bomb_air' | 'bomb_artillery' | 'hold';
type Strategy = 'shock_and_awe' | 'siege' | 'guerrilla' | 'diplomatic_pressure' | 'full_mobilization';

interface WarCity {
  name: string;
  controlled: 'canada' | 'enemy' | 'contested';
  strategicValue: number; // 1-10
  population: number; // thousands
}

interface TroopOperation {
  cityName: string;
  role: CityRole;
  troopsDeployed: number;
}

interface ActiveWar {
  country: string;
  flag: string;
  weekDeclared: number;
  weeksActive: number;
  casualties: number;
  approvalImpact: number;
  landGained: number;
  warProgress: 'losing' | 'stalemate' | 'winning' | 'dominant';
  phase: 'active' | 'negotiating' | 'peace_rejected';
  peaceTermsRejected: boolean;
  warPopularity: number; // 0-100
  aiSurrenderOffer?: string;
  aiPeaceProposalText?: string; // AI-generated peace deal from enemy
  peaceOptions: PeaceDealOption[];
  cities: WarCity[];
  plannedOps: TroopOperation[];
  strategy: Strategy | null;
  totalTroops: number;
  deployedTroops: number;
  riotActive: boolean;
}

interface PeaceDealOption {
  id: string;
  label: string;
  description: string;
  territory?: string;
  selected: boolean;
}

// ── Multinational Deal ────────────────────────────────────────────────────────
interface MultinationalDeal {
  type: 'trade_bloc' | 'military_alliance';
  name: string;
  countries: string[];
  status: 'proposed' | 'forming' | 'active';
}

const CANADIAN_WAR_CITIES: Record<string, WarCity[]> = {
  'Russia': [
    { name: 'Kaliningrad', controlled: 'enemy', strategicValue: 8, population: 450 },
    { name: 'Murmansk', controlled: 'enemy', strategicValue: 9, population: 300 },
    { name: 'Vladivostok', controlled: 'enemy', strategicValue: 7, population: 600 },
    { name: 'Eastern Ukraine', controlled: 'contested', strategicValue: 6, population: 1200 },
  ],
  'China': [
    { name: 'South China Sea Base', controlled: 'enemy', strategicValue: 9, population: 0 },
    { name: 'Sanya Naval Port', controlled: 'enemy', strategicValue: 8, population: 80 },
    { name: 'Tibet Plateau Region', controlled: 'contested', strategicValue: 5, population: 300 },
  ],
  'North Korea': [
    { name: 'Pyongyang', controlled: 'enemy', strategicValue: 10, population: 2800 },
    { name: 'Kaesong', controlled: 'contested', strategicValue: 6, population: 200 },
    { name: 'Rason Port', controlled: 'enemy', strategicValue: 7, population: 100 },
  ],
  'Iran': [
    { name: 'Tehran', controlled: 'enemy', strategicValue: 10, population: 9000 },
    { name: 'Bandar Abbas', controlled: 'enemy', strategicValue: 8, population: 500 },
    { name: 'Khuzestan Fields', controlled: 'contested', strategicValue: 9, population: 200 },
  ],
  default: [
    { name: 'Northern Capital', controlled: 'enemy', strategicValue: 10, population: 1500 },
    { name: 'Eastern Port', controlled: 'enemy', strategicValue: 7, population: 400 },
    { name: 'Border Region Alpha', controlled: 'contested', strategicValue: 5, population: 100 },
    { name: 'Resource Zone Delta', controlled: 'contested', strategicValue: 6, population: 50 },
  ],
};

const ENEMY_TERRITORIES: Record<string, string[]> = {
  'Russia': ['Kaliningrad', 'Eastern Ukraine', 'Crimea', 'Karelia'],
  'China': ['Tibet', 'Xinjiang', 'Hainan Province'],
  'North Korea': ['Pyongyang Province', 'Hamgyong Province'],
  'Iran': ['Khuzestan', 'Kurdistan Region'],
  default: ['Northern Region', 'Eastern Province', 'Coastal Territory'],
};

const STRATEGIES: { id: Strategy; label: string; description: string; icon: string; bonusLand: number; casualtyMult: number; popularityImpact: number }[] = [
  { id: 'shock_and_awe', label: 'Shock & Awe', description: 'Overwhelming force — rapid territory gains but high casualties and war unpopularity.', icon: 'lightning-bolt', bonusLand: 8, casualtyMult: 2.2, popularityImpact: -12 },
  { id: 'siege', label: 'Siege Warfare', description: 'Surround key cities, cut supply lines. Slower but fewer casualties.', icon: 'wall', bonusLand: 4, casualtyMult: 0.7, popularityImpact: -4 },
  { id: 'guerrilla', label: 'Guerrilla Operations', description: 'Special forces and covert operations. Low visibility but limited gains.', icon: 'ninja', bonusLand: 2, casualtyMult: 0.4, popularityImpact: 2 },
  { id: 'diplomatic_pressure', label: 'Diplomatic Pressure', description: 'Military posturing with UN negotiation. No territory gained but approval boost.', icon: 'handshake', bonusLand: 0, casualtyMult: 0.1, popularityImpact: 8 },
  { id: 'full_mobilization', label: 'Full Mobilization', description: 'Deploy all reserves. Massive gains possible but enormous cost.', icon: 'tank', bonusLand: 12, casualtyMult: 3.0, popularityImpact: -18 },
];

const TRADE_PARTNERS_BASE = [
  { country: 'United States', flag: '🇺🇸', gdpBillion: 26000, tradeVolumeBillion: 850, status: 'ally' as const, dealStatus: 'active' as const, relations: 95 },
  { country: 'European Union', flag: '🇪🇺', gdpBillion: 18000, tradeVolumeBillion: 110, status: 'ally' as const, dealStatus: 'active' as const, relations: 85 },
  { country: 'United Kingdom', flag: '🇬🇧', gdpBillion: 3000, tradeVolumeBillion: 40, status: 'ally' as const, dealStatus: 'negotiating' as const, relations: 80 },
  { country: 'Japan', flag: '🇯🇵', gdpBillion: 4000, tradeVolumeBillion: 35, status: 'ally' as const, dealStatus: 'active' as const, relations: 78 },
  { country: 'China', flag: '🇨🇳', gdpBillion: 19000, tradeVolumeBillion: 95, status: 'rival' as const, dealStatus: 'none' as const, relations: 35 },
  { country: 'India', flag: '🇮🇳', gdpBillion: 3700, tradeVolumeBillion: 12, status: 'neutral' as const, dealStatus: 'none' as const, relations: 60 },
  { country: 'Mexico', flag: '🇲🇽', gdpBillion: 1300, tradeVolumeBillion: 60, status: 'ally' as const, dealStatus: 'active' as const, relations: 82 },
  { country: 'South Korea', flag: '🇰🇷', gdpBillion: 1700, tradeVolumeBillion: 20, status: 'ally' as const, dealStatus: 'none' as const, relations: 75 },
  { country: 'Brazil', flag: '🇧🇷', gdpBillion: 2100, tradeVolumeBillion: 8, status: 'neutral' as const, dealStatus: 'none' as const, relations: 55 },
  { country: 'Australia', flag: '🇦🇺', gdpBillion: 1700, tradeVolumeBillion: 15, status: 'ally' as const, dealStatus: 'none' as const, relations: 88 },
  { country: 'Saudi Arabia', flag: '🇸🇦', gdpBillion: 1100, tradeVolumeBillion: 5, status: 'neutral' as const, dealStatus: 'none' as const, relations: 50 },
  { country: 'Russia', flag: '🇷🇺', gdpBillion: 2200, tradeVolumeBillion: 2, status: 'rival' as const, dealStatus: 'none' as const, relations: 20 },
  { country: 'North Korea', flag: '🇰🇵', gdpBillion: 40, tradeVolumeBillion: 0, status: 'rival' as const, dealStatus: 'none' as const, relations: 5 },
  { country: 'Iran', flag: '🇮🇷', gdpBillion: 300, tradeVolumeBillion: 0, status: 'rival' as const, dealStatus: 'none' as const, relations: 10 },
];

type TradePartner = typeof TRADE_PARTNERS_BASE[0] & { sanctioned?: boolean };

const MILITARY_PARTNERS = [
  { country: 'United States', flag: '🇺🇸', alliance: 'NORAD / NATO', status: 'allied' as const, notes: 'Core defence partnership. Joint continental defence.' },
  { country: 'United Kingdom', flag: '🇬🇧', alliance: 'NATO / Five Eyes', status: 'allied' as const, notes: 'Intelligence sharing and joint operations.' },
  { country: 'France', flag: '🇫🇷', alliance: 'NATO', status: 'allied' as const, notes: 'NATO ally, strong diplomatic ties.' },
  { country: 'Germany', flag: '🇩🇪', alliance: 'NATO', status: 'allied' as const, notes: 'Key European security partner.' },
  { country: 'Australia', flag: '🇦🇺', alliance: 'Five Eyes / AUKUS', status: 'allied' as const, notes: 'Pacific intelligence and security partner.' },
  { country: 'Japan', flag: '🇯🇵', alliance: 'Bilateral', status: 'partner' as const, notes: 'Growing Indo-Pacific security cooperation.' },
  { country: 'Poland', flag: '🇵🇱', alliance: 'NATO', status: 'allied' as const, notes: 'NATO eastern flank partner.' },
  { country: 'Ukraine', flag: '🇺🇦', alliance: 'Support', status: 'partner' as const, notes: 'Military and humanitarian support partner.' },
  { country: 'India', flag: '🇮🇳', alliance: 'None', status: 'none' as const, notes: 'Large democracy, strategic opportunity.' },
  { country: 'Brazil', flag: '🇧🇷', alliance: 'None', status: 'none' as const, notes: 'Hemisphere partner. No formal alliance.' },
  { country: 'South Korea', flag: '🇰🇷', alliance: 'Bilateral', status: 'partner' as const, notes: 'Indo-Pacific security cooperation.' },
];

type MilitaryPartner = typeof MILITARY_PARTNERS[0];

const STATUS_COLORS: Record<string, string> = {
  ally: Colors.success, neutral: Colors.textSecondary, rival: Colors.warning,
  sanctioned: Colors.error, allied: Colors.success, partner: Colors.info, none: Colors.textMuted,
  active: Colors.success, negotiating: Colors.warning, proposed: Colors.info,
};

function buildDefaultPeaceOptions(country: string): PeaceDealOption[] {
  const territories = ENEMY_TERRITORIES[country] || ENEMY_TERRITORIES['default'];
  return [
    { id: 'territory', label: 'Seize Territory', description: `Annex captured regions from ${country}.`, territory: territories[0], selected: false },
    { id: 'federal_reserves', label: 'Seize Federal Reserves', description: `Demand transfer of ${country}'s gold and currency reserves.`, selected: false },
    { id: 'observe', label: 'Impose Observation Treaty', description: `Monitor ${country}'s military for 10 years.`, selected: false },
    { id: 'democracy', label: 'Impose Democratic System', description: `Require ${country} to hold supervised elections and constitutional reforms.`, selected: false },
  ];
}

function buildDefaultTradeTerms(country: string): TradeTerm[] {
  return [
    { id: 'tariff_reduce', label: 'Reduce Tariffs', description: `Lower Canadian tariffs on ${country} goods by 15–25%.`, selected: false, value: '20%' },
    { id: 'tariff_increase', label: 'Increase Tariffs', description: `Apply protective tariffs on ${country} imports.`, selected: false, value: '15%' },
    { id: 'buy_resources', label: 'Buy Resources', description: `Canada imports oil, lumber, minerals from ${country}.`, selected: false, value: 'Oil & Minerals' },
    { id: 'sell_resources', label: 'Sell Resources', description: `Canada exports natural resources, wheat, energy to ${country}.`, selected: false, value: 'Wheat & Energy' },
    { id: 'manufactured_goods', label: 'Manufactured Goods Exchange', description: `Two-way trade in vehicles, technology, pharmaceuticals.`, selected: false },
    { id: 'pipeline', label: 'Pipeline Deal', description: `Build or expand cross-border energy pipeline infrastructure.`, selected: false, value: 'Trans-Pacific Pipeline' },
    { id: 'most_favoured', label: 'Most Favoured Nation Status', description: `Grant ${country} preferential trade treatment under WTO rules.`, selected: false },
  ];
}

function getWarProgress(landGained: number): ActiveWar['warProgress'] {
  if (landGained >= 60) return 'dominant';
  if (landGained >= 35) return 'winning';
  if (landGained >= 15) return 'stalemate';
  return 'losing';
}

function getPeaceDealAcceptanceChance(war: ActiveWar): number {
  let base = 20 + war.landGained * 0.7;
  const selectedTerms = war.peaceOptions.filter(o => o.selected).length;
  base -= selectedTerms * 12;
  if (war.peaceTermsRejected) base -= 15;
  return Math.max(5, Math.min(90, Math.round(base)));
}

const CITY_ROLE_ICONS: Record<CityRole, string> = {
  attack: 'sword', defend: 'shield', bomb_air: 'airplane', bomb_artillery: 'cannon', hold: 'flag',
};
const CITY_ROLE_LABELS: Record<CityRole, string> = {
  attack: 'Ground Assault', defend: 'Fortify & Defend', bomb_air: 'Airstrike', bomb_artillery: 'Artillery Strike', hold: 'Hold Position',
};
const CITY_ROLE_COLORS: Record<CityRole, string> = {
  attack: Colors.error, defend: Colors.success, bomb_air: Colors.warning, bomb_artillery: Colors.warning, hold: Colors.info,
};

export default function ForeignPolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, executeForeignPolicy } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [view, setView] = useState<FPView>('overview');
  const [tradePartners, setTradePartners] = useState<TradePartner[]>(TRADE_PARTNERS_BASE.map(p => ({ ...p, sanctioned: false })));
  const [militaryAlliances, setMilitaryAlliances] = useState<MilitaryPartner[]>(MILITARY_PARTNERS);
  const [activeWars, setActiveWars] = useState<ActiveWar[]>([]);
  const [tradeNegotiation, setTradeNegotiation] = useState<TradeNegotiation | null>(null);
  const [selectedWarForPeace, setSelectedWarForPeace] = useState<string | null>(null);
  const [selectedWarForOps, setSelectedWarForOps] = useState<string | null>(null);
  const [multinationalDeals, setMultinationalDeals] = useState<MultinationalDeal[]>([]);
  const [sanctionBills, setSanctionBills] = useState<SanctionBill[]>([]);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiIncomingTrade, setAiIncomingTrade] = useState<TradeNegotiation | null>(null);
  const [aiIncomingWar, setAiIncomingWar] = useState<{ country: string; flag: string; reason: string } | null>(null);
  const [multinationalForm, setMultinationalForm] = useState<{ type: 'trade_bloc' | 'military_alliance'; name: string; selected: string[] } | null>(null);

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;

  // ── AI random events: trade requests & war declarations ─────────────────────
  // (called from week advance in GameContext; here we handle incoming ones stored in gameState)
  const randomAIEvents = useCallback(() => {
    // Random AI-initiated trade offer from an allied country
    if (!aiIncomingTrade && Math.random() < 0.12) {
      const allies = tradePartners.filter(p => p.status === 'ally' && p.dealStatus !== 'active' && !p.sanctioned);
      if (allies.length > 0) {
        const partner = allies[Math.floor(Math.random() * allies.length)];
        setAiIncomingTrade({
          country: partner.country,
          flag: partner.flag,
          type: 'ai_offer',
          terms: buildDefaultTradeTerms(partner.country).map((t, i) => ({ ...t, selected: i < 2 })),
          aiOfferText: `${partner.country} has formally approached Canada to open trade negotiations. They propose reducing mutual tariffs and establishing a bilateral goods exchange agreement.`,
        });
      }
    }
    // Random enemy war declaration when relations are low
    if (!aiIncomingWar && Math.random() < 0.06) {
      const rivals = tradePartners.filter(p => (p.status === 'rival') && !activeWars.some(w => w.country === p.country));
      if (rivals.length > 0) {
        const rival = rivals[Math.floor(Math.random() * rivals.length)];
        if (rival.relations < 25) {
          setAiIncomingWar({
            country: rival.country,
            flag: rival.flag,
            reason: `${rival.country} has declared war on Canada, citing Canadian sanctions and military posturing as acts of aggression. A state of war now exists.`,
          });
        }
      }
    }
  }, [tradePartners, activeWars, aiIncomingTrade, aiIncomingWar]);

  const handleAIWarDeclaration = (country: string, flag: string) => {
    setAiIncomingWar(null);
    const cities = CANADIAN_WAR_CITIES[country] || CANADIAN_WAR_CITIES['default'];
    const newWar: ActiveWar = {
      country, flag,
      weekDeclared: gameState.currentWeek,
      weeksActive: 1,
      casualties: Math.floor(Math.random() * 200 + 100),
      approvalImpact: -5,
      landGained: 2,
      warProgress: 'losing',
      phase: 'active',
      peaceTermsRejected: false,
      warPopularity: 55,
      peaceOptions: buildDefaultPeaceOptions(country),
      cities: cities.map(c => ({ ...c })),
      plannedOps: [],
      strategy: null,
      totalTroops: 80000,
      deployedTroops: 0,
      riotActive: false,
    };
    setActiveWars(prev => [...prev, newWar]);
    executeForeignPolicy?.('declare_war', country, -5, -3);
    showAlert('⚠️ War Declared', `${country} has declared war on Canada! You are now at war. Head to the War & Peace tab to manage your military operations.`);
  };

  const handleAIPeaceProposal = async (war: ActiveWar) => {
    setGeneratingAI(true);
    let proposalText = `${war.country} proposes a ceasefire in exchange for Canadian withdrawal from occupied territories and a 5-year non-aggression pact.`;
    try {
      const { data, error } = await supabase.functions.invoke('ai-question-period', {
        body: {
          partyName: party?.name, leaderName: gameState.playerName, isGoverning: true,
          stats: gameState.stats, currentEvents: [], rivals: [], weekNumber: gameState.currentWeek,
          parliamentNumber: gameState.parliamentNumber, recentNewsHeadlines: [],
          context: `Generate a single realistic peace deal proposal from ${war.country} to Canada after ${war.weeksActive} weeks of war. Canada controls ${Math.round(war.landGained)}% of enemy territory. The proposal should reflect the military situation. Format as a single paragraph from ${war.country}'s perspective.`,
        },
      });
      if (!error && data?.questions?.[0]?.question) proposalText = data.questions[0].question;
    } catch {}
    setGeneratingAI(false);
    setActiveWars(prev => prev.map(w => w.country === war.country ? { ...w, phase: 'negotiating', aiPeaceProposalText: proposalText } : w));
    showAlert(`${war.country} Peace Proposal`, proposalText, [
      { text: 'Accept & End War', onPress: () => { setActiveWars(prev => prev.filter(w => w.country !== war.country)); executeForeignPolicy?.('peace_treaty', war.country, 6, 2); } },
      { text: 'Reject & Fight On', onPress: () => setActiveWars(prev => prev.map(w => w.country === war.country ? { ...w, phase: 'active' } : w)) },
    ]);
  };

  const handleDeclareWar = (country: string, flag: string) => {
    const allianceStatus = militaryAlliances.find(m => m.country === country)?.status;
    if (allianceStatus === 'allied') { showAlert('Cannot Declare War', `${country} is a current military ally.`); return; }
    if (activeWars.some(w => w.country === country)) { showAlert('Already at War', `Canada is already in conflict with ${country}.`); return; }
    showAlert(
      `Declare War on ${country}?`,
      `WARNING: War is continuous until peace is signed. Expect:\n• −8% approval\n• GDP −0.5%/week\n• Ongoing casualties\n• Possible enemy counter-attack\n\nAre you certain?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Declare War', style: 'destructive',
          onPress: () => {
            const cities = CANADIAN_WAR_CITIES[country] || CANADIAN_WAR_CITIES['default'];
            const newWar: ActiveWar = {
              country, flag,
              weekDeclared: gameState.currentWeek, weeksActive: 1,
              casualties: Math.floor(Math.random() * 100 + 50),
              approvalImpact: -8, landGained: 5, warProgress: 'stalemate',
              phase: 'active', peaceTermsRejected: false, warPopularity: 60,
              peaceOptions: buildDefaultPeaceOptions(country),
              cities: cities.map(c => ({ ...c })),
              plannedOps: [], strategy: null,
              totalTroops: 100000, deployedTroops: 0, riotActive: false,
            };
            setActiveWars(prev => [...prev, newWar]);
            executeForeignPolicy?.('declare_war', country, -8, -5);
          },
        },
      ]
    );
  };

  const handleSetStrategy = (country: string, stratId: Strategy) => {
    const strat = STRATEGIES.find(s => s.id === stratId);
    if (!strat) return;
    setActiveWars(prev => prev.map(w => {
      if (w.country !== country) return w;
      const newLand = Math.min(100, w.landGained + strat.bonusLand + Math.random() * 5 - 2);
      const newCasualties = w.casualties + Math.floor(strat.casualtyMult * (Math.random() * 100 + 50));
      const newPop = Math.max(5, Math.min(100, w.warPopularity + strat.popularityImpact));
      const riotActive = newPop < 25;
      return { ...w, strategy: stratId, landGained: newLand, casualties: newCasualties, warPopularity: newPop, riotActive, warProgress: getWarProgress(newLand) };
    }));
    executeForeignPolicy?.('war_strategy', country, strat.popularityImpact * 0.3, -0.2);
    showAlert(`Strategy: ${strat.label}`, `Strategy applied. Land gained +${strat.bonusLand}%, casualties adjusted. War popularity: ${strat.popularityImpact > 0 ? '+' : ''}${strat.popularityImpact}%.`);
  };

  const handleTroopOp = (country: string, cityName: string, role: CityRole) => {
    setActiveWars(prev => prev.map(w => {
      if (w.country !== country) return w;
      const existing = w.plannedOps.findIndex(o => o.cityName === cityName);
      const op: TroopOperation = { cityName, role, troopsDeployed: role === 'attack' || role === 'defend' ? 10000 : 5000 };
      let ops = [...w.plannedOps];
      if (existing >= 0) ops[existing] = op; else ops = [...ops, op];
      const deployed = ops.reduce((s, o) => s + o.troopsDeployed, 0);
      // Apply operation effects
      let cities = w.cities.map(c => {
        if (c.name !== cityName) return c;
        if (role === 'attack') return { ...c, controlled: 'canada' as const };
        if (role === 'defend' && c.controlled === 'canada') return c;
        if (role === 'bomb_air' || role === 'bomb_artillery') return { ...c, strategicValue: Math.max(1, c.strategicValue - 2) };
        return c;
      });
      const canadaCities = cities.filter(c => c.controlled === 'canada').length;
      const newLand = Math.min(100, w.landGained + (role === 'attack' ? 5 : role === 'bomb_air' ? 2 : role === 'bomb_artillery' ? 1.5 : 0));
      const newCasualties = w.casualties + (role === 'attack' ? Math.floor(Math.random() * 300 + 100) : role === 'defend' ? 50 : 200);
      return { ...w, plannedOps: ops, cities, deployedTroops: Math.min(w.totalTroops, deployed), landGained: newLand, casualties: newCasualties, warProgress: getWarProgress(newLand) };
    }));
  };

  const handleProposePeaceDeal = (country: string) => {
    const war = activeWars.find(w => w.country === country);
    if (!war) return;
    const selectedTerms = war.peaceOptions.filter(o => o.selected);
    if (selectedTerms.length === 0) { showAlert('No Terms Selected', 'Select at least one peace term.'); return; }
    const acceptChance = getPeaceDealAcceptanceChance(war);
    const accepted = Math.random() * 100 < acceptChance;
    if (accepted) {
      setActiveWars(prev => prev.filter(w => w.country !== country));
      executeForeignPolicy?.('peace_treaty', country, 6, 3);
      showAlert('Peace Deal Accepted', `${country} accepted Canada's peace terms. The conflict is over.`);
    } else {
      setActiveWars(prev => prev.map(w => w.country === country ? { ...w, peaceTermsRejected: true, phase: 'peace_rejected' } : w));
      showAlert('Peace Terms Rejected', `${country} rejected the terms (acceptance was ${acceptChance}%). You may modify and resubmit.`);
      setTimeout(() => setActiveWars(prev => prev.map(w => w.country === country ? { ...w, phase: 'active' } : w)), 1500);
    }
    setSelectedWarForPeace(null);
  };

  const handleSurrender = (country: string) => {
    showAlert('Surrender?', 'Significant concessions. Approval drops, international standing falls.',
      [{ text: 'Keep Fighting', style: 'cancel' },
       { text: 'Surrender', style: 'destructive', onPress: () => { setActiveWars(prev => prev.filter(w => w.country !== country)); executeForeignPolicy?.('surrender', country, -12, -3); } }]
    );
  };

  // ── Trade ─────────────────────────────────────────────────────────────────
  const openTradeNegotiation = (country: string, flag: string, type: 'propose' | 'ai_offer' = 'propose') => {
    setTradeNegotiation({ country, flag, type, terms: buildDefaultTradeTerms(country) });
  };

  const toggleTradeTerm = (termId: string) => {
    setTradeNegotiation(prev => prev ? { ...prev, terms: prev.terms.map(t => t.id === termId ? { ...t, selected: !t.selected } : t) } : null);
  };

  const submitTradeDeal = async () => {
    if (!tradeNegotiation) return;
    const selectedTerms = tradeNegotiation.terms.filter(t => t.selected);
    if (selectedTerms.length === 0) { showAlert('No Terms', 'Select at least one trade term.'); return; }
    setGeneratingAI(true);
    let aiResponse = '';
    try {
      const { data } = await supabase.functions.invoke('ai-question-period', {
        body: {
          partyName: party?.name, leaderName: gameState.playerName, isGoverning: true,
          stats: gameState.stats, currentEvents: [], rivals: [], weekNumber: gameState.currentWeek,
          parliamentNumber: gameState.parliamentNumber, recentNewsHeadlines: [],
          context: `Generate a brief response (2-3 sentences) from ${tradeNegotiation.country} to Canada's trade proposal. Terms offered: ${selectedTerms.map(t => t.label).join(', ')}. Canada's trade relations with ${tradeNegotiation.country} are ${tradePartners.find(p => p.country === tradeNegotiation.country)?.relations || 50}/100. Make the response realistic.`,
        },
      });
      if (data?.questions?.[0]?.question) aiResponse = data.questions[0].question;
    } catch {}
    setGeneratingAI(false);

    const partner = tradePartners.find(p => p.country === tradeNegotiation.country);
    const relations = partner?.relations || 50;
    const accepted = relations > 40 && partner?.status !== 'rival' && Math.random() > 0.25;
    setTradePartners(prev => prev.map(p => p.country === tradeNegotiation.country ? { ...p, dealStatus: accepted ? 'active' : 'none', relations: accepted ? Math.min(100, relations + 10) : Math.max(0, relations - 5) } : p));
    setTradeNegotiation(null);
    setAiIncomingTrade(null);
    executeForeignPolicy?.(accepted ? 'trade_deal' : 'trade_decline', tradeNegotiation.country, accepted ? 3 : -1, accepted ? 2 : 0);
    showAlert(
      accepted ? '✅ Trade Deal Reached' : '❌ Negotiations Failed',
      aiResponse || (accepted ? `${tradeNegotiation.country} has agreed to the trade terms.` : `${tradeNegotiation.country} declined the proposed terms at this time.`)
    );
  };

  const handleSanction = (country: string) => {
    if (sanctionBills.some(b => b.country === country)) { showAlert('Already Pending', `A sanction bill against ${country} is already before Parliament.`); return; }
    showAlert(
      `Sanction ${country}?`,
      `Imposing sanctions requires a parliamentary vote. The bill will go to a vote in the House of Commons this week. If approved, ${country} will be sanctioned — trade suspended, assets frozen.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Table Sanction Bill',
          onPress: () => {
            setSanctionBills(prev => [...prev, { country, status: 'pending_vote', weeksUntilVote: 1 }]);
            showAlert('Sanction Bill Tabled', `A bill to sanction ${country} has been tabled. It requires House approval to take effect.`);
          },
        },
      ]
    );
  };

  // Sanction vote resolution (simulated)
  const resolveSanctionVote = (country: string) => {
    const approved = Math.random() > 0.4; // 60% chance parliament approves
    setSanctionBills(prev => prev.map(b => b.country === country ? { ...b, status: approved ? 'approved' : 'rejected' } : b));
    if (approved) {
      setTradePartners(prev => prev.map(p => p.country === country ? { ...p, sanctioned: true, dealStatus: 'none', status: 'sanctioned' as const, relations: Math.max(0, (p.relations || 50) - 30) } : p));
      executeForeignPolicy?.('sanction', country, -2, -0.5);
      showAlert('Sanctions Approved', `Parliament has approved sanctions on ${country}. All trade is suspended.`);
    } else {
      showAlert('Sanctions Rejected', `Parliament rejected the sanction bill against ${country}. The government may reintroduce it.`);
    }
  };

  // ── Military ──────────────────────────────────────────────────────────────
  const handleMilitaryAlliance = (country: string, newStatus: 'allied' | 'partner' | 'none') => {
    showAlert(
      newStatus === 'none' ? 'Withdraw Alliance' : newStatus === 'allied' ? 'Form Military Alliance' : 'Establish Partnership',
      `This will ${newStatus === 'none' ? 'end' : 'create'} Canada's defence relationship with ${country}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus === 'none' ? 'Withdraw' : 'Confirm',
          style: newStatus === 'none' ? 'destructive' : 'default',
          onPress: () => {
            setMilitaryAlliances(prev => prev.map(p => p.country === country ? { ...p, status: newStatus } : p));
            executeForeignPolicy?.('military_alliance', country, newStatus === 'allied' ? 3 : newStatus === 'partner' ? 1 : -4, 0);
          },
        },
      ]
    );
  };

  const handleMultinationalProposal = () => {
    if (!multinationalForm) return;
    if (multinationalForm.selected.length < 2) { showAlert('Need Countries', 'Select at least 2 countries for a multinational deal.'); return; }
    const newDeal: MultinationalDeal = {
      type: multinationalForm.type,
      name: multinationalForm.name || `${multinationalForm.type === 'trade_bloc' ? 'Trade Bloc' : 'Alliance'} ${gameState.currentWeek}`,
      countries: multinationalForm.selected,
      status: 'proposed',
    };
    setMultinationalDeals(prev => [...prev, newDeal]);
    setMultinationalForm(null);
    // Simulate responses
    const accepted = Math.random() > 0.4;
    setTimeout(() => {
      setMultinationalDeals(prev => prev.map(d => d.name === newDeal.name ? { ...d, status: accepted ? 'active' : 'forming' } : d));
      showAlert(
        accepted ? 'Multinational Deal Forming' : 'Partial Interest',
        accepted
          ? `${newDeal.countries.join(', ')} have agreed to form the ${newDeal.name}. Ratification is underway.`
          : `Some countries expressed interest. Formal negotiations will continue over the next few weeks.`
      );
    }, 1000);
    executeForeignPolicy?.(newDeal.type === 'trade_bloc' ? 'trade_deal' : 'military_alliance', newDeal.countries.join(','), 4, 1);
  };

  const tabs = [
    { id: 'overview' as FPView, label: 'Overview', icon: 'earth' },
    { id: 'trade' as FPView, label: 'Trade', icon: 'handshake' },
    { id: 'military' as FPView, label: 'Alliances', icon: 'shield-account' },
    { id: 'war' as FPView, label: 'War & Peace', icon: 'sword-cross' },
  ];

  const warCount = activeWars.length;
  const activeDeals = tradePartners.filter(p => p.dealStatus === 'active').length;
  const alliedCount = militaryAlliances.filter(p => p.status === 'allied').length;
  const pendingSanctions = sanctionBills.filter(b => b.status === 'pending_vote').length;

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Foreign Policy</Text>
          <Text style={styles.headerSub}>Prime Minister — Global Affairs Canada</Text>
        </View>
        <View style={[styles.pmBadge, { backgroundColor: partyColor + '22', borderColor: partyColor + '44' }]}>
          <Text style={[styles.pmBadgeText, { color: partyColor }]}>PM</Text>
        </View>
      </View>

      {/* AI incoming events banner */}
      {aiIncomingTrade ? (
        <Pressable onPress={() => { openTradeNegotiation(aiIncomingTrade.country, aiIncomingTrade.flag, 'ai_offer'); setView('trade'); }} style={styles.incomingBanner}>
          <MaterialCommunityIcons name="handshake" size={14} color={Colors.success} />
          <Text style={styles.incomingBannerText}>🤝 {aiIncomingTrade.country} is requesting trade negotiations — tap to review</Text>
          <Pressable onPress={() => setAiIncomingTrade(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close" size={14} color={Colors.textMuted} />
          </Pressable>
        </Pressable>
      ) : null}
      {aiIncomingWar ? (
        <Pressable onPress={() => handleAIWarDeclaration(aiIncomingWar.country, aiIncomingWar.flag)} style={[styles.incomingBanner, { backgroundColor: Colors.error + '22', borderColor: Colors.error + '44' }]}>
          <MaterialCommunityIcons name="sword-cross" size={14} color={Colors.error} />
          <Text style={[styles.incomingBannerText, { color: Colors.error }]}>⚠️ {aiIncomingWar.country} has declared war — tap to enter conflict</Text>
        </Pressable>
      ) : null}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <Pressable key={tab.id} onPress={() => setView(tab.id)} style={[styles.tab, view === tab.id && [styles.tabActive, { borderBottomColor: partyColor }]]}>
            <MaterialCommunityIcons name={tab.icon as any} size={13} color={view === tab.id ? partyColor : Colors.textMuted} />
            <Text style={[styles.tabText, view === tab.id && { color: partyColor, fontWeight: FontWeight.bold }]}>{tab.label}</Text>
            {tab.id === 'war' && warCount > 0 ? <View style={styles.warBadge}><Text style={styles.warBadgeText}>{warCount}</Text></View> : null}
            {tab.id === 'trade' && pendingSanctions > 0 ? <View style={[styles.warBadge, { backgroundColor: Colors.warning }]}><Text style={styles.warBadgeText}>{pendingSanctions}</Text></View> : null}
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── OVERVIEW ── */}
        {view === 'overview' ? (
          <View style={styles.section}>
            <View style={styles.statsGrid}>
              {[
                { icon: 'handshake', value: activeDeals, label: 'Trade Deals', color: Colors.success },
                { icon: 'shield-account', value: alliedCount, label: 'Allies', color: Colors.info },
                { icon: 'sword-cross', value: warCount, label: 'Conflicts', color: warCount > 0 ? Colors.error : Colors.textMuted },
                { icon: 'cancel', value: tradePartners.filter(p => p.sanctioned).length, label: 'Sanctioned', color: Colors.warning },
              ].map(s => (
                <View key={s.label} style={styles.statCard}>
                  <MaterialCommunityIcons name={s.icon as any} size={20} color={s.color} />
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {warCount > 0 ? (
              <View style={styles.warAlert}>
                <MaterialCommunityIcons name="alert" size={16} color={Colors.error} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warAlertTitle}>ACTIVE CONFLICTS — WEEKLY UPDATES</Text>
                  {activeWars.map(w => (
                    <View key={w.country} style={styles.warAlertRow}>
                      <Text style={styles.warAlertText}>{w.flag} {w.country} — Wk {w.weeksActive} — {w.warProgress.toUpperCase()}</Text>
                      <View style={[styles.popPill, { backgroundColor: w.warPopularity < 30 ? Colors.error + '22' : Colors.warning + '22' }]}>
                        <Text style={[styles.popPillText, { color: w.warPopularity < 30 ? Colors.error : Colors.warning }]}>Pop: {Math.round(w.warPopularity)}%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Multinational deals */}
            {multinationalDeals.length > 0 ? (
              <View style={styles.multinationalSection}>
                <Text style={styles.sectionLabel}>MULTINATIONAL DEALS</Text>
                {multinationalDeals.map((d, idx) => (
                  <View key={idx} style={styles.multinationalCard}>
                    <MaterialCommunityIcons name={d.type === 'trade_bloc' ? 'earth' : 'shield-star'} size={16} color={d.type === 'trade_bloc' ? Colors.success : Colors.info} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.multinationalName}>{d.name}</Text>
                      <Text style={styles.multinationalCountries}>{d.countries.join(', ')}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: d.status === 'active' ? Colors.success + '22' : Colors.warning + '22' }]}>
                      <Text style={[styles.statusPillText, { color: d.status === 'active' ? Colors.success : Colors.warning }]}>{d.status.toUpperCase()}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.quickActions}>
              <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
              {[
                { icon: 'handshake', label: 'Propose Trade Deal', action: () => setView('trade'), color: Colors.success },
                { icon: 'shield-star', label: 'Manage Alliances + Multinational', action: () => setView('military'), color: Colors.info },
                { icon: 'sword-cross', label: `War & Peace${warCount > 0 ? ` (${warCount} active)` : ''}`, action: () => setView('war'), color: warCount > 0 ? Colors.error : Colors.textSecondary },
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
        {view === 'trade' && !tradeNegotiation ? (
          <View style={styles.section}>
            {/* AI incoming offer */}
            {aiIncomingTrade ? (
              <View style={[styles.aiOfferCard, { borderColor: Colors.success + '55' }]}>
                <View style={styles.aiOfferHeader}>
                  <Text style={styles.tradeFlag}>{aiIncomingTrade.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.aiOfferCountry, { color: Colors.success }]}>{aiIncomingTrade.country} — Trade Request</Text>
                    <Text style={styles.aiOfferText}>{aiIncomingTrade.aiOfferText}</Text>
                  </View>
                </View>
                <View style={styles.aiOfferActions}>
                  <Pressable onPress={() => openTradeNegotiation(aiIncomingTrade.country, aiIncomingTrade.flag, 'ai_offer')} style={[styles.tradeBtn, { borderColor: Colors.success + '55', backgroundColor: Colors.success + '11', flex: 1 }]}>
                    <Text style={[styles.tradeBtnText, { color: Colors.success }]}>Review & Negotiate</Text>
                  </Pressable>
                  <Pressable onPress={() => setAiIncomingTrade(null)} style={[styles.tradeBtn, { borderColor: Colors.error + '44', flex: 1 }]}>
                    <Text style={[styles.tradeBtnText, { color: Colors.error }]}>Decline</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Pending sanction votes */}
            {sanctionBills.length > 0 ? (
              <View style={styles.sanctionSection}>
                <Text style={styles.sectionLabel}>SANCTION BILLS IN PARLIAMENT</Text>
                {sanctionBills.map((b, idx) => (
                  <View key={idx} style={[styles.sanctionCard, { borderColor: b.status === 'approved' ? Colors.error + '55' : Colors.warning + '44' }]}>
                    <MaterialCommunityIcons name="cancel" size={16} color={b.status === 'approved' ? Colors.error : Colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sanctionCountry}>Sanction Bill: {b.country}</Text>
                      <Text style={styles.sanctionStatus}>
                        {b.status === 'pending_vote' ? `Scheduled for House vote this week` : b.status === 'approved' ? 'Sanctions ACTIVE' : 'Rejected by Parliament'}
                      </Text>
                    </View>
                    {b.status === 'pending_vote' ? (
                      <Pressable onPress={() => resolveSanctionVote(b.country)} style={[styles.tradeBtn, { borderColor: Colors.warning + '55' }]}>
                        <Text style={[styles.tradeBtnText, { color: Colors.warning }]}>Hold Vote</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>TRADE PARTNERS</Text>
            {tradePartners.map(partner => {
              const isAtWar = activeWars.some(w => w.country === partner.country);
              return (
                <View key={partner.country} style={styles.tradeCard}>
                  <View style={styles.tradeCardHeader}>
                    <Text style={styles.tradeFlag}>{partner.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tradeCountry}>{partner.country}</Text>
                      <Text style={styles.tradeVolume}>${partner.tradeVolumeBillion}B trade · Relations: {partner.relations}/100</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: (partner.sanctioned ? Colors.error : STATUS_COLORS[partner.status]) + '22' }]}>
                      <Text style={[styles.statusPillText, { color: partner.sanctioned ? Colors.error : STATUS_COLORS[partner.status] }]}>
                        {partner.sanctioned ? 'SANCTIONED' : partner.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Relations bar */}
                  <View style={styles.relationsBar}>
                    <View style={[styles.relationsBarFill, { flex: partner.relations, backgroundColor: partner.relations > 60 ? Colors.success : partner.relations > 30 ? Colors.warning : Colors.error }]} />
                    <View style={{ flex: 100 - partner.relations }} />
                  </View>

                  <View style={[styles.dealStatusBadge, { backgroundColor: STATUS_COLORS[partner.dealStatus] + '22', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.dealStatusBadgeText, { color: STATUS_COLORS[partner.dealStatus] }]}>
                      {partner.dealStatus === 'active' ? '✓ DEAL ACTIVE' : partner.dealStatus === 'negotiating' ? '⟳ NEGOTIATING' : 'NO DEAL'}
                    </Text>
                  </View>

                  {!partner.sanctioned && !isAtWar ? (
                    <View style={styles.tradeActionsRow}>
                      <Pressable onPress={() => openTradeNegotiation(partner.country, partner.flag)} style={({ pressed }) => [styles.tradeBtn, { borderColor: partyColor + '55', backgroundColor: partyColor + '11', flex: 2 }, pressed && { opacity: 0.8 }]}>
                        <MaterialCommunityIcons name="file-document-edit" size={12} color={partyColor} />
                        <Text style={[styles.tradeBtnText, { color: partyColor }]}>
                          {partner.dealStatus === 'active' ? 'Renegotiate' : 'Negotiate Deal'}
                        </Text>
                      </Pressable>
                      {partner.status !== 'ally' ? (
                        <Pressable onPress={() => handleSanction(partner.country)} style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.error + '44' }, pressed && { opacity: 0.8 }]}>
                          <MaterialCommunityIcons name="cancel" size={12} color={Colors.error} />
                          <Text style={[styles.tradeBtnText, { color: Colors.error }]}>Sanction</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.blockedNote}>
                      <MaterialCommunityIcons name={partner.sanctioned ? 'cancel' : 'sword-cross'} size={12} color={Colors.error} />
                      <Text style={styles.blockedNoteText}>{partner.sanctioned ? 'Trade suspended — under sanctions' : 'Trade suspended — at war'}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* ── TRADE NEGOTIATION PANEL ── */}
        {view === 'trade' && tradeNegotiation ? (
          <View style={styles.section}>
            <View style={styles.negotiationHeader}>
              <Pressable onPress={() => setTradeNegotiation(null)} style={styles.iconBtn}>
                <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.tradeFlag}>{tradeNegotiation.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.negotiationTitle}>Trade Negotiation</Text>
                <Text style={styles.negotiationSub}>{tradeNegotiation.country}</Text>
              </View>
            </View>

            {tradeNegotiation.aiOfferText ? (
              <View style={[styles.aiOfferNote, { borderColor: Colors.success + '44' }]}>
                <MaterialCommunityIcons name="robot" size={13} color={Colors.success} />
                <Text style={[styles.aiOfferNoteText, { color: Colors.success }]}>{tradeNegotiation.aiOfferText}</Text>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>SELECT TRADE TERMS</Text>
            <Text style={styles.sectionNote}>Choose which terms to include in the agreement. AI will simulate the counterpart's response.</Text>

            {tradeNegotiation.terms.map(term => (
              <Pressable key={term.id} onPress={() => toggleTradeTerm(term.id)} style={({ pressed }) => [styles.termCard, term.selected && { borderColor: partyColor, backgroundColor: partyColor + '0D' }, pressed && { opacity: 0.85 }]}>
                <View style={[styles.termCheck, term.selected && { backgroundColor: partyColor, borderColor: partyColor }]}>
                  {term.selected ? <MaterialCommunityIcons name="check" size={12} color="#fff" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.termLabel, term.selected && { color: partyColor }]}>{term.label}</Text>
                  <Text style={styles.termDesc}>{term.description}</Text>
                  {term.value ? (
                    <View style={styles.termValueRow}>
                      <MaterialCommunityIcons name="tag" size={11} color={Colors.textMuted} />
                      <Text style={styles.termValue}>{term.value}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            ))}

            <View style={styles.selectedTermsCount}>
              <Text style={styles.selectedTermsCountText}>{tradeNegotiation.terms.filter(t => t.selected).length} term(s) selected</Text>
            </View>

            <View style={styles.tradeActionsRow}>
              <Pressable onPress={() => setTradeNegotiation(null)} style={[styles.tradeBtn, { flex: 1 }]}>
                <Text style={[styles.tradeBtnText, { color: Colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={submitTradeDeal}
                disabled={generatingAI || tradeNegotiation.terms.filter(t => t.selected).length === 0}
                style={({ pressed }) => [styles.tradeBtn, { flex: 2, borderColor: partyColor + '55', backgroundColor: partyColor + '11' }, (generatingAI || tradeNegotiation.terms.filter(t => t.selected).length === 0) && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
              >
                <MaterialCommunityIcons name="robot" size={13} color={partyColor} />
                <Text style={[styles.tradeBtnText, { color: partyColor }]}>{generatingAI ? 'Getting AI response...' : 'Submit Proposal'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* ── MILITARY ALLIANCES ── */}
        {view === 'military' ? (
          <View style={styles.section}>
            {/* Multinational proposal form */}
            {multinationalForm ? (
              <View style={styles.multinationalForm}>
                <Text style={styles.sectionLabel}>PROPOSE MULTINATIONAL {multinationalForm.type === 'trade_bloc' ? 'TRADE BLOC' : 'MILITARY ALLIANCE'}</Text>
                <TextInput
                  style={styles.multinationalNameInput}
                  placeholder={`Name your ${multinationalForm.type === 'trade_bloc' ? 'trade bloc' : 'alliance'} (e.g., Pacific Trade Alliance)`}
                  placeholderTextColor={Colors.textMuted}
                  value={multinationalForm.name}
                  onChangeText={name => setMultinationalForm(prev => prev ? { ...prev, name } : null)}
                />
                <Text style={styles.sectionLabel}>SELECT MEMBER COUNTRIES</Text>
                <View style={styles.countrySelectGrid}>
                  {[...tradePartners.filter(p => p.status === 'ally'), ...militaryAlliances.filter(m => m.status === 'allied')].filter((v, i, a) => a.findIndex(t => t.country === v.country) === i).map(p => {
                    const isSelected = multinationalForm.selected.includes(p.country);
                    return (
                      <Pressable key={p.country} onPress={() => setMultinationalForm(prev => prev ? { ...prev, selected: isSelected ? prev.selected.filter(c => c !== p.country) : [...prev.selected, p.country] } : null)} style={[styles.countrySelectChip, isSelected && { borderColor: partyColor, backgroundColor: partyColor + '22' }]}>
                        <Text style={styles.countrySelectFlag}>{p.flag || '🌍'}</Text>
                        <Text style={[styles.countrySelectName, isSelected && { color: partyColor }]}>{p.country}</Text>
                        {isSelected ? <MaterialCommunityIcons name="check" size={12} color={partyColor} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.tradeActionsRow}>
                  <Pressable onPress={() => setMultinationalForm(null)} style={[styles.tradeBtn, { flex: 1 }]}>
                    <Text style={[styles.tradeBtnText, { color: Colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={handleMultinationalProposal} disabled={multinationalForm.selected.length < 2} style={({ pressed }) => [styles.tradeBtn, { flex: 2, borderColor: partyColor + '55', backgroundColor: partyColor + '11' }, multinationalForm.selected.length < 2 && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}>
                    <Text style={[styles.tradeBtnText, { color: partyColor }]}>Propose ({multinationalForm.selected.length} countries)</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.multinationalBtns}>
                <Text style={styles.sectionLabel}>PROPOSE MULTINATIONAL DEAL</Text>
                <View style={styles.tradeActionsRow}>
                  <Pressable onPress={() => setMultinationalForm({ type: 'trade_bloc', name: '', selected: [] })} style={({ pressed }) => [styles.tradeBtn, { flex: 1, borderColor: Colors.success + '55', backgroundColor: Colors.success + '11' }, pressed && { opacity: 0.8 }]}>
                    <MaterialCommunityIcons name="earth" size={13} color={Colors.success} />
                    <Text style={[styles.tradeBtnText, { color: Colors.success }]}>Trade Bloc</Text>
                  </Pressable>
                  <Pressable onPress={() => setMultinationalForm({ type: 'military_alliance', name: '', selected: [] })} style={({ pressed }) => [styles.tradeBtn, { flex: 1, borderColor: Colors.info + '55', backgroundColor: Colors.info + '11' }, pressed && { opacity: 0.8 }]}>
                    <MaterialCommunityIcons name="shield-star" size={13} color={Colors.info} />
                    <Text style={[styles.tradeBtnText, { color: Colors.info }]}>Military Alliance</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Text style={styles.sectionLabel}>BILATERAL ALLIANCES</Text>
            {militaryAlliances.map(m => (
              <View key={m.country} style={styles.allianceCard}>
                <View style={styles.allianceHeader}>
                  <Text style={styles.tradeFlag}>{m.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tradeCountry}>{m.country}</Text>
                    <Text style={styles.allianceGroup}>{m.alliance}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[m.status] + '22' }]}>
                    <Text style={[styles.statusPillText, { color: STATUS_COLORS[m.status] }]}>{m.status.toUpperCase()}</Text>
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
          <View style={styles.section}>
            <View style={[styles.warNotice, { borderColor: Colors.error + '44' }]}>
              <MaterialCommunityIcons name="alert" size={13} color={Colors.error} />
              <Text style={[styles.sectionNote, { color: Colors.error, flex: 1 }]}>War continues every week until peace is signed or surrender. Use troop operations and strategy each week to gain advantage.</Text>
            </View>

            {/* Active Wars */}
            {activeWars.map(war => {
              const isOpsExpanded = selectedWarForOps === war.country;
              const isPeaceExpanded = selectedWarForPeace === war.country;
              const progressColor = war.warProgress === 'dominant' ? Colors.success : war.warProgress === 'winning' ? Colors.info : war.warProgress === 'stalemate' ? Colors.warning : Colors.error;

              return (
                <View key={war.country} style={[styles.activeWarCard, { borderColor: Colors.error + '44' }]}>
                  {/* War header */}
                  <View style={styles.activeWarHeader}>
                    <Text style={[styles.tradeFlag, { fontSize: 28 }]}>{war.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tradeCountry, { color: Colors.error }]}>⚔️ War with {war.country}</Text>
                      <Text style={styles.allianceNotes}>Week {war.weeksActive} · {war.casualties.toLocaleString()} casualties</Text>
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
                    <Text style={[styles.territoryLabel, { color: progressColor }]}>{Math.round(war.landGained)}% territory</Text>
                  </View>

                  {/* War popularity */}
                  <View style={styles.warPopRow}>
                    <Text style={styles.warPopLabel}>WAR POPULARITY</Text>
                    <View style={styles.warPopBar}>
                      <View style={[styles.warPopFill, { flex: Math.round(war.warPopularity), backgroundColor: war.warPopularity > 50 ? Colors.success : war.warPopularity > 30 ? Colors.warning : Colors.error }]} />
                      <View style={{ flex: 100 - Math.round(war.warPopularity) }} />
                    </View>
                    <Text style={[styles.warPopNum, { color: war.warPopularity > 50 ? Colors.success : war.warPopularity > 30 ? Colors.warning : Colors.error }]}>{Math.round(war.warPopularity)}%</Text>
                  </View>

                  {/* Riot warning */}
                  {war.riotActive ? (
                    <View style={styles.riotBanner}>
                      <MaterialCommunityIcons name="fire" size={14} color={Colors.error} />
                      <Text style={styles.riotText}>⚠️ CIVIL UNREST ACTIVE — Citizens are rioting in major cities. War popularity must exceed 25% to restore order.</Text>
                    </View>
                  ) : null}

                  {/* AI surrender offer / peace proposal */}
                  {war.aiSurrenderOffer ? (
                    <Pressable onPress={() => handleAIPeaceProposal(war)} style={[styles.aiOfferCard, { borderColor: Colors.warning + '55' }]}>
                      <MaterialCommunityIcons name="flag-variant" size={12} color={Colors.warning} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.aiOfferCountry, { color: Colors.warning }]}>{war.country} Peace Offer</Text>
                        <Text style={[styles.aiOfferText, { color: Colors.warning }]}>{war.aiSurrenderOffer} — Tap to review AI-generated terms</Text>
                      </View>
                    </Pressable>
                  ) : null}

                  {war.peaceTermsRejected ? (
                    <View style={[styles.aiOfferCard, { borderColor: Colors.error + '44', backgroundColor: Colors.error + '0A' }]}>
                      <MaterialCommunityIcons name="close-circle" size={12} color={Colors.error} />
                      <Text style={[styles.aiOfferText, { color: Colors.error, flex: 1 }]}>Peace terms rejected — modify and resubmit.</Text>
                    </View>
                  ) : null}

                  {/* Main action buttons */}
                  <View style={styles.warActionBtns}>
                    <Pressable onPress={() => { setSelectedWarForOps(isOpsExpanded ? null : war.country); setSelectedWarForPeace(null); }} style={({ pressed }) => [styles.tradeBtn, { flex: 1, borderColor: Colors.warning + '55', backgroundColor: Colors.warning + '11' }, pressed && { opacity: 0.8 }]}>
                      <MaterialCommunityIcons name="tank" size={12} color={Colors.warning} />
                      <Text style={[styles.tradeBtnText, { color: Colors.warning }]}>Operations</Text>
                    </Pressable>
                    <Pressable onPress={() => { setSelectedWarForPeace(isPeaceExpanded ? null : war.country); setSelectedWarForOps(null); }} style={({ pressed }) => [styles.tradeBtn, { flex: 1, borderColor: Colors.success + '55', backgroundColor: Colors.success + '11' }, pressed && { opacity: 0.8 }]}>
                      <MaterialCommunityIcons name="handshake" size={12} color={Colors.success} />
                      <Text style={[styles.tradeBtnText, { color: Colors.success }]}>Peace Deal</Text>
                    </Pressable>
                    <Pressable onPress={() => handleSurrender(war.country)} style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.error + '44' }, pressed && { opacity: 0.8 }]}>
                      <MaterialCommunityIcons name="flag-variant" size={12} color={Colors.error} />
                      <Text style={[styles.tradeBtnText, { color: Colors.error }]}>Surrender</Text>
                    </Pressable>
                  </View>

                  {/* ── OPERATIONS PANEL ── */}
                  {isOpsExpanded ? (
                    <View style={styles.opsPanel}>
                      {/* Strategy selector */}
                      <Text style={styles.opsSectionTitle}>MILITARY STRATEGY</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.strategyRow}>
                          {STRATEGIES.map(strat => {
                            const isActive = war.strategy === strat.id;
                            return (
                              <Pressable key={strat.id} onPress={() => handleSetStrategy(war.country, strat.id)} style={[styles.strategyCard, isActive && { borderColor: partyColor, backgroundColor: partyColor + '11' }]}>
                                <MaterialCommunityIcons name={strat.icon as any} size={20} color={isActive ? partyColor : Colors.textMuted} />
                                <Text style={[styles.strategyLabel, isActive && { color: partyColor }]}>{strat.label}</Text>
                                <Text style={[styles.strategyBonus, { color: strat.bonusLand > 0 ? Colors.success : Colors.textMuted }]}>+{strat.bonusLand}% land</Text>
                                <Text style={[styles.strategyPop, { color: strat.popularityImpact >= 0 ? Colors.success : Colors.error }]}>{strat.popularityImpact > 0 ? '+' : ''}{strat.popularityImpact}% pop</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </ScrollView>

                      {/* City operations */}
                      <Text style={styles.opsSectionTitle}>CITY OPERATIONS — {war.totalTroops.toLocaleString()} troops available</Text>
                      {war.cities.map(city => {
                        const existingOp = war.plannedOps.find(o => o.cityName === city.name);
                        const cityColor = city.controlled === 'canada' ? Colors.success : city.controlled === 'contested' ? Colors.warning : Colors.error;
                        return (
                          <View key={city.name} style={[styles.cityCard, { borderColor: cityColor + '44' }]}>
                            <View style={styles.cityHeader}>
                              <View style={[styles.cityStatusDot, { backgroundColor: cityColor }]} />
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.cityName, { color: cityColor }]}>{city.name}</Text>
                                <Text style={styles.cityMeta}>{city.controlled.toUpperCase()} · Pop: {city.population}K · Strategic value: {city.strategicValue}/10</Text>
                              </View>
                              {existingOp ? (
                                <View style={[styles.opBadge, { backgroundColor: CITY_ROLE_COLORS[existingOp.role] + '22' }]}>
                                  <MaterialCommunityIcons name={CITY_ROLE_ICONS[existingOp.role] as any} size={11} color={CITY_ROLE_COLORS[existingOp.role]} />
                                  <Text style={[styles.opBadgeText, { color: CITY_ROLE_COLORS[existingOp.role] }]}>{CITY_ROLE_LABELS[existingOp.role]}</Text>
                                </View>
                              ) : null}
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              <View style={styles.cityOpsRow}>
                                {(['attack', 'defend', 'bomb_air', 'bomb_artillery', 'hold'] as CityRole[]).map(role => (
                                  <Pressable key={role} onPress={() => handleTroopOp(war.country, city.name, role)} style={({ pressed }) => [styles.opBtn, existingOp?.role === role && { backgroundColor: CITY_ROLE_COLORS[role] + '22', borderColor: CITY_ROLE_COLORS[role] }, pressed && { opacity: 0.8 }]}>
                                    <MaterialCommunityIcons name={CITY_ROLE_ICONS[role] as any} size={14} color={CITY_ROLE_COLORS[role]} />
                                    <Text style={[styles.opBtnText, { color: CITY_ROLE_COLORS[role] }]}>{CITY_ROLE_LABELS[role]}</Text>
                                  </Pressable>
                                ))}
                              </View>
                            </ScrollView>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}

                  {/* ── PEACE DEAL PANEL ── */}
                  {isPeaceExpanded ? (
                    <View style={styles.peacePanel}>
                      <Text style={styles.opsSectionTitle}>PEACE DEAL TERMS</Text>
                      <View style={[styles.acceptChanceCard, { borderColor: getPeaceDealAcceptanceChance(war) > 50 ? Colors.success + '44' : Colors.warning + '44' }]}>
                        <Text style={styles.acceptChanceLabel}>ACCEPTANCE PROBABILITY</Text>
                        <Text style={[styles.acceptChanceValue, { color: getPeaceDealAcceptanceChance(war) > 50 ? Colors.success : Colors.warning }]}>{getPeaceDealAcceptanceChance(war)}%</Text>
                        <Text style={styles.acceptChanceNote}>Based on territory ({Math.round(war.landGained)}%) and number of demands</Text>
                      </View>
                      {war.peaceOptions.map(opt => (
                        <Pressable key={opt.id} onPress={() => setActiveWars(prev => prev.map(w => w.country !== war.country ? w : { ...w, peaceOptions: w.peaceOptions.map(o => o.id === opt.id ? { ...o, selected: !o.selected } : o) }))} style={({ pressed }) => [styles.termCard, opt.selected && { borderColor: Colors.success, backgroundColor: Colors.success + '08' }, pressed && { opacity: 0.85 }]}>
                          <View style={[styles.termCheck, opt.selected && { backgroundColor: Colors.success, borderColor: Colors.success }]}>
                            {opt.selected ? <MaterialCommunityIcons name="check" size={12} color="#fff" /> : null}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.termLabel, opt.selected && { color: Colors.success }]}>{opt.label}</Text>
                            <Text style={styles.termDesc}>{opt.description}</Text>
                            {opt.id === 'territory' && opt.selected ? (
                              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.cityOpsRow}>
                                  {(ENEMY_TERRITORIES[war.country] || ENEMY_TERRITORIES['default']).map(t => (
                                    <Pressable key={t} onPress={() => setActiveWars(prev => prev.map(w => w.country !== war.country ? w : { ...w, peaceOptions: w.peaceOptions.map(o => o.id === 'territory' ? { ...o, territory: t } : o) }))} style={[styles.opBtn, opt.territory === t && { borderColor: Colors.success, backgroundColor: Colors.success + '22' }]}>
                                      <Text style={[styles.opBtnText, { color: opt.territory === t ? Colors.success : Colors.textMuted }]}>{t}</Text>
                                    </Pressable>
                                  ))}
                                </View>
                              </ScrollView>
                            ) : null}
                          </View>
                        </Pressable>
                      ))}
                      <View style={styles.tradeActionsRow}>
                        <Pressable onPress={() => setSelectedWarForPeace(null)} style={[styles.tradeBtn, { flex: 1 }]}>
                          <Text style={[styles.tradeBtnText, { color: Colors.textSecondary }]}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={() => handleProposePeaceDeal(war.country)} disabled={war.peaceOptions.filter(o => o.selected).length === 0} style={({ pressed }) => [styles.tradeBtn, { flex: 2, borderColor: Colors.success + '55', backgroundColor: Colors.success + '11' }, war.peaceOptions.filter(o => o.selected).length === 0 && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}>
                          <MaterialCommunityIcons name="send" size={13} color={Colors.success} />
                          <Text style={[styles.tradeBtnText, { color: Colors.success }]}>Submit Peace Deal ({getPeaceDealAcceptanceChance(war)}% chance)</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}

            {/* Potential adversaries */}
            <Text style={styles.sectionLabel}>POTENTIAL ADVERSARIES</Text>
            <Text style={[styles.sectionNote, { marginBottom: 8 }]}>Rivals and enemies can declare war on Canada if relations deteriorate below 25.</Text>
            {tradePartners.filter(p => p.status === 'rival' || p.status === 'sanctioned' as any).map(partner => {
              const allianceStatus = militaryAlliances.find(m => m.country === partner.country)?.status;
              const isAllied = allianceStatus === 'allied';
              const isAtWar = activeWars.some(w => w.country === partner.country);
              return (
                <View key={partner.country} style={styles.warCard}>
                  <View style={styles.allianceHeader}>
                    <Text style={styles.tradeFlag}>{partner.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tradeCountry}>{partner.country}</Text>
                      <Text style={styles.allianceNotes}>Relations: {partner.relations}/100{isAllied ? ' — Allied' : ''}</Text>
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
                    <Pressable onPress={() => handleDeclareWar(partner.country, partner.flag)} style={({ pressed }) => [styles.tradeBtn, { borderColor: Colors.error + '55', backgroundColor: Colors.error + '11' }, pressed && { opacity: 0.8 }]}>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  pmBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1 },
  pmBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  incomingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: 8, backgroundColor: Colors.success + '11', borderBottomWidth: 1, borderBottomColor: Colors.success + '33' },
  incomingBannerText: { flex: 1, fontSize: FontSize.xs, color: Colors.success, fontWeight: FontWeight.medium },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: Spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: {},
  tabText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  warBadge: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
  warBadgeText: { fontSize: 8, fontWeight: FontWeight.bold, color: '#fff' },
  content: { padding: Spacing.md, gap: Spacing.md },
  section: { gap: Spacing.md },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm, alignItems: 'center', gap: 4 },
  statValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  statLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
  warAlert: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.error + '11', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error + '33', padding: Spacing.md },
  warAlertTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.error, marginBottom: 4 },
  warAlertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  warAlertText: { fontSize: FontSize.xs, color: Colors.error, flex: 1 },
  popPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  popPillText: { fontSize: 9, fontWeight: FontWeight.bold },
  multinationalSection: { gap: Spacing.sm },
  multinationalCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm },
  multinationalName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  multinationalCountries: { fontSize: 10, color: Colors.textMuted },
  quickActions: { gap: Spacing.sm },
  quickActionBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  quickActionText: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  sectionNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
  // Trade
  aiOfferCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  aiOfferHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  aiOfferCountry: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  aiOfferText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17, marginTop: 2, flex: 1 },
  aiOfferActions: { flexDirection: 'row', gap: 8 },
  aiOfferNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, backgroundColor: Colors.success + '08' },
  aiOfferNoteText: { flex: 1, fontSize: FontSize.xs, lineHeight: 17 },
  sanctionSection: { gap: Spacing.sm },
  sanctionCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  sanctionCountry: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  sanctionStatus: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  tradeCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  tradeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tradeFlag: { fontSize: 22 },
  tradeCountry: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  tradeVolume: { fontSize: FontSize.xs, color: Colors.textMuted },
  relationsBar: { flexDirection: 'row', height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden' },
  relationsBarFill: { height: '100%', borderRadius: 2, minWidth: 4 },
  dealStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  dealStatusBadgeText: { fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.3 },
  tradeActionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
  tradeBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  blockedNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.error + '0D', borderRadius: Radius.sm, padding: Spacing.sm },
  blockedNoteText: { fontSize: FontSize.xs, color: Colors.error, flex: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusPillText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  // Negotiation panel
  negotiationHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  negotiationTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  negotiationSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  termCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, backgroundColor: Colors.card },
  termCheck: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: Colors.surfaceBorder, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  termLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 2 },
  termDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  termValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  termValue: { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic' },
  selectedTermsCount: { alignItems: 'center', paddingVertical: 4 },
  selectedTermsCountText: { fontSize: FontSize.xs, color: Colors.textMuted },
  // Military
  multinationalBtns: { gap: Spacing.sm },
  multinationalForm: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  multinationalNameInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.sm, paddingVertical: 8, fontSize: FontSize.sm, color: Colors.textPrimary },
  countrySelectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countrySelectChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.surfaceElevated },
  countrySelectFlag: { fontSize: 14 },
  countrySelectName: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  allianceCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  allianceHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  allianceGroup: { fontSize: FontSize.xs, color: Colors.info, fontWeight: FontWeight.medium, marginTop: 1 },
  allianceNotes: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  allianceActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  // War
  warNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, backgroundColor: Colors.error + '08' },
  activeWarCard: { backgroundColor: Colors.error + '08', borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  activeWarHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  territoryProgress: { gap: 4 },
  territoryBar: { flexDirection: 'row', height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden' },
  territoryFill: { height: '100%', borderRadius: 4, minWidth: 4 },
  territoryLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'right' },
  warPopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  warPopLabel: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1, width: 90 },
  warPopBar: { flex: 1, flexDirection: 'row', height: 6, backgroundColor: Colors.surfaceBorder, borderRadius: 3, overflow: 'hidden' },
  warPopFill: { height: '100%', borderRadius: 3, minWidth: 4 },
  warPopNum: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 36, textAlign: 'right' },
  riotBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.error + '22', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.error + '44' },
  riotText: { flex: 1, fontSize: FontSize.xs, color: Colors.error, lineHeight: 17, fontWeight: FontWeight.semibold },
  warActionBtns: { flexDirection: 'row', gap: 6 },
  // Operations panel
  opsPanel: { gap: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  opsSectionTitle: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  strategyRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  strategyCard: { alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm, width: 100, gap: 4 },
  strategyLabel: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.textSecondary, textAlign: 'center' },
  strategyBonus: { fontSize: 9, fontWeight: FontWeight.bold },
  strategyPop: { fontSize: 9, fontWeight: FontWeight.bold },
  cityCard: { backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, padding: Spacing.sm, gap: 8 },
  cityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cityStatusDot: { width: 8, height: 8, borderRadius: 4 },
  cityName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  cityMeta: { fontSize: 10, color: Colors.textMuted },
  opBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  opBadgeText: { fontSize: 9, fontWeight: FontWeight.bold },
  cityOpsRow: { flexDirection: 'row', gap: 6, paddingBottom: 2 },
  opBtn: { alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: 10, paddingVertical: 6, minWidth: 80 },
  opBtnText: { fontSize: 9, fontWeight: FontWeight.bold, textAlign: 'center' },
  // Peace panel
  peacePanel: { gap: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  acceptChanceCard: { backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, padding: Spacing.sm, alignItems: 'center', gap: 4 },
  acceptChanceLabel: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  acceptChanceValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  acceptChanceNote: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
  // Other
  warCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
});
