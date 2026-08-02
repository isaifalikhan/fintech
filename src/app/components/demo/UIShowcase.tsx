import { useState } from 'react';
import { PremiumAreaChart, PremiumBarChart, PremiumDonutChart, MixedChart, SAMPLE_CHART_DATA, CHART_COLORS } from '../charts/AdvancedCharts';
import { PremiumStatCard, MiniBarCard, ProgressRingCard, CompactStatGrid, MetricComparisonCard, GaugeWidget, SAMPLE_WIDGET_DATA } from '../widgets/DataWidgets';
import { ModernTable, Column, TableAction, SAMPLE_TABLE_DATA } from '../table/ModernTable';
import { PremiumInput, PasswordInput, CurrencyInput, PremiumSelect, ToggleSwitch, PremiumSlider } from '../forms/PremiumInputs';
import { SkeletonCard, SkeletonTable, SkeletonChart, SkeletonStatsGrid, ContentLoader, DataProcessingLoader, ProgressLoader } from '../loading/LoadingStates';
import { DollarSign, Users, ShoppingCart, TrendingUp, Activity, Target, Eye, Edit, Trash2 } from 'lucide-react';

export function UIShowcase() {
  const [selectedTab, setSelectedTab] = useState<'charts' | 'widgets' | 'tables' | 'forms' | 'loading'>('charts');
  const [formValues, setFormValues] = useState({
    email: '',
    password: '',
    amount: '',
    category: '',
    notifications: true,
    budget: 50
  });

  // Table columns
  const columns: Column[] = [
    {
      key: 'transaction',
      label: 'Transaction',
      sortable: true,
      render: (value) => <span className="font-medium text-white">{value}</span>
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (value) => <span className="text-slate-400">{value}</span>
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      align: 'right',
      render: (value) => (
        <span className={value > 0 ? 'text-green-400' : 'text-red-400'}>
          ${Math.abs(value).toLocaleString()}
        </span>
      )
    },
    {
      key: 'category',
      label: 'Category',
      render: (value) => (
        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">
          {value}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 text-xs rounded-full border ${
          value === 'completed'
            ? 'bg-green-500/10 text-green-400 border-green-500/20'
            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
        }`}>
          {value}
        </span>
      )
    }
  ];

  const tableActions: TableAction[] = [
    { label: 'View', icon: Eye, onClick: (row) => console.log('View', row) },
    { label: 'Edit', icon: Edit, onClick: (row) => console.log('Edit', row) },
    { label: 'Delete', icon: Trash2, onClick: (row) => console.log('Delete', row), variant: 'destructive' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Finance OS UI Components</h1>
          <p className="text-slate-400">Premium data visualization and UI components showcase</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-4">
          {['charts', 'widgets', 'tables', 'forms', 'loading'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab as any)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                selectedTab === tab
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Charts Tab */}
        {selectedTab === 'charts' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Advanced Charts</h2>
              <div className="grid grid-cols-1 gap-6">
                <PremiumAreaChart
                  data={SAMPLE_CHART_DATA.revenue}
                  dataKeys={[
                    { key: 'revenue', name: 'Revenue', color: '#3b82f6', gradient: 'url(#gradientBlue)' },
                    { key: 'expenses', name: 'Expenses', color: '#ef4444', gradient: 'url(#gradientPink)' },
                    { key: 'profit', name: 'Profit', color: '#10b981', gradient: 'url(#gradientGreen)' }
                  ]}
                  title="Revenue vs Expenses"
                  subtitle="Last 6 months performance"
                  showTrend
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PremiumBarChart
                    data={SAMPLE_CHART_DATA.revenue}
                    dataKeys={[
                      { key: 'revenue', name: 'Revenue', color: '#3b82f6' },
                      { key: 'expenses', name: 'Expenses', color: '#8b5cf6' }
                    ]}
                    title="Monthly Comparison"
                    subtitle="Revenue vs Expenses"
                  />

                  <PremiumDonutChart
                    data={SAMPLE_CHART_DATA.categories}
                    title="Expense Breakdown"
                    subtitle="By category"
                  />
                </div>

                <MixedChart
                  data={SAMPLE_CHART_DATA.revenue}
                  barKeys={[
                    { key: 'revenue', name: 'Revenue', color: '#3b82f6' }
                  ]}
                  lineKeys={[
                    { key: 'profit', name: 'Profit Margin', color: '#10b981' }
                  ]}
                  title="Revenue & Profit Trend"
                  subtitle="Combined view"
                />
              </div>
            </div>
          </div>
        )}

        {/* Widgets Tab */}
        {selectedTab === 'widgets' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Data Widgets</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <PremiumStatCard
                  title="Total Revenue"
                  value={127500}
                  change={12.5}
                  icon={DollarSign}
                  gradient="from-blue-500 to-cyan-500"
                  prefix="$"
                  sparklineData={SAMPLE_WIDGET_DATA.revenue.sparkline}
                />
                <PremiumStatCard
                  title="Active Users"
                  value={1247}
                  change={8.2}
                  icon={Users}
                  gradient="from-purple-500 to-pink-500"
                  sparklineData={SAMPLE_WIDGET_DATA.users.sparkline}
                />
                <PremiumStatCard
                  title="Total Orders"
                  value={342}
                  change={-3.1}
                  icon={ShoppingCart}
                  gradient="from-green-500 to-emerald-500"
                  sparklineData={SAMPLE_WIDGET_DATA.orders.sparkline}
                />
                <PremiumStatCard
                  title="Growth Rate"
                  value="24.5"
                  change={15.3}
                  icon={TrendingUp}
                  gradient="from-amber-500 to-orange-500"
                  suffix="%"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <MiniBarCard
                  title="Weekly Activity"
                  data={[45, 52, 48, 61, 55, 67, 72]}
                  total="342 tasks"
                  icon={Activity}
                  color="#3b82f6"
                />
                <ProgressRingCard
                  title="Monthly Target"
                  percentage={75}
                  current="$75,000"
                  target="$100,000"
                  icon={Target}
                  gradient="from-blue-500 to-purple-500"
                />
                <CompactStatGrid
                  stats={[
                    { label: 'Clients', value: '124', icon: Users, color: '#3b82f6' },
                    { label: 'Projects', value: '48', icon: Activity, color: '#8b5cf6' },
                    { label: 'Revenue', value: '$125k', icon: DollarSign, color: '#10b981' },
                    { label: 'Growth', value: '+24%', icon: TrendingUp, color: '#f59e0b' }
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MetricComparisonCard
                  title="Performance Metrics"
                  metrics={[
                    { label: 'Revenue', current: 127500, previous: 113200, unit: '' },
                    { label: 'Customers', current: 1247, previous: 1152, unit: '' },
                    { label: 'Conversion Rate', current: 4.2, previous: 3.8, unit: '%' }
                  ]}
                />
                <GaugeWidget
                  title="Budget Utilization"
                  value={75}
                  max={100}
                  thresholds={{ low: 30, medium: 60, high: 80 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tables Tab */}
        {selectedTab === 'tables' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Modern Tables</h2>
              <ModernTable
                columns={columns}
                data={SAMPLE_TABLE_DATA}
                actions={tableActions}
                selectable
                searchable
                filterable
                exportable
                hoverable
              />
            </div>
          </div>
        )}

        {/* Forms Tab */}
        {selectedTab === 'forms' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Premium Form Controls</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <PremiumInput
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    value={formValues.email}
                    onChange={(e) => setFormValues({ ...formValues, email: e.target.value })}
                    hint="We'll never share your email"
                    required
                  />

                  <PasswordInput
                    value={formValues.password}
                    onChange={(e) => setFormValues({ ...formValues, password: e.target.value })}
                    showStrength
                    required
                  />

                  <CurrencyInput
                    label="Transaction Amount"
                    currency="USD"
                    value={formValues.amount}
                    onChange={(e) => setFormValues({ ...formValues, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-6">
                  <PremiumSelect
                    label="Category"
                    options={[
                      { value: 'revenue', label: 'Revenue' },
                      { value: 'expenses', label: 'Expenses' },
                      { value: 'salaries', label: 'Salaries' },
                      { value: 'marketing', label: 'Marketing' }
                    ]}
                    value={formValues.category}
                    onChange={(value) => setFormValues({ ...formValues, category: value })}
                    placeholder="Select a category..."
                  />

                  <ToggleSwitch
                    label="Email Notifications"
                    description="Receive email updates about your account"
                    checked={formValues.notifications}
                    onChange={(checked) => setFormValues({ ...formValues, notifications: checked })}
                  />

                  <PremiumSlider
                    label="Monthly Budget"
                    value={formValues.budget}
                    onChange={(value) => setFormValues({ ...formValues, budget: value })}
                    min={0}
                    max={100}
                    unit="k"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Tab */}
        {selectedTab === 'loading' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Loading States</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-medium mb-4">Skeleton Loaders</h3>
                  <SkeletonStatsGrid count={4} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SkeletonChart />
                  <SkeletonCard rows={5} />
                </div>

                <SkeletonTable rows={5} columns={5} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-900 border border-white/10 rounded-lg p-6">
                    <ContentLoader
                      title="Loading Analytics"
                      subtitle="Fetching your data..."
                    />
                  </div>

                  <DataProcessingLoader
                    steps={[
                      'Importing transactions',
                      'Analyzing patterns',
                      'Categorizing expenses',
                      'Generating insights'
                    ]}
                    currentStep={1}
                  />
                </div>

                <div className="bg-slate-900 border border-white/10 rounded-lg p-6 space-y-4">
                  <ProgressLoader progress={45} label="Uploading statement..." />
                  <ProgressLoader progress={75} label="Processing data..." />
                  <ProgressLoader progress={100} label="Complete!" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}