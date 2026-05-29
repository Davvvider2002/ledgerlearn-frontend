/**
 * LedgerLearn — Question Banks
 * Xero L2, Xero L3, QuickBooks L1, QuickBooks L2, QuickBooks L3
 *
 * Structure: each entry = { question, options:[A,B,C,D], correct_index:0-3, explanation }
 * Region variants are handled by ai.js at runtime; these are the static/seed banks.
 * Merge into QUESTION_BANK[track][level] in test-logic.js
 */

// ─────────────────────────────────────────────────────────────
// XERO L2 — Advanced Practitioner  (40 questions)
// ─────────────────────────────────────────────────────────────
const XERO_L2 = [
  {
    question: "A supplier sends a credit note for $850 after you already reconciled the original invoice. What is the correct sequence in Xero?",
    options: [
      "Create a credit note in Xero, apply it to the original bill, then re-reconcile the bank feed",
      "Delete the original bill and re-enter at the lower amount",
      "Post a manual journal to reduce the expense account directly",
      "Void the bank transaction and re-import the statement"
    ],
    correct_index: 0,
    explanation: "In Xero you raise a credit note against the original bill, apply it to reduce the balance, then the updated payment amount reconciles cleanly against the bank feed."
  },
  {
    question: "Your client runs payroll in Xero and an employee's tax code was entered incorrectly for three pay runs. The employee has been under-taxed by $420. What is the correct fix?",
    options: [
      "Correct the tax code and process a catch-up tax deduction on the next payroll run",
      "Void all three pay runs, correct the code, and reprocess from scratch",
      "Post a manual journal to the PAYE liability account",
      "Notify the tax authority and take no action in Xero until they confirm"
    ],
    correct_index: 0,
    explanation: "Correcting the tax code and recovering the shortfall over upcoming payroll runs is the standard approach. Voiding finalised payroll disrupts year-to-date figures unnecessarily."
  },
  {
    question: "A client wants to track profitability by job but does not want to turn on Projects. Which Xero feature provides the most useful alternative?",
    options: [
      "Tracking categories applied to invoices and bills",
      "Custom fields on the contact record",
      "Account codes with separate ranges per job",
      "Tags on bank transactions only"
    ],
    correct_index: 0,
    explanation: "Tracking categories (e.g. 'Job' category with values per project) appear on P&L reporting with full filter capability — the closest alternative to Projects without the module."
  },
  {
    question: "A bank feed transaction of $3,200 covers three separate supplier bills of $1,100, $900, and $1,200. How do you reconcile this in Xero?",
    options: [
      "Use 'Find & Match' to select all three bills against the single bank line",
      "Split the bank transaction into three lines before reconciling",
      "Reconcile one bill and post the remaining $2,100 to a clearing account",
      "Create a batch payment first, then reconcile to the batch"
    ],
    correct_index: 0,
    explanation: "'Find & Match' lets you select multiple outstanding bills that sum to the bank transaction value, reconciling all three in one step."
  },
  {
    question: "Your client's Xero aged payables report shows a supplier balance of $4,500 but the supplier statement shows $3,800. What are the most likely causes to investigate first?",
    options: [
      "An unallocated credit note or a payment posted to the wrong supplier",
      "The chart of accounts is missing the supplier expense code",
      "The bank feed has not synced for 48 hours",
      "The reporting period end date is set incorrectly in the report"
    ],
    correct_index: 0,
    explanation: "A discrepancy between Xero's payables and a supplier statement almost always traces to an unapplied credit note or a payment coded to the wrong contact."
  },
  {
    question: "A client invoices in USD but reports in GBP. An invoice was raised at $5,000 when the rate was 1.25, but the client received $4,980 due to a bank transfer fee. How do you handle the $20 shortfall in Xero?",
    options: [
      "Record the payment at $4,980, then post the $20 shortfall to a bank charges expense account",
      "Edit the original invoice down to $4,980 to match the payment",
      "Raise a credit note for $20 against the invoice",
      "Leave the invoice open and chase the $20 as a new invoice"
    ],
    correct_index: 0,
    explanation: "Recording the actual payment received and coding the fee difference to a bank charges account accurately reflects the economic reality without altering the original agreed invoice amount."
  },
  {
    question: "Which Xero report best identifies transactions that were posted to the suspense account and never cleared?",
    options: [
      "Account transactions report filtered to the suspense account",
      "Balance sheet showing the suspense account balance only",
      "Profit and loss comparison report across two periods",
      "Budget variance report"
    ],
    correct_index: 0,
    explanation: "The account transactions report filtered to the suspense/clearing account shows every entry posted there with dates, so you can identify and correct unresolved items."
  },
  {
    question: "A fixed asset was purchased for $12,000 and has been depreciating at 20% straight-line for 2 years. The client sold it for $7,500. What is the gain or loss on disposal?",
    options: [
      "$300 gain (book value $7,200 vs sale price $7,500)",
      "$4,500 loss (cost $12,000 vs sale price $7,500)",
      "$4,800 loss (cost $12,000 vs book value $7,200)",
      "No gain or loss — asset is fully depreciated"
    ],
    correct_index: 0,
    explanation: "After 2 years at 20% straight-line: depreciation = $12,000 × 20% × 2 = $4,800. Book value = $12,000 − $4,800 = $7,200. Sale at $7,500 = $300 gain."
  },
  {
    question: "A client has overpaid a supplier by $600. The supplier agrees to leave it as a credit for future invoices. How do you record this correctly in Xero?",
    options: [
      "Leave the payment as an overpayment on the supplier account; it will auto-apply to future bills",
      "Post a manual journal to prepayments and reverse it when the next invoice arrives",
      "Raise a credit note to the supplier for $600",
      "Refund the payment and re-enter it when the next bill arrives"
    ],
    correct_index: 0,
    explanation: "Xero handles overpayments natively — the excess sits on the supplier's account as an available credit and can be applied to future bills directly in the bill payment screen."
  },
  {
    question: "You are reviewing a client's Xero file before year-end. The bank reconciliation report shows an unreconciled difference of $75 dating back 11 months. What is the correct approach?",
    options: [
      "Identify the source — likely a deleted or modified transaction — and re-enter or correct it",
      "Post a journal to a bank discrepancy account to clear it before year-end",
      "Run the reconciliation summary and accept the difference",
      "Delete and recreate the bank account to reset the balance"
    ],
    correct_index: 0,
    explanation: "Old unreconciled differences in Xero usually trace to a transaction that was deleted or edited after reconciliation. Finding and reinstating the original entry is the only clean fix."
  },
  {
    question: "A client wants to send statements to all overdue customers automatically. What is the most efficient way to do this in Xero?",
    options: [
      "Use the 'Send Statements' feature in Accounts Receivable filtered by overdue balance",
      "Export the aged receivables to CSV and email manually",
      "Set up a Xero Practice Manager workflow",
      "Use the invoice reminder settings on each individual contact"
    ],
    correct_index: 0,
    explanation: "Xero's built-in Send Statements tool in the Accounts Receivable module lets you bulk-select contacts with outstanding balances and email statements in one action."
  },
  {
    question: "Your client uses Xero's inventory module. A stock item was sold at $200 but the average cost in Xero shows $230. What journal entry does Xero auto-generate on the sale?",
    options: [
      "Dr Cost of Goods Sold $230, Cr Inventory $230",
      "Dr Cost of Goods Sold $200, Cr Inventory $200",
      "Dr Inventory $230, Cr Revenue $230",
      "No auto-entry — inventory is tracked manually"
    ],
    correct_index: 0,
    explanation: "Xero's inventory uses average cost for COGS. When an item is sold, Xero debits COGS and credits inventory at the average cost value, regardless of the selling price."
  },
  {
    question: "A new employee starts mid-month. Which Xero payroll setting determines how their first pay is calculated?",
    options: [
      "The pay period start and pro-rata calculation based on their start date",
      "Their annual salary divided by 12 regardless of start date",
      "A manual override field on the first payslip",
      "The superannuation/pension contribution rate setting"
    ],
    correct_index: 0,
    explanation: "Xero calculates the first partial-period pay by pro-rating based on the employee's start date within the pay period — no manual calculation is needed if the date is set correctly."
  },
  {
    question: "A client receives a bank statement with a direct debit for $1,850 that Xero has already recognised as a bill payment. The bank feed shows the same transaction twice. What happened and what is the fix?",
    options: [
      "A duplicate import from the feed — delete the duplicate bank transaction and re-reconcile",
      "The bill was paid twice — raise a refund request to the supplier",
      "Reconcile both transactions to the same bill to clear them both",
      "Void the bill and re-enter as a direct debit"
    ],
    correct_index: 0,
    explanation: "Duplicate bank feed imports are common when a statement is re-imported. The duplicate transaction should be deleted (not reconciled twice) to avoid inflating payments."
  },
  {
    question: "A client is GST-registered and purchases equipment for $11,000 including 10% GST. They use it 70% for business and 30% for personal use. How much GST can they claim?",
    options: [
      "$700 (70% of the $1,000 GST component)",
      "$1,000 (full GST on the purchase)",
      "$770 (70% of total cost)",
      "$300 (the personal use portion)"
    ],
    correct_index: 0,
    explanation: "The GST component is $11,000 ÷ 11 = $1,000. The claimable portion = $1,000 × 70% = $700. The 30% personal component is not recoverable."
  },
  {
    question: "How does Xero handle a situation where a customer pays an invoice in a foreign currency but the exchange rate has moved since the invoice was raised?",
    options: [
      "Xero auto-generates an unrealised/realised exchange gain or loss entry on payment",
      "You must manually adjust the invoice to the payment rate before reconciling",
      "Xero locks the rate at the invoice date and does not recognise rate movements",
      "A manual journal is required to correct the currency account balance"
    ],
    correct_index: 0,
    explanation: "Xero's multi-currency module automatically calculates and posts the exchange gain or loss when a foreign currency payment is matched to the original invoice."
  },
  {
    question: "A client's P&L shows a suspiciously high 'other income' balance. On investigation you find three customer prepayments that were posted to income rather than a liability account. What is the correct treatment?",
    options: [
      "Post a journal to move the prepayments from income to a deferred revenue/liability account",
      "Leave them in income as the cash has been received",
      "Raise credit notes against the customers to reverse the income",
      "Delete and re-enter the receipts to the correct account"
    ],
    correct_index: 0,
    explanation: "Customer prepayments are liabilities (deferred revenue) until the service or product is delivered. A journal moving them from income to a liability corrects the P&L without affecting the bank reconciliation."
  },
  {
    question: "A Xero client uses Bills to track expenses but has been processing recurring monthly subscriptions as spend money transactions instead. What problem does this create?",
    options: [
      "The creditor balance will be understated and the aged payables will miss those vendors",
      "The bank reconciliation will fail for those transactions",
      "GST/VAT cannot be claimed on spend money transactions",
      "The transactions will not appear in the profit and loss report"
    ],
    correct_index: 0,
    explanation: "Spend Money bypasses the payables ledger. If the business needs to track what it owes vendors or produce an aged payables report, recurring items should be processed as Bills."
  },
  {
    question: "You need to produce a report showing all transactions coded to a specific account between two dates, including who entered them and when. Which Xero tool provides this?",
    options: [
      "Account transactions report with the 'Audit History' column enabled",
      "General ledger report filtered by account",
      "Budget manager comparison report",
      "Xero HQ activity feed"
    ],
    correct_index: 0,
    explanation: "The Account Transactions report in Xero shows full entry details per account. Enabling the audit history view shows who created or modified each entry."
  },
  {
    question: "A client's trial balance shows a debit balance in the accounts payable control account. What does this indicate?",
    options: [
      "Suppliers have been overpaid — there are net credit balances on supplier accounts",
      "The accounts payable account has been used to post income entries",
      "A data import error has reversed all payable entries",
      "The trial balance has not been refreshed since the last reconciliation"
    ],
    correct_index: 0,
    explanation: "Accounts payable should always have a credit balance (amounts owed to suppliers). A debit balance means payments exceed invoices — suppliers have been overpaid or credit notes have been overclaimed."
  },
  {
    question: "What is the purpose of the 'lock date' feature in Xero and when should it be applied?",
    options: [
      "It prevents any transactions from being added or changed before a set date — typically applied after year-end or management accounts are finalised",
      "It locks the bank reconciliation to prevent further changes to matched transactions",
      "It freezes payroll figures for a completed pay period",
      "It stops new users from being invited to the organisation"
    ],
    correct_index: 0,
    explanation: "The lock date in Xero prevents edits to any period before the set date, protecting finalised accounts from accidental modification. It should be set after accounts are approved."
  },
  {
    question: "A creditor's opening balance was entered as $5,000 when it should have been $500. The error was made six months ago and the period is now locked. What is the correct fix?",
    options: [
      "Post a correcting journal dated after the lock date to reduce the payable by $4,500",
      "Unlock the period, correct the opening balance, and re-lock",
      "Raise a credit note for $4,500 against the supplier",
      "Write off $4,500 to bad debt expense"
    ],
    correct_index: 0,
    explanation: "With a locked period, the cleanest fix is a correcting journal posted in the current open period to reduce the creditor balance by the error amount, with a clear memo note."
  },
  {
    question: "A client processes payroll weekly. They want to accrue wages for the last 3 days of the month that fall into the next pay period. What is the correct journal?",
    options: [
      "Dr Wages Expense, Cr Wages Accrual (liability) — reversed at the start of next month",
      "Dr Wages Accrual, Cr Bank — anticipate the cash payment",
      "Process a partial payroll run for 3 days in the current month",
      "No accrual is needed — payroll is always expensed when paid"
    ],
    correct_index: 0,
    explanation: "Accrual accounting requires wages earned but not yet paid to be recognised in the period. The accrual entry (Dr Expense / Cr Liability) is reversed at the start of next month before the payroll run posts."
  },
  {
    question: "How should you record a hire purchase (finance lease) asset acquisition of $24,000 in Xero where the deposit was $4,000 and the balance is financed over 36 months?",
    options: [
      "Dr Fixed Asset $24,000 / Cr Bank $4,000 / Cr Hire Purchase Liability $20,000 — then post monthly repayment splits between principal and interest",
      "Expense the $4,000 deposit and record only the financed amount as an asset",
      "Post the full $24,000 to the asset account and record repayments as expense",
      "Record only the cash paid to date; the financed portion is disclosed in notes only"
    ],
    correct_index: 0,
    explanation: "A finance lease capitalises the full asset value. The deposit reduces cash, the liability records the financed amount, and each repayment is split between principal (reduces liability) and interest (expense)."
  },
  {
    question: "A client has a Xero file with 24 months of transactions but has never run a bank reconciliation. What is the safest starting approach?",
    options: [
      "Start from the most recent statement and work backwards, using the bank reconciliation summary to isolate the unreconciled period",
      "Delete all unreconciled transactions and re-import from the bank",
      "Set a new opening balance equal to today's bank statement and start fresh",
      "Run the 'Auto-Reconcile' feature which will match all outstanding items"
    ],
    correct_index: 0,
    explanation: "Working backwards from the most recent period ensures current transactions are accurate while you systematically investigate older discrepancies — deleting or resetting loses audit history."
  },
  {
    question: "What does a negative balance in the prepayments account on Xero's balance sheet indicate?",
    options: [
      "Prepayment expenses have been expensed faster than cash was paid — likely a posting error",
      "The client has received more prepayments from customers than they have paid to suppliers",
      "A GST/VAT refund is pending from the tax authority",
      "Depreciation has been over-applied to prepaid assets"
    ],
    correct_index: 0,
    explanation: "Prepayments should always be a debit (asset). A credit/negative balance means expenses were recognised before the prepayment was recorded, or the account has been used in reverse — a posting error to investigate."
  },
  {
    question: "A multi-currency client receives payment in EUR for a USD-denominated invoice. How should this be handled in Xero?",
    options: [
      "Record the payment in EUR; Xero will convert to USD and post any currency gain/loss automatically",
      "Convert the EUR to USD manually and record the payment in USD",
      "Raise a new invoice in EUR and mark the USD invoice as void",
      "Xero does not support cross-currency payments — post a manual journal"
    ],
    correct_index: 0,
    explanation: "Xero's multi-currency module handles cross-currency payments. Recording the payment in the received currency triggers automatic conversion and realised gain/loss posting."
  },
  {
    question: "A client's GST return shows input tax credits (ITCs) exceeding output tax. What does this mean practically?",
    options: [
      "The tax authority owes the client a refund for the net GST position",
      "The client has made an error and overclaimed ITCs",
      "The client must carry the excess forward to offset future liabilities",
      "The return cannot be filed until output tax exceeds input tax"
    ],
    correct_index: 0,
    explanation: "When ITCs exceed output tax (e.g. a high-expense period or capital purchase), the net position is a refund owing to the business from the tax authority."
  },
  {
    question: "What is the effect of applying a discount to a Xero invoice after it has already been approved and sent to a customer?",
    options: [
      "You must issue a credit note for the discount amount — editing an approved/sent invoice creates an audit trail issue",
      "Edit the invoice directly in Xero — approved invoices can always be edited freely",
      "Void the invoice, re-enter with the discount, and re-send",
      "Apply the discount as a line item on the next invoice"
    ],
    correct_index: 0,
    explanation: "Best practice is to issue a credit note for the discount rather than editing a sent invoice. This preserves the original document for the customer's records and Xero's audit trail."
  },
  {
    question: "A Xero client asks why their balance sheet shows retained earnings that differ from the sum of all their historical P&L figures. What is the most common cause?",
    options: [
      "Prior year owner drawings or dividends that reduced retained earnings",
      "The balance sheet is cached and needs to be refreshed",
      "Depreciation charges are excluded from retained earnings",
      "Opening balances for the business were not entered correctly"
    ],
    correct_index: 0,
    explanation: "Retained earnings represent cumulative profit minus any distributions (drawings, dividends). Drawings reduce retained earnings directly and are the most common reason for the apparent discrepancy."
  },
  {
    question: "A client wants to reimburse an employee $350 for out-of-pocket expenses. The employee submitted a mix of receipts — some with GST and some without. What is the correct process in Xero?",
    options: [
      "Create an expense claim in Xero, itemising each receipt with the correct GST/no-GST tax rate per line",
      "Post a single spend money for $350 coded to the expense account with the average GST rate",
      "Pay the employee directly from bank and post a journal later",
      "Create a bill to the employee for the full $350 and pay it"
    ],
    correct_index: 0,
    explanation: "Xero's expense claim module handles mixed-tax receipts per line, ensuring correct GST input credit claims and accurate expense coding per category."
  },
  {
    question: "Which of the following Xero reports would you use to prove to an auditor that all supplier payments in a period were authorised?",
    options: [
      "Account transactions report for the bank account showing the 'Created by' and 'Approved by' columns",
      "Aged payables report sorted by amount",
      "Budget vs actual report for the period",
      "Cash flow statement for the quarter"
    ],
    correct_index: 0,
    explanation: "The account transactions report with user audit columns shows who entered and approved each payment. This is the primary evidence for payment authorisation controls."
  },
  {
    question: "A Xero client processes payroll via an external system and imports the journals manually. The net wages journal posts correctly but the PAYE liability is consistently underposted by $40/month. After 12 months this error is discovered. What is the correct fix?",
    options: [
      "Post a single correcting journal for $480 to bring the PAYE liability to the correct balance",
      "Amend all 12 previous journals individually",
      "Write off $480 to miscellaneous expense to clear the liability",
      "Adjust next month's payroll journal upward to absorb the difference"
    ],
    correct_index: 0,
    explanation: "A single correcting journal for the cumulative $480 (12 × $40) in the current period is the clean and audit-friendly fix — no need to reopen and amend closed payroll journals."
  },
  {
    question: "A client uses Xero Projects. How does project time tracked by employees flow into the Xero financial statements?",
    options: [
      "Time entries create invoiceable items in Projects but do not post to the general ledger until invoiced",
      "Time entries automatically debit WIP and credit accrued income in real time",
      "Time entries post to payroll expense when submitted",
      "Time entries are for reporting only and never affect the accounts"
    ],
    correct_index: 0,
    explanation: "Xero Projects tracks time for profitability and billing purposes. Entries only hit the P&L when a project invoice is raised — prior to that they exist only in the Projects module."
  },
  {
    question: "A client has two business bank accounts in Xero. A transfer of $10,000 between them appears as an unreconciled item in both accounts for two weeks. Why and how is it resolved?",
    options: [
      "Bank transfers in Xero must be matched manually using 'Transfer' in reconciliation — create a bank transfer and match it in both feeds",
      "Delete both transactions and re-enter as a journal between the two bank accounts",
      "Reconcile one side to the transfer and ignore the other side",
      "Wait — Xero will automatically detect and match bank-to-bank transfers"
    ],
    correct_index: 0,
    explanation: "Inter-account transfers must be recorded using Xero's Transfer function, which creates matching entries in both bank accounts. Without this, both sides remain unreconciled."
  },
  {
    question: "Your client's year-end gross profit margin is 48% but prior year was 61%. Before adjusting, what are the three most common causes to investigate in Xero?",
    options: [
      "Unposted purchase invoices inflating COGS, revenue misallocation to other income, or incorrect inventory valuation",
      "A change in the GST/VAT rate affecting net revenue",
      "Payroll costs being double-posted to COGS",
      "The bank reconciliation having an unexplained difference"
    ],
    correct_index: 0,
    explanation: "Gross margin drops typically trace to: missed revenue (posted to wrong account), overstated COGS (duplicate invoices or inventory errors), or timing differences in revenue/expense recognition."
  },
  {
    question: "A client's Xero shows a $15,000 balance in 'undeposited funds'. What does this mean and what action is needed?",
    options: [
      "Cash/cheques have been received but not yet matched to a bank deposit — reconcile or clear each item to the appropriate bank account",
      "The client has exceeded their bank overdraft limit",
      "Fifteen thousand dollars of invoices are overdue for payment",
      "The accounts are not balancing — a journal is needed to clear this"
    ],
    correct_index: 0,
    explanation: "Undeposited funds represent receipts recorded in Xero that haven't been matched to a physical bank deposit yet. Each item needs to be matched or grouped into a deposit batch."
  },
  {
    question: "What is the difference between 'void' and 'delete' for a transaction in Xero, and when should each be used?",
    options: [
      "Void retains the audit trail with a zero-balance record; Delete removes it entirely. Use Void for reconciled/sent documents, Delete only for genuine data-entry errors never actioned.",
      "Void removes the transaction from reports; Delete archives it for future retrieval",
      "Both have the same effect — the choice is a user interface preference",
      "Delete is for draft transactions only; Void applies to all approved items"
    ],
    correct_index: 0,
    explanation: "Voiding keeps the record visible in Xero with all original details but at zero value — critical for audit purposes. Deleting erases the record and should only be used for completely erroneous entries that were never used."
  },
  {
    question: "A Xero client's director wants a report showing which customers generate the most profit, not just the most revenue. Which combination of Xero features best supports this?",
    options: [
      "Tracking categories applied per customer, used to filter the P&L by customer segment",
      "The contact summary report showing total invoices per customer",
      "Invoice reports sorted by total value descending",
      "The aged receivables report cross-referenced with the bank"
    ],
    correct_index: 0,
    explanation: "Tracking categories can be applied to both income and expense transactions per customer/project, enabling a filtered P&L that shows gross and net contribution per customer."
  },
  {
    question: "A Xero client has been adding notes to transactions using the 'Reference' field instead of the 'Memo/Description' field. What problem does this cause for reporting?",
    options: [
      "The Reference field does not appear in most Xero reports — descriptions in that field are invisible in account transaction exports",
      "Transactions with notes in Reference fail to reconcile with the bank",
      "The GST return will exclude those transactions",
      "No problem — Reference and Memo fields function identically in all reports"
    ],
    correct_index: 0,
    explanation: "The Reference field in Xero is primarily for document numbers (invoice/bill references). Description/Memo is the searchable narrative field. Misusing Reference means notes won't appear in standard report exports."
  },
  {
    question: "A client is switching from cash-basis to accrual-basis accounting in Xero mid-year. What is the key accounting adjustment needed?",
    options: [
      "Record all outstanding debtors and creditors as opening balances at the switch date to capture accrued income and expenses",
      "No adjustment is needed — Xero handles both methods from the same data",
      "All prior transactions must be reclassified as accrual entries",
      "The chart of accounts must be rebuilt from scratch for accrual reporting"
    ],
    correct_index: 0,
    explanation: "Switching to accrual mid-year requires capturing all receivables and payables at the switch date. Outstanding invoices and bills not yet paid represent the accruals that would otherwise be missed."
  }
];

