// Powered by OnSpace.AI — Election Service: harder elections, riding-level detail, aligned campaign weeks
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

// ── Riding-Level Data ──────────────────────────────────────────────────────────
export interface RidingData {
  name: string;
  provinceCode: string;
  currentHolder: string;          // partyId holding the seat
  marginPct: number;              // margin of last election (%)
  vulnerability: 'safe' | 'likely' | 'lean' | 'tossup' | 'ultra_marginal';
  campaignSpending: Record<string, number>; // partyId -> dollars spent
  poll: Record<string, number>;   // partyId -> current poll %
  projectedWinner: string;
}

export interface ProvincePoll {
  provinceCode: string;
  results: Record<string, number>; // partyId -> pct
  sampleSize: number;
  margin: number; // MoE
}

export interface CampaignState {
  // Aligned with in-game weeks — each campaign week = 1 game week
  week: number;           // 1-4 (maps to game week offset since election called)
  gameWeekStart: number;  // the game week when the election was called
  playerPartyId: string;
  polls: ElectionPoll[];
  provincePollData: ProvincePoll[];  // province-level polling
  campaignedProvinces: string[];
  debateCompleted: boolean;
  debateScore: number;    // 0-100
  campaignEvents: CampaignEvent[];
  rallyCosts: number;
  approval: Record<string, number>;      // provinceCode -> player approval
  candidateSpending: Record<string, number>; // provinceCode -> player $$ spent
  ridingData: RidingData[];              // all ridings with vulnerability data
  vulnerableRidings: RidingData[];       // tossup + ultra_marginal ridings
  spendingPool: number;                  // remaining campaign $ budget
  totalBudget: number;
}

export interface CampaignEvent {
  id: string;
  province: string;
  type: 'rally' | 'gaffe' | 'endorsement' | 'attack_ad' | 'media_buy' | 'local_ad' | 'ground_canvass';
  effect: number;
  description: string;
  week: number;
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
  effect: number;
  boldness: 'safe' | 'moderate' | 'bold';
}

// ── Province-Level Poll Data ─────────────────────────────────────────────────
export function generateProvincePollData(
  playerPartyId: string,
  stats: PlayerStats,
  campaignedProvinces: string[],
  spending: Record<string, number>
): ProvincePoll[] {
  return REAL_PROVINCES.map(province => {
    const hasVisited = campaignedProvinces.includes(province.code);
    const spendBonus = Math.min(8, ((spending[province.code] || 0) / 500000) * 2);
    const visitBonus = hasVisited ? 4 + Math.random() * 3 : 0;

    // Regional base tendencies (realistic Canadian politics)
    const regionalBase: Record<string, Record<string, number>> = {
      AB: { conservative: 55, liberal: 18, ndp: 20, bloc: 0, green: 4, ppc: 3 },
      SK: { conservative: 52, liberal: 20, ndp: 20, bloc: 0, green: 5, ppc: 3 },
      MB: { conservative: 40, liberal: 28, ndp: 25, bloc: 0, green: 5, ppc: 2 },
      ON: { conservative: 35, liberal: 38, ndp: 18, bloc: 0, green: 6, ppc: 3 },
      QC: { conservative: 18, liberal: 22, ndp: 12, bloc: 38, green: 5, ppc: 2, independent: 3 },
      BC: { conservative: 32, liberal: 26, ndp: 28, bloc: 0, green: 10, ppc: 4 },
      NL: { conservative: 25, liberal: 52, ndp: 18, bloc: 0, green: 4, ppc: 1 },
      NS: { conservative: 33, liberal: 38, ndp: 23, bloc: 0, green: 5, ppc: 1 },
      NB: { conservative: 38, liberal: 35, ndp: 18, bloc: 4, green: 4, ppc: 1 },
      PE: { conservative: 32, liberal: 46, ndp: 15, bloc: 0, green: 6, ppc: 1 },
      YT: { conservative: 28, liberal: 38, ndp: 28, bloc: 0, green: 5, ppc: 1 },
      NT: { conservative: 25, liberal: 40, ndp: 28, bloc: 0, green: 5, ppc: 2 },
      NU: { conservative: 22, liberal: 42, ndp: 30, bloc: 0, green: 4, ppc: 2 },
    };

    const baseForProvince = regionalBase[province.code] || { conservative: 35, liberal: 32, ndp: 20, bloc: 0, green: 8, ppc: 3, independent: 2 };

    // Apply player party bonus
    const playerApproval = stats.approvalRating;
    const playerBase = baseForProvince[playerPartyId] || 20;
    const adjustedPlayerShare = Math.max(5, Math.min(60,
      playerBase + (playerApproval - 45) * 0.3 + visitBonus + spendBonus + (Math.random() * 8 - 4)
    ));

    const results: Record<string, number> = {};
    results[playerPartyId] = adjustedPlayerShare;

    let remaining = 100 - adjustedPlayerShare;
    const otherParties = PARTIES.filter(p => p.id !== playerPartyId && p.id !== 'independent');

    otherParties.forEach((party, idx) => {
      const base = baseForProvince[party.id] || 5;
      if (idx === otherParties.length - 1) {
        results[party.id] = Math.max(1, remaining);
      } else {
        const share = Math.min(remaining - (otherParties.length - idx - 1), Math.max(1,
          (base / (100 - playerBase)) * remaining * (0.85 + Math.random() * 0.3) + (Math.random() * 6 - 3)
        ));
        results[party.id] = Math.round(share);
        remaining -= results[party.id];
      }
    });

    results['independent'] = Math.max(0, remaining);

    return {
      provinceCode: province.code,
      results,
      sampleSize: Math.floor(800 + Math.random() * 400),
      margin: 2.5 + Math.random() * 2,
    };
  });
}

