/**
 * LEDGERLEARN SIMULATION PATCH
 * =============================
 * Paste this ENTIRE block into learn.html
 * Find the closing </script> tag near the bottom of learn.html
 * Add this BEFORE it.
 *
 * This patches the existing learn.html to:
 * 1. Load lessons instantly (no spinner)
 * 2. Show simulation launch cards on lessons 3 and 4
 */

// ── Simulation URLs ───────────────────────────────────────
const SIM_URLS = {
  2: '/xero-invoice-sim',   // Lesson 3: Creating & Managing Invoices
  3: '/xero-bankrec-sim',   // Lesson 4: Bank Reconciliation
};

// ── Inject simulation CSS ─────────────────────────────────
(function injectSimStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .sim-launch-card {
      background: linear-gradient(135deg, #0B1F3A, #132d52);
      border: 2px solid rgba(29,169,138,0.4);
      border-radius: 14px;
      padding: 1.75rem;
      margin-bottom: 1.5rem;
      position: relative;
      overflow: hidden;
    }
    .sim-launch-card::before {
      content:'';position:absolute;top:0;right:0;bottom:0;width:45%;
      background:radial-gradient(ellipse at right,rgba(29,169,138,0.12) 0%,transparent 70%);
      pointer-events:none;
    }
    .sim-launch-header {
      display:flex;align-items:center;gap:1rem;margin-bottom:1.1rem;flex-wrap:wrap;
    }
    .sim-launch-icon { font-size:2.5rem;flex-shrink:0; }
    .sim-launch-text { flex:1; }
    .sim-launch-title {
      font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:700;
      color:#fff;margin-bottom:3px;letter-spacing:-0.01em;
    }
    .sim-launch-sub { font-size:0.82rem;color:rgba(255,255,255,0.55);font-weight:300; }
    .sim-launch-badge {
      background:rgba(29,169,138,0.18);border:1px solid rgba(29,169,138,0.4);
      color:#26c9a5;font-size:0.65rem;font-weight:700;
      text-transform:uppercase;letter-spacing:0.08em;
      padding:4px 10px;border-radius:100px;flex-shrink:0;
    }
    .sim-launch-features {
      display:flex;flex-wrap:wrap;gap:6px;margin-bottom:1.25rem;
    }
    .sim-feat {
      background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
      color:rgba(255,255,255,0.75);font-size:0.72rem;
      padding:4px 11px;border-radius:100px;
    }
    .sim-launch-btn {
      display:inline-flex;align-items:center;gap:8px;
      background:#1DA98A;color:#fff;
      font-family:'DM Sans',sans-serif;
      font-size:1rem;font-weight:700;
      padding:13px 28px;border-radius:9px;
      text-decoration:none;border:none;cursor:pointer;
      transition:all 0.2s;position:relative;z-index:1;
      box-shadow:0 4px 16px rgba(29,169,138,0.35);
    }
    .sim-launch-btn:hover {
      background:#26c9a5;transform:translateY(-2px);
      box-shadow:0 8px 24px rgba(29,169,138,0.45);
    }
    .sim-launch-note {
      display:block;font-size:0.7rem;color:rgba(255,255,255,0.3);
      margin-top:0.75rem;position:relative;z-index:1;
    }
    .sim-or-divider {
      display:flex;align-items:center;gap:1rem;margin:1.5rem 0 1rem;
    }
    .sim-or-divider::before,.sim-or-divider::after {
      content:'';flex:1;height:1px;background:rgba(11,31,58,0.1);
    }
    .sim-or-divider span {
      font-size:0.72rem;color:#6b87a3;white-space:nowrap;font-style:italic;
    }
  `;
  document.head.appendChild(style);
})();

// ── Override: render lesson content with simulation card ──
const _originalRenderFallback = window.renderFallbackLesson;

window.renderFallbackLesson = function(index) {
  if (SIM_URLS[index]) {
    _patchRenderSimLesson(index, SIM_URLS[index]);
  } else if (typeof _originalRenderFallback === 'function') {
    _originalRenderFallback(index);
  }
};

function _patchRenderSimLesson(index, simUrl) {
  const FALLBACK = window.FALLBACK_CONTENT || {};
  const data = FALLBACK[index] || FALLBACK[0] || { intro:'', steps:[], whyMatters:'' };

  const simNames = {
    2: 'Invoice Creation',
    3: 'Bank Reconciliation',
  };
  const simName = simNames[index] || 'Live Simulation';

  const stepsHTML = (data.steps || []).map((s, i) => `
    <div class="lesson-step ${i === 0 ? 'active-step' : ''}">
      <div class="step-num-badge">${s.step || i+1}</div>
      <div class="step-content">
        <div class="step-title">${s.title || ''}</div>
        <div class="step-instruction">${s.instruction || ''}</div>
        ${s.tip ? `<div class="step-tip">${s.tip}</div>` : ''}
      </div>
    </div>`).join('');

  const contentEl = document.getElementById('lesson-content');
  if (!contentEl) return;

  const completed = (window.LL ? LL.getProgress().completedLessons : []) || [];
  const isDone = completed.includes(index);

  contentEl.innerHTML = `
    ${data.intro ? `<p class="lesson-intro">${data.intro}</p>` : ''}

    <div class="sim-launch-card">
      <div class="sim-launch-header">
        <div class="sim-launch-icon">🖥️</div>
        <div class="sim-launch-text">
          <div class="sim-launch-title">Interactive ${simName} Simulation</div>
          <div class="sim-launch-sub">Practice on a real interface — type figures, click buttons, get scored</div>
        </div>
        <div class="sim-launch-badge">✓ Included free</div>
      </div>
      <div class="sim-launch-features">
        <span class="sim-feat">✓ Pixel-accurate Xero interface</span>
        <span class="sim-feat">✓ Real input fields — type actual numbers</span>
        <span class="sim-feat">✓ 6 guided tasks with instant feedback</span>
        <span class="sim-feat">✓ Score tracked throughout</span>
        <span class="sim-feat">✓ Hint system if you get stuck</span>
      </div>
      <a href="${simUrl}" target="_blank" class="sim-launch-btn"
         onclick="if(window.LL){LL.saveProgress({'simLaunched_'+${index}:true})}">
        🚀 Launch ${simName} Simulation →
      </a>
      <span class="sim-launch-note">Opens in a new tab · Return here to mark the lesson complete when done</span>
    </div>

    <div class="sim-or-divider"><span>Or study the guided steps below first</span></div>

    <div class="lesson-steps">${stepsHTML}</div>

    ${data.whyMatters ? `
    <div class="lesson-why-matters">
      <strong>Why this matters for your career:</strong> ${data.whyMatters}
    </div>` : ''}

    <button class="btn btn-teal btn-sm"
            onclick="typeof completeLesson==='function'&&completeLesson(${index})"
            id="btn-complete-${index}"
            style="margin-top:1.25rem;${isDone?'opacity:0.6;':''}"
            ${isDone ? 'disabled' : ''}>
      ${isDone ? '✓ Completed' : '✓ Mark lesson complete'}
    </button>`;
}

// ── Override: skip AI call, load instantly ────────────────
// Intercept loadLesson to avoid the spinner
const _originalLoadLesson = window.loadLesson;
window.loadLesson = async function(index) {
  // Call original to update nav/header/buttons
  if (typeof _originalLoadLesson === 'function') {
    // Clear the loading state immediately
    const contentEl = document.getElementById('lesson-content');
    if (contentEl) {
      contentEl.innerHTML = '<div style="padding:1rem;color:#6b87a3;font-size:0.85rem;">Preparing lesson…</div>';
    }
  }

  const LESSONS = window.LESSONS || [];
  const lesson  = LESSONS[index];
  if (!lesson) return;

  // Update all the header elements the original function updates
  const setEl = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  setEl('lesson-title',   lesson.title);
  setEl('lesson-subtitle', `⏱ 15–20 min · ${lesson.free ? 'Free module' : 'L1 Associate'}`);
  setEl('sim-num',         lesson.id);
  setEl('sim-title',       lesson.title);
  setEl('sim-type',        lesson.type);
  setEl('progress-label',  `Lesson ${index + 1} of ${LESSONS.length}`);

  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  if (prevBtn) prevBtn.disabled = index === 0;
  if (nextBtn) nextBtn.textContent = index === LESSONS.length - 1 ? 'Go to Assessment →' : 'Next lesson →';

  // Store currentLesson globally
  window.currentLesson = index;

  // Update nav
  if (typeof renderLessonNav === 'function') renderLessonNav();

  // Render content immediately — no API call
  window.renderFallbackLesson(index);
};

console.log('[LedgerLearn] Simulation patch loaded ✓');
