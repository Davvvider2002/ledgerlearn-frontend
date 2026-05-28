/**
 * LedgerLearn — Job Board Paygate
 * =================================
 * File: netlify/functions/jobboard-paygate.js
 *
 * Actions:
 *   check-access          → verify trial/plan status — direct table query, no RPC
 *   activate-trial        → create recruiter row, start 30-day free trial
 *   verify-recruiter-payment → verify PayPal order/sub, upgrade plan
 *   expire-trials         → (admin-only) mark expired trials
 *
 * v2 fixes:
 *   - check-access now queries recruiters table directly (no RPC dependency)
 *   - DB errors return plan:'error' — NEVER silently treated as expired
 *   - activate-trial is idempotent — safe to call twice
 *   - Trial days calculation is precise (integer floor, min 0)
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
const PP_ID    = process.env.PAYPAL_CLIENT_ID       || '';
const PP_SEC   = process.env.PAYPAL_CLIENT_SECRET   || '';

const PAYPAL_PLAN_MONTHLY = process.env.PAYPAL_PLAN_RECRUITER_MONTHLY || '';
const PLAN_AMOUNTS = { per_post: 39, monthly: 149 };

function json(code, body) {
  return { statusCode: code, headers: CORS, body: JSON.stringify(body) };
}

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
      console.error('[paygate] Supabase error', res.status, err.slice(0, 200));
      return null;
    }
    return res.json();
  } catch(e) {
    console.error('[paygate] fetch error:', e.message);
    return null;
  }
}

async function supaUpdate(table, filter, data) {
  if (!SUPA_URL || !SUPA_SVC) return null;
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${filter}`, {
      method: 'PATCH',
      headers: {
        'apikey':        SUPA_SVC,
        'Authorization': 'Bearer ' + SUPA_SVC,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch(e) { return false; }
}

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
  if (!res.ok) throw new Error('PayPal token request failed: ' + res.status);
  const data = await res.json();
  if (!data.access_token) throw new Error('No access_token in PayPal response');
  return data.access_token;
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return json(405, { error: 'POST only' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {
    return json(400, { error: 'Invalid JSON' });
  }

  const { action } = body;

  // ── CHECK ACCESS ──────────────────────────────────────────
  // Direct table query — no RPC dependency, no silent failure
  if (action === 'check-access') {
    const { userId } = body;
    if (!userId) return json(400, { error: 'userId required' });

    // Query recruiters table directly — no RPC needed
    const rows = await supa(
      '/rest/v1/recruiters?user_id=eq.' + encodeURIComponent(userId) +
      '&select=id,plan,status,trial_start,trial_end,total_posts&limit=1'
    );

    // DB error — return explicit error state, NEVER masquerade as expired
    if (rows === null) {
      return json(200, {
        ok:      false,
        allowed: false,
        plan:    'error',
        reason:  'Could not reach database — please refresh the page or contact support.',
      });
    }

    // No recruiter row found — new user who hasn't completed registration
    if (!Array.isArray(rows) || rows.length === 0) {
      return json(200, {
        ok:      false,
        allowed: false,
        plan:    'none',
        reason:  'Recruiter account not found. Please complete registration.',
      });
    }

    const rec  = rows[0];
    const plan = rec.plan || 'trial';
    const now  = Date.now();

    // Trial: check expiry precisely
    if (plan === 'trial') {
      if (rec.status !== 'active') {
        return json(200, {
          ok: true, allowed: false, plan: 'expired',
          reason: 'Your free trial has ended.',
          trial_days_left: 0,
        });
      }
      const trialEnd  = rec.trial_end ? new Date(rec.trial_end).getTime() : 0;
      const daysLeft  = Math.max(0, Math.floor((trialEnd - now) / 86400000));

      if (daysLeft <= 0) {
        // Trial ended — update plan status in DB
        await supaUpdate('recruiters', 'id=eq.' + rec.id, { plan: 'expired' });
        return json(200, {
          ok: true, allowed: false, plan: 'expired',
          reason: 'Your free trial has ended. Upgrade to continue posting.',
          trial_days_left: 0,
          expires: rec.trial_end,
        });
      }

      return json(200, {
        ok: true, allowed: true, plan: 'trial',
        trial_days_left: daysLeft,
        expires: rec.trial_end,
        reason: null,
      });
    }

    // Paid plans — active as long as status is active
    if (plan === 'per_post' || plan === 'monthly') {
      const allowed = rec.status === 'active';
      return json(200, {
        ok: true, allowed, plan,
        reason: allowed ? null : 'Account suspended.',
      });
    }

    // Expired / suspended / deactivated
    return json(200, {
      ok: true, allowed: false, plan,
      reason: plan === 'expired'
        ? 'Your trial has ended. Upgrade to continue posting.'
        : 'Account is not active.',
      trial_days_left: 0,
    });
  }

  // ── ACTIVATE TRIAL ────────────────────────────────────────
  if (action === 'activate-trial') {
    const { userId, email, companyName, companyWebsite, industry,
            companySize, country, contactName, contactPhone } = body;

    if (!userId || !email || !companyName || !contactName) {
      return json(400, { error: 'userId, email, companyName, contactName required' });
    }

    // Idempotent — check if recruiter row already exists
    const existing = await supa(
      '/rest/v1/recruiters?user_id=eq.' + encodeURIComponent(userId) +
      '&select=id,plan,trial_end,status&limit=1'
    );

    if (Array.isArray(existing) && existing.length > 0) {
      const rec = existing[0];
      const daysLeft = rec.trial_end
        ? Math.max(0, Math.floor((new Date(rec.trial_end).getTime() - Date.now()) / 86400000))
        : 0;
      return json(200, {
        ok: true, alreadyExists: true,
        plan: rec.plan, trial_days_left: daysLeft,
        trial_end: rec.trial_end,
      });
    }

    // Set profiles.role = 'recruiter' (jobboard_setup.sql adds this column)
    await supa(
      '/rest/v1/profiles?id=eq.' + encodeURIComponent(userId),
      'PATCH',
      { role: 'recruiter' }
    );

    // Create recruiter row — 30 days from now
    const trialStart = new Date().toISOString();
    const trialEnd   = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const rec = await supa('/rest/v1/recruiters', 'POST', {
      user_id:         userId,
      email,
      company_name:    companyName,
      company_website: companyWebsite || null,
      industry:        industry       || null,
      company_size:    companySize    || null,
      country:         country        || 'NG',
      contact_name:    contactName,
      contact_phone:   contactPhone   || null,
      plan:            'trial',
      trial_start:     trialStart,
      trial_end:       trialEnd,
      status:          'active',
      verified:        false,
      total_posts:     0,
      total_applications: 0,
    });

    if (!rec) {
      return json(500, { error: 'Failed to create recruiter account. Please try again.' });
    }

    return json(200, {
      ok:             true,
      plan:           'trial',
      trial_start:    trialStart,
      trial_end:      trialEnd,
      trial_days_left: 30,
      message:        'Trial activated. You have 30 days of free job posting.',
    });
  }

  // ── VERIFY RECRUITER PAYMENT ──────────────────────────────
  if (action === 'verify-recruiter-payment') {
    const { userId, paypalOrderId, paypalSubId, planType } = body;
    if (!userId || !planType) return json(400, { error: 'userId and planType required' });

    const rows = await supa(
      '/rest/v1/recruiters?user_id=eq.' + encodeURIComponent(userId) + '&select=id,email,contact_name&limit=1'
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return json(404, { error: 'Recruiter account not found' });
    }
    const rec = rows[0];

    // Verify with PayPal
    let verified = false;
    try {
      const ppToken = await getPayPalToken();
      if (planType === 'per_post' && paypalOrderId) {
        const r = await fetch('https://api-m.paypal.com/v2/checkout/orders/' + paypalOrderId, {
          headers: { 'Authorization': 'Bearer ' + ppToken },
        });
        const d = await r.json();
        verified = (d.status === 'COMPLETED' || d.status === 'APPROVED');
      } else if (planType === 'monthly' && paypalSubId) {
        const r = await fetch('https://api-m.paypal.com/v1/billing/subscriptions/' + paypalSubId, {
          headers: { 'Authorization': 'Bearer ' + ppToken },
        });
        const d = await r.json();
        verified = (d.status === 'ACTIVE' || d.status === 'APPROVED');
      }
    } catch(e) {
      console.error('[paygate] PayPal verify error:', e.message);
    }

    if (!verified) {
      return json(400, { error: 'Payment not verified. Status may still be pending — try again shortly.' });
    }

    // Upgrade recruiter plan
    await supa(
      '/rest/v1/recruiters?id=eq.' + rec.id,
      'PATCH',
      {
        plan:           planType,
        status:         'active',
        subscription_id: paypalSubId || null,
        last_payment_at: new Date().toISOString(),
      }
    );

    // Record payment
    await supa('/rest/v1/recruiter_payments', 'POST', {
      recruiter_id:    rec.id,
      email:           rec.email,
      plan_type:       planType,
      amount_usd:      PLAN_AMOUNTS[planType] || 39,
      currency:        'USD',
      paypal_order_id: paypalOrderId || null,
      paypal_sub_id:   paypalSubId   || null,
      status:          'confirmed',
    });

    return json(200, {
      ok:      true,
      plan:    planType,
      message: 'Plan activated successfully.',
    });
  }

  // ── EXPIRE TRIALS (admin/cron) ────────────────────────────
  if (action === 'expire-trials') {
    const secret = event.headers['x-admin-secret'] || '';
    const adminSecret = process.env.ADMIN_SECRET || '';
    if (!adminSecret || secret !== adminSecret) {
      return json(401, { error: 'Unauthorized' });
    }
    const now = new Date().toISOString();
    const expired = await supa(
      `/rest/v1/recruiters?plan=eq.trial&trial_end=lt.${now}&status=eq.active`,
      'PATCH',
      { plan: 'expired' }
    );
    const count = Array.isArray(expired) ? expired.length : 0;
    return json(200, { ok: true, expired: count });
  }

  return json(400, { error: 'Unknown action: ' + action });
};
