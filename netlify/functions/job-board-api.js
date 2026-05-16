/**
 * LedgerLearn — Job Board API
 * ============================
 * File: netlify/functions/job-board-api.js
 *
 * Handles all job board data operations:
 *   post-job         → create/update job posting (recruiter, paygate-checked)
 *   get-jobs         → fetch active jobs for public listing
 *   get-recruiter-jobs → fetch jobs for logged-in recruiter
 *   submit-application → applicant applies for a job
 *   get-applications → recruiter fetches their inbox
 *   get-my-applications → applicant fetches their own applications
 *   update-application-status → recruiter shortlists/rejects
 *   save-job         → applicant bookmarks a job
 *   get-saved-jobs   → applicant fetches bookmarks
 */

const crypto = require('crypto');

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const SUPA_URL = process.env.SUPABASE_URL          || '';
const SUPA_SVC = process.env.SUPABASE_SERVICE_KEY  || '';
const SUPA_ANO = process.env.SUPABASE_ANON_KEY     || '';

function json(code, body) {
  return { statusCode: code, headers: CORS, body: JSON.stringify(body) };
}

async function supa(path, method, body, useAnon) {
  const key = useAnon ? SUPA_ANO : SUPA_SVC;
  if (!SUPA_URL || !key) return null;
  try {
    const res = await fetch(SUPA_URL + path, {
      method:  method || 'GET',
      headers: {
        'apikey':        key,
        'Authorization': 'Bearer ' + key,
        'Content-Type':  'application/json',
        'Prefer':        method === 'POST' ? 'return=representation' : '',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[job-board-api] Supabase', res.status, err.slice(0,200));
      return null;
    }
    return res.json();
  } catch(e) {
    console.error('[job-board-api] fetch error:', e.message);
    return null;
  }
}

// Verify recruiter access via paygate RPC
async function checkRecruiterAccess(userId) {
  const result = await supa('/rest/v1/rpc/check_recruiter_access', 'POST', { p_user_id: userId });
  if (!result) return { allowed: false, reason: 'DB error' };
  return Array.isArray(result) ? result[0] : result;
}

// Get user_id from JWT token
function getUserIdFromToken(authHeader) {
  try {
    const token = (authHeader || '').replace('Bearer ', '').trim();
    if (!token) return null;
    const parts   = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload.sub || null;
  } catch(e) { return null; }
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const { action } = body;
  const authHeader  = event.headers['authorization'] || '';
  const userId      = getUserIdFromToken(authHeader);

  try {

    // ── POST JOB (recruiter) ─────────────────────────────────
    if (action === 'post-job') {
      if (!userId) return json(401, { error: 'Authentication required' });

      // Paygate check
      const access = await checkRecruiterAccess(userId);
      if (!access.allowed) {
        return json(403, { error: access.reason || 'Plan expired. Upgrade to post jobs.', upgrade: true });
      }

      const { title, company, location, locationType, employmentType,
              salaryMin, salaryMax, salaryCurrency, salaryPeriod,
              certLevelRequired, description, responsibilities, requirements,
              screeningQuestions, deadline, contactEmail, jobId } = body;

      if (!title || !company || !location || !description || !contactEmail) {
        return json(400, { error: 'title, company, location, description, contactEmail required' });
      }

      // Get recruiter row
      const recs = await supa(`/rest/v1/recruiters?user_id=eq.${userId}&select=id`, 'GET');
      if (!recs || !recs.length) return json(404, { error: 'Recruiter account not found' });
      const recruiterId = recs[0].id;

      const jobData = {
        recruiter_id:         recruiterId,
        title,
        company,
        location,
        location_type:        locationType        || 'onsite',
        employment_type:      employmentType      || 'full-time',
        salary_min:           salaryMin           || null,
        salary_max:           salaryMax           || null,
        salary_currency:      salaryCurrency      || 'USD',
        salary_period:        salaryPeriod        || 'monthly',
        cert_level_required:  certLevelRequired   || 'any',
        description,
        responsibilities:     responsibilities    || null,
        requirements:         requirements        || null,
        screening_questions:  screeningQuestions  || [],
        deadline:             deadline            || null,
        status:               'active',
        published_at:         new Date().toISOString(),
      };

      let result;
      if (jobId) {
        // Update existing
        result = await supa(`/rest/v1/job_postings?id=eq.${jobId}&recruiter_id=eq.${recruiterId}`, 'PATCH', jobData);
      } else {
        // Create new
        result = await supa('/rest/v1/job_postings', 'POST', jobData);
        // Increment recruiter post count
        await supa(`/rest/v1/recruiters?id=eq.${recruiterId}`, 'PATCH', {
          total_posts: (recs[0].total_posts || 0) + 1
        });
      }

      return json(200, { ok: true, job: Array.isArray(result) ? result[0] : result });
    }

    // ── GET ACTIVE JOBS (public) ─────────────────────────────
    if (action === 'get-jobs') {
      const { region, level, locationType, search, page } = body;
      let path = '/rest/v1/job_postings?status=eq.active&order=published_at.desc&limit=24';
      if (level && level !== 'any') path += `&cert_level_required=eq.${level}`;
      if (locationType) path += `&location_type=eq.${locationType}`;
      const jobs = await supa(path, 'GET', null, true); // anon key for public read
      return json(200, { ok: true, data: Array.isArray(jobs) ? jobs : [] });
    }

    // ── GET RECRUITER JOBS ───────────────────────────────────
    if (action === 'get-recruiter-jobs') {
      if (!userId) return json(401, { error: 'Authentication required' });
      const recs = await supa(`/rest/v1/recruiters?user_id=eq.${userId}&select=id`, 'GET');
      if (!recs || !recs.length) return json(404, { error: 'Recruiter account not found' });
      const recruiterId = recs[0].id;
      const jobs = await supa(
        `/rest/v1/job_postings?recruiter_id=eq.${recruiterId}&order=created_at.desc`,
        'GET'
      );
      return json(200, { ok: true, data: Array.isArray(jobs) ? jobs : [] });
    }

    // ── SUBMIT APPLICATION ───────────────────────────────────
    if (action === 'submit-application') {
      if (!userId) return json(401, { error: 'Sign in to apply for jobs' });
      const { jobId, coverNote, screeningAnswers } = body;
      if (!jobId) return json(400, { error: 'jobId required' });

      // Check not already applied
      const existing = await supa(
        `/rest/v1/job_applications?job_id=eq.${jobId}&applicant_id=eq.${userId}&select=id`,
        'GET', null, true
      );
      if (existing && existing.length > 0) {
        return json(409, { error: 'You have already applied for this job' });
      }

      // Get applicant profile snapshot
      const profiles = await supa(
        `/rest/v1/applicant_profiles?user_id=eq.${userId}&select=*`,
        'GET', null, true
      );
      const certs = await supa(
        `/rest/v1/certificates?user_id=eq.${userId}&select=*`,
        'GET', null, true
      );

      const result = await supa('/rest/v1/job_applications', 'POST', {
        job_id:             jobId,
        applicant_id:       userId,
        profile_snapshot:   profiles?.[0] || null,
        cert_snapshot:      certs         || [],
        cover_note:         coverNote     || null,
        screening_answers:  screeningAnswers || {},
        status:             'applied',
        applied_at:         new Date().toISOString(),
      });

      // Increment application count on job posting
      const job = await supa(`/rest/v1/job_postings?id=eq.${jobId}&select=application_count`, 'GET');
      if (job && job[0]) {
        await supa(`/rest/v1/job_postings?id=eq.${jobId}`, 'PATCH', {
          application_count: (job[0].application_count || 0) + 1
        });
      }

      return json(200, { ok: true, application: Array.isArray(result) ? result[0] : result });
    }

    // ── GET APPLICATIONS (recruiter inbox) ───────────────────
    if (action === 'get-applications') {
      if (!userId) return json(401, { error: 'Authentication required' });
      const recs = await supa(`/rest/v1/recruiters?user_id=eq.${userId}&select=id`, 'GET');
      if (!recs || !recs.length) return json(404, { error: 'Recruiter account not found' });
      const recruiterId = recs[0].id;
      const { jobId } = body;

      // Get job IDs belonging to this recruiter
      let jobsPath = `/rest/v1/job_postings?recruiter_id=eq.${recruiterId}&select=id`;
      if (jobId) jobsPath += `&id=eq.${jobId}`;
      const jobs = await supa(jobsPath, 'GET');
      if (!jobs || !jobs.length) return json(200, { ok: true, data: [] });
      const jobIds = jobs.map(function(j){ return j.id; }).join(',');

      const apps = await supa(
        `/rest/v1/admin_applications_summary?order=applied_at.desc&limit=100`,
        'GET'
      );
      return json(200, { ok: true, data: Array.isArray(apps) ? apps : [] });
    }

    // ── GET MY APPLICATIONS (applicant) ─────────────────────
    if (action === 'get-my-applications') {
      if (!userId) return json(401, { error: 'Authentication required' });
      const apps = await supa(
        `/rest/v1/job_applications?applicant_id=eq.${userId}&order=applied_at.desc&select=*,job_postings(title,company,location,status)`,
        'GET', null, true
      );
      return json(200, { ok: true, data: Array.isArray(apps) ? apps : [] });
    }

    // ── UPDATE APPLICATION STATUS (recruiter) ───────────────
    if (action === 'update-application-status') {
      if (!userId) return json(401, { error: 'Authentication required' });
      const { applicationId, status } = body;
      const validStatuses = ['applied','shortlisted','interview','offered','rejected'];
      if (!applicationId || !validStatuses.includes(status)) {
        return json(400, { error: 'applicationId and valid status required' });
      }
      await supa(`/rest/v1/job_applications?id=eq.${applicationId}`, 'PATCH', {
        status,
        status_updated_at: new Date().toISOString()
      });
      return json(200, { ok: true });
    }

    // ── SAVE JOB (applicant bookmark) ────────────────────────
    if (action === 'save-job') {
      if (!userId) return json(401, { error: 'Sign in to save jobs' });
      const { jobId } = body;
      if (!jobId) return json(400, { error: 'jobId required' });
      await supa('/rest/v1/saved_jobs', 'POST', {
        applicant_id: userId,
        job_id:       jobId,
        saved_at:     new Date().toISOString(),
      });
      return json(200, { ok: true });
    }

    // ── GET SAVED JOBS ───────────────────────────────────────
    if (action === 'get-saved-jobs') {
      if (!userId) return json(401, { error: 'Authentication required' });
      const saved = await supa(
        `/rest/v1/saved_jobs?applicant_id=eq.${userId}&select=*,job_postings(*)&order=saved_at.desc`,
        'GET', null, true
      );
      return json(200, { ok: true, data: Array.isArray(saved) ? saved : [] });
    }

    return json(400, { error: 'Unknown action: ' + action });

  } catch(e) {
    console.error('[job-board-api] error:', e.message);
    return json(500, { error: 'Server error: ' + e.message });
  }
};
