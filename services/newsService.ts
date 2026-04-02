// Powered by OnSpace.AI
import { NEWS_OUTLETS, NewsArticle } from './gameEngine';
import { PARTIES } from '@/constants/parties';

export interface NewsOutletProfile {
  name: string;
  bias: string;
  spinFactor: number; // -1 (left) to 1 (right)
  sensationalism: number; // 0-1
  logo: string;
  color: string;
}

export const OUTLET_PROFILES: NewsOutletProfile[] = [
  { name: 'CBC News', bias: 'centre', spinFactor: -0.1, sensationalism: 0.4, logo: 'radio', color: '#CC0000' },
  { name: 'Globe and Mail', bias: 'centre-right', spinFactor: 0.2, sensationalism: 0.3, logo: 'newspaper-variant', color: '#1a1a2e', },
  { name: 'Toronto Star', bias: 'centre-left', spinFactor: -0.3, sensationalism: 0.5, logo: 'star', color: '#E8272A' },
  { name: 'National Post', bias: 'right', spinFactor: 0.5, sensationalism: 0.4, logo: 'newspaper', color: '#003478' },
  { name: 'La Presse', bias: 'centre', spinFactor: -0.1, sensationalism: 0.3, logo: 'newspaper-variant-outline', color: '#1C3F6E' },
  { name: 'CTV News', bias: 'centre', spinFactor: 0.0, sensationalism: 0.6, logo: 'television', color: '#005AA1' },
  { name: 'iPolitics', bias: 'centre', spinFactor: 0.0, sensationalism: 0.2, logo: 'web', color: '#2C5F2E' },
  { name: 'Rebel News', bias: 'far-right', spinFactor: 0.9, sensationalism: 0.9, logo: 'fire', color: '#8B0000' },
];

export function generatePolicyNews(
  policyText: string,
  partyId: string,
  playerName: string,
  week: number
): NewsArticle[] {
  const party = PARTIES.find(p => p.id === partyId);
  const articles: NewsArticle[] = [];
  
  const outletsToUse = OUTLET_PROFILES.sort(() => Math.random() - 0.5).slice(0, 3);
  
  outletsToUse.forEach(outlet => {
    const isPositive = outlet.spinFactor < 0.3;
    const sentiment: 'positive' | 'negative' | 'neutral' = 
      outlet.spinFactor < -0.1 ? 'positive' : 
      outlet.spinFactor > 0.3 ? 'negative' : 'neutral';
    
    const headlines = {
      positive: [
        `${party?.shortName} unveils bold new policy platform that could reshape Canada`,
        `Political analysts praise ${party?.name} vision for Canada's future`,
        `"Game-changing" — ${playerName}'s new policy draws rare cross-party praise`,
      ],
      negative: [
        `Experts warn ${party?.shortName} policy could cost billions, experts say`,
        `${playerName}'s new platform raises serious questions, critics charge`,
        `${party?.name} policy slammed as "out of touch" by industry groups`,
      ],
      neutral: [
        `${party?.shortName} releases new policy document ahead of parliamentary session`,
        `${playerName} outlines vision in comprehensive policy announcement`,
        `Parliament braces for debate as ${party?.name} tables new agenda`,
      ],
    };
    
    const headlineList = headlines[sentiment];
    const headline = headlineList[Math.floor(Math.random() * headlineList.length)];
    
    articles.push({
      id: `policy_news_${Date.now()}_${Math.random()}`,
      week,
      outlet: outlet.name,
      headline,
      body: generatePolicyNewsBody(policyText, party?.name || '', outlet, playerName),
      sentiment,
      topic: 'Policy',
    });
  });
  
  return articles;
}

function generatePolicyNewsBody(policy: string, partyName: string, outlet: NewsOutletProfile, playerName: string): string {
  const positive = outlet.spinFactor < 0;
  const intro = positive 
    ? `OTTAWA — ${playerName} and the ${partyName} unveiled a comprehensive new policy platform this week that advocates say could mark a turning point for Canadian governance.`
    : `OTTAWA — ${playerName} and the ${partyName} released a new policy document this week, drawing immediate criticism from opposition parties and policy experts.`;
    
  return `${intro} The announcement, which covers ${policy.substring(0, 100)}${policy.length > 100 ? '...' : ''}, is expected to dominate parliamentary debate in the coming weeks. Political analysts are divided on the platform's economic implications, with some projecting significant fiscal consequences. The opposition has promised to scrutinize the proposal carefully in committee.`;
}

export function generatePressStatementReaction(
  statement: string,
  partyId: string,
  playerName: string,
  week: number
): NewsArticle[] {
  const party = PARTIES.find(p => p.id === partyId);
  const articles: NewsArticle[] = [];
  
  const outlets = OUTLET_PROFILES.sort(() => Math.random() - 0.5).slice(0, 4);
  
  outlets.forEach(outlet => {
    const angle = outlet.spinFactor > 0.3 ? 'skeptical' : outlet.spinFactor < -0.1 ? 'supportive' : 'neutral';
    
    const headline = angle === 'supportive'
      ? `${playerName} makes strong case for ${party?.shortName} vision in forceful statement`
      : angle === 'skeptical'
      ? `Critics blast ${playerName}'s press statement as "politically motivated"`
      : `${party?.shortName} leader issues statement on parliamentary priorities`;
    
    articles.push({
      id: `press_news_${Date.now()}_${Math.random()}`,
      week,
      outlet: outlet.name,
      headline,
      body: `OTTAWA — ${playerName}, leader of the ${party?.name}, issued a formal statement this week. "${statement.substring(0, 150)}${statement.length > 150 ? '...' : ''}" — the statement has drawn mixed reactions from across the political spectrum, with allies praising the clarity of vision while opponents dismissed it as partisan positioning.`,
      sentiment: angle === 'supportive' ? 'positive' : angle === 'skeptical' ? 'negative' : 'neutral',
      topic: 'Politics',
    });
  });
  
  return articles;
}

export function generateQuestionPeriodNews(
  question: string,
  playerPartyId: string,
  playerName: string,
  performance: 'excellent' | 'good' | 'poor',
  week: number
): NewsArticle {
  const party = PARTIES.find(p => p.id === playerPartyId);
  const outlet = OUTLET_PROFILES[Math.floor(Math.random() * OUTLET_PROFILES.length)];
  
  const headlines = {
    excellent: `${playerName} dominates Question Period with forceful performance`,
    good: `${party?.shortName} leader holds own in heated Question Period exchange`,
    poor: `${playerName} stumbles in Question Period under intense opposition pressure`,
  };
  
  return {
    id: `qp_news_${Date.now()}`,
    week,
    outlet: outlet.name,
    headline: headlines[performance],
    body: `PARLIAMENT HILL — The House of Commons witnessed a charged Question Period session as ${playerName} faced pointed questions on "${question.substring(0, 80)}". Observers rated the ${party?.shortName} leader's performance as ${performance === 'excellent' ? 'commanding and precise' : performance === 'good' ? 'competent if not spectacular' : 'shaky under pressure'}.`,
    sentiment: performance === 'excellent' ? 'positive' : performance === 'poor' ? 'negative' : 'neutral',
    topic: 'Parliament',
  };
}
