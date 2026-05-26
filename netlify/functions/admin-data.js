/**
 * LedgerLearn — Admin Data API
 * ==============================
 * File: netlify/functions/admin-data.js
 *
 * Serves all admin panel data using SERVICE KEY (bypasses RLS).
 * Requires valid admin token in Authorization header.
 *
 * Actions: dashboard, users, certs, payments, partners, affiliates, upgrades, revenue
 */

const crypto = require('crypto');

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const SUPA_URL = process.env.SUPABASE_URL         || '';
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || ''; // SERVICE KEY — bypasses RLS

function json(code, body) {
  return { statusCode: code, headers: CORS, body: JSON.stringify(body) };
}

async function supaFetch(path) {
  if (!SUPA_URL || !SUPA_KEY) return null;
  try {
    const res = await fetch(SUPA_URL + path, {
      headers: {
        'apikey':         SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type':  'application/json',
      }
    });
    return res.json();
  } catch(e) { return null; }
}

function verifyToken(authHeader) {
  const token       = (authHeader || '').replace('Bearer ', '').trim();
  const adminSecret = process.env.ADMIN_SECRET || '';
  if (!token || !adminSecret) return false;
  try {
    const dotIdx     = token.lastIndexOf('.');
    if (dotIdx < 0) return false;
    const payloadB64 = token.slice(0, dotIdx);
    const sig        = token.slice(dotIdx + 1);
    const payload    = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    if (Date.now() > payload.expires) return false;
    const expected   = crypto.createHmac('sha256', adminSecret).update(payloadB64).digest('hex');
    const sigBuf     = Buffer.from(sig, 'hex');
    const expBuf     = Buffer.from(expected, 'hex');
    return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  } catch(e) { return false; }
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return json(405, { error: 'POST only' });

  // Verify admin token
  if (!verifyToken(event.headers['authorization'])) {
    return json(401, { error: 'Unauthorized. Please log in again.' });
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const { action } = body;

  try {
    switch(action) {

      case 'dashboard': {
        const [profiles, certs, pays, pending] = await Promise.all([
          supaFetch('/rest/v1/profiles?select=id'),
          supaFetch('/rest/v1/certificates?select=id,score'),
          supaFetch('/rest/v1/payments?select=amount_usd&status=eq.confirmed'),
          supaFetch('/rest/v1/partners?select=id&status=eq.pending'),
        ]);
        return json(200, {
          ok: true,
          userCount:   Array.isArray(profiles) ? profiles.length : 0,
          certCount:   Array.isArray(certs)    ? certs.length    : 0,
          revenue:     Array.isArray(pays)     ? pays.reduce((s,p)=>s+(parseFloat(p.amount_usd)||0),0) : 0,
          pendPartners:Array.isArray(pending)  ? pending.length  : 0,
        });
      }

      case 'users': {
        const data = await supaFetch('/rest/v1/admin_user_summary?select=*&order=registered_at.desc&limit=200');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'certs': {
        const data = await supaFetch('/rest/v1/certificates?select=*&order=created_at.desc&limit=200');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'payments': {
        const data = await supaFetch('/rest/v1/payments?select=*&order=created_at.desc&limit=100');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'partners': {
        const data = await supaFetch('/rest/v1/partners?select=*&order=created_at.desc');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'affiliates': {
        const data = await supaFetch('/rest/v1/affiliates?select=*&order=created_at.desc');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'upgrades': {
        const data = await supaFetch('/rest/v1/manual_upgrades?select=*&order=created_at.desc&limit=100');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'revenue': {
        const data = await supaFetch('/rest/v1/admin_revenue_summary?select=*&order=month.desc&limit=12');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'approve-partner': {
        const { id } = body;
        if (!id) return json(400, { error: 'id required' });
        await fetch(`${SUPA_URL}/rest/v1/partners?id=eq.${id}`, {
          method: 'PATCH',
          headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer '+SUPA_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' })
        });
        return json(200, { ok: true });
      }

      case 'reject-partner': {
        const { id } = body;
        if (!id) return json(400, { error: 'id required' });
        await fetch(`${SUPA_URL}/rest/v1/partners?id=eq.${id}`, {
          method: 'PATCH',
          headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer '+SUPA_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected' })
        });
        return json(200, { ok: true });
      }

      case 'job-board-stats': {
        const stats = await supaFetch('/rest/v1/admin_jobboard_stats?select=*&limit=1');
        const s = (Array.isArray(stats) && stats.length > 0) ? stats[0] : {};
        return json(200, {
          ok: true,
          activeJobs:        parseInt(s.active_jobs)        || 0,
          activeRecruiters:  parseInt(s.active_recruiters)  || 0,
          trialRecruiters:   parseInt(s.trial_recruiters)   || 0,
          expiredRecruiters: parseInt(s.expired_recruiters) || 0,
          appsToday:         parseInt(s.apps_today)         || 0,
          totalApplications: parseInt(s.total_applications) || 0,
          jobBoardRevenue:   parseFloat(s.job_board_revenue) || 0,
        });
      }

      case 'jobs': {
        const data = await supaFetch(
          '/rest/v1/admin_jobs_summary?select=*&order=created_at.desc&limit=200'
        );
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'recruiters': {
        const data = await supaFetch(
          '/rest/v1/admin_recruiters_summary?select=*&order=created_at.desc&limit=200'
        );
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'job-applications': {
        const data = await supaFetch(
          '/rest/v1/admin_applications_summary?select=*&order=applied_at.desc&limit=200'
        );
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'moderate-job': {
        const { id, action: modAction } = body;
        if (!id || !modAction) return json(400, { error: 'id and action required' });
        const statusMap = { publish:'active', pause:'paused', close:'closed', flag:'flagged' };
        const newStatus = statusMap[modAction];
        if (!newStatus) return json(400, { error: 'Invalid modAction' });
        await fetch(SUPA_URL + '/rest/v1/job_postings?id=eq.' + id, {
          method: 'PATCH',
          headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer '+SUPA_KEY, 'Content-Type':'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        return json(200, { ok: true, newStatus });
      }

      case 'suspend-recruiter': {
        const { id } = body;
        if (!id) return json(400, { error: 'id required' });
        await fetch(SUPA_URL + '/rest/v1/recruiters?id=eq.' + id, {
          method: 'PATCH',
          headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer '+SUPA_KEY, 'Content-Type':'application/json' },
          body: JSON.stringify({ status: 'suspended' })
        });
        // Pause all their jobs
        await fetch(SUPA_URL + '/rest/v1/job_postings?recruiter_id=eq.' + id + '&status=eq.active', {
          method: 'PATCH',
          headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer '+SUPA_KEY, 'Content-Type':'application/json' },
          body: JSON.stringify({ status: 'paused' })
        });
        return json(200, { ok: true });
      }

      case 'verify-recruiter': {
        const { id } = body;
        if (!id) return json(400, { error: 'id required' });
        await fetch(SUPA_URL + '/rest/v1/recruiters?id=eq.' + id, {
          method: 'PATCH',
          headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer '+SUPA_KEY, 'Content-Type':'application/json' },
          body: JSON.stringify({ verified: true })
        });
        return json(200, { ok: true });
      }

      // ── MANUAL CERT INSERT (admin recovery tool) ───────────
      case 'insert-cert': {
        // Allows admin to manually insert a cert that missed Supabase save
        const { certId, candidateName, certTitle, certLevel, certRegion,
                certRegionLabel, certRegionSuffix, score, level, issueDate, email } = body;
        if (!certId || !email) return json(400, { error: 'certId and email required' });

        // Check if cert already exists
        const existing = await supa(
          `/rest/v1/certificates?cert_id=eq.${encodeURIComponent(certId)}&limit=1`, 'GET'
        );
        if (Array.isArray(existing) && existing.length > 0) {
          return json(200, { ok: true, alreadyExists: true, cert: existing[0] });
        }

        // Get user_id from profiles
        const prof = await supa(
          `/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`, 'GET'
        );
        const userId = Array.isArray(prof) && prof.length > 0 ? prof[0].id : null;

        const row = {
          user_id:            userId,
          email:              email,
          cert_id:            certId,
          candidate_name:     candidateName    || 'Candidate',
          cert_title:         certTitle        || '',
          cert_level:         certLevel        || '',
          cert_region:        certRegion       || 'UK',
          cert_region_label:  certRegionLabel  || 'United Kingdom',
          cert_region_suffix: certRegionSuffix || '',
          score:              score            || 0,
          level:              level            || 'l1',
          issue_date:         issueDate        || new Date().toISOString().split('T')[0],
        };

        const result = await supa('/rest/v1/certificates', 'POST', row);
        return json(200, { ok: true, inserted: true, cert: Array.isArray(result) ? result[0] : result });
      }

      default:
        return json(400, { error: 'Unknown action: ' + action });
    }
  } catch(e) {
    return json(500, { error: 'Server error: ' + e.message });
  }
};
