/**
 * LedgerLearn Pro — Supabase Auth Handler v3
 * ===========================================
 * File: netlify/functions/supabase-auth.js
 *
 * v3 fixes:
 *   - register-recruiter: uses SERVICE KEY for all DB writes (no RLS timing issue)
 *   - register-recruiter: creates recruiters row directly here (no paygate dependency)
 *   - register-recruiter: polls until profiles row exists before patching role
 *   - login: fetches role + company_name, returns full identity to frontend
 *   - login: returns isRecruiter flag so ll-auth.js skips progress sync
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const SUPA_URL = process.env.SUPABASE_URL        || '';
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || '';  // service role only

function json(code, body) {
  return { statusCode: code, headers: CORS, body: JSON.stringify(body) };
}

// Always use service key — bypasses RLS, avoids timing issues
async function supa(path, method, body) {
  if (!SUPA_URL || !SUPA_KEY) return { status: 503, data: { error: 'DB not configured' } };
  try {
    const res = await fetch(SUPA_URL + path, {
      method:  method || 'GET',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Prefer':        method === 'POST' ? 'return=representation' : '',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch(e) {
    return { status: 500, data: { error: e.message } };
  }
}

// Poll until profiles row exists (trigger is async — max 3s)
async function waitForProfile(userId, maxMs) {
  const deadline = Date.now() + (maxMs || 3000);
  while (Date.now() < deadline) {
    const r = await supa(`/rest/v1/profiles?id=eq.${userId}&select=id&limit=1`);
    if (Array.isArray(r.data) && r.data.length > 0) return true;
    await new Promise(res => setTimeout(res, 300));
  }
  return false;
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return json(405, { error: 'Method not allowed' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}

  const { action } = body;

  // ── REGISTER (learner) ────────────────────────────────────
  if (action === 'register') {
    const { name, email, password, region } = body;
    if (!email || !password || !name) return json(400, { error: 'name, email and password required' });
    if (password.length < 8)          return json(400, { error: 'Password must be at least 8 characters' });

    const r = await supa('/auth/v1/admin/users', 'POST', {
      email, password, email_confirm: true,
      user_metadata: { full_name: name, region: region || 'UK', role: 'applicant' },
    });
    if (r.data.error || r.status >= 400) {
      return json(400, { error: r.data.message || r.data.error || 'Registration failed' });
    }

    // Sign in for session
    const signIn = await fetch(SUPA_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY },
      body: JSON.stringify({ email, password }),
    }).then(r => r.json()).catch(() => ({}));

    if (signIn.access_token) {
      return json(200, { ok: true, action: 'registered', session: {
        access_token: signIn.access_token, refresh_token: signIn.refresh_token,
        expires_in: signIn.expires_in,
        user: { id: signIn.user?.id, email: signIn.user?.email, name, region: region || 'UK', role: 'applicant' }
      }});
    }
    return json(200, { ok: true, action: 'registered', message: 'Account created. Please sign in.' });
  }

  // ── REGISTER RECRUITER ────────────────────────────────────
  if (action === 'register-recruiter') {
    const { companyName, contactName, email, password,
            industry, companySize, country, companyWebsite, contactPhone } = body;

    if (!email || !password || !companyName || !contactName) {
      return json(400, { error: 'Company name, contact name, email and password required' });
    }
    if (password.length < 8) return json(400, { error: 'Password must be at least 8 characters' });

    // Step 1: Create auth user with recruiter metadata
    const createRes = await supa('/auth/v1/admin/users', 'POST', {
      email, password, email_confirm: true,
      user_metadata: {
        full_name:    contactName,
        region:       country || 'NG',
        role:         'recruiter',
        company_name: companyName,
      },
    });

    if (createRes.data.error || createRes.status >= 400) {
      const msg = createRes.data.message || createRes.data.error || 'Registration failed';
      const isDup = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists');
      return json(400, { error: isDup ? 'An account with this email already exists.' : msg });
    }

    const userId = createRes.data.id;

    // Step 2: Sign in immediately to get session tokens
    const signInRes = await fetch(SUPA_URL + '/auth/v1/token?grant_type=password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY },
      body:    JSON.stringify({ email, password }),
    }).then(r => r.json()).catch(() => ({}));

    const accessToken  = signInRes.access_token;
    const refreshToken = signInRes.refresh_token;

    // Step 3: Wait for handle_new_user trigger to create profiles row (max 3s)
    const profileCreated = await waitForProfile(userId, 3000);

    // Step 4: Upsert profiles row with role=recruiter using SERVICE KEY
    // (service key bypasses RLS — no timing dependency on trigger)
    await supa(`/rest/v1/profiles?id=eq.${userId}`, 'PATCH', {
      role:      'recruiter',
      full_name: contactName,
      region:    country || 'NG',
    });

    // If trigger didn't run in time, insert the profile row ourselves
    if (!profileCreated) {
      await supa('/rest/v1/profiles', 'POST', {
        id: userId, email, full_name: contactName,
        region: country || 'NG', role: 'recruiter',
      });
    }

    // Step 5: Create recruiter row directly — no paygate dependency
    const trialStart = new Date().toISOString();
    const trialEnd   = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Check if row already exists (idempotent)
    const existingRec = await supa(`/rest/v1/recruiters?user_id=eq.${userId}&select=id&limit=1`);
    if (!Array.isArray(existingRec.data) || existingRec.data.length === 0) {
      await supa('/rest/v1/recruiters', 'POST', {
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
    }

    // Step 6: Log to admin audit
    await supa('/rest/v1/admin_audit_log', 'POST', {
      action:       'register-recruiter',
      target:       email + ':' + companyName,
      admin_email:  'system:auth',
      success:      true,
      created_at:   new Date().toISOString(),
    }).catch(() => {});

    return json(200, {
      ok: true, action: 'recruiter-registered',
      userId,
      session: {
        access_token:  accessToken  || null,
        refresh_token: refreshToken || null,
        expires_in:    signInRes.expires_in || 3600,
        user: {
          id:           userId,
          email,
          name:         contactName,
          region:       country || 'NG',
          role:         'recruiter',
          company_name: companyName,
        }
      }
    });
  }

  // ── LOGIN ─────────────────────────────────────────────────
  if (action === 'login') {
    const { email, password } = body;
    if (!email || !password) return json(400, { error: 'Email and password required' });

    const signIn = await fetch(SUPA_URL + '/auth/v1/token?grant_type=password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY },
      body:    JSON.stringify({ email, password }),
    }).then(r => r.json()).catch(() => ({}));

    if (!signIn.access_token) {
      return json(401, { error: 'Invalid email or password' });
    }

    const authUserId = signIn.user?.id;

    // Fetch profile AND recruiter data in parallel using service key
    const [profRes, recRes] = await Promise.all([
      supa(`/rest/v1/profiles?id=eq.${authUserId}&select=full_name,region,role&limit=1`),
      supa(`/rest/v1/recruiters?user_id=eq.${authUserId}&select=id,company_name,plan,status,trial_end&limit=1`),
    ]);

    const profile  = Array.isArray(profRes.data)  && profRes.data.length  > 0 ? profRes.data[0]  : {};
    const recruiter = Array.isArray(recRes.data) && recRes.data.length > 0 ? recRes.data[0] : null;

    // Determine role: recruiter row is authoritative
    const role = recruiter
      ? 'recruiter'
      : (profile.role || signIn.user?.user_metadata?.role || 'applicant');

    const user = {
      id:           authUserId,
      email:        signIn.user?.email || email,
      name:         profile.full_name || signIn.user?.user_metadata?.full_name || '',
      region:       profile.region    || signIn.user?.user_metadata?.region    || 'UK',
      role,
      // Recruiter-specific fields
      company_name:    recruiter ? recruiter.company_name : null,
      recruiter_plan:  recruiter ? recruiter.plan         : null,
      recruiter_id:    recruiter ? recruiter.id           : null,
    };

    return json(200, {
      ok:          true,
      isRecruiter: role === 'recruiter',
      session: {
        access_token:  signIn.access_token,
        refresh_token: signIn.refresh_token,
        expires_in:    signIn.expires_in,
        user,
      }
    });
  }

  // ── REFRESH TOKEN ─────────────────────────────────────────
  if (action === 'refresh') {
    const { refresh_token } = body;
    if (!refresh_token) return json(400, { error: 'refresh_token required' });

    const r = await fetch(SUPA_URL + '/auth/v1/token?grant_type=refresh_token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY },
      body:    JSON.stringify({ refresh_token }),
    }).then(r => r.json()).catch(() => ({}));

    if (!r.access_token) return json(401, { error: 'Session expired. Please sign in again.' });

    // Re-fetch user identity to keep role/company current
    const userId = r.user?.id;
    const [profRes, recRes] = userId ? await Promise.all([
      supa(`/rest/v1/profiles?id=eq.${userId}&select=full_name,region,role&limit=1`),
      supa(`/rest/v1/recruiters?user_id=eq.${userId}&select=id,company_name,plan&limit=1`),
    ]) : [{data:[]},{data:[]}];

    const profile   = Array.isArray(profRes.data)  && profRes.data.length  > 0 ? profRes.data[0]  : {};
    const recruiter = Array.isArray(recRes.data) && recRes.data.length > 0 ? recRes.data[0] : null;
    const role      = recruiter ? 'recruiter' : (profile.role || 'applicant');

    return json(200, { ok: true, session: {
      access_token:  r.access_token,
      refresh_token: r.refresh_token,
      expires_in:    r.expires_in,
      user: {
        id:           userId,
        email:        r.user?.email,
        name:         profile.full_name || '',
        region:       profile.region    || 'UK',
        role,
        company_name:   recruiter ? recruiter.company_name : null,
        recruiter_id:   recruiter ? recruiter.id           : null,
        recruiter_plan: recruiter ? recruiter.plan         : null,
      }
    }});
  }

  // ── UPDATE PROFILE ────────────────────────────────────────
  if (action === 'update-profile') {
    const { token, email, name, region } = body;
    if (!token) return json(401, { error: 'Not authenticated' });
    const updates = {};
    if (name)   updates.full_name = name;
    if (region) updates.region    = region;
    await supa(`/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, 'PATCH', updates);
    return json(200, { ok: true });
  }

  return json(400, { error: 'Unknown action: ' + action });
};
