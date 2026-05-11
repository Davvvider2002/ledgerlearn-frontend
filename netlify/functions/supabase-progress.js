/**
 * LedgerLearn Pro — Supabase Progress API
 * =========================================
 * File: netlify/functions/supabase-progress.js
 *
 * Replaces: netlify/functions/progress.js (Netlify Blobs)
 * Handles: save, load, merge progress via Supabase PostgreSQL
 *
 * All writes go to public.progress table.
 * Uses service role key — bypasses RLS safely server-side.
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supaFetch(path, method, body) {
  const res = await fetch(SUPA_URL + path, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'apikey':         SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Prefer':         method === 'POST' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => ({}));
}

// Merge two progress objects — takes the best values
function merge(a, b) {
  const out = Object.assign({}, a, b);

  // Arrays: union
  for (const k of ['completed_levels','completed_lessons']) {
    const aArr = Array.isArray(a[k]) ? a[k] : [];
    const bArr = Array.isArray(b[k]) ? b[k] : [];
    out[k] = [...new Set([...aArr, ...bArr])];
  }

  // Numbers: max
  for (const k of ['l1_score','l2_score','l3_score','last_score','l1_lessons_done','l2_lessons_done','l3_lessons_done','practice_attempted','practice_correct']) {
    const av = typeof a[k] === 'number' ? a[k] : -1;
    const bv = typeof b[k] === 'number' ? b[k] : -1;
    if (av >= 0 || bv >= 0) out[k] = Math.max(av, bv);
  }

  // Booleans: true wins
  for (const k of ['paid_l2','paid_l3']) {
    out[k] = !!(a[k] || b[k]);
  }

  return out;
}

// Convert from legacy localStorage format to Supabase column names
function fromLegacy(d) {
  if (!d) return {};
  return {
    completed_levels:   d.completedLevels   || d.completed_levels   || [],
    completed_lessons:  d.completedLessons  || d.completed_lessons  || [],
    l1_score:           d.l1Score           || d.l1_score           || null,
    l2_score:           d.l2Score           || d.l2_score           || null,
    l3_score:           d.l3Score           || d.l3_score           || null,
    last_score:         d.lastScore         || d.last_score         || null,
    l1_lessons_done:    d.l1LessonsCompleted|| d.l1_lessons_done    || 0,
    l2_lessons_done:    d.l2LessonsCompleted|| d.l2_lessons_done    || 0,
    l3_lessons_done:    d.l3LessonsCompleted|| d.l3_lessons_done    || 0,
    practice_attempted: d.practiceAttempted || d.practice_attempted || 0,
    practice_correct:   d.practiceCorrect   || d.practice_correct   || 0,
    paid_l2:            d.paid_l2           || false,
    paid_l3:            d.paid_l3           || false,
    paypal_sub_l2:      d.sub_l2            || d.paypal_sub_l2      || null,
    cert_id:            d.certId            || d.cert_id            || null,
    issue_date:         d.issueDate         || d.issue_date         || null,
    placement_result:   d.placementResult   || d.placement_result   || null,
  };
}

// Convert from Supabase columns back to legacy localStorage format
function toLegacy(d) {
  if (!d) return {};
  return {
    completedLevels:    d.completed_levels   || [],
    completedLessons:   d.completed_lessons  || [],
    l1Score:            d.l1_score,
    l2Score:            d.l2_score,
    l3Score:            d.l3_score,
    lastScore:          d.last_score,
    l1LessonsCompleted: d.l1_lessons_done    || 0,
    l2LessonsCompleted: d.l2_lessons_done    || 0,
    l3LessonsCompleted: d.l3_lessons_done    || 0,
    practiceAttempted:  d.practice_attempted || 0,
    practiceCorrect:    d.practice_correct   || 0,
    paid_l2:            d.paid_l2            || false,
    paid_l3:            d.paid_l3            || false,
    certId:             d.cert_id,
    issueDate:          d.issue_date,
    placementResult:    d.placement_result,
  };
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'POST only' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) {}

  const { action, email, data } = body;
  if (!email) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'email required' }) };
  }
  const cleanEmail = email.toLowerCase().trim();

  // ── LOAD ──────────────────────────────────────────────────
  if (action === 'load') {
    try {
      const rows = await supaFetch(
        '/rest/v1/progress?email=eq.' + encodeURIComponent(cleanEmail) + '&limit=1',
        'GET'
      );
      if (!Array.isArray(rows) || rows.length === 0) {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, found: false, data: null }) };
      }
      return { statusCode: 200, headers: CORS, body: JSON.stringify({
        ok: true, found: true, data: toLegacy(rows[0])
      })};
    } catch(e) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Load failed: ' + e.message }) };
    }
  }

  // ── SAVE (upsert) ─────────────────────────────────────────
  if (action === 'save' || action === 'merge') {
    try {
      // Load existing
      const existing = await supaFetch(
        '/rest/v1/progress?email=eq.' + encodeURIComponent(cleanEmail) + '&limit=1',
        'GET'
      );
      const existRow = Array.isArray(existing) && existing.length > 0 ? existing[0] : {};

      // Convert incoming data
      const incoming = fromLegacy(data || {});

      // Merge
      const merged = action === 'merge' ? merge(existRow, incoming) : incoming;
      merged.email      = cleanEmail;
      merged.updated_at = new Date().toISOString();

      // Upsert
      await supaFetch('/rest/v1/progress', 'POST', merged);

      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, action }) };
    } catch(e) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Save failed: ' + e.message }) };
    }
  }

  // ── SAVE CERTIFICATE ──────────────────────────────────────
  if (action === 'save-cert') {
    try {
      const cert = data || {};
      if (!cert.certId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'certId required' }) };

      // Get user_id from profiles
      const prof = await supaFetch('/rest/v1/profiles?email=eq.' + encodeURIComponent(cleanEmail) + '&select=id', 'GET');
      const userId = Array.isArray(prof) && prof.length > 0 ? prof[0].id : null;

      const row = {
        user_id:           userId,
        email:             cleanEmail,
        cert_id:           cert.certId,
        candidate_name:    cert.candidateName || '',
        cert_title:        cert.certTitle     || '',
        cert_level:        cert.certLevel     || '',
        cert_region:       cert.certRegion    || 'UK',
        cert_region_label: cert.certRegionLabel || 'United Kingdom',
        cert_region_suffix:cert.certRegionSuffix || '',
        score:             cert.score         || 0,
        level:             cert.level         || 'l1',
        issue_date:        cert.issueDate     || new Date().toISOString().split('T')[0],
      };

      await supaFetch('/rest/v1/certificates', 'POST', row);

      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    } catch(e) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Cert save failed: ' + e.message }) };
    }
  }

  // ── VERIFY CERTIFICATE (public) ───────────────────────────
  if (action === 'verify-cert') {
    try {
      const certId = body.certId;
      if (!certId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'certId required' }) };
      const rows = await supaFetch(
        '/rest/v1/certificates?cert_id=eq.' + encodeURIComponent(certId) + '&limit=1',
        'GET'
      );
      if (!Array.isArray(rows) || rows.length === 0) {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, found: false }) };
      }
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, found: true, cert: rows[0] }) };
    } catch(e) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Verify failed' }) };
    }
  }

  return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action: ' + action }) };
};
