/**
 * LedgerLearn Pro — Certificate Generator
 * =========================================
 * Generates a branded PDF certificate in the browser using jsPDF.
 * No server needed. Called after a user passes the assessment.
 *
 * DEPENDENCIES (add to your HTML before this script):
 *   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
 *
 * USAGE:
 *   // After assessment pass:
 *   LedgerCert.generate({
 *     candidateName: "David Ayomidotun",
 *     certTitle:     "Xero Certified Practitioner — Level 1",
 *     certLevel:     "Associate · Xero Cloud Accounting",
 *     certDesc:      "Demonstrated competency in...",
 *     certId:        "LLP-XCP1-2025-0042",
 *     issueDate:     "15 May 2025",
 *     score:         85,
 *     action:        "download"   // or "preview" or "both"
 *   });
 */

const LedgerCert = (function () {

  // ── Brand colours (RGB arrays for jsPDF) ──────────────────
  const NAVY      = [11,  31,  58];
  const NAVY_MID  = [19,  45,  82];
  const GOLD      = [212, 168, 67];
  const GOLD_DIM  = [160, 124, 42];
  const TEAL      = [29,  169, 138];
  const TEAL_PALE = [225, 247, 242];
  const OFF_WHITE = [248, 247, 244];
  const WHITE     = [255, 255, 255];
  const MUTED     = [107, 135, 163];
  const MID       = [61,  90,  122];
  const BORDER    = [216, 228, 239];

  // ── Helpers ───────────────────────────────────────────────
  function setFill(doc, rgb) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
  function setStroke(doc, rgb) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }
  function setTextColor(doc, rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }

  function hexPath(doc, cx, cy, r, filled=true) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (90 + 60 * i);
      pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    doc.setLineWidth(0);
    if (filled) {
      doc.triangle(
        pts[0][0], pts[0][1],
        pts[1][0], pts[1][1],
        pts[5][0], pts[5][1],
        'F'
      );
      doc.triangle(
        pts[1][0], pts[1][1],
        pts[2][0], pts[2][1],
        pts[5][0], pts[5][1],
        'F'
      );
      doc.triangle(
        pts[2][0], pts[2][1],
        pts[4][0], pts[4][1],
        pts[5][0], pts[5][1],
        'F'
      );
      doc.triangle(
        pts[2][0], pts[2][1],
        pts[3][0], pts[3][1],
        pts[4][0], pts[4][1],
        'F'
      );
    }
  }

  function gradientBar(doc, x, y, w, h, colLeft, colRight, steps=40) {
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = colLeft[0] + (colRight[0] - colLeft[0]) * t;
      const g = colLeft[1] + (colRight[1] - colLeft[1]) * t;
      const b = colLeft[2] + (colRight[2] - colLeft[2]) * t;
      doc.setFillColor(Math.round(r), Math.round(g), Math.round(b));
      doc.rect(x + w * i / steps, y, w / steps + 0.5, h, 'F');
    }
  }

  function wrapText(doc, text, maxWidth, fontSize) {
    doc.setFontSize(fontSize);
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = doc.getTextWidth(testLine);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  function generateId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = 'LLP-XCP1-' + new Date().getFullYear() + '-';
    for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  // ── Main generator ────────────────────────────────────────
  function generate(opts = {}) {
    const {
      candidateName = 'Candidate Name',
      certTitle     = 'Xero Certified Practitioner — Level 1',
      certLevel     = 'Associate · Xero Cloud Accounting · LedgerLearn Pro',
      certDesc      = 'Demonstrated competency in Xero navigation, invoicing, bank reconciliation, chart of accounts, and financial reporting.',
      certId        = generateId(),
      issueDate     = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }),
      score         = null,
      directorName  = 'David Ayomidotun',
      action        = 'download',   // 'download' | 'preview' | 'both'
    } = opts;

    const { jsPDF } = window.jspdf;

    // A4 landscape: 297 x 210 mm
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297, H = 210;
    const cx = W / 2;

    // ── Background ───────────────────────────────────────────
    setFill(doc, WHITE);
    doc.rect(0, 0, W, H, 'F');

    setFill(doc, OFF_WHITE);
    doc.rect(8, 8, W-16, H-16, 'F');

    // ── Top bar: Navy → Gold → Teal ──────────────────────────
    gradientBar(doc, 0, 0, W/2, 4, NAVY, GOLD);
    gradientBar(doc, W/2, 0, W/2, 4, GOLD, TEAL);

    // ── Bottom bar: Teal → Gold → Navy ───────────────────────
    gradientBar(doc, 0, H-3, W*0.5, 3, TEAL, GOLD);
    gradientBar(doc, W*0.5, H-3, W*0.5, 3, GOLD, NAVY);

    // ── Left accent lines ────────────────────────────────────
    setStroke(doc, GOLD);
    doc.setLineWidth(1);
    doc.line(8, 8, 8, H-8);

    setStroke(doc, TEAL);
    doc.setLineWidth(0.4);
    doc.line(10.5, 8, 10.5, H-8);

    // ── Watermark hex ────────────────────────────────────────
    doc.setFillColor(11, 31, 58);
    doc.setGState(new doc.GState({ opacity: 0.025 }));
    hexPath(doc, W * 0.82, H * 0.45, 55);
    doc.setGState(new doc.GState({ opacity: 1.0 }));

    // ── Logo (top-left) ──────────────────────────────────────
    setFill(doc, GOLD);
    hexPath(doc, 24, H-14, 5);

    setTextColor(doc, NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('LedgerLearn', 31, H-11);

    setTextColor(doc, GOLD);
    const llWidth = doc.getTextWidth('LedgerLearn');
    doc.text(' Pro', 31 + llWidth, H-11);

    // ── Certificate ID (top-right) ───────────────────────────
    const idText = `Certificate ID: ${certId}`;
    doc.setFontSize(6.5);
    const idW = doc.getTextWidth(idText) + 6;
    setFill(doc, BORDER);
    doc.roundedRect(W - idW - 14, H - 22, idW, 7, 1, 1, 'F');
    setTextColor(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(idText, W - idW - 11, H - 17);

    // ── "THIS CERTIFIES THAT" ────────────────────────────────
    setTextColor(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('THIS CERTIFIES THAT', cx, H - 28, { align: 'center' });

    // ── Candidate name ───────────────────────────────────────
    setTextColor(doc, NAVY);
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(28);
    doc.text(candidateName, cx, H - 43, { align: 'center' });

    // Name underline gradient
    const nameW = doc.getTextWidth(candidateName);
    const lineW = nameW * 0.55;
    gradientBar(doc, cx - lineW/2, H-47, lineW, 1.2, GOLD, TEAL, 20);

    // ── "has successfully completed..." ─────────────────────
    setTextColor(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('has successfully completed all requirements for', cx, H - 55, { align: 'center' });

    // ── Cert title ───────────────────────────────────────────
    setTextColor(doc, NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(certTitle, cx, H - 67, { align: 'center' });

    // ── Score badge (if passed) ──────────────────────────────
    if (score !== null) {
      const scoreText = `Score: ${score}%`;
      doc.setFontSize(7.5);
      const scoreW = doc.getTextWidth(scoreText) + 10;
      const scoreX = cx + doc.getTextWidth(certTitle)/2 + 5;
      setFill(doc, TEAL_PALE);
      doc.roundedRect(scoreX, H-73, scoreW, 7, 1.5, 1.5, 'F');
      setStroke(doc, TEAL);
      doc.setLineWidth(0.3);
      doc.roundedRect(scoreX, H-73, scoreW, 7, 1.5, 1.5, 'S');
      setTextColor(doc, TEAL);
      doc.setFont('helvetica', 'bold');
      doc.text(scoreText, scoreX + scoreW/2, H-68.5, { align: 'center' });
    }

    // ── Level badge pill ─────────────────────────────────────
    doc.setFontSize(7);
    const pillW = doc.getTextWidth(certLevel) + 12;
    const pillX = cx - pillW/2;
    const pillY = H - 83;
    setFill(doc, TEAL_PALE);
    doc.roundedRect(pillX, pillY, pillW, 7, 3.5, 3.5, 'F');
    setStroke(doc, TEAL);
    doc.setLineWidth(0.3);
    doc.roundedRect(pillX, pillY, pillW, 7, 3.5, 3.5, 'S');
    setTextColor(doc, TEAL);
    doc.setFont('helvetica', 'bold');
    doc.text(certLevel, cx, pillY + 4.5, { align: 'center' });

    // ── Description ──────────────────────────────────────────
    setTextColor(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const descLines = wrapText(doc, certDesc, 130, 7);
    let descY = H - 94;
    descLines.slice(0, 3).forEach(line => {
      doc.text(line, cx, descY, { align: 'center' });
      descY -= 5;
    });

    // ── Footer divider ───────────────────────────────────────
    const footerY = 22;
    setStroke(doc, BORDER);
    doc.setLineWidth(0.4);
    doc.line(18, footerY + 10, W - 18, footerY + 10);

    // ── Left signature ───────────────────────────────────────
    const sigLX = 42;
    setTextColor(doc, NAVY);
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(9);
    doc.text(directorName, sigLX, footerY + 5, { align: 'center' });
    setTextColor(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Platform Director', sigLX, footerY - 1, { align: 'center' });
    doc.text('LedgerLearn Pro', sigLX, footerY - 6, { align: 'center' });

    setStroke(doc, BORDER);
    doc.setLineWidth(0.5);
    doc.line(sigLX - 20, footerY + 10, sigLX + 20, footerY + 10);

    // ── Right signature (date) ───────────────────────────────
    const sigRX = W - 42;
    setTextColor(doc, NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(issueDate, sigRX, footerY + 5, { align: 'center' });
    setTextColor(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Date of Issue', sigRX, footerY - 1, { align: 'center' });

    setStroke(doc, BORDER);
    doc.setLineWidth(0.5);
    doc.line(sigRX - 20, footerY + 10, sigRX + 20, footerY + 10);

    // ── Verification URL ─────────────────────────────────────
    setTextColor(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    const verifyText = `Verify this certificate at: ledgerlearn-frontend.netlify.app/verify  ·  ID: ${certId}`;
    doc.text(verifyText, cx, 5, { align: 'center' });

    // ── Centre seal ──────────────────────────────────────────
    const sealX = cx, sealY = footerY + 3, sealR = 11;

    setStroke(doc, GOLD);
    doc.setLineWidth(0.8);
    doc.circle(sealX, sealY, sealR, 'S');

    // Dashed inner ring
    doc.setLineDashPattern([1, 1.5], 0);
    doc.setLineWidth(0.3);
    doc.circle(sealX, sealY, sealR - 2, 'S');
    doc.setLineDashPattern([], 0);

    setFill(doc, WHITE);
    doc.circle(sealX, sealY, sealR - 2.5, 'F');

    setTextColor(doc, GOLD_DIM);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.5);
    doc.text('LEDGERLEARN', sealX, sealY + 4, { align: 'center' });
    doc.text('VERIFIED', sealX, sealY - 1, { align: 'center' });

    setFill(doc, GOLD);
    hexPath(doc, sealX, sealY + 1, 2.5);

    // ── Output ───────────────────────────────────────────────
    const fileName = `LedgerLearn_Certificate_${candidateName.replace(/\s+/g,'_')}_${certId}.pdf`;

    if (action === 'download' || action === 'both') {
      doc.save(fileName);
    }

    if (action === 'preview' || action === 'both') {
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
    }

    // Save cert data to localStorage for future re-download
    try {
      const progress = JSON.parse(localStorage.getItem('ll_progress') || '{}');
      progress.certificate = { certId, candidateName, certTitle, issueDate, score };
      localStorage.setItem('ll_progress', JSON.stringify(progress));
    } catch (e) {}

    return { certId, fileName };
  }

  // ── LinkedIn share helper ─────────────────────────────────
  function shareLinkedIn(opts = {}) {
    const {
      certTitle  = 'Xero Certified Practitioner — Level 1',
      certId     = '',
      verifyUrl  = 'https://ledgerlearn-frontend.netlify.app/verify',
    } = opts;

    const text = encodeURIComponent(
      `🏆 Just earned my ${certTitle} from LedgerLearn Pro!\n\n` +
      `Verified certificate ID: ${certId}\n` +
      `Employers can verify at: ${verifyUrl}\n\n` +
      `#Xero #Accounting #Bookkeeping #CertifiedPractitioner #LedgerLearn`
    );

    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}&summary=${text}`;
    window.open(shareUrl, '_blank', 'width=600,height=600');
  }

  // ── Re-download from localStorage ────────────────────────
  function redownload() {
    try {
      const progress = JSON.parse(localStorage.getItem('ll_progress') || '{}');
      const cert = progress.certificate;
      if (!cert) {
        alert('No certificate found. Please complete and pass the assessment first.');
        return;
      }
      generate({ ...cert, action: 'download' });
    } catch (e) {
      console.error('[LedgerCert] Re-download error:', e);
    }
  }

  return { generate, shareLinkedIn, redownload };

})();


// ── Auto-wire buttons if present on the page ─────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Download button — any element with data-cert-download
  document.querySelectorAll('[data-cert-download]').forEach(btn => {
    btn.addEventListener('click', () => {
      const progress = JSON.parse(localStorage.getItem('ll_progress') || '{}');
      const user     = JSON.parse(localStorage.getItem('ll_user') || '{}');
      const cert     = progress.certificate;

      if (cert) {
        LedgerCert.redownload();
      } else if (user.name) {
        // Demo mode — generate with their name
        LedgerCert.generate({
          candidateName: user.name,
          action: 'download',
        });
      } else {
        alert('Complete and pass the Xero L1 assessment to download your certificate.');
      }
    });
  });

  // LinkedIn share button — any element with data-cert-linkedin
  document.querySelectorAll('[data-cert-linkedin]').forEach(btn => {
    btn.addEventListener('click', () => {
      const progress = JSON.parse(localStorage.getItem('ll_progress') || '{}');
      const cert     = progress.certificate;
      LedgerCert.shareLinkedIn({
        certTitle: cert?.certTitle || 'Xero Certified Practitioner — Level 1',
        certId:    cert?.certId    || '',
      });
    });
  });

});
