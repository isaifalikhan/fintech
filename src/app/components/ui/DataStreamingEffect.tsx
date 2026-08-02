import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface DataStreamingEffectProps {
  data?: number[];
  color?: string;
  height?: number;
  barCount?: number;
}

export function DataStreamingEffect({ 
  data = [],
  color = '#2dd4ff',
  height = 60,
  barCount = 40
}: DataStreamingEffectProps) {
  const [bars, setBars] = useState<number[]>([]);
  
  useEffect(() => {
    // Initialize with random values
    setBars(Array.from({ length: barCount }, () => Math.random()));
    
    // Simulate streaming data
    const interval = setInterval(() => {
      setBars(prev => {
        const newBars = [...prev.slice(1)];
        newBars.push(data.length > 0 ? data[Math.floor(Math.random() * data.length)] : Math.random());
        return newBars;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [barCount, data]);
  
  return (
    <div className="flex items-end gap-0.5 h-full" style={{ height }}>
      {bars.map((value, index) => (
        <motion.div
          key={index}
          className="flex-1 rounded-t-sm"
          style={{
            background: `linear-gradient(to top, ${color}, ${color}80)`,
            boxShadow: `0 0 8px ${color}60`,
          }}
          initial={{ height: 0 }}
          animate={{ 
            height: `${value * 100}%`,
          }}
          transition={{ 
            duration: 0.3,
            ease: 'easeOut'
          }}
        />
      ))}
    </div>
  );
}
