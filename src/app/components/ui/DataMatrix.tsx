import { useEffect, useRef, useState } from 'react';

interface DataMatrixProps {
  density?: number;
  speed?: number;
  characters?: string;
  color?: string;
}

export function DataMatrix({
  density = 0.95,
  speed = 50,
  characters = '01',
  color = '#2dd4ff'
}: DataMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [columns, setColumns] = useState<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      const fontSize = 14;
      const cols = Math.floor(canvas.width / fontSize);
      setColumns(Array(cols).fill(1));
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const fontSize = 14;
    const chars = characters.split('');

    const draw = () => {
      // Semi-transparent black to create fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = color;
      ctx.font = `${fontSize}px monospace`;

      columns.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;

        // Random brightness
        const alpha = Math.random() * 0.5 + 0.5;
        ctx.globalAlpha = alpha;
        ctx.fillText(char, x, y * fontSize);

        // Reset column randomly
        if (y * fontSize > canvas.height && Math.random() > density) {
          columns[i] = 0;
        }

        columns[i]++;
      });

      ctx.globalAlpha = 1;
    };

    const interval = setInterval(draw, speed);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [density, speed, characters, color, columns]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
    />
  );
}
