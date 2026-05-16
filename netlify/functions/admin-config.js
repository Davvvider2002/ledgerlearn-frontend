/**
 * LedgerLearn — Admin Config Endpoint
 * ====================================
 * File: netlify/functions/admin-config.js
 * 
 * Returns Supabase public config (URL + anon key) to the admin panel.
 * The anon key is safe to expose — RLS policies protect all data.
 * Service key is NEVER returned here.
 * 
 * Protected: requires valid admin token in Authorization header.
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'POST only' }) };
  }

  // Verify admin token
  const auth = event.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  const adminSecret = process.env.ADMIN_SECRET || '';

  // Verify HMAC token (same logic as admin-auth.js)
  if (!token || !adminSecret) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const crypto = require('crypto');
    const [expires, sig] = token.split('.');
    if (!expires || !sig) throw new Error('Bad token format');
    if (Date.now() > parseInt(expires, 10)) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Token expired' }) };
    }
    const expected = crypto
      .createHmac('sha256', adminSecret)
      .update(expires)
      .digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid token' }) };
    }
  } catch(e) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Token verification failed' }) };
  }

  // Return public Supabase config
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: false,
        error: 'SUPABASE_URL and SUPABASE_ANON_KEY not set in Netlify environment variables'
      })
    };
  }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ ok: true, url, key })
  };
};
