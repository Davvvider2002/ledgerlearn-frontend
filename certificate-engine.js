/**
 * LedgerLearn Pro — Certificate Engine v3.0
 * ==========================================
 * LinkedIn Learning-style certificate design.
 * Clean white background, prominent branding,
 * candidate name large and centered, skills pills,
 * signature bottom-left, verification badge bottom-right.
 */

(function() {
  'use strict';

  // ── Helpers ───────────────────────────────────────────────
  function toast(msg, type) {
    var el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
      'background:' + (type === 'error' ? '#E74C3C' : '#1DA98A') + ';color:#fff;' +
      'padding:10px 22px;border-radius:8px;font-size:0.85rem;font-weight:600;z-index:9999;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.2);font-family:sans-serif;';
    document.body.appendChild(el);
    setTimeout(function() { el.remove(); }, 3000);
  }

  function getCert() {
    try {
      var p = JSON.parse(localStorage.getItem('ll_progress') || '{}');
      if (p.certificate) return p.certificate;
    } catch(e) {}
    if (window._certData) return window._certData;
    return null;
  }

  // ── Rounded rect ─────────────────────────────────────────
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Hex shape ─────────────────────────────────────────────
  function drawHex(ctx, cx, cy, r, color) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var angle = Math.PI / 180 * (60 * i - 30);
      var x = cx + r * Math.cos(angle);
      var y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (color) { ctx.fillStyle = color; ctx.fill(); }
  }

  // ── Signature-style text ──────────────────────────────────
  function drawSignature(ctx, text, x, y, size) {
    ctx.save();
    ctx.font = 'italic ' + (size || 36) + 'px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#1a1a2e';
    // Slight tilt like a real signature
    ctx.transform(1, -0.06, 0.08, 1, 0, 0);
    ctx.fillText(text, x - 15, y + 8);
    ctx.restore();
  }

  // ── Completion badge (circle with star/check) ─────────────
  function drawBadge(ctx, cx, cy, r) {
    // Outer ring — LedgerLearn gold
    var grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    grad.addColorStop(0, '#D4A843');
    grad.addColorStop(0.5, '#f0c860');
    grad.addColorStop(1, '#b8892a');
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();

    // Inner white circle
    ctx.beginPath(); ctx.arc(cx, cy, r - 8, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();

    // Inner gold ring
    ctx.beginPath(); ctx.arc(cx, cy, r - 10, 0, Math.PI * 2);
    ctx.strokeStyle = '#D4A843'; ctx.lineWidth = 1.5; ctx.stroke();

    // Hex logo in centre
    drawHex(ctx, cx, cy - 10, 14, '#D4A843');

    // "CERTIFIED" text
    ctx.fillStyle = '#0B1F3A';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFIED', cx, cy + 8);

    // "PRACTITIONER" curved text — simplified as straight
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.fillStyle = '#D4A843';
    ctx.fillText('PRACTITIONER', cx, cy + 22);

    // Outer dots
    for (var i = 0; i < 24; i++) {
      var angle = (i / 24) * Math.PI * 2;
      var dx = cx + (r - 3) * Math.cos(angle);
      var dy = cy + (r - 3) * Math.sin(angle);
      ctx.beginPath(); ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#D4A843' : '#f0c860';
      ctx.fill();
    }
  }

  // ── MAIN DRAW ─────────────────────────────────────────────
  function drawCertificate(cert) {
    // Canvas: A4 landscape proportions, high DPI
    var W = 1680, H = 1188, cx = W / 2;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');

    // ── Background: pure white like LinkedIn Learning ────────
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // ── Subtle outer border ───────────────────────────────────
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // ── Top gradient stripe — LedgerLearn brand ───────────────
    var topGrad = ctx.createLinearGradient(0, 0, W, 0);
    topGrad.addColorStop(0, '#0B1F3A');
    topGrad.addColorStop(0.4, '#D4A843');
    topGrad.addColorStop(0.7, '#1DA98A');
    topGrad.addColorStop(1, '#0B1F3A');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 12);

    // ── Bottom gradient stripe ────────────────────────────────
    var botGrad = ctx.createLinearGradient(0, 0, W, 0);
    botGrad.addColorStop(0, '#1DA98A');
    botGrad.addColorStop(0.5, '#D4A843');
    botGrad.addColorStop(1, '#0B1F3A');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, H - 12, W, 12);

    // ── Very subtle background watermark ─────────────────────
    ctx.save();
    ctx.globalAlpha = 0.015;
    drawHex(ctx, W * 0.85, H * 0.45, 320, '#0B1F3A');
    drawHex(ctx, W * 0.12, H * 0.6, 180, '#D4A843');
    ctx.restore();

    // ── HEADER: LedgerLearn Pro logo centered ─────────────────
    var logoY = 80;
    // Hex logo icon
    var hexR = 18;
    drawHex(ctx, cx - 130, logoY, hexR, '#D4A843');
    // Brand name
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0B1F3A';
    ctx.fillText('LedgerLearn', cx - 24, logoY + 12);
    ctx.fillStyle = '#D4A843';
    ctx.fillText(' Pro', cx + 70, logoY + 12);

    // Tagline
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Professional Xero Certification Platform', cx, logoY + 40);

    // Thin divider under header
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(120, 140); ctx.lineTo(W - 120, 140); ctx.stroke();

    // ── "CERTIFICATE OF COMPLETION" label ─────────────────────
    var labelY = 195;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.letterSpacing = '0.1em';
    ctx.fillText('C E R T I F I C A T E   O F   C O M P L E T I O N', cx, labelY);

    // ── COURSE / CERT TITLE — large, like LinkedIn ────────────
    var titleY = 310;
    var title = cert.certTitle || 'Xero Certified Practitioner — Level 1';
    // Measure and split if too long
    ctx.font = 'bold 72px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#0f172a';
    var titleWidth = ctx.measureText(title).width;
    if (titleWidth > W - 280) {
      // Split at em dash
      var parts = title.split('—');
      if (parts.length > 1) {
        ctx.font = 'bold 64px Georgia, serif';
        ctx.fillText(parts[0].trim(), cx, titleY - 30);
        ctx.fillStyle = '#D4A843';
        ctx.font = 'bold 56px Georgia, serif';
        ctx.fillText('— ' + parts[1].trim(), cx, titleY + 42);
        ctx.fillStyle = '#0f172a';
      } else {
        ctx.font = 'bold 58px Georgia, serif';
        ctx.fillText(title, cx, titleY);
      }
    } else {
      ctx.fillText(title, cx, titleY);
    }

    // ── "Awarded to" ──────────────────────────────────────────
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Awarded to', cx, 400);

    // ── CANDIDATE NAME — bold, prominent ─────────────────────
    var nameY = 490;
    var name = cert.candidateName || 'Candidate';
    ctx.font = 'bold 80px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(name, cx, nameY);

    // Name underline — gold gradient
    var nw = Math.min(ctx.measureText(name).width * 0.6, 600);
    var ulGrad = ctx.createLinearGradient(cx - nw / 2, 0, cx + nw / 2, 0);
    ulGrad.addColorStop(0, 'rgba(212,168,67,0)');
    ulGrad.addColorStop(0.3, '#D4A843');
    ulGrad.addColorStop(0.7, '#1DA98A');
    ulGrad.addColorStop(1, 'rgba(29,169,138,0)');
    ctx.strokeStyle = ulGrad; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - nw / 2, nameY + 12); ctx.lineTo(cx + nw / 2, nameY + 12); ctx.stroke();

    // ── Date & Level info ─────────────────────────────────────
    var dateStr = cert.issueDate || new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'});
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(dateStr, cx, 548);

    // ── Skills / level pills ──────────────────────────────────
    var pillY = 600;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Skills covered', cx, pillY);

    // Build pills from level
    var levelParts = (cert.certLevel || '').split('·').map(function(s) { return s.trim(); }).filter(Boolean);
    // Always include core skills
    var skills = ['Xero Cloud Accounting'];
    if (cert.certRegionLabel) skills.push(cert.certRegionLabel + ' Practice');
    if (cert.certRegion && cert.certRegion !== 'GLOBAL') {
      // Add tax body
      var taxBodies = {UK:'HMRC/VAT',NG:'FIRS/VAT',ZA:'SARS/VAT',AU:'ATO/GST',NZ:'IRD/GST',IE:'Revenue/VAT',AE:'FTA/VAT',CA:'CRA/GST',US:'IRS/Tax'};
      if (taxBodies[cert.certRegion]) skills.push(taxBodies[cert.certRegion]);
    }
    if ((cert.certTitle||'').includes('Level 1') || (cert.certTitle||'').includes('L1')) {
      skills.push('Invoicing'); skills.push('Bank Reconciliation');
    }
    if ((cert.certTitle||'').includes('Level 2') || (cert.certTitle||'').includes('L2')) {
      skills.push('VAT Returns'); skills.push('Financial Reporting');
    }
    if ((cert.certTitle||'').includes('Level 3') || (cert.certTitle||'').includes('L3')) {
      skills.push('Advisory Reporting'); skills.push('Practice Management');
    }
    skills = skills.slice(0, 5); // max 5 pills

    // Draw pills
    ctx.font = 'bold 15px system-ui, sans-serif';
    var pillWidths = skills.map(function(s) { return ctx.measureText(s).width + 32; });
    var totalPillW = pillWidths.reduce(function(a,b){return a+b;},0) + (skills.length - 1) * 12;
    var pillStartX = cx - totalPillW / 2;
    var px = pillStartX;
    for (var i = 0; i < skills.length; i++) {
      var pw = pillWidths[i];
      var ph = 34;
      rr(ctx, px, pillY + 14, pw, ph, 17);
      ctx.fillStyle = '#f1f5f9'; ctx.fill();
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'center';
      ctx.fillText(skills[i], px + pw / 2, pillY + 14 + 22);
      px += pw + 12;
    }
    ctx.textAlign = 'center';

    // ── Horizontal divider ────────────────────────────────────
    var divY = 680;
    ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(100, divY); ctx.lineTo(W - 100, divY); ctx.stroke();

    // ── BOTTOM ROW: Signature | Seal | Date/Info ──────────────
    var botY = 760; // baseline for bottom section

    // LEFT: Signature
    var sigX = 240;
    drawSignature(ctx, 'David Ayomidotun', sigX - 20, botY - 20, 40);
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sigX - 110, botY + 5); ctx.lineTo(sigX + 110, botY + 5); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('David Ayomidotun', sigX, botY + 28);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Platform Director', sigX, botY + 48);
    ctx.fillText('LedgerLearn Pro', sigX, botY + 65);

    // CENTRE: Verification badge (circular, like LinkedIn)
    var badgeR = 58;
    drawBadge(ctx, cx, botY + 18, badgeR);

    // RIGHT: Score + Certificate ID
    var infoX = W - 240;
    ctx.textAlign = 'center';
    if (cert.score) {
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.fillStyle = '#1DA98A';
      ctx.fillText(cert.score + '%', infoX, botY - 10);
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Assessment Score', infoX, botY + 12);
    }
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(infoX - 110, botY + 22); ctx.lineTo(infoX + 110, botY + 22); ctx.stroke();
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Certificate ID', infoX, botY + 44);
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(cert.certId || 'LL-2026-XXXX', infoX, botY + 62);

    // ── Footer ────────────────────────────────────────────────
    var footY = H - 36;
    var dom = (typeof window !== 'undefined' && window.location) 
      ? (window.location.hostname === 'localhost' ? 'ledgerlearn.pro' : window.location.hostname)
      : 'ledgerlearn.pro';
    ctx.textAlign = 'center';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(
      'Verify this certificate at ' + dom + '/verify  ·  ID: ' + (cert.certId || '') + '  ·  Issued: ' + dateStr,
      cx, footY
    );

    // ── Region badge (bottom-left corner) ─────────────────────
    if (cert.certRegionLabel && cert.certRegion !== 'GLOBAL') {
      var regionText = '🌍 ' + cert.certRegionLabel + ' · ' + (cert.certRegionSuffix || '');
      ctx.font = '13px system-ui, sans-serif';
      var rbW = ctx.measureText(regionText).width + 24;
      rr(ctx, 60, H - 70, rbW, 28, 14);
      ctx.fillStyle = '#f8fafc'; ctx.fill();
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText(regionText, 72, H - 51);
      ctx.textAlign = 'center';
    }

    return canvas;
  }

  // ── Download ──────────────────────────────────────────────
  function doDownload(cert) {
    var canvas = drawCertificate(cert);
    var link = document.createElement('a');
    var safeName = (cert.candidateName || 'Certificate').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ /g, '_');
    link.download = 'LedgerLearn_Certificate_' + safeName + '.png';
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
    toast('Certificate downloaded ✓', 'success');
  }

  // ── Share LinkedIn ─────────────────────────────────────────
  function doShare(cert) {
    var title  = cert.certTitle  || 'Xero Certified Practitioner — Level 1';
    var score  = cert.score ? ' Score: ' + cert.score + '%.' : '';
    var region = cert.certRegionLabel ? ' ' + cert.certRegionLabel + ' practice.' : '';
    var certId = cert.certId || '';
    var dom    = window.location.hostname === 'localhost' ? 'ledgerlearn.pro' : window.location.hostname;

    var text =
      '🏆 I just earned my ' + title + ' from LedgerLearn Pro!' +
      score + region + '\n\n' +
      'LedgerLearn Pro is the go-to platform for bookkeepers certifying their Xero skills ' +
      '(also covering QuickBooks and Sage). L1 is free to start!\n\n' +
      '🔗 Verify my certificate: https://' + dom + '/verify?id=' + certId + '\n' +
      '📚 Start yours: https://' + dom + '\n\n' +
      '#Xero #CloudAccounting #Bookkeeping #CertifiedPractitioner #LedgerLearn ' +
      '#ProfessionalDevelopment #Accounting #XeroCertified';

    var url = 'https://www.linkedin.com/sharing/share-offsite/?url=' +
      encodeURIComponent('https://' + dom + '/verify?id=' + certId) +
      '&text=' + encodeURIComponent(text);

    window.open(url, '_blank', 'width=600,height=500');
    toast('Opening LinkedIn…', 'success');
  }

  // ── Wire up buttons ───────────────────────────────────────
  function wireButtons(cert) {
    var dlBtn = document.getElementById('btn-download-cert');
    var shBtn = document.getElementById('btn-share-linkedin');
    if (!cert) {
      if (dlBtn) dlBtn.style.display = 'none';
      if (shBtn) shBtn.style.display = 'none';
      return;
    }
    if (dlBtn) {
      dlBtn.style.display = '';
      dlBtn.onclick = function() { doDownload(cert); };
    }
    if (shBtn) {
      shBtn.style.display = '';
      shBtn.onclick = function() { doShare(cert); };
    }
  }

  // ── Preview in results card ───────────────────────────────
  function showPreview(cert) {
    var previewEl = document.getElementById('cert-preview-container');
    if (!previewEl) return;
    var canvas = drawCertificate(cert);
    canvas.style.cssText = 'max-width:100%;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.15);';
    previewEl.innerHTML = '';
    previewEl.appendChild(canvas);
  }

  // ── Watch for results / init ──────────────────────────────
  function init() {
    var cert = getCert();
    wireButtons(cert);
    if (cert) showPreview(cert);

    // Re-run when results appear
    var observer = new MutationObserver(function() {
      var c = getCert();
      if (c) { wireButtons(c); showPreview(c); }
    });
    var target = document.getElementById('results-card') || document.body;
    observer.observe(target, { childList: true, subtree: true, attributes: true });
  }

  // Public API
  window.CertEngine = {
    draw:     drawCertificate,
    download: doDownload,
    share:    doShare,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
