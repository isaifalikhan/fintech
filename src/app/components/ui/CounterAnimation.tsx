import { motion, useSpring, useTransform } from 'motion/react';
import { useEffect, useState } from 'react';

interface CounterAnimationProps {
  value: number;
  duration?: number;
  formatValue?: (value: number) => string;
  className?: string;
}

export function CounterAnimation({
  value,
  duration = 1,
  formatValue = (v) => v.toFixed(0),
  className = ''
}: CounterAnimationProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const spring = useSpring(0, { duration: duration * 1000 });

  useEffect(() => {
    spring.set(value);
    
    const unsubscribe = spring.on('change', (latest) => {
      setDisplayValue(latest);
    });

    return () => unsubscribe();
  }, [value, spring]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {formatValue(displayValue)}
    </motion.span>
  );
}
