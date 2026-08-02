import { motion } from 'motion/react';
import { ReactNode, useState } from 'react';

interface NeonButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: ReactNode;
}

export function NeonButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  icon
}: NeonButtonProps) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  const variants = {
    primary: {
      bg: 'linear-gradient(135deg, #2dd4ff, #1e90ff)',
      glow: '#2dd4ff',
      text: '#000000'
    },
    secondary: {
      bg: 'linear-gradient(135deg, #a855f7, #7c3aed)',
      glow: '#a855f7',
      text: '#ffffff'
    },
    success: {
      bg: 'linear-gradient(135deg, #10b981, #059669)',
      glow: '#10b981',
      text: '#ffffff'
    },
    danger: {
      bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
      glow: '#ef4444',
      text: '#ffffff'
    }
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const style = variants[variant];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples([...ripples, { x, y, id }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id));
    }, 600);

    onClick?.();
  };

  return (
    <motion.button
      className={`relative overflow-hidden rounded-xl font-semibold transition-all ${sizes[size]} ${className} magnetic-target`}
      style={{
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.glow}40`,
      }}
      onClick={handleClick}
      whileHover={{
        scale: 1.05,
        boxShadow: `0 0 30px ${style.glow}60, 0 0 60px ${style.glow}30`,
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)`,
        }}
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-white/50"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ width: 0, height: 0, opacity: 0.8 }}
          animate={{
            width: 300,
            height: 300,
            opacity: 0,
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2 justify-center">
        {icon && <span>{icon}</span>}
        {children}
      </span>
    </motion.button>
  );
}
