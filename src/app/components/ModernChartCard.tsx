import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ReactNode } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from './ui/utils';

interface ModernChartCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  delay?: number;
}

export function ModernChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
  delay = 0,
}: ModernChartCardProps) {
  const { theme } = useTheme();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "relative overflow-hidden rounded-xl border p-6 group",
        theme === 'dark'
          ? 'bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-950/60 border-slate-800/50 shadow-lg shadow-indigo-500/5'
          : 'bg-white border-gray-200 shadow-sm'
      )}
    >
      {/* Vibrant gradient overlay on hover */}
      {theme === 'dark' && (
        <>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        </>
      )}
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 relative z-10">
        {Icon && (
          <div className={cn(
            "p-2.5 rounded-lg border shadow-sm",
            theme === 'dark'
              ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30 shadow-indigo-500/20'
              : 'bg-indigo-50 border-indigo-200'
          )}>
            <Icon className={cn(
              "w-5 h-5",
              theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'
            )} />
          </div>
        )}
        <div>
          <h3 className={cn(
            "text-base font-semibold",
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            {title}
          </h3>
          {subtitle && (
            <p className={cn(
              "text-sm mt-0.5",
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            )}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Chart Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface ModernAreaChartProps {
  data: ChartData[];
  dataKey: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
}

export function ModernAreaChart({
  data,
  dataKey,
  height = 320,
  color = '#6366f1',
  showGrid = true,
}: ModernAreaChartProps) {
  const { theme } = useTheme();
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
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
          style={{ fontSize: '12px', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
        />

        <YAxis
          stroke={theme === 'dark' ? '#737373' : '#a3a3a3'}
          style={{ fontSize: '12px', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return value.toString();
          }}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: theme === 'dark' ? 'rgba(23, 23, 23, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            border: theme === 'dark' ? '1px solid rgba(38, 38, 38, 1)' : '1px solid rgba(229, 229, 229, 1)',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: theme === 'dark' ? '0 10px 30px rgba(0, 0, 0, 0.5)' : '0 10px 30px rgba(0, 0, 0, 0.1)',
          }}
          labelStyle={{
            color: theme === 'dark' ? '#e2e8f0' : '#333',
            fontWeight: 600,
            marginBottom: '4px',
            fontSize: '13px',
          }}
          itemStyle={{
            color: theme === 'dark' ? '#94a3b8' : '#666',
            fontSize: '12px',
          }}
        />

        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${dataKey})`}
          dot={false}
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}