/**
 * LedgerLearn — Trial Expiry Scheduled Function
 * ===============================================
 * File: netlify/functions/expire-trials.js
 *
 * Runs daily via Netlify Scheduled Functions.
 * Marks expired trials, pauses their jobs, sends reminder emails via Brevo.
 *
 * Schedule: every day at 08:00 UTC
 * netlify.toml: [functions.expire-trials] schedule = "0 8 * * *"
 *
 * Also callable manually via POST with X-Admin-Secret header.
 */

const SUPA_URL  = process.env.SUPABASE_URL         || '';
const SUPA_SVC  = process.env.SUPABASE_SERVICE_KEY || '';
const BREVO_KEY = process.env.BREVO_API_KEY        || '';

async function supa(path, method, body) {
  if (!SUPA_URL || !SUPA_SVC) return null;
  try {
    const res = await fetch(SUPA_URL + path, {
      method: method || 'GET',
      headers: {
        'apikey':        SUPA_SVC,
        'Authorization': 'Bearer ' + SUPA_SVC,
        'Content-Type':  'application/json',
        'Prefer':        method === 'PATCH' ? 'return=representation' : '',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json().catch(() => null);
  } catch(e) { return null; }
}

async function sendEmail(to, subject, html) {
  if (!BREVO_KEY || !to) return;
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender:  { name: 'LedgerLearn Pro', email: 'hello@ledgerlearn.pro' },
        to:      [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
  } catch(e) { console.error('[expire-trials] email error:', e.message); }
}

async function runExpiry() {
  const now  = new Date().toISOString();
  const log  = { expired: 0, warned7: 0, warned1: 0, jobsPaused: 0 };

  // ── 1. Expire trials past trial_end ─────────────────────────
  const expired = await supa(
    `/rest/v1/recruiters?plan=eq.trial&trial_end=lt.${now}&status=eq.active`,
    'PATCH',
    { plan: 'expired' }
  );
  if (Array.isArray(expired)) {
    log.expired = expired.length;

    // Pause their active jobs + send expired email
    for (const rec of expired) {
      const paused = await supa(
        `/rest/v1/job_postings?recruiter_id=eq.${rec.id}&status=eq.active`,
        'PATCH',
        { status: 'paused' }
      );
      if (Array.isArray(paused)) log.jobsPaused += paused.length;

      await sendEmail(rec.email,
        'Your LedgerLearn free trial has expired',
        `<p>Hi ${rec.contact_name || 'there'},</p>
         <p>Your 30-day free trial on LedgerLearn Pro has ended. Your job listings have been paused and are no longer visible to applicants.</p>
         <p><strong>Upgrade to keep your listings live:</strong></p>
         <ul>
           <li><strong>Per post — $39:</strong> Pay per listing, 30-day live period</li>
           <li><strong>Monthly — $149/mo:</strong> Unlimited listings, cancel any time</li>
         </ul>
         <p><a href="https://ledgerlearn.pro/jobs-pricing" style="background:#D4A843;color:#0B1F3A;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Upgrade now →</a></p>
         <p>Questions? Reply to this email or contact hello@ledgerlearn.pro</p>
         <p>The LedgerLearn Team</p>`
      );
    }
  }

  // ── 2. Send 7-day warning ────────────────────────────────────
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const warn7 = await supa(
    `/rest/v1/recruiters?plan=eq.trial&status=eq.active&trial_end=gte.${sevenDays}T00:00:00Z&trial_end=lt.${sevenDays}T23:59:59Z`,
    'GET'
  );
  if (Array.isArray(warn7)) {
    log.warned7 = warn7.length;
    for (const rec of warn7) {
      await sendEmail(rec.email,
        'Your LedgerLearn trial ends in 7 days',
        `<p>Hi ${rec.contact_name || 'there'},</p>
         <p>Your free trial on LedgerLearn Pro ends in <strong>7 days</strong>.</p>
         <p>After that, your job listings will be paused. Upgrade now to keep them live without interruption.</p>
         <p><a href="https://ledgerlearn.pro/jobs-pricing" style="background:#D4A843;color:#0B1F3A;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">View pricing →</a></p>
         <p>The LedgerLearn Team</p>`
      );
    }
  }

  // ── 3. Send 1-day warning ────────────────────────────────────
  const oneDay = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const warn1 = await supa(
    `/rest/v1/recruiters?plan=eq.trial&status=eq.active&trial_end=gte.${oneDay}T00:00:00Z&trial_end=lt.${oneDay}T23:59:59Z`,
    'GET'
  );
  if (Array.isArray(warn1)) {
    log.warned1 = warn1.length;
    for (const rec of warn1) {
      await sendEmail(rec.email,
        'Last day of your LedgerLearn free trial',
        `<p>Hi ${rec.contact_name || 'there'},</p>
         <p>Your LedgerLearn free trial ends <strong>tomorrow</strong>. Upgrade today to avoid any interruption to your job listings.</p>
         <p><a href="https://ledgerlearn.pro/jobs-pricing" style="background:#D4A843;color:#0B1F3A;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Upgrade now — from $39 →</a></p>
         <p>The LedgerLearn Team</p>`
      );
    }
  }

  console.log('[expire-trials] run complete:', JSON.stringify(log));
  return log;
}

exports.handler = async function(event) {
  // Called by Netlify scheduler (GET) or manually (POST with admin secret)
  if (event.httpMethod === 'POST') {
    const secret = event.headers['x-admin-secret'] || '';
    if (secret !== process.env.ADMIN_SECRET) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }
  }

  try {
    const result = await runExpiry();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, ...result }),
    };
  } catch(e) {
    console.error('[expire-trials] fatal error:', e.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
