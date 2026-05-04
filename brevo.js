/**
 * LedgerLearn — Brevo Client
 * ===========================
 * Sends signups to the Netlify serverless function at /.netlify/functions/subscribe
 * which then calls Brevo securely using a server-side environment variable.
 *
 * NO API KEY IN THIS FILE. Safe to commit to GitHub.
 *
 * Usage (same interface as before):
 *   await window.BREVO.addContact(email, name, listId, { SOURCE: 'learn-gate' });
 */

(function () {

  const LISTS = {
    xero:    3,   // LedgerLearn — Xero Signups
    qb:      4,   // LedgerLearn — QB Waitlist
    general: 5,   // LedgerLearn — General
  };

  /**
   * addContact — sends a signup to the secure Netlify function
   * @param {string} email
   * @param {string} name
   * @param {number} listId   — use BREVO.config.lists.*
   * @param {object} attrs    — optional e.g. { SOURCE: 'learn-gate' }
   */
  async function addContact(email, name, listId, attrs = {}) {
    if (!email || !listId) {
      console.warn('[BREVO] Missing email or listId — skipping');
      return { ok: false };
    }

    try {
      const res = await fetch('/.netlify/functions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name:   name || '',
          listId,
          source: attrs.SOURCE || 'unknown',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (data.ok) {
        console.log('[BREVO] ✓ Contact saved:', email, '→ list', listId);
      } else {
        console.warn('[BREVO] ✗ Failed:', data.error || 'unknown error');
      }

      return data;

    } catch (err) {
      // Never crash the page — silently log and move on
      console.warn('[BREVO] Network error — contact not saved:', err.message);
      return { ok: false };
    }
  }

  // Expose globally
  window.BREVO = {
    config: { lists: LISTS },
    addContact,
  };

})();
