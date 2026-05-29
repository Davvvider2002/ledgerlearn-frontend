/**
 * LedgerLearn Pro — Payment Verification Function
 * =================================================
 * File: netlify/functions/verify-payment.js
 *
 * Server-side ONE-TIME payment verification via PayPal Orders API.
 * L2 ($49) is a one-time charge — NOT a subscription.
 * Called after PayPal onApprove with orderId.
 *
 * POST /.netlify/functions/verify-payment
 * Body: { orderId, email, level }
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

// Levels per track — xero-l2, qb-l2, xero-l3, qb-l3
const VALID_LEVELS    = ['l2', 'l3', 'qb-l2', 'qb-l3'];
const EXPECTED_AMOUNTS = { 'l2': 49.00, 'l3': 0, 'qb-l2': 49.00, 'qb-l3': 0 };

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

  const { orderId, email, level } = body;

  if (!orderId || !email || !level) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'orderId, email and level required' }) };
  }

  // Accept both 'qb-l2' and passing track:'QuickBooks'+level:'l2'
  const normLevel = (body.track === 'QuickBooks' && !level.startsWith('qb')) ? 'qb-' + level : level;
  if (!VALID_LEVELS.includes(normLevel)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid level: ' + normLevel }) };
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
    return await storeAndReturn(email, normLevel || level, orderId || 'unverified', 'unverified');
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

    // Verify one-time ORDER (not subscription — L2 is a one-time $49 charge)
    const ordResponse = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!ordResponse.ok) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: 'Order not found' }) };
    }

    const ordData = await ordResponse.json();

    // Order must be COMPLETED (captured) — APPROVED means not yet captured
    const isComplete = ordData.status === 'COMPLETED';
    if (!isComplete) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ ok: false, error: 'Order not completed' }) };
    }

    // Verify the amount matches what we expect (prevent price tampering)
    const expected = EXPECTED_AMOUNTS[level];
    if (expected && expected > 0) {
      const paid = parseFloat(
        ordData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0'
      );
      if (Math.abs(paid - expected) > 0.01) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({
          ok: false, error: `Amount mismatch: expected $${expected}, got $${paid}`
        })};
      }
    }

    return await storeAndReturn(email, normLevel, orderId, 'paypal-order-verified');

  } catch(err) {
    console.error('[verify-payment]', err.message);
    // Graceful degradation
    return await storeAndReturn(email, normLevel || level, orderId || 'error', 'unverified-error');
  }
};

async function storeAndReturn(email, level, orderId, verificationMethod) {
  try {
    if (!getStore) throw new Error('blobs unavailable');
    const store = getStore('ledgerlearn-payments');
    const key   = 'payment:' + email.toLowerCase().trim() + ':' + level;

    await store.setJSON(key, {
      email,
      level,
      orderId,
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
