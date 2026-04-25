import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  ChevronLeft, 
  Lightbulb, 
  Download, 
  Share2, 
  MessageSquare, 
  RotateCcw, 
  CheckCircle2, 
  ExternalLink,
  Lock,
  Smartphone,
  Sparkles,
  Info,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { cn } from '../lib/utils';
import { ScoreReport } from './ScoreReport';
import { Helmet } from 'react-helmet-async';

// Types
interface Option {
  text: string;
  points: number;
}

interface Question {
  parameter: string;
  parameterEmoji: string;
  text: string;
  options: Option[];
  tip: string;
  source?: string;
}

interface ScoreResult {
  score: number;
  breakdown: Record<string, number>;
  date: string;
  answers: number[];
}

const QUESTIONS: Question[] = [
  // PARAMETER 1 — SAVINGS HABITS
  {
    parameter: "Savings Habits",
    parameterEmoji: "💰",
    text: "What percentage of your monthly take-home income do you typically save or invest?",
    options: [
      { text: "Less than 5%", points: 0 },
      { text: "5% to 10%", points: 3 },
      { text: "10% to 20%", points: 5 },
      { text: "More than 20%", points: 10 }
    ],
    tip: "Financial planners generally recommend saving at least 20% of take-home income. The 50/30/20 rule allocates 50% to needs, 30% to wants, and 20% to savings.",
    source: "Elizabeth Warren's 50/30/20 rule (Harvard Law); SEBI Investor Awareness Guidelines"
  },
  {
    parameter: "Savings Habits",
    parameterEmoji: "💰",
    text: "Do you track your monthly expenses in any form?",
    options: [
      { text: "No, I have no idea where money goes", points: 0 },
      { text: "I have a rough idea but don't track formally", points: 3 },
      { text: "I track occasionally — maybe once a month", points: 5 },
      { text: "Yes, I track regularly and review it", points: 10 }
    ],
    tip: "Tracking expenses is the foundation of financial control. Studies show people who track spending save 15-20% more than those who don't (NBER Working Paper, 2019).",
    source: "NBER Working Paper, 2019"
  },
  // PARAMETER 2 — EMERGENCY PREPAREDNESS
  {
    parameter: "Emergency Preparedness",
    parameterEmoji: "🚨",
    text: "How many months of your expenses could you cover with money you can access within 48 hours?",
    options: [
      { text: "Less than 1 month", points: 0 },
      { text: "1 to 3 months", points: 3 },
      { text: "3 to 6 months", points: 7 },
      { text: "More than 6 months", points: 10 }
    ],
    tip: "Most financial planners recommend 3–6 months of expenses in liquid form. Self-employed individuals or those with dependents should target 6–12 months.",
    source: "Fidelity Personal Finance Guidelines; RBI Financial Literacy Guidelines"
  },
  {
    parameter: "Emergency Preparedness",
    parameterEmoji: "🚨",
    text: "Where do you keep your emergency fund?",
    options: [
      { text: "I don't have an emergency fund", points: 0 },
      { text: "In my regular savings account", points: 5 },
      { text: "In a liquid mutual fund or high-yield savings", points: 10 },
      { text: "In FDs or other instruments that take days to access", points: 3 }
    ],
    tip: "An emergency fund should be liquid — accessible within 24-48 hours. Liquid mutual funds offer better returns than savings accounts while maintaining accessibility.",
  },
  // PARAMETER 3 — RETIREMENT READINESS
  {
    parameter: "Retirement Readiness",
    parameterEmoji: "🏖️",
    text: "Have you calculated how much corpus you will need at retirement?",
    options: [
      { text: "No, I haven't thought about it", points: 0 },
      { text: "I have a rough number in my head but haven't calculated", points: 3 },
      { text: "Yes, I have a specific number I'm working toward", points: 10 }
    ],
    tip: "Fidelity suggests having 10x your annual salary saved by retirement. At 6% inflation, ₹50,000/month today will require ₹2.15 lakh/month in 25 years — needing a corpus of ₹5.8 crore.",
    source: "Fidelity Retirement Savings Guidelines"
  },
  {
    parameter: "Retirement Readiness",
    parameterEmoji: "🏖️",
    text: "Are you actively investing toward retirement right now?",
    options: [
      { text: "No, I'll think about it later", points: 0 },
      { text: "My employer's EPF is my only retirement investment", points: 3 },
      { text: "I invest in EPF plus at least one other retirement vehicle (NPS/PPF/MF)", points: 7 },
      { text: "I have a structured retirement plan with defined contributions", points: 10 }
    ],
    tip: "EPF alone is unlikely to fund retirement. At 8.15% EPF return vs 10-12% equity returns, ₹5,000/month in EPF vs equity grows to ₹1.2Cr vs ₹1.9Cr over 30 years.",
  },
  // PARAMETER 4 — LIFE INSURANCE AWARENESS
  {
    parameter: "Life Insurance Awareness",
    parameterEmoji: "☂️",
    text: "Do you have a pure term life insurance policy?",
    options: [
      { text: "No life insurance at all", points: 0 },
      { text: "I have LIC or an endowment/ULIP policy", points: 3 },
      { text: "I have a term life policy", points: 10 }
    ],
    tip: "Term insurance is the only form of life insurance that provides pure financial protection. Endowment and ULIP policies mix insurance with investment — typically delivering poor returns on both.",
    source: "IRDAI Guidelines; Human Life Value method (S.S. Huebner)"
  },
  {
    parameter: "Life Insurance Awareness",
    parameterEmoji: "☂️",
    text: "Is your life insurance cover at least 10x your annual income?",
    options: [
      { text: "I don't have life insurance", points: 0 },
      { text: "Less than 5x annual income", points: 2 },
      { text: "5x to 10x annual income", points: 5 },
      { text: "More than 10x annual income", points: 10 }
    ],
    tip: "The Human Life Value method and most financial planners recommend cover of 10–15x annual income. IRDAI data shows average cover in India is only 3x — significantly underinsured.",
  },
  // PARAMETER 5 — HEALTH INSURANCE
  {
    parameter: "Health Insurance",
    parameterEmoji: "🏥",
    text: "Do you have a personal health insurance policy (separate from employer cover)?",
    options: [
      { text: "No health insurance at all", points: 0 },
      { text: "Only employer-provided cover", points: 3 },
      { text: "Personal policy but cover under ₹5 lakh", points: 5 },
      { text: "Personal policy with ₹5 lakh or more cover", points: 10 }
    ],
    tip: "Employer health cover lapses when you change or lose a job. IRDAI recommends a minimum personal cover of ₹5 lakh — higher in metros. Healthcare inflation in India runs at 8-12% annually.",
    source: "IRDAI Annual Report 2023"
  },
  {
    parameter: "Health Insurance",
    parameterEmoji: "🏥",
    text: "Does your health insurance cover your entire family (spouse and children if applicable)?",
    options: [
      { text: "Only myself", points: 3 },
      { text: "Myself and immediate family", points: 10 },
      { text: "Not applicable — I'm single with no dependents", points: 10 },
      { text: "I don't have health insurance", points: 0 }
    ],
    tip: "A family floater policy covering all members is typically more cost-efficient than individual policies. Include parents separately as their claims can exhaust the floater.",
  },
  // PARAMETER 6 — DEBT MANAGEMENT
  {
    parameter: "Debt Management",
    parameterEmoji: "💳",
    text: "What percentage of your monthly take-home income goes to EMI payments?",
    options: [
      { text: "More than 50%", points: 0 },
      { text: "35% to 50%", points: 3 },
      { text: "20% to 35%", points: 5 },
      { text: "Less than 20%", points: 10 },
      { text: "No EMIs", points: 10 }
    ],
    tip: "The RBI Household Finance Committee recommends keeping total EMI obligations below 40% of take-home income. Above 50% significantly constrains savings capacity and financial resilience.",
    source: "RBI Household Finance Committee Report 2017"
  },
  {
    parameter: "Debt Management",
    parameterEmoji: "💳",
    text: "Do you pay your credit card bill in full every month?",
    options: [
      { text: "I don't have a credit card", points: 7 },
      { text: "No — I pay the minimum or partial amount", points: 0 },
      { text: "Sometimes full, sometimes not", points: 3 },
      { text: "Yes, always in full", points: 10 }
    ],
    tip: "Credit card revolving interest in India ranges from 36-42% per annum — among the highest cost debt available. Carrying a balance for even 3 months can cost more than the original purchase.",
  },
  // PARAMETER 7 — INVESTMENT DIVERSIFICATION
  {
    parameter: "Investment Diversification",
    parameterEmoji: "🌈",
    text: "How many different asset classes do you currently invest in?",
    options: [
      { text: "Only FDs or savings account", points: 0 },
      { text: "1 asset class (e.g. only equity or only gold)", points: 3 },
      { text: "2 asset classes", points: 5 },
      { text: "3 or more (e.g. equity, debt, gold, real estate)", points: 10 }
    ],
    tip: "Markowitz's Modern Portfolio Theory shows diversification across uncorrelated asset classes reduces portfolio volatility without sacrificing returns. SEBI's 2022 investor survey found 60% of retail investors hold only one asset class.",
    source: "Modern Portfolio Theory (Markowitz)"
  },
  {
    parameter: "Investment Diversification",
    parameterEmoji: "🌈",
    text: "Do you know what your current equity-to-debt allocation is?",
    options: [
      { text: "No idea", points: 0 },
      { text: "I know approximately but haven't calculated", points: 3 },
      { text: "Yes — I know and it's based on my age and risk appetite", points: 10 }
    ],
    tip: "A common thumb rule: equity allocation = 100 minus your age. A 30-year-old should have approximately 70% in equity. Adjust based on risk tolerance and time horizon.",
  },
  // PARAMETER 8 — TAX EFFICIENCY
  {
    parameter: "Tax Efficiency",
    parameterEmoji: "🏛️",
    text: "Have you fully utilised your Section 80C deduction limit (₹1.5 lakh per year)?",
    options: [
      { text: "I don't know what 80C is", points: 0 },
      { text: "I know about it but haven't utilised it fully", points: 3 },
      { text: "I utilise it partially through EPF/LIC only", points: 5 },
      { text: "Yes — fully utilised through EPF, ELSS, PPF, or tuition fees", points: 10 }
    ],
    tip: "Section 80C allows ₹1.5 lakh annual deduction — saving ₹46,800/year for those in the 30% bracket. ELSS funds provide 80C benefit with the shortest lock-in (3 years) and historically highest returns among 80C options.",
    source: "Income Tax Act 1961"
  },
  {
    parameter: "Tax Efficiency",
    parameterEmoji: "🏛️",
    text: "Have you compared your tax liability under New vs Old Tax Regime for your income?",
    options: [
      { text: "No — I just follow whatever my employer selected", points: 0 },
      { text: "I've heard about it but haven't compared", points: 3 },
      { text: "Yes — I've compared and chosen the better option", points: 10 }
    ],
    tip: "The choice between New and Old regime depends entirely on your total deductions. With deductions above ₹3.75 lakh, Old regime typically wins. Below that, New regime is usually better.",
  },
  // PARAMETER 9 — ESTATE AND LEGACY
  {
    parameter: "Estate and Legacy",
    parameterEmoji: "📝",
    text: "Have you written a Will?",
    options: [
      { text: "No, and I haven't thought about it", points: 0 },
      { text: "No, but I intend to", points: 2 },
      { text: "Yes, a basic Will exists", points: 10 }
    ],
    tip: "In India, dying without a Will (intestate) means assets are distributed per the Hindu Succession Act or Indian Succession Act — which may not reflect your wishes. A Will is especially critical if you have dependents, property, or a business.",
    source: "Law Commission of India Report No. 110"
  },
  {
    parameter: "Estate and Legacy",
    parameterEmoji: "📝",
    text: "Are all your investments and insurance policies nominee-updated?",
    options: [
      { text: "No — I haven't added nominees to most accounts", points: 0 },
      { text: "Some accounts have nominees, not all", points: 3 },
      { text: "Yes — all bank accounts, investments, and insurance have nominees", points: 10 }
    ],
    tip: "Without a nominee, assets can be frozen for months or years during legal proceedings. The Supreme Court (2023) has reinforced that nominee registration is the simplest legacy safeguard available to every investor.",
    source: "IRDAI nomination guidelines; RBI nomination circulars"
  },
  // PARAMETER 10 — FINANCIAL GOALS CLARITY
  {
    parameter: "Financial Goals Clarity",
    parameterEmoji: "🎯",
    text: "Do you have specific financial goals with a defined target amount and timeline?",
    options: [
      { text: "No specific goals — I just try to save what I can", points: 0 },
      { text: "Vague goals — like 'save more' or 'buy a house someday'", points: 3 },
      { text: "1-2 defined goals with rough timelines", points: 5 },
      { text: "Multiple defined goals with specific amounts and timelines", points: 10 }
    ],
    tip: "Vanguard's research shows goal-based investors accumulate 1.5–3% more wealth annually than those without defined goals — purely from better decision-making driven by clear targets.",
    source: "Vanguard Research 'Goals-Based Investing' 2021"
  },
  {
    parameter: "Financial Goals Clarity",
    parameterEmoji: "🎯",
    text: "How often do you review your financial plan or investments?",
    options: [
      { text: "Never", points: 0 },
      { text: "Only when the market crashes or a crisis hits", points: 2 },
      { text: "Once a year", points: 7 },
      { text: "Quarterly or more frequently", points: 10 }
    ],
    tip: "Annual reviews are the minimum. Quarterly reviews allow you to rebalance allocations, catch underperforming instruments, and adjust for life changes — without over-trading.",
  }
];

