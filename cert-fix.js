/**
 * LedgerLearn Pro — Certificate Fix
 * ===================================
 * Fixes: Download certificate + LinkedIn share
 * Requires: Nothing. Zero external dependencies.
 * Add to test.html just before </body>:
 *   <script src="/cert-fix.js"></script>
 *
 * How it works:
 * 1. Waits for the page to render the results buttons
 * 2. Replaces the broken download/share buttons with working versions
 * 3. Reads certificate data from localStorage (your 90% pass is already there)
 * 4. Generates PDF inline using jsPDF (loaded on demand from CDN)
 * 5. LinkedIn share opens directly — no LedgerCert dependency
 */

(function() {
  'use strict';

  // ── Read cert data from localStorage ─────────────────────
  function getCertData() {
    const keys = ['ll_progress', 'ledgerlearn_progress', 'll_cert'];
    for (const key of keys) {
      try {
        const d = JSON.parse(localStorage.getItem(key) || '{}');
        if (d.certificate && d.certificate.certId) return d.certificate;
      } catch(e) {}
    }
    // Build from available data if cert object missing
    try {
      const user  = JSON.parse(localStorage.getItem('ll_user') || '{}');
      const score = (() => {
        for (const k of ['ll_progress','ledgerlearn_progress']) {
          try { const d = JSON.parse(localStorage.getItem(k)||'{}'); if (d.lastScore) return d.lastScore; } catch{}
        }
        return null;
      })();
      if (!score) return null;
      return {
        candidateName: user.name || 'Candidate',
        certTitle:     'Xero Certified Practitioner — Level 1',
        certLevel:     'Associate · Xero Cloud Accounting · LedgerLearn Pro',
        certDesc:      'Demonstrated competency in Xero navigation, invoicing, bank reconciliation, chart of accounts, and financial reporting through guided simulation and timed assessment.',
        certId:        'LLP-XCP1-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
        issueDate:     new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'}),
        score,
      };
    } catch(e) { return null; }
  }

  // ── Toast notification ────────────────────────────────────
  function toast(msg, type) {
    const colours = { success:'#1DA98A', error:'#e05555', info:'#D4A843' };
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = [
      'position:fixed','bottom:1.5rem','right:1.5rem','z-index:9999',
      'background:'+(colours[type]||colours.success),'color:#fff',
      'font-family:DM Sans,sans-serif','font-size:0.875rem','font-weight:600',
      'padding:12px 20px','border-radius:8px',
      'box-shadow:0 8px 24px rgba(0,0,0,0.25)',
      'max-width:320px','line-height:1.4',
    ].join(';');
    document.body.appendChild(t);
    setTimeout(() => { t.style.transition='opacity 0.3s'; t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 3500);
  }

  // ── Generate PDF certificate ──────────────────────────────
  function generatePDF(cert) {
    if (!cert) { toast('Certificate data not found in your session.','error'); return; }

    // Load jsPDF dynamically
    const loadAndGenerate = () => {
      const jsPDFCls = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (!jsPDFCls) {
        // Still not loaded — open HTML fallback
        openHTMLCert(cert);
        return;
      }
      _buildPDF(jsPDFCls, cert);
    };

    if ((window.jspdf && window.jspdf.jsPDF) || window.jsPDF) {
      loadAndGenerate();
    } else {
      toast('Preparing your certificate…','info');
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload  = loadAndGenerate;
      s.onerror = () => openHTMLCert(cert);
      document.head.appendChild(s);
    }
  }

  function _buildPDF(jsPDFCls, cert) {
    try {
      const doc = new jsPDFCls({ orientation:'landscape', unit:'mm', format:'a4' });
      const W=297, H=210, cx=W/2;

      const C = {
        navy:  [11,31,58],
        gold:  [212,168,67],
        teal:  [29,169,138],
        white: [255,255,255],
        muted: [107,135,163],
        border:[216,228,239],
        cream: [248,247,244],
        goldDim:[160,124,42],
      };

      const rgb  = (c) => { doc.setFillColor(c[0],c[1],c[2]); };
      const txtC = (c) => { doc.setTextColor(c[0],c[1],c[2]); };
      const drawC= (c) => { doc.setDrawColor(c[0],c[1],c[2]); };

      // Gradient bar helper
      const grad = (x,y,w,h,c1,c2,n=30) => {
        for(let i=0;i<n;i++){
          const t=i/n;
          doc.setFillColor(
            Math.round(c1[0]+(c2[0]-c1[0])*t),
            Math.round(c1[1]+(c2[1]-c1[1])*t),
            Math.round(c1[2]+(c2[2]-c1[2])*t)
          );
          doc.rect(x+w*i/n,y,w/n+0.5,h,'F');
        }
      };

      // Hexagon helper (drawn as triangles)
      const hex = (hcx,hcy,r) => {
        const pts=[];
        for(let i=0;i<6;i++){const a=Math.PI/180*(90+60*i);pts.push([hcx+r*Math.cos(a),hcy+r*Math.sin(a)]);}
        doc.triangle(pts[0][0],pts[0][1],pts[1][0],pts[1][1],pts[5][0],pts[5][1],'F');
        doc.triangle(pts[1][0],pts[1][1],pts[2][0],pts[2][1],pts[5][0],pts[5][1],'F');
        doc.triangle(pts[2][0],pts[2][1],pts[4][0],pts[4][1],pts[5][0],pts[5][1],'F');
        doc.triangle(pts[2][0],pts[2][1],pts[3][0],pts[3][1],pts[4][0],pts[4][1],'F');
      };

      // ── Background ─────────────────────────────
      rgb(C.white);  doc.rect(0,0,W,H,'F');
      rgb(C.cream);  doc.rect(8,8,W-16,H-16,'F');

      // Top gradient bar: Navy→Gold→Teal
      grad(0,0,W/2,4,C.navy,C.gold);
      grad(W/2,0,W/2,4,C.gold,C.teal);

      // Bottom gradient bar: Teal→Gold→Navy
      grad(0,H-3,W*0.5,3,C.teal,C.gold);
      grad(W*0.5,H-3,W*0.5,3,C.gold,C.navy);

      // Left accent lines
      drawC(C.gold); doc.setLineWidth(1);   doc.line(8,8,8,H-8);
      drawC(C.teal); doc.setLineWidth(0.4); doc.line(10.5,8,10.5,H-8);

      // ── Logo ───────────────────────────────────
      rgb(C.gold); hex(24,H-14,5);
      txtC(C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(10);
      const llw = doc.getTextWidth('LedgerLearn');
      doc.text('LedgerLearn',31,H-11);
      txtC(C.gold); doc.text(' Pro',31+llw,H-11);

      // ── Certificate ID (top right) ─────────────
      const idStr = 'Certificate ID: '+(cert.certId||'LLP-XCP1-2025-0001');
      doc.setFontSize(6.5); doc.setFont('helvetica','normal');
      const idW = doc.getTextWidth(idStr)+6;
      rgb(C.border); doc.roundedRect(W-idW-14,H-22,idW,7,1,1,'F');
      txtC(C.muted); doc.text(idStr,W-idW-11,H-17);

      // ── "This certifies that" ──────────────────
      txtC(C.muted); doc.setFont('helvetica','normal'); doc.setFontSize(7);
      doc.text('THIS CERTIFIES THAT',cx,H-28,{align:'center'});

      // ── Candidate name ─────────────────────────
      txtC(C.navy); doc.setFont('helvetica','bolditalic'); doc.setFontSize(28);
      doc.text(cert.candidateName||'Candidate',cx,H-43,{align:'center'});

      // Name underline gradient
      const nw = doc.getTextWidth(cert.candidateName||'Candidate')*0.55;
      grad(cx-nw/2,H-47,nw,1.2,C.gold,C.teal,20);

      // ── Subtitle ───────────────────────────────
      txtC(C.muted); doc.setFont('helvetica','normal'); doc.setFontSize(8);
      doc.text('has successfully completed all requirements for',cx,H-55,{align:'center'});

      // ── Certificate title ──────────────────────
      txtC(C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(15);
      doc.text(cert.certTitle||'Xero Certified Practitioner — Level 1',cx,H-67,{align:'center'});

      // ── Score badge ────────────────────────────
      if (cert.score) {
        const sc='Score: '+cert.score+'%';
        doc.setFontSize(7.5); doc.setFont('helvetica','bold');
        const sw=doc.getTextWidth(sc)+10;
        rgb([225,247,242]); doc.roundedRect(cx-sw/2,H-78,sw,7,1.5,1.5,'F');
        drawC(C.teal); doc.setLineWidth(0.3); doc.roundedRect(cx-sw/2,H-78,sw,7,1.5,1.5,'S');
        txtC(C.teal); doc.text(sc,cx,H-73.5,{align:'center'});
      }

      // ── Level badge ────────────────────────────
      const lvl = cert.certLevel||'Associate · Xero Cloud Accounting · LedgerLearn Pro';
      doc.setFontSize(7); doc.setFont('helvetica','bold');
      const lw2=doc.getTextWidth(lvl)+12;
      rgb([225,247,242]); doc.roundedRect(cx-lw2/2,H-91,lw2,7,3.5,3.5,'F');
      drawC(C.teal); doc.setLineWidth(0.3); doc.roundedRect(cx-lw2/2,H-91,lw2,7,3.5,3.5,'S');
      txtC(C.teal); doc.text(lvl,cx,H-86.5,{align:'center'});

      // ── Footer line ────────────────────────────
      drawC(C.border); doc.setLineWidth(0.4); doc.line(18,27,W-18,27);

      // Left signature
      txtC(C.navy); doc.setFont('helvetica','bolditalic'); doc.setFontSize(9);
      doc.text('David Ayomidotun',42,22,{align:'center'});
      txtC(C.muted); doc.setFont('helvetica','normal'); doc.setFontSize(6.5);
      doc.text('Platform Director · LedgerLearn Pro',42,16,{align:'center'});
      drawC(C.border); doc.setLineWidth(0.5); doc.line(22,27,62,27);

      // Right signature
      txtC(C.navy); doc.setFont('helvetica','bold'); doc.setFontSize(9);
      const issueD = cert.issueDate||new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
      doc.text(issueD,W-42,22,{align:'center'});
      txtC(C.muted); doc.setFont('helvetica','normal'); doc.setFontSize(6.5);
      doc.text('Date of Issue',W-42,16,{align:'center'});
      drawC(C.border); doc.setLineWidth(0.5); doc.line(W-62,27,W-22,27);

      // ── Seal ───────────────────────────────────
      const [sx,sy,sr]=[cx,20,11];
      drawC(C.gold); doc.setLineWidth(0.8); doc.circle(sx,sy,sr,'S');
      doc.setLineDashPattern([1,1.5],0); doc.setLineWidth(0.3);
      doc.circle(sx,sy,sr-2,'S'); doc.setLineDashPattern([],0);
      rgb(C.white); doc.circle(sx,sy,sr-2.5,'F');
      txtC(C.goldDim); doc.setFont('helvetica','bold'); doc.setFontSize(4.5);
      doc.text('LEDGERLEARN',sx,sy+4,{align:'center'});
      doc.text('VERIFIED',sx,sy-1,{align:'center'});
      rgb(C.gold); hex(sx,sy+1,2.5);

      // Verify URL
      txtC(C.muted); doc.setFont('helvetica','normal'); doc.setFontSize(6);
      doc.text('Verify: ledgerlearn-frontend.netlify.app/verify  ·  ID: '+(cert.certId||''),cx,5,{align:'center'});

      // ── Save ───────────────────────────────────
      const name  = (cert.candidateName||'Candidate').replace(/\s+/g,'_');
      const fname = 'LedgerLearn_Certificate_'+name+'_'+(cert.certId||'cert')+'.pdf';
      doc.save(fname);
      toast('Certificate downloaded! ✓','success');

    } catch(err) {
      console.error('[CertFix] PDF error:', err);
      openHTMLCert(cert);
    }
  }

  // ── HTML certificate fallback (printable) ─────────────────
  function openHTMLCert(cert) {
    const issueD = cert.issueDate || new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
    const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Certificate — LedgerLearn Pro</title>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'DM Sans',sans-serif;background:#e8ecf0;min-height:100vh;padding:2rem;display:flex;flex-direction:column;align-items:center;gap:1.5rem;}
.cert{background:#fff;width:100%;max-width:850px;aspect-ratio:1.414/1;position:relative;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.2);display:flex;flex-direction:column;}
.top-bar{height:8px;flex-shrink:0;background:linear-gradient(90deg,#0B1F3A 0%,#D4A843 45%,#1DA98A 100%);}
.body{flex:1;padding:2.5rem 3rem;display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;overflow:hidden;}
.body::before{content:'⬡';position:absolute;right:-2rem;bottom:-3rem;font-size:16rem;color:rgba(11,31,58,0.03);pointer-events:none;font-family:'Syne',sans-serif;}
.logo{font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:#0B1F3A;margin-bottom:1.75rem;letter-spacing:-0.01em;}
.logo span{color:#D4A843;}
.certifies{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.14em;color:#6b87a3;margin-bottom:0.5rem;}
.name{font-family:'Syne',sans-serif;font-size:clamp(1.8rem,5vw,2.8rem);font-weight:800;color:#0B1F3A;margin-bottom:0.4rem;font-style:italic;}
.completed{font-size:0.8rem;color:#6b87a3;margin-bottom:0.75rem;}
.divider{width:60px;height:2px;background:linear-gradient(90deg,#D4A843,#1DA98A);margin:0 auto 0.75rem;border-radius:1px;}
.title{font-family:'Syne',sans-serif;font-size:clamp(0.95rem,2vw,1.3rem);font-weight:700;color:#0B1F3A;margin-bottom:0.5rem;letter-spacing:-0.01em;}
.pill{display:inline-block;background:#e1f7f2;border:1px solid rgba(29,169,138,0.3);color:#1DA98A;font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:3px 12px;border-radius:100px;margin-bottom:0.5rem;}
.score-badge{display:inline-block;background:#fdf3dc;border:1px solid rgba(212,168,67,0.3);color:#9a7320;font-size:0.7rem;font-weight:700;padding:3px 12px;border-radius:100px;margin-bottom:0.75rem;}
.footer{display:flex;align-items:flex-end;justify-content:space-between;width:100%;margin-top:auto;padding-top:1.25rem;border-top:1px solid #e8ecf0;}
.sig{text-align:center;}
.sig-line{width:90px;height:1px;background:#e8ecf0;margin:0 auto 4px;}
.sig-name{font-size:0.9rem;font-style:italic;color:#0B1F3A;font-weight:700;}
.sig-role{font-size:0.6rem;text-transform:uppercase;letter-spacing:0.08em;color:#6b87a3;margin-top:2px;}
.seal{width:64px;height:64px;border-radius:50%;border:2px solid #D4A843;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;line-height:1.4;position:relative;}
.seal::before{content:'';position:absolute;inset:4px;border-radius:50%;border:1px dashed rgba(212,168,67,0.4);}
.seal-text{font-family:'Syne',sans-serif;font-size:0.42rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#a07c2a;position:relative;z-index:1;}
.verify{font-size:0.58rem;color:#6b87a3;margin-top:0.75rem;}
.bot-bar{height:4px;flex-shrink:0;background:linear-gradient(90deg,#1DA98A 0%,#D4A843 60%,#0B1F3A 100%);}
.actions{display:flex;gap:0.75rem;flex-wrap:wrap;justify-content:center;}
.btn-print{background:#D4A843;color:#0B1F3A;border:none;padding:13px 28px;font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:700;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px;}
.btn-close{background:#f0f2f5;border:none;padding:13px 22px;font-family:'DM Sans',sans-serif;font-size:0.9rem;border-radius:8px;cursor:pointer;}
@media print{body{background:#fff;padding:0;}.actions{display:none!important;}.cert{box-shadow:none;max-width:100%;}}
</style></head><body>

<div class="cert">
  <div class="top-bar"></div>
  <div class="body">
    <div class="logo">Ledger<span>Learn</span> Pro</div>
    <div class="certifies">This certifies that</div>
    <div class="name">${cert.candidateName||'Candidate'}</div>
    <div class="completed">has successfully completed all requirements for</div>
    <div class="divider"></div>
    <div class="title">${cert.certTitle||'Xero Certified Practitioner — Level 1'}</div>
    <div class="pill">${cert.certLevel||'Associate · Xero Cloud Accounting · LedgerLearn Pro'}</div>
    ${cert.score ? `<div class="score-badge">Score: ${cert.score}% — Passed ✓</div>` : ''}
    <div class="footer">
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-name">David Ayomidotun</div>
        <div class="sig-role">Platform Director · LedgerLearn Pro</div>
      </div>
      <div class="seal"><div class="seal-text">LEDGER<br>LEARN<br>VERIFIED</div></div>
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-name" style="font-style:normal;font-size:0.85rem;">${issueD}</div>
        <div class="sig-role">Date of Issue</div>
      </div>
    </div>
    <div class="verify">Certificate ID: ${cert.certId||'—'} &nbsp;·&nbsp; Verify: ledgerlearn-frontend.netlify.app/verify</div>
  </div>
  <div class="bot-bar"></div>
</div>

<div class="actions">
  <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  <button class="btn-close" onclick="window.close()">Close</button>
</div>

</body></html>`;

    const blob = new Blob([html], {type:'text/html'});
    const url  = URL.createObjectURL(blob);
    window.open(url,'_blank');
    toast('Certificate opened — use "Print → Save as PDF"','success');
  }

  // ── LinkedIn share ────────────────────────────────────────
  function shareLinkedIn() {
    const cert = getCertData();
    if (!cert) { toast('Certificate not found — please retake the assessment','error'); return; }

    const verifyUrl = 'https://ledgerlearn-frontend.netlify.app/verify';
    const postText  = [
      '🏆 Just earned my ' + (cert.certTitle||'Xero Certified Practitioner L1') + ' from LedgerLearn Pro!',
      '',
      '✅ Score: ' + (cert.score||'') + '%  ·  Certificate ID: ' + (cert.certId||''),
      '🔍 Employers can verify at: ' + verifyUrl,
      '',
      '#Xero #Accounting #Bookkeeping #CertifiedPractitioner #LedgerLearn #CloudAccounting',
    ].join('\n');

    const shareUrl = 'https://www.linkedin.com/sharing/share-offsite/?url='
      + encodeURIComponent(verifyUrl)
      + '&summary=' + encodeURIComponent(postText);

    const popup = window.open(shareUrl, '_blank', 'width=600,height=620,noopener,noreferrer');

    if (!popup || popup.closed) {
      // Popup blocked — copy text to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(postText).then(()=>{
          toast('Post text copied! Paste it into LinkedIn manually.','info');
        }).catch(()=>{
          prompt('Copy this text and paste on LinkedIn:', postText);
        });
      } else {
        prompt('Copy this text and paste on LinkedIn:', postText);
      }
    } else {
      toast('LinkedIn opened! 🎉','success');
    }
  }

  // ── Wire up buttons when results appear ──────────────────
  function wireButtons() {
    // Replace onclick on download button
    document.querySelectorAll('button, a').forEach(el => {
      const txt = el.textContent.trim().toLowerCase();
      const onclick = el.getAttribute('onclick') || '';

      if (txt.includes('download certificate') || txt.includes('📄') || onclick.includes('downloadCert')) {
        el.removeAttribute('onclick');
        el.onclick = (e) => {
          e.preventDefault();
          generatePDF(getCertData());
        };
      }

      if (txt.includes('share on linkedin') || txt.includes('linkedin') || onclick.includes('shareLinkedIn')) {
        el.removeAttribute('onclick');
        el.onclick = (e) => {
          e.preventDefault();
          shareLinkedIn();
        };
      }
    });
  }

  // ── Override global functions ─────────────────────────────
  window.downloadCert  = () => generatePDF(getCertData());
  window.shareLinkedIn = shareLinkedIn;

  // Also override LedgerCert so certificate.js calls work if it loads
  window.LedgerCert = {
    generate:      (opts) => generatePDF(opts),
    shareLinkedIn: (opts) => shareLinkedIn(),
    redownload:    ()     => generatePDF(getCertData()),
  };

  // ── Init ─────────────────────────────────────────────────
  // Wire immediately and again after DOM mutations (results card appears async)
  function init() {
    wireButtons();

    // Watch for results card appearing (assessment is async)
    if (window.MutationObserver) {
      const obs = new MutationObserver(() => wireButtons());
      obs.observe(document.body, { childList:true, subtree:true, attributes:false });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[LedgerLearn] cert-fix.js loaded ✓');

})();
