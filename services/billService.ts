
// Powered by OnSpace.AI
import { MP } from '@/services/gameEngine';

export type BillStage =
  | 'house_first_reading'
  | 'house_second_reading'
  | 'house_committee'
  | 'house_third_reading'
  | 'senate_first_reading'
  | 'senate_second_reading'
  | 'senate_committee'
  | 'senate_third_reading'
  | 'royal_assent'
  | 'defeated';

export type BillType = 'government' | 'private_member' | 'opposition';

export interface BillVoteRecord {
  stage: BillStage;
  week: number;
  yea: number;
  nay: number;
  majority: boolean;
}

export interface Bill {
  id: string;
  title: string;
  description: string;
  type: BillType;
  stage: BillStage;
  introducedWeek: number;
  stageStartWeek: number;
  sponsorParty: string;
  sponsorName: string;
  votesFor: number;
  votesAgainst: number;
  playerVote: 'yea' | 'nay' | 'abstain' | null;
  accelerated: boolean;
  weeksAtStage: number;
  defaultStageWeeks: number; // 6 weeks default per stage
  amendments: string[];
  isPlayerBill: boolean;
  topic: string;
  fiscalImpact: string;
  passed: boolean;
  voteHistory: BillVoteRecord[];
  // Progress within pipeline — readable label for each stage
  stageWeeksRemaining: number;
  scheduledVoteWeek: number | null;
}

export const BILL_STAGE_NAMES: Record<BillStage, string> = {
  house_first_reading:  'House — 1st Reading',
  house_second_reading: 'House — 2nd Reading',
  house_committee:      'House Committee',
  house_third_reading:  'House — 3rd Reading',
  senate_first_reading: 'Senate — 1st Reading',
  senate_second_reading:'Senate — 2nd Reading',
  senate_committee:     'Senate Committee',
  senate_third_reading: 'Senate — 3rd Reading',
  royal_assent:         'Royal Assent ✓',
  defeated:             'Defeated ✗',
};

export const BILL_STAGE_SHORT: Record<BillStage, string> = {
  house_first_reading:  'H.1R',
  house_second_reading: 'H.2R',
  house_committee:      'H.Com',
  house_third_reading:  'H.3R',
  senate_first_reading: 'S.1R',
  senate_second_reading:'S.2R',
  senate_committee:     'S.Com',
  senate_third_reading: 'S.3R',
  royal_assent:         'Royal',
  defeated:             'Dead',
};

// The ordered legislative pipeline — does NOT include terminal states
export const BILL_STAGE_ORDER: BillStage[] = [
  'house_first_reading',
  'house_second_reading',
  'house_committee',
  'house_third_reading',
  'senate_first_reading',
  'senate_second_reading',
  'senate_committee',
  'senate_third_reading',
  'royal_assent',
];

// Which stages require a formal vote
export const VOTE_STAGES: Set<BillStage> = new Set([
  'house_second_reading',
  'house_third_reading',
  'senate_second_reading',
  'senate_third_reading',
]);

// Which stages are debating stages that can be accelerated
export const ACCELERATABLE_STAGES: Set<BillStage> = new Set([
  'house_first_reading',
  'house_second_reading',
  'house_committee',
  'house_third_reading',
  'senate_first_reading',
  'senate_second_reading',
  'senate_committee',
  'senate_third_reading',
]);

export const DEFAULT_STAGE_WEEKS = 6;

