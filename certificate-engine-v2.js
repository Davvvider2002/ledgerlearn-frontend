// LedgerLearn certificate-engine.js v3.2 — LinkedIn-style design, safe polling
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

  // ── Real signature image ─────────────────────────────────
  var _SIG_URI = 'data:image/png;base64,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';
  var _SIG_IMG = null;
  var _SIG_READY = false;
  var _SIG_QUEUE = [];  // callbacks waiting for image

  (function() {
    try {
      var img = new Image();
      img.onload  = function() { _SIG_IMG = img; _SIG_READY = true; _SIG_QUEUE.forEach(function(fn){fn();}); _SIG_QUEUE=[]; };
      img.onerror = function() { _SIG_READY = true; /* fallback to text */ };
      img.src = _SIG_URI;
    } catch(e) { _SIG_READY = true; }
  })();

  function drawSignature(ctx, text, x, y, size, callback) {
    function _draw() {
      ctx.save();
      if (_SIG_IMG) {
        // Draw signature image — invert colours so it looks like dark ink on white
        // Original: black bg + grey sig → we want: transparent bg + dark sig
        var sw = 260;   // width to draw on certificate
        var sh = Math.round(sw * (_SIG_IMG.height / _SIG_IMG.width));
        var sx = x - sw / 2;
        var sy = y - sh * 0.65;

        // Use an offscreen canvas to invert and make bg transparent
        var off = document.createElement('canvas');
        off.width  = _SIG_IMG.width;
        off.height = _SIG_IMG.height;
        var octx = off.getContext('2d');
        // Draw original image
        octx.drawImage(_SIG_IMG, 0, 0);
        // Invert: black → transparent, grey sig → dark ink
        var imgData = octx.getImageData(0, 0, off.width, off.height);
        var d = imgData.data;
        for (var i = 0; i < d.length; i += 4) {
          var r = d[i], g = d[i+1], b = d[i+2];
          // Brightness of original pixel
          var brightness = (r + g + b) / 3;
          // The signature is light grey (brightness > 30) on black (brightness < 30)
          if (brightness < 25) {
            // Black background → fully transparent
            d[i+3] = 0;
          } else {
            // Signature stroke → dark navy ink, opacity proportional to brightness
            d[i]   = 15;   // R — dark navy
            d[i+1] = 31;   // G
            d[i+2] = 58;   // B — #0f1f3a
            d[i+3] = Math.min(255, Math.round(brightness * 2.2)); // enhance contrast
          }
        }
        octx.putImageData(imgData, 0, 0);

        // Draw the processed signature onto the certificate
        ctx.drawImage(off, sx, sy, sw, sh);
      } else {
        // Fallback: italic text signature
        ctx.font = 'italic ' + (size || 36) + 'px Georgia, "Times New Roman", serif';
        ctx.fillStyle = '#1a1a2e';
        ctx.transform(1, -0.06, 0.08, 1, 0, 0);
        ctx.fillText(text, x - 15, y + 8);
      }
      ctx.restore();
      if (callback) callback();
    }

    if (_SIG_READY) {
      _draw();
    } else {
      _SIG_QUEUE.push(_draw);
    }
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
  function drawCertificate(cert, onComplete) {
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

  // ── Draw with guaranteed signature loaded ─────────────────
  function drawCertificateWhenReady(cert, callback) {
    function go() {
      var canvas = drawCertificate(cert);
      callback(canvas);
    }
    if (_SIG_READY) { go(); }
    else { _SIG_QUEUE.push(go); }
  }

  // ── Download ──────────────────────────────────────────────
  function doDownload(cert) {
    toast('Preparing certificate…', 'success');
    drawCertificateWhenReady(cert, function(canvas) {
      var link = document.createElement('a');
      var safeName = (cert.candidateName || 'Certificate').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ /g, '_');
      link.download = 'LedgerLearn_Certificate_' + safeName + '.png';
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast('Certificate downloaded ✓', 'success');
    });
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
    try {
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
    } catch(e) { console.warn('[CertEngine] wireButtons error:', e); }
  }

  // ── Preview in results card ───────────────────────────────
  function showPreview(cert) {
    try {
      var previewEl = document.getElementById('cert-preview-container');
      if (!previewEl || !cert) return;
      drawCertificateWhenReady(cert, function(canvas) {
        canvas.style.cssText = 'max-width:100%;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.15);';
        previewEl.innerHTML = '';
        previewEl.appendChild(canvas);
      });
    } catch(e) { console.warn('[CertEngine] preview error:', e); }
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    try {
      var cert = getCert();
      wireButtons(cert);
      if (cert) showPreview(cert);
    } catch(e) { /* silent — cert not ready yet */ }
  }

  // Re-check every 500ms for up to 30s (handles async cert generation)
  var _pollCount = 0;
  var _pollInterval = setInterval(function() {
    _pollCount++;
    if (_pollCount > 60) { clearInterval(_pollInterval); return; }
    try {
      var c = getCert();
      if (c && c.certId) {
        wireButtons(c);
        showPreview(c);
        clearInterval(_pollInterval);
      }
    } catch(e) {}
  }, 500);

  // Public API
  window.CertEngine = {
    draw:          drawCertificate,
    drawWhenReady: drawCertificateWhenReady,
    download:      doDownload,
    share:         doShare,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      try { init(); } catch(e) { console.warn('[CertEngine] init error:', e); }
    });
  } else {
    try { init(); } catch(e) { console.warn('[CertEngine] init error:', e); }
  }
})();
