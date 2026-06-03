/**
 * LedgerLearn Pro — Academy API
 * ================================
 * File: netlify/functions/academy-api.js
 *
 * Handles:
 *   get-status          → is Academy live? pricing config
 *   check-membership    → is this user an active Academy member?
 *   get-resources       → list content library resources user can access
 *   initiate-membership → create PayPal subscription for Academy
 *   confirm-membership  → verify PayPal subscription, create member record
 *   cancel-membership   → cancel member subscription
 *   get-member-portal   → member dashboard data (membership + resource list)
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const SUPA_URL  = process.env.SUPABASE_URL          || '';
const SUPA_KEY  = process.env.SUPABASE_SERVICE_KEY  || '';
const PP_CLIENT = process.env.PAYPAL_CLIENT_ID       || '';
const PP_SECRET = process.env.PAYPAL_CLIENT_SECRET   || '';
const BREVO_KEY = process.env.BREVO_API_KEY          || '';
const PP_BASE   = 'https://api-m.paypal.com';

function json(code, body) {
  return { statusCode: code, headers: CORS, body: JSON.stringify(body) };
}

async function supa(path, method, body) {
  if (!SUPA_URL || !SUPA_KEY) return null;
  try {
    const opts = {
      method: method || 'GET',
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json', 'Prefer': method === 'POST' ? 'return=representation' : '' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(SUPA_URL + path, opts);
    return res.json().catch(() => null);
  } catch(e) { return null; }
}

async function supaUpdate(table, filter, data) {
  try {
    await fetch(`${SUPA_URL}/rest/v1/${table}?${filter}`, {
      method: 'PATCH',
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch(e) {}
}

async function getPayPalToken() {
  if (!PP_CLIENT || !PP_SECRET) return null;
  try {
    const res = await fetch(`${PP_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Basic ' + Buffer.from(`${PP_CLIENT}:${PP_SECRET}`).toString('base64') },
      body: 'grant_type=client_credentials',
    });
    const d = await res.json();
    return d.access_token || null;
  } catch(e) { return null; }
}

async function sendWelcomeEmail(email, firstName, tier) {
  if (!BREVO_KEY) return false;
  try {
    const tierLabel = tier === 'annual' ? 'Annual Member' : tier === 'trial' ? '14-Day Trial' : 'Monthly Member';
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'LedgerLearn Pro', email: 'hello@ledgerlearn.pro' },
        to: [{ email }],
        subject: `Welcome to ERP.SaaS Academy — ${tierLabel}`,
        htmlContent: `
<div style="font-family:DM Sans,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;width:20px;height:20px;background:#7c3aed;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);"></div>
    <strong style="font-size:1.1rem;color:#0B1F3A;margin-left:8px;">ERP.SaaS Academy</strong>
  </div>
  <h2 style="color:#0B1F3A;font-size:1.3rem;margin-bottom:8px;">Welcome${firstName ? ', ' + firstName : ''}!</h2>
  <p style="color:#6b87a3;margin-bottom:16px;">You are now a <strong style="color:#7c3aed;">${tierLabel}</strong> of ERP.SaaS Academy.</p>
  <div style="background:#f8f7f4;border-radius:10px;padding:20px;margin-bottom:24px;">
    <p style="color:#0B1F3A;font-weight:700;margin-bottom:10px;">What you now have access to:</p>
    <ul style="color:#6b87a3;padding-left:18px;line-height:2;">
      <li>Full content library — all templates, toolkits &amp; guides</li>
      <li>Monthly live Q&amp;A sessions with David</li>
      <li>ERP consulting project referrals</li>
      <li>Priority job board visibility</li>
    </ul>
  </div>
  <div style="text-align:center;">
    <a href="https://ledgerlearn.pro/dashboard" style="display:inline-block;background:#7c3aed;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;">Go to your dashboard →</a>
  </div>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
  <p style="color:#6b87a3;font-size:0.78rem;text-align:center;">LedgerLearn Pro · hello@ledgerlearn.pro · ledgerlearn.pro</p>
</div>`,
      }),
    });
    return true;
  } catch(e) { return false; }
}

async function auditLog(action, target) {
  try {
    await supa('/rest/v1/admin_audit_log', 'POST', { action, target, admin_email: 'system:academy', success: true, created_at: new Date().toISOString() });
  } catch(e) {}
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return json(405, { error: 'POST only' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) { return json(400, { error: 'Invalid JSON' }); }
  const { action, email, subscriptionId, tier } = body;

  // ── GET ACADEMY STATUS ───────────────────────────────────
  if (action === 'get-status') {
    const flagRow = await supa('/rest/v1/platform_config?key=eq.feature_flags&select=value&limit=1');
    const cfgRow  = await supa('/rest/v1/platform_config?key=eq.track_config&select=value&limit=1');
    let academyLive = false;
    let paypalAcademyPlan = '';
    try {
      if (Array.isArray(flagRow) && flagRow.length > 0)
        academyLive = JSON.parse(flagRow[0].value || '{}').academy_live === true;
      if (Array.isArray(cfgRow) && cfgRow.length > 0)
        paypalAcademyPlan = JSON.parse(cfgRow[0].value || '{}').paypal_academy || '';
    } catch(e) {}
    // Parse config for live prices
    let cfg = {};
    try { cfg = JSON.parse(Array.isArray(cfgRow) && cfgRow.length ? cfgRow[0].value : '{}'); } catch(e) {}

    return json(200, {
      ok:                 true,
      academyLive:        academyLive,
      paypalPlanId:       cfg.paypal_plan_academy        || paypalAcademyPlan || '',
      paypalPlanAnnualId: cfg.paypal_plan_academy_annual || '',
      priceMonthly:       cfg.academy_price_monthly      || 99,
      priceAnnual:        cfg.academy_price_annual       || 999,
      labelMonthly:       cfg.academy_label_monthly      || 'Cancel anytime',
      labelAnnual:        cfg.academy_label_annual       || 'Save 43%',
    });
  }

  // ── CHECK MEMBERSHIP ─────────────────────────────────────
  if (action === 'check-membership') {
    if (!email) return json(400, { error: 'email required' });
    const cleanEmail = email.toLowerCase().trim();
    const rows = await supa(
      `/rest/v1/academy_members?email=eq.${encodeURIComponent(cleanEmail)}&status=eq.active&limit=1`
    );
    if (!Array.isArray(rows) || rows.length === 0) return json(200, { ok: true, isMember: false });
    const m = rows[0];
    // Check trial expiry
    if (m.tier === 'trial' && m.trial_ends_at && new Date(m.trial_ends_at) < new Date()) {
      await supaUpdate('academy_members', `id=eq.${m.id}`, { status: 'expired' });
      return json(200, { ok: true, isMember: false, trialExpired: true });
    }
    return json(200, { ok: true, isMember: true, tier: m.tier, renewalDate: m.renewal_date, trialEndsAt: m.trial_ends_at });
  }

  // ── GET CONTENT RESOURCES ────────────────────────────────
  if (action === 'get-resources') {
    if (!email) return json(400, { error: 'email required' });
    const cleanEmail = email.toLowerCase().trim();

    // Check membership
    const membership = await supa(`/rest/v1/academy_members?email=eq.${encodeURIComponent(cleanEmail)}&status=eq.active&limit=1`);
    const isMember = Array.isArray(membership) && membership.length > 0;

    // Check L2 cert
    const l2cert = await supa(`/rest/v1/certificates?email=eq.${encodeURIComponent(cleanEmail)}&level=eq.l2&limit=1`);
    const hasL2 = Array.isArray(l2cert) && l2cert.length > 0;

    // Check L1 cert (any cert = certified user)
    const anyCert = await supa(`/rest/v1/certificates?email=eq.${encodeURIComponent(cleanEmail)}&limit=1`);
    const isCertified = Array.isArray(anyCert) && anyCert.length > 0;

    // Filter resources by what user can access
    let resources = [];
    if (isMember) {
      // Academy members get everything
      const rows = await supa('/rest/v1/content_resources?status=eq.active&order=sort_order.asc,created_at.desc&limit=100');
      resources = Array.isArray(rows) ? rows.map(r => ({ ...r, accessible: true })) : [];
    } else if (hasL2) {
      // L2 gets: academy=locked, l2=yes, all=yes
      const rows = await supa('/rest/v1/content_resources?status=eq.active&order=sort_order.asc&limit=100');
      resources = Array.isArray(rows) ? rows.map(r => ({ ...r, accessible: r.access_tier !== 'academy' })) : [];
    } else if (isCertified) {
      // Any cert gets: access_tier='all' only
      const rows = await supa("/rest/v1/content_resources?access_tier=eq.all&status=eq.active&order=sort_order.asc&limit=100");
      resources = Array.isArray(rows) ? rows.map(r => ({ ...r, accessible: true })) : [];
    }
    return json(200, { ok: true, data: resources, isMember, hasL2, isCertified });
  }

  // ── INITIATE MEMBERSHIP ──────────────────────────────────
  if (action === 'initiate-membership') {
    if (!email) return json(400, { error: 'email required' });
    const cleanEmail = email.toLowerCase().trim();

    // Check not already a member
    const existing = await supa(`/rest/v1/academy_members?email=eq.${encodeURIComponent(cleanEmail)}&status=eq.active&limit=1`);
    if (Array.isArray(existing) && existing.length > 0) {
      return json(200, { ok: true, alreadyMember: true, tier: existing[0].tier });
    }

    // Get PayPal plan ID from config
    const cfgRow = await supa('/rest/v1/platform_config?key=eq.track_config&select=value&limit=1');
    let planId = '';
    try { planId = JSON.parse((cfgRow && cfgRow[0] && cfgRow[0].value) || '{}').paypal_academy || ''; } catch(e) {}

    if (!planId) return json(503, { error: 'Academy subscription not yet configured. Contact hello@ledgerlearn.pro' });

    return json(200, {
      ok: true,
      paypalPlanId: planId,
      monthlyPrice: 99, annualPrice: 999,
      message: 'Use PayPal subscription flow with this plan ID',
    });
  }

  // ── CONFIRM MEMBERSHIP ───────────────────────────────────
  if (action === 'confirm-membership') {
    if (!email || !subscriptionId) return json(400, { error: 'email and subscriptionId required' });
    const cleanEmail = email.toLowerCase().trim();

    // Verify subscription with PayPal
    const ppToken = await getPayPalToken();
    let ppSub = null;
    if (ppToken) {
      try {
        const res = await fetch(`${PP_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
          headers: { 'Authorization': 'Bearer ' + ppToken, 'Content-Type': 'application/json' },
        });
        ppSub = await res.json();
      } catch(e) {}
    }

    const ppActive = ppSub && (ppSub.status === 'ACTIVE' || ppSub.status === 'APPROVED');
    if (!ppActive && ppToken) return json(400, { error: 'Subscription not active. Status: ' + (ppSub && ppSub.status) });

    // Check for duplicate
    const dup = await supa(`/rest/v1/academy_members?subscription_id=eq.${encodeURIComponent(subscriptionId)}&limit=1`);
    if (Array.isArray(dup) && dup.length > 0) return json(200, { ok: true, duplicate: true });

    // Get user_id
    const prof = await supa(`/rest/v1/profiles?email=eq.${encodeURIComponent(cleanEmail)}&select=id,full_name&limit=1`);
    const userId   = Array.isArray(prof) && prof.length > 0 ? prof[0].id : null;
    const fullName = Array.isArray(prof) && prof.length > 0 ? prof[0].full_name : '';
    const firstName = fullName ? fullName.split(' ')[0] : '';

    const memberTier = (tier && ['monthly','annual'].includes(tier)) ? tier : 'monthly';
    const mrr = memberTier === 'annual' ? 999/12 : 99;
    const now = new Date();
    const renewalDate = memberTier === 'annual'
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString().split('T')[0]
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString().split('T')[0];

    const memberRow = {
      user_id: userId, email: cleanEmail,
      tier: memberTier, mrr, subscription_id: subscriptionId,
      payment_provider: 'paypal', status: 'active',
      joined_at: now.toISOString(), renewal_date: renewalDate,
      created_at: now.toISOString(),
    };
    await supa('/rest/v1/academy_members', 'POST', memberRow);
    await sendWelcomeEmail(cleanEmail, firstName, memberTier);
    await auditLog('confirm-membership', subscriptionId + ':' + cleanEmail + ':' + memberTier);
    return json(200, { ok: true, confirmed: true, tier: memberTier, renewalDate });
  }

  // ── CANCEL MEMBERSHIP ────────────────────────────────────
  if (action === 'cancel-membership') {
    if (!email) return json(400, { error: 'email required' });
    const cleanEmail = email.toLowerCase().trim();
    const rows = await supa(`/rest/v1/academy_members?email=eq.${encodeURIComponent(cleanEmail)}&status=eq.active&limit=1`);
    if (!Array.isArray(rows) || rows.length === 0) return json(200, { ok: true, nothingToCancel: true });
    const m = rows[0];
    // Cancel with PayPal if subscription ID exists
    if (m.subscription_id) {
      const ppToken = await getPayPalToken();
      if (ppToken) {
        try {
          await fetch(`${PP_BASE}/v1/billing/subscriptions/${m.subscription_id}/cancel`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + ppToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Cancelled by user' }),
          });
        } catch(e) {}
      }
    }
    await supaUpdate('academy_members', `id=eq.${m.id}`, { status: 'cancelled', cancelled_at: new Date().toISOString() });
    await auditLog('cancel-membership', cleanEmail);
    return json(200, { ok: true, cancelled: true });
  }

  // ── GET MEMBER PORTAL DATA ───────────────────────────────
  if (action === 'get-member-portal') {
    if (!email) return json(400, { error: 'email required' });
    const cleanEmail = email.toLowerCase().trim();
    const [membership, resources, certs, orders] = await Promise.all([
      supa(`/rest/v1/academy_members?email=eq.${encodeURIComponent(cleanEmail)}&status=eq.active&limit=1`),
      supa('/rest/v1/content_resources?status=eq.active&order=sort_order.asc,download_count.desc&limit=20'),
      supa(`/rest/v1/certificates?email=eq.${encodeURIComponent(cleanEmail)}&order=created_at.desc`),
      supa(`/rest/v1/marketplace_orders?email=eq.${encodeURIComponent(cleanEmail)}&status=eq.completed&order=created_at.desc&limit=20`),
    ]);
    const m = Array.isArray(membership) && membership.length > 0 ? membership[0] : null;
    const isMember = !!m;
    const accessibleResources = Array.isArray(resources) ? resources.filter(r => isMember || r.access_tier !== 'academy') : [];
    return json(200, {
      ok: true, isMember,
      membership: m,
      resources: accessibleResources,
      certs:  Array.isArray(certs)  ? certs  : [],
      orders: Array.isArray(orders) ? orders : [],
    });
  }

  
  if (action === "confirm-registration") {
    const { email, tier, subscriptionId, refCode } = body;
    if (!email) return json(400, { error: "email required" });

    const SUPA_URL = process.env.SUPABASE_URL || "";
    const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || "";
    const BREVO_KEY = process.env.BREVO_API_KEY || "";
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@ledgerlearn.pro";
    const amount = tier === "annual" ? 999 : 99;

    // 1. Save member to Supabase (academy_members table or progress)
    try {
      await fetch(SUPA_URL + "/rest/v1/academy_members", {
        method: "POST",
        headers: { "Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY,"Prefer":"resolution=merge-duplicates" },
        body: JSON.stringify({ email, tier, subscription_id:subscriptionId||null, status:"active", ref_code:refCode||null, joined_at:new Date().toISOString() })
      });
    } catch(e) { console.warn("[academy-api] Supabase insert:", e.message); }

    // 2. Send confirmation email to member via Brevo
    if (BREVO_KEY) {
      try {
        await fetch("https://api.brevo.com/v3/smtp/email", {
          method:"POST",
          headers:{ "Content-Type":"application/json","api-key":BREVO_KEY },
          body: JSON.stringify({
            to:[{email}],
            sender:{ name:"LedgerLearn Pro", email:"hello@ledgerlearn.pro" },
            subject:"Welcome to ERP.SaaS Academy!",
            htmlContent:"<h2>Welcome to ERP.SaaS Academy!</h2><p>Your " + tier + " membership is now active.</p><p><strong>Next steps:</strong></p><ul><li>Join our Facebook group: <a href='https://www.facebook.com/groups/virtualbookkeepers'>Virtual Bookkeepers</a></li><li>Access ERP.SaaS Academy on Skool: <a href='https://www.skool.com/erp-saas-academy'>ERP.SaaS Academy</a></li><li>Attend your first live session — schedule in the Skool community</li></ul><p>Questions? Email hello@ledgerlearn.pro</p><p>David<br>LedgerLearn Pro</p>"
          })
        });
      } catch(e) { console.warn("[academy-api] Member email:", e.message); }

      // 3. Admin notification
      try {
        await fetch("https://api.brevo.com/v3/smtp/email", {
          method:"POST",
          headers:{ "Content-Type":"application/json","api-key":BREVO_KEY },
          body: JSON.stringify({
            to:[{email:ADMIN_EMAIL}],
            sender:{ name:"LedgerLearn Pro", email:"hello@ledgerlearn.pro" },
            subject:"New ERP Academy Member: " + email,
            htmlContent:"<h3>New ERP.SaaS Academy Registration</h3><p><strong>Email:</strong> " + email + "</p><p><strong>Tier:</strong> " + tier + " ($" + amount + ")</p><p><strong>Subscription ID:</strong> " + (subscriptionId||"N/A") + "</p><p><strong>Referral code:</strong> " + (refCode||"Direct") + "</p>"
          })
        });
      } catch(e) { console.warn("[academy-api] Admin email:", e.message); }

      // 4. Add to Brevo ERP Academy list (list 6 = completers, use a dedicated list)
      try {
        await fetch("https://api.brevo.com/v3/contacts", {
          method:"POST",
          headers:{ "Content-Type":"application/json","api-key":BREVO_KEY },
          body: JSON.stringify({ email, listIds:[6], updateEnabled:true, attributes:{ SOURCE:"erp-academy-"+tier } })
        });
      } catch(e) { console.warn("[academy-api] Brevo:", e.message); }
    }

    // 5. Track affiliate conversion if ref code present
    if (refCode) {
      try {
        const affRows = await (await fetch(SUPA_URL + "/rest/v1/affiliates?referral_code=eq." + encodeURIComponent(refCode) + "&select=id,commission_rates,commission_pct&limit=1", {
          headers:{ "apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY }
        })).json();
        if (Array.isArray(affRows) && affRows.length) {
          const aff = affRows[0];
          const rates = aff.commission_rates || {};
          const pct = rates.erp_saas || aff.commission_pct || 30;
          const due = parseFloat((amount * pct / 100).toFixed(2));
          await fetch(SUPA_URL + "/rest/v1/affiliate_conversions", {
            method:"POST",
            headers:{ "Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY },
            body: JSON.stringify({ affiliate_id:aff.id, referral_code:refCode, product_type:"erp_saas", buyer_email:email, sale_amount:amount, commission_pct:pct, commission_due:due, status:"pending", order_id:subscriptionId||null })
          });
        }
      } catch(e) { console.warn("[academy-api] Affiliate:", e.message); }
    }

    return json(200, { ok:true, name:email.split("@")[0] });
  }

  return json(400, { error: 'Unknown action: ' + action });
};
