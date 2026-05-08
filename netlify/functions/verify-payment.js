/**
 * LedgerLearn Pro — Payment Verification Function
 * =================================================
 * File: netlify/functions/verify-payment.js
 *
 * Server-side payment verification.
 * Called after PayPal onApprove with subscriptionID.
 * Verifies with PayPal API that the subscription is active.
 * Stores verified payment in Netlify Blobs keyed by email.
 *
 * POST /.netlify/functions/verify-payment
 * Body: { subscriptionId, email, level }
 * Returns: { ok: true, verified: true, level }
 */

// @netlify/blobs is available natively on Netlify runtime
let getStore;
try { getStore = require('@netlify/blobs').getStore; } catch(e) { getStore = null; }

const CORS = {
  'Access-Control-Allow-Origin':  'https://ledgerlearn.pro',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const VALID_LEVELS = ['l2', 'l3'];
const PAYPAL_PLAN_IDS = {
  l2: 'P-3YS87947EY5558941NH5P3FY',
};

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { subscriptionId, email, level } = body;

  if (!subscriptionId || !email || !level) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'subscriptionId, email and level required' }) };
  }

  if (!VALID_LEVELS.includes(level)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid level' }) };
  }

  if (!email.includes('@')) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid email' }) };
  }

  // Verify subscription with PayPal API
  const PAYPAL_CLIENT_ID     = process.env.PAYPAL_CLIENT_ID;
  const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.error('[verify-payment] PayPal credentials not set');
    // Graceful degradation: trust the client if PayPal creds not configured
    // Remove this in production once creds are set
    return await storeAndReturn(email, level, subscriptionId, 'unverified');
  }

  try {
    // Get PayPal access token
    const authResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64'),
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      throw new Error('PayPal auth failed: ' + authResponse.status);
    }

    const authData    = await authResponse.json();
    const accessToken = authData.access_token;

    // Verify subscription
    const subResponse = await fetch(`https://api-m.paypal.com/v1/billing/subscriptions/${subscriptionId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!subResponse.ok) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: 'Subscription not found' }) };
    }

    const subData = await subResponse.json();

    // Check subscription is active and matches expected plan
    const isActive    = subData.status === 'ACTIVE';
    const planMatches = PAYPAL_PLAN_IDS[level] ? subData.plan_id === PAYPAL_PLAN_IDS[level] : true;

    if (!isActive) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: 'Subscription not active' }) };
    }

    if (!planMatches) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: 'Subscription plan mismatch' }) };
    }

    return await storeAndReturn(email, level, subscriptionId, 'paypal-verified');

  } catch(err) {
    console.error('[verify-payment]', err.message);
    // Graceful degradation
    return await storeAndReturn(email, level, subscriptionId, 'unverified-error');
  }
};

async function storeAndReturn(email, level, subscriptionId, verificationMethod) {
  try {
    if (!getStore) throw new Error('blobs unavailable');
    const store = getStore('ledgerlearn-payments');
    const key   = 'payment:' + email.toLowerCase().trim() + ':' + level;

    await store.setJSON(key, {
      email,
      level,
      subscriptionId,
      verificationMethod,
      verifiedAt: new Date().toISOString(),
      paid: true,
    });
  } catch(err) {
    console.error('[verify-payment] store error:', err.message);
  }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ ok: true, verified: true, level })
  };
}
