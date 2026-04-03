// Powered by OnSpace.AI
import { REAL_PROVINCES, MAJORITY_SEATS, TOTAL_SEATS } from '@/constants/provinces';
import { PARTIES, RIVAL_LEADERS } from '@/constants/parties';
import { assignCommitteesToMPs, advanceCommitteeWork, CommitteeSummary } from '@/services/committeeService';

export interface PlayerStats {
  approvalRating: number;        // 0-100
  partyStanding: number;         // 0-100
  governmentApproval: number;    // 0-100 (only if PM)
  gdp: number;                   // in billions
  gdpGrowth: number;             // percentage
  nationalDebt: number;          // in billions
  inflationRate: number;         // percentage
  unemploymentRate: number;      // percentage
}

export interface SeatCount {
  [partyId: string]: number;
}

export interface ProvinceSeatCount {
  [provinceCode: string]: SeatCount;
}

export interface RivalLeader {
  name: string;
  party: string;
  partyId: string;
  approval: number;
  aggressiveness: number;
}

export interface CabinetMember {
  portfolio: string;
  name: string;
  loyalty: number;
  competence: number;
}

export interface MP {
  id: string;
  name: string;
  partyId: string;
  loyalty: number;
  role: 'government' | 'opposition' | 'independent';
  status: 'active' | 'rebellious' | 'expelled' | 'crossed';
}

export interface CommitteeSummary {
  id: string;
  code: string;
  name: string;
  mandate: string;
  members: string[];
  chairId: string | null;
  billsUnderReview: string[];
  activeStudies: Array<{
    id: string;
    title: string;
    topic: string;
    launchedWeek: number;
    status: 'ongoing' | 'completed';
    reportSummary?: string;
  }>;
}

export interface GameState {
  // Setup
  playerPartyId: string;
  playerName: string;
  gameStarted: boolean;
  
  // Time
  currentWeek: number;         // 1-208 per parliament
  totalWeeks: number;          // total elapsed
  parliamentNumber: number;
  inElection: boolean;
  electionWeek: number;        // week within election (1-4)
  electionTriggered: boolean;
  electionTriggerReason: string;
  
  // Parliament
  seats: SeatCount;
  provincialSeats: ProvinceSeatCount;
  isGoverning: boolean;
  isMajority: boolean;
  isOpposition: boolean;
  
  // Stats
  stats: PlayerStats;
  
  // Events
  currentEvents: GameEvent[];
  processedEventIds: string[];
  
  // Cabinet
  cabinet: CabinetMember[];
  
  // Rivals
  rivals: RivalLeader[];
  
  // Confidence
  confidenceVoteAvailable: boolean;
  confidenceVoteCooldown: number;
  
  // Leadership
  inLeadershipReview: boolean;
  leadershipReviewVotes: { support: number; oppose: number };
  
  // History
  electionHistory: ElectionResult[];
  newsHistory: NewsArticle[];
  
  // Parliament schedule
  parliamentInSession: boolean;
  nextSessionWeek: number;
  oppositionDaysUsed: number;
  oppositionDaysAvailable: number;
  mainEstimatesTabled: boolean;
  supplementaryEstimatesTabled: boolean;
  springEconomicStatementTabled: boolean;
  supplyDeadlineWeek: number;
  supplyPassed: boolean;
  confidenceCrisisTriggered: boolean;
  mpRoster: MP[];
  committees: CommitteeSummary[];
  lastThisWeekInParliamentWeek: number;

  // Additional parliamentary fields
  thronesSpeechDelivered?: boolean;
  budgetTabled?: boolean;
  prorogued?: boolean;
  isMajority?: boolean;
}

