import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  value: string;
  delay: number;
}

interface MetricParticlesProps {
  value: number;
  prefix?: string;
  suffix?: string;
  color?: string;
  particleCount?: number;
}

export function MetricParticles({
  value,
  prefix = '',
  suffix = '',
  color = '#2dd4ff',
  particleCount = 5
}: MetricParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate particles when value changes
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100 - 50,
      y: Math.random() * 50,
      value: `${prefix}${value.toLocaleString()}${suffix}`,
      delay: i * 0.1,
    }));

    setParticles(newParticles);

    // Clear particles after animation
    const timeout = setTimeout(() => {
      setParticles([]);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [value]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute text-xs font-bold"
          style={{
            color,
            left: '50%',
            top: '50%',
            textShadow: `0 0 10px ${color}`,
          }}
          initial={{
            x: 0,
            y: 0,
            opacity: 0.8,
            scale: 0.5,
          }}
          animate={{
            x: particle.x,
            y: -particle.y - 30,
            opacity: 0,
            scale: 1,
          }}
          transition={{
            duration: 1.5,
            delay: particle.delay,
            ease: 'easeOut',
          }}
        >
          +{particle.value}
        </motion.div>
      ))}
    </div>
  );
}
