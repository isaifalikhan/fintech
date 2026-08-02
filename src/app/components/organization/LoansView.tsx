import { useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { Landmark, TrendingUp, TrendingDown, DollarSign, Wallet, Clock, AlertCircle, CheckCircle, FileText, ArrowUpRight, ArrowDownRight, Search, Edit, Trash2, Plus, Download, PieChart as PieChartIcon, Loader2 } from 'lucide-react';
import { BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { AXIOM } from '../../../styles/axiom-tokens';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useServiceArray, useMutation } from '@/hooks/useService';
import type { Loan, LoanRecordStatus } from '@/services/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

type LoanView = 'overview' | 'to-receive' | 'to-pay' | 'analytics';

const paymentScheduleData = [
  { month: 'Feb', scheduled: 35416, paid: 0 },
  { month: 'Mar', scheduled: 53416, paid: 0 },
  { month: 'Apr', scheduled: 71291, paid: 0 },
  { month: 'May', scheduled: 25000, paid: 0 },
  { month: 'Jun', scheduled: 35416, paid: 0 },
  { month: 'Jul', scheduled: 25000, paid: 0 },
];

const COLORS = {
  purple: '#a855f7',
  cyan: '#06b6d4',
  pink: '#ec4899',
  green: '#10b981',
  amber: '#f59e0b',
  blue: '#3b82f6',
  red: '#ef4444',
  orange: '#f97316'
};

const defaultForm = () => ({
  type: 'to_pay' as Loan['type'],
  party: '',
  description: '',
  principal: '',
  currency: 'USD',
  dueDate: '',
  startDate: '',
  interestRate: '',
  status: 'pending' as LoanRecordStatus,
});

export function LoansView() {
  const svc = useOrgServices();
  const { data: loans, loading, error } = useServiceArray(
    () => svc.loans.getAll(),
    [svc.orgId],
    ['loans'],
  );

  const createLoan = useMutation((payload: Omit<Loan, 'id' | 'organizationId'>) => svc.loans.create(payload));
  const updateLoan = useMutation((args: { id: string; updates: Partial<Loan> }) =>
    svc.loans.update(args.id, args.updates));
  const deleteLoan = useMutation((id: string) => svc.loans.delete(id));

  const [activeView, setActiveView] = useState<LoanView>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(() => defaultForm());

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(defaultForm());
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((loan: Loan) => {
    setEditingId(loan.id);
    setForm({
      type: loan.type,
      party: loan.party,
      description: loan.description,
      principal: String(loan.principal),
      currency: loan.currency,
      dueDate: loan.dueDate,
      startDate: loan.startDate ?? '',
      interestRate: loan.interestRate != null ? String(loan.interestRate) : '',
      status: loan.status,
    });
    setFormOpen(true);
  }, []);

  const loanTypeData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; count: number }>();
    for (const l of loans) {
      const key = (l.description || 'Other').trim() || 'Other';
      const cur = map.get(key) ?? { name: key, value: 0, count: 0 };
      cur.value += l.principal;
      cur.count += 1;
      map.set(key, cur);
    }
    const rows = Array.from(map.values());
    return rows.length ? rows : [{ name: 'No loans yet', value: 1, count: 0 }];
  }, [loans]);

  const submitForm = async () => {
    const principal = Number(form.principal);
    if (!Number.isFinite(principal) || principal <= 0) {
      toast.error('Enter a valid principal amount.');
      return;
    }

    if (editingId) {
      const updates: Partial<Loan> = {
        type: form.type,
        party: form.party.trim(),
        description: form.description.trim() || 'Loan',
        principal,
        amount: principal,
        currency: form.currency.trim() || 'USD',
        dueDate: form.dueDate.trim(),
        status: form.status,
      };
      if (form.startDate.trim()) updates.startDate = form.startDate.trim();
      if (form.interestRate.trim() !== '') updates.interestRate = Number(form.interestRate);

      const res = await updateLoan.execute({ id: editingId, updates });
      if (res.success) {
        toast.success(res.message || 'Loan updated');
        setFormOpen(false);
      } else toast.error(res.error || 'Could not update loan');
    } else {
      const payload: Omit<Loan, 'id' | 'organizationId'> = {
        type: form.type,
        party: form.party.trim(),
        description: form.description.trim() || 'Loan',
        principal,
        amount: principal,
        currency: form.currency.trim() || 'USD',
        dueDate: form.dueDate.trim(),
        startDate: form.startDate.trim() || undefined,
        status: form.status,
        interestRate: form.interestRate.trim() === '' ? undefined : Number(form.interestRate),
        amountPaid: 0,
        remainingBalance: principal,
      };
      const res = await createLoan.execute(payload);
      if (res.success) {
        toast.success(res.message || 'Loan added');
        setFormOpen(false);
      } else toast.error(res.error || 'Could not add loan');
    }
  };

  const handleDelete = async (loan: Loan) => {
    if (!window.confirm(`Remove "${loan.party}" from the list?`)) return;
    const res = await deleteLoan.execute(loan.id);
    if (res.success) toast.success(res.message || 'Removed');
    else toast.error(res.error || 'Could not remove');
  };

  const loansToReceive = loans.filter(l => l.type === 'to_receive');
  const loansToPay = loans.filter(l => l.type === 'to_pay');

  // Calculations
  const totalToReceive = loansToReceive.reduce((sum, loan) => sum + (loan.remainingBalance || loan.amount), 0);
  const totalToPay = loansToPay.reduce((sum, loan) => sum + (loan.remainingBalance || loan.amount), 0);
  const netPosition = totalToReceive - totalToPay;
  const totalInterestReceivable = loansToReceive.reduce((sum, loan) => sum + (loan.totalInterest || 0), 0);
  const totalInterestPayable = loansToPay.reduce((sum, loan) => sum + (loan.totalInterest || 0), 0);
  const interestTotal = totalInterestReceivable + totalInterestPayable;
  
  const overdueLoans = loans.filter(l => l.status === 'overdue');

  const getStatusBadge = (status: string) => {
    const styles: Record<string, any> = {
      active: AXIOM.badges.success,
      pending: AXIOM.badges.warning,
      overdue: AXIOM.badges.danger,
      partially_paid: AXIOM.badges.info,
      paid: AXIOM.badges.success,
      defaulted: AXIOM.badges.danger,
    };
    return styles[status] || AXIOM.badges.info;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'paid':
        return <CheckCircle className="size-4" />;
      case 'overdue':
      case 'defaulted':
        return <AlertCircle className="size-4" />;
      case 'pending':
        return <Clock className="size-4" />;
      default:
        return <FileText className="size-4" />;
    }
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.party.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         loan.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || loan.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const viewButtons = [
    { id: 'overview' as const, label: 'Overview', icon: Landmark },
    { id: 'to-receive' as const, label: 'Receivables', icon: TrendingUp },
    { id: 'to-pay' as const, label: 'Payables', icon: TrendingDown },
    { id: 'analytics' as const, label: 'Analytics', icon: PieChartIcon },
  ];

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background: AXIOM.backgrounds.main }}>
      {/* Header */}
      <motion.div {...AXIOM.animations.fadeInTop}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.purple,
                boxShadow: AXIOM.shadows.iconPurple,
              }}
            >
              <Landmark className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle}>
                Loans & Liabilities
              </h1>
              <p className="text-slate-400 text-sm">Track borrowings, lending, and payment schedules</p>
            </div>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toast.success('Export downloaded')}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={AXIOM.buttons.secondary}
            >
              <Download className="size-4" />
              Export
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openAdd}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                color: '#ffffff',
              }}
            >
              <Plus className="size-4" />
              Add Loan
            </motion.button>
          </div>
        </div>
      </motion.div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading loans…
        </div>
      )}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm text-amber-100"
          style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)' }}
        >
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.chartGreen}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Receivables</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(totalToReceive)}</p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="size-3 text-green-400" />
                <p className="text-xs text-green-400">{loansToReceive.length} loans</p>
              </div>
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
          style={AXIOM.containers.chartRed}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Payables</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(totalToPay)}</p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowDownRight className="size-3 text-red-400" />
                <p className="text-xs text-red-400">{loansToPay.length} loans</p>
              </div>
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
          style={AXIOM.containers.chartCyan}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Net Position</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(Math.abs(netPosition))}</p>
              <div className="flex items-center gap-1 mt-2">
                <DollarSign className="size-3 text-cyan-400" />
                <p className="text-xs text-cyan-400">{netPosition >= 0 ? 'Surplus' : 'Deficit'}</p>
              </div>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.cyan,
                boxShadow: AXIOM.shadows.iconCyan,
              }}
            >
              <Wallet className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.chartAmber}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Overdue Loans</p>
              <p className="text-3xl font-bold text-white">{overdueLoans.length}</p>
              <div className="flex items-center gap-1 mt-2">
                <AlertCircle className="size-3 text-amber-400" />
                <p className="text-xs text-amber-400">Requires attention</p>
              </div>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.amber,
                boxShadow: AXIOM.shadows.iconAmber,
              }}
            >
              <Clock className="size-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {!loading && loans.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed p-10 text-center"
          style={{ borderColor: 'rgba(148, 163, 184, 0.25)', background: 'rgba(15, 23, 42, 0.35)' }}
        >
          <p className="text-lg font-medium text-slate-200 mb-1">No loans yet</p>
          <p className="text-sm text-slate-500 mb-6">Add money you owe or money owed to you. You can edit or remove entries anytime.</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openAdd}
            className="px-5 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
              border: '1px solid rgba(6, 182, 212, 0.5)',
              color: '#ffffff',
            }}
          >
            <Plus className="size-4" />
            Add loan
          </motion.button>
        </motion.div>
      )}

      {/* View Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-2 p-2 rounded-2xl"
        style={AXIOM.containers.list}
      >
        {viewButtons.map((btn) => (
          <motion.button
            key={btn.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveView(btn.id)}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
            style={activeView === btn.id ? AXIOM.buttons.primary : AXIOM.buttons.secondary}
          >
            <btn.icon className="size-4" />
            {btn.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Search and Filter */}
      {activeView !== 'analytics' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex gap-4"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by party or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
              style={{
                background: AXIOM.inputs.background,
                border: AXIOM.inputs.border,
                color: AXIOM.inputs.color,
              }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 rounded-xl text-sm font-medium"
            style={AXIOM.buttons.secondary}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>
        </motion.div>
      )}

      {/* Content Views */}
      {activeView === 'overview' && (
        <div className="space-y-4">
          {/* Upcoming Payments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.chartPurple}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Upcoming Payment Schedule</h3>
                <p className="text-sm text-slate-400 mt-1">Next 6 months payment obligations</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentScheduleData}>
                <defs>
                  <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid {...AXIOM.charts.grid} />
                <XAxis 
                  dataKey="month" 
                  {...AXIOM.charts.axis}
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis 
                  {...AXIOM.charts.axis}
                  tick={{ fill: '#94a3b8' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: AXIOM.charts.tooltip.backgroundColor,
                    border: AXIOM.charts.tooltip.border,
                    borderRadius: AXIOM.charts.tooltip.borderRadius,
                    color: '#fff',
                  }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Bar dataKey="scheduled" fill="url(#colorScheduled)" name="Scheduled" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Recent Loans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="p-6 rounded-2xl"
              style={AXIOM.containers.list}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="size-5 text-green-400" />
                  Active Receivables
                </h3>
              </div>
              <div className="space-y-3">
                {loansToReceive.slice(0, 3).map((loan) => (
                  <div
                    key={loan.id}
                    className="p-4 rounded-xl"
                    style={AXIOM.containers.item}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-medium">{loan.party}</p>
                      <span 
                        className="px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                        style={getStatusBadge(loan.status)}
                      >
                        {getStatusIcon(loan.status)}
                        {loan.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-400 mb-2">{formatCurrency(loan.remainingBalance || loan.amount)}</p>
                    <p className="text-sm text-slate-400 mb-2">{loan.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Due: {formatDate(loan.dueDate)}</span>
                      {loan.interestRate && (
                        <span className="text-cyan-400">{loan.interestRate}% APR</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-6 rounded-2xl"
              style={AXIOM.containers.list}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingDown className="size-5 text-red-400" />
                  Active Payables
                </h3>
              </div>
              <div className="space-y-3">
                {loansToPay.slice(0, 3).map((loan) => (
                  <div
                    key={loan.id}
                    className="p-4 rounded-xl"
                    style={AXIOM.containers.item}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-medium">{loan.party}</p>
                      <span 
                        className="px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                        style={getStatusBadge(loan.status)}
                      >
                        {getStatusIcon(loan.status)}
                        {loan.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-red-400 mb-2">{formatCurrency(loan.remainingBalance || loan.amount)}</p>
                    <p className="text-sm text-slate-400 mb-2">{loan.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Due: {formatDate(loan.dueDate)}</span>
                      {loan.interestRate && (
                        <span className="text-amber-400">{loan.interestRate}% APR</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {activeView === 'to-receive' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="size-6 text-green-400" />
                Loans to Receive
              </h3>
              <p className="text-sm text-slate-400 mt-1">Money owed to your organization</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Total Outstanding</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(totalToReceive)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {loansToReceive.filter(loan => {
              const matchesSearch = loan.party.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                   loan.description.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesFilter = filterStatus === 'all' || loan.status === filterStatus;
              return matchesSearch && matchesFilter;
            }).map((loan) => (
              <div
                key={loan.id}
                className="p-6 rounded-xl hover:bg-black/20 transition-colors"
                style={AXIOM.containers.item}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-bold text-white">{loan.party}</h4>
                      <span 
                        className="px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                        style={getStatusBadge(loan.status)}
                      >
                        {getStatusIcon(loan.status)}
                        {loan.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">{loan.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-lg"
                      style={AXIOM.buttons.secondary}
                      onClick={() => openEdit(loan)}
                    >
                      <Edit className="size-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-lg"
                      style={AXIOM.buttons.danger}
                      onClick={() => handleDelete(loan)}
                    >
                      <Trash2 className="size-4" />
                    </motion.button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Principal Amount</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(loan.principal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Remaining Balance</p>
                    <p className="text-lg font-bold text-green-400">{formatCurrency(loan.remainingBalance || loan.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Interest Rate</p>
                    <p className="text-lg font-bold text-cyan-400">{loan.interestRate || 0}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Interest</p>
                    <p className="text-lg font-bold text-amber-400">{formatCurrency(loan.totalInterest || 0)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Start Date</p>
                    <p className="text-sm text-slate-300">{loan.startDate ? formatDate(loan.startDate) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Due Date</p>
                    <p className="text-sm text-slate-300">{formatDate(loan.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Next Payment</p>
                    <p className="text-sm text-slate-300">{loan.nextPaymentDate ? formatDate(loan.nextPaymentDate) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Progress</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
                        <div 
                          className="h-full rounded-full" 
                          style={{ 
                            width: `${loan.paymentsCompleted && loan.paymentsCount ? (loan.paymentsCompleted / loan.paymentsCount * 100) : 0}%`,
                            background: AXIOM.iconBoxes.green
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">
                        {loan.paymentsCompleted || 0}/{loan.paymentsCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {activeView === 'to-pay' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingDown className="size-6 text-red-400" />
                Loans to Pay
              </h3>
              <p className="text-sm text-slate-400 mt-1">Your organization's outstanding debt</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(totalToPay)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {loansToPay.filter(loan => {
              const matchesSearch = loan.party.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                   loan.description.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesFilter = filterStatus === 'all' || loan.status === filterStatus;
              return matchesSearch && matchesFilter;
            }).map((loan) => (
              <div
                key={loan.id}
                className="p-6 rounded-xl hover:bg-black/20 transition-colors"
                style={AXIOM.containers.item}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-bold text-white">{loan.party}</h4>
                      <span 
                        className="px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                        style={getStatusBadge(loan.status)}
                      >
                        {getStatusIcon(loan.status)}
                        {loan.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">{loan.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-lg"
                      style={AXIOM.buttons.secondary}
                      onClick={() => openEdit(loan)}
                    >
                      <Edit className="size-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-lg"
                      style={AXIOM.buttons.danger}
                      onClick={() => handleDelete(loan)}
                    >
                      <Trash2 className="size-4" />
                    </motion.button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Principal Amount</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(loan.principal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Amount Paid</p>
                    <p className="text-lg font-bold text-green-400">{formatCurrency(loan.amountPaid || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Remaining Balance</p>
                    <p className="text-lg font-bold text-red-400">{formatCurrency(loan.remainingBalance || loan.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Interest Rate</p>
                    <p className="text-lg font-bold text-amber-400">{loan.interestRate || 0}%</p>
                  </div>
                </div>

                {loan.installmentAmount && (
                  <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Installment</p>
                        <p className="text-sm font-bold text-cyan-400">{formatCurrency(loan.installmentAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Frequency</p>
                        <p className="text-sm font-bold text-white capitalize">{loan.frequency || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Next Payment</p>
                        <p className="text-sm font-bold text-white">{loan.nextPaymentDate ? formatDate(loan.nextPaymentDate) : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Start Date</p>
                    <p className="text-sm text-slate-300">{loan.startDate ? formatDate(loan.startDate) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Due Date</p>
                    <p className="text-sm text-slate-300">{formatDate(loan.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Interest</p>
                    <p className="text-sm text-amber-400 font-medium">{formatCurrency(loan.totalInterest || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Progress</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
                        <div 
                          className="h-full rounded-full" 
                          style={{ 
                            width: `${loan.paymentsCompleted && loan.paymentsCount ? (loan.paymentsCompleted / loan.paymentsCount * 100) : 0}%`,
                            background: AXIOM.iconBoxes.cyan
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">
                        {loan.paymentsCompleted || 0}/{loan.paymentsCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {activeView === 'analytics' && (
        <div className="space-y-4">
          {/* Loan Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-6 rounded-2xl"
              style={AXIOM.containers.chartPurple}
            >
              <h4 className="text-lg font-bold text-white mb-4">Loan Type Distribution</h4>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={loanTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {loanTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: AXIOM.charts.tooltip.backgroundColor,
                      border: AXIOM.charts.tooltip.border,
                      borderRadius: AXIOM.charts.tooltip.borderRadius,
                      color: '#fff',
                    }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="p-6 rounded-2xl"
              style={AXIOM.containers.chartCyan}
            >
              <h4 className="text-lg font-bold text-white mb-4">Interest Analysis</h4>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-400">Interest Receivable</p>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(totalInterestReceivable)}</p>
                  </div>
                  <div className="h-3 rounded-full" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${interestTotal > 0 ? (totalInterestReceivable / interestTotal) * 100 : 0}%`,
                        background: AXIOM.iconBoxes.green
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-400">Interest Payable</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(totalInterestPayable)}</p>
                  </div>
                  <div className="h-3 rounded-full" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${interestTotal > 0 ? (totalInterestPayable / interestTotal) * 100 : 0}%`,
                        background: AXIOM.iconBoxes.red
                      }}
                    />
                  </div>
                </div>
                <div className="pt-4" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">Net Interest Position</p>
                    <p className="text-2xl font-bold text-cyan-400">
                      {formatCurrency(Math.abs(totalInterestReceivable - totalInterestPayable))}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 text-right">
                    {totalInterestReceivable > totalInterestPayable ? 'Net Gain' : 'Net Cost'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Loan Status Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.list}
          >
            <h4 className="text-lg font-bold text-white mb-6">Loan Status Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                <p className="text-sm text-slate-400 mb-1">Active</p>
                <p className="text-3xl font-bold text-green-400">
                  {loans.filter(l => l.status === 'active').length}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                <p className="text-sm text-slate-400 mb-1">Pending</p>
                <p className="text-3xl font-bold text-amber-400">
                  {loans.filter(l => l.status === 'pending').length}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                <p className="text-sm text-slate-400 mb-1">Overdue</p>
                <p className="text-3xl font-bold text-red-400">
                  {loans.filter(l => l.status === 'overdue').length}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                <p className="text-sm text-slate-400 mb-1">Partial</p>
                <p className="text-3xl font-bold text-blue-400">
                  {loans.filter(l => l.status === 'partially_paid').length}
                </p>
              </div>
              <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                <p className="text-sm text-slate-400 mb-1">Paid</p>
                <p className="text-3xl font-bold text-cyan-400">
                  {loans.filter(l => l.status === 'paid').length}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          className="max-w-lg border-slate-700/80 text-slate-100"
          style={{ background: 'rgba(15, 23, 42, 0.98)' }}
        >
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit loan' : 'Add loan'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {form.type === 'to_pay'
                ? 'Money your organization owes to someone else.'
                : 'Money someone else owes to your organization.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm(f => ({ ...f, type: e.target.value as Loan['type'] }))}
                className="w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border, color: AXIOM.inputs.color }}
              >
                <option value="to_pay">We owe (payable)</option>
                <option value="to_receive">We are owed (receivable)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Who</label>
              <input
                value={form.party}
                onChange={(e) => setForm(f => ({ ...f, party: e.target.value }))}
                placeholder="Bank or person"
                className="w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border, color: AXIOM.inputs.color }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What this is for"
                className="w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border, color: AXIOM.inputs.color }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Principal</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.principal}
                  onChange={(e) => setForm(f => ({ ...f, principal: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border, color: AXIOM.inputs.color }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Currency</label>
                <input
                  value={form.currency}
                  onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border, color: AXIOM.inputs.color }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Due date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border, color: AXIOM.inputs.color }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Start date (optional)</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border, color: AXIOM.inputs.color }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Interest % (optional)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.interestRate}
                  onChange={(e) => setForm(f => ({ ...f, interestRate: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border, color: AXIOM.inputs.color }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm(f => ({ ...f, status: e.target.value as LoanRecordStatus }))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border, color: AXIOM.inputs.color }}
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="partially_paid">Partially paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="paid">Paid</option>
                  <option value="defaulted">Defaulted</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium"
              style={AXIOM.buttons.secondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitForm()}
              disabled={createLoan.loading || updateLoan.loading}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={AXIOM.buttons.primary}
            >
              {(createLoan.loading || updateLoan.loading) && <Loader2 className="size-4 animate-spin" />}
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}