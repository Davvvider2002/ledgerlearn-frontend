/**
 * LedgerLearn Pro — Certificate Engine
 * Zero external dependencies. Browser Canvas API only.
 * Handles: PNG download, HTML/print fallback, LinkedIn share.
 */
(function () {
  'use strict';

  function toast(msg, type) {
    var c = {success:'#1DA98A',error:'#e05555',info:'#D4A843'};
    var el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:99999;background:' +
      (c[type]||c.success) + ';color:#fff;font-family:system-ui,sans-serif;font-size:14px;' +
      'font-weight:600;padding:12px 20px;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.3);' +
      'max-width:340px;line-height:1.4;cursor:pointer;';
    el.onclick = function(){ el.remove(); };
    document.body.appendChild(el);
    setTimeout(function(){
      el.style.transition='opacity 0.4s'; el.style.opacity='0';
      setTimeout(function(){ el.remove(); },400);
    },4000);
  }

  function getCert() {
    // 1. In-memory
    if (window._lastCertData && window._lastCertData.score) return window._lastCertData;
    // 2. localStorage
    try {
      var keys=['ll_progress','ledgerlearn_progress'];
      for(var i=0;i<keys.length;i++){
        var d=JSON.parse(localStorage.getItem(keys[i])||'{}');
        if(d.certificate && d.certificate.score){ window._lastCertData=d.certificate; return d.certificate; }
      }
    } catch(e){}
    // 3. Read from visible results card on screen
    try {
      var se=document.getElementById('results-score');
      if(se){
        var score=parseInt((se.textContent||'').replace('%','').trim(),10);
        if(score>=70){
          var u={}; var p={};
          try{u=JSON.parse(localStorage.getItem('ll_user')||'{}');}catch(e){}
          try{p=JSON.parse(localStorage.getItem('ll_progress')||'{}');}catch(e){}
          var ne=document.getElementById('nav-user-name');
          var name=u.name||p.name||(ne?ne.textContent.trim():'')||'Candidate';
          var cert={
            candidateName:name,
            certTitle:'Xero Certified Practitioner — Level 1',
            certLevel:'L1 · Associate · Xero Cloud Accounting · LedgerLearn Pro',
            certId:(p.certificate&&p.certificate.certId)||p.certId||('LLP-XCP1-'+new Date().getFullYear()+'-'+Math.floor(1000+Math.random()*9000)),
            issueDate:(p.certificate&&p.certificate.issueDate)||new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}),
            score:score
          };
          window._lastCertData=cert;
          console.log('[LedgerLearn] getCert: DOM score='+score+' name='+name);
          return cert;
        }
      }
    } catch(e){}
    // 4. lastScore
    try {
      var p2=JSON.parse(localStorage.getItem('ll_progress')||'{}');
      var u2=JSON.parse(localStorage.getItem('ll_user')||'{}');
      if(p2.lastScore){
        var cert2={
          candidateName:u2.name||'Candidate',
          certTitle:'Xero Certified Practitioner — Level 1',
          certLevel:'L1 · Associate · Xero Cloud Accounting · LedgerLearn Pro',
          certId:p2.certId||('LLP-XCP1-'+new Date().getFullYear()+'-'+Math.floor(1000+Math.random()*9000)),
          issueDate:p2.issueDate||new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}),
          score:p2.lastScore
        };
        window._lastCertData=cert2; return cert2;
      }
    } catch(e){}
    return null;
  }

  function drawHex(ctx,cx,cy,r){
    ctx.beginPath();
    for(var i=0;i<6;i++){var a=Math.PI/180*(90+60*i);var x=cx+r*Math.cos(a);var y=cy+r*Math.sin(a);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
    ctx.closePath(); ctx.fill();
  }

  function rr(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  function drawCertificate(cert) {
    var W=1748,H=1240,cx=W/2;
    var canvas=document.createElement('canvas');
    canvas.width=W; canvas.height=H;
    var ctx=canvas.getContext('2d');

    // Background
    ctx.fillStyle='#f8f7f4'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffffff'; ctx.fillRect(24,24,W-48,H-48);

    // Top bar
    var tg=ctx.createLinearGradient(0,0,W,0);
    tg.addColorStop(0,'#0B1F3A'); tg.addColorStop(0.45,'#D4A843'); tg.addColorStop(1,'#1DA98A');
    ctx.fillStyle=tg; ctx.fillRect(0,0,W,22);

    // Bottom bar
    var bg=ctx.createLinearGradient(0,0,W,0);
    bg.addColorStop(0,'#1DA98A'); bg.addColorStop(0.6,'#D4A843'); bg.addColorStop(1,'#0B1F3A');
    ctx.fillStyle=bg; ctx.fillRect(0,H-14,W,14);

    // Left accents
    ctx.fillStyle='#D4A843'; ctx.fillRect(24,24,4,H-48);
    ctx.fillStyle='#1DA98A'; ctx.fillRect(32,24,2,H-48);

    // Watermark
    ctx.save(); ctx.globalAlpha=0.025; ctx.fillStyle='#0B1F3A'; drawHex(ctx,W*0.82,H*0.48,280); ctx.restore();

    // Logo
    ctx.fillStyle='#D4A843'; drawHex(ctx,72,H-58,20);
    ctx.textAlign='left'; ctx.font='bold 28px system-ui,sans-serif';
    ctx.fillStyle='#0B1F3A';
    var llw=ctx.measureText('LedgerLearn').width;
    ctx.fillText('LedgerLearn',102,H-44);
    ctx.fillStyle='#D4A843'; ctx.fillText(' Pro',102+llw,H-44);

    // Cert ID
    var idt='Certificate ID: '+(cert.certId||'LLP-XCP1-2026-0001');
    ctx.font='20px system-ui,sans-serif';
    var idw=ctx.measureText(idt).width+30;
    ctx.fillStyle='#e8ecf0'; rr(ctx,W-idw-50,H-80,idw,36,6); ctx.fill();
    ctx.fillStyle='#6b87a3'; ctx.fillText(idt,W-idw-35,H-57);

    // Certifies that
    ctx.textAlign='center'; ctx.font='bold 22px system-ui,sans-serif';
    ctx.fillStyle='#6b87a3'; ctx.fillText('THIS CERTIFIES THAT',cx,220);

    // Name
    ctx.font='bold italic 90px Georgia,serif'; ctx.fillStyle='#0B1F3A';
    ctx.fillText(cert.candidateName||'Candidate',cx,340);

    // Underline
    var nw=ctx.measureText(cert.candidateName||'Candidate').width*0.55;
    var lg=ctx.createLinearGradient(cx-nw/2,0,cx+nw/2,0);
    lg.addColorStop(0,'#D4A843'); lg.addColorStop(1,'#1DA98A');
    ctx.strokeStyle=lg; ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(cx-nw/2,358); ctx.lineTo(cx+nw/2,358); ctx.stroke();

    // Subtitle
    ctx.font='26px system-ui,sans-serif'; ctx.fillStyle='#6b87a3';
    ctx.fillText('has successfully completed all requirements for',cx,410);

    // Title
    ctx.font='bold 48px system-ui,sans-serif'; ctx.fillStyle='#0B1F3A';
    ctx.fillText(cert.certTitle||'Xero Certified Practitioner — Level 1',cx,490);

    // Score badge
    if(cert.score){
      var sc='Score: '+cert.score+'%';
      ctx.font='bold 22px system-ui,sans-serif';
      var sw=ctx.measureText(sc).width+30;
      ctx.fillStyle='#e1f7f2'; rr(ctx,cx-sw/2,508,sw,38,19); ctx.fill();
      ctx.strokeStyle='rgba(29,169,138,0.4)'; ctx.lineWidth=1; rr(ctx,cx-sw/2,508,sw,38,19); ctx.stroke();
      ctx.fillStyle='#1DA98A'; ctx.fillText(sc,cx,533);
    }

    // Level badge
    var lvl=cert.certLevel||'Associate · Xero Cloud Accounting · LedgerLearn Pro';
    ctx.font='bold 20px system-ui,sans-serif';
    var lw=ctx.measureText(lvl).width+40;
    ctx.fillStyle='#e1f7f2'; rr(ctx,cx-lw/2,560,lw,36,18); ctx.fill();
    ctx.strokeStyle='rgba(29,169,138,0.3)'; ctx.lineWidth=1; rr(ctx,cx-lw/2,560,lw,36,18); ctx.stroke();
    ctx.fillStyle='#1DA98A'; ctx.fillText(lvl,cx,584);

    // Footer divider
    ctx.strokeStyle='#e8ecf0'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(60,680); ctx.lineTo(W-60,680); ctx.stroke();

    // Left sig
    ctx.textAlign='center'; ctx.font='bold italic 28px Georgia,serif'; ctx.fillStyle='#0B1F3A';
    ctx.fillText('David Ayomidotun',200,730);
    ctx.font='18px system-ui,sans-serif'; ctx.fillStyle='#6b87a3';
    ctx.fillText('Platform Director',200,756); ctx.fillText('LedgerLearn Pro',200,778);
    ctx.strokeStyle='#e8ecf0'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(80,680); ctx.lineTo(340,680); ctx.stroke();

    // Right sig
    ctx.font='bold 26px system-ui,sans-serif'; ctx.fillStyle='#0B1F3A';
    var isd=cert.issueDate||new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
    ctx.fillText(isd,W-200,730);
    ctx.font='18px system-ui,sans-serif'; ctx.fillStyle='#6b87a3';
    ctx.fillText('Date of Issue',W-200,756);
    ctx.strokeStyle='#e8ecf0'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(W-340,680); ctx.lineTo(W-80,680); ctx.stroke();

    // Seal
    var sx=cx,sy=718,sr=56;
    ctx.strokeStyle='#D4A843'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([4,6]); ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(sx,sy,sr-10,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(sx,sy,sr-12,0,Math.PI*2); ctx.fill();
    ctx.font='bold 14px system-ui,sans-serif'; ctx.fillStyle='#a07c2a';
    ctx.fillText('LEDGERLEARN',sx,sy+4); ctx.fillText('VERIFIED',sx,sy+22);
    ctx.fillStyle='#D4A843'; drawHex(ctx,sx,sy-14,9);

    // Verify URL
    ctx.font='18px system-ui,sans-serif'; ctx.fillStyle='#6b87a3';
    var dom=window.location.hostname==='localhost'?'ledgerlearn.pro':window.location.hostname;
    ctx.fillText('Verify: '+dom+'/verify  ·  ID: '+(cert.certId||''),cx,H-32);

    return canvas;
  }

  function doDownload(cert) {
    if(!cert){ toast('No certificate found. Complete the assessment first.','error'); return; }
    toast('Generating certificate…','info');
    setTimeout(function(){
      try {
        var canvas=drawCertificate(cert);
        var fname='LedgerLearn_Certificate_'+(cert.candidateName||'Candidate').replace(/\s+/g,'_')+'_'+(cert.certId||'cert')+'.png';
        canvas.toBlob(function(blob){
          if(!blob){ openPrint(cert); return; }
          var url=URL.createObjectURL(blob);
          var a=document.createElement('a');
          a.href=url; a.download=fname; a.style.display='none';
          document.body.appendChild(a); a.click();
          setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); },1000);
          toast('Certificate downloaded! ✓','success');
        },'image/png');
      } catch(e){
        console.error('[LedgerLearn] cert error:',e);
        openPrint(cert);
      }
    },150);
  }

  function openPrint(cert) {
    if(!cert) cert=getCert();
    if(!cert){ toast('No certificate data.','error'); return; }
    var dom=window.location.hostname==='localhost'?'ledgerlearn.pro':window.location.hostname;
    var isd=cert.issueDate||new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
    var h='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Certificate</title>'+
      '<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Georgia,serif;background:#eee;padding:2rem;display:flex;flex-direction:column;align-items:center;gap:1rem;}'+
      '.c{background:#fff;width:100%;max-width:900px;aspect-ratio:1.414/1;box-shadow:0 10px 40px rgba(0,0,0,0.2);display:flex;flex-direction:column;}'+
      '.t{height:8px;background:linear-gradient(90deg,#0B1F3A,#D4A843 45%,#1DA98A);}'+
      '.b{flex:1;padding:2.5rem 3rem;display:flex;flex-direction:column;align-items:center;text-align:center;}'+
      '.lo{font-family:Arial,sans-serif;font-size:1rem;font-weight:700;color:#0B1F3A;margin-bottom:1.5rem;}'+
      '.lo span{color:#D4A843;}'+
      'h3{font-family:Arial,sans-serif;font-size:.65rem;text-transform:uppercase;letter-spacing:.14em;color:#6b87a3;margin-bottom:.4rem;}'+
      'h1{font-size:clamp(1.8rem,5vw,3rem);font-style:italic;color:#0B1F3A;margin-bottom:.4rem;}'+
      '.ln{width:50px;height:2px;background:linear-gradient(90deg,#D4A843,#1DA98A);margin:.4rem auto;}'+
      'h2{font-family:Arial,sans-serif;font-size:clamp(.9rem,2vw,1.2rem);color:#0B1F3A;margin-bottom:.4rem;}'+
      '.pl{display:inline-block;background:#e1f7f2;border:1px solid rgba(29,169,138,.3);color:#1DA98A;font-family:Arial,sans-serif;font-size:.62rem;font-weight:700;text-transform:uppercase;padding:2px 10px;border-radius:100px;margin-bottom:.3rem;}'+
      '.sc{display:inline-block;background:#fdf3dc;color:#9a7320;font-family:Arial,sans-serif;font-size:.62rem;font-weight:700;padding:2px 10px;border-radius:100px;margin-bottom:.75rem;}'+
      '.ft{display:flex;justify-content:space-between;align-items:flex-end;width:100%;margin-top:auto;padding-top:.75rem;border-top:1px solid #e8ecf0;}'+
      '.sg{text-align:center;font-family:Arial,sans-serif;}'+
      '.sn{font-style:italic;font-family:Georgia,serif;font-size:.9rem;color:#0B1F3A;}'+
      '.sr{font-size:.52rem;text-transform:uppercase;letter-spacing:.08em;color:#6b87a3;}'+
      '.sl{width:55px;height:55px;border-radius:50%;border:2px solid #D4A843;display:flex;align-items:center;justify-content:center;}'+
      '.sl span{font-family:Arial,sans-serif;font-size:.36rem;font-weight:700;text-transform:uppercase;text-align:center;color:#a07c2a;line-height:1.5;}'+
      '.ve{font-family:Arial,sans-serif;font-size:.52rem;color:#6b87a3;margin-top:.4rem;}'+
      '.bb{height:4px;background:linear-gradient(90deg,#1DA98A,#D4A843 60%,#0B1F3A);}'+
      '.ac{display:flex;gap:.75rem;margin-top:1rem;}'+
      'button{padding:11px 22px;border:none;border-radius:7px;font-size:.95rem;font-weight:700;cursor:pointer;}'+
      '.d{background:#1DA98A;color:#fff;}.x{background:#f0f2f5;}'+
      '@media print{body{background:#fff;padding:0;}.ac{display:none!important;}.c{box-shadow:none;max-width:100%;}}</style></head><body>'+
      '<div class="c"><div class="t"></div><div class="b">'+
      '<div class="lo">Ledger<span>Learn</span> Pro</div>'+
      '<h3>This certifies that</h3>'+
      '<h1>'+(cert.candidateName||'Candidate')+'</h1>'+
      '<div class="ln"></div>'+
      '<p style="font-family:Arial,sans-serif;font-size:.78rem;color:#6b87a3;margin-bottom:.4rem">has successfully completed all requirements for</p>'+
      '<h2>'+(cert.certTitle||'Xero Certified Practitioner — Level 1')+'</h2>'+
      '<div class="pl">'+(cert.certLevel||'Associate · Xero Cloud Accounting · LedgerLearn Pro')+'</div><br>'+
      (cert.score?'<div class="sc">Score: '+cert.score+'% — Passed ✓</div>':'')+
      '<div class="ft">'+
      '<div class="sg"><div class="sn">David Ayomidotun</div><div class="sr">Platform Director · LedgerLearn Pro</div></div>'+
      '<div class="sl"><span>LEDGER\nLEARN\nVERIFIED</span></div>'+
      '<div class="sg"><div class="sn" style="font-style:normal;font-size:.82rem">'+isd+'</div><div class="sr">Date of Issue</div></div>'+
      '</div>'+
      '<div class="ve">Certificate ID: '+(cert.certId||'—')+' · Verify: '+dom+'/verify</div>'+
      '</div><div class="bb"></div></div>'+
      '<div class="ac"><button class="d" onclick="window.print()">🖨️ Save as PDF</button><button class="x" onclick="window.close()">Close</button></div>'+
      '</body></html>';
    var blob=new Blob([h],{type:'text/html'});
    var url=URL.createObjectURL(blob);
    var win=window.open(url,'_blank');
    if(!win){var a=document.createElement('a');a.href=url;a.download='LedgerLearn_Certificate.html';a.click();}
    toast('Certificate opened — Print → Save as PDF','success');
  }

  function doShare(cert) {
    if(!cert){ toast('No certificate found.','error'); return; }
    var dom=window.location.hostname==='localhost'?'ledgerlearn.pro':window.location.hostname;
    var vurl='https://'+dom+'/verify';
    var txt=[
      '\uD83C\uDFC6 Just earned my '+(cert.certTitle||'Xero Certified Practitioner L1')+' from LedgerLearn Pro!',
      '',
      '\u2705 Score: '+(cert.score||'')+'%',
      '\uD83D\uDD0D Certificate ID: '+(cert.certId||''),
      '\uD83D\uDD17 Verify: '+vurl,
      '',
      '#Xero #Accounting #Bookkeeping #CertifiedPractitioner #LedgerLearn'
    ].join('\n');
    var liUrl='https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(vurl)+'&summary='+encodeURIComponent(txt);
    var popup=window.open(liUrl,'li_share','width=600,height=620,scrollbars=yes');
    if(!popup||popup.closed){
      var a=document.createElement('a');a.href=liUrl;a.target='_blank';a.rel='noopener noreferrer';
      document.body.appendChild(a);a.click();a.remove();
    }
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(function(){toast('LinkedIn opened + post copied! ✓','success');}).catch(function(){toast('LinkedIn opened! ✓','success');});
    } else { toast('LinkedIn opened! ✓','success'); }
  }

  // Public API
  window.LedgerLearnCert = {
    download:         function(){ doDownload(getCert()); },
    downloadWithData: function(c){ doDownload(c||getCert()); },
    share:            function(){ doShare(getCert()); },
    shareWithData:    function(c){ doShare(c||getCert()); },
    print:            function(){ openPrint(getCert()); },
    getCert:          getCert
  };
  window.downloadCert  = function(){ doDownload(getCert()); };
  window.shareLinkedIn = function(){ doShare(getCert()); };

  // Wire buttons
  function wireButtons(){
    document.querySelectorAll('button,a').forEach(function(el){
      var t=(el.textContent||'').toLowerCase().trim();
      var oc=(el.getAttribute('onclick')||'').toLowerCase();
      if((t.includes('download')&&t.includes('cert'))||oc.includes('downloadcert')){
        el.onclick=function(e){e.preventDefault();doDownload(getCert());};
      }
      if(t.includes('linkedin')||oc.includes('sharelinkedin')){
        el.onclick=function(e){e.preventDefault();doShare(getCert());};
      }
    });
  }

  // Watch results-card for visibility change
  function watchResults(){
    var card=document.getElementById('results-card');
    if(!card) return;
    new MutationObserver(function(){
      if(card.style.display!=='none'){
        setTimeout(function(){ getCert(); wireButtons(); },200);
      }
    }).observe(card,{attributes:true,attributeFilter:['style']});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){ wireButtons(); watchResults(); });
  } else { wireButtons(); watchResults(); }

  new MutationObserver(function(muts){
    muts.forEach(function(m){ if(m.addedNodes.length) wireButtons(); });
  }).observe(document.body,{childList:true,subtree:true});

  console.log('[LedgerLearn] certificate-engine.js loaded ✓ — Canvas API ready');

}());
