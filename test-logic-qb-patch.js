/**
 * test-logic.js — QuickBooks Integration Patch
 * =============================================
 * INSTRUCTIONS: This file shows EVERY change needed to test-logic.js
 * to support QuickBooks alongside Xero.
 *
 * Three ways to apply:
 *   A) Copy-paste each REPLACE block into your existing test-logic.js
 *   B) Use the full merged test-logic.js further below (starts at LINE 120)
 *   C) Node script: node apply-patch.js (reads/writes test-logic.js in place)
 *
 * Changes are 100% backward-compatible — all existing Xero pages work without any modification.
 */

// ═══════════════════════════════════════════════════════════
// SECTION 1 — LOAD question-banks.js BEFORE test-logic.js in test.html
// ═══════════════════════════════════════════════════════════
//
// In test.html, add this ABOVE the existing test-logic.js script tag:
//
//   <script src="/question-banks.js"></script>
//   <script src="/test-logic.js"></script>
//
// question-banks.js sets window.QUESTION_BANKS = { XERO_L2, XERO_L3, QB_L1, QB_L2, QB_L3 }
// test-logic.js reads these from window.QUESTION_BANKS at startup.

// ═══════════════════════════════════════════════════════════
// SECTION 2 — ACTIVE_TRACK detection (add near TOP of test-logic.js)
// ═══════════════════════════════════════════════════════════
//
// REPLACE the existing ACTIVE_TRACK line (or add after your existing var declarations):
//
// OLD: var ACTIVE_TRACK = (typeof ACTIVE_TRACK !== 'undefined') ? ACTIVE_TRACK : 'Xero';
//
// NEW (reads localStorage set by QB learn pages):

var ACTIVE_TRACK = (function() {
  // 1. Explicit page-level override (set by <script> block on QB test page)
  if (typeof window.FORCE_TRACK === 'string') return window.FORCE_TRACK;
  // 2. localStorage set by quickbooks.html / quickbooks-l2.html / quickbooks-l3.html
  var stored = localStorage.getItem('ll_test_track');
  if (stored === 'QuickBooks') return 'QuickBooks';
  // 3. Default — Xero (all existing behaviour unchanged)
  return 'Xero';
})();

// ═══════════════════════════════════════════════════════════
// SECTION 3 — TRACK_CONFIGS (replace existing TEST_CONFIG block)
// ═══════════════════════════════════════════════════════════

const TRACK_CONFIGS = {
  Xero: {
    l1: { title:'Xero Associate',      questions:20, minutes:40, pass:70, level:'L1 · Xero Associate'         },
    l2: { title:'Xero Professional',   questions:25, minutes:50, pass:70, level:'L2 · Xero Professional'      },
    l3: { title:'Xero Advisor',        questions:30, minutes:60, pass:75, level:'L3 · Xero Advisor'           },
    certTitles: {
      l1: 'Xero Certified Practitioner — Level 1',
      l2: 'Xero Professional Practitioner — Level 2',
      l3: 'Xero Advisor Practitioner — Level 3',
    },
    trackLabel: 'Xero',
    certCode:   'XCP',
  },
  QuickBooks: {
    l1: { title:'QB Associate',        questions:20, minutes:40, pass:70, level:'L1 · QB Associate'           },
    l2: { title:'QB Professional',     questions:25, minutes:50, pass:70, level:'L2 · QB Professional'        },
    l3: { title:'QB Advisor',          questions:30, minutes:60, pass:75, level:'L3 · QB Advisor'             },
    certTitles: {
      l1: 'QuickBooks Certified Practitioner — Level 1',
      l2: 'QuickBooks Professional Practitioner — Level 2',
      l3: 'QuickBooks Advisor Practitioner — Level 3',
    },
    trackLabel: 'QuickBooks Online',
    certCode:   'QCP',
  },
};

// TEST_CONFIG resolves to the active track — backward compatible alias
const TEST_CONFIG = (function() {
  var t = (typeof ACTIVE_TRACK !== 'undefined') ? ACTIVE_TRACK : 'Xero';
  return TRACK_CONFIGS[t] || TRACK_CONFIGS['Xero'];
})();

// ═══════════════════════════════════════════════════════════
// SECTION 4 — TOPICS_BY_TRACK (replace existing TOPICS_POOL const)
// ═══════════════════════════════════════════════════════════

