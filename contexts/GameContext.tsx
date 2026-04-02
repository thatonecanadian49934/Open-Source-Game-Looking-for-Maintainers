// Powered by OnSpace.AI
import React, { createContext, useState, ReactNode, useCallback } from 'react';
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
import { Bill, initializeBills, advanceBills, createPlayerBill } from '@/services/billService';
import { 
  CampaignState, 
  ElectionNightResult,
  initializeCampaign, 
  simulateElectionResults,
  campaignInProvince,
  generatePolicyNews,
} from '@/services/electionService';
import { generatePressStatementReaction, generatePolicyNews as policyNewsService } from '@/services/newsService';
import { PARTIES } from '@/constants/parties';
import { TOTAL_SEATS, MAJORITY_SEATS } from '@/constants/provinces';

export interface GameContextType {
  gameState: GameState | null;
  bills: Bill[];
  campaignState: CampaignState | null;
  electionResult: ElectionNightResult | null;
  
  // Setup
  startGame: (partyId: string, playerName: string) => void;
  
  // Weekly actions
  advanceWeek: (eventChoices: Record<string, string>) => void;
  
  // Parliament
  voteOnBill: (billId: string, vote: 'yea' | 'nay' | 'abstain') => void;
  accelerateBill: (billId: string) => void;
  createBill: (title: string, description: string, topic: string, fiscalImpact: string) => void;
  callConfidenceVote: () => { passed: boolean; message: string };
  dissolveParliament: () => void;
  
  // Cabinet
  appointMinister: (portfolio: string, name: string) => void;
  fireMinister: (portfolio: string) => void;
  instructMinister: (portfolio: string, instruction: string) => void;
  
  // Communication
  issuePressStatement: (statement: string) => void;
  submitPolicy: (policyText: string) => void;
  
  // Election
  startElectionCampaign: () => void;
  campaignInRegion: (provinceCode: string) => void;
  completeCampaign: () => void;
  
  // Question Period
  answerQuestion: (question: string, answer: string, performance: 'excellent' | 'good' | 'poor') => void;
  
  // Leadership Review
  resolveLeadershipReview: (survive: boolean) => void;
  
  // Confidence Vote
  callGoverningConfidenceVote: () => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [campaignState, setCampaignState] = useState<CampaignState | null>(null);
  const [electionResult, setElectionResult] = useState<ElectionNightResult | null>(null);

  const startGame = useCallback((partyId: string, playerName: string) => {
    const state = initializeGame(partyId, playerName);
    const initialBills = initializeBills(1);
    setGameState(state);
    setBills(initialBills);
    setCampaignState(null);
    setElectionResult(null);
  }, []);

  const advanceWeek = useCallback((eventChoices: Record<string, string>) => {
    setGameState(prev => {
      if (!prev) return prev;
      const newState = processWeek(prev, eventChoices);
      
      // Advance bills
      setBills(prevBills => advanceBills(
        prevBills, 
        newState.currentWeek, 
        newState.seats[newState.playerPartyId] || 0,
        TOTAL_SEATS
      ));
      
      return newState;
    });
  }, []);

  const voteOnBill = useCallback((billId: string, vote: 'yea' | 'nay' | 'abstain') => {
    setBills(prev => prev.map(b => b.id === billId ? { ...b, playerVote: vote } : b));
  }, []);

  const accelerateBill = useCallback((billId: string) => {
    setBills(prev => prev.map(b => b.id === billId ? { ...b, accelerated: true } : b));
  }, []);