export const SAMPLE_BILLS: Omit<Bill, 'id' | 'introducedWeek' | 'stageStartWeek' | 'playerVote' | 'votesFor' | 'votesAgainst' | 'weeksAtStage' | 'voteHistory' | 'stageWeeksRemaining' | 'scheduledVoteWeek'>[] = [
  {
    title: 'Bill C-42: Carbon Border Adjustment Mechanism Act',
    description: 'Implements a carbon border adjustment to level the playing field for Canadian manufacturers competing against countries without equivalent carbon pricing.',
    type: 'government',
    stage: 'house_second_reading',
    sponsorParty: 'liberal',
    sponsorName: 'Hon. Sarah Chen, Minister of Environment',
    accelerated: false,
    defaultStageWeeks: DEFAULT_STAGE_WEEKS,
    amendments: [],
    isPlayerBill: false,
    topic: 'Environment',
    fiscalImpact: '+$2.1B over 5 yrs',
    passed: false,
  },
  {
    title: 'Bill C-88: National Pharmacare Act',
    description: 'Establishes a universal single-payer national pharmacare program covering all prescription medications for Canadian residents.',
    type: 'government',
    stage: 'house_committee',
    sponsorParty: 'ndp',
    sponsorName: 'Rachel Lavoie, NDP Leader',
    accelerated: false,
    defaultStageWeeks: DEFAULT_STAGE_WEEKS,
    amendments: ['Exclude brand-name drugs in phase 1', 'Require provincial opt-in mechanism'],
    isPlayerBill: false,
    topic: 'Health',
    fiscalImpact: '-$15B/yr',
    passed: false,
  },
  {
    title: 'Bill C-15: Online Harms Reduction Act',
    description: 'Requires social media platforms to remove harmful content within 24 hours or face significant fines.',
    type: 'government',
    stage: 'house_third_reading',
    sponsorParty: 'liberal',
    sponsorName: 'Hon. James Wilson, Minister of Justice',
    accelerated: false,
    defaultStageWeeks: DEFAULT_STAGE_WEEKS,
    amendments: [],
    isPlayerBill: false,
    topic: 'Justice',
    fiscalImpact: 'Neutral',
    passed: false,
  },
  {
    title: "Private Members' Bill C-398: Housing Affordability Act",
    description: 'Removes federal GST from all new housing construction under $1.5M to stimulate housing supply.',
    type: 'private_member',
    stage: 'house_first_reading',
    sponsorParty: 'conservative',
    sponsorName: 'MP David Park (CPC)',
    accelerated: false,
    defaultStageWeeks: DEFAULT_STAGE_WEEKS,
    amendments: [],
    isPlayerBill: false,
    topic: 'Housing',
    fiscalImpact: '-$4.2B/yr',
    passed: false,
  },
  {
    title: 'Bill C-71: Canadian Sovereignty and Security Act',
    description: 'Strengthens national security protocols against foreign interference in democratic institutions.',
    type: 'opposition',
    stage: 'senate_second_reading',
    sponsorParty: 'conservative',
    sponsorName: 'Pierre Fontaine, CPC Leader',
    accelerated: false,
    defaultStageWeeks: DEFAULT_STAGE_WEEKS,
    amendments: ['Expanding CSIS surveillance powers'],
    isPlayerBill: false,
    topic: 'Security',
    fiscalImpact: '+$500M/yr',
    passed: false,
  },
  {
    title: "Private Members' Bill C-201: Anti-Scab Labour Act",
    description: 'Prohibits the use of replacement workers during federally regulated labour disputes, strengthening workers rights.',
    type: 'private_member',
    stage: 'house_committee',
    sponsorParty: 'ndp',
    sponsorName: 'MP Priya Sharma (NDP)',
    accelerated: false,
    defaultStageWeeks: DEFAULT_STAGE_WEEKS,
    amendments: [],
    isPlayerBill: false,
    topic: 'Labour',
    fiscalImpact: 'Neutral',
    passed: false,
  },
];

export function initializeBills(currentWeek: number): Bill[] {
  return SAMPLE_BILLS.map((bill, idx) => {
    const introducedWeek = Math.max(1, currentWeek - idx * 4);
    const stageStartWeek = Math.max(1, currentWeek - Math.floor(Math.random() * 4));
    const weeksAtStage = currentWeek - stageStartWeek;
    const stageWeeksRemaining = Math.max(0, DEFAULT_STAGE_WEEKS - weeksAtStage);
    return {
      ...bill,
      id: `bill_${idx + 1}`,
      introducedWeek,
      stageStartWeek,
      playerVote: null,
      votesFor: 100 + Math.floor(Math.random() * 80),
      votesAgainst: 70 + Math.floor(Math.random() * 80),
      weeksAtStage,
      voteHistory: [],
      stageWeeksRemaining,
      scheduledVoteWeek: stageWeeksRemaining === 0 ? currentWeek : null,
    };
  });
}