export interface GameEvent {
  id: string;
  week: number;
  title: string;
  description: string;
  type: 'economic' | 'political' | 'social' | 'international' | 'environmental' | 'emergency' | 'scandal' | 'opportunity';
  choices: EventChoice[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  expires: number; // week it expires
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  effects: Partial<PlayerStats & { seats: number; internalEffect: string }>;
  newsHeadline: string;
}

export interface ElectionResult {
  parliament: number;
  week: number;
  seats: SeatCount;
  playerSeats: number;
  won: boolean;
  votePct: number;
}

export interface NewsArticle {
  id: string;
  week: number;
  outlet: string;
  headline: string;
  body: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  topic: string;
}

export const NEWS_OUTLETS = [
  { name: 'CBC News', bias: 'centre' },
  { name: 'Globe and Mail', bias: 'centre-right' },
  { name: 'Toronto Star', bias: 'centre-left' },
  { name: 'National Post', bias: 'right' },
  { name: 'La Presse', bias: 'centre' },
  { name: 'CTV News', bias: 'centre' },
  { name: 'iPolitics', bias: 'centre' },
  { name: 'Rebel News', bias: 'far-right' },
];

export function initializeGame(playerPartyId: string, playerName: string): GameState {
  const party = PARTIES.find(p => p.id === playerPartyId)!;
  
  // Generate initial seat distribution
  const seats: SeatCount = {};
  const otherParties = PARTIES.filter(p => p.id !== playerPartyId);
  
  // Assign starting seats based on realistic distributions
  const startingSeats: Record<string, number> = {
    liberal: 155,
    conservative: 120,
    ndp: 40,
    bloc: 32,
    green: 3,
    ppc: 1,
    independent: 2,
  };
  
  PARTIES.forEach(p => {
    seats[p.id] = startingSeats[p.id] || 0;
  });
  seats['independent'] = 2;
  
  // Adjust player party seats
  const playerStartSeats = startingSeats[playerPartyId] || 30;
  seats[playerPartyId] = playerStartSeats;
  
  const isGoverning = playerStartSeats >= MAJORITY_SEATS || 
    (playerStartSeats > 0 && playerStartSeats >= Math.max(...Object.values(seats)));
  
  // Generate provincial seat distribution
  const provincialSeats = generateProvincialSeats(seats);
  
  // Generate rival leaders
  const rivals: RivalLeader[] = otherParties
    .filter(p => seats[p.id] > 0)
    .map(p => ({
      name: RIVAL_LEADERS[playerPartyId]?.find(r => r.includes(p.shortName)) || `${p.name} Leader`,
      party: p.name,
      partyId: p.id,
      approval: 30 + Math.random() * 30,
      aggressiveness: Math.random(),
    }));
  
  const largestPartySeats = Math.max(...Object.values(seats));
  const governingPartyId = Object.keys(seats).find(k => seats[k] === largestPartySeats) || playerPartyId;
  
  const cabinet: CabinetMember[] = isGoverning ? generateInitialCabinet() : [];
  
  const mpRoster = generateMPRoster(seats);
  const committees = generateCommitteeSummaries(mpRoster);

  return {
    playerPartyId,
    playerName,
    gameStarted: true,
    currentWeek: 1,
    totalWeeks: 1,
    parliamentNumber: 45,
    inElection: false,
    electionWeek: 0,
    electionTriggered: false,
    electionTriggerReason: '',
    seats,
    provincialSeats,
    isGoverning,
    isMajority: seats[playerPartyId] >= MAJORITY_SEATS,
    isOpposition: !isGoverning,
    oppositionDaysUsed: 0,
    oppositionDaysAvailable: 22,
    mainEstimatesTabled: false,
    supplementaryEstimatesTabled: false,
    springEconomicStatementTabled: false,
    supplyDeadlineWeek: 24,
    supplyPassed: false,
    confidenceCrisisTriggered: false,
    mpRoster,
    committees,
    stats: {
      approvalRating: party.baseSupport,
      partyStanding: 50,
      governmentApproval: isGoverning ? 45 : 0,
      gdp: 2200,
      gdpGrowth: 1.8,
      nationalDebt: 1200,
      inflationRate: 3.1,
      unemploymentRate: 5.8,
    },
    currentEvents: generateWeeklyEvents(1, playerPartyId, isGoverning),
    processedEventIds: [],
    cabinet,
    rivals,
    confidenceVoteAvailable: !isGoverning && !isMajorityGov(seats, playerPartyId),
    confidenceVoteCooldown: 0,
    inLeadershipReview: false,
    leadershipReviewVotes: { support: 0, oppose: 0 },
    electionHistory: [],
    newsHistory: [],
    parliamentInSession: true,
    nextSessionWeek: 1,
  };
}

function isMajorityGov(seats: SeatCount, playerPartyId: string): boolean {
  const govPartySeats = Math.max(...Object.values(seats));
  return govPartySeats >= MAJORITY_SEATS;
}

function generateInitialCabinet(): CabinetMember[] {
  const portfolios = [
    'Finance', 'Foreign Affairs', 'Immigration', 'Public Safety', 'Defence',
    'Health', 'Environment', 'Justice', 'Treasury Board', 'Transport'
  ];
  const firstNames = ['James', 'Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Emily', 'William', 'Amanda'];
  const lastNames = ['Chen', 'Williams', 'MacDonald', 'Tremblay', 'Singh', 'Okafor', 'Leblanc', 'Park', 'Wilson', 'Kumar'];
  
  return portfolios.map((portfolio, i) => ({
    portfolio,
    name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
    loyalty: 60 + Math.floor(Math.random() * 30),
    competence: 50 + Math.floor(Math.random() * 40),
  }));
}

function generateMPRoster(seats: SeatCount): MP[] {
  const mps: MP[] = [];
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jordan', 'Cameron', 'Drew', 'Sam'];
  const lastNames = ['Smith', 'Brown', 'Johnson', 'Martin', 'Lee', 'Thompson', 'Chen', 'MacDonald', 'Clark', 'Patel'];
  let nextId = 1;

  Object.entries(seats).forEach(([partyId, count]) => {
    for (let i = 0; i < count; i++) {
      const name = `${firstNames[(nextId + i) % firstNames.length]} ${lastNames[(nextId + i) % lastNames.length]}`;
      mps.push({
        id: `mp_${nextId++}`,
        name,
        partyId,
        loyalty: 30 + Math.floor(Math.random() * 65),
        role: partyId === 'independent' ? 'independent' : 'opposition',
        status: 'active',
      });
    }
  });

  // Mark governing party caucus MPs
  const governingParty = Object.entries(seats).sort((a, b) => b[1] - a[1])[0]?.[0];
  mps.forEach(mp => {
    if (mp.partyId === governingParty && governingParty !== 'independent') {
      mp.role = 'government';
    }
  });

  return mps;
}

function generateCommitteeSummaries(mpRoster: MP[]): CommitteeSummary[] {
  return assignCommitteesToMPs(mpRoster).map(c => ({ ...c }));
}

function generateProvincialSeats(seats: SeatCount): ProvinceSeatCount {
  const result: ProvinceSeatCount = {};
  
  REAL_PROVINCES.forEach(province => {
    result[province.code] = {};
    let remaining = province.seats;
    
    const partyIds = Object.keys(seats).filter(id => seats[id] > 0);
    partyIds.forEach((partyId, idx) => {
      if (idx === partyIds.length - 1) {
        result[province.code][partyId] = Math.max(0, remaining);
      } else {
        const share = Math.floor((seats[partyId] / TOTAL_SEATS) * province.seats * (0.8 + Math.random() * 0.4));
        const allocated = Math.min(share, remaining);
        result[province.code][partyId] = allocated;
        remaining -= allocated;
      }
    });
  });
  
  return result;
}

export function generateWeeklyEvents(week: number, playerPartyId: string, isGoverning: boolean): GameEvent[] {
  const allEvents = getEventPool(week, playerPartyId, isGoverning);
  const numEvents = 1 + Math.floor(Math.random() * 3);
  const shuffled = allEvents.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, numEvents).map(e => ({ ...e, week, expires: week + 2 }));
}

