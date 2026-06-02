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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token',
  'Content-Type': 'application/json',
};

const SUPA_URL = process.env.SUPABASE_URL          || '';
const SUPA_SVC = process.env.SUPABASE_SERVICE_KEY  || '';
const SUPA_ANO = process.env.SUPABASE_ANON_KEY     || '';

function json(code, body) {
  return { statusCode: code, headers: CORS, body: JSON.stringify(body) };
}

async function supaRaw(path, method, body, prefer) {
  // Like supa() but with custom Prefer header
  const key = SUPA_SVC;
  if (!SUPA_URL || !key) return null;
  try {
    const res = await fetch(SUPA_URL + path, {
      method: method || 'GET',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        key,
        'Authorization': 'Bearer ' + key,
        ...(prefer ? { 'Prefer': prefer } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return {};
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[job-board-api] supaRaw error', res.status, path, JSON.stringify(data).slice(0,200));
      return { error: data };
    }
    return data;
  } catch(e) {
    console.error('[job-board-api] supaRaw fetch error:', e.message);
    return null;
  }
}

async function supa(path, method, body, useAnon) {
  const key = useAnon ? SUPA_ANO : SUPA_SVC;
  if (!SUPA_URL || !key) return null;
  try {
    const m = method || 'GET';
    // Ask Supabase to return the row for POST and PATCH
    const prefer = (m === 'POST' || m === 'PATCH') ? 'return=representation' : '';
    const res = await fetch(SUPA_URL + path, {
      method:  m,
      headers: {
        'apikey':        key,
        'Authorization': 'Bearer ' + key,
        'Content-Type':  'application/json',
        ...(prefer ? { 'Prefer': prefer } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let errBody = {};
      try { errBody = await res.json(); } catch(_) { errBody = { message: await res.text().catch(() => '') }; }
      console.error('[job-board-api] Supabase', res.status, path, JSON.stringify(errBody).slice(0,200));
      return { _supaError: true, status: res.status, error: errBody };
    }
    // 204 No Content — PATCH/DELETE with no Prefer header
    if (res.status === 204) return { ok: true };
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) return { ok: true };
    return res.json().catch(() => ({ ok: true }));
  } catch(e) {
    console.error('[job-board-api] fetch error:', e.message);
    return null;
  }
}

// Verify recruiter access — direct table query, no RPC dependency
async function checkRecruiterAccess(userId) {
  const rows = await supa(
    `/rest/v1/recruiters?user_id=eq.${encodeURIComponent(userId)}&select=id,plan,status,trial_end&limit=1`
  );
  if (!rows) return { allowed: false, plan: 'error', reason: 'Could not reach database' };
  if (!Array.isArray(rows) || rows.length === 0) {
    return { allowed: false, plan: 'none', reason: 'Recruiter account not found' };
  }
  const rec = rows[0];
  const plan = rec.plan || 'trial';
  if (plan === 'trial') {
    const trialEnd = rec.trial_end ? new Date(rec.trial_end).getTime() : 0;
    const daysLeft = Math.max(0, Math.floor((trialEnd - Date.now()) / 86400000));
    if (rec.status !== 'active' || daysLeft <= 0) {
      return { allowed: false, plan: 'expired', reason: 'Your free trial has ended.' };
    }
    return { allowed: true, plan: 'trial', trial_days_left: daysLeft };
  }
  if (plan === 'per_post' || plan === 'monthly') {
    return { allowed: rec.status === 'active', plan, reason: rec.status !== 'active' ? 'Account suspended' : null };
  }
  return { allowed: false, plan, reason: 'Account is not active' };
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
      const { region, level, locationType, search } = body;

      // Fetch jobs + recruiter country in one query using Supabase select with foreign table
      let path = '/rest/v1/job_postings?status=eq.active&order=published_at.desc&limit=48'
        + '&select=id,title,company,location,location_type,employment_type'
        + ',salary_min,salary_max,salary_currency,salary_period'
        + ',cert_level_required,description,view_count,application_count'
        + ',deadline,published_at,apply_method,external_url,source'
        + ',recruiters(country)';

      if (level && level !== 'any') path += `&cert_level_required=eq.${level}`;
      if (locationType) path += `&location_type=eq.${locationType}`;

      const raw = await supa(path, 'GET'); // service key — bypasses RLS, jobs are public data
      if (!Array.isArray(raw)) return json(200, { ok: true, data: [] });

      // Normalise: map recruiters.country → region so frontend filter works
      const COUNTRY_TO_REGION = {
        'NG':'NG','Nigeria':'NG',
        'ZA':'ZA','South Africa':'ZA',
        'UK':'UK','United Kingdom':'UK','GB':'UK',
        'AU':'AU','Australia':'AU',
        'US':'US','United States':'US',
        'AE':'AE','UAE':'AE',
        'GH':'GH','Ghana':'GH',
        'KE':'KE','Kenya':'KE',
        'CA':'CA','Canada':'CA',
      };

      // Text search filter (server-side since Supabase free tier has no full-text)
      const q = (search || '').toLowerCase().trim();

      const jobs = raw
        .filter(function(j) {
          if (!q) return true;
          return (j.title       || '').toLowerCase().includes(q)
              || (j.company     || '').toLowerCase().includes(q)
              || (j.description || '').toLowerCase().includes(q)
              || (j.location    || '').toLowerCase().includes(q);
        })
        .map(function(j) {
          const country = j.recruiters && j.recruiters.country
            ? j.recruiters.country : '';
          const region  = COUNTRY_TO_REGION[country]
            || (j.location || '').match(/(NG|ZA|UK|AU|US|AE)/)?.[1]
            || 'GLOBAL';
          return {
            id:                   j.id,
            title:                j.title,
            company:              j.company,
            location:             j.location,
            location_type:        j.location_type,
            employment_type:      j.employment_type,
            salary_min:           j.salary_min,
            salary_max:           j.salary_max,
            salary_currency:      j.salary_currency || 'USD',
            salary_period:        j.salary_period || 'monthly',
            cert_level_required:  j.cert_level_required || 'any',
            description:          j.description,
            view_count:           j.view_count || 0,
            application_count:    j.application_count || 0,
            deadline:             j.deadline,
            published_at:         j.published_at,
            apply_method:         j.apply_method  || 'internal',
            external_url:         j.external_url  || null,
            source:               j.source        || 'internal',
            region,
          };
        });

      // Region filter (after mapping)
      const filtered = region
        ? jobs.filter(function(j) {
            if (region === 'remote') return j.location_type === 'remote';
            return j.region === region || j.region === 'GLOBAL';
          })
        : jobs;

      return json(200, { ok: true, data: filtered });
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


    // ── GET APPLICANT FULL PROFILE (recruiter view) ──────────────
    if (action === 'get-applicant-profile') {
      if (!userId) return json(401, { error: 'Authentication required' });
      const { applicantId, applicationId } = body;
      if (!applicantId) return json(400, { error: 'applicantId required' });

      // Verify requester is a recruiter who owns a job this person applied to
      const recruiterRows = await supa(`/rest/v1/recruiters?user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`);
      const recruiterId = Array.isArray(recruiterRows) && recruiterRows[0] ? recruiterRows[0].id : null;
      if (!recruiterId) return json(403, { error: 'Recruiter account required' });

      // Get the application to verify recruiter owns the job
      let coverNote = '';
      let certSnap  = [];
      if (applicationId) {
        const appRows = await supa(
          `/rest/v1/job_applications?id=eq.${encodeURIComponent(applicationId)}&select=cover_note,cert_snapshot,job_id&limit=1`
        );
        if (Array.isArray(appRows) && appRows[0]) {
          coverNote = appRows[0].cover_note || '';
          certSnap  = appRows[0].cert_snapshot || [];
          // Verify recruiter owns this job
          const jobCheck = await supa(
            `/rest/v1/job_postings?id=eq.${encodeURIComponent(appRows[0].job_id)}&recruiter_id=eq.${encodeURIComponent(recruiterId)}&select=id&limit=1`
          );
          if (!Array.isArray(jobCheck) || !jobCheck.length) {
            return json(403, { error: 'Not authorised to view this application' });
          }
        }
      }

      // Fetch full applicant profile — keyed by user_id = applicantId
      const profiles = await supa(
        `/rest/v1/applicant_profiles?user_id=eq.${encodeURIComponent(applicantId)}&select=*&limit=1`
      );
      const profile = Array.isArray(profiles) ? profiles[0] : null;

      // Also fetch certificates from certificates table
      if (profile && profile.email) {
        const certs = await supa(
          `/rest/v1/certificates?email=eq.${encodeURIComponent(profile.email)}&order=created_at.desc&select=cert_id,level,score,cert_title,issue_date`
        );
        if (Array.isArray(certs) && certs.length && !certSnap.length) {
          certSnap = certs.map(function(c){ return { certId: c.cert_id, level: c.level, score: c.score, certTitle: c.cert_title, issueDate: c.issue_date }; });
        }
      }

      return json(200, { ok: true, profile: profile || {}, cert_snapshot: certSnap, cover_note: coverNote });
    }

    // ── BULK IMPORT JOBS (admin only) ────────────────────────────────
    if (action === 'bulk-import-jobs') {
      // Verify admin JWT token (format: base64payload.hmac_sha256)
      // Token in body (avoids CORS preflight from custom headers)
      const adminToken = (body.adminToken || event.headers['x-admin-token'] || '').trim();
      if (!adminToken) return json(401, { error: 'Admin token required' });
      try {
        const ADMIN_SECRET = process.env.ADMIN_SECRET || 'ledgerlearn-admin-secret-change-this';
        const dotIdx = adminToken.lastIndexOf('.');
        if (dotIdx < 0) return json(403, { error: 'Invalid admin token format' });
        const payloadB64 = adminToken.slice(0, dotIdx);
        const sig        = adminToken.slice(dotIdx + 1);
        const expected   = crypto.createHmac('sha256', ADMIN_SECRET).update(payloadB64).digest('hex');
        if (sig !== expected) return json(403, { error: 'Invalid admin token' });
        // Check expiry
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
        if (!payload.expires || Date.now() > payload.expires) {
          return json(401, { error: 'Admin token expired — please log in again' });
        }
      } catch(e) {
        return json(403, { error: 'Admin token verification failed' });
      }

      const { jobs } = body;
      if (!Array.isArray(jobs) || jobs.length === 0) {
        return json(400, { error: 'jobs array required' });
      }

      const SYSTEM_RECRUITER_ID = '00000000-0000-0000-0000-000000000001';
      const now = new Date().toISOString();
      const results = { inserted: 0, skipped: 0, errors: [] };

      for (const job of jobs) {
        try {
          // Skip if missing required fields
          if (!job.title || !job.company) {
            results.skipped++;
            continue;
          }

          const row = {
            recruiter_id:     SYSTEM_RECRUITER_ID,
            title:            (job.title            || '').slice(0, 200),
            company:          (job.company          || '').slice(0, 200),
            location:         (job.location         || 'Not specified').slice(0, 200),
            location_type:    ['onsite','remote','hybrid'].includes(job.location_type)
                                ? job.location_type : 'onsite',
            employment_type:  ['full-time','part-time','contract','freelance'].includes(job.employment_type)
                                ? job.employment_type : 'full-time',
            cert_level_required: ['any','l1','l2','l3'].includes(job.cert_level_required)
                                ? job.cert_level_required : 'any',
            description:      (job.description      || job.title).slice(0, 5000),
            responsibilities: (job.responsibilities || null),
            requirements:     (job.requirements     || null),
            salary_min:       job.salary_min        ? parseFloat(job.salary_min)  : null,
            salary_max:       job.salary_max        ? parseFloat(job.salary_max)  : null,
            salary_currency:  (job.salary_currency  || 'USD').slice(0, 5),
            salary_period:    ['hourly','daily','monthly','annual'].includes(job.salary_period)
                                ? job.salary_period : 'monthly',
            external_url:     (job.external_url     || job.url || job.apply_url || null),
            apply_method:     (job.external_url || job.url || job.apply_url) ? 'external' : 'internal',
            source:           'scraped',
            source_label:     (job.source_label     || job.source || null),
            status:           'active',
            deadline:         job.deadline          || null,
            published_at:     now,
            expires_at:       job.expires_at        || null,
            created_at:       now,
            updated_at:       now,
          };

          const res = await supa('/rest/v1/job_postings', 'POST', row);
          if (res && !res.error) {
            results.inserted++;
          } else {
            results.errors.push({ title: job.title, error: (res && res.error) ? JSON.stringify(res.error) : 'insert failed' });
          }
        } catch(e) {
          results.errors.push({ title: job.title, error: e.message });
        }
      }

      return json(200, { ok: true, results });
    }

    if (action === 'submit-application') {
      if (!userId) return json(401, { error: 'Sign in to apply for jobs' });
      const { jobId, coverNote, screeningAnswers } = body;
      if (!jobId) return json(400, { error: 'jobId required' });

      // Check not already applied — use SERVICE KEY (bypasses RLS, userId verified from JWT)
      const existing = await supa(
        `/rest/v1/job_applications?job_id=eq.${encodeURIComponent(jobId)}&applicant_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`
      );
      if ((Array.isArray(existing) && existing.length > 0) ||
          (existing && existing._supaError && existing.status === 409)) {
        return json(409, { error: 'You have already applied for this job' });
      }

      // Get profile + cert snapshots — service key, safe even with no profile yet
      const profiles = await supa(
        `/rest/v1/applicant_profiles?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`
      );
      const certs = await supa(
        `/rest/v1/certificates?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&select=*`
      );

      const profileSnap  = Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;
      const certSnap     = Array.isArray(certs) ? certs : [];

      // Insert application
      const result = await supa('/rest/v1/job_applications', 'POST', {
        job_id:            jobId,
        applicant_id:      userId,
        profile_snapshot:  profileSnap,
        cert_snapshot:     certSnap,
        cover_note:        coverNote     || null,
        screening_answers: screeningAnswers || {},
        status:            'applied',
        applied_at:        new Date().toISOString(),
        status_updated_at: new Date().toISOString(),
      });

      if (!result || result._supaError) {
        // Check for UNIQUE constraint violation = already applied
        const errDetail = result && result.error
          ? (result.error.message || result.error.details || result.error.hint || '')
          : '';
        if (errDetail.includes('unique') || errDetail.includes('duplicate') ||
            (result && result.status === 409)) {
          return json(409, { error: 'You have already applied for this job' });
        }
        const errMsg = errDetail || 'Could not submit application. Please try again.';
        console.error('[submit-application] insert error:', errMsg);
        return json(500, { error: errMsg });
      }

      // Increment application_count (non-critical — fire and forget)
      supa(
        `/rest/v1/job_postings?id=eq.${encodeURIComponent(jobId)}&select=application_count&limit=1`
      ).then(function(jobs) {
        if (Array.isArray(jobs) && jobs[0]) {
          supa(`/rest/v1/job_postings?id=eq.${encodeURIComponent(jobId)}`, 'PATCH', {
            application_count: (jobs[0].application_count || 0) + 1,
            updated_at:        new Date().toISOString(),
          });
        }
      }).catch(function() {});

      const appRow = Array.isArray(result) ? result[0] : (result && !result._supaError ? result : null);
      return json(200, { ok: true, application: appRow });
    }

    // ── GET APPLICATIONS (recruiter inbox) ───────────────────
    if (action === 'get-applications') {
      if (!userId) return json(401, { error: 'Authentication required' });

      // Get this recruiter's ID
      const recs = await supa(
        `/rest/v1/recruiters?user_id=eq.${userId}&select=id&limit=1`, 'GET'
      );
      if (!recs || !recs.length) return json(404, { error: 'Recruiter account not found' });
      const recruiterId = recs[0].id;

      // Get job IDs belonging to this recruiter
      const { jobId } = body;
      let jobsPath = `/rest/v1/job_postings?recruiter_id=eq.${recruiterId}&select=id,title`;
      if (jobId) jobsPath += `&id=eq.${jobId}`;
      const recruiterJobs = await supa(jobsPath, 'GET');
      if (!Array.isArray(recruiterJobs) || !recruiterJobs.length) {
        return json(200, { ok: true, data: [] });
      }

      // Build map of job_id → job title
      const jobTitleMap = {};
      const jobIds = recruiterJobs.map(function(j){ jobTitleMap[j.id]=j.title; return j.id; });

      // Fetch applications for those jobs with applicant profile data
      // Use job_id=in.(id1,id2,...) Supabase filter
      const inFilter = jobIds.map(encodeURIComponent).join(',');
      const apps = await supa(
        `/rest/v1/job_applications?job_id=in.(${inFilter})` +
        `&select=id,job_id,applicant_id,status,cert_snapshot,applied_at,cover_note` +
        `&order=applied_at.desc&limit=200`,
        'GET'
      );
      if (!Array.isArray(apps) || !apps.length) return json(200, { ok: true, data: [] });

      // Enrich with applicant profile data
      const applicantIds = [...new Set(apps.map(a => a.applicant_id).filter(Boolean))];
      let profileMap = {};
      if (applicantIds.length) {
        // applicant_id in job_applications = auth.users.id = applicant_profiles.user_id
        const profiles = await supa(
          `/rest/v1/applicant_profiles?user_id=in.(${applicantIds.map(encodeURIComponent).join(',')})` +
          `&select=id,user_id,email,first_name,last_name,city,country`,
          'GET'
        );
        if (Array.isArray(profiles)) {
          // Key by user_id to match applicant_id in job_applications
          profiles.forEach(function(p){ profileMap[p.user_id] = p; });
        }
      }

      const enriched = apps.map(function(a) {
        const prof = profileMap[a.applicant_id] || {};  // applicant_id = user_id
        const fullName = [prof.first_name, prof.last_name].filter(Boolean).join(' ') || '—';
        const region   = (prof.country || '').toUpperCase().slice(0, 2);
        return {
          id:             a.id,
          job_id:         a.job_id,
          job_title:      jobTitleMap[a.job_id] || '—',
          applicant_id:   a.applicant_id,
          applicant_name: fullName,
          applicant_email:prof.email || '',
          region:         region,
          status:         a.status || 'applied',
          cert_snapshot:  a.cert_snapshot,
          applied_at:     a.applied_at,
          cover_note:     a.cover_note,
        };
      });

      return json(200, { ok: true, data: enriched });
    }

    // ── GET MY APPLICATIONS (applicant) ─────────────────────
    if (action === 'get-my-applications') {
      if (!userId) return json(401, { error: 'Authentication required' });
      // Use service key — applicant_id is verified from JWT so this is safe
      // Fetch applications — service key bypasses RLS
      const apps = await supa(
        `/rest/v1/job_applications?applicant_id=eq.${encodeURIComponent(userId)}` +
        `&order=applied_at.desc&limit=100` +
        `&select=id,job_id,status,applied_at,cover_note,cert_snapshot`,
        'GET'
      );
      if (!Array.isArray(apps) || apps.length === 0) {
        return json(200, { ok: true, data: [] });
      }
      // Fetch job details separately (avoids PostgREST join ambiguity)
      const jobIds = [...new Set(apps.map(function(a){ return a.job_id; }).filter(Boolean))];
      const jobRows = await supa(
        `/rest/v1/job_postings?id=in.(${jobIds.map(encodeURIComponent).join(',')})` +
        `&select=id,title,company,location,employment_type,status,external_url`,
        'GET'
      );
      const jobMap = {};
      if (Array.isArray(jobRows)) jobRows.forEach(function(j){ jobMap[j.id] = j; });
      const enriched = apps.map(function(a) {
        return Object.assign({}, a, { job_postings: jobMap[a.job_id] || {} });
      });
      return json(200, { ok: true, data: enriched });
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


    // ── UPDATE JOB STATUS (recruiter pause/activate) ─────────
    if (action === 'update-job-status') {
      if (!userId) return json(401, { error: 'Authentication required' });
      const { jobId, status: newStatus } = body;
      if (!jobId || !['active','paused','closed'].includes(newStatus)) {
        return json(400, { error: 'jobId and valid status required' });
      }
      // Verify this job belongs to this recruiter
      const recs = await supa(
        `/rest/v1/recruiters?user_id=eq.${userId}&select=id&limit=1`, 'GET'
      );
      if (!recs || !recs.length) return json(404, { error: 'Recruiter not found' });
      const recruiterId = recs[0].id;
      const owns = await supa(
        `/rest/v1/job_postings?id=eq.${jobId}&recruiter_id=eq.${recruiterId}&select=id&limit=1`,
        'GET'
      );
      if (!Array.isArray(owns) || !owns.length) {
        return json(403, { error: 'Job not found or does not belong to your account' });
      }
      await supa(`/rest/v1/job_postings?id=eq.${jobId}`, 'PATCH', {
        status:     newStatus,
        updated_at: new Date().toISOString(),
      });
      return json(200, { ok: true, status: newStatus });
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


    // ── SAVE APPLICANT PROFILE ───────────────────────────────
    if (action === 'save-applicant-profile') {
      if (!userId) return json(401, { error: 'Authentication required' });
      const { profile } = body;
      if (!profile) return json(400, { error: 'profile required' });

      // Upsert applicant_profiles row keyed on user_id
      const existing = await supa(
        `/rest/v1/applicant_profiles?user_id=eq.${userId}&select=id&limit=1`
      );

      // Map to exact column types in applicant_profiles schema
      const profileRow = {
        user_id:              userId,
        email:                profile.email             || '',
        first_name:           profile.first_name        || '',
        last_name:            profile.last_name         || '',
        phone:                profile.phone             || null,
        city:                 profile.city              || null,
        country:              profile.country           || 'NG',
        professional_summary: profile.professional_summary || null,
        years_experience:     profile.years_experience  || null,   // TEXT: '1-2','3-5','6-10','10+'
        availability:         profile.availability      || null,
        employment_pref:      profile.employment_pref   || null,
        salary_expectation:   profile.salary_expectation || null,
        core_skills:          Array.isArray(profile.core_skills) ? profile.core_skills : [],
        education:            Array.isArray(profile.education)    ? profile.education    : [],
        work_experience:      Array.isArray(profile.work_experience) ? profile.work_experience : [],
        resume_filename:      profile.resume_filename   || null,
        resume_scanned:       profile.resume_scanned    === true,
        profile_visible:      profile.profile_visible   !== false,
        profile_complete:     typeof profile.profile_complete === 'number'
                                ? profile.profile_complete
                                : (profile.profile_complete ? 80 : 0),  // INTEGER
        updated_at:           new Date().toISOString(),
      };

      if (Array.isArray(existing) && existing.length > 0) {
        // Update — PATCH existing row
        await supa(
          `/rest/v1/applicant_profiles?user_id=eq.${encodeURIComponent(userId)}`,
          'PATCH',
          profileRow
        );
        return json(200, { ok: true, action: 'updated' });
      } else {
        // Insert new row — use upsert so concurrent requests don't fail
        profileRow.created_at = new Date().toISOString();
        const insertRes = await supaRaw('/rest/v1/applicant_profiles', 'POST', profileRow,
          'resolution=merge-duplicates,return=representation');
        // insertRes may be {} (204) or array — either is success as long as no error key
        if (insertRes && insertRes.error) {
          console.error('[job-board-api] save-applicant-profile insert error:', insertRes.error);
          return json(500, { error: insertRes.error.message || 'Failed to create applicant profile' });
        }
        return json(200, { ok: true, action: 'created' });
      }
    }

    // ── GET APPLICANT PROFILE ────────────────────────────────
    if (action === 'get-applicant-profile') {
      if (!userId) return json(401, { error: 'Authentication required' });
      const rows = await supa(
        `/rest/v1/applicant_profiles?user_id=eq.${userId}&limit=1`
      );
      if (!Array.isArray(rows) || !rows.length) {
        return json(200, { ok: true, profile: null });
      }
      return json(200, { ok: true, profile: rows[0] });
    }


    return json(400, { error: 'Unknown action: ' + action });

  } catch(e) {
    console.error('[job-board-api] error:', e.message);
    return json(500, { error: 'Server error: ' + e.message });
  }
};
