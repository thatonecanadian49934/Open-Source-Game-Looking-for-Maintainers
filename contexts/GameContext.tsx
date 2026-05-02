// Powered by OnSpace.AI — GameContext: action log, international events, ethics scandals, speaker system, all features
import React, { createContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameState,
  initializeGame,
  processWeek,
  generateWeeklyEvents,
  GameEvent,
  NewsArticle,
  CabinetMember,
} from '@/services/gameEngine';
import {
  Bill,
  initializeBills,
  advanceBills,
  createPlayerBill,
  accelerateBillNow,
} from '@/services/billService';
import {
  CampaignState,
  ElectionNightResult,
  initializeCampaign,
  simulateElectionResults,
  campaignInProvince,
} from '@/services/electionService';
import {
  generatePressStatementReaction,
  generatePolicyNews,
  generateEventChoiceNews,
  generateAINews,
} from '@/services/newsService';
import { PARTIES } from '@/constants/parties';
import { TOTAL_SEATS, MAJORITY_SEATS } from '@/constants/provinces';
import { getSupabaseClient } from '@/template';

const SAVE_KEY = 'fantasy_parliament_save_v4';
const AUTOSAVE_KEY = 'fantasy_parliament_autosave_v4';

// ── Active War ────────────────────────────────────────────────────────────────
export interface ActiveWarState {
  country: string;
  flag: string;
  weekDeclared: number;
  weeksActive: number;
  casualties: number;
  landGained: number;
  warProgress: 'losing' | 'stalemate' | 'winning' | 'dominant';
  warPopularity: number;
  riotActive: boolean;
  phase: 'active' | 'negotiating' | 'peace_rejected';
  peaceTermsRejected: boolean;
  lastOperationWeek: number;
  strategy: string | null;
  peaceOptions: Array<{ id: string; label: string; description: string; territory?: string; selected: boolean }>;
}

// ── Whip System ───────────────────────────────────────────────────────────────
export interface WhipEvent {
  mpName: string;
  partyId: string;
  event: 'rebel_vote' | 'floor_crossing' | 'expelled' | 'warned';
  week: number;
  description: string;
  loyalty: number;
}

// ── Judicial Case ─────────────────────────────────────────────────────────────
export interface JudicialCase {
  id: string;
  title: string;
  description: string;
  type: 'charter_challenge' | 'civil_suit' | 'administrative';
  triggerEvent: string;
  status: 'filed' | 'hearing' | 'decided';
  outcome: 'pending' | 'government_wins' | 'government_loses' | 'settled';
  weekFiled: number;
  approvalImpact: number;
}

// ── Emergency Act State ───────────────────────────────────────────────────────
export interface EmergencyActState {
  isActive: boolean;
  type: string | null;
  weekInvoked: number;
  weekExpires: number;
  orders: string[];
  parliamentConfirmed: boolean;
}

// ── By-Election ────────────────────────────────────────────────────────────────
export interface ByElectionTrigger {
  partyId: string;
  provinceCode: string;
  reason: 'resignation' | 'death' | 'expulsion';
  week: number;
  ridingName?: string;
}

// ── Shadow Cabinet ─────────────────────────────────────────────────────────────
export interface ShadowCabinetMember {
  portfolio: string;
  name: string;
  loyalty: number;
  competence: number;
}

// ── Action Log ────────────────────────────────────────────────────────────────
export interface ActionLogEntry {
  id: string;
  week: number;
  action: string;
  category: 'bill' | 'vote' | 'alliance' | 'law' | 'foreign_policy' | 'cabinet' | 'debate' | 'scandal' | 'election' | 'emergency' | 'court' | 'other';
  description: string;
  impact?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

// ── International Event ────────────────────────────────────────────────────────
export interface InternationalEvent {
  id: string;
  week: number;
  country: string;
  flag: string;
  type: 'trade_request' | 'alliance_request' | 'declaration_of_war' | 'diplomatic_incident' | 'sanctions_threat';
  title: string;
  description: string;
  expiresAt: number; // timestamp for 5-second banner
  responded: boolean;
}

// ── Ethics Scandal ─────────────────────────────────────────────────────────────
export interface EthicsScandal {
  id: string;
  week: number;
  title: string;
  description: string;
  subject: string; // who is implicated
  subjectRole: 'cabinet_minister' | 'prime_minister' | 'backbench_mp' | 'party_official';
  type: 'conflict_of_interest' | 'undeclared_gifts' | 'lobbying_violation' | 'misuse_of_funds' | 'ethics_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  approvalImpact: number;
  governmentApprovalImpact: number;
  status: 'investigation_launched' | 'under_review' | 'cleared' | 'violation_found';
  playerResponse?: 'fired_minister' | 'defended' | 'inquiry' | 'no_action';
}

// ── Speaker Ruling ─────────────────────────────────────────────────────────────
export interface SpeakerRuling {
  id: string;
  week: number;
  motion: string;
  ruling: 'in_order' | 'out_of_order';
  reason: string;
}

// ── Saved Game Slot ────────────────────────────────────────────────────────────
export interface SavedGame {
  id: string;
  savedAt: string;
  playerName: string;
  partyName: string;
  week: number;
  parliamentNumber: number;
  isGoverning: boolean;
  gameState: GameState;
  bills: Bill[];
  shadowCabinet: ShadowCabinetMember[];
  activeWars: ActiveWarState[];
  whipEvents: WhipEvent[];
  judicialCases: JudicialCase[];
  emergencyActState: EmergencyActState;
  supplyPassed: boolean;
  speakerName: string | null;
  oppositionDaysUsed: number;
  actionLog: ActionLogEntry[];
  ethicsScandals: EthicsScandal[];
  speakerRulings: SpeakerRuling[];
}

// ── Context Type ───────────────────────────────────────────────────────────────
export interface GameContextType {
  gameState: GameState | null;
  bills: Bill[];
  campaignState: CampaignState | null;
  electionResult: ElectionNightResult | null;
  shadowCabinet: ShadowCabinetMember[];
  byElectionTrigger: ByElectionTrigger | null;
  savedGames: SavedGame[];
  whipEvents: WhipEvent[];
  judicialCases: JudicialCase[];
  emergencyActState: EmergencyActState;
  supplyPassed: boolean;
  speakerName: string | null;
  oppositionDaysUsed: number;
  activeWars: ActiveWarState[];
  actionLog: ActionLogEntry[];
  internationalEvents: InternationalEvent[];
  ethicsScandals: EthicsScandal[];
  speakerRulings: SpeakerRuling[];
  pendingInternationalEvent: InternationalEvent | null;

  // Setup
  startGame: (partyId: string, playerName: string) => void;
  saveGame: () => Promise<void>;
  loadGame: (saveId: string) => void;
  deleteSave: (saveId: string) => Promise<void>;
  resetGame: () => void;

  // Weekly actions
  advanceWeek: (eventChoices: Record<string, string>) => void;

  // Parliament — bills
  voteOnBill: (billId: string, vote: 'yea' | 'nay' | 'abstain') => void;
  accelerateBill: (billId: string) => void;
  createBill: (title: string, description: string, topic: string, fiscalImpact: string, sponsorMinisterName?: string) => void;
  prioritizeBill: (billId: string) => void;

  // Parliament — confidence & dissolution
  callConfidenceVote: () => { passed: boolean; message: string };
  dissolveParliament: () => void;

  // Cabinet (governing)
  appointMinister: (portfolio: string, name: string) => void;
  fireMinister: (portfolio: string) => void;
  instructMinister: (portfolio: string, instruction: string) => void;

  // Shadow Cabinet (opposition)
  appointShadowMinister: (portfolio: string, name: string) => void;
  removeShadowMinister: (portfolio: string) => void;

  // Communication
  issuePressStatement: (statement: string) => void;
  submitPolicy: (policyText: string) => void;

  // Election
  startElectionCampaign: () => void;
  campaignInRegion: (provinceCode: string) => void;
  completeCampaign: (preComputedResult: ElectionNightResult) => void;

  // Question Period
  answerQuestion: (question: string, answer: string, performance: 'excellent' | 'good' | 'poor') => void;

  // Leadership Review
  resolveLeadershipReview: (survive: boolean) => void;

  // Confidence trigger
  callGoverningConfidenceVote: () => void;

  // By-Election
  completeByElection?: (provinceCode: string, ridingName: string, won: boolean, playerPartyId: string, vacatingPartyId: string, candidateName: string) => void;
  dismissByElection?: () => void;

  // Party Leader Deals
  makePartyDeal?: (rivalPartyId: string, dealType: string, accepted: boolean) => void;

