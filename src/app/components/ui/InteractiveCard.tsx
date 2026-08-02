import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ReactNode, useRef, MouseEvent } from 'react';

interface InteractiveCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glowColor?: string;
}

export function InteractiveCard({
  children,
  className = '',
  intensity = 15,
  glowColor = '#2dd4ff'
}: InteractiveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [intensity, -intensity]), {
    damping: 20,
    stiffness: 300
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-intensity, intensity]), {
    damping: 20,
    stiffness: 300
  });

  // Glow effect position
  const glowX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), {
    damping: 20,
    stiffness: 300
  });
  const glowY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), {
    damping: 20,
    stiffness: 300
  });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative ${className}`}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.02, z: 50 }}
      transition={{ duration: 0.3 }}
    >
      {/* Dynamic spotlight glow */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          width: '400px',
          height: '400px',
          left: glowX,
          top: glowY,
          x: '-50%',
          y: '-50%',
          background: `radial-gradient(circle, ${glowColor}40, transparent 70%)`,
          filter: 'blur(60px)',
        }}
      />

      {/* Reflective shine */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity"
        style={{
          background: `radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255, 255, 255, 0.2), transparent 50%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
