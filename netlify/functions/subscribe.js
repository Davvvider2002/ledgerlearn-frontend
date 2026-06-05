/**
 * LedgerLearn — Netlify Function: subscribe
 * ==========================================
 * Lists:
 *   3 = Xero Signups
 *   4 = QB Waitlist
 *   5 = General
 *   6 = L1 Completers  (fires upsell-to-L2 automation)
 *   7 = L2 Purchasers  (exit condition on L1 nurture sequence)
 *
 * action='add-to-list':
 *   1. Upsert contact (create or update) via POST /contacts
 *   2. Add to specific list via POST /contacts/lists/{id}/contacts/add
 *   Both steps required — Brevo's list endpoint rejects unknown emails.
 */

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
  }

  const email  = (body.email  || '').toLowerCase().trim();
  const name   = (body.name   || '').trim();
  const listId = parseInt(body.listId, 10);
  const source = body.source  || 'unknown';
  const action = body.action  || 'subscribe';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid email' }) };
  }
  if (![3, 4, 5, 6, 7].includes(listId)) {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid list ID' }) };
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('[subscribe] BREVO_API_KEY not set');
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server config error' }) };
  }

  const brevoHeaders = { 'Content-Type': 'application/json', 'api-key': apiKey };
  const parts = name.split(' ');

  if (action === 'add-to-list') {
    // Step 1: Upsert the contact so it exists in Brevo before adding to list
    try {
      await fetch('https://api.brevo.com/v3/contacts', {
        method:  'POST',
        headers: brevoHeaders,
        body: JSON.stringify({
          email,
          listIds:       [listId],
          updateEnabled: true,
          attributes: {
            SOURCE: source,
            ...(parts[0] ? { FIRSTNAME: parts[0] } : {}),
            ...(parts[1] ? { LASTNAME: parts.slice(1).join(' ') } : {}),
          },
        }),
      });
      // 201 = created, 204 = updated — both are success. Ignore duplicate errors.
    } catch (e) {
      console.warn('[subscribe] upsert warning (non-fatal):', e.message);
    }

    // Step 2: Add to the specific list — triggers Brevo automation
    try {
      const res = await fetch(
        `https://api.brevo.com/v3/contacts/lists/${listId}/contacts/add`,
        {
          method:  'POST',
          headers: brevoHeaders,
          body:    JSON.stringify({ emails: [email] }),
        }
      );
      // 204 = success (no body), 400 with code ContactsNotFound = contact upsert failed
      if (res.ok || res.status === 204) {
        console.log(`[subscribe] ✓ add-to-list ${email} → list ${listId}`);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }
      const errBody = await res.json().catch(() => ({}));
      console.error('[subscribe] add-to-list error:', res.status, JSON.stringify(errBody));
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Brevo list error', detail: errBody }) };
    } catch (err) {
      console.error('[subscribe] add-to-list network error:', err.message);
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Network error' }) };
    }
  }

  // Default action: 'subscribe' — add contact to list via upsert only
  try {
    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method:  'POST',
      headers: brevoHeaders,
      body: JSON.stringify({
        email,
        listIds:       [listId],
        updateEnabled: true,
        attributes: {
          SOURCE: source,
          ...(parts[0] ? { FIRSTNAME: parts[0] } : {}),
          ...(parts[1] ? { LASTNAME: parts.slice(1).join(' ') } : {}),
        },
      }),
    });
    if (res.ok || res.status === 204) {
      console.log(`[subscribe] ✓ subscribe ${email} → list ${listId}`);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }
    const err = await res.json().catch(() => ({}));
    console.error('[subscribe] Brevo error:', res.status, err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Brevo API error' }) };
  } catch (err) {
    console.error('[subscribe] Network error:', err.message);
  
  // ── SEND DOWNLOAD LINK (email verification + delivery) ──────────
  if (action === 'send-download-link') {
    const { downloadUrl, productName } = body;
    if (!email || !downloadUrl) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'email and downloadUrl required' }) };
    }

    // 1. Add contact to Brevo list (confirms email is real — double opt-in equivalent)
    try {
      await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: brevoHeaders,
        body: JSON.stringify({
          email,
          listIds: [listId || 3],
          updateEnabled: true,
          attributes: { FIRSTNAME: parts[0]||'', LASTNAME: parts.slice(1).join(' ')||'', SOURCE: 'marketplace-free-download' }
        })
      });
    } catch(e) {}

    // 2. Send transactional email with the download link
    const emailBody = {
      to: [{ email, name: name || email.split('@')[0] }],
      sender: { name: 'LedgerLearn Pro', email: 'hello@ledgerlearn.pro' },
      subject: 'Your free download: ' + (productName || 'AI Prompt Starter Pack'),
      htmlContent: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;">
          <div style="background:#0B1F3A;padding:2rem;text-align:center;">
            <span style="font-size:1.4rem;font-weight:900;color:#ffffff;">Ledger<span style="color:#ea580c;">Learn</span> Pro</span>
          </div>
          <div style="padding:2rem;">
            <h2 style="color:#0B1F3A;font-size:1.3rem;margin-bottom:.5rem;">Here is your free download</h2>
            <p style="color:#374151;font-size:.95rem;line-height:1.6;margin-bottom:1.5rem;">
              Hi ${name || 'there'},<br><br>
              Thanks for downloading the <strong>${productName || 'AI Prompt Starter Pack for Accountants'}</strong> from LedgerLearn Pro.
              Click the button below to access your resource:
            </p>
            <div style="text-align:center;margin:2rem 0;">
              <a href="${downloadUrl}" style="display:inline-block;background:#1DA98A;color:#ffffff;padding:14px 32px;border-radius:9px;font-weight:700;font-size:1rem;text-decoration:none;">
                Open your free resource &rarr;
              </a>
            </div>
            <p style="color:#6b7280;font-size:.82rem;line-height:1.5;">
              The link above takes you directly to your resource online. Bookmark it for easy access.<br><br>
              To get 50+ more accounting AI prompts, check out the <a href="https://ledgerlearn.pro/marketplace" style="color:#1DA98A;">AI Accountant Toolkit v1 ($49)</a> in our marketplace.
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:1.5rem 0;">
            <p style="color:#9ca3af;font-size:.75rem;">
              You received this because you requested a free download from ledgerlearn.pro.
              <a href="https://ledgerlearn.pro" style="color:#9ca3af;">Unsubscribe</a>
            </p>
          </div>
        </div>
      `
    };

    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: brevoHeaders,
        body: JSON.stringify(emailBody)
      });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, sent: true }) };
    } catch(e) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Email send failed' }) };
    }
  }

    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Network error' }) };
  }
};
