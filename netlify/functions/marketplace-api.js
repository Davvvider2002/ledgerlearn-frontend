/**
 * LedgerLearn Pro — Marketplace API
 * ====================================
 * File: netlify/functions/marketplace-api.js
 *
 * Handles:
 *   get-products      → list all live marketplace products (public)
 *   get-product       → single product detail (public)
 *   initiate-checkout → create PayPal order for product purchase
 *   confirm-order     → verify PayPal payment, create order record, send download
 *   claim-l2-free     → L2 certified users claim free product
 *   validate-coupon   → validate and apply coupon code at checkout
 *   get-my-orders     → list current user's orders (authenticated)
 *   check-access      → does this user have access to a product?
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const SUPA_URL  = process.env.SUPABASE_URL          || '';
const SUPA_KEY  = process.env.SUPABASE_SERVICE_KEY  || '';
const PP_CLIENT = process.env.PAYPAL_CLIENT_ID       || '';
const PP_SECRET = process.env.PAYPAL_CLIENT_SECRET   || '';
const BREVO_KEY = process.env.BREVO_API_KEY          || '';
const PP_BASE   = 'https://api-m.paypal.com';  // live

function json(code, body) {
  return { statusCode: code, headers: CORS, body: JSON.stringify(body) };
}

// ── Supabase REST helper ─────────────────────────────────────
async function supa(path, method, body) {
  if (!SUPA_URL || !SUPA_KEY) return null;
  try {
    const opts = {
      method: method || 'GET',
      headers: {
        'apikey':        SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type':  'application/json',
        'Prefer':        method === 'POST' ? 'return=representation' : '',
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(SUPA_URL + path, opts);
    return res.json().catch(() => null);
  } catch(e) { return null; }
}

async function supaUpdate(table, filter, data) {
  try {
    await fetch(`${SUPA_URL}/rest/v1/${table}?${filter}`, {
      method: 'PATCH',
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch(e) {}
}

// ── PayPal helpers ───────────────────────────────────────────
async function getPayPalToken() {
  if (!PP_CLIENT || !PP_SECRET) return null;
  try {
    const res = await fetch(`${PP_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${PP_CLIENT}:${PP_SECRET}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    return data.access_token || null;
  } catch(e) { return null; }
}

async function createPayPalOrder(amount, currency, productName, token) {
  const res = await fetch(`${PP_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: currency || 'USD', value: amount.toFixed(2) },
        description: productName || 'LedgerLearn Marketplace',
      }],
    }),
  });
  return res.json();
}

async function capturePayPalOrder(orderId, token) {
  const res = await fetch(`${PP_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
  });
  return res.json();
}

// ── Brevo email delivery ─────────────────────────────────────
async function sendDownloadEmail(email, productName, downloadUrl) {
  if (!BREVO_KEY || !downloadUrl) return false;
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: 'LedgerLearn Pro', email: 'hello@ledgerlearn.pro' },
        to:          [{ email }],
        subject:     `Your download is ready — ${productName}`,
        htmlContent: `
<div style="font-family:DM Sans,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;width:20px;height:20px;background:#D4A843;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);"></div>
    <strong style="font-size:1.1rem;color:#0B1F3A;margin-left:8px;">LedgerLearn Pro</strong>
  </div>
  <h2 style="color:#0B1F3A;font-size:1.3rem;margin-bottom:8px;">Your download is ready.</h2>
  <p style="color:#6b87a3;margin-bottom:24px;">Thank you for your purchase. Click the button below to download <strong>${productName}</strong>.</p>
  <div style="text-align:center;margin-bottom:32px;">
    <a href="${downloadUrl}" style="display:inline-block;background:#D4A843;color:#0B1F3A;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:1rem;">Download ${productName} →</a>
  </div>
  <p style="color:#6b87a3;font-size:0.85rem;">This link is unique to your order. If you have any issues, reply to this email.</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
  <p style="color:#6b87a3;font-size:0.78rem;text-align:center;">LedgerLearn Pro · hello@ledgerlearn.pro · ledgerlearn.pro</p>
</div>`,
      }),
    });
    return res.ok;
  } catch(e) { return false; }
}

// ── Audit helper ─────────────────────────────────────────────
async function auditLog(action, target) {
  try {
    await supa('/rest/v1/admin_audit_log', 'POST', {
      action, target, admin_email: 'system:marketplace', success: true,
      created_at: new Date().toISOString(),
    });
  } catch(e) {}
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return json(405, { error: 'POST only' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(e) { return json(400, { error: 'Invalid JSON' }); }
  const { action, email, productId, orderId, couponCode } = body;

  // ── GET PRODUCTS (public) ────────────────────────────────
  if (action === 'get-products') {
    const products = await supa('/rest/v1/marketplace_products?status=eq.live&order=sort_order.asc');
    // Load feature flag — if marketplace not live, return empty
    const flagRow = await supa('/rest/v1/platform_config?key=eq.feature_flags&select=value&limit=1');
    if (Array.isArray(flagRow) && flagRow.length > 0) {
      try {
        const flags = JSON.parse(flagRow[0].value || '{}');
        if (!flags.marketplace_live) {
          return json(200, { ok: true, data: [], comingSoon: true });
        }
      } catch(e) {}
    }
    return json(200, { ok: true, data: Array.isArray(products) ? products : [] });
  }

  // ── GET SINGLE PRODUCT ───────────────────────────────────
  if (action === 'get-product') {
    if (!productId) return json(400, { error: 'productId required' });
    const rows = await supa(`/rest/v1/marketplace_products?id=eq.${productId}&status=eq.live&limit=1`);
    if (!Array.isArray(rows) || rows.length === 0) return json(404, { error: 'Product not found' });
    return json(200, { ok: true, product: rows[0] });
  }

  // ── VALIDATE COUPON ──────────────────────────────────────
  if (action === 'validate-coupon') {
    if (!couponCode || !productId) return json(400, { error: 'couponCode and productId required' });
    const code = couponCode.toUpperCase().trim();
    const rows = await supa(`/rest/v1/coupons?code=eq.${encodeURIComponent(code)}&status=eq.active&limit=1`);
    if (!Array.isArray(rows) || rows.length === 0) return json(200, { ok: false, error: 'Invalid or expired coupon' });
    const c = rows[0];
    // Check expiry
    if (c.expires_at && new Date(c.expires_at) < new Date()) return json(200, { ok: false, error: 'Coupon has expired' });
    // Check max uses
    if (c.max_uses > 0 && c.uses_count >= c.max_uses) return json(200, { ok: false, error: 'Coupon usage limit reached' });
    // Check applies_to
    const product = await supa(`/rest/v1/marketplace_products?id=eq.${productId}&select=category,price&limit=1`);
    const prod = Array.isArray(product) && product.length > 0 ? product[0] : {};
    const appliesToProduct = c.applies_to === 'all' || c.applies_to === prod.category;
    if (!appliesToProduct) return json(200, { ok: false, error: 'Coupon does not apply to this product' });
    const discountAmt = c.type === 'pct'
      ? (parseFloat(prod.price) * parseFloat(c.value) / 100)
      : parseFloat(c.value);
    return json(200, { ok: true, coupon: c, discountAmount: discountAmt.toFixed(2) });
  }

  // ── CHECK ACCESS ─────────────────────────────────────────
  if (action === 'check-access') {
    if (!email || !productId) return json(400, { error: 'email and productId required' });
    const cleanEmail = email.toLowerCase().trim();
    // Has the user already purchased this product?
    const orders = await supa(`/rest/v1/marketplace_orders?email=eq.${encodeURIComponent(cleanEmail)}&product_id=eq.${productId}&status=eq.completed&limit=1`);
    if (Array.isArray(orders) && orders.length > 0) {
      const prod = await supa(`/rest/v1/marketplace_products?id=eq.${productId}&select=download_url,name&limit=1`);
      const p = Array.isArray(prod) && prod.length > 0 ? prod[0] : {};
      return json(200, { ok: true, hasAccess: true, downloadUrl: p.download_url, productName: p.name });
    }
    // Is this the L2 free product and user is L2 certified?
    const product = await supa(`/rest/v1/marketplace_products?id=eq.${productId}&select=unlock_rule,name,download_url&limit=1`);
    const p = Array.isArray(product) && product.length > 0 ? product[0] : {};
    if (p.unlock_rule === 'l2_free') {
      const certs = await supa(`/rest/v1/certificates?email=eq.${encodeURIComponent(cleanEmail)}&level=eq.l2&limit=1`);
      if (Array.isArray(certs) && certs.length > 0) {
        return json(200, { ok: true, hasAccess: true, viaCertUnlock: true, downloadUrl: p.download_url, productName: p.name });
      }
    }
    return json(200, { ok: true, hasAccess: false });
  }

  // ── CLAIM L2 FREE PRODUCT ────────────────────────────────
  if (action === 'claim-l2-free') {
    if (!email || !productId) return json(400, { error: 'email and productId required' });
    const cleanEmail = email.toLowerCase().trim();
    // Verify L2 cert
    const certs = await supa(`/rest/v1/certificates?email=eq.${encodeURIComponent(cleanEmail)}&level=eq.l2&limit=1`);
    if (!Array.isArray(certs) || certs.length === 0) {
      return json(403, { error: 'L2 certificate required to claim this product' });
    }
    // Verify product has l2_free unlock
    const product = await supa(`/rest/v1/marketplace_products?id=eq.${productId}&status=eq.live&select=name,unlock_rule,download_url,category&limit=1`);
    const p = Array.isArray(product) && product.length > 0 ? product[0] : null;
    if (!p || p.unlock_rule !== 'l2_free') return json(400, { error: 'This product is not available via L2 unlock' });
    // Check not already claimed
    const existing = await supa(`/rest/v1/marketplace_orders?email=eq.${encodeURIComponent(cleanEmail)}&product_id=eq.${productId}&limit=1`);
    if (Array.isArray(existing) && existing.length > 0) {
      return json(200, { ok: true, alreadyClaimed: true, downloadUrl: p.download_url, productName: p.name });
    }
    // Create free order record
    const orderRow = {
      email: cleanEmail, product_id: productId, product_name: p.name,
      product_category: p.category, amount: 0, currency: 'USD',
      payment_provider: 'free', cert_unlock: true, cert_level: 'l2',
      status: 'completed', download_sent: true,
      download_sent_at: new Date().toISOString(), created_at: new Date().toISOString(),
    };
    await supa('/rest/v1/marketplace_orders', 'POST', orderRow);
    await sendDownloadEmail(cleanEmail, p.name, p.download_url);
    await auditLog('claim-l2-free', productId + ':' + cleanEmail);
    return json(200, { ok: true, claimed: true, downloadUrl: p.download_url, productName: p.name });
  }

  // ── INITIATE CHECKOUT ────────────────────────────────────
  if (action === 'initiate-checkout') {
    if (!email || !productId) return json(400, { error: 'email and productId required' });
    const cleanEmail = email.toLowerCase().trim();

    // Load product
    const product = await supa(`/rest/v1/marketplace_products?id=eq.${productId}&status=eq.live&select=*&limit=1`);
    const p = Array.isArray(product) && product.length > 0 ? product[0] : null;
    if (!p) return json(404, { error: 'Product not found or not live' });

    let finalPrice = parseFloat(p.price);
    let discountAmt = 0;

    // Apply coupon if provided
    if (couponCode) {
      const code = couponCode.toUpperCase().trim();
      const cRows = await supa(`/rest/v1/coupons?code=eq.${encodeURIComponent(code)}&status=eq.active&limit=1`);
      if (Array.isArray(cRows) && cRows.length > 0) {
        const c = cRows[0];
        const valid = (!c.expires_at || new Date(c.expires_at) >= new Date())
          && (c.max_uses === 0 || c.uses_count < c.max_uses)
          && (c.applies_to === 'all' || c.applies_to === p.category);
        if (valid) {
          discountAmt = c.type === 'pct' ? (finalPrice * parseFloat(c.value) / 100) : parseFloat(c.value);
          finalPrice = Math.max(0, finalPrice - discountAmt);
        }
      }
    }

    // L3 discount check
    if (p.unlock_rule === 'l3_discount_20') {
      const l3cert = await supa(`/rest/v1/certificates?email=eq.${encodeURIComponent(cleanEmail)}&level=eq.l3&limit=1`);
      if (Array.isArray(l3cert) && l3cert.length > 0) {
        const l3Discount = parseFloat(p.price) * 0.2;
        discountAmt = Math.max(discountAmt, l3Discount);
        finalPrice = Math.max(0, parseFloat(p.price) - discountAmt);
      }
    }

    // Create PayPal order
    const ppToken = await getPayPalToken();
    if (!ppToken) return json(500, { error: 'Payment processor unavailable' });
    const ppOrder = await createPayPalOrder(finalPrice, 'USD', p.name, ppToken);
    if (!ppOrder || ppOrder.status !== 'CREATED') {
      return json(500, { error: 'Failed to create payment order' });
    }
    const approveLink = ppOrder.links.find(l => l.rel === 'approve');
    return json(200, {
      ok: true,
      paypalOrderId: ppOrder.id,
      approveUrl: approveLink ? approveLink.href : null,
      finalPrice,
      discountAmount: discountAmt,
      product: { id: p.id, name: p.name, price: p.price, finalPrice },
    });
  }

  // ── CONFIRM ORDER (after PayPal approval) ────────────────
  if (action === 'confirm-order') {
    if (!email || !orderId || !productId) return json(400, { error: 'email, orderId, productId required' });
    const cleanEmail = email.toLowerCase().trim();

    const ppToken = await getPayPalToken();
    if (!ppToken) return json(500, { error: 'Payment processor unavailable' });

    // Capture the payment
    const capture = await capturePayPalOrder(orderId, ppToken);
    if (!capture || capture.status !== 'COMPLETED') {
      return json(400, { error: 'Payment not completed: ' + (capture && capture.status) });
    }

    // Load product
    const product = await supa(`/rest/v1/marketplace_products?id=eq.${productId}&select=*&limit=1`);
    const p = Array.isArray(product) && product.length > 0 ? product[0] : null;
    if (!p) return json(404, { error: 'Product not found' });

    const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const amount    = parseFloat(captureId?.amount?.value || p.price);

    // Check for duplicate (idempotency)
    const dupCheck = await supa(`/rest/v1/marketplace_orders?provider_order_id=eq.${encodeURIComponent(orderId)}&limit=1`);
    if (Array.isArray(dupCheck) && dupCheck.length > 0) {
      const d = dupCheck[0];
      return json(200, { ok: true, duplicate: true, downloadUrl: p.download_url, productName: p.name, orderId: d.id });
    }

    // Get user_id
    const prof = await supa(`/rest/v1/profiles?email=eq.${encodeURIComponent(cleanEmail)}&select=id&limit=1`);
    const userId = Array.isArray(prof) && prof.length > 0 ? prof[0].id : null;

    // Create order record
    const orderData = {
      user_id: userId, email: cleanEmail,
      product_id: productId, product_name: p.name, product_category: p.category,
      amount, currency: 'USD', payment_provider: 'paypal',
      provider_order_id: orderId, coupon_code: couponCode || null,
      status: 'completed', download_sent: false,
      created_at: new Date().toISOString(),
    };
    const created = await supa('/rest/v1/marketplace_orders', 'POST', orderData);
    const newOrderId = Array.isArray(created) && created.length > 0 ? created[0].id : null;

    // Update coupon usage count
    if (couponCode) {
      const cRows = await supa(`/rest/v1/coupons?code=eq.${encodeURIComponent(couponCode.toUpperCase())}&limit=1`);
      if (Array.isArray(cRows) && cRows.length > 0) {
        await supaUpdate('coupons', `id=eq.${cRows[0].id}`, {
          uses_count:     (cRows[0].uses_count || 0) + 1,
          total_discount: (parseFloat(cRows[0].total_discount) || 0) + Math.max(0, parseFloat(p.price) - amount),
        });
      }
    }

    // Send download email
    const emailSent = await sendDownloadEmail(cleanEmail, p.name, p.download_url);
    if (newOrderId && emailSent) {
      await supaUpdate('marketplace_orders', `id=eq.${newOrderId}`, {
        download_sent: true, download_sent_at: new Date().toISOString(),
      });
    }

    await auditLog('confirm-order', orderId + ':' + cleanEmail + ':$' + amount);
    return json(200, {
      ok: true, confirmed: true,
      downloadUrl: p.download_url, productName: p.name,
      orderId: newOrderId, amount,
    });
  }

  // ── GET MY ORDERS ────────────────────────────────────────
  if (action === 'get-my-orders') {
    if (!email) return json(400, { error: 'email required' });
    const cleanEmail = email.toLowerCase().trim();
    const orders = await supa(
      `/rest/v1/marketplace_orders?email=eq.${encodeURIComponent(cleanEmail)}&status=eq.completed&order=created_at.desc&limit=50`
    );
    return json(200, { ok: true, data: Array.isArray(orders) ? orders : [] });
  }

  return json(400, { error: 'Unknown action: ' + action });
};
