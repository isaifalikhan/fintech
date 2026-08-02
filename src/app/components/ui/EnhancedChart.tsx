import { ReactNode, useState } from 'react';
import { motion } from 'motion/react';

interface EnhancedChartProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  actions?: ReactNode;
  color?: string;
}

export function EnhancedChart({
  children,
  title,
  subtitle,
  className = '',
  actions,
  color = '#2dd4ff'
}: EnhancedChartProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={`rounded-3xl p-8 relative overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(30, 15, 50, 0.6) 0%, rgba(10, 5, 20, 0.8) 100%)',
        border: `1px solid ${color}30`,
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{
        boxShadow: `0 20px 60px -20px ${color}50`,
      }}
      transition={{ duration: 0.3 }}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${color}30, transparent 70%)`,
        }}
        animate={{
          opacity: isHovered ? 0.6 : 0.4,
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 255, 255, 0.03) 2px, rgba(255, 255, 255, 0.03) 4px)',
        }}
      />

      {/* Header */}
      {(title || actions) && (
        <div className="relative z-10 mb-8 flex items-start justify-between">
          <div>
            {title && (
              <motion.h3
                className="text-2xl font-bold text-white mb-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {title}
              </motion.h3>
            )}
            {subtitle && (
              <motion.p
                className="text-slate-400 text-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {subtitle}
              </motion.p>
            )}
          </div>
          {actions && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {actions}
            </motion.div>
          )}
        </div>
      )}

      {/* Chart content */}
      <div className="relative z-10">{children}</div>

      {/* Corner accents - appear on hover */}
      <motion.div
        className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 pointer-events-none"
        style={{ borderColor: color }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: isHovered ? 0.6 : 0, scale: isHovered ? 1 : 0.8 }}
        transition={{ duration: 0.3 }}
      />
      <motion.div
        className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 pointer-events-none"
        style={{ borderColor: color }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: isHovered ? 0.6 : 0, scale: isHovered ? 1 : 0.8 }}
        transition={{ duration: 0.3 }}
      />
      <motion.div
        className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 pointer-events-none"
        style={{ borderColor: color }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: isHovered ? 0.6 : 0, scale: isHovered ? 1 : 0.8 }}
        transition={{ duration: 0.3 }}
      />
      <motion.div
        className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 pointer-events-none"
        style={{ borderColor: color }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: isHovered ? 0.6 : 0, scale: isHovered ? 1 : 0.8 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}
