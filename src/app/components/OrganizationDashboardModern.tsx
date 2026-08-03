import { formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useOrgWorkspaceNav } from './organization/OrgWorkspaceNavContext';
import type { OrgView } from './organization/OrganizationWorkspace';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService, useServiceArray } from '@/hooks/useService';
import { dashboardFallbackAnalytics } from '@/lib/dashboardFallbackAnalytics';
import { 
  TrendingUp, 
  Wallet, 
  DollarSign, 
  Plus, 
  Upload, 
  Settings, 
  BarChart3,
  Activity,
  Calendar,
  ArrowUpRight,
  Zap,
  Target,
  PieChart as PieChartIcon,
  TrendingDown,
  Users
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ModernKPICard } from './ModernKPICard';
import { ModernSidebarWidget } from './ModernSidebarWidget';
import { cn } from './ui/utils';
import { 
  ChartContainer, 
  SmoothAreaChart, 
  ModernBarChart,
  DonutChart,
  ComboChart,
  ProgressRing,
  Sparkline,
  MODERN_COLORS
} from './charts/ModernFinanceCharts';
import { AXIOM } from '../../styles/axiom-tokens';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Area, 
  AreaChart as RechartsAreaChart,
  ComposedChart as RechartsComposedChart,
  Bar,
  Legend
} from 'recharts';
import { motion } from 'motion/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { QuickAdd } from './organization/QuickAdd';
import { EnhancedStatementImport } from './organization/EnhancedStatementImport';

function safeFinite(n: unknown, fallback: number): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

