import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  depth?: 'shallow' | 'medium' | 'deep';
  glow?: boolean;
  glowColor?: string;
  blur?: 'light' | 'medium' | 'heavy';
}

export function GlassCard({ 
  children, 
  className = '',
  depth = 'medium',
  glow = false,
  glowColor = '#2dd4ff',
  blur = 'medium'
}: GlassCardProps) {
  const depthStyles = {
    shallow: {
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    },
    medium: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    },
    deep: {
      background: 'rgba(255, 255, 255, 0.07)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 12px 48px rgba(0, 0, 0, 0.4)',
    },
  };
  
  const blurValues = {
    light: '12px',
    medium: '18px',
    heavy: '24px',
  };
  
  const style = depthStyles[depth];
  
  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      style={{
        ...style,
        backdropFilter: `blur(${blurValues[blur]}) saturate(180%)`,
        WebkitBackdropFilter: `blur(${blurValues[blur]}) saturate(180%)`,
        ...(glow && {
          boxShadow: `${style.boxShadow}, 0 0 40px ${glowColor}30`,
        }),
      }}
      whileHover={{
        y: -4,
        boxShadow: glow 
          ? `${style.boxShadow}, 0 0 60px ${glowColor}40`
          : `0 16px 64px rgba(0, 0, 0, 0.4)`,
      }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Subtle gradient overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%, rgba(255, 255, 255, 0.05) 100%)',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
