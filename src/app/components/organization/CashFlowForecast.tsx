import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Calendar, DollarSign, AlertTriangle, Target, Waves, Loader2 } from 'lucide-react';
import { Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart, ReferenceLine } from 'recharts';
import { AXIOM } from '../../../styles/axiom-tokens';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService } from '@/hooks/useService';

interface ForecastData {
  date: string;
  income: number;
  expense: number;
  netFlow: number;
  balance: number;
  type: 'actual' | 'projected';
}

interface Scenario {
  name: string;
  multiplier: number;
  description: string;
  color: string;
}

export function CashFlowForecast() {
  const svc = useOrgServices();
  const [timeRange, setTimeRange] = useState<'30' | '60' | '90' | '180'>('90');
  const [selectedScenario, setSelectedScenario] = useState<'realistic' | 'best' | 'worst'>('realistic');
  const [viewType, setViewType] = useState<'flow' | 'balance'>('flow');

  const monthsAhead = Math.max(1, Math.round(parseInt(timeRange, 10) / 30));

  const { data: forecastPayload, loading, error } = useService(
    () => svc.reports.getForecast(monthsAhead),
    [timeRange, svc.orgId],
    ['transactions', 'accounts'] as const,
  );

  const currentBalance = forecastPayload?.currentCash ?? 0;

  const scenarios: Record<'realistic' | 'best' | 'worst', Scenario> = {
    realistic: {
      name: 'Realistic',
      multiplier: 1.0,
      description: 'Based on current trends and confirmed contracts',
      color: '#3b82f6'
    },
    best: {
      name: 'Best Case',
      multiplier: 1.3,
      description: 'All opportunities close, no delays',
      color: '#10b981'
    },
    worst: {
      name: 'Worst Case',
      multiplier: 0.7,
      description: 'Some clients delay, unexpected expenses',
      color: '#ef4444'
    }
  };

  /** Model-based daily series when the store has no `cashFlowForecasts` rows yet */
  const syntheticSeries = useMemo(() => {
    const data: ForecastData[] = [];
    const days = parseInt(timeRange, 10);
    let runningBalance = currentBalance;
    const scenario = scenarios[selectedScenario];

    for (let i = 0; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      let baseIncome = 150000;
      let baseExpense = 100000;

      if (i % 30 === 0) {
        baseIncome += 150000;
        baseExpense += 200000;
        baseExpense += 45000;
      }

      if (date.getDay() === 1) {
        baseExpense += 20000;
      }

      const jitter = (n: number) => ((n * 7919 + selectedScenario.length * 31) % 1000) / 1000 - 0.5;
      const incomeVariation = jitter(i) * 50000;
      const expenseVariation = jitter(i + 17) * 30000;

      const income = (baseIncome + incomeVariation) * scenario.multiplier;
      const expense = (baseExpense + expenseVariation) / scenario.multiplier;
      const netFlow = income - expense;
      runningBalance += netFlow;

      data.push({
        date: date.toISOString().split('T')[0],
        income: Math.round(income),
        expense: Math.round(expense),
        netFlow: Math.round(netFlow),
        balance: Math.round(runningBalance),
        type: 'projected',
      });
    }

    return data;
  }, [timeRange, selectedScenario, currentBalance]);

  const chartSeries = useMemo((): ForecastData[] => {
    const rows = forecastPayload?.forecasts;
    if (rows && rows.length > 0) {
      let running = currentBalance;
      return rows.map(f => {
        running += f.net;
        return {
          date: f.date,
          income: f.income,
          expense: f.expenses,
          netFlow: f.net,
          balance: Math.round(running),
          type: 'projected' as const,
        };
      });
    }
    return syntheticSeries;
  }, [forecastPayload?.forecasts, syntheticSeries, currentBalance]);

  const finalBalance =
    chartSeries.length > 0
      ? chartSeries[chartSeries.length - 1].balance
      : forecastPayload?.projectedCash ?? currentBalance;
  const totalIncome = chartSeries.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = chartSeries.reduce((sum, d) => sum + d.expense, 0);
  const netChange = finalBalance - currentBalance;

  const lowestBalance =
    chartSeries.length > 0 ? Math.min(...chartSeries.map(d => d.balance)) : currentBalance;
  const highestBalance =
    chartSeries.length > 0 ? Math.max(...chartSeries.map(d => d.balance)) : currentBalance;

  const dailyBurnFromSeries =
    chartSeries.length > 0 ? totalExpense / chartSeries.length : 0;
  const serviceDailyBurn =
    forecastPayload && forecastPayload.burnRate > 0 ? forecastPayload.burnRate / 30 : null;
  const burnRateDisplay = serviceDailyBurn ?? dailyBurnFromSeries;

  const runwayDays =
    burnRateDisplay > 0 ? currentBalance / burnRateDisplay : Number.POSITIVE_INFINITY;
  const runwayMonths = forecastPayload?.runway;

  const cashCrunchThreshold = 500000;
  const cashCrunches = chartSeries.filter(d => d.balance < cashCrunchThreshold);

  const monthlyData = useMemo(() => {
    const months = new Map<string, { income: number, expense: number, count: number }>();
    
    chartSeries.forEach(d => {
      const month = d.date.substring(0, 7); // YYYY-MM
      const existing = months.get(month) || { income: 0, expense: 0, count: 0 };
      months.set(month, {
        income: existing.income + d.income,
        expense: existing.expense + d.expense,
        count: existing.count + 1
      });
    });

    return Array.from(months.entries()).map(([month, data]) => ({
      month,
      income: Math.round(data.income),
      expense: Math.round(data.expense),
      netFlow: Math.round(data.income - data.expense),
      days: data.count
    }));
  }, [chartSeries]);

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background: AXIOM.backgrounds.main }}>
      {/* Header */}
      <motion.div {...AXIOM.animations.fadeInTop}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.cyan,
                boxShadow: AXIOM.shadows.iconCyan,
              }}
            >
              <Waves className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle}>
                Cash Flow Forecast
              </h1>
              <p className="text-slate-400 text-sm">Predict future cash position and plan ahead</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {loading && (
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Updating…
              </span>
            )}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '30' | '60' | '90' | '180')}
              className="px-4 py-2 rounded-xl text-white text-sm"
              style={{
                background: AXIOM.inputs.background,
                border: AXIOM.inputs.border,
              }}
            >
              <option value="30">30 Days</option>
              <option value="60">60 Days</option>
              <option value="90">90 Days</option>
              <option value="180">180 Days</option>
            </select>
          </div>
        </div>
      </motion.div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm text-amber-200/90"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
          }}
          role="status"
        >
          Could not load live balances ({error}). The chart below uses a model projection from your last known cash position.
        </div>
      )}

      {/* Scenario Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(scenarios) as Array<keyof typeof scenarios>).map((key, idx) => {
          const scenario = scenarios[key];
          const isSelected = selectedScenario === key;
          
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedScenario(key)}
              className="p-4 rounded-2xl cursor-pointer transition-all"
              style={{
                background: isSelected 
                  ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))'
                  : AXIOM.containers.list.background,
                border: isSelected
                  ? '2px solid rgba(6, 182, 212, 0.5)'
                  : AXIOM.containers.list.border,
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: scenario.color }}
                />
                <h3 className="text-white font-semibold">{scenario.name}</h3>
                {isSelected && (
                  <span className="ml-auto px-2 py-1 rounded-lg text-xs font-medium" style={AXIOM.badges.info}>
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{scenario.description}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Current Balance</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(currentBalance, 'PKR')}
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
          transition={{ delay: 0.25 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Projected Balance</p>
              <p className={`text-2xl font-bold ${netChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(finalBalance, 'PKR')}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {netChange > 0 ? '+' : ''}{formatCurrency(netChange, 'PKR')} change
              </p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: netChange > 0 ? AXIOM.iconBoxes.green : AXIOM.iconBoxes.red,
                boxShadow: netChange > 0 ? AXIOM.shadows.iconGreen : AXIOM.shadows.iconRed,
              }}
            >
              {netChange > 0 ? (
                <TrendingUp className="size-6 text-white" />
              ) : (
                <TrendingDown className="size-6 text-white" />
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Burn Rate</p>
              <p className="text-2xl font-bold text-cyan-400">
                {formatCurrency(burnRateDisplay, 'PKR')}
              </p>
              <p className="text-xs text-slate-400 mt-1">per day</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.cyan,
                boxShadow: AXIOM.shadows.iconCyan,
              }}
            >
              <Waves className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Runway</p>
              <p className="text-2xl font-bold text-purple-400">
                {runwayMonths != null && Number.isFinite(runwayMonths) && runwayMonths !== Number.POSITIVE_INFINITY
                  ? `~${runwayMonths} mo`
                  : Number.isFinite(runwayDays)
                    ? `${Math.round(runwayDays)} days`
                    : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {runwayMonths != null && Number.isFinite(runwayMonths) ? 'from monthly burn' : 'at daily burn'}
              </p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.purple,
                boxShadow: AXIOM.shadows.iconPurple,
              }}
            >
              <Calendar className="size-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Alerts */}
      {cashCrunches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl"
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-white font-semibold mb-1">Cash Flow Alert</p>
              <p className="text-xs text-slate-400">
                Your balance may drop below {formatCurrency(cashCrunchThreshold, 'PKR')} on {cashCrunches.length} day(s) 
                in the next {timeRange} days. Consider:
              </p>
              <ul className="text-xs text-slate-400 mt-2 space-y-1 ml-4">
                <li>• Following up on pending invoices</li>
                <li>• Negotiating payment terms with vendors</li>
                <li>• Building a cash reserve</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* View Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-2"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setViewType('flow')}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={viewType === 'flow' ? AXIOM.buttons.primary : AXIOM.buttons.secondary}
        >
          Cash Flow
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setViewType('balance')}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={viewType === 'balance' ? AXIOM.buttons.primary : AXIOM.buttons.secondary}
        >
          Balance Trend
        </motion.button>
      </motion.div>

      {/* Charts */}
      <AnimatePresence mode="wait">
        {viewType === 'flow' ? (
          <motion.div
            key="flow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.chartBlue}
          >
            <h3 className="text-xl font-bold text-white mb-4">Daily Cash Flow</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value / 1000}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0f',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => formatCurrency(value, 'PKR')}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Legend />
                <Bar dataKey="income" fill="#10b981" name="Income" opacity={0.8} />
                <Bar dataKey="expense" fill="#ef4444" name="Expense" opacity={0.8} />
                <Line 
                  type="monotone" 
                  dataKey="netFlow" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Net Flow"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>
        ) : (
          <motion.div
            key="balance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.chartBlue}
          >
            <h3 className="text-xl font-bold text-white mb-4">Balance Projection</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartSeries}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={scenarios[selectedScenario].color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={scenarios[selectedScenario].color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value / 1000}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0f',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => formatCurrency(value, 'PKR')}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke={scenarios[selectedScenario].color}
                  strokeWidth={3}
                  fill="url(#balanceGradient)"
                  name="Balance"
                />
                {/* Threshold line */}
                <Line
                  type="monotone"
                  dataKey={() => cashCrunchThreshold}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Alert Threshold"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monthly Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="p-6 rounded-2xl"
        style={AXIOM.containers.list}
      >
        <h3 className="text-xl font-bold text-white mb-4">Monthly Breakdown</h3>
        <div className="space-y-3">
          {monthlyData.map((month, idx) => (
            <motion.div
              key={month.month}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + idx * 0.05 }}
              className="p-4 rounded-xl"
              style={AXIOM.containers.item}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">
                    {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-xs text-slate-400">{month.days} days</p>
                </div>
                <span 
                  className="px-3 py-1 rounded-lg text-sm font-medium"
                  style={month.netFlow > 0 ? AXIOM.badges.success : AXIOM.badges.danger}
                >
                  {month.netFlow > 0 ? '+' : ''}{formatCurrency(month.netFlow, 'PKR')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Income</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {formatCurrency(month.income, 'PKR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Expense</p>
                  <p className="text-lg font-bold text-red-400">
                    {formatCurrency(month.expense, 'PKR')}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="p-6 rounded-2xl"
        style={AXIOM.containers.chartBlue}
      >
        <div className="flex items-start gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: AXIOM.iconBoxes.blue,
              boxShadow: AXIOM.shadows.iconBlue,
            }}
          >
            <Target className="size-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-white mb-3">AI Insights</p>
            <div className="space-y-2 text-sm text-slate-300">
              {netChange > 0 ? (
                <p>✓ Your cash position is projected to improve by {formatCurrency(netChange, 'PKR')} over the next {timeRange} days.</p>
              ) : (
                <p>⚠ Your cash position may decrease by {formatCurrency(Math.abs(netChange), 'PKR')} over the next {timeRange} days.</p>
              )}
              
              {((Number.isFinite(runwayDays) && runwayDays < 90) ||
                (runwayMonths != null && Number.isFinite(runwayMonths) && runwayMonths < 3)) && (
                <p>
                  ⚠ Runway looks tight
                  {Number.isFinite(runwayDays) && runwayDays < 90
                    ? ` (~${Math.round(runwayDays)} days at this burn).`
                    : runwayMonths != null && Number.isFinite(runwayMonths)
                      ? ` (~${runwayMonths} months at monthly burn).`
                      : '.'}{' '}
                  Consider slowing spend or bringing forward income.
                </p>
              )}

              {currentBalance > 0 && lowestBalance < currentBalance * 0.5 && (
                <p>⚠ Your balance may drop to {formatCurrency(lowestBalance, 'PKR')} (50% of current). Plan for this dip.</p>
              )}
              
              <p>→ Average daily income: {formatCurrency(chartSeries.length ? totalIncome / chartSeries.length : 0, 'PKR')}</p>
              <p>→ Average daily expense: {formatCurrency(chartSeries.length ? totalExpense / chartSeries.length : 0, 'PKR')}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}