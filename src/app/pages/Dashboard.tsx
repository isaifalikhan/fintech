import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Briefcase,
  Target,
  Clock,
  ArrowUpRight,
  Calendar,
  Download,
  RefreshCw,
  Settings,
  Upload,
  BarChart3
} from 'lucide-react';
import { PremiumAreaChart, PremiumBarChart, PremiumDonutChart, MixedChart } from '../components/charts/AdvancedCharts';
import { PremiumStatCard, ProgressRingCard, MetricComparisonCard } from '../components/widgets/DataWidgets';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { QuickStatsTicker } from '../components/dashboard/QuickStatsTicker';
import { ActivityTimeline, SAMPLE_ACTIVITIES } from '../components/activity/ActivityTimeline';
import { useTheme } from '../../contexts/ThemeContext';

export function Dashboard() {
  const [dateRange, setDateRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { theme } = useTheme();

  // Sample data
  const cashFlowData = [
    { name: 'Jan', inflow: 125000, outflow: 89000, net: 36000 },
    { name: 'Feb', inflow: 142000, outflow: 95000, net: 47000 },
    { name: 'Mar', inflow: 138000, outflow: 92000, net: 46000 },
    { name: 'Apr', inflow: 165000, outflow: 102000, net: 63000 },
    { name: 'May', inflow: 158000, outflow: 98000, net: 60000 },
    { name: 'Jun', inflow: 178000, outflow: 108000, net: 70000 }
  ];

  const departmentExpenses = [
    { name: 'Jan', engineering: 45000, sales: 32000, marketing: 18000, operations: 15000 },
    { name: 'Feb', engineering: 48000, sales: 35000, marketing: 22000, operations: 16000 },
    { name: 'Mar', engineering: 46000, sales: 33000, marketing: 20000, operations: 15000 },
    { name: 'Apr', engineering: 52000, sales: 38000, marketing: 25000, operations: 18000 },
    { name: 'May', engineering: 50000, sales: 36000, marketing: 23000, operations: 17000 },
    { name: 'Jun', engineering: 55000, sales: 40000, marketing: 28000, operations: 19000 }
  ];

  const expenseBreakdown = [
    { name: 'Salaries & Benefits', value: 285000, color: '#3b82f6' },
    { name: 'Cloud Services', value: 68000, color: '#8b5cf6' },
    { name: 'Marketing & Ads', value: 52000, color: '#ec4899' },
    { name: 'Office & Rent', value: 38000, color: '#10b981' },
    { name: 'Software & Tools', value: 28000, color: '#f59e0b' },
    { name: 'Other Expenses', value: 22000, color: '#6366f1' }
  ];

  const revenueVsProfit = [
    { name: 'Jan', revenue: 125000, expenses: 89000, profit: 36000 },
    { name: 'Feb', revenue: 142000, expenses: 95000, profit: 47000 },
    { name: 'Mar', revenue: 138000, expenses: 92000, profit: 46000 },
    { name: 'Apr', revenue: 165000, expenses: 102000, profit: 63000 },
    { name: 'May', revenue: 158000, expenses: 98000, profit: 60000 },
    { name: 'Jun', revenue: 178000, expenses: 108000, profit: 70000 }
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  return (
    <div 
      className="size-full overflow-auto"
      style={{
        background: theme === 'dark' ? '#0a0a0a' : '#f8fafc',
      }}
    >
      {/* Header - UNIFIED BLUE THEME */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-8 py-6"
        style={{
          background: theme === 'dark' 
            ? 'rgba(10, 10, 10, 1)'
            : 'rgba(255, 255, 255, 1)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="p-3 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.6)',
              }}
            >
              <BarChart3 className="size-6 text-white" />
            </div>
            <div>
              <h1 
                className="text-4xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #60a5fa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Dashboard
              </h1>
              <p 
                className="text-sm"
                style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}
              >
                Welcome back! Here's what's happening with your business
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* LIVE Indicator */}
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: theme === 'dark' 
                  ? 'rgba(59, 130, 246, 0.15)'
                  : 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <motion.div 
                className="w-2 h-2 rounded-full"
                style={{ background: '#3b82f6' }}
                animate={{
                  boxShadow: [
                    '0 0 10px rgba(59, 130, 246, 0.8)',
                    '0 0 20px rgba(59, 130, 246, 1)',
                    '0 0 10px rgba(59, 130, 246, 0.8)',
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs font-medium" style={{ color: '#60a5fa' }}>LIVE</span>
            </div>

            {/* Modern Date Range Selector - BLUE THEME */}
            <div 
              className="flex items-center gap-2 p-1 rounded-xl"
              style={{
                background: theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.5)',
                border: theme === 'dark' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(148, 163, 184, 0.2)',
              }}
            >
              {['7d', '30d', '90d', '1y'].map((range) => (
                <motion.button
                  key={range}
                  onClick={() => setDateRange(range)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: dateRange === range
                      ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                      : 'transparent',
                    color: dateRange === range 
                      ? '#ffffff'
                      : theme === 'dark' ? '#94a3b8' : '#64748b',
                    boxShadow: dateRange === range
                      ? '0 4px 12px -2px rgba(59, 130, 246, 0.5)'
                      : 'none',
                  }}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
                </motion.button>
              ))}
            </div>

            <motion.button
              onClick={handleRefresh}
              disabled={isRefreshing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm"
              style={{
                background: theme === 'dark' 
                  ? 'rgba(15, 30, 60, 0.5)'
                  : 'rgba(255, 255, 255, 0.9)',
                border: theme === 'dark'
                  ? '1px solid rgba(59, 130, 246, 0.3)'
                  : '1px solid rgba(148, 163, 184, 0.2)',
                color: theme === 'dark' ? '#60a5fa' : '#3b82f6',
              }}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: '2px solid rgba(59, 130, 246, 0.5)',
                color: '#ffffff',
                boxShadow: '0 8px 24px -8px rgba(59, 130, 246, 0.6)',
              }}
            >
              <Download className="w-4 h-4" />
              Export Report
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Content Area */}
      <div className="p-8 space-y-8">

      {/* Quick Stats Ticker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <QuickStatsTicker />
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <PremiumStatCard
          title="Total Revenue"
          value={178000}
          change={15.3}
          changeLabel="vs last month"
          icon={DollarSign}
          gradient="from-blue-500 to-cyan-500"
          prefix="$"
          sparklineData={[125, 142, 138, 165, 158, 178]}
        />
        
        <PremiumStatCard
          title="Net Profit"
          value={70000}
          change={11.1}
          changeLabel="vs last month"
          icon={TrendingUp}
          gradient="from-green-500 to-emerald-500"
          prefix="$"
          sparklineData={[36, 47, 46, 63, 60, 70]}
        />
        
        <PremiumStatCard
          title="Active Clients"
          value={48}
          change={8.5}
          changeLabel="vs last month"
          icon={Users}
          gradient="from-purple-500 to-pink-500"
          sparklineData={[42, 43, 44, 45, 46, 48]}
        />
        
        <PremiumStatCard
          title="Profit Margin"
          value="39.3"
          change={2.8}
          changeLabel="vs last month"
          icon={Target}
          gradient="from-amber-500 to-orange-500"
          suffix="%"
          sparklineData={[28.8, 33.1, 33.3, 38.2, 38.0, 39.3]}
        />
      </motion.div>

      {/* Main Charts Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Cash Flow Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <PremiumAreaChart
            data={cashFlowData}
            dataKeys={[
              { key: 'inflow', name: 'Cash Inflow', color: '#10b981', gradient: 'url(#gradientGreen)' },
              { key: 'outflow', name: 'Cash Outflow', color: '#ef4444', gradient: 'url(#gradientPink)' },
              { key: 'net', name: 'Net Cash Flow', color: '#3b82f6', gradient: 'url(#gradientBlue)' }
            ]}
            title="Cash Flow Overview"
            subtitle="6-month trend analysis"
            showTrend
            height={350}
          />
        </div>

        {/* Monthly Target Progress */}
        <div className="space-y-6">
          <ProgressRingCard
            title="Monthly Revenue Target"
            percentage={89}
            current="$178,000"
            target="$200,000"
            icon={Target}
            gradient="from-blue-500 to-purple-500"
          />
          
          <motion.div
            whileHover={{ y: -4 }}
            className="p-6 rounded-2xl"
            style={{
              background: theme === 'dark'
                ? 'linear-gradient(135deg, rgba(15, 30, 60, 0.5) 0%, rgba(5, 10, 30, 0.7) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 100%)',
              border: theme === 'dark'
                ? '1px solid rgba(59, 130, 246, 0.2)'
                : '1px solid rgba(148, 163, 184, 0.15)',
              boxShadow: theme === 'dark'
                ? '0 8px 24px -8px rgba(59, 130, 246, 0.3)'
                : '0 4px 16px -4px rgba(59, 130, 246, 0.1)',
            }}
          >
            <h3 
              className="font-bold text-lg mb-4"
              style={{ color: theme === 'dark' ? '#ffffff' : '#1e293b' }}
            >
              Quick Actions
            </h3>
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-4 py-3 rounded-xl font-semibold flex items-center gap-3 text-sm"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  color: '#ffffff',
                  boxShadow: '0 4px 16px -4px rgba(59, 130, 246, 0.5)',
                }}
              >
                <Upload className="w-4 h-4" />
                Import Statement
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-4 py-3 rounded-xl font-semibold flex items-center gap-3 text-sm"
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
                <Briefcase className="w-4 h-4" />
                New Client
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-4 py-3 rounded-xl font-semibold flex items-center gap-3 text-sm"
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
                <Calendar className="w-4 h-4" />
                Schedule Payment
              </motion.button>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Revenue & Expenses Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <MixedChart
          data={revenueVsProfit}
          barKeys={[
            { key: 'revenue', name: 'Revenue', color: '#3b82f6' },
            { key: 'expenses', name: 'Expenses', color: '#8b5cf6' }
          ]}
          lineKeys={[
            { key: 'profit', name: 'Net Profit', color: '#10b981' }
          ]}
          title="Revenue, Expenses & Profit"
          subtitle="6-month trend with profit overlay"
          height={320}
        />

        <PremiumDonutChart
          data={expenseBreakdown}
          title="Expense Distribution"
          subtitle="Total: $493,000 this month"
          height={320}
          showPercentages
        />
      </motion.div>

      {/* Department Expenses & Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2">
          <PremiumBarChart
            data={departmentExpenses}
            dataKeys={[
              { key: 'engineering', name: 'Engineering', color: '#3b82f6' },
              { key: 'sales', name: 'Sales', color: '#8b5cf6' },
              { key: 'marketing', name: 'Marketing', color: '#ec4899' },
              { key: 'operations', name: 'Operations', color: '#10b981' }
            ]}
            title="Department Expenses"
            subtitle="Monthly breakdown by department"
            stacked={false}
            height={320}
          />
        </div>

        <MetricComparisonCard
          title="Performance vs Last Month"
          metrics={[
            { label: 'Revenue', current: 178000, previous: 158000, unit: '' },
            { label: 'Clients', current: 48, previous: 44, unit: '' },
            { label: 'Avg Deal Size', current: 3708, previous: 3590, unit: '' },
            { label: 'Profit Margin', current: 39.3, previous: 38.0, unit: '%' }
          ]}
        />
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2">
          <ActivityTimeline
            events={SAMPLE_ACTIVITIES}
            showFilters
            maxHeight="500px"
          />
        </div>

        {/* Insights & Alerts - BLUE THEME */}
        <motion.div
          whileHover={{ y: -4 }}
          className="p-6 rounded-2xl"
          style={{
            background: theme === 'dark'
              ? 'linear-gradient(135deg, rgba(15, 30, 60, 0.5) 0%, rgba(5, 10, 30, 0.7) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.95) 100%)',
            border: theme === 'dark'
              ? '1px solid rgba(59, 130, 246, 0.2)'
              : '1px solid rgba(148, 163, 184, 0.15)',
            boxShadow: theme === 'dark'
              ? '0 8px 24px -8px rgba(59, 130, 246, 0.3)'
              : '0 4px 16px -4px rgba(59, 130, 246, 0.1)',
          }}
        >
          <h3 
            className="font-bold text-lg mb-4"
            style={{ color: theme === 'dark' ? '#ffffff' : '#1e293b' }}
          >
            AI Insights
          </h3>
          <div className="space-y-4">
            {/* Positive Insight */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.02, x: 4 }}
              className="p-4 rounded-lg"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    boxShadow: '0 4px 12px -4px rgba(16, 185, 129, 0.6)',
                  }}
                >
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-green-400 font-bold text-sm mb-1">Revenue Up 15.3%</p>
                  <p 
                    className="text-xs"
                    style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  >
                    Your revenue is trending upward. June was your best month yet!
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Warning */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.02, x: 4 }}
              className="p-4 rounded-lg"
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '2px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    boxShadow: '0 4px 12px -4px rgba(245, 158, 11, 0.6)',
                  }}
                >
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-amber-400 font-bold text-sm mb-1">Upcoming Bills</p>
                  <p 
                    className="text-xs"
                    style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  >
                    You have $45,000 in bills due in the next 7 days.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02, x: 4 }}
              className="p-4 rounded-lg"
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '2px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    boxShadow: '0 4px 12px -4px rgba(59, 130, 246, 0.6)',
                  }}
                >
                  <ArrowUpRight className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-blue-400 font-bold text-sm mb-1">Profit Margin Improved</p>
                  <p 
                    className="text-xs"
                    style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  >
                    Your profit margin increased to 39.3%, up from 38% last month.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Action Needed */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02, x: 4 }}
              className="p-4 rounded-lg"
              style={{
                background: 'rgba(139, 92, 246, 0.15)',
                border: '2px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    boxShadow: '0 4px 12px -4px rgba(139, 92, 246, 0.6)',
                  }}
                >
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-purple-400 font-bold text-sm mb-1">Categorize Transactions</p>
                  <p 
                    className="text-xs"
                    style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                  >
                    12 transactions need review and categorization.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      </div>
    </div>
  );
}