  // Foreign Policy (PM only)
  executeForeignPolicy?: (action: string, country: string, approvalChange: number, gdpChange: number) => void;
  updateWar?: (country: string, update: Partial<ActiveWarState>) => void;
  addWar?: (war: ActiveWarState) => void;
  removeWar?: (country: string) => void;

  // Parliamentary Schedule
  scheduleSession?: (type: string) => void;
  callEmergencySession?: () => void;
  callOppositionDay?: () => void;

  // Whip & Floor-crossing
  triggerWhipWarning?: (mpName: string, loyalty: number) => void;
  recordFloorCrossing?: (mpName: string, fromPartyId: string, toPartyId: string) => void;

  // Judicial
  addJudicialCase?: (caseData: Omit<JudicialCase, 'id' | 'weekFiled'>) => void;
  resolveJudicialCase?: (caseId: string, outcome: JudicialCase['outcome']) => void;

  // Emergency Act
  updateEmergencyActState?: (state: Partial<EmergencyActState>) => void;

  // Supply
  setSupplyPassed?: (passed: boolean) => void;

  // Speaker
  electSpeaker?: (name: string) => void;
  addSpeakerRuling?: (ruling: Omit<SpeakerRuling, 'id' | 'week'>) => void;

  // Action Log
  logAction?: (entry: Omit<ActionLogEntry, 'id' | 'week'>) => void;

  // International Events
  dismissInternationalEvent?: () => void;
  respondToInternationalEvent?: (eventId: string, accept: boolean) => void;

  // Ethics
  respondToEthicsScandal?: (scandalId: string, response: EthicsScandal['playerResponse']) => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

const DEFAULT_EMERGENCY_STATE: EmergencyActState = {
  isActive: false,
  type: null,
  weekInvoked: 0,
  weekExpires: 0,
  orders: [],
  parliamentConfirmed: false,
};

// International event templates
const INTL_EVENT_TEMPLATES: Omit<InternationalEvent, 'id' | 'week' | 'expiresAt' | 'responded'>[] = [
  { country: 'United States', flag: '🇺🇸', type: 'trade_request', title: 'US Proposes New Trade Agreement', description: 'The US Trade Representative has formally requested bilateral trade negotiations on lumber and dairy.' },
  { country: 'China', flag: '🇨🇳', type: 'trade_request', title: 'China Seeks Agricultural Trade Deal', description: 'Beijing has requested expanded Canadian canola exports following recent market disruptions.' },
  { country: 'Russia', flag: '🇷🇺', type: 'diplomatic_incident', title: 'Russia Expels Canadian Diplomats', description: 'Moscow has declared three Canadian embassy officials persona non grata following sanctions.' },
  { country: 'NATO', flag: '🌐', type: 'alliance_request', title: 'NATO Requests Enhanced Contributions', description: 'Secretary General requests Canada increase defence spending to 2% GDP and deploy to Eastern Europe.' },
  { country: 'Ukraine', flag: '🇺🇦', type: 'alliance_request', title: 'Ukraine Requests Military Aid', description: 'Kyiv formally requests additional artillery, ammunition, and training from Canada.' },
  { country: 'North Korea', flag: '🇰🇵', type: 'diplomatic_incident', title: 'North Korea Threatens Canadian Interests', description: 'Pyongyang has issued warnings against Canadian participation in joint military exercises.' },
  { country: 'India', flag: '🇮🇳', type: 'diplomatic_incident', title: 'India-Canada Diplomatic Tension', description: 'New Delhi has recalled its High Commissioner following comments by a Canadian minister.' },
  { country: 'Saudi Arabia', flag: '🇸🇦', type: 'trade_request', title: 'Gulf State Seeks Arms Contract', description: 'Riyadh has formally requested a new Canadian Light Armoured Vehicle export contract.' },
  { country: 'Mexico', flag: '🇲🇽', type: 'trade_request', title: 'CUSMA Review Triggered', description: 'Mexico has triggered the CUSMA joint review mechanism regarding dairy tariff-rate quotas.' },
  { country: 'European Union', flag: '🇪🇺', type: 'alliance_request', title: 'EU Requests CETA Expansion', description: 'Brussels proposes expanding CETA to cover digital trade, data flows, and AI regulation.' },
];

// Ethics scandal templates (AI-varied)
const ETHICS_SCANDAL_TEMPLATES = [
  { type: 'conflict_of_interest' as const, title: 'Minister Held Shares in Regulated Company', description: 'The Ethics Commissioner has opened an investigation into allegations that a cabinet minister held undisclosed shares in a company awarded a government contract.', subjectRole: 'cabinet_minister' as const, severity: 'high' as const, approvalImpact: -6, governmentApprovalImpact: -8 },
  { type: 'undeclared_gifts' as const, title: 'Undeclared Golf Trip from Lobbyist', description: 'Documents obtained through ATIP reveal a minister accepted a golf trip from a registered lobbyist without proper disclosure.', subjectRole: 'cabinet_minister' as const, severity: 'medium' as const, approvalImpact: -3, governmentApprovalImpact: -5 },
  { type: 'lobbying_violation' as const, title: 'Former Minister Lobbying in Cooling-Off Period', description: 'A former cabinet minister was found to be lobbying their former department within the 2-year cooling-off period required by the Lobbying Act.', subjectRole: 'cabinet_minister' as const, severity: 'medium' as const, approvalImpact: -4, governmentApprovalImpact: -4 },
  { type: 'misuse_of_funds' as const, title: 'Government Contract Awarded to Donor\'s Firm', description: 'Opposition research reveals that a major government infrastructure contract was awarded to a firm whose executives donated heavily to the governing party.', subjectRole: 'prime_minister' as const, severity: 'critical' as const, approvalImpact: -10, governmentApprovalImpact: -12 },
  { type: 'ethics_breach' as const, title: 'MP Expense Account Irregularities', description: 'The House of Commons Board of Internal Economy is investigating irregular expense claims totalling $85,000 by a government backbencher.', subjectRole: 'backbench_mp' as const, severity: 'low' as const, approvalImpact: -2, governmentApprovalImpact: -2 },
  { type: 'conflict_of_interest' as const, title: 'PMO Staffer Joined Regulated Industry', description: 'A senior PMO staffer accepted a position with a pharmaceutical company they previously regulated within months of leaving government.', subjectRole: 'party_official' as const, severity: 'medium' as const, approvalImpact: -3, governmentApprovalImpact: -5 },
  { type: 'misuse_of_funds' as const, title: 'Minister Used Government Aircraft for Personal Travel', description: 'Documents show a minister chartered a government aircraft for a personal family trip over a long weekend, in violation of government guidelines.', subjectRole: 'cabinet_minister' as const, severity: 'high' as const, approvalImpact: -5, governmentApprovalImpact: -7 },
  { type: 'ethics_breach' as const, title: 'Conflict of Interest — Family Investment', description: 'The Ethics Commissioner reports that a minister\'s spouse held investments in companies the minister approved regulatory changes for.', subjectRole: 'cabinet_minister' as const, severity: 'high' as const, approvalImpact: -7, governmentApprovalImpact: -9 },
];

const MINISTER_NAMES = [
  'Minister Sarah Chen', 'Minister James Park', 'Minister David Kim',
  'Minister Mary Tremblay', 'Minister Robert Singh', 'Minister Elena Vasquez',
  'Minister Marcus Williams', 'Minister Jennifer Lee', 'Minister Ahmed Hassan',
];

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [campaignState, setCampaignState] = useState<CampaignState | null>(null);
  const [electionResult, setElectionResult] = useState<ElectionNightResult | null>(null);
  const [shadowCabinet, setShadowCabinet] = useState<ShadowCabinetMember[]>([]);
  const [byElectionTrigger, setByElectionTrigger] = useState<ByElectionTrigger | null>(null);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [activeWars, setActiveWars] = useState<ActiveWarState[]>([]);
  const [whipEvents, setWhipEvents] = useState<WhipEvent[]>([]);
  const [judicialCases, setJudicialCases] = useState<JudicialCase[]>([]);
  const [emergencyActState, setEmergencyActState] = useState<EmergencyActState>(DEFAULT_EMERGENCY_STATE);
  const [supplyPassed, setSupplyPassedState] = useState(false);
  const [speakerName, setSpeakerName] = useState<string | null>(null);
  const [oppositionDaysUsed, setOppositionDaysUsed] = useState(0);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [internationalEvents, setInternationalEvents] = useState<InternationalEvent[]>([]);
  const [pendingInternationalEvent, setPendingInternationalEvent] = useState<InternationalEvent | null>(null);
  const [ethicsScandals, setEthicsScandals] = useState<EthicsScandal[]>([]);
  const [speakerRulings, setSpeakerRulings] = useState<SpeakerRuling[]>([]);

