/**
 * LedgerLearn — partner-api.js
 * Public Netlify Function — no admin auth required
 * Handles partner application submissions from partners.html
 */
const fetch = (...a) => import('node-fetch').then(({default:f}) => f(...a));

const SUPA_URL = process.env.SUPABASE_URL || '';
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

async function supa(path, method, body) {
  const res = await fetch(SUPA_URL + path, {
    method: method || 'GET',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      ...(method === 'POST' ? { 'Prefer': 'return=representation' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { console.error('[partner-api] supa error', res.status, path, JSON.stringify(data).slice(0,200)); }
  return data;
}

const json = (status, body) => ({ statusCode: status, headers: CORS, body: JSON.stringify(body) });

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return json(405, { error: 'Method not allowed' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const { action } = body;

  // ── SUBMIT PARTNER APPLICATION ─────────────────────────────
  if (action === 'submit-partner') {
    const { institution, contact_name, email, phone,
            org_type, country, students_range, website, message } = body;

    if (!email || !institution || !contact_name) {
      return json(400, { error: 'institution, contact_name and email are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { error: 'Invalid email address' });
    }

    const row = await supa('/rest/v1/partners', 'POST', {
      institution,
      contact_name,
      email:          email.toLowerCase().trim(),
      phone:          phone          || null,
      org_type:       org_type       || null,
      country:        country        || null,
      students_range: students_range || null,
      website:        website        || null,
      message:        message        || null,
      status:         'pending',
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    });

    if (row && !row.error) {
      // Also subscribe to Brevo list 5 (General) — fire-and-forget
      fetch(process.env.URL + '/.netlify/functions/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, name: contact_name, listId: 5, source: 'partner-application'
        }),
      }).catch(() => {});
      return json(200, { ok: true });
    }
    console.error('[partner-api] INSERT error:', JSON.stringify(row));
    return json(500, { error: 'Could not save application. Please try again.' });
  }

  return json(400, { error: 'Unknown action' });
};
