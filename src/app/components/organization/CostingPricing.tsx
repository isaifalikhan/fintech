import { useOrgCurrency } from '@/hooks/useOrgCurrency';
import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { formatCurrency } from '@/lib/formatters';
import { Calculator, TrendingUp, Users, DollarSign, AlertCircle, Zap, Plus, Trash2, Edit2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { AXIOM } from '../../../styles/axiom-tokens';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService, useServiceArray } from '@/hooks/useService';
import type { DepartmentProfitability } from '@/services/types';
import { useTheme } from '../../../contexts/ThemeContext';

interface DepartmentRow {
  id: string;
  name: string;
  costPerHour: number;
  headcount: number;
  monthlyRevenue: number;
  monthlyCost: number;
  profit: number;
  margin: number;
}

function mapDepartmentProfitability(dp: DepartmentProfitability): DepartmentRow {
  const monthlyCost = dp.directCosts + dp.allocatedOverhead;
  return {
    id: dp.departmentId,
    name: dp.departmentName,
    costPerHour: dp.costPerHour,
    headcount: dp.headcount,
    monthlyRevenue: dp.revenue,
    monthlyCost,
    profit: dp.netProfit,
    margin: dp.profitMargin,
  };
}

function isBillableDept(d: DepartmentRow) {
  return !/^admin$/i.test(d.name.trim());
}

interface CommissionStructure {
  id: string;
  companyName: string;
  country: string;
  currency: string;
  yourProfitPercentage: number;
  middlemanPercentage: number;
  exchangeRateToPKR: number;
}

