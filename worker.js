export default {
  async fetch(request, env, ctx) {

    // ── CORS ────────────────────────────────────────────────────
    // Allow your Netlify domain + local dev
    const ALLOWED_ORIGINS = [
      'https://ledgerlearn-frontend.netlify.app',
      'https://ledgerlearn.pro',
      'http://localhost:3000',
      'http://127.0.0.1:5500',
    ];

    const origin = request.headers.get('Origin') || '';
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    const CORS = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight OPTIONS — must return 200 with CORS headers
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: CORS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/feedback') {
        return await handleFeedback(request, env, CORS);
      }
      if (url.pathname === '/api/generate-scenario') {
        return await handleScenario(request, env, CORS);
      }
      if (url.pathname === '/api/cert-text') {
        return await handleCertText(request, env, CORS);
      }
      if (url.pathname === '/health') {
        return json({ status: 'ok', worker: 'ledgerlearn', ts: Date.now() }, 200, CORS);
      }
      return json({ error: 'Not found' }, 404, CORS);
    } catch (err) {
      return json({ error: err.message }, 500, CORS);
    }
  }
};

// ── Route handlers ─────────────────────────────────────────────

async function handleFeedback(request, env, CORS) {
  const { question, selectedAnswer, correctAnswer, isCorrect } = await request.json();

  const prompt = isCorrect
    ? `The student answered correctly.
Question: "${question}"
Correct answer: "${correctAnswer}"
Give a 2-sentence reinforcement explaining WHY this is correct, in plain English for a bookkeeper. No preamble, no "Great job" opener.`
    : `The student answered incorrectly.
Question: "${question}"
They chose: "${selectedAnswer}"
Correct answer: "${correctAnswer}"
Give a 2-sentence explanation of why the correct answer is right and where they went wrong. Plain English for a bookkeeper. No preamble.`;

  const data = await callClaude(env.ANTHROPIC_API_KEY, prompt, 280);
  return json({ feedback: data.content[0].text }, 200, CORS);
}

async function handleScenario(request, env, CORS) {
  const { track, module, difficulty } = await request.json();

  const prompt = `Generate a realistic accounting scenario MCQ for a ${track || 'Xero'} software training course.
Module topic: ${module || 'Invoicing and bank reconciliation'}
Difficulty: ${difficulty || 'intermediate'}

Return ONLY valid JSON — no markdown, no backticks, no preamble:
{
  "context": "2-3 sentence business scenario with a real UK company name and specific numbers",
  "question": "specific question about what to do in the software",
  "options": ["option A", "option B", "option C", "option D"],
  "correct_index": 1,
  "explanation": "2 sentence explanation of why the correct answer is right"
}`;

  const data = await callClaude(env.ANTHROPIC_API_KEY, prompt, 520);
  const raw = data.content[0].text.trim().replace(/```json|```/g, '').trim();

  try {
    const scenario = JSON.parse(raw);
    return json(scenario, 200, CORS);
  } catch {
    return json({ error: 'Failed to parse scenario', raw }, 500, CORS);
  }
}

async function handleCertText(request, env, CORS) {
  const { studentName, track, score } = await request.json();

  const prompt = `Write a single warm congratulatory sentence for ${studentName || 'the student'} who passed the ${track || 'Xero Associate'} certification with a score of ${score || '80'}%. Professional but warm tone. Start with "Congratulations". No emojis.`;

  const data = await callClaude(env.ANTHROPIC_API_KEY, prompt, 120);
  return json({ text: data.content[0].text }, 200, CORS);
}

// ── Claude API call ─────────────────────────────────────────────
async function callClaude(apiKey, prompt, maxTokens) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API ${response.status}: ${err}`);
  }
  return response.json();
}

// ── JSON response helper ────────────────────────────────────────
function json(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
