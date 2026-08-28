import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Calendar,
  Percent,
  Building2,
  PieChart,
  FileSpreadsheet,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  ChevronRight,
  CircleDollarSign,
  Scale,
  Wallet,
  Users
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { toast } from 'sonner';
import { AXIOM } from '../../../styles/axiom-tokens';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService } from '@/hooks/useService';
import type { DepartmentProfitability, ProfitLossReport } from '@/services/types';

// Report data — fetched from reportService, with inline fallbacks
const profitLossData = {
  period: { from: '2026-01-01', to: '2026-01-31' },
  revenue: {
    'Client Projects': 1500000,
    'Consulting': 450000,
    'Retainer Fees': 800000,
    'Other Income': 100000
  },
  expenses: {
    'Salaries & Wages': 1200000,
    'Office Rent': 200000,
    'Software & Tools': 120000,
    'Marketing': 150000,
    'Utilities': 45000,
    'Travel': 80000,
    'Professional Fees': 65000,
    'Miscellaneous': 40000
  }
};

const balanceSheetData = {
  asOfDate: '2026-01-31',
  assets: {
    current: {
      'Cash & Bank': 2500000,
      'Accounts Receivable': 1200000,
      'Prepaid Expenses': 150000
    },
    fixed: {
      'Equipment': 800000,
      'Furniture': 300000,
      'Less: Depreciation': -200000
    }
  },
  liabilities: {
    current: {
      'Accounts Payable': 450000,
      'Accrued Expenses': 200000,
      'Short-term Loans': 300000
    },
    longTerm: {
      'Long-term Loans': 1500000
    }
  },
  equity: {
    'Owner\'s Capital': 2000000,
    'Retained Earnings': 300000
  }
};

const cashFlowData = {
  period: { from: '2026-01-01', to: '2026-01-31' },
  operating: {
    'Cash from Clients': 2200000,
    'Payments to Suppliers': -450000,
    'Salary Payments': -1200000,
    'Operating Expenses': -380000
  },
  investing: {
    'Equipment Purchase': -150000,
    'Asset Sales': 50000
  },
  financing: {
    'Loan Received': 500000,
    'Loan Repayment': -100000,
    'Owner Withdrawal': -200000
  }
};

