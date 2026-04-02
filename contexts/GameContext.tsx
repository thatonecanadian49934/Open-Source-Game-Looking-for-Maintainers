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

  // Governing confidence trigger
  callGoverningConfidenceVote: () => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [campaignState, setCampaignState] = useState<CampaignState | null>(null);
  const [electionResult, setElectionResult] = useState<ElectionNightResult | null>(null);
  const [shadowCabinet, setShadowCabinet] = useState<ShadowCabinetMember[]>([]);

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
  }, []);

  // ── Advance Week ────────────────────────────────────────────────────────────
  const advanceWeek = useCallback((eventChoices: Record<string, string>) => {
    setGameState(prev => {
      if (!prev) return prev;

      // Generate event-choice news articles (AI-powered async, non-blocking)
      Object.entries(eventChoices).forEach(([eventId, choiceId]) => {
        const event = prev.currentEvents.find(e => e.id === eventId);
        const choice = event?.choices.find(c => c.id === choiceId);
        if (event && choice) {
          // Fire and forget — AI news in background
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
                return {
                  ...gs,
                  newsHistory: [...articles, ...gs.newsHistory].slice(0, 60),
                };
              });
            }
          });
        }
      });

      const newState = processWeek(prev, eventChoices);

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
      const rand = Math.random();
      const passed = govSeats < MAJORITY_SEATS && rand > 0.6;

      result = {
        passed,
        message: passed
          ? 'The government has lost the confidence of the House. Parliament is dissolved. An election has been called.'
          : 'The government survived the confidence vote. Parliament continues.',
      };

      if (passed) {
        return {
          ...prev,
          inElection: true,
          electionWeek: 1,
          electionTriggerReason: 'confidence_vote',
          electionTriggered: true,
          confidenceVoteCooldown: 12,
        };
      }
      return { ...prev, confidenceVoteCooldown: 12 };
    });

    return result;
  }, []);

  const dissolveParliament = useCallback(() => {
    setGameState(prev => {
      if (!prev || !prev.isGoverning) return prev;
      return {
        ...prev,
        inElection: true,
        electionWeek: 1,
        electionTriggerReason: 'pm_dissolution',
        electionTriggered: true,
      };
    });
  }, []);

  // ── Cabinet (Governing) ─────────────────────────────────────────────────────
  const appointMinister = useCallback((portfolio: string, name: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const existingIdx = prev.cabinet.findIndex(m => m.portfolio === portfolio);
      const newMember: CabinetMember = {
        portfolio,
        name,
        loyalty: 70 + Math.floor(Math.random() * 20),
        competence: 60 + Math.floor(Math.random() * 30),
      };
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

      // Trigger AI news in background
      generateAINews(
        supabase,
        'minister_directive',
        `Minister ${minister.name} received directive on ${portfolio}: "${instruction.substring(0, 80)}"`,
        prev.playerPartyId,
        prev.playerName,
        true,
        prev.stats,
        prev.currentWeek,
        2
      ).then(articles => {
        if (articles.length > 0) {
          setGameState(gs => {
            if (!gs) return gs;
            return { ...gs, newsHistory: [...articles, ...gs.newsHistory].slice(0, 60) };
          });
        }
      });

      return {
        ...prev,
        stats: {
          ...prev.stats,
          governmentApproval: Math.min(95, (prev.stats.governmentApproval || 0) + loyaltyBonus),
        },
      };
    });
  }, [supabase]);

  // ── Shadow Cabinet (Opposition) ─────────────────────────────────────────────
  const appointShadowMinister = useCallback((portfolio: string, name: string) => {
    setShadowCabinet(prev => {
      const existingIdx = prev.findIndex(m => m.portfolio === portfolio);
      const member: ShadowCabinetMember = {
        portfolio,
        name,
        loyalty: 65 + Math.floor(Math.random() * 25),
        competence: 55 + Math.floor(Math.random() * 35),
      };
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = member;
        return updated;
      }
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

      // AI news in background
      generateAINews(
        supabase,
        'press_statement',
        statement.substring(0, 150),
        prev.playerPartyId,
        prev.playerName,
        prev.isGoverning,
        prev.stats,
        prev.currentWeek,
        4
      ).then(articles => {
        if (articles.length > 0) {
          setGameState(gs => {
            if (!gs) return gs;
            return { ...gs, newsHistory: [...articles, ...gs.newsHistory].slice(0, 60) };
          });
        } else {
          // Fallback to static
          const staticArticles = generatePressStatementReaction(statement, prev.playerPartyId, prev.playerName, prev.currentWeek);
          setGameState(gs => {
            if (!gs) return gs;
            return { ...gs, newsHistory: [...staticArticles, ...gs.newsHistory].slice(0, 60) };
          });
        }
      });

      return {
        ...prev,
        stats: {
          ...prev.stats,
          approvalRating: Math.min(95, prev.stats.approvalRating + approvalChange),
          partyStanding: Math.min(95, prev.stats.partyStanding + 1),
        },
      };
    });
  }, [supabase]);

  const submitPolicy = useCallback((policyText: string) => {
    setGameState(prev => {
      if (!prev) return prev;

      generateAINews(
        supabase,
        'policy',
        `${PARTIES.find(p => p.id === prev.playerPartyId)?.shortName} releases new policy: "${policyText.substring(0, 100)}"`,
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
        } else {
          const staticArticles = generatePolicyNews(policyText, prev.playerPartyId, prev.playerName, prev.currentWeek);
          setGameState(gs => {
            if (!gs) return gs;
            return { ...gs, newsHistory: [...staticArticles, ...gs.newsHistory].slice(0, 60) };
          });
        }
      });

      return {
        ...prev,
        stats: {
          ...prev.stats,
          approvalRating: Math.min(95, prev.stats.approvalRating + 3),
          partyStanding: Math.min(95, prev.stats.partyStanding + 2),
        },
      };
    });
  }, [supabase]);

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
      preComputedResult.provinceResults.forEach(r => {
        newProvincialSeats[r.provinceCode] = r.seats;
      });

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
        inLeadershipReview: !playerWon && playerVotePct < 25,
        electionHistory: [
          ...prev.electionHistory,
          {
            parliament: prev.parliamentNumber,
            week: prev.currentWeek,
            seats: totalSeats,
            playerSeats,
            won: playerWon,
            votePct: playerVotePct,
          },
        ],
        cabinet: playerWon ? prev.cabinet : [],
      };

      setBills(initializeBills(1));
      setCampaignState(null);
      // Clear shadow cabinet if they won (become governing)
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
        stats: {
          ...prev.stats,
          partyStanding: survive ? 60 : 30,
          approvalRating: survive ? prev.stats.approvalRating + 5 : prev.stats.approvalRating - 10,
        },
      };
    });
  }, []);

  const callGoverningConfidenceVote = useCallback(() => {
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        inElection: true,
        electionWeek: 1,
        electionTriggerReason: 'pm_dissolution',
        electionTriggered: true,
      };
    });
  }, []);

  return (
    <GameContext.Provider value={{
      gameState,
      bills,
      campaignState,
      electionResult,
      shadowCabinet,
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
    }}>
      {children}
    </GameContext.Provider>
  );
}
