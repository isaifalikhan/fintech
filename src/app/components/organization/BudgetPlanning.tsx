import { useOrgCurrency } from '@/hooks/useOrgCurrency';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { formatCurrency } from '@/lib/formatters';
import { Target, TrendingUp, AlertTriangle, Plus, Edit, Trash2, DollarSign, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AXIOM } from '../../../styles/axiom-tokens';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useServiceArray } from '@/hooks/useService';
import type { Budget as ServiceBudget } from '@/services/types';

// ── View-model extends service Budget with computed UI fields ───────────
interface Budget extends ServiceBudget {
  /** Computed: human-readable category label (falls back to categoryId) */
  category: string;
  /** Computed: amount alias for budgetedAmount */
  amount: number;
  /** Computed: spent alias for spentAmount */
  spent: number;
  /** Computed: scope (default 'business') */
  scope: 'business' | 'personal';
  /** Computed: alert threshold (default 80) */
  alertThreshold: number;
}

function toViewModel(b: ServiceBudget): Budget {
  const pct = b.budgetedAmount > 0 ? (b.spentAmount / b.budgetedAmount) * 100 : 0;
  return {
    ...b,
    category: b.categoryId || b.departmentId || 'General',
    amount: b.budgetedAmount,
    spent: b.spentAmount,
    scope: 'business',
    alertThreshold: 80,
    status: pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'on-track',
  };
}

/** Pre-built splits for “Use template”; percentages sum to 100 per template. */
interface BudgetTemplate {
  name: string;
  categories: { category: string; percentage: number }[];
}

const budgetTemplates: BudgetTemplate[] = [
  {
    name: 'Creative agency',
    categories: [
      { category: 'Payroll', percentage: 45 },
      { category: 'Facilities', percentage: 10 },
      { category: 'Marketing', percentage: 15 },
      { category: 'Software', percentage: 12 },
      { category: 'Operations', percentage: 18 },
    ],
  },
  {
    name: 'Lean team',
    categories: [
      { category: 'People', percentage: 55 },
      { category: 'Infrastructure', percentage: 15 },
      { category: 'Growth', percentage: 30 },
    ],
  },
  {
    name: 'Services business',
    categories: [
      { category: 'Delivery', percentage: 40 },
      { category: 'Sales', percentage: 12 },
      { category: 'Admin', percentage: 18 },
      { category: 'Tools', percentage: 15 },
      { category: 'Buffer', percentage: 15 },
    ],
  },
];

