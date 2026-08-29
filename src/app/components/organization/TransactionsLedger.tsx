import { useOrgCurrency } from '@/hooks/useOrgCurrency';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService, useServiceArray } from '@/hooks/useService';
import type { Transaction } from '@/services/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { exportTransactions } from '../../../lib/exportUtils';
import {
  Search,
  Filter,
  Download,
  Edit,
  Split,
  CheckSquare,
  X,
  DollarSign,
  History,
  TrendingUp,
  TrendingDown,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { TransactionHistoryModal } from './TransactionHistoryModal';
import { useTheme } from '../../../contexts/ThemeContext';
import { AXIOM } from '../../../styles/axiom-tokens';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

// ── Type adapter ───────────────────────────────────────────────────────────────
// Bridges the NEW Transaction type (debit/credit, categoryId) to the
// shape the existing UI expects (income/expense, category string, scope).
// When a real backend arrives, remove this adapter and update the JSX directly.
function adaptTransaction(
  txn: Transaction,
  categoryMap: Map<string, string>,
  bankMap: Map<string, string>,
) {
  const tags = txn.tags ?? [];
  const scope: 'business' | 'personal' = tags.includes('personal') ? 'personal' : 'business';
  const bankLabel =
    bankMap.get(txn.bankAccountId) ??
    (txn.bankAccountId ? `Account ${String(txn.bankAccountId).slice(-6)}` : '—');
  return {
    ...txn,
    type: txn.type === 'credit' ? ('income' as const) : ('expense' as const),
    category: categoryMap.get(txn.categoryId ?? '') ?? 'Uncategorised',
    scope,
    account: txn.bankAccountId ?? '',
    accountName: bankLabel,
    narration: txn.narration ?? txn.description ?? '',
  };
}

function statusLabel(status: string): string {
  const m: Record<string, string> = {
    pending: 'Pending',
    classified: 'Classified',
    reviewed: 'Reviewed',
    reconciled: 'Reconciled',
  };
  return m[status] ?? status;
}

export function TransactionsLedger() {
  const orgCurrency = useOrgCurrency();
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScope, setFilterScope] = useState<'all' | 'business' | 'personal'>('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountFrom, setAmountFrom] = useState('');
  const [amountTo, setAmountTo] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editNarration, setEditNarration] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkDepartmentId, setBulkDepartmentId] = useState('');

  // ── Service wiring ───────────────────────────────────────────────────────
  const svc = useOrgServices();

  const { data: txnResult, loading: txnLoading, error: txnError } = useService(
    () => svc.transactions.getAll({ pageSize: 500 }),
    [svc.orgId],
    ['transactions'],
  );

  const { data: categories } = useServiceArray(
    () => svc.categories.getAll(),
    [svc.orgId],
    ['categories'],
  );

  const { data: bankAccounts } = useServiceArray(
    () => svc.accounts.getBankAccounts(),
    [svc.orgId],
    ['bankAccounts'],
  );

  const { data: departments } = useServiceArray(
    () => svc.departments.getAll(),
    [svc.orgId],
    ['departments'],
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const bankMap = useMemo(
    () =>
      new Map(
        bankAccounts.map((b) => [
          b.id,
          `${b.bankName} · ${b.accountNumber?.slice(-4) ?? '----'}`,
        ]),
      ),
    [bankAccounts],
  );

  const allTransactions = useMemo(
    () => (txnResult?.items ?? []).map((t) => adaptTransaction(t, categoryMap, bankMap)),
    [txnResult, categoryMap, bankMap],
  );

  /** Names from chart categories plus any labels seen on transactions (empty ledger still has filter options). */
  const categoryList = useMemo(() => {
    const fromSvc = categories.map((c) => c.name);
    const fromTxns = allTransactions.map((t) => t.category);
    return Array.from(new Set([...fromSvc, ...fromTxns]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [allTransactions, categories]);

  useEffect(() => {
    if (categories.length && !bulkCategoryId) {
      setBulkCategoryId(categories[0].id);
    }
  }, [categories, bulkCategoryId]);

  useEffect(() => {
    if (editDialogOpen && selectedTransaction) {
      setEditNarration(String(selectedTransaction.narration ?? ''));
      setEditDepartmentId(selectedTransaction.departmentId ?? '');
    }
  }, [editDialogOpen, selectedTransaction]);

  const filteredTransactions = allTransactions.filter((txn) => {
    const narr = String(txn.narration ?? '').toLowerCase();
    const cat = String(txn.category ?? '').toLowerCase();
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q || narr.includes(q) || cat.includes(q);
    const matchesScope = filterScope === 'all' || txn.scope === filterScope;
    const matchesType = filterType === 'all' || txn.type === filterType;
    const matchesCategory = filterCategory === 'all' || txn.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || txn.status === filterStatus;

    const matchesDateFrom = !dateFrom || new Date(txn.date) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(txn.date) <= new Date(dateTo);

    const af = amountFrom ? Number.parseFloat(amountFrom) : NaN;
    const at = amountTo ? Number.parseFloat(amountTo) : NaN;
    const magnitude = Math.abs(Number(txn.amount));
    const matchesAmountFrom = !amountFrom || (Number.isFinite(af) && magnitude >= af);
    const matchesAmountTo = !amountTo || (Number.isFinite(at) && magnitude <= at);

    return (
      matchesSearch &&
      matchesScope &&
      matchesType &&
      matchesCategory &&
      matchesStatus &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesAmountFrom &&
      matchesAmountTo
    );
  });

  const toggleSelectAll = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map(t => t.id));
    }
  };

  const toggleSelectTransaction = (id: string) => {
    setSelectedTransactions(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleApplyBulkCategory = async () => {
    if (!bulkCategoryId || selectedTransactions.length === 0) {
      toast.error('Choose a category.');
      return;
    }
    const res = await svc.transactions.bulkCategorize(
      selectedTransactions,
      bulkCategoryId,
      'user',
    );
    if (res.success && res.data) {
      toast.success(`Updated ${res.data.succeeded} transaction(s)`);
      setSelectedTransactions([]);
      setBulkEditDialogOpen(false);
    } else {
      toast.error(res.error ?? 'Could not update categories.');
    }
  };

  const handleApplyBulkDepartment = async () => {
    if (selectedTransactions.length === 0) {
      toast.error('Select transactions first.');
      return;
    }
    const results = await Promise.all(
      selectedTransactions.map((id) =>
        svc.transactions.update(id, { departmentId: bulkDepartmentId || undefined }),
      ),
    );
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.length - succeeded;
    if (succeeded > 0) {
      toast.success(`Updated department on ${succeeded} transaction(s)`);
    }
    if (failed > 0) {
      toast.error(`Failed to update ${failed} transaction(s).`);
    }
    setSelectedTransactions([]);
    setBulkEditDialogOpen(false);
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) return;
    if (
      !window.confirm(`Remove ${selectedTransactions.length} transaction(s) from the ledger?`)
    ) {
      return;
    }
    const res = await svc.transactions.bulkDelete(selectedTransactions);
    if (res.success && res.data) {
      toast.success(`Removed ${res.data.succeeded} transaction(s)`);
      setSelectedTransactions([]);
    } else {
      toast.error(res.error ?? 'Could not delete.');
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedTransaction?.id) return;
    const text = editNarration.trim();
    if (!text) {
      toast.error('Description cannot be empty.');
      return;
    }
    const res = await svc.transactions.update(selectedTransaction.id, {
      narration: text,
      description: text.slice(0, 200),
      departmentId: editDepartmentId || undefined,
    });
    if (res.success) {
      toast.success('Transaction updated');
      setEditDialogOpen(false);
    } else {
      toast.error(res.error ?? 'Could not save.');
    }
  };

  const handleEditTransaction = (txn: any) => {
    setSelectedTransaction(txn);
    setEditDialogOpen(true);
  };

  const handleSplitTransaction = () => {
    toast.info('Split is not available in this build. Duplicate the line in Quick Add if you need to break it apart.');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterScope('all');
    setFilterType('all');
    setFilterCategory('all');
    setFilterStatus('all');
    setDateFrom('');
    setDateTo('');
    setAmountFrom('');
    setAmountTo('');
  };

  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const exportCsv = () => {
    try {
      exportTransactions(filteredTransactions);
      toast.success('Export started');
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div
      className="min-h-screen space-y-4 p-4 sm:space-y-6 sm:p-6 md:p-8"
      style={{ background: AXIOM.backgrounds.main }}
    >
      {txnError && (
        <p
          className="rounded-xl border border-amber-500/40 px-4 py-3 text-sm text-amber-100"
          role="alert"
        >
          {txnError}
        </p>
      )}
      {/* Header */}
      <motion.div {...AXIOM.animations.fadeInTop}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div 
              className="p-3 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.purple,
                boxShadow: AXIOM.shadows.iconPurple,
              }}
            >
              <Receipt className="size-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl" style={AXIOM.text.titleStyle}>
                Transactions Ledger
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">All income and expenses in one unified view</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTransactions.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                style={{
                  background: 'rgba(168, 85, 247, 0.3)',
                  border: '1px solid rgba(168, 85, 247, 0.5)',
                  color: '#ffffff',
                }}
                onClick={() => setBulkEditDialogOpen(true)}
              >
                <CheckSquare className="size-4" />
                Bulk Edit ({selectedTransactions.length})
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                color: '#ffffff',
              }}
              onClick={exportCsv}
            >
              <Download className="size-4" />
              Export
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Income</p>
              <p className="text-2xl font-bold text-emerald-400">+{formatCurrency(totalIncome, orgCurrency)}</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.green,
                boxShadow: AXIOM.shadows.iconGreen,
              }}
            >
              <TrendingUp className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Expense</p>
              <p className="text-2xl font-bold text-red-400">-{formatCurrency(totalExpense, orgCurrency)}</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.red,
                boxShadow: AXIOM.shadows.iconRed,
              }}
            >
              <TrendingDown className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Net</p>
              <p className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalIncome - totalExpense >= 0 ? '+' : ''}{formatCurrency(totalIncome - totalExpense, orgCurrency)}
              </p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.cyan,
                boxShadow: AXIOM.shadows.iconCyan,
              }}
            >
              <DollarSign className="size-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="p-6 rounded-2xl"
        style={AXIOM.containers.list}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex-1 min-w-64 relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search narration or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl"
                style={{
                  background: AXIOM.inputs.background,
                  border: AXIOM.inputs.border,
                  color: AXIOM.inputs.color,
                }}
              />
            </div>

            {/* Quick Filters */}
            <select 
              value={filterScope}
              onChange={(e) => setFilterScope(e.target.value as any)}
              className="h-10 px-3 rounded-xl"
              style={{
                background: AXIOM.inputs.background,
                border: AXIOM.inputs.border,
                color: AXIOM.inputs.color,
              }}
            >
              <option value="all">All Scopes</option>
              <option value="business">Business</option>
              <option value="personal">Personal</option>
            </select>

            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="h-10 px-3 rounded-xl"
              style={{
                background: AXIOM.inputs.background,
                border: AXIOM.inputs.border,
                color: AXIOM.inputs.color,
              }}
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-10 px-3 rounded-xl"
              style={{
                background: AXIOM.inputs.background,
                border: AXIOM.inputs.border,
                color: AXIOM.inputs.color,
              }}
            >
              <option value="all">All Categories</option>
              {categoryList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 rounded-xl px-3"
              style={{
                background: AXIOM.inputs.background,
                border: AXIOM.inputs.border,
                color: AXIOM.inputs.color,
              }}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="classified">Classified</option>
              <option value="reviewed">Reviewed</option>
              <option value="reconciled">Reconciled</option>
            </select>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-10 px-4 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{
                background: 'rgba(168, 85, 247, 0.3)',
                border: '1px solid rgba(168, 85, 247, 0.5)',
                color: '#ffffff',
              }}
              onClick={() => setAdvancedFiltersOpen(!advancedFiltersOpen)}
            >
              <Filter className="size-4" />
              Advanced
            </motion.button>
          </div>

          {/* Advanced Filters */}
          {advancedFiltersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-4 border-t grid grid-cols-2 md:grid-cols-5 gap-3"
              style={{ borderColor: 'rgba(148, 163, 184, 0.1)' }}
            >
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: AXIOM.text.slate400 }}>Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                    color: AXIOM.inputs.color,
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: AXIOM.text.slate400 }}>Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                    color: AXIOM.inputs.color,
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: AXIOM.text.slate400 }}>Amount From</label>
                <input
                  type="number"
                  placeholder="0"
                  value={amountFrom}
                  onChange={(e) => setAmountFrom(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                    color: AXIOM.inputs.color,
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: AXIOM.text.slate400 }}>Amount To</label>
                <input
                  type="number"
                  placeholder="999999"
                  value={amountTo}
                  onChange={(e) => setAmountTo(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                    color: AXIOM.inputs.color,
                  }}
                />
              </div>
              <div className="flex items-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full h-10 rounded-xl text-sm font-medium"
                  style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: 'none',
                    color: 'rgba(148, 163, 184, 0.7)',
                  }}
                  onClick={clearFilters}
                >
                  Clear Filters
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Results Info */}
      {(searchTerm ||
        filterScope !== 'all' ||
        filterType !== 'all' ||
        filterCategory !== 'all' ||
        filterStatus !== 'all' ||
        dateFrom ||
        dateTo ||
        amountFrom ||
        amountTo) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={AXIOM.containers.item}
        >
          <p className="text-sm" style={{ color: AXIOM.text.slate300 }}>
            Showing {filteredTransactions.length} of {allTransactions.length} transactions
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="text-sm flex items-center gap-1"
            style={{ color: AXIOM.text.slate400 }}
            onClick={clearFilters}
          >
            <X className="size-4" />
            Clear all
          </motion.button>
        </motion.div>
      )}

      {/* Transactions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl overflow-hidden"
        style={AXIOM.containers.list}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                <th className="px-4 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded"
                    style={{
                      accentColor: '#a855f7',
                    }}
                  />
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium" style={{ color: AXIOM.text.slate400 }}>Date</th>
                <th className="px-4 py-4 text-left text-xs font-medium" style={{ color: AXIOM.text.slate400 }}>Narration</th>
                <th className="px-4 py-4 text-left text-xs font-medium" style={{ color: AXIOM.text.slate400 }}>Category</th>
                <th className="px-4 py-4 text-left text-xs font-medium" style={{ color: AXIOM.text.slate400 }}>Account</th>
                <th className="px-4 py-4 text-left text-xs font-medium" style={{ color: AXIOM.text.slate400 }}>Scope</th>
                <th className="px-4 py-4 text-right text-xs font-medium" style={{ color: AXIOM.text.slate400 }}>Amount</th>
                <th className="px-4 py-4 text-center text-xs font-medium" style={{ color: AXIOM.text.slate400 }}>Status</th>
                <th className="px-4 py-4 text-right text-xs font-medium" style={{ color: AXIOM.text.slate400 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {txnLoading && allTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm" style={{ color: AXIOM.text.slate400 }}>
                    Loading transactions…
                  </td>
                </tr>
              ) : !txnLoading && allTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    <p className="text-base font-medium text-white">No transactions yet</p>
                    <p className="mt-2 text-sm" style={{ color: AXIOM.text.slate400 }}>
                      Use Quick Add or import a statement to add your first entries.
                    </p>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm" style={{ color: AXIOM.text.slate400 }}>
                    No transactions match these filters. Try clearing or widening the date range.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn, idx) => (
                  <motion.tr
                    key={txn.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + idx * 0.02 }}
                    className="group"
                    style={{
                      borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
                      background: selectedTransactions.includes(txn.id) ? 'rgba(168, 85, 247, 0.05)' : 'transparent',
                    }}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(txn.id)}
                        onChange={() => toggleSelectTransaction(txn.id)}
                        className="w-4 h-4 rounded"
                        style={{
                          accentColor: '#a855f7',
                        }}
                      />
                    </td>
                    <td className="px-4 py-4 text-sm" style={{ color: AXIOM.text.slate300 }}>
                      {formatDate(txn.date)}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">{txn.narration}</p>
                        {txn.department && (
                          <p className="text-xs" style={{ color: AXIOM.text.slate400 }}>{txn.department}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm" style={{ color: AXIOM.text.slate300 }}>{txn.category}</td>
                    <td className="px-4 py-4 text-sm" style={{ color: AXIOM.text.slate300 }}>{txn.accountName}</td>
                    <td className="px-4 py-4">
                      <span 
                        className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={txn.scope === 'business' ? AXIOM.badges.cyan : AXIOM.badges.purple}
                      >
                        {txn.scope}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span 
                        className="text-sm font-bold font-mono"
                        style={{ color: txn.type === 'income' ? '#10b981' : '#ef4444' }}
                      >
                        {txn.type === 'income' ? '+' : '-'}
                        {formatCurrency(Math.abs(Number(txn.amount)), txn.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className="rounded-lg px-2 py-1 text-xs font-medium"
                        style={
                          txn.status === 'reconciled'
                            ? AXIOM.badges.success
                            : txn.status === 'reviewed'
                              ? AXIOM.badges.info
                              : txn.status === 'classified'
                                ? AXIOM.badges.cyan
                                : AXIOM.badges.warning
                        }
                      >
                        {statusLabel(txn.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity pointer-fine:lg:opacity-0 pointer-fine:lg:group-hover:opacity-100">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            background: 'rgba(0, 0, 0, 0.2)',
                            color: AXIOM.text.slate400,
                          }}
                          onClick={() => handleEditTransaction(txn)}
                        >
                          <Edit className="size-3" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            background: 'rgba(0, 0, 0, 0.2)',
                            color: AXIOM.text.slate400,
                          }}
                          onClick={handleSplitTransaction}
                        >
                          <Split className="size-3" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            background: 'rgba(0, 0, 0, 0.2)',
                            color: AXIOM.text.slate400,
                          }}
                          onClick={() => {
                            setSelectedTransaction(txn);
                            setHistoryDialogOpen(true);
                          }}
                        >
                          <History className="size-3" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent
          className={
            theme === 'light'
              ? 'max-h-[90vh] overflow-y-auto border-slate-200 bg-white text-slate-900'
              : 'max-h-[90vh] overflow-y-auto border-slate-700 bg-slate-950 text-slate-100'
          }
        >
          <DialogHeader>
            <DialogTitle>Edit description</DialogTitle>
            <DialogDescription className={theme === 'light' ? 'text-slate-600' : 'text-slate-400'}>
              Updates the narration stored on this transaction.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={editNarration}
            onChange={(e) => setEditNarration(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/40"
          />
          <div className="pt-3">
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Department</label>
            <select
              value={editDepartmentId}
              onChange={(e) => setEditDepartmentId(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-600 bg-slate-900/80 px-3 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/40"
            >
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {!departments.length && (
              <p className="mt-1.5 text-xs text-amber-200/90">Add departments under Settings first.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
              onClick={() => void handleSaveEdit()}
            >
              Save
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent
          className={
            theme === 'light'
              ? 'border-slate-200 bg-white text-slate-900'
              : 'border-slate-700 bg-slate-950 text-slate-100'
          }
        >
          <DialogHeader>
            <DialogTitle>Bulk update</DialogTitle>
            <DialogDescription className={theme === 'light' ? 'text-slate-600' : 'text-slate-400'}>
              {selectedTransactions.length} transaction(s) selected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">Category</label>
            <select
              value={bulkCategoryId}
              onChange={(e) => setBulkCategoryId(e.target.value)}
              disabled={!categories.length}
              className="h-11 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 text-sm text-white disabled:opacity-50"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {!categories.length && (
              <p className="text-xs text-amber-200/90">Add categories under Logic &amp; Learning first.</p>
            )}
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
                disabled={!categories.length}
                onClick={() => void handleApplyBulkCategory()}
              >
                Apply category
              </button>
            </div>

            <div className="border-t pt-3" style={{ borderColor: 'rgba(148, 163, 184, 0.1)' }}>
              <label className="text-sm font-medium text-slate-300">Department (optional)</label>
              <select
                value={bulkDepartmentId}
                onChange={(e) => setBulkDepartmentId(e.target.value)}
                disabled={!departments.length}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 text-sm text-white disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {!departments.length && (
                <p className="mt-1.5 text-xs text-amber-200/90">Add departments under Settings first.</p>
              )}
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
                  disabled={!departments.length}
                  onClick={() => void handleApplyBulkDepartment()}
                >
                  Apply department
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:justify-end" style={{ borderColor: 'rgba(148, 163, 184, 0.1)' }}>
              <button
                type="button"
                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40"
                onClick={() => void handleBulkDelete()}
              >
                Delete selected
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {historyDialogOpen && selectedTransaction && (
        <TransactionHistoryModal
          transaction={selectedTransaction}
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
        />
      )}
    </div>
  );
}