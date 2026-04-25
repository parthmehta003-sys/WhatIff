import React, { useState, useEffect, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, ChevronRight, Quote, ShieldCheck, Calculator, Sparkles } from 'lucide-react';
import Footer from './Footer';
import BackgroundAnimation from './BackgroundAnimation';

const SIPCalculator = lazy(() => import('./calculators/SIPCalculator'));
const BasicFDCalculator = lazy(() => import('./calculators/BasicFDCalculator'));

interface LandingPageProps {
  onStart: () => void;
  onNavigate: (screen: any) => void;
}

export default function LandingPage({ onStart, onNavigate }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [sipValues, setSipValues] = useState({ monthlyInvestment: 5000, annualRate: 12, years: 10, stepUp: 0 });
  const [fdValues, setFdValues] = useState({ principal: 100000, fdRate: 6.5, tenure: 12, taxSlab: 20 });
  const [activeSlide, setActiveSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const carouselTimer = React.useRef<NodeJS.Timeout | null>(null);

  const slides = [
    { id: 'sip', label: 'SIP', icon: <Calculator size={12} />, color: '#10b981' },
    { id: 'fd', label: 'Basic FD', icon: <Calculator size={12} />, color: '#10b981' },
    { id: 'score', label: 'Financial Awareness', icon: <Sparkles size={12} />, color: '#f59e0b' }
  ];

  const startTimer = React.useCallback(() => {
    if (carouselTimer.current) clearInterval(carouselTimer.current);
    carouselTimer.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slides.length);
    }, 5000);
  }, [slides.length]);

  React.useEffect(() => {
    if (!isHovered) {
      startTimer();
    } else {
      if (carouselTimer.current) clearInterval(carouselTimer.current);
    }
    return () => {
      if (carouselTimer.current) clearInterval(carouselTimer.current);
    };
  }, [isHovered, startTimer]);

  const handleNext = () => {
    setActiveSlide(prev => (prev + 1) % slides.length);
    if (!isHovered) startTimer();
  };

  const handlePrev = () => {
    setActiveSlide(prev => (prev - 1 + slides.length) % slides.length);
    if (!isHovered) startTimer();
  };

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x < -50) {
      handleNext();
    } else if (info.offset.x > 50) {
      handlePrev();
    }
  };
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is WhatIff completely free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Every personal finance calculator on WhatIff is completely free. There is no paywall, no premium plan, and no trial period. This will not change."
        }
      },
      {
        "@type": "Question",
        "name": "Do I need to sign up or create an account to use WhatIff?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. WhatIff requires no account, no login, and no sign-up of any kind. Open the app and start calculating immediately — no registration required."
        }
      },
      {
        "@type": "Question",
        "name": "Does WhatIff store or collect my financial data?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. Every calculation on WhatIff happens entirely on your device. We never see your salary, your loan amount, your SIP amount, or any other number you enter. Your financial data never leaves your phone or browser."
        }
      },
      {
        "@type": "Question",
        "name": "Does WhatIff give financial advice or investment recommendations?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. WhatIff is not a SEBI-registered investment advisor and does not give financial advice or investment recommendations. The calculators show you what your numbers mean in plain language. The decision is always yours."
        }
      },
      {
        "@type": "Question",
        "name": "How accurate are WhatIff's financial calculators?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "WhatIff uses standard financial formulas — the same ones used by banks and mutual fund platforms in India. If you find a calculation error, email hello.whatiff@gmail.com and we will investigate and fix it."
        }
      },
      {
        "@type": "Question",
        "name": "What does the AI assistant in WhatIff do?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The AI assistant answers questions about your specific calculator results — why your EMI splits the way it does, what your SIP corpus means in real terms, or how the prepay vs invest break-even was calculated. It does not give financial advice or product recommendations."
        }
      },
      {
        "@type": "Question",
        "name": "How does WhatIff make money if it is free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "WhatIff currently does not generate revenue. It is built because the tool did not exist and the people who need it most — first-time investors, home loan borrowers, young earners — should not have to pay for access to clear financial information."
        }
      }
    ]
  };

  const faqItems = [
    {
      id: "faq-1",
      q: "Is WhatIff completely free to use?",
      a: "Yes. Every personal finance calculator on WhatIff is completely free. There is no paywall, no premium plan, and no trial period. This will not change."
    },
    {
      id: "faq-2",
      q: "Do I need to sign up or create an account to use WhatIff?",
      a: "No. WhatIff requires no account, no login, and no sign-up of any kind. Open the app and start calculating immediately — no registration required."
    },
    {
      id: "faq-3",
      q: "Does WhatIff store or collect my financial data?",
      a: "No. Every calculation on WhatIff happens entirely on your device. We never see your salary, your loan amount, your SIP amount, or any other number you enter. Your financial data never leaves your phone or browser."
    },
    {
      id: "faq-4",
      q: "Does WhatIff give financial advice or investment recommendations?",
      a: "No. WhatIff is not a SEBI-registered investment advisor and does not give financial advice or investment recommendations. The calculators show you what your numbers mean in plain language. The decision is always yours."
    },
    {
      id: "faq-5",
      q: "How accurate are WhatIff's financial calculators?",
      a: <>WhatIff uses standard financial formulas — the same ones used by banks and mutual fund platforms in India. If you find a calculation error, email <a href="mailto:hello.whatiff@gmail.com" style={{ color: '#10b981', textDecoration: 'none' }}>hello.whatiff@gmail.com</a> and we will investigate and fix it.</>
    },
    {
      id: "faq-6",
      q: "What does the AI assistant in WhatIff do?",
      a: "The AI assistant answers questions about your specific calculator results — why your EMI splits the way it does, what your SIP corpus means in real terms, or how the prepay vs invest break-even was calculated. It has full context of your current inputs and outputs. It does not give financial advice or product recommendations."
    },
    {
      id: "faq-7",
      q: "How does WhatIff make money if it is free?",
      a: "WhatIff currently does not generate revenue. It is built because the tool did not exist and the people who need it most — first-time investors, home loan borrowers, young earners — should not have to pay for access to clear financial information."
    }
  ];
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [currentFeature, setCurrentFeature] = useState(0);
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
      quote: "I always thought I had a decent plan, but this showed me where I actually stand. That clarity is what makes it valuable.",
      author: "Sheenu Gaur",
      role: "Brand Strategist",
      image: "/Sheenu-Testimonial.png"
    },
    {
      quote: "Clean, fast, and intelligent. This is what financial tools should look like in 2026. No ads, no fluff, just pure utility.",
      author: "Tanvi Dhurandhar",
      role: "Entrepreneur",
      image: "/Tanvi-Testimonial.jpg"
    }
  ];

  const features = [
    {
      id: 'privacy',
      icon: '🔒',
      title: 'Privacy',
      description: 'Your numbers never leave your device.',
      accent: '#10b981',
      bgGlow: 'rgba(16,185,129,0.25)',
      pills: ["No Login", "No Account", "No Data Collection", "Free to Use"]
    },
    {
      id: 'intelligence',
      icon: '🤖',
      title: 'Intelligence',
      description: 'Explains what your numbers mean.',
      accent: '#8b5cf6',
      bgGlow: 'rgba(139,92,246,0.25)',
      pills: ["🤖 Insights", "📊 Export to Excel", "📲 Share Your Vision", "💬 AI chat"]
    },
    {
      id: 'context',
      icon: '🎯',
      title: 'Context-Aware',
      description: 'Calculators that understand your real world — not just your numbers.',
      accent: '#f59e0b',
      bgGlow: 'rgba(245,158,11,0.25)',
      pills: ["🔗 Interlinked Calculators", "💡 Smart Nudges", "🧾 Tax-Aware", "📉 Inflation-Adjusted"],
      isCustomIcon: true
    },
    {
      id: 'action',
      icon: '⚡',
      title: 'Action',
      description: 'From insight to action in one tap.',
      accent: '#06b6d4',
      bgGlow: 'rgba(6,182,212,0.25)',
      pills: ["⚡ Compare Scenarios", "🏦 Execute Your Plan"]
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

  const nextFeature = React.useCallback(() => {
    setCurrentFeature((prev) => {
      const maxIndex = Math.max(0, features.length - itemsToShow);
      if (prev >= maxIndex) return 0;
      return prev + 1;
    });
  }, [features.length, itemsToShow]);

  const prevFeature = () => {
    setCurrentFeature((prev) => {
      const maxIndex = Math.max(0, features.length - itemsToShow);
      if (prev <= 0) return maxIndex;
      return prev - 1;
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextTestimonial();
      nextFeature();
    }, 5000);
    return () => clearInterval(interval);
  }, [nextTestimonial, nextFeature]);

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
  
  const handleFdFullBreakdown = () => {
    localStorage.setItem('fdPreFill', JSON.stringify({
      principal: fdValues.principal,
      fdRate: fdValues.fdRate,
      tenure: fdValues.tenure,
      taxSlab: fdValues.taxSlab,
      source: 'landing'
    }));
    onNavigate('basic_fd');
  };

  const fadeUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.21, 0.45, 0.32, 0.9] as any }
  };

  return (
    <div style={{ background: '#09090b', color: '#fff', minHeight: '100vh', overflowX: 'hidden' }}>
      <BackgroundAnimation />
      <Helmet>
        <title>WhatIff — Free Personal Finance Calculators for India</title>
        <meta name="description" content="Free SIP, EMI, retirement, home loan, and child education calculators for India. No login. No ads. No financial advice. Your numbers explained in plain language." />
        <meta property="og:title" content="WhatIff — Free Personal Finance Calculators for India" />
        <meta property="og:description" content="Free SIP, EMI, retirement, home loan, and child education calculators. No login. No data collected. Built for young Indian investors." />
        <meta property="og:url" content="https://whatiff.in" />
        <link rel="canonical" href="https://whatiff.in" />
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
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
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'transparent',
          zIndex: 1 
        }} />
        
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '680px' }}>
          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} style={{
            display: 'inline-block',
            background: 'rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '99px',
            padding: '4px 12px',
            color: '#fff',
            fontSize: '10px',
            letterSpacing: '0.12em',
            fontWeight: 700,
            marginBottom: '24px'
          }}>
            NO LOGIN · NO SIGN UP · NO BS
          </motion.div>

          <motion.h1 {...fadeUp} transition={{ ...fadeUp.transition, delay: 0 }} style={{
            fontSize: 'clamp(24px, 4.5vw, 44px)',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: '24px',
            minHeight: '2.2em',
            color: '#fff'
          }}>
            Every finance calculator is either behind a paywall, full of ads, built in 2009, or <span style={{
              background: 'linear-gradient(90deg, #059669, #7c3aed, #0891b2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>not intelligent</span>.
          </motion.h1>

          <motion.h2 {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.3 }} style={{
            fontSize: 'clamp(20px, 3vw, 28px)',
            fontWeight: 800,
            marginBottom: '16px',
            color: '#fff'
          }}>
            WhatIff fixes that.
          </motion.h2>

          <motion.p {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.4 }} style={{
            fontSize: '15px',
            color: '#a1a1aa',
            marginBottom: '40px'
          }}>
            One place to run your numbers and actually understand them.
          </motion.p>

          <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.5 }}>
            <button 
              onClick={onStart}
              style={{
                background: '#10b981',
                color: '#000',
                border: 'none',
                borderRadius: '14px',
                padding: '16px 40px',
                fontWeight: 800,
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 10px 20px rgba(16,185,129,0.2)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Start Calculating
            </button>
            <p style={{ color: '#71717a', fontSize: '12px', marginTop: '16px' }}>
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
            color: '#fff',
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
        background: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{ maxWidth: '680px', width: '100%', textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ color: '#10b981', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '8px' }}>LIVE DEMO</div>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800, marginBottom: '12px', color: '#fff' }}>Try it right now.</h2>
          <p style={{ color: '#a1a1aa', fontSize: '14px' }}>No login. No sign up. See exactly what WhatIff does — live.</p>
        </div>

        <div 
          className="carousel-container"
          style={{ 
            maxWidth: '680px', 
            width: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Desktop Navigation Arrows */}
          <div className="hidden md:block">
            <button 
              onClick={handlePrev}
              style={{
                position: 'absolute',
                left: '-60px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#71717a',
                transition: 'all 0.2s',
                zIndex: 10
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={handleNext}
              style={{
                position: 'absolute',
                right: '-60px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#71717a',
                transition: 'all 0.2s',
                zIndex: 10
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Slide Label Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            background: `${slides[activeSlide].color}15`,
            border: `1px solid ${slides[activeSlide].color}30`,
            borderRadius: '99px',
            color: slides[activeSlide].color,
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            marginBottom: '12px'
          }}>
            {slides[activeSlide].icon}
            {slides[activeSlide].label}
          </div>

          {/* Slide Content Box */}
          <div style={{ 
            width: '100%',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '32px 28px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            minHeight: '480px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                style={{ height: '100%' }}
              >
                {activeSlide === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <React.Suspense fallback={
                      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '32px', height: '32px', border: '4px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      </div>
                    }>
                      <SIPCalculator isEmbedded={true} onBack={() => {}} onNavigate={onNavigate} onValuesChange={setSipValues} />
                    </React.Suspense>
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
                )}

                {activeSlide === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <React.Suspense fallback={
                      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '32px', height: '32px', border: '4px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      </div>
                    }>
                      <BasicFDCalculator isEmbedded={true} onBack={() => {}} onNavigate={onNavigate} onValuesChange={setFdValues} />
                    </React.Suspense>
                    <button 
                      onClick={handleFdFullBreakdown}
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
                )}

                {activeSlide === 2 && (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    height: '100%',
                    justifyContent: 'center',
                    padding: '12px 0'
                  }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '24px',
                      padding: '32px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}>
                      {/* Animated Score Arc */}
                      <div style={{ position: 'relative', width: '220px', height: '140px', marginBottom: '24px' }}>
                        <svg viewBox="0 0 100 60" style={{ width: '100%', height: '100%' }}>
                          {/* Inner soft track */}
                          <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="8"
                            strokeLinecap="round"
                          />
                          {/* Main track border */}
                          <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          {/* Score Arc */}
                          <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 0.72 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="url(#arc-gradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray="125 125"
                          />
                          <defs>
                            <linearGradient id="arc-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#10b981" />
                              <stop offset="100%" stopColor="#34d399" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div style={{
                          position: 'absolute',
                          top: '48%',
                          left: '50%',
                          transform: 'translate(-50%, 0%)',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '42px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>72</div>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.1em', marginTop: '4px' }}>GOOD</div>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>Financial Awareness Score</h3>
                      <p style={{ fontSize: '14px', color: '#a1a1aa', maxWidth: '380px', marginBottom: '24px' }}>
                        How well do you really understand your money? Get your personalized score in 3 minutes.
                      </p>

                      {/* Parameters Row 1 */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                        {['Inflation Adjustments', 'Tax Efficiency', 'Real Returns', 'Power of compounding', 'Debt to Income'].map(pill => (
                          <span key={pill} style={{
                            padding: '6px 12px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '99px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#e4e4e7'
                          }}>
                            {pill}
                          </span>
                        ))}
                      </div>

                      {/* Privacy Pills */}
                      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '32px' }}>
                        {[
                          { icon: <ShieldCheck size={12} />, text: 'No sign up' },
                          { icon: <ShieldCheck size={12} />, text: '100% Anonymous' },
                          { icon: <ShieldCheck size={12} />, text: 'Encrypted result' }
                        ].map((pill, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#71717a' }}>
                            <span style={{ color: '#10b981' }}>{pill.icon}</span>
                            {pill.text}
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={() => onNavigate('financial_awareness_score')}
                        style={{
                          width: '100%',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '16px',
                          fontWeight: 800,
                          fontSize: '15px',
                          cursor: 'pointer',
                          boxShadow: '0 8px 16px rgba(245,158,11,0.2)'
                        }}
                      >
                        Check Your Score →
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dot Indicators */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                style={{
                  width: idx === activeSlide ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background: idx === activeSlide ? '#10b981' : '#3f3f46',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: '0.3s ease-in-out'
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section style={{ padding: '100px 24px', background: 'transparent', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>
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
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '24px',
                      padding: '32px',
                      height: '100%',
                      minHeight: '320px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      backdropFilter: 'blur(10px)'
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
                    
                    <p style={{ fontSize: '15px', fontWeight: 500, lineHeight: 1.6, color: '#a1a1aa', marginBottom: '32px', position: 'relative', zIndex: 1, flex: 1 }}>
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
      <section style={{ padding: '40px 24px 100px', background: 'transparent', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ color: '#10b981', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '8px' }}>THE DIFFERENCE</div>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800, color: '#fff' }}>WhatIff is different.</h2>
          </div>

          <div style={{ position: 'relative', maxWidth: '1200px', margin: '0 auto', overflow: 'hidden' }}>
            <motion.div
              animate={{ x: `-${currentFeature * (100 / itemsToShow)}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                display: 'flex',
                width: '100%'
              }}
            >
              {features.map((feature, index) => (
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
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '20px',
                      padding: '28px 24px',
                      height: '100%',
                      minHeight: '280px',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div style={{ 
                      position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', 
                      background: `radial-gradient(circle, ${feature.bgGlow} 0%, transparent 70%)` 
                    }} />
                    
                    {feature.isCustomIcon ? (
                      <div style={{ 
                        width: '40px', height: '40px', background: 'rgba(245,158,11,0.18)', 
                        borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px', marginBottom: '16px' 
                      }}>{feature.icon}</div>
                    ) : (
                      <div style={{ fontSize: '24px', marginBottom: '12px' }}>{feature.icon}</div>
                    )}

                    <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: feature.isCustomIcon ? '8px' : '4px', color: feature.isCustomIcon ? 'white' : 'inherit' }}>{feature.title}</h3>
                    <p style={{ 
                      color: feature.isCustomIcon ? '#fff' : '#a1a1aa', 
                      fontSize: '14px', 
                      fontWeight: 400,
                      lineHeight: feature.isCustomIcon ? 1.4 : 1.6,
                      marginBottom: '16px' 
                    }}>
                      {feature.description}
                    </p>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: 'auto' }}>
                      {feature.pills.map(p => (
                        <span key={p} style={{ 
                          background: `${feature.accent}14`, 
                          border: `1px solid ${feature.accent}40`, 
                          color: feature.accent, 
                          borderRadius: '99px', 
                          padding: '4px 10px', 
                          fontSize: '11px', 
                          fontWeight: 600 
                        }}>{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Carousel Controls */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'center' }}>
              <button
                onClick={prevFeature}
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
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextFeature}
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
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Indicators */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '24px', justifyContent: 'center' }}>
              {features.slice(0, Math.max(1, features.length - itemsToShow + 1)).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: idx === currentFeature ? '24px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: idx === currentFeature ? '#10b981' : 'rgba(255,255,255,0.2)',
                    transition: 'all 0.3s'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Questions Section */}
      <section 
        aria-label="Frequently asked questions about WhatIff"
        style={{ padding: '80px 24px', background: 'transparent' }}
      >
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          <header style={{ 
            marginBottom: '48px'
          }}>
            <div>
              <h2 style={{ 
                color: '#fff', 
                fontSize: 'clamp(22px, 4vw, 28px)', 
                fontWeight: 800, 
                letterSpacing: '-0.02em',
                marginBottom: '4px'
              }}>
                Questions
              </h2>
              <p style={{ color: '#71717a', fontSize: '14px' }}>
                The ones people actually ask.
              </p>
            </div>
          </header>

          <dl style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index} 
                  style={{ 
                    background: 'rgba(255,255,255,0.02)',
                    border: isOpen ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <dt>
                    <button
                      aria-expanded={isOpen}
                      aria-controls={item.id}
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px 20px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <span style={{ 
                        color: '#71717a', 
                        fontSize: '11px', 
                        fontWeight: 500, 
                        minWidth: '20px'
                      }}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span style={{ 
                        color: '#fff', 
                        fontSize: '14px', 
                        fontWeight: 500, 
                        textAlign: 'left', 
                        flex: 1,
                        lineHeight: 1.4 
                      }}>
                        {item.q}
                      </span>
                      <div 
                        aria-hidden="true"
                        style={{ 
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: isOpen ? '#1D9E75' : '#09090b',
                          border: '1px solid rgba(255,255,255,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s ease',
                          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)'
                        }}
                      >
                        <span style={{ 
                          color: isOpen ? '#fff' : '#71717a', 
                          fontSize: '14px', 
                          fontWeight: 400,
                          lineHeight: 1
                        }}>
                          +
                        </span>
                      </div>
                    </button>
                  </dt>
                  <dd 
                    id={item.id}
                    hidden={!isOpen}
                    style={{
                      maxHeight: isOpen ? '200px' : '0',
                      overflow: 'hidden',
                      transition: 'max-height 0.3s ease',
                      margin: 0
                    }}
                  >
                    <div style={{ 
                      color: '#a1a1aa', 
                      fontSize: '13px', 
                      lineHeight: 1.75, 
                      padding: '0 20px 20px 56px'
                    }}>
                      {item.a}
                    </div>
                  </dd>
                </div>
              );
            })}
          </dl>

          <footer style={{
            marginTop: '32px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <span style={{ color: '#71717a', fontSize: '12px' }}>Still have a question?</span>
            <a 
              href="mailto:hello.whatiff@gmail.com" 
              style={{ 
                color: '#1D9E75', 
                fontSize: '12px', 
                fontWeight: 500, 
                textDecoration: 'none' 
              }}
            >
              hello.whatiff@gmail.com
            </a>
          </footer>
        </div>
      </section>

      {/* Final CTA Section */}
      <section style={{ 
        padding: '40px 24px 100px 24px', 
        textAlign: 'center', 
        position: 'relative',
        background: 'transparent'
      }}>
        <div style={{ 
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '300px', height: '300px', background: 'rgba(0,0,0,0.05)', filter: 'blur(80px)', borderRadius: '50%', zIndex: 0
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '40px', color: '#fff' }}>
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
              background: '#10b981',
              color: '#000',
              border: 'none',
              borderRadius: '14px',
              padding: '18px 48px',
              fontWeight: 800,
              fontSize: '18px',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(16,185,129,0.3)',
              transition: 'transform 0.2s',
              marginBottom: '16px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Open WhatIff
          </button>
          <p style={{ color: '#71717a', fontSize: '13px' }}>No login required. Start in seconds.</p>
        </div>
      </section>

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
