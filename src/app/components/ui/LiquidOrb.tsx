import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface LiquidOrbProps {
  size?: number;
  colors?: string[];
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

export function LiquidOrb({ 
  size = 200, 
  colors = ['#2dd4ff', '#7c3aed', '#ec4899'],
  intensity = 'medium',
  className = ''
}: LiquidOrbProps) {
  const [blobPath, setBlobPath] = useState('');
  
  // Generate organic blob path
  const generateBlobPath = () => {
    const points = 8;
    const angleStep = (Math.PI * 2) / points;
    const radiusVariation = intensity === 'low' ? 0.1 : intensity === 'medium' ? 0.2 : 0.3;
    
    let path = 'M ';
    const controlPoints: { x: number; y: number }[] = [];
    
    for (let i = 0; i <= points; i++) {
      const angle = i * angleStep;
      const randomRadius = size / 2 * (1 + (Math.random() - 0.5) * radiusVariation);
      const x = size / 2 + Math.cos(angle) * randomRadius;
      const y = size / 2 + Math.sin(angle) * randomRadius;
      controlPoints.push({ x, y });
    }
    
    // Create smooth bezier curves
    for (let i = 0; i < controlPoints.length - 1; i++) {
      const current = controlPoints[i];
      const next = controlPoints[i + 1];
      const nextNext = controlPoints[(i + 2) % controlPoints.length];
      
      if (i === 0) {
        path += `${current.x},${current.y} `;
      }
      
      const cp1x = current.x + (next.x - current.x) * 0.5;
      const cp1y = current.y + (next.y - current.y) * 0.5;
      const cp2x = next.x - (nextNext.x - next.x) * 0.25;
      const cp2y = next.y - (nextNext.y - next.y) * 0.25;
      
      path += `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y} `;
    }
    
    path += 'Z';
    return path;
  };
  
  useEffect(() => {
    setBlobPath(generateBlobPath());
    
    const interval = setInterval(() => {
      setBlobPath(generateBlobPath());
    }, 3000);
    
    return () => clearInterval(interval);
  }, [size, intensity]);
  
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        <defs>
          <linearGradient id="liquid-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            {colors.map((color, index) => (
              <stop 
                key={index} 
                offset={`${(index / (colors.length - 1)) * 100}%`} 
                stopColor={color} 
              />
            ))}
          </linearGradient>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
        
        <motion.path
          d={blobPath}
          fill="url(#liquid-gradient)"
          filter="url(#goo)"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0.6, 0.8, 0.6],
            scale: [1, 1.05, 1],
            rotate: [0, 360],
          }}
          transition={{
            opacity: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
          }}
        />
      </svg>
      
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${colors[0]}40, transparent 70%)`,
          filter: 'blur(30px)',
        }}
      />
    </div>
  );
}
