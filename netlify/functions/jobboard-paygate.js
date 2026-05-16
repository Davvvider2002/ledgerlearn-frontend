/**
 * LedgerLearn — Job Board Paygate
 * =================================
 * File: netlify/functions/jobboard-paygate.js
 *
 * Server-side access control for all recruiter actions.
 * Called BEFORE any job posting or editing operation.
 * Uses Supabase RPC function check_recruiter_access() — never trusts client.
 *
 * Actions:
 *   check-access          → verify trial/plan status for current recruiter
 *   activate-trial        → create recruiter row, start 30-day free trial
 *   verify-recruiter-payment → verify PayPal order/sub, upgrade plan
 *   expire-trials         → (admin-only via X-Admin-Secret) mark expired trials
 */

const crypto = require('crypto');

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Secret',
  'Content-Type': 'application/json',
};

const SUPA_URL = process.env.SUPABASE_URL          || '';
const SUPA_SVC = process.env.SUPABASE_SERVICE_KEY  || '';
const SUPA_ANO = process.env.SUPABASE_ANON_KEY     || '';
const PP_ID    = process.env.PAYPAL_CLIENT_ID      || '';
const PP_SEC   = process.env.PAYPAL_CLIENT_SECRET  || '';

// PayPal plan IDs
// per_post ($39): NO plan ID needed — uses Orders API (one-time charge at click time)
// monthly ($149): requires a Subscription Plan ID from PayPal dashboard
const PAYPAL_PLAN_MONTHLY = process.env.PAYPAL_PLAN_RECRUITER_MONTHLY || '';

const PLAN_AMOUNTS = { per_post: 39, monthly: 149 };

function json(code, body) {
  return { statusCode: code, headers: CORS, body: JSON.stringify(body) };
}

