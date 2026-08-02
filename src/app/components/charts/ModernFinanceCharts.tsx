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
  ComposedChart,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { cn } from '../ui/utils';
import { AXIOM } from '../../../styles/axiom-tokens';

// Modern Chart Colors
export const MODERN_COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  cyan: '#06b6d4',
  teal: '#14b8a6',
};

// Chart Container Wrapper
interface ChartContainerProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  delay?: number;
  actions?: React.ReactNode;
  borderColor?: 'cyan' | 'purple' | 'green' | 'amber' | 'pink';
  iconColor?: 'cyan' | 'purple' | 'green' | 'amber' | 'pink';
}

export function ChartContainer({
  title,
  subtitle,
  icon: Icon,
  children,
  delay = 0,
  actions,
  borderColor = 'purple',
  iconColor = 'purple',
}: ChartContainerProps) {
  const { theme } = useTheme();

  // Map border colors to BLUE THEME
  const borderColorMap = {
    cyan: 'rgba(59, 130, 246, 0.2)',
    purple: 'rgba(59, 130, 246, 0.2)',
    green: 'rgba(59, 130, 246, 0.2)',
    amber: 'rgba(59, 130, 246, 0.2)',
    pink: 'rgba(59, 130, 246, 0.2)',
  };

  // Map icon colors to BLUE THEME
  const iconBoxMap = {
    cyan: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', shadow: '0 10px 30px -10px rgba(59, 130, 246, 0.8)' },
    purple: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', shadow: '0 10px 30px -10px rgba(59, 130, 246, 0.8)' },
    green: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', shadow: '0 10px 30px -10px rgba(59, 130, 246, 0.8)' },
    amber: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', shadow: '0 10px 30px -10px rgba(59, 130, 246, 0.8)' },
    pink: { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', shadow: '0 10px 30px -10px rgba(59, 130, 246, 0.8)' },
  };

  // Map shadow colors to BLUE THEME
  const shadowColorMap = {
    cyan: theme === 'dark' ? '0 20px 60px -20px rgba(59, 130, 246, 0.5)' : '0 4px 12px -2px rgba(59, 130, 246, 0.1)',
    purple: theme === 'dark' ? '0 20px 60px -20px rgba(59, 130, 246, 0.5)' : '0 4px 12px -2px rgba(59, 130, 246, 0.1)',
    green: theme === 'dark' ? '0 20px 60px -20px rgba(59, 130, 246, 0.5)' : '0 4px 12px -2px rgba(59, 130, 246, 0.1)',
    amber: theme === 'dark' ? '0 20px 60px -20px rgba(59, 130, 246, 0.5)' : '0 4px 12px -2px rgba(59, 130, 246, 0.1)',
    pink: theme === 'dark' ? '0 20px 60px -20px rgba(59, 130, 246, 0.5)' : '0 4px 12px -2px rgba(59, 130, 246, 0.1)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-3xl p-8"
      style={{
        background: theme === 'dark' 
          ? 'linear-gradient(135deg, rgba(15, 30, 60, 0.5) 0%, rgba(5, 10, 30, 0.7) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
        border: `1px solid ${borderColorMap[borderColor]}`,
        boxShadow: shadowColorMap[borderColor],
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className="p-3 rounded-xl flex items-center justify-center"
              style={{
                background: iconBoxMap[iconColor].background,
                boxShadow: iconBoxMap[iconColor].shadow,
              }}
            >
              <Icon className="size-5 text-white" />
            </div>
          )}
          <div>
            <h3
              className="text-xl font-bold"
              style={{
                color: theme === 'dark' ? '#ffffff' : '#1e293b',
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                className="text-sm mt-0.5"
                style={{
                  color: theme === 'dark' ? '#94a3b8' : '#64748b',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && <div>{actions}</div>}
      </div>

      {/* Chart Content */}
      <div className="relative">{children}</div>
    </motion.div>
  );
}

// Custom Tooltip
export const ModernTooltip = ({ active, payload, label, theme }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 shadow-lg',
        theme === 'dark'
          ? 'bg-[#171717] border-[#262626]'
          : 'bg-white border-gray-200'
      )}
    >
      {label && (
        <p
          className={cn(
            'text-xs font-medium mb-1',
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          )}
        >
          {label}
        </p>
      )}
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span
            className={cn(
              'font-medium',
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}
          >
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// Smooth Area Chart
interface SmoothAreaChartProps {
  data: any[];
  dataKeys: { key: string; color: string; name: string }[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export function SmoothAreaChart({
  data,
  dataKeys,
  height = 300,
  showGrid = true,
  showLegend = true,
}: SmoothAreaChartProps) {
  const { theme } = useTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          {dataKeys.map((item) => (
            <linearGradient
              key={item.key}
              id={`gradient-${item.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={item.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={item.color} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>

        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme === 'dark' ? 'rgba(38, 38, 38, 0.5)' : 'rgba(229, 229, 229, 1)'}
            vertical={false}
          />
        )}

        <XAxis
          dataKey="name"
          stroke={theme === 'dark' ? '#737373' : '#a3a3a3'}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />

        <YAxis
          stroke={theme === 'dark' ? '#737373' : '#a3a3a3'}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return value;
          }}
        />

        <Tooltip content={<ModernTooltip theme={theme} />} />

        {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} />}

        {dataKeys.map((item) => (
          <Area
            key={item.key}
            type="monotone"
            dataKey={item.key}
            stroke={item.color}
            strokeWidth={2}
            fill={`url(#gradient-${item.key})`}
            dot={false}
            animationDuration={800}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Modern Bar Chart
interface ModernBarChartProps {
  data: any[];
  dataKeys: { key: string; color: string; name: string }[];
  height?: number;
  horizontal?: boolean;
  stacked?: boolean;
}

export function ModernBarChart({
  data,
  dataKeys,
  height = 300,
  horizontal = false,
  stacked = false,
}: ModernBarChartProps) {
  const { theme } = useTheme();

  const ChartComponent = BarChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent data={data} layout={horizontal ? 'vertical' : 'horizontal'}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={theme === 'dark' ? 'rgba(38, 38, 38, 0.5)' : 'rgba(229, 229, 229, 1)'}
          vertical={!horizontal}
          horizontal={horizontal}
        />

        {horizontal ? (
          <>
            <XAxis
              type="number"
              stroke={theme === 'dark' ? '#737373' : '#a3a3a3'}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke={theme === 'dark' ? '#737373' : '#a3a3a3'}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="name"
              stroke={theme === 'dark' ? '#737373' : '#a3a3a3'}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={theme === 'dark' ? '#737373' : '#a3a3a3'}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
          </>
        )}

        <Tooltip content={<ModernTooltip theme={theme} />} />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />

        {dataKeys.map((item) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            fill={item.color}
            radius={[6, 6, 0, 0]}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

// Donut Chart
interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}

export function DonutChart({
  data,
  height = 300,
  innerRadius = 60,
  outerRadius = 100,
}: DonutChartProps) {
  const { theme } = useTheme();
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex items-center gap-8">
      <ResponsiveContainer width="50%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ModernTooltip theme={theme} />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex-1 space-y-3">
        {data.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span
                  className={cn(
                    'text-sm',
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  )}
                >
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'text-sm font-medium',
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  )}
                >
                  {item.value.toLocaleString()}
                </span>
                <span
                  className={cn(
                    'text-xs',
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  )}
                >
                  {percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Combo Chart (Line + Bar)
interface ComboChartProps {
  data: any[];
  lineKeys: { key: string; color: string; name: string }[];
  barKeys: { key: string; color: string; name: string }[];
  height?: number;
}

export function ComboChart({ data, lineKeys, barKeys, height = 300 }: ComboChartProps) {
  const { theme } = useTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={theme === 'dark' ? 'rgba(38, 38, 38, 0.5)' : 'rgba(229, 229, 229, 1)'}
          vertical={false}
        />

        <XAxis
          dataKey="name"
          stroke={theme === 'dark' ? '#737373' : '#a3a3a3'}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />

        <YAxis
          stroke={theme === 'dark' ? '#737373' : '#a3a3a3'}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />

        <Tooltip content={<ModernTooltip theme={theme} />} />
        <Legend wrapperStyle={{ paddingTop: '20px' }} />

        {barKeys.map((item) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            fill={item.color}
            radius={[6, 6, 0, 0]}
          />
        ))}

        {lineKeys.map((item) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            stroke={item.color}
            strokeWidth={2.5}
            dot={{ r: 4 }}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Progress Ring Chart
interface ProgressRingProps {
  value: number;
  max: number;
  label: string;
  color?: string;
  size?: number;
}

export function ProgressRing({
  value,
  max,
  label,
  color = MODERN_COLORS.primary,
  size = 120,
}: ProgressRingProps) {
  const { theme } = useTheme();
  const percentage = (value / max) * 100;
  const data = [{ name: label, value: percentage, fill: color }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar
              background={{ fill: theme === 'dark' ? '#262626' : '#e5e5e5' }}
              dataKey="value"
              cornerRadius={10}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              'text-2xl font-bold',
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}
          >
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>
      <span
        className={cn(
          'text-sm mt-2',
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        )}
      >
        {label}
      </span>
    </div>
  );
}

// Sparkline Mini Chart
interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  trend?: 'up' | 'down';
}

export function Sparkline({
  data,
  color = MODERN_COLORS.primary,
  height = 40,
  trend,
}: SparklineProps) {
  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <div className="flex items-center gap-2">
      <div style={{ width: 80, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`sparkline-gradient`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#sparkline-gradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {trend && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-medium',
            trend === 'up' ? 'text-emerald-500' : 'text-red-500'
          )}
        >
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        </div>
      )}
    </div>
  );
}