  const supabase = getSupabaseClient();
  const autosaveTimerRef = useRef<any>(null);

  useEffect(() => {
    loadSavedGames();
    loadAutosave();
  }, []);

  // ── AUTOSAVE EVERY 60 SECONDS (replaces same file) ──────────────────────
  useEffect(() => {
    if (!gameState) return;
    autosaveTimerRef.current = setInterval(() => {
      performAutosave();
    }, 60000);
    return () => { if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current); };
  }, [gameState, bills, shadowCabinet, activeWars, whipEvents, judicialCases, emergencyActState, supplyPassed, speakerName, oppositionDaysUsed, actionLog, ethicsScandals, speakerRulings]);

  const performAutosave = useCallback(async () => {
    try {
      const state = gameState;
      if (!state) return;
      const party = PARTIES.find(p => p.id === state.playerPartyId);
      const save: SavedGame = {
        id: 'autosave',
        savedAt: new Date().toISOString(),
        playerName: state.playerName,
        partyName: party?.name || state.playerPartyId,
        week: state.currentWeek,
        parliamentNumber: state.parliamentNumber,
        isGoverning: state.isGoverning,
        gameState: state,
        bills,
        shadowCabinet,
        activeWars,
        whipEvents,
        judicialCases,
        emergencyActState,
        supplyPassed,
        speakerName,
        oppositionDaysUsed,
        actionLog: actionLog.slice(0, 200),
        ethicsScandals,
        speakerRulings,
      };
      await AsyncStorage.setItem(AUTOSAVE_KEY, JSON.stringify(save));
    } catch (e) {
      console.error('Autosave failed:', e);
    }
  }, [gameState, bills, shadowCabinet, activeWars, whipEvents, judicialCases, emergencyActState, supplyPassed, speakerName, oppositionDaysUsed, actionLog, ethicsScandals, speakerRulings]);

  const loadAutosave = async () => {
    try {
      const raw = await AsyncStorage.getItem(AUTOSAVE_KEY);
      if (raw) {
        const save: SavedGame = JSON.parse(raw);
        setSavedGames(prev => {
          const withoutAutosave = prev.filter(s => s.id !== 'autosave');
          return [save, ...withoutAutosave];
        });
      }
    } catch {}
  };

