/**
 * LedgerLearn — Brevo Integration
 * ================================
 * Shared module for all Brevo API calls across LedgerLearn.
 *
 * SETUP: Replace YOUR_BREVO_API_KEY below with your real key.
 * Generate at: app.brevo.com → avatar → SMTP & API → API Keys
 *
 * NEVER paste your real key in chat or commit it to a public repo.
 * For production, move the key to a Netlify environment variable.
 */

const BREVO_CONFIG = {
  apiKey: 'YOUR_BREVO_API_KEY',   // ← paste your new key here only
  lists: {
    xero:    3,   // LedgerLearn — Xero Signups
    qb:      4,   // LedgerLearn — QB Waitlist
    general: 5,   // LedgerLearn — General
  },
  endpoint: 'https://api.brevo.com/v3/contacts',
};

/**
 * addContactToBrevo
 * @param {string} email      - required
 * @param {string} name       - optional
 * @param {number} listId     - use BREVO_CONFIG.lists.*
 * @param {object} attributes - optional extra fields e.g. { SOURCE: 'xero-gate' }
 * @returns {Promise<{ok: boolean, status: number, body: any}>}
 */
async function addContactToBrevo(email, name = '', listId, attributes = {}) {
  if (!email || !listId) {
    console.warn('[Brevo] Missing email or listId');
    return { ok: false, status: 0, body: null };
  }

  const payload = {
    email: email.toLowerCase().trim(),
    listIds: [listId],
    updateEnabled: true,   // update contact if already exists
    attributes: {
      ...attributes,
      ...(name ? { FIRSTNAME: name.split(' ')[0], LASTNAME: name.split(' ').slice(1).join(' ') } : {}),
    },
  };

  try {
    const res = await fetch(BREVO_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_CONFIG.apiKey,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));

    if (res.ok || res.status === 204) {
      console.log('[Brevo] Contact added:', email, '→ list', listId);
      return { ok: true, status: res.status, body };
    } else {
      console.error('[Brevo] API error:', res.status, body);
      return { ok: false, status: res.status, body };
    }
  } catch (err) {
    console.error('[Brevo] Network error:', err);
    return { ok: false, status: 0, body: null };
  }
}

// Export for use in other scripts on the same page
window.BREVO = {
  config: BREVO_CONFIG,
  addContact: addContactToBrevo,
};