const monthlyTrendData = [
  { month: 'Aug', revenue: 2200000, expenses: 1600000, profit: 600000 },
  { month: 'Sep', revenue: 2500000, expenses: 1700000, profit: 800000 },
  { month: 'Oct', revenue: 2300000, expenses: 1650000, profit: 650000 },
  { month: 'Nov', revenue: 2700000, expenses: 1800000, profit: 900000 },
  { month: 'Dec', revenue: 2600000, expenses: 1750000, profit: 850000 },
  { month: 'Jan', revenue: 2850000, expenses: 1900000, profit: 950000 }
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

function escapeCsvCell(v: string | number): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

function downloadCsvFile(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function profitLossToCsv(pl: ProfitLossReport): string {
  const rows: (string | number)[][] = [
    ['Report', 'Profit & Loss'],
    ['Period', pl.period],
    [],
    ['REVENUE'],
    ...pl.revenue.map((r) => [r.name, r.amount]),
    ['Total revenue', pl.totalRevenue],
    [],
    ['COST OF GOODS SOLD'],
    ...pl.cogs.map((r) => [r.name, r.amount]),
    ['Total COGS', pl.totalCOGS],
    ['Gross profit', pl.grossProfit],
    [],
    ['OPERATING EXPENSES'],
    ...pl.operatingExpenses.map((r) => [r.name, r.amount]),
    ['Total operating expenses', pl.totalOperatingExpenses],
    [],
    ['Operating income', pl.operatingIncome],
    ['Net income', pl.netIncome],
  ];
  return rowsToCsv(rows);
}

function departmentsToCsv(depts: DepartmentProfitability[]): string {
  const rows: (string | number)[][] = [
    ['Department', 'Revenue', 'Direct costs', 'Overhead', 'Net profit', 'Margin %', 'Headcount'],
    ...depts.map((d) => [
      d.departmentName,
      d.revenue,
      d.directCosts,
      d.allocatedOverhead,
      d.netProfit,
      Math.round(d.profitMargin * 10) / 10,
      d.headcount,
    ]),
  ];
  return rowsToCsv(rows);
}

type ReportView = 'overview' | 'pl' | 'balance' | 'cashflow' | 'department';

export function ReportsView() {
  const svc = useOrgServices();
  const [activeView, setActiveView] = useState<ReportView>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-01-31');

  const { data: plReport, loading: plLoading, error: plError, refetch: refetchPl } = useService(
    () => svc.reports.getProfitLoss(dateFrom, dateTo),
    [dateFrom, dateTo, svc.orgId]
  );
  const { data: deptProfit, loading: deptLoading, error: deptError, refetch: refetchDept } = useService(
    () => svc.departments.getProfitability(),
    [svc.orgId]
  );

  // P&L Calculations
  const totalRevenue = Object.values(profitLossData.revenue).reduce((sum, val) => sum + val, 0);
  const totalExpenses = Object.values(profitLossData.expenses).reduce((sum, val) => sum + val, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = (netProfit / totalRevenue) * 100;

  // Balance Sheet Calculations
  const totalCurrentAssets = Object.values(balanceSheetData.assets.current).reduce((sum, val) => sum + val, 0);
  const totalFixedAssets = Object.values(balanceSheetData.assets.fixed).reduce((sum, val) => sum + val, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const totalCurrentLiabilities = Object.values(balanceSheetData.liabilities.current).reduce((sum, val) => sum + val, 0);
  const totalLongTermLiabilities = Object.values(balanceSheetData.liabilities.longTerm).reduce((sum, val) => sum + val, 0);
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

  const totalEquity = Object.values(balanceSheetData.equity).reduce((sum, val) => sum + val, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Cash Flow Calculations
  const operatingCashFlow = Object.values(cashFlowData.operating).reduce((sum, val) => sum + val, 0);
  const investingCashFlow = Object.values(cashFlowData.investing).reduce((sum, val) => sum + val, 0);
  const financingCashFlow = Object.values(cashFlowData.financing).reduce((sum, val) => sum + val, 0);
  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

  const departmentRows = (deptProfit ?? []).map((d) => ({
    key: d.departmentId,
    name: d.departmentName,
    revenue: d.revenue,
    cost: d.directCosts,
    profit: d.netProfit,
    margin: d.profitMargin,
    headcount: d.headcount,
    avgRate: d.revenuePerHead,
  }));

  const totalDeptRevenue = departmentRows.reduce((sum, d) => sum + d.revenue, 0);
  const totalDeptCost = departmentRows.reduce((sum, d) => sum + d.cost, 0);
  const totalDeptProfit = departmentRows.reduce((sum, d) => sum + d.profit, 0);

  const departmentChartRows = departmentRows.map((d) => ({
    name: d.name,
    revenue: d.revenue,
    cost: d.cost,
    profit: d.profit,
  }));

  const exportCsv = async (reportLabel: string, buildCsv: () => string) => {
    try {
      const csv = buildCsv();
      const safe =
        reportLabel
          .replace(/[^\w\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-') || 'report';
      downloadCsvFile(`${safe}-${dateFrom}.csv`, csv);
      toast.success(`${reportLabel} downloaded`);
    } catch {
      toast.error('Could not export. Try again.');
    }
  };

  const exportAllReports = () =>
    exportCsv('All reports', () => {
      const parts: string[] = [];
      if (plReport) parts.push(profitLossToCsv(plReport));
      if (deptProfit?.length) parts.push(departmentsToCsv(deptProfit));
      if (!parts.length) {
        parts.push(rowsToCsv([['Note', 'No live report data for this org yet — export includes overview snapshot only'], []]));
      }
      parts.push(rowsToCsv([['Overview snapshot (demo totals)', ''], ['Total revenue (demo)', totalRevenue], ['Total expenses (demo)', totalExpenses]]));
      return parts.join('\r\n\r\n');
    });

  // Prepare chart data
  const revenueChartData = Object.entries(profitLossData.revenue).map(([name, value]) => ({
    name,
    value,
    percentage: ((value / totalRevenue) * 100).toFixed(1)
  }));

  const expenseChartData = Object.entries(profitLossData.expenses).map(([name, value]) => ({
    name,
    value,
    percentage: ((value / totalExpenses) * 100).toFixed(1)
  }));

  const plRevenueChartData = plReport
    ? plReport.revenue.map((r) => ({
        name: r.name,
        value: r.amount,
        percentage: (plReport.totalRevenue > 0 ? (r.amount / plReport.totalRevenue) * 100 : 0).toFixed(1),
      }))
    : revenueChartData;

  const plExpenseChartData = plReport
    ? [...plReport.cogs, ...plReport.operatingExpenses].map((r) => {
        const tot = plReport.totalCOGS + plReport.totalOperatingExpenses;
        return {
          name: r.name,
          value: r.amount,
          percentage: (tot > 0 ? (r.amount / tot) * 100 : 0).toFixed(1),
        };
      })
    : expenseChartData;

  const plNetMarginPct =
    plReport && plReport.totalRevenue > 0
      ? (plReport.netIncome / plReport.totalRevenue) * 100
      : profitMargin;

  const viewButtons = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'pl' as const, label: 'P&L Statement', icon: TrendingUp },
    { id: 'balance' as const, label: 'Balance Sheet', icon: Scale },
    { id: 'cashflow' as const, label: 'Cash Flow', icon: Wallet },
    { id: 'department' as const, label: 'Department P&L', icon: Users },
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
              <FileText className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle}>
                Financial Reports
              </h1>
              <p className="text-slate-400 text-sm">Comprehensive financial statements and analytics</p>
            </div>
          </div>
          <div className="flex gap-3">
            <motion.select
              whileHover={{ scale: 1.02 }}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={AXIOM.buttons.secondary}
            >
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </motion.select>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={AXIOM.buttons.secondary}
              onClick={() => {
                void refetchPl();
                void refetchDept();
              }}
            >
              <RefreshCw className="size-4" />
              Refresh
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => void exportAllReports()}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                color: '#ffffff',
              }}
            >
              <Download className="size-4" />
              Export All
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
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
              <p className="text-slate-400 text-sm mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="size-3 text-green-400" />
                <p className="text-xs text-green-400">+12.5% from last month</p>
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
              <p className="text-slate-400 text-sm mb-1">Total Expenses</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(totalExpenses)}</p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="size-3 text-red-400" />
                <p className="text-xs text-red-400">+8.3% from last month</p>
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
              <p className="text-slate-400 text-sm mb-1">Net Profit</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(netProfit)}</p>
              <div className="flex items-center gap-1 mt-2">
                <Percent className="size-3 text-cyan-400" />
                <p className="text-xs text-cyan-400">{profitMargin.toFixed(1)}% margin</p>
              </div>
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.chartPurple}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Net Worth</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(netWorth)}</p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="size-3 text-purple-400" />
                <p className="text-xs text-purple-400">Total equity value</p>
              </div>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.purple,
                boxShadow: AXIOM.shadows.iconPurple,
              }}
            >
              <CircleDollarSign className="size-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

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

      {/* Report Content */}
      {activeView === 'overview' && (
        <div className="space-y-4">
          {/* Monthly Trend Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.chartPurple}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">6-Month Financial Trend</h3>
                <p className="text-sm text-slate-400 mt-1">Revenue, Expenses & Profit Analysis</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() =>
                  void exportCsv('6-month-trend', () =>
                    rowsToCsv([
                      ['Month', 'Revenue', 'Expenses', 'Profit'],
                      ...monthlyTrendData.map((m) => [m.month, m.revenue, m.expenses, m.profit]),
                    ])
                  )
                }
                className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2"
                style={AXIOM.buttons.secondary}
              >
                <Download className="size-3" />
                Export
              </motion.button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.red} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.red} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.green} stopOpacity={0}/>
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
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
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
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Area type="monotone" dataKey="revenue" stroke={COLORS.cyan} strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke={COLORS.red} strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" name="Expenses" />
                <Area type="monotone" dataKey="profit" stroke={COLORS.green} strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Quick Links to Reports */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={() => setActiveView('pl')}
              className="p-6 rounded-2xl cursor-pointer group"
              style={AXIOM.containers.list}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: AXIOM.iconBoxes.cyan,
                      boxShadow: AXIOM.shadows.iconCyan,
                    }}
                  >
                    <TrendingUp className="size-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">Profit & Loss Statement</h3>
                    <p className="text-sm text-slate-400">Revenue vs Expenses analysis</p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <p className="text-xs text-slate-500">Revenue</p>
                  <p className="text-lg font-bold text-green-400">{formatCurrency(totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Expenses</p>
                  <p className="text-lg font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Net Profit</p>
                  <p className="text-lg font-bold text-cyan-400">{formatCurrency(netProfit)}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              onClick={() => setActiveView('balance')}
              className="p-6 rounded-2xl cursor-pointer group"
              style={AXIOM.containers.list}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: AXIOM.iconBoxes.purple,
                      boxShadow: AXIOM.shadows.iconPurple,
                    }}
                  >
                    <Scale className="size-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">Balance Sheet</h3>
                    <p className="text-sm text-slate-400">Assets, Liabilities & Equity</p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-slate-400 group-hover:text-purple-400 transition-colors" />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <p className="text-xs text-slate-500">Assets</p>
                  <p className="text-lg font-bold text-cyan-400">{formatCurrency(totalAssets)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Liabilities</p>
                  <p className="text-lg font-bold text-red-400">{formatCurrency(totalLiabilities)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Equity</p>
                  <p className="text-lg font-bold text-purple-400">{formatCurrency(totalEquity)}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={() => setActiveView('cashflow')}
              className="p-6 rounded-2xl cursor-pointer group"
              style={AXIOM.containers.list}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: AXIOM.iconBoxes.green,
                      boxShadow: AXIOM.shadows.iconGreen,
                    }}
                  >
                    <Wallet className="size-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">Cash Flow Statement</h3>
                    <p className="text-sm text-slate-400">Operating, Investing & Financing</p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-slate-400 group-hover:text-green-400 transition-colors" />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <p className="text-xs text-slate-500">Operating</p>
                  <p className="text-lg font-bold text-green-400">{formatCurrency(operatingCashFlow)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Investing</p>
                  <p className="text-lg font-bold text-amber-400">{formatCurrency(investingCashFlow)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Financing</p>
                  <p className="text-lg font-bold text-blue-400">{formatCurrency(financingCashFlow)}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              onClick={() => setActiveView('department')}
              className="p-6 rounded-2xl cursor-pointer group"
              style={AXIOM.containers.list}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: AXIOM.iconBoxes.amber,
                      boxShadow: AXIOM.shadows.iconAmber,
                    }}
                  >
                    <Users className="size-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">Department P&L</h3>
                    <p className="text-sm text-slate-400">Performance by department</p>
                  </div>
                </div>
                <ChevronRight className="size-5 text-slate-400 group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <p className="text-xs text-slate-500">Total Revenue</p>
                  <p className="text-lg font-bold text-green-400">{formatCurrency(totalDeptRevenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Cost</p>
                  <p className="text-lg font-bold text-red-400">{formatCurrency(totalDeptCost)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Profit</p>
                  <p className="text-lg font-bold text-amber-400">{formatCurrency(totalDeptProfit)}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {activeView === 'pl' && (
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.list}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white">Profit & Loss Statement</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {plReport?.period
                    ? `Period: ${plReport.period}`
                    : `For the period: ${formatDate(dateFrom)} to ${formatDate(dateTo)}`}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() =>
                  void exportCsv('P-L-Statement', () =>
                    plReport
                      ? profitLossToCsv(plReport)
                      : rowsToCsv([['Message', 'Report not loaded yet — use Refresh and try again']])
                  )
                }
                className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                  border: '1px solid rgba(6, 182, 212, 0.5)',
                  boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                  color: '#ffffff',
                }}
              >
                <Download className="size-4" />
                Export CSV
              </motion.button>
            </div>

            {plLoading && (
              <p className="text-slate-400 text-center py-12">Loading this report…</p>
            )}

            {plError && (
              <div className="text-center py-8 space-y-3">
                <p className="text-red-300">{plError}</p>
                <button
                  type="button"
                  onClick={() => void refetchPl()}
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={AXIOM.buttons.secondary}
                >
                  Try again
                </button>
              </div>
            )}

            {!plLoading && !plError && plReport && (
              <div className="space-y-6">
                {plReport.revenue.length === 0 &&
                  plReport.cogs.length === 0 &&
                  plReport.operatingExpenses.length === 0 &&
                  plReport.totalRevenue === 0 && (
                    <p className="text-slate-400 text-sm mb-2">
                      No income or expense accounts with balances yet — connect your chart of accounts or add activity to see this report.
                    </p>
                  )}

                <div>
                  <div
                    className="flex items-center justify-between mb-3 pb-2"
                    style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}
                  >
                    <h4 className="text-lg font-bold text-white">REVENUE</h4>
                  </div>
                  <div className="space-y-2">
                    {plReport.revenue.map((line) => (
                      <div
                        key={line.accountId}
                        className="flex items-center justify-between py-2 px-4 rounded-lg hover:bg-black/20 transition-colors"
                      >
                        <span className="text-slate-300">{line.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-slate-400 w-16 text-right">
                            {plReport.totalRevenue > 0
                              ? ((line.amount / plReport.totalRevenue) * 100).toFixed(1)
                              : '0.0'}
                            %
                          </span>
                          <span className="text-white font-medium w-32 text-right">
                            {formatCurrency(line.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div
                      className="flex items-center justify-between pt-3 mt-2"
                      style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}
                    >
                      <span className="text-white font-bold">Total Revenue</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400 w-16 text-right">100%</span>
                        <span className="text-green-400 font-bold w-32 text-right">
                          {formatCurrency(plReport.totalRevenue)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div
                    className="flex items-center justify-between mb-3 pb-2"
                    style={{
                      borderTop: '2px solid rgba(148, 163, 184, 0.1)',
                      paddingTop: '24px',
                      borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                    }}
                  >
                    <h4 className="text-lg font-bold text-white">COST OF GOODS SOLD</h4>
                  </div>
                  <div className="space-y-2">
                    {plReport.cogs.map((line) => (
                      <div
                        key={line.accountId}
                        className="flex items-center justify-between py-2 px-4 rounded-lg hover:bg-black/20 transition-colors"
                      >
                        <span className="text-slate-300">{line.name}</span>
                        <span className="text-white font-medium w-32 text-right">
                          {formatCurrency(line.amount)}
                        </span>
                      </div>
                    ))}
                    <div
                      className="flex items-center justify-between pt-3 mt-2"
                      style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}
                    >
                      <span className="text-white font-bold">Total COGS</span>
                      <span className="text-red-400 font-bold w-32 text-right">
                        {formatCurrency(plReport.totalCOGS)}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{
                    background: 'rgba(148, 163, 184, 0.08)',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                  }}
                >
                  <span className="text-white font-bold">Gross profit</span>
                  <span className="text-cyan-400 font-bold">{formatCurrency(plReport.grossProfit)}</span>
                </div>

                <div>
                  <div
                    className="flex items-center justify-between mb-3 pb-2"
                    style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}
                  >
                    <h4 className="text-lg font-bold text-white">OPERATING EXPENSES</h4>
                  </div>
                  <div className="space-y-2">
                    {plReport.operatingExpenses.map((line) => {
                      const denom = plReport.totalCOGS + plReport.totalOperatingExpenses;
                      return (
                        <div
                          key={line.accountId}
                          className="flex items-center justify-between py-2 px-4 rounded-lg hover:bg-black/20 transition-colors"
                        >
                          <span className="text-slate-300">{line.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-slate-400 w-16 text-right">
                              {denom > 0 ? ((line.amount / denom) * 100).toFixed(1) : '0.0'}%
                            </span>
                            <span className="text-white font-medium w-32 text-right">
                              {formatCurrency(line.amount)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div
                      className="flex items-center justify-between pt-3 mt-2"
                      style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}
                    >
                      <span className="text-white font-bold">Total operating expenses</span>
                      <span className="text-red-400 font-bold w-32 text-right">
                        {formatCurrency(plReport.totalOperatingExpenses)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4" style={{ borderTop: '2px solid rgba(148, 163, 184, 0.2)' }}>
                  <div
                    className="flex items-center justify-between p-6 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                    }}
                  >
                    <span className="text-xl font-bold text-white">NET INCOME</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-cyan-400 w-16 text-right">
                        {plNetMarginPct.toFixed(1)}%
                      </span>
                      <span
                        className={`text-2xl font-bold w-32 text-right ${
                          plReport.netIncome >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {formatCurrency(plReport.netIncome)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {!plLoading && !plError && plReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-6 rounded-2xl"
                style={AXIOM.containers.chartGreen}
              >
                <h4 className="text-lg font-bold text-white mb-4">Revenue Breakdown</h4>
                {plRevenueChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={plRevenueChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percentage }: { percentage?: string }) => `${percentage ?? ''}%`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {plRevenueChartData.map((_, index) => (
                          <Cell
                            key={`rv-${index}`}
                            fill={Object.values(COLORS)[index % Object.values(COLORS).length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: AXIOM.charts.tooltip.backgroundColor,
                          border: AXIOM.charts.tooltip.border,
                          borderRadius: AXIOM.charts.tooltip.borderRadius,
                          color: '#fff',
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-sm py-8 text-center">Nothing to chart for revenue yet.</p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="p-6 rounded-2xl"
                style={AXIOM.containers.chartRed}
              >
                <h4 className="text-lg font-bold text-white mb-4">Cost & expense breakdown</h4>
                {plExpenseChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={plExpenseChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percentage }: { percentage?: string }) => `${percentage ?? ''}%`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {plExpenseChartData.map((_, index) => (
                          <Cell
                            key={`ex-${index}`}
                            fill={Object.values(COLORS)[index % Object.values(COLORS).length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: AXIOM.charts.tooltip.backgroundColor,
                          border: AXIOM.charts.tooltip.border,
                          borderRadius: AXIOM.charts.tooltip.borderRadius,
                          color: '#fff',
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                    </RePieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-sm py-8 text-center">Nothing to chart for costs yet.</p>
                )}
              </motion.div>
            </div>
          )}
        </div>
      )}

      {activeView === 'balance' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white">Balance Sheet</h3>
              <p className="text-sm text-slate-400 mt-1">
                As of {formatDate(balanceSheetData.asOfDate)}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() =>
                void exportCsv('Balance-Sheet', () =>
                  rowsToCsv([
                    ['As of', balanceSheetData.asOfDate],
                    [],
                    ['Current assets'],
                    ...Object.entries(balanceSheetData.assets.current).map(([k, v]) => [k, v]),
                    ['Fixed assets'],
                    ...Object.entries(balanceSheetData.assets.fixed).map(([k, v]) => [k, v]),
                    ['Total assets', totalAssets],
                    [],
                    ['Current liabilities'],
                    ...Object.entries(balanceSheetData.liabilities.current).map(([k, v]) => [k, v]),
                    ['Long-term liabilities'],
                    ...Object.entries(balanceSheetData.liabilities.longTerm).map(([k, v]) => [k, v]),
                    ['Equity'],
                    ...Object.entries(balanceSheetData.equity).map(([k, v]) => [k, v]),
                  ])
                )
              }
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                color: '#ffffff',
              }}
            >
              <Download className="size-4" />
              Export CSV
            </motion.button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Assets */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-white mb-3 pb-2" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                  ASSETS
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-2">Current Assets</p>
                    <div className="space-y-2 pl-4">
                      {Object.entries(balanceSheetData.assets.current).map(([item, amount]) => (
                        <div key={item} className="flex justify-between py-1">
                          <span className="text-slate-300">{item}</span>
                          <span className="text-white font-medium">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span className="text-white font-medium">Total Current Assets</span>
                        <span className="text-cyan-400 font-bold">
                          {formatCurrency(totalCurrentAssets)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-2">Fixed Assets</p>
                    <div className="space-y-2 pl-4">
                      {Object.entries(balanceSheetData.assets.fixed).map(([item, amount]) => (
                        <div key={item} className="flex justify-between py-1">
                          <span className="text-slate-300">{item}</span>
                          <span className={`font-medium ${amount < 0 ? 'text-red-400' : 'text-white'}`}>
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span className="text-white font-medium">Total Fixed Assets</span>
                        <span className="text-cyan-400 font-bold">
                          {formatCurrency(totalFixedAssets)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4" style={{ borderTop: '2px solid rgba(148, 163, 184, 0.2)' }}>
                    <div 
                      className="flex justify-between p-4 rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                      }}
                    >
                      <span className="text-lg font-bold text-white">TOTAL ASSETS</span>
                      <span className="text-lg font-bold text-cyan-400">
                        {formatCurrency(totalAssets)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-white mb-3 pb-2" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                  LIABILITIES & EQUITY
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-2">Current Liabilities</p>
                    <div className="space-y-2 pl-4">
                      {Object.entries(balanceSheetData.liabilities.current).map(([item, amount]) => (
                        <div key={item} className="flex justify-between py-1">
                          <span className="text-slate-300">{item}</span>
                          <span className="text-white font-medium">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span className="text-white font-medium">Total Current Liabilities</span>
                        <span className="text-red-400 font-bold">
                          {formatCurrency(totalCurrentLiabilities)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-2">Long-term Liabilities</p>
                    <div className="space-y-2 pl-4">
                      {Object.entries(balanceSheetData.liabilities.longTerm).map(([item, amount]) => (
                        <div key={item} className="flex justify-between py-1">
                          <span className="text-slate-300">{item}</span>
                          <span className="text-white font-medium">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span className="text-white font-medium">Total Long-term Liabilities</span>
                        <span className="text-red-400 font-bold">
                          {formatCurrency(totalLongTermLiabilities)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                    <div className="flex justify-between mb-2">
                      <span className="text-white font-bold">Total Liabilities</span>
                      <span className="text-red-400 font-bold">
                        {formatCurrency(totalLiabilities)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-400 mb-2">Owner's Equity</p>
                    <div className="space-y-2 pl-4">
                      {Object.entries(balanceSheetData.equity).map(([item, amount]) => (
                        <div key={item} className="flex justify-between py-1">
                          <span className="text-slate-300">{item}</span>
                          <span className="text-white font-medium">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span className="text-white font-medium">Total Equity</span>
                        <span className="text-green-400 font-bold">
                          {formatCurrency(totalEquity)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4" style={{ borderTop: '2px solid rgba(148, 163, 184, 0.2)' }}>
                    <div 
                      className="flex justify-between p-4 rounded-xl"
                      style={{
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                      }}
                    >
                      <span className="text-lg font-bold text-white">TOTAL LIABILITIES & EQUITY</span>
                      <span className="text-lg font-bold text-purple-400">
                        {formatCurrency(totalLiabilities + totalEquity)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeView === 'cashflow' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white">Cash Flow Statement</h3>
              <p className="text-sm text-slate-400 mt-1">
                For the period: {formatDate(dateFrom)} to {formatDate(dateTo)}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() =>
                void exportCsv('Cash-Flow-Statement', () =>
                  rowsToCsv([
                    ['Period', `${formatDate(dateFrom)} to ${formatDate(dateTo)}`],
                    [],
                    ['Operating'],
                    ...Object.entries(cashFlowData.operating).map(([k, v]) => [k, v]),
                    ['Net operating', operatingCashFlow],
                    [],
                    ['Investing'],
                    ...Object.entries(cashFlowData.investing).map(([k, v]) => [k, v]),
                    ['Net investing', investingCashFlow],
                    [],
                    ['Financing'],
                    ...Object.entries(cashFlowData.financing).map(([k, v]) => [k, v]),
                    ['Net financing', financingCashFlow],
                    ['Net increase in cash', netCashFlow],
                  ])
                )
              }
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                color: '#ffffff',
              }}
            >
              <Download className="size-4" />
              Export CSV
            </motion.button>
          </div>

          <div className="space-y-6">
            {/* Operating Activities */}
            <div>
              <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                <h4 className="text-lg font-bold text-white">OPERATING ACTIVITIES</h4>
              </div>
              <div className="space-y-2">
                {Object.entries(cashFlowData.operating).map(([item, amount]) => (
                  <div key={item} className="flex items-center justify-between py-2 px-4 rounded-lg hover:bg-black/20 transition-colors">
                    <span className="text-slate-300">{item}</span>
                    <span className={`font-medium ${amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(amount)}
                    </span>
                  </div>
                ))}
                <div 
                  className="flex items-center justify-between p-4 rounded-xl mt-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <span className="text-white font-bold">Net Operating Cash Flow</span>
                  <span className={`font-bold ${operatingCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(operatingCashFlow)}
                  </span>
                </div>
              </div>
            </div>

            {/* Investing Activities */}
            <div>
              <div className="flex items-center justify-between mb-3 pb-2" style={{ borderTop: '2px solid rgba(148, 163, 184, 0.1)', paddingTop: '24px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                <h4 className="text-lg font-bold text-white">INVESTING ACTIVITIES</h4>
              </div>
              <div className="space-y-2">
                {Object.entries(cashFlowData.investing).map(([item, amount]) => (
                  <div key={item} className="flex items-center justify-between py-2 px-4 rounded-lg hover:bg-black/20 transition-colors">
                    <span className="text-slate-300">{item}</span>
                    <span className={`font-medium ${amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(amount)}
                    </span>
                  </div>
                ))}
                <div 
                  className="flex items-center justify-between p-4 rounded-xl mt-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(249, 115, 22, 0.2))',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <span className="text-white font-bold">Net Investing Cash Flow</span>
                  <span className={`font-bold ${investingCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(investingCashFlow)}
                  </span>
                </div>
              </div>
            </div>

            {/* Financing Activities */}
            <div>
              <div className="flex items-center justify-between mb-3 pb-2" style={{ borderTop: '2px solid rgba(148, 163, 184, 0.1)', paddingTop: '24px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                <h4 className="text-lg font-bold text-white">FINANCING ACTIVITIES</h4>
              </div>
              <div className="space-y-2">
                {Object.entries(cashFlowData.financing).map(([item, amount]) => (
                  <div key={item} className="flex items-center justify-between py-2 px-4 rounded-lg hover:bg-black/20 transition-colors">
                    <span className="text-slate-300">{item}</span>
                    <span className={`font-medium ${amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(amount)}
                    </span>
                  </div>
                ))}
                <div 
                  className="flex items-center justify-between p-4 rounded-xl mt-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2))',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <span className="text-white font-bold">Net Financing Cash Flow</span>
                  <span className={`font-bold ${financingCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(financingCashFlow)}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Cash Flow */}
            <div className="pt-4" style={{ borderTop: '2px solid rgba(148, 163, 184, 0.2)' }}>
              <div 
                className="flex items-center justify-between p-6 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.3))',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.4)',
                }}
              >
                <span className="text-xl font-bold text-white">NET INCREASE IN CASH</span>
                <span className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(netCashFlow)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeView === 'department' && (
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.list}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white">Department P&L Analysis</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {deptProfit && deptProfit.length > 0
                    ? 'From your organization data'
                    : 'Performance breakdown by department'}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() =>
                  void exportCsv('Department-P-L', () =>
                    deptProfit && deptProfit.length > 0
                      ? departmentsToCsv(deptProfit)
                      : rowsToCsv([
                          [
                            'Note',
                            'No departments configured yet — add departments under Settings, then assign them to transactions to see department-level P&L here.',
                          ],
                        ])
                  )
                }
                className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                  border: '1px solid rgba(6, 182, 212, 0.5)',
                  boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                  color: '#ffffff',
                }}
              >
                <Download className="size-4" />
                Export CSV
              </motion.button>
            </div>

            {deptLoading && (
              <p className="text-slate-400 text-center py-8">Loading departments…</p>
            )}
            {deptError && (
              <div className="text-center py-6 space-y-2">
                <p className="text-red-300">{deptError}</p>
                <button
                  type="button"
                  onClick={() => void refetchDept()}
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={AXIOM.buttons.secondary}
                >
                  Try again
                </button>
              </div>
            )}

            {!deptLoading && !deptError && departmentRows.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-8">
                No departments configured yet — add departments under Settings, then assign them to
                transactions to see department-level P&amp;L here.
              </p>
            )}

            {!deptLoading && !deptError && departmentRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Department</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Cost</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Profit</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Margin %</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Headcount</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Avg Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentRows.map((dept, index) => (
                    <tr
                      key={dept.key}
                      className="hover:bg-black/20 transition-colors"
                      style={{
                        borderBottom:
                          index !== departmentRows.length - 1
                            ? '1px solid rgba(148, 163, 184, 0.05)'
                            : 'none',
                      }}
                    >
                      <td className="py-4 px-4">
                        <span className="text-white font-medium">{dept.name}</span>
                      </td>
                      <td className="py-4 px-4 text-right text-green-400 font-medium">
                        {formatCurrency(dept.revenue)}
                      </td>
                      <td className="py-4 px-4 text-right text-red-400 font-medium">
                        {formatCurrency(dept.cost)}
                      </td>
                      <td className="py-4 px-4 text-right text-cyan-400 font-bold">
                        {formatCurrency(dept.profit)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span
                          className="px-3 py-1 rounded-lg text-xs font-medium"
                          style={{
                            background:
                              dept.margin > 35
                                ? 'rgba(16, 185, 129, 0.2)'
                                : dept.margin > 25
                                  ? 'rgba(245, 158, 11, 0.2)'
                                  : 'rgba(239, 68, 68, 0.2)',
                            border:
                              dept.margin > 35
                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                : dept.margin > 25
                                  ? '1px solid rgba(245, 158, 11, 0.3)'
                                  : '1px solid rgba(239, 68, 68, 0.3)',
                            color: dept.margin > 35 ? '#10b981' : dept.margin > 25 ? '#f59e0b' : '#ef4444',
                          }}
                        >
                          {dept.margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-slate-300">
                        {dept.headcount}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-300">
                        {formatCurrency(dept.avgRate)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid rgba(148, 163, 184, 0.2)' }}>
                    <td className="py-4 px-4">
                      <span className="text-white font-bold">TOTAL</span>
                    </td>
                    <td className="py-4 px-4 text-right text-green-400 font-bold">
                      {formatCurrency(totalDeptRevenue)}
                    </td>
                    <td className="py-4 px-4 text-right text-red-400 font-bold">
                      {formatCurrency(totalDeptCost)}
                    </td>
                    <td className="py-4 px-4 text-right text-cyan-400 font-bold">
                      {formatCurrency(totalDeptProfit)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-cyan-400 font-bold">
                        {totalDeptRevenue > 0
                          ? ((totalDeptProfit / totalDeptRevenue) * 100).toFixed(1)
                          : '0.0'}
                        %
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-white font-bold">
                      {departmentRows.reduce((sum, d) => sum + d.headcount, 0)}
                    </td>
                    <td className="py-4 px-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.chartAmber}
          >
            <h4 className="text-lg font-bold text-white mb-4">Department Revenue vs Profit</h4>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={departmentChartRows}>
                <CartesianGrid {...AXIOM.charts.grid} />
                <XAxis 
                  dataKey="name" 
                  {...AXIOM.charts.axis}
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis 
                  {...AXIOM.charts.axis}
                  tick={{ fill: '#94a3b8' }}
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
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
                <Legend />
                <Bar dataKey="revenue" fill={COLORS.green} name="Revenue" radius={[8, 8, 0, 0]} />
                <Bar dataKey="cost" fill={COLORS.red} name="Cost" radius={[8, 8, 0, 0]} />
                <Bar dataKey="profit" fill={COLORS.amber} name="Profit" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}
    </div>
  );
}
