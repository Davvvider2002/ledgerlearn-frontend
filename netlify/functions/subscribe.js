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
  // send-download-link handles its own list assignment — exempt from listId gate
  if (action === 'send-download-link') {
    const { downloadUrl, productName } = body;
    if (!email || !downloadUrl) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'email and downloadUrl required' }) };
    }

    const apiKey2 = process.env.BREVO_API_KEY;
    if (!apiKey2) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server config error' }) };
    }
    const brevoHdrs = { 'Content-Type': 'application/json', 'api-key': apiKey2 };
    const nameParts = name.split(' ');

    // Add to Brevo list 8 (Marketplace Downloads) — create it in Brevo if not yet created
    try {
      await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: brevoHdrs,
        body: JSON.stringify({
          email,
          listIds: [11],
          updateEnabled: true,
          attributes: {
            FIRSTNAME: nameParts[0] || '',
            LASTNAME:  nameParts.slice(1).join(' ') || '',
            SOURCE:    'marketplace-free-download'
          }
        })
      });
    } catch(e) { console.warn('[subscribe] Brevo contact upsert:', e.message); }

    // Send transactional email
    const dlEmailBody = {
      to: [{ email, name: name || email.split('@')[0] }],
      sender: { name: 'LedgerLearn Pro', email: 'hello@ledgerlearn.pro' },
      subject: 'Your free download is here — ' + (productName || 'AI Prompt Starter Pack'),
      htmlContent: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;">
          <div style="background:#0B1F3A;padding:28px 32px;text-align:center;">
            <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
              Ledger<span style="color:#ea580c;">Learn</span> Pro
            </span>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#0B1F3A;font-size:20px;margin:0 0 8px;">Here is your free resource!</h2>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
              Hi ${name || 'there'},<br><br>
              Thanks for downloading <strong>${productName || 'the AI Prompt Starter Pack for Accountants'}</strong>.
              Click below to open it — bookmark it for easy access later.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${downloadUrl}"
                style="display:inline-block;background:#1DA98A;color:#ffffff;padding:16px 36px;
                       border-radius:10px;font-weight:700;font-size:16px;text-decoration:none;
                       letter-spacing:-0.2px;">
                &#x21E9;&nbsp; Open free resource
              </a>
            </div>
            <div style="background:#f8f7f4;border-radius:10px;padding:20px 24px;margin:24px 0;">
              <p style="color:#0B1F3A;font-size:14px;font-weight:700;margin:0 0 8px;">
                Want 50+ more accounting AI prompts?
              </p>
              <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 12px;">
                The AI Accountant Toolkit v1 covers month-end close, tax prep, client communication,
                reconciliation, report writing, advisory, marketing, and ERP — 50+ copy-paste prompts.
              </p>
              <a href="https://ledgerlearn.pro/marketplace"
                style="color:#1DA98A;font-size:13px;font-weight:600;text-decoration:none;">
                Get the full toolkit ($49) &rarr;
              </a>
            </div>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
            <p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">
              You received this because you requested a free download from
              <a href="https://ledgerlearn.pro" style="color:#9ca3af;">ledgerlearn.pro</a>.
              This is a one-time delivery email — we hate spam too.
            </p>
          </div>
        </div>
      </body></html>`
    };

    try {
      const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: brevoHdrs,
        body: JSON.stringify(dlEmailBody)
      });
      const emailData = await emailRes.json();
      console.log('[subscribe] send-download-link email result:', emailRes.status, JSON.stringify(emailData));
      if (emailRes.status >= 400) {
        return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Email send failed: ' + JSON.stringify(emailData) }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, sent: true }) };
    } catch(e) {
      console.error('[subscribe] send-download-link email error:', e.message);
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: e.message }) };
    }
  }

  // listId required for all other actions
  if (![3, 4, 5, 6, 7, 8, 11].includes(listId)) {
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


    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Network error' }) };
  }
};
