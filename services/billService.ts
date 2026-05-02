// Powered by OnSpace.AI — Updated bill service with AI-generated bills pool, proper stages, no penalties
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

// ONLY 'government' (minister-introduced) | 'private_member' (all others including opposition, backbench)
export type BillType = 'government' | 'private_member';

export interface BillVoteRecord {
  stage: BillStage;
  week: number;
  yea: number;
  nay: number;
  majority: boolean;
}

export interface BillAmendment {
  id: string;
  billId: string;
  clause: string;
  text: string;
  proposedBy: string;
  partyId: string;
  status: 'proposed' | 'adopted' | 'defeated';
  votes: { yea: number; nay: number };
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
  prioritized: boolean;   // opposition leader can prioritize their own PMBs — no penalty
  weeksAtStage: number;
  defaultStageWeeks: number;
  amendments: string[];           // legacy string amendments
  billAmendments: BillAmendment[]; // structured amendments from committee
  isPlayerBill: boolean;
  topic: string;
  fiscalImpact: string;
  passed: boolean;
  voteHistory: BillVoteRecord[];
  stageWeeksRemaining: number;
  scheduledVoteWeek: number | null;
  isMinisterSponsored: boolean; // true = government bill (minister introduced)
  isAIGenerated: boolean;       // from the AI-generated pool
  committeeReportTabled: boolean; // must be true before 3rd reading
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

export const COMMITTEE_STAGES: Set<BillStage> = new Set([
  'house_committee',
  'senate_committee',
]);

export const DEFAULT_STAGE_WEEKS = 6;

// ── 150 AI-Generated Bills Pool by Party ────────────────────────────────────
type AIBillTemplate = {
  title: string;
  description: string;
  topic: string;
  fiscalImpact: string;
  sponsorParty: string;
  sponsorName: string;
  type: BillType;
};

export const AI_GENERATED_BILLS: AIBillTemplate[] = [
  // ── LIBERAL ───────────────────────────────────────────────────────────────
  { title: 'Bill C-201: Universal Basic Income Pilot Act', description: 'Establishes a 3-year pilot program providing $1,500/month to 50,000 low-income Canadians to test UBI feasibility.', topic: 'Social Policy', fiscalImpact: '-$1.1B pilot', sponsorParty: 'liberal', sponsorName: 'Hon. Elena Vasquez, Minister of Finance', type: 'government' },
  { title: 'Bill C-202: Clean Electricity Transition Act', description: 'Mandates 100% clean electricity grid by 2035, providing $15B in federal investment for renewable infrastructure.', topic: 'Environment', fiscalImpact: '-$15B', sponsorParty: 'liberal', sponsorName: 'Hon. James Park, Minister of Natural Resources', type: 'government' },
  { title: 'Bill C-203: National Childcare Expansion Act', description: 'Extends $10/day childcare to all provinces, creating 250,000 new licensed childcare spaces.', topic: 'Social Policy', fiscalImpact: '-$9.2B/yr', sponsorParty: 'liberal', sponsorName: 'Hon. Mary Chen, Minister of Families', type: 'government' },
  { title: 'Bill C-204: Digital Charter Implementation Act', description: 'Creates comprehensive framework for data privacy rights, algorithmic transparency, and digital consumer protections.', topic: 'Technology', fiscalImpact: 'Neutral', sponsorParty: 'liberal', sponsorName: 'Hon. David Kim, Minister of ISED', type: 'government' },
  { title: 'Bill C-205: Reconciliation Action Fund Act', description: 'Allocates $6B over 5 years toward MMIWG recommendations, clean water on reserves, and Indigenous language revitalization.', topic: 'Indigenous Affairs', fiscalImpact: '-$6B', sponsorParty: 'liberal', sponsorName: 'Hon. Sarah Whitecrow, Minister of Crown-Indigenous Relations', type: 'government' },
  { title: 'Bill C-206: Affordable Housing Infrastructure Act', description: 'Creates a national housing co-investment fund targeting 150,000 new affordable units in 10 years.', topic: 'Housing', fiscalImpact: '-$12B', sponsorParty: 'liberal', sponsorName: 'Hon. Ahmed Hassan, Minister of Housing', type: 'government' },
  { title: 'Bill C-207: National Pharmacare Implementation Act', description: 'Launches a phased national pharmacare program beginning with diabetes medications and contraceptives.', topic: 'Health', fiscalImpact: '-$4.2B/yr', sponsorParty: 'liberal', sponsorName: 'Hon. Lisa Nguyen, Minister of Health', type: 'government' },
  { title: 'Bill C-208: Climate Accountability Act', description: 'Establishes legally binding emissions targets with annual reporting requirements and independent commissioner oversight.', topic: 'Environment', fiscalImpact: 'Neutral', sponsorParty: 'liberal', sponsorName: 'Hon. Marcus Tremblay, Minister of Environment', type: 'government' },
  { title: 'Bill C-209: Anti-Scab Labour Act', description: 'Prohibits the use of replacement workers in federally regulated industries during strikes and lockouts.', topic: 'Labour', fiscalImpact: 'Neutral', sponsorParty: 'liberal', sponsorName: 'Hon. Priya Sharma, Minister of Labour', type: 'government' },
  { title: 'Bill C-210: Online News Act Amendments', description: 'Strengthens requirements for digital platforms to compensate Canadian news publishers for content.', topic: 'Media', fiscalImpact: '+$200M/yr to industry', sponsorParty: 'liberal', sponsorName: 'Hon. Robert Singh, Minister of Heritage', type: 'government' },
  { title: 'Bill C-211: Arctic Sovereignty Act', description: 'Establishes permanent military and scientific presence in the High Arctic with $3B in infrastructure investment.', topic: 'Defence', fiscalImpact: '-$3B', sponsorParty: 'liberal', sponsorName: 'Hon. Jennifer Williams, Minister of National Defence', type: 'government' },
  { title: 'Bill C-212: Dental Care Expansion Act', description: 'Extends the Canadian Dental Care Plan to all uninsured Canadians regardless of income threshold.', topic: 'Health', fiscalImpact: '-$2.8B/yr', sponsorParty: 'liberal', sponsorName: 'Hon. Lisa Nguyen, Minister of Health', type: 'government' },
  { title: "PMB C-410: Liberal MP Anti-Poverty Act", description: 'Establishes a guaranteed annual income floor of $18,500 for all adult Canadians living below the poverty line.', topic: 'Social Policy', fiscalImpact: '-$7.5B/yr', sponsorParty: 'liberal', sponsorName: 'MP Angela Fontaine (LPC)', type: 'private_member' },
  { title: "PMB C-411: Liberal MP Electoral Reform Act", description: 'Establishes a citizens assembly to consider proportional representation for federal elections.', topic: 'Governance', fiscalImpact: '-$45M', sponsorParty: 'liberal', sponsorName: 'MP David Park (LPC)', type: 'private_member' },
  { title: "PMB C-412: Liberal MP Truth in Advertising Act", description: 'Requires all political campaign materials to include verified fact-check certification.', topic: 'Governance', fiscalImpact: 'Neutral', sponsorParty: 'liberal', sponsorName: 'MP Sarah Chen (LPC)', type: 'private_member' },
  // ── CONSERVATIVE ──────────────────────────────────────────────────────────
  { title: 'Bill C-301: Carbon Tax Repeal Act', description: 'Repeals the federal consumer carbon pricing backstop and replaces it with a technology-based emissions fund.', topic: 'Environment', fiscalImpact: '-$11B revenue', sponsorParty: 'conservative', sponsorName: 'MP Pierre Fontaine (CPC)', type: 'private_member' },
  { title: 'Bill C-302: Fiscal Responsibility and Balanced Budget Act', description: 'Requires the government to present a balanced budget within 3 fiscal years and maintain debt-to-GDP below 40%.', topic: 'Fiscal Policy', fiscalImpact: '-$30B spending cuts', sponsorParty: 'conservative', sponsorName: 'MP James MacDonald (CPC)', type: 'private_member' },
  { title: 'Bill C-303: Safe Streets and Communities Act', description: 'Introduces mandatory minimum sentences for repeat violent offenders and restricts bail for dangerous criminals.', topic: 'Justice', fiscalImpact: '+$800M/yr', sponsorParty: 'conservative', sponsorName: 'MP Claire Williams (CPC)', type: 'private_member' },
  { title: 'Bill C-304: Military Spending Commitment Act', description: 'Commits Canada to 2% GDP military spending by 2028 and establishes domestic defence procurement requirements.', topic: 'Defence', fiscalImpact: '-$14B/yr', sponsorParty: 'conservative', sponsorName: 'MP Robert Singh (CPC)', type: 'private_member' },
  { title: 'Bill C-305: Small Business Tax Relief Act', description: 'Reduces small business federal tax rate from 9% to 6% and expands the small business deduction threshold.', topic: 'Economy', fiscalImpact: '-$3.5B/yr', sponsorParty: 'conservative', sponsorName: 'MP Thomas Bergeron (CPC)', type: 'private_member' },
  { title: 'Bill C-306: Immigration Level Reduction Act', description: 'Reduces permanent resident admissions target to 250,000 annually until housing and integration capacity is rebuilt.', topic: 'Immigration', fiscalImpact: 'Neutral', sponsorParty: 'conservative', sponsorName: 'MP Lisa Park (CPC)', type: 'private_member' },
  { title: 'Bill C-307: Pipelines and Energy Security Act', description: 'Fast-tracks environmental review of energy infrastructure projects and limits federal veto over provincial resource development.', topic: 'Energy', fiscalImpact: '+$4B GDP impact', sponsorParty: 'conservative', sponsorName: 'MP William Tran (CPC)', type: 'private_member' },
  { title: 'Bill C-308: RCMP Reform Act', description: 'Separates the RCMP\'s national security and contract policing mandates and establishes independent civilian oversight.', topic: 'Public Safety', fiscalImpact: '+$500M restructuring', sponsorParty: 'conservative', sponsorName: 'MP Diane Malik (CPC)', type: 'private_member' },
  { title: 'Bill C-309: Senate Abolition Referendum Act', description: 'Holds a national referendum on the abolition of the Senate of Canada as a cost-saving and democratic reform measure.', topic: 'Governance', fiscalImpact: '+$100M savings', sponsorParty: 'conservative', sponsorName: 'MP Hassan Fontaine (CPC)', type: 'private_member' },
  { title: 'Bill C-310: Veterans Benefits Enhancement Act', description: 'Restores lifetime pension options for injured veterans and increases disability benefit rates by 15%.', topic: 'Veterans', fiscalImpact: '-$1.2B/yr', sponsorParty: 'conservative', sponsorName: 'MP Jennifer Chen (CPC)', type: 'private_member' },
  { title: 'Bill C-311: Free Speech on Campus Act', description: 'Conditions federal research funding on universities adopting free expression commitments and ending deplatforming policies.', topic: 'Education', fiscalImpact: 'Neutral', sponsorParty: 'conservative', sponsorName: 'MP Michael Santos (CPC)', type: 'private_member' },
  { title: 'Bill C-312: Federal Spending Transparency Act', description: 'Requires all government contracts over $100,000 to be publicly posted within 30 days with full contractor details.', topic: 'Governance', fiscalImpact: 'Neutral', sponsorParty: 'conservative', sponsorName: 'MP Anita Wilson (CPC)', type: 'private_member' },
  { title: 'Bill C-313: Survivors of Crime Information Act', description: 'Gives victims the right to receive automatic notification of offender release, parole decisions, and pardon applications.', topic: 'Justice', fiscalImpact: '+$30M/yr', sponsorParty: 'conservative', sponsorName: 'MP David Lapointe (CPC)', type: 'private_member' },
  { title: 'Bill C-314: Federal Equalization Reform Act', description: 'Restructures the equalization formula to base payments on a province\'s fiscal capacity rather than resource revenues.', topic: 'Fiscal Policy', fiscalImpact: 'Revenue neutral', sponsorParty: 'conservative', sponsorName: 'MP Rachel Kim (CPC)', type: 'private_member' },
  { title: 'Bill C-315: Gatekeeping Elections Act', description: 'Requires presentation of government-issued photo ID at all federal polling stations to prevent electoral fraud.', topic: 'Governance', fiscalImpact: '+$80M', sponsorParty: 'conservative', sponsorName: 'MP Steven Patel (CPC)', type: 'private_member' },
  // ── NDP ───────────────────────────────────────────────────────────────────
  { title: 'PMB C-501: Wealth Tax Act', description: 'Imposes a 1% annual tax on net wealth above $10M and a 2% tax on wealth above $50M to fund social programs.', topic: 'Fiscal Policy', fiscalImpact: '+$5.6B/yr', sponsorParty: 'ndp', sponsorName: 'MP Rachel Lavoie (NDP)', type: 'private_member' },
  { title: 'PMB C-502: Rent Control Framework Act', description: 'Establishes a national rent increase cap tied to the consumer price index for all rental units built before 2018.', topic: 'Housing', fiscalImpact: 'Neutral', sponsorParty: 'ndp', sponsorName: 'MP Alex Okafor (NDP)', type: 'private_member' },
  { title: 'PMB C-503: Workers Rights Enhancement Act', description: 'Guarantees right to remote work, limits mandatory overtime to 4 hours/week, and establishes a right-to-disconnect law.', topic: 'Labour', fiscalImpact: 'Neutral', sponsorParty: 'ndp', sponsorName: 'MP Maria Torres (NDP)', type: 'private_member' },
  { title: 'PMB C-504: Single-Payer Pharmacare Now Act', description: 'Immediately extends a fully-funded national pharmacare plan to all Canadians covering all essential medicines.', topic: 'Health', fiscalImpact: '-$18B/yr', sponsorParty: 'ndp', sponsorName: 'MP Kevin Fraser (NDP)', type: 'private_member' },
  { title: 'PMB C-505: Bank Windfall Profit Tax Act', description: 'Imposes a temporary 25% surtax on excess bank profits exceeding pre-pandemic 5-year average returns.', topic: 'Fiscal Policy', fiscalImpact: '+$3.4B temporary', sponsorParty: 'ndp', sponsorName: 'MP Amanda Crawford (NDP)', type: 'private_member' },
  { title: 'PMB C-506: Public Housing Investment Act', description: 'Creates a national public housing corporation and builds 100,000 government-owned affordable rental units over 10 years.', topic: 'Housing', fiscalImpact: '-$20B', sponsorParty: 'ndp', sponsorName: 'MP Patricia Williams (NDP)', type: 'private_member' },
  { title: 'PMB C-507: Tax Haven Crackdown Act', description: 'Closes offshore tax avoidance loopholes, strengthens CRA enforcement, and requires public country-by-country reporting.', topic: 'Fiscal Policy', fiscalImpact: '+$8B/yr', sponsorParty: 'ndp', sponsorName: 'MP Rachel Lavoie (NDP)', type: 'private_member' },
  { title: 'PMB C-508: Prison Reform and Rehabilitation Act', description: 'Replaces mandatory minimums with evidence-based rehabilitation and reduces prison sentences for non-violent offences.', topic: 'Justice', fiscalImpact: '-$1.8B/yr savings', sponsorParty: 'ndp', sponsorName: 'MP James Whitmore (NDP)', type: 'private_member' },
  { title: 'PMB C-509: Community Care Homes Act', description: 'Brings long-term care under the Canada Health Act, banning for-profit ownership and establishing federal standards.', topic: 'Health', fiscalImpact: '-$3B transition', sponsorParty: 'ndp', sponsorName: 'MP Elena Kowalski (NDP)', type: 'private_member' },
  { title: 'PMB C-510: Clean Jobs Transition Act', description: 'Provides $8B in training and income support for fossil fuel industry workers transitioning to clean energy jobs.', topic: 'Environment', fiscalImpact: '-$8B', sponsorParty: 'ndp', sponsorName: 'MP Tom Sinclair (NDP)', type: 'private_member' },
  { title: 'PMB C-511: Free Tuition Pilot Act', description: 'Eliminates federal student loans and grants free tuition at two-year community colleges for 3 years in a pilot program.', topic: 'Education', fiscalImpact: '-$4B pilot', sponsorParty: 'ndp', sponsorName: 'MP Anita Rajput (NDP)', type: 'private_member' },
  { title: 'PMB C-512: Guaranteed Livable Income Act', description: 'Creates a refundable tax credit ensuring all Canadians receive a minimum net income of $22,000 per year.', topic: 'Social Policy', fiscalImpact: '-$8.5B/yr', sponsorParty: 'ndp', sponsorName: 'MP Sarah Chen (NDP)', type: 'private_member' },
  // ── BLOC ──────────────────────────────────────────────────────────────────
  { title: 'PMB C-601: Quebec Fiscal Autonomy Act', description: 'Transfers federal tax points to Quebec in exchange for reduced federal presence in provincial jurisdiction areas.', topic: 'Fiscal Policy', fiscalImpact: 'Revenue neutral', sponsorParty: 'bloc', sponsorName: 'MP Marc Tremblay (BQ)', type: 'private_member' },
  { title: 'PMB C-602: French Language Modernization Act', description: 'Amends the Official Languages Act to strengthen French language protections in federal workplaces and federally regulated industries.', topic: 'Language Rights', fiscalImpact: '+$180M', sponsorParty: 'bloc', sponsorName: 'MP Claire Beaumont (BQ)', type: 'private_member' },
  { title: 'PMB C-603: Quebec Values Referendum Act', description: 'Requires federal government to hold a referendum before using the notwithstanding clause in Quebec jurisdictions.', topic: 'Governance', fiscalImpact: 'Neutral', sponsorParty: 'bloc', sponsorName: 'MP Luc Vézina (BQ)', type: 'private_member' },
  { title: 'PMB C-604: Seasonal Worker Income Support Act', description: 'Eliminates the waiting period for seasonal workers accessing Employment Insurance in Quebec-dominated industries.', topic: 'Labour', fiscalImpact: '-$400M/yr', sponsorParty: 'bloc', sponsorName: 'MP Sophie Bergeron (BQ)', type: 'private_member' },
  { title: 'PMB C-605: Supply Management Modernization Act', description: 'Strengthens and modernizes the supply management system for dairy, poultry, and eggs against trade agreement erosions.', topic: 'Agriculture', fiscalImpact: 'Neutral', sponsorParty: 'bloc', sponsorName: 'MP Jean Lafleur (BQ)', type: 'private_member' },
  // ── GREEN ──────────────────────────────────────────────────────────────────
  { title: 'PMB C-701: Climate Emergency Declaration Act', description: 'Formally declares a climate emergency and requires all federal legislation to undergo climate impact assessment.', topic: 'Environment', fiscalImpact: '+$200M assessment', sponsorParty: 'green', sponsorName: 'MP Lisa Chen (GPC)', type: 'private_member' },
  { title: 'PMB C-702: Pesticide Elimination Act', description: 'Phases out neonicotinoid pesticides that harm pollinator populations over a 3-year sunset period.', topic: 'Environment', fiscalImpact: 'Neutral', sponsorParty: 'green', sponsorName: 'MP David Brown (GPC)', type: 'private_member' },
  { title: 'PMB C-703: Circular Economy Act', description: 'Mandates extended producer responsibility for all packaging and establishes zero-waste targets for federal operations.', topic: 'Environment', fiscalImpact: '+$500M industry compliance', sponsorParty: 'green', sponsorName: 'MP Sarah Green (GPC)', type: 'private_member' },
  { title: 'PMB C-704: Species at Risk Emergency Act', description: 'Establishes emergency habitat protection corridors and triples funding for species at risk recovery programs.', topic: 'Environment', fiscalImpact: '-$1.2B', sponsorParty: 'green', sponsorName: 'MP Lisa Chen (GPC)', type: 'private_member' },
  { title: 'PMB C-705: Active Transportation Infrastructure Act', description: 'Requires 15% of federal infrastructure funding be dedicated to cycling, pedestrian, and public transit infrastructure.', topic: 'Infrastructure', fiscalImpact: 'Neutral (reallocation)', sponsorParty: 'green', sponsorName: 'MP Paul Summers (GPC)', type: 'private_member' },
  // ── CROSS-PARTY / GENERAL ─────────────────────────────────────────────────
  { title: 'PMB C-801: Anti-Money Laundering Strengthening Act', description: 'Expands Proceeds of Crime reporting requirements, beneficial ownership registry, and FINTRAC enforcement powers.', topic: 'Justice', fiscalImpact: '+$300M enforcement', sponsorParty: 'liberal', sponsorName: 'MP Jennifer Lee (LPC)', type: 'private_member' },
  { title: 'PMB C-802: Mandatory Minimum Sentencing Reform Act', description: 'Removes mandatory minimums for 42 offences and returns judicial discretion to sentencing judges.', topic: 'Justice', fiscalImpact: '-$900M/yr savings', sponsorParty: 'ndp', sponsorName: 'MP Alex Jones (NDP)', type: 'private_member' },
  { title: 'PMB C-803: Public Service Pay Equity Act', description: 'Implements full pay equity across all federal public service classifications within 2 years.', topic: 'Labour', fiscalImpact: '-$1.1B/yr', sponsorParty: 'liberal', sponsorName: 'MP Sandra Park (LPC)', type: 'private_member' },
  { title: 'PMB C-804: Lobbyist Registration Strengthening Act', description: 'Closes loopholes in lobbying registration and increases cooling-off period from 2 to 5 years for former ministers.', topic: 'Governance', fiscalImpact: 'Neutral', sponsorParty: 'ndp', sponsorName: 'MP Chris Taylor (NDP)', type: 'private_member' },
  { title: 'PMB C-805: National Standards for Long-Term Care Act', description: 'Establishes enforceable national minimum staffing ratios and care standards in long-term care facilities.', topic: 'Health', fiscalImpact: '-$2.5B/yr', sponsorParty: 'liberal', sponsorName: 'MP Maria Santos (LPC)', type: 'private_member' },
  { title: 'PMB C-806: Mental Health Parity Act', description: 'Requires all provincial health insurance to provide equal coverage for mental health services as physical health services.', topic: 'Health', fiscalImpact: '-$1.8B/yr', sponsorParty: 'ndp', sponsorName: 'MP Jessica Williams (NDP)', type: 'private_member' },
  { title: 'PMB C-807: Ocean Protection Enhancement Act', description: 'Expands marine protected area coverage to 30% of Canada\'s oceans and strengthens spill response capacity.', topic: 'Environment', fiscalImpact: '-$800M', sponsorParty: 'green', sponsorName: 'MP Lisa Chen (GPC)', type: 'private_member' },
  { title: 'PMB C-808: Childhood Poverty Elimination Act', description: 'Sets a 50% reduction target for child poverty within 5 years through enhanced Canada Child Benefit payments.', topic: 'Social Policy', fiscalImpact: '-$3.5B/yr', sponsorParty: 'ndp', sponsorName: 'MP Rachel Lavoie (NDP)', type: 'private_member' },
  { title: 'PMB C-809: National Suicide Prevention Act', description: 'Establishes a 988 crisis line, mandates training for first responders, and funds 200 new crisis centres.', topic: 'Health', fiscalImpact: '-$600M', sponsorParty: 'liberal', sponsorName: 'MP Kevin Fraser (LPC)', type: 'private_member' },
  { title: 'PMB C-810: Rural Broadband Access Act', description: 'Universal broadband mandate requiring 50Mbps service to all Canadian homes by 2027 with $3B federal funding.', topic: 'Technology', fiscalImpact: '-$3B', sponsorParty: 'conservative', sponsorName: 'MP Thomas Bergeron (CPC)', type: 'private_member' },
  { title: 'Bill C-901: Foreign Agent Registry Act', description: 'Requires all individuals and organizations working on behalf of foreign principals to register publicly.', topic: 'National Security', fiscalImpact: '+$50M enforcement', sponsorParty: 'conservative', sponsorName: 'Hon. Alan Park, Minister of Public Safety', type: 'government' },
  { title: 'Bill C-902: Critical Minerals Strategy Act', description: 'Fast-tracks permits for critical mineral extraction and processing and establishes a strategic reserves program.', topic: 'Economy', fiscalImpact: '+$2.3B investment', sponsorParty: 'liberal', sponsorName: 'Hon. Marcus Chen, Minister of Natural Resources', type: 'government' },
  { title: 'Bill C-903: Financial Consumer Agency Strengthening Act', description: 'Expands FCAC powers to investigate predatory lending, enhance mortgage disclosure requirements, and cap NSF fees.', topic: 'Finance', fiscalImpact: 'Neutral', sponsorParty: 'liberal', sponsorName: 'Hon. Sarah Williams, Minister of Finance', type: 'government' },
  { title: 'Bill C-904: Firearms and Public Safety Act', description: 'Implements mandatory buyback of restricted firearms and establishes a national handgun registry.', topic: 'Public Safety', fiscalImpact: '-$2.8B buyback', sponsorParty: 'liberal', sponsorName: 'Hon. James Kim, Minister of Public Safety', type: 'government' },
  { title: 'Bill C-905: Competition Act Modernization', description: 'Strengthens merger review, establishes digital market conduct provisions, and creates new powers against abuse of dominance.', topic: 'Economy', fiscalImpact: 'Neutral', sponsorParty: 'liberal', sponsorName: 'Hon. Lisa Nguyen, Minister of ISED', type: 'government' },
  { title: 'PMB C-910: First Nations Water Security Act', description: 'Provides legally enforceable right to clean drinking water on all reserves and funds infrastructure upgrades within 5 years.', topic: 'Indigenous Affairs', fiscalImpact: '-$6B', sponsorParty: 'ndp', sponsorName: 'MP Chief Rebecca Thundercloud (NDP)', type: 'private_member' },
  { title: 'PMB C-911: Anti-Poverty Measurement Act', description: 'Requires Statistics Canada to publish a comprehensive poverty dashboard annually and ties welfare benefits to CPI.', topic: 'Social Policy', fiscalImpact: 'Neutral', sponsorParty: 'liberal', sponsorName: 'MP Angela Fontaine (LPC)', type: 'private_member' },
  { title: 'PMB C-912: Pandemic Preparedness Act', description: 'Establishes permanent pandemic preparedness agency, strategic medical supply stockpiles, and surge capacity protocols.', topic: 'Health', fiscalImpact: '-$1.5B setup', sponsorParty: 'liberal', sponsorName: 'MP David Park (LPC)', type: 'private_member' },
  { title: 'PMB C-913: Internet Access as Basic Service Act', description: 'Designates internet access as an essential service, removing data caps and establishing minimum speed guarantees.', topic: 'Technology', fiscalImpact: '+$800M regulatory cost', sponsorParty: 'ndp', sponsorName: 'MP Alex Okafor (NDP)', type: 'private_member' },
  { title: 'PMB C-914: Truth in Political Advertising Act', description: 'Prohibits the use of deepfakes in political advertising and requires source disclosure for all digital political ads.', topic: 'Governance', fiscalImpact: 'Neutral', sponsorParty: 'ndp', sponsorName: 'MP Rachel Lavoie (NDP)', type: 'private_member' },
  { title: 'PMB C-915: Student Loan Forgiveness Act', description: 'Cancels federal student loan debt for graduates in nursing, teaching, and early childhood education.', topic: 'Education', fiscalImpact: '-$3.2B one-time', sponsorParty: 'ndp', sponsorName: 'MP Kevin Fraser (NDP)', type: 'private_member' },
  { title: 'PMB C-916: Drug Decriminalization Act', description: 'Decriminalizes personal possession of all drugs and redirects enforcement resources to treatment and harm reduction.', topic: 'Justice', fiscalImpact: '-$500M/yr savings', sponsorParty: 'ndp', sponsorName: 'MP James Whitmore (NDP)', type: 'private_member' },
  { title: 'PMB C-917: Electoral Boundaries Reform Act', description: 'Increases House of Commons to 350 seats to improve representation and reviews redistribution methodology.', topic: 'Governance', fiscalImpact: '+$60M/yr', sponsorParty: 'conservative', sponsorName: 'MP William Tran (CPC)', type: 'private_member' },
  { title: 'PMB C-918: Federal Pay Transparency Act', description: 'Requires all federally regulated employers with 100+ employees to publicly post salary ranges and aggregate gender pay data.', topic: 'Labour', fiscalImpact: 'Neutral', sponsorParty: 'liberal', sponsorName: 'MP Mary Chen (LPC)', type: 'private_member' },
  { title: 'PMB C-919: National Food Strategy Act', description: 'Creates a coordinated national food security strategy including agricultural subsidies, supply chain resilience, and food bank funding.', topic: 'Agriculture', fiscalImpact: '-$2B', sponsorParty: 'conservative', sponsorName: 'MP Steven Patel (CPC)', type: 'private_member' },
  { title: 'PMB C-920: Chronic Pain Management Act', description: 'Establishes a federal chronic pain treatment centre network and updates opioid prescribing guidelines.', topic: 'Health', fiscalImpact: '-$400M', sponsorParty: 'liberal', sponsorName: 'MP Sandra Park (LPC)', type: 'private_member' },
  { title: 'Bill C-1001: National Artificial Intelligence Act', description: 'Regulates high-impact AI systems, requires algorithmic impact assessments, and establishes an AI Safety Commissioner.', topic: 'Technology', fiscalImpact: '+$300M enforcement', sponsorParty: 'liberal', sponsorName: 'Hon. David Kim, Minister of ISED', type: 'government' },
  { title: 'Bill C-1002: Emissions Reduction Fund Act', description: 'Creates a $5B fund for industrial methane reduction, direct air capture pilot projects, and carbon capture deployment.', topic: 'Environment', fiscalImpact: '-$5B', sponsorParty: 'liberal', sponsorName: 'Hon. Marcus Tremblay, Minister of Environment', type: 'government' },
  { title: 'Bill C-1003: National Security Review Modernization Act', description: 'Updates CSIS Act to address cyber threats, foreign interference, and economic espionage with enhanced judicial oversight.', topic: 'National Security', fiscalImpact: '+$600M', sponsorParty: 'liberal', sponsorName: 'Hon. Jennifer Williams, Minister of Public Safety', type: 'government' },
  { title: 'Bill C-1004: Infrastructure Bank Reform Act', description: 'Restructures the Canada Infrastructure Bank to focus on climate-resilient infrastructure and Indigenous-owned projects.', topic: 'Infrastructure', fiscalImpact: 'Neutral (capital reallocation)', sponsorParty: 'liberal', sponsorName: 'Hon. Ahmed Hassan, Minister of Infrastructure', type: 'government' },
  { title: 'Bill C-1005: Public Sector Integrity Act', description: 'Strengthens whistleblower protections, expands the Public Sector Integrity Commissioner\'s powers, and increases penalties.', topic: 'Governance', fiscalImpact: 'Neutral', sponsorParty: 'liberal', sponsorName: 'Hon. Sarah Chen, President of Treasury Board', type: 'government' },
  { title: 'PMB C-1010: Anti-Defamation and Hate Speech Act', description: 'Expands hate speech provisions and creates civil cause of action for victims of online defamation.', topic: 'Justice', fiscalImpact: 'Neutral', sponsorParty: 'liberal', sponsorName: 'MP Jennifer Lee (LPC)', type: 'private_member' },
  { title: 'PMB C-1011: Regional Development Investment Act', description: 'Channels $10B into rural and northern Canada through targeted economic development grants and loan guarantees.', topic: 'Economy', fiscalImpact: '-$10B', sponsorParty: 'conservative', sponsorName: 'MP Thomas Bergeron (CPC)', type: 'private_member' },
  { title: 'PMB C-1012: Federal Minimum Wage Act', description: 'Increases federal minimum wage to $22/hour indexed to CPI, applicable to all federally regulated workers.', topic: 'Labour', fiscalImpact: '+$200M/yr cost to federal', sponsorParty: 'ndp', sponsorName: 'MP Maria Torres (NDP)', type: 'private_member' },
  { title: 'PMB C-1013: Energy Efficiency Buildings Act', description: 'Mandates net-zero energy standards for all new federal buildings and incentivizes residential deep retrofits.', topic: 'Environment', fiscalImpact: '-$3B incentives', sponsorParty: 'green', sponsorName: 'MP Lisa Chen (GPC)', type: 'private_member' },
  { title: 'PMB C-1014: National Cemetery and War Memorial Act', description: 'Establishes a national military memorial site outside Ottawa and increases veterans graves maintenance funding.', topic: 'Veterans', fiscalImpact: '-$300M', sponsorParty: 'conservative', sponsorName: 'MP Rachel Kim (CPC)', type: 'private_member' },
  { title: 'PMB C-1015: Water Fluoridation Standards Act', description: 'Establishes evidence-based national standards for drinking water fluoridation, ending inconsistent municipal policies.', topic: 'Health', fiscalImpact: '+$40M', sponsorParty: 'liberal', sponsorName: 'MP Kevin Fraser (LPC)', type: 'private_member' },
  { title: 'PMB C-1016: Anti-Spam Legislation Reform Act', description: 'Updates CASL to address modern commercial communication practices and strengthens enforcement for text message spam.', topic: 'Technology', fiscalImpact: 'Neutral', sponsorParty: 'conservative', sponsorName: 'MP Diane Malik (CPC)', type: 'private_member' },
  { title: 'PMB C-1017: National Sports Strategy Act', description: 'Creates a federal sport integrity commission and establishes a safe sport framework with third-party oversight.', topic: 'Sport', fiscalImpact: '-$200M', sponsorParty: 'liberal', sponsorName: 'MP Sandra Park (LPC)', type: 'private_member' },
  { title: 'PMB C-1018: CRTC Independence Act', description: 'Removes Order in Council power to issue binding policy directions to the CRTC, ensuring regulatory independence.', topic: 'Technology', fiscalImpact: 'Neutral', sponsorParty: 'conservative', sponsorName: 'MP Hassan Fontaine (CPC)', type: 'private_member' },
  { title: 'PMB C-1019: Organic Farming Transition Act', description: 'Provides grants and tax incentives for conventional farms transitioning to certified organic production over 5 years.', topic: 'Agriculture', fiscalImpact: '-$800M', sponsorParty: 'green', sponsorName: 'MP David Brown (GPC)', type: 'private_member' },
  { title: 'PMB C-1020: National Seniors Strategy Act', description: 'Establishes an Office of the National Seniors Commissioner and a whole-of-government strategy for aging population.', topic: 'Social Policy', fiscalImpact: '-$50M setup', sponsorParty: 'conservative', sponsorName: 'MP Claire Williams (CPC)', type: 'private_member' },
  { title: 'PMB C-1021: Human Trafficking Prevention Act', description: 'Establishes a national anti-human trafficking centre and criminalizes knowingly purchasing sexual services from trafficked persons.', topic: 'Justice', fiscalImpact: '-$200M', sponsorParty: 'conservative', sponsorName: 'MP James MacDonald (CPC)', type: 'private_member' },
  { title: 'PMB C-1022: Northern Infrastructure Investment Act', description: 'Commits $8B for roads, ports, and broadband in Yukon, NWT, Nunavut, and northern Quebec over 10 years.', topic: 'Infrastructure', fiscalImpact: '-$8B', sponsorParty: 'liberal', sponsorName: 'MP Angela Fontaine (LPC)', type: 'private_member' },
  { title: 'PMB C-1023: Parliamentary Ethics Reform Act', description: 'Bans former ministers from lobbying for 5 years, requires asset disclosure, and strengthens Ethics Commissioner powers.', topic: 'Governance', fiscalImpact: 'Neutral', sponsorParty: 'ndp', sponsorName: 'MP Chris Taylor (NDP)', type: 'private_member' },
  { title: 'PMB C-1024: Refugee Claimant Support Act', description: 'Funds legal aid for all refugee claimants and accelerates IRB processing timelines to under 6 months.', topic: 'Immigration', fiscalImpact: '-$800M/yr', sponsorParty: 'ndp', sponsorName: 'MP Alex Okafor (NDP)', type: 'private_member' },
  { title: 'PMB C-1025: Social Media Platform Regulation Act', description: 'Requires social media platforms to allow algorithmic transparency audits and give users control over feed algorithms.', topic: 'Technology', fiscalImpact: 'Neutral', sponsorParty: 'liberal', sponsorName: 'MP Mary Chen (LPC)', type: 'private_member' },
  { title: 'PMB C-1026: Nuclear Energy Research Act', description: 'Establishes Canadian Small Modular Reactor research consortium and funds $3B in advanced nuclear energy development.', topic: 'Energy', fiscalImpact: '-$3B', sponsorParty: 'conservative', sponsorName: 'MP Robert Singh (CPC)', type: 'private_member' },
  { title: 'PMB C-1027: Indigenous Resource Revenue Sharing Act', description: 'Requires mandatory revenue sharing with Indigenous communities impacted by resource extraction on their territories.', topic: 'Indigenous Affairs', fiscalImpact: '+$1.5B to communities', sponsorParty: 'ndp', sponsorName: 'MP Rebecca Thundercloud (NDP)', type: 'private_member' },
  { title: 'PMB C-1028: Municipal Infrastructure Emergency Fund Act', description: 'Creates a $4B emergency fund for municipalities facing infrastructure crises from extreme weather events.', topic: 'Infrastructure', fiscalImpact: '-$4B', sponsorParty: 'liberal', sponsorName: 'MP David Park (LPC)', type: 'private_member' },
  { title: 'PMB C-1029: Airline Consumer Protection Act', description: 'Establishes a passenger rights charter with automatic compensation and stronger delay/cancellation protections.', topic: 'Transport', fiscalImpact: '+$300M industry compliance', sponsorParty: 'ndp', sponsorName: 'MP Elena Kowalski (NDP)', type: 'private_member' },
  { title: 'PMB C-1030: National Language Training Act', description: 'Provides up to $5,000 per newcomer for official language training, reducing current 2-year waitlists.', topic: 'Immigration', fiscalImpact: '-$1.2B/yr', sponsorParty: 'liberal', sponsorName: 'MP Sandra Park (LPC)', type: 'private_member' },
  { title: 'Bill C-1101: Cybersecurity Modernization Act', description: 'Establishes mandatory incident reporting for critical infrastructure operators and creates a national cyber threat exchange.', topic: 'National Security', fiscalImpact: '+$800M', sponsorParty: 'liberal', sponsorName: 'Hon. Jennifer Williams, Minister of Public Safety', type: 'government' },
  { title: 'Bill C-1102: Defence Procurement Reform Act', description: 'Streamlines major defence procurement with independent project management and mandatory Canadian content requirements.', topic: 'Defence', fiscalImpact: '+$18B over 10 yrs', sponsorParty: 'liberal', sponsorName: 'Hon. Marcus Chen, Minister of National Defence', type: 'government' },
  { title: 'Bill C-1103: Federal Poverty Reduction Act', description: 'Strengthens the Official Poverty Line framework and establishes reduction targets binding on all federal spending decisions.', topic: 'Social Policy', fiscalImpact: '-$2.5B/yr', sponsorParty: 'liberal', sponsorName: 'Hon. Mary Chen, Minister of Families', type: 'government' },
  { title: 'Bill C-1104: Ocean Thermal Energy Research Act', description: 'Funds $500M in coastal tidal and wave energy research partnerships with universities and provinces.', topic: 'Energy', fiscalImpact: '-$500M', sponsorParty: 'liberal', sponsorName: 'Hon. Marcus Tremblay, Minister of Natural Resources', type: 'government' },
  { title: 'Bill C-1105: Worker Skills Development Act', description: 'Creates portable skills training accounts of $8,000 for every Canadian worker to use on recognized training programs.', topic: 'Labour', fiscalImpact: '-$7.5B', sponsorParty: 'liberal', sponsorName: 'Hon. Priya Sharma, Minister of Labour', type: 'government' },
  { title: 'PMB C-1110: Anti-Corruption Statute Act', description: 'Establishes an Independent Anti-Corruption Commissioner with powers to investigate any federal official or entity.', topic: 'Governance', fiscalImpact: '+$100M', sponsorParty: 'conservative', sponsorName: 'MP Anita Wilson (CPC)', type: 'private_member' },
  { title: 'PMB C-1111: Health Data Interoperability Act', description: 'Mandates standardized electronic health records across provinces to allow patient data portability.', topic: 'Health', fiscalImpact: '-$2B implementation', sponsorParty: 'liberal', sponsorName: 'MP Kevin Fraser (LPC)', type: 'private_member' },
  { title: 'PMB C-1112: Autonomous Vehicle Safety Act', description: 'Establishes federal safety standards for autonomous vehicles and creates a regulatory sandbox for testing.', topic: 'Technology', fiscalImpact: 'Neutral', sponsorParty: 'liberal', sponsorName: 'MP Mary Chen (LPC)', type: 'private_member' },
  { title: 'PMB C-1113: Public Banking Act', description: 'Transforms Canada Post into a public banking institution serving rural and underbanked communities.', topic: 'Finance', fiscalImpact: '-$1B conversion', sponsorParty: 'ndp', sponsorName: 'MP Rachel Lavoie (NDP)', type: 'private_member' },
  { title: 'PMB C-1114: Trans Mountain Divestment Act', description: 'Requires the federal government to divest from Trans Mountain Corporation within 3 years through an Indigenous-led IPO.', topic: 'Energy', fiscalImpact: '+$5B sale revenue', sponsorParty: 'ndp', sponsorName: 'MP Tom Sinclair (NDP)', type: 'private_member' },
  { title: 'PMB C-1115: Anti-Encampment Criminalization Act', description: 'Prohibits municipalities from criminalizing homelessness and sets minimum shelter standards eligible for federal housing transfers.', topic: 'Housing', fiscalImpact: 'Neutral', sponsorParty: 'ndp', sponsorName: 'MP Alex Okafor (NDP)', type: 'private_member' },
  { title: 'PMB C-1116: University Research Integrity Act', description: 'Requires disclosure of all foreign-funded research partnerships and bans funding from adversarial state actors.', topic: 'National Security', fiscalImpact: 'Neutral', sponsorParty: 'conservative', sponsorName: 'MP David Lapointe (CPC)', type: 'private_member' },
  { title: 'PMB C-1117: Palliative Care Expansion Act', description: 'Funds 50 new palliative care hospices across Canada and expands MAID access review process.', topic: 'Health', fiscalImpact: '-$600M', sponsorParty: 'liberal', sponsorName: 'MP Sandra Park (LPC)', type: 'private_member' },
  { title: 'PMB C-1118: Emergency Preparedness Modernization Act', description: 'Updates the Federal Emergency Management framework to address climate-induced disasters and interoperability with provinces.', topic: 'Public Safety', fiscalImpact: '-$800M', sponsorParty: 'conservative', sponsorName: 'MP Pierre Fontaine (CPC)', type: 'private_member' },
  { title: 'PMB C-1119: Access to Medicines Act', description: 'Permits compulsory licensing of pharmaceutical patents for essential medications priced 50% above international median.', topic: 'Health', fiscalImpact: '-$2B pharma revenue', sponsorParty: 'ndp', sponsorName: 'MP Patricia Williams (NDP)', type: 'private_member' },
  { title: 'PMB C-1120: Mortgage Relief Act', description: 'Extends amortization periods to 30 years for first-time buyers and creates a government co-ownership equity program.', topic: 'Housing', fiscalImpact: '-$1.5B contingent', sponsorParty: 'conservative', sponsorName: 'MP Rachel Kim (CPC)', type: 'private_member' },
];

// Get a random selection of bills to introduce per week
let aiBillIndex = 0;
export function getWeeklyAIBills(currentWeek: number): AIBillTemplate[] {
  const pool = AI_GENERATED_BILLS;
  const idx1 = (currentWeek * 2) % pool.length;
  const idx2 = (currentWeek * 2 + 1) % pool.length;
  return [pool[idx1], pool[idx2]];
}

// ── Sample starter bills ─────────────────────────────────────────────────────
export const SAMPLE_BILLS: Omit<Bill, 'id' | 'introducedWeek' | 'stageStartWeek' | 'playerVote' | 'votesFor' | 'votesAgainst' | 'weeksAtStage' | 'voteHistory' | 'stageWeeksRemaining' | 'scheduledVoteWeek' | 'prioritized' | 'billAmendments' | 'committeeReportTabled' | 'isAIGenerated'>[] = [
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
  const baseBills = SAMPLE_BILLS.map((bill, idx) => {
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
      billAmendments: [],
      stageWeeksRemaining,
      scheduledVoteWeek: stageWeeksRemaining === 0 ? currentWeek : null,
      isAIGenerated: false,
      committeeReportTabled: false,
    } as Bill;
  });

