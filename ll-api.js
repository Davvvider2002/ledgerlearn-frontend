/**
 * LedgerLearn Pro — API Client (ll-api.js)
 * ==========================================
 * Replaces all calls to the Cloudflare Worker.
 * Points to /.netlify/functions/ai instead.
 *
 * Load on every page before other scripts:
 *   <script src="/ll-api.js"></script>
 *
 * Usage (same interface as before):
 *   const q  = await LLAPI.generateScenario({ track, module, difficulty });
 *   const fb = await LLAPI.getFeedback({ question, selectedAnswer, correctAnswer, isCorrect });
 *   const ct = await LLAPI.getCertText({ studentName, track, score });
 *   const ls = await LLAPI.getLesson({ lessonTitle, lessonType, track, level });
 */

const LLAPI = (function () {

  const ENDPOINT = '/.netlify/functions/ai';

  // ── Core fetch wrapper ──────────────────────────────────
  async function call(action, params = {}) {
    try {
      const res = await fetch(ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, ...params }),
      });

      const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }));

      if (!res.ok) {
        console.error(`[LLAPI] ${action} failed:`, res.status, data);
        return { error: data.error || `HTTP ${res.status}` };
      }

      return data;

    } catch (err) {
      console.error(`[LLAPI] ${action} network error:`, err.message);
      return { error: err.message };
    }
  }

  // ── Generate scenario / MCQ question ───────────────────
  async function generateScenario({ track = 'Xero', module: mod = 'Invoicing', difficulty = 'intermediate', region = 'UK', regionLabel = 'United Kingdom', tax = 'VAT', taxRate = '20%', taxBody = 'HMRC' } = {}) {
    return call('scenario', { track, module: mod, difficulty, region, regionLabel, tax, taxRate, taxBody });
  }

  // ── Get feedback on answered question ──────────────────
  // Pass explanation if available — server uses it directly (zero API cost)
  async function getFeedback({ question, selectedAnswer, correctAnswer, isCorrect, explanation }) {
    return call('feedback', { question, selectedAnswer, correctAnswer, isCorrect, explanation });
  }

  // ── Get certificate congratulations text ───────────────
  async function getCertText({ studentName, track, score }) {
    return call('cert-text', { studentName, track, score });
  }

  // ── Get lesson simulation content ──────────────────────
  async function getLesson({ lessonTitle, lessonType = 'guided walkthrough', track = 'Xero', level = 'L1 Associate', region = 'UK', regionLabel = 'United Kingdom', tax = 'VAT', taxBody = 'HMRC' } = {}) {
    return call('lesson', { lessonTitle, lessonType, track, level, region, regionLabel, tax, taxBody });
  }

  // ── Fallback question bank (used if API fails) ──────────
  const FALLBACK_QUESTIONS = [
    {
      context: "Sarah runs a small retail business and has just sold goods worth £1,200 plus VAT at 20% to a customer on credit terms.",
      question: "What is the correct entry to record this sale in Xero?",
      options: [
        "Debit Accounts Receivable £1,440, Credit Sales £1,200, Credit VAT Liability £240",
        "Debit Sales £1,440, Credit Accounts Receivable £1,440",
        "Debit Cash £1,200, Credit Sales £1,200",
        "Debit Accounts Receivable £1,200, Credit Sales £1,440"
      ],
      correct_index: 0,
      explanation: "When recording a credit sale with VAT, you debit Accounts Receivable for the full amount including VAT (£1,440), credit Sales for the net amount (£1,200), and credit VAT Liability for the VAT portion (£240). This correctly records the asset owed, the revenue earned, and the tax collected."
    },
    {
      context: "Ahmed is reconciling his bank statement in Xero. He notices a direct debit of £350 for his office rent that hasn't been matched to any transaction.",
      question: "What should Ahmed do first to resolve this unmatched transaction?",
      options: [
        "Delete the transaction from the bank feed",
        "Create a spend money transaction coded to Rent expense",
        "Transfer the amount to a suspense account",
        "Contact the bank to reverse the payment"
      ],
      correct_index: 1,
      explanation: "When a bank feed transaction has no matching record, you should create a Spend Money transaction in Xero coded to the appropriate expense account (Rent). This records the expense and matches it to the bank feed item, completing the reconciliation."
    },
    {
      context: "A Xero user needs to set up a new supplier who will send monthly invoices for cleaning services at £400 per month.",
      question: "Which section of Xero should be used to store the supplier's details?",
      options: [
        "Chart of Accounts",
        "Bank Accounts",
        "Contacts — Suppliers",
        "Products and Services"
      ],
      correct_index: 2,
      explanation: "Supplier details are stored in the Contacts section under Suppliers. This allows Xero to track all transactions with that supplier, apply their payment terms automatically to bills, and maintain a complete transaction history."
    },
    {
      context: "Maria has received a bill from her accountant for £600 plus VAT. She needs to record this in Xero and schedule it for payment in 30 days.",
      question: "What transaction type should Maria use in Xero?",
      options: [
        "Sales Invoice",
        "Spend Money",
        "Bill (Accounts Payable)",
        "Expense Claim"
      ],
      correct_index: 2,
      explanation: "A Bill in Xero (Accounts Payable) is used to record amounts owed to suppliers that will be paid in the future. Unlike Spend Money which records immediate payments, a Bill allows you to set payment due dates and track outstanding creditors, which is correct for a 30-day payment term."
    },
    {
      context: "A business owner wants to see how much money they are owed by customers as of today.",
      question: "Which report in Xero shows outstanding customer invoices?",
      options: [
        "Profit and Loss",
        "Balance Sheet",
        "Aged Receivables",
        "Cash Flow Statement"
      ],
      correct_index: 2,
      explanation: "The Aged Receivables report shows all outstanding customer invoices grouped by age — current, 30 days, 60 days, 90+ days overdue. This is the standard report used to monitor who owes money and chase overdue payments."
    },
    {
      context: "Tom needs to issue a credit note to a customer who returned goods worth £500 that were originally invoiced at £500 plus 20% VAT.",
      question: "What is the correct total amount of the credit note?",
      options: ["£500", "£600", "£100", "£400"],
      correct_index: 1,
      explanation: "The credit note must match the original invoice amount including VAT. The original invoice was £500 net plus £100 VAT (20%) = £600 total. The credit note must be for £600 to fully reverse the original transaction and correctly reduce the VAT liability."
    },
    {
      context: "A bookkeeper is setting up a new company file in Xero. The business started trading on 1 April and the financial year end is 31 March.",
      question: "When setting up the financial year in Xero, what date should be entered as the financial year start month?",
      options: ["January", "March", "April", "December"],
      correct_index: 2,
      explanation: "The financial year start month should be April, as this is when the business's financial year begins. Xero uses this to correctly period all reports, calculate year-to-date figures, and align with the company's accounting periods."
    },
    {
      context: "Lisa is processing payroll in Xero for 3 employees. One employee is paid £2,000 gross with £300 PAYE tax and £180 employee NI deducted.",
      question: "What is the net pay for this employee?",
      options: ["£2,000", "£1,700", "£1,520", "£1,820"],
      correct_index: 2,
      explanation: "Net pay is gross pay minus all deductions. £2,000 gross − £300 PAYE − £180 NI = £1,520 net pay. This is the amount the employee actually receives in their bank account."
    },
  ];

  function getFallbackQuestion(index) {
    return FALLBACK_QUESTIONS[index % FALLBACK_QUESTIONS.length];
  }

  function getFallbackQuestionRandom() {
    return FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
  }

  return {
    generateScenario,
    getFeedback,
    getCertText,
    getLesson,
    getFallbackQuestion,
    getFallbackQuestionRandom,
    FALLBACK_QUESTIONS,
  };

})();
