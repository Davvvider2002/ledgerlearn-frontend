/**
 * LedgerLearn Pro — Job Sidebar Component (ll-jobs.js)
 * ======================================================
 * Renders a live job vacancies sidebar on any page.
 *
 * USAGE — add one div to your page layout:
 *   <div id="ll-jobs-sidebar"></div>
 *
 * Then load this script:
 *   <script src="/ll-jobs.js"></script>
 *
 * The sidebar auto-injects styles, fetches jobs from
 * /.netlify/functions/jobs, and renders with filter tabs.
 *
 * For pages with a sidebar layout, wrap your main content:
 *   <div class="ll-page-with-sidebar">
 *     <main class="ll-main-content">...your page...</main>
 *     <aside id="ll-jobs-sidebar"></aside>
 *   </div>
 */

(function () {

  // ── Badge config ──────────────────────────────────────────
  const BADGES = {
    xero:    { label: 'Xero',        color: '#1DA98A', bg: 'rgba(29,169,138,0.15)',  border: 'rgba(29,169,138,0.3)'  },
    qb:      { label: 'QuickBooks',  color: '#2B5BE8', bg: 'rgba(43,91,232,0.12)',   border: 'rgba(43,91,232,0.25)'  },
    sage:    { label: 'Sage',        color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.25)' },
    netsuite:{ label: 'NetSuite',    color: '#D4A843', bg: 'rgba(212,168,67,0.12)',  border: 'rgba(212,168,67,0.25)' },
    general: { label: 'Accounting',  color: '#6b87a3', bg: 'rgba(107,135,163,0.1)', border: 'rgba(107,135,163,0.2)' },
  };

  // ── Inject styles ─────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('ll-jobs-styles')) return;
    const s = document.createElement('style');
    s.id = 'll-jobs-styles';
    s.textContent = `
      /* ── Layout wrapper ── */
      .ll-page-with-sidebar {
        display: grid;
        grid-template-columns: 1fr 300px;
        gap: 2rem;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1.5rem;
        align-items: start;
      }

      .ll-main-content { min-width: 0; }

      /* ── Sidebar container ── */
      #ll-jobs-sidebar {
        position: sticky;
        top: 74px;
        max-height: calc(100vh - 90px);
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(212,168,67,0.3) transparent;
      }

      #ll-jobs-sidebar::-webkit-scrollbar { width: 4px; }
      #ll-jobs-sidebar::-webkit-scrollbar-track { background: transparent; }
      #ll-jobs-sidebar::-webkit-scrollbar-thumb { background: rgba(212,168,67,0.3); border-radius: 2px; }

      /* ── Sidebar inner ── */
      .ll-jobs-wrap {
        background: #0B1F3A;
        border: 1px solid rgba(212,168,67,0.15);
        border-radius: 14px;
        overflow: hidden;
        font-family: 'DM Sans', sans-serif;
      }

      /* Header */
      .ll-jobs-header {
        padding: 1rem 1.1rem 0.75rem;
        border-bottom: 1px solid rgba(255,255,255,0.07);
        display: flex; align-items: center; justify-content: space-between;
      }

      .ll-jobs-title {
        display: flex; align-items: center; gap: 7px;
      }

      .ll-jobs-title-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: #26c9a5;
        animation: ll-jobs-blink 2s infinite;
        flex-shrink: 0;
      }

      @keyframes ll-jobs-blink { 0%,100%{opacity:1} 50%{opacity:0.35} }

      .ll-jobs-title-text {
        font-family: 'Syne', sans-serif;
        font-size: 0.78rem; font-weight: 700;
        color: #fff; letter-spacing: -0.01em;
      }

      .ll-jobs-count {
        font-size: 0.65rem; font-weight: 600;
        color: #D4A843;
        background: rgba(212,168,67,0.12);
        border: 1px solid rgba(212,168,67,0.2);
        padding: 2px 7px; border-radius: 100px;
      }

      /* Filter tabs */
      .ll-jobs-filters {
        display: flex; gap: 4px;
        padding: 0.6rem 1.1rem;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        overflow-x: auto;
        scrollbar-width: none;
      }
      .ll-jobs-filters::-webkit-scrollbar { display: none; }

      .ll-jobs-filter {
        font-size: 0.65rem; font-weight: 600;
        padding: 3px 9px; border-radius: 100px;
        cursor: pointer; white-space: nowrap;
        border: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.45);
        background: transparent;
        transition: all 0.2s;
        font-family: 'DM Sans', sans-serif;
      }

      .ll-jobs-filter:hover {
        color: rgba(255,255,255,0.8);
        border-color: rgba(255,255,255,0.25);
      }

      .ll-jobs-filter.active {
        color: #0B1F3A; font-weight: 700;
      }
      .ll-jobs-filter.active.f-all     { background: #D4A843; border-color: #D4A843; }
      .ll-jobs-filter.active.f-xero    { background: #1DA98A; border-color: #1DA98A; }
      .ll-jobs-filter.active.f-qb      { background: #2B5BE8; border-color: #2B5BE8; }
      .ll-jobs-filter.active.f-sage    { background: #8B5CF6; border-color: #8B5CF6; }

      /* Job list */
      .ll-jobs-list { display: flex; flex-direction: column; }

      /* Job card */
      .ll-job-card {
        padding: 0.85rem 1.1rem;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        text-decoration: none; display: block;
        transition: background 0.15s;
        position: relative;
      }

      .ll-job-card:hover { background: rgba(255,255,255,0.04); }
      .ll-job-card:last-child { border-bottom: none; }

      .ll-job-card-top {
        display: flex; align-items: flex-start;
        justify-content: space-between; gap: 6px;
        margin-bottom: 4px;
      }

      .ll-job-title {
        font-size: 0.8rem; font-weight: 600;
        color: #fff; line-height: 1.3;
        flex: 1;
      }

      .ll-job-badge {
        font-size: 0.55rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.06em;
        padding: 2px 6px; border-radius: 3px;
        white-space: nowrap; flex-shrink: 0;
        margin-top: 1px;
      }

      .ll-job-company {
        font-size: 0.7rem; color: rgba(255,255,255,0.45);
        margin-bottom: 5px; font-weight: 300;
      }

      .ll-job-meta {
        display: flex; align-items: center;
        gap: 8px; flex-wrap: wrap;
      }

      .ll-job-meta-item {
        display: flex; align-items: center; gap: 3px;
        font-size: 0.65rem; color: rgba(255,255,255,0.35);
      }

      .ll-job-meta-item svg { flex-shrink: 0; }

      .ll-job-salary {
        font-size: 0.68rem; font-weight: 600;
        color: #D4A843;
      }

      /* Source tag */
      .ll-job-source {
        position: absolute; bottom: 8px; right: 10px;
        font-size: 0.55rem; color: rgba(255,255,255,0.2);
        text-transform: uppercase; letter-spacing: 0.06em;
      }

      /* Footer */
      .ll-jobs-footer {
        padding: 0.75rem 1.1rem;
        border-top: 1px solid rgba(255,255,255,0.06);
        display: flex; flex-direction: column; gap: 6px;
      }

      .ll-jobs-footer-link {
        display: flex; align-items: center; justify-content: center;
        gap: 6px; padding: 8px;
        border-radius: 7px; font-size: 0.75rem; font-weight: 600;
        text-decoration: none; transition: all 0.2s;
        font-family: 'DM Sans', sans-serif;
      }

      .ll-jobs-footer-link.primary {
        background: #1DA98A; color: #fff;
      }
      .ll-jobs-footer-link.primary:hover { background: #26c9a5; }

      .ll-jobs-footer-link.secondary {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.55);
      }
      .ll-jobs-footer-link.secondary:hover {
        background: rgba(255,255,255,0.09);
        color: #fff;
      }

      .ll-jobs-refresh {
        text-align: center; font-size: 0.6rem;
        color: rgba(255,255,255,0.2); margin-top: 2px;
      }

      /* States */
      .ll-jobs-loading {
        padding: 2rem 1rem;
        display: flex; flex-direction: column;
        align-items: center; gap: 10px;
      }

      .ll-jobs-loading-spinner {
        width: 28px; height: 28px;
        border: 2px solid rgba(212,168,67,0.2);
        border-top-color: #D4A843;
        border-radius: 50%;
        animation: ll-jobs-spin 0.7s linear infinite;
      }

      @keyframes ll-jobs-spin { to { transform: rotate(360deg) } }

      .ll-jobs-loading-text {
        font-size: 0.72rem; color: rgba(255,255,255,0.35);
        text-align: center;
      }

      .ll-jobs-empty {
        padding: 1.5rem 1rem; text-align: center;
        font-size: 0.75rem; color: rgba(255,255,255,0.3);
        line-height: 1.6;
      }

      /* Cert upsell inside sidebar */
      .ll-jobs-cert-card {
        margin: 0.6rem 1rem 0;
        background: linear-gradient(135deg, rgba(29,169,138,0.12), rgba(212,168,67,0.08));
        border: 1px solid rgba(29,169,138,0.2);
        border-radius: 9px; padding: 0.85rem;
        text-decoration: none; display: block;
        transition: all 0.2s;
      }

      .ll-jobs-cert-card:hover { background: linear-gradient(135deg, rgba(29,169,138,0.18), rgba(212,168,67,0.12)); }

      .ll-jobs-cert-card-title {
        font-family: 'Syne', sans-serif;
        font-size: 0.75rem; font-weight: 700;
        color: #fff; margin-bottom: 3px;
      }

      .ll-jobs-cert-card-sub {
        font-size: 0.65rem; color: rgba(255,255,255,0.45);
        line-height: 1.4; margin-bottom: 7px;
      }

      .ll-jobs-cert-card-cta {
        font-size: 0.68rem; font-weight: 700;
        color: #26c9a5;
        display: flex; align-items: center; gap: 4px;
      }

      /* Responsive */
      @media (max-width: 900px) {
        .ll-page-with-sidebar {
          grid-template-columns: 1fr;
        }

        #ll-jobs-sidebar {
          position: static;
          max-height: none;
          overflow-y: visible;
        }

        .ll-jobs-wrap { display: none; } /* hidden on mobile — too narrow */
        .ll-jobs-mobile-strip { display: flex !important; }
      }

      /* Mobile strip — shown instead of sidebar on small screens */
      .ll-jobs-mobile-strip {
        display: none;
        overflow-x: auto;
        gap: 0.75rem;
        padding: 0.5rem 0 1rem;
        scrollbar-width: none;
      }
      .ll-jobs-mobile-strip::-webkit-scrollbar { display: none; }

      .ll-jobs-mobile-card {
        flex-shrink: 0; width: 220px;
        background: #0B1F3A;
        border: 1px solid rgba(212,168,67,0.15);
        border-radius: 10px; padding: 0.85rem;
        text-decoration: none; display: block;
        transition: background 0.15s;
      }
      .ll-jobs-mobile-card:hover { background: #132d52; }
      .ll-jobs-mobile-card .ll-job-title { font-size: 0.78rem; color: #fff; font-weight: 600; margin-bottom: 3px; }
      .ll-jobs-mobile-card .ll-job-company { font-size: 0.65rem; color: rgba(255,255,255,0.4); }
      .ll-jobs-mobile-card .ll-job-salary { font-size: 0.65rem; color: #D4A843; font-weight: 600; margin-top: 4px; }
    `;
    document.head.appendChild(s);
  }

  // ── Render sidebar ────────────────────────────────────────
  function render(container, jobs, filter = 'all') {
    const filtered = filter === 'all' ? jobs : jobs.filter(j => j.badge === filter);
    const counts   = { all: jobs.length, xero: 0, qb: 0, sage: 0 };
    jobs.forEach(j => { if (counts[j.badge] !== undefined) counts[j.badge]++; });

    const badgeHTML = (job) => {
      const b = BADGES[job.badge] || BADGES.general;
      return `<span class="ll-job-badge" style="background:${b.bg};color:${b.color};border:1px solid ${b.border};">${b.label}</span>`;
    };

    const metaIcon = (path) =>
      `<svg width="10" height="10" viewBox="0 0 10 10" fill="none">${path}</svg>`;

    const locationIcon = metaIcon(`<path d="M5 1a2.5 2.5 0 010 5C3.5 6 1 4 1 5a4 4 0 108 0c0-1-2.5-3-4-3z" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>`);
    const clockIcon    = metaIcon(`<circle cx="5" cy="5" r="3.5" stroke="currentColor" stroke-width="1"/><path d="M5 3v2l1 1" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>`);

    const jobCards = filtered.slice(0, 10).map(job => `
      <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="ll-job-card">
        <div class="ll-job-card-top">
          <div class="ll-job-title">${job.title}</div>
          ${badgeHTML(job)}
        </div>
        <div class="ll-job-company">${job.company}</div>
        <div class="ll-job-meta">
          ${job.location ? `<span class="ll-job-meta-item">${locationIcon} ${job.location}</span>` : ''}
          ${job.posted   ? `<span class="ll-job-meta-item">${clockIcon} ${job.posted}</span>`    : ''}
          ${job.salary   ? `<span class="ll-job-salary">${job.salary}</span>`                    : ''}
        </div>
        <span class="ll-job-source">${job.source}</span>
      </a>
    `).join('');

    const filterTabs = [
      { key: 'all',  label: `All (${counts.all})`,      cls: 'f-all'  },
      { key: 'xero', label: `Xero (${counts.xero})`,    cls: 'f-xero' },
      { key: 'qb',   label: `QB (${counts.qb})`,        cls: 'f-qb'   },
      { key: 'sage', label: `Sage (${counts.sage})`,    cls: 'f-sage' },
    ].map(f => `
      <button class="ll-jobs-filter ${f.cls} ${filter === f.key ? 'active' : ''}"
              data-filter="${f.key}">${f.label}</button>
    `).join('');

    container.innerHTML = `
      <div class="ll-jobs-wrap">
        <div class="ll-jobs-header">
          <div class="ll-jobs-title">
            <div class="ll-jobs-title-dot"></div>
            <span class="ll-jobs-title-text">Live Job Vacancies</span>
          </div>
          <span class="ll-jobs-count">${jobs.length} live</span>
        </div>

        <div class="ll-jobs-filters">${filterTabs}</div>

        <a href="/learn" class="ll-jobs-cert-card">
          <div class="ll-jobs-cert-card-title">🏆 Get certified to apply faster</div>
          <div class="ll-jobs-cert-card-sub">Employers shortlist certified candidates 3× more. Start your free Xero module.</div>
          <div class="ll-jobs-cert-card-cta">Start free →</div>
        </a>

        <div class="ll-jobs-list">
          ${jobCards || `<div class="ll-jobs-empty">No ${filter === 'all' ? '' : filter+' '}jobs found right now.<br>Check back soon.</div>`}
        </div>

        <div class="ll-jobs-footer">
          <a href="https://www.reed.co.uk/jobs/xero-quickbooks-sage-bookkeeper" target="_blank" rel="noopener" class="ll-jobs-footer-link primary">
            View all jobs on Reed →
          </a>
          <a href="https://www.indeed.co.uk/jobs?q=xero+quickbooks+bookkeeper" target="_blank" rel="noopener" class="ll-jobs-footer-link secondary">
            Search Indeed →
          </a>
          <div class="ll-jobs-refresh" id="ll-jobs-refresh-time">Updated just now</div>
        </div>
      </div>

      <!-- Mobile horizontal scroll strip -->
      <div class="ll-jobs-mobile-strip" id="ll-jobs-mobile">
        ${jobs.slice(0,6).map(job => `
          <a href="${job.url}" target="_blank" rel="noopener" class="ll-jobs-mobile-card">
            <div class="ll-job-title">${job.title}</div>
            <div class="ll-job-company">${job.company}</div>
            ${job.salary ? `<div class="ll-job-salary">${job.salary}</div>` : ''}
          </a>
        `).join('')}
      </div>
    `;

    // Wire filter buttons
    container.querySelectorAll('.ll-jobs-filter').forEach(btn => {
      btn.addEventListener('click', () => render(container, jobs, btn.dataset.filter));
    });
  }

  // ── Load state ────────────────────────────────────────────
  function renderLoading(container) {
    container.innerHTML = `
      <div class="ll-jobs-wrap">
        <div class="ll-jobs-header">
          <div class="ll-jobs-title">
            <div class="ll-jobs-title-dot"></div>
            <span class="ll-jobs-title-text">Live Job Vacancies</span>
          </div>
        </div>
        <div class="ll-jobs-loading">
          <div class="ll-jobs-loading-spinner"></div>
          <div class="ll-jobs-loading-text">Fetching live jobs…</div>
        </div>
      </div>`;
  }

  // ── Main init ─────────────────────────────────────────────
  async function init() {
    const container = document.getElementById('ll-jobs-sidebar');
    if (!container) return;

    injectStyles();
    renderLoading(container);

    // Session cache — don't re-fetch within same tab session
    const SESSION_KEY = 'll_jobs_cache';
    let jobs = null;

    try {
      const cached = sessionStorage.getItem(SESSION_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.ts && (Date.now() - parsed.ts) < 30 * 60 * 1000) {
          jobs = parsed.jobs;
          console.log('[Jobs] Serving from session cache');
        }
      }
    } catch (e) {}

    if (!jobs) {
      try {
        const res  = await fetch('/.netlify/functions/jobs?limit=15');
        const data = await res.json();
        if (data.ok && data.jobs?.length) {
          jobs = data.jobs;
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ jobs, ts: Date.now() }));
          } catch (e) {}
        }
      } catch (e) {
        console.warn('[Jobs] Failed to fetch live jobs:', e.message);
      }
    }

    // Fallback if fetch failed entirely
    if (!jobs || jobs.length === 0) {
      jobs = [
        { title: 'Xero Bookkeeper', company: 'Various Clients', location: 'Remote / UK', salary: '£28k–£35k', url: 'https://www.reed.co.uk/jobs/xero-bookkeeper', source: 'Reed', posted: 'Recently', badge: 'xero' },
        { title: 'QuickBooks Accountant', company: 'Accounting Firm', location: 'Remote / US', salary: '$45k–$58k', url: 'https://www.indeed.com/jobs?q=quickbooks', source: 'Indeed', posted: 'Recently', badge: 'qb' },
        { title: 'Xero Implementation Consultant', company: 'ERP Consultancy', location: 'London / Remote', salary: '£40k–£55k', url: 'https://www.reed.co.uk/jobs/xero-consultant', source: 'Reed', posted: 'Recently', badge: 'xero' },
        { title: 'Sage 50 Accounts Assistant', company: 'SME Business', location: 'Birmingham, UK', salary: '£24k–£30k', url: 'https://www.reed.co.uk/jobs/sage', source: 'Reed', posted: 'Recently', badge: 'sage' },
        { title: 'Cloud Accounting Manager', company: 'Accounting Practice', location: 'Remote / Hybrid', salary: '£45k–£60k', url: 'https://www.reed.co.uk/jobs/cloud-accounting', source: 'Reed', posted: 'Recently', badge: 'xero' },
        { title: 'QuickBooks Pro Advisor', company: 'CPA Firm', location: 'New York / Remote', salary: '$55k–$70k', url: 'https://www.indeed.com/jobs?q=quickbooks+pro', source: 'Indeed', posted: 'Recently', badge: 'qb' },
      ];
    }

    render(container, jobs);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