export function CostingPricing() {
  const orgCurrency = useOrgCurrency();
  const { theme } = useTheme();
  const svc = useOrgServices();

  // Service-backed: department data for cost calculations
  const { data: deptProfit, loading: deptLoading, error: deptError } = useService(
    () => svc.departments.getProfitability(),
    [svc.orgId]
  );

  const billableDepartments = useMemo(
    () => (deptProfit ?? []).map(mapDepartmentProfitability).filter(isBillableDept),
    [deptProfit],
  );

  const { data: projectProfit, loading: projectsLoading } = useServiceArray(
    () => svc.projects.getProfitability(),
    [svc.orgId]
  );

  const [quoteAmount, setQuoteAmount] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [selectedDept, setSelectedDept] = useState('dept-2');

  // Commission Structures Management
  const [savedCommissions, setSavedCommissions] = useState<CommissionStructure[]>([
    {
      id: '1',
      companyName: 'Dubai Tech Partners',
      country: 'UAE',
      currency: 'AED',
      yourProfitPercentage: 50,
      middlemanPercentage: 25,
      exchangeRateToPKR: 76
    },
    {
      id: '2',
      companyName: 'USA Software Co',
      country: 'United States',
      currency: 'USD',
      yourProfitPercentage: 85,
      middlemanPercentage: 15,
      exchangeRateToPKR: 278
    }
  ]);

  const [showNewCommissionForm, setShowNewCommissionForm] = useState(false);
  
  // New Commission Form States
  const [newCommission, setNewCommission] = useState({
    companyName: '',
    country: '',
    currency: 'USD',
    yourProfitPercentage: '50',
    middlemanPercentage: '25',
    exchangeRateToPKR: '278'
  });

  // Calculator States
  const [selectedCommissionId, setSelectedCommissionId] = useState('1');
  const [dealAmount, setDealAmount] = useState('');

  // Get selected commission safely
  const selectedCommission = savedCommissions.find(c => c.id === selectedCommissionId);

  const calculateQuoteProfit = () => {
    if (!quoteAmount || !estimatedHours) return null;
    const dept = billableDepartments.find((d) => d.id === selectedDept);
    if (!dept) return null;

    const hours = parseFloat(estimatedHours);
    const revenue = parseFloat(quoteAmount);
    if (!Number.isFinite(hours) || !Number.isFinite(revenue) || revenue <= 0) return null;

    const cost = dept.costPerHour * hours;
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { cost, revenue, profit, margin, isProfitable: margin > 20 };
  };

  const quoteAnalysis = calculateQuoteProfit();

  const handleAddNewCommission = () => {
    const newId = (savedCommissions.length + 1).toString();
    const newCommissionStructure: CommissionStructure = {
      id: newId,
      companyName: newCommission.companyName,
      country: newCommission.country,
      currency: newCommission.currency,
      yourProfitPercentage: parseFloat(newCommission.yourProfitPercentage),
      middlemanPercentage: parseFloat(newCommission.middlemanPercentage),
      exchangeRateToPKR: parseFloat(newCommission.exchangeRateToPKR)
    };
    setSavedCommissions([...savedCommissions, newCommissionStructure]);
    setShowNewCommissionForm(false);
    toast.success('New commission structure added successfully!');
  };

  const handleDeleteCommission = (id: string) => {
    const updatedCommissions = savedCommissions.filter(c => c.id !== id);
    setSavedCommissions(updatedCommissions);
    toast.success('Commission structure deleted successfully!');
  };

  const handleEditCommission = (id: string) => {
    const commissionToEdit = savedCommissions.find(c => c.id === id);
    if (commissionToEdit) {
      setNewCommission({
        companyName: commissionToEdit.companyName,
        country: commissionToEdit.country,
        currency: commissionToEdit.currency,
        yourProfitPercentage: commissionToEdit.yourProfitPercentage.toString(),
        middlemanPercentage: commissionToEdit.middlemanPercentage.toString(),
        exchangeRateToPKR: commissionToEdit.exchangeRateToPKR.toString()
      });
      setShowNewCommissionForm(true);
    }
  };

  const getMarginBadge = (margin: number) => {
    if (margin > 30) return AXIOM.badges.success;
    if (margin > 20) return AXIOM.badges.info;
    if (margin > 0) return AXIOM.badges.warning;
    return AXIOM.badges.danger;
  };

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background: AXIOM.backgrounds.main }}>
      {/* Header */}
      <motion.div {...AXIOM.animations.fadeInTop}>
        <div className="flex items-center gap-3 mb-6">
          <div 
            className="p-3 rounded-xl flex items-center justify-center"
            style={{
              background: AXIOM.iconBoxes.purple,
              boxShadow: AXIOM.shadows.iconPurple,
            }}
          >
            <Calculator className="size-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle}>
              Costing & Pricing Intelligence
            </h1>
            <p className="text-slate-400 text-sm">Department costs, hourly rates, and quote profitability analysis</p>
          </div>
        </div>
      </motion.div>

      {/* Department Costing */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Department cost rates</h2>
        {deptError && (
          <p className="text-sm text-amber-400 mb-4" role="alert">
            Could not load department rates. {deptError}
          </p>
        )}
        {deptLoading && (
          <p className="text-sm text-slate-400 mb-4">Loading department rates…</p>
        )}
        {!deptLoading && !deptError && billableDepartments.length === 0 && (
          <div
            className="p-8 rounded-2xl text-center"
            style={AXIOM.containers.list}
          >
            <p className="text-slate-300 mb-1">No departments yet</p>
            <p className="text-sm text-slate-500">
              Add departments under team or settings to see cost rates and quote against them.
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {billableDepartments.map((dept, idx) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              className="p-6 rounded-2xl"
              style={AXIOM.containers.list}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">{dept.name}</h3>
                <span className="px-2 py-1 rounded-lg text-xs font-medium" style={getMarginBadge(dept.margin)}>
                  {dept.margin}% margin
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Cost/Hour</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(dept.costPerHour, orgCurrency)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Headcount</p>
                  <p className="text-lg font-bold text-white flex items-center gap-1">
                    <Users className="size-4" />
                    {dept.headcount}
                  </p>
                </div>
              </div>
              
              <div className="pt-3 space-y-2" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Revenue</span>
                  <span className="text-sm text-emerald-400 font-medium">{formatCurrency(dept.monthlyRevenue, orgCurrency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Cost</span>
                  <span className="text-sm text-amber-400 font-medium">{formatCurrency(dept.monthlyCost, orgCurrency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Profit</span>
                  <span className={`text-sm font-bold ${dept.profit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(dept.profit, orgCurrency)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Project profitability (reference) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-2xl"
        style={AXIOM.containers.list}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: AXIOM.iconBoxes.cyan,
              boxShadow: AXIOM.shadows.iconCyan,
            }}
          >
            <Briefcase className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Projects</h2>
            <p className="text-sm text-slate-400">Quoted vs actual margin from your project list</p>
          </div>
        </div>
        {projectsLoading && (
          <p className="text-sm text-slate-400">Loading projects…</p>
        )}
        {!projectsLoading && projectProfit.length === 0 && (
          <p className="text-sm text-slate-500">No projects in this organization yet.</p>
        )}
        {!projectsLoading && projectProfit.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700/50">
                  <th className="py-2 pr-4 font-medium">Project</th>
                  <th className="py-2 pr-4 font-medium">Client</th>
                  <th className="py-2 pr-4 font-medium text-right">Quoted</th>
                  <th className="py-2 pr-4 font-medium text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {projectProfit.map((p) => (
                  <tr key={p.projectId} className="border-b border-slate-800/80 text-slate-200">
                    <td className="py-3 pr-4 font-medium text-white">{p.projectName}</td>
                    <td className="py-3 pr-4">{p.clientName}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{formatCurrency(p.quotedAmount, orgCurrency)}</td>
                    <td className={`py-3 pr-4 text-right tabular-nums ${p.profitMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.profitMargin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Quote Profit Checker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-6 rounded-2xl"
        style={AXIOM.containers.chartBlue}
      >
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: AXIOM.iconBoxes.purple,
              boxShadow: AXIOM.shadows.iconPurple,
            }}
          >
            <Zap className="size-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Quote Profitability Checker</h3>
            <p className="text-sm text-slate-400">Check if a client quote is profitable before committing</p>
          </div>
        </div>

        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-white font-medium mb-2 block">Quote Amount (PKR)</label>
              <input
                type="number"
                placeholder="350000"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white"
                style={{
                  background: AXIOM.inputs.background,
                  border: AXIOM.inputs.border,
                }}
              />
            </div>
            <div>
              <label className="text-white font-medium mb-2 block">Estimated Hours</label>
              <input
                type="number"
                placeholder="120"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white"
                style={{
                  background: AXIOM.inputs.background,
                  border: AXIOM.inputs.border,
                }}
              />
            </div>
            <div>
              <label className="text-white font-medium mb-2 block">Department</label>
              <select 
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-white"
                style={{
                  background: AXIOM.inputs.background,
                  border: AXIOM.inputs.border,
                }}
              >
                {billableDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          {quoteAnalysis && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-2xl"
              style={{
                background: quoteAnalysis.isProfitable 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : 'rgba(239, 68, 68, 0.1)',
                border: quoteAnalysis.isProfitable
                  ? '2px solid rgba(16, 185, 129, 0.3)'
                  : '2px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: quoteAnalysis.isProfitable 
                      ? AXIOM.iconBoxes.green 
                      : AXIOM.iconBoxes.red,
                    boxShadow: quoteAnalysis.isProfitable
                      ? AXIOM.shadows.iconGreen
                      : AXIOM.shadows.iconRed,
                  }}
                >
                  {quoteAnalysis.isProfitable ? (
                    <TrendingUp className="size-6 text-white" />
                  ) : (
                    <AlertCircle className="size-6 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-1 ${
                    quoteAnalysis.isProfitable ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {quoteAnalysis.isProfitable ? 'Profitable Quote' : 'Low Margin Warning'}
                  </h3>
                  <p className="text-sm text-slate-300">
                    {quoteAnalysis.isProfitable 
                      ? 'This quote meets your target margin and is profitable' 
                      : 'This quote has a low margin and may not be profitable'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                  <p className="text-xs text-slate-400 mb-1">Revenue</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(quoteAnalysis.revenue, orgCurrency)}</p>
                </div>
                <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                  <p className="text-xs text-slate-400 mb-1">Estimated Cost</p>
                  <p className="text-xl font-bold text-amber-400">{formatCurrency(quoteAnalysis.cost, orgCurrency)}</p>
                </div>
                <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                  <p className="text-xs text-slate-400 mb-1">Expected Profit</p>
                  <p className={`text-xl font-bold ${quoteAnalysis.profit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(quoteAnalysis.profit, orgCurrency)}
                  </p>
                </div>
                <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                  <p className="text-xs text-slate-400 mb-1">Margin</p>
                  <p className={`text-xl font-bold ${quoteAnalysis.isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                    {quoteAnalysis.margin.toFixed(1)}%
                  </p>
                </div>
              </div>

              {!quoteAnalysis.isProfitable && (
                <div 
                  className="mt-4 p-3 rounded-xl"
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <p className="text-sm text-amber-400 font-medium">
                    Recommendation: consider increasing the quote to at least {formatCurrency(quoteAnalysis.cost / 0.75, orgCurrency)} for a 25% margin.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Overhead Allocation Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-6 rounded-2xl"
        style={AXIOM.containers.list}
      >
        <h3 className="text-xl font-bold text-white mb-2">Overhead Allocation Settings</h3>
        <p className="text-sm text-slate-400 mb-4">How shared costs are distributed across departments</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl" style={AXIOM.containers.item}>
            <div>
              <p className="text-sm text-white font-medium">Allocation Method</p>
              <p className="text-xs text-slate-400">Current: By Headcount</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={AXIOM.buttons.secondary}
            >
              Change Method
            </motion.button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl text-center" style={AXIOM.containers.item}>
              <p className="text-xs text-slate-400 mb-1">Tools & Software</p>
              <p className="text-lg font-bold text-white">Rs 45,000</p>
              <p className="text-xs text-slate-500">Monthly</p>
            </div>
            <div className="p-4 rounded-xl text-center" style={AXIOM.containers.item}>
              <p className="text-xs text-slate-400 mb-1">Office Expenses</p>
              <p className="text-lg font-bold text-white">Rs 35,000</p>
              <p className="text-xs text-slate-500">Monthly</p>
            </div>
            <div className="p-4 rounded-xl text-center" style={AXIOM.containers.item}>
              <p className="text-xs text-slate-400 mb-1">Infrastructure</p>
              <p className="text-lg font-bold text-white">Rs 25,000</p>
              <p className="text-xs text-slate-500">Monthly</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Commission Calculator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-6 rounded-2xl"
        style={AXIOM.containers.chartBlue}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: AXIOM.iconBoxes.cyan,
                  boxShadow: AXIOM.shadows.iconCyan,
                }}
              >
                <DollarSign className="size-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Commission Calculator</h3>
            </div>
            <p className="text-sm text-slate-400">Calculate Dubai splits & USA commission structures</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={AXIOM.buttons.secondary}
            onClick={() => setShowNewCommissionForm(!showNewCommissionForm)}
          >
            {showNewCommissionForm ? 'Cancel' : 'Add New'}
          </motion.button>
        </div>

        <div className="space-y-6">
          {/* Commission Type Selection */}
          <div className="flex gap-3 flex-wrap">
            {savedCommissions.map(commission => (
              <motion.button
                key={commission.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCommissionId(commission.id)}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={selectedCommissionId === commission.id ? AXIOM.buttons.primary : AXIOM.buttons.secondary}
              >
                {commission.companyName}
              </motion.button>
            ))}
          </div>

          {/* New Commission Form */}
          {showNewCommissionForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 p-4 rounded-xl"
              style={AXIOM.containers.item}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white font-medium mb-2 block">Company Name</label>
                  <input
                    type="text"
                    placeholder="Tech Partners"
                    value={newCommission.companyName}
                    onChange={(e) => setNewCommission({ ...newCommission, companyName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
                <div>
                  <label className="text-white font-medium mb-2 block">Country</label>
                  <input
                    type="text"
                    placeholder="UAE"
                    value={newCommission.country}
                    onChange={(e) => setNewCommission({ ...newCommission, country: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white font-medium mb-2 block">Currency</label>
                  <select 
                    value={newCommission.currency}
                    onChange={(e) => setNewCommission({ ...newCommission, currency: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  >
                    <option value="AED">AED</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="text-white font-medium mb-2 block">Exchange Rate to PKR</label>
                  <input
                    type="number"
                    placeholder="76"
                    value={newCommission.exchangeRateToPKR}
                    onChange={(e) => setNewCommission({ ...newCommission, exchangeRateToPKR: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white font-medium mb-2 block">Your Split (%)</label>
                  <input
                    type="number"
                    placeholder="50"
                    value={newCommission.yourProfitPercentage}
                    onChange={(e) => setNewCommission({ ...newCommission, yourProfitPercentage: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
                <div>
                  <label className="text-white font-medium mb-2 block">Middleman Cut (% of your share)</label>
                  <input
                    type="number"
                    placeholder="25"
                    value={newCommission.middlemanPercentage}
                    onChange={(e) => setNewCommission({ ...newCommission, middlemanPercentage: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                  border: '1px solid rgba(6, 182, 212, 0.5)',
                  color: '#ffffff',
                }}
                onClick={handleAddNewCommission}
              >
                <Plus className="size-4" />
                Save Commission Structure
              </motion.button>
            </motion.div>
          )}

          {/* Commission Calculator */}
          {!showNewCommissionForm && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white font-medium mb-2 block">Deal Amount</label>
                  <div className="flex gap-2">
                    <select 
                      value={selectedCommission?.currency}
                      onChange={(e) => {
                        const updatedCommissions = savedCommissions.map(c => 
                          c.id === selectedCommissionId ? { ...c, currency: e.target.value } : c
                        );
                        setSavedCommissions(updatedCommissions);
                      }}
                      className="px-4 py-3 rounded-xl text-white"
                      style={{
                        background: AXIOM.inputs.background,
                        border: AXIOM.inputs.border,
                      }}
                    >
                      <option value="AED">AED</option>
                      <option value="USD">USD</option>
                    </select>
                    <input
                      type="number"
                      placeholder="10000"
                      value={dealAmount}
                      onChange={(e) => setDealAmount(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl text-white"
                      style={{
                        background: AXIOM.inputs.background,
                        border: AXIOM.inputs.border,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-white font-medium mb-2 block">Exchange Rate to PKR</label>
                  <input
                    type="number"
                    placeholder="76"
                    value={selectedCommission?.exchangeRateToPKR || ''}
                    onChange={(e) => {
                      const updatedCommissions = savedCommissions.map(c => 
                        c.id === selectedCommissionId ? { ...c, exchangeRateToPKR: parseFloat(e.target.value) || 0 } : c
                      );
                      setSavedCommissions(updatedCommissions);
                    }}
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-white font-medium mb-2 block">Your Split (%)</label>
                  <input
                    type="number"
                    placeholder="50"
                    value={selectedCommission?.yourProfitPercentage || ''}
                    onChange={(e) => {
                      const updatedCommissions = savedCommissions.map(c => 
                        c.id === selectedCommissionId ? { ...c, yourProfitPercentage: parseFloat(e.target.value) || 0 } : c
                      );
                      setSavedCommissions(updatedCommissions);
                    }}
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
                <div>
                  <label className="text-white font-medium mb-2 block">Middleman Cut (% of your share)</label>
                  <input
                    type="number"
                    placeholder="25"
                    value={selectedCommission?.middlemanPercentage || ''}
                    onChange={(e) => {
                      const updatedCommissions = savedCommissions.map(c => 
                        c.id === selectedCommissionId ? { ...c, middlemanPercentage: parseFloat(e.target.value) || 0 } : c
                      );
                      setSavedCommissions(updatedCommissions);
                    }}
                    className="w-full px-4 py-3 rounded-xl text-white"
                    style={{
                      background: AXIOM.inputs.background,
                      border: AXIOM.inputs.border,
                    }}
                  />
                </div>
              </div>

              {dealAmount && selectedCommission && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-xl"
                  style={AXIOM.containers.item}
                >
                  <h3 className="text-white font-semibold mb-4">Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Total Deal</span>
                      <span className="text-white font-semibold">{selectedCommission.currency} {parseFloat(dealAmount || '0').toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Your {selectedCommission.yourProfitPercentage}% Share</span>
                      <span className="text-cyan-400 font-semibold">
                        {selectedCommission.currency} {(parseFloat(dealAmount || '0') * (selectedCommission.yourProfitPercentage || 0) / 100).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Middleman Cut ({selectedCommission.middlemanPercentage}%)</span>
                      <span className="text-red-400 font-semibold">
                        -{selectedCommission.currency} {(parseFloat(dealAmount || '0') * (selectedCommission.yourProfitPercentage || 0) / 100 * (selectedCommission.middlemanPercentage || 0) / 100).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-px my-2" style={{ background: 'rgba(148, 163, 184, 0.2)' }} />
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">Your Final Amount</span>
                      <span className="text-emerald-400 font-bold text-lg">
                        {selectedCommission.currency} {(parseFloat(dealAmount || '0') * (selectedCommission.yourProfitPercentage || 0) / 100 * (1 - (selectedCommission.middlemanPercentage || 0) / 100)).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">In PKR</span>
                      <span className="text-emerald-300 font-semibold">
                        PKR {(parseFloat(dealAmount || '0') * (selectedCommission.yourProfitPercentage || 0) / 100 * (1 - (selectedCommission.middlemanPercentage || 0) / 100) * (selectedCommission.exchangeRateToPKR || 1)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Commission Structures Management */}
          <div className="mt-6">
            <h3 className="text-xl font-bold text-white mb-4">Saved Commission Structures</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedCommissions.map((commission, idx) => (
                <motion.div
                  key={commission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + idx * 0.05 }}
                  className="p-4 rounded-xl"
                  style={AXIOM.containers.item}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-semibold">{commission.companyName}</h4>
                    <div className="flex items-center gap-1">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
                        style={{ background: 'rgba(148, 163, 184, 0.1)' }}
                        onClick={() => handleEditCommission(commission.id)}
                      >
                        <Edit2 className="size-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-400"
                        style={{ background: 'rgba(148, 163, 184, 0.1)' }}
                        onClick={() => handleDeleteCommission(commission.id)}
                      >
                        <Trash2 className="size-4" />
                      </motion.button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Currency</p>
                      <p className="text-lg font-bold text-white">{commission.currency}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Exchange Rate</p>
                      <p className="text-lg font-bold text-white">{commission.exchangeRateToPKR}</p>
                    </div>
                  </div>
                  
                  <div className="pt-2 space-y-1" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Your Split (%)</span>
                      <span className="text-sm text-cyan-400 font-medium">{commission.yourProfitPercentage}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Middleman Cut (%)</span>
                      <span className="text-sm text-red-400 font-medium">{commission.middlemanPercentage}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}