import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      partyName,
      partyShortName,
      partyIdeology,
      leaderName,
      isGoverning,
      isMajority,
      stats,
      currentWeek,
      parliamentNumber,
      seats,
      recentEvents,
      recentNews,
    } = await req.json();

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) throw new Error('OnSpace AI not configured');

    const systemPrompt = `You are a Canadian political events generator for a parliamentary simulation game. Generate realistic, dramatically compelling weekly parliamentary events.

Context:
- Party: ${partyName} (${partyShortName}), ideology: ${partyIdeology}
- Leader: ${leaderName}
- Role: ${isGoverning ? `Prime Minister / ${isMajority ? 'Majority' : 'Minority'} Government` : 'Leader of the Official Opposition'}
- Week: ${currentWeek} of Parliament #${parliamentNumber}
- Approval: ${stats?.approvalRating?.toFixed(0)}%
- GDP Growth: ${stats?.gdpGrowth?.toFixed(1)}%
- Inflation: ${stats?.inflationRate?.toFixed(1)}%
- Unemployment: ${stats?.unemploymentRate?.toFixed(1)}%
- Debt: $${stats?.nationalDebt?.toFixed(0)}B

Recent events: ${(recentEvents || []).map((e: any) => e.title).join(', ') || 'None'}
Recent news: ${(recentNews || []).slice(0, 3).join('; ') || 'None'}

Rules:
- Generate 2-3 events appropriate for the current political/economic context
- Events should feel authentic to Canadian politics (reference Parliament Hill, provinces, CSIS, Bank of Canada, etc.)
- Each event must have 3 distinct choices with meaningfully different consequences
- ${isGoverning ? 'Governing party events: budget crises, cabinet scandals, international summits, legislation opportunities' : 'Opposition events: Question Period attacks, by-elections, confidence motion debates, party leadership challenges'}
- Effects should be realistic: approvalRating (-8 to +8), partyStanding (-6 to +6), gdpGrowth (-0.5 to +0.5), nationalDebt (-30 to +30)
- Make events feel contextual — if inflation is high, reference cost-of-living; if approval is low, reference leadership pressure
- Urgency: 'critical' events expire next week; 'high' in 2 weeks; 'medium' in 3 weeks
- Avoid repeating the recent events listed above

CRITICAL: Return ONLY raw JSON, no markdown:
{
  "events": [
    {
      "id": "unique_id_${currentWeek}_1",
      "title": "Event Title",
      "description": "2-3 sentence description of the political situation with Canadian context",
      "type": "economic|political|social|international|environmental|emergency|scandal|opportunity",
      "urgency": "low|medium|high|critical",
      "choices": [
        {
          "id": "choice_a",
          "label": "Short action label (3-6 words)",
          "description": "Brief explanation of this approach",
          "effects": {
            "approvalRating": <number>,
            "partyStanding": <number>,
            "governmentApproval": <number>,
            "gdpGrowth": <number>,
            "nationalDebt": <number>
          },
          "newsHeadline": "Realistic newspaper headline under 15 words"
        }
      ]
    }
  ]
}`;

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
          { role: 'user', content: `Generate 2-3 compelling weekly parliamentary events for week ${currentWeek} of Parliament. Make them contextually relevant to the current political situation and avoid repeating recent events.` },
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

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ events: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ events: parsed.events || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI Weekly Events error:', error);
    return new Response(
      JSON.stringify({ error: error.message, events: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
