import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      policyTitle,
      policyText,
      selectedTopics,
      partyName,
      partyShortName,
      partyIdeology,
      leaderName,
      isGoverning,
      isMajority,
      stats,
      seats,
      currentWeek,
      parliamentNumber,
    } = await req.json();

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) throw new Error('OnSpace AI not configured');

    const systemPrompt = `You are an expert Canadian political analyst and policy economist. Simulate realistic impacts of a political party's policy announcement in the Canadian federal parliamentary context.

Context:
- Party: ${partyName} (${partyShortName}), ideology: ${partyIdeology}
- Leader: ${leaderName}
- Role: ${isGoverning ? `Prime Minister / Governing ${isMajority ? 'Majority' : 'Minority'} Government` : 'Leader of the Official Opposition'}
- Current Week: ${currentWeek} of Parliament #${parliamentNumber}
- Approval Rating: ${stats?.approvalRating?.toFixed?.(0) ?? 45}%
- Party Standing: ${stats?.partyStanding?.toFixed?.(0) ?? 50}%
- GDP Growth: ${stats?.gdpGrowth?.toFixed?.(1) ?? '1.5'}%
- Inflation: ${stats?.inflationRate?.toFixed?.(1) ?? '3.0'}%
- Unemployment: ${stats?.unemploymentRate?.toFixed?.(1) ?? '5.8'}%
- National Debt: $${stats?.nationalDebt?.toFixed?.(0) ?? '1200'}B

Rules for simulation:
- Be realistic and partisan-aware. Left-leaning policies (healthcare, social programs) boost approval among NDP/Liberal voters but lose rural and conservative voters
- Right-leaning policies (tax cuts, deregulation) lose urban progressives but gain suburban and rural support
- Quebec-specific policies have outsized regional effects
- Governs with ${isMajority ? 'majority — can pass legislation' : 'minority — needs coalition support'}
- Approval changes should be realistic (typically -8 to +8 per week)
- Fiscal impacts must be grounded in real Canadian budget scale ($2.2T GDP, $1.2T debt)
- Opposition reaction should name the likely critic party (Conservatives, NDP, Bloc, etc.)
- Media reaction should reference specific Canadian outlets (Globe and Mail, National Post, Toronto Star)

CRITICAL: Return ONLY raw JSON, no markdown. Format:
{
  "approvalChange": <number -8 to +8>,
  "partyStandingChange": <number -5 to +6>,
  "gdpImpact": "<e.g. +0.3% over 5yrs>",
  "debtImpact": "<e.g. -$8B/yr or +$15B>",
  "regionalBreakdown": [
    {"region": "Ontario", "impact": "<one sentence>", "change": <number>},
    {"region": "Quebec", "impact": "<one sentence>", "change": <number>},
    {"region": "Prairie Provinces", "impact": "<one sentence>", "change": <number>},
    {"region": "British Columbia", "impact": "<one sentence>", "change": <number>},
    {"region": "Atlantic Canada", "impact": "<one sentence>", "change": <number>}
  ],
  "oppositionReaction": "<2-3 sentence realistic political attack or critique>",
  "mediaReaction": "<2-3 sentence realistic Canadian media summary — name specific outlets>",
  "likelyPassage": "<one sentence on likelihood of passing as legislation>",
  "keyRisks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "keyBenefits": ["<benefit 1>", "<benefit 2>", "<benefit 3>"],
  "overallVerdict": "<one punchy sentence summary — journalist style>"
}`;

    const userPrompt = `POLICY ANNOUNCEMENT by ${leaderName} (${partyShortName}):

TITLE: "${policyTitle}"
TOPICS: ${(selectedTopics || []).join(', ') || 'General'}

FULL POLICY TEXT:
${policyText}

Simulate the full political, economic, and electoral impact of this policy announcement in the Canadian federal context. Be specific, realistic, and partisan-aware.`;

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
      const err = await response.text();
      throw new Error(`AI error: ${response.status} — ${err}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? '';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let simulation: any;
    try {
      simulation = JSON.parse(content);
    } catch {
      simulation = {
        approvalChange: 2,
        partyStandingChange: 1,
        gdpImpact: '+0.2%',
        debtImpact: '+$5B',
        regionalBreakdown: [
          { region: 'Ontario', impact: 'Mixed urban and suburban reaction.', change: 2 },
          { region: 'Quebec', impact: 'Cautious reception from francophone voters.', change: 1 },
          { region: 'Prairie Provinces', impact: 'Skeptical response from rural voters.', change: -1 },
          { region: 'British Columbia', impact: 'Broadly positive in Metro Vancouver.', change: 3 },
          { region: 'Atlantic Canada', impact: 'Modest support in smaller markets.', change: 2 },
        ],
        oppositionReaction: 'The opposition immediately questioned the costing of the proposal and demanded a Parliamentary Budget Office analysis.',
        mediaReaction: 'The Globe and Mail called it "ambitious but vague on details," while the Toronto Star praised the intent. National Post questioned fiscal prudence.',
        likelyPassage: 'Would require coalition support to advance through committee.',
        keyRisks: ['Implementation costs may exceed projections', 'Provincial resistance is likely', 'Opposition may filibuster'],
        keyBenefits: ['Addresses a key voter concern', 'Differentiates the platform', 'Strong urban appeal'],
        overallVerdict: 'A credible policy move with real political upside — details will determine success.',
      };
    }

    return new Response(JSON.stringify({ simulation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Policy simulation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
