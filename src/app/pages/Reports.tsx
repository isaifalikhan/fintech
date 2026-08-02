import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  Briefcase,
  Target,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { PremiumAreaChart, PremiumBarChart, PremiumDonutChart, MixedChart } from '../components/charts/AdvancedCharts';
import { MetricComparisonCard, GaugeWidget, CompactStatGrid } from '../components/widgets/DataWidgets';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { PremiumSelect } from '../components/forms/PremiumInputs';

export function Reports() {
  const [reportType, setReportType] = useState('profit-loss');
  const [dateRange, setDateRange] = useState('ytd');

  // Profit & Loss Data
  const profitLossData = [
    { name: 'Jan', revenue: 125000, cogs: 45000, opex: 44000, netProfit: 36000 },
    { name: 'Feb', revenue: 142000, cogs: 52000, opex: 43000, netProfit: 47000 },
    { name: 'Mar', revenue: 138000, cogs: 48000, opex: 44000, netProfit: 46000 },
    { name: 'Apr', revenue: 165000, cogs: 58000, opex: 44000, netProfit: 63000 },
    { name: 'May', revenue: 158000, cogs: 54000, opex: 44000, netProfit: 60000 },
    { name: 'Jun', revenue: 178000, cogs: 62000, opex: 46000, netProfit: 70000 }
  ];

  // Revenue by Client
  const revenueByClient = [
    { name: 'ABC Corp', value: 185000, color: '#3b82f6' },
    { name: 'XYZ Ltd', value: 142000, color: '#8b5cf6' },
    { name: 'DEF Inc', value: 98000, color: '#ec4899' },
    { name: 'GHI Corp', value: 76000, color: '#10b981' },
    { name: 'JKL Company', value: 54000, color: '#f59e0b' },
    { name: 'Others', value: 125000, color: '#6366f1' }
  ];

  // Department Profitability
  const departmentData = [
    { name: 'Jan', engineering: 85000, sales: 55000, marketing: 28000, operations: 22000 },
    { name: 'Feb', engineering: 92000, sales: 62000, marketing: 32000, operations: 25000 },
    { name: 'Mar', engineering: 88000, sales: 58000, marketing: 30000, operations: 24000 },
    { name: 'Apr', engineering: 102000, sales: 68000, marketing: 38000, operations: 28000 },
    { name: 'May', engineering: 96000, sales: 64000, marketing: 35000, operations: 26000 },
    { name: 'Jun', engineering: 108000, sales: 72000, marketing: 42000, operations: 30000 }
  ];

  // Cash Flow Forecast
  const cashFlowForecast = [
    { name: 'Week 1', actual: 45000, forecast: 42000, target: 50000 },
    { name: 'Week 2', actual: 52000, forecast: 48000, target: 50000 },
    { name: 'Week 3', actual: 48000, forecast: 51000, target: 50000 },
    { name: 'Week 4', actual: 55000, forecast: 53000, target: 50000 },
    { name: 'Week 5', forecast: 56000, target: 50000 },
    { name: 'Week 6', forecast: 58000, target: 50000 }
  ];

  // Expense Categories
  const expenseCategories = [
    { name: 'Salaries', value: 285000, color: '#3b82f6', change: 3.2 },
    { name: 'Cloud Services', value: 68000, color: '#8b5cf6', change: 12.5 },
    { name: 'Marketing', value: 52000, color: '#ec4899', change: 18.7 },
    { name: 'Office', value: 38000, color: '#10b981', change: -2.1 },
    { name: 'Software', value: 28000, color: '#f59e0b', change: 5.4 },
    { name: 'Other', value: 22000, color: '#6366f1', change: -8.3 }
  ];

  return (
    <div className="min-h-screen bg-[#000000] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #60a5fa 50%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Financial Reports</h1>
          <p className="text-slate-400">Comprehensive insights into your business performance</p>
        </div>

        <div className="flex items-center gap-3">
          <PremiumSelect
            options={[
              { value: 'profit-loss', label: 'Profit & Loss' },
              { value: 'cash-flow', label: 'Cash Flow' },
              { value: 'balance-sheet', label: 'Balance Sheet' },
              { value: 'revenue-analysis', label: 'Revenue Analysis' }
            ]}
            value={reportType}
            onChange={setReportType}
          />

          <PremiumSelect
            options={[
              { value: 'mtd', label: 'Month to Date' },
              { value: 'qtd', label: 'Quarter to Date' },
              { value: 'ytd', label: 'Year to Date' },
              { value: 'custom', label: 'Custom Range' }
            ]}
            value={dateRange}
            onChange={setDateRange}
          />

          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-[#0f0f13] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm font-medium">Total Revenue</p>
                <h3 className="text-3xl font-bold text-white mt-2">$906K</h3>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.6)',
              }}>
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                <ArrowUpRight className="w-3 h-3" />
                15.3%
              </div>
              <span className="text-slate-500 text-xs">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f13] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm font-medium">Net Profit</p>
                <h3 className="text-3xl font-bold text-white mt-2">$322K</h3>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.6)',
              }}>
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                <ArrowUpRight className="w-3 h-3" />
                22.1%
              </div>
              <span className="text-slate-500 text-xs">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f13] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm font-medium">Profit Margin</p>
                <h3 className="text-3xl font-bold text-white mt-2">35.5%</h3>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                boxShadow: '0 10px 30px -10px rgba(139, 92, 246, 0.6)',
              }}>
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                <ArrowUpRight className="w-3 h-3" />
                2.8%
              </div>
              <span className="text-slate-500 text-xs">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f13] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm font-medium">Active Projects</p>
                <h3 className="text-3xl font-bold text-white mt-2">48</h3>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                boxShadow: '0 10px 30px -10px rgba(245, 158, 11, 0.6)',
              }}>
                <Briefcase className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                <ArrowUpRight className="w-3 h-3" />
                12 new
              </div>
              <span className="text-slate-500 text-xs">this month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Report Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profit & Loss Statement */}
        <div className="lg:col-span-2 space-y-6">
          <MixedChart
            data={profitLossData}
            barKeys={[
              { key: 'revenue', name: 'Revenue', color: '#3b82f6' },
              { key: 'cogs', name: 'COGS', color: '#ef4444' },
              { key: 'opex', name: 'Operating Expenses', color: '#f59e0b' }
            ]}
            lineKeys={[
              { key: 'netProfit', name: 'Net Profit', color: '#10b981' }
            ]}
            title="Profit & Loss Statement"
            subtitle="6-month financial performance"
            height={350}
          />

          <PremiumBarChart
            data={departmentData}
            dataKeys={[
              { key: 'engineering', name: 'Engineering', color: '#3b82f6' },
              { key: 'sales', name: 'Sales', color: '#8b5cf6' },
              { key: 'marketing', name: 'Marketing', color: '#ec4899' },
              { key: 'operations', name: 'Operations', color: '#10b981' }
            ]}
            title="Revenue by Department"
            subtitle="Monthly revenue contribution"
            height={320}
          />
        </div>

        {/* Side Metrics */}
        <div className="space-y-6">
          <GaugeWidget
            title="YTD Revenue Target"
            value={906}
            max={1200}
            thresholds={{ low: 30, medium: 60, high: 80 }}
            unit="K"
          />

          <CompactStatGrid
            stats={[
              { label: 'Clients', value: '124', icon: Users, color: '#3b82f6' },
              { label: 'Projects', value: '48', icon: Briefcase, color: '#8b5cf6' },
              { label: 'Avg Deal', value: '$7.3K', icon: DollarSign, color: '#10b981' },
              { label: 'Win Rate', value: '68%', icon: Target, color: '#f59e0b' }
            ]}
          />

          <MetricComparisonCard
            title="Year over Year Growth"
            metrics={[
              { label: 'Revenue', current: 906000, previous: 785000, unit: '' },
              { label: 'Clients', current: 124, previous: 108, unit: '' },
              { label: 'Profit Margin', current: 35.5, previous: 32.8, unit: '%' },
              { label: 'Team Size', current: 42, previous: 38, unit: '' }
            ]}
          />
        </div>
      </div>

      {/* Revenue & Expense Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PremiumDonutChart
          data={revenueByClient}
          title="Revenue by Client"
          subtitle="Total: $680K YTD"
          showPercentages
          height={350}
        />

        <Card className="bg-[#0f0f13] border-white/10">
          <CardContent className="p-6">
            <h3 className="text-white font-medium text-lg mb-6">Expense Categories</h3>
            <div className="space-y-4">
              {expenseCategories.map((category, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-slate-300 text-sm">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium text-sm">
                        ${category.value.toLocaleString()}
                      </span>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                        category.change >= 0
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {category.change >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {Math.abs(category.change)}%
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: category.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(category.value / 285000) * 100}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Forecast */}
      <PremiumAreaChart
        data={cashFlowForecast}
        dataKeys={[
          { key: 'actual', name: 'Actual', color: '#3b82f6', gradient: 'url(#gradientBlue)' },
          { key: 'forecast', name: 'Forecast', color: '#8b5cf6', gradient: 'url(#gradientPurple)' },
          { key: 'target', name: 'Target', color: '#10b981', gradient: 'url(#gradientGreen)' }
        ]}
        title="Cash Flow Forecast"
        subtitle="6-week projection with targets"
        height={300}
      />
    </div>
  );
}