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
        const profiles = await supa(
          `/rest/v1/applicant_profiles?id=in.(${applicantIds.map(encodeURIComponent).join(',')})` +
          `&select=id,user_id,email,first_name,last_name,city,country`,
          'GET'
        );
        if (Array.isArray(profiles)) {
          profiles.forEach(function(p){ profileMap[p.id] = p; });
        }
      }

      const enriched = apps.map(function(a) {
        const prof = profileMap[a.applicant_id] || {};
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

      const profileRow = {
        user_id:              userId,
        email:                profile.email             || '',
        first_name:           profile.first_name        || '',
        last_name:            profile.last_name         || '',
        phone:                profile.phone             || null,
        city:                 profile.city              || null,
        country:              profile.country           || 'NG',
        professional_summary: profile.professional_summary || null,
        years_experience:     profile.years_experience  || null,
        availability:         profile.availability      || null,
        employment_pref:      profile.employment_pref   || null,
        salary_expectation:   profile.salary_expectation || null,
        core_skills:          profile.core_skills       || [],
        education:            profile.education         || [],
        work_experience:      profile.work_experience   || [],
        resume_filename:      profile.resume_filename   || null,
        resume_scanned:       profile.resume_scanned    || false,
        resume_scan_data:     profile.resume_scan_data  || null,
        profile_visible:      profile.profile_visible   !== false,
        profile_complete:     profile.profile_complete  || false,
        updated_at:           new Date().toISOString(),
      };

      if (Array.isArray(existing) && existing.length > 0) {
        // Update existing row
        const updated = await supa(
          `/rest/v1/applicant_profiles?user_id=eq.${userId}`,
          'PATCH',
          profileRow
        );
        return json(200, { ok: true, action: 'updated' });
      } else {
        // Insert new row
        profileRow.created_at = new Date().toISOString();
        const inserted = await supa('/rest/v1/applicant_profiles', 'POST', profileRow);
        if (!inserted) return json(500, { error: 'Failed to create applicant profile' });
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
