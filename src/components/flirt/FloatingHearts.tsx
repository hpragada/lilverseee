import React, { useEffect, useRef } from 'react';

interface FloatingHeartsProps {
  burstTrigger?: number; // Increment to trigger a burst
  burstColor?: string;
  ambient?: boolean;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  scale: number;
  life?: number;
  maxLife?: number;
}

const HEART_COLORS = [
  '#C0C0C0', // primary silver
  '#E8E8E8', // platinum highlight
  '#A8A8A8', // secondary silver
  '#D4D4D4', // bright chrome
  '#999999', // soft silver
  '#F5F5F5', // brilliant platinum
];

export const FloatingHearts: React.FC<FloatingHeartsProps> = ({
  burstTrigger = 0,
  ambient = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Draw heart path on 2D context
  const drawHeart = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
    opacity: number,
    rotation: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    ctx.fillStyle = color;

    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(0, topCurveHeight);
    // Top left curve
    ctx.bezierCurveTo(
      -size / 2,
      -size / 2,
      -size,
      topCurveHeight / 3,
      0,
      size
    );
    // Top right curve
    ctx.bezierCurveTo(
      size,
      topCurveHeight / 3,
      size / 2,
      -size / 2,
      0,
      topCurveHeight
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Trigger burst of hearts from center/bottom
  const triggerBurst = (width: number, height: number) => {
    const burstCount = 24;
    const originX = width / 2;
    const originY = height * 0.65;

    for (let i = 0; i < burstCount; i++) {
      const angle = (Math.PI * 2 * i) / burstCount + (Math.random() - 0.5) * 0.5;
      const velocity = Math.random() * 4 + 2;
      const size = Math.random() * 14 + 10;
      const color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];

      particlesRef.current.push({
        x: originX + (Math.random() - 0.5) * 40,
        y: originY + (Math.random() - 0.5) * 20,
        size,
        speedX: Math.cos(angle) * velocity,
        speedY: Math.sin(angle) * velocity - 2.5, // bias upward
        opacity: 0.95,
        rotation: (Math.random() - 0.5) * 0.5,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
        color,
        scale: 1,
        life: 0,
        maxLife: Math.random() * 40 + 50,
      });
    }
  };

  // Watch for burstTrigger changes
  const prevTriggerRef = useRef(burstTrigger);
  useEffect(() => {
    if (burstTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = burstTrigger;
      const canvas = canvasRef.current;
      if (canvas) {
        triggerBurst(canvas.width, canvas.height);
      }
    }
  }, [burstTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Initial ambient particles
    if (ambient) {
      for (let i = 0; i < 18; i++) {
        particlesRef.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 12 + 6,
          speedX: (Math.random() - 0.5) * 0.4,
          speedY: -(Math.random() * 0.6 + 0.3),
          opacity: Math.random() * 0.4 + 0.1,
          rotation: (Math.random() - 0.5) * 0.4,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
          scale: 1,
        });
      }
    }

    let lastAmbientSpawn = Date.now();

    const loop = () => {
      ctx.clearRect(0, 0, width, height);

      // Periodically spawn gentle ambient floating heart
      const now = Date.now();
      if (ambient && now - lastAmbientSpawn > 700 && particlesRef.current.length < 35) {
        lastAmbientSpawn = now;
        particlesRef.current.push({
          x: Math.random() * width,
          y: height + 20,
          size: Math.random() * 12 + 6,
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: -(Math.random() * 0.7 + 0.4),
          opacity: Math.random() * 0.35 + 0.1,
          rotation: (Math.random() - 0.5) * 0.4,
          rotationSpeed: (Math.random() - 0.5) * 0.02,
          color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
          scale: 1,
        });
      }

      // Update & render particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];

        if (p.maxLife !== undefined && p.life !== undefined) {
          // Burst particle with limited life
          p.life++;
          p.x += p.speedX;
          p.y += p.speedY;
          p.speedY += 0.08; // gravity
          p.speedX *= 0.98;
          p.rotation += p.rotationSpeed;
          p.opacity = 1 - p.life / p.maxLife;

          if (p.life >= p.maxLife || p.opacity <= 0) {
            particlesRef.current.splice(i, 1);
            continue;
          }
        } else {
          // Ambient particle floating up
          p.x += p.speedX;
          p.y += p.speedY;
          p.rotation += p.rotationSpeed;

          // Gently recycle when exiting top
          if (p.y < -30) {
            p.y = height + 20;
            p.x = Math.random() * width;
          }
        }

        drawHeart(ctx, p.x, p.y, p.size, p.color, p.opacity, p.rotation);
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [ambient]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
