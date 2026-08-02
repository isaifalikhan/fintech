import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

interface SpotlightCursorProps {
  size?: number;
  color?: string;
  intensity?: number;
  blur?: number;
}

export function SpotlightCursor({
  size = 300,
  color = 'rgba(45, 212, 255, 0.15)',
  intensity = 0.8,
  blur = 100
}: SpotlightCursorProps) {
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 200 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-50 mix-blend-screen"
      style={{
        x: cursorXSpring,
        y: cursorYSpring,
        translateX: '-50%',
        translateY: '-50%',
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color}, transparent 70%)`,
          filter: `blur(${blur}px)`,
          opacity: intensity,
        }}
      />
    </motion.div>
  );
}