export function advanceBills(
  bills: Bill[],
  currentWeek: number,
  playerPartyId: string,
  playerSeats: number,
  totalSeats: number,
  isGoverning: boolean,
  mpRoster: MP[]
): Bill[] {
  return bills.map(bill => {
    if (bill.stage === 'royal_assent' || bill.stage === 'defeated') return bill;

    const weeksAtStage = currentWeek - bill.stageStartWeek;
    const effectiveWeeks = bill.accelerated ? bill.defaultStageWeeks + 1 : bill.defaultStageWeeks;
    const shouldAdvance = weeksAtStage >= effectiveWeeks;
    const stageWeeksRemaining = Math.max(0, effectiveWeeks - weeksAtStage);

    if (!shouldAdvance) {
      return { ...bill, weeksAtStage, stageWeeksRemaining };
    }

    const currentIdx = BILL_STAGE_ORDER.indexOf(bill.stage);
    if (currentIdx === -1) return bill;

    // Stages that require a vote
    const requiresVote = VOTE_STAGES.has(bill.stage);

    if (requiresVote) {
      const result = simulateParliamentaryVote(bill, playerPartyId, playerSeats, totalSeats, isGoverning, mpRoster);

      const voteRecord: BillVoteRecord = {
        stage: bill.stage,
        week: currentWeek,
        yea: result.yea,
        nay: result.nay,
        majority: result.passed,
      };

      // Key defeat points: 2nd reading (House), 3rd reading (House), 3rd reading (Senate)
      if (!result.passed && (bill.stage === 'house_third_reading' || bill.stage === 'senate_third_reading')) {
        return {
          ...bill,
          stage: 'defeated',
          weeksAtStage,
          votesFor: result.yea,
          votesAgainst: result.nay,
          voteHistory: [...bill.voteHistory, voteRecord],
          stageWeeksRemaining: 0,
          scheduledVoteWeek: null,
        };
      }

      // Failed 2nd reading — send back to committee or defeat
      if (!result.passed && bill.stage === 'house_second_reading') {
        return {
          ...bill,
          stage: 'defeated',
          weeksAtStage,
          votesFor: result.yea,
          votesAgainst: result.nay,
          voteHistory: [...bill.voteHistory, voteRecord],
          stageWeeksRemaining: 0,
          scheduledVoteWeek: null,
        };
      }

      if (!result.passed && bill.stage === 'senate_second_reading') {
        // Senate can defeat here too
        return {
          ...bill,
          stage: 'defeated',
          weeksAtStage,
          votesFor: result.yea,
          votesAgainst: result.nay,
          voteHistory: [...bill.voteHistory, voteRecord],
          stageWeeksRemaining: 0,
          scheduledVoteWeek: null,
        };
      }

      const nextStage = BILL_STAGE_ORDER[currentIdx + 1];
      // Type assertion because we know nextStage will be a BillStage or undefined, which handles the 'royal_assent' case
      const stageToSet = nextStage === undefined ? 'royal_assent' : nextStage;

      return {
        ...bill,
        stage: stageToSet,
        stageStartWeek: currentWeek,
        weeksAtStage: 0,
        votesFor: result.yea,
        votesAgainst: result.nay,
        passed: stageToSet === 'royal_assent',
        voteHistory: [...bill.voteHistory, voteRecord],
        accelerated: false,
        stageWeeksRemaining: DEFAULT_STAGE_WEEKS,
        scheduledVoteWeek: null,
      };
    }

    // Non-vote stage — auto advance (1st reading, committee)
    const nextStage = BILL_STAGE_ORDER[currentIdx + 1];
    // Type assertion for consistency
    const stageToSet = nextStage === undefined ? 'royal_assent' : nextStage;
    return {
      ...bill,
      stage: stageToSet,
      stageStartWeek: currentWeek,
      weeksAtStage: 0,
      passed: stageToSet === 'royal_assent',
      accelerated: false,
      stageWeeksRemaining: DEFAULT_STAGE_WEEKS,
      scheduledVoteWeek: null,
    };
  });
}

function simulateParliamentaryVote(
  bill: Bill,
  playerPartyId: string,
  playerSeats: number,
  totalSeats: number,
  isGoverning: boolean,
  mpRoster: MP[]
): { passed: boolean; yea: number; nay: number } {
  // Player vote influence: if player voted, 85% of their party follows
  const playerVoteYea = bill.playerVote === 'yea';
  const playerVoteNay = bill.playerVote === 'nay';

  // Base support probability by bill type and governing status
  let baseSupportProb: number;
  if (bill.type === 'government') {
    baseSupportProb = isGoverning ? 0.72 : 0.38;
  } else if (bill.type === 'private_member') {
    baseSupportProb = 0.50 + (Math.random() * 0.2 - 0.1);
  } else {
    // opposition bill
    baseSupportProb = isGoverning ? 0.35 : 0.60;
  }

  // Player vote shifts the base probability
  if (playerVoteYea) baseSupportProb = Math.min(0.95, baseSupportProb + 0.12);
  if (playerVoteNay) baseSupportProb = Math.max(0.05, baseSupportProb - 0.12);

  // Whip system & potential rebellion
  const lowLoyaltyMembers = mpRoster.filter(mp => mp.loyalty < 45 && mp.status === 'active').length;
  const totalActive = mpRoster.filter(mp => mp.status === 'active').length || 1;
  const rebellionFactor = lowLoyaltyMembers / totalActive;
  const whipBonus = (mpRoster.filter(mp => mp.role === (isGoverning ? 'government' : 'opposition') && mp.status === 'active').length / Math.max(1, totalActive)) * 0.15;

  const traitInfluence = -rebellionFactor * 0.25 + whipBonus;

  // Randomise slightly
  const finalProb = Math.max(0.02, Math.min(0.98, baseSupportProb + traitInfluence + (Math.random() * 0.14 - 0.07)));

  const yea = Math.round(totalSeats * finalProb);
  const nay = totalSeats - yea;

  return { passed: yea > nay, yea, nay };
}

