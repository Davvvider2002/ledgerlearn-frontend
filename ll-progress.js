/**
 * LedgerLearn Pro — Progress Manager (ll-progress.js)
 * =====================================================
 * Drop-in replacement for direct localStorage access.
 * Saves to BOTH localStorage AND server-side (Netlify Blobs).
 * On load, merges server + local data — takes the best values.
 *
 * Works across:
 *   ✓ Domain changes (netlify.app → ledgerlearn.pro)
 *   ✓ Browser clears
 *   ✓ Different devices
 *   ✓ Incognito mode (server copy always available)
 *
 * Usage: include this script on every page.
 * It auto-loads progress on DOMContentLoaded.
 * Use window.LLP to save/load progress anywhere.
 */

(function() {
  'use strict';

  const API         = '/.netlify/functions/progress';          // Legacy Blobs (kept as fallback)
  const SUPA_API    = '/.netlify/functions/supabase-progress'; // New Supabase
  const DOMAIN = 'ledgerlearn.pro';

  // ── Internal state ────────────────────────────────────────
  let _syncing = false;
  let _syncQueue = null;

  // ── Read from localStorage (all possible key formats) ────
  function readLocal() {
    const result = {};
    try {
      // Primary key
      const p = JSON.parse(localStorage.getItem('ll_progress') || '{}');
      Object.assign(result, p);

      // ll_completed (new learn.html format)
      const completed = JSON.parse(localStorage.getItem('ll_completed') || '[]');
      if (Array.isArray(completed) && completed.length > 0) {
        result.completedLessons = completed;
      }

      // ll_user
      const u = JSON.parse(localStorage.getItem('ll_user') || '{}');
      if (u.name)  result.name  = u.name;
      if (u.email) result.email = u.email;

    } catch(e) {}
    return result;
  }

  // ── Write to localStorage (all keys for compatibility) ───
  function writeLocal(data) {
    try {
      // Main progress key
      const progress = {
        lastScore:        data.lastScore,
        completedLessons: data.completedLessons,
        completedLevels:  data.completedLevels,
        practiceAttempted:data.practiceAttempted,
        practiceCorrect:  data.practiceCorrect,
        certificate:      data.certificate,
        l1Score:          data.l1Score,
        l2Score:          data.l2Score,
        l3Score:          data.l3Score,
        certId:           data.certId,
        issueDate:        data.issueDate,
        placementResult:  data.placementResult,
      };
      // Remove undefined keys
      Object.keys(progress).forEach(k => progress[k] === undefined && delete progress[k]);
      localStorage.setItem('ll_progress', JSON.stringify(progress));

      // Also write ll_completed for learn.html compatibility
      if (Array.isArray(data.completedLessons)) {
        localStorage.setItem('ll_completed', JSON.stringify(data.completedLessons));
      }

      // Also write ll_user for compatibility
      if (data.name || data.email) {
        const existing = JSON.parse(localStorage.getItem('ll_user') || '{}');
        if (data.name)  existing.name  = data.name;
        if (data.email) existing.email = data.email;
        localStorage.setItem('ll_user', JSON.stringify(existing));
      }
    } catch(e) {}
  }

  // ── Get email for server sync ─────────────────────────────
  function getEmail() {
    try {
      const u = JSON.parse(localStorage.getItem('ll_user') || '{}');
      if (u.email && u.email.includes('@')) return u.email;
      const p = JSON.parse(localStorage.getItem('ll_progress') || '{}');
      if (p.email && p.email.includes('@')) return p.email;
    } catch(e) {}
    return null;
  }

  // ── Merge two progress objects ────────────────────────────
  function merge(a, b) {
    const out = Object.assign({}, a, b);

    // Arrays: union
    const arrKeys = ['completedLessons', 'completedLevels'];
    for (const k of arrKeys) {
      const aArr = Array.isArray(a[k]) ? a[k] : [];
      const bArr = Array.isArray(b[k]) ? b[k] : [];
      out[k] = [...new Set([...aArr, ...bArr])];
    }

    // Numbers: max
    const numKeys = ['lastScore','l1Score','l2Score','l3Score','practiceAttempted','practiceCorrect'];
    for (const k of numKeys) {
      const av = typeof a[k] === 'number' ? a[k] : -1;
      const bv = typeof b[k] === 'number' ? b[k] : -1;
      if (av >= 0 || bv >= 0) out[k] = Math.max(av, bv);
    }

    // Certificate: prefer whichever has certId
    if (b.certificate?.certId) out.certificate = b.certificate;
    else if (a.certificate?.certId) out.certificate = a.certificate;

    return out;
  }

  // ── Load from server and merge with local ─────────────────
  async function syncFromServer(email) {
    if (!email) return readLocal();
    try {
      // Try Supabase first
      let res = await fetch(SUPA_API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'load', email }),
      });
      // Fallback to Blobs if Supabase fails
      if (!res.ok) {
        res = await fetch(API, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'load', email }),
        });
      }
      if (!res.ok) return readLocal();
      const json = await res.json();
      if (!json.ok || !json.found || !json.data) return readLocal();

      // Merge server data with local data
      const local  = readLocal();
      const merged = merge(json.data, local);
      writeLocal(merged);
      return merged;
    } catch(e) {
      return readLocal();
    }
  }

  // ── Save to server (debounced) ────────────────────────────
  function saveToServer(data) {
    const email = data.email || getEmail();
    if (!email) return; // No email = can't sync

    // Debounce: queue the save and fire after 800ms
    _syncQueue = data;
    if (_syncing) return;
    _syncing = true;

    setTimeout(async () => {
      const payload = _syncQueue;
      _syncQueue    = null;
      _syncing      = false;
      try {
        // Write to Supabase (primary)
        await fetch(SUPA_API, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'merge', email, data: payload }),
        });
        // Write to Blobs (fallback — silent fail OK)
        fetch(API, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'merge', email, data: payload }),
        }).catch(() => {});
      } catch(e) { /* Silent fail — localStorage copy is the backup */ }
    }, 800);
  }

  // ── Public API: window.LLP ────────────────────────────────
  window.LLP = {

    // Save progress — writes local + syncs to server
    save: function(data) {
      const current = readLocal();
      const updated = merge(current, data);
      writeLocal(updated);
      saveToServer(updated);
      return updated;
    },

    // Get current progress — always from local (fast)
    get: function() {
      return readLocal();
    },

    // Get user
    getUser: function() {
      try { return JSON.parse(localStorage.getItem('ll_user') || '{}'); } catch { return {}; }
    },

    // Save user + trigger sync
    saveUser: function(name, email) {
      try {
        // Preserve region and other fields
        var _u = {}; try { _u = JSON.parse(localStorage.getItem('ll_user')||'{}'); } catch(e) {}
        _u.name = name; _u.email = email; _u.ts = Date.now();
        localStorage.setItem('ll_user', JSON.stringify(_u));
      } catch(e) {}
      const data = readLocal();
      data.name  = name;
      data.email = email;
      writeLocal(data);
      saveToServer(data);
    },

    // Force full sync from server (call after login/email entry)
    syncFromServer: async function(email) {
      const merged = await syncFromServer(email || getEmail());
      return merged;
    },

    // Reset all local data (keeps email)
    reset: function() {
      const email = getEmail();
      try {
        localStorage.removeItem('ll_progress');
        localStorage.removeItem('ll_completed');
      } catch(e) {}
      if (email) {
        try {
          const u = JSON.parse(localStorage.getItem('ll_user') || '{}');
          // Preserve region and all other fields
          localStorage.setItem('ll_user', JSON.stringify(u));
        } catch(e) {}
      }
    },
  };

  // ── Auto-sync on page load ────────────────────────────────
  async function autoSync() {
    const email = getEmail();
    if (!email) return;

    // Load from server and merge silently
    const merged = await syncFromServer(email);
    if (merged && Object.keys(merged).length > 0) {
      writeLocal(merged);
      // Dispatch event so dashboard can re-render if already loaded
      window.dispatchEvent(new CustomEvent('ll-progress-synced', { detail: merged }));
    }
  }

  // Run sync after page loads (non-blocking)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(autoSync, 500));
  } else {
    setTimeout(autoSync, 500);
  }

  console.log('[LedgerLearn] ll-progress.js loaded ✓ — domain: ' + DOMAIN);

})();
