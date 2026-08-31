/**
 * Builds the real-data context and system prompt for the AI Assistant chat
 * (`server/routes/organizations.ts`'s `/ai-chat`). Kept separate from that route file — this is
 * data summarization, not request handling — and from `aiProviders.ts` — that file only knows how
 * to call an external provider, not what an organization's transactions mean.
 *
 * Context is built server-side from `store` directly (never from client-supplied numbers), so a
 * client can't spoof its own financial picture and the answer doesn't depend on what's cached in
 * the browser.
 */

import { store } from './store.js';

const RECENT_TRANSACTION_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

const ORG_PRODUCT_GUIDE =
  'Finance OS features available to this organization: Dashboard (overview), Transactions ' +
  '(ledger, import bank statements), Recurring Transactions, Accounts (chart of accounts + bank ' +
  'accounts), Budgets, Loans, Projects, Departments, Assets (depreciation), Inventory, Reports, ' +
  'Team & Permissions (invite members, roles), Payroll (issue payslips), Import (bank statement ' +
  'upload + AI classification), Settings, Integrations (configure your own AI provider key).';

const EMPLOYEE_PRODUCT_GUIDE =
  'Finance OS features available to this employee: Dashboard, My Timesheet (log hours per ' +
  'project), My Expenses (submit and track reimbursement claims), My Payslips (view pay history), ' +
  'My Projects, Company Announcements.';

function money(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

export function buildOrgContext(organizationId: string): string {
  const org = store.organizations.find(o => o.id === organizationId);
  const currency = org?.currency ?? 'USD';

  const allTransactions = store.transactions.filter(t => t.organizationId === organizationId);
  const cutoff = Date.now() - RECENT_TRANSACTION_WINDOW_MS;
  const recent = allTransactions.filter(t => {
    const ts = Date.parse(t.date);
    return !Number.isNaN(ts) && ts >= cutoff;
  });
  // Fall back to all-time data if nothing falls inside the last 90 days (e.g. seed data dated
  // outside that window) — an empty "recent" summary would be misleadingly quiet, not helpful.
  const transactionsForSummary = recent.length > 0 ? recent : allTransactions;

  const categoryTotals = new Map<string, number>();
  for (const t of transactionsForSummary) {
    const cat = t.categoryId ? store.categories.find(c => c.id === t.categoryId) : undefined;
    const label = cat?.name ?? 'Uncategorized';
    const signed = t.type === 'debit' ? -Math.abs(t.amount) : Math.abs(t.amount);
    categoryTotals.set(label, (categoryTotals.get(label) ?? 0) + signed);
  }
  const categoryLines = [...categoryTotals.entries()]
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 10)
    .map(([label, total]) => `  - ${label}: ${money(total, currency)}`)
    .join('\n');

  const accountLines = store.bankAccounts
    .filter(a => a.organizationId === organizationId)
    .map(a => `  - ${a.bankName} (${a.accountType}): ${money(a.balance, a.currency)}`)
    .join('\n');

  const budgetLines = store.budgets
    .filter(b => b.organizationId === organizationId)
    .map(
      b =>
        `  - ${b.name} (${b.period}): spent ${money(b.spentAmount, b.currency)} of ${money(b.budgetedAmount, b.currency)} (${b.status})`,
    )
    .join('\n');

  const loans = store.loans.filter(l => l.organizationId === organizationId);
  const overdueLoans = loans.filter(l => l.status === 'overdue');
  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'partially_paid');
  const overdueLoanLines = overdueLoans
    .map(l => `  - OVERDUE: ${l.party} — ${money(l.amount, l.currency)}`)
    .join('\n');

  const projects = store.projects.filter(p => p.organizationId === organizationId);
  const activeProjects = projects.filter(p => p.status === 'active');
  const projectLines = activeProjects
    .slice(0, 10)
    .map(
      p =>
        `  - ${p.name} (${p.clientName}): quoted ${money(p.quotedAmount, p.currency)}, actual cost ${money(p.actualCost, p.currency)}`,
    )
    .join('\n');

  const members = store.organizationMembers.filter(m => m.organizationId === organizationId);
  const pendingInvites = members.filter(m => m.status === 'pending').length;

  return [
    `Organization: ${org?.name ?? 'Unknown'} (currency: ${currency})`,
    '',
    'Account balances:',
    accountLines || '  (none)',
    '',
    'Transaction categories (net amount, positive = income, negative = expense):',
    categoryLines || '  (no transactions yet)',
    '',
    'Budgets:',
    budgetLines || '  (none set up)',
    '',
    `Loans: ${activeLoans.length} active, ${overdueLoans.length} overdue.`,
    overdueLoanLines,
    '',
    `Projects: ${activeProjects.length} active of ${projects.length} total.`,
    projectLines || '  (none active)',
    '',
    `Team: ${members.length} member(s), ${pendingInvites} pending invite(s).`,
  ]
    .filter(line => line !== '')
    .join('\n');
}

export function buildEmployeeContext(organizationId: string, userId: string): string {
  const timesheets = store.timesheets.filter(
    t => t.organizationId === organizationId && t.userId === userId,
  );
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekHours = timesheets
    .filter(t => {
      const ts = Date.parse(t.date);
      return !Number.isNaN(ts) && ts >= weekAgo;
    })
    .reduce((sum, t) => sum + t.hours, 0);
  const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);

  const expenses = store.expenses.filter(
    e => e.organizationId === organizationId && e.userId === userId,
  );
  const expenseLines = expenses
    .slice(0, 10)
    .map(e => `  - ${e.date}: ${e.description} — ${money(e.amount, e.currency)} (${e.status})`)
    .join('\n');

  const payslips = store.payslips
    .filter(p => p.organizationId === organizationId && p.userId === userId)
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const latest = payslips[0];
  const latestLine = latest
    ? `${latest.period}, net ${money(latest.net, latest.currency)}, issued ${latest.issueDate}, status ${latest.status}`
    : '(none issued yet)';

  return [
    `Your logged hours: ${thisWeekHours.toFixed(1)} this week, ${totalHours.toFixed(1)} total on record.`,
    '',
    `Your expense claims (${expenses.length} total):`,
    expenseLines || '  (none submitted)',
    '',
    `Your most recent payslip: ${latestLine}`,
    `Total payslips on record: ${payslips.length}.`,
  ].join('\n');
}

export function buildSystemPrompt(surface: 'org' | 'employee', context: string): string {
  const guide = surface === 'org' ? ORG_PRODUCT_GUIDE : EMPLOYEE_PRODUCT_GUIDE;
  return [
    'You are the AI Assistant built into Finance OS, a financial-ops platform for agencies and ' +
      'software houses. Have a normal, helpful conversation with the user.',
    '',
    guide,
    '',
    'Here is the current data you have access to:',
    context,
    '',
    'Guidelines:',
    '- When the question is about their own finances/work data, answer using the data above and be specific with numbers.',
    '- When the question is about how to use Finance OS, answer using the feature list above.',
    '- When the question is general finance/accounting knowledge, answer from what you know.',
    "- Only say you don't have enough information when a question needs specific data that isn't listed above — don't invent numbers.",
    '- Keep answers clear and reasonably concise unless the user asks for more detail.',
  ].join('\n');
}
