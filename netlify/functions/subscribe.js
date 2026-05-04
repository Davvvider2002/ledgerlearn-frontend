/**
 * LedgerLearn — Netlify Function: subscribe
 * ==========================================
 * File location: netlify/functions/subscribe.js
 *
 * Receives POST from brevo.js and forwards to Brevo API
 * using the BREVO_API_KEY env variable (never exposed to browser).
 *
 * Set in Netlify: Site config → Environment variables → BREVO_API_KEY
 *
 * Lists:
 *   3 = Xero Signups
 *   4 = QB Waitlist
 *   5 = General
 */

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  let email, name, listId, source;
  try {
    const b = JSON.parse(event.body || '{}');
    email  = (b.email  || '').toLowerCase().trim();
    name   = (b.name   || '').trim();
    listId = parseInt(b.listId, 10);
    source = b.source  || 'unknown';
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid email' }) };
  }

  if (![3, 4, 5].includes(listId)) {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid list ID' }) };
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('[subscribe] BREVO_API_KEY not set');
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server config error' }) };
  }

  const parts = name.split(' ');
  const payload = {
    email,
    listIds: [listId],
    updateEnabled: true,
    attributes: {
      SOURCE: source,
      ...(parts[0] ? { FIRSTNAME: parts[0] } : {}),
      ...(parts[1] ? { LASTNAME: parts.slice(1).join(' ') } : {}),
    },
  };

  try {
    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify(payload),
    });

    if (res.ok || res.status === 204) {
      console.log(`[subscribe] ✓ ${email} → list ${listId} (${source})`);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    const err = await res.json().catch(() => ({}));
    console.error('[subscribe] Brevo error:', res.status, err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Brevo API error' }) };

  } catch (err) {
    console.error('[subscribe] Network error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Network error' }) };
  }
};
