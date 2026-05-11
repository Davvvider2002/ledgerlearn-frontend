/**
 * LedgerLearn Pro — Supabase Auth Handler
 * =========================================
 * File: netlify/functions/supabase-auth.js
 *
 * Handles: register, login, logout, get-session, update-profile
 * Called from: /login.html, /register.html, all learn/test pages
 *
 * Uses Supabase service role for server-side operations.
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY; // service role - server only

async function supaFetch(path, method, body, token) {
  const headers = {
    'Content-Type':  'application/json',
    'apikey':        token || SUPA_KEY,
    'Authorization': 'Bearer ' + (token || SUPA_KEY),
  };
  const res = await fetch(SUPA_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json };
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}

  const { action, email, password, name, region, token } = body;

  // ── REGISTER ──────────────────────────────────────────────
  if (action === 'register') {
    if (!email || !password || !name) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'name, email and password required' }) };
    }
    if (password.length < 8) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
    }

    const r = await supaFetch('/auth/v1/admin/users', 'POST', {
      email,
      password,
      email_confirm: true,   // auto-confirm so no email verify needed
      user_metadata: { full_name: name, region: region || 'UK' },
    });

    if (r.data.error || r.status >= 400) {
      const msg = r.data.message || r.data.error || 'Registration failed';
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: msg }) };
    }

    // Sign in immediately to get session
    const signIn = await supaFetch('/auth/v1/token?grant_type=password', 'POST', { email, password });
    if (signIn.data.access_token) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({
        ok: true,
        action: 'registered',
        session: {
          access_token:  signIn.data.access_token,
          refresh_token: signIn.data.refresh_token,
          expires_in:    signIn.data.expires_in,
          user: {
            id:    signIn.data.user?.id,
            email: signIn.data.user?.email,
            name:  name,
            region: region || 'UK',
          }
        }
      })};
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, action: 'registered', message: 'Account created. Please sign in.' }) };
  }

  // ── LOGIN ─────────────────────────────────────────────────
  if (action === 'login') {
    if (!email || !password) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Email and password required' }) };
    }

    const r = await supaFetch('/auth/v1/token?grant_type=password', 'POST', { email, password });

    if (!r.data.access_token) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid email or password' }) };
    }

    // Fetch profile to get name + region
    const prof = await supaFetch(
      '/rest/v1/profiles?email=eq.' + encodeURIComponent(email) + '&select=full_name,region',
      'GET', null, r.data.access_token
    );
    const profile = Array.isArray(prof.data) ? prof.data[0] : {};

    return { statusCode: 200, headers: CORS, body: JSON.stringify({
      ok: true,
      session: {
        access_token:  r.data.access_token,
        refresh_token: r.data.refresh_token,
        expires_in:    r.data.expires_in,
        user: {
          id:     r.data.user?.id,
          email:  r.data.user?.email,
          name:   profile.full_name || r.data.user?.user_metadata?.full_name || '',
          region: profile.region   || r.data.user?.user_metadata?.region    || 'UK',
        }
      }
    })};
  }

  // ── REFRESH TOKEN ─────────────────────────────────────────
  if (action === 'refresh') {
    if (!body.refresh_token) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'refresh_token required' }) };
    }
    const r = await supaFetch('/auth/v1/token?grant_type=refresh_token', 'POST', {
      refresh_token: body.refresh_token
    });
    if (!r.data.access_token) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Session expired. Please sign in again.' }) };
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify({
      ok: true,
      session: {
        access_token:  r.data.access_token,
        refresh_token: r.data.refresh_token,
        expires_in:    r.data.expires_in,
      }
    })};
  }

  // ── UPDATE PROFILE ────────────────────────────────────────
  if (action === 'update-profile') {
    if (!token) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Not authenticated' }) };
    const updates = {};
    if (name)   updates.full_name = name;
    if (region) updates.region    = region;
    const r = await supaFetch('/rest/v1/profiles?email=eq.' + encodeURIComponent(email), 'PATCH', updates, token);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action: ' + action }) };
};
