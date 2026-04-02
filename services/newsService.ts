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
  { name: 'CBC News',       bias: 'centre',       spinFactor: -0.1, sensationalism: 0.4, logo: 'radio',                    color: '#CC0000' },
  { name: 'Globe and Mail', bias: 'centre-right', spinFactor:  0.2, sensationalism: 0.3, logo: 'newspaper-variant',        color: '#1a1a2e' },
  { name: 'Toronto Star',   bias: 'centre-left',  spinFactor: -0.3, sensationalism: 0.5, logo: 'star',                     color: '#E8272A' },
  { name: 'National Post',  bias: 'right',        spinFactor:  0.5, sensationalism: 0.4, logo: 'newspaper',                color: '#003478' },
  { name: 'La Presse',      bias: 'centre',       spinFactor: -0.1, sensationalism: 0.3, logo: 'newspaper-variant-outline',color: '#1C3F6E' },
  { name: 'CTV News',       bias: 'centre',       spinFactor:  0.0, sensationalism: 0.6, logo: 'television',               color: '#005AA1' },
  { name: 'iPolitics',      bias: 'centre',       spinFactor:  0.0, sensationalism: 0.2, logo: 'web',                      color: '#2C5F2E' },
  { name: 'Rebel News',     bias: 'far-right',    spinFactor:  0.9, sensationalism: 0.9, logo: 'fire',                     color: '#8B0000' },
];

// ── Static fallback generators (used when AI is unavailable / offline) ─────────

export function generatePolicyNews(
  policyText: string,
  partyId: string,
  playerName: string,
  week: number
): NewsArticle[] {
  const party = PARTIES.find(p => p.id === partyId);
  const outlets = OUTLET_PROFILES.sort(() => Math.random() - 0.5).slice(0, 3);

  return outlets.map(outlet => {
    const sentiment: 'positive' | 'negative' | 'neutral' =
      outlet.spinFactor < -0.1 ? 'positive' : outlet.spinFactor > 0.3 ? 'negative' : 'neutral';

    const headlines = {
      positive: [
        `${party?.shortName} unveils bold policy that could reshape Canada`,
        `Political analysts praise ${party?.name} vision for Canada's future`,
      ],
      negative: [
        `Experts warn ${party?.shortName} policy could cost billions`,
        `${playerName}'s platform raises serious questions, critics charge`,
      ],
      neutral: [
        `${party?.shortName} releases new policy document ahead of session`,
        `${playerName} outlines vision in comprehensive policy announcement`,
      ],
    };

    const list = headlines[sentiment];
    return {
      id: `policy_news_${Date.now()}_${Math.random()}`,
      week,
      outlet: outlet.name,
      headline: list[Math.floor(Math.random() * list.length)],
      body: `OTTAWA — ${playerName} and the ${party?.name} unveiled a new policy platform. The announcement covers "${policyText.substring(0, 80)}${policyText.length > 80 ? '...' : ''}" and is expected to dominate parliamentary debate.`,
      sentiment,
      topic: 'Policy',
    };
  });
}

export function generatePressStatementReaction(
  statement: string,
  partyId: string,
  playerName: string,
  week: number
): NewsArticle[] {
  const party = PARTIES.find(p => p.id === partyId);
  const outlets = OUTLET_PROFILES.sort(() => Math.random() - 0.5).slice(0, 3);

  return outlets.map(outlet => {
    const angle = outlet.spinFactor > 0.3 ? 'skeptical' : outlet.spinFactor < -0.1 ? 'supportive' : 'neutral';
    const headline =
      angle === 'supportive'
        ? `${playerName} makes strong case for ${party?.shortName} vision in forceful statement`
        : angle === 'skeptical'
        ? `Critics blast ${playerName}'s press statement as "politically motivated"`
        : `${party?.shortName} leader issues statement on parliamentary priorities`;

    return {
      id: `press_news_${Date.now()}_${Math.random()}`,
      week,
      outlet: outlet.name,
      headline,
      body: `OTTAWA — ${playerName}, leader of the ${party?.name}, issued a formal statement: "${statement.substring(0, 120)}${statement.length > 120 ? '...' : ''}" The statement drew mixed reactions across the political spectrum.`,
      sentiment: angle === 'supportive' ? 'positive' : angle === 'skeptical' ? 'negative' : 'neutral',
      topic: 'Politics',
    };
  });
}