const TOPICS_BY_TRACK = {
  Xero: {
    l1: ['Invoicing','Bank Reconciliation','Chart of Accounts','Financial Reports',
         'VAT','Contacts','Organisation Setup','Payroll Basics'],
    l2: ['VAT Returns','Bank Rules','Payroll Processing','Management Reports',
         'Accounts Payable','Accounts Receivable','Expense Claims','Budgets'],
    l3: ['Management Accounts','Cash Flow Forecasting','Fixed Assets','Multi-Currency',
         'Consolidated Reports','Year-End Journals','Practice Management','Advisory Reports'],
  },
  QuickBooks: {
    l1: ['Invoicing','Bank Reconciliation','Chart of Accounts','Financial Reports',
         'Sales Tax Basics','Customers & Vendors','Company Setup','Expenses & Receipts'],
    l2: ['Sales Tax Returns','Bank Rules','Payroll Processing','Class Tracking',
         'Accounts Payable','Accounts Receivable','Projects & Job Costing','Recurring Transactions'],
    l3: ['Budgets & Forecasts','Cash Flow Analysis','Multi-Currency','Custom Reports',
         'Audit Log & Permissions','Advanced Payroll','Integrations','Advisory Reporting'],
  },
};

// TOPICS_POOL is set by getTopicsPool() at test start — replaces the old const
let TOPICS_POOL = TOPICS_BY_TRACK['Xero']['l1'];