// ─────────────────────────────────────────────────────────────
// XERO L3 — Expert / Advisor  (30 questions)
// ─────────────────────────────────────────────────────────────
const XERO_L3 = [
  {
    question: "A multi-entity group uses Xero for all subsidiaries. The parent wants consolidated P&L reporting. What is Xero's native solution and its key limitation?",
    options: [
      "Xero HQ / Practice Manager offers consolidated reporting via connected orgs, but intercompany eliminations must be done manually outside Xero",
      "Xero's built-in consolidation module automatically eliminates intercompany transactions",
      "Export each entity's P&L to Excel and use VLOOKUP to consolidate",
      "Create a single Xero org with tracking categories per entity"
    ],
    correct_index: 0,
    explanation: "Xero Practice Manager can pull data from multiple orgs, but there is no native intercompany elimination engine. Complex group consolidations require an external tool or manual Excel adjustments."
  },
  {
    question: "A Xero client operates in 6 currencies. At year-end, what is the correct treatment for unrealised exchange gains and losses on outstanding foreign currency balances?",
    options: [
      "Revalue outstanding foreign currency debtors and creditors at the closing rate and post unrealised gain/loss to a separate P&L line — reversed at the start of the new period",
      "Leave all balances at transaction rate — exchange gains/losses are only recognised when cash is received or paid",
      "Use the average rate for the year for all foreign balances",
      "Xero automatically revalues and posts unrealised exchange differences at each month-end"
    ],
    correct_index: 0,
    explanation: "Accrual accounting requires year-end revaluation of foreign currency monetary items at the closing rate. Xero does not auto-revalue — the bookkeeper must run this manually and reverse at period start."
  },
  {
    question: "A Xero practice client is being acquired. The buyer's due diligence team identifies $48,000 in transactions over 18 months posted to 'Miscellaneous Expense' with no description. What is the professional obligation of the bookkeeper/accountant?",
    options: [
      "Investigate and recode each transaction to appropriate accounts, documenting the nature of each, before the acquisition completes",
      "Provide a written disclaimer that the miscellaneous account was the client's choice",
      "Ask the client to confirm verbally that all items are legitimate business expenses",
      "No obligation — the due diligence is the buyer's accountant's responsibility"
    ],
    correct_index: 0,
    explanation: "A professional bookkeeper/accountant has a duty of care to ensure accurate records. A large uncodified miscellaneous balance represents a material misstatement risk and must be investigated and corrected before it affects a transaction."
  },
  {
    question: "A Xero client runs a construction business and uses percentage-of-completion revenue recognition. How should this be reflected in Xero?",
    options: [
      "Recognise revenue progressively using progress invoices or manual journals to accrued income, releasing deferred revenue as milestones are reached",
      "Invoice the full contract value upfront and defer income using a liability account",
      "Post revenue only when the final certificate is received from the client",
      "Use Xero Projects as the sole revenue recognition tool — it handles this automatically"
    ],
    correct_index: 0,
    explanation: "Percentage-of-completion requires progressive revenue recognition. In Xero this is achieved through progress billing or manual accrual journals that recognise revenue in proportion to work completed."
  },
  {
    question: "You are onboarding a new Xero client with 3 years of historical data from MYOB. What is the recommended data migration approach?",
    options: [
      "Enter opening balances as at the migration date; import only the current year's transactions if needed; do not back-migrate all history into Xero",
      "Use Xero's MYOB import tool to bring across all 3 years automatically",
      "Manually re-enter every transaction from MYOB for a complete audit trail",
      "Convert all 3 years to CSV and bulk-import via Xero's transaction import feature"
    ],
    correct_index: 0,
    explanation: "Best practice for accounting software migration is a clean cutover with verified opening balances. Back-migrating years of transactions introduces errors and is not cost-effective — historical data stays in MYOB as the archive."
  },
  {
    question: "A Xero advisory client's cash flow forecast shows a $80,000 deficit in 90 days but the P&L shows profitability. What are the most likely reconciling items to identify?",
    options: [
      "High debtors (profit recognised but cash not collected), large loan repayments, or capital expenditure planned",
      "The bank reconciliation is 30 days behind",
      "Revenue has been double-counted in the current period",
      "Payroll accruals have not been reversed"
    ],
    correct_index: 0,
    explanation: "Profit ≠ cash. Common causes of a profitable-but-cash-poor position: slow debtor collection, debt repayments not in P&L, planned capex, or tax/GST payments due. These reconcile the P&L to the cash flow forecast."
  },
  {
    question: "A client's Xero fixed asset register shows net book value of $340,000 but the balance sheet shows fixed assets of $290,000. What should be investigated?",
    options: [
      "Disposals or write-offs processed on the balance sheet but not updated in the asset register, or assets in the register not yet capitalised in Xero",
      "Depreciation has been calculated twice in the current period",
      "The balance sheet is showing last year's figures",
      "GST has been incorrectly included in the asset register values"
    ],
    correct_index: 0,
    explanation: "Discrepancies between the fixed asset register and balance sheet usually mean asset disposals/write-offs were processed in one place but not the other, or capitalisation journals haven't been posted."
  },
  {
    question: "A Xero client is VAT-registered on cash accounting but has grown significantly and must now switch to standard (invoice) VAT accounting. What transitional adjustment is required?",
    options: [
      "Include all outstanding debtors and creditors at the switch date in the first standard VAT return to capture VAT on previously unrecognised sales and purchases",
      "No adjustment — simply change the VAT setting in Xero and file normally",
      "Re-file all previous VAT returns under invoice accounting",
      "Write off all outstanding debtors and creditors at the switch date"
    ],
    correct_index: 0,
    explanation: "Switching from cash to standard VAT requires a transitional return that accounts for VAT on all outstanding debtors (output tax) and creditors (input tax) at the changeover date. Ignoring these creates an under/overdeclaration."
  },
  {
    question: "As a Xero advisor preparing accounts for a small company, you discover the director has been posting personal expenses through the business. The transactions are coded to 'Office Expenses'. What is the correct professional and accounting response?",
    options: [
      "Recode to Director's Loan Account; disclose to the director and advise that HMRC/SARS/ATO may treat these as a benefit or dividend; document the finding",
      "Leave them coded as office expenses — the director is the owner",
      "Void all transactions and return the money to the director's personal account",
      "Report immediately to authorities without informing the client"
    ],
    correct_index: 0,
    explanation: "Personal expenses run through a company must be correctly classified as director's drawings or loans. The bookkeeper/accountant must advise the client of the tax implications and document the correction — immediate external reporting is not required unless there is suspected fraud or anti-money laundering grounds."
  },
  {
    question: "A Xero client has been growing rapidly and requests a service to move from basic bookkeeping to monthly management accounts. What additional Xero outputs should be prepared as part of this upgrade?",
    options: [
      "P&L vs budget with variance commentary, balance sheet with working capital analysis, debtors ageing, cash flow statement, and KPI dashboard",
      "A more detailed chart of accounts and weekly bank reconciliation",
      "Year-end accounts only — management accounts are not meaningful for growing SMEs",
      "A transaction export to Excel for the director to review"
    ],
    correct_index: 0,
    explanation: "A management accounts package typically includes: P&L with budget variance, balance sheet, cash flow, debtor/creditor ageing, and key metrics. This transforms Xero from a compliance tool into a business decision-making resource."
  },
  {
    question: "What is the significance of Xero's 'Assurance Dashboard' for a practice managing multiple client files?",
    options: [
      "It flags files with potential errors — unreconciled items, unusual transactions, locked period violations — allowing proactive quality control across all clients",
      "It generates client invoices automatically based on time tracked",
      "It provides a benchmarking tool comparing client performance to industry averages",
      "It monitors Xero's server uptime and data backup status"
    ],
    correct_index: 0,
    explanation: "The Assurance Dashboard in Xero HQ allows advisors to monitor the health of multiple client files simultaneously, catching reconciliation gaps, duplicate transactions, and unusual patterns before they become audit issues."
  },
  {
    question: "A Xero client's bank loan of $200,000 was entered entirely as a current liability. The loan repayment schedule shows $30,000 due within 12 months and $170,000 due after. What is the correct balance sheet presentation?",
    options: [
      "Split: $30,000 current liability, $170,000 non-current liability",
      "Leave the full $200,000 as current — simplicity is preferable for SMEs",
      "Present the full $200,000 as non-current until the first repayment is due",
      "Offset against the fixed assets the loan funded"
    ],
    correct_index: 0,
    explanation: "Correct balance sheet presentation splits loan balances between current (due within 12 months) and non-current (due after). Classifying long-term debt as current overstates working capital deficiency and misrepresents the business's liquidity position."
  },
  {
    question: "A client asks you to backdate a sales invoice by 3 months to bring it into a prior year to reduce this year's taxable income. What is the correct professional response?",
    options: [
      "Decline — backdating invoices to manipulate taxable income is tax evasion. Advise the client on legitimate tax planning alternatives instead.",
      "Comply — the client instructs the accountant and takes responsibility",
      "Backdate the invoice but document it clearly in the file",
      "Create the invoice with today's date but a prior year reference number"
    ],
    correct_index: 0,
    explanation: "Backdating transactions to manipulate tax liability is fraudulent. This falls under professional ethics obligations for all accounting certifications (AAT, ACCA, CIMA, CPA). The correct response is firm refusal and redirection to legitimate tax planning."
  },
  {
    question: "A Xero client in the manufacturing sector has $85,000 of Work-in-Progress (WIP) that has never been properly valued. The business has been expensing all production costs directly to COGS. What is the financial statement impact of this error?",
    options: [
      "COGS is overstated, gross profit is understated, and inventory/WIP on the balance sheet is understated by $85,000",
      "Revenue is overstated because production costs offset against it incorrectly",
      "The bank balance is understated because WIP represents unpaid supplier invoices",
      "No impact — WIP only affects the management accounts, not statutory accounts"
    ],
    correct_index: 0,
    explanation: "Expensing WIP immediately rather than capitalising it overstates COGS (understating gross profit) and omits an asset from the balance sheet. The $85,000 WIP should be an asset until it is sold."
  },
  {
    question: "A Xero advisory client wants to sell the business. Which metric, derivable from Xero data, is typically most significant in an SME business valuation?",
    options: [
      "EBITDA (Earnings Before Interest, Tax, Depreciation and Amortisation) — typically multiplied by a sector-specific factor",
      "Total revenue for the most recent 12 months",
      "Net assets per the balance sheet",
      "Gross profit margin compared to industry benchmarks"
    ],
    correct_index: 0,
    explanation: "SME valuations most commonly use EBITDA multiples. EBITDA strips out financing structure, tax position, and non-cash charges to give a proxy for operating cash generation. A buyer's accountant will reconstruct this from Xero's P&L."
  },
  {
    question: "A Xero client is switching from monthly to quarterly VAT/GST filing. What is the filing risk and how should the bookkeeper manage it?",
    options: [
      "Cash flow risk — tax accumulates for longer; set up a VAT/GST savings sub-account or provision monthly so funds are available at filing date",
      "The tax authority requires re-registration when changing filing frequency",
      "Quarterly filing increases audit risk — monthly filing is always preferable",
      "No change — just file the same data quarterly instead of monthly"
    ],
    correct_index: 0,
    explanation: "Quarterly filing is administratively simpler but creates cash flow risk if the business doesn't set aside VAT/GST monthly. The bookkeeper's role includes flagging this and advising the client to provision regularly."
  },
  {
    question: "A client runs both a trading business and a property rental through the same Xero file. At year-end, the accountant says the two should be separated. What is the cleanest approach in Xero?",
    options: [
      "Create a second Xero organisation for the property activity; use tracking categories as an interim measure if separation is delayed",
      "Add a new bank account for property income only",
      "Use class codes in the chart of accounts to separate the two",
      "No action needed — the accountant can separate them in year-end software"
    ],
    correct_index: 0,
    explanation: "Separate legal or tax reporting activities should ideally be in separate Xero files. Tracking categories work as a temporary workaround but create complexity in the long run and don't produce a clean standalone P&L per activity."
  },
  {
    question: "What is the maximum risk of using Xero's 'Auto-reconcile' feature without reviewing matched transactions?",
    options: [
      "The AI matching algorithm can incorrectly match transactions of similar amounts, causing miscodings that affect financial reports without human review",
      "Auto-reconcile only works for transactions under $100 so large items are always missed",
      "Auto-reconcile permanently locks matched transactions from future editing",
      "There is no risk — Xero's matching engine has 100% accuracy on connected bank feeds"
    ],
    correct_index: 0,
    explanation: "Auto-reconcile uses pattern matching on amounts, contacts, and account codes. It can incorrectly match similar-value transactions or repeat historic miscodings. Regular review of auto-matched items is essential quality control."
  },
  {
    question: "A client's Xero cashbook shows $340,000 cash in bank but the actual bank statement shows $280,000. Beyond timing differences, what are the most serious explanations to investigate?",
    options: [
      "Fraudulent or fictitious transactions recorded in Xero without bank backing, duplicate receipts, or theft of physical cash not reflected in the bank",
      "The bank feed is 5 days behind due to a sync error",
      "Outstanding cheques not yet presented to the bank",
      "A data import from a prior system that created phantom balances"
    ],
    correct_index: 0,
    explanation: "A large unexplained gap between book and bank (beyond normal timing differences like outstanding cheques) is a serious red flag for fraud or theft. This warrants immediate investigation and should be escalated appropriately."
  },
  {
    question: "How do you correctly account for a Xero client who receives a government grant to purchase equipment?",
    options: [
      "Two accepted approaches: (1) present the grant as deferred income released over the asset's useful life, or (2) deduct the grant from the asset cost. Both are valid under IAS 20.",
      "Credit the full grant to income immediately when received",
      "Offset the grant against the depreciation charge each year",
      "Treat the grant as a capital contribution directly in equity"
    ],
    correct_index: 0,
    explanation: "IAS 20 permits two treatments for capital grants: the deferred income approach (amortised over the asset life) or the net cost approach (deducted from the asset). Immediate income recognition is not permitted for capital grants."
  },
  {
    question: "A Xero advisor is preparing accounts for a company that has issued convertible loan notes. How should these be classified on the balance sheet?",
    options: [
      "Bifurcated: the debt component as a liability and the equity conversion option as equity — the split is calculated using discounted cash flow at inception",
      "Entirely as long-term debt until converted",
      "Entirely as equity since conversion to shares is the intended outcome",
      "Off-balance-sheet as a contingent liability until the conversion decision is made"
    ],
    correct_index: 0,
    explanation: "Under IFRS/IAS 32, convertible instruments must be split between their debt and equity components at inception using present value calculations. Both components are presented separately on the balance sheet."
  },
  {
    question: "A Xero client's accounts show a material related-party transaction that has not been disclosed. The client says it is 'not important'. What is the correct professional response?",
    options: [
      "Insist on disclosure — related-party transactions are required disclosures under accounting standards regardless of the client's preference. Failure to disclose is a qualification risk.",
      "Accept the client's instruction — they know their business best",
      "Disclose only if the transaction exceeds a materiality threshold you set",
      "Note the omission in the working papers and proceed"
    ],
    correct_index: 0,
    explanation: "Related-party disclosures are mandatory under IAS 24 (IFRS) and equivalent standards. The nature and amount of transactions with directors, shareholders, or connected parties must be disclosed. Client resistance does not change this requirement."
  },
  {
    question: "A Xero practice client has just received a substantial inheritance and wants to invest it in the business. What are the two structurally different ways this can enter the accounts and what are their implications?",
    options: [
      "As a capital contribution (equity — no obligation to repay) or as a director's loan (liability — must be repaid and may attract benefit-in-kind tax if interest-free)",
      "As revenue income, credited to the P&L",
      "As a capital asset credited to the fixed assets register",
      "As deferred income until formally invested in a business asset"
    ],
    correct_index: 0,
    explanation: "Equity injection (capital contribution) increases net assets with no repayment obligation. A director's loan creates a liability with potential tax implications (e.g. P11D benefit, Section 455 tax in the UK, or equivalent). The choice has material financial statement and tax consequences."
  },
  {
    question: "A long-standing Xero client's business has been making losses for 3 consecutive years and the director has asked you to prepare accounts 'as a going concern'. What is your professional obligation?",
    options: [
      "Assess the evidence objectively — if there is substantial doubt about going concern, you must disclose it and potentially qualify or modify the accounts, regardless of the director's instruction",
      "Prepare accounts on a going concern basis as instructed — the director is responsible for the assessment",
      "Only raise going concern if a bank has demanded repayment",
      "Convert immediately to a break-up (liquidation) basis without further enquiry"
    ],
    correct_index: 0,
    explanation: "Going concern assessment is the responsibility of both management and the accountant/auditor. Where there is material uncertainty, disclosure is required. Preparing accounts on a going concern basis without proper evidence is a professional standards breach."
  },
  {
    question: "A Xero client generates revenue from a 3-year software licence sold upfront for $90,000. Under accrual accounting, how is this recognised each year?",
    options: [
      "$30,000 per year — recognised evenly over the licence term, with the balance deferred as a liability",
      "$90,000 in year 1 as cash was received",
      "$30,000 in year 1 and the remainder recognised when the client renews",
      "Recognise $90,000 in year 3 when the licence expires and the obligation is fulfilled"
    ],
    correct_index: 0,
    explanation: "Under IFRS 15 / IAS 18, revenue from licences or contracts is recognised as the performance obligation is satisfied. For a time-based licence, this is straight-line over the 3-year term. The unearned portion is a contract liability (deferred revenue)."
  },
  {
    question: "A Xero client has claimed input VAT/GST on a vehicle that is used 60% for business and 40% personal. The tax authority now disallows 100% of the claim. What is the bookkeeper's role in defending the claim?",
    options: [
      "Produce the mileage logs, purpose records, and business use evidence documented in Xero's notes and receipt attachments to substantiate the 60% business use claim",
      "Accept the disallowance — vehicle claims are always 100% disallowed",
      "Amend the original return to remove the claim entirely to avoid penalties",
      "Post the disallowed portion to a tax penalties account and move on"
    ],
    correct_index: 0,
    explanation: "Partial business use of vehicles is claimable but requires documented evidence. Xero's receipt attachments, notes fields, and mileage logs are the primary evidence base for defending partial input tax claims."
  },
  {
    question: "When setting up a new Xero organisation for a client, which three settings have the most significant downstream impact on reporting accuracy?",
    options: [
      "Financial year start date, tax/GST registration status and rate, and base currency — errors here affect every report and tax return from day one",
      "Company logo, user permissions, and invoice template design",
      "Bank feed connection method, mobile app access, and email notification settings",
      "Chart of accounts template selection, contact import method, and tracking category names"
    ],
    correct_index: 0,
    explanation: "Financial year start date determines reporting periods. Tax status determines GST/VAT treatment on every transaction. Base currency affects multi-currency calculations. These three are foundational — errors are systemic and difficult to correct retrospectively."
  },
  {
    question: "A Xero client acquires a competitor for $500,000. The net assets acquired are worth $380,000. How should the $120,000 premium be treated?",
    options: [
      "As goodwill — capitalised as an intangible asset on the balance sheet and tested for impairment annually (or amortised over its useful life under UK GAAP/IFRS for SMEs)",
      "Expensed immediately as an acquisition cost in the P&L",
      "Added to the cost of tangible assets proportionally",
      "Treated as a capital reserve in equity"
    ],
    correct_index: 0,
    explanation: "The excess of purchase price over fair value of net assets acquired is goodwill under IFRS 3 / FRS 102. Under IFRS it is not amortised but tested for impairment annually. Under UK GAAP/IFRS for SMEs it is amortised over its useful life."
  },
  {
    question: "A practice client using Xero wants to benchmark their gross margin against industry peers. What is the most reliable external data source to cross-reference with their Xero P&L?",
    options: [
      "Industry association reports, Companies House/CIPC filed accounts for comparable businesses, or sector-specific benchmarking databases (e.g. IBISWorld, Sage benchmarking)",
      "The Xero small business insights tool only — no external benchmarks are necessary",
      "The client's own prior year figures — year-on-year comparison is sufficient",
      "Bank lending criteria published by commercial banks for that sector"
    ],
    correct_index: 0,
    explanation: "Meaningful benchmarking requires external comparators. Industry association reports, filed accounts for similar companies, and commercial databases provide sector gross margin norms. Internal year-on-year comparison identifies trends but not competitive positioning."
  },
  {
    question: "A Xero client disputes a $12,000 invoice from a major supplier, refusing to pay pending resolution. How should this be reflected in Xero while the dispute is ongoing?",
    options: [
      "Keep the bill open in Xero; add a note recording the dispute and expected resolution date; disclose as a contingent liability if it could affect the accounts materially",
      "Delete the bill until the dispute is resolved",
      "Post a credit note to zero the balance and re-enter when resolved",
      "Move the balance to a provisions account and expense it"
    ],
    correct_index: 0,
    explanation: "A disputed invoice remains a potential liability until resolved. It should stay in the payables ledger with clear notes documenting the dispute. If material, disclosure as a contingent liability in the notes to accounts may be required."
  },
  {
    question: "A Xero advisor receives a new client whose previous bookkeeper used a single bank account code for three different physical bank accounts. Transactions are intermingled across 24 months. What is the remediation plan?",
    options: [
      "Create separate bank account codes in Xero for each physical account; use account transaction exports to identify and reallocate each transaction to the correct account; then reconcile each separately",
      "Leave the existing structure and add a note to the accounts explaining the coding",
      "Start a fresh Xero file from today's date with correct bank codes",
      "Delete all historic bank transactions and re-import from bank statements"
    ],
    correct_index: 0,
    explanation: "Each physical bank account must have its own code in Xero for accurate reconciliation. Remediation requires creating the correct accounts, systematically sorting all 24 months of transactions by account, and reconciling each independently — this is time-intensive but necessary for clean accounts."
  }
];