  const createBill = useCallback((title: string, description: string, topic: string, fiscalImpact: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const newBill = createPlayerBill(title, description, topic, fiscalImpact, prev.playerPartyId, prev.playerName, prev.currentWeek);
      setBills(prevBills => [newBill, ...prevBills]);
      return prev;
    });
  }, []);

  const callConfidenceVote = useCallback((): { passed: boolean; message: string } => {
    let result = { passed: false, message: '' };
    
    setGameState(prev => {
      if (!prev) return prev;
      
      // Simulate confidence vote
      const govSeats = Math.max(...Object.values(prev.seats));
      const rand = Math.random();
      const passed = govSeats < MAJORITY_SEATS && rand > 0.6; // More likely to succeed if minority gov
      
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
      
      // Instruction has effect on stats
      const loyaltyBonus = minister.loyalty > 70 ? 2 : -1;
      const newStats = {
        ...prev.stats,
        governmentApproval: Math.min(95, (prev.stats.governmentApproval || 0) + loyaltyBonus),
      };
      
      const newsArticle: NewsArticle = {
        id: `minister_${Date.now()}`,
        week: prev.currentWeek,
        outlet: 'CBC News',
        headline: `${minister.name} receives new direction from party leader on ${portfolio} file`,
        body: `The ${portfolio} Minister has been given new instructions by the party leader regarding: "${instruction.substring(0, 100)}". Parliamentary observers note this signals a shift in government priorities.`,
        sentiment: 'neutral',
        topic: 'Cabinet',
      };
      
      return {
        ...prev,
        stats: newStats,
        newsHistory: [newsArticle, ...prev.newsHistory].slice(0, 50),
      };
    });
  }, []);

  const issuePressStatement = useCallback((statement: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const articles = generatePressStatementReaction(statement, prev.playerPartyId, prev.playerName, prev.currentWeek);
      const approvalChange = statement.length > 100 ? 2 : 1;
      
      return {
        ...prev,
        stats: {
          ...prev.stats,
          approvalRating: Math.min(95, prev.stats.approvalRating + approvalChange),
          partyStanding: Math.min(95, prev.stats.partyStanding + 1),
        },
        newsHistory: [...articles, ...prev.newsHistory].slice(0, 50),
      };
    });
  }, []);

  const submitPolicy = useCallback((policyText: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      const articles = policyNewsService(policyText, prev.playerPartyId, prev.playerName, prev.currentWeek);
      
      return {
        ...prev,
        stats: {
          ...prev.stats,
          approvalRating: Math.min(95, prev.stats.approvalRating + 3),
          partyStanding: Math.min(95, prev.stats.partyStanding + 2),
        },
        newsHistory: [...articles, ...prev.newsHistory].slice(0, 50),
      };
    });
  }, []);

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

  const completeCampaign = useCallback(() => {
    setGameState(prev => {
      if (!prev || !campaignState) return prev;
      
      const result = simulateElectionResults(
        prev.playerPartyId,
        prev.stats,
        campaignState,
        prev.seats
      );
      
      setElectionResult(result);
      
      const playerWon = result.playerSeats >= MAJORITY_SEATS || 
        result.playerSeats === Math.max(...Object.values(result.totalSeats));
      
      const newState: GameState = {
        ...prev,
        seats: result.totalSeats,
        isGoverning: playerWon,
        isMajority: result.playerSeats >= MAJORITY_SEATS,
        isOpposition: !playerWon,
        inElection: false,
        electionWeek: 0,
        electionTriggered: false,
        currentWeek: 1,
        parliamentNumber: prev.parliamentNumber + 1,
        inLeadershipReview: !playerWon && result.playerVotePct < 25,
        electionHistory: [
          ...prev.electionHistory,
          {
            parliament: prev.parliamentNumber,
            week: prev.currentWeek,
            seats: result.totalSeats,
            playerSeats: result.playerSeats,
            won: playerWon,
            votePct: result.playerVotePct,
          },
        ],
      };
      
      // Reset bills for new parliament
      setBills(initializeBills(1));
      
      return newState;
    });
  }, [campaignState]);

  const answerQuestion = useCallback((question: string, answer: string, performance: 'excellent' | 'good' | 'poor') => {
    setGameState(prev => {
      if (!prev) return prev;
      const effect = performance === 'excellent' ? 5 : performance === 'good' ? 2 : -4;
      
      return {
        ...prev,
        stats: {
          ...prev.stats,
          approvalRating: Math.min(95, Math.max(5, prev.stats.approvalRating + effect)),
          partyStanding: Math.min(95, Math.max(5, prev.stats.partyStanding + (effect * 0.5))),
        },
      };
    });
  }, []);

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
