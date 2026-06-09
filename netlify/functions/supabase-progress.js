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
  // For progress table upserts (POST), use resolution=merge-duplicates
  // so existing rows are updated, not rejected with a 409 conflict error
  const isUpsert = method === 'POST' && path.includes('/rest/v1/progress');
  const headers = {
    'Content-Type':  'application/json',
    'apikey':         SUPA_KEY,
    'Authorization': 'Bearer ' + SUPA_KEY,
  };
  if (isUpsert) {
    headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
  } else if (method === 'POST') {
    headers['Prefer'] = 'return=representation';
  } else if (method === 'PATCH') {
    headers['Prefer'] = 'return=representation';
  }
  const res = await fetch(SUPA_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[supabase-progress] supaFetch error', res.status, path, errText.slice(0,200));
    return {};
  }
  if (res.status === 204) return {};
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
function fromLegacy(d, track) {
  if (!d) return {};
  const base = {
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
  // QB track — store in qb_progress JSONB column
  if (track === 'QuickBooks') {
    return {
      qb_progress: {
        completedLevels:   base.completed_levels,
        l1Score:           base.l1_score,
        l2Score:           base.l2_score,
        l3Score:           base.l3_score,
        lastScore:         base.last_score,
        paid_qb_l2:        d.paid_qb_l2 || d.paid_l2 || false,
        paid_qb_l3:        d.paid_qb_l3 || d.paid_l3 || false,
        cert_id:           base.cert_id,
        issue_date:        base.issue_date,
      }
    };
  }
  return base;
}

// Convert from Supabase columns back to legacy localStorage format
function toLegacy(d, track) {
  if (!d) return {};
  // QB track — read from qb_progress JSONB column
  if (track === 'QuickBooks') {
    const qb = d.qb_progress || {};
    return {
      completedLevels: qb.completedLevels || [],
      l1Score:         qb.l1Score         || null,
      l2Score:         qb.l2Score         || null,
      l3Score:         qb.l3Score         || null,
      lastScore:       qb.lastScore       || null,
      paid_qb_l2:      qb.paid_qb_l2      || false,
      paid_qb_l3:      qb.paid_qb_l3      || false,
      certId:          qb.cert_id         || null,
      issueDate:       qb.issue_date      || null,
    };
  }
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

  // verify-cert is a public lookup — no email needed
  if (!email && action !== 'verify-cert') {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'email required' }) };
  }
  const cleanEmail = email ? email.toLowerCase().trim() : '';

  // ── LOAD ──────────────────────────────────────────────────
  // ── LOAD-CERT — fetch certificate from certificates table ──
  if (action === 'load-cert') {
    try {
      const rows = await supaFetch(
        '/rest/v1/certificates?email=eq.' + encodeURIComponent(cleanEmail) +
        '&order=created_at.desc&limit=5',
        'GET'
      );
      if (!Array.isArray(rows) || rows.length === 0) {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, found: false }) };
      }
      // Return all certs, most recent first
      const certs = rows.map(function(c) {
        return {
          candidateName:    c.candidate_name    || '',
          certTitle:        c.cert_title        || '',
          certLevel:        c.cert_level        || '',
          certRegion:       c.cert_region       || 'UK',
          certRegionLabel:  c.cert_region_label || '',
          certRegionSuffix: c.cert_region_suffix || '',
          score:            c.score             || 0,
          certId:           c.cert_id           || '',
          issueDate:        c.issue_date        || '',
          level:            c.level             || 'l1',
        };
      });
      return { statusCode: 200, headers: CORS,
        body: JSON.stringify({ ok: true, found: true, certs, cert: certs[0] }) };
    } catch(e) {
      return { statusCode: 500, headers: CORS,
        body: JSON.stringify({ error: 'load-cert failed: ' + e.message }) };
    }
  }

  if (action === 'load') {
    try {
      const rows = await supaFetch(
        '/rest/v1/progress?email=eq.' + encodeURIComponent(cleanEmail) + '&limit=1',
        'GET'
      );
      if (!Array.isArray(rows) || rows.length === 0) {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, found: false, data: null }) };
      }
      const prog = toLegacy(rows[0]);

      // If progress table is missing scores, fill from certificates table
      // This handles the case where cert was saved to certificates but progress wasn't updated
      const needsScores = prog.l1Score == null && prog.l2Score == null && prog.l3Score == null;
      if (needsScores || prog.l1Score == null) {
        try {
          const certs = await supaFetch(
            '/rest/v1/certificates?email=eq.' + encodeURIComponent(cleanEmail) +
            '&order=created_at.desc',
            'GET'
          );
          if (Array.isArray(certs) && certs.length > 0) {
            certs.forEach(function(cert) {
              var lvKey = (cert.level || 'l1').replace('l','');
              var scoreKey = 'l' + lvKey + 'Score';
              if (!prog[scoreKey] && cert.score) {
                prog[scoreKey] = cert.score;
                prog.lastScore = cert.score;
              }
              if (!prog.completedLevels) prog.completedLevels = [];
              if (cert.level && !prog.completedLevels.includes(cert.level)) {
                prog.completedLevels.push(cert.level);
              }
            });
            // Back-fill the progress table so future loads are fast
            const backfill = {};
            if (prog.l1Score) backfill.l1_score = prog.l1Score;
            if (prog.l2Score) backfill.l2_score = prog.l2Score;
            if (prog.l3Score) backfill.l3_score = prog.l3Score;
            if (prog.lastScore) backfill.last_score = prog.lastScore;
            if (prog.completedLevels) backfill.completed_levels = prog.completedLevels;
            backfill.updated_at = new Date().toISOString();
            if (Object.keys(backfill).length > 1) {
              supaFetch(
                '/rest/v1/progress?email=eq.' + encodeURIComponent(cleanEmail),
                'PATCH',
                backfill
              ).catch(function() {}); // fire and forget
            }
          }
        } catch(certErr) {
          // Non-critical — just return what we have from progress table
        }
      }

      return { statusCode: 200, headers: CORS, body: JSON.stringify({
        ok: true, found: true, data: prog,
        track: body.track || 'Xero'
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

      // Send breakdown email (pass or fail)
      const BREVO_KEY = process.env.BREVO_API_KEY || '';
      if (BREVO_KEY && cleanEmail) {
        const isPassed   = (cert.score || 0) >= 70;
        const bdData     = data.breakdown || null;  // passed in from test-logic.js
        const trackLabel = (cert.level || '').indexOf('qb') > -1 ? 'QuickBooks' : 'Xero';
        const lvlLabel   = (cert.level || 'l1').replace('qb_','').replace('l1','Level 1').replace('l2','Level 2').replace('l3','Level 3');
        const gapPts     = Math.max(0, 70 - (cert.score || 0));

        // Build breakdown rows HTML
        var bdRowsHtml = '';
        var failTopics = [];
        if (bdData && Array.isArray(bdData.questions)) {
          const passCount = bdData.questions.filter(function(q){ return q.result==='pass'; }).length;
          const failCount = bdData.questions.filter(function(q){ return q.result==='fail'; }).length;
          bdRowsHtml += '<div style="display:flex;gap:8px;margin-bottom:12px">';
          bdRowsHtml += '<span style="font-size:13px;font-weight:600;padding:3px 10px;border-radius:100px;background:#E1F5EE;color:#0F6E56">✓ ' + passCount + ' correct</span>';
          bdRowsHtml += '<span style="font-size:13px;font-weight:600;padding:3px 10px;border-radius:100px;background:#FEF3EB;color:#c2410c">✗ ' + failCount + ' to review</span>';
          bdRowsHtml += '</div>';
          bdData.questions.forEach(function(q) {
            var isPass  = q.result === 'pass';
            var icon    = isPass ? '✓' : '✗';
            var icolor  = isPass ? '#1DA98A' : '#ea580c';
            var bg      = isPass ? '#f0fdf8' : '#fff7f3';
            var border  = isPass ? '#9FE1CB' : '#FDBA94';
            bdRowsHtml += '<div style="display:flex;gap:10px;align-items:center;padding:7px 10px;border-radius:7px;background:' + bg + ';border:1px solid ' + border + ';margin-bottom:4px">';
            bdRowsHtml += '<span style="color:' + icolor + ';font-weight:700;width:14px;font-size:13px">' + icon + '</span>';
            bdRowsHtml += '<span style="font-size:13px;color:#374151">' + q.topic + '</span>';
            bdRowsHtml += '</div>';
            if (!isPass && failTopics.indexOf(q.topic) === -1) failTopics.push(q.topic);
          });
          if (failTopics.length > 0) {
            bdRowsHtml += '<div style="margin-top:10px;padding:10px 14px;background:#FAEEDA;border-radius:8px;font-size:12px;color:#633806;line-height:1.5">';
            bdRowsHtml += '<strong>Focus before ' + (isPassed ? 'Level 2' : 'your retake') + ':</strong> ' + failTopics.join(', ');
            bdRowsHtml += '</div>';
          }
        }

        const emailHtml = isPassed
          ? [
              '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">',
              '<div style="background:#0B1F3A;padding:24px 28px"><span style="font-size:18px;font-weight:900;color:#fff">Ledger<span style="color:#ea580c">Learn</span> Pro</span></div>',
              '<div style="padding:28px">',
              '<h2 style="color:#0B1F3A;font-size:20px;margin:0 0 4px">You passed! 🏆</h2>',
              '<p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px">',
              'Congratulations ' + (cert.candidateName || '') + ' — you scored <strong>' + cert.score + '%</strong> on your ' + trackLabel + ' ' + lvlLabel + ' assessment.',
              '</p>',
              bdRowsHtml ? '<div style="background:#f8f9fa;border-radius:10px;padding:16px 18px;margin-bottom:20px"><p style="font-size:13px;font-weight:700;color:#0B1F3A;margin:0 0 10px">Your assessment breakdown</p>' + bdRowsHtml + '</div>' : '',
              '<div style="text-align:center;margin:24px 0">',
              '<a href="https://ledgerlearn.pro/dashboard" style="display:inline-block;background:#1DA98A;color:#fff;padding:14px 30px;border-radius:9px;font-weight:700;font-size:15px;text-decoration:none">View dashboard & download certificate →</a>',
              '</div>',
              '<p style="font-size:12px;color:#9ca3af">LedgerLearn Pro · ledgerlearn.pro</p>',
              '</div></div>',
            ].join('')
          : [
              '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">',
              '<div style="background:#0B1F3A;padding:24px 28px"><span style="font-size:18px;font-weight:900;color:#fff">Ledger<span style="color:#ea580c">Learn</span> Pro</span></div>',
              '<div style="padding:28px">',
              '<h2 style="color:#0B1F3A;font-size:20px;margin:0 0 4px">Keep going 📚</h2>',
              '<p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 4px">',
              'Hi ' + (cert.candidateName || 'there') + ',',
              '</p>',
              '<p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px">',
              'You scored <strong>' + cert.score + '%</strong> on your ' + trackLabel + ' ' + lvlLabel + ' assessment — the pass mark is 70%. You are only <strong>' + gapPts + ' points away</strong>. Here is exactly what to review before your retake.',
              '</p>',
              bdRowsHtml ? '<div style="background:#f8f9fa;border-radius:10px;padding:16px 18px;margin-bottom:20px"><p style="font-size:13px;font-weight:700;color:#0B1F3A;margin:0 0 10px">Your assessment breakdown</p>' + bdRowsHtml + '</div>' : '',
              '<div style="text-align:center;margin:24px 0">',
              '<a href="https://ledgerlearn.pro/learn" style="display:inline-block;background:#ea580c;color:#fff;padding:14px 30px;border-radius:9px;font-weight:700;font-size:15px;text-decoration:none">Review lessons and retake →</a>',
              '</div>',
              '<p style="font-size:12px;color:#9ca3af">LedgerLearn Pro · ledgerlearn.pro</p>',
              '</div></div>',
            ].join('');

        try {
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
            body:    JSON.stringify({
              to:          [{ email: cleanEmail, name: cert.candidateName || cleanEmail.split('@')[0] }],
              sender:      { name: 'LedgerLearn Pro', email: 'godigitsall@gmail.com' },
              subject:     isPassed
                ? 'You passed ' + trackLabel + ' ' + lvlLabel + ' — here is your breakdown'
                : 'Your ' + trackLabel + ' ' + lvlLabel + ' result — study guide for your retake',
              htmlContent: emailHtml,
            })
          });
        } catch(emailErr) {
          console.warn('[save-cert] breakdown email error:', emailErr.message);
        }
      }

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
