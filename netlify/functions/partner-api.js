/**
 * LedgerLearn — partner-api.js
 * Public Netlify Function — no admin auth required
 * Handles partner application submissions from partners.html
 */
const fetch = (...a) => import('node-fetch').then(({default:f}) => f(...a));

const SUPA_URL = process.env.SUPABASE_URL || '';
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

async function supa(path, method, body) {
  const res = await fetch(SUPA_URL + path, {
    method: method || 'GET',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      ...(method === 'POST' ? { 'Prefer': 'return=representation' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { console.error('[partner-api] supa error', res.status, path, JSON.stringify(data).slice(0,200)); }
  return data;
}

const json = (status, body) => ({ statusCode: status, headers: CORS, body: JSON.stringify(body) });

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return json(405, { error: 'Method not allowed' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const { action } = body;

  // ── SUBMIT PARTNER APPLICATION ─────────────────────────────
  if (action === 'submit-partner') {
    const { institution, contact_name, email, phone,
            org_type, country, students_range, website, message } = body;

    if (!email || !institution || !contact_name) {
      return json(400, { error: 'institution, contact_name and email are required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { error: 'Invalid email address' });
    }

    const row = await supa('/rest/v1/partners', 'POST', {
      institution,
      contact_name,
      email:          email.toLowerCase().trim(),
      phone:          phone          || null,
      org_type:       org_type       || null,
      country:        country        || null,
      students_range: students_range || null,
      website:        website        || null,
      message:        message        || null,
      status:         'pending',
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    });

    if (row && !row.error) {
      // Also subscribe to Brevo list 5 (General) — fire-and-forget
      fetch(process.env.URL + '/.netlify/functions/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, name: contact_name, listId: 5, source: 'partner-application'
        }),
      }).catch(() => {});
      return json(200, { ok: true });
    }
    console.error('[partner-api] INSERT error:', JSON.stringify(row));
    return json(500, { error: 'Could not save application. Please try again.' });
  }


  // ── PARTNER LOGIN ──────────────────────────────────────────
  if (action === 'partner-login') {
    const { email, code } = body;
    if (!email || !code) return json(400, { error: 'Email and code required' });

    // Look up approved partner by email
    const rows = await supa(
      `/rest/v1/partners?email=eq.${encodeURIComponent(email.toLowerCase())}&status=eq.approved&select=*&limit=1`
    );
    const partner = Array.isArray(rows) ? rows[0] : null;
    if (!partner) return json(401, { error: 'No approved partner account found for this email. Contact partners@ledgerlearn.pro.' });

    // Verify access code = referral_code (or a stored access_code column)
    // Simple but secure: access code = referral_code (partner gets it on approval email)
    const validCode = partner.referral_code || '';
    if (!validCode || code.trim() !== validCode.trim()) {
      return json(401, { error: 'Referral code incorrect. Your referral code looks like: firstname-XXXXX. Check your approval email or contact partners@ledgerlearn.pro.' });
    }

    // Fetch affiliate data for commission rates
    let affiliate = null;
    if (partner.affiliate_id) {
      const affRows = await supa(
        `/rest/v1/affiliates?id=eq.${encodeURIComponent(partner.affiliate_id)}&select=*&limit=1`
      );
      affiliate = Array.isArray(affRows) ? affRows[0] : null;
    } else if (partner.referral_code) {
      const affRows = await supa(
        `/rest/v1/affiliates?referral_code=eq.${encodeURIComponent(partner.referral_code)}&select=*&limit=1`
      );
      affiliate = Array.isArray(affRows) ? affRows[0] : null;
    }

    return json(200, {
      ok: true,
      partner: {
        id:               partner.id,
        name:             partner.contact_name || partner.institution,
        contact_name:     partner.contact_name,
        institution:      partner.institution,
        email:            partner.email,
        referral_code:    partner.referral_code,
        affiliate_id:     partner.affiliate_id,
        commission_pct:   affiliate ? affiliate.commission_pct  : 20,
        commission_rates: affiliate ? affiliate.commission_rates : { l2_xero:20, l2_qb:20, erp_saas:30 },
        clicks:           affiliate ? affiliate.referrals : 0,
      }
    });
  }

  // ── GET CONVERSIONS ────────────────────────────────────────
  if (action === 'get-conversions') {
    const { referral_code } = body;
    if (!referral_code) return json(400, { error: 'referral_code required' });

    // Verify the referral code actually exists before returning data
    const affRows = await supa(
      `/rest/v1/affiliates?referral_code=eq.${encodeURIComponent(referral_code)}&select=id&limit=1`
    );
    if (!Array.isArray(affRows) || !affRows.length) {
      return json(200, { ok: true, data: [] });
    }

    const convRows = await supa(
      `/rest/v1/affiliate_conversions?referral_code=eq.${encodeURIComponent(referral_code)}&order=created_at.desc&limit=200&select=*`
    );
    return json(200, { ok: true, data: Array.isArray(convRows) ? convRows : [] });
  }

  return json(400, { error: 'Unknown action' });
};
