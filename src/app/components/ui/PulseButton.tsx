import { motion } from 'motion/react';
import { ReactNode } from 'react';

interface PulseButtonProps {
  children: ReactNode;
  onClick?: () => void;
  color?: string;
  className?: string;
}

export function PulseButton({
  children,
  onClick,
  color = '#2dd4ff',
  className = ''
}: PulseButtonProps) {
  return (
    <motion.button
      className={`relative px-6 py-3 rounded-xl font-semibold overflow-hidden ${className}`}
      style={{
        background: `${color}20`,
        border: `1px solid ${color}60`,
        color: '#ffffff',
      }}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Pulse rings */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        style={{
          border: `2px solid ${color}`,
        }}
        animate={{
          scale: [1, 1.5],
          opacity: [0.6, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-xl"
        style={{
          border: `2px solid ${color}`,
        }}
        animate={{
          scale: [1, 1.5],
          opacity: [0.6, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
          delay: 1,
        }}
      />

      {/* Content */}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
