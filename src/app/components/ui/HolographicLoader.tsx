import { motion } from 'motion/react';

interface HolographicLoaderProps {
  size?: number;
  color?: string;
}

export function HolographicLoader({
  size = 60,
  color = '#2dd4ff'
}: HolographicLoaderProps) {
  return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Rotating rings */}
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className="absolute inset-0 rounded-full"
            style={{
              border: `2px solid ${color}`,
              borderTopColor: 'transparent',
              borderRightColor: index === 1 ? 'transparent' : color,
            }}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 1.5 - index * 0.3,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}

        {/* Center pulse */}
        <motion.div
          className="absolute inset-0 m-auto rounded-full"
          style={{
            width: size / 3,
            height: size / 3,
            background: `radial-gradient(circle, ${color}, transparent)`,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.8, 0.3, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-full blur-md"
          style={{
            background: `radial-gradient(circle, ${color}60, transparent)`,
          }}
        />
      </div>
    </div>
  );
}
