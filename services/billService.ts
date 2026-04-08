// Powered by OnSpace.AI — Updated bill service
// Government bills = only minister-sponsored; all others = Private Members Bills
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

// UPDATED: Only 'government' (minister-introduced) | 'private_member' (all others including opposition)
export type BillType = 'government' | 'private_member';

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
  prioritized: boolean;   // opposition can prioritize their PMBs
  weeksAtStage: number;
  defaultStageWeeks: number;
  amendments: string[];
  isPlayerBill: boolean;
  topic: string;
  fiscalImpact: string;
  passed: boolean;
  voteHistory: BillVoteRecord[];
  stageWeeksRemaining: number;
  scheduledVoteWeek: number | null;
  isMinisterSponsored: boolean; // true = government bill (minister introduced)
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

export const VOTE_STAGES: Set<BillStage> = new Set([
  'house_second_reading',
  'house_third_reading',
  'senate_second_reading',
  'senate_third_reading',
]);

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

// Updated sample bills — government bills are minister-sponsored only
export const SAMPLE_BILLS: Omit<Bill, 'id' | 'introducedWeek' | 'stageStartWeek' | 'playerVote' | 'votesFor' | 'votesAgainst' | 'weeksAtStage' | 'voteHistory' | 'stageWeeksRemaining' | 'scheduledVoteWeek' | 'prioritized'>[] = [
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
    isMinisterSponsored: true,
  },
  {
    title: 'Bill C-88: National Pharmacare Act',
    description: 'Establishes a universal single-payer national pharmacare program covering all prescription medications for Canadian residents.',
    type: 'government',
    stage: 'house_committee',
    sponsorParty: 'liberal',
    sponsorName: 'Hon. David Park, Minister of Health',
    accelerated: false,
    defaultStageWeeks: DEFAULT_STAGE_WEEKS,
    amendments: ['Exclude brand-name drugs in phase 1', 'Require provincial opt-in mechanism'],
    isPlayerBill: false,
    topic: 'Health',
    fiscalImpact: '-$15B/yr',
    passed: false,
    isMinisterSponsored: true,
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
    isMinisterSponsored: true,
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
    isMinisterSponsored: false,
  },
  {
    title: "Private Members' Bill C-71: Canadian Sovereignty and Security Act",
    description: 'Strengthens national security protocols against foreign interference in democratic institutions.',
    type: 'private_member',
    stage: 'senate_second_reading',
    sponsorParty: 'conservative',
    sponsorName: 'MP Pierre Fontaine (CPC)',
    accelerated: false,
    defaultStageWeeks: DEFAULT_STAGE_WEEKS,
    amendments: ['Expanding CSIS surveillance powers'],
    isPlayerBill: false,
    topic: 'Security',
    fiscalImpact: '+$500M/yr',
    passed: false,
    isMinisterSponsored: false,
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
    isMinisterSponsored: false,
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
      prioritized: false,
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
  isGoverning: boolean
): Bill[] {
  return bills.map(bill => {
    if (bill.stage === 'royal_assent' || bill.stage === 'defeated') return bill;

    const weeksAtStage = currentWeek - bill.stageStartWeek;
    // Prioritized PMBs advance faster (like closure)
    const effectiveWeeks = bill.accelerated || bill.prioritized ? bill.defaultStageWeeks + 1 : bill.defaultStageWeeks;
    const shouldAdvance = weeksAtStage >= effectiveWeeks;
    const stageWeeksRemaining = Math.max(0, effectiveWeeks - weeksAtStage);

    if (!shouldAdvance) {
      return { ...bill, weeksAtStage, stageWeeksRemaining };
    }

    const currentIdx = BILL_STAGE_ORDER.indexOf(bill.stage);
    if (currentIdx === -1) return bill;

    const requiresVote = VOTE_STAGES.has(bill.stage);

    if (requiresVote) {
      const result = simulateParliamentaryVote(bill, playerPartyId, playerSeats, totalSeats, isGoverning);

      const voteRecord: BillVoteRecord = {
        stage: bill.stage,
        week: currentWeek,
        yea: result.yea,
        nay: result.nay,
        majority: result.passed,
      };

      if (!result.passed && (bill.stage === 'house_third_reading' || bill.stage === 'senate_third_reading' || bill.stage === 'house_second_reading' || bill.stage === 'senate_second_reading')) {
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

      const nextStage = BILL_STAGE_ORDER[currentIdx + 1] as BillStage;

      return {
        ...bill,
        stage: nextStage || 'royal_assent',
        stageStartWeek: currentWeek,
        weeksAtStage: 0,
        votesFor: result.yea,
        votesAgainst: result.nay,
        passed: nextStage === 'royal_assent',
        voteHistory: [...bill.voteHistory, voteRecord],
        accelerated: false,
        prioritized: false,
        stageWeeksRemaining: DEFAULT_STAGE_WEEKS,
        scheduledVoteWeek: null,
      };
    }

    // Non-vote stage — auto advance
    const nextStage = BILL_STAGE_ORDER[currentIdx + 1] as BillStage || 'royal_assent';
    return {
      ...bill,
      stage: nextStage,
      stageStartWeek: currentWeek,
      weeksAtStage: 0,
      passed: nextStage === 'royal_assent',
      accelerated: false,
      prioritized: false,
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
  isGoverning: boolean
): { passed: boolean; yea: number; nay: number } {
  const playerVoteYea = bill.playerVote === 'yea';
  const playerVoteNay = bill.playerVote === 'nay';

  let baseSupportProb: number;
  if (bill.type === 'government' && bill.isMinisterSponsored) {
    baseSupportProb = isGoverning ? 0.72 : 0.38;
  } else {
    // All PMBs (including opposition) — free vote, more variable
    baseSupportProb = 0.45 + (Math.random() * 0.25 - 0.1);
    // Prioritized opposition PMBs get a small boost
    if (bill.prioritized && !isGoverning) baseSupportProb += 0.08;
  }

  if (playerVoteYea) baseSupportProb = Math.min(0.95, baseSupportProb + 0.12);
  if (playerVoteNay) baseSupportProb = Math.max(0.05, baseSupportProb - 0.12);

  const finalProb = Math.max(0.02, Math.min(0.98, baseSupportProb + (Math.random() * 0.14 - 0.07)));
  const yea = Math.round(totalSeats * finalProb);
  const nay = totalSeats - yea;

  return { passed: yea > nay, yea, nay };
}

export function accelerateBillNow(bill: Bill, currentWeek: number): Bill {
  return {
    ...bill,
    accelerated: true,
    stageStartWeek: currentWeek - bill.defaultStageWeeks,
    stageWeeksRemaining: 0,
    scheduledVoteWeek: currentWeek,
  };
}

export function prioritizeBillNow(bill: Bill, currentWeek: number): Bill {
  return {
    ...bill,
    prioritized: true,
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
  sponsorName: string,
  currentWeek: number,
  isGovernmentBill: boolean
): Bill {
  return {
    id: `player_bill_${Date.now()}`,
    title,
    description,
    // Government bill ONLY if governing AND minister selected
    type: isGovernmentBill ? 'government' : 'private_member',
    stage: 'house_first_reading',
    introducedWeek: currentWeek,
    stageStartWeek: currentWeek,
    sponsorParty: playerPartyId,
    sponsorName: sponsorName,
    votesFor: 0,
    votesAgainst: 0,
    playerVote: 'yea',
    accelerated: false,
    prioritized: false,
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
    isMinisterSponsored: isGovernmentBill,
  };
}

export function getStageProgress(bill: Bill): number {
  if (bill.stage === 'royal_assent' || bill.passed) return 100;
  if (bill.stage === 'defeated') return 0;
  const idx = BILL_STAGE_ORDER.indexOf(bill.stage);
  if (idx === -1) return 0;
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

export function getBillTypeLabel(bill: Bill): string {
  if (bill.type === 'government' && bill.isMinisterSponsored) return 'Government Bill';
  return "Private Member's Bill";
}

export function getBillTypeColor(bill: Bill): string {
  if (bill.type === 'government' && bill.isMinisterSponsored) return '#D71920'; // liberal red
  return '#3B82F6'; // info blue for PMBs
}