function getEventPool(week: number, playerPartyId: string, isGoverning: boolean): GameEvent[] {
  const events: GameEvent[] = [
    {
      id: `inflation_${week}`,
      week,
      title: 'Rising Inflation Concerns',
      description: 'Inflation hits 4.2%, squeezing middle-class families. Economists call for immediate action. Opposition parties are demanding a parliamentary response.',
      type: 'economic',
      urgency: 'high',
      expires: week + 2,
      choices: [
        {
          id: 'raise_rates',
          label: 'Support Rate Hikes',
          description: 'Back the Bank of Canada\'s aggressive rate increases',
          effects: { approvalRating: -3, governmentApproval: 2, gdpGrowth: -0.3, inflationRate: -0.8 },
          newsHeadline: `${PARTIES.find(p=>p.id===playerPartyId)?.shortName} backs tough medicine on inflation`,
        },
        {
          id: 'stimulus',
          label: 'Demand Stimulus Package',
          description: 'Push for targeted aid to struggling families',
          effects: { approvalRating: 4, nationalDebt: 15, inflationRate: 0.2 },
          newsHeadline: 'Party calls for billion-dollar relief package amid inflation crisis',
        },
        {
          id: 'no_comment',
          label: 'Monitor the Situation',
          description: 'Wait for more data before acting',
          effects: { partyStanding: -2 },
          newsHeadline: 'Party accused of inaction as inflation bites Canadians',
        },
      ],
    },
    {
      id: `healthcare_${week}`,
      week,
      title: 'Healthcare System Under Pressure',
      description: 'Emergency room wait times reach record highs. Provinces demand $50B in federal healthcare transfers.',
      type: 'social',
      urgency: 'high',
      expires: week + 2,
      choices: [
        {
          id: 'fund_health',
          label: 'Announce Major Investment',
          description: 'Commit to $25B in new healthcare funding',
          effects: { approvalRating: 6, nationalDebt: 25, governmentApproval: 5 },
          newsHeadline: 'Massive healthcare investment pledged amid system crisis',
        },
        {
          id: 'reform_health',
          label: 'Push for Systemic Reform',
          description: 'Advocate for efficiency reforms before new funding',
          effects: { approvalRating: 1, partyStanding: 3 },
          newsHeadline: 'Party pushes healthcare overhaul rather than cheque-writing',
        },
        {
          id: 'provinces_responsibility',
          label: 'Provincial Jurisdiction',
          description: 'Remind Canadians healthcare is provincial responsibility',
          effects: { approvalRating: -4, partyStanding: 2 },
          newsHeadline: 'Party faces backlash for "passing the buck" on healthcare',
        },
      ],
    },
    {
      id: `climate_${week}`,
      week,
      title: 'Wildfire Season Escalates',
      description: 'Record wildfires rage across BC and Alberta. Over 100,000 evacuated. Climate activists demand carbon pricing increases.',
      type: 'environmental',
      urgency: 'critical',
      expires: week + 1,
      choices: [
        {
          id: 'emergency_fund',
          label: 'Declare Climate Emergency',
          description: 'Deploy $2B emergency fund and National Guard resources',
          effects: { approvalRating: 7, nationalDebt: 2, governmentApproval: 8 },
          newsHeadline: 'Party calls for full emergency response to devastating wildfires',
        },
        {
          id: 'carbon_price',
          label: 'Fast-Track Carbon Reforms',
          description: 'Use crisis to push accelerated climate policy',
          effects: { approvalRating: 2, partyStanding: 4, gdpGrowth: -0.2 },
          newsHeadline: 'Party seizes wildfire crisis to push climate agenda',
        },
        {
          id: 'coordinate',
          label: 'Coordinate with Provinces',
          description: 'Work with provincial premiers on joint response',
          effects: { approvalRating: 3, partyStanding: 2 },
          newsHeadline: 'Federal-provincial cooperation praised in wildfire response',
        },
      ],
    },
    {
      id: `scandal_${week}`,
      week,
      title: 'Government Procurement Scandal',
      description: 'Documents show $500M contract awarded without competitive bidding. Opposition demands resignations. RCMP considering investigation.',
      type: 'scandal',
      urgency: 'critical',
      expires: week + 2,
      choices: [
        {
          id: 'demand_inquiry',
          label: 'Call Public Inquiry',
          description: 'Demand a full transparent public inquiry',
          effects: { approvalRating: 5, partyStanding: 8, governmentApproval: -6 },
          newsHeadline: 'Opposition demands full accountability over procurement scandal',
        },
        {
          id: 'internal_review',
          label: 'Support Internal Review',
          description: 'Back a streamlined internal government review',
          effects: { approvalRating: -2, partyStanding: -3 },
          newsHeadline: 'Party accused of shielding government over scandal',
        },
        {
          id: 'attack_gov',
          label: 'Aggressive Attack Campaign',
          description: 'Launch sustained political attack on government',
          effects: { approvalRating: 3, partyStanding: 5, governmentApproval: -8 },
          newsHeadline: 'Opposition goes on war footing over corruption allegations',
        },
      ],
    },
    {
      id: `trade_${week}`,
      week,
      title: 'US Trade Dispute Escalates',
      description: 'Washington threatens 25% tariffs on Canadian steel and aluminum. Business community urges swift diplomatic response.',
      type: 'international',
      urgency: 'high',
      expires: week + 2,
      choices: [
        {
          id: 'retaliate',
          label: 'Announce Retaliatory Tariffs',
          description: 'Hit back with proportional tariffs on US goods',
          effects: { approvalRating: 5, gdpGrowth: -0.4, governmentApproval: 4 },
          newsHeadline: 'Canada fights back with retaliatory tariff package',
        },
        {
          id: 'negotiate',
          label: 'Push for Negotiations',
          description: 'Seek emergency trade talks with US counterparts',
          effects: { approvalRating: 2, partyStanding: 2, gdpGrowth: 0 },
          newsHeadline: 'Canada seeks diplomatic solution to trade standoff',
        },
        {
          id: 'diversify',
          label: 'Announce Trade Diversification',
          description: 'Accelerate EU and Asia-Pacific trade partnerships',
          effects: { approvalRating: 3, gdpGrowth: 0.1, nationalDebt: 5 },
          newsHeadline: 'Party pivots to global trade diversification amid US tensions',
        },
      ],
    },
    {
      id: `housing_${week}`,
      week,
      title: 'Housing Affordability Crisis',
      description: 'Average home prices hit $1.2M in major cities. Young Canadians locked out of the market. CMHC warns of systemic risk.',
      type: 'economic',
      urgency: 'high',
      expires: week + 3,
      choices: [
        {
          id: 'build_housing',
          label: 'Announce 500K Housing Units',
          description: 'Massive federal investment in new housing construction',
          effects: { approvalRating: 8, nationalDebt: 30, gdpGrowth: 0.3 },
          newsHeadline: 'Bold half-million homes pledge tackles housing crisis head-on',
        },
        {
          id: 'foreign_buyer_ban',
          label: 'Extend Foreign Buyer Ban',
          description: 'Make permanent ban on foreign residential purchases',
          effects: { approvalRating: 5, partyStanding: 3 },
          newsHeadline: 'Party takes hard line on foreign buyers to cool housing market',
        },
        {
          id: 'zoning_reform',
          label: 'Push Zoning Reform',
          description: 'Tie infrastructure funding to municipal zoning changes',
          effects: { approvalRating: 3, partyStanding: 4, gdpGrowth: 0.2 },
          newsHeadline: 'Party plays long game with structural housing market reforms',
        },
      ],
    },
    {
      id: `emergency_act_${week}`,
      week,
      title: 'National Security Threat',
      description: 'CSIS reports coordinated foreign interference threatening critical infrastructure. RCMP asks for expanded powers.',
      type: 'emergency',
      urgency: 'critical',
      expires: week + 1,
      choices: [
        {
          id: 'invoke_emergency',
          label: 'Invoke Emergencies Act',
          description: 'Invoke the Emergencies Act to grant expanded powers',
          effects: { governmentApproval: -5, approvalRating: -3, partyStanding: 2 },
          newsHeadline: 'Emergencies Act invoked as security threat response draws fierce debate',
        },
        {
          id: 'normal_channels',
          label: 'Use Existing Security Laws',
          description: 'Work within existing CSIS and RCMP legal frameworks',
          effects: { approvalRating: 3, partyStanding: 3 },
          newsHeadline: 'Party defends civil liberties in measured security response',
        },
        {
          id: 'committee_review',
          label: 'Demand Parliamentary Oversight',
          description: 'Push for special parliamentary committee review',
          effects: { approvalRating: 2, partyStanding: 5 },
          newsHeadline: 'Opposition demands full parliamentary oversight of security response',
        },
      ],
    },
    {
      id: `immigration_${week}`,
      week,
      title: 'Record Immigration Numbers',
      description: 'Canada on pace for 500,000 new permanent residents. Integration services strained. Public opinion divided.',
      type: 'political',
      urgency: 'medium',
      expires: week + 2,
      choices: [
        {
          id: 'maintain_targets',
          label: 'Defend Immigration Levels',
          description: 'Stand firm on Canada\'s ambitious immigration targets',
          effects: { approvalRating: 1, partyStanding: 3, unemploymentRate: -0.2 },
          newsHeadline: 'Party defends immigration as key to Canada\'s economic future',
        },
        {
          id: 'reduce_targets',
          label: 'Call for Reduced Targets',
          description: 'Advocate for temporary reduction in immigration numbers',
          effects: { approvalRating: 4, partyStanding: -2, unemploymentRate: 0.1 },
          newsHeadline: 'Party breaks with consensus, calls for immigration pause',
        },
        {
          id: 'improve_integration',
          label: 'Focus on Integration Funding',
          description: 'Demand $5B investment in settlement and integration services',
          effects: { approvalRating: 5, nationalDebt: 5 },
          newsHeadline: 'Party calls for historic investment in newcomer support services',
        },
      ],
    },
  ];
  
  // Add special supply/estimates events
  if (week === 10) {
    events.push({
      id: `main_estimates_${week}`,
      week,
      title: 'Main Estimates Tabled',
      description: 'Main Estimates are presented to the House. Standing Committee on Finance will lead review. This is a critical supply vote matter.',
      type: 'economic',
      urgency: 'high',
      expires: week + 2,
      choices: [
        {
          id: 'approve_main_estimates',
          label: 'Support Main Estimates',
          description: 'Move to approve the government Estimates legislation in Committee and at report stage.',
          effects: { governmentApproval: 3, approvalRating: 2 },
          newsHeadline: 'Main Estimates approved by committee majority',
        },
        {
          id: 'contest_main_estimates',
          label: 'Challenge Main Estimates',
          description: 'Opposition pushes back and demands changes, risking confidence warning.',
          effects: { partyStanding: 4, governmentApproval: -4 },
          newsHeadline: 'Opposition fights Main Estimates in committee',
        },
      ],
    });
  }

  if (week === 20) {
    events.push({
      id: `supplementary_estimates_${week}`,
      week,
      title: 'Supplementary Estimates (A) Introduced',
      description: 'Supplementary Estimates are tabled to adjust spending mid-year. Finance committee review is required.',
      type: 'economic',
      urgency: 'medium',
      expires: week + 2,
      choices: [
        {
          id: 'approve_supplementary_estimates',
          label: 'Support Supplementary Estimates',
          description: 'Work with committee to pass the adjustments and maintain supply support.',
          effects: { governmentApproval: 2, partyStanding: 1 },
          newsHeadline: 'Supplementary Estimates move through Commons',
        },
        {
          id: 'oppose_supplementary_estimates',
          label: 'Oppose Supplementary Estimates',
          description: 'Use this to pressure the government and highlight fiscal risk.',
          effects: { partyStanding: 3, governmentApproval: -3 },
          newsHeadline: 'Opposition resists supplementary spending request',
        },
      ],
    });
  }

  if (week === 30) {
    events.push({
      id: `spring_economic_statement_${week}`,
      week,
      title: 'Spring Economic Statement',
      description: 'The government delivers the Spring Economic Statement and tables forecasts. Opposition may seize the narrative.',
      type: 'economic',
      urgency: 'high',
      expires: week + 3,
      choices: [
        {
          id: 'present_ses',
          label: 'Present Spring Economic Statement',
          description: 'Highlight economic plan and invest in growth.',
          effects: { governmentApproval: 4, gdpGrowth: 0.2 },
          newsHeadline: 'Government unveils Spring Economic Statement',
        },
        {
          id: 'delay_ses',
          label: 'Delay Spring Economic Statement',
          description: 'Argue for more data, but risk being seen as indecisive.',
          effects: { governmentApproval: -2, partyStanding: -1 },
          newsHeadline: 'Government delays Spring Economic Statement',
        },
      ],
    });
  }

  // Add governing-specific events
  if (isGoverning) {
    events.push({
      id: `budget_${week}`,
      week,
      title: 'Budget Preparation Season',
      description: 'Finance committee awaiting budget direction. Opposition parties accusing government of fiscal recklessness.',
      type: 'economic',
      urgency: 'medium',
      expires: week + 3,
      choices: [
        {
          id: 'austerity',
          label: 'Announce Austerity Measures',
          description: 'Deficit reduction through spending cuts',
          effects: { governmentApproval: -3, nationalDebt: -20, gdpGrowth: -0.2, approvalRating: -2 },
          newsHeadline: 'Government takes axe to spending in tough budget year',
        },
        {
          id: 'stimulus_budget',
          label: 'Expansionary Budget',
          description: 'Increased spending on social programs and infrastructure',
          effects: { governmentApproval: 5, nationalDebt: 40, gdpGrowth: 0.4, approvalRating: 4 },
          newsHeadline: 'Bold spending budget signals government\'s growth agenda',
        },
        {
          id: 'balanced',
          label: 'Balanced Approach',
          description: 'Targeted spending with modest deficit reduction',
          effects: { governmentApproval: 2, nationalDebt: 10, approvalRating: 2 },
          newsHeadline: 'Government charts middle course in measured fiscal plan',
        },
      ],
    });
  }
  
  return events;
}

