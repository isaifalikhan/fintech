import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useTheme } from '@/contexts/ThemeContext';
// ── Phase 9A: Department profitability wired through service layer ────────────
import { useOrgServices } from '@/hooks/useOrgServices';
import { useOrgCurrency } from '@/hooks/useOrgCurrency';
import { useService } from '@/hooks/useService';
import { formatCurrency } from '@/lib/formatters';
import type { DepartmentProfitability } from '@/services/types';

/** Maps service DepartmentProfitability → local rendering shape */
function mapDeptProfitability(dp: DepartmentProfitability): Department {
  return {
    id: dp.departmentId,
    name: dp.departmentName,
    costPerHour: dp.costPerHour,
    teamMembers: dp.headcount,
    monthlyRevenue: dp.revenue,
    monthlyCost: dp.directCosts,
    monthlyProfit: dp.netProfit,
    profitMargin: dp.profitMargin,
    overheadAllocation: dp.allocatedOverhead,
    billableHours: dp.billableHours,
    totalHours: dp.totalHours,
    utilization: dp.utilization,
  };
}

interface Department {
  id: string; name: string; costPerHour: number; teamMembers: number;
  monthlyRevenue: number; monthlyCost: number; monthlyProfit: number;
  profitMargin: number; overheadAllocation: number; billableHours: number;
  totalHours: number; utilization: number;
}
interface Project {
  id: string; name: string; client: string; department: string;
  quotedAmount: number; actualCost: number; actualProfit: number;
  profitMargin: number; status: 'quoted' | 'in-progress' | 'completed';
  hoursQuoted: number; hoursActual: number; startDate: string; endDate?: string;
}
interface OverheadExpense {
  id: string; category: string; amount: number;
  frequency: 'monthly' | 'yearly';
  allocationType: 'equal' | 'revenue-based' | 'headcount-based';
  departments: string[];
}
interface ProfitAnalysis {
  byDepartment: { department: string; revenue: number; directCost: number; allocatedOverhead: number; netProfit: number; profitMargin: number }[];
  byScope: { scope: 'business' | 'personal'; income: number; expense: number; profit: number }[];
  byClient: { client: string; revenue: number; cost: number; profit: number; projects: number }[];
  overall: { totalRevenue: number; totalDirectCost: number; totalOverhead: number; grossProfit: number; netProfit: number; grossMargin: number; netMargin: number };
}
interface WhatIfScenario {
  id: string; name: string;
  changes: { type: 'cost-increase' | 'revenue-increase' | 'overhead-reduction' | 'rate-change'; target: string; percentage: number }[];
  projectedProfit: number; projectedMargin: number; impact: number;
}

