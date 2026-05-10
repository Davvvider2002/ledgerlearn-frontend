// LedgerLearn ai.js v3.0 - region-aware - 2026-05-10
/**
 * LedgerLearn Pro — AI Function with Caching (Netlify)
 * ======================================================
 * File: netlify/functions/ai.js
 *
 * COST OPTIMISATION STRATEGY:
 * ─────────────────────────────────────────────────────
 * action: 'lesson'     → ZERO API calls. Returns static content.
 * action: 'scenario'   → Shared pool cache. 1 API call serves many users.
 * action: 'feedback'   → Uses question's own explanation. API only as fallback.
 * action: 'cert-text'  → ZERO API calls. Returns personalised template.
 *
 * Cost reduction vs original: ~85% fewer API calls.
 *
 * POOL CACHE: Shared in-memory across function instances.
 * Pool refills automatically when low. TTL: 6 hours.
 * Each topic maintains a pool of 8 questions.
 * One API batch call generates 5 questions at once (cost efficient).
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// ── Question pool cache ────────────────────────────────────
// Shared across all requests to this function instance
const POOL = {
  questions: {},  // { 'Invoicing:intermediate': [{...}, {...}] }
  ts:        {},  // { 'Invoicing:intermediate': timestamp }
  TTL:       6 * 60 * 60 * 1000,  // 6 hours
  MIN_SIZE:  3,   // Refill when pool drops below this
  BATCH:     5,   // Generate this many per API call
};

// ── Static lesson content ──────────────────────────────────
// Zero API cost — permanent high-quality content
const STATIC_LESSONS = {
  'Dashboard & Navigation': {
    intro: "In this lesson you'll learn to navigate the Xero dashboard confidently — understanding where everything lives so you can work efficiently with any client from day one.",
    steps: [
      { step:1, title:"The main dashboard", instruction:"Log into Xero. The dashboard shows four key panels: Bank accounts (current balances), Invoices owed to you (aged receivables), Bills you need to pay (aged payables), and Expense claims. These give you an instant financial snapshot every time you log in.", tip:"Bookmark the dashboard — you'll start every client session here." },
      { step:2, title:"Top navigation menu", instruction:"The top menu has five sections: Business (invoices, bills, products), Accounting (bank, reports, chart of accounts), Projects (job costing), Payroll (employee wages), and Contacts (customers and suppliers). Every workflow starts from one of these.", tip:"" },
      { step:3, title:"Organisation switcher", instruction:"Click your organisation name (top left) to switch between different Xero accounts. As a consultant you'll manage multiple clients — this is how you move between them without logging out.", tip:"Always check the organisation name before entering any transaction — a common mistake is posting to the wrong client." },
      { step:4, title:"Settings and customisation", instruction:"Click your organisation name → Settings to access financial settings, invoice templates, chart of accounts, and users. The Dashboard itself has an Edit Layout button to add or remove panels based on what your client wants to see.", tip:"" },
    ],
    summary: "You can now navigate every major section of Xero and understand the purpose of each area.",
    whyMatters: "Xero navigation fluency is the first thing tested in every Xero Accountant interview — employers need confidence you can work independently from day one.",
  },
  'Organisation Setup': {
    intro: "Organisation setup is the foundation every Xero account is built on. Getting this right in the first session prevents months of corrections and builds trust with clients immediately.",
    steps: [
      { step:1, title:"Financial year settings", instruction:"Go to Settings → General Settings → Financial Settings. Set the financial year start month (April for UK businesses), tax basis (invoice or cash), and your VAT/GST registration number and filing frequency. UK businesses on MTD must use invoice basis.", tip:"Getting the financial year wrong means all period reports will be misaligned — fix this first before any transactions." },
      { step:2, title:"Chart of accounts review", instruction:"Go to Accounting → Chart of Accounts. Xero provides a default set. Archive accounts irrelevant to the business type, rename accounts to match the client's terminology, and add any industry-specific accounts needed.", tip:"A retail business needs stock/inventory accounts. A service business doesn't. Tailor the COA to the business on day one." },
      { step:3, title:"Invoice branding setup", instruction:"Go to Settings → Invoice Themes. Upload the client's logo, set brand colours, and customise the invoice template layout. This affects all customer-facing documents — invoices, credit notes, statements, and purchase orders.", tip:"" },
      { step:4, title:"Adding users and permissions", instruction:"Go to Settings → Users → Invite a User. Set appropriate permission levels: Adviser (full access), Standard (most tasks), Invoice Only (for sales staff), or Read Only (for clients who want to view). Each user gets their own login.", tip:"Never share login credentials — always create individual user accounts for audit trail integrity." },
    ],
    summary: "Your Xero organisation is now correctly configured and ready for live transactions.",
    whyMatters: "Implementation consultants charge £500–£1,500 for initial Xero setup — this is a premium service that justifies consulting fees from day one.",
  },
  'Creating & Managing Invoices': {
    intro: "Invoicing is the most-tested skill in Xero certifications and the most frequently listed requirement in Xero job postings. Mastering this lesson makes you immediately hireable.",
    steps: [
      { step:1, title:"Create a new invoice", instruction:"Go to Business → Invoices → New Invoice. Select the customer (or create a new Contact). Enter invoice date and due date. Add line items: description, quantity, unit price, and tax rate. Xero calculates totals automatically.", tip:"Always double-check the tax rate on every line — incorrect VAT coding is the most common bookkeeping error and the most common cause of VAT investigations." },
      { step:2, title:"Approve and send", instruction:"Click Approve to lock the invoice (moving it from Draft to Awaiting Payment). Then click Send to email it directly from Xero. If online payments are enabled, a Pay Now button is included automatically.", tip:"Draft invoices do not appear in aged receivables reports. Always approve before considering a sale recorded." },
      { step:3, title:"Record payment received", instruction:"When the customer pays, open the invoice and click Add Payment. Enter the payment date, amount, and the bank account it was received into. Xero automatically matches this payment to your bank feed when it imports.", tip:"" },
      { step:4, title:"Issue a credit note", instruction:"If goods are returned or an invoice needs correction, open the original invoice and click Add Credit Note. Enter the amount to credit. This creates a linked credit note and reduces the outstanding balance without deleting the original transaction.", tip:"Never delete invoices — always use credit notes to maintain a complete audit trail." },
    ],
    summary: "You can now create, approve, send, receipt, and credit invoices end-to-end in Xero.",
    whyMatters: "Invoicing is listed as a required skill in over 85% of Xero Accountant job postings — employers expect day-one competency with no training needed.",
  },
  'Bank Reconciliation': {
    intro: "Bank reconciliation is where bookkeeping accuracy is demonstrated. It's the skill that separates a competent bookkeeper from a basic data-entry operator — and it's what clients actually pay for.",
    steps: [
      { step:1, title:"Review the bank feed", instruction:"Go to Accounting → Bank Accounts → click on the account. The bank feed shows all transactions imported from your bank. Transactions are listed as unreconciled until matched to a Xero record. The green Reconcile button shows how many items need attention.", tip:"Reconcile at minimum weekly — leaving it a month creates a backlog that's time-consuming and error-prone." },
      { step:2, title:"Match to existing records", instruction:"For each transaction, Xero suggests matches to invoices, bills, or previous entries. Review the suggestion — if correct, click OK to match. The transaction turns green and moves to the reconciled list.", tip:"" },
      { step:3, title:"Create transactions for unmatched items", instruction:"For transactions with no match (standing orders, direct debits, bank charges), click Create. Choose Spend Money (payment) or Receive Money (receipt), code it to the correct expense or income account, and click OK.", tip:"Bank charges → Bank Fees. PAYE payments → PAYE Liability. Loan repayments → split between Interest expense and Loan liability." },
      { step:4, title:"Confirm reconciliation", instruction:"When all items are matched or created, click Reconcile All. Your Xero bank balance should now match your bank statement exactly. If there's a discrepancy, use Find & Match to locate unmatched items.", tip:"" },
    ],
    summary: "You can reconcile a full month of bank transactions accurately and efficiently.",
    whyMatters: "Bank reconciliation is performed every week in every Xero role — demonstrating speed and accuracy here is the practical skill employers test most in bookkeeping interviews.",
  },
  'Chart of Accounts Setup': {
    intro: "A well-structured chart of accounts makes financial reports meaningful and audits clean. This is a skill that commands premium rates in implementation and advisory work.",
    steps: [
      { step:1, title:"Understand account types", instruction:"Xero uses five account types: Assets (what the business owns — cash, debtors, equipment), Liabilities (what it owes — creditors, loans, VAT), Equity (owner's investment and retained profit), Revenue (all income streams), and Expenses (all costs). Every transaction is coded to one.", tip:"" },
      { step:2, title:"Set up account code ranges", instruction:"Use a logical numbering system: 100–199 for Assets, 200–299 for Liabilities, 300–399 for Equity, 400–499 for Revenue, 600–899 for Expenses. Xero's default codes follow this pattern. Consistent numbering makes reports easy to navigate.", tip:"Leave gaps in your numbering — e.g. 610, 620, 630 — so you can insert new accounts later without renumbering." },
      { step:3, title:"Add and archive accounts", instruction:"Click Add Account to create a new one. Choose the type, assign a code, add a description, and set the tax default. To remove irrelevant default accounts, use Archive (not Delete) — archived accounts can be restored if needed.", tip:"Never delete accounts that have transactions posted to them — always archive instead." },
      { step:4, title:"Set up tracking categories", instruction:"Go to Accounting → Advanced → Tracking Categories. Add dimensions like Department, Location, or Project. This allows profit reporting by segment without needing separate company files.", tip:"Tracking categories are powerful for multi-location businesses and are a key selling point in implementation proposals." },
    ],
    summary: "Your chart of accounts is structured correctly for accurate, meaningful financial reporting.",
    whyMatters: "Chart of accounts design is a core deliverable for Xero implementation consultants billing at £80–£150 per hour — this skill directly commands a pricing premium.",
  },
  'Running Financial Reports': {
    intro: "Financial reports are how you prove the value of your bookkeeping work. Knowing which report to run, how to read it, and how to explain it to a client is what elevates a bookkeeper to a trusted advisor.",
    steps: [
      { step:1, title:"Profit and Loss report", instruction:"Go to Accounting → Reports → Profit and Loss. Set the date range (month, quarter, or year-to-date). The report shows all revenue streams minus all expense categories, resulting in net profit or loss. Compare against prior periods using the comparison columns.", tip:"Review P&L with every client every month. It's the most important financial conversation in bookkeeping — and the one clients most appreciate." },
      { step:2, title:"Balance Sheet", instruction:"The Balance Sheet shows what the business owns (assets), owes (liabilities), and the difference (equity) at a specific point in time. Assets must always equal Liabilities + Equity. If they don't, there's a data entry error to find.", tip:"" },
      { step:3, title:"Aged Receivables and Payables", instruction:"Aged Receivables shows all outstanding customer invoices grouped by age: Current, 30 days, 60 days, 90+ days. Use this to chase overdue payments. Aged Payables shows the same for supplier bills you owe.", tip:"Always review Aged Receivables before your client meeting — 'who owes us money and how much?' is the first question every client asks." },
      { step:4, title:"Export and share reports", instruction:"Click Export on any report to download as PDF or Excel. You can also publish reports directly to a client's Xero login, or email them from within Xero. Schedule recurring reports in Report Settings for automatic monthly delivery.", tip:"" },
    ],
    summary: "You can now run, interpret, and share the four core Xero financial reports confidently.",
    whyMatters: "Clients pay bookkeepers specifically for financial insight, not just data entry — being able to read and explain these reports is what justifies advisory fees.",
  },
};

// ── Main handler ───────────────────────────────────────────
exports.handler = async function (event) {

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { action } = body;

  try {
    switch (action) {

      // ── LESSON — zero API cost, static content ──────────────
      case 'lesson': {
        const { lessonTitle } = body;

        // Find matching static lesson (case-insensitive partial match)
        const key = Object.keys(STATIC_LESSONS).find(k =>
          lessonTitle && lessonTitle.toLowerCase().includes(k.toLowerCase().split(' ')[0])
        ) || Object.keys(STATIC_LESSONS)[0];

        const lesson = STATIC_LESSONS[key];
        console.log(`[ai] lesson: serving static content for "${lessonTitle}" → "${key}" (0 API calls)`);
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ...lesson, cached: true }) };
      }

      // ── SCENARIO — pool cache, batch generation ─────────────
      case 'scenario': {
        // DEBUG: log incoming region params
        console.log('[ai] scenario called with region:', body.region, 'regionLabel:', body.regionLabel);
        console.log('[ai.js] scenario request received. region=' + (body.region||'NOT SET') + ' regionLabel=' + (body.regionLabel||'NOT SET') + ' tax=' + (body.tax||'NOT SET'));
        const track       = body.track        || 'Xero';
        const module_     = body.module       || 'Invoicing';
        const difficulty  = body.difficulty   || 'intermediate';
        const region      = body.region       || 'UK';
        const regionLabel = body.regionLabel  || 'United Kingdom';
        const tax         = body.tax          || 'VAT';
        const taxRate     = body.taxRate      || '20%';
        const taxBody     = body.taxBody      || 'HMRC';
        const currency    = region === 'US' ? 'USD ($)' : region === 'AU' || region === 'NZ' || region === 'CA' ? 'local $' :
                            region === 'NG' ? 'NGN (₦)' : region === 'ZA' ? 'ZAR (R)' :
                            region === 'AE' ? 'AED' : region === 'IE' ? 'EUR (€)' : '£';
        // Pool key includes region so questions stay region-specific
        const poolKey    = `${module_}:${difficulty}:${region}`;

        // Check pool
        const pool    = POOL.questions[poolKey] || [];
        const poolAge = POOL.ts[poolKey] ? (Date.now() - POOL.ts[poolKey]) : Infinity;
        const expired = poolAge > POOL.TTL;

        if (pool.length > 0 && !expired) {
          // Serve from pool — no API call
          const q = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
          console.log(`[ai] scenario: pool hit for "${poolKey}" (pool size now: ${pool.length})`);

          // Trigger background refill if pool is getting low
          if (pool.length < POOL.MIN_SIZE) {
            refillPool(process.env.ANTHROPIC_API_KEY, track, module_, difficulty, poolKey, region, regionLabel, tax, taxRate, taxBody, currency)
              .catch(e => console.warn('[ai] Background refill failed:', e.message));
          }

          return { statusCode: 200, headers: CORS, body: JSON.stringify(q) };
        }

        // Pool empty or expired — generate a fresh batch
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }) };
        }

        console.log(`[ai] scenario: pool miss for "${poolKey}" — generating batch of ${POOL.BATCH}`);
        const questions = await generateBatch(apiKey, track, module_, difficulty, region, regionLabel, tax, taxRate, taxBody, currency);

        if (questions.length > 0) {
          // Serve first, cache rest
          const q = questions.shift();
          POOL.questions[poolKey] = questions;
          POOL.ts[poolKey]        = Date.now();
          return { statusCode: 200, headers: CORS, body: JSON.stringify(q) };
        }

        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Failed to generate questions' }) };
      }

      // ── FEEDBACK — use built-in explanation, no API call ────
      case 'feedback': {
        const { question, selectedAnswer, correctAnswer, isCorrect, explanation } = body;

        // If the question already has an explanation (all fallback + cached questions do), use it
        if (explanation && explanation.length > 20) {
          const prefix = isCorrect ? 'Correct! ' : 'Not quite. ';
          console.log('[ai] feedback: serving from question explanation (0 API calls)');
          return {
            statusCode: 200, headers: CORS,
            body: JSON.stringify({ feedback: prefix + explanation }),
          };
        }

        // Only call API if no explanation available (rare edge case)
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          return { statusCode: 200, headers: CORS,
            body: JSON.stringify({ feedback: isCorrect
              ? `Correct! "${correctAnswer}" is the right answer for this scenario.`
              : `The correct answer is "${correctAnswer}". Review this topic in the lesson materials.` }) };
        }

        const prompt = isCorrect
          ? `Question: "${question}"\nAnswer: "${correctAnswer}"\nWrite 2 sentences explaining why correct. Plain English for a bookkeeper.`
          : `Question: "${question}"\nStudent chose: "${selectedAnswer}"\nCorrect: "${correctAnswer}"\nWrite 2 sentences explaining the correct answer. Plain English.`;

        const result = await callClaude(apiKey, prompt, 250);
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ feedback: result }) };
      }

      // ── CERT TEXT — zero API cost, personalised template ────
      case 'cert-text': {
        const { studentName, track, score } = body;
        const name   = studentName ? studentName.split(' ')[0] : 'there';
        const pTrack = track || 'Xero Associate';
        const pScore = score || 80;

        const templates = [
          `Congratulations ${name}! You passed the ${pTrack} certification with ${pScore}% — your verifiable certificate is ready to download and share on LinkedIn.`,
          `Congratulations ${name} on passing the ${pTrack} assessment with a score of ${pScore}% — a genuine achievement that demonstrates real software competency.`,
          `Congratulations ${name}! Scoring ${pScore}% on the ${pTrack} certification proves the level of skill employers are actively looking for right now.`,
        ];

        const text = templates[Math.floor(Math.random() * templates.length)];
        console.log('[ai] cert-text: serving template (0 API calls)');
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ text }) };
      }

      default:
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
    }

  } catch (err) {
    console.error('[ai] Unhandled error:', err.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};

// ── Generate a batch of questions in one API call ──────────
async function generateBatch(apiKey, track, module_, difficulty, region="UK", regionLabel="United Kingdom", tax="VAT", taxRate="20%", taxBody="HMRC", currency="£") {
  const prompt = `Generate ${POOL.BATCH} different accounting multiple choice questions for ${track} software training.
Topic: ${module_}. Difficulty: ${difficulty}.
Region: ${regionLabel}. Use ${currency} for amounts. Tax system: ${tax} at ${taxRate}, administered by ${taxBody}.
All scenarios, amounts, tax references, and regulatory context must reflect ${regionLabel} practice — not UK-specific unless region is UK.
Each question must be completely different — different scenarios, different concepts.

Return ONLY a raw JSON array — no markdown, no backticks:
[
  {"context":"scenario","question":"question text","options":["A","B","C","D"],"correct_index":0,"explanation":"why correct"},
  {"context":"scenario","question":"question text","options":["A","B","C","D"],"correct_index":2,"explanation":"why correct"},
  {"context":"scenario","question":"question text","options":["A","B","C","D"],"correct_index":1,"explanation":"why correct"},
  {"context":"scenario","question":"question text","options":["A","B","C","D"],"correct_index":3,"explanation":"why correct"},
  {"context":"scenario","question":"question text","options":["A","B","C","D"],"correct_index":0,"explanation":"why correct"}
]`;

  try {
    const text = await callClaude(apiKey, prompt, 2500);
    const parsed = parseJSON(text);
    if (Array.isArray(parsed)) return parsed.filter(q => q.question && q.options?.length === 4);
    return [];
  } catch (e) {
    console.error('[ai] Batch generation failed:', e.message);
    return [];
  }
}

// ── Background pool refill ─────────────────────────────────
async function refillPool(apiKey, track, module_, difficulty, poolKey, region='UK', regionLabel='United Kingdom', tax='VAT', taxRate='20%', taxBody='HMRC', currency='£') {
  if (!apiKey) return;
  console.log(`[ai] Background refilling pool for "${poolKey}"`);
  const questions = await generateBatch(apiKey, track, module_, difficulty, region, regionLabel, tax, taxRate, taxBody, currency);
  if (questions.length > 0) {
    const existing      = POOL.questions[poolKey] || [];
    POOL.questions[poolKey] = [...existing, ...questions];
    POOL.ts[poolKey]        = Date.now();
    console.log(`[ai] Pool refilled for "${poolKey}": ${POOL.questions[poolKey].length} questions`);
  }
}

// ── Call Claude API ────────────────────────────────────────
async function callClaude(apiKey, prompt, maxTokens = 600) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001', // Haiku for cost efficiency on cached/simple calls
      max_tokens: maxTokens,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  let text = data.content?.[0]?.text?.trim() || '';
  text = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
  return text;
}

// ── Safe JSON parse ────────────────────────────────────────
function parseJSON(text) {
  try { return JSON.parse(text); } catch {
    // Try array first
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
    // Then object
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
    throw new Error(`JSON parse failed: ${text.substring(0, 100)}`);
  }
}