export function generateEventChoiceNews(
  eventTitle: string,
  choiceLabel: string,
  newsHeadline: string,
  partyId: string,
  playerName: string,
  week: number
): NewsArticle[] {
  const party = PARTIES.find(p => p.id === partyId);
  const outlets = OUTLET_PROFILES.sort(() => Math.random() - 0.5).slice(0, 3);

  return outlets.map(outlet => {
    const spinned = outlet.spinFactor > 0.3
      ? `Critics question ${party?.shortName}'s response to ${eventTitle.toLowerCase()}`
      : outlet.spinFactor < -0.1
      ? `${party?.shortName} response to ${eventTitle.toLowerCase()} praised by advocates`
      : newsHeadline;

    return {
      id: `event_news_${Date.now()}_${Math.random()}`,
      week,
      outlet: outlet.name,
      headline: spinned,
      body: `OTTAWA — ${playerName}'s ${party?.shortName} chose to "${choiceLabel}" in response to ${eventTitle}. ${spinned}. Parliamentary observers are watching closely as the government navigates a challenging political environment.`,
      sentiment: outlet.spinFactor < -0.1 ? 'positive' : outlet.spinFactor > 0.4 ? 'negative' : 'neutral',
      topic: 'Parliament',
    };
  });
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
    excellent: `${playerName} dominates Question Period with commanding performance`,
    good: `${party?.shortName} leader holds own in heated Question Period exchange`,
    poor: `${playerName} stumbles in Question Period under opposition pressure`,
  };

  return {
    id: `qp_news_${Date.now()}`,
    week,
    outlet: outlet.name,
    headline: headlines[performance],
    body: `PARLIAMENT HILL — ${playerName} faced pointed questions on "${question.substring(0, 80)}". Observers rated the ${party?.shortName} leader's performance as ${performance === 'excellent' ? 'commanding and precise' : performance === 'good' ? 'competent if not spectacular' : 'shaky under pressure'}.`,
    sentiment: performance === 'excellent' ? 'positive' : performance === 'poor' ? 'negative' : 'neutral',
    topic: 'Parliament',
  };
}

// ── AI news generation (client-side — calls edge function) ─────────────────────
// Returns articles array, or falls back silently to static generation.

export async function generateAINews(
  supabase: any,
  trigger: string,
  headline: string,
  partyId: string,
  playerName: string,
  isGoverning: boolean,
  stats: any,
  currentWeek: number,
  outletCount: number = 3
): Promise<NewsArticle[]> {
  const party = PARTIES.find(p => p.id === partyId);

  try {
    const { data, error } = await supabase.functions.invoke('ai-news-generation', {
      body: {
        trigger,
        headline,
        partyName: party?.name || 'Unknown Party',
        partyShortName: party?.shortName || 'UNK',
        leaderName: playerName,
        isGoverning,
        stats,
        currentWeek,
        outletCount,
      },
    });

    if (error || !data?.articles?.length) {
      throw new Error(error?.message || 'No articles returned');
    }

    return (data.articles as any[]).map((a: any) => ({
      id: `ai_news_${Date.now()}_${Math.random()}`,
      week: currentWeek,
      outlet: a.outlet || 'CBC News',
      headline: a.headline || headline,
      body: a.body || '',
      sentiment: (['positive', 'negative', 'neutral'].includes(a.sentiment) ? a.sentiment : 'neutral') as 'positive' | 'negative' | 'neutral',
      topic: a.topic || 'Politics',
    }));
  } catch {
    // Silent fallback
    return generatePressStatementReaction(headline, partyId, playerName, currentWeek);
  }
}