// ── Riding Vulnerability Data ─────────────────────────────────────────────────
const ALL_RIDING_NAMES: Record<string, string[]> = {
  ON: [
    'Ajax', 'Barrie—Innisfil', 'Bay of Quinte', 'Brampton Centre', 'Brampton East',
    'Burlington', 'Cambridge', 'Davenport', 'Don Valley East', 'Don Valley West',
    'Durham', 'Eglinton—Lawrence', 'Essex', 'Etobicoke Centre', 'Etobicoke—Lakeshore',
    'Guelph', 'Hamilton Centre', 'Hamilton Mountain', 'Kingston and the Islands',
    'Kitchener Centre', 'Kitchener South—Hespeler', 'London—Fanshawe', 'London North Centre',
    'Markham—Stouffville', 'Mississauga—Erin Mills', 'Mississauga—Lakeshore', 'Newmarket—Aurora',
    'Niagara Falls', 'Oakville', 'Oshawa', 'Ottawa Centre', 'Ottawa West—Nepean',
    'Peterborough—Kawartha', 'Pickering—Uxbridge', 'Richmond Hill', 'Scarborough—Agincourt',
    'Scarborough Centre', 'Scarborough North', 'Spadina—Harbourfront', 'St. Catharines',
    'Thornhill', 'Toronto Centre', 'Toronto—Danforth', 'Toronto—St. Paul\'s',
    'University—Rosedale', 'Vaughan—Woodbridge', 'Waterloo', 'Whitby', 'Willowdale',
    'Windsor—Tecumseh', 'Windsor West', 'York Centre', 'York South—Weston',
    'Brampton West', 'Dufferin—Caledon', 'Flamborough—Glanbrook', 'Haldimand—Norfolk',
    'Hastings—Lennox', 'Humber River—Black Creek', 'Huron—Bruce', 'King—Vaughan',
    'Lanark—Frontenac', 'Leeds—Grenville', 'Mississauga East—Cooksville',
    'Mississauga—Malton', 'Mississauga—Streetsville', 'Nepean', 'Niagara West',
    'Northumberland—Peterborough', 'North Bay—Nipissing', 'Oakville North—Burlington',
    'Ontario', 'Oxford', 'Perth—Wellington', 'Prince Edward—Hastings', 'Renfrew—Pembroke',
    'Sarnia—Lambton', 'Sault Ste. Marie', 'Simcoe—Grey', 'Simcoe North', 'Sudbury',
    'Thunder Bay—Rainy River', 'Thunder Bay—Superior North', 'Algoma—Manitoulin',
    'Aurora—Oak Ridges', 'Beaches—East York', 'Bruce—Grey—Owen Sound',
    'Don Valley North', 'East York', 'Elgin—Middlesex—London', 'Etobicoke North',
    'Glengarry—Prescott—Russell', 'Hamilton East—Stoney Creek', 'Humber—Mimico',
    'Kanata—Carleton', 'Markham—Unionville', 'Nipissing—Timiskaming', 'Orléans',
    'Ottawa—Vanier', 'Parry Sound—Muskoka', 'Stormont—Dundas', 'York—Simcoe',
    'Carleton', 'Scarborough Southwest', 'Scarborough—Guildwood', 'Scarborough East',
  ],
  QC: [
    'Abitibi—Baie-James', 'Alfred-Pellan', 'Argenteuil—La Petite-Nation', 'Beauce',
    'Beauharnois—Salaberry', 'Beauport—Limoilou', 'Bellechasse—Lévis', 'Berthier—Maskinongé',
    'Blainville', 'Bourassa', 'Brome—Missisquoi', 'Brossard—Saint-Lambert',
    'Châteauguay—Lacolle', 'Chicoutimi—Le Fjord', 'Compton—Stanstead',
    'Dorval—Lachine—LaSalle', 'Drummond', 'Gaspésie—Les-Îles', 'Hochelaga',
    'Hull—Aylmer', 'Joliette', 'Jonquière', 'La Prairie', 'Lac-Saint-Jean',
    'LaSalle—Émard—Verdun', 'Laurentides—Labelle', 'Laurier—Sainte-Marie', 'Laval—Nord',
    'Laval—Ouest', 'Laval—Les Îles', 'Lévis—Lotbinière', "L'Assomption—Montcalm",
    'Longueuil—Charles-LeMoyne', 'Longueuil—Saint-Hubert', 'Louis-Hébert', 'Louis-Saint-Laurent',
    'Manicouagan', 'Marc-Aurèle-Fortin', 'Megantic—L\'Érable', 'Mirabel',
    'Mont-Royal—Outremont', 'Montarville', 'Montmagny—Rivière-du-Loup',
    'Notre-Dame-de-Grâce—Westmount', 'Papineau', 'Pierre-Boucher—Verchères',
    'Pierrefonds—Dollard', 'Portneuf—Jacques-Cartier', 'Québec', 'Repentigny',
    'Richmond—Arthabaska', 'Rimouski—Témiscouata', 'Rivière-des-Mille-Îles', 'Rivière-du-Nord',
    'Rosemont—La Petite-Patrie', 'Saint-Bruno—Saint-Hubert', 'Saint-Hyacinthe—Bagot',
    'Saint-Jean', 'Saint-Laurent', 'Saint-Léonard—Saint-Michel', 'Saint-Maurice—Champlain',
    'Salaberry—Suroît', 'Shefford', 'Sherbrooke', 'Terrebonne', 'Thérèse-De Blainville',
    'Trois-Rivières', 'Vaudreuil—Soulanges', 'Ville-Marie—Le Sud-Ouest', 'Vimy',
    'Abitibi—Témiscamingue', 'Beauport—Côte-de-Beaupré', 'Honoré-Mercier',
    'La Pointe-de-l\'Île', 'Laval Centre',
  ],
  BC: [
    'Abbotsford', 'Burnaby North—Seymour', 'Burnaby South', 'Cariboo—Prince George',
    'Chilliwack—Hope', 'Cloverdale—Langley', 'Coquitlam—Port Coquitlam',
    'Delta—Richmond East', 'Fleetwood—Port Kells', 'Kamloops—Thompson—Cariboo',
    'Kelowna—Lake Country', 'Langley—Aldergrove', 'Mission—Matsqui—Abbotsford',
    'Nanaimo—Ladysmith', 'New Westminster—Burnaby', 'North Island—Powell River',
    'North Vancouver', 'Okanagan—Shuswap', 'Pitt Meadows—Maple Ridge',
    'Port Moody—Coquitlam', 'Prince George—Peace River', 'Richmond Centre',
    'Saanich—Gulf Islands', 'Skeena—Bulkley Valley', 'South Okanagan—West Kootenay',
    'South Surrey—White Rock', 'Steveston—Richmond East', 'Surrey Centre',
    'Surrey—Newton', 'Surrey—Panorama', 'Vancouver Centre', 'Vancouver East',
    'Vancouver Granville', 'Vancouver Kingsway', 'Vancouver Quadra', 'Vancouver South',
    'Victoria', 'West Vancouver—Sunshine Coast', 'Courtenay—Alberni',
    'Esquimalt—Saanich—Sooke', 'Kootenay—Columbia', 'Langley—Aldergrove 2',
    'North Okanagan—Shuswap',
  ],
  AB: [
    'Banff—Airdrie', 'Battle River—Crowfoot', 'Bow River', 'Calgary Centre',
    'Calgary Confederation', 'Calgary East', 'Calgary Greenway', 'Calgary Heritage',
    'Calgary Midnapore', 'Calgary Nose Hill', 'Calgary Rocky Ridge', 'Calgary Shepard',
    'Calgary Signal Hill', 'Calgary Skyview', 'Camrose—Stettler', 'Cypress Hills—Grasslands',
    'Edmonton Centre', 'Edmonton Griesbach', 'Edmonton Manning', 'Edmonton Mill Woods',
    'Edmonton Riverbend', 'Edmonton Strathcona', 'Edmonton West', 'Edmonton Wetaskiwin',
    'Foothills', 'Fort McMurray—Cold Lake', 'Grande Prairie—Mackenzie', 'Lakeland',
    'Lethbridge', 'Medicine Hat—Cardston—Warner', 'Peace River—Westlock',
    'Red Deer—Mountain View', 'Red Deer—Lacombe', 'St. Albert—Edmonton',
    'Sturgeon River—Parkland', 'Yellowhead',
  ],
  MB: [
    'Brandon—Souris', 'Churchill—Keewatinook Aski', 'Dauphin—Swan River', 'Elmwood—Transcona',
    'Kildonan—St. Paul', 'Portage—Lisgar', 'Provencher', 'Saint Boniface—Saint Vital',
    'Selkirk—Interlake—Eastman', 'Southdale', 'Winnipeg Centre', 'Winnipeg North',
    'Winnipeg South', 'Winnipeg South Centre', 'Winnipeg—Assiniboine',
  ],
  SK: [
    'Battlefords—Lloydminster', 'Carlton Trail—Eagle Creek', 'Desnethé—Missinippi—Churchill River',
    'Moose Jaw—Lake Centre—Lanigan', 'Prince Albert', 'Regina—Lewvan',
    'Regina—Qu\'Appelle', 'Regina—Wascana', 'Saskatoon—Garrison', 'Saskatoon—Grasswood',
    'Saskatoon West', 'Saskatoon—University', 'Souris—Moose Mountain', 'Yorkton—Melville',
  ],
  NS: [
    'Cape Breton—Canso', 'Central Nova', 'Cumberland—Colchester', 'Dartmouth—Cole Harbour',
    'Halifax', 'Halifax West', 'Kings—Hants', 'Pictou—Antigonish—Guysborough',
    'South Shore—St. Margarets', 'Sydney—Victoria', 'West Nova',
  ],
  NB: [
    'Acadie—Bathurst', 'Beauséjour', 'Fredericton', 'Fundy Royal', 'Madawaska—Restigouche',
    'Moncton—Riverview—Dieppe', 'Miramichi—Grand Lake', 'New Brunswick Southwest',
    'Saint John—Rothesay', 'Tobique—Mactaquac',
  ],
  NL: [
    'Avalon', 'Bonavista—Burin—Trinity', 'Coast of Bays—Central—Notre Dame',
    'Labrador', 'Long Range Mountains', 'St. John\'s East', 'St. John\'s South—Mount Pearl',
  ],
  PE: ['Cardigan', 'Charlottetown', 'Egmont', 'Malpeque'],
  YT: ['Yukon'],
  NT: ['Northwest Territories'],
  NU: ['Nunavut'],
};

