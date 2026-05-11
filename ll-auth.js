/**
 * LedgerLearn Pro — Auth Client (ll-auth.js)
 * ============================================
 * Include on every page that requires authentication.
 * Manages Supabase session via localStorage.
 * Auto-redirects to /login if not authenticated.
 *
 * Usage:
 *   <script src="/ll-auth.js"></script>
 *   Then in page script: LLAuth.require() to guard the page
 *
 * Session stored as ll_session in localStorage:
 *   { access_token, refresh_token, expires_at, user: { id, email, name, region } }
 */

(function() {
  'use strict';

  const SESSION_KEY = 'll_session';
  const AUTH_FN     = '/.netlify/functions/supabase-auth';
  const PROGRESS_FN = '/.netlify/functions/supabase-progress';

  // ── Session management ────────────────────────────────────
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch(e) { return null; }
  }

  function saveSession(session) {
    if (!session) { localStorage.removeItem(SESSION_KEY); return; }
    // Calculate absolute expiry
    session.expires_at = Date.now() + ((session.expires_in || 3600) * 1000);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Also update ll_user for compatibility with existing pages
    if (session.user) {
      try {
        var u = JSON.parse(localStorage.getItem('ll_user') || '{}');
        u.name   = session.user.name   || u.name   || '';
        u.email  = session.user.email  || u.email  || '';
        u.region = session.user.region || u.region || 'UK';
        localStorage.setItem('ll_user', JSON.stringify(u));
      } catch(e) {}
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function isExpired(session) {
    if (!session) return true;
    return Date.now() > (session.expires_at - 60000); // 1 min buffer
  }

  // ── Token refresh ─────────────────────────────────────────
  async function refreshSession(session) {
    if (!session || !session.refresh_token) return null;
    try {
      const res  = await fetch(AUTH_FN, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'refresh', refresh_token: session.refresh_token }),
      });
      const data = await res.json();
      if (data.ok && data.session) {
        const newSession = Object.assign({}, session, data.session);
        saveSession(newSession);
        return newSession;
      }
    } catch(e) {}
    return null;
  }

  // ── Get valid session (refreshes if needed) ───────────────
  async function getValidSession() {
    let session = getSession();
    if (!session) return null;
    if (isExpired(session)) {
      session = await refreshSession(session);
    }
    return session;
  }

  // ── Sync progress from Supabase on login ──────────────────
  async function syncProgressOnLogin(email, token) {
    try {
      const res  = await fetch(PROGRESS_FN, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'load', email }),
      });
      const data = await res.json();
      if (data.ok && data.found && data.data) {
        // Merge server progress with local
        var local  = {};
        try { local = JSON.parse(localStorage.getItem('ll_progress') || '{}'); } catch(e) {}
        var merged = Object.assign(local, data.data);
        // Restore arrays as union
        for (var k of ['completedLevels','completedLessons']) {
          var a = Array.isArray(local[k])  ? local[k]  : [];
          var b = Array.isArray(data.data[k]) ? data.data[k] : [];
          merged[k] = [...new Set([...a, ...b])];
        }
        localStorage.setItem('ll_progress', JSON.stringify(merged));
      }
    } catch(e) {}
  }

  // ── Public API ────────────────────────────────────────────
  window.LLAuth = {

    // Register new user
    register: async function(name, email, password, region) {
      const res  = await fetch(AUTH_FN, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'register', name, email, password, region: region || 'UK' }),
      });
      const data = await res.json();
      if (data.ok && data.session) {
        saveSession(data.session);
        await syncProgressOnLogin(email, data.session.access_token);
      }
      return data;
    },

    // Sign in
    login: async function(email, password) {
      const res  = await fetch(AUTH_FN, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'login', email, password }),
      });
      const data = await res.json();
      if (data.ok && data.session) {
        saveSession(data.session);
        await syncProgressOnLogin(email, data.session.access_token);
      }
      return data;
    },

    // Sign out
    logout: function() {
      clearSession();
      window.location.href = '/login';
    },

    // Get current user (fast, from localStorage)
    getUser: function() {
      var session = getSession();
      return session ? session.user : null;
    },

    // Get valid session (async, refreshes if needed)
    getSession: getValidSession,

    // Check if logged in (fast)
    isLoggedIn: function() {
      var session = getSession();
      return !!(session && !isExpired(session));
    },

    // Guard a page — redirects to /login if not authenticated
    // Call at the top of any protected page
    require: async function(redirectTo) {
      var session = getSession();
      if (!session) {
        var back = encodeURIComponent(window.location.pathname);
        window.location.replace('/login?next=' + back);
        return null;
      }
      if (isExpired(session)) {
        var refreshed = await refreshSession(session);
        if (!refreshed) {
          clearSession();
          var back2 = encodeURIComponent(window.location.pathname);
          window.location.replace('/login?next=' + back2);
          return null;
        }
        return refreshed.user;
      }
      // Update nav with user name
      window.LLAuth._updateNav(session.user);
      return session.user;
    },

    // Update nav user name (called after require())
    _updateNav: function(user) {
      if (!user) return;
      var nameEl   = document.getElementById('nav-user-name');
      var avatarEl = document.getElementById('nav-avatar');
      if (nameEl)   nameEl.textContent   = (user.name || user.email || '').split(' ')[0];
      if (avatarEl) avatarEl.textContent = (user.name || user.email || '?').charAt(0).toUpperCase();
    },

    // Save progress to Supabase (call after any progress change)
    saveProgress: async function(progressData) {
      var user = this.getUser();
      if (!user || !user.email) return;
      try {
        await fetch(PROGRESS_FN, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'merge', email: user.email, data: progressData }),
        });
      } catch(e) {}
    },
  };

  // On every page load: update nav if already logged in
  document.addEventListener('DOMContentLoaded', function() {
    var session = getSession();
    if (session && session.user) {
      window.LLAuth._updateNav(session.user);
    }
  });

  console.log('[LedgerLearn] ll-auth.js loaded ✓');
})();
