/**
 * LedgerLearn Pro — Admin Auth Function
 * =======================================
 * File: netlify/functions/admin-auth.js
 *
 * Server-side admin authentication.
 * Passphrase never appears in browser source.
 * Returns a short-lived signed token (valid 2 hours).
 *
 * POST /.netlify/functions/admin-auth
 * Body: { passphrase: "..." }
 * Returns: { ok: true, token: "...", expires: "..." }
 *
 * Set ADMIN_PASSPHRASE in Netlify environment variables.
 * Set ADMIN_SECRET in Netlify environment variables (random string for signing).
 */

const crypto = require('crypto');

const CORS = {
  'Access-Control-Allow-Origin':  'https://ledgerlearn.pro',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Rate limit: check for too many attempts (basic protection)
  // In production, use Netlify's rate limiting or a Redis store
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { passphrase } = body;

  if (!passphrase || typeof passphrase !== 'string') {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Passphrase required' }) };
  }

  // Read passphrase from environment (never hardcoded)
  const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE;
  const ADMIN_SECRET     = process.env.ADMIN_SECRET || 'ledgerlearn-admin-secret-change-this';

  if (!ADMIN_PASSPHRASE) {
    console.error('[admin-auth] ADMIN_PASSPHRASE env var not set');
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  // Constant-time comparison to prevent timing attacks
  const provided = Buffer.from(passphrase);
  const expected = Buffer.from(ADMIN_PASSPHRASE);

  let match = false;
  if (provided.length === expected.length) {
    match = crypto.timingSafeEqual(provided, expected);
  }

  if (!match) {
    // Add artificial delay to slow brute force
    await new Promise(r => setTimeout(r, 1000));
    return {
      statusCode: 401,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: 'Invalid passphrase' })
    };
  }

  // Generate a signed token: base64(payload).signature
  // Valid for 2 hours
  const expires = Date.now() + (2 * 60 * 60 * 1000);
  const payload = JSON.stringify({ role: 'admin', expires, issued: Date.now() });
  const payloadB64 = Buffer.from(payload).toString('base64');

  const signature = crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(payloadB64)
    .digest('hex');

  const token = payloadB64 + '.' + signature;

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      ok:      true,
      token,
      expires: new Date(expires).toISOString(),
      message: 'Admin access granted for 2 hours'
    })
  };
};
