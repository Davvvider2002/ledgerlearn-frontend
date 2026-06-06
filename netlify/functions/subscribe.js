/**
 * LedgerLearn — Netlify Function: subscribe
 * ==========================================
 * Lists:
 *   3  = Xero Signups
 *   4  = QB Waitlist
 *   5  = General
 *   6  = L1 Completers
 *   7  = L2 Purchasers
 *   11 = Marketplace Downloads
 *
 * Actions:
 *   add-to-list          — upsert contact + add to Brevo list
 *   send-download-link   — send branded email with download link (no listId gate)
 */

exports.handler = async function (event) {
  var headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: headers, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  var body = {};
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) {
    return { statusCode: 400, headers: headers, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
  }

  var email    = (body.email   || '').toLowerCase().trim();
  var name     = (body.name    || '').trim();
  var listId   = parseInt(body.listId, 10);
  var source   = body.source   || 'unknown';
  var action   = body.action   || 'subscribe';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: headers, body: JSON.stringify({ ok: false, error: 'Invalid email' }) };
  }

  // ── SEND DOWNLOAD LINK ─────────────────────────────────────
  // Exempt from listId gate — handles its own Brevo + email flow
  if (action === 'send-download-link') {
    var downloadUrl  = body.downloadUrl  || '';
    var productName  = body.productName  || 'AI Prompt Starter Pack for Accountants';

    if (!downloadUrl) {
      return { statusCode: 400, headers: headers, body: JSON.stringify({ ok: false, error: 'downloadUrl required' }) };
    }

    var apiKeyDL = process.env.BREVO_API_KEY;
    if (!apiKeyDL) {
      return { statusCode: 500, headers: headers, body: JSON.stringify({ ok: false, error: 'Server config error' }) };
    }
    var brevoHdrsDL = { 'Content-Type': 'application/json', 'api-key': apiKeyDL };
    var nameParts = name.split(' ');

    // 1. Add to Brevo list 11 (Marketplace Downloads)
    try {
      await fetch('https://api.brevo.com/v3/contacts', {
        method:  'POST',
        headers: brevoHdrsDL,
        body:    JSON.stringify({
          email:         email,
          listIds:       [11],
          updateEnabled: true,
          attributes: {
            FIRSTNAME: nameParts[0] || '',
            LASTNAME:  nameParts.slice(1).join(' ') || '',
            SOURCE:    'marketplace-free-download'
          }
        })
      });
    } catch (e) {
      console.warn('[subscribe] Brevo contact upsert error:', e.message);
    }

    // 2. Send transactional email (no template literals — plain string concat)
    var greeting    = name ? ('Hi ' + name + ',') : 'Hi there,';
    var subjectLine = 'Your free download is here — ' + productName;
    var btnStyle    = 'display:inline-block;background:#1DA98A;color:#ffffff;padding:16px 36px;border-radius:10px;font-weight:700;font-size:16px;text-decoration:none;';
    var upsellUrl   = 'https://ledgerlearn.pro/marketplace';

    var emailHtml = [
      '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>',
      '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;">',
      '<div style="background:#0B1F3A;padding:28px 32px;text-align:center;">',
      '<span style="font-size:22px;font-weight:900;color:#ffffff;">',
      'Ledger<span style="color:#ea580c;">Learn</span> Pro',
      '</span></div>',
      '<div style="padding:32px;">',
      '<h2 style="color:#0B1F3A;font-size:20px;margin:0 0 8px;">Your free resource is ready!</h2>',
      '<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">',
      greeting, '<br><br>',
      'Thanks for downloading <strong>', productName, '</strong>.',
      ' Click below to open it — bookmark it for easy access later.',
      '</p>',
      '<div style="text-align:center;margin:28px 0;">',
      '<a href="', downloadUrl, '" style="', btnStyle, '">',
      '&#x21E9;&nbsp; Open free resource',
      '</a></div>',
      '<div style="background:#f8f7f4;border-radius:10px;padding:20px 24px;margin:24px 0;">',
      '<p style="color:#0B1F3A;font-size:14px;font-weight:700;margin:0 0 8px;">',
      'Want 50+ more accounting AI prompts?</p>',
      '<p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 12px;">',
      'The AI Accountant Toolkit v1 covers month-end close, tax prep, client communication,',
      ' reconciliation, report writing, advisory, marketing, and ERP — 50+ copy-paste prompts.',
      '</p>',
      '<a href="', upsellUrl, '" style="color:#1DA98A;font-size:13px;font-weight:600;text-decoration:none;">',
      'Get the full toolkit ($49) &rarr;</a>',
      '</div>',
      '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">',
      '<p style="color:#9ca3af;font-size:12px;line-height:1.5;margin:0;">',
      'You received this because you requested a free download from ',
      '<a href="https://ledgerlearn.pro" style="color:#9ca3af;">ledgerlearn.pro</a>.',
      '</p></div></div></body></html>'
    ].join('');

    var emailPayload = {
      to:          [{ email: email, name: name || email.split('@')[0] }],
      sender:      { name: 'LedgerLearn Pro', email: 'hello@ledgerlearn.pro' },
      subject:     subjectLine,
      htmlContent: emailHtml
    };

    try {
      var emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method:  'POST',
        headers: brevoHdrsDL,
        body:    JSON.stringify(emailPayload)
      });
      var emailData = await emailRes.json();
      console.log('[subscribe] send-download-link status:', emailRes.status, JSON.stringify(emailData));

      if (emailRes.status >= 400) {
        return { statusCode: 500, headers: headers, body: JSON.stringify({ ok: false, error: 'Email send failed', detail: emailData }) };
      }
      return { statusCode: 200, headers: headers, body: JSON.stringify({ ok: true, sent: true, messageId: emailData.messageId || null }) };
    } catch (e) {
      console.error('[subscribe] send-download-link email error:', e.message);
      return { statusCode: 500, headers: headers, body: JSON.stringify({ ok: false, error: e.message }) };
    }
  }

  // ── listId gate for all other actions ─────────────────────
  if (![3, 4, 5, 6, 7, 11].includes(listId)) {
    return { statusCode: 400, headers: headers, body: JSON.stringify({ ok: false, error: 'Invalid list ID: ' + listId }) };
  }

  var apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('[subscribe] BREVO_API_KEY not set');
    return { statusCode: 500, headers: headers, body: JSON.stringify({ ok: false, error: 'Server config error' }) };
  }

  var brevoHeaders = { 'Content-Type': 'application/json', 'api-key': apiKey };
  var parts = name.split(' ');

  if (action === 'add-to-list') {
    // Step 1: Upsert the contact
    try {
      await fetch('https://api.brevo.com/v3/contacts', {
        method:  'POST',
        headers: brevoHeaders,
        body:    JSON.stringify({
          email:         email,
          listIds:       [listId],
          updateEnabled: true,
          attributes: {
            SOURCE:    source,
            FIRSTNAME: parts[0]    || '',
            LASTNAME:  parts.slice(1).join(' ') || '',
          }
        })
      });
    } catch (e) {
      console.warn('[subscribe] contact upsert error:', e.message);
    }

    // Step 2: Add to list explicitly (required — Brevo rejects unknown emails)
    try {
      await fetch('https://api.brevo.com/v3/contacts/lists/' + listId + '/contacts/add', {
        method:  'POST',
        headers: brevoHeaders,
        body:    JSON.stringify({ emails: [email] })
      });
    } catch (e) {
      console.warn('[subscribe] add-to-list error:', e.message);
    }

    return { statusCode: 200, headers: headers, body: JSON.stringify({ ok: true }) };
  }

  // Default / fallback
  return { statusCode: 200, headers: headers, body: JSON.stringify({ ok: true }) };
};