function getVulnerability(margin: number): RidingData['vulnerability'] {
  if (margin <= 2) return 'ultra_marginal';
  if (margin <= 5) return 'tossup';
  if (margin <= 10) return 'lean';
  if (margin <= 18) return 'likely';
  return 'safe';
}

export function generateRidingData(
  playerPartyId: string,
  currentSeats: SeatCount,
  approval: number
): RidingData[] {
  const ridings: RidingData[] = [];

  REAL_PROVINCES.forEach(province => {
    const names = ALL_RIDING_NAMES[province.code] || [];
    const partyIds = PARTIES.filter(p => (currentSeats[p.id] || 0) > 0).map(p => p.id);

    // Distribute seats to provinces proportionally
    const totalNational = Object.values(currentSeats).reduce((a, b) => (a as number) + (b as number), 0) as number;

    for (let i = 0; i < province.seats; i++) {
      const ridingName = names[i] || `${province.name} Riding ${i + 1}`;
      const margin = 1 + Math.random() * 30;
      const vulnerability = getVulnerability(margin);

      // Determine holder based on seat proportions in province
      let holder = playerPartyId;
      const rand = Math.random() * 100;
      let cumulative = 0;
      for (const pid of partyIds) {
        const share = ((currentSeats[pid] || 0) / (totalNational || 1)) * 100 * 2.5;
        cumulative += share;
        if (rand <= cumulative) { holder = pid; break; }
      }

      // Generate riding poll
      const poll: Record<string, number> = {};
      const playerBase = Math.max(5, Math.min(55, approval * 0.4 + (Math.random() * 20 - 10)));
      poll[playerPartyId] = playerBase;
      let rem = 100 - playerBase;
      PARTIES.filter(p => p.id !== playerPartyId).forEach((p, idx, arr) => {
        if (idx === arr.length - 1) { poll[p.id] = Math.max(0, rem); }
        else {
          const s = Math.max(0, Math.min(rem, (p.baseSupport / 100) * rem * (0.8 + Math.random() * 0.4)));
          poll[p.id] = Math.round(s);
          rem -= poll[p.id];
        }
      });

      // Projected winner
      const projectedWinner = Object.entries(poll).sort(([, a], [, b]) => b - a)[0]?.[0] || playerPartyId;

      ridings.push({
        name: ridingName,
        provinceCode: province.code,
        currentHolder: holder,
        marginPct: parseFloat(margin.toFixed(1)),
        vulnerability,
        campaignSpending: {},
        poll,
        projectedWinner,
      });
    }
  });

  return ridings;
}

