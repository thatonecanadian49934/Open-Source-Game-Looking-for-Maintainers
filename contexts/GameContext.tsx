// Powered by OnSpace.AI
import React, { createContext, useState, ReactNode, useCallback } from 'react';
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
import { FunctionsHttpError } from '@supabase/supabase-js';

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

// ── Context Type ───────────────────────────────────────────────────────────────
export interface GameContextType {
  gameState: GameState | null;
  bills: Bill[];
  campaignState: CampaignState | null;
  electionResult: ElectionNightResult | null;
  shadowCabinet: ShadowCabinetMember[];
  byElectionTrigger: ByElectionTrigger | null;

  // Setup
  startGame: (partyId: string, playerName: string) => void;

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

  // Parliamentary Schedule
  scheduleSession?: (type: string) => void;
  callEmergencySession?: () => void;
  callOppositionDay?: () => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [campaignState, setCampaignState] = useState<CampaignState | null>(null);
  const [electionResult, setElectionResult] = useState<ElectionNightResult | null>(null);
  const [shadowCabinet, setShadowCabinet] = useState<ShadowCabinetMember[]>([]);
  const [byElectionTrigger, setByElectionTrigger] = useState<ByElectionTrigger | null>(null);

  const supabase = getSupabaseClient();

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
          partyIdeology: PARTIES.find(p => p.id === state.playerPartyId)?.ideology,
          leaderName: state.playerName,
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

      // Map AI events to proper GameEvent format
      return (data.events as any[]).map((e: any) => ({
        id: e.id || `ai_event_${Date.now()}_${Math.random()}`,
        week: state.currentWeek + 1,
        title: e.title || 'Parliamentary Event',
        description: e.description || '',
        type: e.type || 'political',
        urgency: e.urgency || 'medium',
        expires: state.currentWeek + (e.urgency === 'critical' ? 1 : e.urgency === 'high' ? 2 : 3),
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
          generateAINews(
            supabase,
            'event_choice',
            choice.newsHeadline,
            prev.playerPartyId,
            prev.playerName,
            prev.isGoverning,
            prev.stats,
            prev.currentWeek,
            3
          ).then(articles => {
            if (articles.length > 0) {
              setGameState(gs => {
                if (!gs) return gs;
                return { ...gs, newsHistory: [...articles, ...gs.newsHistory].slice(0, 60) };
              });
            }
          });
        }
      });

      const newState = processWeek(prev, eventChoices);

      // Randomly trigger by-election (~5% chance per week, not during elections)
      if (!prev.inElection && Math.random() < 0.05 && !byElectionTrigger) {
        const provinceCodes = ['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE'];
        const reasons: Array<'resignation' | 'death' | 'expulsion'> = ['resignation', 'death', 'expulsion'];
        const partyIds = Object.keys(newState.seats).filter(id => newState.seats[id] > 0);
        const trigger: ByElectionTrigger = {
          partyId: partyIds[Math.floor(Math.random() * partyIds.length)],
          provinceCode: provinceCodes[Math.floor(Math.random() * provinceCodes.length)],
          reason: reasons[Math.floor(Math.random() * 2)], // weight towards resignation
          week: newState.currentWeek,
        };
        setByElectionTrigger(trigger);
      }

      // Advance bills
      setBills(prevBills =>
        advanceBills(
          prevBills,
          newState.currentWeek,
          newState.playerPartyId,
          newState.seats[newState.playerPartyId] || 0,
          TOTAL_SEATS,
          newState.isGoverning
        )
      );

      // Fetch AI events for next week (async, merge with static fallback)
      fetchAIWeeklyEvents(newState).then(aiEvents => {
        if (aiEvents.length > 0) {
          setGameState(gs => {
            if (!gs) return gs;
            // Blend AI events with static ones (keep up to 3 AI, keep 1-2 static)
            const staticEvents = generateWeeklyEvents(gs.currentWeek, gs.playerPartyId, gs.isGoverning).slice(0, 1);
            return {
              ...gs,
              currentEvents: [...aiEvents, ...staticEvents].slice(0, 4),
            };
          });
        }
      });

