import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      partyName,
      leaderName,
      isGoverning,
      stats,
      currentEvents,
      rivals,
      weekNumber,
      parliamentNumber,
      recentNewsHeadlines,
    } = await req.json();

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      throw new Error('OnSpace AI not configured');
    }

    const context = `
Party Leader: ${leaderName} (${partyName})
Role: ${isGoverning ? 'Prime Minister / Governing Party' : 'Leader of the Official Opposition'}
Parliament: Week ${weekNumber} of Parliament #${parliamentNumber}

CURRENT ECONOMIC INDICATORS:
- Approval Rating: ${stats.approvalRating.toFixed(1)}%
- GDP Growth: ${stats.gdpGrowth.toFixed(1)}%
- Inflation Rate: ${stats.inflationRate.toFixed(1)}%
- Unemployment: ${stats.unemploymentRate.toFixed(1)}%
- National Debt: $${Math.round(stats.nationalDebt)}B

CURRENT MAJOR ISSUES IN PARLIAMENT:
${currentEvents.map((e: any) => `- ${e.title}: ${e.description}`).join('\n')}

RIVAL PARTY LEADERS IN THE HOUSE:
${rivals.map((r: any) => `- ${r.name} (${r.party}), approval: ${Math.round(r.approval)}%`).join('\n')}

RECENT HEADLINES:
${recentNewsHeadlines?.slice(0, 5).join('\n') || 'None'}
`.trim();

    const systemPrompt = `You are simulating Question Period in the Canadian House of Commons — the most combative daily political ritual in Canadian democracy.

Generate exactly 4 sharp, confrontational Question Period questions. Rules:
- If the leader is GOVERNING: questions come from opposition critics attacking the government's record, scandals, broken promises, and economic mismanagement. Use specific dollar figures, percentages, and policy failures.
- If the leader is OPPOSITION: questions come from government MPs, journalists in scrums, and moderators testing the leader's credibility, alternative policies, and their own party's record.
- Questions must reference the actual current context (stats, events, rivals) provided — make them specific and hard-hitting.
- Each question must be written exactly as spoken in the House — direct, pointed, 1-3 sentences max.
- Vary the topics: economy, social policy, national security, leadership credibility.
- Include who is asking (e.g. "Conservative critic for Finance", "NDP Leader", "Globe and Mail journalist", "Government backbencher")

CRITICAL: Return ONLY a raw JSON object. No markdown fences, no explanation, just the JSON:
{"questions":[{"question":"text","topic":"Economy|Housing|Healthcare|Defence|Environment|Governance|Immigration|Indigenous|Justice|Leadership","askedBy":"name and role","difficulty":"medium|hard|brutal"}]}

Generate exactly 4 questions.`;

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
          { role: 'user', content: `Generate 4 Question Period questions based on this context:\n\n${context}` },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error: ${response.status} — ${errText}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? '';

    // Strip markdown code fences if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Structured fallback if AI response is malformed
      parsed = {
        questions: [
          {
            question: `${leaderName}, with your approval rating at ${stats.approvalRating.toFixed(0)}% — the lowest it has been this parliament — can you name one specific policy your party has delivered that actually improved the lives of ordinary Canadians?`,
            topic: 'Leadership',
            askedBy: rivals[0]?.name?.split(' (')[0] || 'Opposition Leader',
            difficulty: 'brutal',
          },
          {
            question: `Inflation is running at ${stats.inflationRate.toFixed(1)}% and families are struggling to afford groceries. Your party has been in the House for ${weekNumber} weeks. Why has nothing changed?`,
            topic: 'Economy',
            askedBy: 'Conservative critic for Finance',
            difficulty: 'hard',
          },
          {
            question: `The national debt now stands at $${Math.round(stats.nationalDebt)} billion. At what point does your party take fiscal responsibility seriously, or is reckless spending now the official platform?`,
            topic: 'Fiscal Policy',
            askedBy: 'Globe and Mail journalist',
            difficulty: 'hard',
          },
          {
            question: `Young Canadians cannot afford a home in any major city. Your government has had every opportunity to act. Why does your plan amount to nothing more than talking points?`,
            topic: 'Housing',
            askedBy: 'NDP Leader',
            difficulty: 'medium',
          },
        ],
      };
    }

    // Ensure we have exactly 4 questions
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error('Invalid questions format from AI');
    }

    return new Response(JSON.stringify({ questions: parsed.questions.slice(0, 4) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI Question Period error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