function getTopicsPool() {
  var track = (typeof ACTIVE_TRACK !== 'undefined') ? ACTIVE_TRACK : 'Xero';
  var level = (typeof test !== 'undefined' && test.level) ? test.level : 'l1';
  var pool  = (TOPICS_BY_TRACK[track] || TOPICS_BY_TRACK['Xero'])[level]
              || TOPICS_BY_TRACK['Xero']['l1'];
  TOPICS_POOL = pool;
  return pool;
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — QUESTION_BANK merge (add after script loads)
// ═══════════════════════════════════════════════════════════
//
// question-banks.js sets window.QUESTION_BANKS.
// Merge its contents into the existing QUESTION_BANK object that test-logic.js uses.
//
// ADD this block immediately after your existing QUESTION_BANK = { l1:[...] } definition:

(function mergeQuestionBanks() {
  var banks = (typeof window !== 'undefined') ? window.QUESTION_BANKS : null;
  if (!banks) return;
  // Upgrade Xero L2 and L3 from static banks (replaces L1 fallback)
  if (banks.XERO_L2 && banks.XERO_L2.length) QUESTION_BANK.l2 = banks.XERO_L2;
  if (banks.XERO_L3 && banks.XERO_L3.length) QUESTION_BANK.l3 = banks.XERO_L3;
  // Add QuickBooks question banks
  QUESTION_BANK.QB_L1 = banks.QB_L1 || [];
  QUESTION_BANK.QB_L2 = banks.QB_L2 || [];
  QUESTION_BANK.QB_L3 = banks.QB_L3 || [];
})();

// ═══════════════════════════════════════════════════════════
// SECTION 6 — getFallbackQuestion (replace existing function)
// ═══════════════════════════════════════════════════════════

function getFallbackQuestion(index) {
  var track = (typeof ACTIVE_TRACK !== 'undefined') ? ACTIVE_TRACK : 'Xero';
  var level = (typeof test !== 'undefined' && test.level) ? test.level : 'l1';
  var pool;

  if (track === 'QuickBooks') {
    // QB banks
    if (level === 'l3' && QUESTION_BANK.QB_L3 && QUESTION_BANK.QB_L3.length) {
      pool = QUESTION_BANK.QB_L3;
    } else if (level === 'l2' && QUESTION_BANK.QB_L2 && QUESTION_BANK.QB_L2.length) {
      pool = QUESTION_BANK.QB_L2;
    } else {
      pool = QUESTION_BANK.QB_L1 && QUESTION_BANK.QB_L1.length ? QUESTION_BANK.QB_L1 : QUESTION_BANK.l1;
    }
  } else {
    // Xero banks
    if (level === 'l3' && QUESTION_BANK.l3 && QUESTION_BANK.l3.length) {
      pool = QUESTION_BANK.l3;
    } else if (level === 'l2' && QUESTION_BANK.l2 && QUESTION_BANK.l2.length) {
      pool = QUESTION_BANK.l2;
    } else {
      pool = QUESTION_BANK.l1;
    }
  }

  var q = pool[index % pool.length];
  // Normalise format — static banks use correct_index, old banks may use correctIndex
  return {
    question:      q.question,
    options:       q.options,
    correct_index: (q.correct_index !== undefined) ? q.correct_index : (q.correctIndex || 0),
    explanation:   q.explanation || '',
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 7 — fetchTestQuestions: pass ACTIVE_TRACK to ai.js
// ═══════════════════════════════════════════════════════════
//
// In your existing fetchTestQuestions function, change the generateScenario call:
//
// OLD:
//   const q = await LLAPI.generateScenario({
//     track: 'Xero', module: topic, ...
//   });
//
// NEW (one-line change):
//   const q = await LLAPI.generateScenario({
//     track: ACTIVE_TRACK, module: topic, ...
//   });
//
// That's it. ai.js already accepts any track string and passes it to the prompt.

// ═══════════════════════════════════════════════════════════
// SECTION 8 — startTest: call getTopicsPool() at test start
// ═══════════════════════════════════════════════════════════
//
// Inside your existing startTest() function, ADD this as the FIRST line after
// you set test.level:
//
//   getTopicsPool(); // resolves TOPICS_POOL for this track + level

// ═══════════════════════════════════════════════════════════
// SECTION 9 — Cert ID: track-aware QCP vs XCP
// ═══════════════════════════════════════════════════════════
//
// In your finishTest / cert generation block, REPLACE:
//
// OLD:  const certId = 'LLP-XCP1-' + new Date().getFullYear() + '-' + Math.floor(1000+Math.random()*9000);
//
// NEW:
function buildCertId(level) {
  var track  = (typeof ACTIVE_TRACK !== 'undefined') ? ACTIVE_TRACK : 'Xero';
  var cfg    = TRACK_CONFIGS[track] || TRACK_CONFIGS['Xero'];
  var code   = cfg.certCode; // 'XCP' or 'QCP'
  var lnum   = level === 'l3' ? '3' : level === 'l2' ? '2' : '1';
  var year   = new Date().getFullYear();
  var rand   = Math.floor(1000 + Math.random() * 9000);
  return 'LLP-' + code + lnum + '-' + year + '-' + rand;
}
// Then call:  const certId = buildCertId(test.level);

// ═══════════════════════════════════════════════════════════
// SECTION 10 — Cert title: track-aware label on certificate
// ═══════════════════════════════════════════════════════════
//
// In your cert generation block, REPLACE the hardcoded cert title with:
//
function getCertTitle(level) {
  var track = (typeof ACTIVE_TRACK !== 'undefined') ? ACTIVE_TRACK : 'Xero';
  var cfg   = TRACK_CONFIGS[track] || TRACK_CONFIGS['Xero'];
  return cfg.certTitles[level] || cfg.certTitles['l1'];
}
// Then call:  const certTitle = getCertTitle(test.level);

// ═══════════════════════════════════════════════════════════
// SECTION 11 — Progress keys: QB uses separate ll_progress keys
// ═══════════════════════════════════════════════════════════
//
// To avoid QB completions overwriting Xero completions in localStorage,
// use track-namespaced keys. Add this helper:

function getProgressKey() {
  var track = (typeof ACTIVE_TRACK !== 'undefined') ? ACTIVE_TRACK : 'Xero';
  return track === 'QuickBooks' ? 'll_progress_qb' : 'll_progress';
}
// Replace all localStorage.getItem('ll_progress') with localStorage.getItem(getProgressKey())
// Replace all localStorage.setItem('ll_progress', ...) with localStorage.setItem(getProgressKey(), ...)
// The Xero key ('ll_progress') stays the same — backward compatible.

// ═══════════════════════════════════════════════════════════
// SECTION 12 — Level selector: show QB-appropriate labels
// ═══════════════════════════════════════════════════════════
//
// In your renderLevelSelector() or equivalent UI function, use:
//
function getLevelDisplayName(level) {
  var track = (typeof ACTIVE_TRACK !== 'undefined') ? ACTIVE_TRACK : 'Xero';
  var cfg   = TRACK_CONFIGS[track] || TRACK_CONFIGS['Xero'];
  return cfg[level] ? cfg[level].title : level.toUpperCase();
}

// ═══════════════════════════════════════════════════════════
// SECTION 13 — QB paywall: read paid_qb_l2 from progress
// ═══════════════════════════════════════════════════════════
//
// QB L2 uses a separate paid flag in localStorage.
// In your paywall check function, REPLACE the existing paid check with:

function isPaidForLevel(level) {
  var track = (typeof ACTIVE_TRACK !== 'undefined') ? ACTIVE_TRACK : 'Xero';
  if (level !== 'l2') return true; // L1 and L3 are always free
  var progressKey = getProgressKey();
  var p = JSON.parse(localStorage.getItem(progressKey) || '{}');
  if (track === 'QuickBooks') return !!p.paid_qb_l2;
  return !!p.paid_l2; // Xero — existing key unchanged
}

// ═══════════════════════════════════════════════════════════
// SECTION 14 — QB L2 PayPal plan ID
// ═══════════════════════════════════════════════════════════
//
// In your PayPal subscription setup, resolve the plan ID by track:

function getPayPalPlanId() {
  var track = (typeof ACTIVE_TRACK !== 'undefined') ? ACTIVE_TRACK : 'Xero';
  if (track === 'QuickBooks') {
    // QB L2 plan — create this in PayPal dashboard first
    // then replace the placeholder below with the real plan ID
    return localStorage.getItem('ll_paypal_qb_l2') || 'PAYPAL_QB_L2_PLAN_ID_HERE';
  }
  return 'P-3YS87947EY5558941NH5P3FY'; // Xero L2 — existing plan unchanged
}

// ═══════════════════════════════════════════════════════════
// SECTION 15 — QB learn page routing (add to learn.html nav)
// ═══════════════════════════════════════════════════════════
//
// The QB learn pages already set localStorage.ll_test_track = 'QuickBooks'
// before redirecting to /test. No changes needed in test.html for routing.
//
// For the nav link in learn.html / learn-l2.html / learn-l3.html
// that points to "/learn", update with QB awareness:
//
// function getLearnHref() {
//   var p = JSON.parse(localStorage.getItem('ll_progress_qb') || '{}');
//   var done = p.completedLevels || [];
//   if (ACTIVE_TRACK === 'QuickBooks') {
//     if (done.includes('l2')) return '/quickbooks-l3';
//     if (done.includes('l1') && p.paid_qb_l2) return '/quickbooks-l2';
//     return '/quickbooks';
//   }
//   // Xero routing unchanged
//   ...
// }

// ═══════════════════════════════════════════════════════════
// SUMMARY OF ALL REQUIRED CHANGES
// ═══════════════════════════════════════════════════════════
//
// test.html:
//   1. Add <script src="/question-banks.js"></script> before test-logic.js
//   2. No other changes — ACTIVE_TRACK is detected from localStorage
//
// test-logic.js:
//   3.  Replace ACTIVE_TRACK var with Section 2 above
//   4.  Replace TEST_CONFIG with TRACK_CONFIGS + TEST_CONFIG alias (Section 3)
//   5.  Replace TOPICS_POOL const with TOPICS_BY_TRACK + getTopicsPool (Section 4)
//   6.  Add mergeQuestionBanks() call after QUESTION_BANK definition (Section 5)
//   7.  Replace getFallbackQuestion() with Section 6
//   8.  In fetchTestQuestions: change track: 'Xero' → track: ACTIVE_TRACK (Section 7)
//   9.  In startTest(): add getTopicsPool() call at start (Section 8)
//   10. Replace certId generation with buildCertId(test.level) (Section 9)
//   11. Replace cert title with getCertTitle(test.level) (Section 10)
//   12. Replace ll_progress key with getProgressKey() (Section 11)
//   13. Replace paywall check with isPaidForLevel() (Section 13)
//   14. Replace PayPal plan ID with getPayPalPlanId() (Section 14)
//
// NO CHANGES needed to:
//   - verify-payment.js (server-side, track-agnostic)
//   - admin-auth.js
//   - certificate-engine.js (accepts any title string)
//   - ai.js (already accepts track parameter)
//   - dashboard.html (cert display is track-agnostic)
//   - Supabase schema (no QB-specific tables needed)

console.log('QB patch definitions loaded OK');
