// Powered by OnSpace.AI — Fixed GameContext with save/load, PM majority/minority fixes, auto-election trigger
import React, { createContext, useState, useCallback, useEffect } from 'react';
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
import { assignBillToCommittee as assignBillToCommitteeService, launchCommitteeStudy as launchCommitteeStudyService, advanceCommitteeWork as advanceCommitteeWorkService } from '@/services/committeeService';
import { getSupabaseClient } from '@/template';

const SAVE_KEY = 'fantasy_parliament_save';

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
  lastOperationWeek: number; // week when last troop op was executed
  strategy: string | null;
  peaceOptions: Array<{ id: string; label: string; description: string; territory?: string; selected: boolean }>;
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
  createBill: (title: string, description: string, topic: string, fiscalImpact: string) => void;

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

  // Committee
  launchCommitteeStudy: (committeeId: string, topic: string) => void;
  assignBillToCommittee: (committeeId: string, billId: string) => void;
  addBillAmendment: (billId: string, amendment: string) => void;

  // MPs
  whipMPs: (billId: string) => void;
  offerFloorCrossing: (mpId: string, targetPartyId: string) => void;

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
  activeWars: ActiveWarState[];
  updateWar?: (country: string, update: Partial<ActiveWarState>) => void;
  addWar?: (war: ActiveWarState) => void;
  removeWar?: (country: string) => void;

  // Parliamentary Schedule
  scheduleSession?: (type: string) => void;
  callEmergencySession?: () => void;
  callOppositionDay?: () => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [campaignState, setCampaignState] = useState<CampaignState | null>(null);
  const [electionResult, setElectionResult] = useState<ElectionNightResult | null>(null);
  const [shadowCabinet, setShadowCabinet] = useState<ShadowCabinetMember[]>([]);
  const [byElectionTrigger, setByElectionTrigger] = useState<ByElectionTrigger | null>(null);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [activeWars, setActiveWars] = useState<ActiveWarState[]>([]);

  const supabase = getSupabaseClient();

  // Load saved games on mount
  useEffect(() => {
    loadSavedGames();
  }, []);

  // Autosave progress every minute
  useEffect(() => {
    const interval = setInterval(() => {
      saveGame();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [saveGame]);

  const loadSavedGames = async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVE_KEY);
      if (raw) {
        const saves: SavedGame[] = JSON.parse(raw);
        setSavedGames(saves);
      }
    } catch {
      setSavedGames([]);
    }
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
      };
      const existing = await AsyncStorage.getItem(SAVE_KEY);
      const saves: SavedGame[] = existing ? JSON.parse(existing) : [];
      // Keep max 5 saves, newest first
      const updated = [save, ...saves].slice(0, 5);
      await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(updated));
      setSavedGames(updated);
    } catch (e) {
      console.error('Save failed:', e);
    }
  }, [gameState, bills, shadowCabinet]);

  const loadGame = useCallback((saveId: string) => {
    const save = savedGames.find(s => s.id === saveId);
    if (!save) return;
    setGameState(save.gameState);
    setBills(save.bills);
    setShadowCabinet(save.shadowCabinet);
    setCampaignState(null);
    setElectionResult(null);
    setByElectionTrigger(null);
  }, [savedGames]);

  const deleteSave = useCallback(async (saveId: string) => {
    try {
      const updated = savedGames.filter(s => s.id !== saveId);
      await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(updated));
      setSavedGames(updated);
    } catch {}
  }, [savedGames]);

  const resetGame = useCallback(() => {
    setGameState(null);
    setBills([]);
    setCampaignState(null);
    setElectionResult(null);
    setShadowCabinet([]);
    setByElectionTrigger(null);
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
  }, []);

  // ── Generate AI Weekly Events ───────────────────────────────────────────────
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
    } catch {
      return [];
    }
  };

  // ── Advance Week ────────────────────────────────────────────────────────────
  const advanceWeek = useCallback((eventChoices: Record<string, string>) => {
    setGameState(prev => {
      if (!prev) return prev;

      // AI news for event choices (fire-and-forget)
      Object.entries(eventChoices).forEach(([eventId, choiceId]) => {
        const event = prev.currentEvents.find(e => e.id === eventId);
        const choice = event?.choices.find(c => c.id === choiceId);
        if (event && choice) {
          generateAINews(supabase, 'event_choice', choice.newsHeadline, prev.playerPartyId, prev.playerName, prev.isGoverning, prev.stats, prev.currentWeek, 3).then(articles => {
            if (articles.length > 0) {
              setGameState(gs => { if (!gs) return gs; return { ...gs, newsHistory: [...articles, ...gs.newsHistory].slice(0, 60) }; });
            }
          });
        }
      });

      const newState = processWeek(prev, eventChoices);

      // ── MINORITY GOVERNMENT: confidence vote trigger ──────────────────────
      // If governing minority + approval < 35% OR if opposition has made a no-confidence deal
      const playerSeats = newState.seats[newState.playerPartyId] || 0;
      const isMinority = newState.isGoverning && playerSeats < MAJORITY_SEATS;
      const govApproval = newState.stats.governmentApproval || 0;
      const lowApproval = govApproval < 32 || newState.stats.approvalRating < 28;

      // Random confidence vote event for minority government when approval is low
      if (isMinority && lowApproval && Math.random() < 0.15 && !newState.inElection) {
        const confidenceEvent: GameEvent = {
          id: `confidence_vote_${newState.currentWeek}`,
          week: newState.currentWeek,
          title: 'Opposition Calls Confidence Vote',
          description: `The Opposition has tabled a non-confidence motion in the House of Commons. With government approval at ${Math.round(govApproval)}%, support is fragile. The vote will be held this week — the government must survive or an election will be called.`,
          type: 'political',
          urgency: 'critical',
          expires: newState.currentWeek + 1,
          choices: [
            {
              id: 'confidence_survive',
              label: 'Rally the Caucus',
              description: 'Work behind the scenes to shore up support. Win over independent MPs and minor parties.',
              effects: { approvalRating: -3, partyStanding: 2 },
              newsHeadline: 'Government survives confidence vote after intense backroom negotiations',
            },
            {
              id: 'confidence_lose',
              label: 'Accept the Verdict',
              description: 'The government cannot muster enough votes. Prepare for an election.',
              effects: { approvalRating: -5, partyStanding: -5 },
              newsHeadline: 'Government falls — election called as confidence vote fails',
            },
          ],
        };
        // Simulate the vote outcome
        const survives = Math.random() > 0.5; // Even odds for minority government
        if (!survives) {
          // Trigger election
          return { ...newState, inElection: true, electionWeek: 1, electionTriggerReason: 'confidence_vote', electionTriggered: true, currentEvents: [confidenceEvent, ...newState.currentEvents].slice(0, 4) };
        }
        return { ...newState, currentEvents: [confidenceEvent, ...newState.currentEvents].slice(0, 4) };
      }

      // Advance active wars each week — update casualties, land, popularity
      setActiveWars(prevWars => {
        if (!prevWars) return [];
        return prevWars.map(w => {
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
        });
      });

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
        advanceBills(prevBills, newState.currentWeek, newState.playerPartyId, newState.seats[newState.playerPartyId] || 0, TOTAL_SEATS, newState.isGoverning, newState.mpRoster)
      );

      // Fetch AI events for next week
      fetchAIWeeklyEvents(newState).then(aiEvents => {
        if (aiEvents.length > 0) {
          setGameState(gs => {
            if (!gs) return gs;
            const staticEvents = generateWeeklyEvents(gs.currentWeek, gs.playerPartyId, gs.isGoverning).slice(0, 1);
            return { ...gs, currentEvents: [...aiEvents, ...staticEvents].slice(0, 4) };
          });
        }
      });

      return newState;
    });
  }, [supabase, byElectionTrigger]);

  // ── Bill Actions ────────────────────────────────────────────────────────────
  const voteOnBill = useCallback((billId: string, vote: 'yea' | 'nay' | 'abstain') => {
    setBills(prev => prev.map(b => b.id === billId ? { ...b, playerVote: vote } : b));
  }, []);

  const accelerateBill = useCallback((billId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      setBills(prevBills => prevBills.map(b => b.id === billId ? accelerateBillNow(b, prev.currentWeek) : b));
      return prev;
    });
  }, []);

  const createBill = useCallback((title: string, description: string, topic: string, fiscalImpact: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const isGovMinister = prev.isGoverning; // simplified, in future detect Minister sponsor explicitly
      const billType = isGovMinister ? 'government' : 'private_member';
      const newBill = createPlayerBill(title, description, topic, fiscalImpact, prev.playerPartyId, prev.playerName, prev.currentWeek, prev.isGoverning, billType);
      setBills(prevBills => [newBill, ...prevBills]);
      return prev;
    });
  }, []);

  // ── Confidence & Dissolution — FIXED: now properly sets inElection ──────────
  const callConfidenceVote = useCallback((): { passed: boolean; message: string } => {
    let result = { passed: false, message: '' };
    setGameState(prev => {
      if (!prev) return prev;
      const govSeats = Math.max(...Object.values(prev.seats).filter(v => typeof v === 'number'));
      const passed = govSeats < MAJORITY_SEATS && Math.random() > 0.5;
      result = {
        passed,
        message: passed
          ? 'The government has lost the confidence of the House. Parliament is dissolved. An election will be held.'
          : 'The government survived the confidence vote. Parliament continues.',
      };
      if (passed) {
        const campaign = initializeCampaign(prev.playerPartyId, prev.stats);
        setCampaignState(campaign);
        return { ...prev, inElection: true, electionWeek: 1, electionTriggerReason: 'confidence_vote', electionTriggered: true, confidenceVoteCooldown: 0 };
      }
      return { ...prev, confidenceVoteCooldown: 12 };
    });
    return result;
  }, []);

  const dissolveParliament = useCallback(() => {
    setGameState(prev => {
      if (!prev || !prev.isGoverning) return prev;
      const campaign = initializeCampaign(prev.playerPartyId, prev.stats);
      setCampaignState(campaign);
      return { ...prev, inElection: true, electionWeek: 1, electionTriggerReason: 'pm_dissolution', electionTriggered: true };
    });
  }, []);

  // ── Cabinet (Governing) ─────────────────────────────────────────────────────
  const appointMinister = useCallback((portfolio: string, name: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const existingIdx = prev.cabinet.findIndex(m => m.portfolio === portfolio);
      const newMember: CabinetMember = { portfolio, name, loyalty: 70 + Math.floor(Math.random() * 20), competence: 60 + Math.floor(Math.random() * 30) };
      if (existingIdx >= 0) {
        const newCabinet = [...prev.cabinet];
        newCabinet[existingIdx] = newMember;
        return { ...prev, cabinet: newCabinet };
      }
      return { ...prev, cabinet: [...prev.cabinet, newMember] };
    });
  }, []);

  const fireMinister = useCallback((portfolio: string) => {
    setGameState(prev => { if (!prev) return prev; return { ...prev, cabinet: prev.cabinet.filter(m => m.portfolio !== portfolio) }; });
  }, []);

  const instructMinister = useCallback((portfolio: string, instruction: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const minister = prev.cabinet.find(m => m.portfolio === portfolio);
      if (!minister) return prev;
      const loyaltyBonus = minister.loyalty > 70 ? 2 : -1;
      generateAINews(supabase, 'minister_directive', `Minister ${minister.name} directive on ${portfolio}: "${instruction.substring(0, 80)}"`, prev.playerPartyId, prev.playerName, true, prev.stats, prev.currentWeek, 2).then(articles => {
        if (articles.length > 0) { setGameState(gs => { if (!gs) return gs; return { ...gs, newsHistory: [...articles, ...gs.newsHistory].slice(0, 60) }; }); }
      });
      return { ...prev, stats: { ...prev.stats, governmentApproval: Math.min(95, (prev.stats.governmentApproval || 0) + loyaltyBonus) } };
    });
  }, [supabase]);

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
      generateAINews(supabase, 'press_statement', statement.substring(0, 150), prev.playerPartyId, prev.playerName, prev.isGoverning, prev.stats, prev.currentWeek, 4).then(articles => {
        setGameState(gs => {
          if (!gs) return gs;
          const toAdd = articles.length > 0 ? articles : generatePressStatementReaction(statement, prev.playerPartyId, prev.playerName, prev.currentWeek);
          return { ...gs, newsHistory: [...toAdd, ...gs.newsHistory].slice(0, 60) };
        });
      });
      return { ...prev, stats: { ...prev.stats, approvalRating: Math.min(95, prev.stats.approvalRating + approvalChange), partyStanding: Math.min(95, prev.stats.partyStanding + 1) } };
    });
  }, [supabase]);

  const submitPolicy = useCallback((policyText: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      generateAINews(supabase, 'policy', `${PARTIES.find(p => p.id === prev.playerPartyId)?.shortName} releases policy: "${policyText.substring(0, 100)}"`, prev.playerPartyId, prev.playerName, prev.isGoverning, prev.stats, prev.currentWeek, 3).then(articles => {
        setGameState(gs => {
          if (!gs) return gs;
          const toAdd = articles.length > 0 ? articles : generatePolicyNews(policyText, prev.playerPartyId, prev.playerName, prev.currentWeek);
          return { ...gs, newsHistory: [...toAdd, ...gs.newsHistory].slice(0, 60) };
        });
      });
      return { ...prev, stats: { ...prev.stats, approvalRating: Math.min(95, prev.stats.approvalRating + 3), partyStanding: Math.min(95, prev.stats.partyStanding + 2) } };
    });
  }, [supabase]);

  // ── War State Management ─────────────────────────────────────────────────────
  const addWar = useCallback((war: ActiveWarState) => {
    setActiveWars(prev => [...prev.filter(w => w.country !== war.country), war]);
  }, []);

  const updateWar = useCallback((country: string, update: Partial<ActiveWarState>) => {
    setActiveWars(prev => prev.map(w => w.country === country ? { ...w, ...update } : w));
  }, []);

  const removeWar = useCallback((country: string) => {
    setActiveWars(prev => prev.filter(w => w.country !== country));
  }, []);

  // ── Foreign Policy ──────────────────────────────────────────────────────────
  const executeForeignPolicy = useCallback((action: string, country: string, approvalChange: number, gdpChange: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      const headline = action === 'trade_deal' ? `Canada signs trade deal with ${country}`
        : action === 'declare_war' ? `Canada declares war on ${country}`
        : action === 'peace_treaty' ? `Canada reaches peace agreement with ${country}`
        : action === 'surrender' ? `Canada surrenders to ${country}`
        : `Canada: ${action} with ${country}`;
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
  }, [supabase]);

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
    setGameState(prev => {
      if (!prev) return prev;
      if (prev.oppositionDaysAvailable <= 0) return prev;
      const used = (prev.oppositionDaysUsed || 0) + 1;
      return {
        ...prev,
        oppositionDaysUsed: used,
        oppositionDaysAvailable: Math.max(0, prev.oppositionDaysAvailable - 1),
        stats: { ...prev.stats, partyStanding: Math.min(95, prev.stats.partyStanding + 4) },
        currentEvents: [{
          id: `opposition_day_${prev.currentWeek}`,
          week: prev.currentWeek,
          title: 'Opposition Day Motion',
          description: 'The Official Opposition controls today\'s agenda and debates a policy motion of their choosing.',
          type: 'political',
          urgency: 'medium',
          expires: prev.currentWeek + 1,
          choices: [
            { id: 'opp_day_success', label: 'Score a win', description: 'Strengthen your narrative and force a tough vote.', effects: { partyStanding: 3, approvalRating: 1 }, newsHeadline: 'Opposition Day motion gains momentum' },
            { id: 'opp_day_blocked', label: 'Government blocks', description: 'Government tumbles the motion and stains your image.', effects: { partyStanding: -1, approvalRating: 2 }, newsHeadline: 'Government blocks Opposition Day motion' },
          ],
        }, ...prev.currentEvents].slice(0, 4),
      };
    });
  }, []);

  const launchCommitteeStudy = useCallback((committeeId: string, topic: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const committees = prev.committees.map(c => {
        if (c.id !== committeeId) return c;
        return launchCommitteeStudyService(c, topic, prev.currentWeek);
      });
      return { ...prev, committees, stats: { ...prev.stats, partyStanding: Math.min(98, prev.stats.partyStanding + 2) } };
    });
  }, []);

  const assignBillToCommittee = useCallback((committeeId: string, billId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const committees = prev.committees.map(c => c.id === committeeId ? assignBillToCommitteeService(c, bills.find(b => b.id === billId)!) : c);
      return { ...prev, committees };
    });
  }, [bills]);

  const addBillAmendment = useCallback((billId: string, amendment: string) => {
    setBills(prev => prev.map(b => b.id === billId ? { ...b, amendments: [...b.amendments, amendment] } : b));
  }, []);

  const whipMPs = useCallback((billId: string) => {
    // Whip process causes party loyalty shifts and can trigger rebels
    setGameState(prev => {
      if (!prev) return prev;
      const bill = bills.find(b => b.id === billId);
      if (!bill) return prev;
      const updatedRoster = prev.mpRoster.map(mp => {
        if (mp.status !== 'active') return mp;
        const roll = Math.random();
        if (mp.loyalty < 40 && roll < 0.35) {
          return { ...mp, status: 'rebellious' };
        }
        if (mp.loyalty > 75 && roll > 0.15) {
          return { ...mp, loyalty: Math.min(100, mp.loyalty + 3) };
        }
        return mp;
      });
      return {
        ...prev,
        mpRoster: updatedRoster,
        stats: { ...prev.stats, governmentApproval: Math.max(0, Math.min(95, prev.stats.governmentApproval + 1)) },
      };
    });
  }, [bills]);

  const offerFloorCrossing = useCallback((mpId: string, targetPartyId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const updatedRoster = prev.mpRoster.map(mp => {
        if (mp.id !== mpId || mp.status === 'expelled') return mp;
        const success = Math.random() < (mp.loyalty < 50 ? 0.6 : 0.3);
        if (!success) return mp;
        return { ...mp, partyId: targetPartyId, status: 'crossed', loyalty: 50 };
      });
      return {
        ...prev,
        mpRoster: updatedRoster,
        stats: { ...prev.stats, partyStanding: Math.min(95, prev.stats.partyStanding + 2) },
      };
    });
  }, []);

  // ── By-Election ────────────────────────────────────────────────────────────
  const completeByElection = useCallback((provinceCode: string, ridingName: string, won: boolean, playerPartyId: string, vacatingPartyId: string, candidateName: string) => {
    setByElectionTrigger(null);
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
  }, []);

  const dismissByElection = useCallback(() => { setByElectionTrigger(null); }, []);

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
    setCampaignState(prev => {
      if (!prev) return prev;
      return gameState ? campaignInProvince(prev, provinceCode, gameState.stats) : prev;
    });
  }, [gameState]);

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
        inLeadershipReview: !playerWon, // auto-trigger leadership review if lost
        electionHistory: [...prev.electionHistory, { parliament: prev.parliamentNumber, week: prev.currentWeek, seats: totalSeats, playerSeats, won: playerWon, votePct: playerVotePct }],
        cabinet: playerWon ? prev.cabinet : [],
        // PM powers: governing party determines majority/minority
        confidenceVoteAvailable: !playerWon,
        confidenceVoteCooldown: 0,
      };
      setBills(initializeBills(1));
      setCampaignState(null);
      if (playerWon) setShadowCabinet([]);
      return newState;
    });
  }, []);

  // ── Question Period ─────────────────────────────────────────────────────────
  const answerQuestion = useCallback((question: string, answer: string, performance: 'excellent' | 'good' | 'poor') => {
    setGameState(prev => {
      if (!prev) return prev;
      const effect = performance === 'excellent' ? 5 : performance === 'good' ? 2 : -4;
      return {
        ...prev,
        stats: { ...prev.stats, approvalRating: Math.min(95, Math.max(5, prev.stats.approvalRating + effect)), partyStanding: Math.min(95, Math.max(5, prev.stats.partyStanding + Math.round(effect * 0.5))) },
      };
    });
  }, []);

  // ── Leadership Review ───────────────────────────────────────────────────────
  const resolveLeadershipReview = useCallback((survive: boolean) => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        inLeadershipReview: false,
        stats: { ...prev.stats, partyStanding: survive ? 60 : 30, approvalRating: survive ? prev.stats.approvalRating + 5 : prev.stats.approvalRating - 10 },
      };
    });
  }, []);

  // ── Party Leader Deals ────────────────────────────────────────────────────────
  const makePartyDeal = useCallback((rivalPartyId: string, dealType: string, accepted: boolean) => {
    setGameState(prev => {
      if (!prev || !accepted) return prev;
      if (dealType === 'no_confidence') {
        return { ...prev, confidenceVoteAvailable: true, confidenceVoteCooldown: 0 };
      }
      return { ...prev, stats: { ...prev.stats, partyStanding: Math.min(95, prev.stats.partyStanding + 3), approvalRating: Math.min(95, prev.stats.approvalRating + 1) } };
    });
  }, []);

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
      startGame, saveGame, loadGame, deleteSave, resetGame,
      advanceWeek, voteOnBill, accelerateBill, createBill,
      callConfidenceVote, dissolveParliament,
      appointMinister, fireMinister, instructMinister,
      appointShadowMinister, removeShadowMinister,
      issuePressStatement, submitPolicy,
      startElectionCampaign, campaignInRegion, completeCampaign,
      answerQuestion, resolveLeadershipReview, callGoverningConfidenceVote,
      completeByElection, dismissByElection,
      executeForeignPolicy, scheduleSession, callEmergencySession, callOppositionDay,
      makePartyDeal,
      activeWars, addWar, updateWar, removeWar,
    }}>
      {children}
    </GameContext.Provider>
  );
}