// ── Generate Election Polls ───────────────────────────────────────────────────
export function generateElectionPolls(
  playerPartyId: string,
  stats: PlayerStats,
  currentSeats: SeatCount,
  campaignBonus: number = 0
): ElectionPoll {
  const baseShare = stats.approvalRating * 0.38 + campaignBonus;
  const results: Record<string, number> = {};
  results[playerPartyId] = Math.max(5, Math.min(48, baseShare));

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

// ── Initialize Campaign ───────────────────────────────────────────────────────
export function initializeCampaign(
  playerPartyId: string,
  stats: PlayerStats,
  gameWeek: number = 1,
  currentSeats: SeatCount = {}
): CampaignState {
  const ridingData = generateRidingData(playerPartyId, currentSeats, stats.approvalRating);
  const vulnerable = ridingData.filter(r =>
    r.vulnerability === 'tossup' || r.vulnerability === 'ultra_marginal'
  ).slice(0, 40);
  const totalBudget = 20_000_000; // $20M campaign budget

  return {
    week: 1,
    gameWeekStart: gameWeek,
    playerPartyId,
    polls: [generateElectionPolls(playerPartyId, stats, currentSeats, 0)],
    provincePollData: generateProvincePollData(playerPartyId, stats, [], {}),
    campaignedProvinces: [],
    debateCompleted: false,
    debateScore: 50,
    campaignEvents: [],
    rallyCosts: 0,
    approval: {},
    candidateSpending: {},
    ridingData,
    vulnerableRidings: vulnerable,
    spendingPool: totalBudget,
    totalBudget,
  };
}

// ── Campaign in Province ──────────────────────────────────────────────────────
export function campaignInProvince(
  campaign: CampaignState,
  provinceCode: string,
  stats: PlayerStats
): CampaignState {
  const visitCost = 800_000;
  const effect = 2.5 + Math.random() * 4;
  const event: CampaignEvent = {
    id: `rally_${Date.now()}`,
    province: provinceCode,
    type: 'rally',
    effect,
    description: `Successful rally in ${provinceCode} boosts regional support by +${effect.toFixed(1)}%`,
    week: campaign.week,
  };

  const newSpending = Math.min(campaign.totalBudget, campaign.rallyCosts + visitCost);
  const newPool = Math.max(0, campaign.spendingPool - visitCost);
  const newCandidateSpending = {
    ...campaign.candidateSpending,
    [provinceCode]: (campaign.candidateSpending[provinceCode] || 0) + visitCost,
  };

  const newProvincePoll = generateProvincePollData(
    campaign.playerPartyId,
    stats,
    [...campaign.campaignedProvinces, provinceCode],
    newCandidateSpending
  );

  return {
    ...campaign,
    campaignedProvinces: [...campaign.campaignedProvinces, provinceCode],
    campaignEvents: [...campaign.campaignEvents, event],
    rallyCosts: newSpending,
    spendingPool: newPool,
    candidateSpending: newCandidateSpending,
    approval: {
      ...campaign.approval,
      [provinceCode]: (campaign.approval[provinceCode] || 50) + effect,
    },
    provincePollData: newProvincePoll,
  };
}

// ── Spend on Riding ─────────────────────────────────────────────────────────
export function spendOnRiding(
  campaign: CampaignState,
  ridingName: string,
  amount: number
): CampaignState {
  if (campaign.spendingPool < amount) return campaign;
  return {
    ...campaign,
    spendingPool: campaign.spendingPool - amount,
    rallyCosts: campaign.rallyCosts + amount,
    ridingData: campaign.ridingData.map(r =>
      r.name === ridingName
        ? {
            ...r,
            campaignSpending: {
              ...r.campaignSpending,
              [campaign.playerPartyId]: (r.campaignSpending[campaign.playerPartyId] || 0) + amount,
            },
            poll: {
              ...r.poll,
              [campaign.playerPartyId]: Math.min(75, (r.poll[campaign.playerPartyId] || 30) + (amount / 250_000)),
            },
          }
        : r
    ),
  };
}

// ── HARDER Election Simulation ─────────────────────────────────────────────────
// Elections are harder: player needs good approval + campaign strategy to win.
// Base vote share is meaningfully lower; incumbency penalty exists; regional variance is higher.
export function simulateElectionResults(
  playerPartyId: string,
  stats: PlayerStats,
  campaignState: CampaignState,
  currentSeats: SeatCount
): ElectionNightResult {
  // HARDER: lower base, requires approval >50 to be competitive
  const isIncumbent = currentSeats[playerPartyId] >= MAJORITY_SEATS;
  const incumbencyBonus = isIncumbent ? -3 : 2; // incumbents face drag if approval low
  const approvalFactor = (stats.approvalRating - 40) * 0.35; // meaningful but not deterministic
  const debateImpact = (campaignState.debateScore - 50) * 0.12;
  const visitBonus = Math.min(6, campaignState.campaignedProvinces.length * 0.8);
  const spendingBonus = Math.min(4, (campaignState.rallyCosts / 10_000_000));

  // HARDER: player base is 25-42% vote share
  const baseVoteShare = Math.max(18, Math.min(44,
    28 + approvalFactor + debateImpact + visitBonus + spendingBonus + incumbencyBonus
  ));

  const provinceResults: ProvinceResult[] = [];
  const totalSeats: SeatCount = {};
  PARTIES.forEach(p => { totalSeats[p.id] = 0; });
  totalSeats['independent'] = 0;

  // Regional base tendencies — more accurate FPTP modeling
  const regionalBase: Record<string, Record<string, number>> = {
    AB: { conservative: 56, liberal: 15, ndp: 21, bloc: 0, green: 4, ppc: 4 },
    SK: { conservative: 54, liberal: 18, ndp: 22, bloc: 0, green: 4, ppc: 2 },
    MB: { conservative: 41, liberal: 27, ndp: 25, bloc: 0, green: 5, ppc: 2 },
    ON: { conservative: 36, liberal: 37, ndp: 17, bloc: 0, green: 6, ppc: 4 },
    QC: { conservative: 17, liberal: 21, ndp: 11, bloc: 40, green: 5, ppc: 4, independent: 2 },
    BC: { conservative: 33, liberal: 25, ndp: 29, bloc: 0, green: 9, ppc: 4 },
    NL: { conservative: 24, liberal: 53, ndp: 17, bloc: 0, green: 4, ppc: 2 },
    NS: { conservative: 32, liberal: 37, ndp: 24, bloc: 0, green: 5, ppc: 2 },
    NB: { conservative: 39, liberal: 34, ndp: 18, bloc: 5, green: 3, ppc: 1 },
    PE: { conservative: 31, liberal: 47, ndp: 14, bloc: 0, green: 7, ppc: 1 },
    YT: { conservative: 27, liberal: 37, ndp: 30, bloc: 0, green: 5, ppc: 1 },
    NT: { conservative: 24, liberal: 41, ndp: 29, bloc: 0, green: 4, ppc: 2 },
    NU: { conservative: 21, liberal: 43, ndp: 31, bloc: 0, green: 3, ppc: 2 },
  };

  REAL_PROVINCES.forEach(province => {
    const provinceCampaignBonus = campaignState.campaignedProvinces.includes(province.code) ? 4 : 0;
    const spendingEffect = Math.min(5, ((campaignState.candidateSpending?.[province.code] || 0) / 500000));
    const baseForProvince = regionalBase[province.code] || {};
    const provincialPlayerBase = baseForProvince[playerPartyId] || 22;

    // Adjust player share by national trend and regional factors
    const nationalSwing = baseVoteShare - 28;
    const provincePlayerShare = Math.max(5, Math.min(65,
      provincialPlayerBase + nationalSwing * 0.7 + provinceCampaignBonus + spendingEffect + (Math.random() * 10 - 5)
    ));

    const voteShare: Record<string, number> = {};
    voteShare[playerPartyId] = provincePlayerShare;

    // Distribute remaining votes using regional baselines
    let remaining = 100 - provincePlayerShare;
    const otherParties = PARTIES.filter(p => p.id !== playerPartyId);
    const otherTotal = otherParties.reduce((s, p) => s + (baseForProvince[p.id] || 3), 0) || 1;

    otherParties.forEach((party, idx) => {
      const regionalShare = (baseForProvince[party.id] || 3);
      if (idx === otherParties.length - 1) {
        voteShare[party.id] = Math.max(0, remaining);
      } else {
        const share = Math.max(0, Math.min(remaining,
          (regionalShare / otherTotal) * remaining * (0.88 + Math.random() * 0.24)
        ));
        voteShare[party.id] = share;
        remaining -= share;
      }
    });
    voteShare['independent'] = Math.max(0, remaining);

    // FPTP seat allocation — realistic with swing variance per riding
    const seats: SeatCount = {};
    PARTIES.forEach(p => { seats[p.id] = 0; });

    for (let seat = 0; seat < province.seats; seat++) {
      // Each riding has variance: ±8% uniform swing
      const ridingVariance = (Math.random() - 0.5) * 16;
      const ridingShare: Record<string, number> = {};
      let ridingTotal = 0;
      Object.entries(voteShare).forEach(([pid, pct]) => {
        const adjusted = Math.max(0, pct + (pid === playerPartyId ? ridingVariance : -ridingVariance * 0.4));
        ridingShare[pid] = adjusted;
        ridingTotal += adjusted;
      });
      // Normalize
      Object.keys(ridingShare).forEach(pid => { ridingShare[pid] = (ridingShare[pid] / ridingTotal) * 100; });

      const winner = simulateSeat(ridingShare);
      seats[winner] = (seats[winner] || 0) + 1;
      totalSeats[winner] = (totalSeats[winner] || 0) + 1;
    }

    provinceResults.push({ provinceCode: province.code, seats, voteShare, declared: false });
  });

  const playerSeats = totalSeats[playerPartyId] || 0;
  const maxSeats = Math.max(...Object.values(totalSeats).filter(v => typeof v === 'number'));
  const winnerParty = Object.keys(totalSeats).find(k => totalSeats[k] === maxSeats) || playerPartyId;

  return {
    provinceResults,
    totalSeats,
    declared: false,
    winner: winnerParty,
    playerSeats,
    playerVotePct: Math.round(baseVoteShare * 10) / 10,
  };
}

function simulateSeat(voteShare: Record<string, number>): string {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const [partyId, share] of Object.entries(voteShare)) {
    cumulative += share;
    if (rand <= cumulative) return partyId;
  }
  return Object.keys(voteShare)[0] || 'liberal';
}

