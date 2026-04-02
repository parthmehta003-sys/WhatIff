import React, { useState, useEffect, useRef, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import Footer from './Footer';

import SIPCalculator from './calculators/SIPCalculator';

interface LandingPageProps {
  onStart: () => void;
  onNavigate: (screen: any) => void;
}

export default function LandingPage({ onStart, onNavigate }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        ctx.font = `${coin.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = coin.color;
        ctx.fillText('₹', 0, 0);
        ctx.restore();

        coin.x = (coin.x + coin.vx + canvas.width) % canvas.width;
        coin.y = (coin.y + coin.vy + canvas.height) % canvas.height;
        coin.rotation += coin.rotationSpeed;
      });

      // Draw Shapes
      shapes.forEach(shape => {
        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.rotate(shape.rotation);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (shape.type === 'triangle') {
          ctx.moveTo(0, -shape.size);
          ctx.lineTo(shape.size, shape.size);
          ctx.lineTo(-shape.size, shape.size);
          ctx.closePath();
        } else if (shape.type === 'square') {
          ctx.rect(-shape.size/2, -shape.size/2, shape.size, shape.size);
        } else {
          for (let i = 0; i < 6; i++) {
            ctx.lineTo(shape.size * Math.cos(i * Math.PI / 3), shape.size * Math.sin(i * Math.PI / 3));
          }
          ctx.closePath();
        }
        ctx.stroke();
        ctx.restore();

        shape.x = (shape.x + shape.vx + canvas.width) % canvas.width;
        shape.y = (shape.y + shape.vy + canvas.height) % canvas.height;
        shape.rotation += shape.rotationSpeed;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const [sipValues, setSipValues] = useState({ monthlyInvestment: 5000, annualRate: 12, years: 10, stepUp: 0 });
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [itemsToShow, setItemsToShow] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setItemsToShow(3);
      else if (window.innerWidth >= 768) setItemsToShow(2);
      else setItemsToShow(1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const testimonials = [
    {
      quote: "I’ve used plenty of calculators before, but this is the first time I actually understood what my numbers mean; not just what they are.",
      author: "Ankit Bhartia",
      role: "Head - Finance, Compliance & Ops",
      image: "/Ankit-Testimonial.jpg"
    },
    {
      quote: "The most intuitive SIP calculator I've ever used. The step-up feature is exactly what I needed. It's clean, fast, and intelligent.",
      author: "Binay Agarwal",
      role: "Director - Finance Controller",
      image: "/Binay-Testimonial.png"
    },
    {
      quote: "Finally, a calculator that doesn't ask for my phone number before showing results. Privacy first approach is what won me over.",
      author: "Mayur Rane",
      role: "Senior Manager - Finance Operations",
      image: "/Mayur-Testimonial.jpg"
    },
    {
      quote: "Clean, fast, and intelligent. This is what financial tools should look like in 2026. No ads, no fluff, just pure utility.",
      author: "Tanvi Dhurandhar",
      role: "Entrepreneur",
      image: "/Tanvi-Testimonial.jpg"
    },
    {
      quote: "I always thought I had a decent plan, but this showed me where I actually stand. That clarity is what makes it valuable.",
      author: "Sheenu Gaur",
      role: "Brand Strategist",
      image: "/Sheenu-Testimonial.png"
    }
  ];

  const nextTestimonial = React.useCallback(() => {
    setCurrentTestimonial((prev) => {
      const maxIndex = Math.max(0, testimonials.length - itemsToShow);
      if (prev >= maxIndex) return 0;
      return prev + 1;
    });
  }, [testimonials.length, itemsToShow]);

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => {
      const maxIndex = Math.max(0, testimonials.length - itemsToShow);
      if (prev <= 0) return maxIndex;
      return prev - 1;
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextTestimonial();
    }, 5000);
    return () => clearInterval(interval);
  }, [nextTestimonial]);

  const handleFullBreakdown = () => {
    localStorage.setItem('sipPreFill', JSON.stringify({
      monthlyInvestment: sipValues.monthlyInvestment,
      expectedReturn: sipValues.annualRate,
      timePeriod: sipValues.years,
      stepUp: sipValues.stepUp ?? 0,
      source: 'landing'
    }));
    onNavigate('sip');
  };

  const fadeUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.21, 0.45, 0.32, 0.9] as any }
  };

  return (
    <div style={{ background: '#09090b', color: '#fff', minHeight: '100vh', overflowX: 'hidden' }}>
      <Helmet>
        <title>WhatIff — Free Financial Calculators for Indian Investors</title>
        <meta name="description" content="Free privacy-first financial calculators for SIP, EMI, retirement planning, home purchase & more. Built for young Indian investors. No login required." />
        <link rel="canonical" href="https://whatiff.in/" />
      </Helmet>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.4s ease',
        background: scrolled ? 'rgba(9,9,11,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none'
      }}>
        <div style={{ color: '#10b981', fontWeight: 900, fontSize: '20px' }}>WhatIff</div>
        <button 
          onClick={onStart}
          style={{
            background: '#10b981',
            color: '#000',
            border: 'none',
            borderRadius: '12px',
            padding: '10px 20px',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Open App
        </button>
      </header>

      {/* Hero Section */}
      <section style={{ 
        position: 'relative', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 24px'
      }}>
        <canvas 
          ref={canvasRef} 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} 
        />
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'radial-gradient(circle at center, rgba(9,9,11,0.3) 0%, rgba(9,9,11,0.85) 100%)',
          zIndex: 1 
        }} />
        
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '680px' }}>
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '99px',
            padding: '4px 12px',
            color: '#52525b',
            fontSize: '10px',
            letterSpacing: '0.12em',
            fontWeight: 700,
            marginBottom: '24px'
          }}>
            NO LOGIN · NO SIGN UP · NO BS
          </motion.div>

          <motion.h1 {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }} style={{
            fontSize: 'clamp(24px, 4.5vw, 44px)',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: '24px',
            minHeight: '2.2em'
          }}>
            Every finance calculator is either behind a paywall, full of ads, built in 2009, or <span style={{
              background: 'linear-gradient(90deg, #10b981, #8b5cf6, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>not intelligent</span>.
          </motion.h1>

          <motion.h2 {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.3 }} style={{
            fontSize: 'clamp(20px, 3vw, 28px)',
            fontWeight: 800,
            marginBottom: '16px'
          }}>
            WhatIff fixes that.
          </motion.h2>

          <motion.p {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.4 }} style={{
            fontSize: '15px',
            color: '#71717a',
            marginBottom: '40px'
          }}>
            One place to run your numbers and actually understand them.
          </motion.p>

          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.5 }}>
            <button 
              onClick={onStart}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#000',
                border: 'none',
                borderRadius: '14px',
                padding: '16px 40px',
                fontWeight: 800,
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 0 30px rgba(16,185,129,0.4)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Start Calculating
            </button>
            <p style={{ color: '#3f3f46', fontSize: '12px', marginTop: '16px' }}>
              No login required. Your numbers stay on your device.
            </p>
          </motion.div>
        </div>

        <motion.div 
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ 
            position: 'absolute', 
            bottom: '40px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            color: '#3f3f46',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.1em'
          }}
        >
          ↓ SCROLL
        </motion.div>
      </section>

      {/* Live Calculator Section */}
      <section style={{ 
        padding: '40px 24px 40px', 
        background: 'linear-gradient(to bottom, #09090b, #0a140e, #09090b)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{ maxWidth: '680px', width: '100%', textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ color: '#52525b', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '8px' }}>LIVE DEMO</div>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800, marginBottom: '12px' }}>Try it right now.</h2>
          <p style={{ color: '#52525b', fontSize: '14px' }}>No login. No sign up. See exactly what WhatIff does — live.</p>
        </div>

        <div style={{ 
          maxWidth: '680px', 
          width: '100%',
          background: 'rgba(16,185,129,0.04)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '20px',
          padding: '32px 28px',
          boxShadow: '0 0 40px rgba(16,185,129,0.08)',
          minHeight: '400px', // Add min-height to prevent layout shift
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <SIPCalculator isEmbedded={true} onBack={() => {}} onNavigate={onNavigate} onValuesChange={setSipValues} />
          
          <button 
            onClick={handleFullBreakdown}
            style={{
              width: '100%',
              background: '#10b981',
              color: '#000',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontWeight: 800,
              fontSize: '14px',
              marginTop: '24px',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(16,185,129,0.4)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            See Full Breakdown →
          </button>
        </div>
      </section>

      {/* Testimonials Section */}
      <section style={{ padding: '100px 24px', background: '#09090b', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, letterSpacing: '-0.02em' }}>
              Real people. <span style={{ color: '#10b981' }}>Real numbers.</span> Real decisions.
            </h2>
          </div>

          <div style={{ position: 'relative', maxWidth: '1200px', margin: '0 auto', overflow: 'hidden' }}>
            <motion.div
              animate={{ x: `-${currentTestimonial * (100 / itemsToShow)}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                display: 'flex',
                width: '100%'
              }}
            >
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index} 
                  style={{ 
                    flex: `0 0 ${100 / itemsToShow}%`,
                    padding: '0 12px',
                    boxSizing: 'border-box'
                  }}
                >
                  <div
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '24px',
                      padding: '32px',
                      height: '100%',
                      minHeight: '320px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      right: 0, 
                      height: '3px', 
                      background: 'linear-gradient(90deg, #10b981, #8b5cf6, #06b6d4)',
                      zIndex: 2
                    }} />
                    <div style={{ position: 'absolute', top: '20px', right: '24px', opacity: 0.1 }}>
                      <Quote size={40} color="#10b981" />
                    </div>
                    
                    <p style={{ fontSize: '15px', fontWeight: 500, lineHeight: 1.6, color: '#f4f4f5', marginBottom: '32px', position: 'relative', zIndex: 1, flex: 1 }}>
                      {testimonial.quote}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(16,185,129,0.3)' }}>
                        <img 
                          src={testimonial.image} 
                          alt={testimonial.author} 
                          referrerPolicy="no-referrer"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: '#fff' }}>{testimonial.author}</div>
                        <div style={{ fontSize: '13px', color: '#71717a', fontWeight: 500 }}>{testimonial.role}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Carousel Controls */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'center' }}>
              <button
                onClick={prevTestimonial}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextTestimonial}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Indicators */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '24px', justifyContent: 'center' }}>
              {testimonials.slice(0, Math.max(1, testimonials.length - itemsToShow + 1)).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: idx === currentTestimonial ? '24px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: idx === currentTestimonial ? '#10b981' : 'rgba(255,255,255,0.2)',
                    transition: 'all 0.3s'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '40px 24px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ color: '#52525b', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '8px' }}>THE DIFFERENCE</div>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800 }}>WhatIff is different.</h2>
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          gap: '16px', 
          maxWidth: '1000px', 
          margin: '0 auto', 
          overflowX: 'auto', 
          padding: '20px 4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}>
          {/* Card 1: Privacy */}
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.07)', 
            borderRadius: '20px', 
            padding: '28px 24px', 
            position: 'relative', 
            overflow: 'hidden',
            minWidth: '280px',
            flex: '1 0 0'
          }}>
            <div style={{ 
              position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', 
              background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)' 
            }} />
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔒</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>Privacy</h3>
            <p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '16px' }}>Your numbers never leave your device.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {["No Login", "No Account", "No Data Collection", "Free to Use"].map(p => (
                <span key={p} style={{ 
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', 
                  color: '#10b981', borderRadius: '99px', padding: '4px 10px', fontSize: '11px', fontWeight: 600 
                }}>{p}</span>
              ))}
            </div>
          </div>

          {/* Card 2: Intelligence */}
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.07)', 
            borderRadius: '20px', 
            padding: '28px 24px', 
            position: 'relative', 
            overflow: 'hidden',
            minWidth: '280px',
            flex: '1 0 0'
          }}>
            <div style={{ 
              position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', 
              background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)' 
            }} />
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🤖</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>Intelligence</h3>
            <p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '16px' }}>Explains what your numbers mean.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {["🤖 Insights", "📊 Export to Excel", "📲 Share Your Vision", "💬 AI chat"].map(p => (
                <span key={p} style={{ 
                  background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', 
                  color: '#8b5cf6', borderRadius: '99px', padding: '4px 10px', fontSize: '11px', fontWeight: 600 
                }}>{p}</span>
              ))}
            </div>
          </div>

          {/* Card 3: Action */}
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.07)', 
            borderRadius: '20px', 
            padding: '28px 24px', 
            position: 'relative', 
            overflow: 'hidden',
            minWidth: '280px',
            flex: '1 0 0'
          }}>
            <div style={{ 
              position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', 
              background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)' 
            }} />
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚡</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>Action</h3>
            <p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '16px' }}>From insight to action in one tap.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {["⚡ Compare Scenarios", "🏦 Execute Your Plan"].map(p => (
                <span key={p} style={{ 
                  background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', 
                  color: '#06b6d4', borderRadius: '99px', padding: '4px 10px', fontSize: '11px', fontWeight: 600 
                }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section style={{ 
        padding: '40px 24px 100px 24px', 
        textAlign: 'center', 
        position: 'relative',
        background: 'linear-gradient(to bottom, #09090b, #020d06, #09090b)'
      }}>
        <div style={{ 
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '300px', height: '300px', background: 'rgba(16,185,129,0.1)', filter: 'blur(80px)', borderRadius: '50%', zIndex: 0
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '40px' }}>
            <div>Your numbers.</div>
            <div style={{
              background: 'linear-gradient(90deg, #10b981, #8b5cf6, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Your decisions.</div>
          </div>

          <button 
            onClick={onStart}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#000',
              border: 'none',
              borderRadius: '14px',
              padding: '18px 48px',
              fontWeight: 800,
              fontSize: '18px',
              cursor: 'pointer',
              boxShadow: '0 0 40px rgba(16,185,129,0.4)',
              transition: 'transform 0.2s',
              marginBottom: '16px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Open WhatIff
          </button>
          <p style={{ color: '#3f3f46', fontSize: '13px' }}>No login required. Start in seconds.</p>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
