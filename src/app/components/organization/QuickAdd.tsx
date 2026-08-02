import { useEffect, useMemo, useRef, useState } from 'react';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService, useServiceArray } from '@/hooks/useService';
import type { Category } from '@/services/types';
import { useNotifications } from '@/contexts/NotificationContext';
import { matrixToQuickAddRows, parseSpreadsheetToMatrix } from '@/lib/quickAddBulkImport';
import {
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap,
  FileSpreadsheet,
  ListPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { AXIOM } from '../../../styles/axiom-tokens';

function newBulkRowId(): string {
  return `qar-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function resolveCategoryIdFromSuggestion(
  suggested: string | null,
  incomeOrExpense: 'income' | 'expense',
  categories: Category[],
): string | undefined {
  if (!suggested?.trim()) return undefined;
  const pool = categories.filter((c) => c.type === incomeOrExpense);
  const norm = (s: string) => s.trim().toLowerCase();
  const target = norm(suggested);
  const exact = pool.find((c) => norm(c.name) === target);
  if (exact) return exact.id;
  const partial = pool.find(
    (c) => norm(c.name).includes(target) || target.includes(norm(c.name)),
  );
  return partial?.id;
}

function buildQuickAddMetaTags(params: {
  txnType: 'income' | 'expense';
  counterparty: string;
  currency: string;
  fxRateToPkr: string;
  amount: number;
}): string[] {
  const { txnType, counterparty, currency, fxRateToPkr, amount } = params;
  const out: string[] = [];
  const cp = counterparty.trim().replace(/\|/g, ' ').slice(0, 120);
  if (cp) {
    out.push(txnType === 'income' ? `client:${cp}` : `payee:${cp}`);
  }
  const rate = Number.parseFloat(fxRateToPkr.replace(/,/g, ''));
  if (currency !== 'PKR' && Number.isFinite(rate) && rate > 0) {
    out.push(`fx-to-pkr:${rate}`);
    out.push(`pkr-approx:${Math.round(amount * rate)}`);
  }
  return out;
}

function buildFullNarration(
  narr: string,
  txnType: 'income' | 'expense',
  counterparty: string,
  settlementNotes: string,
  currency: string,
  fxRateToPkr: string,
  amount: number,
): string {
  let text = narr.trim();
  const cp = counterparty.trim();
  if (cp) {
    text += `\n\n${txnType === 'income' ? 'Client or payer' : 'Payee'}: ${cp}`;
  }
  const rate = Number.parseFloat(fxRateToPkr.replace(/,/g, ''));
  if (
    currency !== 'PKR' &&
    Number.isFinite(rate) &&
    rate > 0 &&
    Number.isFinite(amount) &&
    amount > 0
  ) {
    text += `\n\nFX (for your records): 1 ${currency} ≈ ${rate} PKR → about PKR ${Math.round(amount * rate).toLocaleString()} on this amount`;
  }
  const sn = settlementNotes.trim();
  if (sn) {
    text += `\n\nSettlement / routing:\n${sn}`;
  }
  return text.slice(0, 4000);
}

function buildShortDescription(
  narr: string,
  txnType: 'income' | 'expense',
  counterparty: string,
): string {
  const cp = counterparty.trim();
  const head = txnType === 'income' ? 'Income' : 'Expense';
  const base = narr.trim().slice(0, 120);
  if (!cp) return `${head} · ${base}`.slice(0, 200);
  return `${head} · ${cp.slice(0, 40)}${cp.length > 40 ? '…' : ''} · ${base}`.slice(0, 200);
}

export function QuickAdd({
  embedded = false,
  onClose,
}: {
  /** Compact layout for dashboard modal */
  embedded?: boolean;
  /** Called after a successful add (e.g. close modal) */
  onClose?: () => void;
} = {}) {
  const { addNotification } = useNotifications();
  const [entryMode, setEntryMode] = useState<'single' | 'bulk'>('single');
  const [bulkRows, setBulkRows] = useState<
    Array<{ id: string; type: 'income' | 'expense'; amount: string; narration: string }>
  >(() => [
    { id: newBulkRowId(), type: 'expense', amount: '', narration: '' },
    { id: newBulkRowId(), type: 'expense', amount: '', narration: '' },
  ]);
  const sheetInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [scope, setScope] = useState<'business' | 'personal'>('business');
  const [method, setMethod] = useState<'cash' | 'bank' | 'card'>('bank');
  const [currency, setCurrency] = useState('PKR');
  const [account, setAccount] = useState('');
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [lastSavedLine, setLastSavedLine] = useState<string | null>(null);
  const [counterparty, setCounterparty] = useState('');
  const [fxRateToPkr, setFxRateToPkr] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');
  const embeddedCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const svc = useOrgServices();
  const {
    data: bankAccounts,
    loading: accountsLoading,
    error: accountsError,
  } = useServiceArray(() => svc.accounts.getBankAccounts(), [svc.orgId], ['bankAccounts']);

  const { data: categories } = useServiceArray(
    () => svc.categories.getAll(),
    [svc.orgId],
    ['categories'],
  );

  const { data: recentPage, loading: recentLoading, refetch: refetchRecent } = useService(
    () => svc.transactions.getAll({ pageSize: 5, sortBy: 'date', sortOrder: 'desc' }),
    [svc.orgId],
    ['transactions'],
  );
  const recentTransactions = recentPage?.items ?? [];

  const estimatedPkr = useMemo(() => {
    if (currency === 'PKR') return null;
    const amt = Number.parseFloat(amount.replace(/,/g, ''));
    const rate = Number.parseFloat(fxRateToPkr.replace(/,/g, ''));
    if (!Number.isFinite(amt) || amt <= 0 || !Number.isFinite(rate) || rate <= 0) return null;
    return Math.round(amt * rate);
  }, [amount, currency, fxRateToPkr]);

  const selectableAccounts = useMemo(() => {
    if (!bankAccounts.length) return [];
    const byMethod = bankAccounts.filter((acc) => {
      if (method === 'card') return acc.accountType === 'credit_card';
      if (method === 'cash') {
        return acc.accountType === 'cash' || acc.accountType === 'checking' || acc.accountType === 'savings';
      }
      return (
        acc.accountType === 'checking' ||
        acc.accountType === 'savings' ||
        acc.accountType === 'line_of_credit' ||
        acc.accountType === 'online_wallet'
      );
    });
    return byMethod.length > 0 ? byMethod : bankAccounts;
  }, [bankAccounts, method]);

  useEffect(() => {
    if (!selectableAccounts.length) {
      setAccount('');
      return;
    }
    setAccount((prev) =>
      prev && selectableAccounts.some((a) => a.id === prev) ? prev : selectableAccounts[0].id,
    );
  }, [selectableAccounts]);

  useEffect(() => {
    return () => {
      if (embeddedCloseTimerRef.current) {
        clearTimeout(embeddedCloseTimerRef.current);
        embeddedCloseTimerRef.current = null;
      }
    };
  }, []);

  const handleNarrationChange = (value: string) => {
    setLastSavedLine(null);
    setNarration(value);
    
    // Mock AI category suggestion
    if (value.toLowerCase().includes('aws') || value.toLowerCase().includes('hosting')) {
      setSuggestedCategory('Software & Tools');
    } else if (value.toLowerCase().includes('salary') || value.toLowerCase().includes('payroll')) {
      setSuggestedCategory('Salaries & Wages');
    } else if (value.toLowerCase().includes('lunch') || value.toLowerCase().includes('dinner')) {
      setSuggestedCategory('Office Expenses');
    } else if (value.toLowerCase().includes('domain') || value.toLowerCase().includes('godaddy')) {
      setSuggestedCategory('Software & Tools');
    } else if (value.toLowerCase().includes('client') && type === 'income') {
      setSuggestedCategory('Revenue - Services');
    } else {
      setSuggestedCategory(null);
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (txnTypeOverride?: 'income' | 'expense') => {
    const txnType = txnTypeOverride ?? type;
    const narr = narration.trim();
    if (!narr) {
      toast.error('Add a short description for this transaction.');
      return;
    }

    const amt = Number.parseFloat(amount.replace(/,/g, ''));
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Enter a valid amount greater than zero.');
      return;
    }

    if (!account) {
      toast.error('Choose an account. Add a bank account under Accounts if this list is empty.');
      return;
    }

    setSubmitting(true);
    try {
      const categoryId = resolveCategoryIdFromSuggestion(
        suggestedCategory,
        txnType,
        categories,
      );
      const fullNarration = buildFullNarration(
        narr,
        txnType,
        counterparty,
        settlementNotes,
        currency,
        fxRateToPkr,
        amt,
      );
      const metaTags = buildQuickAddMetaTags({
        txnType,
        counterparty,
        currency,
        fxRateToPkr,
        amount: amt,
      });
      const res = await svc.transactions.create({
        bankAccountId: account,
        date: new Date().toISOString().slice(0, 10),
        description: buildShortDescription(narr, txnType, counterparty),
        narration: fullNarration,
        amount: amt,
        currency,
        type: txnType === 'income' ? 'credit' : 'debit',
        status: 'classified',
        tags: [
          scope === 'business' ? 'business' : 'personal',
          'quick-add',
          ...metaTags,
        ],
        attachments: [],
        ...(categoryId ? { categoryId } : {}),
      });

      if (!res.success) {
        toast.error(res.error || 'Could not save the transaction.');
        return;
      }

      toast.success(`${txnType === 'income' ? 'Income' : 'Expense'} saved`, {
        description: `${currency} ${amt.toLocaleString()} — ${narr}`,
      });

      void refetchRecent();
      addNotification({
        title: txnType === 'income' ? 'Income recorded' : 'Expense recorded',
        message: `${currency} ${amt.toLocaleString()} — ${narr.slice(0, 140)}${narr.length > 140 ? '…' : ''}`,
        type: 'success',
        category: 'system',
      });

      const summary = `${currency} ${amt.toLocaleString()} — ${narr.length > 80 ? `${narr.slice(0, 80)}…` : narr}`;
      setAmount('');
      setNarration('');
      setSuggestedCategory(null);
      setCounterparty('');
      setFxRateToPkr('');
      setSettlementNotes('');

      if (embedded) {
        setLastSavedLine(`Last saved · ${txnType === 'income' ? 'Income' : 'Expense'} · ${summary}`);
        if (embeddedCloseTimerRef.current) clearTimeout(embeddedCloseTimerRef.current);
        embeddedCloseTimerRef.current = setTimeout(() => {
          embeddedCloseTimerRef.current = null;
          onClose?.();
        }, 1200);
      } else {
        setLastSavedLine(null);
        onClose?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkSave = async () => {
    if (!account) {
      toast.error('Choose an account.');
      return;
    }
    const lines = bulkRows.filter((r) => {
      const amt = Number.parseFloat(r.amount.replace(/,/g, ''));
      return r.narration.trim() && Number.isFinite(amt) && amt > 0;
    });
    if (!lines.length) {
      toast.error('Add at least one line with amount and description.');
      return;
    }
    if (lines.length > 50) {
      toast.error('Save up to 50 lines at a time.');
      return;
    }

    setSubmitting(true);
    let saved = 0;
    try {
      for (const row of lines) {
        const amt = Number.parseFloat(row.amount.replace(/,/g, ''));
        const narr = row.narration.trim();
        const txnType = row.type;
        const categoryId = resolveCategoryIdFromSuggestion(null, txnType, categories);
        const res = await svc.transactions.create({
          bankAccountId: account,
          date: new Date().toISOString().slice(0, 10),
          description: narr.slice(0, 200),
          narration: narr,
          amount: amt,
          currency,
          type: txnType === 'income' ? 'credit' : 'debit',
          status: 'classified',
          tags: [scope === 'business' ? 'business' : 'personal', 'quick-add', 'bulk'],
          attachments: [],
          ...(categoryId ? { categoryId } : {}),
        });
        if (res.success) saved += 1;
      }
      if (saved === 0) {
        toast.error('Could not save transactions.');
        return;
      }
      toast.success(`${saved} transaction${saved === 1 ? '' : 's'} saved`);
      void refetchRecent();
      addNotification({
        title: `${saved} transaction${saved === 1 ? '' : 's'} recorded`,
        message: `Quick Add bulk · posted to your ledger`,
        type: 'success',
        category: 'system',
      });
      setBulkRows([
        { id: newBulkRowId(), type: 'expense', amount: '', narration: '' },
        { id: newBulkRowId(), type: 'expense', amount: '', narration: '' },
      ]);
      if (embedded) {
        setLastSavedLine(`Last saved · ${saved} line${saved === 1 ? '' : 's'} · bulk`);
        if (embeddedCloseTimerRef.current) clearTimeout(embeddedCloseTimerRef.current);
        embeddedCloseTimerRef.current = setTimeout(() => {
          embeddedCloseTimerRef.current = null;
          onClose?.();
        }, 1200);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSpreadsheetFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const matrix = await parseSpreadsheetToMatrix(file);
      const parsed = matrixToQuickAddRows(matrix);
      if (!parsed.length) {
        toast.error('No valid rows. Use a header row: Type, Amount, Narration (or three columns without a header).');
        return;
      }
      setEntryMode('bulk');
      setBulkRows(
        parsed.map((r) => ({
          id: newBulkRowId(),
          type: r.type,
          amount: String(r.amount),
          narration: r.narration,
        })),
      );
      if (parsed[0].currency) setCurrency(parsed[0].currency);
      toast.success(`Loaded ${parsed.length} row(s) from ${file.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read file');
    }
  };

  return (
    <div
      className={
        embedded
          ? 'min-w-0 space-y-3 sm:space-y-4'
          : 'min-h-screen min-w-0 space-y-4 p-4 sm:p-6 md:p-8 sm:space-y-6'
      }
      style={embedded ? undefined : { background: AXIOM.backgrounds.main }}
    >
      {/* Header with AXIOM Gradient */}
      {!embedded && (
        <motion.div {...AXIOM.animations.fadeInTop}>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="p-3 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.cyan,
                boxShadow: AXIOM.shadows.iconCyan,
              }}
            >
              <Zap className="size-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl" style={AXIOM.text.titleStyle}>
              Quick Add
            </h1>
          </div>
          <p className="text-slate-400 text-xs">Fast entry for income and expenses</p>
        </motion.div>
      )}

      <div
        className={
          embedded
            ? 'grid min-w-0 grid-cols-1 gap-3 sm:gap-4'
            : 'grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6'
        }
      >
        {/* Main Form - AXIOM Style */}
        <motion.div
          className={embedded ? '' : 'lg:col-span-2'}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div
            className="min-w-0 rounded-2xl p-4 sm:rounded-3xl sm:p-6 md:p-8"
            style={AXIOM.containers.list}
          >
            <div className="mb-5 flex min-w-0 flex-col gap-4 sm:mb-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12"
                  style={{
                    background: AXIOM.iconBoxes.purple,
                    boxShadow: AXIOM.shadows.iconPurple,
                  }}
                >
                  <DollarSign className="size-5 text-white sm:size-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white sm:text-xl md:text-2xl">Transaction Details</h2>
                  <p className="text-slate-400 text-xs sm:text-sm">Enter income or expense</p>
                </div>
              </div>
              <div className="flex w-full min-w-0 flex-col gap-2 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:max-w-[min(100%,28rem)]">
                <div
                  className="flex w-full shrink-0 rounded-lg gap-0.5 p-0.5 sm:w-auto"
                  style={{ background: 'rgba(0,0,0,0.25)', border: AXIOM.inputs.border }}
                  role="group"
                  aria-label="Entry mode"
                >
                  <button
                    type="button"
                    onClick={() => setEntryMode('single')}
                    className="min-h-10 flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:flex-none sm:px-3"
                    style={
                      entryMode === 'single'
                        ? { background: 'rgba(168, 85, 247, 0.35)', color: '#fff' }
                        : { color: 'rgba(148, 163, 184, 0.85)' }
                    }
                  >
                    One entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode('bulk')}
                    className="min-h-10 flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors sm:flex-none sm:px-3"
                    style={
                      entryMode === 'bulk'
                        ? { background: 'rgba(168, 85, 247, 0.35)', color: '#fff' }
                        : { color: 'rgba(148, 163, 184, 0.85)' }
                    }
                  >
                    Bulk add
                  </button>
                </div>
                {entryMode === 'single' && (
                  <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
                    <motion.button
                      {...AXIOM.animations.hoverScale}
                      type="button"
                      disabled={submitting}
                      aria-label={
                        type === 'expense'
                          ? 'Save as expense (same as Add Expense below)'
                          : 'Switch to expense'
                      }
                      title={
                        type === 'expense'
                          ? 'Click again to save (or use Add Expense below)'
                          : 'Switch to expense'
                      }
                      onClick={() => {
                        setLastSavedLine(null);
                        if (type === 'expense') {
                          void handleSubmit('expense');
                        } else {
                          setType('expense');
                        }
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                      style={type === 'expense' ? AXIOM.buttons.danger : AXIOM.buttons.outline}
                    >
                      <TrendingDown className="size-4" />
                      Expense
                    </motion.button>
                    <motion.button
                      {...AXIOM.animations.hoverScale}
                      type="button"
                      disabled={submitting}
                      aria-label={
                        type === 'income'
                          ? 'Save as income (same as Add Income below)'
                          : 'Switch to income'
                      }
                      title={
                        type === 'income'
                          ? 'Click again to save (or use Add Income below)'
                          : 'Switch to income'
                      }
                      onClick={() => {
                        setLastSavedLine(null);
                        if (type === 'income') {
                          void handleSubmit('income');
                        } else {
                          setType('income');
                        }
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                      style={type === 'income' ? AXIOM.buttons.success : AXIOM.buttons.outline}
                    >
                      <TrendingUp className="size-4" />
                      Income
                    </motion.button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              {accountsError && (
                <p className="text-sm text-amber-200/90 font-mono border border-amber-500/30 rounded-xl px-3 py-2" role="alert">
                  {accountsError}
                </p>
              )}
              {accountsLoading && bankAccounts.length === 0 && (
                <p className="text-xs text-slate-500 font-mono" aria-live="polite">
                  Loading accounts…
                </p>
              )}
              {!accountsLoading && bankAccounts.length === 0 && (
                <p className="text-sm text-slate-400 border border-dashed border-slate-600 rounded-xl px-3 py-2">
                  No bank accounts yet. Add one under Accounts so Quick Add can post to a wallet.
                </p>
              )}

              {/* Amount + narration — single */}
              {entryMode === 'single' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: AXIOM.text.slate300 }}>
                      {type === 'income' ? 'Client or payer' : 'Payee (vendor or person)'}
                    </label>
                    <input
                      type="text"
                      placeholder={type === 'income' ? 'e.g. Acme Studio' : 'e.g. contractor name'}
                      value={counterparty}
                      onChange={(e) => {
                        setLastSavedLine(null);
                        setCounterparty(e.target.value);
                      }}
                      className="w-full h-12 px-4 rounded-xl"
                      style={{
                        background: AXIOM.inputs.background,
                        border: AXIOM.inputs.border,
                        color: AXIOM.inputs.color,
                      }}
                    />
                    <p className="text-xs text-slate-500">
                      {type === 'income'
                        ? 'Which client or company this payment is from.'
                        : 'Who receives this payment (matches USD expert payouts, tools, etc.).'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: AXIOM.text.slate300 }}>Amount</label>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="h-12 w-full shrink-0 rounded-xl px-4 font-medium sm:w-auto sm:min-w-[5.75rem]"
                        style={{
                          background: AXIOM.inputs.background,
                          border: AXIOM.inputs.border,
                          color: AXIOM.inputs.color,
                        }}
                      >
                        <option value="PKR">PKR</option>
                        <option value="USD">USD</option>
                        <option value="AED">AED</option>
                      </select>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => {
                          setLastSavedLine(null);
                          setAmount(e.target.value);
                        }}
                        className="h-12 min-w-0 flex-1 rounded-xl px-3 text-xl font-bold sm:px-4 sm:text-2xl"
                        style={{
                          background: AXIOM.inputs.background,
                          border: AXIOM.inputs.border,
                          color: AXIOM.inputs.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium" style={{ color: AXIOM.text.slate300 }}>Narration / Description</label>
                      {suggestedCategory && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1"
                        >
                          <Sparkles className="size-3 text-cyan-400" />
                          <span className="text-xs text-cyan-400 font-medium">AI Suggestion</span>
                        </motion.div>
                      )}
                    </div>
                    <textarea
                      placeholder="e.g., AWS hosting services, Client payment for website, Team lunch..."
                      value={narration}
                      onChange={(e) => handleNarrationChange(e.target.value)}
                      className="w-full min-h-24 px-4 py-3 rounded-xl"
                      style={{
                        background: AXIOM.inputs.background,
                        border: AXIOM.inputs.border,
                        color: AXIOM.inputs.color,
                      }}
                    />
                    {suggestedCategory && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-block px-3 py-1 rounded-lg text-xs font-medium"
                        style={AXIOM.badges.cyan}
                      >
                        Suggested: {suggestedCategory}
                      </motion.div>
                    )}
                  </div>

                  {currency !== 'PKR' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium" style={{ color: AXIOM.text.slate300 }}>
                        PKR rate (optional)
                      </label>
                      <p className="text-xs text-slate-500">
                        How many PKR for 1 {currency}, for reporting when the bank converts later or when you move from a wallet (e.g. Pioneer) to your local account. This does not change the amount posted above.
                      </p>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 278.5"
                        value={fxRateToPkr}
                        onChange={(e) => {
                          setLastSavedLine(null);
                          setFxRateToPkr(e.target.value);
                        }}
                        className="w-full max-w-xs h-12 px-4 rounded-xl"
                        style={{
                          background: AXIOM.inputs.background,
                          border: AXIOM.inputs.border,
                          color: AXIOM.inputs.color,
                        }}
                      />
                      {estimatedPkr != null && (
                        <p className="text-sm text-slate-300" aria-live="polite">
                          About PKR {estimatedPkr.toLocaleString()} at this rate
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: AXIOM.text.slate300 }}>
                      Settlement / routing (optional)
                    </label>
                    <p className="text-xs text-slate-500">
                      Use this when money lands in one place first and moves later—for example Pioneer first, then your local bank days after—or paying experts in USD from Pioneer.
                    </p>
                    <textarea
                      placeholder="e.g. USD received in Pioneer on Mar 1; transfer to HBL when rate improves."
                      value={settlementNotes}
                      onChange={(e) => {
                        setLastSavedLine(null);
                        setSettlementNotes(e.target.value);
                      }}
                      className="w-full min-h-[4.5rem] px-4 py-3 rounded-xl text-sm"
                      style={{
                        background: AXIOM.inputs.background,
                        border: AXIOM.inputs.border,
                        color: AXIOM.inputs.color,
                      }}
                    />
                  </div>
                </>
              )}

              {/* Bulk lines + spreadsheet */}
              {entryMode === 'bulk' && (
                <div className="space-y-3">
                  <input
                    ref={sheetInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => void handleSpreadsheetFile(e)}
                  />
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: AXIOM.text.slate300 }}>
                        Lines
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                        Import CSV or Excel with columns: Type, Amount, Narration (optional: Currency). Or add rows below.
                      </p>
                    </div>
                    <div className="flex min-w-0 w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => sheetInputRef.current?.click()}
                        disabled={submitting}
                        className="flex w-full touch-manipulation items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium disabled:opacity-50 sm:w-auto"
                        style={AXIOM.buttons.outline}
                      >
                        <FileSpreadsheet className="size-4 shrink-0" />
                        Import sheet
                      </motion.button>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (bulkRows.length >= 50) {
                            toast.error('Maximum 50 lines per batch.');
                            return;
                          }
                          setBulkRows((prev) => [
                            ...prev,
                            { id: newBulkRowId(), type: 'expense', amount: '', narration: '' },
                          ]);
                        }}
                        disabled={submitting || bulkRows.length >= 50}
                        className="flex w-full touch-manipulation items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium disabled:opacity-50 sm:w-auto"
                        style={AXIOM.buttons.outline}
                      >
                        <ListPlus className="size-4 shrink-0" />
                        Add line
                      </motion.button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {bulkRows.map((row) => (
                      <div
                        key={row.id}
                        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 rounded-xl p-3"
                        style={{ background: 'rgba(0,0,0,0.2)', border: AXIOM.inputs.border }}
                      >
                        <select
                          value={row.type}
                          onChange={(e) => {
                            const v = e.target.value === 'income' ? 'income' : 'expense';
                            setBulkRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, type: v } : r)),
                            );
                          }}
                          className="h-10 px-2 rounded-lg text-sm shrink-0 sm:w-28"
                          style={{
                            background: AXIOM.inputs.background,
                            border: AXIOM.inputs.border,
                            color: AXIOM.inputs.color,
                          }}
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Amount"
                          value={row.amount}
                          onChange={(e) =>
                            setBulkRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, amount: e.target.value } : r)),
                            )
                          }
                          className="h-10 px-3 rounded-lg text-sm sm:w-28"
                          style={{
                            background: AXIOM.inputs.background,
                            border: AXIOM.inputs.border,
                            color: AXIOM.inputs.color,
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Description"
                          value={row.narration}
                          onChange={(e) =>
                            setBulkRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, narration: e.target.value } : r)),
                            )
                          }
                          className="h-10 px-3 rounded-lg text-sm flex-1 min-w-0"
                          style={{
                            background: AXIOM.inputs.background,
                            border: AXIOM.inputs.border,
                            color: AXIOM.inputs.color,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (bulkRows.length <= 1) return;
                            setBulkRows((prev) => prev.filter((r) => r.id !== row.id));
                          }}
                          disabled={bulkRows.length <= 1}
                          className="h-10 px-2 rounded-lg text-slate-400 hover:text-white text-sm disabled:opacity-30 shrink-0"
                          aria-label="Remove line"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" style={{ color: AXIOM.text.slate300 }}>Currency (all lines)</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="h-12 px-4 rounded-xl font-medium max-w-xs"
                      style={{
                        background: AXIOM.inputs.background,
                        border: AXIOM.inputs.border,
                        color: AXIOM.inputs.color,
                      }}
                    >
                      <option value="PKR">PKR</option>
                      <option value="USD">USD</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Scope */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: AXIOM.text.slate300 }}>Scope</label>
                <div className="flex min-w-0 gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setScope('business')}
                    className="touch-manipulation flex-1 rounded-xl px-3 py-2.5 text-sm font-medium sm:px-4 sm:py-3"
                    style={scope === 'business' ? {
                      background: 'rgba(168, 85, 247, 0.3)',
                      border: '1px solid rgba(168, 85, 247, 0.5)',
                      color: '#ffffff',
                    } : {
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: 'none',
                      color: 'rgba(148, 163, 184, 0.7)',
                    }}
                  >
                    Business
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setScope('personal')}
                    className="touch-manipulation flex-1 rounded-xl px-3 py-2.5 text-sm font-medium sm:px-4 sm:py-3"
                    style={scope === 'personal' ? {
                      background: 'rgba(168, 85, 247, 0.3)',
                      border: '1px solid rgba(168, 85, 247, 0.5)',
                      color: '#ffffff',
                    } : {
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: 'none',
                      color: 'rgba(148, 163, 184, 0.7)',
                    }}
                  >
                    Personal
                  </motion.button>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: AXIOM.text.slate300 }}>Payment Method</label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {(['cash', 'bank', 'card'] as const).map((m) => (
                    <motion.button
                      key={m}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setMethod(m)}
                      className="touch-manipulation rounded-xl px-2 py-2.5 text-xs font-medium sm:px-4 sm:py-3 sm:text-sm"
                      style={method === m ? {
                        background: 'rgba(168, 85, 247, 0.3)',
                        border: '1px solid rgba(168, 85, 247, 0.5)',
                        color: '#ffffff',
                      } : {
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: 'none',
                        color: 'rgba(148, 163, 184, 0.7)',
                      }}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Account Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: AXIOM.text.slate300 }}>
                  {entryMode === 'single' && type === 'income'
                    ? 'Deposit to account'
                    : entryMode === 'single' && type === 'expense'
                      ? 'Pay from account'
                      : 'Account'}
                </label>
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  disabled={!selectableAccounts.length || accountsLoading}
                  className="w-full h-12 px-4 rounded-xl disabled:opacity-50"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                    color: AXIOM.inputs.color,
                  }}
                >
                  <option value="">Select account…</option>
                  {selectableAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} · {acc.accountNumber?.slice(-4) ?? '----'} ({acc.currency})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  {entryMode === 'single' && type === 'income'
                    ? 'Where this payment is recorded (e.g. Pioneer wallet or local bank). A second transfer can be a separate entry when it moves.'
                    : entryMode === 'single' && type === 'expense'
                      ? 'Wallet or card this payment leaves from.'
                      : method === 'card'
                        ? 'Credit card accounts'
                        : method === 'cash'
                          ? 'Checking or savings (cash-style entry)'
                          : 'Bank / operating accounts'}
                </p>
              </div>

              {/* Submit */}
              <motion.button
                {...AXIOM.animations.hoverScaleSmall}
                type="button"
                className="mt-6 flex h-14 w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold sm:text-base disabled:opacity-50"
                onClick={() =>
                  entryMode === 'bulk' ? void handleBulkSave() : void handleSubmit()
                }
                disabled={submitting || accountsLoading || !selectableAccounts.length || !account}
                style={AXIOM.buttons.action}
              >
                <Plus className="size-5" />
                {submitting
                  ? 'Saving…'
                  : entryMode === 'bulk'
                    ? 'Save all lines'
                    : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
              </motion.button>
              {embedded && lastSavedLine && (
                <p
                  className="mt-3 break-words rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 font-mono text-xs text-emerald-200/90"
                  aria-live="polite"
                >
                  {lastSavedLine}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Sidebar — hidden in dashboard modal */}
        {!embedded && (
        <div className="min-w-0 space-y-6">
          {/* Recent Transactions - AXIOM Style */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="min-w-0 rounded-2xl p-4 sm:rounded-3xl sm:p-6"
            style={AXIOM.containers.list}
          >
            <h3 className="mb-3 text-base font-bold text-white sm:mb-4 sm:text-lg">Recent entries</h3>
            <div className="space-y-2">
              {recentLoading && recentTransactions.length === 0 && (
                <p className="text-xs text-slate-500 font-mono" aria-live="polite">
                  Loading…
                </p>
              )}
              {!recentLoading && recentTransactions.length === 0 && (
                <p className="text-sm text-slate-500">No transactions yet. Saved Quick Add rows appear here.</p>
              )}
              {recentTransactions.map((txn, idx) => {
                const isIncome = txn.type === 'credit';
                return (
                  <motion.div
                    key={txn.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    className="p-3 rounded-xl"
                    style={AXIOM.containers.item}
                  >
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <p className="line-clamp-2 min-w-0 break-words text-sm font-medium text-white">{txn.narration}</p>
                      <div
                        className="px-2 py-1 rounded text-xs font-bold shrink-0"
                        style={isIncome ? AXIOM.badges.success : AXIOM.badges.danger}
                      >
                        {isIncome ? '+' : '−'}
                        {txn.currency} {Math.abs(txn.amount).toLocaleString()}
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: AXIOM.text.slate400 }}>
                      {txn.date} · {(txn.tags ?? []).includes('quick-add') ? 'Quick add' : txn.status}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Pro Tips - AXIOM Style */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative min-w-0 overflow-hidden rounded-2xl p-4 sm:rounded-3xl sm:p-6"
            style={AXIOM.containers.chartCyan}
          >
            <div 
              className="absolute inset-0"
              style={{ background: AXIOM.radialOverlays.cyan }}
            />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="size-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Pro Tips</h3>
              </div>
              <div className="space-y-2 text-sm" style={{ color: AXIOM.text.slate300 }}>
                <p className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>Be descriptive in narration for better AI categorization</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>The system learns from your corrections</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>Date/time is auto-filled if not specified</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>Cash withdrawals auto-update Cash in Hand</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
        )}
      </div>
    </div>
  );
}