// ─────────────────────────────────────────────────────────────
// QUICKBOOKS L1 — Foundation  (35 questions)
// ─────────────────────────────────────────────────────────────
const QB_L1 = [
  {
    question: "In QuickBooks Online, what is the difference between a 'Customer' and a 'Vendor'?",
    options: [
      "A customer is someone who buys from your business; a vendor is someone you buy from",
      "A customer is a contact who receives invoices; a vendor is an employee",
      "Customers are tracked in accounts receivable; vendors are tracked in payroll",
      "There is no difference — both are classified as contacts in QBO"
    ],
    correct_index: 0,
    explanation: "In QBO, customers appear in your sales/AR workflow (invoices, receipts). Vendors appear in your purchasing/AP workflow (bills, expense payments). Keeping them separate is fundamental to accurate financial reports."
  },
  {
    question: "You receive $500 cash from a customer who had an outstanding invoice. How do you correctly record this in QuickBooks Online?",
    options: [
      "Receive Payment — select the customer, apply to the open invoice, and deposit to the bank or undeposited funds",
      "Create a new invoice for $500 and mark it as paid",
      "Record a bank deposit directly without linking to the invoice",
      "Create a journal entry: Dr Bank, Cr Sales Revenue"
    ],
    correct_index: 0,
    explanation: "Using 'Receive Payment' in QBO closes the open invoice and records the cash receipt. Depositing without linking leaves the invoice open, inflating your outstanding debtors."
  },
  {
    question: "A vendor sends you a bill for $1,200 due in 30 days. What is the correct QBO transaction to enter?",
    options: [
      "Bill — enter the vendor, amount, due date, and expense account",
      "Expense — enter the amount and mark it as unpaid",
      "Journal entry — Dr Accounts Payable, Cr Expense",
      "Purchase Order — enter the goods ordered and total value"
    ],
    correct_index: 0,
    explanation: "Bills in QBO record what you owe to vendors (accounts payable). An Expense transaction records an immediate payment. Since the invoice is due in 30 days, it should be entered as a Bill."
  },
  {
    question: "In QuickBooks Online, what does the 'Chart of Accounts' represent?",
    options: [
      "A categorised list of all financial accounts used to record every transaction in the business",
      "A list of all customers and vendors",
      "A report showing income and expenses for the year",
      "The bank accounts connected to QuickBooks"
    ],
    correct_index: 0,
    explanation: "The Chart of Accounts is the foundational structure of your books — every transaction is categorised to an account (income, expense, asset, liability, equity). Getting it right is the most important setup step in QBO."
  },
  {
    question: "A business receives a $200 payment from a customer before completing any work. How should this prepayment be recorded in QBO?",
    options: [
      "Record it as a customer deposit to a liability account (deferred/unearned revenue) — move to income when work is completed",
      "Create an invoice for $200 and mark it as paid immediately",
      "Record a bank deposit coded directly to sales income",
      "Leave it unrecorded until the work is done"
    ],
    correct_index: 0,
    explanation: "Cash received before work is performed is a liability (deferred revenue) — you owe the customer the service. Recording it as income immediately overstates revenue before the obligation is met."
  },
  {
    question: "What is the purpose of 'Undeposited Funds' in QuickBooks Online?",
    options: [
      "A holding account for payments received but not yet taken to the bank — grouped into a single deposit to match the bank statement",
      "A reserve account for bad debts",
      "An account for transactions the bookkeeper has not yet categorised",
      "A suspense account for bank import errors"
    ],
    correct_index: 0,
    explanation: "Undeposited Funds holds individual customer payments until they are batched into a bank deposit. This ensures your QBO bank balance matches your actual bank statement deposit by deposit."
  },
  {
    question: "You need to correct an invoice that has already been sent to a customer but has the wrong amount. The customer has not paid yet. What is the correct action in QBO?",
    options: [
      "Edit the invoice directly in QBO and resend the corrected version to the customer",
      "Void the invoice, create a new one, and send again",
      "Create a credit note for the difference",
      "Delete the invoice and start over"
    ],
    correct_index: 0,
    explanation: "If an invoice has not been paid, editing it in QBO is acceptable and maintains the same invoice number. If it has already been paid, a credit note or adjustment is needed instead."
  },
  {
    question: "In QuickBooks Online, what does reconciling a bank account achieve?",
    options: [
      "It confirms that every transaction in QBO matches the bank statement, identifying errors, missing entries, or unrecorded transactions",
      "It automatically imports bank transactions from the feed",
      "It creates a report showing all unpaid invoices",
      "It locks the account so no further entries can be made"
    ],
    correct_index: 0,
    explanation: "Reconciliation is the process of matching QBO records to the bank statement line by line. It confirms accuracy and highlights discrepancies before they become bigger problems."
  },
  {
    question: "A customer overpays their invoice by $50. They ask you to apply the credit to their next invoice. What is the correct process in QBO?",
    options: [
      "Receive the full payment — QBO creates a credit on the customer account which can be applied to the next invoice when raised",
      "Refund the $50 to the customer immediately",
      "Raise a credit note for $50 and close it off",
      "Edit the original invoice to add $50 of additional goods"
    ],
    correct_index: 0,
    explanation: "QBO records the overpayment as an unapplied credit on the customer account. When the next invoice is created, the credit can be applied to reduce the amount due."
  },
  {
    question: "What is the difference between 'Cash' and 'Accrual' accounting basis in QBO reports?",
    options: [
      "Cash basis reports income/expenses when money changes hands; accrual basis reports income when earned and expenses when incurred, regardless of payment",
      "Cash basis is used for tax; accrual is used for management reporting only",
      "Accrual basis is only available on the Advanced QBO plan",
      "There is no difference in QBO — both methods produce identical reports"
    ],
    correct_index: 0,
    explanation: "QBO lets you toggle between cash and accrual reporting. Cash basis is simpler and shows actual cash flow. Accrual is required for larger businesses and shows the true financial position including debtors and creditors."
  },
  {
    question: "You need to record a business owner taking $1,000 from the business account for personal use. How is this recorded in QBO?",
    options: [
      "As an Owner's Draw (equity account) — reduces the owner's equity in the business",
      "As a business expense under 'Miscellaneous'",
      "As a loan from the business to the owner — Dr Loan, Cr Bank",
      "Do not record personal withdrawals in QBO"
    ],
    correct_index: 0,
    explanation: "Owner withdrawals are equity transactions, not expenses. Recording them as expenses overstates business costs. The Owner's Draw (or Drawings) account correctly reduces the owner's equity balance."
  },
  {
    question: "What is a 'Class' in QuickBooks Online and when would you use it?",
    options: [
      "A label applied to transactions to segment reporting by department, location, or project without changing the chart of accounts",
      "A type of account used for capital assets",
      "A payroll category for employee classification",
      "A sub-customer level below the main customer record"
    ],
    correct_index: 0,
    explanation: "Classes in QBO allow you to tag transactions and produce segmented P&L reports (e.g. by department or product line). They don't affect the account codes — they're an additional reporting dimension."
  },
  {
    question: "A QBO user deletes an invoice by mistake. What is the correct approach?",
    options: [
      "Check the Audit Log to find the deleted invoice details, then recreate it",
      "Deleted invoices are permanently gone — nothing can be done",
      "Contact QBO support to recover the invoice from their backup",
      "Run the A/R Ageing report — deleted invoices still appear there"
    ],
    correct_index: 0,
    explanation: "QBO's Audit Log records every transaction and change, including deletions. You can view the original details and manually recreate the invoice. This is why the Audit Log should be reviewed regularly."
  },
  {
    question: "A client pays three invoices with a single bank transfer. How do you record this in QBO?",
    options: [
      "Use 'Receive Payment', select the customer, and tick all three invoices — QBO applies the single payment across them",
      "Create three separate Receive Payment entries for each invoice",
      "Record a single bank deposit and apply it to the oldest invoice only",
      "Create a credit memo for the total amount and close the invoices"
    ],
    correct_index: 0,
    explanation: "QBO's Receive Payment screen lets you apply a single payment across multiple open invoices. This matches your bank statement (one line) while correctly closing all three AR balances."
  },
  {
    question: "What does the 'Profit and Loss' report in QBO show?",
    options: [
      "All income and expenses for a chosen period, resulting in net profit or loss",
      "The current balances of all asset and liability accounts",
      "A summary of all cash movements in and out of the bank",
      "A list of outstanding customer invoices and vendor bills"
    ],
    correct_index: 0,
    explanation: "The Profit and Loss (also called Income Statement) shows revenue minus expenses for a period. It tells you if the business made money — but does not show cash position or what is owed to/by the business."
  },
  {
    question: "A vendor gives your business a credit note for $300 for returned goods. How do you enter this in QBO?",
    options: [
      "Vendor Credit — enter the vendor, amount, and the original expense account; apply it to reduce a future bill payment",
      "Create a bill for -$300 to represent the credit",
      "Record a bank deposit of $300 from the vendor",
      "Post a journal entry: Dr Bank, Cr Accounts Payable"
    ],
    correct_index: 0,
    explanation: "Vendor Credits in QBO record money owed to you by a vendor. The credit sits on the vendor's account until applied against a future bill payment, reducing what you owe them."
  },
  {
    question: "In QBO, what is the 'Balance Sheet' and what does it tell you?",
    options: [
      "A snapshot of assets, liabilities, and equity at a point in time — showing what the business owns, owes, and the owner's net stake",
      "A report of all income and expenses for the year",
      "A list of all bank account balances",
      "A comparison of budget vs actual performance"
    ],
    correct_index: 0,
    explanation: "The Balance Sheet (Statement of Financial Position) shows the accounting equation: Assets = Liabilities + Equity. It gives a picture of the business's financial health at a specific date, not a period."
  },
  {
    question: "A new employee joins the business. Where do you set them up in QuickBooks Online Payroll?",
    options: [
      "Payroll > Employees > Add Employee — enter personal details, pay rate, tax information, and bank details",
      "Vendors > New Vendor — employees are treated as vendors in QBO",
      "Chart of Accounts > Add Account for each employee",
      "Expenses > Recurring — set up their salary as a recurring expense"
    ],
    correct_index: 0,
    explanation: "Employees are set up in the dedicated Payroll module in QBO, not as vendors or expenses. Payroll requires specific tax information (W-4/tax code) and bank details for direct deposit."
  },
  {
    question: "You buy office supplies for $80 cash from the petty cash box. How do you record this in QBO?",
    options: [
      "Expense transaction — select petty cash as the payment account and Office Supplies as the category",
      "Bill — enter the store as a vendor and the amount as due immediately",
      "Journal entry — Dr Office Supplies, Cr Cash",
      "Bank deposit — record the purchase as a negative deposit"
    ],
    correct_index: 0,
    explanation: "Small cash purchases from petty cash are recorded as Expense transactions in QBO, using the petty cash account as the payment source and the appropriate expense category."
  },
  {
    question: "What is the purpose of 'Products and Services' in QuickBooks Online?",
    options: [
      "A list of items your business sells or buys, with default pricing and income/expense accounts — added to invoices and bills as line items",
      "A record of your business's physical inventory locations",
      "A catalogue of vendor pricing for comparison",
      "An asset register for equipment and fixtures"
    ],
    correct_index: 0,
    explanation: "Products and Services in QBO stores your default items (what you sell and buy). Adding an item to an invoice auto-populates description, price, and account code — saving time and ensuring consistency."
  },
  {
    question: "A QBO bank feed shows a transaction that you cannot identify. What is the safest action?",
    options: [
      "Code it temporarily to 'Ask My Accountant' or a suspense account and add a note — do not guess the category",
      "Code it to Miscellaneous Expenses to clear the feed",
      "Delete the transaction from the feed",
      "Exclude the transaction and reconcile without it"
    ],
    correct_index: 0,
    explanation: "Using a suspense account or 'Ask My Accountant' ensures the transaction is recorded without being miscoded. Guessing categories creates harder-to-find errors. Document it for follow-up."
  },
  {
    question: "What does 'matching' a bank feed transaction in QBO do?",
    options: [
      "Links the imported bank line to an existing QBO transaction (e.g. an invoice payment or bill payment) — confirming they are the same event",
      "Creates a new transaction in QBO based on the bank line",
      "Marks the bank transaction as reviewed without creating any QBO entry",
      "Combines two bank lines into one"
    ],
    correct_index: 0,
    explanation: "Matching links a bank feed line to an already-recorded QBO transaction. This confirms the record and marks both the bank line and the QBO entry as reconciled — no new entry is created."
  },
  {
    question: "A QBO Profit and Loss report shows insurance expense of $14,400. You know the annual premium is $12,000. What should you investigate?",
    options: [
      "Check whether the full premium was expensed immediately rather than being spread across 12 months as a prepayment",
      "Check whether the insurance company overcharged",
      "Verify the bank statement shows $14,400 in payments to the insurer",
      "Run a year-over-year comparison to see if the same happened last year"
    ],
    correct_index: 0,
    explanation: "An insurance expense $2,400 above the annual premium suggests either a double-coding error or the premium was not correctly prepaid (part of the payment relates to the next period and should be on the balance sheet as a prepayment)."
  },
  {
    question: "How does QuickBooks Online handle sales tax (GST/VAT) on an invoice?",
    options: [
      "You set up tax rates in QBO; when added to an invoice line, QBO calculates the tax, shows it to the customer, and tracks it in a sales tax liability account",
      "QBO invoices never include tax — customers add tax themselves",
      "Tax is calculated externally and entered as a manual journal at period end",
      "QBO only handles US sales tax — international users must manage tax manually"
    ],
    correct_index: 0,
    explanation: "QBO's tax centre lets you configure applicable tax rates (GST, VAT, sales tax). When applied to transactions, QBO auto-calculates and tracks tax collected and paid, generating reports for filing."
  },
  {
    question: "What is the difference between voiding and deleting a transaction in QBO?",
    options: [
      "Voiding zeroes the transaction but keeps it in QBO's history; deleting removes it entirely. Voiding is preferred to maintain the audit trail.",
      "Voiding removes the transaction from reports; deleting archives it",
      "Deleting and voiding have identical effects in QBO",
      "You can only delete draft transactions; approved transactions must be voided"
    ],
    correct_index: 0,
    explanation: "Voiding is the preferred method — it preserves the audit trail while zeroing the transaction's financial impact. Deleting erases it completely and is appropriate only for clear data-entry errors that were never used."
  },
  {
    question: "A business wants to track income and expenses separately for three different departments. Which QBO feature is designed for this?",
    options: [
      "Classes — tag all transactions with a department class and filter the P&L by class",
      "Locations — create a location for each department",
      "Sub-customers — create each department as a sub-customer",
      "Separate bank accounts for each department"
    ],
    correct_index: 0,
    explanation: "Classes in QBO are the primary tool for segmented reporting across departments, product lines, or business units. The P&L by Class report shows each segment's performance separately."
  },
  {
    question: "You receive a utility bill for $320 that covers electricity and gas as two separate line items. How should you enter this in QBO?",
    options: [
      "Bill with two line items — one coded to Electricity expense and one to Gas expense",
      "Two separate bills — one per utility",
      "A single bill coded 50/50 between both accounts",
      "Record it as a single expense to Utilities — splitting is unnecessary"
    ],
    correct_index: 0,
    explanation: "A single bill with multiple expense categories should be entered with separate line items, each coded to the appropriate account. This gives accurate category-level expense reporting."
  },
  {
    question: "A QBO client's bank reconciliation has an unexplained $40 difference every month. What is the most likely cause?",
    options: [
      "A recurring bank charge (e.g. monthly account fee) not being recorded in QBO",
      "The bank feed is rounding all transactions to the nearest $40",
      "A duplicate invoice is inflating accounts receivable",
      "The opening balance for the bank account was entered incorrectly"
    ],
    correct_index: 0,
    explanation: "A consistent monthly reconciliation difference almost always traces to a recurring unrecorded transaction — most commonly a bank fee, subscription, or interest charge not captured in QBO."
  },
  {
    question: "What is the 'Accounts Receivable Ageing Summary' report in QBO used for?",
    options: [
      "It shows all outstanding customer invoices grouped by how overdue they are (current, 1-30 days, 31-60 days, 60+ days)",
      "It shows all income received grouped by customer for the year",
      "It shows which accounts receivable accounts exist in the chart of accounts",
      "It projects when customers will pay based on payment history"
    ],
    correct_index: 0,
    explanation: "The AR Ageing Summary is the primary tool for managing debtors — it shows who owes you money and how overdue each balance is, helping prioritise collections and identify bad debt risks."
  },
  {
    question: "In QBO, what is a 'Recurring Transaction' and when is it useful?",
    options: [
      "A saved transaction template that posts automatically or with a reminder on a scheduled basis — ideal for rent, subscriptions, depreciation journals",
      "A transaction that was accidentally entered twice",
      "A bank feed transaction that appears every month",
      "A report that refreshes automatically with new data"
    ],
    correct_index: 0,
    explanation: "Recurring Transactions in QBO save time on predictable, regular entries. You can schedule them to auto-post (e.g. monthly rent) or send a reminder to review before posting (e.g. payroll journal)."
  },
  {
    question: "A business pays its annual insurance premium of $6,000 in January. How should this be treated for accurate monthly reporting?",
    options: [
      "Record as a prepayment (asset) in January and amortise $500/month to insurance expense over 12 months",
      "Expense the full $6,000 in January when paid",
      "Expense $500/month and leave the full amount in accounts payable",
      "Split the payment equally across 12 bank transactions"
    ],
    correct_index: 0,
    explanation: "Prepaid expenses should be capitalised and released to expense monthly. Expensing $6,000 upfront distorts January's P&L and understates expenses for the remaining 11 months."
  },
  {
    question: "When you connect a bank account to QBO's bank feed, what does QBO do with the imported transactions?",
    options: [
      "Places them in the 'For Review' queue — you must review, categorise, and accept each one before they appear in reports",
      "Automatically posts them to the correct accounts using AI — no review needed",
      "Creates invoices or bills for each transaction automatically",
      "Imports them directly into the reconciliation screen without any categorisation"
    ],
    correct_index: 0,
    explanation: "Bank feed transactions land in 'For Review' in QBO. The user must confirm the suggested category (or change it) before each transaction is added to the books. Auto-accept without review creates miscoding risks."
  },
  {
    question: "A sole trader client is using QBO for the first time. Their business bank account also receives occasional personal transfers. How should personal transfers be handled?",
    options: [
      "Code personal transfers to an Owner's Equity or Personal account — exclude them from income and expense accounts",
      "Code all bank deposits to Income by default",
      "Delete personal transfers from the bank feed",
      "Create a separate customer record for the owner"
    ],
    correct_index: 0,
    explanation: "Personal transfers are not business income or expense. They must be coded to equity (owner's draws/investments) to keep business financial statements accurate and tax reporting correct."
  },
  {
    question: "Which QBO report would you use to check whether all customer invoices for a month have been collected?",
    options: [
      "Accounts Receivable Ageing Detail — shows every open invoice by customer with age",
      "Profit and Loss — shows total income billed",
      "Cash Flow Statement — shows cash received from customers",
      "Customer Contact List — shows all active customer records"
    ],
    correct_index: 0,
    explanation: "The AR Ageing Detail report shows every individual unpaid invoice with the customer name, amount, due date, and days overdue — the definitive tool for collections follow-up."
  },
  {
    question: "A QBO client uses inventory tracking. They sell 10 units of a product at $50 each that cost $30 each to purchase. What is the gross profit on this sale?",
    options: [
      "$200 — revenue $500 minus cost of goods $300",
      "$500 — the full sale price",
      "$300 — the cost of goods sold",
      "$150 — half of revenue"
    ],
    correct_index: 0,
    explanation: "Gross profit = Revenue − COGS. Revenue = 10 × $50 = $500. COGS = 10 × $30 = $300. Gross profit = $500 − $300 = $200. QBO auto-posts the COGS entry when inventory items are invoiced."
  }
];

