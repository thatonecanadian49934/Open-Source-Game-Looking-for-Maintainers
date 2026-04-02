// Powered by OnSpace.AI
export type BillStage = 
  | 'house_first_reading'
  | 'house_second_reading'
  | 'committee'
  | 'house_third_reading'
  | 'senate_first_reading'
  | 'senate_second_reading'
  | 'senate_committee'
  | 'senate_third_reading'
  | 'royal_assent'
  | 'defeated';

export type BillType = 'government' | 'private_member' | 'opposition';

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
  defaultStageWeeks: number; // 6 weeks per stage
  amendments: string[];
  isPlayerBill: boolean;
  topic: string;
  fiscalImpact: string;
  passed: boolean;
}

export const BILL_STAGE_NAMES: Record<BillStage, string> = {
  house_first_reading: 'House — First Reading',
  house_second_reading: 'House — Second Reading',
  committee: 'House Committee',
  house_third_reading: 'House — Third Reading',
  senate_first_reading: 'Senate — First Reading',
  senate_second_reading: 'Senate — Second Reading',
  senate_committee: 'Senate Committee',
  senate_third_reading: 'Senate — Third Reading',
  royal_assent: 'Royal Assent',
  defeated: 'Defeated',
};

export const BILL_STAGE_ORDER: BillStage[] = [
  'house_first_reading',
  'house_second_reading',
  'committee',
  'house_third_reading',
  'senate_first_reading',
  'senate_second_reading',
  'senate_committee',
  'senate_third_reading',
  'royal_assent',
];

export const SAMPLE_BILLS: Omit<Bill, 'id' | 'introducedWeek' | 'stageStartWeek' | 'playerVote' | 'votesFor' | 'votesAgainst' | 'weeksAtStage'>[] = [
  {
    title: 'Bill C-42: Carbon Border Adjustment Mechanism Act',
    description: 'Implements a carbon border adjustment to level the playing field for Canadian manufacturers competing against countries without equivalent carbon pricing.',
    type: 'government',
    stage: 'house_second_reading',
    sponsorParty: 'liberal',
    sponsorName: 'Hon. Sarah Chen, Minister of Environment',
    accelerated: false,
    defaultStageWeeks: 6,
    amendments: [],
    isPlayerBill: false,
    topic: 'Environment',
    fiscalImpact: '+$2.1B revenue over 5 years',
    passed: false,
  },
  {
    title: 'Bill C-88: National Pharmacare Act',
    description: 'Establishes a universal single-payer national pharmacare program covering all prescription medications for Canadian residents.',
    type: 'government',
    stage: 'committee',
    sponsorParty: 'ndp',
    sponsorName: 'Rachel Lavoie, NDP Leader',
    accelerated: false,
    defaultStageWeeks: 6,
    amendments: ['Amendment to exclude brand-name drugs in first phase', 'Amendment requiring provincial opt-in mechanism'],
    isPlayerBill: false,
    topic: 'Health',
    fiscalImpact: '-$15B/year',
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
    defaultStageWeeks: 6,
    amendments: [],
    isPlayerBill: false,
    topic: 'Justice',
    fiscalImpact: 'Neutral',
    passed: false,
  },
  {
    title: 'Private Members\' Bill C-398: Housing Affordability Act',
    description: 'Removes federal GST from all new housing construction under $1.5M to stimulate housing supply.',
    type: 'private_member',
    stage: 'house_first_reading',
    sponsorParty: 'conservative',
    sponsorName: 'MP David Park',
    accelerated: false,
    defaultStageWeeks: 6,
    amendments: [],
    isPlayerBill: false,
    topic: 'Housing',
    fiscalImpact: '-$4.2B/year',
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
    defaultStageWeeks: 6,
    amendments: ['Amendment expanding CSIS surveillance powers'],
    isPlayerBill: false,
    topic: 'Security',
    fiscalImpact: '+$500M/year',
    passed: false,
  },
];

export function initializeBills(currentWeek: number): Bill[] {
  return SAMPLE_BILLS.map((bill, idx) => ({
    ...bill,
    id: `bill_${idx + 1}`,
    introducedWeek: Math.max(1, currentWeek - (idx * 3)),
    stageStartWeek: Math.max(1, currentWeek - 2),
    playerVote: null,
    votesFor: 100 + Math.floor(Math.random() * 100),
    votesAgainst: 80 + Math.floor(Math.random() * 80),
    weeksAtStage: Math.floor(Math.random() * 4),
  }));
}

export function advanceBills(bills: Bill[], currentWeek: number, playerSeats: number, totalSeats: number): Bill[] {
  return bills.map(bill => {
    if (bill.stage === 'royal_assent' || bill.stage === 'defeated') return bill;
    
    const weeksAtStage = currentWeek - bill.stageStartWeek;
    const shouldAdvance = bill.accelerated || weeksAtStage >= bill.defaultStageWeeks;
    
    if (!shouldAdvance) return { ...bill, weeksAtStage };
    
    const currentIdx = BILL_STAGE_ORDER.indexOf(bill.stage);
    if (currentIdx === -1) return bill;
    
    // Vote simulation for reading stages
    const isReadingStage = bill.stage.includes('reading');
    if (isReadingStage) {
      // Simulate parliamentary vote
      const forPct = 0.4 + Math.random() * 0.3;
      const votesFor = Math.floor(totalSeats * forPct);
      const votesAgainst = totalSeats - votesFor;
      
      if (votesFor <= votesAgainst && bill.stage === 'house_third_reading') {
        return { ...bill, stage: 'defeated', weeksAtStage, votesFor, votesAgainst };
      }
      
      if (votesFor <= votesAgainst && bill.stage === 'senate_third_reading') {
        return { ...bill, stage: 'defeated', weeksAtStage, votesFor, votesAgainst };
      }
      
      const nextStage = BILL_STAGE_ORDER[currentIdx + 1] || 'royal_assent';
      return { 
        ...bill, 
        stage: nextStage as BillStage, 
        stageStartWeek: currentWeek, 
        weeksAtStage: 0,
        votesFor,
        votesAgainst,
        passed: nextStage === 'royal_assent',
      };
    }
    
    // Auto-advance non-voting stages
    const nextStage = BILL_STAGE_ORDER[currentIdx + 1] || 'royal_assent';
    return { 
      ...bill, 
      stage: nextStage as BillStage, 
      stageStartWeek: currentWeek, 
      weeksAtStage: 0,
      passed: nextStage === 'royal_assent',
    };
  });
}

export function createPlayerBill(
  title: string,
  description: string,
  topic: string,
  fiscalImpact: string,
  playerPartyId: string,
  playerName: string,
  currentWeek: number
): Bill {
  return {
    id: `player_bill_${Date.now()}`,
    title,
    description,
    type: 'government',
    stage: 'house_first_reading',
    introducedWeek: currentWeek,
    stageStartWeek: currentWeek,
    sponsorParty: playerPartyId,
    sponsorName: playerName,
    votesFor: 0,
    votesAgainst: 0,
    playerVote: 'yea',
    accelerated: false,
    defaultStageWeeks: 6,
    weeksAtStage: 0,
    amendments: [],
    isPlayerBill: true,
    topic,
    fiscalImpact,
    passed: false,
  };
}

export function getStageProgress(bill: Bill): number {
  const idx = BILL_STAGE_ORDER.indexOf(bill.stage);
  if (idx === -1) return 100;
  return ((idx) / (BILL_STAGE_ORDER.length - 1)) * 100;
}
