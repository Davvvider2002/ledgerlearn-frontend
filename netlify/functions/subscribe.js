/**
 * LedgerLearn — Netlify Serverless Function
 * ==========================================
 * Handles all Brevo contact signups securely.
 * The API key lives in Netlify environment variables — never in code.
 *
 * Endpoint: POST /.netlify/functions/subscribe
 *
 * Body (JSON):
 *   { email, name, listId, source }
 *
 * Returns:
 *   200 { ok: true }
 *   400 { ok: false, error: "..." }
 *   500 { ok: false, error: "..." }
 */

exports.handler = async function (event) {

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  // CORS headers — allow your Netlify domain
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Parse body
  let email, name, listId, source;
  try {
    const body = JSON.parse(event.body || '{}');
    email  = (body.email  || '').toLowerCase().trim();
    name   = (body.name   || '').trim();
    listId = parseInt(body.listId, 10);
    source = body.source || 'unknown';
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
    };
  }

  // Validate
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValid) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ ok: false, error: 'Invalid email address' }),
    };
  }

  if (![3, 4, 5].includes(listId)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ ok: false, error: 'Invalid list ID' }),
    };
  }

  // Get API key from Netlify environment — never hardcoded
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('[subscribe] BREVO_API_KEY environment variable not set');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'Server configuration error' }),
    };
  }

  // Build Brevo payload
  const nameParts = name.split(' ');
  const payload = {
    email,
    listIds: [listId],
    updateEnabled: true,
    attributes: {
      SOURCE: source,
      ...(nameParts[0] ? { FIRSTNAME: nameParts[0] } : {}),
      ...(nameParts[1] ? { LASTNAME: nameParts.slice(1).join(' ') } : {}),
    },
  };

  // Call Brevo API
  try {
    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    // 204 = contact already existed and was updated — still success
    if (res.ok || res.status === 204) {
      console.log(`[subscribe] ✓ ${email} → list ${listId} (${source})`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true }),
      };
    }

    const errorBody = await res.json().catch(() => ({}));
    console.error('[subscribe] Brevo error:', res.status, errorBody);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'Brevo API error', detail: errorBody }),
    };

  } catch (err) {
    console.error('[subscribe] Network error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'Network error reaching Brevo' }),
    };
  }
};
