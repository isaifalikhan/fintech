import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { CounterAnimation } from './CounterAnimation';

interface AnimatedMetricProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: ReactNode;
  color?: string;
  formatValue?: (value: number) => string;
  delay?: number;
}

export function AnimatedMetric({
  label,
  value,
  prefix = '',
  suffix = '',
  trend = 'neutral',
  trendValue,
  icon,
  color = '#2dd4ff',
  formatValue,
  delay = 0
}: AnimatedMetricProps) {
  const trendColors = {
    up: '#10b981',
    down: '#ef4444',
    neutral: '#94a3b8'
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→'
  };

  return (
    <motion.div
      className="relative p-6 rounded-2xl overflow-hidden group"
      style={{
        background: `linear-gradient(135deg, ${color}10, ${color}05)`,
        border: `1px solid ${color}30`,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{
        scale: 1.02,
        boxShadow: `0 10px 40px ${color}20`,
      }}
    >
      {/* Background glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${color}20, transparent 70%)`,
        }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />

      {/* Icon */}
      {icon && (
        <motion.div
          className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity"
          style={{ color }}
        >
          {icon}
        </motion.div>
      )}

      {/* Label */}
      <div className="relative z-10">
        <p className="text-slate-400 text-sm uppercase tracking-wider mb-2">
          {label}
        </p>

        {/* Value with animation */}
        <div className="flex items-baseline gap-2 mb-2">
          <motion.div
            className="text-4xl font-bold"
            style={{
              background: `linear-gradient(135deg, ${color}, ${color}80)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {prefix}
            <CounterAnimation
              value={value}
              formatValue={formatValue || ((v) => v.toLocaleString())}
            />
            {suffix}
          </motion.div>
        </div>

        {/* Trend indicator */}
        {trendValue && (
          <motion.div
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: trendColors[trend] }}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.2 }}
          >
            <span>{trendIcons[trend]}</span>
            <span>{trendValue}</span>
          </motion.div>
        )}
      </div>

      {/* Progress bar at bottom */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}60)`,
          transformOrigin: 'left',
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: delay + 0.3, duration: 0.8 }}
      />
    </motion.div>
  );
}