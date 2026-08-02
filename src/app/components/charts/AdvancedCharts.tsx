import { motion } from 'motion/react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

// Unified color palette for consistency
export const CHART_COLORS = {
  primary: ['#3b82f6', '#2563eb', '#1d4ed8'],
  secondary: ['#8b5cf6', '#7c3aed', '#6d28d9'],
  success: ['#10b981', '#059669', '#047857'],
  warning: ['#f59e0b', '#d97706', '#b45309'],
  danger: ['#ef4444', '#dc2626', '#b91c1c'],
  gradient: {
    blue: ['#60a5fa', '#3b82f6', '#2563eb'],
    purple: ['#a78bfa', '#8b5cf6', '#7c3aed'],
    pink: ['#f472b6', '#ec4899', '#db2777'],
    green: ['#34d399', '#10b981', '#059669'],
    cyan: ['#22d3ee', '#06b6d4', '#0891b2']
  }
};

// Custom Tooltip Component
export const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-lg p-3 shadow-2xl"
    >
      <p className="text-white font-medium text-sm mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-300">{entry.name}:</span>
          <span className="text-white font-medium">
            {typeof entry.value === 'number'
              ? entry.value.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD'
                })
              : entry.value}
          </span>
        </div>
      ))}
    </motion.div>
  );
};

// Gradient Definitions for Charts
export const ChartGradients = () => (
  <defs>
    <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="gradientPurple" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="gradientPink" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#ec4899" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#ec4899" stopOpacity={0.1} />
    </linearGradient>
    <linearGradient id="gradientCyan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.1} />
    </linearGradient>
  </defs>
);

// Premium Area Chart
export function PremiumAreaChart({
  data,
  dataKeys,
  title,
  subtitle,
  height = 300,
  showTrend = true
}: {
  data: any[];
  dataKeys: { key: string; name: string; color: string; gradient?: string }[];
  title?: string;
  subtitle?: string;
  height?: number;
  showTrend?: boolean;
}) {
  const calculateTrend = () => {
    if (!showTrend || data.length < 2) return null;
    const lastValue = data[data.length - 1][dataKeys[0].key];
    const prevValue = data[data.length - 2][dataKeys[0].key];
    const change = ((lastValue - prevValue) / prevValue) * 100;
    return change;
  };

  const trend = calculateTrend();

  return (
    <Card className="bg-slate-900 border-white/10 overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        {(title || subtitle) && (
          <div className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                {title && <h3 className="text-white font-medium text-lg">{title}</h3>}
                {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
              </div>
              {trend !== null && (
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                  trend >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {trend >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {Math.abs(trend).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <ChartGradients />
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
              formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
            />
            {dataKeys.map((dk) => (
              <Area
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.name}
                stroke={dk.color}
                strokeWidth={2}
                fill={dk.gradient || dk.color}
                fillOpacity={0.6}
                animationDuration={1000}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Premium Bar Chart
export function PremiumBarChart({
  data,
  dataKeys,
  title,
  subtitle,
  height = 300,
  stacked = false
}: {
  data: any[];
  dataKeys: { key: string; name: string; color: string }[];
  title?: string;
  subtitle?: string;
  height?: number;
  stacked?: boolean;
}) {
  return (
    <Card className="bg-slate-900 border-white/10 overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h3 className="text-white font-medium text-lg">{title}</h3>}
            {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
          </div>
        )}

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
              formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
            />
            {dataKeys.map((dk) => (
              <Bar
                key={dk.key}
                dataKey={dk.key}
                name={dk.name}
                fill={dk.color}
                radius={[8, 8, 0, 0]}
                stackId={stacked ? 'stack' : undefined}
                animationDuration={1000}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Premium Donut Chart
export function PremiumDonutChart({
  data,
  title,
  subtitle,
  height = 300,
  showPercentages = true
}: {
  data: { name: string; value: number; color: string }[];
  title?: string;
  subtitle?: string;
  height?: number;
  showPercentages?: boolean;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="bg-slate-900 border-white/10 overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h3 className="text-white font-medium text-lg">{title}</h3>}
            {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
          </div>
        )}

        <div className="flex items-center gap-8">
          {/* Chart */}
          <div style={{ width: height, height }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={2}
                  dataKey="value"
                  animationDuration={1000}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-3">
            {data.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-300 text-sm">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium text-sm">
                    ${item.value.toLocaleString()}
                  </span>
                  {showPercentages && (
                    <span className="text-slate-500 text-xs w-12 text-right">
                      {((item.value / total) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mixed Chart (Bar + Line)
export function MixedChart({
  data,
  barKeys,
  lineKeys,
  title,
  subtitle,
  height = 300
}: {
  data: any[];
  barKeys: { key: string; name: string; color: string }[];
  lineKeys: { key: string; name: string; color: string }[];
  title?: string;
  subtitle?: string;
  height?: number;
}) {
  return (
    <Card className="bg-slate-900 border-white/10 overflow-hidden">
      <CardContent className="p-6">
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h3 className="text-white font-medium text-lg">{title}</h3>}
            {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
          </div>
        )}

        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
              formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
            />
            {barKeys.map((dk) => (
              <Bar
                key={dk.key}
                dataKey={dk.key}
                name={dk.name}
                fill={dk.color}
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
              />
            ))}
            {lineKeys.map((dk) => (
              <Line
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.name}
                stroke={dk.color}
                strokeWidth={3}
                dot={{ fill: dk.color, r: 4 }}
                animationDuration={1000}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Sample Data for Testing
export const SAMPLE_CHART_DATA = {
  revenue: [
    { name: 'Jan', revenue: 45000, expenses: 32000, profit: 13000 },
    { name: 'Feb', revenue: 52000, expenses: 35000, profit: 17000 },
    { name: 'Mar', revenue: 48000, expenses: 33000, profit: 15000 },
    { name: 'Apr', revenue: 61000, expenses: 38000, profit: 23000 },
    { name: 'May', revenue: 55000, expenses: 36000, profit: 19000 },
    { name: 'Jun', revenue: 67000, expenses: 41000, profit: 26000 }
  ],
  categories: [
    { name: 'Salaries', value: 125000, color: '#3b82f6' },
    { name: 'Cloud Services', value: 45000, color: '#8b5cf6' },
    { name: 'Marketing', value: 32000, color: '#ec4899' },
    { name: 'Office', value: 18000, color: '#10b981' },
    { name: 'Other', value: 12000, color: '#f59e0b' }
  ]
};
