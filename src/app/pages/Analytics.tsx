import { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Users,
  DollarSign,
  Zap,
  Target,
  Clock,
  Award,
  AlertCircle
} from 'lucide-react';
import { PremiumAreaChart, PremiumBarChart } from '../components/charts/AdvancedCharts';
import { Card, CardContent } from '../components/ui/card';
import { PremiumSlider, ToggleSwitch } from '../components/forms/PremiumInputs';

export function Analytics() {
  const [forecastMonths, setForecastMonths] = useState(3);
  const [showConfidence, setShowConfidence] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Client Cohort Analysis
  const cohortData = [
    { name: 'Jan', month1: 95, month2: 88, month3: 82, month4: 78, month5: 75, month6: 72 },
    { name: 'Feb', month1: 97, month2: 90, month3: 84, month4: 80, month5: 77 },
    { name: 'Mar', month1: 98, month2: 92, month3: 86, month4: 82 },
    { name: 'Apr', month1: 96, month2: 89, month3: 84 },
    { name: 'May', month1: 99, month2: 93 },
    { name: 'Jun', month1: 100 }
  ];

  // Customer Lifetime Value
  const clvData = [
    { segment: 'Enterprise', value: 125000, customers: 12, color: '#3b82f6' },
    { segment: 'Mid-Market', value: 45000, customers: 28, color: '#8b5cf6' },
    { segment: 'SMB', value: 18000, customers: 64, color: '#ec4899' },
    { segment: 'Startup', value: 8500, customers: 95, color: '#10b981' }
  ];

  // Revenue Forecasting
  const forecastData = [
    { name: 'Jan', actual: 125000, forecast: 125000, lower: 120000, upper: 130000 },
    { name: 'Feb', actual: 142000, forecast: 142000, lower: 135000, upper: 149000 },
    { name: 'Mar', actual: 138000, forecast: 138000, lower: 132000, upper: 144000 },
    { name: 'Apr', actual: 165000, forecast: 165000, lower: 158000, upper: 172000 },
    { name: 'May', actual: 158000, forecast: 158000, lower: 152000, upper: 164000 },
    { name: 'Jun', actual: 178000, forecast: 178000, lower: 171000, upper: 185000 },
    { name: 'Jul', forecast: 185000, lower: 176000, upper: 194000 },
    { name: 'Aug', forecast: 192000, lower: 182000, upper: 202000 },
    { name: 'Sep', forecast: 198000, lower: 188000, upper: 208000 }
  ];

  // Department Efficiency
  const efficiencyData = [
    { name: 'Engineering', revenue: 285000, cost: 125000, efficiency: 2.28 },
    { name: 'Sales', revenue: 215000, cost: 85000, efficiency: 2.53 },
    { name: 'Marketing', revenue: 145000, cost: 68000, efficiency: 2.13 },
    { name: 'Operations', revenue: 95000, cost: 48000, efficiency: 1.98 }
  ];

  // Monthly Growth Rates
  const growthRates = [
    { name: 'Jan', revenue: 12.5, clients: 8.2, deals: 15.3 },
    { name: 'Feb', revenue: 13.6, clients: 9.1, deals: 11.8 },
    { name: 'Mar', revenue: -2.8, clients: 6.7, deals: 8.5 },
    { name: 'Apr', revenue: 19.6, clients: 12.5, deals: 22.4 },
    { name: 'May', revenue: -4.2, clients: 5.3, deals: -6.2 },
    { name: 'Jun', revenue: 12.7, clients: 9.5, deals: 14.8 }
  ];

  return (
    <div className="min-h-screen bg-[#000000] p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2" style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #60a5fa 50%, #a855f7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>Advanced Analytics</h1>
        <p className="text-slate-400">Deep insights and predictive analysis for your business</p>
      </div>

      {/* AI-Powered Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl border border-blue-500/20 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
          }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
              boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.6)',
            }}>
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-blue-400 font-semibold mb-2">Revenue Acceleration</h3>
              <p className="text-slate-300 text-sm mb-3">
                Your revenue growth is accelerating. Based on current trends, you're on track to exceed Q3 targets by 15%.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-400/70">Confidence: 87%</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-xl border border-green-500/20 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
          }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.6)',
            }}>
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-green-400 font-semibold mb-2">High-Value Clients</h3>
              <p className="text-slate-300 text-sm mb-3">
                Enterprise segment showing 28% higher retention. Consider increasing focus on this segment.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-400/70">Impact: High</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-xl border border-amber-500/20 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)',
          }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
              boxShadow: '0 10px 30px -10px rgba(245, 158, 11, 0.6)',
            }}>
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-amber-400 font-semibold mb-2">Churn Risk Alert</h3>
              <p className="text-slate-300 text-sm mb-3">
                3 mid-market clients showing decreased engagement. Recommend proactive outreach.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400/70">Action Required</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Forecast Controls */}
      <Card className="bg-[#0f0f13] border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-medium text-lg">Revenue Forecasting</h3>
            <div className="flex items-center gap-6">
              <PremiumSlider
                label="Forecast Period"
                value={forecastMonths}
                onChange={setForecastMonths}
                min={1}
                max={12}
                unit=" months"
                showValue
              />
              <ToggleSwitch
                label="Show Confidence Interval"
                checked={showConfidence}
                onChange={setShowConfidence}
              />
            </div>
          </div>

          <PremiumAreaChart
            data={forecastData.slice(0, 6 + forecastMonths)}
            dataKeys={[
              { key: 'actual', name: 'Actual', color: '#3b82f6', gradient: 'url(#gradientBlue)' },
              { key: 'forecast', name: 'Forecast', color: '#8b5cf6', gradient: 'url(#gradientPurple)' },
              ...(showConfidence ? [
                { key: 'upper', name: 'Upper Bound', color: '#10b981', gradient: 'url(#gradientGreen)' },
                { key: 'lower', name: 'Lower Bound', color: '#ef4444', gradient: 'url(#gradientPink)' }
              ] : [])
            ]}
            height={350}
          />
        </CardContent>
      </Card>

      {/* Client Cohort & CLV Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cohort Retention */}
        <Card className="bg-[#0f0f13] border-white/10">
          <CardContent className="p-6">
            <h3 className="text-white font-medium text-lg mb-6">Client Retention Cohorts</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-slate-400 text-xs font-medium uppercase tracking-wider pb-3">Cohort</th>
                    <th className="text-center text-slate-400 text-xs font-medium uppercase tracking-wider pb-3">M1</th>
                    <th className="text-center text-slate-400 text-xs font-medium uppercase tracking-wider pb-3">M2</th>
                    <th className="text-center text-slate-400 text-xs font-medium uppercase tracking-wider pb-3">M3</th>
                    <th className="text-center text-slate-400 text-xs font-medium uppercase tracking-wider pb-3">M4</th>
                    <th className="text-center text-slate-400 text-xs font-medium uppercase tracking-wider pb-3">M5</th>
                    <th className="text-center text-slate-400 text-xs font-medium uppercase tracking-wider pb-3">M6</th>
                  </tr>
                </thead>
                <tbody>
                  {cohortData.map((cohort, index) => (
                    <tr key={index} className="border-b border-white/5">
                      <td className="py-3 text-white text-sm font-medium">{cohort.name}</td>
                      {(['month1', 'month2', 'month3', 'month4', 'month5', 'month6'] as const).map((month) => {
                        const value = cohort[month];
                        if (!value) return <td key={month} className="text-center">-</td>;
                        
                        const colorIntensity = value / 100;
                        return (
                          <td key={month} className="text-center py-3">
                            <span
                              className="inline-block px-2 py-1 rounded text-xs font-medium"
                              style={{
                                backgroundColor: `rgba(59, 130, 246, ${colorIntensity * 0.3})`,
                                color: colorIntensity > 0.7 ? '#60a5fa' : '#94a3b8'
                              }}
                            >
                              {value}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Customer Lifetime Value */}
        <Card className="bg-[#0f0f13] border-white/10">
          <CardContent className="p-6">
            <h3 className="text-white font-medium text-lg mb-6">Customer Lifetime Value by Segment</h3>
            <div className="space-y-4">
              {clvData.map((segment, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">{segment.segment}</p>
                      <p className="text-slate-400 text-xs">{segment.customers} customers</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">${segment.value.toLocaleString()}</p>
                      <p className="text-slate-500 text-xs">Avg CLV</p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: segment.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(segment.value / 125000) * 100}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-xs mb-1">Total Customers</p>
                  <p className="text-white text-2xl font-bold">199</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-1">Avg CLV</p>
                  <p className="text-white text-2xl font-bold">$31.2K</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Efficiency & Growth Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department ROI */}
        <Card className="bg-[#0f0f13] border-white/10">
          <CardContent className="p-6">
            <h3 className="text-white font-medium text-lg mb-6">Department Efficiency Ratio</h3>
            <div className="space-y-4">
              {efficiencyData.map((dept, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="flex-1">
                    <p className="text-white font-medium mb-1">{dept.name}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Revenue: ${dept.revenue.toLocaleString()}</span>
                      <span>Cost: ${dept.cost.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full ${
                      dept.efficiency >= 2.5
                        ? 'bg-green-500/20 text-green-400'
                        : dept.efficiency >= 2.0
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      <Target className="w-4 h-4" />
                      <span className="font-semibold">{dept.efficiency.toFixed(2)}x</span>
                    </div>
                    <p className="text-slate-500 text-xs mt-1">Efficiency</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Growth Rates */}
        <PremiumBarChart
          data={growthRates}
          dataKeys={[
            { key: 'revenue', name: 'Revenue Growth', color: '#3b82f6' },
            { key: 'clients', name: 'Client Growth', color: '#10b981' },
            { key: 'deals', name: 'Deal Growth', color: '#8b5cf6' }
          ]}
          title="Month-over-Month Growth Rates"
          subtitle="Percentage change by metric"
          height={320}
        />
      </div>

      {/* Advanced Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#0f0f13] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
              }}>
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Avg Sales Cycle</p>
                <p className="text-white text-2xl font-bold">42 days</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                <TrendingUp className="w-3 h-3" />
                12% faster
              </div>
              <span className="text-slate-500 text-xs">vs last quarter</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f13] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
              }}>
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">Customer Acquisition Cost</p>
                <p className="text-white text-2xl font-bold">$2,450</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                <TrendingUp className="w-3 h-3" />
                8% lower
              </div>
              <span className="text-slate-500 text-xs">vs last quarter</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f13] border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              }}>
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs">CAC Payback Period</p>
                <p className="text-white text-2xl font-bold">8.5 mo</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                <TrendingUp className="w-3 h-3" />
                15% faster
              </div>
              <span className="text-slate-500 text-xs">vs last quarter</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}