  // Add 2 AI bills from pool
  const aiBills = getWeeklyAIBills(currentWeek);
  const aiBillObjects: Bill[] = aiBills.map((template, idx) => ({
    id: `ai_bill_${currentWeek}_${idx}`,
    ...template,
    stage: 'house_first_reading' as BillStage,
    introducedWeek: currentWeek,
    stageStartWeek: currentWeek,
    playerVote: null,
    votesFor: 0,
    votesAgainst: 0,
    weeksAtStage: 0,
    prioritized: false,
    voteHistory: [],
    billAmendments: [],
    stageWeeksRemaining: DEFAULT_STAGE_WEEKS,
    scheduledVoteWeek: null,
    isAIGenerated: true,
    accelerated: false,
    defaultStageWeeks: DEFAULT_STAGE_WEEKS,
    amendments: [],
    passed: false,
    isMinisterSponsored: template.type === 'government',
    isPlayerBill: false,
    committeeReportTabled: false,
  }));

  return [...baseBills, ...aiBillObjects];
}

export function advanceBills(
  bills: Bill[],
  currentWeek: number,
  playerPartyId: string,
  playerSeats: number,
  totalSeats: number,
  isGoverning: boolean
): Bill[] {
  // ── CONTROLLED BILL INTRODUCTION: 1–2 per week, never more ──
  // Count how many bills were already introduced this week (player-created + AI)
  const existingIds = new Set(bills.map(b => b.id));
  const billsIntroducedThisWeek = bills.filter(b => b.introducedWeek === currentWeek).length;
  const slotsAvailable = Math.max(0, 2 - billsIntroducedThisWeek);

  // Every week: attempt to introduce AI bills up to remaining slot count
  const newAIBills: Bill[] = [];
  if (slotsAvailable > 0) {
    const candidates = getWeeklyAIBills(currentWeek);
    for (let i = 0; i < candidates.length && newAIBills.length < slotsAvailable; i++) {
      const template = candidates[i];
      const candidateId = `ai_bill_${currentWeek}_${i}`;
      if (!existingIds.has(candidateId)) {
        newAIBills.push({
          id: candidateId,
          ...template,
          stage: 'house_first_reading' as BillStage,
          introducedWeek: currentWeek,
          stageStartWeek: currentWeek,
          playerVote: null,
          votesFor: 0,
          votesAgainst: 0,
          weeksAtStage: 0,
          prioritized: false,
          voteHistory: [],
          billAmendments: [],
          stageWeeksRemaining: DEFAULT_STAGE_WEEKS,
          scheduledVoteWeek: null,
          isAIGenerated: true,
          accelerated: false,
          defaultStageWeeks: DEFAULT_STAGE_WEEKS,
          amendments: [],
          passed: false,
          isMinisterSponsored: template.type === 'government',
          isPlayerBill: false,
          committeeReportTabled: false,
        });
      }
    }
  }

  const advancedBills = bills.map(bill => {
    if (bill.stage === 'royal_assent' || bill.stage === 'defeated') return bill;

    const weeksAtStage = currentWeek - bill.stageStartWeek;
    const effectiveWeeks = bill.accelerated || bill.prioritized ? bill.defaultStageWeeks + 1 : bill.defaultStageWeeks;
    const shouldAdvance = weeksAtStage >= effectiveWeeks;
    const stageWeeksRemaining = Math.max(0, effectiveWeeks - weeksAtStage);

    if (!shouldAdvance) {
      return { ...bill, weeksAtStage, stageWeeksRemaining };
    }

    const currentIdx = BILL_STAGE_ORDER.indexOf(bill.stage);
    if (currentIdx === -1) return bill;

    const requiresVote = VOTE_STAGES.has(bill.stage);

    // RULE: After 2nd reading passes, MUST go to committee before 3rd reading
    // RULE: After committee, bill must have committeeReportTabled before 3rd reading
    if (bill.stage === 'house_committee' && !bill.committeeReportTabled) {
      // Auto-table committee report after committee stage
      return {
        ...bill,
        weeksAtStage,
        stageWeeksRemaining: 0,
        committeeReportTabled: true,
      };
    }

    if (requiresVote) {
      const result = simulateParliamentaryVote(bill, playerPartyId, playerSeats, totalSeats, isGoverning);

      const voteRecord: BillVoteRecord = {
        stage: bill.stage,
        week: currentWeek,
        yea: result.yea,
        nay: result.nay,
        majority: result.passed,
      };

      if (!result.passed) {
        return {
          ...bill,
          stage: 'defeated' as BillStage,
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
        passed: nextStage === undefined,
        voteHistory: [...bill.voteHistory, voteRecord],
        accelerated: false,
        prioritized: false,
        stageWeeksRemaining: DEFAULT_STAGE_WEEKS,
        scheduledVoteWeek: null,
        committeeReportTabled: nextStage === 'house_committee' ? false : bill.committeeReportTabled,
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
      committeeReportTabled: nextStage === 'house_third_reading' ? true : bill.committeeReportTabled,
    };
  });

  return [...advancedBills, ...newAIBills].slice(0, 60); // cap at 60 bills
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
    baseSupportProb = 0.45 + (Math.random() * 0.25 - 0.1);
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

export function tableCommitteeReport(bill: Bill): Bill {
  return { ...bill, committeeReportTabled: true };
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
    type: isGovernmentBill ? 'government' : 'private_member',
    stage: 'house_first_reading',
    introducedWeek: currentWeek,
    stageStartWeek: currentWeek,
    sponsorParty: playerPartyId,
    sponsorName,
    votesFor: 0,
    votesAgainst: 0,
    playerVote: 'yea',
    accelerated: false,
    prioritized: false,
    defaultStageWeeks: DEFAULT_STAGE_WEEKS,
    weeksAtStage: 0,
    amendments: [],
    billAmendments: [],
    isPlayerBill: true,
    topic,
    fiscalImpact,
    passed: false,
    voteHistory: [],
    stageWeeksRemaining: DEFAULT_STAGE_WEEKS,
    scheduledVoteWeek: null,
    isMinisterSponsored: isGovernmentBill,
    isAIGenerated: false,
    committeeReportTabled: false,
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
    house_first_reading: 'Bill formally introduced and title read. No debate or vote yet. Automatic progression.',
    house_second_reading: 'Debate on the principle of the bill. Vote required — if passed, bill MUST move to Committee.',
    house_committee: 'Detailed clause-by-clause review by parliamentary committee. Committee must table report before 3rd Reading.',
    house_third_reading: 'Final House vote on amended bill. Must pass to go to Senate. Requires committee report.',
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
  if (bill.type === 'government' && bill.isMinisterSponsored) return '#D71920';
  return '#3B82F6';
}
