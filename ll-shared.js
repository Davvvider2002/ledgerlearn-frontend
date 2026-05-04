/**
 * LedgerLearn Pro — Shared Utilities (ll-shared.js)
 * ==================================================
 * Load on every page:  <script src="/ll-shared.js"></script>
 * Must load BEFORE brevo.js, email-gate.js, certificate.js
 */

const LL = (function () {

  const KEYS = {
    user:     'll_user',
    progress: 'll_progress',
  };

  // ── Storage helpers ──────────────────────────────────────
  function getUser()     { try { return JSON.parse(localStorage.getItem(KEYS.user))     || {}; } catch { return {}; } }
  function getProgress() { try { return JSON.parse(localStorage.getItem(KEYS.progress)) || {}; } catch { return {}; } }

  function saveUser(name, email) {
    localStorage.setItem(KEYS.user, JSON.stringify({ name, email, ts: Date.now() }));
  }

  function saveProgress(patch) {
    const p = getProgress();
    localStorage.setItem(KEYS.progress, JSON.stringify({ ...p, ...patch }));
  }

  // ── Nav personalisation ─────────────────────────────────
  function initNav() {
    const user = getUser();
    const nameEl   = document.getElementById('ll-nav-name');
    const avatarEl = document.getElementById('ll-nav-avatar');
    if (nameEl && user.name)   nameEl.textContent   = user.name.split(' ')[0];
    if (avatarEl && user.name) avatarEl.textContent = user.name.charAt(0).toUpperCase();

    // Mark active nav link
    const path = window.location.pathname.replace('.html','');
    document.querySelectorAll('.ll-nav-links a').forEach(a => {
      const href = a.getAttribute('href')?.replace('.html','');
      if (href && path.endsWith(href)) a.classList.add('active');
    });
  }

  // ── Smooth scroll for anchor links ──────────────────────
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      });
    });
  }

  // ── Intersection observer for fade-in animations ─────────
  function initAnimations() {
    if (!window.IntersectionObserver) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.ll-animate').forEach(el => {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });
  }

  // ── Loading overlay ──────────────────────────────────────
  function showLoading(msg = 'Loading…') {
    let el = document.getElementById('ll-loading-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'll-loading-overlay';
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;">
          <div style="width:44px;height:44px;border:3px solid rgba(212,168,67,0.2);border-top-color:#D4A843;border-radius:50%;animation:ll-spin 0.7s linear infinite;"></div>
          <div id="ll-loading-msg" style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:600;color:#fff;">${msg}</div>
        </div>`;
      el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(7,18,36,0.88);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;';
      document.body.appendChild(el);
    } else {
      document.getElementById('ll-loading-msg').textContent = msg;
      el.style.display = 'flex';
    }
  }

  function hideLoading() {
    const el = document.getElementById('ll-loading-overlay');
    if (el) el.style.display = 'none';
  }

  // ── Toast notification ───────────────────────────────────
  function toast(msg, type = 'success') {
    const colours = { success: '#1DA98A', error: '#e05555', info: '#D4A843' };
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `
      position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;
      background:${colours[type]||colours.success};color:#fff;
      font-family:'DM Sans',sans-serif;font-size:0.875rem;font-weight:600;
      padding:12px 20px;border-radius:8px;
      box-shadow:0 8px 24px rgba(0,0,0,0.25);
      animation:ll-fade-in 0.3s ease;
      max-width:320px;
    `;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(()=>t.remove(),300); }, 3500);
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    initNav();
    initSmoothScroll();
    document.addEventListener('DOMContentLoaded', initAnimations);
  }

  init();

  return { getUser, getProgress, saveUser, saveProgress, showLoading, hideLoading, toast, KEYS };

})();