// mockDepartments REMOVED — now fetched via svc.departments.getProfitability() below
const mockProjects: Project[] = [
  { id: 'proj-1', name: 'E-commerce Platform', client: 'TechCorp Ltd', department: 'Development', quotedAmount: 850000, actualCost: 620000, actualProfit: 230000, profitMargin: 27.1, status: 'in-progress', hoursQuoted: 200, hoursActual: 151, startDate: '2025-12-01' },
  { id: 'proj-2', name: 'Brand Identity', client: 'StartupXYZ', department: 'Design', quotedAmount: 320000, actualCost: 240000, actualProfit: 80000, profitMargin: 25.0, status: 'completed', hoursQuoted: 95, hoursActual: 86, startDate: '2025-11-15', endDate: '2025-12-20' },
  { id: 'proj-3', name: 'Social Media Campaign', client: 'FashionBrand', department: 'Marketing', quotedAmount: 180000, actualCost: 150000, actualProfit: 30000, profitMargin: 16.7, status: 'completed', hoursQuoted: 72, hoursActual: 60, startDate: '2025-12-01', endDate: '2025-12-31' },
  { id: 'proj-4', name: 'Mobile App Development', client: 'FinTech Solutions', department: 'Development', quotedAmount: 1200000, actualCost: 0, actualProfit: 0, profitMargin: 0, status: 'quoted', hoursQuoted: 300, hoursActual: 0, startDate: '2026-01-15' },
];
const mockOverheads: OverheadExpense[] = [
  { id: 'oh-1', category: 'Office Rent', amount: 200000, frequency: 'monthly', allocationType: 'equal', departments: ['Design', 'Development', 'Marketing', 'Sales & BD'] },
  { id: 'oh-2', category: 'Utilities', amount: 45000, frequency: 'monthly', allocationType: 'headcount-based', departments: ['Design', 'Development', 'Marketing', 'Sales & BD'] },
  { id: 'oh-3', category: 'Software Licenses', amount: 85000, frequency: 'monthly', allocationType: 'revenue-based', departments: ['Design', 'Development', 'Marketing'] },
  { id: 'oh-4', category: 'Admin Salaries', amount: 90000, frequency: 'monthly', allocationType: 'headcount-based', departments: ['Design', 'Development', 'Marketing', 'Sales & BD'] },
];
const mockProfitAnalysis: ProfitAnalysis = {
  byDepartment: [
    { department: 'Design', revenue: 680000, directCost: 448000, allocatedOverhead: 112000, netProfit: 120000, profitMargin: 17.6 },
    { department: 'Development', revenue: 985600, directCost: 738000, allocatedOverhead: 168000, netProfit: 79600, profitMargin: 8.1 },
    { department: 'Marketing', revenue: 375000, directCost: 300000, allocatedOverhead: 84000, netProfit: -9000, profitMargin: -2.4 },
    { department: 'Sales & BD', revenue: 256000, directCost: 204800, allocatedOverhead: 56000, netProfit: -4800, profitMargin: -1.9 },
  ],
  byScope: [
    { scope: 'business', income: 2296600, expense: 2110800, profit: 185800 },
    { scope: 'personal', income: 0, expense: 85000, profit: -85000 },
  ],
  byClient: [
    { client: 'TechCorp Ltd', revenue: 850000, cost: 620000, profit: 230000, projects: 1 },
    { client: 'StartupXYZ', revenue: 320000, cost: 240000, profit: 80000, projects: 1 },
    { client: 'FashionBrand', revenue: 180000, cost: 150000, profit: 30000, projects: 1 },
    { client: 'FinTech Solutions', revenue: 1200000, cost: 900000, profit: 300000, projects: 1 },
  ],
  overall: { totalRevenue: 2296600, totalDirectCost: 1690800, totalOverhead: 420000, grossProfit: 605800, netProfit: 185800, grossMargin: 26.4, netMargin: 8.1 },
};
const mockWhatIfScenarios: WhatIfScenario[] = [
  { id: 'wif-1', name: 'Increase Developer Rates by 15%', changes: [{ type: 'rate-change', target: 'Development', percentage: 15 }], projectedProfit: 333550, projectedMargin: 13.1, impact: 147750 },
  { id: 'wif-2', name: 'Reduce Overhead by 20%', changes: [{ type: 'overhead-reduction', target: 'All', percentage: 20 }], projectedProfit: 269800, projectedMargin: 11.1, impact: 84000 },
  { id: 'wif-3', name: 'Increase Revenue by 10%', changes: [{ type: 'revenue-increase', target: 'All', percentage: 10 }], projectedProfit: 291460, projectedMargin: 11.5, impact: 105660 },
];

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Plus,
  Calculator,
  Building2,
  Briefcase,
  UserCircle,
  Layers,
  Zap,
  Home,
  Maximize2,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion } from 'motion/react';
import { AXIOM } from '../../../styles/axiom-tokens';

const COLORS = ['#a855f7', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];