const PARAMETERS = Array.from(new Set(QUESTIONS.map(q => q.parameter)));

const calculatorLinks: Record<string, { name: string | null; screen: string | null; note?: string; comingSoon?: boolean }> = {
  "Savings Habits": { name: 'SIP Calculator', screen: 'sip' },
  "Emergency Preparedness": { name: 'FD Planner', screen: 'basic_fd' },
  "Retirement Readiness": { name: 'Retirement Calculator', screen: 'retirement' },
  "Life Insurance Awareness": { name: null, screen: null, note: 'Compare term plans on PolicyBazaar or IRDAI Bima Sugam' },
  "Health Insurance": { name: null, screen: null, note: 'Compare on IRDAI Bima Sugam' },
  "Debt Management": { name: 'EMI Calculator', screen: 'emi' },
  "Investment Diversification": { name: 'Goal Planner', screen: 'goal' },
  "Tax Efficiency": { name: 'Tax Regime Calculator', screen: null, comingSoon: true },
  "Estate and Legacy": { name: null, screen: null, note: 'Update nominees via DigiLocker' },
  "Financial Goals Clarity": { name: 'Goal Planner', screen: 'goal' }
};

interface FinancialAwarenessScoreProps {
  onBack?: () => void;
  onNavigate?: (screen: any) => void;
  onAskAI?: (context: any, chips: string[], systemPrompt: string) => void;
}

