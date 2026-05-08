/**
 * LedgerLearn Pro — Progress API
 * ================================
 * File: netlify/functions/progress.js
 *
 * Stores and retrieves user progress server-side.
 * Keyed by email — works across any domain, browser, or device.
 *
 * Uses Netlify Blobs (built-in KV store, no external DB needed).
 *
 * Endpoints:
 *   POST /.netlify/functions/progress  { action:'save', email, data }
 *   POST /.netlify/functions/progress  { action:'load', email }
 *   POST /.netlify/functions/progress  { action:'merge', email, data }
 */

let getStore;
try { getStore = require('@netlify/blobs').getStore; } catch(e) { getStore = null; }

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod === 'GET') {
    // GET: retrieve progress by email query param
    const email = event.queryStringParameters && event.queryStringParameters.email;
    if (!email) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'email required' }) };
    }
    try {
      const store = getStore ? getStore('ledgerlearn-progress') : null;
      if (!store) return { statusCode: 200, headers: CORS, body: JSON.stringify({ progress: null }) };
      const key  = 'progress:' + email.toLowerCase().trim();
      const data = await store.get(key, { type: 'json' });
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ progress: data || null }) };
    } catch(e) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ progress: null }) };
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { action, email, data } = body;

  if (!email || !email.includes('@')) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Valid email required' }) };
  }

  // Sanitise email for use as a storage key
  const key = 'progress:' + email.toLowerCase().trim().replace(/[^a-z0-9@._-]/g, '');

  try {
    const store = getStore('ledgerlearn-progress');

    switch (action) {

      // ── Save (overwrite) ──────────────────────────────────
      case 'save': {
        if (!data || typeof data !== 'object') {
          return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'data object required' }) };
        }
        const payload = {
          ...data,
          email,
          updatedAt: new Date().toISOString(),
        };
        await store.setJSON(key, payload);
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, action: 'saved' }) };
      }

      // ── Load ──────────────────────────────────────────────
      case 'load': {
        const existing = await store.get(key, { type: 'json' });
        if (!existing) {
          return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, found: false, data: null }) };
        }
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, found: true, data: existing }) };
      }

      // ── Merge (combine server + client, take best values) ─
      case 'merge': {
        if (!data || typeof data !== 'object') {
          return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'data object required' }) };
        }
        const existing = await store.get(key, { type: 'json' }) || {};
        const merged   = mergeProgress(existing, data);
        merged.email     = email;
        merged.updatedAt = new Date().toISOString();
        await store.setJSON(key, merged);
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, action: 'merged', data: merged }) };
      }

      default:
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action: ' + action }) };
    }

  } catch (err) {
    console.error('[progress]', err.message);
    // Return graceful degradation — client falls back to localStorage
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ ok: false, error: err.message, fallback: true }),
    };
  }
};

// ── Merge two progress objects — take the best values ─────
function mergeProgress(server, client) {
  const merged = { ...server };

  // completedLessons: union of both arrays
  const sArr = Array.isArray(server.completedLessons) ? server.completedLessons : [];
  const cArr = Array.isArray(client.completedLessons) ? client.completedLessons : [];
  merged.completedLessons = [...new Set([...sArr, ...cArr])];

  // completedLevels: union
  const sLvl = Array.isArray(server.completedLevels) ? server.completedLevels : [];
  const cLvl = Array.isArray(client.completedLevels) ? client.completedLevels : [];
  merged.completedLevels = [...new Set([...sLvl, ...cLvl])];

  // Numeric values: take the highest
  const takeMax = ['lastScore', 'l1Score', 'l2Score', 'l3Score', 'practiceAttempted', 'practiceCorrect'];
  for (const k of takeMax) {
    const sv = typeof server[k] === 'number' ? server[k] : -1;
    const cv = typeof client[k] === 'number' ? client[k] : -1;
    if (sv >= 0 || cv >= 0) merged[k] = Math.max(sv, cv);
  }

  // Certificate: keep whichever exists, prefer client (more recent)
  if (client.certificate && client.certificate.certId) {
    merged.certificate = client.certificate;
  } else if (server.certificate && server.certificate.certId) {
    merged.certificate = server.certificate;
  }

  // User info: prefer client (most recent)
  if (client.name)  merged.name  = client.name;
  if (client.email) merged.email = client.email;

  return merged;
}
