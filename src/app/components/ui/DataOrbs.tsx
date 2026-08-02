import { motion } from 'motion/react';

interface DataOrbsProps {
  count?: number;
  colors?: string[];
  size?: { min: number; max: number };
  speed?: number;
}

export function DataOrbs({
  count = 8,
  colors = ['#2dd4ff', '#a855f7', '#ec4899', '#10b981'],
  size = { min: 20, max: 60 },
  speed = 20
}: DataOrbsProps) {
  const orbs = Array.from({ length: count }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    size: Math.random() * (size.max - size.min) + size.min,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: i * 0.2,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            background: `radial-gradient(circle, ${orb.color}40, transparent)`,
            filter: 'blur(10px)',
          }}
          animate={{
            x: [0, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * 100 - 50, 0],
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: speed + orb.delay,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: orb.delay,
          }}
        />
      ))}
    </div>
  );
}