export default function FinancialAwarenessScore({ onBack, onNavigate, onAskAI }: FinancialAwarenessScoreProps) {
  const [screen, setScreen] = useState<'landing' | 'quiz' | 'calculating' | 'results'>('landing');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(QUESTIONS.length).fill(-1));
  const [lastResult, setLastResult] = useState<ScoreResult | null>(null);
  const [direction, setDirection] = useState(0); // for slide animation
  const [showMethodology, setShowMethodology] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'WORK' | 'REVIEW' | 'OPTIMAL'>('WORK');
  const isTransitioning = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem('whatiff_fas_result');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ScoreResult;
        // Only consider scores that are within the 0-100 range as valid historical data
        if (parsed && typeof parsed.score === 'number' && parsed.score <= 100) {
          setLastResult(parsed);
        } else {
          // Clean up invalid or stale score data from previous versions (e.g. 635/100)
          localStorage.removeItem('whatiff_fas_result');
        }
        if (parsed.answers && parsed.answers.length === QUESTIONS.length) {
          setAnswers(parsed.answers);
          setScreen('results');
        }
      } catch (e) {
        console.error("Error loading previous result:", e);
      }
    }
  }, []);

  const totalScore = useMemo(() => {
    if (answers.includes(-1)) return 0;
    const scores = QUESTIONS.map((q, i) => q.options[answers[i]].points);
    // Average pairs for 10 parameters
    let sum = 0;
    for (let i = 0; i < 20; i += 2) {
      sum += (scores[i] + scores[i+1]) / 2;
    }
    return Math.round(sum);
  }, [answers]);

  const parameterScores = useMemo(() => {
    const scores = QUESTIONS.map((q, i) => answers[i] !== -1 ? q.options[answers[i]].points : 0);
    const breakdown: Record<string, number> = {};
    for (let i = 0; i < 20; i += 2) {
      const paramName = QUESTIONS[i].parameter;
      breakdown[paramName] = (scores[i] + scores[i+1]) / 2;
    }
    return breakdown;
  }, [answers]);

  const groupedParameters = useMemo(() => {
    const groups = {
      WORK: [] as any[],
      REVIEW: [] as any[],
      OPTIMAL: [] as any[]
    };
    
    QUESTIONS.filter((_, i) => i % 2 === 0).forEach(q => {
      const score = parameterScores[q.parameter] * 10;
      const item = { q, score };
      if (score < 50) groups.WORK.push(item);
      else if (score < 75) groups.REVIEW.push(item);
      else groups.OPTIMAL.push(item);
    });
    
    return groups;
  }, [parameterScores]);

  useEffect(() => {
    if (screen === 'results') {
      if (groupedParameters.WORK.length > 0) setActiveCategory('WORK');
      else if (groupedParameters.REVIEW.length > 0) setActiveCategory('REVIEW');
      else setActiveCategory('OPTIMAL');
    }
  }, [screen, groupedParameters]);

  const getBandInfo = (score: number) => {
    if (score >= 81) return { color: '#10b981', badge: '🏆', name: 'Wealth Architect', message: 'Exceptional financial clarity. You have mastered the fundamentals and are building wealth with strategic precision.' };
    if (score >= 66) return { color: '#10b981', badge: '💪', name: 'Money Maestro', message: 'Strong financial awareness. You are well ahead of the curve, with most safeguards and habits firmly in place.' };
    if (score >= 51) return { color: '#f59e0b', badge: '📘', name: 'Aware Achiever', message: 'You have some good habits started, but there are critical gaps in your protection and growth plan that need immediate attention.' };
    if (score >= 31) return { color: '#f59e0b', badge: '🌱', name: 'Steady Planner', message: 'You are at the beginning of your financial journey. Focusing on tracking and emergency safety will make the biggest impact right now.' };
    return { color: '#f87171', badge: '🚦', name: 'Novice Navigator', message: 'Your financial future is vulnerable. Taking steps today to formalize your tracking and insurance will prevent significant long-term stress.' };
  };

  const bandInfo = getBandInfo(totalScore);

  const startQuiz = () => {
    setAnswers(new Array(QUESTIONS.length).fill(-1));
    setCurrentQuestionIndex(0);
    setScreen('quiz');
    isTransitioning.current = false;
  };

  const handleSelectOption = (optionIndex: number) => {
    if (screen !== 'quiz' || isTransitioning.current) return;

    isTransitioning.current = true;
    setAnswers(prev => {
      const next = [...prev];
      next[currentQuestionIndex] = optionIndex;
      return next;
    });

    setTimeout(() => {
      if (currentQuestionIndex < QUESTIONS.length - 1) {
        setDirection(1);
        setCurrentQuestionIndex(prev => Math.min(prev + 1, QUESTIONS.length - 1));
        isTransitioning.current = false;
      } else {
        setScreen('calculating');
        isTransitioning.current = false;
      }
    }, 400);
  };

  const handleBackQuestion = () => {
    if (currentQuestionIndex > 0 && !isTransitioning.current) {
      setDirection(-1);
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Calculating Transition logic
  const [calculationSteps, setCalculationSteps] = useState([false, false, false]);
  useEffect(() => {
    if (screen === 'calculating') {
      const timer1 = setTimeout(() => setCalculationSteps([true, false, false]), 500);
      const timer2 = setTimeout(() => setCalculationSteps([true, true, false]), 1000);
      const timer3 = setTimeout(() => setCalculationSteps([true, true, true]), 1500);
      const timer4 = setTimeout(() => {
        const result: ScoreResult = {
          score: totalScore,
          breakdown: parameterScores,
          date: new Date().toISOString(),
          answers: answers
        };
        localStorage.setItem('whatiff_fas_result', JSON.stringify(result));
        setScreen('results');
      }, 2500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [screen, totalScore, parameterScores, answers]);

  // UI components
  const ProgressBar = () => (
    <div className="w-full space-y-2 mb-8">
      <div className="h-[3px] w-full bg-white/5 overflow-hidden">
        <motion.div 
          className="h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className="text-white text-[10px] font-bold uppercase tracking-widest opacity-80">
        Question {currentQuestionIndex + 1} of 20
      </p>
    </div>
  );

  const Disclaimer = () => (
    <p className="text-white text-[11px] text-center px-5 max-w-2xl mx-auto leading-relaxed">
      This scorecard is for educational and self-awareness purposes only. It does not constitute financial, investment, insurance, or tax advice. Scoring is based on publicly available financial planning thumb rules and is not personalised to your situation. Please consult a SEBI-registered Investment Advisor for personalised guidance.
    </p>
  );

  const radarData = useMemo(() => {
    const labels: Record<string, string> = {
      "Savings Habits": "Savings",
      "Emergency Preparedness": "Emergency",
      "Retirement Readiness": "Retirement",
      "Life Insurance Awareness": "Life",
      "Health Insurance": "Health",
      "Debt Management": "Debt",
      "Investment Diversification": "Investment",
      "Tax Efficiency": "Tax",
      "Estate and Legacy": "Estate",
      "Financial Goals Clarity": "Financial"
    };
    return PARAMETERS.map(p => ({
      parameter: labels[p] || p.split(' ')[0],
      score: (parameterScores[p] || 0) * 10,
      fullMark: 100
    }));
  }, [parameterScores]);

  const weakAreas = useMemo(() => {
    return Object.entries(parameterScores)
      .filter(([, score]) => (score * 10) < 75)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3);
  }, [parameterScores]);

  const belowBenchmarkCount = useMemo(() => {
    return Object.entries(parameterScores).filter(([, score]) => (score * 10) < 75).length;
  }, [parameterScores]);

  // PDF Export
  const downloadReport = async () => {
    const reportElement = document.getElementById('score-report-pdf-hidden');
    if (!reportElement) return;

    try {
      setIsGeneratingPDF(true); 
      
      // Wait for font to be ready if needed, or just a small delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await toPng(reportElement, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        fontEmbedCSS: "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&family=Outfit:wght@700;800;900&display=swap');",
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;

      // Add the first page
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      // Add subsequent pages if the content is longer than one page
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`whatiff-score-${totalScore}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Canvas Export (Share Image)
  const shareScore = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // BG
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, 1080, 1080);

    // Header
    ctx.fillStyle = '#10b981';
    ctx.font = '900 60px Inter';
    ctx.fillText('WhatIff', 80, 130);

    // Score
    const band = getBandInfo(totalScore);
    ctx.fillStyle = band.color;
    ctx.font = '900 320px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(totalScore.toString(), 540, 560);

    ctx.font = '700 80px Inter';
    ctx.fillText(`${band.badge} ${band.name}`, 540, 680);

    ctx.fillStyle = '#71717a';
    ctx.font = '700 40px Inter';
    ctx.fillText('Financial Awareness Score', 540, 950);
    ctx.fillText('whatiff.in', 540, 1010);

    const link = document.createElement('a');
    link.download = `score-${totalScore}-whatiff.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Chat with AI integration
  const discussWithAI = () => {
    const systemPrompt = `You are a financial explainer assistant.
The user has completed the WhatIff Financial Awareness Scorecard.
Total score: ${totalScore}/100. Band: ${bandInfo.name}.
Parameter scores: ${JSON.stringify(parameterScores)}.
Weakest areas: ${JSON.stringify(weakAreas)}.

Answer questions about what each score means, how each parameter is calculated, and what the numbers imply. 
Do not give financial advice. Do not recommend specific products, funds, or advisors.
Use awareness language only. Always suggest consulting a SEBI-registered advisor for personalised guidance. 
10 question limit per session.

Disclaimer: This session is for educational purposes only. No financial advice provided.`;
    
    const context = {
      score: totalScore,
      breakdown: parameterScores,
      weakAreas: weakAreas
    };
    
    const chips = [
      "Explain my Savings score",
      "How can I improve my Debt score?",
      "Why is Insurance awareness important?",
      "What does Money Maestro mean?"
    ];

    onAskAI?.(context, chips, systemPrompt);
  };

  if (screen === 'landing') {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col p-6 animate-in fade-in duration-700">
        <Helmet>
          <title>Financial Awareness Score | WhatIff</title>
        </Helmet>
        
        <div className="flex-1 flex flex-col items-center justify-center space-y-12 max-w-4xl mx-auto w-full">
          <div className="text-center space-y-6">
            <h1 className="text-emerald-500 text-xl font-bold tracking-tight">WhatIff</h1>
            <div className="space-y-4">
              <h2 className="text-white text-[clamp(24px,4vw,36px)] font-black tracking-tight leading-tight">
                Financial Awareness Score
              </h2>
              <p className="text-white text-[15px] leading-relaxed max-w-[440px] mx-auto">
                20 questions. 3 minutes. Understand where you stand across 10 key areas of personal finance.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
             <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-[11px] text-white font-medium">
               <Lock className="w-3.5 h-3.5" /> No sign-up
             </div>
             <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-[11px] text-white font-medium">
               <Smartphone className="w-3.5 h-3.5" /> No data collected
             </div>
             <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-2 text-[11px] text-white font-medium">
               <span className="w-3.5 h-3.5 flex items-center justify-center">📱</span> Stays on your device
             </div>
          </div>

          <div className="w-full flex flex-col items-center space-y-6">
            <button 
              onClick={startQuiz}
              className="w-full md:w-auto bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-[15px] py-[16px] px-[40px] rounded-[12px] shadow-[0_0_24px_rgba(245,158,11,0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              Start the scorecard →
            </button>

            {lastResult && (
              <p className="text-[#52525b] text-[12px] font-medium">
                If you have taken this before, your last score is shown below.<br />
                <span className="inline-block mt-2">
                  Last score: <span className="text-white">{lastResult.score}/100</span> · {new Date(lastResult.date).toLocaleDateString()} · <button onClick={startQuiz} className="text-amber-500 hover:underline">Retake →</button>
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="py-8">
           <Disclaimer />
        </div>
      </div>
    );
  }

  if (screen === 'quiz') {
    const q = QUESTIONS[currentQuestionIndex];
    if (!q) return null;
    return (
      <div className="min-h-screen bg-[#09090b] text-white p-6 flex flex-col animate-in fade-in duration-500 overflow-hidden relative">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            {currentQuestionIndex > 0 ? (
               <button onClick={handleBackQuestion} className="flex items-center gap-1.5 text-[#52525b] hover:text-white text-[13px] font-medium transition-colors">
                 <ChevronLeft className="w-4 h-4" /> Back
               </button>
            ) : <div />}
          </div>

          <ProgressBar />

          <div className="flex-1 flex flex-col">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <span className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {q.parameterEmoji} {q.parameter}
                  </span>
                  <h3 className="text-white text-[clamp(16px,3vw,20px)] font-bold italic leading-tight">
                    "{q.text}"
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {q.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      className={cn(
                        "w-full text-left p-[14px] px-[18px] rounded-[16px] border transition-all duration-300 text-[14px] font-medium relative group",
                        answers[currentQuestionIndex] === idx
                          ? "bg-gradient-to-br from-orange-600 to-amber-600 border-orange-400 text-white font-black shadow-[0_8px_25px_rgba(234,88,12,0.4)] scale-[1.02]"
                          : "bg-gradient-to-br from-orange-500/[0.12] to-orange-400/[0.04] border-white/[0.1] text-white/90 hover:border-orange-500/50 hover:from-orange-500/[0.2] hover:to-orange-400/[0.12] hover:scale-[1.01]"
                      )}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>

                <div className="bg-white/[0.02] border border-white/[0.06] rounded-[10px] p-[12px] px-[16px] flex gap-3">
                   <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />
                   <p className="text-white text-[12px] leading-relaxed italic font-medium">
                     {q.tip}
                   </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'calculating') {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 space-y-12">
        <div className="text-center space-y-2">
          <motion.h4 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[72px] font-black text-amber-500 leading-none"
          >
            {totalScore}
          </motion.h4>
          <p className="text-white text-sm font-medium opacity-80">Analysing your inputs...</p>
        </div>

        <div className="w-full max-w-[280px] space-y-4">
           {[
             { label: "Analysing your savings habits...", active: calculationSteps[0] },
             { label: "Reviewing your debt posture...", active: calculationSteps[1] },
             { label: "Mapping your goal clarity...", active: calculationSteps[2] }
           ].map((step, i) => (
             <div key={i} className="flex items-center justify-between text-[14px]">
               <span className={cn("transition-colors duration-500", step.active ? "text-white" : "text-white/30")}>
                 {step.label}
               </span>
               <AnimatePresence>
                 {step.active && (
                   <motion.div 
                     initial={{ scale: 0 }} 
                     animate={{ scale: 1 }}
                     className="text-emerald-500"
                   >
                     <CheckCircle2 className="w-4 h-4" />
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
           ))}
        </div>
      </div>
    );
  }

  // SCREEN 4: RESULTS DASHBOARD
  if (screen === 'results') {
    return (
      <div className="min-h-screen bg-[#09090b] text-white p-6 md:p-12 space-y-12 animate-in fade-in duration-1000">
        <Helmet>
          <title>Your Financial Awareness Dashboard | WhatIff</title>
        </Helmet>

        {/* Top Right Actions */}
        <div className="flex justify-end gap-3 -mb-8 relative z-10">
          <button 
            onClick={shareScore}
            className="p-3 bg-white/[0.06] border border-white/[0.1] rounded-full hover:bg-white/[0.1] transition-all text-emerald-500 shadow-lg shadow-black/20"
            title="Share Result"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button 
            onClick={downloadReport}
            disabled={isGeneratingPDF}
            className={cn(
              "p-3 bg-white/[0.06] border border-white/[0.1] rounded-full hover:bg-white/[0.1] transition-all text-amber-500 shadow-lg shadow-black/20",
              isGeneratingPDF && "opacity-50"
            )}
            title="Download PDF"
          >
            {isGeneratingPDF ? (
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
          </button>
          <button 
            onClick={startQuiz}
            className="p-3 bg-white/[0.06] border border-white/[0.1] rounded-full hover:bg-white/[0.1] transition-all text-purple-500 shadow-lg shadow-black/20"
            title="Retake Test"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Score Hero */}
        <div className="flex flex-col items-center text-center space-y-8">
           <div className="relative w-[200px] h-[200px] flex items-center justify-center">
              {/* Soft Glow */}
              <div 
                className="absolute inset-0 rounded-full blur-[40px] opacity-20"
                style={{ backgroundColor: bandInfo.color }}
              />
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle 
                  cx="100" cy="100" r="90" 
                  fill="none" stroke="rgba(255,255,255,0.06)" 
                  strokeWidth="8"
                />
                <motion.circle 
                  cx="100" cy="100" r="90" 
                  fill="none" stroke={bandInfo.color} 
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 90}
                  initial={{ strokeDashoffset: 2 * Math.PI * 90 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 90 * (1 - totalScore / 100) }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex flex-col items-center">
                <span className="text-[64px] font-black leading-none" style={{ color: bandInfo.color }}>{totalScore}</span>
                <span className="text-white font-bold text-sm uppercase tracking-widest mt-1 opacity-80">SCORE</span>
              </div>
           </div>
           
           <div className="space-y-6 flex flex-col items-center">
              <div 
                className="inline-flex px-6 py-2 rounded-full border-2 text-[14px] font-black tracking-widest uppercase"
                style={{ borderColor: bandInfo.color, color: bandInfo.color }}
              >
                {bandInfo.name}
              </div>

              {/* Score Context Bar */}
              <div className="w-full max-w-[280px] space-y-3">
                <div className="flex gap-1.5 h-1.5">
                  {[
                    { abbr: 'NN', min: 0, max: 30 },
                    { abbr: 'SP', min: 31, max: 50 },
                    { abbr: 'AA', min: 51, max: 65 },
                    { abbr: 'MM', min: 66, max: 80 },
                    { abbr: 'WA', min: 81, max: 100 }
                  ].map((b, i) => (
                    <div 
                      key={i}
                      title={`${b.abbr}: ${b.min}-${b.max}`}
                      className={cn(
                        "flex-1 rounded-full transition-colors",
                        totalScore >= b.min && totalScore <= b.max ? "" : "bg-zinc-800"
                      )}
                      style={totalScore >= b.min && totalScore <= b.max ? { backgroundColor: bandInfo.color } : {}}
                    />
                  ))}
                </div>
                <div className="flex justify-between px-0.5 text-[9px] font-black tracking-widest">
                  {[
                    { abbr: 'NN', min: 0, max: 30 },
                    { abbr: 'SP', min: 31, max: 50 },
                    { abbr: 'AA', min: 51, max: 65 },
                    { abbr: 'MM', min: 66, max: 80 },
                    { abbr: 'WA', min: 81, max: 100 }
                  ].map((b, i) => (
                    <span 
                      key={i} 
                      className={cn(totalScore >= b.min && totalScore <= b.max ? "font-black" : "text-zinc-500 font-bold")}
                      style={totalScore >= b.min && totalScore <= b.max ? { color: bandInfo.color } : {}}
                    >
                      {b.abbr}
                    </span>
                  ))}
                </div>
              </div>
           </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-[#18181b] border border-white/[0.08] rounded-[24px] p-6 space-y-4 shadow-lg shadow-black/20">
           <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest text-center">Awareness Radar</h3>
           <div className="h-[360px] w-full relative">
             <ResponsiveContainer width="100%" height="100%">
               <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis 
                    dataKey="parameter" 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700 }} 
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke={bandInfo.color}
                    strokeWidth={2}
                    fill={bandInfo.color}
                    fillOpacity={0.25}
                  />
                  {/* Concentric rings labels */}
                  <text x="50%" y="42%" textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.2)" fontWeight={800}>25</text>
                  <text x="50%" y="32%" textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.2)" fontWeight={800}>50</text>
                  <text x="50%" y="22%" textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.2)" fontWeight={800}>75</text>
                  <text x="50%" y="12%" textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.2)" fontWeight={800}>100</text>
               </RadarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Parameter Categories & Cards */}
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
            {(['WORK', 'REVIEW', 'OPTIMAL'] as const).map(cat => {
              const count = groupedParameters[cat].length;
              const label = cat === 'WORK' ? 'Needs Work' : cat === 'REVIEW' ? 'Needs Review' : 'Optimal';
              const color = cat === 'WORK' ? '#ef4444' : cat === 'REVIEW' ? '#f59e0b' : '#10b981';
              const isActive = activeCategory === cat;
              
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 relative overflow-hidden group",
                    isActive 
                      ? "bg-white/[0.08] border-white/20 text-white shadow-xl scale-[1.02]"
                      : "bg-white/5 border-white/5 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-400 hover:border-white/10"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[9px] font-bold",
                    isActive ? "bg-white/10 text-white" : "bg-black/20 text-zinc-600"
                  )}>
                    {count}
                  </span>
                  {isActive && (
                    <motion.div 
                      layoutId="cat-active"
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: color }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {groupedParameters[activeCategory].length > 0 ? (
            <motion.div 
              key={activeCategory}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {groupedParameters[activeCategory].map(({ q, score }: any, i: number) => (
                  <div 
                    key={i} 
                    className="bg-[#18181b] border border-white/[0.08] rounded-[16px] p-4 space-y-3 shadow-xl transition-all hover:bg-white/[0.04] border-l-[3px]"
                    style={{ borderLeftColor: score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444" }}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px]">{q.parameterEmoji}</span>
                          <span className="text-white text-[13px] font-bold tracking-tight">{q.parameter}</span>
                        </div>
                        <span className="text-[15px] font-black whitespace-nowrap" style={{ color: score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444" }}>{Math.round(score)} / 100</span>
                      </div>
                    </div>
                    <div className="h-[5px] w-full bg-white/5 rounded-full overflow-hidden">
                       <div 
                         className="h-full rounded-full transition-all duration-1000" 
                         style={{ width: `${score}%`, backgroundColor: score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444" }}
                       />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444" }}>
                        {score >= 75 ? "OPTIMAL" : score >= 50 ? "NEEDS REVIEW" : "NEEDS WORK"}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-bold">
                        Benchmark: {(() => {
                          const benchmarks: Record<string, string> = {
                            "Savings Habits": "≥30% monthly savings",
                            "Emergency Preparedness": "≥6 months expenses",
                            "Retirement Readiness": "≥80% of corpus on track",
                            "Life Insurance Awareness": "≥10× annual income cover",
                            "Health Insurance": "≥₹10L sum insured",
                            "Investment Diversification": "≥3 active asset classes",
                            "Estate and Legacy": "Will + Nominees in place",
                            "Financial Goals Clarity": "Goals mapped to corpus/year",
                            "Tax Efficiency": "≥80% 80C/80D/NPS used",
                            "Debt Management": "EMI <30% of income"
                          };
                          return benchmarks[q.parameter] || "Heuristic Benchmark";
                        })()}
                      </span>
                    </div>

                    {/* Action Link for Poor/Review categories */}
                    {(activeCategory === 'WORK' || activeCategory === 'REVIEW') && calculatorLinks[q.parameter] && (
                      <div className="pt-2">
                        {calculatorLinks[q.parameter].screen ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate?.(calculatorLinks[q.parameter].screen);
                            }}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-amber-500 hover:text-amber-400 transition-colors bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20"
                          >
                            Use {calculatorLinks[q.parameter].name} <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : calculatorLinks[q.parameter].note && (
                          <span className="text-[10px] text-emerald-500/80 font-medium italic">
                            💡 {calculatorLinks[q.parameter].note}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </motion.div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-zinc-500 text-sm font-medium italic">No parameters in this category yet.</p>
            </div>
          )}
        </div>

        {/* Weak Areas */}
        <div className="bg-[#18181b] border border-white/[0.08] rounded-[24px] p-6 mt-12 space-y-8 shadow-2xl">
           <div className="flex flex-col items-center text-center space-y-2">
              <h3 className="text-xl font-black text-amber-500 tracking-tight uppercase tracking-widest">Where to Focus Next</h3>
              <p className="text-zinc-500 text-xs italic">
                {belowBenchmarkCount > 3 
                  ? `${belowBenchmarkCount} of 10 parameters are below benchmark. Showing the 3 largest gaps.`
                  : "All parameters below benchmark are shown below."}
              </p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {weakAreas.map(([param, scoreRaw], i) => {
                const score = Math.round(scoreRaw * 10);
                const benchmarks: Record<string, string> = {
                  "Savings Habits": "a monthly savings rate of ≥30%",
                  "Emergency Preparedness": "≥6 months of expenses in liquid reserves",
                  "Retirement Readiness": "≥80% of your retirement corpus on track",
                  "Life Insurance Awareness": "term cover ≥10× annual income",
                  "Health Insurance": "family floater of ≥₹10L sum insured",
                  "Investment Diversification": "≥3 active asset classes",
                  "Estate and Legacy": "registered will, nominees on all accounts, and a succession plan",
                  "Financial Goals Clarity": "all goals mapped to a corpus amount and target year",
                  "Tax Efficiency": "utilisation of ≥80% of available 80C / 80D / NPS limits",
                  "Debt Management": "total EMI <30% of monthly income"
                };
                const benchmarkString = benchmarks[param] || "Standard Heuristic Benchmark";
                const gap = 100 - score;

                return (
                  <div key={i} className="bg-black/20 border border-white/5 rounded-2xl p-[12px_16px] space-y-3 hover:border-amber-500/30 transition-colors relative group">
                     <div className="absolute -top-1 -right-1 w-8 h-8 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 font-black text-xs">
                       #{i+1}
                     </div>
                     <div className="space-y-1">
                        <p className="text-amber-500 text-[10px] font-bold uppercase tracking-widest">Priority Gap</p>
                        <h5 className="text-white text-base font-black tracking-tight">{param}</h5>
                     </div>
                     <div className="space-y-1.5">
                        <p className="text-[#a1a1aa] text-[12px] leading-relaxed">
                          Score: {score}/100 · Benchmark: {benchmarkString}
                        </p>
                        <p className={cn("text-[12px] font-bold")} style={{ color: bandInfo.color }}>
                          Gap to benchmark: {gap} points
                        </p>
                     </div>
                  </div>
                )
              })}
           </div>
        </div>

        {/* Scoring Methodology */}
        <div className="mt-12 bg-white/[0.04] border border-white/[0.1] rounded-[24px] overflow-hidden shadow-lg shadow-black/20">
           <button 
             onClick={() => setShowMethodology(!showMethodology)}
             className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors"
           >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Info className="w-4 h-4" />
                </div>
                <span className="text-[14px] font-bold text-white italic font-medium">Scoring Methodology</span>
              </div>
              <motion.div
                animate={{ rotate: showMethodology ? 180 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="text-zinc-500"
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
           </button>
           
           <AnimatePresence>
             {showMethodology && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div className="px-6 pb-6 space-y-4 overflow-hidden">
                    <div className="h-px w-full bg-white/10 mb-6" />
                    <p className="text-white text-[13px] leading-relaxed italic font-medium">
                      Our scoring engine evaluates your financial health across 10 critical dimensions. Each dimension is tested with 2 targeted questions based on widely accepted financial planning 'Heuristics' (Thumb Rules). 
                    </p>
                    
                    <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">The 10 Dimensions</span>
                      <div className="grid grid-cols-2 gap-2">
                        {PARAMETERS.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px] text-white/70">
                            <div className="w-1 h-1 rounded-full bg-amber-500/40" />
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Calculation Logic</span>
                        <p className="text-white text-xs leading-relaxed opacity-90 italic">
                          Each dimension receives a score from 0-10, calculated as the average of two related questions. Your final score (0-100) is the sum of these 10 dimension scores.
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Global Benchmarking</span>
                        <p className="text-white text-xs leading-relaxed opacity-90 italic">Scores above 80 are 'Wealth Architect' level, indicating exceptional financial clarity. Scores below 50 indicate significant vulnerability to financial shocks.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
             )}
            </AnimatePresence>
        </div>

        <div className="py-12 border-t border-white/5 space-y-6">
           {lastResult && lastResult.score !== totalScore && lastResult.score <= 100 && (
              <p className="text-white/60 text-[12px] text-center font-medium italic">
                Last time you scored <span className="text-white">{lastResult.score}/100</span> on {new Date(lastResult.date).toLocaleDateString()}. 
                Your score has <span className={totalScore >= lastResult.score ? "text-emerald-500" : "text-red-500 font-bold"}>
                  {totalScore >= lastResult.score ? 'improved' : 'dropped'} by {Math.abs(totalScore - lastResult.score).toFixed(1)} points.
                </span>
              </p>
           )}
           <Disclaimer />
        </div>

        {/* Hidden Report for PDF Capture */}
        <div className="fixed left-[-9999px] top-[-9999px]">
           <div id="score-report-pdf-hidden" style={{ width: '794px', height: 'auto', background: '#ffffff' }}>
             <ScoreReport 
               score={totalScore} 
               band={bandInfo.name} 
               bandDescription={bandInfo.message}
               generatedOn={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
               parameters={PARAMETERS.map(p => {
                 const benchmarks: Record<string, string> = {
                   "Savings Habits": "a monthly savings rate of ≥30%",
                   "Emergency Preparedness": "≥6 months of expenses in liquid reserves",
                   "Retirement Readiness": "≥80% of your retirement corpus on track",
                   "Life Insurance Awareness": "term cover ≥10× annual income",
                   "Health Insurance": "family floater of ≥₹10L sum insured",
                   "Investment Diversification": "≥3 active asset classes",
                   "Estate and Legacy": "registered will, nominees on all accounts, and a succession plan",
                   "Financial Goals Clarity": "all goals mapped to a corpus amount and target year",
                   "Tax Efficiency": "utilisation of ≥80% of available 80C / 80D / NPS limits",
                   "Debt Management": "total EMI <30% of monthly income"
                 };
                 return {
                   name: p,
                   score: parameterScores[p] * 10,
                   max: 100,
                   benchmark: benchmarks[p] || "Standard Heuristic Benchmark",
                   interpretation: "Assessment based on your responses."
                 };
               })}
             />
           </div>
        </div>
      </div>
    );
  }

  return null;
}
