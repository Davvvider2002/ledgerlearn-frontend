/**
 * LedgerLearn — Admin Config Endpoint
 * ====================================
 * File: netlify/functions/admin-config.js
 *
 * Returns Supabase public config (URL + anon key) to the admin panel.
 * Token format matches admin-auth.js: base64(payload).hmac_hex
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

  // Verify admin token — matches format from admin-auth.js
  const auth = (event.headers['authorization'] || '').replace('Bearer ', '').trim();
  const adminSecret = process.env.ADMIN_SECRET || '';

  if (auth && adminSecret) {
    try {
      const crypto = require('crypto');
      const dotIdx = auth.lastIndexOf('.');
      if (dotIdx > 0) {
        const payloadB64 = auth.slice(0, dotIdx);
        const sig        = auth.slice(dotIdx + 1);
        const payload    = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));

        // Check expiry
        if (Date.now() > payload.expires) {
          return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Token expired. Please log in again.' }) };
        }

        // Verify HMAC
        const expected = crypto
          .createHmac('sha256', adminSecret)
          .update(payloadB64)
          .digest('hex');

        const sigBuf = Buffer.from(sig, 'hex');
        const expBuf = Buffer.from(expected, 'hex');
        if (sigBuf.length !== expBuf.length ||
            !crypto.timingSafeEqual(sigBuf, expBuf)) {
          return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid token' }) };
        }
      }
      // Token valid — continue
    } catch(e) {
      // Token parse error — log but continue (return config anyway if env vars are set)
      console.warn('[admin-config] Token parse error:', e.message);
    }
  }

  // Return public Supabase config from environment variables
  const url = process.env.SUPABASE_URL     || '';
  const key = process.env.SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: false,
        error: 'SUPABASE_URL and SUPABASE_ANON_KEY are not set in Netlify environment variables. Go to Netlify → Site configuration → Environment variables and add them.'
      })
    };
  }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ ok: true, url, key })
  };
};
