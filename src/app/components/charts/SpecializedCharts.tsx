import { motion } from 'motion/react';
import { Card, CardContent } from '../ui/card';
import { TrendingUp, TrendingDown, Users, DollarSign, Check, X } from 'lucide-react';

// Timeline Chart Component
export function TimelineChart({
  events,
  title,
  subtitle
}: {
  events: {
    date: string;
    title: string;
    description: string;
    value?: number;
    type: 'milestone' | 'payment' | 'client' | 'expense';
  }[];
  title?: string;
  subtitle?: string;
}) {
  const typeConfig = {
    milestone: { color: '#8b5cf6', icon: Check, bg: 'from-purple-500 to-pink-500' },
    payment: { color: '#10b981', icon: DollarSign, bg: 'from-green-500 to-emerald-500' },
    client: { color: '#3b82f6', icon: Users, bg: 'from-blue-500 to-cyan-500' },
    expense: { color: '#ef4444', icon: X, bg: 'from-red-500 to-pink-500' }
  };

  return (
    <Card className="bg-slate-900 border-white/10">
      <CardContent className="p-6">
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h3 className="text-white font-medium text-lg">{title}</h3>}
            {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
          </div>
        )}

        <div className="relative">
          {/* Vertical Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 opacity-30" />

          {/* Events */}
          <div className="space-y-6">
            {events.map((event, index) => {
              const config = typeConfig[event.type];
              const Icon = config.icon;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-16"
                >
                  {/* Icon */}
                  <div className={`absolute left-0 w-12 h-12 rounded-xl bg-gradient-to-br ${config.bg} flex items-center justify-center shadow-lg z-10`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Content */}
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-white font-medium text-sm">{event.title}</h4>
                        <p className="text-slate-400 text-xs mt-1">{event.description}</p>
                      </div>
                      {!!event.value && (
                        <span className={`font-semibold ${
                          event.type === 'payment' || event.type === 'client'
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}>
                          {event.type === 'expense' ? '-' : '+'}${event.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{event.date}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Heat Map Chart
export function HeatMapChart({
  data,
  title,
  subtitle,
  xLabels,
  yLabels
}: {
  data: number[][];
  title?: string;
  subtitle?: string;
  xLabels: string[];
  yLabels: string[];
}) {
  const maxValue = Math.max(...data.flat());
  const minValue = Math.min(...data.flat());

  const getColor = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue);
    if (normalized >= 0.8) return 'bg-green-500';
    if (normalized >= 0.6) return 'bg-blue-500';
    if (normalized >= 0.4) return 'bg-amber-500';
    if (normalized >= 0.2) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getOpacity = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue);
    return Math.max(0.2, normalized);
  };

  return (
    <Card className="bg-slate-900 border-white/10">
      <CardContent className="p-6">
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h3 className="text-white font-medium text-lg">{title}</h3>}
            {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* X-axis labels */}
            <div className="flex mb-2">
              <div className="w-24" /> {/* Spacer for Y-axis */}
              {xLabels.map((label, index) => (
                <div key={index} className="flex-1 text-center text-xs text-slate-400 font-medium min-w-[60px]">
                  {label}
                </div>
              ))}
            </div>

            {/* Heat map grid */}
            {data.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center mb-1">
                {/* Y-axis label */}
                <div className="w-24 text-xs text-slate-400 font-medium pr-4 text-right">
                  {yLabels[rowIndex]}
                </div>

                {/* Cells */}
                {row.map((value, colIndex) => (
                  <motion.div
                    key={colIndex}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (rowIndex * row.length + colIndex) * 0.02 }}
                    className="flex-1 min-w-[60px] p-1"
                  >
                    <div
                      className={`${getColor(value)} rounded flex items-center justify-center h-12 cursor-pointer hover:scale-110 transition-transform group relative`}
                      style={{ opacity: getOpacity(value) }}
                    >
                      <span className="text-white text-xs font-semibold">{value}</span>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                        <div className="bg-slate-950 border border-white/20 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                          <p className="text-white text-xs font-medium">{yLabels[rowIndex]}</p>
                          <p className="text-slate-400 text-xs">{xLabels[colIndex]}: {value}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-white/10">
            <span className="text-xs text-slate-400">Low</span>
            <div className="flex gap-1">
              {['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-blue-500', 'bg-green-500'].map((color, i) => (
                <div key={i} className={`w-8 h-3 ${color} rounded`} style={{ opacity: 0.2 + i * 0.2 }} />
              ))}
            </div>
            <span className="text-xs text-slate-400">High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Funnel Chart
export function FunnelChart({
  stages,
  title,
  subtitle,
  showConversion = true
}: {
  stages: {
    name: string;
    value: number;
    color: string;
  }[];
  title?: string;
  subtitle?: string;
  showConversion?: boolean;
}) {
  const maxValue = stages[0]?.value || 1;

  return (
    <Card className="bg-slate-900 border-white/10">
      <CardContent className="p-6">
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h3 className="text-white font-medium text-lg">{title}</h3>}
            {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
          </div>
        )}

        <div className="space-y-3">
          {stages.map((stage, index) => {
            const percentage = (stage.value / maxValue) * 100;
            const conversionRate = index > 0
              ? ((stage.value / stages[index - 1].value) * 100).toFixed(1)
              : '100.0';

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {/* Funnel Stage */}
                <div
                  className="relative rounded-lg overflow-hidden"
                  style={{
                    marginLeft: `${(100 - percentage) / 2}%`,
                    marginRight: `${(100 - percentage) / 2}%`
                  }}
                >
                  <div
                    className="h-16 flex items-center justify-between px-6 relative z-10"
                    style={{
                      background: `linear-gradient(135deg, ${stage.color} 0%, ${stage.color}CC 100%)`
                    }}
                  >
                    <span className="text-white font-medium text-sm">{stage.name}</span>
                    <div className="text-right">
                      <p className="text-white font-bold">{stage.value.toLocaleString()}</p>
                      {showConversion && index > 0 && (
                        <p className="text-white/70 text-xs">{conversionRate}% conversion</p>
                      )}
                    </div>
                  </div>

                  {/* Glow Effect */}
                  <div
                    className="absolute inset-0 opacity-50"
                    style={{
                      background: `linear-gradient(135deg, transparent 0%, ${stage.color}33 100%)`
                    }}
                  />
                </div>

                {/* Drop-off Arrow */}
                {index < stages.length - 1 && (
                  <div className="flex items-center justify-center py-2">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                      <TrendingDown className="w-3 h-3 text-red-400" />
                      <span className="text-xs text-slate-400">
                        {(((stages[index].value - stages[index + 1].value) / stages[index].value) * 100).toFixed(1)}% drop-off
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-3 gap-4">
          <div>
            <p className="text-slate-400 text-xs mb-1">Total Entered</p>
            <p className="text-white text-xl font-bold">{stages[0]?.value.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Converted</p>
            <p className="text-white text-xl font-bold">{stages[stages.length - 1]?.value.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Conversion Rate</p>
            <p className="text-white text-xl font-bold">
              {((stages[stages.length - 1]?.value / stages[0]?.value) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Sankey/Flow Diagram (Simplified)
export function FlowDiagram({
  flows,
  title,
  subtitle
}: {
  flows: {
    from: string;
    to: string;
    value: number;
    color: string;
  }[];
  title?: string;
  subtitle?: string;
}) {
  // Group flows by source
  const sources = Array.from(new Set(flows.map(f => f.from)));
  const destinations = Array.from(new Set(flows.map(f => f.to)));

  return (
    <Card className="bg-slate-900 border-white/10">
      <CardContent className="p-6">
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h3 className="text-white font-medium text-lg">{title}</h3>}
            {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
          </div>
        )}

        <div className="grid grid-cols-3 gap-8">
          {/* Source Nodes */}
          <div className="space-y-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">Source</p>
            {sources.map((source, index) => {
              const total = flows.filter(f => f.from === source).reduce((sum, f) => sum + f.value, 0);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-4"
                >
                  <p className="text-white font-medium text-sm">{source}</p>
                  <p className="text-white/70 text-xs mt-1">${total.toLocaleString()}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Flows (simplified as list) */}
          <div className="flex flex-col justify-center space-y-2">
            {flows.map((flow, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2"
              >
                <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: flow.color }} />
                <span className="text-xs text-slate-400 whitespace-nowrap">${flow.value.toLocaleString()}</span>
              </motion.div>
            ))}
          </div>

          {/* Destination Nodes */}
          <div className="space-y-4">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">Destination</p>
            {destinations.map((dest, index) => {
              const total = flows.filter(f => f.to === dest).reduce((sum, f) => sum + f.value, 0);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4"
                >
                  <p className="text-white font-medium text-sm">{dest}</p>
                  <p className="text-white/70 text-xs mt-1">${total.toLocaleString()}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Sample Data
export const SPECIALIZED_CHART_DATA = {
  timeline: [
    {
      date: '2024-01-15',
      title: 'Major Client Onboarded',
      description: 'ABC Corp signed annual contract',
      value: 150000,
      type: 'client' as const
    },
    {
      date: '2024-01-18',
      title: 'Payment Received',
      description: 'Q1 payment from XYZ Ltd',
      value: 75000,
      type: 'payment' as const
    },
    {
      date: '2024-01-22',
      title: 'Marketing Campaign',
      description: 'Facebook Ads - Q1 Budget',
      value: 25000,
      type: 'expense' as const
    },
    {
      date: '2024-01-25',
      title: 'Revenue Milestone',
      description: 'Hit $1M ARR',
      type: 'milestone' as const
    }
  ],
  heatmap: {
    data: [
      [42, 58, 65, 72, 68, 75, 82],
      [38, 52, 61, 68, 64, 71, 78],
      [45, 61, 68, 75, 72, 79, 85],
      [40, 55, 62, 70, 66, 73, 80],
      [48, 64, 71, 78, 75, 82, 88]
    ],
    xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    yLabels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5']
  },
  funnel: [
    { name: 'Website Visitors', value: 10000, color: '#3b82f6' },
    { name: 'Leads Generated', value: 2500, color: '#8b5cf6' },
    { name: 'Qualified Leads', value: 850, color: '#ec4899' },
    { name: 'Proposals Sent', value: 320, color: '#f59e0b' },
    { name: 'Closed Deals', value: 124, color: '#10b981' }
  ],
  flow: [
    { from: 'Revenue', to: 'Salaries', value: 285000, color: '#3b82f6' },
    { from: 'Revenue', to: 'Operations', value: 125000, color: '#8b5cf6' },
    { from: 'Revenue', to: 'Marketing', value: 68000, color: '#ec4899' },
    { from: 'Revenue', to: 'Profit', value: 322000, color: '#10b981' }
  ]
};