      return newState;
    });
  }, [supabase]);

  // ── Bill Actions ────────────────────────────────────────────────────────────
  const voteOnBill = useCallback((billId: string, vote: 'yea' | 'nay' | 'abstain') => {
    setBills(prev => prev.map(b => b.id === billId ? { ...b, playerVote: vote } : b));
  }, []);

  const accelerateBill = useCallback((billId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      setBills(prevBills =>
        prevBills.map(b => b.id === billId ? accelerateBillNow(b, prev.currentWeek) : b)
      );
      return prev;
    });
  }, []);

  const createBill = useCallback((title: string, description: string, topic: string, fiscalImpact: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const newBill = createPlayerBill(
        title, description, topic, fiscalImpact,
        prev.playerPartyId, prev.playerName, prev.currentWeek, prev.isGoverning
      );
      setBills(prevBills => [newBill, ...prevBills]);
      return prev;
    });
  }, []);

  // ── Confidence & Dissolution ────────────────────────────────────────────────
  const callConfidenceVote = useCallback((): { passed: boolean; message: string } => {
    let result = { passed: false, message: '' };
    setGameState(prev => {
      if (!prev) return prev;
      const govSeats = Math.max(...Object.values(prev.seats));
      const passed = govSeats < MAJORITY_SEATS && Math.random() > 0.6;
      result = {
        passed,
        message: passed
          ? 'The government has lost the confidence of the House. Parliament is dissolved.'
          : 'The government survived the confidence vote. Parliament continues.',
      };
      if (passed) {
        return { ...prev, inElection: true, electionWeek: 1, electionTriggerReason: 'confidence_vote', electionTriggered: true, confidenceVoteCooldown: 12 };
      }
      return { ...prev, confidenceVoteCooldown: 12 };
    });
    return result;
  }, []);

  const dissolveParliament = useCallback(() => {
    setGameState(prev => {
      if (!prev || !prev.isGoverning) return prev;
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
    setGameState(prev => {
      if (!prev) return prev;
      return { ...prev, cabinet: prev.cabinet.filter(m => m.portfolio !== portfolio) };
    });
  }, []);

  const instructMinister = useCallback((portfolio: string, instruction: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const minister = prev.cabinet.find(m => m.portfolio === portfolio);
      if (!minister) return prev;
      const loyaltyBonus = minister.loyalty > 70 ? 2 : -1;
      generateAINews(supabase, 'minister_directive', `Minister ${minister.name} received directive on ${portfolio}: "${instruction.substring(0, 80)}"`, prev.playerPartyId, prev.playerName, true, prev.stats, prev.currentWeek, 2).then(articles => {
        if (articles.length > 0) {
          setGameState(gs => { if (!gs) return gs; return { ...gs, newsHistory: [...articles, ...gs.newsHistory].slice(0, 60) }; });
        }
      });
      return { ...prev, stats: { ...prev.stats, governmentApproval: Math.min(95, (prev.stats.governmentApproval || 0) + loyaltyBonus) } };
    });
  }, [supabase]);

  // ── Shadow Cabinet (Opposition) ─────────────────────────────────────────────
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
      generateAINews(supabase, 'policy', `${PARTIES.find(p => p.id === prev.playerPartyId)?.shortName} releases new policy: "${policyText.substring(0, 100)}"`, prev.playerPartyId, prev.playerName, prev.isGoverning, prev.stats, prev.currentWeek, 3).then(articles => {
        setGameState(gs => {
          if (!gs) return gs;
          const toAdd = articles.length > 0 ? articles : generatePolicyNews(policyText, prev.playerPartyId, prev.playerName, prev.currentWeek);
          return { ...gs, newsHistory: [...toAdd, ...gs.newsHistory].slice(0, 60) };
        });
      });
      return { ...prev, stats: { ...prev.stats, approvalRating: Math.min(95, prev.stats.approvalRating + 3), partyStanding: Math.min(95, prev.stats.partyStanding + 2) } };
    });
  }, [supabase]);

  // ── Foreign Policy ──────────────────────────────────────────────────────────
  const executeForeignPolicy = useCallback((action: string, country: string, approvalChange: number, gdpChange: number) => {
    setGameState(prev => {
      if (!prev) return prev;
      // Generate AI news for foreign policy action
      const headline = action === 'trade_deal' ? `Canada signs trade deal with ${country}`
        : action === 'trade_decline' ? `Canada declines trade deal with ${country}`
        : action === 'military_alliance' ? `Canada forms military alliance with ${country}`
        : action === 'declare_war' ? `Canada declares war on ${country}`
        : action === 'peace_treaty' ? `Canada reaches peace agreement with ${country}`
        : `Canada foreign policy action: ${action} with ${country}`;

      generateAINews(supabase, `foreign_policy_${action}`, headline, prev.playerPartyId, prev.playerName, true, prev.stats, prev.currentWeek, 3).then(articles => {
        if (articles.length > 0) {
          setGameState(gs => { if (!gs) return gs; return { ...gs, newsHistory: [...articles, ...gs.newsHistory].slice(0, 60) }; });
        }
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
      const approvalPenalty = type === 'recess' ? -3 : 0;
      return {
        ...prev,
        parliamentInSession: type !== 'recess',
        stats: { ...prev.stats, approvalRating: Math.max(5, prev.stats.approvalRating + approvalPenalty) },
      };
    });
  }, []);

  const callEmergencySession = useCallback(() => {
    setGameState(prev => {
      if (!prev || !prev.isGoverning) return prev;
      return {
        ...prev,
        parliamentInSession: true,
        stats: { ...prev.stats, governmentApproval: Math.min(95, (prev.stats.governmentApproval || 0) + 5) },
      };
    });
  }, []);

  const callOppositionDay = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        stats: { ...prev.stats, partyStanding: Math.min(95, prev.stats.partyStanding + 3) },
      };
    });
  }, []);

  // ── By-Election ────────────────────────────────────────────────────────────────
  const completeByElection = useCallback((provinceCode: string, ridingName: string, won: boolean, playerPartyId: string, vacatingPartyId: string, candidateName: string) => {
    setByElectionTrigger(null);
    setGameState(prev => {
      if (!prev) return prev;
      const seatChange = won ? 1 : 0;
      const lostSeat = won && vacatingPartyId !== playerPartyId ? 1 : 0;
      const newSeats = { ...prev.seats };
      if (won && vacatingPartyId !== playerPartyId) {
        newSeats[playerPartyId] = (newSeats[playerPartyId] || 0) + 1;
        newSeats[vacatingPartyId] = Math.max(0, (newSeats[vacatingPartyId] || 0) - 1);
      } else if (!won && vacatingPartyId === playerPartyId) {
        // Defending and lost — someone else gains
        newSeats[playerPartyId] = Math.max(0, (newSeats[playerPartyId] || 0) - 1);
      }
      const approvalChange = won ? 2 : -2;
      return {
        ...prev,
        seats: newSeats,
        stats: {
          ...prev.stats,
          approvalRating: Math.max(5, Math.min(95, prev.stats.approvalRating + approvalChange)),
          partyStanding: Math.max(5, Math.min(95, prev.stats.partyStanding + (won ? 3 : -2))),
        },
      };
    });
  }, []);

  const dismissByElection = useCallback(() => {
    setByElectionTrigger(null);
  }, []);

  // ── Election ────────────────────────────────────────────────────────────────
  const startElectionCampaign = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      const campaign = initializeCampaign(prev.playerPartyId, prev.stats);
      setCampaignState(campaign);
      return { ...prev, inElection: true, electionWeek: 1 };
    });
  }, []);

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
      const maxSeats = Math.max(...Object.values(totalSeats));
      const playerWon = playerSeats >= MAJORITY_SEATS || playerSeats === maxSeats;
      const newProvincialSeats: Record<string, Record<string, number>> = {};
      preComputedResult.provinceResults.forEach(r => { newProvincialSeats[r.provinceCode] = r.seats; });
      // Auto-trigger leadership review if player lost election
      const autoLeadershipReview = !playerWon;
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
        inLeadershipReview: autoLeadershipReview,
        electionHistory: [...prev.electionHistory, { parliament: prev.parliamentNumber, week: prev.currentWeek, seats: totalSeats, playerSeats, won: playerWon, votePct: playerVotePct }],
        cabinet: playerWon ? prev.cabinet : [],
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
        stats: {
          ...prev.stats,
          approvalRating: Math.min(95, Math.max(5, prev.stats.approvalRating + effect)),
          partyStanding: Math.min(95, Math.max(5, prev.stats.partyStanding + Math.round(effect * 0.5))),
        },
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

  // ── Party Leader Deals ───────────────────────────────────────────────────────
  const makePartyDeal = useCallback((rivalPartyId: string, dealType: string, accepted: boolean) => {
    setGameState(prev => {
      if (!prev || !accepted) return prev;
      // No-confidence deal: enable confidence vote immediately
      if (dealType === 'no_confidence') {
        return { ...prev, confidenceVoteAvailable: true, confidenceVoteCooldown: 0 };
      }
      // Bill support or coalition: minor approval boost
      return {
        ...prev,
        stats: {
          ...prev.stats,
          partyStanding: Math.min(95, prev.stats.partyStanding + 3),
          approvalRating: Math.min(95, prev.stats.approvalRating + 1),
        },
      };
    });
  }, []);

  const callGoverningConfidenceVote = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      return { ...prev, inElection: true, electionWeek: 1, electionTriggerReason: 'pm_dissolution', electionTriggered: true };
    });
  }, []);

  return (
    <GameContext.Provider value={{
      gameState,
      bills,
      campaignState,
      electionResult,
      shadowCabinet,
      byElectionTrigger,
      startGame,
      advanceWeek,
      voteOnBill,
      accelerateBill,
      createBill,
      callConfidenceVote,
      dissolveParliament,
      appointMinister,
      fireMinister,
      instructMinister,
      appointShadowMinister,
      removeShadowMinister,
      issuePressStatement,
      submitPolicy,
      startElectionCampaign,
      campaignInRegion,
      completeCampaign,
      answerQuestion,
      resolveLeadershipReview,
      callGoverningConfidenceVote,
      completeByElection,
      dismissByElection,
      executeForeignPolicy,
      scheduleSession,
      callEmergencySession,
      callOppositionDay,
      makePartyDeal,
    }}>
      {children}
    </GameContext.Provider>
  );
}