  const loadSavedGames = async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVE_KEY);
      if (raw) {
        const saves: SavedGame[] = JSON.parse(raw);
        setSavedGames(prev => {
          const autosaves = prev.filter(s => s.id === 'autosave');
          return [...autosaves, ...saves];
        });
      }
    } catch { setSavedGames([]); }
  };

  const saveGame = useCallback(async () => {
    if (!gameState) return;
    try {
      const party = PARTIES.find(p => p.id === gameState.playerPartyId);
      const save: SavedGame = {
        id: `save_${Date.now()}`,
        savedAt: new Date().toISOString(),
        playerName: gameState.playerName,
        partyName: party?.name || gameState.playerPartyId,
        week: gameState.currentWeek,
        parliamentNumber: gameState.parliamentNumber,
        isGoverning: gameState.isGoverning,
        gameState,
        bills,
        shadowCabinet,
        activeWars,
        whipEvents,
        judicialCases,
        emergencyActState,
        supplyPassed,
        speakerName,
        oppositionDaysUsed,
        actionLog: actionLog.slice(0, 200),
        ethicsScandals,
        speakerRulings,
      };
      const existing = await AsyncStorage.getItem(SAVE_KEY);
      const saves: SavedGame[] = existing ? JSON.parse(existing) : [];
      const updated = [save, ...saves].slice(0, 5);
      await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(updated));
      setSavedGames(prev => {
        const autosaves = prev.filter(s => s.id === 'autosave');
        return [...autosaves, save, ...saves.slice(0, 4)];
      });
    } catch (e) { console.error('Save failed:', e); }
  }, [gameState, bills, shadowCabinet, activeWars, whipEvents, judicialCases, emergencyActState, supplyPassed, speakerName, oppositionDaysUsed, actionLog, ethicsScandals, speakerRulings]);

  const loadGame = useCallback((saveId: string) => {
    const save = savedGames.find(s => s.id === saveId);
    if (!save) return;
    setGameState(save.gameState);
    setBills(save.bills || []);
    setShadowCabinet(save.shadowCabinet || []);
    setCampaignState(null);
    setElectionResult(null);
    setByElectionTrigger(null);
    setActiveWars(save.activeWars || []);
    setWhipEvents(save.whipEvents || []);
    setJudicialCases(save.judicialCases || []);
    setEmergencyActState(save.emergencyActState || DEFAULT_EMERGENCY_STATE);
    setSupplyPassedState(save.supplyPassed || false);
    setSpeakerName(save.speakerName || null);
    setOppositionDaysUsed(save.oppositionDaysUsed || 0);
    setActionLog(save.actionLog || []);
    setEthicsScandals(save.ethicsScandals || []);
    setSpeakerRulings(save.speakerRulings || []);
  }, [savedGames]);

  const deleteSave = useCallback(async (saveId: string) => {
    try {
      const existing = await AsyncStorage.getItem(SAVE_KEY);
      const saves: SavedGame[] = existing ? JSON.parse(existing) : [];
      const updated = saves.filter(s => s.id !== saveId);
      await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(updated));
      setSavedGames(prev => prev.filter(s => s.id !== saveId));
    } catch {}
  }, []);

  const resetGame = useCallback(() => {
    setGameState(null);
    setBills([]);
    setCampaignState(null);
    setElectionResult(null);
    setShadowCabinet([]);
    setByElectionTrigger(null);
    setActiveWars([]);
    setWhipEvents([]);
    setJudicialCases([]);
    setEmergencyActState(DEFAULT_EMERGENCY_STATE);
    setSupplyPassedState(false);
    setSpeakerName(null);
    setOppositionDaysUsed(0);
    setActionLog([]);
    setInternationalEvents([]);
    setPendingInternationalEvent(null);
    setEthicsScandals([]);
    setSpeakerRulings([]);
  }, []);

  // ── Action Logger ─────────────────────────────────────────────────────────
  const logAction = useCallback((entry: Omit<ActionLogEntry, 'id' | 'week'>) => {
    setGameState(prev => {
      if (!prev) return prev;
      const logEntry: ActionLogEntry = {
        ...entry,
        id: `log_${Date.now()}_${Math.random()}`,
        week: prev.currentWeek,
      };
      setActionLog(prevLog => [logEntry, ...prevLog].slice(0, 500));
      return prev;
    });
  }, []);

  // ── Start Game ──────────────────────────────────────────────────────────────
  const startGame = useCallback((partyId: string, playerName: string) => {
    const state = initializeGame(partyId, playerName);
    const initialBills = initializeBills(1);
    setGameState(state);
    setBills(initialBills);
    setCampaignState(null);
    setElectionResult(null);
    setShadowCabinet([]);
    setByElectionTrigger(null);
    setActiveWars([]);
    setWhipEvents([]);
    setJudicialCases([]);
    setEmergencyActState(DEFAULT_EMERGENCY_STATE);
    setSupplyPassedState(false);
    setSpeakerName(null);
    setOppositionDaysUsed(0);
    setActionLog([{
      id: 'log_start',
      week: 1,
      action: 'Game Started',
      category: 'other',
      description: `${playerName} begins as ${PARTIES.find(p => p.id === partyId)?.name} leader`,
      severity: 'low',
    }]);
    setInternationalEvents([]);
    setPendingInternationalEvent(null);
    setEthicsScandals([]);
    setSpeakerRulings([]);
  }, []);

  // ── AI Weekly Events ────────────────────────────────────────────────────────
  const fetchAIWeeklyEvents = async (state: GameState): Promise<GameEvent[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-weekly-events', {
        body: {
          partyName: PARTIES.find(p => p.id === state.playerPartyId)?.name,
          partyShortName: PARTIES.find(p => p.id === state.playerPartyId)?.shortName,
          isGoverning: state.isGoverning,
          isMajority: state.isMajority,
          stats: state.stats,
          currentWeek: state.currentWeek + 1,
          parliamentNumber: state.parliamentNumber,
          seats: state.seats,
          recentEvents: state.currentEvents.slice(0, 3).map(e => ({ title: e.title })),
          recentNews: state.newsHistory.slice(0, 3).map(n => n.headline),
        },
      });
      if (error || !data?.events?.length) return [];
      return (data.events as any[]).map((e: any) => ({
        id: e.id || `ai_event_${Date.now()}_${Math.random()}`,
        week: state.currentWeek + 1,
        title: e.title || 'Parliamentary Event',
        description: e.description || '',
        type: e.type || 'political',
        urgency: e.urgency || 'medium',
        expires: state.currentWeek + (e.urgency === 'critical' ? 1 : 3),
        choices: (e.choices || []).map((c: any) => ({
          id: c.id || `choice_${Math.random()}`,
          label: c.label || 'Respond',
          description: c.description || '',
          effects: c.effects || {},
          newsHeadline: c.newsHeadline || e.title,
        })),
      }));
    } catch { return []; }
  };

  // ── Maybe generate rare judicial case ────────────────────────────────────
  const maybeGenerateJudicialCase = useCallback((state: GameState) => {
    if (!state.isGoverning || Math.random() > 0.04 || judicialCases.filter(c => c.status !== 'decided').length >= 2) return;
    const triggers = [
      { title: 'Charter Challenge — Digital Surveillance Act', type: 'charter_challenge' as const, impact: -4, event: 'Surveillance legislation' },
      { title: 'CCLA v. Canada — Carbon Tax Constitutional Challenge', type: 'charter_challenge' as const, impact: -3, event: 'Carbon pricing policy' },
      { title: 'Employment Challenge — Mandatory Vaccination Policy', type: 'charter_challenge' as const, impact: -5, event: 'Healthcare policy' },
      { title: 'Civil Suit — Emergency Orders Property Damages', type: 'civil_suit' as const, impact: -3, event: 'Emergency Act invocation' },
      { title: 'Charter Challenge — Online Harms Legislation (s.2b)', type: 'charter_challenge' as const, impact: -4, event: 'Online speech legislation' },
      { title: 'Administrative Challenge — Indigenous Consultation Failure', type: 'administrative' as const, impact: -2, event: 'Resource development approval' },
    ];
    const trigger = triggers[Math.floor(Math.random() * triggers.length)];
    const newCase: JudicialCase = {
      id: `case_${Date.now()}`,
      title: trigger.title,
      description: `A legal challenge has been filed in response to ${trigger.event}. The case will work its way through the court system over several weeks.`,
      type: trigger.type,
      triggerEvent: trigger.event,
      status: 'filed',
      outcome: 'pending',
      weekFiled: state.currentWeek,
      approvalImpact: trigger.impact,
    };
    setJudicialCases(prev => [...prev, newCase]);
    setActionLog(prev => [{
      id: `log_court_${Date.now()}`,
      week: state.currentWeek,
      action: 'Court Case Filed',
      category: 'court',
      description: trigger.title,
      impact: `Approval: ${trigger.impact}%`,
      severity: 'high',
    }, ...prev].slice(0, 500));
  }, [judicialCases]);

  // ── Maybe generate random international event ────────────────────────────
  const maybeGenerateInternationalEvent = useCallback((state: GameState) => {
    // ~8% chance per week of an international event appearing
    if (Math.random() > 0.08 || pendingInternationalEvent) return;
    const template = INTL_EVENT_TEMPLATES[Math.floor(Math.random() * INTL_EVENT_TEMPLATES.length)];
    const event: InternationalEvent = {
      id: `intl_${Date.now()}`,
      week: state.currentWeek,
      ...template,
      expiresAt: Date.now() + 5000, // 5 seconds for notification
      responded: false,
    };
    setInternationalEvents(prev => [event, ...prev].slice(0, 20));
    setPendingInternationalEvent(event);
    // Auto-clear after 5 seconds if not dismissed
    setTimeout(() => {
      setPendingInternationalEvent(prev => prev?.id === event.id ? null : prev);
    }, 5000);
  }, [pendingInternationalEvent]);

  // ── Maybe generate rare ethics scandal ──────────────────────────────────
  const maybeGenerateEthicsScandal = useCallback((state: GameState) => {
    // Very rare: ~3% per week, only if governing, no active critical scandal
    if (!state.isGoverning || Math.random() > 0.03) return;
    if (ethicsScandals.some(s => s.severity === 'critical' && s.status === 'investigation_launched')) return;

    const template = ETHICS_SCANDAL_TEMPLATES[Math.floor(Math.random() * ETHICS_SCANDAL_TEMPLATES.length)];
    const ministerName = MINISTER_NAMES[Math.floor(Math.random() * MINISTER_NAMES.length)];

    const scandal: EthicsScandal = {
      id: `scandal_${Date.now()}`,
      week: state.currentWeek,
      title: template.title,
      description: template.description,
      subject: template.subjectRole === 'prime_minister' ? state.playerName : ministerName,
      subjectRole: template.subjectRole,
      type: template.type,
      severity: template.severity,
      approvalImpact: template.approvalImpact,
      governmentApprovalImpact: template.governmentApprovalImpact,
      status: 'investigation_launched',
    };

    setEthicsScandals(prev => [scandal, ...prev].slice(0, 20));
    setActionLog(prev => [{
      id: `log_scandal_${Date.now()}`,
      week: state.currentWeek,
      action: 'Ethics Investigation Launched',
      category: 'scandal',
      description: scandal.title,
      impact: `Approval: ${scandal.approvalImpact}%, Gov Approval: ${scandal.governmentApprovalImpact}%`,
      severity: scandal.severity,
    }, ...prev].slice(0, 500));
  }, [ethicsScandals]);

  // ── Advance Week ──────────────────────────────────────────────────────────
  const advanceWeek = useCallback((eventChoices: Record<string, string>) => {
    setGameState(prev => {
      if (!prev) return prev;

      Object.entries(eventChoices).forEach(([eventId, choiceId]) => {
        const event = prev.currentEvents.find(e => e.id === eventId);
        const choice = event?.choices.find(c => c.id === choiceId);
        if (event && choice) {
          generateAINews(supabase, 'event_choice', choice.newsHeadline, prev.playerPartyId, prev.playerName, prev.isGoverning, prev.stats, prev.currentWeek, 3).then(articles => {
            if (articles.length > 0) {
              setGameState(gs => { if (!gs) return gs; return { ...gs, newsHistory: [...articles, ...gs.newsHistory].slice(0, 60) }; });
            }
          });
          // Log event choices
          setActionLog(prevLog => [{
            id: `log_event_${Date.now()}`,
            week: prev.currentWeek,
            action: `Responded to: ${event.title}`,
            category: 'other',
            description: `Chose: ${choice.label} — ${choice.description}`,
            severity: event.urgency === 'critical' ? 'high' : 'medium',
          }, ...prevLog].slice(0, 500));
        }
      });

      const newState = processWeek(prev, eventChoices);

      // ── MINORITY GOVERNMENT: confidence vote trigger ──────────────────────
      const playerSeats = newState.seats[newState.playerPartyId] || 0;
      const isMinority = newState.isGoverning && playerSeats < MAJORITY_SEATS;
      const govApproval = newState.stats.governmentApproval || 0;
      const lowApproval = govApproval < 32 || newState.stats.approvalRating < 28;

      if (isMinority && lowApproval && Math.random() < 0.15 && !newState.inElection) {
        const confidenceEvent: GameEvent = {
          id: `confidence_vote_${newState.currentWeek}`,
          week: newState.currentWeek,
          title: 'Opposition Calls Confidence Vote',
          description: `The Opposition has tabled a non-confidence motion. With approval at ${Math.round(govApproval)}%, support is fragile.`,
          type: 'political',
          urgency: 'critical',
          expires: newState.currentWeek + 1,
          choices: [
            { id: 'confidence_survive', label: 'Rally the Caucus', description: 'Work behind the scenes.', effects: { approvalRating: -3, partyStanding: 2 }, newsHeadline: 'Government survives confidence vote' },
            { id: 'confidence_lose', label: 'Accept the Verdict', description: 'Government cannot muster votes.', effects: { approvalRating: -5, partyStanding: -5 }, newsHeadline: 'Government falls — election called' },
          ],
        };
        const survives = Math.random() > 0.5;
        if (!survives) {
          return { ...newState, inElection: true, electionWeek: 1, electionTriggerReason: 'confidence_vote', electionTriggered: true, currentEvents: [confidenceEvent, ...newState.currentEvents].slice(0, 4) };
        }
        return { ...newState, currentEvents: [confidenceEvent, ...newState.currentEvents].slice(0, 4) };
      }

      // ── SUPPLY DEADLINE CRISIS ────────────────────────────────────────────
      if (newState.currentWeek >= 25 && !supplyPassed && newState.isGoverning && Math.random() < 0.3 && !newState.inElection) {
        const supplyEvent: GameEvent = {
          id: `supply_crisis_${newState.currentWeek}`,
          week: newState.currentWeek,
          title: 'Supply Deadline — June 23',
          description: 'Parliament has passed the June 23 supply deadline without approving the Main Estimates.',
          type: 'political',
          urgency: 'critical',
          expires: newState.currentWeek + 1,
          choices: [
            { id: 'emergency_supply', label: 'Emergency Supply Motion', description: 'Rush an interim supply motion.', effects: { governmentApproval: -8, approvalRating: -5 }, newsHeadline: 'Government scrambles to pass emergency supply' },
            { id: 'trigger_election', label: 'Call an Election', description: 'Call election after supply defeat.', effects: { approvalRating: -10, partyStanding: -5 }, newsHeadline: 'PM calls election after supply defeat' },
          ],
        };
        return { ...newState, currentEvents: [supplyEvent, ...newState.currentEvents].slice(0, 4) };
      }

      // ── WHIP EVENTS ───────────────────────────────────────────────────────
      if (Math.random() < 0.07 && newState.currentWeek > 3) {
        const mpNames = ['James Whitmore', 'Sarah Chen', 'Mike Bergeron', 'Anita Rajput', 'Tom Sinclair', 'Elena Kowalski'];
        const mpName = mpNames[Math.floor(Math.random() * mpNames.length)];
        const loyalty = 30 + Math.floor(Math.random() * 40);
        const eventType: WhipEvent['event'] = loyalty < 35 ? 'floor_crossing' : loyalty < 45 ? 'rebel_vote' : 'warned';
        const whipEvent: WhipEvent = {
          mpName, partyId: newState.playerPartyId, event: eventType, week: newState.currentWeek,
          description: eventType === 'floor_crossing'
            ? `${mpName} has crossed the floor.`
            : eventType === 'rebel_vote'
            ? `${mpName} voted against the party on a key bill.`
            : `The Whip issued a formal warning to ${mpName}.`,
          loyalty,
        };
        setWhipEvents(prev => [whipEvent, ...prev].slice(0, 20));
        setActionLog(prevLog => [{
          id: `log_whip_${Date.now()}`,
          week: newState.currentWeek,
          action: eventType === 'floor_crossing' ? 'Floor Crossing' : eventType === 'rebel_vote' ? 'Rebel Vote' : 'Whip Warning',
          category: 'other',
          description: whipEvent.description,
          severity: eventType === 'floor_crossing' ? 'high' : eventType === 'rebel_vote' ? 'medium' : 'low',
        }, ...prevLog].slice(0, 500));

        if (eventType === 'floor_crossing') {
          const newSeats = { ...newState.seats };
          newSeats[newState.playerPartyId] = Math.max(0, (newSeats[newState.playerPartyId] || 0) - 1);
          const rivalId = Object.keys(newSeats).find(id => id !== newState.playerPartyId && (newSeats[id] || 0) === Math.max(...Object.values(newSeats).filter(v => typeof v === 'number' && v > 0)));
          if (rivalId) newSeats[rivalId] = (newSeats[rivalId] || 0) + 1;
          return { ...newState, seats: newSeats };
        }
      }

      // Advance active wars each week
      setActiveWars(prevWars => prevWars.map(w => {
        const weeklyLand = w.strategy === 'shock_and_awe' ? 4 + Math.random() * 4
          : w.strategy === 'siege' ? 2 + Math.random() * 2
          : w.strategy === 'guerrilla' ? 1 + Math.random() * 2
          : w.strategy === 'full_mobilization' ? 6 + Math.random() * 6
          : 1 + Math.random() * 2;
        const newLand = Math.min(95, w.landGained + weeklyLand);
        const newCasualties = w.casualties + Math.floor(Math.random() * 150 + 50);
        const popDelta = w.strategy === 'diplomatic_pressure' ? 1 : -2 - Math.random() * 3;
        const newPop = Math.max(5, Math.min(100, w.warPopularity + popDelta));
        const progress: ActiveWarState['warProgress'] = newLand >= 60 ? 'dominant' : newLand >= 35 ? 'winning' : newLand >= 15 ? 'stalemate' : 'losing';
        return { ...w, weeksActive: w.weeksActive + 1, landGained: newLand, casualties: newCasualties, warPopularity: newPop, warProgress: progress, riotActive: newPop < 25 };
      }));

      // Advance Emergency Act — check expiry
      setEmergencyActState(prev => {
        if (!prev.isActive) return prev;
        if (newState.currentWeek >= prev.weekExpires) return { ...prev, isActive: false };
        return prev;
      });

      // Advance judicial cases
      setJudicialCases(prev => prev.map(c => {
        if (c.status === 'decided') return c;
        const weeksElapsed = newState.currentWeek - c.weekFiled;
        if (c.status === 'filed' && weeksElapsed >= 3) return { ...c, status: 'hearing' };
        if (c.status === 'hearing' && weeksElapsed >= 8) {
          const outcome = Math.random() > 0.5 ? 'government_wins' : 'government_loses';
          return { ...c, status: 'decided', outcome };
        }
        return c;
      }));

      // Maybe generate rare judicial case (4% chance)
      maybeGenerateJudicialCase(newState);

      // Maybe generate international event (8% chance)
      maybeGenerateInternationalEvent(newState);

      // Maybe generate very rare ethics scandal (3% chance, governing only)
      maybeGenerateEthicsScandal(newState);

      // By-election trigger (~5% chance per week)
      if (!prev.inElection && Math.random() < 0.05 && !byElectionTrigger) {
        const provinceCodes = ['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE'];
        const reasons: Array<'resignation' | 'death' | 'expulsion'> = ['resignation', 'death', 'expulsion'];
        const partyIds = Object.keys(newState.seats).filter(id => newState.seats[id] > 0);
        const trigger: ByElectionTrigger = {
          partyId: partyIds[Math.floor(Math.random() * partyIds.length)],
          provinceCode: provinceCodes[Math.floor(Math.random() * provinceCodes.length)],
          reason: reasons[Math.floor(Math.random() * 2)],
          week: newState.currentWeek,
        };
        setByElectionTrigger(trigger);
      }

      // Advance bills
      setBills(prevBills =>
        advanceBills(prevBills, newState.currentWeek, newState.playerPartyId, newState.seats[newState.playerPartyId] || 0, TOTAL_SEATS, newState.isGoverning)
      );

      // ── "THIS WEEK IN PARLIAMENT" — appears rarely (25% chance, only on major events) ──
      // Only show events for major legislation, crises, elections, wars
      const hasActiveWar = activeWars.length > 0;
      const hasCriticalEvent = newState.currentEvents.some(e => e.urgency === 'critical');
      const hasRecentScandal = ethicsScandals.some(s => s.week === newState.currentWeek);

      const shouldShowEvents = hasCriticalEvent || hasRecentScandal || hasActiveWar || Math.random() < 0.2;

      if (shouldShowEvents && Math.random() < 0.3) {
        fetchAIWeeklyEvents(newState).then(aiEvents => {
          if (aiEvents.length > 0) {
            setGameState(gs => { if (!gs) return gs; return { ...gs, currentEvents: aiEvents.slice(0, 2) }; });
          }
        });
      } else {
        setGameState(gs => {
          if (!gs) return gs;
          const criticalOnly = gs.currentEvents.filter(e => e.urgency === 'critical');
          return { ...gs, currentEvents: criticalOnly.slice(0, 1) };
        });
      }

      return newState;
    });
  }, [supabase, byElectionTrigger, supplyPassed, judicialCases, maybeGenerateJudicialCase, maybeGenerateInternationalEvent, maybeGenerateEthicsScandal, activeWars, ethicsScandals]);

  // ── Bill Actions ────────────────────────────────────────────────────────────
  const voteOnBill = useCallback((billId: string, vote: 'yea' | 'nay' | 'abstain') => {
    setBills(prev => prev.map(b => b.id === billId ? { ...b, playerVote: vote } : b));
    const bill = bills.find(b => b.id === billId);
    if (bill) {
      logAction({ action: `Voted ${vote.toUpperCase()} on bill`, category: 'vote', description: bill.title, severity: 'medium' });
    }
  }, [bills, logAction]);

  const accelerateBill = useCallback((billId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      setBills(prevBills => prevBills.map(b => b.id === billId ? accelerateBillNow(b, prev.currentWeek) : b));
      const bill = bills.find(b => b.id === billId);
      if (bill) logAction({ action: 'Closure Invoked', category: 'bill', description: `Forced vote on: ${bill.title}`, severity: 'medium' });
      return prev;
    });
  }, [bills, logAction]);

  const prioritizeBill = useCallback((billId: string) => {
    setBills(prev => prev.map(b => {
      if (b.id !== billId) return b;
      return { ...b, accelerated: true, stageStartWeek: b.stageStartWeek - b.defaultStageWeeks, stageWeeksRemaining: 0, scheduledVoteWeek: b.stageStartWeek };
    }));
    const bill = bills.find(b => b.id === billId);
    if (bill) logAction({ action: 'Bill Prioritized', category: 'bill', description: `Forced vote on PMB: ${bill.title}`, severity: 'medium' });
  }, [bills, logAction]);

  const createBill = useCallback((title: string, description: string, topic: string, fiscalImpact: string, sponsorMinisterName?: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const isGovernmentBill = prev.isGoverning && !!sponsorMinisterName;
      const sponsorName = sponsorMinisterName || prev.playerName;
      const newBill = createPlayerBill(title, description, topic, fiscalImpact, prev.playerPartyId, sponsorName, prev.currentWeek, isGovernmentBill);
      setBills(prevBills => [newBill, ...prevBills]);
      logAction({ action: 'Bill Introduced', category: 'bill', description: `${isGovernmentBill ? 'Government Bill' : "Private Member's Bill"}: ${title}`, severity: 'medium' });
      return prev;
    });
  }, [logAction]);

  // ── Confidence & Dissolution ────────────────────────────────────────────────
  const callConfidenceVote = useCallback((): { passed: boolean; message: string } => {
    let result = { passed: false, message: '' };
    setGameState(prev => {
      if (!prev) return prev;
      const govSeats = Math.max(...Object.values(prev.seats).filter(v => typeof v === 'number'));
      const passed = govSeats < MAJORITY_SEATS && Math.random() > 0.5;
      result = {
        passed,
        message: passed ? 'The government has lost confidence. Parliament is dissolved.' : 'The government survived the confidence vote.',
      };
      logAction({ action: passed ? 'Government Falls' : 'Confidence Vote Survived', category: 'vote', description: result.message, severity: 'critical' });
      if (passed) {
        const campaign = initializeCampaign(prev.playerPartyId, prev.stats);
        setCampaignState(campaign);
        return { ...prev, inElection: true, electionWeek: 1, electionTriggerReason: 'confidence_vote', electionTriggered: true, confidenceVoteCooldown: 0 };
      }
      return { ...prev, confidenceVoteCooldown: 12 };
    });
    return result;
  }, [logAction]);

  const dissolveParliament = useCallback(() => {
    setGameState(prev => {
      if (!prev || !prev.isGoverning) return prev;
      const campaign = initializeCampaign(prev.playerPartyId, prev.stats);
      setCampaignState(campaign);
      logAction({ action: 'Parliament Dissolved', category: 'election', description: 'PM calls snap election', severity: 'critical' });
      return { ...prev, inElection: true, electionWeek: 1, electionTriggerReason: 'pm_dissolution', electionTriggered: true };
    });
  }, [logAction]);

  // ── Cabinet ─────────────────────────────────────────────────────────────────
  const appointMinister = useCallback((portfolio: string, name: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const existingIdx = prev.cabinet.findIndex(m => m.portfolio === portfolio);
      const newMember: CabinetMember = { portfolio, name, loyalty: 70 + Math.floor(Math.random() * 20), competence: 60 + Math.floor(Math.random() * 30) };
      logAction({ action: 'Minister Appointed', category: 'cabinet', description: `${name} appointed as Minister of ${portfolio}`, severity: 'low' });
      if (existingIdx >= 0) { const nc = [...prev.cabinet]; nc[existingIdx] = newMember; return { ...prev, cabinet: nc }; }
      return { ...prev, cabinet: [...prev.cabinet, newMember] };
    });
  }, [logAction]);

  const fireMinister = useCallback((portfolio: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const minister = prev.cabinet.find(m => m.portfolio === portfolio);
      if (minister) logAction({ action: 'Minister Fired', category: 'cabinet', description: `${minister.name} removed from Cabinet`, severity: 'medium' });
      return { ...prev, cabinet: prev.cabinet.filter(m => m.portfolio !== portfolio) };
    });
  }, [logAction]);

  const instructMinister = useCallback((portfolio: string, instruction: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const minister = prev.cabinet.find(m => m.portfolio === portfolio);
      if (!minister) return prev;
      const loyaltyBonus = minister.loyalty > 70 ? 2 : -1;
      logAction({ action: 'Minister Directive', category: 'cabinet', description: `${portfolio}: "${instruction.substring(0, 60)}"`, severity: 'low' });
      generateAINews(supabase, 'minister_directive', `Minister directive on ${portfolio}: "${instruction.substring(0, 80)}"`, prev.playerPartyId, prev.playerName, true, prev.stats, prev.currentWeek, 2).then(articles => {
        if (articles.length > 0) { setGameState(gs => { if (!gs) return gs; return { ...gs, newsHistory: [...articles, ...gs.newsHistory].slice(0, 60) }; }); }
      });
      return { ...prev, stats: { ...prev.stats, governmentApproval: Math.min(95, (prev.stats.governmentApproval || 0) + loyaltyBonus) } };
    });
  }, [supabase, logAction]);

  // ── Shadow Cabinet ─────────────────────────────────────────────────────────
  const appointShadowMinister = useCallback((portfolio: string, name: string) => {
    setShadowCabinet(prev => {
      const existingIdx = prev.findIndex(m => m.portfolio === portfolio);
      const member: ShadowCabinetMember = { portfolio, name, loyalty: 65 + Math.floor(Math.random() * 25), competence: 55 + Math.floor(Math.random() * 35) };
      if (existingIdx >= 0) { const updated = [...prev]; updated[existingIdx] = member; return updated; }
      return [...prev, member];
    });
  }, []);

  const removeShadowMinister = useCallback((portfolio: string) => {
    setShadowCabinet(prev => prev.filter(m => m.portfolio !== portfolio));
  }, []);

  // ── Communication ───────────────────────────────────────────────────────────
  const issuePressStatement = useCallback((statement: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const approvalChange = statement.length > 100 ? 2 : 1;
      logAction({ action: 'Press Statement Issued', category: 'other', description: statement.substring(0, 100), severity: 'low' });
      generateAINews(supabase, 'press_statement', statement.substring(0, 150), prev.playerPartyId, prev.playerName, prev.isGoverning, prev.stats, prev.currentWeek, 4).then(articles => {
        setGameState(gs => {
          if (!gs) return gs;
          const toAdd = articles.length > 0 ? articles : generatePressStatementReaction(statement, prev.playerPartyId, prev.playerName, prev.currentWeek);
          return { ...gs, newsHistory: [...toAdd, ...gs.newsHistory].slice(0, 60) };
        });
      });
      return { ...prev, stats: { ...prev.stats, approvalRating: Math.min(95, prev.stats.approvalRating + approvalChange), partyStanding: Math.min(95, prev.stats.partyStanding + 1) } };
    });
  }, [supabase, logAction]);

  const submitPolicy = useCallback((policyText: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      logAction({ action: 'Policy Platform Updated', category: 'other', description: policyText.substring(0, 100), severity: 'low' });
      generateAINews(supabase, 'policy', `${PARTIES.find(p => p.id === prev.playerPartyId)?.shortName} releases policy: "${policyText.substring(0, 100)}"`, prev.playerPartyId, prev.playerName, prev.isGoverning, prev.stats, prev.currentWeek, 3).then(articles => {
        setGameState(gs => {
          if (!gs) return gs;
          const toAdd = articles.length > 0 ? articles : generatePolicyNews(policyText, prev.playerPartyId, prev.playerName, prev.currentWeek);
          return { ...gs, newsHistory: [...toAdd, ...gs.newsHistory].slice(0, 60) };
        });
      });
      return { ...prev, stats: { ...prev.stats, approvalRating: Math.min(95, prev.stats.approvalRating + 3), partyStanding: Math.min(95, prev.stats.partyStanding + 2) } };
    });
  }, [supabase, logAction]);

  // ── War State ────────────────────────────────────────────────────────────────
  const addWar = useCallback((war: ActiveWarState) => {
    setActiveWars(prev => [...prev.filter(w => w.country !== war.country), war]);
    logAction({ action: 'War Declared', category: 'foreign_policy', description: `Canada at war with ${war.country}`, severity: 'critical' });
  }, [logAction]);

  const updateWar = useCallback((country: string, update: Partial<ActiveWarState>) => {
    setActiveWars(prev => prev.map(w => w.country === country ? { ...w, ...update } : w));
  }, []);

  const removeWar = useCallback((country: string) => {
    setActiveWars(prev => prev.filter(w => w.country !== country));
    logAction({ action: 'War Ended', category: 'foreign_policy', description: `Peace reached with ${country}`, severity: 'high' });
  }, [logAction]);

  // ── Foreign Policy ──────────────────────────────────────────────────────────
  const executeForeignPolicy = useCallback((action: string, country: string, approvalChange: number, gdpChange: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      const headline = action === 'trade_deal' ? `Canada signs trade deal with ${country}`
        : action === 'declare_war' ? `Canada declares war on ${country}`
        : action === 'peace_treaty' ? `Canada reaches peace agreement with ${country}`
        : `Canada: ${action} with ${country}`;
      logAction({ action: `Foreign Policy: ${action}`, category: 'foreign_policy', description: headline, impact: `Approval: ${approvalChange}%, GDP: ${gdpChange}%`, severity: 'high' });
      generateAINews(supabase, `foreign_policy_${action}`, headline, prev.playerPartyId, prev.playerName, true, prev.stats, prev.currentWeek, 3).then(articles => {
        if (articles.length > 0) { setGameState(gs => { if (!gs) return gs; return { ...gs, newsHistory: [...articles, ...gs.newsHistory].slice(0, 60) }; }); }
      });
      return {
        ...prev,
        stats: {
          ...prev.stats,
          approvalRating: Math.max(5, Math.min(95, prev.stats.approvalRating + approvalChange)),
          gdpGrowth: Math.max(-10, Math.min(15, prev.stats.gdpGrowth + gdpChange * 0.1)),
          partyStanding: Math.max(5, Math.min(95, prev.stats.partyStanding + Math.round(approvalChange * 0.5))),
        },
      };
    });
  }, [supabase, logAction]);

  // ── Parliamentary Schedule ──────────────────────────────────────────────────
  const scheduleSession = useCallback((type: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      return { ...prev, parliamentInSession: type !== 'recess', stats: { ...prev.stats, approvalRating: Math.max(5, prev.stats.approvalRating + (type === 'recess' ? -3 : 0)) } };
    });
  }, []);

  const callEmergencySession = useCallback(() => {
    setGameState(prev => {
      if (!prev || !prev.isGoverning) return prev;
      return { ...prev, parliamentInSession: true, stats: { ...prev.stats, governmentApproval: Math.min(95, (prev.stats.governmentApproval || 0) + 5) } };
    });
  }, []);

  const callOppositionDay = useCallback(() => {
    setOppositionDaysUsed(prev => Math.min(22, prev + 1));
    setGameState(prev => {
      if (!prev) return prev;
      logAction({ action: 'Opposition Day Called', category: 'other', description: `Allotted day used (${oppositionDaysUsed + 1}/22)`, severity: 'medium' });
      return { ...prev, stats: { ...prev.stats, partyStanding: Math.min(95, prev.stats.partyStanding + 3) } };
    });
  }, [oppositionDaysUsed, logAction]);

  // ── Whip System ─────────────────────────────────────────────────────────────
  const triggerWhipWarning = useCallback((mpName: string, loyalty: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      const event: WhipEvent = { mpName, partyId: prev.playerPartyId, event: 'warned', week: prev.currentWeek, description: `${mpName} received a formal whip warning.`, loyalty };
      setWhipEvents(prevE => [event, ...prevE].slice(0, 20));
      return prev;
    });
  }, []);

  const recordFloorCrossing = useCallback((mpName: string, fromPartyId: string, toPartyId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const event: WhipEvent = {
        mpName, partyId: fromPartyId, event: 'floor_crossing', week: prev.currentWeek,
        description: `${mpName} crossed from ${PARTIES.find(p => p.id === fromPartyId)?.name} to ${PARTIES.find(p => p.id === toPartyId)?.name}.`,
        loyalty: 20,
      };
      setWhipEvents(prevE => [event, ...prevE].slice(0, 20));
      logAction({ action: 'Floor Crossing', category: 'other', description: event.description, severity: 'high' });
      const newSeats = { ...prev.seats };
      newSeats[fromPartyId] = Math.max(0, (newSeats[fromPartyId] || 0) - 1);
      newSeats[toPartyId] = (newSeats[toPartyId] || 0) + 1;
      return { ...prev, seats: newSeats };
    });
  }, [logAction]);

  // ── Judicial ─────────────────────────────────────────────────────────────────
  const addJudicialCase = useCallback((caseData: Omit<JudicialCase, 'id' | 'weekFiled'>) => {
    setGameState(prev => {
      if (!prev) return prev;
      const newCase: JudicialCase = { ...caseData, id: `case_${Date.now()}`, weekFiled: prev.currentWeek };
      setJudicialCases(prevC => [...prevC, newCase]);
      return prev;
    });
  }, []);

  const resolveJudicialCase = useCallback((caseId: string, outcome: JudicialCase['outcome']) => {
    setJudicialCases(prev => prev.map(c => c.id === caseId ? { ...c, status: 'decided', outcome } : c));
    logAction({ action: 'Court Case Decided', category: 'court', description: `Outcome: ${outcome}`, severity: 'high' });
  }, [logAction]);

  // ── Emergency Act ────────────────────────────────────────────────────────────
  const updateEmergencyActState = useCallback((update: Partial<EmergencyActState>) => {
    setEmergencyActState(prev => ({ ...prev, ...update }));
    if (update.isActive) logAction({ action: 'Emergencies Act Invoked', category: 'emergency', description: `Type: ${update.type}`, severity: 'critical' });
    if (update.isActive === false) logAction({ action: 'Emergencies Act Lifted', category: 'emergency', description: 'Emergency declaration revoked', severity: 'high' });
  }, [logAction]);

  // ── Supply ───────────────────────────────────────────────────────────────────
  const setSupplyPassed = useCallback((passed: boolean) => {
    setSupplyPassedState(passed);
    if (passed) logAction({ action: 'Supply Passed', category: 'vote', description: 'Main Estimates approved by Parliament', severity: 'high' });
  }, [logAction]);

  // ── Speaker ──────────────────────────────────────────────────────────────────
  const electSpeaker = useCallback((name: string) => {
    setSpeakerName(name);
    logAction({ action: 'Speaker Elected', category: 'other', description: `${name} elected as Speaker of the House`, severity: 'medium' });
  }, [logAction]);

  const addSpeakerRuling = useCallback((ruling: Omit<SpeakerRuling, 'id' | 'week'>) => {
    setGameState(prev => {
      if (!prev) return prev;
      const newRuling: SpeakerRuling = { ...ruling, id: `ruling_${Date.now()}`, week: prev.currentWeek };
      setSpeakerRulings(prevR => [newRuling, ...prevR].slice(0, 50));
      logAction({ action: `Speaker Ruling: ${ruling.ruling === 'in_order' ? 'In Order' : 'Out of Order'}`, category: 'other', description: ruling.motion, severity: 'medium' });
      return prev;
    });
  }, [logAction]);

  // ── By-Election ────────────────────────────────────────────────────────────
  const completeByElection = useCallback((provinceCode: string, ridingName: string, won: boolean, playerPartyId: string, vacatingPartyId: string, candidateName: string) => {
    setByElectionTrigger(null);
    logAction({ action: won ? 'By-Election Won' : 'By-Election Lost', category: 'election', description: `${ridingName}, ${provinceCode}`, severity: 'medium' });
    setGameState(prev => {
      if (!prev) return prev;
      const newSeats = { ...prev.seats };
      if (won && vacatingPartyId !== playerPartyId) {
        newSeats[playerPartyId] = (newSeats[playerPartyId] || 0) + 1;
        newSeats[vacatingPartyId] = Math.max(0, (newSeats[vacatingPartyId] || 0) - 1);
      } else if (!won && vacatingPartyId === playerPartyId) {
        newSeats[playerPartyId] = Math.max(0, (newSeats[playerPartyId] || 0) - 1);
      }
      return {
        ...prev,
        seats: newSeats,
        stats: { ...prev.stats, approvalRating: Math.max(5, Math.min(95, prev.stats.approvalRating + (won ? 2 : -2))), partyStanding: Math.max(5, Math.min(95, prev.stats.partyStanding + (won ? 3 : -2))) },
      };
    });
  }, [logAction]);

  const dismissByElection = useCallback(() => { setByElectionTrigger(null); }, []);

  // ── International Events ─────────────────────────────────────────────────
  const dismissInternationalEvent = useCallback(() => {
    setPendingInternationalEvent(null);
  }, []);

  const respondToInternationalEvent = useCallback((eventId: string, accept: boolean) => {
    setInternationalEvents(prev => prev.map(e => e.id === eventId ? { ...e, responded: true } : e));
    setPendingInternationalEvent(null);
    setGameState(prev => {
      if (!prev) return prev;
      const event = internationalEvents.find(e => e.id === eventId);
      const effect = accept ? 3 : -1;
      logAction({ action: accept ? 'International Event Accepted' : 'International Event Declined', category: 'foreign_policy', description: event?.title || 'International event', severity: 'medium' });
      return { ...prev, stats: { ...prev.stats, approvalRating: Math.max(5, Math.min(95, prev.stats.approvalRating + effect)) } };
    });
  }, [internationalEvents, logAction]);

  // ── Ethics Scandal Response ─────────────────────────────────────────────
  const respondToEthicsScandal = useCallback((scandalId: string, response: EthicsScandal['playerResponse']) => {
    setEthicsScandals(prev => prev.map(s => s.id === scandalId ? { ...s, playerResponse: response, status: response === 'fired_minister' ? 'violation_found' : response === 'inquiry' ? 'under_review' : s.status } : s));
    setGameState(prev => {
      if (!prev) return prev;
      const scandal = ethicsScandals.find(s => s.id === scandalId);
      if (!scandal) return prev;
      const baseImpact = scandal.approvalImpact;
      const govImpact = scandal.governmentApprovalImpact;
      // Response modifiers
      const responseBonus = response === 'fired_minister' ? 3 : response === 'inquiry' ? 2 : response === 'defended' ? -3 : 0;
      logAction({ action: 'Ethics Scandal Response', category: 'scandal', description: `${scandal.title} — Response: ${response}`, severity: scandal.severity });
      return {
        ...prev,
        stats: {
          ...prev.stats,
          approvalRating: Math.max(5, Math.min(95, prev.stats.approvalRating + baseImpact + responseBonus)),
          governmentApproval: Math.max(0, Math.min(95, (prev.stats.governmentApproval || 0) + govImpact + responseBonus)),
        },
      };
    });
  }, [ethicsScandals, logAction]);

  // ── Election ────────────────────────────────────────────────────────────────
  const startElectionCampaign = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      if (!campaignState) {
        const campaign = initializeCampaign(prev.playerPartyId, prev.stats);
        setCampaignState(campaign);
      }
      return { ...prev, inElection: true, electionWeek: 1 };
    });
  }, [campaignState]);

  const campaignInRegion = useCallback((provinceCode: string) => {
    setCampaignState(prev => { if (!prev) return prev; return gameState ? campaignInProvince(prev, provinceCode, gameState.stats) : prev; });
    logAction({ action: 'Campaigned', category: 'election', description: `Campaigned in ${provinceCode}`, severity: 'low' });
  }, [gameState, logAction]);

  const completeCampaign = useCallback((preComputedResult: ElectionNightResult) => {
    setElectionResult(preComputedResult);
    setGameState(prev => {
      if (!prev) return prev;
      const { totalSeats, playerSeats, playerVotePct } = preComputedResult;
      const maxSeats = Math.max(...Object.values(totalSeats).filter(v => typeof v === 'number'));
      const playerWon = playerSeats >= MAJORITY_SEATS || playerSeats === maxSeats;
      const newProvincialSeats: Record<string, Record<string, number>> = {};
      preComputedResult.provinceResults.forEach(r => { newProvincialSeats[r.provinceCode] = r.seats; });
      const newState: GameState = {
        ...prev,
        seats: totalSeats,
        provincialSeats: newProvincialSeats,
        isGoverning: playerWon,
        isMajority: playerSeats >= MAJORITY_SEATS,
        isOpposition: !playerWon,
        inElection: false,
        electionWeek: 0,
        electionTriggered: false,
        currentWeek: 1,
        parliamentNumber: prev.parliamentNumber + 1,
        inLeadershipReview: !playerWon,
        electionHistory: [...prev.electionHistory, { parliament: prev.parliamentNumber, week: prev.currentWeek, seats: totalSeats, playerSeats, won: playerWon, votePct: playerVotePct }],
        cabinet: playerWon ? prev.cabinet : [],
        confidenceVoteAvailable: !playerWon,
        confidenceVoteCooldown: 0,
      };
      setBills(initializeBills(1));
      setCampaignState(null);
      if (playerWon) setShadowCabinet([]);
      setSupplyPassedState(false);
      setSpeakerName(null);
      setOppositionDaysUsed(0);
      logAction({ action: playerWon ? 'Election Won' : 'Election Lost', category: 'election', description: `${playerSeats} seats, ${playerVotePct.toFixed(1)}% popular vote`, severity: 'critical' });
      return newState;
    });
  }, [logAction]);

  // ── Question Period ─────────────────────────────────────────────────────────
  const answerQuestion = useCallback((question: string, answer: string, performance: 'excellent' | 'good' | 'poor') => {
    setGameState(prev => {
      if (!prev) return prev;
      const effect = performance === 'excellent' ? 5 : performance === 'good' ? 2 : -4;
      logAction({ action: 'Question Period', category: 'debate', description: `Performance: ${performance.toUpperCase()}`, impact: `Approval: ${effect > 0 ? '+' : ''}${effect}%`, severity: performance === 'poor' ? 'medium' : 'low' });
      return {
        ...prev,
        stats: { ...prev.stats, approvalRating: Math.min(95, Math.max(5, prev.stats.approvalRating + effect)), partyStanding: Math.min(95, Math.max(5, prev.stats.partyStanding + Math.round(effect * 0.5))) },
      };
    });
  }, [logAction]);

  // ── Leadership Review ───────────────────────────────────────────────────────
  const resolveLeadershipReview = useCallback((survive: boolean) => {
    setGameState(prev => {
      if (!prev) return prev;
      logAction({ action: survive ? 'Leadership Review Survived' : 'Leadership Review Failed', category: 'other', description: survive ? 'Leader retained position' : 'Leadership race triggered', severity: 'critical' });
      return { ...prev, inLeadershipReview: false, stats: { ...prev.stats, partyStanding: survive ? 60 : 30, approvalRating: survive ? prev.stats.approvalRating + 5 : prev.stats.approvalRating - 10 } };
    });
  }, [logAction]);

  // ── Party Leader Deals ──────────────────────────────────────────────────────
  const makePartyDeal = useCallback((rivalPartyId: string, dealType: string, accepted: boolean) => {
    setGameState(prev => {
      if (!prev || !accepted) return prev;
      logAction({ action: 'Party Deal', category: 'alliance', description: `Deal with ${rivalPartyId}: ${dealType}`, severity: 'medium' });
      if (dealType === 'no_confidence') return { ...prev, confidenceVoteAvailable: true, confidenceVoteCooldown: 0 };
      return { ...prev, stats: { ...prev.stats, partyStanding: Math.min(95, prev.stats.partyStanding + 3), approvalRating: Math.min(95, prev.stats.approvalRating + 1) } };
    });
  }, [logAction]);

  const callGoverningConfidenceVote = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      const campaign = initializeCampaign(prev.playerPartyId, prev.stats);
      setCampaignState(campaign);
      return { ...prev, inElection: true, electionWeek: 1, electionTriggerReason: 'pm_dissolution', electionTriggered: true };
    });
  }, []);

  return (
    <GameContext.Provider value={{
      gameState, bills, campaignState, electionResult, shadowCabinet, byElectionTrigger, savedGames,
      whipEvents, judicialCases, emergencyActState, supplyPassed, speakerName, oppositionDaysUsed,
      activeWars, actionLog, internationalEvents, ethicsScandals, speakerRulings, pendingInternationalEvent,
      startGame, saveGame, loadGame, deleteSave, resetGame,
      advanceWeek, voteOnBill, accelerateBill, createBill, prioritizeBill,
      callConfidenceVote, dissolveParliament,
      appointMinister, fireMinister, instructMinister,
      appointShadowMinister, removeShadowMinister,
      issuePressStatement, submitPolicy,
      startElectionCampaign, campaignInRegion, completeCampaign,
      answerQuestion, resolveLeadershipReview, callGoverningConfidenceVote,
      completeByElection, dismissByElection,
      executeForeignPolicy, scheduleSession, callEmergencySession, callOppositionDay,
      makePartyDeal,
      addWar, updateWar, removeWar,
      triggerWhipWarning, recordFloorCrossing,
      addJudicialCase, resolveJudicialCase,
      updateEmergencyActState,
      setSupplyPassed,
      electSpeaker, addSpeakerRuling,
      logAction,
      dismissInternationalEvent,
      respondToInternationalEvent,
      respondToEthicsScandal,
    }}>
      {children}
    </GameContext.Provider>
  );
}
