/**
 * LedgerLearn Pro — Certificate Engine
 * =====================================
 * Zero dependencies. Uses browser-native Canvas API only.
 * Works in Chrome, Firefox, Safari, Edge — guaranteed.
 *
 * Add to test.html before </body>:
 *   <script src="/certificate-engine.js"></script>
 */

(function() {
  'use strict';

  // ── Read certificate data from localStorage ───────────────
  function getCert() {
    // SOURCE 1: window._lastCertData — set directly by finishTest() (most reliable)
    if (window._lastCertData && window._lastCertData.score) {
      return window._lastCertData;
    }

    // SOURCE 2: localStorage — try all known keys
    const keys = ['ll_progress', 'ledgerlearn_progress'];
    for (const key of keys) {
      try {
        const d = JSON.parse(localStorage.getItem(key) || '{}');
        if (d.certificate && (d.certificate.certId || d.certificate.score)) {
          window._lastCertData = d.certificate; // cache it
          return d.certificate;
        }
      } catch(e) {}
    }

    // SOURCE 3: Scrape the results from the DOM (handles old sessions)
    // The results card is already visible on screen with name and score
    try {
      const scoreEl = document.getElementById('results-score');
      const scoreText = scoreEl ? scoreEl.textContent.replace('%','').trim() : null;
      const score = scoreText ? parseInt(scoreText) : null;

      // Try to get name from nav avatar or user storage
      const u = JSON.parse(localStorage.getItem('ll_user') || '{}');
      const navName = document.getElementById('nav-user-name');
      const name = u.name || (navName ? navName.textContent.trim() : '') || 'Candidate';

      if (score && score >= 70) {
        const cert = {
          candidateName: name,
          certTitle:     'Xero Certified Practitioner — Level 1',
          certLevel:     'L1 · Associate · Xero Cloud Accounting · LedgerLearn Pro',
          certId:        'LLP-XCP1-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random()*9000),
          issueDate:     new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'}),
          score:         score,
        };
        window._lastCertData = cert; // cache for this session
        // Persist to localStorage
        try {
          const p = JSON.parse(localStorage.getItem('ll_progress') || '{}');
          p.lastScore   = score;
          p.certificate = cert;
          p.certId      = cert.certId;
          localStorage.setItem('ll_progress', JSON.stringify(p));
        } catch(e) {}
        return cert;
      }
    } catch(e) {}

    // SOURCE 4: Reconstruct from lastScore in localStorage
    try {
      const p = JSON.parse(localStorage.getItem('ll_progress') || '{}');
      const u = JSON.parse(localStorage.getItem('ll_user') || '{}');
      if (p.lastScore) {
        const cert = {
          candidateName: u.name || 'Candidate',
          certTitle:     'Xero Certified Practitioner — Level 1',
          certLevel:     'L1 · Associate · Xero Cloud Accounting · LedgerLearn Pro',
          certId:        p.certId || ('LLP-XCP1-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random()*9000)),
          issueDate:     p.issueDate || new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'}),
          score:         p.lastScore,
        };
        p.certificate = cert;
        p.certId      = cert.certId;
        localStorage.setItem('ll_progress', JSON.stringify(p));
        window._lastCertData = cert;
        return cert;
      }
    } catch(e) {}

    return null;
  }

  // ── Toast ─────────────────────────────────────────────────
  function toast(msg, type) {
    const colours = {success:'#1DA98A', error:'#e05555', info:'#D4A843'};
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:99999;' +
      'background:'+(colours[type]||colours.success)+';color:#fff;' +
      'font-family:system-ui,sans-serif;font-size:14px;font-weight:600;' +
      'padding:12px 20px;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.3);' +
      'max-width:320px;line-height:1.4;cursor:pointer;';
    el.onclick = () => el.remove();
    document.body.appendChild(el);
    setTimeout(() => { el.style.transition='opacity 0.4s'; el.style.opacity='0'; setTimeout(()=>el.remove(),400); }, 4000);
  }

  // ── Draw certificate on Canvas ────────────────────────────
  function drawCertificate(cert) {
    // A4 landscape at 150dpi → 1748 × 1240 px
    const W = 1748, H = 1240;
    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // ── Background ──────────────────────────────────────────
    ctx.fillStyle = '#f8f7f4';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(24, 24, W-48, H-48);

    // ── Top gradient bar ────────────────────────────────────
    const topGrad = ctx.createLinearGradient(0, 0, W, 0);
    topGrad.addColorStop(0,    '#0B1F3A');
    topGrad.addColorStop(0.45, '#D4A843');
    topGrad.addColorStop(1,    '#1DA98A');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 22);

    // ── Bottom gradient bar ──────────────────────────────────
    const botGrad = ctx.createLinearGradient(0, 0, W, 0);
    botGrad.addColorStop(0,   '#1DA98A');
    botGrad.addColorStop(0.6, '#D4A843');
    botGrad.addColorStop(1,   '#0B1F3A');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, H-14, W, 14);

    // ── Left accent lines ────────────────────────────────────
    ctx.fillStyle = '#D4A843';
    ctx.fillRect(24, 24, 4, H-48);
    ctx.fillStyle = '#1DA98A';
    ctx.fillRect(32, 24, 2, H-48);

    // ── Watermark hex (background) ──────────────────────────
    ctx.save();
    ctx.globalAlpha = 0.025;
    ctx.fillStyle   = '#0B1F3A';
    drawHex(ctx, W*0.82, H*0.48, 280);
    ctx.restore();

    // ── Logo ────────────────────────────────────────────────
    ctx.fillStyle = '#D4A843';
    drawHex(ctx, 72, H-58, 20);

    ctx.font      = 'bold 28px system-ui,sans-serif';
    ctx.fillStyle = '#0B1F3A';
    ctx.fillText('LedgerLearn', 102, H-44);
    ctx.fillStyle = '#D4A843';
    ctx.fillText(' Pro', 102 + ctx.measureText('LedgerLearn').width, H-44);

    // ── Certificate ID (top right) ──────────────────────────
    const idText = 'Certificate ID: ' + (cert.certId || '—');
    ctx.font = '20px system-ui,sans-serif';
    const idW = ctx.measureText(idText).width + 30;
    ctx.fillStyle = '#e8ecf0';
    roundRect(ctx, W - idW - 50, H-80, idW, 36, 6);
    ctx.fill();
    ctx.fillStyle = '#6b87a3';
    ctx.fillText(idText, W - idW - 35, H-57);

    // ── "This certifies that" ────────────────────────────────
    const cx = W / 2;
    ctx.font = 'bold 22px system-ui,sans-serif';
    ctx.fillStyle = '#6b87a3';
    ctx.letterSpacing = '6px';
    ctx.textAlign = 'center';
    ctx.fillText('THIS CERTIFIES THAT', cx, H - 240);
    ctx.letterSpacing = '0px';

    // ── Candidate name ───────────────────────────────────────
    ctx.font      = 'bold italic 88px Georgia,serif';
    ctx.fillStyle = '#0B1F3A';
    ctx.fillText(cert.candidateName || 'Candidate', cx, H - 160);

    // Name underline gradient
    const nameW = ctx.measureText(cert.candidateName || 'Candidate').width * 0.55;
    const lineGrad = ctx.createLinearGradient(cx - nameW/2, 0, cx + nameW/2, 0);
    lineGrad.addColorStop(0, '#D4A843');
    lineGrad.addColorStop(1, '#1DA98A');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth   = 5;
    ctx.beginPath();
    ctx.moveTo(cx - nameW/2, H - 140);
    ctx.lineTo(cx + nameW/2, H - 140);
    ctx.stroke();

    // ── "has successfully completed" ────────────────────────
    ctx.font      = '26px system-ui,sans-serif';
    ctx.fillStyle = '#6b87a3';
    ctx.fillText('has successfully completed all requirements for', cx, H - 105);

    // ── Certificate title ────────────────────────────────────
    ctx.font      = 'bold 48px system-ui,sans-serif';
    ctx.fillStyle = '#0B1F3A';
    ctx.fillText(cert.certTitle || 'Xero Certified Practitioner — Level 1', cx, H - 48);

    // ── Level pill ───────────────────────────────────────────
    const lvlText  = cert.certLevel || 'Associate · Xero Cloud Accounting · LedgerLearn Pro';
    ctx.font       = 'bold 20px system-ui,sans-serif';
    const lvlW     = ctx.measureText(lvlText).width + 40;
    const lvlX     = cx - lvlW / 2;
    const lvlY     = H + 10;   // will draw relative to bottom sections

    // Recalculate positions from top for clarity
    const MID_Y = H / 2;

    // ── "This certifies that" (centered vertically) ──────────
    // Redraw all text properly centered
    ctx.clearRect(0, 22, W, H-36); // clear content area, keep bars

    // Redo background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(24, 24, W-48, H-48);
    ctx.fillStyle = '#D4A843';
    ctx.fillRect(24, 24, 4, H-48);
    ctx.fillStyle = '#1DA98A';
    ctx.fillRect(32, 24, 2, H-48);
    ctx.save(); ctx.globalAlpha=0.025; ctx.fillStyle='#0B1F3A'; drawHex(ctx,W*0.82,H*0.48,280); ctx.restore();
    ctx.fillStyle = '#D4A843'; drawHex(ctx, 72, H-58, 20);
    ctx.font='bold 28px system-ui,sans-serif'; ctx.textAlign='left';
    ctx.fillStyle='#0B1F3A'; ctx.fillText('LedgerLearn',102,H-44);
    ctx.fillStyle='#D4A843'; ctx.fillText(' Pro',102+ctx.measureText('LedgerLearn').width,H-44);
    ctx.font='20px system-ui,sans-serif';
    const idW2=ctx.measureText(idText).width+30;
    ctx.fillStyle='#e8ecf0'; roundRect(ctx,W-idW2-50,H-80,idW2,36,6); ctx.fill();
    ctx.fillStyle='#6b87a3'; ctx.fillText(idText,W-idW2-35,H-57);

    // All centered content
    ctx.textAlign = 'center';

    // Certifies that
    ctx.font='bold 22px system-ui,sans-serif';
    ctx.fillStyle='#6b87a3';
    ctx.fillText('THIS CERTIFIES THAT', cx, 220);

    // Name
    ctx.font='bold italic 90px Georgia,serif';
    ctx.fillStyle='#0B1F3A';
    ctx.fillText(cert.candidateName||'Candidate', cx, 340);

    // Underline
    const nw2=ctx.measureText(cert.candidateName||'Candidate').width*0.55;
    const lg2=ctx.createLinearGradient(cx-nw2/2,0,cx+nw2/2,0);
    lg2.addColorStop(0,'#D4A843'); lg2.addColorStop(1,'#1DA98A');
    ctx.strokeStyle=lg2; ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(cx-nw2/2,358); ctx.lineTo(cx+nw2/2,358); ctx.stroke();

    // Completed text
    ctx.font='26px system-ui,sans-serif';
    ctx.fillStyle='#6b87a3';
    ctx.fillText('has successfully completed all requirements for', cx, 410);

    // Cert title
    ctx.font='bold 50px system-ui,sans-serif';
    ctx.fillStyle='#0B1F3A';
    ctx.fillText(cert.certTitle||'Xero Certified Practitioner — Level 1', cx, 490);

    // Score badge
    if (cert.score) {
      const scoreTxt='Score: '+cert.score+'%';
      ctx.font='bold 22px system-ui,sans-serif';
      const sw=ctx.measureText(scoreTxt).width+30;
      ctx.fillStyle='#e1f7f2'; roundRect(ctx,cx-sw/2,508,sw,36,18); ctx.fill();
      ctx.strokeStyle='rgba(29,169,138,0.4)'; ctx.lineWidth=1;
      roundRect(ctx,cx-sw/2,508,sw,36,18); ctx.stroke();
      ctx.fillStyle='#1DA98A'; ctx.fillText(scoreTxt,cx,532);
    }

    // Level badge
    ctx.font='bold 22px system-ui,sans-serif';
    const lvlTxt=cert.certLevel||'Associate · Xero Cloud Accounting · LedgerLearn Pro';
    const lw3=ctx.measureText(lvlTxt).width+40;
    ctx.fillStyle='#e1f7f2'; roundRect(ctx,cx-lw3/2,560,lw3,38,19); ctx.fill();
    ctx.strokeStyle='rgba(29,169,138,0.3)'; ctx.lineWidth=1;
    roundRect(ctx,cx-lw3/2,560,lw3,38,19); ctx.stroke();
    ctx.fillStyle='#1DA98A'; ctx.fillText(lvlTxt,cx,585);

    // ── Footer divider ───────────────────────────────────────
    ctx.strokeStyle='#e8ecf0'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(60,680); ctx.lineTo(W-60,680); ctx.stroke();

    // Left signature
    ctx.textAlign='center';
    ctx.font='bold italic 28px Georgia,serif';
    ctx.fillStyle='#0B1F3A';
    ctx.fillText('David Ayomidotun', 200, 730);
    ctx.font='18px system-ui,sans-serif';
    ctx.fillStyle='#6b87a3';
    ctx.fillText('Platform Director', 200, 756);
    ctx.fillText('LedgerLearn Pro', 200, 778);
    ctx.strokeStyle='#e8ecf0'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(80,680); ctx.lineTo(340,680); ctx.stroke();

    // Right signature - date
    ctx.font='bold 28px system-ui,sans-serif';
    ctx.fillStyle='#0B1F3A';
    ctx.fillText(cert.issueDate||new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}), W-200, 730);
    ctx.font='18px system-ui,sans-serif';
    ctx.fillStyle='#6b87a3';
    ctx.fillText('Date of Issue', W-200, 756);
    ctx.strokeStyle='#e8ecf0'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(W-340,680); ctx.lineTo(W-80,680); ctx.stroke();

    // ── Seal ────────────────────────────────────────────────
    const sx=cx, sy=718, sr=56;
    ctx.strokeStyle='#D4A843'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([4,6]); ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(sx,sy,sr-10,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#ffffff';
    ctx.beginPath(); ctx.arc(sx,sy,sr-12,0,Math.PI*2); ctx.fill();
    ctx.font='bold 16px system-ui,sans-serif';
    ctx.fillStyle='#a07c2a';
    ctx.fillText('LEDGERLEARN', sx, sy+4);
    ctx.fillText('VERIFIED', sx, sy+24);
    ctx.fillStyle='#D4A843'; drawHex(ctx, sx, sy-12, 10);

    // ── Verify URL ───────────────────────────────────────────
    ctx.textAlign='center';
    ctx.font='18px system-ui,sans-serif';
    ctx.fillStyle='#6b87a3';
    const domain = window.location.hostname === 'localhost' ? 'ledgerlearn.pro' : window.location.hostname;
    ctx.fillText('Verify at: '+domain+'/verify  ·  ID: '+(cert.certId||''), cx, H-32);

    return canvas;
  }

  // ── Helper: hexagon ──────────────────────────────────────
  function drawHex(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (90 + 60 * i);
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // ── Helper: rounded rect ─────────────────────────────────
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  // ── Download as PNG ──────────────────────────────────────
  function downloadCertificate() {
    const cert = getCert();
    if (!cert) {
      toast('No certificate found. Please complete and pass the assessment first.', 'error');
      return;
    }

    toast('Generating your certificate…', 'info');

    setTimeout(() => {
      try {
        const canvas = drawCertificate(cert);
        const name   = (cert.candidateName || 'Candidate').replace(/\s+/g, '_');
        const fname  = 'LedgerLearn_Certificate_' + name + '_' + (cert.certId||'cert') + '.png';

        canvas.toBlob(function(blob) {
          if (!blob) { printCertificate(cert); return; }
          const url  = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href     = url;
          link.download = fname;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => { URL.revokeObjectURL(url); link.remove(); }, 1000);
          toast('Certificate downloaded! ✓', 'success');
        }, 'image/png');

      } catch(e) {
        console.error('[Cert]', e);
        printCertificate(cert);
      }
    }, 100);
  }

  // ── Print / save as PDF fallback ─────────────────────────
  function printCertificate(cert) {
    if (!cert) cert = getCert();
    if (!cert) { toast('No certificate data found.', 'error'); return; }

    const domain = window.location.hostname === 'localhost' ? 'ledgerlearn.pro' : window.location.hostname;
    const issueD = cert.issueDate || new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});

    const html = '<!DOCTYPE html><html lang="en"><head>' +
      '<meta charset="UTF-8">' +
      '<title>Certificate — ' + (cert.candidateName||'Candidate') + '</title>' +
      '<style>' +
      '@import url(\'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;600;700&display=swap\');' +
      '*{margin:0;padding:0;box-sizing:border-box;}' +
      'body{font-family:\'DM Sans\',system-ui,sans-serif;background:#e8ecf0;min-height:100vh;padding:2rem;display:flex;flex-direction:column;align-items:center;gap:1.5rem;}' +
      '.cert{background:#fff;width:100%;max-width:900px;aspect-ratio:1.414/1;position:relative;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.2);display:flex;flex-direction:column;}' +
      '.bar-top{height:8px;flex-shrink:0;background:linear-gradient(90deg,#0B1F3A 0%,#D4A843 45%,#1DA98A 100%);}' +
      '.body{flex:1;padding:clamp(1.5rem,4vw,3rem);display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;overflow:hidden;}' +
      '.watermark{position:absolute;right:-2rem;bottom:-3rem;font-size:min(18rem,40vw);color:rgba(11,31,58,0.025);line-height:1;pointer-events:none;font-family:\'Syne\',sans-serif;}' +
      '.logo{font-family:\'Syne\',sans-serif;font-size:clamp(0.8rem,1.5vw,1rem);font-weight:700;color:#0B1F3A;margin-bottom:clamp(1rem,3vw,2rem);}' +
      '.logo span{color:#D4A843;}' +
      '.certifies{font-size:clamp(0.55rem,1vw,0.7rem);text-transform:uppercase;letter-spacing:0.14em;color:#6b87a3;margin-bottom:0.4rem;}' +
      '.name{font-family:Georgia,serif;font-size:clamp(1.6rem,4.5vw,2.8rem);font-weight:700;font-style:italic;color:#0B1F3A;margin-bottom:0.3rem;}' +
      '.divider{width:60px;height:2.5px;background:linear-gradient(90deg,#D4A843,#1DA98A);margin:0.5rem auto;border-radius:2px;}' +
      '.completed{font-size:clamp(0.65rem,1.2vw,0.82rem);color:#6b87a3;margin-bottom:0.6rem;}' +
      '.title{font-family:\'Syne\',sans-serif;font-size:clamp(0.95rem,2.2vw,1.35rem);font-weight:700;color:#0B1F3A;margin-bottom:0.5rem;letter-spacing:-0.01em;}' +
      '.level{display:inline-block;background:#e1f7f2;border:1px solid rgba(29,169,138,0.3);color:#1DA98A;font-size:clamp(0.58rem,1vw,0.68rem);font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:3px 12px;border-radius:100px;margin-bottom:0.4rem;}' +
      '.score{display:inline-block;background:#fdf3dc;border:1px solid rgba(212,168,67,0.3);color:#9a7320;font-size:clamp(0.6rem,1vw,0.72rem);font-weight:700;padding:3px 12px;border-radius:100px;margin-bottom:0.75rem;}' +
      '.footer{display:flex;align-items:flex-end;justify-content:space-between;width:100%;margin-top:auto;padding-top:clamp(0.75rem,2vw,1.25rem);border-top:1px solid #e8ecf0;}' +
      '.sig{text-align:center;}' +
      '.sig-line{width:90px;height:1px;background:#e8ecf0;margin:0 auto 4px;}' +
      '.sig-name{font-family:Georgia,serif;font-size:clamp(0.75rem,1.5vw,0.95rem);font-style:italic;color:#0B1F3A;font-weight:700;}' +
      '.sig-role{font-size:clamp(0.5rem,0.9vw,0.62rem);text-transform:uppercase;letter-spacing:0.08em;color:#6b87a3;margin-top:2px;}' +
      '.seal{width:clamp(50px,8vw,70px);height:clamp(50px,8vw,70px);border-radius:50%;border:2px solid #D4A843;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;position:relative;flex-shrink:0;}' +
      '.seal::before{content:"";position:absolute;inset:4px;border-radius:50%;border:1px dashed rgba(212,168,67,0.4);}' +
      '.seal-text{font-family:\'Syne\',sans-serif;font-size:clamp(0.3rem,0.6vw,0.42rem);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#a07c2a;line-height:1.5;position:relative;z-index:1;}' +
      '.verify{font-size:clamp(0.45rem,0.85vw,0.58rem);color:#6b87a3;margin-top:0.5rem;}' +
      '.bar-bot{height:4px;flex-shrink:0;background:linear-gradient(90deg,#1DA98A 0%,#D4A843 60%,#0B1F3A 100%);}' +
      '.actions{display:flex;gap:0.75rem;flex-wrap:wrap;justify-content:center;}' +
      '.btn-print{background:#1DA98A;color:#fff;border:none;padding:13px 28px;font-family:\'DM Sans\',system-ui,sans-serif;font-size:1rem;font-weight:700;border-radius:8px;cursor:pointer;}' +
      '.btn-dl{background:#D4A843;color:#0B1F3A;border:none;padding:13px 28px;font-family:\'DM Sans\',system-ui,sans-serif;font-size:1rem;font-weight:700;border-radius:8px;cursor:pointer;}' +
      '.btn-close{background:#f0f2f5;border:none;padding:13px 20px;font-family:\'DM Sans\',system-ui,sans-serif;font-size:0.9rem;border-radius:8px;cursor:pointer;}' +
      '.hint{font-size:0.78rem;color:#6b87a3;text-align:center;}' +
      '@media print{body{background:#fff;padding:0;}.actions,.hint{display:none!important;}.cert{box-shadow:none;max-width:100%;width:100%;}}' +
      '</style></head><body>' +
      '<div class="cert">' +
        '<div class="bar-top"></div>' +
        '<div class="body">' +
          '<div class="watermark">⬡</div>' +
          '<div class="logo">Ledger<span>Learn</span> Pro</div>' +
          '<div class="certifies">This certifies that</div>' +
          '<div class="name">' + (cert.candidateName||'Candidate') + '</div>' +
          '<div class="divider"></div>' +
          '<div class="completed">has successfully completed all requirements for</div>' +
          '<div class="title">' + (cert.certTitle||'Xero Certified Practitioner — Level 1') + '</div>' +
          '<div class="level">' + (cert.certLevel||'Associate · Xero Cloud Accounting · LedgerLearn Pro') + '</div><br>' +
          (cert.score ? '<div class="score">Score: '+cert.score+'% — Passed ✓</div>' : '') +
          '<div class="footer">' +
            '<div class="sig"><div class="sig-line"></div><div class="sig-name">David Ayomidotun</div><div class="sig-role">Platform Director · LedgerLearn Pro</div></div>' +
            '<div class="seal"><div class="seal-text">LEDGER<br>LEARN<br>VERIFIED</div></div>' +
            '<div class="sig"><div class="sig-line"></div><div class="sig-name" style="font-style:normal;font-size:clamp(0.7rem,1.4vw,0.9rem)">' + issueD + '</div><div class="sig-role">Date of Issue</div></div>' +
          '</div>' +
          '<div class="verify">Certificate ID: ' + (cert.certId||'—') + ' &nbsp;·&nbsp; Verify: ' + domain + '/verify</div>' +
        '</div>' +
        '<div class="bar-bot"></div>' +
      '</div>' +
      '<div class="actions">' +
        '<button class="btn-print" onclick="window.print()">🖨️ Save as PDF (Print → Save as PDF)</button>' +
        '<button class="btn-close" onclick="window.close()">Close</button>' +
      '</div>' +
      '<p class="hint">In the print dialog: select "Save as PDF" as the destination, set paper to A4 Landscape.</p>' +
      '</body></html>';

    const blob = new Blob([html], {type:'text/html'});
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (!win) {
      // Popup blocked — download as HTML file
      const link = document.createElement('a');
      link.href     = url;
      link.download = 'LedgerLearn_Certificate_' + (cert.candidateName||'cert').replace(/\s+/g,'_') + '.html';
      link.click();
    }
    toast('Certificate opened — use Print → Save as PDF', 'success');
  }

  // ── LinkedIn share ────────────────────────────────────────
  function shareLinkedIn() {
    const cert = getCert();
    if (!cert) { toast('No certificate found. Complete the assessment first.', 'error'); return; }

    const domain   = window.location.hostname === 'localhost' ? 'ledgerlearn.pro' : window.location.hostname;
    const verifyUrl= 'https://' + domain + '/verify';

    const text = [
      '🏆 Just earned my ' + (cert.certTitle||'Xero Certified Practitioner L1') + ' from LedgerLearn Pro!',
      '',
      '✅ Score: ' + (cert.score||'') + '%',
      '🔍 Certificate ID: ' + (cert.certId||''),
      '🔗 Verify: ' + verifyUrl,
      '',
      '#Xero #Accounting #Bookkeeping #CertifiedPractitioner #LedgerLearn #CloudAccounting',
    ].join('\n');

    const liUrl = 'https://www.linkedin.com/sharing/share-offsite/?' +
      'url=' + encodeURIComponent(verifyUrl) +
      '&summary=' + encodeURIComponent(text);

    // Try popup first
    const popup = window.open(liUrl, 'linkedin', 'width=600,height=620,scrollbars=yes');

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // Popup blocked — try direct navigation in new tab
      const a = document.createElement('a');
      a.href   = liUrl;
      a.target = '_blank';
      a.rel    = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    // Copy text to clipboard as backup
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toast('LinkedIn opened + post text copied to clipboard! ✓', 'success');
      }).catch(() => {
        toast('LinkedIn opened! ✓', 'success');
      });
    } else {
      toast('LinkedIn opened! ✓', 'success');
    }
  }

  // ── Wire to global scope ──────────────────────────────────
  // Accept cert data directly (bypasses localStorage entirely)
  function downloadWithData(certData) {
    if (!certData) { downloadCertificate(); return; }
    toast('Generating your certificate…', 'info');
    setTimeout(function() {
      try {
        var canvas = drawCertificate(certData);
        var name   = (certData.candidateName || 'Candidate').replace(/\s+/g, '_');
        var fname  = 'LedgerLearn_Certificate_' + name + '_' + (certData.certId || 'cert') + '.png';
        canvas.toBlob(function(blob) {
          if (!blob) { printCertificate(certData); return; }
          var url  = URL.createObjectURL(blob);
          var link = document.createElement('a');
          link.href = url; link.download = fname; link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(function() { URL.revokeObjectURL(url); link.remove(); }, 1000);
          toast('Certificate downloaded! ✓', 'success');
        }, 'image/png');
      } catch(e) {
        console.error('[Cert]', e);
        printCertificate(certData);
      }
    }, 100);
  }

  function shareWithData(certData) {
    if (!certData) { shareLinkedIn(); return; }
    var domain    = window.location.hostname === 'localhost' ? 'ledgerlearn.pro' : window.location.hostname;
    var verifyUrl = 'https://' + domain + '/verify';
    var text = [
      '🏆 Just earned my ' + (certData.certTitle || 'Xero Certified Practitioner L1') + ' from LedgerLearn Pro!',
      '',
      '✅ Score: ' + (certData.score || '') + '%',
      '🔍 Certificate ID: ' + (certData.certId || ''),
      '🔗 Verify: ' + verifyUrl,
      '',
      '#Xero #Accounting #Bookkeeping #CertifiedPractitioner #LedgerLearn',
    ].join('\n');
    var liUrl  = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(verifyUrl) + '&summary=' + encodeURIComponent(text);
    var popup  = window.open(liUrl, 'linkedin', 'width=600,height=620,scrollbars=yes');
    if (!popup || popup.closed) {
      var a = document.createElement('a');
      a.href = liUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
      document.body.appendChild(a); a.click(); a.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        toast('LinkedIn opened + post text copied! ✓', 'success');
      }).catch(function() { toast('LinkedIn opened! ✓', 'success'); });
    } else {
      toast('LinkedIn opened! ✓', 'success');
    }
  }

  window.LedgerLearnCert = {
    download:         downloadCertificate,
    downloadWithData: downloadWithData,
    share:            shareLinkedIn,
    shareWithData:    shareWithData,
    print:            printCertificate,
  };
  window.downloadCert        = downloadCertificate;
  window.downloadCertificate = downloadCertificate;
  window.shareLinkedIn       = shareLinkedIn;
  window.shareLinkedInCert   = shareLinkedIn;
  window.printCert      = printCertificate;
  window.shareLinkedIn  = shareLinkedIn;

  // Override LedgerCert if it exists
  window.LedgerCert = {
    generate:      (o) => { if (o && o.action === 'preview') printCertificate(getCert()); else downloadCertificate(); },
    shareLinkedIn: ()  => shareLinkedIn(),
    redownload:    ()  => downloadCertificate(),
  };

  // ── Auto-wire buttons by scanning DOM ────────────────────
  function wireButtons() {
    // If results card is visible with a score, pre-populate _lastCertData from DOM
    // This handles old sessions where finishTest() ran before this code existed
    if (!window._lastCertData) {
      try {
        const scoreEl = document.getElementById('results-score');
        const badgeEl = document.querySelector('.results-badge.pass, [class*="badge"][class*="pass"]');
        const passed  = !!badgeEl || (document.getElementById('results-card') &&
                          document.getElementById('results-card').style.display !== 'none' &&
                          document.querySelector('.btn-gold[onclick*="downloadCert"]'));

        if (scoreEl && passed) {
          const scoreText = scoreEl.textContent.replace('%','').trim();
          const score     = parseInt(scoreText);
          if (score >= 70) {
            const u    = JSON.parse(localStorage.getItem('ll_user') || '{}');
            const p    = JSON.parse(localStorage.getItem('ll_progress') || '{}');
            const name = u.name || p.name || 'Candidate';
            window._lastCertData = {
              candidateName: name,
              certTitle:     'Xero Certified Practitioner — Level 1',
              certLevel:     'L1 · Associate · Xero Cloud Accounting · LedgerLearn Pro',
              certId:        p.certificate && p.certificate.certId
                               ? p.certificate.certId
                               : ('LLP-XCP1-' + new Date().getFullYear() + '-' + Math.floor(1000+Math.random()*9000)),
              issueDate:     p.certificate && p.certificate.issueDate
                               ? p.certificate.issueDate
                               : new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}),
              score:         score,
            };
            console.log('[LedgerLearn] Certificate data recovered from DOM ✓ score:', score);
          }
        }
      } catch(e) {}
    }

    document.querySelectorAll('button, a[onclick]').forEach(el => {
      const txt     = (el.textContent || '').toLowerCase().trim();
      const onclick = (el.getAttribute('onclick') || '').toLowerCase();
      const id      = (el.id || '').toLowerCase();

      const isDownload = txt.includes('download') || onclick.includes('downloadcert') ||
                         id.includes('download') || onclick.includes('ledgercert');
      const isLinkedIn = txt.includes('linkedin') || onclick.includes('sharelinkedin') ||
                         id.includes('linkedin');

      if (isDownload) {
        el.onclick = null;
        el.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var cert = window._lastCertData || getCert();
          if (cert) downloadWithData(cert);
          else downloadCertificate();
        }, true);
      }
      if (isLinkedIn) {
        el.onclick = null;
        el.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var cert = window._lastCertData || getCert();
          if (cert) shareWithData(cert);
          else shareLinkedIn();
        }, true);
      }
    });
  }

  // ── Watch for results-card becoming visible ─────────────
  function tryRecoverFromDOM() {
    try {
      const card    = document.getElementById('results-card');
      const scoreEl = document.getElementById('results-score');
      if (!card || !scoreEl) return false;

      // Check if card is actually visible
      const style = window.getComputedStyle(card);
      if (style.display === 'none' || style.visibility === 'hidden') return false;

      const scoreText = scoreEl.textContent.replace('%','').trim();
      const score     = parseInt(scoreText);
      if (!score || score < 70) return false;

      // Already recovered
      if (window._lastCertData && window._lastCertData.score === score) return true;

      // Read user name from every possible source
      const u     = (() => { try { return JSON.parse(localStorage.getItem('ll_user')||'{}'); } catch(e){ return {}; } })();
      const p     = (() => { try { return JSON.parse(localStorage.getItem('ll_progress')||'{}'); } catch(e){ return {}; } })();
      const name  = u.name || p.name ||
                    (document.getElementById('nav-user-name') ? document.getElementById('nav-user-name').textContent.trim() : '') ||
                    'Candidate';

      const certId   = (p.certificate && p.certificate.certId) || p.certId ||
                       ('LLP-XCP1-' + new Date().getFullYear() + '-' + Math.floor(1000+Math.random()*9000));
      const issueDate= (p.certificate && p.certificate.issueDate) ||
                       new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});

      window._lastCertData = {
        candidateName: name,
        certTitle:     'Xero Certified Practitioner — Level 1',
        certLevel:     'L1 · Associate · Xero Cloud Accounting · LedgerLearn Pro',
        certId:        certId,
        issueDate:     issueDate,
        score:         score,
      };

      // Persist to localStorage so future sessions find it
      try {
        p.lastScore   = score;
        p.certificate = window._lastCertData;
        p.certId      = certId;
        localStorage.setItem('ll_progress', JSON.stringify(p));
      } catch(e) {}

      console.log('[LedgerLearn] Certificate data recovered from DOM ✓ score:', score, '| name:', name);

      // Re-wire buttons now that we have data
      wireButtons();
      return true;

    } catch(e) { return false; }
  }

  // Run wireButtons on load (wires any visible buttons)
  function init() {
    wireButtons();
    tryRecoverFromDOM();
  }

  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  // MutationObserver: fires when results-card style changes to display:block
  if (window.MutationObserver) {
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        // Watch for style attribute changes on results-card
        if (m.type === 'attributes' && m.attributeName === 'style' &&
            m.target.id === 'results-card') {
          if (m.target.style.display !== 'none') {
            // Results card just became visible — recover cert data
            setTimeout(function() {
              tryRecoverFromDOM();
              wireButtons();
            }, 100); // small delay for innerHTML to populate
          }
        }
        // Also watch for new nodes (buttons injected by finishTest)
        if (m.type === 'childList' && m.addedNodes.length > 0) {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var node = m.addedNodes[j];
            if (node.nodeType === 1) {
              var html = node.innerHTML || node.textContent || '';
              if (html.toLowerCase().includes('download') || html.toLowerCase().includes('linkedin')) {
                tryRecoverFromDOM();
                wireButtons();
              }
            }
          }
        }
      }
    });

    // Observe body for child changes AND results-card for attribute changes
    observer.observe(document.body, {childList:true, subtree:true});

    // Specifically watch results-card style attribute
    var resultsCard = document.getElementById('results-card');
    if (resultsCard) {
      observer.observe(resultsCard, {attributes:true, attributeFilter:['style']});
    } else {
      // results-card not yet in DOM — watch for it
      new MutationObserver(function(muts, obs) {
        var card = document.getElementById('results-card');
        if (card) {
          observer.observe(card, {attributes:true, attributeFilter:['style']});
          obs.disconnect();
        }
      }).observe(document.body, {childList:true, subtree:true});
    }
  }

  console.log('[LedgerLearn] certificate-engine.js loaded ✓ — Canvas API ready');

})();
