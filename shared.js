// LedgerLearn Pro — shared utilities
const LL = {
  WORKER_URL: 'https://ledgerlearn-api.godigitsall.workers.dev',

  // ── Supabase (fill in after project setup) ──────────────────
  SUPABASE_URL: '',       // e.g. https://xxxx.supabase.co
  SUPABASE_ANON_KEY: '',  // anon public key

  // ── Stripe ───────────────────────────────────────────────────
  STRIPE_PK: '',          // pk_live_xxx or pk_test_xxx
  XERO_PRICE_ID: '',      // price_xxx from Stripe dashboard

  // ── ConvertKit ───────────────────────────────────────────────
  CK_FORM_ID: '',         // numeric form ID

  // ── ERP Academy upsell ───────────────────────────────────────
  ACADEMY_URL: 'https://skool.com/erp-saas-academy',
  ACADEMY_DISCOUNT: 'LEDGER30',

  // ── API helpers ──────────────────────────────────────────────
  async callWorker(path, body) {
    const res = await fetch(this.WORKER_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Worker error ${res.status}`);
    return res.json();
  },

  async getFeedback(question, selectedAnswer, correctAnswer, isCorrect) {
    return this.callWorker('/api/feedback', { question, selectedAnswer, correctAnswer, isCorrect });
  },

  async generateScenario(track, module, difficulty = 'intermediate') {
    return this.callWorker('/api/generate-scenario', { track, module, difficulty });
  },

  // ── Local storage helpers ────────────────────────────────────
  getProgress() {
    try { return JSON.parse(localStorage.getItem('ll_progress') || '{}'); } catch { return {}; }
  },
  saveProgress(data) {
    localStorage.setItem('ll_progress', JSON.stringify({ ...this.getProgress(), ...data }));
  },
  getUser() {
    try { return JSON.parse(localStorage.getItem('ll_user') || 'null'); } catch { return null; }
  },
  saveUser(user) { localStorage.setItem('ll_user', JSON.stringify(user)); },
  clearUser() { localStorage.removeItem('ll_user'); localStorage.removeItem('ll_progress'); },

  // ── Toast ────────────────────────────────────────────────────
  toast(msg, type = 'success') {
    let t = document.getElementById('ll-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'll-toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = `toast toast-${type} show`;
    setTimeout(() => t.classList.remove('show'), 3200);
  },

  // ── Format date ──────────────────────────────────────────────
  formatDate(d = new Date()) {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
  },

  // ── Generate cert ID ─────────────────────────────────────────
  certId() {
    const n = Math.floor(Math.random() * 9000) + 1000;
    return `LLP-XCP1-${new Date().getFullYear()}-${n}`;
  },
};

// Expose globally
window.LL = LL;