export function OrganizationDashboard() {
  const navigate = useNavigate();
  const goToOrgView = useOrgWorkspaceNav();
  const { theme = 'dark' } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<'1W' | '1M' | '3M' | '6M' | '1Y'>('1M');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importKey, setImportKey] = useState(0);

  /**
   * Switch org shell view. Prefer context `applyView` (updates state + `?view=`).
   * Fallback: `/organization` has no Provider → navigate to `/dashboard` with state.
   */
  const openOrgView = (view: OrgView) => {
    if (goToOrgView) {
      goToOrgView(view);
      return;
    }
    navigate('/dashboard', { state: { orgView: view } });
  };

  const openQuickAddModal = () => setQuickAddOpen(true);
  const openImportModal = () => {
    setImportKey((k) => k + 1);
    setImportOpen(true);
  };

  // ── Service wiring (ORG-P02: loading / error / empty-safe) ─────────────
  const svc = useOrgServices();
  const {
    data: bankAccounts,
    loading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useServiceArray(() => svc.accounts.getBankAccounts(), [svc.orgId]);
  const {
    data: kpis,
    loading: kpisLoading,
    error: kpisError,
    refetch: refetchKpis,
  } = useService(() => svc.reports.getDashboardSummary(), [svc.orgId]);
  const {
    data: txnResult,
    loading: txnLoading,
    error: txnError,
    refetch: refetchTxns,
  } = useService(() => svc.transactions.getAll({ pageSize: 20 }), [svc.orgId]);

  const refreshDashboard = () => {
    void refetchAccounts();
    void refetchKpis();
    void refetchTxns();
  };

  const sumAccountsPkr = bankAccounts.reduce((sum, acc) => {
    const b = safeFinite(acc.balance, 0);
    if (acc.currency === 'PKR') return sum + b;
    if (acc.currency === 'USD') return sum + b * 280;
    return sum + b;
  }, 0);

  const totalBalance =
    bankAccounts.length > 0
      ? safeFinite(sumAccountsPkr, dashboardFallbackAnalytics.netWorth)
      : dashboardFallbackAnalytics.netWorth;

  const cashInHand = safeFinite(kpis?.cashOnHand, dashboardFallbackAnalytics.cashInHand);
  const monthlyProfit = safeFinite(kpis?.netProfit, dashboardFallbackAnalytics.monthlyProfit);

  const netWorthFromSummary =
    kpis != null
      ? safeFinite(
          safeFinite(kpis.cashOnHand, 0) +
            safeFinite(kpis.accountsReceivable, 0) -
            Math.abs(safeFinite(kpis.accountsPayable, 0)),
          dashboardFallbackAnalytics.netWorth,
        )
      : safeFinite(dashboardFallbackAnalytics.netWorth, 0);

  const netWorth =
    bankAccounts.length > 0
      ? safeFinite(sumAccountsPkr, dashboardFallbackAnalytics.netWorth)
      : netWorthFromSummary;

  const dataError = accountsError || kpisError || txnError;
  const dataLoading = accountsLoading || kpisLoading || txnLoading;

  // ── Transaction adapter: NEW (debit/credit) → UI shape (income/expense) ─
  const rawTxns = txnResult?.items ?? [];
  const recentTransactions = rawTxns.slice(0, 10).map(t => ({
    id: t.id,
    date: t.date,
    title: (t as any).narration ?? (t as any).description ?? '',
    amount: t.amount,
    type: t.type === 'credit' ? 'income' as const : 'expense' as const,
  }));
  const upcomingPayments = rawTxns
    .filter(t => t.type === 'debit')
    .slice(0, 5)
    .map(t => ({
      id: t.id,
      date: t.date,
      title: (t as any).narration ?? (t as any).description ?? '',
      amount: t.amount,
      type: 'expense' as const,
    }));
  // ─────────────────────────────────────────────────────────────────────────

  const profitDataFull = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
        Revenue: 2000000 + Math.sin(i * 0.5) * 500000 + i * 150000,
        Expenses: 1200000 + Math.cos(i * 0.7) * 300000 + i * 80000,
        Profit: 800000 + Math.sin(i * 0.3) * 400000 + i * 100000,
      })),
    [],
  );

  const profitData = useMemo(() => {
    const full = profitDataFull;
    const tail = (n: number) => full.slice(Math.max(0, full.length - n));
    switch (selectedPeriod) {
      case '1W':
        return tail(2);
      case '1M':
        return tail(1);
      case '3M':
        return tail(3);
      case '6M':
        return tail(6);
      case '1Y':
      default:
        return full;
    }
  }, [profitDataFull, selectedPeriod]);

  const departmentData = Array.from({ length: 12 }, (_, i) => ({
    name: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    Development: 1500000 + Math.sin(i * 0.5) * 400000 + i * 120000,
    Design: 800000 + Math.cos(i * 0.7) * 250000 + i * 80000,
    Marketing: 600000 + Math.sin(i * 0.3) * 200000 + i * 60000,
    Sales: 1000000 + Math.cos(i * 0.6) * 300000 + i * 90000,
  }));

  // Expense category data for donut chart
  const expenseCategoryData = [
    { name: 'Salaries', value: 1500000, color: MODERN_COLORS.primary },
    { name: 'Operations', value: 800000, color: MODERN_COLORS.secondary },
    { name: 'Marketing', value: 500000, color: MODERN_COLORS.info },
    { name: 'Technology', value: 400000, color: MODERN_COLORS.success },
    { name: 'Other', value: 300000, color: MODERN_COLORS.warning },
  ];

  const monthlyComparisonData = useMemo(
    () =>
      ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((name, i) => ({
        name,
        Revenue: 2000000 + ((i * 137167) % 500000),
        Expenses: 1200000 + ((i * 211093) % 300000),
        Profit: 800000 + ((i * 97049) % 200000),
      })),
    [],
  );

  return (
    <div 
      className="min-h-full"
      style={{
        background: theme === 'dark' ? AXIOM.backgrounds.main : '#f8fafc',
      }}
    >
      {/* Ambient gradient orbs - ONLY IN DARK MODE */}
      {theme === 'dark' && (
        <>
          <div className="fixed top-20 left-20 w-96 h-96 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
          <div className="fixed bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-violet-600/5 to-fuchsia-600/5 rounded-full blur-[140px] animate-pulse pointer-events-none" style={{ animationDelay: '0.5s' }} />
        </>
      )}
      
      {/* Top Bar - AXIOM STYLED */}
      <motion.div
        {...AXIOM.animations.fadeInTop}
        className="sticky top-0 z-50 backdrop-blur-lg border-b px-4 sm:px-6 lg:px-8 py-4 sm:py-6"
        style={{
          background: theme === 'dark' 
            ? AXIOM.backgrounds.topBar
            : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
          borderBottom: theme === 'dark' 
            ? AXIOM.borders.topBar
            : '1px solid rgba(148, 163, 184, 0.2)',
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Header with Icon */}
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="p-3 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.cyan,
                boxShadow: AXIOM.shadows.iconCyan,
              }}
            >
              <BarChart3 className="size-6 text-white" />
            </div>
            <div>
              <h1 
                className="text-2xl sm:text-3xl lg:text-4xl font-bold"
                style={AXIOM.text.titleStyle}
              >
                Dashboard
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm line-clamp-2">Welcome back, here's your financial overview</p>
            </div>
          </div>

          {/* Action Buttons — native <button> so clicks always fire (framer motion.button can block in some builds) */}
          <div className="relative z-10 flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={openImportModal}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 min-h-11 touch-manipulation transition-transform hover:brightness-110 active:scale-[0.98]"
              style={AXIOM.buttons.secondary}
            >
              <Upload className="size-4 shrink-0" />
              Import
            </button>
            <button
              type="button"
              onClick={openQuickAddModal}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 min-h-11 touch-manipulation transition-transform hover:brightness-110 active:scale-[0.98]"
              style={AXIOM.buttons.action}
            >
              <Plus className="size-4 shrink-0" />
              <span className="hidden md:inline">Add Transaction</span>
              <span className="md:hidden">Add</span>
            </button>
            <button
              type="button"
              title="Settings"
              onClick={() => openOrgView('settings')}
              className="p-2 rounded-xl shrink-0 min-h-11 min-w-11 touch-manipulation transition-transform hover:brightness-110 active:scale-[0.98]"
              style={AXIOM.buttons.secondary}
            >
              <Settings className="size-5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {dataError && (
          <div
            className="mb-4 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-amber-100 text-sm font-mono border border-amber-500/35"
            style={{ background: 'rgba(245, 158, 11, 0.08)' }}
            role="alert"
          >
            <span>{dataError}</span>
            <button
              type="button"
              onClick={refreshDashboard}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs border border-amber-500/50 hover:bg-amber-500/15 transition-colors"
            >
              Try again
            </button>
          </div>
        )}
        {dataLoading && (
          <p className="mb-2 text-xs text-slate-500 font-mono" aria-live="polite">
            Updating dashboard…
          </p>
        )}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Content - Main Dashboard */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ModernKPICard
                icon={TrendingUp}
                label="Total Balance"
                value={totalBalance}
                currency="PKR"
                percentage="12.5%"
                trend="up"
                delay={0}
              />

              <ModernKPICard
                icon={Wallet}
                label="Cash in Hand"
                value={cashInHand}
                currency="PKR"
                percentage="8.2%"
                trend="up"
                delay={0.1}
              />

              <ModernKPICard
                icon={DollarSign}
                label="Monthly Profit"
                value={monthlyProfit}
                currency="PKR"
                percentage="15.7%"
                trend="up"
                delay={0.2}
              />

              <ModernKPICard
                icon={BarChart3}
                label="Net Worth"
                value={netWorth}
                currency="PKR"
                percentage="9.3%"
                trend="up"
                delay={0.3}
              />
            </div>

            {/* Revenue & Profit Analysis - EXACT FINANCE OS GRAPH */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ y: -4 }}
              className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8"
              style={{
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, rgba(15, 30, 60, 0.5) 0%, rgba(5, 10, 30, 0.7) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                border: theme === 'dark' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(59, 130, 246, 0.15)',
                boxShadow: theme === 'dark' 
                  ? '0 20px 60px -20px rgba(59, 130, 246, 0.5)'
                  : '0 4px 12px -2px rgba(59, 130, 246, 0.1)',
              }}
            >
              {/* Header */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="p-3 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.8)',
                    }}
                  >
                    <Activity className="size-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="text-base sm:text-xl font-bold"
                      style={{
                        color: theme === 'dark' ? '#ffffff' : '#1e293b',
                      }}
                    >
                      Revenue & Profit Analysis
                    </h3>
                    <p
                      className="text-xs sm:text-sm mt-0.5 line-clamp-2"
                      style={{
                        color: theme === 'dark' ? '#94a3b8' : '#64748b',
                      }}
                    >
                      Track your financial performance over time
                    </p>
                    <p className="text-[10px] sm:text-xs mt-1 font-mono text-slate-500">
                      Range: {selectedPeriod} · {profitData.length}{' '}
                      {profitData.length === 1 ? 'month shown' : 'months shown'}
                    </p>
                  </div>
                </div>
                
                {/* Period Toggles */}
                <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg border w-full md:w-auto"
                  style={{
                    background: theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgb(249, 250, 251)',
                    borderColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgb(229, 231, 235)',
                  }}
                >
                  {(['1W', '1M', '3M', '6M', '1Y'] as const).map((period) => (
                    <motion.button
                      type="button"
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all min-h-11 touch-manipulation"
                      style={{
                        background: selectedPeriod === period 
                          ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                          : 'transparent',
                        color: selectedPeriod === period 
                          ? '#ffffff'
                          : theme === 'dark' ? '#9ca3af' : '#6b7280',
                        boxShadow: selectedPeriod === period
                          ? '0 4px 12px -2px rgba(59, 130, 246, 0.5)'
                          : 'none',
                      }}
                    >
                      {period}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Finance OS Graph */}
              <div 
                className="relative p-3 sm:p-6 rounded-xl sm:rounded-2xl h-[240px] sm:h-[300px] md:h-[360px] lg:h-[400px]"
                style={{ 
                  background: theme === 'dark' 
                    ? 'rgba(0, 0, 0, 0.2)'
                    : 'rgba(255, 255, 255, 0.5)',
                  border: theme === 'dark'
                    ? '1px solid rgba(148, 163, 184, 0.1)'
                    : '1px solid rgba(148, 163, 184, 0.15)',
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsComposedChart data={profitData}>
                    <defs>
                      <linearGradient id="area-gradient-Revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={MODERN_COLORS.success} stopOpacity={0.6}/>
                        <stop offset="95%" stopColor={MODERN_COLORS.success} stopOpacity={0.02}/>
                      </linearGradient>
                      <linearGradient id="area-gradient-Expenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={MODERN_COLORS.warning} stopOpacity={0.6}/>
                        <stop offset="95%" stopColor={MODERN_COLORS.warning} stopOpacity={0.02}/>
                      </linearGradient>
                      <linearGradient id="area-gradient-Profit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={MODERN_COLORS.primary} stopOpacity={0.6}/>
                        <stop offset="95%" stopColor={MODERN_COLORS.primary} stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke={theme === 'dark' ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.1)'}
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="name" 
                      stroke={theme === 'dark' ? 'rgba(148, 163, 184, 0.6)' : 'rgba(100, 116, 139, 0.7)'}
                      style={{ fontSize: '12px', fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: theme === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)' }}
                    />
                    <YAxis 
                      stroke={theme === 'dark' ? 'rgba(148, 163, 184, 0.6)' : 'rgba(100, 116, 139, 0.7)'}
                      style={{ fontSize: '12px', fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: theme === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)' }}
                      tickFormatter={(value) => `₨${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)', 
                        border: `2px solid ${theme === 'dark' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.3)'}`,
                        backdropFilter: 'blur(20px)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                      }}
                      labelStyle={{ 
                        color: theme === 'dark' ? '#ffffff' : '#1e293b', 
                        fontWeight: 700, 
                        marginBottom: '8px',
                        fontSize: '13px'
                      }}
                      itemStyle={{
                        color: theme === 'dark' ? '#94a3b8' : '#64748b',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                      formatter={(value: any) => [`₨${(value / 1000).toFixed(1)}K`, '']}
                    />
                    
                    <Area
                      type="monotone"
                      dataKey="Revenue"
                      stroke={MODERN_COLORS.success}
                      strokeWidth={3}
                      fill="url(#area-gradient-Revenue)"
                      dot={{ 
                        fill: MODERN_COLORS.success, 
                        r: 4,
                        strokeWidth: 2,
                        stroke: theme === 'dark' ? '#0a0a0a' : '#ffffff'
                      }}
                      activeDot={{ 
                        r: 6, 
                        fill: MODERN_COLORS.success,
                        stroke: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                        strokeWidth: 3
                      }}
                      animationDuration={1500}
                    />
                    <Area
                      type="monotone"
                      dataKey="Expenses"
                      stroke={MODERN_COLORS.warning}
                      strokeWidth={3}
                      fill="url(#area-gradient-Expenses)"
                      dot={{ 
                        fill: MODERN_COLORS.warning, 
                        r: 4,
                        strokeWidth: 2,
                        stroke: theme === 'dark' ? '#0a0a0a' : '#ffffff'
                      }}
                      activeDot={{ 
                        r: 6, 
                        fill: MODERN_COLORS.warning,
                        stroke: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                        strokeWidth: 3
                      }}
                      animationDuration={1500}
                    />
                    <Area
                      type="monotone"
                      dataKey="Profit"
                      stroke={MODERN_COLORS.primary}
                      strokeWidth={3}
                      fill="url(#area-gradient-Profit)"
                      dot={{ 
                        fill: MODERN_COLORS.primary, 
                        r: 4,
                        strokeWidth: 2,
                        stroke: theme === 'dark' ? '#0a0a0a' : '#ffffff'
                      }}
                      activeDot={{ 
                        r: 6, 
                        fill: MODERN_COLORS.primary,
                        stroke: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                        strokeWidth: 3
                      }}
                      animationDuration={1500}
                    />
                  </RechartsComposedChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Grid: Department Performance & Expense Breakdown - BLUE THEME */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Performance - Bar Chart */}
              <ChartContainer
                title="Department Performance"
                subtitle="Revenue by department"
                icon={Users}
                borderColor="purple"
                iconColor="purple"
                delay={0.5}
              >
                <ModernBarChart
                  data={departmentData.slice(6)} // Last 6 months
                  dataKeys={[
                    { key: 'Development', color: MODERN_COLORS.primary, name: 'Development' },
                    { key: 'Design', color: MODERN_COLORS.secondary, name: 'Design' },
                    { key: 'Marketing', color: MODERN_COLORS.warning, name: 'Marketing' },
                    { key: 'Sales', color: MODERN_COLORS.success, name: 'Sales' },
                  ]}
                  height={280}
                  stacked={true}
                />
              </ChartContainer>

              {/* Expense Categories - Donut Chart */}
              <ChartContainer
                title="Expense Categories"
                subtitle="Spending breakdown by category"
                icon={PieChartIcon}
                borderColor="pink"
                iconColor="pink"
                delay={0.6}
              >
                <DonutChart
                  data={expenseCategoryData}
                  height={280}
                  innerRadius={70}
                  outerRadius={100}
                />
              </ChartContainer>
            </div>

            {/* Monthly Comparison - Combo Chart - BLUE THEME */}
            <ChartContainer
              title="Monthly Comparison"
              subtitle="Revenue vs Expenses with Profit trend"
              icon={BarChart3}
              borderColor="green"
              iconColor="green"
              delay={0.7}
            >
              <ComboChart
                data={monthlyComparisonData}
                barKeys={[
                  { key: 'Revenue', color: MODERN_COLORS.success, name: 'Revenue' },
                  { key: 'Expenses', color: MODERN_COLORS.danger, name: 'Expenses' },
                ]}
                lineKeys={[
                  { key: 'Profit', color: MODERN_COLORS.primary, name: 'Profit' },
                ]}
                height={300}
              />
            </ChartContainer>

            {/* Account Balances - UNIFIED BLUE THEME */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8"
              style={{
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, rgba(15, 30, 60, 0.5) 0%, rgba(5, 10, 30, 0.7) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                border: theme === 'dark' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(59, 130, 246, 0.15)',
                boxShadow: theme === 'dark' 
                  ? '0 20px 60px -20px rgba(59, 130, 246, 0.5)'
                  : '0 4px 12px -2px rgba(59, 130, 246, 0.1)',
              }}
            >
              {/* Header with Icon Box - BLUE THEME */}
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="p-3 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.8)',
                  }}
                >
                  <Wallet className="size-5 text-white" />
                </div>
                <div>
                  <h3 
                    className="text-xl font-bold"
                    style={{
                      color: theme === 'dark' ? '#ffffff' : '#1e293b',
                    }}
                  >
                    Account Balances
                  </h3>
                  <p className="text-sm" style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
                    All connected accounts
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accountsLoading && bankAccounts.length === 0 && (
                  <>
                    <p
                      className="md:col-span-2 text-sm font-mono text-slate-500 mb-1"
                      aria-live="polite"
                    >
                      Loading accounts…
                    </p>
                    {[0, 1, 2, 3].map((sk) => (
                      <div
                        key={`acct-skel-${sk}`}
                        className="p-4 rounded-xl border border-slate-600/30 animate-pulse"
                        style={{
                          background:
                            theme === 'dark' ? 'rgba(15, 30, 60, 0.35)' : 'rgba(248, 250, 252, 0.9)',
                        }}
                        aria-hidden
                      >
                        <div className="h-4 w-2/3 rounded bg-slate-600/35 mb-3" />
                        <div className="h-3 w-1/3 rounded bg-slate-600/30 mb-4" />
                        <div className="h-8 w-1/2 rounded bg-slate-600/40" />
                      </div>
                    ))}
                  </>
                )}
                {!accountsLoading && bankAccounts.length === 0 && (
                  <div
                    className="md:col-span-2 rounded-xl p-6 text-center border border-dashed border-slate-500/40"
                    style={{
                      background: theme === 'dark' ? 'rgba(15, 23, 42, 0.35)' : 'rgba(248, 250, 252, 0.9)',
                    }}
                  >
                    <p className="text-sm font-mono text-slate-500">
                      No accounts yet. Add accounts under{' '}
                      <span className="text-blue-400">Accounts &amp; Wallets</span> in the sidebar.
                    </p>
                  </div>
                )}
                {bankAccounts.slice(0, 4).map((account, index) => (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="group p-4 rounded-xl border transition-all cursor-pointer"
                    style={{
                      background: theme === 'dark' 
                        ? 'rgba(15, 30, 60, 0.3)'
                        : 'rgba(255, 255, 255, 0.7)',
                      borderColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold mb-1" style={{ color: theme === 'dark' ? '#e2e8f0' : '#475569' }}>
                          {account.bankName || 'Account'}
                        </p>
                        <p className="text-xs" style={{ color: theme === 'dark' ? '#94a3b8' : '#94a3b8' }}>
                          ••• {account.accountNumber?.slice(-4) || '0000'}
                        </p>
                      </div>
                      <div 
                        className="px-2 py-1 rounded-md text-xs font-bold border"
                        style={{
                          background: account.accountType !== 'credit'
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(16, 185, 129, 0.15)',
                          color: account.accountType !== 'credit'
                            ? '#60a5fa'
                            : '#34d399',
                          borderColor: account.accountType !== 'credit'
                            ? 'rgba(59, 130, 246, 0.3)'
                            : 'rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        {account.accountType}
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <p 
                          className="text-xl font-bold"
                          style={{ color: theme === 'dark' ? '#ffffff' : '#1e293b' }}
                        >
                          {formatCurrency(account.balance, account.currency, { compact: true })}
                        </p>
                      </div>
                      <Sparkline 
                        data={[45, 52, 38, 45, 55, 60, 58]} 
                        color={MODERN_COLORS.success}
                        trend="up"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Sidebar - Widgets - BLUE THEME */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            {/* Quick Actions - BLUE THEME */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ y: -4 }}
              className="relative overflow-hidden rounded-3xl p-6"
              style={{
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, rgba(15, 30, 60, 0.5) 0%, rgba(5, 10, 30, 0.7) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                border: theme === 'dark' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(59, 130, 246, 0.15)',
                boxShadow: theme === 'dark' 
                  ? '0 20px 60px -20px rgba(59, 130, 246, 0.5)'
                  : '0 4px 12px -2px rgba(59, 130, 246, 0.1)',
              }}
            >
              {/* Header with Icon */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="p-2.5 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    boxShadow: '0 8px 20px -8px rgba(59, 130, 246, 0.6)',
                  }}
                >
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <h3 
                  className="text-base font-bold"
                  style={{ color: theme === 'dark' ? '#ffffff' : '#1e293b' }}
                >
                  Quick Actions
                </h3>
              </div>
              
              <div className="relative z-10 space-y-3">
                <button
                  type="button"
                  onClick={openQuickAddModal}
                  className="w-full p-3 rounded-xl text-white text-sm font-bold flex items-center justify-between group min-h-11 touch-manipulation transition-transform hover:brightness-110 active:scale-[0.99]"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    boxShadow: '0 4px 16px -4px rgba(59, 130, 246, 0.5)',
                  }}
                >
                  <span>Add Transaction</span>
                  <Plus className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={openImportModal}
                  className="w-full p-3 rounded-xl text-sm font-bold flex items-center justify-between group min-h-11 touch-manipulation transition-transform hover:brightness-110 active:scale-[0.99]"
                  style={{
                    background: theme === 'dark'
                      ? 'rgba(15, 30, 60, 0.3)'
                      : 'rgba(255, 255, 255, 0.8)',
                    border: theme === 'dark'
                      ? '1px solid rgba(59, 130, 246, 0.3)'
                      : '1px solid rgba(148, 163, 184, 0.2)',
                    color: theme === 'dark' ? '#60a5fa' : '#3b82f6',
                  }}
                >
                  <span>Import Statement</span>
                  <Upload className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={() => openOrgView('profit-intelligence')}
                  className="w-full p-3 rounded-xl text-sm font-bold flex items-center justify-between group min-h-11 touch-manipulation transition-transform hover:brightness-110 active:scale-[0.99]"
                  style={{
                    background: theme === 'dark'
                      ? 'rgba(15, 30, 60, 0.3)'
                      : 'rgba(255, 255, 255, 0.8)',
                    border: theme === 'dark'
                      ? '1px solid rgba(59, 130, 246, 0.3)'
                      : '1px solid rgba(148, 163, 184, 0.2)',
                    color: theme === 'dark' ? '#60a5fa' : '#3b82f6',
                  }}
                >
                  <span>View Analytics</span>
                  <BarChart3 className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </motion.div>

            {/* Progress Rings - Goals - BLUE THEME */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ y: -4 }}
              className="relative overflow-hidden rounded-3xl p-6"
              style={{
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, rgba(15, 30, 60, 0.5) 0%, rgba(5, 10, 30, 0.7) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                border: theme === 'dark' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(59, 130, 246, 0.15)',
                boxShadow: theme === 'dark' 
                  ? '0 20px 60px -20px rgba(59, 130, 246, 0.5)'
                  : '0 4px 12px -2px rgba(59, 130, 246, 0.1)',
              }}
            >
              {/* Header with Icon */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="p-2.5 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    boxShadow: '0 8px 20px -8px rgba(59, 130, 246, 0.6)',
                  }}
                >
                  <Target className="w-4 h-4 text-white" />
                </div>
                <h3 
                  className="text-base font-bold"
                  style={{ color: theme === 'dark' ? '#ffffff' : '#1e293b' }}
                >
                  Monthly Goals
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <ProgressRing 
                  value={75} 
                  max={100} 
                  label="Revenue"
                  color={MODERN_COLORS.success}
                  size={100}
                />
                <ProgressRing 
                  value={60} 
                  max={100} 
                  label="Savings"
                  color={MODERN_COLORS.primary}
                  size={100}
                />
              </div>
            </motion.div>

            {/* Recent Activity */}
            <ModernSidebarWidget
              title="Recent Activity"
              icon={Activity}
              items={recentTransactions}
              delay={0.6}
              emptyLabel="No recent transactions yet."
            />

            {/* Upcoming Payments */}
            <ModernSidebarWidget
              title="Upcoming Payments"
              icon={Calendar}
              items={upcomingPayments}
              delay={0.7}
              emptyLabel="No upcoming debits in this list yet."
            />
          </div>
        </div>
      </div>

      <Dialog
        open={quickAddOpen}
        onOpenChange={(open) => {
          setQuickAddOpen(open);
          if (!open) refreshDashboard();
        }}
      >
        <DialogContent
          className={cn(
            'max-h-[min(90vh,100dvh)] w-full max-w-[min(100vw-1rem,42rem)] overflow-y-auto overflow-x-hidden border-slate-700 bg-slate-950 p-4 text-slate-100 sm:max-w-2xl sm:p-6',
            theme === 'light' && 'border-slate-200 bg-white text-slate-900',
          )}
        >
          <DialogHeader>
            <DialogTitle>Quick add</DialogTitle>
            <DialogDescription
              className={theme === 'dark' ? 'text-slate-400' : undefined}
            >
              Add income or expense without leaving the dashboard.
            </DialogDescription>
          </DialogHeader>
          <QuickAdd
            embedded
            onClose={() => {
              setQuickAddOpen(false);
              refreshDashboard();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) refreshDashboard();
        }}
      >
        <DialogContent
          className={cn(
            'flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl',
            'border-slate-700 bg-slate-950 text-slate-100',
            theme === 'light' && 'border-slate-200 bg-white text-slate-900',
          )}
        >
          <DialogHeader className="shrink-0 space-y-1 border-b border-slate-800 p-6 pb-4 text-left">
            <DialogTitle>Import statement</DialogTitle>
            <DialogDescription
              className={theme === 'dark' ? 'text-slate-400' : undefined}
            >
              Upload a CSV or spreadsheet to import transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            <EnhancedStatementImport embedded key={importKey} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}