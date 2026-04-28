addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // ── CORS headers on EVERY response, no exceptions ──────────
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // ── OPTIONS preflight — return immediately ──────────────────
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // ── Health check ────────────────────────────────────────────
  if (path === '/health' || path === '/') {
    return new Response(
      JSON.stringify({ status: 'ok', worker: 'ledgerlearn', path, ts: Date.now() }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  }

  // ── API routes ──────────────────────────────────────────────
  if (path === '/api/generate-scenario') {
    return handleScenario(request, CORS);
  }
  if (path === '/api/feedback') {
    return handleFeedback(request, CORS);
  }
  if (path === '/api/cert-text') {
    return handleCertText(request, CORS);
  }

  return new Response(
    JSON.stringify({ error: 'Not found', path }),
    { status: 404, headers: { 'Content-Type': 'application/json', ...CORS } }
  );
}

// ── Generate scenario ───────────────────────────────────────────
async function handleScenario(request, CORS) {
  try {
    let body = {};
    try { body = await request.json(); } catch {}

    const track      = body.track      || 'Xero';
    const module_    = body.module     || 'Invoicing';
    const difficulty = body.difficulty || 'intermediate';

    const apiKey = ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not set in Worker secrets' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }

    const prompt = `Generate one accounting MCQ for ${track} training. Topic: ${module_}. Difficulty: ${difficulty}. UK context, use £.

Return ONLY raw JSON (no markdown, no backticks):
{"context":"2-3 sentence scenario","question":"what to do","options":["A","B","C","D"],"correct_index":1,"explanation":"why correct"}`;

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(
        JSON.stringify({ error: `Claude API error ${aiRes.status}`, detail: errText }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }

    const aiData = await aiRes.json();
    let text = aiData.content[0].text.trim();
    text = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/,'').trim();

    let scenario;
    try {
      scenario = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        scenario = JSON.parse(match[0]);
      } else {
        return new Response(
          JSON.stringify({ error: 'JSON parse failed', raw: text }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
        );
      }
    }

    return new Response(
      JSON.stringify(scenario),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  }
}

// ── Feedback ────────────────────────────────────────────────────
async function handleFeedback(request, CORS) {
  try {
    const body = await request.json();
    const { question, selectedAnswer, correctAnswer, isCorrect } = body;
    const apiKey = ANTHROPIC_API_KEY;

    const prompt = isCorrect
      ? `Question: "${question}"\nAnswer: "${correctAnswer}"\nWrite 2 sentences explaining why this is correct. Plain English for a bookkeeper.`
      : `Question: "${question}"\nStudent chose: "${selectedAnswer}"\nCorrect: "${correctAnswer}"\nWrite 2 sentences explaining the correct answer. Plain English.`;

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
    });

    const aiData = await aiRes.json();
    return new Response(
      JSON.stringify({ feedback: aiData.content[0].text }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  }
}

// ── Cert text ───────────────────────────────────────────────────
async function handleCertText(request, CORS) {
  try {
    const body = await request.json();
    const { studentName, track, score } = body;
    const apiKey = ANTHROPIC_API_KEY;

    const prompt = `Write one congratulatory sentence for ${studentName || 'the student'} who passed ${track || 'Xero Associate'} with ${score || 80}%. Start with Congratulations. No emojis.`;

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 150, messages: [{ role: 'user', content: prompt }] }),
    });

    const aiData = await aiRes.json();
    return new Response(
      JSON.stringify({ text: aiData.content[0].text }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
    );
  }
}
