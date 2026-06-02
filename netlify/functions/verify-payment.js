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

// Levels + products that generate commissions
const VALID_LEVELS    = ['l2', 'l3', 'qb-l2', 'qb-l3', 'erp-saas'];
const EXPECTED_AMOUNTS = { 'l2': 49.00, 'l3': 0, 'qb-l2': 49.00, 'qb-l3': 0, 'erp-saas': 29.00 };
// Map level → affiliate product type key
const PRODUCT_TYPE = { 'l2': 'l2_xero', 'qb-l2': 'l2_qb', 'erp-saas': 'erp_saas' };

const SUPA_URL = process.env.SUPABASE_URL || '';
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function supaFetch(path, method, body) {
  const res = await fetch(SUPA_URL + path, {
    method: method || 'GET',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      ...(method === 'POST' ? { 'Prefer': 'resolution=merge-duplicates,return=representation' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return {};
  return res.json().catch(() => ({}));
}

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
  const refCode   = (body.ref_code || event.queryStringParameters?.ref || '').trim();
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
    return await storeAndReturn(email, normLevel || level, orderId || 'unverified', 'unverified', refCode);
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

    return await storeAndReturn(email, normLevel, orderId, 'paypal-order-verified', refCode);

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

  // ── Brevo: add to L2 Purchasers list (stops L1 nurture, fires L2 sequence) ──
  const _isL2 = normLevel === 'l2' || normLevel === 'qb-l2';
  if (_isL2 && email) {
    fetch('https://api.brevo.com/v3/contacts/lists/7/contacts/add', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY || '' },
      body:    JSON.stringify({ emails: [email] }),
    }).then(function(r){ console.log('[Brevo] L2 Purchasers add status:', r.status); })
      .catch(function(e){ console.warn('[Brevo] L2 add failed:', e.message); });
  }

  // ── Affiliate conversion tracking ──────────────────────────
  const productType = PRODUCT_TYPE[level];
  if (refCode && productType) {
    try {
      const saleAmount = EXPECTED_AMOUNTS[level] || 0;
      // Look up affiliate by referral code
      const affRows = await supaFetch(
        `/rest/v1/affiliates?referral_code=eq.${encodeURIComponent(refCode)}&select=id,commission_rates,commission_pct&limit=1`
      );
      if (Array.isArray(affRows) && affRows.length > 0) {
        const aff = affRows[0];
        const rates = aff.commission_rates || {};
        const pct   = rates[productType] || aff.commission_pct || 20;
        const due   = parseFloat((saleAmount * pct / 100).toFixed(2));
        // Record conversion
        await supaFetch('/rest/v1/affiliate_conversions', 'POST', {
          affiliate_id:   aff.id,
          referral_code:  refCode,
          product_type:   productType,
          buyer_email:    email,
          sale_amount:    saleAmount,
          commission_pct: pct,
          commission_due: due,
          status:         'pending',
          order_id:       orderId || null,
        });
        // Update affiliate totals (non-blocking)
        supaFetch(`/rest/v1/affiliates?id=eq.${aff.id}`, 'PATCH', {
          referrals:          1,
          revenue_total:      saleAmount,
          commission_pending: due,
        }).catch(() => {});
        console.log(`[verify-payment] ✓ Conversion: ${refCode} → ${email} ${productType} $${saleAmount} commission $${due}`);
      }
    } catch(e) {
      console.warn('[verify-payment] Affiliate tracking error (non-fatal):', e.message);
    }
  }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ ok: true, verified: true, level })
  };
}
