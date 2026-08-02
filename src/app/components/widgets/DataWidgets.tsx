import { motion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
  Clock,
  Percent
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: any;
  gradient: string;
  sparklineData?: number[];
  prefix?: string;
  suffix?: string;
}

// Premium Stat Card with Gradient & Sparkline
export function PremiumStatCard({
  title,
  value,
  change,
  changeLabel = 'vs last month',
  icon: Icon,
  gradient,
  sparklineData,
  prefix = '',
  suffix = ''
}: StatCardProps) {
  const isPositive = change ? change >= 0 : true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-slate-900 border-white/10 overflow-hidden relative group">
        {/* Gradient Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
        
        <CardContent className="p-6 relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-sm font-medium">{title}</p>
              <motion.h3
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="text-3xl font-bold text-white mt-2"
              >
                {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
              </motion.h3>
            </div>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Change Indicator */}
          {change !== undefined && (
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                isPositive
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(change).toFixed(1)}%
              </div>
              <span className="text-slate-500 text-xs">{changeLabel}</span>
            </div>
          )}

          {/* Sparkline */}
          {sparklineData && sparklineData.length > 0 && (
            <div className="h-12 -mx-6 -mb-6 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData.map((value, index) => ({ value, index }))}>
                  <defs>
                    <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={isPositive ? '#10b981' : '#ef4444'}
                    strokeWidth={2}
                    fill={`url(#gradient-${title})`}
                    isAnimationActive={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Mini Bar Chart Card
export function MiniBarCard({
  title,
  data,
  total,
  icon: Icon,
  color = '#3b82f6'
}: {
  title: string;
  data: number[];
  total: string;
  icon: any;
  color?: string;
}) {
  return (
    <Card className="bg-slate-900 border-white/10 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-slate-400 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-white mt-2">{total}</h3>
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>

        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.map((value, index) => ({ value, index }))}>
              <Bar
                dataKey="value"
                fill={color}
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Progress Ring Card
export function ProgressRingCard({
  title,
  percentage,
  current,
  target,
  icon: Icon,
  gradient
}: {
  title: string;
  percentage: number;
  current: string;
  target: string;
  icon: any;
  gradient: string;
}) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card className="bg-slate-900 border-white/10 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-6">
          {/* Progress Ring */}
          <div className="relative">
            <svg width="120" height="120" className="transform -rotate-90">
              {/* Background Circle */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="#334155"
                strokeWidth="8"
              />
              {/* Progress Circle */}
              <motion.circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="url(#ringGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center Content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <Icon className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <p className="text-slate-400 text-sm font-medium mb-2">{title}</p>
            <motion.p
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-3xl font-bold text-white mb-1"
            >
              {percentage}%
            </motion.p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Current:</span>
                <span className="text-white font-medium">{current}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Target:</span>
                <span className="text-slate-400">{target}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact Stat Grid
export function CompactStatGrid({
  stats
}: {
  stats: {
    label: string;
    value: string;
    icon: any;
    color: string;
  }[];
}) {
  return (
    <Card className="bg-slate-900 border-white/10">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">{stat.label}</p>
                  <p className="text-white font-semibold text-lg">{stat.value}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Metric Comparison Card
export function MetricComparisonCard({
  title,
  metrics
}: {
  title: string;
  metrics: {
    label: string;
    current: number;
    previous: number;
    unit?: string;
  }[];
}) {
  return (
    <Card className="bg-slate-900 border-white/10">
      <CardContent className="p-6">
        <h3 className="text-white font-medium text-lg mb-4">{title}</h3>
        <div className="space-y-4">
          {metrics.map((metric, index) => {
            const change = ((metric.current - metric.previous) / metric.previous) * 100;
            const isPositive = change >= 0;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">{metric.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {metric.current.toLocaleString()}{metric.unit}
                    </span>
                    <span className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{change.toFixed(1)}%
                    </span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((metric.current / metric.previous) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className={`h-full rounded-full ${
                      isPositive
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : 'bg-gradient-to-r from-red-500 to-pink-500'
                    }`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Gauge Chart Widget
export function GaugeWidget({
  title,
  value,
  max,
  thresholds,
  unit = '%'
}: {
  title: string;
  value: number;
  max: number;
  thresholds?: { low: number; medium: number; high: number };
  unit?: string;
}) {
  const percentage = (value / max) * 100;
  const rotation = (percentage / 100) * 180 - 90;

  const getColor = () => {
    if (!thresholds) return '#3b82f6';
    if (percentage < thresholds.low) return '#ef4444';
    if (percentage < thresholds.medium) return '#f59e0b';
    if (percentage < thresholds.high) return '#10b981';
    return '#3b82f6';
  };

  return (
    <Card className="bg-slate-900 border-white/10">
      <CardContent className="p-6">
        <h3 className="text-white font-medium text-lg mb-6">{title}</h3>
        
        <div className="relative w-full aspect-square max-w-[200px] mx-auto">
          {/* Gauge Background */}
          <svg viewBox="0 0 200 120" className="w-full">
            {/* Background Arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#334155"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Colored Arc */}
            <motion.path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={getColor()}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="251.2"
              initial={{ strokeDashoffset: 251.2 }}
              animate={{ strokeDashoffset: 251.2 - (251.2 * percentage) / 100 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
            {/* Needle */}
            <motion.line
              x1="100"
              y1="100"
              x2="100"
              y2="30"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ transform: 'rotate(-90deg)' }}
              animate={{ transform: `rotate(${rotation}deg)` }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              style={{ transformOrigin: '100px 100px' }}
            />
            {/* Center Dot */}
            <circle cx="100" cy="100" r="6" fill="#fff" />
          </svg>

          {/* Value Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center mt-8">
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="text-4xl font-bold text-white"
            >
              {value}{unit}
            </motion.p>
            <p className="text-slate-400 text-sm mt-1">of {max}{unit}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Sample Data
export const SAMPLE_WIDGET_DATA = {
  revenue: {
    value: 127500,
    change: 12.5,
    sparkline: [45000, 52000, 48000, 61000, 55000, 67000, 72000, 68000, 75000, 82000, 78000, 85000]
  },
  users: {
    value: 1247,
    change: 8.2,
    sparkline: [980, 1020, 1050, 1100, 1080, 1120, 1180, 1150, 1200, 1230, 1210, 1247]
  },
  orders: {
    value: 342,
    change: -3.1,
    sparkline: [380, 375, 365, 358, 352, 348, 345, 340, 338, 342, 340, 342]
  }
};
