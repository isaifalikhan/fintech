import { motion } from 'motion/react';
import { ReactNode } from 'react';

interface HolographicOverlayProps {
  children: ReactNode;
  intensity?: 'low' | 'medium' | 'high';
  animated?: boolean;
}

export function HolographicOverlay({
  children,
  intensity = 'medium',
  animated = true
}: HolographicOverlayProps) {
  const intensityMap = {
    low: { opacity: 0.1, blur: 40 },
    medium: { opacity: 0.2, blur: 60 },
    high: { opacity: 0.3, blur: 80 }
  };

  const settings = intensityMap[intensity];

  return (
    <div className="relative">
      {/* Holographic grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(45, 212, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(45, 212, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          opacity: settings.opacity,
        }}
      />

      {/* Animated scan lines */}
      {animated && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(transparent 50%, rgba(45, 212, 255, 0.03) 50%)',
            backgroundSize: '100% 4px',
          }}
          animate={{
            y: [0, 8],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      {/* Diagonal light sweep */}
      {animated && (
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="absolute h-full w-1/3"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(45, 212, 255, 0.1), transparent)',
              filter: `blur(${settings.blur}px)`,
            }}
            animate={{
              x: ['-100%', '300%'],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </motion.div>
      )}

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400/30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400/30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/30 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
