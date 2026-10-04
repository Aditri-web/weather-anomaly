import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  speed: number;
}

export const AtmosphericStreamlines: React.FC<{
  className?: string;
  intensity?: number;
  theme?: 'light' | 'dark';
}> = ({ className = '', intensity = 1, theme = 'dark' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const isLight = theme === 'light';
    const bgFadeColor = isLight ? 'rgba(251, 251, 249, 0.10)' : 'rgba(12, 12, 12, 0.08)';
    const particleBaseRgb = isLight ? '68, 64, 60' : '214, 211, 209'; // Charcoal graphite in light, warm stone in dark

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      ctx.fillStyle = isLight ? '#fbfbf9' : '#0c0c0c';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse pressure deflection
    let mouseX = -1000;
    let mouseY = -1000;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const vortexX = width * 0.65;
    const vortexY = height * 0.45;

    const particleCount = Math.floor(Math.min(120, Math.max(45, (width * height) / 14000)) * intensity);
    const particles: Particle[] = [];

    const initParticle = (): Particle => {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        age: 0,
        life: 80 + Math.random() * 120,
        speed: 0.6 + Math.random() * 0.8,
      };
    };

    for (let i = 0; i < particleCount; i++) {
      const p = initParticle();
      p.age = Math.random() * p.life;
      particles.push(p);
    }

    ctx.fillStyle = isLight ? '#fbfbf9' : '#0c0c0c';
    ctx.fillRect(0, 0, width, height);

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(32, time - lastTime) / 16.6;
      lastTime = time;

      ctx.fillStyle = bgFadeColor;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        let flowAngle = 0.25 * Math.PI;

        const dx = p.x - vortexX;
        const dy = p.y - vortexY;
        const distToVortex = Math.sqrt(dx * dx + dy * dy);

        if (distToVortex < width * 0.45) {
          const angleToVortex = Math.atan2(dy, dx);
          const tangentialAngle = angleToVortex + Math.PI / 2;
          const vortexWeight = Math.max(0, 1 - distToVortex / (width * 0.45));
          flowAngle = flowAngle * (1 - vortexWeight) + tangentialAngle * vortexWeight;
        }

        const mdx = p.x - mouseX;
        const mdy = p.y - mouseY;
        const distToMouse = Math.sqrt(mdx * mdx + mdy * mdy);
        if (distToMouse < 180) {
          const repelAngle = Math.atan2(mdy, mdx);
          const repelWeight = (1 - distToMouse / 180) * 0.4;
          flowAngle = flowAngle * (1 - repelWeight) + repelAngle * repelWeight;
        }

        const targetVx = Math.cos(flowAngle) * p.speed;
        const targetVy = Math.sin(flowAngle) * p.speed;

        p.vx += (targetVx - p.vx) * 0.15;
        p.vy += (targetVy - p.vy) * 0.15;

        const prevX = p.x;
        const prevY = p.y;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.age += dt;

        const progress = p.age / p.life;
        const alpha = Math.sin(progress * Math.PI) * (isLight ? 0.28 : 0.35);

        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = `rgba(${particleBaseRgb}, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        if (p.x < -10 || p.x > width + 10 || p.y < -10 || p.y > height + 10 || p.age >= p.life) {
          particles[i] = initParticle();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [intensity, theme]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-auto ${className}`}
      style={{ opacity: 0.85 }}
    />
  );
};