export function processWeek(state: GameState, chosenEventChoices: Record<string, string>): GameState {
  let newState = { ...state };
  let statsChanges: Partial<PlayerStats> = {};
  
  // Process event choices
  state.currentEvents.forEach(event => {
    const choiceId = chosenEventChoices[event.id];
    if (choiceId) {
      const choice = event.choices.find(c => c.id === choiceId);
      if (choice) {
        Object.entries(choice.effects).forEach(([key, value]) => {
          if (key in newState.stats && typeof value === 'number') {
            (newState.stats as any)[key] = Math.max(0, Math.min(100, ((newState.stats as any)[key] || 0) + value));
          }
        });

        if (event.id.startsWith('main_estimates')) {
          newState.mainEstimatesTabled = true;
          if (choiceId === 'approve_main_estimates') newState.supplyPassed = true;
        }
        if (event.id.startsWith('supplementary_estimates')) {
          newState.supplementaryEstimatesTabled = true;
          if (choiceId === 'approve_supplementary_estimates') newState.supplyPassed = true;
        }
        if (event.id.startsWith('spring_economic_statement')) {
          newState.springEconomicStatementTabled = true;
          if (choiceId === 'present_ses') newState.supplyPassed = true;
        }

        // Generate news for this choice
        const outlet = NEWS_OUTLETS[Math.floor(Math.random() * NEWS_OUTLETS.length)];
        newState.newsHistory = [
          {
            id: `news_${Date.now()}_${Math.random()}`,
            week: state.currentWeek,
            outlet: outlet.name,
            headline: choice.newsHeadline,
            body: generateNewsBody(choice.newsHeadline, event, choice),
            sentiment: Object.values(choice.effects).reduce((a: number, b) => a + (typeof b === 'number' ? b : 0), 0) > 0 ? 'positive' : 'negative',
            topic: event.type,
          },
          ...newState.newsHistory,
        ].slice(0, 50);
      }
    }
  });
  
  // Natural drift
  newState.stats = applyNaturalDrift(newState.stats, newState.isGoverning);
  
  // Clamp stats
  newState.stats = clampStats(newState.stats);
  
  // Advance week
  newState.currentWeek += 1;
  newState.totalWeeks += 1;
  
  // Check for election (every 208 weeks = 4 years)
  if (newState.currentWeek > 208) {
    newState.electionTriggered = true;
    newState.electionTriggerReason = 'fixed_election_date';
    newState.inElection = true;
    newState.electionWeek = 1;
    newState.currentWeek = 1;
    newState.parliamentNumber += 1;
  }
  
  // Advance committee work each week
  newState.committees = newState.committees.map(c => advanceCommitteeWork(c, newState.currentWeek));

  // Generate new events
  newState.currentEvents = generateWeeklyEvents(newState.currentWeek, newState.playerPartyId, newState.isGoverning);

  // Supply deadline => confidence crisis if not secured by June-23 equivalent
  if (newState.currentWeek >= newState.supplyDeadlineWeek && !newState.supplyPassed && !newState.confidenceCrisisTriggered) {
    newState.confidenceCrisisTriggered = true;
    newState.confidenceVoteAvailable = true;
    newState.newsHistory = [
      {
        id: `news_supply_crisis_${Date.now()}`,
        week: newState.currentWeek,
        outlet: 'CBC News',
        headline: 'Supply Bill deadlock triggers confidence crisis',
        body: 'By June 23 equivalent, key supply measures remain unpassed. The opposition has tabled a confidence motion.',
        sentiment: 'negative',
        topic: 'political',
      },
      ...newState.newsHistory,
    ].slice(0, 60);
  }

  // Update confidence vote availability
  newState.confidenceVoteAvailable = newState.isOpposition && 
    !newState.isMajority && 
    newState.confidenceVoteCooldown <= 0 &&
    !newState.isMajority;
    
  if (newState.confidenceVoteCooldown > 0) {
    newState.confidenceVoteCooldown -= 1;
  }
  
  return newState;
}