export function ProfitIntelligenceView() {
  const { theme } = useTheme();
  const svc = useOrgServices();
  const orgCurrency = useOrgCurrency();

  // ── Phase 9A: Department profitability from service ──────────────────────
  const {
    data: rawDeptProfit,
    loading: deptProfitLoading,
    error: deptProfitError,
  } = useService(() => svc.departments.getProfitability(), [svc.orgId]);
  const mockDepartments: Department[] = (rawDeptProfit || []).map(mapDeptProfitability);

  const [period, setPeriod] = useState<'1M' | '3M' | '1Y'>('1M');

  const hasLiveDeptData = mockDepartments.length > 0;
  const periodFactor = period === '1M' ? 1 : period === '3M' ? 3 : 12;

  const liveOverall = useMemo(() => {
    if (mockDepartments.length === 0) return null;
    const f = periodFactor;
    let tr = 0;
    let td = 0;
    let to = 0;
    let tn = 0;
    for (const d of mockDepartments) {
      tr += d.monthlyRevenue;
      td += d.monthlyCost;
      to += d.overheadAllocation;
      tn += d.monthlyProfit;
    }
    tr *= f;
    td *= f;
    to *= f;
    tn *= f;
    const grossProfit = tr - td;
    const grossMargin = tr > 0 ? (grossProfit / tr) * 100 : 0;
    const netMargin = tr > 0 ? (tn / tr) * 100 : 0;
    return {
      totalRevenue: tr,
      totalDirectCost: td,
      totalOverhead: to,
      grossProfit,
      netProfit: tn,
      grossMargin,
      netMargin,
    };
  }, [mockDepartments, periodFactor]);

  const demoOverall = mockProfitAnalysis.overall;
  const displayOverall = liveOverall ?? demoOverall;

  const overheadSharePct = useMemo(() => {
    const rev = displayOverall.totalRevenue;
    return rev > 0 ? (displayOverall.totalOverhead / rev) * 100 : 0;
  }, [displayOverall.totalRevenue, displayOverall.totalOverhead]);

  const deptBreakdownRows = useMemo(() => {
    if (!hasLiveDeptData) return [];
    const f = periodFactor;
    return mockDepartments.map((d) => ({
      department: d.name,
      revenue: d.monthlyRevenue * f,
      directCost: d.monthlyCost * f,
      allocatedOverhead: d.overheadAllocation * f,
      netProfit: d.monthlyProfit * f,
      profitMargin: d.profitMargin,
    }));
  }, [mockDepartments, periodFactor, hasLiveDeptData]);

  const hasDeptBreakdown = deptBreakdownRows.length > 0;
  const clientRows = mockProfitAnalysis.byClient;
  const hasClientRows = clientRows.length > 0;

  const periodLabel = !hasLiveDeptData
    ? 'Sample data'
    : period === '1M'
      ? 'This month'
      : period === '3M'
        ? 'Last 3 months (monthly × 3)'
        : 'Last 12 months (monthly × 12)';

  return (
    <div 
      className="min-h-screen p-8" 
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

      {/* Header with AXIOM Icon Box */}
      <motion.div {...AXIOM.animations.fadeInTop} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div 
            className="p-3 rounded-xl flex items-center justify-center"
            style={{
              background: AXIOM.iconBoxes.purple,
              boxShadow: AXIOM.shadows.iconPurple,
            }}
          >
            <Target className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle}>
              Profit Intelligence
            </h1>
          </div>
        </div>
        <p className="text-slate-400 text-sm ml-[60px]">Agency-Specific Profitability Analysis • Real-time Metrics</p>
        <div className="mt-4 ml-0 sm:ml-[60px] flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Period</span>
            {(['1M', '3M', '1Y'] as const).map((p) => (
              <button
                key={p}
                type="button"
                disabled={!hasLiveDeptData}
                title={
                  hasLiveDeptData
                    ? 'Scale monthly department figures by this range (totals and department charts).'
                    : 'Available when your org has at least one department with profitability data.'
                }
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors min-h-9 touch-manipulation ${
                  !hasLiveDeptData
                    ? 'cursor-not-allowed opacity-45 bg-slate-800/30 text-slate-500'
                    : period === p
                      ? 'bg-purple-500/30 text-white ring-1 ring-purple-400/40'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {p === '1M' ? '1 month' : p === '3M' ? '3 months' : '1 year'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            {hasLiveDeptData
              ? 'Totals and department charts scale monthly figures by the selected range (demo-quality until date filters are wired to the API).'
              : 'Period is disabled until at least one department returns from your org. Top KPIs below show static sample numbers.'}
          </p>
        </div>
        {deptProfitLoading && (
          <p className="mt-2 text-xs text-slate-500 font-mono" aria-live="polite">
            Loading department metrics…
          </p>
        )}
        {deptProfitError && (
          <p className="mt-2 text-xs text-amber-200/90 font-mono" role="alert">
            {deptProfitError} — department list and charts may be incomplete.
          </p>
        )}
        {hasLiveDeptData && !deptProfitLoading && liveOverall?.totalRevenue === 0 && liveOverall?.totalDirectCost === 0 && (
          <p className="mt-2 text-xs text-amber-200/90 font-mono" role="status">
            Your department(s) exist but no transactions are assigned to one yet — profitability
            below is genuinely $0, not a loading or display error. Assign a department to
            transactions to see real figures here.
          </p>
        )}
      </motion.div>

      {/* Overall Metrics - Dashboard Style with Dark Cards + Colored Top Borders */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="group relative"
        >
          <div 
            className="relative overflow-hidden rounded-2xl p-6 border transition-all duration-300"
            style={{
              background: theme === 'dark' 
                ? 'linear-gradient(135deg, rgba(30, 15, 50, 0.6) 0%, rgba(10, 5, 20, 0.8) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
              border: theme === 'dark' ? AXIOM.borders.cyan : '1px solid rgba(6, 182, 212, 0.3)',
              boxShadow: theme === 'dark' 
                ? '0 4px 24px -4px rgba(59, 130, 246, 0.3), 0 0 48px -12px rgba(6, 182, 212, 0.2)'
                : '0 4px 12px -2px rgba(59, 130, 246, 0.1)',
            }}
          >
            <div 
              className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
              style={{
                background: 'linear-gradient(to right, rgb(59, 130, 246), rgb(6, 182, 212), rgb(59, 130, 246))',
              }}
            />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="p-2.5 rounded-xl border shadow-lg"
                  style={{
                    background: theme === 'dark'
                      ? 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.2))'
                      : 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1))',
                    borderColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
                    boxShadow: theme === 'dark' ? '0 4px 12px rgba(59, 130, 246, 0.2)' : '0 2px 8px rgba(59, 130, 246, 0.1)',
                  }}
                >
                  <DollarSign className="w-5 h-5" style={{ color: theme === 'dark' ? 'rgb(147, 197, 253)' : 'rgb(59, 130, 246)' }} />
                </div>
              </div>
              <p className="text-sm font-medium mb-2" style={{ color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>Total Revenue</p>
              <p 
                className="text-3xl font-bold"
                style={{
                  background: theme === 'dark'
                    ? 'linear-gradient(to right, #ffffff, rgb(147, 197, 253), rgb(103, 232, 249))'
                    : 'linear-gradient(to right, #1e293b, rgb(59, 130, 246), rgb(6, 182, 212))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {formatCurrency(displayOverall.totalRevenue, orgCurrency, { compact: true })}
              </p>
              <p className="text-xs mt-1" style={{ color: theme === 'dark' ? '#64748b' : '#94a3b8' }}>{periodLabel}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="group relative"
        >
          <div 
            className="relative overflow-hidden rounded-2xl p-6 border transition-all duration-300"
            style={{
              background: theme === 'dark' 
                ? 'linear-gradient(135deg, rgba(30, 15, 50, 0.6) 0%, rgba(10, 5, 20, 0.8) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
              border: theme === 'dark' ? AXIOM.borders.green : '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: theme === 'dark' 
                ? '0 4px 24px -4px rgba(16, 185, 129, 0.3), 0 0 48px -12px rgba(52, 211, 153, 0.2)'
                : '0 4px 12px -2px rgba(16, 185, 129, 0.1)',
            }}
          >
            <div 
              className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
              style={{
                background: 'linear-gradient(to right, rgb(16, 185, 129), rgb(5, 150, 105), rgb(16, 185, 129))',
              }}
            />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="p-2.5 rounded-xl border shadow-lg"
                  style={{
                    background: theme === 'dark'
                      ? 'linear-gradient(to bottom right, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))'
                      : 'linear-gradient(to bottom right, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
                    borderColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
                    boxShadow: theme === 'dark' ? '0 4px 12px rgba(16, 185, 129, 0.2)' : '0 2px 8px rgba(16, 185, 129, 0.1)',
                  }}
                >
                  <TrendingUp className="w-5 h-5" style={{ color: theme === 'dark' ? 'rgb(52, 211, 153)' : 'rgb(16, 185, 129)' }} />
                </div>
              </div>
              <p className="text-sm font-medium mb-2" style={{ color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>Gross Profit</p>
              <p 
                className="text-3xl font-bold"
                style={{
                  background: theme === 'dark'
                    ? 'linear-gradient(to right, #ffffff, rgb(52, 211, 153), rgb(16, 185, 129))'
                    : 'linear-gradient(to right, #1e293b, rgb(52, 211, 153), rgb(16, 185, 129))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {formatCurrency(displayOverall.grossProfit, orgCurrency, { compact: true })}
              </p>
              <p className="text-xs mt-1" style={{ color: theme === 'dark' ? '#64748b' : '#94a3b8' }}>
                Margin: {displayOverall.grossMargin.toFixed(1)}% · {periodLabel}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="group relative"
        >
          <div 
            className="relative overflow-hidden rounded-2xl p-6 border transition-all duration-300"
            style={{
              background: theme === 'dark' 
                ? 'linear-gradient(135deg, rgba(30, 15, 50, 0.6) 0%, rgba(10, 5, 20, 0.8) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
              border: theme === 'dark' ? AXIOM.borders.purple : '1px solid rgba(168, 85, 247, 0.3)',
              boxShadow: theme === 'dark' 
                ? '0 4px 24px -4px rgba(168, 85, 247, 0.3), 0 0 48px -12px rgba(139, 92, 246, 0.2)'
                : '0 4px 12px -2px rgba(168, 85, 247, 0.1)',
            }}
          >
            <div 
              className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
              style={{
                background: 'linear-gradient(to right, rgb(168, 85, 247), rgb(139, 92, 246), rgb(168, 85, 247))',
              }}
            />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="p-2.5 rounded-xl border shadow-lg"
                  style={{
                    background: theme === 'dark'
                      ? 'linear-gradient(to bottom right, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.2))'
                      : 'linear-gradient(to bottom right, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.1))',
                    borderColor: theme === 'dark' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.2)',
                    boxShadow: theme === 'dark' ? '0 4px 12px rgba(168, 85, 247, 0.2)' : '0 2px 8px rgba(168, 85, 247, 0.1)',
                  }}
                >
                  <Target className="w-5 h-5" style={{ color: theme === 'dark' ? 'rgb(216, 180, 254)' : 'rgb(168, 85, 247)' }} />
                </div>
              </div>
              <p className="text-sm font-medium mb-2" style={{ color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>Net Profit</p>
              <p 
                className="text-3xl font-bold"
                style={{
                  background: theme === 'dark'
                    ? 'linear-gradient(to right, #ffffff, rgb(216, 180, 254), rgb(168, 85, 247))'
                    : 'linear-gradient(to right, #1e293b, rgb(216, 180, 254), rgb(168, 85, 247))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {formatCurrency(displayOverall.netProfit, orgCurrency, { compact: true })}
              </p>
              <p className="text-xs mt-1" style={{ color: theme === 'dark' ? '#64748b' : '#94a3b8' }}>
                Margin: {displayOverall.netMargin.toFixed(1)}% · {periodLabel}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="group relative"
        >
          <div 
            className="relative overflow-hidden rounded-2xl p-6 border transition-all duration-300"
            style={{
              background: theme === 'dark' 
                ? 'linear-gradient(135deg, rgba(30, 15, 50, 0.6) 0%, rgba(10, 5, 20, 0.8) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
              border: theme === 'dark' ? AXIOM.borders.amber : '1px solid rgba(245, 158, 11, 0.3)',
              boxShadow: theme === 'dark' 
                ? '0 4px 24px -4px rgba(245, 158, 11, 0.3), 0 0 48px -12px rgba(251, 146, 60, 0.2)'
                : '0 4px 12px -2px rgba(245, 158, 11, 0.1)',
            }}
          >
            <div 
              className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
              style={{
                background: 'linear-gradient(to right, rgb(245, 158, 11), rgb(251, 146, 60), rgb(245, 158, 11))',
              }}
            />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="p-2.5 rounded-xl border shadow-lg"
                  style={{
                    background: theme === 'dark'
                      ? 'linear-gradient(to bottom right, rgba(245, 158, 11, 0.2), rgba(251, 146, 60, 0.2))'
                      : 'linear-gradient(to bottom right, rgba(245, 158, 11, 0.1), rgba(251, 146, 60, 0.1))',
                    borderColor: theme === 'dark' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)',
                    boxShadow: theme === 'dark' ? '0 4px 12px rgba(245, 158, 11, 0.2)' : '0 2px 8px rgba(245, 158, 11, 0.1)',
                  }}
                >
                  <Calculator className="w-5 h-5" style={{ color: theme === 'dark' ? 'rgb(253, 186, 116)' : 'rgb(245, 158, 11)' }} />
                </div>
              </div>
              <p className="text-sm font-medium mb-2" style={{ color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>Total Overhead</p>
              <p 
                className="text-3xl font-bold"
                style={{
                  background: theme === 'dark'
                    ? 'linear-gradient(to right, #ffffff, rgb(253, 186, 116), rgb(245, 158, 11))'
                    : 'linear-gradient(to right, #1e293b, rgb(253, 186, 116), rgb(245, 158, 11))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {formatCurrency(displayOverall.totalOverhead, orgCurrency, { compact: true })}
              </p>
              <p className="text-xs mt-1" style={{ color: theme === 'dark' ? '#64748b' : '#94a3b8' }}>
                {overheadSharePct.toFixed(1)}% of revenue · {periodLabel}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Tabs - Dashboard Style */}
      <Tabs defaultValue="departments" className="space-y-6">
        <TabsList className="bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm p-1">
          <TabsTrigger value="departments" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-white">
            <Building2 className="size-4 mr-2" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-white">
            <Briefcase className="size-4 mr-2" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="clients" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-white">
            <UserCircle className="size-4 mr-2" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="overhead" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-white">
            <Layers className="size-4 mr-2" />
            Overhead
          </TabsTrigger>
          <TabsTrigger value="whatif" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-white">
            <Zap className="size-4 mr-2" />
            What If
          </TabsTrigger>
          <TabsTrigger value="bvp" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-white">
            <Home className="size-4 mr-2" />
            Business vs Personal
          </TabsTrigger>
          <TabsTrigger value="sqft" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-white">
            <Maximize2 className="size-4 mr-2" />
            Per Sq Ft
          </TabsTrigger>
        </TabsList>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Profit Chart - Dashboard Style with Purple Gradient Background */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-8 rounded-3xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 15, 50, 0.6) 0%, rgba(10, 5, 20, 0.8) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                boxShadow: '0 20px 60px -20px rgba(168, 85, 247, 0.5)',
              }}
            >
              <div 
                className="absolute inset-0 opacity-40"
                style={{
                  background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.3), transparent 70%)',
                }}
              />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                    style={{ boxShadow: '0 10px 30px -10px rgba(168, 85, 247, 0.6)' }}
                  >
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Department Profitability</h2>
                    <p className="text-slate-400 text-sm">
                      Revenue, Cost & Net Profit
                      {hasLiveDeptData ? ' · from your org, scaled by period' : ''}
                    </p>
                  </div>
                </div>

                {hasDeptBreakdown ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={deptBreakdownRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
                      <XAxis
                        dataKey="department"
                        stroke="rgba(148, 163, 184, 0.5)"
                        style={{ fontSize: '12px', fontWeight: 500 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="rgba(148, 163, 184, 0.5)"
                        style={{ fontSize: '12px', fontWeight: 500 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.98)',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          backdropFilter: 'blur(20px)',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                        }}
                        labelStyle={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}
                        itemStyle={{ color: '#94a3b8', fontSize: '12px' }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#a855f7" name="Revenue" />
                      <Bar dataKey="directCost" fill="#f59e0b" name="Direct Cost" />
                      <Bar dataKey="netProfit" fill="#10b981" name="Net Profit" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-sm py-12 text-center">No department breakdown for this period.</p>
                )}
              </div>
            </motion.div>

            {/* Profit Margin Distribution - Dashboard Style */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-8 rounded-3xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 15, 50, 0.6) 0%, rgba(10, 5, 20, 0.8) 100%)',
                border: '1px solid rgba(236, 72, 153, 0.2)',
                boxShadow: '0 20px 60px -20px rgba(236, 72, 153, 0.5)',
              }}
            >
              <div 
                className="absolute inset-0 opacity-40"
                style={{
                  background: 'radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.3), transparent 70%)',
                }}
              />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center"
                    style={{ boxShadow: '0 10px 30px -10px rgba(236, 72, 153, 0.6)' }}
                  >
                    <PieChartIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Profit Margin by Department</h2>
                    <p className="text-slate-400 text-sm">
                      After overhead allocation
                      {hasLiveDeptData ? ' · from your org' : ''}
                    </p>
                  </div>
                </div>

                {hasDeptBreakdown ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={deptBreakdownRows}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: { department?: string; profitMargin?: number }) =>
                          `${entry.department ?? '—'}: ${(entry.profitMargin ?? 0).toFixed(1)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="netProfit"
                      >
                        {deptBreakdownRows.map((entry, index) => (
                          <Cell key={`cell-${entry.department}-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.98)',
                          border: '1px solid rgba(236, 72, 153, 0.3)',
                          backdropFilter: 'blur(20px)',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-sm py-12 text-center">No margin data for this period.</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Department Details Table - Dashboard Style */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-8 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5) 0%, rgba(0, 0, 0, 0.3) 100%)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center"
                style={{ boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)' }}
              >
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Department Details</h2>
                <p className="text-slate-400 text-sm">Cost per hour, utilization & profitability</p>
              </div>
            </div>

            <div className="space-y-4">
              {mockDepartments.length === 0 && (
                <p className="text-slate-400 text-sm py-6 text-center border border-dashed border-slate-600/50 rounded-2xl">
                  No department profitability rows yet. Add departments and post transactions tagged to a department — charts
                  above stay empty until then (top KPIs may show sample figures).
                </p>
              )}
              {mockDepartments.map((dept, idx) => (
                <motion.div
                  key={dept.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + idx * 0.1 }}
                  className="p-5 rounded-2xl"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{dept.name}</h3>
                      <p className="text-sm text-slate-400">👥 {dept.teamMembers} members · ⚡ {dept.utilization.toFixed(1)}% utilization</p>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      dept.profitMargin >= 15 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' 
                        : dept.profitMargin >= 10 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' 
                        : 'bg-red-500/20 text-red-300 border border-red-400/30'
                    }`}>
                      {dept.profitMargin.toFixed(1)}% margin
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Cost/Hour</p>
                      <p className="font-bold text-white">{formatCurrency(dept.costPerHour, orgCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Revenue</p>
                      <p className="font-bold text-green-400">{formatCurrency(dept.monthlyRevenue, orgCurrency, { compact: true })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Direct Cost</p>
                      <p className="font-bold text-orange-400">{formatCurrency(dept.monthlyCost, orgCurrency, { compact: true })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Overhead</p>
                      <p className="font-bold text-purple-400">{formatCurrency(dept.overheadAllocation, orgCurrency, { compact: true })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Net Profit</p>
                      <p className="font-bold text-cyan-400">{formatCurrency(dept.monthlyProfit, orgCurrency, { compact: true })}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Billable Hours: {dept.billableHours} / {dept.totalHours}</span>
                      <span>Avg Rate: {formatCurrency(dept.billableHours > 0 ? Math.round(dept.monthlyRevenue / dept.billableHours) : 0, orgCurrency)}/hr</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-8 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5) 0%, rgba(0, 0, 0, 0.3) 100%)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                style={{ boxShadow: '0 10px 30px -10px rgba(168, 85, 247, 0.6)' }}
              >
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Project Profitability</h2>
                <p className="text-slate-400 text-sm">Quoted vs Actual analysis</p>
              </div>
            </div>

            <div className="space-y-4">
              {mockProjects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.05 }}
                  className="p-5 rounded-2xl"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-white">{project.name}</h3>
                      <p className="text-sm text-slate-400">{project.client} · {project.department}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        project.status === 'completed' 
                          ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                          : project.status === 'in-progress' 
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30' 
                          : 'bg-slate-500/20 text-slate-300 border border-slate-400/30'
                      }`}>
                        {project.status}
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        project.profitMargin >= 20 
                          ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                          : project.profitMargin >= 10 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' 
                          : 'bg-red-500/20 text-red-300 border border-red-400/30'
                      }`}>
                        {project.profitMargin.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Quoted Amount</p>
                      <p className="font-bold text-blue-400">{formatCurrency(project.quotedAmount, orgCurrency, { compact: true })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Actual Cost</p>
                      <p className="font-bold text-orange-400">{formatCurrency(project.actualCost, orgCurrency, { compact: true })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Actual Profit</p>
                      <p className={`font-bold ${project.actualProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(project.actualProfit, orgCurrency, { compact: true })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Hours</p>
                      <p className="font-bold text-white">{project.hoursActual} / {project.hoursQuoted}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-8 rounded-3xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 15, 50, 0.6) 0%, rgba(10, 5, 20, 0.8) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              boxShadow: '0 20px 60px -20px rgba(6, 182, 212, 0.5)',
            }}
          >
            <div 
              className="absolute inset-0 opacity-40"
              style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.3), transparent 70%)',
              }}
            />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center"
                  style={{ boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)' }}
                >
                  <UserCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Client Profitability</h2>
                  <p className="text-slate-400 text-sm">Revenue and margin by client</p>
                </div>
              </div>

              {hasClientRows ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={clientRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
                    <XAxis
                      dataKey="client"
                      stroke="rgba(148, 163, 184, 0.5)"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgba(148, 163, 184, 0.5)"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.98)',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                      }}
                      labelStyle={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}
                      itemStyle={{ color: '#94a3b8', fontSize: '12px' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#06b6d4" name="Revenue" />
                    <Bar dataKey="profit" fill="#10b981" name="Net Profit" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-sm py-12 text-center">No client profitability data for this period.</p>
              )}
            </div>
          </motion.div>
        </TabsContent>

        {/* Overhead Tab */}
        <TabsContent value="overhead" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-8 rounded-3xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 15, 50, 0.6) 0%, rgba(10, 5, 20, 0.8) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                boxShadow: '0 20px 60px -20px rgba(245, 158, 11, 0.5)',
              }}
            >
              <div 
                className="absolute inset-0 opacity-40"
                style={{
                  background: 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.3), transparent 70%)',
                }}
              />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div 
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"
                    style={{ boxShadow: '0 10px 30px -10px rgba(245, 158, 11, 0.6)' }}
                  >
                    <PieChartIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Overhead Breakdown</h2>
                    <p className="text-slate-400 text-sm">Monthly expenses</p>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={mockOverheads}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.category}: ${formatCurrency(entry.amount, orgCurrency, { compact: true })}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {mockOverheads.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.98)', 
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-8 rounded-3xl"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5) 0%, rgba(0, 0, 0, 0.3) 100%)',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.8)',
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                  style={{ boxShadow: '0 10px 30px -10px rgba(168, 85, 247, 0.6)' }}
                >
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Overhead Allocation</h2>
                  <p className="text-slate-400 text-sm">Distribution across departments</p>
                </div>
              </div>

              <div className="space-y-4">
                {mockOverheads.map((overhead, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.1 }}
                    className="p-4 rounded-2xl"
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(148, 163, 184, 0.1)',
                    }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-white">{overhead.category}</h4>
                      <p className="font-bold text-orange-400">{formatCurrency(overhead.amount, orgCurrency, { compact: true })}</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{overhead.frequency}</span>
                      <span className="text-slate-400">{overhead.allocationType}</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Allocated to: {overhead.departments.join(', ')}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </TabsContent>

        {/* What-If Tab */}
        <TabsContent value="whatif" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">What-If Scenarios</h2>
              <p className="text-slate-400 text-sm">Test different pricing and cost scenarios (demo)</p>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 rounded-xl text-sm font-medium text-white flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3))',
                border: '1px solid rgba(168, 85, 247, 0.5)',
              }}
            >
              <Plus className="size-4" />
              New Scenario
            </motion.button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mockWhatIfScenarios.map((scenario, idx) => (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="p-6 rounded-3xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5) 0%, rgba(0, 0, 0, 0.3) 100%)',
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                  boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.8)',
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{scenario.name}</h3>
                    <p className="text-slate-400 text-sm">
                      {scenario.changes
                        .map((c) => `${c.type.replace(/-/g, ' ')} · ${c.target}`)
                        .join(' · ')}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      scenario.impact >= 0
                        ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                        : 'bg-red-500/20 text-red-300 border border-red-400/30'
                    }`}
                  >
                    Impact {formatCurrency(scenario.impact, orgCurrency, { compact: true })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Projected profit</p>
                    <p className="font-bold text-white">{formatCurrency(scenario.projectedProfit, orgCurrency, { compact: true })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Projected margin</p>
                    <p className="font-bold text-green-400">{scenario.projectedMargin.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">vs baseline</p>
                    <p className="font-bold text-cyan-400">
                      {scenario.projectedProfit >= displayOverall.netProfit ? '+' : ''}
                      {formatCurrency(scenario.projectedProfit - displayOverall.netProfit, orgCurrency, { compact: true })}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {scenario.changes.map((change, cidx) => (
                    <div key={cidx} className="flex justify-between text-sm">
                      <span className="text-slate-400 capitalize">
                        {change.type.replace(/-/g, ' ')} · {change.target}
                      </span>
                      <span className="text-white font-medium">{change.percentage}%</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Business vs Personal Tab */}
        <TabsContent value="bvp" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-8 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5) 0%, rgba(0, 0, 0, 0.3) 100%)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
                style={{ boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.6)' }}
              >
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Business vs Personal Expenses</h2>
                <p className="text-slate-400 text-sm">Categorization and tax optimization</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Business', value: 1890000, fill: '#3b82f6' },
                        { name: 'Personal', value: 450000, fill: '#10b981' },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${formatCurrency(entry.value, orgCurrency, { compact: true })}`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.98)', 
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div className="p-5 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-2">Business Expenses</h3>
                  <p className="text-3xl font-bold text-blue-400 mb-2">{formatCurrency(1890000, orgCurrency, { compact: true })}</p>
                  <p className="text-sm text-blue-200">80.8% of total expenses</p>
                  <div className="mt-3 space-y-1 text-sm text-blue-100">
                    <div className="flex justify-between">
                      <span>Salaries & Wages</span>
                      <span>{formatCurrency(1200000, orgCurrency, { compact: true })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Office & Tools</span>
                      <span>{formatCurrency(420000, orgCurrency, { compact: true })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Marketing</span>
                      <span>{formatCurrency(270000, orgCurrency, { compact: true })}</span>
                    </div>
                  </div>
                </div>
                <div className="p-5 bg-green-600/20 border border-green-500/30 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-2">Personal Expenses</h3>
                  <p className="text-3xl font-bold text-green-400 mb-2">{formatCurrency(450000, orgCurrency, { compact: true })}</p>
                  <p className="text-sm text-green-200">19.2% of total expenses</p>
                  <div className="mt-3 space-y-1 text-sm text-green-100">
                    <div className="flex justify-between">
                      <span>Owner Drawings</span>
                      <span>{formatCurrency(300000, orgCurrency, { compact: true })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Personal Tax</span>
                      <span>{formatCurrency(150000, orgCurrency, { compact: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Per Sq Ft Tab */}
        <TabsContent value="sqft" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-8 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5) 0%, rgba(0, 0, 0, 0.3) 100%)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                style={{ boxShadow: '0 10px 30px -10px rgba(168, 85, 247, 0.6)' }}
              >
                <Maximize2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Revenue & Profit Per Square Foot</h2>
                <p className="text-slate-400 text-sm">Space efficiency analysis</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="p-6 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                <h3 className="text-sm text-blue-200 mb-2">Total Office Space</h3>
                <p className="text-4xl font-bold text-white mb-1">2,800 sq ft</p>
                <p className="text-sm text-blue-300">Monthly rent: {formatCurrency(200000, orgCurrency, { compact: true })}</p>
              </div>
              <div className="p-6 bg-green-600/20 border border-green-500/30 rounded-lg">
                <h3 className="text-sm text-green-200 mb-2">Revenue per Sq Ft</h3>
                <p className="text-4xl font-bold text-white mb-1">{formatCurrency(820, orgCurrency)}</p>
                <p className="text-sm text-green-300">Per month</p>
              </div>
              <div className="p-6 bg-purple-600/20 border border-purple-500/30 rounded-lg">
                <h3 className="text-sm text-purple-200 mb-2">Profit per Sq Ft</h3>
                <p className="text-4xl font-bold text-white mb-1">{formatCurrency(66, orgCurrency)}</p>
                <p className="text-sm text-purple-300">Net profit per month</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Department Space Allocation</h3>
              {[
                { dept: 'Design', sqft: 800, revenue: 665600, color: 'blue' },
                { dept: 'Development', sqft: 1200, revenue: 1000000, color: 'green' },
                { dept: 'Marketing', sqft: 500, revenue: 375000, color: 'orange' },
                { dept: 'Admin', sqft: 300, revenue: 0, color: 'purple' },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  className="p-5 rounded-2xl"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                  }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white">{item.dept}</h4>
                      <p className="text-sm text-slate-400">{item.sqft} sq ft ({((item.sqft / 2800) * 100).toFixed(1)}% of total)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{formatCurrency(item.sqft > 0 ? Math.round(item.revenue / item.sqft) : 0, orgCurrency)}/sq ft</p>
                      <p className="text-sm text-slate-400">Monthly revenue</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}