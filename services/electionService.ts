// Powered by OnSpace.AI
import { REAL_PROVINCES, MAJORITY_SEATS, TOTAL_SEATS } from '@/constants/provinces';
import { PARTIES } from '@/constants/parties';
import { PlayerStats, SeatCount, ProvinceSeatCount } from './gameEngine';

export interface ElectionPoll {
  week: number;
  results: Record<string, number>; // partyId -> percentage
}

export interface ProvinceResult {
  provinceCode: string;
  seats: SeatCount;
  voteShare: Record<string, number>;
  declared: boolean;
}

export interface ElectionNightResult {
  provinceResults: ProvinceResult[];
  totalSeats: SeatCount;
  declared: boolean;
  winner: string | null;
  playerSeats: number;
  playerVotePct: number;
}

export interface CampaignState {
  week: number; // 1-4
  playerPartyId: string;
  polls: ElectionPoll[];
  campaignedProvinces: string[];
  debateCompleted: boolean;
  debateScore: number; // 0-100
  campaignEvents: CampaignEvent[];
  rallyCosts: number;
  approval: Record<string, number>; // province -> approval
}

export interface CampaignEvent {
  id: string;
  province: string;
  type: 'rally' | 'gaffe' | 'endorsement' | 'attack_ad' | 'media_buy';
  effect: number;
  description: string;
}

export interface DebateQuestion {
  id: string;
  question: string;
  topic: string;
  answers: DebateAnswer[];
}

export interface DebateAnswer {
  id: string;
  text: string;
  effect: number; // -10 to +10 approval impact
  boldness: 'safe' | 'moderate' | 'bold';
}

export function generateElectionPolls(
  playerPartyId: string,
  stats: PlayerStats,
  currentSeats: SeatCount,
  campaignBonus: number = 0
): ElectionPoll {
  const total = 100;
  const results: Record<string, number> = {};
  
  const baseShare = stats.approvalRating * 0.5 + campaignBonus;
  results[playerPartyId] = Math.max(5, Math.min(55, baseShare));
  
  let remaining = 100 - results[playerPartyId];
  const otherParties = PARTIES.filter(p => p.id !== playerPartyId);
  
  otherParties.forEach((party, idx) => {
    if (idx === otherParties.length - 1) {
      results[party.id] = Math.max(1, remaining);
    } else {
      const share = Math.floor((party.baseSupport / 100) * remaining * (0.7 + Math.random() * 0.6));
      results[party.id] = Math.max(1, Math.min(remaining - otherParties.length + idx + 1, share));
      remaining -= results[party.id];
    }
  });
  
  return { week: Date.now(), results };
}

export function simulateElectionResults(
  playerPartyId: string,
  stats: PlayerStats,
  campaignState: CampaignState,
  currentSeats: SeatCount
): ElectionNightResult {
  const baseVoteShare = (stats.approvalRating * 0.4 + campaignState.debateScore * 0.2 + 15);
  const playerVotePct = Math.max(5, Math.min(55, baseVoteShare));
  
  const provinceResults: ProvinceResult[] = [];
  const totalSeats: SeatCount = {};
  
  PARTIES.forEach(p => { totalSeats[p.id] = 0; });
  totalSeats['independent'] = 0;
  
  REAL_PROVINCES.forEach(province => {
    // Calculate provincial vote shares
    const provinceCampaignBonus = campaignState.campaignedProvinces.includes(province.code) ? 5 : 0;
    const provincePlayerShare = Math.max(5, Math.min(60, playerVotePct + provinceCampaignBonus + (Math.random() * 10 - 5)));
    
    const voteShare: Record<string, number> = {};
    voteShare[playerPartyId] = provincePlayerShare;
    
    let remaining = 100 - provincePlayerShare;
    const otherParties = PARTIES.filter(p => p.id !== playerPartyId);
    
    otherParties.forEach((party, idx) => {
      if (idx === otherParties.length - 1) {
        voteShare[party.id] = Math.max(0, remaining);
      } else {
        const share = (party.baseSupport / 100) * remaining * (0.8 + Math.random() * 0.4);
        voteShare[party.id] = Math.max(0, Math.min(remaining, share));
        remaining -= voteShare[party.id];
      }
    });
    
    // Convert vote shares to seats using FPTP
    const seats: SeatCount = {};
    PARTIES.forEach(p => { seats[p.id] = 0; });
    
    for (let seat = 0; seat < province.seats; seat++) {
      const winner = simulateSeat(voteShare);
      seats[winner] = (seats[winner] || 0) + 1;
      totalSeats[winner] = (totalSeats[winner] || 0) + 1;
    }
    
    provinceResults.push({
      provinceCode: province.code,
      seats,
      voteShare,
      declared: false,
    });
  });
  
  const playerSeats = totalSeats[playerPartyId] || 0;
  const maxSeats = Math.max(...Object.values(totalSeats));
  const winnerParty = Object.keys(totalSeats).find(k => totalSeats[k] === maxSeats) || playerPartyId;
  
  return {
    provinceResults,
    totalSeats,
    declared: false,
    winner: winnerParty,
    playerSeats,
    playerVotePct,
  };
}

