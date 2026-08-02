import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Wallet,
  Users,
  Calendar,
  Target,
  Activity
} from 'lucide-react';

interface Stat {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: any;
  color: string;
}

const STATS: Stat[] = [
  {
    label: 'Revenue',
    value: 'PKR 1.2M',
    change: 12.5,
    changeLabel: 'vs last month',
    icon: DollarSign,
    color: 'from-green-500 to-emerald-500'
  },
  {
    label: 'Profit Margin',
    value: '28%',
    change: 3.2,
    changeLabel: 'improvement',
    icon: TrendingUp,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    label: 'Cash Balance',
    value: 'PKR 2.5M',
    change: -5.1,
    changeLabel: 'this week',
    icon: Wallet,
    color: 'from-purple-500 to-pink-500'
  },
  {
    label: 'Active Clients',
    value: '24',
    change: 8.3,
    changeLabel: 'new this quarter',
    icon: Users,
    color: 'from-amber-500 to-orange-500'
  },
  {
    label: 'Recurring Revenue',
    value: 'PKR 450K',
    change: 15.2,
    changeLabel: 'monthly',
    icon: Calendar,
    color: 'from-cyan-500 to-blue-500'
  },
  {
    label: 'Budget Used',
    value: '67%',
    change: 0,
    changeLabel: 'on track',
    icon: Target,
    color: 'from-indigo-500 to-purple-500'
  }
];

export function QuickStatsTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % STATS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden bg-slate-900 border border-white/10 rounded-xl p-4">
      {/* Background gradient animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-50" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-400">Quick Stats</h3>
          
          {/* Dots indicator */}
          <div className="flex gap-1">
            {STATS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === currentIndex 
                    ? 'bg-blue-400 w-4' 
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Animated stat display */}
        <div className="relative h-20">
          {STATS.map((stat, idx) => {
            const Icon = stat.icon;
            const isActive = idx === currentIndex;
            
            return (
              <motion.div
                key={idx}
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0,
                  x: isActive ? 0 : idx < currentIndex ? -50 : 50,
                  scale: isActive ? 1 : 0.9
                }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className={`absolute inset-0 ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
              >
                <div className="flex items-center gap-4 h-full">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">{stat.value}</span>
                      {stat.change !== 0 && (
                        <div className={`flex items-center gap-1 text-xs ${
                          stat.change > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {stat.change > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{Math.abs(stat.change)}%</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{stat.changeLabel}</p>
                  </div>

                  {/* Progress bar for percentage stats */}
                  {stat.label === 'Profit Margin' || stat.label === 'Budget Used' ? (
                    <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: isActive ? stat.value : 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className={`h-full bg-gradient-to-r ${stat.color}`}
                      />
                    </div>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
