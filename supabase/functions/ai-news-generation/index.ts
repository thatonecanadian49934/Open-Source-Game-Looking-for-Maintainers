import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const OUTLET_PROFILES = [
  { name: 'CBC News',      bias: 'centre',       spinFactor: -0.1, sensationalism: 0.4 },
  { name: 'Globe and Mail',bias: 'centre-right', spinFactor:  0.2, sensationalism: 0.3 },
  { name: 'Toronto Star',  bias: 'centre-left',  spinFactor: -0.3, sensationalism: 0.5 },
  { name: 'National Post', bias: 'right',        spinFactor:  0.5, sensationalism: 0.4 },
  { name: 'La Presse',     bias: 'centre',       spinFactor: -0.1, sensationalism: 0.3 },
  { name: 'CTV News',      bias: 'centre',       spinFactor:  0.0, sensationalism: 0.6 },
  { name: 'iPolitics',     bias: 'centre',       spinFactor:  0.0, sensationalism: 0.2 },
  { name: 'Rebel News',    bias: 'far-right',    spinFactor:  0.9, sensationalism: 0.9 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      trigger,         // 'event_choice' | 'policy' | 'press_statement' | 'election' | 'weekly'
      headline,        // short summary of what happened (player-generated)
      partyName,
      partyShortName,
      leaderName,
      isGoverning,
      stats,
      currentWeek,
      outletCount,     // how many outlets to generate (1-4)
    } = await req.json();

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      throw new Error('OnSpace AI not configured');
    }

    // Select random outlets
    const shuffled = [...OUTLET_PROFILES].sort(() => Math.random() - 0.5);
    const outlets = shuffled.slice(0, Math.min(outletCount || 3, 4));

    const outletDescriptions = outlets.map(o =>
      `- ${o.name} (${o.bias} bias, sensationalism ${o.sensationalism.toFixed(1)})`
    ).join('\n');

    const systemPrompt = `You are a Canadian political journalism simulator. Generate realistic, unique news articles for different Canadian media outlets reacting to a political event.

Each outlet has its own editorial bias and tone:
- centre-left / left: more sympathetic to progressive policies, critical of fiscal conservatism
- centre: balanced but will focus on conflict and drama
- centre-right / right: skeptical of government spending, supportive of market solutions
- far-right: sensationalist, hostile to progressive policies and immigration, populist language

Rules:
- Each article MUST have a distinct angle based on the outlet's bias — not just rewording the same headline
- Headlines should be punchy, specific, and newspaper-quality (under 15 words)
- Body text: 2-3 sentences, written as actual journalism, OTTAWA dateline
- Reference real Canadian context: Parliament Hill, the House, Senate, Canadian dollar, specific provinces if relevant
- If governing: articles critique/defend the government's record
- If opposition: articles debate whether the opposition is an effective alternative
- The player's approval rating (${stats?.approvalRating?.toFixed?.(0) ?? '45'}%) and economic context should influence tone
- GDP growth ${stats?.gdpGrowth?.toFixed?.(1) ?? '1.5'}%, inflation ${stats?.inflationRate?.toFixed?.(1) ?? '3.0'}%

CRITICAL: Return ONLY raw JSON, no markdown:
{"articles":[{"outlet":"name","headline":"text","body":"text","sentiment":"positive|negative|neutral","topic":"topic"}]}`;

    const userPrompt = `Generate ${outlets.length} distinct news articles from these outlets:
${outletDescriptions}

EVENT/TRIGGER: ${trigger}
WHAT HAPPENED: ${headline}
PARTY LEADER: ${leaderName} (${partyShortName})
PARTY: ${partyName}
ROLE: ${isGoverning ? 'Prime Minister / Governing Party' : 'Leader of the Official Opposition'}
WEEK: ${currentWeek} of Parliament

Each article must reflect its outlet's unique editorial bias. Make them feel like real Canadian journalism.`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI error: ${response.status} — ${errText}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? '';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback with static articles
      parsed = {
        articles: outlets.map((o, i) => ({
          outlet: o.name,
          headline: o.spinFactor > 0.3
            ? `${partyShortName} draws criticism over latest move, observers say`
            : o.spinFactor < 0
            ? `${leaderName} makes strong case for ${partyShortName} vision`
            : `${partyShortName} action dominates Parliament Hill discussion`,
          body: `OTTAWA — ${headline}. The announcement has drawn mixed reactions from across the political spectrum. Parliament observers are watching closely as ${partyName} navigates a challenging political environment.`,
          sentiment: o.spinFactor > 0.3 ? 'negative' : o.spinFactor < -0.1 ? 'positive' : 'neutral',
          topic: 'Politics',
        })),
      };
    }

    // Attach outlet name to ensure match
    const articles = (parsed.articles || []).slice(0, outlets.length).map((a: any, i: number) => ({
      ...a,
      outlet: outlets[i]?.name || a.outlet,
    }));

    return new Response(JSON.stringify({ articles }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI News Generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