function simulateSeat(voteShare: Record<string, number>): string {
  const rand = Math.random() * 100;
  let cumulative = 0;
  
  for (const [partyId, share] of Object.entries(voteShare)) {
    cumulative += share;
    if (rand <= cumulative) return partyId;
  }
  
  return Object.keys(voteShare)[0];
}

export const DEBATE_QUESTIONS: DebateQuestion[] = [
  {
    id: 'q1',
    question: 'Canada\'s inflation rate has hit 4.5%. What is your plan to bring costs down for Canadians?',
    topic: 'Economy',
    answers: [
      {
        id: 'a1',
        text: 'We will implement targeted tax relief for middle-class families and work with the Bank of Canada to control monetary policy.',
        effect: 4,
        boldness: 'moderate',
      },
      {
        id: 'a2',
        text: 'My plan involves cutting $50 billion in government waste and returning money directly to Canadians.',
        effect: 6,
        boldness: 'bold',
      },
      {
        id: 'a3',
        text: 'We need to study the data further and consult with economists before making specific commitments.',
        effect: -3,
        boldness: 'safe',
      },
    ],
  },
  {
    id: 'q2',
    question: 'Indigenous communities still lack clean drinking water. What will you do differently from past governments?',
    topic: 'Indigenous Affairs',
    answers: [
      {
        id: 'a1',
        text: 'We will commit to eliminating all long-term boil water advisories within 18 months and enshrine water rights in law.',
        effect: 8,
        boldness: 'bold',
      },
      {
        id: 'a2',
        text: 'This requires a comprehensive whole-of-government approach with dedicated funding and Indigenous partnership.',
        effect: 3,
        boldness: 'moderate',
      },
      {
        id: 'a3',
        text: 'The previous government failed. We will release a detailed plan within 90 days of taking office.',
        effect: 1,
        boldness: 'safe',
      },
    ],
  },
  {
    id: 'q3',
    question: 'Canada\'s relationship with the United States is strained. How will you handle cross-border relations?',
    topic: 'Foreign Affairs',
    answers: [
      {
        id: 'a1',
        text: 'Canada will stand firm. We will not capitulate to economic threats and will diversify our trade relationships globally.',
        effect: 7,
        boldness: 'bold',
      },
      {
        id: 'a2',
        text: 'We need to re-engage Washington at the highest levels and rebuild the relationship on mutual respect.',
        effect: 4,
        boldness: 'moderate',
      },
      {
        id: 'a3',
        text: 'Canadian foreign policy must be independent. I will convene a trade security summit within my first 100 days.',
        effect: 2,
        boldness: 'safe',
      },
    ],
  },
  {
    id: 'q4',
    question: 'Young Canadians cannot afford homes. Will you commit to specific housing targets?',
    topic: 'Housing',
    answers: [
      {
        id: 'a1',
        text: 'We commit to building 500,000 homes per year and will tie infrastructure funding to municipal zoning reform.',
        effect: 9,
        boldness: 'bold',
      },
      {
        id: 'a2',
        text: 'We will create a National Housing Authority and end exclusionary zoning nationwide.',
        effect: 6,
        boldness: 'moderate',
      },
      {
        id: 'a3',
        text: 'Housing is primarily a provincial responsibility, but we will work with partners to increase supply.',
        effect: -4,
        boldness: 'safe',
      },
    ],
  },
];

export function initializeCampaign(playerPartyId: string, stats: PlayerStats): CampaignState {
  return {
    week: 1,
    playerPartyId,
    polls: [generateElectionPolls(playerPartyId, stats, {}, 0)],
    campaignedProvinces: [],
    debateCompleted: false,
    debateScore: 50,
    campaignEvents: [],
    rallyCosts: 0,
    approval: {},
  };
}

export function campaignInProvince(
  campaign: CampaignState,
  provinceCode: string,
  stats: PlayerStats
): CampaignState {
  const effect = 3 + Math.random() * 4;
  const event: CampaignEvent = {
    id: `rally_${Date.now()}`,
    province: provinceCode,
    type: 'rally',
    effect,
    description: `Successful rally in ${provinceCode} boosts regional support by +${effect.toFixed(1)}%`,
  };
  
  return {
    ...campaign,
    campaignedProvinces: [...campaign.campaignedProvinces, provinceCode],
    campaignEvents: [...campaign.campaignEvents, event],
    rallyCosts: campaign.rallyCosts + 500000,
    approval: {
      ...campaign.approval,
      [provinceCode]: (campaign.approval[provinceCode] || 50) + effect,
    },
  };
}
