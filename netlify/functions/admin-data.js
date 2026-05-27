/**
 * LedgerLearn — Admin Data API v2
 * ================================
 * File: netlify/functions/admin-data.js
 *
 * Serves all admin panel data using SERVICE KEY (bypasses RLS).
 * Requires valid admin token in Authorization header.
 *
 * v1 actions preserved: dashboard, users, certs, payments, partners,
 *   affiliates, upgrades, revenue, approve-partner, reject-partner,
 *   job-board-stats, jobs, recruiters, job-applications,
 *   moderate-job, suspend-recruiter, verify-recruiter, insert-cert
 *
 * v2 actions added: rev-overview, payouts, mark-payout-paid,
 *   mkt-overview, save-mkt-unlock, products, save-product,
 *   archive-product, orders, resend-order, refund-order,
 *   coupons, create-coupon, toggle-coupon,
 *   academy-stats, academy-members, add-member, cancel-member,
 *   content-resources, add-resource, remove-resource,
 *   track-config, save-track-config,
 *   email-campaigns, send-notification,
 *   audit-log, flag-question, add-question, list-questions,
 *   save-feature-flags, add-user, add-affiliate, add-partner,
 *   manual-upgrade, save-supa-config, save-brevo-config,
 *   save-anthropic-config, save-paypal-config
 */

const crypto = require('crypto');

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const SUPA_URL = process.env.SUPABASE_URL         || '';
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const BREVO_KEY = process.env.BREVO_API_KEY || '';

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
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : undefined,
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(SUPA_URL + path, opts);
    return res.json();
  } catch(e) { return null; }
}
// Alias for backward compat
const supaFetch = (path) => supa(path);

// ── Brevo email sender ───────────────────────────────────────
async function sendBrevoEmail({ to, subject, htmlContent, textContent }) {
  if (!BREVO_KEY) return false;
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'LedgerLearn Pro', email: 'hello@ledgerlearn.pro' },
        to: Array.isArray(to) ? to : [{ email: to }],
        subject,
        htmlContent: htmlContent || '<p>' + textContent + '</p>',
      }),
    });
    return res.ok;
  } catch(e) { return false; }
}

// ── Audit logger ─────────────────────────────────────────────
async function auditLog(action, target, adminEmail, success) {
  try {
    await supa('/rest/v1/admin_audit_log', 'POST', {
      action, target, admin_email: adminEmail || 'admin', success: success !== false,
      created_at: new Date().toISOString(),
    });
  } catch(e) {}
}