// ── Debate Questions ──────────────────────────────────────────────────────────
export const DEBATE_QUESTIONS: DebateQuestion[] = [
  {
    id: 'q1',
    question: "Canada's inflation rate has hit 4.5%. What is your plan to bring costs down for Canadians?",
    topic: 'Economy',
    answers: [
      { id: 'a1', text: 'We will implement targeted tax relief for middle-class families and work with the Bank of Canada to control monetary policy.', effect: 4, boldness: 'moderate' },
      { id: 'a2', text: 'My plan involves cutting $50 billion in government waste and returning money directly to Canadians.', effect: 6, boldness: 'bold' },
      { id: 'a3', text: 'We need to study the data further and consult with economists before making specific commitments.', effect: -3, boldness: 'safe' },
    ],
  },
  {
    id: 'q2',
    question: 'Indigenous communities still lack clean drinking water. What will you do differently from past governments?',
    topic: 'Indigenous Affairs',
    answers: [
      { id: 'a1', text: 'We will commit to eliminating all long-term boil water advisories within 18 months and enshrine water rights in law.', effect: 8, boldness: 'bold' },
      { id: 'a2', text: 'This requires a comprehensive whole-of-government approach with dedicated funding and Indigenous partnership.', effect: 3, boldness: 'moderate' },
      { id: 'a3', text: 'The previous government failed. We will release a detailed plan within 90 days of taking office.', effect: 1, boldness: 'safe' },
    ],
  },
  {
    id: 'q3',
    question: "Canada's relationship with the United States is strained. How will you handle cross-border relations?",
    topic: 'Foreign Affairs',
    answers: [
      { id: 'a1', text: 'Canada will stand firm. We will not capitulate to economic threats and will diversify our trade relationships globally.', effect: 7, boldness: 'bold' },
      { id: 'a2', text: 'We need to re-engage Washington at the highest levels and rebuild the relationship on mutual respect.', effect: 4, boldness: 'moderate' },
      { id: 'a3', text: 'Canadian foreign policy must be independent. I will convene a trade security summit within my first 100 days.', effect: 2, boldness: 'safe' },
    ],
  },
  {
    id: 'q4',
    question: 'Young Canadians cannot afford homes. Will you commit to specific housing targets?',
    topic: 'Housing',
    answers: [
      { id: 'a1', text: 'We commit to building 500,000 homes per year and will tie infrastructure funding to municipal zoning reform.', effect: 9, boldness: 'bold' },
      { id: 'a2', text: 'We will create a National Housing Authority and end exclusionary zoning nationwide.', effect: 6, boldness: 'moderate' },
      { id: 'a3', text: 'Housing is primarily a provincial responsibility, but we will work with partners to increase supply.', effect: -4, boldness: 'safe' },
    ],
  },
  {
    id: 'q5',
    question: 'Climate change is accelerating. Will you commit to net-zero by 2035?',
    topic: 'Environment',
    answers: [
      { id: 'a1', text: 'Yes — net-zero by 2035 with legally binding targets, a carbon border adjustment, and $30 billion in clean energy.', effect: 7, boldness: 'bold' },
      { id: 'a2', text: 'We support an accelerated path to net-zero aligned with science while protecting Canadian jobs.', effect: 3, boldness: 'moderate' },
      { id: 'a3', text: 'Net-zero by 2050 is achievable and we will work toward it without destroying the energy sector.', effect: -2, boldness: 'safe' },
    ],
  },
  {
    id: 'q6',
    question: "The national debt has hit $1.3 trillion. When will your government balance the budget?",
    topic: 'Fiscal Policy',
    answers: [
      { id: 'a1', text: 'We will balance the budget within 5 years through a combination of a 15% spending reduction and closing tax loopholes.', effect: 5, boldness: 'bold' },
      { id: 'a2', text: 'Fiscal responsibility requires growing our way out of debt. We will reduce the deficit-to-GDP ratio each year.', effect: 3, boldness: 'moderate' },
      { id: 'a3', text: "Deficits are appropriate in difficult times. Canada's debt-to-GDP ratio remains manageable.", effect: -5, boldness: 'safe' },
    ],
  },
];