function generateNewsBody(headline: string, event: GameEvent, choice: EventChoice): string {
  return `OTTAWA — ${headline.charAt(0).toUpperCase() + headline.slice(1)}. In a statement issued this week, the party outlined its position on ${event.title.toLowerCase()}, citing the need for decisive action. Political analysts are divided on the effectiveness of the approach. The decision is expected to have significant implications for the upcoming parliamentary session.`;
}

function applyNaturalDrift(stats: PlayerStats, isGoverning: boolean): PlayerStats {
  return {
    ...stats,
    gdp: stats.gdp + (Math.random() * 10 - 3),
    gdpGrowth: Math.max(-5, Math.min(8, stats.gdpGrowth + (Math.random() * 0.4 - 0.2))),
    nationalDebt: stats.nationalDebt + (Math.random() * 3),
    inflationRate: Math.max(0, Math.min(15, stats.inflationRate + (Math.random() * 0.2 - 0.1))),
    unemploymentRate: Math.max(2, Math.min(20, stats.unemploymentRate + (Math.random() * 0.2 - 0.1))),
  };
}

function clampStats(stats: PlayerStats): PlayerStats {
  return {
    approvalRating: Math.max(5, Math.min(95, stats.approvalRating)),
    partyStanding: Math.max(5, Math.min(95, stats.partyStanding)),
    governmentApproval: Math.max(0, Math.min(95, stats.governmentApproval)),
    gdp: Math.max(1000, stats.gdp),
    gdpGrowth: Math.max(-10, Math.min(15, stats.gdpGrowth)),
    nationalDebt: Math.max(0, stats.nationalDebt),
    inflationRate: Math.max(0, Math.min(30, stats.inflationRate)),
    unemploymentRate: Math.max(2, Math.min(25, stats.unemploymentRate)),
  };
}

