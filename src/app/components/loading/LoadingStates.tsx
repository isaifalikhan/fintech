import { motion } from 'motion/react';
import { Loader2, Zap, TrendingUp, BarChart3, DollarSign } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

// Skeleton Components
export function SkeletonLine({
  width = '100%',
  height = '1rem',
  className = ''
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-slate-800 rounded-lg overflow-hidden relative ${className}`}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700 to-transparent"
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    </div>
  );
}

export function SkeletonCircle({
  size = '3rem',
  className = ''
}: {
  size?: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-slate-800 rounded-full overflow-hidden relative ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700 to-transparent"
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    </div>
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <Card className="bg-slate-900 border-white/10">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <SkeletonCircle size="3rem" />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="40%" height="1.25rem" />
            <SkeletonLine width="60%" height="0.875rem" />
          </div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonLine key={i} width={`${Math.random() * 20 + 80}%`} />
        ))}
      </CardContent>
    </Card>
  );
}

// Premium Skeleton Table
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <Card className="bg-slate-900 border-white/10">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <SkeletonLine key={i} width={`${100 / columns}%`} height="1rem" />
            ))}
          </div>
          {/* Rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex gap-4 items-center">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <SkeletonLine
                  key={colIndex}
                  width={`${100 / columns}%`}
                  height="2.5rem"
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Premium Skeleton Chart
export function SkeletonChart({ height = '300px' }: { height?: string }) {
  return (
    <Card className="bg-slate-900 border-white/10">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SkeletonLine width="30%" height="1.5rem" />
            <SkeletonLine width="20%" height="1rem" />
          </div>
          <div className="flex items-end gap-2" style={{ height }}>
            {[65, 80, 55, 90, 70, 85, 60, 75, 95, 70].map((h, i) => (
              <div key={i} className="flex-1 flex items-end">
                <SkeletonLine width="100%" height={`${h}%`} />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Premium Skeleton Stats Grid
export function SkeletonStatsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="bg-slate-900 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <SkeletonLine width="60%" height="0.875rem" />
              <SkeletonCircle size="3rem" />
            </div>
            <SkeletonLine width="50%" height="2rem" className="mb-3" />
            <SkeletonLine width="40%" height="0.75rem" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Animated Loaders
export function SpinnerLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <Loader2 className={`${sizes[size]} animate-spin text-blue-500`} />
  );
}

export function PulseLoader() {
  return (
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-3 h-3 bg-blue-500 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0.5, 1]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  );
}

export function BarLoader() {
  return (
    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    </div>
  );
}

// Full Page Loader
export function FullPageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50">
      <div className="text-center">
        <motion.div
          className="relative w-24 h-24 mx-auto mb-6"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-purple-500" />
        </motion.div>
        <motion.p
          className="text-white text-lg font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {message}
        </motion.p>
      </div>
    </div>
  );
}

// Content Loader with Icon
export function ContentLoader({
  icon: Icon = BarChart3,
  title = 'Loading',
  subtitle
}: {
  icon?: any;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <motion.div
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        <Icon className="w-8 h-8 text-white" />
      </motion.div>
      <p className="text-white font-medium text-lg">{title}</p>
      {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
      <PulseLoader />
    </div>
  );
}

// Shimmer Effect Container
export function ShimmerContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      {children}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{
          x: ['-100%', '100%']
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    </div>
  );
}

// Progress Loader
export function ProgressLoader({
  progress,
  label,
  showPercentage = true
}: {
  progress: number;
  label?: string;
  showPercentage?: boolean;
}) {
  return (
    <div className="space-y-2">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-slate-400">{label}</span>}
          {showPercentage && <span className="text-white font-medium">{progress}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// Data Processing Loader
export function DataProcessingLoader({
  steps,
  currentStep
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <Card className="bg-slate-900 border-white/10">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <motion.div
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Zap className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h3 className="text-white font-medium">Processing Data</h3>
            <p className="text-slate-400 text-sm">Please wait...</p>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                index === currentStep
                  ? 'bg-blue-500/10 border border-blue-500/20'
                  : index < currentStep
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-slate-800 border border-white/10'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  index === currentStep
                    ? 'bg-blue-500'
                    : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-slate-700'
                }`}
              >
                {index < currentStep ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    ✓
                  </motion.div>
                ) : index === currentStep ? (
                  <SpinnerLoader size="sm" />
                ) : (
                  <span className="text-xs text-slate-400">{index + 1}</span>
                )}
              </div>
              <span
                className={`text-sm ${
                  index <= currentStep ? 'text-white' : 'text-slate-400'
                }`}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