// ─────────────────────────────────────────────────────────────
// QUICKBOOKS L2 — Professional  (35 questions)
// ─────────────────────────────────────────────────────────────
const QB_L2 = [
  {
    question: "A QBO client receives a partial payment of $800 against a $1,200 invoice. The customer says they'll pay the balance next week. How do you record this correctly?",
    options: [
      "Receive Payment for $800, apply it to the invoice — QBO leaves $400 as the remaining open balance",
      "Edit the invoice down to $800 and mark it as paid",
      "Create a credit note for $400 and close the invoice",
      "Record a bank deposit of $800 and create a new invoice for $400"
    ],
    correct_index: 0,
    explanation: "Receive Payment applies the $800 to the invoice partially. QBO keeps the $400 balance as an open receivable — visible in AR ageing — until the second payment is received."
  },
  {
    question: "Your QBO bank reconciliation has a $250 discrepancy. After investigation, you find a bill payment was entered twice — once correctly and once as an expense. What is the fix?",
    options: [
      "Delete or void the duplicate expense transaction — this removes the double-counted deduction and corrects the bank balance",
      "Create a $250 adjusting journal entry to a reconciliation difference account",
      "Edit the original bill payment to $0 and re-enter it",
      "Delete the original bill payment and keep the expense"
    ],
    correct_index: 0,
    explanation: "Duplicate entries must be identified and eliminated at source. Deleting the incorrect duplicate restores the true bank balance. Adjusting journals should not be used to paper over data-entry errors."
  },
  {
    question: "A QBO client wants to produce a P&L that shows gross margin per product line. What is the most efficient setup?",
    options: [
      "Use Classes — one class per product line — and apply to all income and COGS transactions; run P&L by Class",
      "Create separate income and COGS accounts for each product line in the chart of accounts",
      "Export transactions to Excel and build a pivot table",
      "Use the Products and Services list filtered by category"
    ],
    correct_index: 0,
    explanation: "Classes segment the P&L without multiplying account codes. Assigning a class per product line to both income and COGS transactions gives a clean P&L by Class report showing gross margin per line."
  },
  {
    question: "A QBO client's accounts payable balance on the balance sheet doesn't match the total on the AP Ageing report. What are the most likely causes?",
    options: [
      "Journal entries posted directly to the AP account bypassing bill entry, or bills entered in a different currency inflating/deflating the balance",
      "The bank feed is 48 hours behind",
      "The chart of accounts has two AP accounts and transactions are split between them",
      "The ageing report is on cash basis; the balance sheet is on accrual"
    ],
    correct_index: 0,
    explanation: "Direct journal entries to AP bypass the vendor subledger — they update the GL but not the ageing. Multiple AP accounts or currency conversion differences also cause this. The fix is identifying and correcting all non-bill AP entries."
  },
  {
    question: "A QBO client receives a government grant of $15,000. It is not repayable and has no conditions attached. How should it be recorded?",
    options: [
      "Credit to Other Income (Grant Income) — it is unconditional income, not a liability",
      "Credit to a liability account until spent",
      "Offset against the expenses it was intended to fund",
      "Record as owner's equity contribution"
    ],
    correct_index: 0,
    explanation: "An unconditional, non-repayable grant is income in the period received. It is correctly credited to an Other Income account. A conditional grant (repayable if conditions not met) would initially be a liability."
  },
  {
    question: "A client's QuickBooks inventory shows 50 units on hand but a physical count reveals only 43 units. What is the correct QBO adjustment?",
    options: [
      "Inventory Qty Adjustment — enter the count date and the actual quantity; QBO posts the variance to the Inventory Shrinkage expense account",
      "Delete 7 inventory items from the Products and Services list",
      "Edit the product record to show 43 units",
      "Create a credit note to reduce the inventory value by 7 units"
    ],
    correct_index: 0,
    explanation: "QBO's Inventory Adjustment tool (Qty Adjustment) is designed for this — you enter the actual count and QBO calculates the variance, reducing inventory and posting the cost of the missing units to shrinkage/loss."
  },
  {
    question: "A QBO client pays a contractor $5,500 in a calendar year. What US tax reporting obligation does this trigger?",
    options: [
      "A 1099-NEC must be issued to the contractor if they are an individual or LLC (non-corporation) paid $600 or more in the year",
      "Payroll taxes must be withheld on all contractor payments over $5,000",
      "No reporting obligation — contractor payments are fully anonymous",
      "A W-2 must be issued for any payment over $5,000"
    ],
    correct_index: 0,
    explanation: "US businesses must issue 1099-NEC forms to non-employee service providers (individuals/partnerships/LLCs taxed as partnerships) paid $600+ in a year. QBO's 1099 wizard tracks these payments and prepares the forms."
  },
  {
    question: "A QBO report shows accounts receivable of $45,000 but you know three customers have gone out of business owing $8,200 total. What accounting entry is required?",
    options: [
      "Debit Bad Debt Expense, Credit Accounts Receivable (via a credit memo or journal) — reducing AR to $36,800 and recognising the loss",
      "Delete the three customer invoices",
      "Move the $8,200 to a 'doubtful debts' income account",
      "Offset the bad debt against future sales to those customers"
    ],
    correct_index: 0,
    explanation: "Bad debts must be written off — the receivable is no longer collectable. In QBO this is done via a credit memo coded to Bad Debt expense, which closes the invoice and records the loss on the P&L."
  },
  {
    question: "A QBO client's Profit and Loss report shows net profit of $80,000 but the owner says they only have $12,000 in the bank. What are the most likely explanations?",
    options: [
      "Debtors not yet collected, loan repayments reducing cash (not P&L), large capital expenditure paid, or owner drawings reducing the bank balance",
      "The P&L is being run on accrual basis — switch to cash and they will match",
      "The bank feed is missing transactions from the last 30 days",
      "VAT/GST is included in the P&L but not the bank balance"
    ],
    correct_index: 0,
    explanation: "Profit ≠ cash. P&L shows income earned (including unpaid invoices) minus expenses incurred. Cash is reduced by: unpaid AR, loan repayments, capex, and owner drawings — none of which appear directly in the P&L."
  },
  {
    question: "A QBO client is on cash-basis accounting but their bank reports $30,000 more than QBO shows. What should you investigate?",
    options: [
      "Customer deposits received but not yet recorded, bank transactions in the feed not yet categorised, or opening balances entered incorrectly",
      "The client is double-counting invoices",
      "Outstanding bills have been paid but not reconciled",
      "QuickBooks has rounded large transactions"
    ],
    correct_index: 0,
    explanation: "A $30,000 gap on cash basis (where accounts match cash movements) suggests: uncategorised bank feed transactions, customer deposits not entered, or an incorrect opening bank balance."
  },
  {
    question: "You are setting up payroll in QBO for a US business with employees in two states. What is the critical compliance consideration?",
    options: [
      "Each state has different income tax withholding rates and may require separate state tax registrations — QBO must be configured with the correct state taxes per employee",
      "Federal payroll taxes are the only consideration — state taxes are filed separately outside QBO",
      "Multi-state payroll is not supported in QBO — use a third-party payroll provider",
      "Employees choose which state tax to withhold on their W-4"
    ],
    correct_index: 0,
    explanation: "Multi-state payroll requires state-specific tax registration and correct withholding setup per employee. QBO's payroll supports multi-state, but each employee's work state (and sometimes home state) must be configured correctly for compliance."
  },
  {
    question: "A QBO client purchases a delivery van for $45,000. How should this be recorded and what ongoing accounting is required?",
    options: [
      "Record as a Fixed Asset on the balance sheet; set up depreciation (straight-line or declining balance) as a recurring journal or via QBO's fixed asset feature",
      "Expense the full $45,000 to vehicle costs in the period of purchase",
      "Record as an expense but add the van to inventory",
      "Only record the van when it is fully paid off"
    ],
    correct_index: 0,
    explanation: "Capital assets are not expensed immediately — they are capitalised and depreciated over their useful life. The van should be recorded as a fixed asset, then depreciated periodically (monthly or annually) with an adjusting journal."
  },
  {
    question: "A QBO client's sales tax return shows more sales tax collected than what QBO's Sales Tax Liability report shows. What should be investigated?",
    options: [
      "Invoices where tax was applied outside QBO's tax centre (manual overrides), tax-exempt sales incorrectly taxed, or the date range mismatch between the two reports",
      "The tax rate has changed during the period",
      "The bank feed imported duplicate sales transactions",
      "Vendor bills were incorrectly included in the sales total"
    ],
    correct_index: 0,
    explanation: "Discrepancies between collected tax and QBO's liability report typically trace to manual tax overrides on invoices, inconsistent tax period selections, or transactions entered outside QBO's tax workflow."
  },
  {
    question: "A QBO client runs a service business and wants to bill clients for time spent on projects at different hourly rates. What QBO feature supports this?",
    options: [
      "Time Tracking (via QBO or integrated app like TSheets/QuickBooks Time) — employees log hours against customers/projects; QBO converts approved time into invoice line items",
      "Custom fields on invoices to manually enter hours",
      "The Projects module for tracking profitability only — billing must be done separately",
      "Recurring invoices set up with fixed rates"
    ],
    correct_index: 0,
    explanation: "QBO Time Tracking (or QuickBooks Time) lets employees log billable hours against customers. These time entries flow directly into invoices as billable line items, with rates pulled from the Products and Services list."
  },
  {
    question: "A QBO Profit and Loss year-to-date shows total expenses $120,000 higher than the same period last year. Before assuming a business problem, what QBO-specific issue should you check first?",
    options: [
      "Whether a large asset purchase was expensed rather than capitalised, or whether a prior-year accrual reversal doubled up an expense line",
      "Whether the bank feed missed a month of transactions last year",
      "Whether the chart of accounts was changed in the current year",
      "Whether the company's financial year start date was modified"
    ],
    correct_index: 0,
    explanation: "Before assuming a real business cost increase, verify: (1) no capex was expensed, (2) no opening balance journals double-counted expenses, and (3) prior-year accruals reversed correctly. These QBO-specific issues routinely explain large YoY expense variances."
  },
  {
    question: "A client asks you to produce a QBO cash flow statement. The net income figure is $95,000 but operating cash flow shows $62,000. What reconciling items explain the difference?",
    options: [
      "Non-cash items (depreciation, amortisation) added back, plus changes in working capital — increase in debtors reduces cash, increase in creditors increases it",
      "The bank feed is missing $33,000 of transactions",
      "Owner drawings of $33,000 were excluded from the P&L",
      "The cash flow statement is wrong — it should always equal net income"
    ],
    correct_index: 0,
    explanation: "The indirect cash flow statement starts with net income and adjusts for: non-cash charges (depreciation increases cash flow), and working capital movements (higher debtors = cash used; higher creditors = cash saved)."
  },
  {
    question: "A QBO client acquired another small business and paid $80,000 for assets worth $65,000. How is the $15,000 premium recorded?",
    options: [
      "Goodwill — capitalised as an intangible asset; tested for impairment or amortised depending on the applicable accounting standard",
      "Expensed immediately as a business acquisition cost",
      "Added proportionally to the value of each acquired asset",
      "Recorded as a prepayment to be released over 5 years"
    ],
    correct_index: 0,
    explanation: "The excess paid above fair market value of net assets acquired is goodwill — a separate intangible asset on the balance sheet. Under US GAAP it is not amortised but tested for impairment. Under IFRS for SMEs it is amortised."
  },
  {
    question: "A QBO client's insurance expense includes a $2,400 payment in March. Your review shows the policy period is March to February next year. What year-end adjustment is needed?",
    options: [
      "At year-end (e.g. December), record 2 months ($400) as prepaid insurance (asset) and reduce insurance expense accordingly — the remaining 10 months have been correctly expensed",
      "No adjustment needed — all insurance paid in the year is an expense of that year",
      "Move the full $2,400 to prepaid insurance at year-end",
      "Spread the $2,400 equally across 12 months using a recurring journal"
    ],
    correct_index: 0,
    explanation: "Only the expense relating to the period should be in the P&L. At December year-end, 2 months of the 12-month policy remain unused ($2,400 × 2/12 = $400). That $400 is a prepayment (asset), not an expense."
  },
  {
    question: "A QBO client has intercompany transactions between two entities they own. Entity A sells $10,000 of services to Entity B. How should this be handled in consolidated reporting?",
    options: [
      "The $10,000 intercompany income in Entity A and the $10,000 intercompany expense in Entity B must be eliminated on consolidation — otherwise group revenue and expenses are both overstated",
      "Include both in the consolidated P&L — it represents real revenue and expense",
      "Only the receiving entity (B) records the transaction",
      "QBO handles intercompany eliminations automatically in multi-entity view"
    ],
    correct_index: 0,
    explanation: "Intercompany transactions cancel out within the group. Including both sides in consolidated accounts inflates both revenue and costs without any real group-level activity. Manual elimination is required — QBO does not do this automatically."
  },
  {
    question: "A QBO project shows total revenue of $40,000 and total costs of $28,000. The project is now complete. What is the project profitability and where should this be reviewed in QBO?",
    options: [
      "$12,000 profit (30% margin) — reviewed in QBO's Projects module which shows income, costs, and margin per project",
      "$28,000 profit — costs are excluded from profitability in QBO Projects",
      "Profitability cannot be measured in QBO — use an external spreadsheet",
      "$12,000 — this automatically posts to the P&L as 'Project Income'"
    ],
    correct_index: 0,
    explanation: "QBO Projects aggregates all income and expenses tagged to the project, showing profit and margin. $40,000 − $28,000 = $12,000 net profit (30% margin). This is reviewed directly in the Projects dashboard."
  },
  {
    question: "A QBO client is a contractor and receives a $30,000 progress payment on a project that is 40% complete. The full contract value is $75,000. Under accrual accounting, how much revenue should be recognised?",
    options: [
      "$30,000 (cash received) is the conservative approach under contract accounting, or $30,000 under percentage-of-completion (40% × $75,000 = $30,000 — they happen to coincide here)",
      "$75,000 — the full contract value when the payment is received",
      "$0 — revenue is only recognised when the project is 100% complete",
      "$45,000 — the remaining balance after the progress payment"
    ],
    correct_index: 0,
    explanation: "Under percentage-of-completion, 40% × $75,000 = $30,000 of revenue is recognisable — which matches the cash received in this case. QBO requires manual tracking of contract revenue recognition as it doesn't auto-calculate PoC."
  },
  {
    question: "A QBO client receives a bank loan of $50,000. How is this recorded on the balance sheet?",
    options: [
      "Dr Bank $50,000 / Cr Loan Liability $50,000 — an asset increase matched by a liability increase; no P&L impact",
      "Cr Income $50,000 — loan proceeds are income when received",
      "Dr Bank $50,000 / Cr Owner's Equity $50,000",
      "Record only the repayments — the loan is disclosed in notes only"
    ],
    correct_index: 0,
    explanation: "A loan receipt is a balance sheet transaction — the bank balance increases (asset) and the loan liability increases by the same amount. Loan proceeds are never income."
  },
  {
    question: "You run a QBO Profit and Loss by Class report and find that one class has expenses but no income. What two things should you investigate?",
    options: [
      "Whether income transactions are missing a class tag, and whether the class was applied to incorrect expense transactions",
      "Whether the class name needs to be changed",
      "Whether expenses should be moved to unclassified",
      "Whether the chart of accounts is missing income accounts for that class"
    ],
    correct_index: 0,
    explanation: "A class with costs but no income usually means: (1) income transactions weren't tagged with that class, or (2) costs were tagged to the wrong class. Both reduce the usefulness of the class report for profitability analysis."
  },
  {
    question: "A QBO client buys equipment for $18,000 and receives a trade-in credit of $3,000 for old equipment. How should the net transaction be recorded?",
    options: [
      "Record the new asset at $18,000; record the trade-in as a disposal of the old asset at $3,000 (with any gain/loss vs book value); net payment to vendor = $15,000",
      "Record the new asset at $15,000 (net of trade-in)",
      "Expense the trade-in credit as other income",
      "Only record the $15,000 cash payment — trade-ins don't require separate entries"
    ],
    correct_index: 0,
    explanation: "Each leg of the transaction is separate: the new asset is recorded at its full cost ($18,000); the old asset is disposed of at trade-in value ($3,000), and any difference vs book value is a gain or loss. Netting understates the new asset's cost and depreciation base."
  },
  {
    question: "A QBO client is behind on filing payroll taxes. What is the risk and where in QBO can you verify the outstanding liability?",
    options: [
      "Late payroll tax payments attract significant IRS penalties and interest — the Payroll Tax Centre in QBO shows outstanding liabilities, due dates, and amounts owed",
      "Payroll tax penalties are capped at 5% — the risk is minimal",
      "QBO automatically files and pays payroll taxes — no manual check is needed",
      "Outstanding payroll liabilities appear in the accounts payable ageing"
    ],
    correct_index: 0,
    explanation: "IRS payroll tax penalties can be severe (2–15% depending on how late). QBO's Payroll Tax Centre shows exactly what is due and when, allowing you to identify arrears before they compound."
  },
  {
    question: "A QBO file has been in use for 3 years and the 'Uncategorised Income' account has a $22,000 balance. What does this indicate and what action is needed?",
    options: [
      "Bank feed deposits were auto-matched without a proper income account being assigned — each transaction must be reviewed and recoded to the correct income account",
      "The business earned $22,000 in income that is tax-exempt",
      "These are intercompany transfers incorrectly coded to income",
      "QBO uses Uncategorised Income as a default — it has no financial impact"
    ],
    correct_index: 0,
    explanation: "Uncategorised Income builds up when bank deposits are added without proper coding. The balance represents real income that is not correctly classified — affecting management reporting, tax returns, and audit readiness."
  },
  {
    question: "A QBO client's accounts show $6,200 in sales tax liability but they actually collected $5,800. What is the most likely cause?",
    options: [
      "A tax rate change was applied retroactively in QBO, or expenses were incorrectly flagged as taxable, inflating the calculated liability",
      "The bank feed imported $400 of duplicate sales transactions",
      "A customer was invoiced twice and the duplicate is inflating the liability",
      "The cash flow statement and P&L are using different tax methods"
    ],
    correct_index: 0,
    explanation: "If QBO's liability report exceeds what was actually collected, common causes include: retroactive tax rate changes affecting historic invoices, expenses marked as taxable (which shouldn't affect sales tax), or manual overrides on invoices."
  },
  {
    question: "A QBO client pays employees weekly. One employee took a week of unpaid leave. The payroll was processed without adjusting for the absence. What is the correct fix?",
    options: [
      "Void the incorrect payroll run and reprocess with the correct pay — or if the period is closed, post a recovery deduction in the next pay period",
      "Issue a credit note to the employee",
      "Adjust next month's payroll by double-deducting one week",
      "No action — unpaid leave is the employee's choice and doesn't affect payroll"
    ],
    correct_index: 0,
    explanation: "An overpayment due to uncaptured unpaid leave should be corrected by voiding and reprocessing (if possible) or recovering the overpayment in the next payroll run. Documentation of the arrangement with the employee is important."
  },
  {
    question: "A QBO client has a $12,000 directors loan account showing the company owes the director. The director says they've been repaid but the QBO account still shows the balance. What should you do?",
    options: [
      "Trace the bank transaction that repaid the loan and verify it was coded correctly — likely coded to an expense rather than the loan account",
      "Write off the balance to equity",
      "Post a journal entry to close the loan account",
      "Contact the director for a written confirmation and leave the balance"
    ],
    correct_index: 0,
    explanation: "If the director was repaid but the loan account still shows a balance, the bank payment was likely miscoded. Finding the bank transaction and re-coding it to the loan account (not expense) will clear the balance and fix the records."
  },
  {
    question: "A QBO client wants to track which marketing channels generate the most profitable sales. What combination of QBO features best supports this analysis?",
    options: [
      "Classes (one per channel) applied to all income and related COGS/expenses — P&L by Class report shows channel-level gross margin",
      "Custom fields on invoices labelling the channel — exported to Excel for analysis",
      "Tags on bank transactions — filtered in bank reconciliation report",
      "Sub-customers per channel — run AR Ageing filtered by sub-customer"
    ],
    correct_index: 0,
    explanation: "Classes are the correct QBO tool for segmented profitability. Applying a marketing channel class to all related income and direct costs allows a proper P&L by Class showing which channel is most profitable, not just highest revenue."
  },
  {
    question: "A QBO client receives a $5,000 insurance payout for equipment destroyed in a flood. The equipment had a book value of $3,200. How is the transaction recorded?",
    options: [
      "Dr Bank $5,000 / Cr Fixed Asset (remove book value) $3,200 / Cr Gain on Insurance Proceeds $1,800",
      "Dr Bank $5,000 / Cr Insurance Income $5,000",
      "Dr Bank $5,000 / Cr Other Income $5,000 / Dr Equipment Loss $3,200",
      "Offset the $5,000 payout against the replacement equipment cost"
    ],
    correct_index: 0,
    explanation: "The asset is removed from the books at book value ($3,200). The $5,000 insurance receipt minus the $3,200 book value = $1,800 gain on disposal. This is the correct recognition of both the asset removal and the economic gain."
  },
  {
    question: "A QBO client uses percentage-based commissions for sales staff. Where in QBO payroll is commission pay configured?",
    options: [
      "Under Pay Types in the employee's payroll profile — add a Commission pay type; the amount is entered each pay run based on sales achieved",
      "Commissions are entered as vendor payments — sales staff are contractors",
      "Create a recurring expense for each sales employee per month",
      "QBO does not support variable commission pay — use a third-party payroll system"
    ],
    correct_index: 0,
    explanation: "QBO Payroll supports variable pay types including commission. Setting up Commission as a pay type in the employee profile allows variable amounts to be entered each period based on actual sales performance."
  },
  {
    question: "A QBO P&L shows 'Other Expenses' of $45,000 — more than any other expense line. What is the professional concern and the correct action?",
    options: [
      "This suggests miscoding — transactions that belong in specific expense accounts have been posted to a catch-all. Each transaction should be reviewed and recoded to the correct account.",
      "Other Expenses is a standard GAAP category — the balance is not a concern",
      "Move $45,000 to COGS as it's likely production-related",
      "Write off the balance to retained earnings at year-end"
    ],
    correct_index: 0,
    explanation: "A large 'Other Expenses' or 'Miscellaneous' balance is always a red flag. It indicates transactions were coded to a default bucket rather than meaningful categories — producing a P&L that is useless for management analysis or tax purposes."
  }
];

