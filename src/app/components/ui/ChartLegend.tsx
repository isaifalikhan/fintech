import { motion } from 'motion/react';

interface LegendItem {
  label: string;
  color: string;
  value?: string | number;
  active: boolean;
}

interface ChartLegendProps {
  items: LegendItem[];
  onToggle: (label: string) => void;
  layout?: 'horizontal' | 'vertical';
}

export function ChartLegend({
  items,
  onToggle,
  layout = 'horizontal'
}: ChartLegendProps) {
  return (
    <div className={`flex ${layout === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col'} gap-3`}>
      {items.map((item, index) => (
        <motion.button
          key={item.label}
          onClick={() => onToggle(item.label)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            layout === 'vertical' ? 'justify-between w-full' : ''
          }`}
          style={{
            background: item.active
              ? `linear-gradient(135deg, ${item.color}30, ${item.color}20)`
              : 'rgba(0, 0, 0, 0.3)',
            border: `1px solid ${item.active ? item.color : 'rgba(148, 163, 184, 0.2)'}`,
            color: item.active ? '#ffffff' : '#64748b',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <div className="flex items-center gap-2">
            {/* Color indicator */}
            <motion.div
              className="w-3 h-3 rounded-full"
              style={{
                background: item.color,
              }}
              animate={{
                boxShadow: item.active ? `0 0 10px ${item.color}` : 'none',
              }}
            />
            <span>{item.label}</span>
          </div>

          {/* Value if provided */}
          {item.value && (
            <span className="text-xs opacity-70 ml-2">
              {item.value}
            </span>
          )}
        </motion.button>
      ))}
    </div>
  );
}

// Advanced legend with stats
interface AdvancedLegendItem extends LegendItem {
  percentage?: number;
  change?: number;
}

interface AdvancedChartLegendProps {
  items: AdvancedLegendItem[];
  onToggle: (label: string) => void;
  total?: number;
}

export function AdvancedChartLegend({
  items,
  onToggle,
  total
}: AdvancedChartLegendProps) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <motion.button
          key={item.label}
          onClick={() => onToggle(item.label)}
          className="w-full p-4 rounded-xl text-left transition-all"
          style={{
            background: item.active
              ? `linear-gradient(135deg, ${item.color}20, ${item.color}10)`
              : 'rgba(0, 0, 0, 0.2)',
            border: `1px solid ${item.active ? `${item.color}40` : 'rgba(148, 163, 184, 0.1)'}`,
          }}
          whileHover={{
            scale: 1.02,
            boxShadow: item.active ? `0 8px 24px ${item.color}20` : '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {/* Color indicator with glow */}
              <motion.div
                className="w-4 h-4 rounded-full"
                style={{
                  background: item.color,
                }}
                animate={{
                  boxShadow: item.active
                    ? `0 0 12px ${item.color}, 0 0 24px ${item.color}60`
                    : 'none',
                }}
              />
              <span className={`font-medium ${item.active ? 'text-white' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </div>

            {/* Value */}
            {item.value && (
              <span
                className="text-lg font-bold"
                style={{ color: item.active ? item.color : '#64748b' }}
              >
                {item.value}
              </span>
            )}
          </div>

          {/* Progress bar and percentage */}
          {item.percentage !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {item.percentage.toFixed(1)}% of total
                </span>
                {item.change !== undefined && (
                  <span
                    className={`font-medium ${
                      item.change >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {item.change >= 0 ? '+' : ''}{item.change}%
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${item.color}, ${item.color}80)`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ delay: index * 0.05 + 0.2, duration: 0.8 }}
                />
              </div>
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
}