export function BudgetPlanning() {
  const orgCurrency = useOrgCurrency();
  const svc = useOrgServices();
  const { data: rawBudgets, loading, error } = useServiceArray(
    () => svc.budgets.getAll(),
    [svc.orgId],
    ['budgets'],
  );
  const budgets: Budget[] = rawBudgets.map(toViewModel);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'monthly' | 'quarterly' | 'yearly'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'on-track' | 'warning' | 'exceeded'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('list');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    amount: '',
    period: 'monthly' as Budget['period'],
    startDate: '',
    endDate: '',
    scope: 'business' as 'business' | 'personal',
    department: '',
    alertThreshold: 80
  });

  const filteredBudgets = budgets.filter(budget => {
    const matchesPeriod = filterPeriod === 'all' || budget.period === filterPeriod;
    const pct = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
    const computedStatus = pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'on-track';
    const matchesStatus = filterStatus === 'all' || computedStatus === filterStatus;
    return matchesPeriod && matchesStatus;
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.category || !formData.amount || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const res = await svc.budgets.create({
      name: formData.name,
      period: formData.period,
      startDate: formData.startDate,
      endDate: formData.endDate,
      categoryId: formData.category,
      departmentId: formData.department || undefined,
      budgetedAmount: parseFloat(formData.amount),
      spentAmount: 0,
      currency: 'USD',
      status: 'active',
    });

    if (!res.success) {
      toast.error(res.error || 'Could not create budget');
      return;
    }

    toast.success('Budget created successfully');
    setCreateDialogOpen(false);
    resetForm();
  };

  const handleEdit = (budget: Budget) => {
    setSelectedBudget(budget);
    setFormData({
      name: budget.name,
      category: budget.category,
      amount: budget.amount.toString(),
      period: budget.period,
      startDate: budget.startDate,
      endDate: budget.endDate,
      scope: budget.scope,
      department: budget.departmentId || '',
      alertThreshold: budget.alertThreshold
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedBudget) return;

    await svc.budgets.update(selectedBudget.id, {
      name: formData.name,
      categoryId: formData.category,
      budgetedAmount: parseFloat(formData.amount),
      period: formData.period,
      departmentId: formData.department || undefined,
    });

    toast.success('Budget updated successfully');
    setEditDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    const res = await svc.budgets.delete(id);
    if (!res.success) {
      toast.error(res.error || 'Could not delete budget');
      return;
    }
    toast.success('Budget deleted');
  };

  const applyTemplate = async (template: BudgetTemplate, totalBudget: number) => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 12);

    for (const cat of template.categories) {
      const res = await svc.budgets.create({
        name: `${cat.category} - ${template.name}`,
        period: 'monthly',
        startDate: today.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        categoryId: cat.category,
        budgetedAmount: (totalBudget * cat.percentage) / 100,
        spentAmount: 0,
        currency: 'USD',
        status: 'active',
      });
      if (!res.success) {
        toast.error(res.error || 'Template apply failed partway through');
        return;
      }
    }

    toast.success(`Applied ${template.name} template`);
    setTemplateDialogOpen(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      amount: '',
      period: 'monthly',
      startDate: '',
      endDate: '',
      scope: 'business',
      department: '',
      alertThreshold: 80
    });
    setSelectedBudget(null);
  };

  const getPercentageUsed = (budget: Budget) => {
    return budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
  };

  const getVariance = (budget: Budget) => {
    return budget.spent - budget.amount;
  };

  const totalBudgeted = filteredBudgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = filteredBudgets.reduce((sum, b) => sum + b.spent, 0);
  const onTrackCount = budgets.filter(b => b.status === 'on-track').length;
  const warningCount = budgets.filter(b => b.status === 'warning').length;
  const exceededCount = budgets.filter(b => b.status === 'exceeded').length;

  // Calculate category summary
  const categoryMap = new Map<string, { budgeted: number, spent: number }>();
  filteredBudgets.forEach(budget => {
    const existing = categoryMap.get(budget.category) || { budgeted: 0, spent: 0 };
    categoryMap.set(budget.category, {
      budgeted: existing.budgeted + budget.amount,
      spent: existing.spent + budget.spent
    });
  });

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background: AXIOM.backgrounds.main }}>
      {/* Header */}
      <motion.div {...AXIOM.animations.fadeInTop}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.blue,
                boxShadow: AXIOM.shadows.iconBlue,
              }}
            >
              <Target className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle}>
                Budget Planning
              </h1>
              <p className="text-slate-400 text-sm">Plan, track, and optimize your budgets</p>
            </div>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={AXIOM.buttons.secondary}
              onClick={() => setTemplateDialogOpen(true)}
            >
              <Target className="size-4" />
              Use Template
            </motion.button>
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
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="size-4" />
              Create Budget
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Budgeted</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(totalBudgeted, orgCurrency)}
              </p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.blue,
                boxShadow: AXIOM.shadows.iconBlue,
              }}
            >
              <DollarSign className="size-6 text-white" />
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
              <p className="text-slate-400 text-sm mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-cyan-400">
                {formatCurrency(totalSpent, orgCurrency)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {totalBudgeted > 0 ? ((totalSpent / totalBudgeted) * 100).toFixed(1) : '0.0'}% used
              </p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.cyan,
                boxShadow: AXIOM.shadows.iconCyan,
              }}
            >
              <TrendingUp className="size-6 text-white" />
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
              <p className="text-slate-400 text-sm mb-1">Remaining</p>
              <p className="text-2xl font-bold text-emerald-400">
                {formatCurrency(totalBudgeted - totalSpent, orgCurrency)}
              </p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.green,
                boxShadow: AXIOM.shadows.iconGreen,
              }}
            >
              <CheckCircle className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Status</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2 py-1 rounded-lg text-xs font-medium" style={AXIOM.badges.success}>
                  {onTrackCount} On Track
                </span>
                {warningCount > 0 && (
                  <span className="px-2 py-1 rounded-lg text-xs font-medium" style={AXIOM.badges.warning}>
                    {warningCount} Warning
                  </span>
                )}
                {exceededCount > 0 && (
                  <span className="px-2 py-1 rounded-lg text-xs font-medium" style={AXIOM.badges.danger}>
                    {exceededCount} Over
                  </span>
                )}
              </div>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.purple,
                boxShadow: AXIOM.shadows.iconPurple,
              }}
            >
              <Target className="size-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* View Toggle & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 rounded-2xl"
        style={AXIOM.containers.list}
      >
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as any)}
              className="px-4 py-2 rounded-xl text-white text-sm"
              style={{
                background: AXIOM.inputs.background,
                border: AXIOM.inputs.border,
              }}
            >
              <option value="all">All Periods</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 rounded-xl text-white text-sm"
              style={{
                background: AXIOM.inputs.background,
                border: AXIOM.inputs.border,
              }}
            >
              <option value="all">All Status</option>
              <option value="on-track">On Track</option>
              <option value="warning">Warning</option>
              <option value="exceeded">Exceeded</option>
            </select>
          </div>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('list')}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={viewMode === 'list' ? AXIOM.buttons.primary : AXIOM.buttons.secondary}
            >
              List View
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('summary')}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={viewMode === 'summary' ? AXIOM.buttons.primary : AXIOM.buttons.secondary}
            >
              Category Summary
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            {loading && rawBudgets.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-2xl py-16 text-slate-400"
                style={AXIOM.containers.list}
              >
                <Loader2 className="size-8 animate-spin text-cyan-400" aria-hidden />
                <p className="text-sm">Loading budgets…</p>
              </div>
            ) : !loading && filteredBudgets.length === 0 ? (
              <div className="rounded-2xl py-16 text-center" style={AXIOM.containers.list}>
                <p className="text-base font-medium text-white">No budgets yet</p>
                <p className="mt-2 text-sm text-slate-400">
                  Create a budget or apply a template to see it here.
                </p>
              </div>
            ) : (
            filteredBudgets.map((budget, idx) => {
              const percentageUsed = getPercentageUsed(budget);
              const variance = getVariance(budget);

              return (
                <motion.div
                  key={budget.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-6 rounded-2xl"
                  style={AXIOM.containers.list}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{budget.name}</h3>
                        <span 
                          className="px-2 py-1 rounded-lg text-xs font-medium"
                          style={
                            budget.status === 'on-track' ? AXIOM.badges.success :
                            budget.status === 'warning' ? AXIOM.badges.warning :
                            AXIOM.badges.danger
                          }
                        >
                          {budget.status}
                        </span>
                        <span className="px-2 py-1 rounded-lg text-xs font-medium capitalize" style={AXIOM.badges.info}>
                          {budget.period}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        {budget.category}
                        {budget.department && ` • ${budget.department}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
                        style={{ background: 'rgba(148, 163, 184, 0.1)' }}
                        onClick={() => handleEdit(budget)}
                      >
                        <Edit className="size-3" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-300"
                        style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                        onClick={() => handleDelete(budget.id)}
                      >
                        <Trash2 className="size-3" />
                      </motion.button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Budget</span>
                      <span className="text-white font-medium">
                        {formatCurrency(budget.amount, orgCurrency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Spent</span>
                      <span className="text-cyan-400 font-medium">
                        {formatCurrency(budget.spent, orgCurrency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Remaining</span>
                      <span className={variance > 0 ? 'text-red-400' : 'text-emerald-400'}>
                        {formatCurrency(Math.abs(variance), orgCurrency)}
                        {variance > 0 ? ' over' : ' left'}
                      </span>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>Progress</span>
                        <span>{percentageUsed.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percentageUsed, 100)}%` }}
                          transition={{ duration: 1, delay: 0.2 }}
                          className="h-full"
                          style={{
                            background: percentageUsed >= 100 
                              ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                              : percentageUsed >= budget.alertThreshold
                              ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                              : 'linear-gradient(90deg, #10b981, #059669)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {percentageUsed >= budget.alertThreshold && (
                    <div 
                      className="mt-4 p-3 rounded-xl flex items-start gap-2"
                      style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                      }}
                    >
                      <AlertTriangle className="size-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-400">
                        {percentageUsed >= 100
                          ? `Budget exceeded by ${formatCurrency(variance, orgCurrency)}`
                          : `Approaching budget limit (${budget.alertThreshold}% threshold)`
                        }
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })
            )}
          </motion.div>
        ) : (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            {Array.from(categoryMap.entries()).map(([category, data], idx) => {
              const percentageUsed = data.budgeted > 0 ? (data.spent / data.budgeted) * 100 : 0;
              const variance = data.spent - data.budgeted;

              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-6 rounded-2xl"
                  style={AXIOM.containers.list}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-semibold mb-1">{category}</h3>
                      <p className="text-sm text-slate-400">
                        {filteredBudgets.filter(b => b.category === category).length} budget(s)
                      </p>
                    </div>
                    <span 
                      className="px-3 py-1 rounded-lg text-sm font-medium"
                      style={
                        percentageUsed < 80 ? AXIOM.badges.success :
                        percentageUsed < 100 ? AXIOM.badges.warning :
                        AXIOM.badges.danger
                      }
                    >
                      {percentageUsed.toFixed(1)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Budgeted</p>
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(data.budgeted, orgCurrency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Spent</p>
                      <p className="text-lg font-bold text-cyan-400">
                        {formatCurrency(data.spent, orgCurrency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Variance</p>
                      <p className={`text-lg font-bold ${variance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {variance > 0 ? '+' : ''}{formatCurrency(variance, orgCurrency)}
                      </p>
                    </div>
                  </div>

                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(percentageUsed, 100)}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="h-full"
                      style={{
                        background: percentageUsed >= 100 
                          ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                          : percentageUsed >= 80
                          ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                          : 'linear-gradient(90deg, #10b981, #059669)',
                      }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateDialogOpen(false);
          setEditDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent 
          className="max-w-2xl text-white"
          style={{
            background: AXIOM.containers.list.background,
            border: AXIOM.containers.list.border,
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">{editDialogOpen ? 'Edit' : 'Create'} Budget</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editDialogOpen ? 'Update' : 'Set up'} a budget to track spending
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-white text-sm font-medium mb-2 block">Budget Name *</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Marketing Budget Q1 2025"
                className="w-full px-4 py-3 rounded-xl text-white"
                style={{
                  background: AXIOM.inputs.background,
                  border: AXIOM.inputs.border,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Category *</label>
                <input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Marketing, Salaries"
                  className="w-full px-4 py-3 rounded-xl text-white"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                  }}
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-2 block">Amount *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl text-white"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Period *</label>
                <Select value={formData.period} onValueChange={(v: any) => setFormData({ ...formData, period: v })}>
                  <SelectTrigger 
                    className="w-full text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent 
                    style={{
                      background: AXIOM.containers.list.background,
                      border: AXIOM.containers.list.border,
                    }}
                  >
                    <SelectItem value="monthly" className="text-white">Monthly</SelectItem>
                    <SelectItem value="quarterly" className="text-white">Quarterly</SelectItem>
                    <SelectItem value="yearly" className="text-white">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-2 block">Scope *</label>
                <Select value={formData.scope} onValueChange={(v: any) => setFormData({ ...formData, scope: v })}>
                  <SelectTrigger 
                    className="w-full text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent 
                    style={{
                      background: AXIOM.containers.list.background,
                      border: AXIOM.containers.list.border,
                    }}
                  >
                    <SelectItem value="business" className="text-white">Business</SelectItem>
                    <SelectItem value="personal" className="text-white">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-white"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                  }}
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-2 block">End Date *</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-white"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">Department (Optional)</label>
                <input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Design, Development"
                  className="w-full px-4 py-3 rounded-xl text-white"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                  }}
                />
              </div>

              <div>
                <label className="text-white text-sm font-medium mb-2 block">Alert Threshold (%)</label>
                <input
                  type="number"
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData({ ...formData, alertThreshold: parseInt(e.target.value) || 80 })}
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 rounded-xl text-white"
                  style={{
                    background: AXIOM.inputs.background,
                    border: AXIOM.inputs.border,
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium"
                style={AXIOM.buttons.secondary}
                onClick={() => {
                  setCreateDialogOpen(false);
                  setEditDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium"
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                  border: '1px solid rgba(6, 182, 212, 0.5)',
                  boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                  color: '#ffffff',
                }}
                onClick={editDialogOpen ? handleUpdate : handleCreate}
              >
                {editDialogOpen ? 'Update' : 'Create'} Budget
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent 
          className="max-w-2xl text-white"
          style={{
            background: AXIOM.containers.list.background,
            border: AXIOM.containers.list.border,
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">Apply Budget Template</DialogTitle>
            <DialogDescription className="text-slate-400">
              Choose a pre-configured budget template for your agency
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-white text-sm font-medium mb-2 block">Total Budget Amount *</label>
              <input
                type="number"
                id="template-total"
                placeholder="e.g., 1000000"
                className="w-full px-4 py-3 rounded-xl text-white"
                style={{
                  background: AXIOM.inputs.background,
                  border: AXIOM.inputs.border,
                }}
              />
              <p className="text-xs text-slate-400 mt-1">
                This will be distributed across categories based on template percentages
              </p>
            </div>

            <div className="space-y-3">
              {budgetTemplates.map((template) => (
                <div 
                  key={template.name} 
                  className="p-4 rounded-xl"
                  style={AXIOM.containers.item}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold mb-1">{template.name}</h3>
                      <p className="text-xs text-slate-400">{template.categories.length} categories</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-2 rounded-lg text-xs font-medium"
                      style={{
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                        border: '1px solid rgba(6, 182, 212, 0.5)',
                        color: '#ffffff',
                      }}
                      onClick={() => {
                        const input = document.getElementById('template-total') as HTMLInputElement;
                        const total = parseFloat(input.value);
                        if (total && total > 0) {
                          applyTemplate(template, total);
                        } else {
                          toast.error('Please enter a valid total budget amount');
                        }
                      }}
                    >
                      Apply Template
                    </motion.button>
                  </div>
                  <div className="space-y-1">
                    {template.categories.map(cat => (
                      <div key={cat.category} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{cat.category}</span>
                        <span className="px-2 py-1 rounded-lg text-xs font-medium" style={AXIOM.badges.info}>
                          {cat.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}