// Supabase REST with service key (bypasses RLS)
async function supa(path, method, body) {
  if (!SUPA_URL || !SUPA_SVC) return null;
  try {
    const res = await fetch(SUPA_URL + path, {
      method:  method || 'GET',
      headers: {
        'apikey':        SUPA_SVC,
        'Authorization': 'Bearer ' + SUPA_SVC,
        'Content-Type':  'application/json',
        'Prefer':        method === 'POST' ? 'return=representation' : '',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[paygate] Supabase error', res.status, err);
      return null;
    }
    return res.json();
  } catch(e) {
    console.error('[paygate] supaFetch error:', e.message);
    return null;
  }
}

// Call Supabase RPC function (check_recruiter_access)
async function supaRPC(fnName, params) {
  return supa('/rest/v1/rpc/' + fnName, 'POST', params);
}

// Get PayPal access token
async function getPayPalToken() {
  if (!PP_ID || !PP_SEC) throw new Error('PayPal credentials not configured');
  const res = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(PP_ID + ':' + PP_SEC).toString('base64'),
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error('PayPal auth failed: ' + res.status);
  const d = await res.json();
  return d.access_token;
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return json(405, { error: 'POST only' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const { action } = body;

  // ── ACTION: check-access ─────────────────────────────────
  // Called on every recruiter dashboard load and before job post/edit
  if (action === 'check-access') {
    const { userId } = body;
    if (!userId) return json(400, { error: 'userId required' });

    try {
      const result = await supaRPC('check_recruiter_access', { p_user_id: userId });
      if (!result) return json(200, { ok: false, allowed: false, reason: 'DB error — contact support' });

      // Result is the JSONB from the function
      const access = Array.isArray(result) ? result[0] : result;
      return json(200, {
        ok:      true,
        allowed: access.allowed,
        plan:    access.plan,
        reason:  access.reason,
        trial_days_left: access.trial_days_left || null,
        expires: access.expires || null,
      });
    } catch(e) {
      return json(500, { error: 'Access check failed: ' + e.message });
    }
  }

  // ── ACTION: activate-trial ───────────────────────────────
  // Called once when a user completes recruiter registration
  if (action === 'activate-trial') {
    const { userId, email, companyName, companyWebsite, industry,
            companySize, country, contactName, contactPhone } = body;

    if (!userId || !email || !companyName || !contactName) {
      return json(400, { error: 'userId, email, companyName, contactName required' });
    }

    // Check if recruiter row already exists
    const existing = await supa('/rest/v1/recruiters?user_id=eq.' + userId + '&select=id,plan');
    if (Array.isArray(existing) && existing.length > 0) {
      return json(200, { ok: true, alreadyExists: true, plan: existing[0].plan });
    }

    // Update profiles.role to 'recruiter'
    await supa('/rest/v1/profiles?id=eq.' + userId, 'PATCH', { role: 'recruiter' });

    // Create recruiter row with 30-day trial
    const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const rec = await supa('/rest/v1/recruiters', 'POST', {
      user_id:        userId,
      email,
      company_name:   companyName,
      company_website:companyWebsite || null,
      industry:       industry       || null,
      company_size:   companySize    || null,
      country:        country        || 'NG',
      contact_name:   contactName,
      contact_phone:  contactPhone   || null,
      plan:           'trial',
      trial_start:    new Date().toISOString(),
      trial_end:      trialEnd,
      status:         'active',
    });

    if (!rec) return json(500, { error: 'Failed to create recruiter account' });

    return json(200, {
      ok:          true,
      plan:        'trial',
      trial_end:   trialEnd,
      days_left:   30,
      message:     'Trial activated. You have 30 days of free job posting.',
    });
  }

  // ── ACTION: verify-recruiter-payment ─────────────────────
  // Called after PayPal onApprove for per_post ($39) or monthly ($149)
  if (action === 'verify-recruiter-payment') {
    const { userId, email, planType, paypalOrderId, paypalSubId, jobPostingId } = body;

    if (!userId || !email || !planType) {
      return json(400, { error: 'userId, email, planType required' });
    }
    if (!['per_post','monthly'].includes(planType)) {
      return json(400, { error: 'planType must be per_post or monthly' });
    }

    try {
      const token = await getPayPalToken();
      let verified = false;
      let ppRef    = '';

      if (planType === 'monthly' && paypalSubId) {
        // Monthly: verify PayPal Subscription (needs Plan ID from dashboard)
        const subRes = await fetch(
          'https://api-m.paypal.com/v1/billing/subscriptions/' + paypalSubId,
          { headers: { 'Authorization': 'Bearer ' + token } }
        );
        const sub = await subRes.json();
        verified = sub.status === 'ACTIVE';
        ppRef    = paypalSubId;

      } else if (planType === 'per_post' && paypalOrderId) {
        // Per-post: verify PayPal Order (no Plan ID needed — one-time charge via Orders API)
        // The frontend uses actions.order.create({ purchase_units:[{amount:{value:'39.00'}}] })
        // PayPal returns an Order ID on approval — we verify it here
        const ordRes = await fetch(
          'https://api-m.paypal.com/v2/checkout/orders/' + paypalOrderId,
          { headers: { 'Authorization': 'Bearer ' + token } }
        );
        const ord = await ordRes.json();
        verified = ord.status === 'COMPLETED' || ord.status === 'APPROVED';
        ppRef    = paypalOrderId;

      } else if (!PP_ID) {
        // Dev/test mode — PayPal credentials not yet configured, allow through
        verified = true;
        ppRef    = 'dev-mode';

      } else {
        return json(400, {
          ok: false,
          error: planType === 'monthly'
            ? 'paypalSubId required for monthly plan'
            : 'paypalOrderId required for per_post plan'
        });
      }

      if (!verified && PP_ID) {
        return json(400, { ok: false, error: 'Payment not confirmed by PayPal' });
      }

      // Get recruiter row
      const recs = await supa('/rest/v1/recruiters?user_id=eq.' + userId + '&select=id');
      if (!recs || !recs.length) {
        return json(404, { error: 'Recruiter account not found. Register first.' });
      }
      const recId = recs[0].id;
      const amount = PLAN_AMOUNTS[planType];

      // Determine next billing date for monthly
      const nextBilling = planType === 'monthly'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Update recruiters table
      await supa('/rest/v1/recruiters?id=eq.' + recId, 'PATCH', {
        plan:            planType,
        subscription_id: planType === 'monthly' ? ppRef : null,
        last_payment_at: new Date().toISOString(),
        next_billing_at: nextBilling,
        status:          'active',
      });

      // Record payment
      await supa('/rest/v1/recruiter_payments', 'POST', {
        recruiter_id:    recId,
        email,
        plan_type:       planType,
        amount_usd:      amount,
        paypal_order_id: planType === 'per_post'  ? ppRef : null,
        paypal_sub_id:   planType === 'monthly'   ? ppRef : null,
        period_start:    new Date().toISOString().split('T')[0],
        period_end:      nextBilling ? nextBilling.split('T')[0] : null,
        job_posting_id:  jobPostingId || null,
        status:          'confirmed',
      });

      return json(200, {
        ok:          true,
        verified:    true,
        plan:        planType,
        amount,
        next_billing: nextBilling,
        message: planType === 'monthly'
          ? 'Monthly plan activated. Unlimited job postings for 30 days.'
          : 'Per-post payment confirmed. Your job listing is now live.',
      });

    } catch(e) {
      console.error('[paygate] payment verification error:', e);
      return json(500, { error: 'Payment verification failed: ' + e.message });
    }
  }

  // ── ACTION: expire-trials (admin-only cron) ───────────────
  // Protected by X-Admin-Secret header — called by Netlify scheduled function
  if (action === 'expire-trials') {
    const adminSecret = event.headers['x-admin-secret'] || '';
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return json(401, { error: 'Unauthorized' });
    }

    // Mark expired trials
    const expired = await supa(
      '/rest/v1/recruiters?plan=eq.trial&trial_end=lt.' + new Date().toISOString(),
      'PATCH',
      { plan: 'expired' }
    );

    // Pause their active job postings
    const expiredIds = await supa(
      '/rest/v1/recruiters?plan=eq.expired&select=id',
      'GET'
    );
    if (Array.isArray(expiredIds) && expiredIds.length > 0) {
      const ids = expiredIds.map(r => r.id);
      // Pause jobs for each expired recruiter (batch)
      for (const rid of ids) {
        await supa(
          '/rest/v1/job_postings?recruiter_id=eq.' + rid + '&status=eq.active',
          'PATCH',
          { status: 'paused' }
        );
      }
    }

    return json(200, {
      ok:      true,
      expired: Array.isArray(expiredIds) ? expiredIds.length : 0,
      message: 'Expired trials processed',
    });
  }

  return json(400, { error: 'Unknown action: ' + action });
};
