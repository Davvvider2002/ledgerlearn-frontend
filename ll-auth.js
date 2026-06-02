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
    session.expires_at = Date.now() + ((session.expires_in || 3600) * 1000);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Sync ll_user — include role and company so dashboard knows who this is
    if (session.user) {
      try {
        var u = JSON.parse(localStorage.getItem('ll_user') || '{}');
        u.name         = session.user.name         || u.name         || '';
        u.email        = session.user.email        || u.email        || '';
        u.region       = session.user.region       || u.region       || 'UK';
        u.role         = session.user.role         || u.role         || 'applicant';
        u.id           = session.user.id           || u.id           || '';
        // Recruiter-specific — only overwrite if present in response
        if (session.user.company_name)   u.company    = session.user.company_name;
        if (session.user.recruiter_id)   u.recruiter_id = session.user.recruiter_id;
        if (session.user.recruiter_plan) u.recruiter_plan = session.user.recruiter_plan;
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

    // Register new user (learner)
    register: async function(name, email, password, region) {
      const res  = await fetch(AUTH_FN, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'register', name, email, password, region: region || 'UK' }),
      });
      const data = await res.json();
      if (data.ok && data.session) {
        saveSession(data.session);
        // Only sync progress for learner accounts
        if (data.session.user && data.session.user.role !== 'recruiter') {
          await syncProgressOnLogin(email, data.session.access_token);
        }
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
        // Only sync learner progress for non-recruiters
        if (!data.isRecruiter && data.session.user && data.session.user.role !== 'recruiter') {
          await syncProgressOnLogin(email, data.session.access_token);
        }
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
    // Injects name, avatar, role badge, and sign-out into ANY nav
    // that contains #nav-user-name / #nav-avatar OR .nav-user-slot
    _updateNav: function(user) {
      if (!user) return;
      var stored = {};
      try { stored = JSON.parse(localStorage.getItem('ll_user') || '{}'); } catch(e) {}
      var role    = user.role    || stored.role    || 'applicant';
      var name    = user.name    || stored.name    || user.email || '';
      var company = user.company_name || stored.company || stored.company_name || '';
      // Determine if this is a recruiter-context page
      var _path = window.location.pathname;
      var _isRecruiterPage = /\/(jobs-applications|recruiter-dashboard|job-post|recruiter)/.test(_path);
      var _isLearnerPage   = /\/(learn|test|dashboard|practice|quickbooks|certificate)/.test(_path);
      // On learner pages: always show learner name, never recruiter badge
      // On recruiter pages: show company + RECRUITER badge
      // On other pages (jobs, index): show name only, recruiter badge only if on recruiter page
      var display = (_isRecruiterPage && role === 'recruiter')
        ? (company || name.split(' ')[0])
        : name.split(' ')[0];
      var initial = display.charAt(0).toUpperCase() || '?';

      // Update existing named elements
      var nameEl   = document.getElementById('nav-user-name');
      var avatarEl = document.getElementById('nav-avatar');
      if (nameEl)   nameEl.textContent   = display;
      if (avatarEl) avatarEl.textContent = initial;

      // Inject a user-menu into .nav-user-slot if present (public pages)
      var slotEl = document.getElementById('nav-user-slot');
      if (slotEl && !slotEl.dataset.populated) {
        // Only show RECRUITER badge on recruiter-context pages
        var _showRecruiterBadge = role === 'recruiter' && _isRecruiterPage;
        var roleBadge = _showRecruiterBadge
          ? '<span style="font-size:.6rem;font-weight:700;padding:1px 7px;border-radius:100px;background:rgba(29,169,138,.2);color:#26c9a5;border:1px solid rgba(29,169,138,.25);text-transform:uppercase;letter-spacing:.06em;">Recruiter</span>'
          : '';
        // Build DOM nodes (avoids quote-escaping in innerHTML)
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;';
        var ava = document.createElement('div');
        ava.style.cssText = 'width:28px;height:28px;border-radius:50%;background:#1DA98A;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#fff;flex-shrink:0;';
        ava.textContent = initial;
        var nameSpan = document.createElement('span');
        nameSpan.style.cssText = 'font-size:.8rem;color:rgba(255,255,255,.65);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        nameSpan.textContent = display;
        var soBtn = document.createElement('button');
        soBtn.textContent = 'Sign out';
        soBtn.style.cssText = 'margin-left:4px;background:transparent;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.45);padding:4px 10px;border-radius:6px;font-size:.72rem;cursor:pointer;font-family:inherit;white-space:nowrap;';
        soBtn.onclick     = function(){ window.LLAuth.logout(); };
        soBtn.onmouseover = function(){ this.style.borderColor='rgba(212,168,67,.5)';this.style.color='#D4A843'; };
        soBtn.onmouseout  = function(){ this.style.borderColor='rgba(255,255,255,.15)';this.style.color='rgba(255,255,255,.45)'; };
        wrapper.appendChild(ava);
        wrapper.appendChild(nameSpan);
        if (_showRecruiterBadge) {
          var rb = document.createElement('span');
          rb.style.cssText = 'font-size:.6rem;font-weight:700;padding:1px 7px;border-radius:100px;background:rgba(29,169,138,.2);color:#26c9a5;border:1px solid rgba(29,169,138,.25);text-transform:uppercase;letter-spacing:.06em;';
          rb.textContent = 'Recruiter';
          wrapper.appendChild(rb);
        }
        wrapper.appendChild(soBtn);
        slotEl.innerHTML = '';
        slotEl.appendChild(wrapper);
        slotEl.dataset.populated = '1';
      }

      // If no slot, add sign-out to existing .nav-user containers
      var navUserEl = document.querySelector('.nav-user');
      if (navUserEl && !navUserEl.querySelector('.nav-signout')) {
        var soBtn = document.createElement('button');
        soBtn.className   = 'nav-signout';
        soBtn.textContent = 'Sign out';
        soBtn.style.cssText = 'background:transparent;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.45);padding:4px 10px;border-radius:6px;font-size:.72rem;cursor:pointer;font-family:inherit;margin-left:4px;white-space:nowrap;';
        soBtn.onmouseover = function(){ this.style.borderColor='rgba(212,168,67,.5)';this.style.color='#D4A843'; };
        soBtn.onmouseout  = function(){ this.style.borderColor='rgba(255,255,255,.15)';this.style.color='rgba(255,255,255,.45)'; };
        soBtn.onclick     = function(){ window.LLAuth.logout(); };
        navUserEl.appendChild(soBtn);
      }
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