export function accelerateBillNow(bill: Bill, currentWeek: number): Bill {
  // Government can force a vote immediately — set stage to expire this week
  return {
    ...bill,
    accelerated: true,
    stageStartWeek: currentWeek - bill.defaultStageWeeks,
    stageWeeksRemaining: 0,
    scheduledVoteWeek: currentWeek,
  };
}

export function createPlayerBill(
  title: string,
  description: string,
  topic: string,
  fiscalImpact: string,
  playerPartyId: string,
  playerName: string,
  currentWeek: number,
  isGoverning: boolean,
  type: BillType = isGoverning ? 'government' : 'private_member'
): Bill {
  return {
    id: `player_bill_${Date.now()}`,
    title,
    description,
    type,
    stage: 'house_first_reading',
    introducedWeek: currentWeek,
    stageStartWeek: currentWeek,
    sponsorParty: playerPartyId,
    sponsorName: playerName,
    votesFor: 0,
    votesAgainst: 0,
    playerVote: 'yea',
    accelerated: false,
    defaultStageWeeks: DEFAULT_STAGE_WEEKS,
    weeksAtStage: 0,
    amendments: [],
    isPlayerBill: true,
    topic,
    fiscalImpact,
    passed: false,
    voteHistory: [],
    stageWeeksRemaining: DEFAULT_STAGE_WEEKS,
    scheduledVoteWeek: null,
  };
}

export function getStageProgress(bill: Bill): number {
  if (bill.stage === 'royal_assent' || bill.passed) return 100;
  if (bill.stage === 'defeated') return 0;
  const idx = BILL_STAGE_ORDER.indexOf(bill.stage);
  if (idx === -1) return 0;
  // Progress = stage index + fractional progress within stage
  const stageProgress = idx / (BILL_STAGE_ORDER.length - 1);
  const withinStage = Math.min(1, bill.weeksAtStage / bill.defaultStageWeeks);
  return Math.min(99, ((idx + withinStage) / (BILL_STAGE_ORDER.length - 1)) * 100);
}

export function getBillStageDescription(stage: BillStage): string {
  const descriptions: Record<BillStage, string> = {
    house_first_reading: 'Bill formally introduced and title read. No debate or vote yet.',
    house_second_reading: 'Debate on the principle of the bill. Vote required to proceed.',
    house_committee: 'Detailed clause-by-clause review by parliamentary committee. Amendments possible.',
    house_third_reading: 'Final House vote on amended bill. Must pass to go to Senate.',
    senate_first_reading: 'Introduced in Senate. No debate yet.',
    senate_second_reading: 'Senate debate on principle. Vote required.',
    senate_committee: 'Senate committee review. Further amendments possible.',
    senate_third_reading: 'Final Senate vote. Royal Assent follows if passed.',
    royal_assent: 'Bill has received Royal Assent and is now law.',
    defeated: 'Bill was defeated and will not proceed further.',
  };
  return descriptions[stage] || '';
}

export function getPipelineSteps(): { stage: BillStage; label: string; chamber: 'house' | 'senate' | 'crown' }[] {
  return [
    { stage: 'house_first_reading',  label: '1st Reading',  chamber: 'house' },
    { stage: 'house_second_reading', label: '2nd Reading',  chamber: 'house' },
    { stage: 'house_committee',      label: 'Committee',    chamber: 'house' },
    { stage: 'house_third_reading',  label: '3rd Reading',  chamber: 'house' },
    { stage: 'senate_first_reading', label: '1st Reading',  chamber: 'senate' },
    { stage: 'senate_second_reading',label: '2nd Reading',  chamber: 'senate' },
    { stage: 'senate_committee',     label: 'Committee',    chamber: 'senate' },
    { stage: 'senate_third_reading', label: '3rd Reading',  chamber: 'senate' },
    { stage: 'royal_assent',         label: 'Royal Assent', chamber: 'crown' },
  ];
}