// ─────────────────────────────────────────────────────────────
// QUICKBOOKS L3 — Advisor  (30 questions)
// ─────────────────────────────────────────────────────────────
const QB_L3 = [
  {
    question: "A QBO client has been operating for 5 years with no year-end adjustments. Which three categories of errors are most likely to have accumulated?",
    options: [
      "Depreciation not posted (fixed assets overstated), prepayments not amortised (expenses understated), and unreconciled accruals (liabilities understated)",
      "Duplicate customer invoices, missing vendor bills, and bank feed gaps",
      "Payroll tax underpayments, incorrect inventory counts, and missing receipts",
      "Uncategorised income, duplicate bank transactions, and missing opening balances"
    ],
    correct_index: 0,
    explanation: "Without year-end adjustments, three systemic errors accumulate: (1) assets are overstated as no depreciation reduces them; (2) balance sheet prepayments inflate assets as amortisation was never posted; (3) accrued liabilities are missing, understating the P&L. These three together can materially misstate financial position."
  },
  {
    question: "A QBO advisory client in the SaaS industry recognises revenue when invoices are raised, but their contracts have monthly billing over 12-month commitments. A new customer signs a $36,000 annual contract and is billed $3,000/month. Under ASC 606 / IFRS 15, what is the correct revenue treatment?",
    options: [
      "Recognise $3,000/month as the performance obligation is satisfied monthly — the monthly billing matches the pattern of service delivery",
      "Recognise the full $36,000 when the contract is signed",
      "Defer all $36,000 until the 12-month contract is fulfilled",
      "Recognise revenue only when the final payment is received"
    ],
    correct_index: 0,
    explanation: "Under ASC 606/IFRS 15, revenue is recognised as the performance obligation is satisfied. For continuous SaaS service delivery, $3,000/month correctly matches revenue to the period of service. Billing cycle = performance cycle here, so no deferral is needed."
  },
  {
    question: "A QBO firm client is going through a management buyout (MBO). The target has $2.1M in assets and $1.4M in liabilities. The MBO team is paying $1.2M. What is the implied goodwill and what does the premium indicate?",
    options: [
      "Goodwill = $1.2M − ($2.1M − $1.4M) = $0.5M. The premium above book value reflects intangibles: customer relationships, brand, and recurring revenue not captured in the balance sheet.",
      "Goodwill = $2.1M − $1.2M = $0.9M. The premium reflects overpayment.",
      "No goodwill arises — the business is being sold below asset value",
      "Goodwill = $1.4M − $1.2M = $0.2M. The liabilities determine the premium."
    ],
    correct_index: 0,
    explanation: "Net assets = $2.1M − $1.4M = $700K. Purchase price = $1.2M. Goodwill = $1.2M − $700K = $500K. The $500K premium reflects value not on the balance sheet — typically customer relationships, brand, or contracted recurring revenue."
  },
  {
    question: "A QBO client in retail has been using FIFO inventory costing. A competitor acquisition brings inventory valued at $180,000 under weighted average cost. What is the integration challenge?",
    options: [
      "QBO uses a single inventory costing method per item — the acquired inventory must be revalued to FIFO at the acquisition date; the adjustment affects COGS and the opening balance sheet",
      "Both methods can coexist in QBO — no revaluation is needed",
      "Weighted average and FIFO produce identical results in QBO",
      "The acquired inventory should be expensed immediately on acquisition"
    ],
    correct_index: 0,
    explanation: "QBO applies one costing method per inventory item. Acquired inventory under a different method must be standardised at acquisition. The revaluation is a purchase accounting adjustment that affects the opening balance sheet of the combined entity."
  },
  {
    question: "A QBO client's auditor flags that the accounts receivable balance includes $85,000 of invoices that are over 18 months old with no collection activity. What is the auditor's concern and what accounting response is required?",
    options: [
      "The receivables may be uncollectable — GAAP/IFRS requires an allowance for doubtful accounts or direct write-off. A provision should be raised and the auditor's impairment assessment evidence reviewed.",
      "Receivables over 12 months old are automatically bad debts in QBO",
      "The auditor is raising a format issue — move the old invoices to 'Other Receivables'",
      "No action unless the customers formally notify inability to pay"
    ],
    correct_index: 0,
    explanation: "18 months of no collection activity on $85,000 is a strong indicator of impairment. GAAP requires either the allowance method (provision for doubtful accounts) or direct write-off. Carrying these at face value materially overstates assets."
  },
  {
    question: "A QBO practice client asks you to advise on whether to incorporate their sole proprietorship. What are the primary financial statement and tax implications you should present?",
    options: [
      "Incorporation separates personal and business liability, changes tax treatment from Schedule C (pass-through) to corporate tax, may require payroll for owner-employees, and changes equity presentation from drawings to dividends/retained earnings",
      "Incorporation has no impact on the financial statements — it only affects legal structure",
      "Incorporation always results in a lower tax rate regardless of profit level",
      "The only change is the business name on invoices and QBO reports"
    ],
    correct_index: 0,
    explanation: "Incorporation has broad implications: liability protection, tax rate analysis (corporate vs pass-through), self-employment tax elimination on salary vs distributions, S-corp vs C-corp elections, and complete restructuring of equity accounts in QBO."
  },
  {
    question: "A QBO client's CFO asks for a 13-week cash flow forecast. What QBO data and external inputs are required to build this?",
    options: [
      "AR ageing (timing of debtor collections), AP ageing (vendor payment commitments), payroll schedule, known capex and loan repayments, plus any seasonal revenue adjustments",
      "The QBO P&L for the last 13 weeks, projected forward at the same rate",
      "The QBO balance sheet at today's date — cash flow derives directly from it",
      "Bank statements for the last 13 weeks as a forward proxy"
    ],
    correct_index: 0,
    explanation: "A 13-week cash flow forecast integrates: when debtors will pay (AR ageing timing), when you must pay suppliers (AP ageing and terms), weekly payroll obligations, debt service, and planned capital spending. QBO's ageing reports are the primary data source."
  },
  {
    question: "A QBO client's loan covenant requires maintaining a current ratio above 1.5. Their latest balance sheet shows current assets of $320,000 and current liabilities of $240,000. Are they compliant, and what is the immediate risk if the ratio drops?",
    options: [
      "Current ratio = $320K ÷ $240K = 1.33 — they are BELOW the 1.5 covenant and in technical default, which could trigger immediate loan repayment or increased interest rates",
      "Current ratio = 1.33 — they are compliant, as 1.33 > 1.0",
      "Current ratio = 1.5 — they are exactly at the covenant threshold, which is compliant",
      "Loan covenants only apply to total liabilities, not the current ratio"
    ],
    correct_index: 0,
    explanation: "$320K ÷ $240K = 1.33, which is below the 1.5 covenant. This is a technical default — the lender can demand repayment or impose penalty clauses. The client urgently needs a remediation plan: improve collections, extend payables, or inject equity."
  },
  {
    question: "A QBO client runs a franchise. The franchisor charges a 6% royalty on gross revenue. How should this be structured in QBO for accurate reporting and audit readiness?",
    options: [
      "Set up a dedicated Royalty Expense account; automate a recurring bill to the franchisor each period; tie the calculation to the Revenue account using a formula tracked outside QBO",
      "Include royalties in Cost of Goods Sold with other variable costs",
      "Treat royalties as drawings by the owner — they are profit-sharing",
      "Record royalties annually at year-end as a single lump sum"
    ],
    correct_index: 0,
    explanation: "Franchise royalties are a significant, recurring, contractually mandated expense. A dedicated account ensures visibility and audit traceability. Periodic accrual (not just annual) gives accurate monthly P&L. The calculation basis (% of gross revenue) should be documented and verifiable."
  },
  {
    question: "A QBO client has engaged in related-party transactions where goods were sold to a director-controlled entity at below-market prices. As the accountant, what are your professional obligations?",
    options: [
      "Disclose the transactions and terms in the financial statement notes (IAS 24 / ASC 850); advise the client of transfer pricing risks; document the market-rate evidence; consider whether the underprice constitutes a distribution",
      "No disclosure needed — related-party sales are normal commercial transactions",
      "Adjust the recorded price to market rate without client knowledge",
      "Refuse to prepare the accounts until the pricing is corrected to market rate"
    ],
    correct_index: 0,
    explanation: "Related-party disclosures are mandatory. Below-market pricing to connected entities may have transfer pricing, distribution, or tax implications. The accountant must disclose, document the pricing rationale, and advise on risk — not silently adjust or refuse to act."
  },
  {
    question: "A QBO multi-entity client asks you to identify the best structure for intercompany loans. Entity A lends $200,000 to Entity B at 0% interest. What are the accounting and tax risks?",
    options: [
      "Interest-free loans between related entities may require imputed interest under IAS 39/IFRS 9 or IRC Section 7872 (US); the loan may be reclassified as a dividend or capital contribution by tax authorities",
      "Intercompany loans at 0% are always acceptable — interest is waived between related parties",
      "The only risk is that Entity B may not repay — credit risk only",
      "QBO automatically applies the market interest rate to intercompany loans"
    ],
    correct_index: 0,
    explanation: "Interest-free related-party loans are a red flag for tax authorities. Under US tax law (IRC 7872), below-market loans require imputed interest. Under IFRS, initial recognition at fair value may require a day-one loss or equity contribution. Both present tax and accounting complexity."
  },
  {
    question: "A QBO client's external audit produces a modified (qualified) opinion due to a scope limitation — auditors couldn't verify $40,000 of cash receipts because there were no supporting records. What are the professional and practical consequences?",
    options: [
      "A qualified opinion signals control weaknesses and record-keeping failures to banks, investors, and regulators; it may restrict access to credit and requires immediate implementation of receipt documentation controls",
      "A qualified opinion is routine for SMEs and has no practical consequences",
      "The qualification only affects the prior year — current year is unaffected",
      "The client should switch auditors to obtain an unqualified opinion"
    ],
    correct_index: 0,
    explanation: "A modified audit opinion due to a scope limitation (inability to verify material transactions) damages the credibility of the financial statements with third parties. Banks may withdraw lending, investors may lose confidence, and it signals that internal controls need immediate attention."
  },
  {
    question: "A QBO client is preparing for a Series A funding round. The investors require 3 years of audited GAAP financial statements. The company has been using cash-basis QBO accounting. What is required?",
    options: [
      "Convert all 3 years of records to accrual basis; raise all missing accruals, prepayments, and deferred revenue adjustments; then commission an audit of the restated figures",
      "Provide the cash-basis QBO reports — investors accept either basis",
      "Only the current year needs to be on accrual basis; prior years can remain cash",
      "Request an auditor's special purpose report that validates cash-basis accounts"
    ],
    correct_index: 0,
    explanation: "US GAAP requires accrual accounting. A Series A requires GAAP-compliant audited financials. Cash-basis records must be restated to accrual for all 3 years — a significant engagement requiring systematic identification of all balance sheet items that were never recorded."
  },
  {
    question: "A QBO client's CFO is departing. You discover the CFO had sole access to QBO, approved their own expenses, and had no transaction limits. What is the internal control risk and the recommended remediation?",
    options: [
      "Significant segregation of duties failure — the CFO could post, approve, and pay transactions without oversight. Remediation: implement dual approval for payments, restrict admin access, and conduct a transaction audit of the CFO's activity",
      "This is standard for a small business — single admin access is acceptable",
      "The risk only applies if the CFO was a signatory on the bank account",
      "Implement a new chart of accounts to track CFO expenditure separately"
    ],
    correct_index: 0,
    explanation: "Segregation of duties is a fundamental internal control. One person controlling initiation, approval, and payment is the highest fraud risk scenario. The CFO's exit is the trigger for an access audit, a transaction review, and implementing dual-authorisation controls."
  },
  {
    question: "A QBO client sells both GST/VAT-taxable and GST/VAT-exempt products. How does this affect input tax credit (ITC) claims?",
    options: [
      "ITCs can only be claimed on the taxable portion of the business — expenses attributable to exempt sales cannot be claimed; mixed-use inputs must be apportioned by the ratio of taxable to total supplies",
      "All ITCs can be claimed regardless of exempt sales",
      "Businesses with any exempt sales cannot register for GST/VAT",
      "Input tax on exempt-related purchases is always 50% claimable"
    ],
    correct_index: 0,
    explanation: "Partial exemption rules apply when a business makes both taxable and exempt supplies. Only ITCs on costs used for taxable activities are claimable. Mixed costs (overheads used for both) must be apportioned — typically by revenue ratio. This is a significant compliance area."
  },
  {
    question: "A QBO client has $2.8M in revenue and is approaching the audit threshold for their jurisdiction. What proactive steps should the accountant recommend?",
    options: [
      "Review internal controls and record-keeping quality now; identify accounts that will require most audit evidence (revenue, debtors, inventory); consider engaging auditors for a pre-audit review before the threshold is crossed",
      "Wait until the threshold is crossed — the auditor will identify everything needed",
      "Restructure the business to keep revenue below the threshold",
      "Switch to a simpler accounting system before audit engagement"
    ],
    correct_index: 0,
    explanation: "Proactive audit readiness saves time and cost. The key preparation steps: strengthen internal controls (especially revenue recognition and expense approvals), ensure all accounts are reconciled, and engage auditors early so they understand the business before their first engagement."
  },
  {
    question: "A QBO client acquires real estate for $1.2M. The land component is $400,000 and the building is $800,000. Why must these be separated in QBO?",
    options: [
      "Land is not depreciated — only the building component is. Recording as a single asset and depreciating the full $1.2M would overstate depreciation expense and understate taxable income.",
      "Land and buildings are always reported together under GAAP — no split is needed",
      "Separation is required only for properties over $2M",
      "The split only matters for insurance purposes, not accounting"
    ],
    correct_index: 0,
    explanation: "Land has an indefinite useful life and is not depreciable. Only the building and improvements are depreciated. Failing to split the purchase overstates depreciation, understates profit, and creates a timing difference on tax returns."
  },
  {
    question: "A QBO client's management accounts show strong profitability but the owner is personally liable for a company debt guarantee of $600,000. How should this be disclosed?",
    options: [
      "As a contingent liability in the notes to the financial statements — disclosed by nature and amount; if crystallisation is probable, a provision should be raised instead",
      "It is a personal matter — no disclosure in the company accounts",
      "Deduct the $600,000 from retained earnings immediately as a risk provision",
      "Only disclose if the company cannot repay the debt from its own cash flow"
    ],
    correct_index: 0,
    explanation: "A guarantee given by the owner creates a potential obligation for the company (if the guarantor is called upon). This is a contingent liability requiring note disclosure. If the underlying obligation is likely to crystallise, a provision replaces the note disclosure."
  },
  {
    question: "A QBO client's P&L shows a significant drop in gross margin despite similar revenue. You run a detailed analysis and find that COGS increased 35% while revenue only increased 8%. What are the five structured areas to investigate?",
    options: [
      "Supplier price increases; inventory shrinkage or write-downs; purchase invoice miscodings to COGS; timing of stock deliveries crossing period-end; and changes in product/customer mix toward lower-margin lines",
      "Revenue recognition errors; bank feed delays; employee overtime; tax rate changes; exchange rate movements",
      "Payroll increases; rent increases; depreciation changes; director drawings; finance costs",
      "Customer payment terms; debtor ageing; credit limit changes; invoice disputes; bad debt write-offs"
    ],
    correct_index: 0,
    explanation: "A 35% COGS increase vs 8% revenue growth is a 27-point gap requiring systematic investigation. The five structured areas: supplier pricing, inventory losses, miscoding errors, period-end cut-off issues, and product/customer mix shift. Each has a distinct investigation trail in QBO."
  },
  {
    question: "A QBO advisory client has been offered a government contract worth $800,000/year but it requires the business to maintain an external audit and produce quarterly management accounts. The business currently has no auditor and basic bookkeeping only. What is your advisory plan?",
    options: [
      "Stage the upgrade: (1) move to accrual QBO immediately; (2) engage an auditor for the first year-end; (3) implement quarterly close procedures with P&L, balance sheet, and cash flow; (4) train or hire a competent bookkeeper",
      "The business cannot meet these requirements — advise declining the contract",
      "The contract requirements are standard — no significant changes are needed",
      "Engage the auditor first — they will fix the bookkeeping as part of their work"
    ],
    correct_index: 0,
    explanation: "The contract is achievable but requires structured preparation. The order matters: QBO setup first (foundation), then auditor engagement (they need reliable records), then quarterly close process. Proper bookkeeping resource is the critical enabler — auditors verify, they don't maintain books."
  },
  {
    question: "A QBO client's equity section shows Owner's Equity of $45,000 but they believe the business is worth significantly more. What is the explanation and what additional analysis would you provide?",
    options: [
      "Book value (QBO equity) reflects historical cost minus distributions — it does not capture market value drivers like recurring revenue, customer relationships, or brand. A business valuation requires EBITDA multiples or discounted cash flow analysis.",
      "The business is overvalued — equity on the balance sheet is the definitive value",
      "The difference represents unrealised goodwill that should be added to QBO equity",
      "Book value and market value always converge within 12 months for SMEs"
    ],
    correct_index: 0,
    explanation: "Book equity reflects the accounting equation (assets at cost minus liabilities). Market value includes intangibles not on the balance sheet: customer lifetime value, brand equity, contracted recurring revenue. Explaining this gap to business owners — and providing a proper valuation framework — is core advisory work."
  },
  {
    question: "A QBO client operates in a regulated industry (financial services) and must maintain minimum capital requirements. Their QBO equity is $180,000 against a minimum of $200,000. What are the immediate steps?",
    options: [
      "Urgently advise the client they are in breach of regulatory capital requirements; quantify the shortfall; recommend options: equity injection, profit retention strategy, or asset sale; file any required regulatory notifications",
      "Adjust the QBO chart of accounts to reclassify liabilities as equity to meet the requirement",
      "Wait until year-end — capital requirements are assessed annually",
      "No action needed — the requirement is a guideline, not a legal obligation"
    ],
    correct_index: 0,
    explanation: "Regulatory capital shortfalls are serious legal compliance matters. The accountant's obligation is immediate advisory action — not manipulation of the accounts. Options must be quantified and communicated urgently, and any regulatory disclosure obligations must be identified."
  },
  {
    question: "A QBO client sells the business. Post-sale, the buyer discovers $120,000 of unrecorded liabilities that the previous owner's accountant certified did not exist. What is the professional liability exposure?",
    options: [
      "Significant — if the accountant certified accounts knowing of unrecorded liabilities, this is negligence or fraud. The buyer has a claim against the accountant and the seller; professional indemnity insurance applies.",
      "None — the buyer should have done better due diligence",
      "Limited to the accountant's fee for the engagement only",
      "The liability falls entirely on the seller, not the accountant"
    ],
    correct_index: 0,
    explanation: "Certifying accounts that materially misstate liabilities exposes the accountant to professional negligence claims. Losses flowing from reliance on negligent accounts are recoverable against the accountant. This is why professional indemnity insurance and rigorous liability reviews are essential before certifying any accounts used in a transaction."
  },
  {
    question: "A QBO advisory client wants to expand internationally. They will invoice in EUR and GBP, hold foreign currency bank accounts, and pay local suppliers. What QBO configuration and accounting considerations are critical?",
    options: [
      "Enable multi-currency in QBO Advanced; set up currency bank accounts; establish a policy for exchange rate updates (real-time vs fixed monthly); plan for year-end revaluation of foreign balances; identify transfer pricing and withholding tax obligations",
      "Foreign currency is recorded as USD equivalent — no configuration change is needed",
      "Each foreign currency requires a separate QBO subscription",
      "Foreign exchange gains and losses are not recorded in QBO — only realised gains are taxable"
    ],
    correct_index: 0,
    explanation: "Multi-currency expansion requires: QBO Advanced multi-currency setup, foreign bank accounts, rate policy decisions, and year-end revaluation procedures. Beyond QBO, international expansion triggers transfer pricing, permanent establishment, and withholding tax considerations — all requiring specialist advisory input."
  },
  {
    question: "A QBO client is preparing to take on a private equity (PE) investor. The PE firm requests a Quality of Earnings (QoE) report. What does this entail and what QBO data will they interrogate?",
    options: [
      "A QoE report normalises EBITDA by removing one-off, non-recurring, and owner-specific items to show sustainable earnings. They will interrogate: revenue mix and concentration, gross margin trends by customer/product, owner compensation above market, related-party transactions, and any accounting policy choices that inflate EBITDA.",
      "A QoE report is just a clean audit — it confirms the accounts are accurate",
      "PE firms only review the last 12 months of bank statements, not QBO data",
      "QoE only covers revenue — expense quality is not assessed"
    ],
    correct_index: 0,
    explanation: "Quality of Earnings is a deep financial due diligence exercise. PE firms adjust reported EBITDA for: one-time items (add back), normalisation of owner compensation, revenue sustainability analysis, and any accounting policies that inflate earnings. QBO must produce detailed, clean data for this exercise — poor record-keeping kills deals."
  },
  {
    question: "A QBO client's year-end stock count reveals inventory valued at $85,000 in QBO but physical count shows $62,000. The $23,000 gap is unexplained after matching sales and purchases. What are the three most serious explanations and what is the auditor's concern?",
    options: [
      "Employee theft/pilferage, unrecorded damage or obsolescence write-offs, and cut-off errors in purchase/sales recording — the auditor's concern is that the $23,000 may represent either a control failure (theft) or a systemic record-keeping problem",
      "The physical count was inaccurate — recount is the only action needed",
      "QBO's inventory module calculated average costs incorrectly",
      "Some items were dispatched but not yet invoiced — a normal cut-off difference"
    ],
    correct_index: 0,
    explanation: "An unexplained $23,000 inventory shrinkage (27% of total) is material and alarming. The three serious explanations — theft, write-off failures, and cut-off errors — each have distinct investigation trails. The auditor will look for evidence of controls (stock room access, segregation of duties, movement authorisation). A control failure of this magnitude may require a management letter."
  },
  {
    question: "A QBO client in the non-profit sector applies for grant funding. The grant agreement requires reporting expenditure by designated project categories. What QBO configuration best supports this requirement?",
    options: [
      "Classes (one per grant/project) applied to all expenditure; QBO P&L by Class produces grant-specific expense reports; location tracking can add a geographic dimension if required",
      "Create a separate QBO file for each grant",
      "Use sub-customers to track grant expenditure against income",
      "Export all transactions and sort manually in Excel for each grant report"
    ],
    correct_index: 0,
    explanation: "Non-profit grant reporting requires expenditure to be tracked by designated project/grant category. QBO Classes mapped to each grant allow P&L by Class reports that show exactly what was spent against each grant — the format most funders require."
  },
  {
    question: "A QBO client asks whether they should switch from QuickBooks to a more advanced ERP as they scale to $5M revenue. What are the key decision factors you would evaluate?",
    options: [
      "Transaction volume and processing speed limits; multi-entity and consolidation needs; inventory complexity and manufacturing requirements; integration with industry-specific systems; reporting depth requirements; and total cost of ownership vs QBO",
      "The decision is purely about price — compare QBO Advanced to ERP licensing costs",
      "Switch at $5M regardless — all businesses need ERP at that scale",
      "Stay in QBO until an auditor recommends moving — they will flag when it's needed"
    ],
    correct_index: 0,
    explanation: "ERP migration decisions should be driven by functional gaps, not arbitrary revenue thresholds. Key factors: QBO's transaction limits, consolidation requirements, inventory/manufacturing complexity, integration needs, and reporting requirements that QBO cannot meet. Many businesses successfully scale well beyond $5M in QBO."
  },
  {
    question: "A QBO bookkeeper discovers that a previous year's tax return was filed using incorrect figures from QBO — $18,000 of income was underreported. What is the professional obligation?",
    options: [
      "Advise the client immediately of the error; recommend filing an amended return with the tax authority; document the advice given; if the client refuses to correct it, consider whether continued engagement is appropriate under professional ethics standards",
      "File the current year correctly and absorb the prior year error over future periods",
      "Only correct if the tax authority identifies the error in an audit",
      "No obligation — the bookkeeper is not a tax advisor"
    ],
    correct_index: 0,
    explanation: "Discovering a material misstatement in a filed return creates a professional obligation to advise the client to correct it. Under most professional ethics codes (AAT, ACCA, CPA), failure to advise correction — and continued association with uncorrected errors — is itself an ethical breach."
  },
  {
    question: "A QBO advisory client's business model has shifted from one-time product sales to recurring subscriptions over the past 18 months. Their QBO revenue recognition policy has not been updated. What is the financial statement risk?",
    options: [
      "Under the old policy, annual subscription fees may be fully recognised on invoicing — overstating revenue in the invoice period and understating it in subsequent months, creating misleading P&L comparisons and incorrect tax timing",
      "No risk — revenue recognition policies are set by the tax authority, not the business",
      "The risk is only in the cash flow statement — P&L is unaffected",
      "Subscription revenue and one-time revenue are treated identically under GAAP"
    ],
    correct_index: 0,
    explanation: "Subscription revenue must be recognised over the service period (IFRS 15 / ASC 606). Applying a one-time sales policy to subscriptions front-loads revenue, overstates early-period P&L, creates deferred revenue obligations not on the balance sheet, and produces tax timing errors. The policy must be updated and prior periods may need restatement."
  }
];

// ─────────────────────────────────────────────────────────────
// EXPORT — merge into QUESTION_BANK in test-logic.js
// ─────────────────────────────────────────────────────────────
if (typeof module !== 'undefined') {
  module.exports = { XERO_L2, XERO_L3, QB_L1, QB_L2, QB_L3 };
}

// Browser global
if (typeof window !== 'undefined') {
  window.QUESTION_BANKS = { XERO_L2, XERO_L3, QB_L1, QB_L2, QB_L3 };
}
