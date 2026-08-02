import { motion } from 'motion/react';

interface NeonSkeletonProps {
  width?: string;
  height?: string;
  variant?: 'text' | 'rect' | 'circle';
  className?: string;
  color?: string;
}

export function NeonSkeleton({
  width = '100%',
  height = '20px',
  variant = 'rect',
  className = '',
  color = '#2dd4ff'
}: NeonSkeletonProps) {
  const borderRadius = variant === 'circle' ? '50%' : variant === 'text' ? '4px' : '8px';

  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: `${color}10`,
        border: `1px solid ${color}20`,
      }}
    >
      {/* Animated shimmer */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}30, transparent)`,
        }}
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Pulse glow */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle, ${color}20, transparent)`,
          filter: 'blur(10px)',
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}

// Preset skeleton layouts
export function SkeletonCard({ color = '#2dd4ff' }: { color?: string }) {
  return (
    <div className="p-6 rounded-2xl glass-medium space-y-4">
      <NeonSkeleton width="60%" height="24px" color={color} />
      <NeonSkeleton width="100%" height="16px" color={color} />
      <NeonSkeleton width="80%" height="16px" color={color} />
      <div className="flex gap-3 mt-4">
        <NeonSkeleton width="100px" height="32px" color={color} />
        <NeonSkeleton width="100px" height="32px" color={color} />
      </div>
    </div>
  );
}

export function SkeletonChart({ color = '#2dd4ff' }: { color?: string }) {
  return (
    <div className="p-6 rounded-2xl glass-medium space-y-4">
      <NeonSkeleton width="40%" height="24px" color={color} />
      <div className="h-64 flex items-end gap-2">
        {[60, 80, 45, 90, 70, 85, 55, 95].map((height, i) => (
          <NeonSkeleton
            key={i}
            width="12.5%"
            height={`${height}%`}
            color={color}
          />
        ))}
      </div>
    </div>
  );
}
