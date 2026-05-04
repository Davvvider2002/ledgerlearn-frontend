/**
 * LedgerLearn — Email Gate with Brevo
 * =====================================
 * Drop into learn.html just before </body>:
 *   <script src="/brevo.js"></script>
 *   <script src="/email-gate.js"></script>
 *
 * Requires brevo.js to be loaded first.
 */

(function () {
  const STORAGE_KEY = 'll_user';

  function getUser() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  }

  function saveUser(name, email) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, email, ts: Date.now() }));
  }

  function alreadyRegistered() {
    const u = getUser();
    return u && (u.email || u.skipped);
  }

  function injectStyles() {
    if (document.getElementById('ll-gate-styles')) return;
    const s = document.createElement('style');
    s.id = 'll-gate-styles';
    s.textContent = `
      #ll-gate-overlay {
        position:fixed;inset:0;z-index:9999;
        background:rgba(7,18,36,0.88);
        backdrop-filter:blur(8px);
        display:flex;align-items:center;justify-content:center;
        padding:1rem;
        animation:llFadeIn 0.3s ease;
      }
      @keyframes llFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes llSlideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}

      #ll-gate-card{
        background:#0B1F3A;
        border:1px solid rgba(212,168,67,0.25);
        border-radius:18px;
        padding:2.5rem 2rem;
        max-width:420px;width:100%;
        box-shadow:0 32px 80px rgba(0,0,0,0.5);
        animation:llSlideUp 0.35s 0.05s ease both;
      }

      .ll-hex{
        width:44px;height:44px;background:#D4A843;
        clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
        margin:0 auto 1.25rem;
      }

      #ll-gate-card h2{
        font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:700;
        color:#fff;text-align:center;margin-bottom:0.5rem;letter-spacing:-0.02em;
      }

      .ll-gate-sub{
        font-size:0.875rem;color:rgba(255,255,255,0.5);
        text-align:center;line-height:1.6;margin-bottom:1.5rem;
        font-family:'DM Sans',sans-serif;
      }

      .ll-gate-sub strong{color:#1DA98A;font-weight:600;}

      .ll-gate-perks{display:flex;flex-direction:column;gap:7px;margin-bottom:1.5rem;}

      .ll-gate-perk{
        display:flex;align-items:center;gap:10px;
        font-size:0.8rem;color:rgba(255,255,255,0.55);
        font-family:'DM Sans',sans-serif;
      }

      .ll-perk-check{
        width:16px;height:16px;flex-shrink:0;background:#1DA98A;
        clip-path:polygon(14% 44%,0 65%,50% 100%,100% 16%,80% 0%,43% 62%);
      }

      .ll-gate-input{
        width:100%;background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.12);border-radius:8px;
        padding:13px 16px;font-family:'DM Sans',sans-serif;
        font-size:0.9rem;color:#fff;outline:none;margin-bottom:10px;
        transition:border-color 0.2s;box-sizing:border-box;
      }

      .ll-gate-input::placeholder{color:rgba(255,255,255,0.28);}
      .ll-gate-input:focus{border-color:rgba(29,169,138,0.55);}
      .ll-gate-input.error{border-color:rgba(255,100,100,0.6);}

      #ll-gate-submit{
        width:100%;background:#D4A843;color:#0B1F3A;
        border:none;border-radius:8px;padding:14px;
        font-family:'DM Sans',sans-serif;font-size:0.95rem;font-weight:700;
        cursor:pointer;margin-top:4px;
        transition:background 0.2s,transform 0.15s,box-shadow 0.2s;
        display:flex;align-items:center;justify-content:center;gap:8px;
      }

      #ll-gate-submit:hover{background:#f0c860;transform:translateY(-1px);box-shadow:0 6px 20px rgba(212,168,67,0.35);}
      #ll-gate-submit:disabled{opacity:0.7;cursor:default;transform:none;}

      #ll-gate-skip{
        display:block;text-align:center;margin-top:1rem;
        font-size:0.78rem;color:rgba(255,255,255,0.28);
        cursor:pointer;font-family:'DM Sans',sans-serif;
        background:none;border:none;width:100%;transition:color 0.2s;
      }

      #ll-gate-skip:hover{color:rgba(255,255,255,0.55);}

      #ll-gate-error{
        font-size:0.78rem;color:#ff6b6b;
        font-family:'DM Sans',sans-serif;
        margin-bottom:8px;display:none;text-align:center;
      }

      .ll-spinner{
        width:16px;height:16px;
        border:2px solid rgba(11,31,58,0.3);border-top-color:#0B1F3A;
        border-radius:50%;animation:llSpin 0.6s linear infinite;display:none;
      }

      @keyframes llSpin{to{transform:rotate(360deg)}}
    `;
    document.head.appendChild(s);
  }

  function showGate(onComplete) {
    injectStyles();

    const overlay = document.createElement('div');
    overlay.id = 'll-gate-overlay';
    overlay.innerHTML = `
      <div id="ll-gate-card">
        <div class="ll-hex"></div>
        <h2>Save your progress &amp; certificate</h2>
        <p class="ll-gate-sub">Your <strong>first module is completely free</strong>. Enter your details so we can save where you left off and send your certificate when you pass.</p>
        <div class="ll-gate-perks">
          <div class="ll-gate-perk"><div class="ll-perk-check"></div>Progress saved across sessions</div>
          <div class="ll-gate-perk"><div class="ll-perk-check"></div>Certificate emailed on passing</div>
          <div class="ll-gate-perk"><div class="ll-perk-check"></div>One-click LinkedIn share</div>
        </div>
        <input class="ll-gate-input" id="ll-gate-name" type="text" placeholder="Your full name" autocomplete="name"/>
        <input class="ll-gate-input" id="ll-gate-email" type="email" placeholder="Your email address" autocomplete="email"/>
        <div id="ll-gate-error"></div>
        <button id="ll-gate-submit">
          <span id="ll-gate-btn-text">Start free module →</span>
          <div class="ll-spinner" id="ll-gate-spinner"></div>
        </button>
        <button id="ll-gate-skip">Skip for now — I'll save later</button>
      </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('ll-gate-name')?.focus(), 400);

    document.getElementById('ll-gate-submit').addEventListener('click', async () => {
      const name  = document.getElementById('ll-gate-name').value.trim();
      const email = document.getElementById('ll-gate-email').value.trim();
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const errEl = document.getElementById('ll-gate-error');

      if (!name || !emailValid) {
        errEl.style.display = 'block';
        errEl.textContent = !name ? 'Please enter your name.' : 'Please enter a valid email address.';
        if (!name) document.getElementById('ll-gate-name').classList.add('error');
        if (!emailValid) document.getElementById('ll-gate-email').classList.add('error');
        return;
      }

      // Loading state
      errEl.style.display = 'none';
      const btn = document.getElementById('ll-gate-submit');
      btn.disabled = true;
      document.getElementById('ll-gate-btn-text').textContent = 'Saving...';
      document.getElementById('ll-gate-spinner').style.display = 'block';

      // Always save locally first — belt and braces
      saveUser(name, email);

      // Push to Brevo list 3 (Xero Signups)
      if (window.BREVO) {
        await window.BREVO.addContact(email, name, window.BREVO.config.lists.xero, {
          SOURCE: 'learn-gate',
        });
      }

      // Dismiss overlay
      overlay.style.animation = 'llFadeIn 0.2s ease reverse';
      setTimeout(() => { overlay.remove(); onComplete(name, email); }, 220);
    });

    document.getElementById('ll-gate-skip').addEventListener('click', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ skipped: true, ts: Date.now() }));
      overlay.style.animation = 'llFadeIn 0.2s ease reverse';
      setTimeout(() => { overlay.remove(); onComplete(null, null); }, 220);
    });

    ['ll-gate-name','ll-gate-email'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        document.getElementById(id).classList.remove('error');
        document.getElementById('ll-gate-error').style.display = 'none';
      });
    });
  }

  function init() {
    if (alreadyRegistered()) return;
    setTimeout(() => { if (!alreadyRegistered()) showGate((n, e) => {}); }, 800);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
