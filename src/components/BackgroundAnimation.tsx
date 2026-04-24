import React, { useEffect, useRef } from 'react';

export default function BackgroundAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Animation objects
    const coins = Array.from({ length: 6 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 20 + Math.random() * 20,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      color: ['#10b981', '#8b5cf6', '#06b6d4'][Math.floor(Math.random() * 3)]
    }));

    const shapes = Array.from({ length: 8 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 15 + Math.random() * 25,
      type: ['triangle', 'square', 'hexagon'][Math.floor(Math.random() * 3)],
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.01,
    }));

    const orbs = [
      { x: canvas.width * 0.2, y: canvas.height * 0.3, color: '#10b981', size: 300 },
      { x: canvas.width * 0.8, y: canvas.height * 0.7, color: '#8b5cf6', size: 350 },
      { x: canvas.width * 0.5, y: canvas.height * 0.5, color: '#06b6d4', size: 250 }
    ];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Orbs
      orbs.forEach(orb => {
        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.size);
        gradient.addColorStop(0, orb.color + '15'); // Very low opacity
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      // Draw Graph Line
      ctx.beginPath();
      ctx.strokeStyle = '#10b98120';
      ctx.lineWidth = 2;
      ctx.moveTo(0, canvas.height * 0.8);
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.lineTo(i, canvas.height * (0.8 - (i / canvas.width) * 0.5 + Math.sin(i * 0.01) * 0.05));
      }
      ctx.stroke();

      // Draw Coins
      coins.forEach(coin => {
        ctx.save();
        ctx.translate(coin.x, coin.y);
        ctx.rotate(coin.rotation);
        ctx.strokeStyle = coin.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, coin.size, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner circle
        ctx.beginPath();
        ctx.arc(0, 0, coin.size * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        
        // Rupee symbol (simplified)
        ctx.font = `${coin.size * 0.8}px serif`;
        ctx.fillStyle = coin.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₹', 0, 0);
        
        ctx.restore();

        // Update position
        coin.x += coin.vx;
        coin.y += coin.vy;
        coin.rotation += coin.rotationSpeed;

        // Bounce
        if (coin.x < 0 || coin.x > canvas.width) coin.vx *= -1;
        if (coin.y < 0 || coin.y > canvas.height) coin.vy *= -1;
      });

      // Draw Shapes
      shapes.forEach(shape => {
        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.rotate(shape.rotation);
        ctx.strokeStyle = '#94a3b830';
        ctx.lineWidth = 1;

        ctx.beginPath();
        if (shape.type === 'triangle') {
          ctx.moveTo(0, -shape.size);
          ctx.lineTo(shape.size, shape.size);
          ctx.lineTo(-shape.size, shape.size);
        } else if (shape.type === 'square') {
          ctx.rect(-shape.size/2, -shape.size/2, shape.size, shape.size);
        } else {
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = shape.size * Math.cos(angle);
            const y = shape.size * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // Update
        shape.x += shape.vx;
        shape.y += shape.vy;
        shape.rotation += shape.rotationSpeed;

        if (shape.x < 0 || shape.x > canvas.width) shape.vx *= -1;
        if (shape.y < 0 || shape.y > canvas.height) shape.vy *= -1;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0 opacity-60"
    />
  );
}