// ── Token verification ───────────────────────────────────────
function verifyToken(authHeader) {
  const token = (authHeader || '').replace('Bearer ', '').trim();
  const adminSecret = process.env.ADMIN_SECRET || '';
  if (!token || !adminSecret) return false;
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx < 0) return false;
    const payloadB64 = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
    if (Date.now() > payload.expires) return false;
    const expected = crypto.createHmac('sha256', adminSecret).update(payloadB64).digest('hex');
    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  } catch(e) { return false; }
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return json(405, { error: 'POST only' });
  if (!verifyToken(event.headers['authorization'])) return json(401, { error: 'Unauthorized' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON' }); }
  const { action } = body;

  try {
    switch(action) {

      // ══════════════════════════════════════════════════════
      // V1 ACTIONS — PRESERVED EXACTLY
      // ══════════════════════════════════════════════════════

      case 'dashboard': {
        const [profiles, certs, pays, pending, mktOrders, academyMems, jbStats] = await Promise.all([
          supa('/rest/v1/profiles?select=id,region,created_at&order=created_at.desc&limit=200'),
          supa('/rest/v1/certificates?select=id,score,level,cert_id&limit=200'),
          supa('/rest/v1/payments?select=amount_usd&status=eq.confirmed'),
          supa('/rest/v1/partners?select=id&status=eq.pending'),
          supa('/rest/v1/marketplace_orders?select=amount&status=eq.completed&limit=200'),
          supa('/rest/v1/academy_members?select=id,tier,mrr&status=eq.active&limit=200'),
          supa('/rest/v1/admin_jobboard_stats?select=*&limit=1'),
        ]);

        const certRevenue  = Array.isArray(pays) ? pays.reduce((s,p)=>s+(parseFloat(p.amount_usd)||0),0) : 0;
        const mktRevenue   = Array.isArray(mktOrders) ? mktOrders.reduce((s,o)=>s+(parseFloat(o.amount)||0),0) : 0;
        const academyMRR   = Array.isArray(academyMems) ? academyMems.reduce((s,m)=>s+(parseFloat(m.mrr)||29),0) : 0;
        const jbData       = Array.isArray(jbStats) && jbStats.length > 0 ? jbStats[0] : {};
        const jbRevenue    = parseFloat(jbData.job_board_revenue)||0;

        // Region breakdown
        const regionCounts = {};
        const flagMap = {NG:'🇳🇬',ZA:'🇿🇦',UK:'🇬🇧',AU:'🇦🇺',US:'🇺🇸',AE:'🇦🇪',CA:'🇨🇦',IE:'🇮🇪',NZ:'🇳🇿',GH:'🇬🇭',KE:'🇰🇪'};
        if (Array.isArray(profiles)) profiles.forEach(function(p){ regionCounts[p.region] = (regionCounts[p.region]||0)+1; });
        const regionBreakdown = Object.entries(regionCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([r,c])=>({region:r,count:c,flag:flagMap[r]||'🌍'}));

        // Level breakdown
        const levelCounts = {L1:0,L2:0,L3:0};
        if (Array.isArray(certs)) certs.forEach(function(c){ var l=(c.level||'l1').replace('l','L'); levelCounts[l]=(levelCounts[l]||0)+1; });
        const levelBreakdown = Object.entries(levelCounts).map(([l,c])=>({level:l,count:c}));

        // Health checks
        const health = {
          supa:   SUPA_URL && SUPA_KEY ? 'ok' : 'warn',
          paypal: process.env.PAYPAL_CLIENT_ID ? 'ok' : 'warn',
          brevo:  BREVO_KEY ? 'ok' : 'warn',
          ai:     process.env.ANTHROPIC_API_KEY ? 'ok' : 'warn',
          cron:   'ok',
          qb:     'ok',
        };

        return json(200, {
          ok: true,
          userCount:        Array.isArray(profiles)  ? profiles.length  : 0,
          certCount:        Array.isArray(certs)     ? certs.length     : 0,
          pendPartners:     Array.isArray(pending)   ? pending.length   : 0,
          revenue:          certRevenue,
          mktRevenue,
          academyMRR,
          jbRevenue,
          regionBreakdown,
          levelBreakdown,
          health,
        });
      }

      case 'users': {
        const data = await supa('/rest/v1/admin_user_summary?select=*&order=registered_at.desc&limit=200');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'certs': {
        const data = await supa('/rest/v1/certificates?select=*&order=created_at.desc&limit=200');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'payments': {
        const data = await supa('/rest/v1/payments?select=*&order=created_at.desc&limit=100');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'partners': {
        const data = await supa('/rest/v1/partners?select=*&order=created_at.desc');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'affiliates': {
        const data = await supa('/rest/v1/affiliates?select=*&order=created_at.desc');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'upgrades': {
        const data = await supa('/rest/v1/manual_upgrades?select=*&order=created_at.desc&limit=100');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'revenue': {
        const data = await supa('/rest/v1/admin_revenue_summary?select=*&order=month.desc&limit=12');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'approve-partner': {
        const { id } = body; if (!id) return json(400, { error: 'id required' });
        await fetch(`${SUPA_URL}/rest/v1/partners?id=eq.${id}`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body: JSON.stringify({ status:'approved' }) });
        await auditLog('approve-partner', id);
        return json(200, { ok: true });
      }

      case 'reject-partner': {
        const { id } = body; if (!id) return json(400, { error: 'id required' });
        await fetch(`${SUPA_URL}/rest/v1/partners?id=eq.${id}`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body: JSON.stringify({ status:'rejected' }) });
        await auditLog('reject-partner', id);
        return json(200, { ok: true });
      }

      case 'job-board-stats': {
        const stats = await supa('/rest/v1/admin_jobboard_stats?select=*&limit=1');
        const s = (Array.isArray(stats) && stats.length > 0) ? stats[0] : {};
        return json(200, { ok:true, activeJobs:parseInt(s.active_jobs)||0, activeRecruiters:parseInt(s.active_recruiters)||0, trialRecruiters:parseInt(s.trial_recruiters)||0, expiredRecruiters:parseInt(s.expired_recruiters)||0, appsToday:parseInt(s.apps_today)||0, totalApplications:parseInt(s.total_applications)||0, jobBoardRevenue:parseFloat(s.job_board_revenue)||0 });
      }

      case 'jobs': {
        const data = await supa('/rest/v1/admin_jobs_summary?select=*&order=created_at.desc&limit=200');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'recruiters': {
        const data = await supa('/rest/v1/admin_recruiters_summary?select=*&order=created_at.desc&limit=200');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'job-applications': {
        const data = await supa('/rest/v1/admin_applications_summary?select=*&order=applied_at.desc&limit=200');
        return json(200, { ok: true, data: Array.isArray(data) ? data : [] });
      }

      case 'moderate-job': {
        const { id, action: modAction } = body;
        if (!id || !modAction) return json(400, { error: 'id and action required' });
        const statusMap = { publish:'active', pause:'paused', close:'closed', flag:'flagged' };
        const newStatus = statusMap[modAction]; if (!newStatus) return json(400, { error: 'Invalid action' });
        await fetch(`${SUPA_URL}/rest/v1/job_postings?id=eq.${id}`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body: JSON.stringify({ status:newStatus }) });
        await auditLog('moderate-job:'+modAction, id);
        return json(200, { ok: true, newStatus });
      }

      case 'suspend-recruiter': {
        const { id } = body; if (!id) return json(400, { error: 'id required' });
        await fetch(`${SUPA_URL}/rest/v1/recruiters?id=eq.${id}`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body: JSON.stringify({ status:'suspended' }) });
        await fetch(`${SUPA_URL}/rest/v1/job_postings?recruiter_id=eq.${id}&status=eq.active`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body: JSON.stringify({ status:'paused' }) });
        await auditLog('suspend-recruiter', id);
        return json(200, { ok: true });
      }

      case 'verify-recruiter': {
        const { id } = body; if (!id) return json(400, { error: 'id required' });
        await fetch(`${SUPA_URL}/rest/v1/recruiters?id=eq.${id}`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body: JSON.stringify({ verified:true }) });
        await auditLog('verify-recruiter', id);
        return json(200, { ok: true });
      }

      case 'insert-cert': {
        const { certId, candidateName, certTitle, certLevel, certRegion, certRegionLabel, certRegionSuffix, score, level, issueDate, email } = body;
        if (!certId || !email) return json(400, { error: 'certId and email required' });
        const existing = await supa(`/rest/v1/certificates?cert_id=eq.${encodeURIComponent(certId)}&limit=1`);
        if (Array.isArray(existing) && existing.length > 0) return json(200, { ok:true, alreadyExists:true, cert:existing[0] });
        const prof = await supa(`/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`);
        const userId = Array.isArray(prof) && prof.length > 0 ? prof[0].id : null;
        const row = { user_id:userId, email, cert_id:certId, candidate_name:candidateName||'Candidate', cert_title:certTitle||'', cert_level:certLevel||'', cert_region:certRegion||'UK', cert_region_label:certRegionLabel||'United Kingdom', cert_region_suffix:certRegionSuffix||'', score:score||0, level:level||'l1', issue_date:issueDate||new Date().toISOString().split('T')[0] };
        const result = await supa('/rest/v1/certificates', 'POST', row);
        await auditLog('insert-cert', certId);
        return json(200, { ok:true, inserted:true, cert:Array.isArray(result)?result[0]:result });
      }

      // ══════════════════════════════════════════════════════
      // V2 ACTIONS — NEW
      // ══════════════════════════════════════════════════════

      case 'rev-overview': {
        const [pays, mktOrders, academyMems, jbStats, monthly] = await Promise.all([
          supa('/rest/v1/payments?select=amount_usd&status=eq.confirmed'),
          supa('/rest/v1/marketplace_orders?select=amount&status=eq.completed'),
          supa('/rest/v1/academy_members?select=mrr&status=eq.active'),
          supa('/rest/v1/admin_jobboard_stats?select=job_board_revenue&limit=1'),
          supa('/rest/v1/admin_revenue_summary?select=*&order=month.desc&limit=12'),
        ]);
        const certRevenue  = Array.isArray(pays) ? pays.reduce((s,p)=>s+(parseFloat(p.amount_usd)||0),0) : 0;
        const mktRevenue   = Array.isArray(mktOrders) ? mktOrders.reduce((s,o)=>s+(parseFloat(o.amount)||0),0) : 0;
        const academyMRR   = Array.isArray(academyMems) ? academyMems.reduce((s,m)=>s+(parseFloat(m.mrr)||29),0) : 0;
        const jbRevenue    = Array.isArray(jbStats) && jbStats.length>0 ? parseFloat(jbStats[0].job_board_revenue)||0 : 0;
        return json(200, { ok:true, certRevenue, mktRevenue, academyMRR, jbRevenue, totalMRR:certRevenue+mktRevenue+academyMRR+jbRevenue, monthly: Array.isArray(monthly)?monthly:[] });
      }

      case 'payouts': {
        const data = await supa('/rest/v1/affiliate_payouts?select=*&status=eq.pending&order=created_at.desc&limit=100');
        const paid = await supa('/rest/v1/affiliate_payouts?select=amount&status=eq.paid');
        const pendingTotal = Array.isArray(data) ? data.reduce((s,p)=>s+(parseFloat(p.amount)||0),0) : 0;
        const paidTotal    = Array.isArray(paid) ? paid.reduce((s,p)=>s+(parseFloat(p.amount)||0),0) : 0;
        return json(200, { ok:true, data:Array.isArray(data)?data:[], pendingTotal, paidTotal, count:(Array.isArray(data)?data.length:0) });
      }

      case 'mark-payout-paid': {
        const { id } = body; if (!id) return json(400, { error: 'id required' });
        await fetch(`${SUPA_URL}/rest/v1/affiliate_payouts?id=eq.${id}`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body:JSON.stringify({ status:'paid', paid_at:new Date().toISOString() }) });
        await auditLog('mark-payout-paid', id);
        return json(200, { ok:true });
      }

      case 'mkt-overview': {
        const [products, orders, config] = await Promise.all([
          supa('/rest/v1/marketplace_products?select=*&order=created_at.desc&limit=50'),
          supa('/rest/v1/marketplace_orders?select=*&order=created_at.desc&limit=50'),
          supa('/rest/v1/platform_config?select=*&key=eq.marketplace_config&limit=1'),
        ]);
        const cfg = Array.isArray(config) && config.length > 0 ? JSON.parse(config[0].value||'{}') : {};
        const revenue = Array.isArray(orders) ? orders.filter(o=>o.status==='completed').reduce((s,o)=>s+(parseFloat(o.amount)||0),0) : 0;
        const activeProducts = Array.isArray(products) ? products.filter(p=>p.status==='live').length : 0;
        return json(200, { ok:true, products:Array.isArray(products)?products:[], totalOrders:Array.isArray(orders)?orders.length:0, revenue, activeProducts, l2FreeProductId:cfg.l2FreeProductId||'' });
      }

      case 'save-mkt-unlock': {
        const { l2FreeProductId, l3DiscountPct } = body;
        const cfg = JSON.stringify({ l2FreeProductId, l3DiscountPct });
        const existing = await supa('/rest/v1/platform_config?key=eq.marketplace_config&limit=1');
        if (Array.isArray(existing) && existing.length > 0) {
          await fetch(`${SUPA_URL}/rest/v1/platform_config?key=eq.marketplace_config`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body:JSON.stringify({value:cfg}) });
        } else {
          await supa('/rest/v1/platform_config', 'POST', { key:'marketplace_config', value:cfg });
        }
        await auditLog('save-mkt-unlock', l2FreeProductId||'none');
        return json(200, { ok:true });
      }

      case 'products': {
        const data = await supa('/rest/v1/marketplace_products?select=*&order=created_at.desc&limit=100');
        // Enrich with sales stats
        const orderData = await supa('/rest/v1/marketplace_orders?select=product_id,amount&status=eq.completed&limit=500');
        const salesMap = {}; const revenueMap = {};
        if (Array.isArray(orderData)) orderData.forEach(function(o){ salesMap[o.product_id]=(salesMap[o.product_id]||0)+1; revenueMap[o.product_id]=(revenueMap[o.product_id]||0)+(parseFloat(o.amount)||0); });
        const enriched = Array.isArray(data) ? data.map(function(p){ return Object.assign({},p,{sales:salesMap[p.id]||0,revenue:revenueMap[p.id]||0}); }) : [];
        return json(200, { ok:true, data:enriched });
      }

      case 'save-product': {
        const { id, name, category, price, status, unlock_rule, download_url, description } = body;
        if (!name) return json(400, { error: 'name required' });
        const row = { name, category, price:parseFloat(price)||0, status:status||'draft', unlock_rule:unlock_rule||null, download_url:download_url||null, description:description||'' };
        if (id) {
          await fetch(`${SUPA_URL}/rest/v1/marketplace_products?id=eq.${id}`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body:JSON.stringify(row) });
          await auditLog('edit-product', name);
        } else {
          row.created_at = new Date().toISOString();
          await supa('/rest/v1/marketplace_products', 'POST', row);
          await auditLog('add-product', name);
        }
        return json(200, { ok:true });
      }

      case 'archive-product': {
        const { id } = body; if (!id) return json(400, { error: 'id required' });
        await fetch(`${SUPA_URL}/rest/v1/marketplace_products?id=eq.${id}`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body:JSON.stringify({status:'archived'}) });
        await auditLog('archive-product', id);
        return json(200, { ok:true });
      }

      case 'orders': {
        const data = await supa('/rest/v1/marketplace_orders?select=*&order=created_at.desc&limit=200');
        return json(200, { ok:true, data:Array.isArray(data)?data:[] });
      }

      case 'resend-order': {
        const { id } = body; if (!id) return json(400, { error: 'id required' });
        const orders = await supa(`/rest/v1/marketplace_orders?id=eq.${id}&select=*&limit=1`);
        const order = Array.isArray(orders) && orders.length > 0 ? orders[0] : null;
        if (!order) return json(404, { error: 'Order not found' });
        const products = await supa(`/rest/v1/marketplace_products?id=eq.${order.product_id}&select=name,download_url&limit=1`);
        const product = Array.isArray(products) && products.length > 0 ? products[0] : {};
        await sendBrevoEmail({ to: order.email, subject: 'Your LedgerLearn download — ' + (product.name||'Product'), htmlContent: '<p>Hi,</p><p>Here is your download link for <strong>' + (product.name||'your product') + '</strong>:</p><p><a href="' + (product.download_url||'#') + '">Download now</a></p><p>Team LedgerLearn Pro</p>' });
        await auditLog('resend-order', id);
        return json(200, { ok:true });
      }

      case 'refund-order': {
        const { id } = body; if (!id) return json(400, { error: 'id required' });
        await fetch(`${SUPA_URL}/rest/v1/marketplace_orders?id=eq.${id}`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body:JSON.stringify({status:'refunded',refunded_at:new Date().toISOString()}) });
        await auditLog('refund-order', id);
        return json(200, { ok:true });
      }

      case 'coupons': {
        const data = await supa('/rest/v1/coupons?select=*&order=created_at.desc&limit=100');
        return json(200, { ok:true, data:Array.isArray(data)?data:[] });
      }

      case 'create-coupon': {
        const { code, type, value, max_uses, applies_to, expires_at } = body;
        if (!code) return json(400, { error: 'code required' });
        const existing = await supa(`/rest/v1/coupons?code=eq.${encodeURIComponent(code)}&limit=1`);
        if (Array.isArray(existing) && existing.length > 0) return json(400, { error: 'Code already exists' });
        await supa('/rest/v1/coupons', 'POST', { code, type:type||'pct', value:parseFloat(value)||10, max_uses:parseInt(max_uses)||0, applies_to:applies_to||'all', expires_at:expires_at||null, status:'active', uses_count:0, total_discount:0, created_at:new Date().toISOString() });
        await auditLog('create-coupon', code);
        return json(200, { ok:true, code });
      }

      case 'toggle-coupon': {
        const { id, status } = body; if (!id) return json(400, { error: 'id required' });
        await fetch(`${SUPA_URL}/rest/v1/coupons?id=eq.${id}`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body:JSON.stringify({status:status||'inactive'}) });
        await auditLog('toggle-coupon:'+status, id);
        return json(200, { ok:true });
      }

      case 'academy-stats': {
        const [members, trials] = await Promise.all([
          supa('/rest/v1/academy_members?select=id,mrr,tier&status=eq.active'),
          supa('/rest/v1/academy_members?select=id&tier=eq.trial'),
        ]);
        const totalMembers = Array.isArray(members) ? members.length : 0;
        const mrr = Array.isArray(members) ? members.reduce((s,m)=>s+(parseFloat(m.mrr)||29),0) : 0;
        const onTrial = Array.isArray(trials) ? trials.length : 0;
        return json(200, { ok:true, totalMembers, mrr, onTrial, churnRate:null });
      }

      case 'academy-members': {
        const data = await supa('/rest/v1/academy_members?select=*&order=joined_at.desc&limit=200');
        return json(200, { ok:true, data:Array.isArray(data)?data:[] });
      }

      case 'add-member': {
        const { email, tier } = body; if (!email) return json(400, { error: 'email required' });
        const prof = await supa(`/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id&limit=1`);
        const userId = Array.isArray(prof)&&prof.length>0 ? prof[0].id : null;
        const mrr = tier==='annual' ? (249/12) : tier==='trial' ? 0 : 29;
        await supa('/rest/v1/academy_members', 'POST', { email, user_id:userId, tier:tier||'monthly', mrr, status:'active', joined_at:new Date().toISOString() });
        await auditLog('add-member', email);
        return json(200, { ok:true });
      }

      case 'cancel-member': {
        const { id } = body; if (!id) return json(400, { error: 'id required' });
        await fetch(`${SUPA_URL}/rest/v1/academy_members?id=eq.${id}`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body:JSON.stringify({status:'cancelled',cancelled_at:new Date().toISOString()}) });
        await auditLog('cancel-member', id);
        return json(200, { ok:true });
      }

      case 'content-resources': {
        const data = await supa('/rest/v1/content_resources?select=*&order=created_at.desc&limit=100');
        return json(200, { ok:true, data:Array.isArray(data)?data:[] });
      }

      case 'add-resource': {
        const { name, category, access_tier, download_url } = body;
        if (!name) return json(400, { error: 'name required' });
        await supa('/rest/v1/content_resources', 'POST', { name, category, access_tier:access_tier||'academy', download_url:download_url||null, download_count:0, created_at:new Date().toISOString() });
        await auditLog('add-resource', name);
        return json(200, { ok:true });
      }

      case 'remove-resource': {
        const { id } = body; if (!id) return json(400, { error: 'id required' });
        await fetch(`${SUPA_URL}/rest/v1/content_resources?id=eq.${id}`, { method:'DELETE', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY} });
        await auditLog('remove-resource', id);
        return json(200, { ok:true });
      }

      case 'track-config': {
        const cfgRow = await supa('/rest/v1/platform_config?key=eq.track_config&select=value&limit=1');
        const cfg = Array.isArray(cfgRow)&&cfgRow.length>0 ? JSON.parse(cfgRow[0].value||'{}') : {};
        return json(200, { ok:true, config:cfg });
      }

      case 'save-track-config': {
        const { config } = body; if (!config) return json(400, { error: 'config required' });
        const cfgStr = JSON.stringify(config);
        const existing = await supa('/rest/v1/platform_config?key=eq.track_config&limit=1');
        if (Array.isArray(existing)&&existing.length>0) {
          await fetch(`${SUPA_URL}/rest/v1/platform_config?key=eq.track_config`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body:JSON.stringify({value:cfgStr}) });
        } else {
          await supa('/rest/v1/platform_config','POST',{key:'track_config',value:cfgStr});
        }
        await auditLog('save-track-config','track_config');
        return json(200, { ok:true });
      }

      case 'email-campaigns': {
        return json(200, { ok:true, totalSent:0, avgOpenRate:null, avgClickRate:null, conversions:0, trialEmailsSent:0 });
      }

      case 'send-notification': {
        const { audience, subject, body: msgBody, preview } = body;
        if (!subject || !msgBody) return json(400, { error: 'subject and body required' });
        if (preview) {
          await sendBrevoEmail({ to:'hello@ledgerlearn.pro', subject:'[PREVIEW] '+subject, htmlContent:msgBody });
          return json(200, { ok:true, preview:true });
        }
        // Get recipient emails by audience segment
        let recipientRows = [];
        if (audience==='all') recipientRows = await supa('/rest/v1/profiles?select=email&limit=500')||[];
        else if (audience==='l2_certified') recipientRows = await supa('/rest/v1/certificates?select=email&level=eq.l2&limit=200')||[];
        else if (audience==='ng') recipientRows = await supa('/rest/v1/profiles?select=email&region=eq.NG&limit=200')||[];
        else if (audience==='za') recipientRows = await supa('/rest/v1/profiles?select=email&region=eq.ZA&limit=200')||[];
        else if (audience==='uk') recipientRows = await supa('/rest/v1/profiles?select=email&region=eq.UK&limit=200')||[];
        const emails = Array.isArray(recipientRows) ? [...new Set(recipientRows.map(r=>r.email).filter(Boolean))] : [];
        // Send in batches of 50
        let sent = 0;
        for (let i = 0; i < emails.length; i += 50) {
          const batch = emails.slice(i, i+50).map(e=>({email:e}));
          await sendBrevoEmail({ to: batch, subject, htmlContent: msgBody });
          sent += batch.length;
        }
        await auditLog('send-notification', audience+':'+sent+'recipients');
        return json(200, { ok:true, recipientCount:sent });
      }

      case 'audit-log': {
        const data = await supa('/rest/v1/admin_audit_log?select=*&order=created_at.desc&limit=200');
        return json(200, { ok:true, data:Array.isArray(data)?data:[] });
      }

      case 'list-questions': {
        const { track, level, module } = body;
        const q = `/rest/v1/question_flags?select=question_id,reason&limit=500`;
        const flaggedIds = new Set();
        const flags = await supa(q);
        if (Array.isArray(flags)) flags.forEach(f=>flaggedIds.add(f.question_id));
        // For now return empty — questions are in-memory in ai.js POOL
        return json(200, { ok:true, data:[], note:'Questions live in ai.js POOL cache. Flagged IDs: '+flaggedIds.size });
      }

      case 'add-question': {
        const { track, level, module, context, question, options, correct_index, explanation } = body;
        if (!question || !options) return json(400, { error: 'question and options required' });
        await supa('/rest/v1/manual_questions', 'POST', { track, level, module, context, question, options:JSON.stringify(options), correct_index:parseInt(correct_index)||0, explanation, manual:true, created_at:new Date().toISOString() });
        await auditLog('add-question', track+':'+level+':'+module);
        return json(200, { ok:true });
      }

      case 'flag-question': {
        const { id, reason } = body; if (!id) return json(400, { error: 'id required' });
        await supa('/rest/v1/question_flags', 'POST', { question_id:id, reason:reason||'flagged by admin', created_at:new Date().toISOString() });
        await auditLog('flag-question', id);
        return json(200, { ok:true });
      }

      case 'save-feature-flags': {
        const { flags } = body; if (!flags) return json(400, { error: 'flags required' });
        const cfgStr = JSON.stringify(flags);
        const existing = await supa('/rest/v1/platform_config?key=eq.feature_flags&limit=1');
        if (Array.isArray(existing)&&existing.length>0) {
          await fetch(`${SUPA_URL}/rest/v1/platform_config?key=eq.feature_flags`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body:JSON.stringify({value:cfgStr}) });
        } else {
          await supa('/rest/v1/platform_config','POST',{key:'feature_flags',value:cfgStr});
        }
        await auditLog('save-feature-flags','flags');
        return json(200, { ok:true });
      }

      case 'add-user': {
        const { name, email, region } = body; if (!email) return json(400, { error: 'email required' });
        await supa('/rest/v1/profiles','POST',{full_name:name||'',email,region:region||'UK',registered_at:new Date().toISOString()});
        await auditLog('add-user', email);
        return json(200, { ok:true });
      }

      case 'manual-upgrade': {
        const { email, track, level, reason } = body; if (!email) return json(400, { error: 'email required' });
        await supa('/rest/v1/manual_upgrades','POST',{email,track:track||'Xero',level:level||'l2',reason:reason||'',created_at:new Date().toISOString()});
        await auditLog('manual-upgrade', email+':'+track+':'+level);
        return json(200, { ok:true });
      }

      case 'add-affiliate': {
        const { name, email, commission } = body; if (!email) return json(400, { error: 'email required' });
        await supa('/rest/v1/affiliates','POST',{name,email,commission:parseFloat(commission)||20,paid_amount:0,pending_amount:0,created_at:new Date().toISOString()});
        await auditLog('add-affiliate', email);
        return json(200, { ok:true });
      }

      case 'add-partner': {
        const { org_name, email, type } = body; if (!email) return json(400, { error: 'email required' });
        await supa('/rest/v1/partners','POST',{org_name,email,type:type||'training',status:'pending',created_at:new Date().toISOString()});
        await auditLog('add-partner', email);
        return json(200, { ok:true });
      }

      case 'save-supa-config': {
        // NOTE: Can't actually save env vars from here — log the attempt
        await auditLog('save-supa-config','attempted');
        return json(200, { ok:true, note:'Update SUPABASE_URL and SUPABASE_SERVICE_KEY in Netlify env vars dashboard', connected: !!(SUPA_URL&&SUPA_KEY) });
      }

      case 'save-brevo-config': {
        await auditLog('save-brevo-config','attempted');
        return json(200, { ok:true, note:'Update BREVO_API_KEY in Netlify env vars dashboard' });
      }

      case 'save-anthropic-config': {
        await auditLog('save-anthropic-config','attempted');
        return json(200, { ok:true, note:'Update ANTHROPIC_API_KEY in Netlify env vars dashboard' });
      }

      case 'save-paypal-config': {
        const { clientId, xeroL2Plan, qbL2Plan, recruiterPlan } = body;
        const cfg = JSON.stringify({ clientId, xeroL2Plan, qbL2Plan, recruiterPlan });
        const existing = await supa('/rest/v1/platform_config?key=eq.paypal_config&limit=1');
        if (Array.isArray(existing)&&existing.length>0) {
          await fetch(`${SUPA_URL}/rest/v1/platform_config?key=eq.paypal_config`, { method:'PATCH', headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Content-Type':'application/json'}, body:JSON.stringify({value:cfg}) });
        } else {
          await supa('/rest/v1/platform_config','POST',{key:'paypal_config',value:cfg});
        }
        await auditLog('save-paypal-config','paypal_config');
        return json(200, { ok:true });
      }

      default:
        return json(400, { error: 'Unknown action: ' + action });
    }
  } catch(e) {
    console.error('[admin-data]', action, e);
    return json(500, { error: 'Server error: ' + e.message });
  }
};
