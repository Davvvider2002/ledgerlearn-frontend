/**
 * LedgerLearn — softhub-api.js
 * ================================
 * Netlify function: all SoftHub vendor directory operations
 *
 * Public actions (no auth):
 *   get-listings   — fetch approved vendor listings (with filters)
 *   get-listing    — fetch single listing by ID
 *   apply-vendor   — submit vendor application (pending approval)
 *   request-demo   — practitioner requests demo from vendor
 *
 * Admin actions (JWT required):
 *   admin-get-listings  — all listings including pending
 *   admin-approve       — approve vendor listing
 *   admin-reject        — reject with reason
 *   admin-update        — update listing fields
 *   admin-get-requests  — all demo requests
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const json = (s, b) => ({ statusCode: s, headers: CORS, body: JSON.stringify(b) });

async function supa(path, method, body) {
  var url    = (process.env.SUPABASE_URL || '') + path;
  var key    = process.env.SUPABASE_SERVICE_KEY || '';
  var opts   = { method: method || 'GET', headers: { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'Prefer': method === 'POST' ? 'resolution=merge-duplicates,return=representation' : 'return=representation' } };
  if (body) opts.body = JSON.stringify(body);
  var res    = await fetch(url, opts);
  try { return await res.json(); } catch(e) { return null; }
}

function verifyAdminToken(event) {
  var auth   = (event.headers || {}).authorization || '';
  var token  = auth.replace('Bearer ', '').trim();
  var secret = process.env.ADMIN_SECRET || '';
  if (!token || !secret) return false;
  try {
    var dotIdx     = token.lastIndexOf('.');
    if (dotIdx < 0) return false;
    var payloadB64 = token.slice(0, dotIdx);
    var sig        = token.slice(dotIdx + 1);
    var payload    = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    if (payload.role !== 'admin') return false;
    var now        = Date.now();
    if (payload.expires && payload.expires < now) return false;
    var crypto     = require('crypto');
    var expected   = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
    return expected === sig;
  } catch(e) { return false; }
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });

  var body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) { return json(400, { error: 'Invalid JSON' }); }

  var action = body.action || '';

  // ── GET LISTINGS (public) ──────────────────────────────────
  if (action === 'get-listings') {
    var qs = '/rest/v1/vendor_listings?status=eq.approved&select=id,company_name,product_name,tagline,description,category,logo_url,website_url,plan_id,featured,editors_pick,verified_badge,created_at&order=featured.desc,created_at.desc';
    if (body.category) qs += '&category=eq.' + encodeURIComponent(body.category);
    var rows = await supa(qs);
    return json(200, { ok: true, data: Array.isArray(rows) ? rows : [] });
  }

  // ── GET SINGLE LISTING (public) ───────────────────────────
  if (action === 'get-listing') {
    if (!body.id) return json(400, { error: 'id required' });
    var rows = await supa('/rest/v1/vendor_listings?id=eq.' + encodeURIComponent(body.id) + '&status=eq.approved&select=*&limit=1');
    var listing = Array.isArray(rows) ? rows[0] : null;
    if (!listing) return json(404, { error: 'Listing not found' });
    return json(200, { ok: true, data: listing });
  }

  // ── APPLY VENDOR (public) ─────────────────────────────────
  if (action === 'apply-vendor') {
    var required = ['company_name','product_name','contact_name','contact_email','category','description','website_url'];
    for (var i = 0; i < required.length; i++) {
      if (!body[required[i]]) return json(400, { error: required[i] + ' is required' });
    }
    var email = body.contact_email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Invalid contact email' });

    // Check duplicate
    var exists = await supa('/rest/v1/vendor_listings?contact_email=eq.' + encodeURIComponent(email) + '&company_name=eq.' + encodeURIComponent(body.company_name) + '&select=id,status&limit=1');
    if (Array.isArray(exists) && exists.length) {
      return json(409, { error: 'A listing for this company already exists. Status: ' + exists[0].status });
    }

    var listing = {
      company_name:    body.company_name.trim(),
      product_name:    body.product_name.trim(),
      tagline:         (body.tagline   || '').trim() || null,
      description:     body.description.trim(),
      category:        body.category,
      logo_url:        (body.logo_url  || '').trim() || null,
      website_url:     body.website_url.trim(),
      demo_url:        (body.demo_url  || '').trim() || null,
      video_url:       (body.video_url || '').trim() || null,
      contact_name:    body.contact_name.trim(),
      contact_email:   email,
      contact_phone:   (body.contact_phone || '').trim() || null,
      plan_id:         'free',
      status:          'pending',
      created_at:      new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    };

    var result = await supa('/rest/v1/vendor_listings', 'POST', listing);

    // Notify admin via Brevo
    var BREVO  = process.env.BREVO_API_KEY || '';
    var ADMIN  = process.env.ADMIN_EMAIL   || 'godigitsall@gmail.com';
    if (BREVO) {
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': BREVO },
        body: JSON.stringify({
          to: [{ email: ADMIN }],
          sender: { name: 'LedgerLearn Pro', email: 'godigitsall@gmail.com' },
          subject: 'New SoftHub vendor application: ' + body.company_name,
          htmlContent: '<h3>New vendor application</h3><p><strong>Company:</strong> ' + body.company_name + '</p><p><strong>Product:</strong> ' + body.product_name + '</p><p><strong>Category:</strong> ' + body.category + '</p><p><strong>Contact:</strong> ' + body.contact_name + ' &lt;' + email + '&gt;</p><p><strong>Website:</strong> ' + body.website_url + '</p><p>Log into admin to approve or reject this listing.</p>'
        })
      }).catch(function(){});
    }

    // Confirmation to vendor
    if (BREVO) {
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': BREVO },
        body: JSON.stringify({
          to: [{ email: email, name: body.contact_name }],
          sender: { name: 'LedgerLearn Pro', email: 'godigitsall@gmail.com' },
          subject: 'We received your LedgerLearn SoftHub application',
          htmlContent: '<h2>Application received!</h2><p>Hi ' + body.contact_name + ',</p><p>Thanks for applying to list <strong>' + body.product_name + '</strong> on LedgerLearn SoftHub. We review all applications manually and will get back to you within 2 business days.</p><p>Once approved, your listing will be visible to our community of 135,000+ certified accounting professionals.</p><p>Questions? Reply to this email.</p><p>David Ayomidotun<br>LedgerLearn Pro</p>'
        })
      }).catch(function(){});
    }

    return json(200, { ok: true, message: 'Application submitted. We will review and respond within 2 business days.' });
  }

  // ── REQUEST DEMO (public) ─────────────────────────────────
  if (action === 'request-demo') {
    if (!body.vendor_id || !body.requester_name || !body.requester_email) {
      return json(400, { error: 'vendor_id, requester_name, and requester_email are required' });
    }

    var reqEmail = body.requester_email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reqEmail)) return json(400, { error: 'Invalid email' });

    // Fetch vendor
    var vendors = await supa('/rest/v1/vendor_listings?id=eq.' + encodeURIComponent(body.vendor_id) + '&status=eq.approved&select=id,company_name,product_name,contact_email,contact_name,plan_id,leads_used,leads_reset_at&limit=1');
    var vendor  = Array.isArray(vendors) ? vendors[0] : null;
    if (!vendor) return json(404, { error: 'Vendor listing not found or not active' });

    // Check lead quota for non-enterprise plans
    var plan = vendor.plan_id;
    if (plan === 'free') {
      return json(403, { error: 'This vendor is on the free plan and cannot receive demo requests. Please visit their website directly.' });
    }

    // Insert demo request
    var req = {
      vendor_id:       body.vendor_id,
      user_id:         body.user_id || null,
      requester_name:  body.requester_name.trim(),
      requester_email: reqEmail,
      requester_phone: (body.requester_phone || '').trim() || null,
      company_name:    (body.company_name || '').trim() || null,
      cert_level:      body.cert_level    || null,
      cert_specialty:  body.cert_specialty || null,
      country:         body.country        || null,
      message:         (body.message || '').trim() || null,
      status:          'new',
      lead_fee:        0,
      created_at:      new Date().toISOString(),
    };

    var inserted = await supa('/rest/v1/demo_requests', 'POST', req);

    // Increment leads_used
    await supa('/rest/v1/vendor_listings?id=eq.' + encodeURIComponent(body.vendor_id), 'PATCH', {
      leads_used: (vendor.leads_used || 0) + 1,
      updated_at: new Date().toISOString(),
    });

    // Forward lead to vendor
    var BREVO2 = process.env.BREVO_API_KEY || '';
    if (BREVO2 && vendor.contact_email) {
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': BREVO2 },
        body: JSON.stringify({
          to: [{ email: vendor.contact_email, name: vendor.contact_name }],
          sender: { name: 'LedgerLearn SoftHub', email: 'godigitsall@gmail.com' },
          subject: 'New demo request — LedgerLearn SoftHub',
          htmlContent: [
            '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">',
            '<div style="background:#0B1F3A;padding:20px 28px"><span style="font-size:18px;font-weight:900;color:#fff">Ledger<span style="color:#ea580c">Learn</span> SoftHub</span></div>',
            '<div style="padding:24px">',
            '<h2 style="color:#0B1F3A;margin-bottom:4px">New demo request</h2>',
            '<p style="color:#6b7280;font-size:14px;margin-bottom:20px">A certified accounting professional is requesting a demo of <strong>' + vendor.product_name + '</strong>.</p>',
            '<table style="width:100%;border-collapse:collapse;font-size:14px">',
            '<tr><td style="padding:8px 0;color:#6b7280;width:140px">Name</td><td style="padding:8px 0;font-weight:600">' + body.requester_name + '</td></tr>',
            '<tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0"><a href="mailto:' + reqEmail + '" style="color:#1DA98A">' + reqEmail + '</a></td></tr>',
            (body.requester_phone ? '<tr><td style="padding:8px 0;color:#6b7280">Phone</td><td style="padding:8px 0">' + body.requester_phone + '</td></tr>' : ''),
            (body.company_name    ? '<tr><td style="padding:8px 0;color:#6b7280">Company</td><td style="padding:8px 0">' + body.company_name + '</td></tr>' : ''),
            (body.cert_level      ? '<tr><td style="padding:8px 0;color:#6b7280">Cert level</td><td style="padding:8px 0"><strong style="color:#1DA98A">' + body.cert_level + '</strong></td></tr>' : ''),
            (body.cert_specialty  ? '<tr><td style="padding:8px 0;color:#6b7280">Specialty</td><td style="padding:8px 0">' + body.cert_specialty + '</td></tr>' : ''),
            (body.country         ? '<tr><td style="padding:8px 0;color:#6b7280">Country</td><td style="padding:8px 0">' + body.country + '</td></tr>' : ''),
            '</table>',
            (body.message ? '<div style="background:#f8f7f4;border-radius:8px;padding:14px;margin-top:16px"><p style="font-size:13px;color:#6b7280;margin-bottom:4px">Message</p><p style="font-size:14px;color:#1e3a5f">' + body.message + '</p></div>' : ''),
            '<p style="font-size:12px;color:#9ca3af;margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb">This lead was generated by LedgerLearn SoftHub. Please respond within 24 hours for best conversion rates.</p>',
            '</div></div>',
          ].join('')
        })
      }).catch(function(){});

      // Update status to forwarded
      if (Array.isArray(inserted) && inserted[0]) {
        await supa('/rest/v1/demo_requests?id=eq.' + encodeURIComponent(inserted[0].id), 'PATCH', {
          status: 'forwarded', forwarded_at: new Date().toISOString()
        });
      }
    }

    return json(200, { ok: true, message: 'Demo request submitted. The vendor will be in touch within 24 hours.' });
  }

  // ── ADMIN ACTIONS (JWT required) ──────────────────────────
  if (!verifyAdminToken(event)) return json(401, { error: 'Admin authentication required' });

  if (action === 'admin-get-listings') {
    var status = body.status || null;
    var qs = '/rest/v1/vendor_listings?select=*&order=created_at.desc';
    if (status) qs += '&status=eq.' + encodeURIComponent(status);
    var rows = await supa(qs);
    return json(200, { ok: true, data: Array.isArray(rows) ? rows : [] });
  }

  if (action === 'admin-approve') {
    if (!body.id) return json(400, { error: 'id required' });
    await supa('/rest/v1/vendor_listings?id=eq.' + encodeURIComponent(body.id), 'PATCH', {
      status: 'approved', approved_at: new Date().toISOString(),
      verified_badge: true, updated_at: new Date().toISOString()
    });

    // Notify vendor
    var vRows = await supa('/rest/v1/vendor_listings?id=eq.' + encodeURIComponent(body.id) + '&select=contact_email,contact_name,product_name,company_name&limit=1');
    var v = Array.isArray(vRows) ? vRows[0] : null;
    if (v && process.env.BREVO_API_KEY) {
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
        body: JSON.stringify({
          to: [{ email: v.contact_email, name: v.contact_name }],
          sender: { name: 'LedgerLearn Pro', email: 'godigitsall@gmail.com' },
          subject: 'Your LedgerLearn SoftHub listing is live!',
          htmlContent: '<h2>Your listing is approved!</h2><p>Hi ' + v.contact_name + ',</p><p>Great news — <strong>' + v.product_name + '</strong> is now live on LedgerLearn SoftHub and visible to our community of 135,000+ certified accounting professionals.</p><p>Your free listing includes basic visibility. To unlock demo requests and lead forwarding, upgrade to our Growth plan ($79/month) at <a href="https://ledgerlearn.pro/marketplace">ledgerlearn.pro/marketplace</a>.</p><p>David Ayomidotun<br>LedgerLearn Pro</p>'
        })
      }).catch(function(){});
    }
    return json(200, { ok: true });
  }

  if (action === 'admin-reject') {
    if (!body.id) return json(400, { error: 'id required' });
    await supa('/rest/v1/vendor_listings?id=eq.' + encodeURIComponent(body.id), 'PATCH', {
      status: 'rejected', rejection_reason: body.reason || null,
      updated_at: new Date().toISOString()
    });
    return json(200, { ok: true });
  }

  if (action === 'admin-update') {
    if (!body.id) return json(400, { error: 'id required' });
    var allowed = ['company_name','product_name','tagline','description','category','logo_url','website_url','demo_url','plan_id','featured','editors_pick','verified_badge','status'];
    var upd = { updated_at: new Date().toISOString() };
    allowed.forEach(function(k){ if (body[k] !== undefined) upd[k] = body[k]; });
    await supa('/rest/v1/vendor_listings?id=eq.' + encodeURIComponent(body.id), 'PATCH', upd);
    return json(200, { ok: true });
  }

  if (action === 'admin-get-requests') {
    var qs2 = '/rest/v1/demo_requests?select=*&order=created_at.desc&limit=200';
    if (body.vendor_id) qs2 += '&vendor_id=eq.' + encodeURIComponent(body.vendor_id);
    var rows2 = await supa(qs2);
    return json(200, { ok: true, data: Array.isArray(rows2) ? rows2 : [] });
  }

  return json(400, { error: 'Unknown action: ' + action });
};
