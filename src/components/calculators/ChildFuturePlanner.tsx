import React, { useState, useMemo, useContext, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Baby, 
  GraduationCap, 
  Heart, 
  Calculator, 
  ArrowRight, 
  ArrowLeft, 
  Info, 
  ChevronDown, 
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  LineChart,
  Calendar,
  TrendingUp,
  BookOpen,
  University,
  CheckCircle2,
  Target,
  PartyPopper,
  Sparkles,
  Search,
  School,
  Gem,
  ArrowUpRight,
  Download,
  Trash2,
  X,
  Plus,
  Save
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { cn, formatINR, formatIndianShort } from '../../lib/utils';
import { ThemeContext } from '../../contexts/ThemeContext';
import { exportToExcel } from '../../lib/exportUtils';
import AIChat from '../AIChat';
import WhatiffInsights from '../WhatiffInsights';
import InsightFeedback from '../InsightFeedback';
import SaveScenarioButton from '../SaveScenarioButton';

// --- BASE DATA ---
const SCHOOL_FEES = {
  government: 2000,
  private: 40000,
  cbsePrivate: 120000,
  international: 600000,
};

const HIGHER_ED_FEES = {
  govtCollege: 100000,
  privateIndian: 400000,
  iitEngineering: 250000,
  iimMBA: 1350000,
  studyAbroad: 3500000,
};

const HIGHER_ED_DURATION = {
  govtCollege: 4,
  privateIndian: 4,
  iitEngineering: 4,
  iimMBA: 2,
  studyAbroad: 4,
};

const HIGHER_ED_START_AGE = {
  govtCollege: 18,
  privateIndian: 18,
  iitEngineering: 18,
  iimMBA: 23,
  studyAbroad: 18,
};

const CITY_MULTIPLIER = {
  metro: 1.4,
  tier1: 1.1,
  tier2: 0.85,
  tier3: 0.65,
};

const BASE_MONTHLY_COSTS = {
  nutrition: { modest: 3000, comfortable: 6000, premium: 12000 },
  lifestyle: { modest: 2000, comfortable: 4000, premium: 8000 },
};

// --- UTILS ---
const safeNum = (val: any, fallback = 0): number => {
  const num = Number(val);
  return isNaN(num) || !isFinite(num) ? fallback : num;
};

const formatINRFull = (amount: number) => {
  return "₹" + Math.round(amount).toLocaleString('en-IN');
};

const formatCrores = (amount: number) => {
  const cr = amount / 10000000;
  // If significantly less than 0.01 Cr (1 Lakh), maybe show short format instead? 
  // But user said "in crores", so 2 decimal places is standard.
  return "₹" + cr.toFixed(2) + " Cr";
};

interface SavedChildPlan {
  id: number;
  label: string;
  savedAt: string;
  childAge: number;
  schoolType: string;
  higherEdType: string;
  educationInflation: number;
  generalInflation: number;
  sipReturn: number;
  sipA: number;
  sipB: number;
  sipC: number;
  weddingAge: number;
  weddingCostToday: number;
  weddingCostFuture: number;
  totalSchoolFees: number;
  totalCollegeFees: number;
  totalFromIncome: number;
  totalLiving: number;
  combinedSIPAge0to4: number;
  combinedSIPAge4to21: number;
  combinedSIPAge21plus: number;
}

const LOCAL_STORAGE_KEY = 'whatiff_child_plans';

// ==================== LOCAL UI COMPONENTS ====================

const HybridSlider = ({ label, value, min, max, step, onChange, formatDisplay, accentColor = "amber" }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  const accentHex = accentColor === "emerald" ? "#10b981" : accentColor === "purple" ? "#8b5cf6" : "#f59e0b";
  const focusRing = accentColor === "purple" ? "rgba(139,92,246,0.4)" : "rgba(245,158,11,0.4)";

  useEffect(() => {
    setTempValue(value.toString());
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCommit = () => {
    setIsEditing(false);
    let val = parseFloat(tempValue.replace(/[^0-9.]/g, ''));
    if (isNaN(val)) val = value;
    val = Math.min(max, Math.max(min, val));
    onChange(val);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center group/label">
        <label className="text-zinc-400 text-[12px] font-bold uppercase tracking-widest">{label}</label>
        
        <div className="relative min-w-[80px] flex justify-end">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              onBlur={handleCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommit();
                if (e.key === 'Escape') {
                  setTempValue(value.toString());
                  setIsEditing(false);
                }
              }}
              className={cn(
                "bg-zinc-900 border border-amber-500/40 rounded px-2 py-0.5 text-white text-[14px] font-bold w-full text-right outline-none transition-all",
                accentColor === "purple" && "border-purple-500/40"
              )}
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-white text-[15px] font-black tracking-tight hover:text-amber-500 transition-colors text-right cursor-text"
            >
              {formatDisplay(value)}
            </button>
          )}
        </div>
      </div>

      <div className="relative pt-1">
        <input 
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className={cn(
            "w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer",
            accentColor === "purple" ? "accent-purple-500" : "accent-amber-500"
          )}
          style={{ accentColor: accentHex }}
        />
        <div className="flex justify-between mt-2 px-0.5">
          <span className="text-[10px] text-zinc-700 font-bold uppercase tracking-tight">{formatDisplay(min)}</span>
          <span className="text-[10px] text-zinc-700 font-bold uppercase tracking-tight">{formatDisplay(max)}</span>
        </div>
      </div>

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: ${accentHex};
          cursor: pointer;
          box-shadow: 0 0 12px ${accentColor === 'purple' ? 'rgba(139,92,246,0.4)' : 'rgba(245,158,11,0.4)'};
          border: 3px solid #09090b;
          transition: transform 0.15s ease;
        }
        input[type=range]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type=range]:active::-webkit-slider-thumb {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
};

const PillGroup = ({ options, value, onChange, label, subLabel }: any) => (
  <div className="space-y-4">
    {label && (
      <div className="flex flex-col gap-1">
        <label className="text-zinc-400 text-[12px] font-bold uppercase tracking-widest">{label}</label>
        {subLabel && <span className="text-zinc-500 text-[11px] font-medium leading-tight">{subLabel}</span>}
      </div>
    )}
    <div className="flex flex-wrap gap-2">
      {options.map((opt: any) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-4 py-2.5 rounded-full text-[13px] font-semibold transition-all min-h-[40px] border flex items-center justify-center",
              isActive 
                ? "bg-amber-500/10 border-amber-500/40 text-amber-500" 
                : "bg-white/5 border-white/8 text-zinc-400 hover:border-white/15"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  </div>
);

// --- MAIN COMPONENT ---
export default function ChildFuturePlanner({ onBack, onNavigate, onAskAI }: any) {
  const theme = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0); // 1 for next, -1 for back
  const [showAssumptions, setShowAssumptions] = useState(false);

  // Inputs
  const [childAge, setChildAge] = useState(0);
  const [schoolType, setSchoolType] = useState<keyof typeof SCHOOL_FEES>('cbsePrivate');
  const [higherEdType, setHigherEdType] = useState<keyof typeof HIGHER_ED_FEES>('privateIndian');
  const [cityTier, setCityTier] = useState<keyof typeof CITY_MULTIPLIER>('metro');
  const [lifestyle, setLifestyle] = useState<keyof typeof BASE_MONTHLY_COSTS.nutrition>('comfortable');
  
  const [educationInflation, setEducationInflation] = useState(10);
  const [generalInflation, setGeneralInflation] = useState(6);
  const [sipReturn, setSipReturn] = useState(12);

  // Step 2
  const [sipA, setSipA] = useState(5000);

  // Step 4
  const [planWedding, setPlanWedding] = useState(true);
  const [weddingCostToday, setWeddingCostToday] = useState(2500000);
  const [weddingAge, setWeddingAge] = useState(27);

  // Shimmer state for Step 3
  const [isCalculating, setIsCalculating] = useState(false);

  // UI state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [openCalculationAge, setOpenCalculationAge] = useState<number | null>(null);
  const [isTotalBreakdownOpen, setIsTotalBreakdownOpen] = useState(false);
  const [showFeeCoverageInfo, setShowFeeCoverageInfo] = useState(false);
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false);

  // Calculations
  const monthlyReturn = Math.pow(1 + sipReturn / 100, 1 / 12) - 1;

  const isSchoolAge = childAge >= 4;

  const schoolModel = useMemo(() => {
    const effectiveSipA = isSchoolAge ? 0 : sipA;
    const schoolFeesByYear: Record<number, number> = {};
    for (let age = Math.max(4, childAge); age <= 17; age++) {
      const yearsFromNow = age - childAge;
      schoolFeesByYear[age] = SCHOOL_FEES[schoolType] * Math.pow(1 + educationInflation / 100, yearsFromNow);
    }
    const totalSchoolFees = Object.values(schoolFeesByYear).reduce((a, b) => a + b, 0);

    let corpusAtAge4 = 0;
    if (childAge < 4) {
      const monthsToAge4 = (4 - childAge) * 12;
      for (let m = 0; m < monthsToAge4; m++) {
        corpusAtAge4 = corpusAtAge4 * (1 + monthlyReturn) + effectiveSipA;
      }
    }

    let remainingCorpus = corpusAtAge4;
    let totalFromCorpus = 0;
    let totalFromIncome = 0;
    const schoolYearTable = [];

    for (let age = Math.max(4, childAge); age <= 17; age++) {
      const opening = remainingCorpus;
      for (let m = 0; m < 12; m++) {
        remainingCorpus = remainingCorpus * (1 + monthlyReturn);
      }
      const growth = remainingCorpus - opening;
      const fee = schoolFeesByYear[age] || 0;
      let paidFromCorpus = 0;
      let paidFromIncome = 0;

      if (remainingCorpus >= fee) {
        remainingCorpus -= fee;
        paidFromCorpus = fee;
      } else {
        paidFromCorpus = remainingCorpus;
        paidFromIncome = fee - remainingCorpus;
        remainingCorpus = 0;
      }

      totalFromCorpus += paidFromCorpus;
      totalFromIncome += paidFromIncome;

      schoolYearTable.push({ 
        age, 
        opening, 
        growth, 
        fee, 
        paidFromCorpus, 
        paidFromIncome, 
        closing: remainingCorpus 
      });
    }

    return {
      effectiveSipA,
      totalSchoolFees,
      corpusAtAge4,
      totalFromCorpus,
      totalFromIncome,
      schoolYearTable,
      sipBurdenReduction: totalSchoolFees > 0 ? (totalFromCorpus / totalSchoolFees) * 100 : 0,
      avgMonthlyFromIncome: (17 - Math.max(4, childAge) + 1) > 0 ? (totalFromIncome / ((17 - Math.max(4, childAge) + 1) * 12)) : 0
    };
  }, [childAge, schoolType, educationInflation, sipA, monthlyReturn, isSchoolAge]);

  const collegeModel = useMemo(() => {
    const startAge = HIGHER_ED_START_AGE[higherEdType];
    const duration = HIGHER_ED_DURATION[higherEdType];
    const endAge = startAge + duration - 1;

    const collegeFeesByYear: Record<number, number> = {};
    for (let age = startAge; age <= endAge; age++) {
      const yearsFromNow = age - childAge;
      collegeFeesByYear[age] = HIGHER_ED_FEES[higherEdType] * Math.pow(1 + educationInflation / 100, yearsFromNow);
    }
    const totalCollegeFees = Object.values(collegeFeesByYear).reduce((a, b) => a + b, 0);

    const simulate = (sip: number) => {
      let corpus = 0;
      for (let age = childAge; age <= endAge; age++) {
        for (let m = 0; m < 12; m++) corpus = (corpus + sip) * (1 + monthlyReturn);
        corpus -= collegeFeesByYear[age] || 0;
      }
      return corpus;
    };

    let low = 0, high = 1000000, sipB = 0;
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      if (simulate(mid) >= 0) { sipB = mid; high = mid; } else { low = mid; }
    }
    sipB = Math.ceil(sipB / 500) * 500;

    let corpusAt18 = 0;
    for (let age = childAge; age < startAge; age++) {
      for (let m = 0; m < 12; m++) corpusAt18 = (corpusAt18 + sipB) * (1 + monthlyReturn);
    }

    const collegeYearTable = [];
    let corpus = corpusAt18;
    let totalHarvestingGrowth = 0;
    for (let age = startAge; age <= endAge; age++) {
      const opening = corpus;
      let yearlySIP = 0;
      let yearlyGrowth = 0;
      for (let m = 0; m < 12; m++) {
        const growth = (corpus + sipB) * monthlyReturn;
        corpus = (corpus + sipB + growth);
        yearlyGrowth += growth;
        yearlySIP += sipB;
      }
      const fee = collegeFeesByYear[age] || 0;
      corpus -= fee;
      totalHarvestingGrowth += yearlyGrowth;
      collegeYearTable.push({ age, opening, sipBYear: yearlySIP, growth: yearlyGrowth, fee, closing: corpus });
    }

    return { 
      sipB, 
      totalCollegeFees, 
      corpusAt18, 
      collegeYearTable, 
      totalHarvestingGrowth,
      startAge,
      endAge,
      durationMonths: duration * 12
    };
  }, [childAge, higherEdType, educationInflation, monthlyReturn, sipReturn]);

  const weddingModel = useMemo(() => {
    if (!planWedding) return { sipC: 0, costFuture: 0, totalInvested: 0, growthEarned: 0, years: 0, months: 0 };
    const years = weddingAge - childAge;
    const costFuture = weddingCostToday * Math.pow(1 + generalInflation / 100, years);
    const months = years * 12;
    const sipC_raw = months > 0 ? (costFuture / (((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn) * (1 + monthlyReturn))) : 0;
    const sipC = Math.ceil(sipC_raw / 500) * 500;
    const totalInvested = sipC * months;
    const growthEarned = costFuture - totalInvested;
    return { sipC, costFuture, totalInvested, growthEarned, years, months };
  }, [childAge, planWedding, weddingAge, weddingCostToday, generalInflation, monthlyReturn]);

  const activeTotalsForCurrentChild = useMemo(() => {
    const baseLiving = (BASE_MONTHLY_COSTS.nutrition[lifestyle] + BASE_MONTHLY_COSTS.lifestyle[lifestyle]) * CITY_MULTIPLIER[cityTier];
    let lifestyleTotal = 0;
    for (let age = childAge; age <= Math.max(21, weddingAge); age++) {
      lifestyleTotal += baseLiving * 12 * Math.pow(1 + generalInflation / 100, age - childAge);
    }
    return {
        school: schoolModel.totalSchoolFees,
        college: collegeModel.totalCollegeFees,
        wedding: weddingModel.costFuture,
        lifestyle: lifestyleTotal,
        sip0to4: schoolModel.effectiveSipA + collegeModel.sipB + weddingModel.sipC,
        totalGoal: schoolModel.totalSchoolFees + collegeModel.totalCollegeFees + weddingModel.costFuture + lifestyleTotal
    };
  }, [childAge, schoolModel, collegeModel, weddingModel, lifestyle, cityTier, generalInflation, weddingAge]);

  const familySummary = { 
    ...activeTotalsForCurrentChild,
    sipA: schoolModel.effectiveSipA,
    sipB: collegeModel.sipB,
    sipC: weddingModel.sipC,
    childCount: 1
  };

  const donutData = useMemo(() => {
    return [
      { name: 'School', value: activeTotalsForCurrentChild.school, color: '#f59e0b' },
      { name: 'College', value: activeTotalsForCurrentChild.college, color: '#10b981' },
      { name: 'Wedding', value: activeTotalsForCurrentChild.wedding, color: '#8b5cf6' },
      { name: 'Lifestyle', value: activeTotalsForCurrentChild.lifestyle, color: '#71717a' },
    ];
  }, [activeTotalsForCurrentChild]);

  const handleExport = () => {
    exportToExcel(
      "Child Future Plan",
      `Plan for child current age ${childAge} across School, College and Wedding.`,
      { childAge, schoolType, higherEdType, cityTier, lifestyle, educationInflation, generalInflation, sipReturn, sipA, planWedding, weddingCostToday, weddingAge },
      "Total Goal Corpus",
      activeTotalsForCurrentChild.totalGoal,
      [
        { label: 'School Goal', value: activeTotalsForCurrentChild.school },
        { label: 'College Goal', value: activeTotalsForCurrentChild.college },
        { label: 'Wedding Goal', value: activeTotalsForCurrentChild.wedding },
        { label: 'Lifestyle Goal', value: activeTotalsForCurrentChild.lifestyle },
        { label: 'SIP A (School)', value: schoolModel.effectiveSipA },
        { label: 'SIP B (College)', value: collegeModel.sipB },
        { label: 'SIP C (Wedding)', value: weddingModel.sipC }
      ],
      "Multi-phase financial roadmap for life milestones."
    );
  };

  const handleNext = () => {
    if (step < 5) {
      if (step === 2) {
        setIsCalculating(true);
        setTimeout(() => setIsCalculating(false), 300);
      }
      setDirection(1);
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep(s => s - 1);
    } else {
      onBack?.();
    }
  };


  const STEPS_DATA = [
    { label: "Child Details" },
    { label: "School" },
    { label: "College" },
    { label: "Wedding" },
    { label: "Results" }
  ];

  // AI Logic stays exactly as is
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const sessionId = useMemo(() => Math.random().toString(36).substring(2, 9), []);
  const MAX_QUESTIONS = 10;

  const handleSendMessage = async (content: string) => {
    if (questionCount >= MAX_QUESTIONS) return;
    const userMsg = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);
    setQuestionCount(prev => prev + 1);
    setHasSentFirstMessage(true);

    const context = {
        age: childAge,
        schoolType,
        higherEdType,
        totalFees: schoolModel.totalSchoolFees + collegeModel.totalCollegeFees,
        sipA: schoolModel.effectiveSipA,
        sipB: collegeModel.sipB,
        sipC: weddingModel.sipC,
        familyMonthlySIP: familySummary.sip0to4,
        familyTotalGoal: familySummary.totalGoal,
        childrenCount: familySummary.childCount
    };

    const systemPrompt = `You are a financial explainer, not a financial advisor.

Do NOT give advice.
Do NOT recommend actions.
Do NOT suggest what the user should do.

Only explain the numbers provided.

When asked which SIP to prioritise — do not recommend. Instead explain the time-sensitivity of each: SIP A cannot be recovered after age 4. SIP B and C can start later but the required monthly amount increases significantly with each year of delay. Show the numbers from the calculation. Do not advise.

If asked for advice:
'I can help explain the numbers, but I cannot provide financial advice.'

Keep responses simple, short, and clear.

Context:
${JSON.stringify(context)}`;

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, context, sessionId, systemPrompt }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error." }]);
    } finally { setIsChatLoading(false); }
  };

  const aiChips = useMemo(() => {
    // Phase-specific suggested questions for the AI assistant
    if (hasSentFirstMessage) return [];
    
    if (step === 2) return [
      "Why does the corpus peak at age 8 and then decline?",
      "What happens if I increase my SIP from ₹5,000 to ₹10,000?",
      "At what SIP amount would the corpus cover 50% of school fees?",
      "Why is my school fee at age 17 more than 5x the fee today?"
    ];
    if (step === 3) return [
      "Why does SIP B continue during college years instead of stopping at 18?",
      "How is the college fee at age 18 so much higher than today's fee?",
      "What does corpus at age 18 mean and why is it less than total college fees?",
      "How many months of SIP B does it take to fund just year 1 of college?"
    ];
    if (step === 4) return [
      "Why is general inflation used for wedding instead of education inflation?",
      "How does the wedding corpus reach exactly the right amount at age 27?",
      "What happens to the corpus if the wedding happens 3 years earlier than planned?",
      "Why does wedding SIP run from birth instead of starting later?"
    ];
    if (step === 5) return [
      "Why is age 0 to 4 the most expensive phase financially?",
      "What does total invested vs total funded tell me?",
      "If I can only start one SIP today which one has the biggest consequence if delayed?",
      "How does compounding explain the gap between what I invest and what gets funded?"
    ];
    return [
      "Tell me more about education inflation", 
      "How are these milestone fees calculated?", 
      "Why do city/lifestyle matter for the base living costs?"
    ];
  }, [step, hasSentFirstMessage]);

  const insights = useMemo(() => [
    `School fees are primarily an income commitment, your SIP A offsets **${schoolModel.sipBurdenReduction.toFixed(0)}%** of the burden.`,
    `College and wedding are fully pre-funded via SIP B and C, ensuring zero impact on your future monthly cashflow.`,
    `Your peak investment period is Age **${childAge} to 4**, where the combined monthly SIP is **${formatINR(schoolModel.effectiveSipA + collegeModel.sipB + weddingModel.sipC)}**.`,
  ], [schoolModel, collegeModel, weddingModel, childAge]);


  const resultsView = (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="space-y-10 w-full">
        <button 
          onClick={() => setStep(1)}
          className="text-zinc-500 text-[12px] font-medium hover:text-white transition-colors flex items-center gap-2 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Edit Inputs
        </button>

        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl border-2 bg-amber-500/10 border-amber-500/20 overflow-hidden"
        >
          <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-amber-500" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none mb-1">Total Target Milestones</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-2 items-baseline">
                  <div className="space-y-0.5">
                    <p className="text-4xl font-black text-amber-500 tracking-tight leading-none">
                      {formatCrores(familySummary.school + familySummary.college + (planWedding ? familySummary.wedding : 0))}
                    </p>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">Across All Goals</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-[10px] text-zinc-500 font-bold whitespace-nowrap">
                    Planned for {childAge === 0 ? "Newborn" : `${childAge} Year Old`} Child
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest leading-none mb-1.5">Total Monthly SIP</p>
              <p className="text-4xl font-black text-white leading-none tracking-tighter">
                {formatINRFull(familySummary.sip0to4)}<span className="text-sm font-bold text-zinc-600 ml-1">/mo</span>
              </p>
            </div>
          </div>
        </motion.div>

          {/* TIMELINE STRATEGY */}
          <section className="bg-white/[0.03] border border-white/[0.07] rounded-[16px] p-6 md:p-8 space-y-8">
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Timeline Strategy</h2>
            
            <div className="space-y-6 pt-4">
              {/* SIP A - 0 to 4 */}
              {childAge < 4 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <span>SIP A (School)</span>
                    <span>Age {childAge} - 4</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
                    <div 
                      className="absolute left-0 top-0 h-full bg-amber-500 opacity-80 rounded-full"
                      style={{ width: `${((4 - childAge) / (weddingAge - childAge)) * 100}%` }}
                    />
                  </div>
                  <p className="text-amber-500 text-[12px] font-bold">{formatINRFull(schoolModel.effectiveSipA)}/mo</p>
                </div>
              )}

              {/* SIP B - 0 to 21 */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <span>SIP B (College)</span>
                  <span>Age {childAge} - 21</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
                  <div 
                    className="absolute left-0 top-0 h-full bg-emerald-500 opacity-80 rounded-full"
                    style={{ width: `${((21 - childAge) / (weddingAge - childAge)) * 100}%` }}
                  />
                </div>
                <p className="text-emerald-500 text-[12px] font-bold">{formatINRFull(collegeModel.sipB)}/mo</p>
              </div>

              {/* SIP C - 0 to Wedding Age (up to 27/50) */}
              {planWedding && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <span>SIP C (Wedding)</span>
                    <span>Age {childAge} - {weddingAge}</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
                    <div 
                      className="absolute left-0 top-0 h-full bg-purple-500 opacity-80 rounded-full"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <p className="text-purple-500 text-[12px] font-bold">{formatINRFull(weddingModel.sipC)}/mo</p>
                </div>
              )}
            </div>
          </section>

          {/* SIP CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 space-y-6 border-t-4 border-t-amber-500 shadow-xl shadow-amber-500/5 transition-all hover:scale-[1.01]">
              <div className="flex justify-between items-center">
                <span className="text-amber-500 text-[10px] font-bold uppercase tracking-wider">Milestone A</span>
                <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded uppercase tracking-wider">Early Years (School Fund)</span>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col">
                  <h3 className="text-white text-sm font-bold">Aggregate Monthly SIP A</h3>
                  <p className="text-[28px] font-black text-amber-500 tracking-tight leading-none mt-1">{formatINRFull(familySummary.sipA)}/mo</p>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 text-[12px]">Cumulative School Fees</span>
                    <span className="text-white font-bold text-[12px]">{formatCrores(familySummary.school)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/5 mt-4">
                  <p className="text-[11px] text-zinc-400 leading-relaxed uppercase tracking-tight font-medium">
                    Reduces monthly income burden during school years.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 space-y-6 border-t-4 border-t-emerald-500 shadow-xl shadow-emerald-500/5 transition-all hover:scale-[1.01]">
              <div className="flex justify-between items-center">
                <span className="text-emerald-500 text-[10px] font-bold uppercase tracking-wider">Milestone B</span>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded uppercase tracking-wider">Core Education (College Fund)</span>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col">
                  <h3 className="text-white text-sm font-bold">Aggregate Monthly SIP B</h3>
                  <p className="text-[28px] font-black text-emerald-500 tracking-tight leading-none mt-1">{formatINRFull(familySummary.sipB)}/mo</p>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 text-[12px]">Cumulative College Fees</span>
                    <span className="text-white font-bold text-[12px]">{formatCrores(familySummary.college)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/5 mt-4">
                  <p className="text-[11px] text-zinc-400 leading-relaxed uppercase tracking-tight font-medium">
                    Guarantees debt-free higher education.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 space-y-6 border-t-4 border-t-purple-500 shadow-xl shadow-purple-500/5 transition-all hover:scale-[1.01]">
              <div className="flex justify-between items-center">
                <span className="text-purple-500 text-[10px] font-bold uppercase tracking-wider">Milestone C</span>
                <span className="px-2 py-1 bg-purple-500/10 text-purple-500 text-[10px] font-bold rounded uppercase tracking-wider">Life Events (Wedding Fund)</span>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col">
                  <h3 className="text-white text-sm font-bold">Aggregate Monthly SIP C</h3>
                  <p className="text-[28px] font-black text-purple-500 tracking-tight leading-none mt-1">{formatINRFull(familySummary.sipC)}/mo</p>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 text-[12px]">Cumulative Future Cost</span>
                    <span className="text-white font-bold text-[12px]">{formatCrores(familySummary.wedding)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/5 mt-4">
                  <p className="text-[11px] text-zinc-400 leading-relaxed uppercase tracking-tight font-medium">
                    Future-proofs the largest life celebration.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* COMBINED TOTAL & STATS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-amber-500/[0.04] border border-amber-500/15 rounded-[16px] p-6 space-y-6">
              <h2 className="text-amber-500 text-[10px] font-bold uppercase tracking-widest">Combined Monthly Outflow</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-baseline py-2 border-b border-white/[0.06]">
                  <span className="text-zinc-400 text-sm">Phase 1: Age {childAge}-4</span>
                  <span className="text-white text-lg font-bold">{formatINRFull(schoolModel.effectiveSipA + collegeModel.sipB + weddingModel.sipC)}/mo</span>
                </div>
                <div className="flex justify-between items-baseline py-2 border-b border-white/[0.06] relative">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-sm">Phase 2: Age 4-18 (Incl. School Fees)</span>
                    <button 
                      onClick={() => setShowFeeCoverageInfo(!showFeeCoverageInfo)}
                      className="p-1 hover:bg-white/5 rounded-full text-zinc-600 hover:text-amber-500 transition-colors"
                      title="View Phase 2 monthly breakdown"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-white text-lg font-bold">~{formatINRFull(collegeModel.sipB + weddingModel.sipC + schoolModel.avgMonthlyFromIncome)}/mo</span>
                </div>

                <AnimatePresence>
                  {showFeeCoverageInfo && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 p-5 bg-amber-500/[0.03] border border-amber-500/10 rounded-[16px] space-y-3">
                        <p className="text-zinc-400 text-[11px] font-bold uppercase tracking-widest text-white/70">Phase 2 Outflow Breakdown</p>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-[12px]">
                            <span className="text-zinc-500">Education Prep (SIP B)</span>
                            <span className="text-white font-bold">{formatINRFull(collegeModel.sipB)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[12px]">
                            <span className="text-zinc-500">Wedding Prep (SIP C)</span>
                            <span className="text-white font-bold">{formatINRFull(weddingModel.sipC)}</span>
                          </div>
                          <div className="flex justify-between items-center text-[12px]">
                            <span className="text-zinc-500">School Monthly Component</span>
                            <span className="text-white font-bold">{formatINRFull(schoolModel.avgMonthlyFromIncome)}</span>
                          </div>
                          <div className="pt-2 border-t border-white/5 flex justify-between items-center font-black">
                            <span className="text-amber-500 text-[11px] uppercase tracking-wider">Total Monthly Figure</span>
                            <span className="text-white text-sm">{formatINRFull(collegeModel.sipB + weddingModel.sipC + schoolModel.avgMonthlyFromIncome)}</span>
                          </div>
                        </div>
                        <p className="text-zinc-500 text-[10px] italic leading-relaxed pt-2 border-t border-white/5">
                          The school component is the average monthly cost paid directly from your income during school years (Age 4-17), after the SIP A corpus provides its annual subsidy.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex justify-between items-baseline py-2">
                  <span className="text-zinc-400 text-sm">Phase 3: Age {collegeModel.startAge}-{collegeModel.endAge} (SIP Only)</span>
                  <span className="text-white text-lg font-bold">{formatINRFull(collegeModel.sipB + weddingModel.sipC)}/mo</span>
                </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/[0.03] rounded-[12px] p-5 border border-white/[0.05] space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Schooling Fund</p>
                </div>
                <div>
                  <p className="text-white text-xl font-black">{formatCrores(schoolModel.totalSchoolFees)}</p>
                  <p className="text-zinc-500 text-[10px] mt-1 leading-relaxed">Proj. total for Age 4-17</p>
                </div>
              </div>
              <div className="bg-white/[0.03] rounded-[12px] p-5 border border-white/[0.05] space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Higher Ed Goal</p>
                </div>
                <div>
                  <p className="text-white text-xl font-black">{formatCrores(collegeModel.totalCollegeFees)}</p>
                  <p className="text-zinc-500 text-[10px] mt-1 leading-relaxed">Target at Age {collegeModel.startAge}</p>
                </div>
              </div>
              <div className="bg-white/[0.03] rounded-[12px] p-5 border border-white/[0.05] space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Wedding Fund</p>
                </div>
                <div>
                  <p className="text-white text-xl font-black">{formatCrores(weddingModel.costFuture)}</p>
                  <p className="text-zinc-500 text-[10px] mt-1 leading-relaxed">Proj. cost at Age {weddingAge}</p>
                </div>
              </div>
            </div>
            </div>

            {/* DONUT CHART */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-[16px] p-6 flex flex-col items-center justify-center">
              <h2 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-6 self-start">Expense Allocation</h2>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => [formatCrores(value), "Amount"]}
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* INSIGHTS */}
          <WhatiffInsights 
            calculatorType="child-future-planner"
            results={{ schoolModel, collegeModel, weddingModel }}
            insights={insights}
            onAskAI={(ctx, chips) => {
              setIsChatOpen(true);
              if (chips && chips.length > 0) handleSendMessage(chips[0]);
            }}
          />

          {/* Assumptions and Data Sources Section */}
          <div className="w-full max-w-2xl mx-auto -mt-4 mb-8">
            <button 
              onClick={() => setShowAssumptions(!showAssumptions)}
              className="w-full flex items-center justify-between p-5 bg-white/[0.02] border border-white/[0.07] rounded-xl hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-amber-500" />
                <span className="text-zinc-100 font-bold text-sm tracking-tight">Assumptions & Data Sources</span>
              </div>
              <ChevronDown className={cn("w-5 h-5 text-zinc-500 transition-transform", showAssumptions ? "rotate-180" : "")} />
            </button>

            <AnimatePresence>
              {showAssumptions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 bg-white/[0.01] border-x border-b border-white/[0.07] rounded-b-xl space-y-10">
                    
                    {/* School Fee Defaults */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h4 className="text-white text-sm font-black uppercase tracking-widest">1. School Fee Defaults (Annual)</h4>
                        <p className="text-zinc-500 text-[11px]">Primary baseline (Age 4) excluding uniforms/bus.</p>
                      </div>
                      <div className="overflow-hidden border border-white/[0.05] rounded-lg">
                        <table className="w-full text-left text-[12px]">
                          <thead className="bg-white/5 text-zinc-400 font-bold">
                            <tr>
                              <th className="px-4 py-2 border-b border-white/[0.05]">Type</th>
                              <th className="px-4 py-2 border-b border-white/[0.05]">Avg Annual Fee</th>
                            </tr>
                          </thead>
                          <tbody className="text-zinc-300">
                            {[
                               { label: 'Govt / Kendriya Vidyalaya', value: '₹12,000' },
                               { label: 'State Private (Aided)', value: '₹45,000' },
                               { label: 'CBSE Private', value: '₹1,50,000' },
                               { label: 'International (IB/IGCSE)', value: '₹6,50,000' }
                            ].map((row, i) => (
                              <tr key={i} className="border-b border-white/[0.03]">
                                <td className="px-4 py-2 font-medium">{row.label}</td>
                                <td className="px-4 py-2 font-bold text-white">{row.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-zinc-600 text-[10px] italic">Source: Unified District Information System for Education (UDISE Plus) 2023–24 & city-wise private fee aggregators.</p>
                    </div>

                    {/* Higher Ed Defaults */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h4 className="text-white text-sm font-black uppercase tracking-widest">2. Higher Education Defaults</h4>
                        <p className="text-zinc-500 text-[11px]">Tuition + standard library/exam fees.</p>
                      </div>
                      <div className="overflow-hidden border border-white/[0.05] rounded-lg">
                        <table className="w-full text-left text-[12px]">
                          <thead className="bg-white/5 text-zinc-400 font-bold">
                            <tr>
                              <th className="px-4 py-2 border-b border-white/[0.05]">Category</th>
                              <th className="px-4 py-2 border-b border-white/[0.05]">Annual Cost</th>
                              <th className="px-4 py-2 border-b border-white/[0.05]">Duration</th>
                            </tr>
                          </thead>
                          <tbody className="text-zinc-300">
                            {[
                               { label: 'Govt College', value: '₹1.0L', dur: '4 yrs' },
                               { label: 'Private (Engineering/Med)', value: '₹4.0L', dur: '4 yrs' },
                               { label: 'IIT BTech', value: '₹2.5L', dur: '4 yrs' },
                               { label: 'IIM MBA', value: '₹13.5L', dur: '2 yrs' },
                               { label: 'Study Abroad (USA/UK)', value: '₹35.0L', dur: '4 yrs' }
                            ].map((row, i) => (
                              <tr key={i} className="border-b border-white/[0.03]">
                                <td className="px-4 py-2 font-medium">{row.label}</td>
                                <td className="px-4 py-2 font-bold text-white">{row.value}</td>
                                <td className="px-4 py-2 text-zinc-500">{row.dur}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-zinc-600 text-[10px] italic">Source: AICTE Fee Committee guidelines 2024, IIM-A, IIT-B official fee schedule & collegeboard.org for abroad trends.</p>
                    </div>

                    {/* Inflation & Living Costs */}
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-white text-sm font-black uppercase tracking-widest">3. Inflation & Living Costs</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                              <p className="text-[11px] text-zinc-500 font-bold uppercase mb-1">Education Inflation</p>
                              <p className="text-white text-lg font-bold">{educationInflation}% p.a.</p>
                              <p className="text-zinc-500 text-[10px] leading-relaxed">Modelled at 2x retail inflation due to recurring capitation, staff costs and facility upgrades.</p>
                           </div>
                           <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                              <p className="text-[11px] text-zinc-500 font-bold uppercase mb-1">General Inflation</p>
                              <p className="text-white text-lg font-bold">{generalInflation}% p.a.</p>
                              <p className="text-zinc-500 text-[10px] leading-relaxed">Aligned with RBI target range (4% +/- 2%) for broad lifestyle costs (nutrition, apparel).</p>
                           </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-white text-[11px] font-black uppercase tracking-widest text-zinc-400">City Tier Cost Multipliers</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                           {[
                             {t: 'Metro', m: '1.4x'}, 
                             {t: 'Tier 1', m: '1.1x'}, 
                             {t: 'Tier 2', m: '0.85x'}, 
                             {t: 'Tier 3', m: '0.65x'}
                           ].map(tier => (
                             <div key={tier.t} className="text-center p-3 rounded bg-zinc-900 border border-white/5">
                               <p className="text-[10px] text-zinc-500 font-bold">{tier.t}</p>
                               <p className="text-white font-black text-sm">{tier.m}</p>
                             </div>
                           ))}
                        </div>
                        <p className="text-zinc-600 text-[10px] italic">Source: Mercer Cost of Living Survey India 2023 & internal cost-of-raising datasets.</p>
                      </div>
                    </div>

                    {/* Methodology */}
                    <div className="space-y-4">
                      <h4 className="text-white text-sm font-black uppercase tracking-widest">4. SIP Methodology</h4>
                      <ul className="space-y-2">
                        {[
                          { h: 'Compounding:', b: `Calculated monthly at assumed returns (Current: ${sipReturn}%).` },
                          { h: 'Harvesting Logic:', b: 'Assumes your corpus remains invested during the 4-year fee payment period, earning returns on the remaining balance.' },
                          { h: 'Zero Burden Policy:', b: 'The model calculates a target corpus that, combined with its ongoing growth during utilization, exactly offsets all future fees.' }
                        ].map((item, i) => (
                           <li key={i} className="flex gap-3">
                             <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                             <p className="text-zinc-400 text-[12px] leading-relaxed">
                               <span className="text-white font-bold">{item.h}</span> {item.b}
                             </p>
                           </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                      <p className="text-zinc-500 text-[10px] leading-relaxed italic">
                        <span className="font-bold text-amber-500">Disclaimer:</span> These are directional estimates based on 2024–25 fee schedules. Actual fees depend on specific institutions. Mutual Fund investments are subject to market risks. Past performance is not indicative of future returns.
                      </p>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-zinc-400 text-xs text-center mt-12 leading-relaxed max-w-2xl mx-auto opacity-70">
            Disclaimer: These projections are based on historical index data and assume balanced portfolio growth. Actual school and college fees may vary significantly by institution and city. Consult a financial advisor for personalized planning.
          </p>
        </div>

        </div>
      );

  return (
    <div className="space-y-8">
      <Helmet>
        <title>{step === 5 ? 'Child Future Plan Summary | WhatIff' : `Child Future Planner | Step ${step} of 5`}</title>
      </Helmet>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className={cn("text-2xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-zinc-900")}>
            <Baby className="w-6 h-6 text-amber-500" />
            {step === 5 ? "Success Plan Summary" : "Child Future Planner"}
          </h1>
          <p className="text-zinc-300 text-sm">
            {step === 5 ? "Roadmap to fully funding your child's life goals." : "Strategic multi-phase planning for life milestones."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {step === 5 && (
            <button 
              onClick={handleExport}
              className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-2 font-bold text-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Export Report</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-8 w-full">
        {/* Progress Bar */}
        <div className="w-full bg-white/5 h-[2px] relative">
            <motion.div 
              className="absolute left-0 top-0 h-full bg-amber-500"
              initial={{ width: "0%" }}
              animate={{ width: `${(step / 5) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <p className="text-white text-[12px] font-bold uppercase tracking-[0.15em]">Step {step} of 5</p>

          {/* Step Indicator Nodes */}
          <div className="flex justify-between px-4 max-w-4xl">
            {STEPS_DATA.map((s, idx) => {
              const num = idx + 1;
              const isCompleted = step > num;
              const isCurrent = step === num;
              
              return (
                <div key={idx} className="flex flex-col items-center gap-3 relative flex-1 first:items-start last:items-end">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 z-10 text-sm font-bold",
                    isCompleted ? "bg-amber-500 text-white" : "",
                    isCurrent ? "border-2 border-amber-500 bg-white text-amber-500" : "",
                    !isCompleted && !isCurrent ? "bg-white/[0.06] border border-white/10 text-zinc-500" : ""
                  )}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5 text-white" /> : num}
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider hidden md:block",
                    isCurrent || isCompleted ? "text-amber-500" : "text-zinc-500"
                  )}>
                    {s.label}
                  </span>
                  
                  {/* Connector Line */}
                  {num < 5 && (
                    <div className={cn(
                      "absolute top-5 left-[50%] w-full h-[1px] -z-0",
                      isCompleted ? "bg-amber-500" : "bg-white/5"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {step === 5 ? resultsView : (
          <div className="overflow-hidden relative w-full">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={{
                enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (direction: number) => ({ x: direction > 0 ? '-100%' : '100%', opacity: 0 })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full"
            >
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-[16px] p-5 md:p-8 lg:p-10">
                {/* STEP CONTENT CONTENT */}
                
                {step === 1 && (
                  <div className="space-y-10">
                    <div className="space-y-1.5">
                      <h2 className="text-[24px] md:text-[32px] font-extrabold text-white tracking-tighter">Child Details</h2>
                      <p className="text-zinc-100 text-lg font-medium">Start with the basics to build a foundation.</p>
                    </div>

                    <div className="space-y-10">
                      <PillGroup 
                        label="Child's current age"
                        value={childAge}
                        onChange={setChildAge}
                        options={[
                          { label: "Age: 0", value: 0 },
                          { label: "1 Year", value: 1 },
                          { label: "2 Years", value: 2 },
                          { label: "3 Years", value: 3 },
                          { label: "4+ Years", value: 4 }
                        ]}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <PillGroup 
                          label="City Tier"
                          value={cityTier}
                          onChange={setCityTier}
                          options={[
                            { label: "Metro", value: "metro" },
                            { label: "Tier 1", value: "tier1" },
                            { label: "Tier 2", value: "tier2" }
                          ]}
                        />
                         <PillGroup 
                          label="Child Lifestyle"
                          value={lifestyle}
                          onChange={setLifestyle}
                          options={[
                            { label: "Comfortable", value: "comfortable" },
                            { label: "Premium", value: "premium" },
                            { label: "Modest", value: "modest" }
                          ]}
                        />
                      </div>

                      <div className="bg-white/[0.02] border-l-2 border-amber-500/20 rounded-md p-4">
                      <p className="text-zinc-400 text-xs italic leading-relaxed">
                        Lifestyle and city tier adjust base living costs but do not affect school or college fee estimates.
                      </p>
                      </div>



                      <div className="border-t border-white/5 pt-10">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <HybridSlider label="Edu Inflation" value={educationInflation} min={5} max={15} step={1} onChange={setEducationInflation} formatDisplay={v => `${v}%`} />
                            <HybridSlider label="Gen Inflation" value={generalInflation} min={2} max={10} step={1} onChange={setGeneralInflation} formatDisplay={v => `${v}%`} />
                            <HybridSlider label="Expected SIP return" value={sipReturn} min={8} max={18} step={0.5} onChange={setSipReturn} formatDisplay={v => `${v}%`} />
                         </div>
                      </div>

                      <div className="flex justify-end pt-8">
                        <button onClick={handleNext} className="bg-amber-600 hover:bg-amber-700 text-zinc-950 px-10 py-3 rounded-xl font-black text-[14px] flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all uppercase tracking-widest">
                          Next Step <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-10">
                     <div className="flex flex-wrap gap-2 mb-4">
                        <button onClick={() => setStep(1)} className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight uppercase">Age: {childAge}, {schoolType === 'cbsePrivate' ? 'CBSE Private' : 'Private'}</button>
                     </div>
                    
                    <div className="space-y-1.5">
                      <h2 className="text-[24px] md:text-[32px] font-extrabold text-white tracking-tighter">School Fees</h2>
                      <p className="text-zinc-100 text-lg font-medium">Plan for the 14-year schooling journey starting age 4 (including pre-school).</p>
                    </div>

                    <div className="space-y-10">
                      <div className="bg-white/5 p-8 rounded-2xl border border-white/10">
                        <PillGroup 
                            label="School Type"
                            subLabel="(Choose based on your preferred schooling standard)"
                            value={schoolType}
                            onChange={setSchoolType}
                            options={[
                              { label: "CBSE Private", value: "cbsePrivate" },
                              { label: "Private (State)", value: "private" },
                              { label: "International", value: "international" },
                              { label: "Government", value: "government" }
                            ]}
                          />
                      </div>

                      {!isSchoolAge && (
                        <div className="pt-2">
                           <HybridSlider label="SIP A — For School Support" value={sipA} min={1000} max={50000} step={500} onChange={setSipA} formatDisplay={v => formatINR(v)} />
                        </div>
                      )}

                      {/* Result Card */}
                      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[16px] overflow-hidden">
                         <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-0">
                            <div className="p-4 space-y-6 md:border-r border-white/[0.06]">
                               <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em]">Fee Projection</p>
                               <div className="space-y-4 pr-0 md:pr-8">
                                  <div className="flex justify-between items-start py-2 border-b border-white/[0.04]">
                                     <div className="flex flex-col">
                                        <span className="text-zinc-400 text-[13px] font-medium tracking-tight">Total School Fees</span>
                                        <span className="text-[10px] text-zinc-500 italic mt-0.5">(from years 4 to 17)</span>
                                     </div>
                                     <span className="text-white text-[15px] font-bold">{formatINRFull(schoolModel.totalSchoolFees)}</span>
                                  </div>
                                  <div className="flex justify-between items-baseline py-2 border-b border-white/[0.04]">
                                     <span className="text-zinc-400 text-[13px] font-medium tracking-tight">Corpus at Age 4</span>
                                     <span className="text-white text-[15px] font-bold">{formatINRFull(schoolModel.corpusAtAge4)}</span>
                                  </div>
                                  <div className="flex justify-between items-start py-2 border-b border-white/[0.04]">
                                     <div className="flex flex-col">
                                        <span className="text-zinc-400 text-[13px] font-medium tracking-tight">From Corpus</span>
                                        <span className="text-[10px] text-zinc-500 italic mt-0.5 leading-tight">
                                          (Built from your SIP A - {formatINR(schoolModel.effectiveSipA)}/month × {Math.max(0, 4 - childAge)} years, growing at {sipReturn}% while paying fees)
                                        </span>
                                     </div>
                                     <span className="text-white text-[15px] font-bold">{formatINRFull(schoolModel.totalFromCorpus)}</span>
                                  </div>
                                  <div className="flex justify-between items-start py-2">
                                     <div className="flex flex-col">
                                        <span className="text-zinc-400 text-[13px] font-medium tracking-tight">From Income</span>
                                        <span className="text-[10px] text-zinc-500 italic mt-0.5">(from years 4 to 17)</span>
                                     </div>
                                     <span className="text-white text-[15px] font-bold">{formatINRFull(schoolModel.totalFromIncome)}</span>
                                  </div>
                               </div>
                            </div>
                            <div className="p-8 flex flex-col items-center justify-center text-center border-t md:border-t-0 border-white/[0.06] space-y-8">
                               <div className="space-y-1">
                                  <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">SIP A — School Support Fund</p>
                                  <p className="text-amber-500 text-[32px] font-black tracking-tight">{formatINRFull(schoolModel.effectiveSipA)}</p>
                                  <p className="text-zinc-400 text-[13px] font-medium tracking-tight">Invest age {childAge}–4</p>
                               </div>

                               <div className="space-y-1">
                                  <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">average monthly salary commitment</p>
                                  <p className="text-[#f59e0b] text-[32px] font-black tracking-tight">{formatINRFull(Math.round(schoolModel.totalFromIncome / (14 * 12)))}</p>
                                  <p className="text-zinc-400 text-[13px] font-medium tracking-tight">Age 4–17 burden</p>
                               </div>
                               <div className="bg-amber-500/[0.04] border border-amber-500/15 rounded-[12px] p-4 text-left w-full">
                                  <p className="text-[#a1a1aa] text-[12px] leading-relaxed">
                                     {isSchoolAge 
                                       ? <span>Your child is {childAge}. Since school starts at 4, fees are <span className="text-amber-500 font-bold">paid directly from your monthly cashflow</span>.</span>
                                       : <span>A SIP of {formatINR(sipA)} reduces your total out-of-pocket school fee burden by <span className="text-amber-500 font-bold">{schoolModel.sipBurdenReduction.toFixed(0)}%</span>.</span>}
                                  </p>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Table */}
                      <div className="border border-white/[0.07] rounded-[12px] overflow-hidden">
                         <div className="bg-white/[0.04] p-3 px-4 flex justify-between">
                            <span className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em]">Year-by-Year Breakdown</span>
                         </div>
                         <div className="overflow-x-auto">
                            <table className="w-full text-left">
                               <thead className="border-b border-white/[0.04]">
                                  <tr className="bg-zinc-900/50">
                                     <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">AGE</th>
                                     <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">FEE</th>
                                     <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">FROM CORPUS</th>
                                     <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">FROM INCOME</th>
                                     <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">CLOSING CORPUS</th>
                                  </tr>
                               </thead>
                               <tbody>
                                  {schoolModel.schoolYearTable.map((row, idx) => (
                                    <tr key={idx} className={cn(
                                       "border-b border-white/[0.04] last:border-0 transition-colors",
                                       idx % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800"
                                    )}>
                                       <td className={cn("px-6 py-4 text-sm font-semibold text-center", row.age === 17 ? "text-white" : "text-zinc-400")}>{row.age === 17 ? 'Age 17 (Final)' : `Age ${row.age}`}</td>
                                       <td className="px-6 py-4 text-sm font-bold text-white text-center">{formatINRFull(row.fee)}</td>
                                       <td className={cn("px-6 py-4 text-sm font-bold text-center", row.paidFromCorpus > 0 ? "text-[#10b981]" : "text-zinc-500")}>{formatINRFull(row.paidFromCorpus)}</td>
                                       <td className={cn("px-6 py-4 text-sm font-bold text-center", row.paidFromIncome > 0 ? "text-[#f59e0b]" : "text-zinc-500")}>{formatINRFull(row.paidFromIncome)}</td>
                                       <td className={cn("px-6 py-4 text-sm font-bold text-center", row.closing > 0 ? "text-[#10b981]" : "text-zinc-500")}>{formatINRFull(row.closing)}</td>
                                    </tr>
                                  ))}
                               </tbody>
                            </table>
                         </div>
                      </div>

                      {/* Collapsible */}
                      <div className="border-t border-white/[0.06] mt-4">
                        <button 
                          onClick={() => setOpenCalculationAge(openCalculationAge === 2 ? null : 2)}
                          className="w-full flex justify-between items-center py-4 text-zinc-400 text-[13px] font-bold uppercase tracking-widest"
                        >
                          How is this calculated?
                          <ChevronDown className={cn("w-4 h-4 transition-transform", openCalculationAge === 2 ? "rotate-180" : "")} />
                        </button>
                        <AnimatePresence>
                          {openCalculationAge === 2 && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden pb-4"
                            >
                              <div className="mt-4 p-5 bg-black/40 border border-white/5 rounded-xl space-y-6">
                                <div className="space-y-4">
                                  <h4 className="text-white text-[13px] font-bold border-b border-white/10 pb-2 uppercase tracking-widest">How we calculated the totals</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Total Schooling Budget</p>
                                      <p className="text-white text-xl font-black">{formatINRFull(schoolModel.totalSchoolFees)}</p>
                                      <p className="text-zinc-500 text-[11px] leading-relaxed">Arrived by summing year-wise fees from age 4 to 17, with <span className="text-amber-500 font-bold">{educationInflation}%</span> annual hike.</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Net Support Strategy</p>
                                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                                        <span className="text-zinc-400 text-[12px]">Paid from your SIP A Corpus</span>
                                        <span className="text-[#10b981] font-bold">{formatINRFull(schoolModel.totalFromCorpus)}</span>
                                      </div>
                                      <div className="flex justify-between items-center py-1">
                                        <span className="text-zinc-400 text-[12px]">Paid from Monthly Income (Age 4–17)</span>
                                        <span className="text-[#f59e0b] font-bold">{formatINRFull(schoolModel.totalFromIncome)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="p-5 bg-white/5 rounded-xl space-y-2">
                                    <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest">average monthly salary commitment</p>
                                    <p className="text-white text-2xl font-bold">{formatINR(Math.round(schoolModel.totalFromIncome / (14 * 12)))}/month</p>
                                    <div className="flex flex-col space-y-1">
                                      <p className="text-zinc-400 text-sm">How we got this:</p>
                                      <p className="text-zinc-400 text-sm">
                                        {formatINRFull(schoolModel.totalFromIncome)} (total from income) ÷ 168 months (14 years × 12) = {formatINR(Math.round(schoolModel.totalFromIncome / (14 * 12)))}/month
                                      </p>
                                      <p className="text-zinc-400 text-sm italic mt-1">This is your average monthly salary commitment for school fees.</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="bg-white/[0.03] p-3 rounded-lg">
                                  <p className="text-[#a1a1aa] text-[12px] leading-[1.6]">
                                    Calculation Flow: Initial SIP A runs from age {childAge} to 4. At age 4, the accumulated corpus is used to pay as much of the annual fee as possible. Any shortfall is covered by your monthly salary.
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="flex justify-between items-center pt-8">
                        <button onClick={handleBack} className="text-zinc-500 hover:text-white px-4 py-3 font-bold text-[14px] flex items-center gap-2 transition-colors uppercase tracking-widest">
                          <ChevronLeft className="w-5 h-5" /> Back
                        </button>
                        <button onClick={handleNext} className="bg-amber-600 hover:bg-amber-700 text-zinc-950 px-10 py-3 rounded-xl font-black text-[14px] flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all uppercase tracking-widest">
                          Next — Higher Education <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-10">
                     <div className="flex flex-wrap gap-2 mb-4">
                        <button onClick={() => setStep(1)} className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight uppercase">Age: {childAge}, {higherEdType === 'studyAbroad' ? 'Study Abroad' : 'Domestic'}</button>
                        <button onClick={() => setStep(2)} className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight">SIP A {formatINR(sipA)}/mo</button>
                     </div>

                    <div className="space-y-1.5">
                      <h2 className="text-[24px] md:text-[32px] font-extrabold text-white tracking-tighter">Higher Education</h2>
                      <p className="text-zinc-100 text-lg font-medium">Ensure college costs are fully pre-funded without salary burden.</p>
                    </div>

                    <div className="space-y-10">
                         {isCalculating ? (
                           <div className="h-[200px] w-full bg-white/[0.02] animate-pulse rounded-[16px]" />
                         ) : (
                           <div className="space-y-10 animate-in fade-in duration-500">
                              <div className="bg-white/5 p-8 rounded-2xl border border-white/10">
                                <PillGroup 
                                    label="Higher Education Goal"
                                    subLabel="(Where do you see your child studying after school?)"
                                    value={higherEdType}
                                    onChange={setHigherEdType}
                                    options={[
                                      { label: "Govt College", value: "govtCollege" },
                                      { label: "Private Indian", value: "privateIndian" },
                                      { label: "IIT / Engineering", value: "iitEngineering" },
                                      { label: "IIM / MBA", value: "iimMBA" },
                                      { label: "Study Abroad", value: "studyAbroad" }
                                    ]}
                                  />
                                  {higherEdType === 'iimMBA' && (
                                    <p className="mt-4 text-zinc-500 text-[11px] leading-relaxed">
                                      IIM MBA is typically pursued after 2–3 years of work experience. Fees modelled at age 23–24. Source: IIM Ahmedabad ₹27.5L, IIM Bangalore ₹26.3L, IIM Calcutta ₹27L for 2-year program (2024).
                                    </p>
                                  )}
                              </div>

                              <div className="bg-white/[0.03] border border-white/[0.07] rounded-[16px] overflow-hidden">
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-0">
                                   <div className="p-4 space-y-6 md:border-r border-white/[0.06]">
                                      <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em]">Growth Plan</p>
                                      <div className="space-y-4 pr-0 md:pr-8">
                                         <div className="flex flex-col py-2 border-b border-white/[0.04]">
                                            <div className="flex justify-between items-baseline">
                                              <span className="text-zinc-400 text-[13px] font-medium tracking-tight">Total College Fees</span>
                                              <span className="text-white text-[15px] font-bold">{formatINRFull(collegeModel.totalCollegeFees)}</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-500 italic mt-0.5">(From birth untill higher education is completed by 21 years)</span>
                                         </div>
                                         <div className="flex justify-between items-baseline py-2 border-b border-white/[0.04]">
                                            <span className="text-zinc-400 text-[13px] font-medium tracking-tight">Corpus at Age {collegeModel.startAge}</span>
                                            <span className="text-white text-[15px] font-bold">{formatINRFull(collegeModel.corpusAt18)}</span>
                                         </div>
                                         <div className="flex flex-col py-2 border-b border-white/[0.04]">
                                            <div className="flex justify-between items-baseline">
                                              <span className="text-zinc-400 text-[13px] font-medium tracking-tight leading-snug">
                                                From Corpus <span className="text-[10px] text-zinc-500 block">Your fund continues to grow at {sipReturn}% even while you withdraw for fees.</span>
                                              </span>
                                              <span className="text-blue-500 text-[15px] font-bold">+{formatINRFull(collegeModel.totalHarvestingGrowth)}</span>
                                            </div>
                                         </div>
                                         <div className="flex justify-between items-baseline py-2">
                                            <span className="text-zinc-400 text-[13px] font-medium tracking-tight">From Monthly Salary</span>
                                            <span className="text-white text-[15px] font-bold">₹0</span>
                                         </div>
                                      </div>
                                   </div>
                                   <div className="p-8 flex flex-col items-center justify-center text-center border-t md:border-t-0 border-white/[0.06] space-y-8">
                                      <div className="space-y-1">
                                         <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">SIP B — College Fund</p>
                                         <p className="text-[#10b981] text-[32px] font-black tracking-tight">{formatINRFull(collegeModel.sipB)}</p>
                                         <p className="text-zinc-400 text-[13px] font-medium">Invest age {childAge}–{collegeModel.endAge}</p>
                                      </div>

                                      <div className="space-y-1">
                                         <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Avg return your fund earns while paying fees per month</p>
                                         <p className="text-blue-500 text-[32px] font-black tracking-tight">+{formatINRFull(Math.round(collegeModel.totalHarvestingGrowth / collegeModel.durationMonths))}</p>
                                      </div>


                                   </div>
                                </div>
                                


                             </div>

                             {/* Table */}
                            <div className="space-y-4">
                              <div className="border border-white/[0.07] rounded-[12px] overflow-hidden">
                                 <div className="bg-white/[0.04] p-3 px-4 flex justify-between">
                                    <span className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em]">Fund Utilization (Age {collegeModel.startAge}–{collegeModel.endAge})</span>
                                 </div>
                                 <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[sm]">
                                       <thead className="border-b border-white/[0.04]">
                                          <tr className="bg-zinc-900/50">
                                             <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">AGE</th>
                                             <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">OPENING</th>
                                             <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">SIP ADDED</th>
                                             <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">GROWTH</th>
                                             <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">FEES PAID</th>
                                             <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">CLOSING</th>
                                          </tr>
                                       </thead>
                                       <tbody>
                                          {collegeModel.collegeYearTable.map((row, idx) => (
                                            <tr key={idx} className={cn(
                                         "border-b border-white/[0.04] last:border-0 transition-colors",
                                         idx % 2 === 0 ? "bg-zinc-900" : "bg-zinc-800"
                                       )}>
                                               <td className="px-6 py-4 text-sm font-bold text-white text-center whitespace-nowrap">Age {row.age}</td>
                                               <td className="px-6 py-4 text-sm font-medium text-zinc-400 text-center">{formatINR(row.opening)}</td>
                                               <td className="px-6 py-4 text-sm font-bold text-emerald-500 text-center">+{formatINR(row.sipBYear)}</td>
                                               <td className="px-6 py-4 text-sm font-bold text-blue-500 text-center">+{formatINR(row.growth)}</td>
                                               <td className="px-6 py-4 text-sm font-bold text-red-500 text-center">-{formatINR(row.fee)}</td>
                                               <td className="px-6 py-4 text-sm font-bold text-emerald-400 text-center">{formatINR(row.closing)}</td>
                                            </tr>
                                          ))}
                                       </tbody>
                                    </table>
                                 </div>
                              </div>
                              <p className="text-[10px] text-zinc-500 font-medium tracking-tight italic text-right px-1">
                                SIP Added = Your annual contribution. Growth = Returns on corpus. Fees Paid = College cost that year.
                              </p>
                            </div>

                            {/* Collapsible */}
                            <div className="border-t border-white/[0.06] mt-4">
                              <button 
                                onClick={() => setOpenCalculationAge(openCalculationAge === 3 ? null : 3)}
                                className="w-full flex justify-between items-center py-4 text-zinc-400 text-[13px] font-bold uppercase tracking-widest"
                              >
                                How is this calculated?
                                <ChevronDown className={cn("w-4 h-4 transition-transform", openCalculationAge === 3 ? "rotate-180" : "")} />
                              </button>
                              <AnimatePresence>
                                {openCalculationAge === 3 && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden pb-4"
                                  >
                                    <div className="mt-4 p-5 bg-black/40 border border-white/5 rounded-xl space-y-6">
                                      <div className="space-y-4">
                                        <h4 className="text-white text-[13px] font-bold border-b border-white/10 pb-2 uppercase tracking-widest">Growth calculation breakdown</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          <div className="space-y-1">
                                            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Estimated College Fees (Total)</p>
                                            <p className="text-white text-xl font-black">{formatINRFull(collegeModel.totalCollegeFees)}</p>
                                            <p className="text-zinc-500 text-[11px] leading-relaxed">
                                              Based on current cost of <span className="text-emerald-500 font-bold">{formatINR(HIGHER_ED_FEES[higherEdType])}</span>, inflated by <span className="text-emerald-500 font-bold">{educationInflation}%</span> annually for {18 - childAge} years.
                                            </p>
                                          </div>
                                          <div className="space-y-1">
                                            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Target Corpus Plan</p>
                                            <div className="flex justify-between items-center py-1 border-b border-white/5">
                                              <span className="text-zinc-400 text-[12px]">Accumulated by Age 18</span>
                                              <span className="text-[#10b981] font-bold">{formatINRFull(collegeModel.corpusAt18)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 border-b border-white/5">
                                              <span className="text-zinc-400 text-[12px]">Harvesting Growth (Returns)</span>
                                              <span className="text-blue-500 font-bold">+{formatINRFull(collegeModel.totalHarvestingGrowth)}</span>
                                            </div>
                                            <p className="text-zinc-500 text-[11px] leading-relaxed mt-2">
                                              Your fund continues to grow at <span className="text-blue-500 font-bold">{sipReturn}%</span> even while you withdraw for fees. This "bonus" return covers the final gap without extra SIP.
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="bg-white/5 rounded-xl p-5 space-y-2">
                                        <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest">Avg return calculation per month</p>
                                        <p className="text-white text-2xl font-bold">+{formatINR(Math.round(collegeModel.totalHarvestingGrowth / collegeModel.durationMonths))}/month</p>
                                        <div className="flex flex-col space-y-1">
                                          <p className="text-zinc-400 text-sm">How we got this:</p>
                                          <p className="text-zinc-400 text-sm leading-relaxed">
                                            {formatINRFull(collegeModel.totalHarvestingGrowth)} (total growth Age {collegeModel.startAge}–{collegeModel.endAge}) ÷ {collegeModel.durationMonths} months = {formatINR(Math.round(collegeModel.totalHarvestingGrowth / collegeModel.durationMonths))}/month
                                          </p>
                                          <p className="text-zinc-400 text-sm italic mt-1 leading-relaxed">
                                            This is the "invisible" return your fund earns while paying fees, which covers the final gap and ensures <span className="text-blue-500 font-bold">Zero Salary Burden</span>.
                                          </p>
                                        </div>
                                      </div>
                                      <div className="bg-white/[0.03] p-3 rounded-lg">
                                        <p className="text-[#a1a1aa] text-[12px] leading-[1.6]">
                                          Calculation Flow: SIP B starts at age {childAge} and runs until age 21. The fund grows at {sipReturn}% p.a. From age 18 to 21, the corpus (plus ongoing SIP investments) is harvested to pay 100% of the inflated fees, ensuring no burden on your monthly income during those years.
                                        </p>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                           </div>
                        </div>
                     )}

                        <div className="flex justify-between items-center pt-8">
                          <button onClick={handleBack} className="text-zinc-500 hover:text-white px-4 py-3 font-bold text-[14px] flex items-center gap-2 transition-colors uppercase tracking-widest">
                            <ChevronLeft className="w-5 h-5" /> Back
                          </button>
                          <button onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3 rounded-xl font-black text-[14px] flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all uppercase tracking-widest">
                            Next — Wedding <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-10">
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button onClick={() => setStep(1)} className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight">Age: {childAge}</button>
                        <button onClick={() => setStep(2)} className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight">SIP A {formatINR(sipA)}</button>
                        <button onClick={() => setStep(3)} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight">SIP B {formatINR(collegeModel.sipB)}</button>
                     </div>

                    <div className="space-y-1.5 flex justify-between items-center">
                      <div>
                        <h2 className="text-[24px] md:text-[32px] font-extrabold text-white tracking-tighter">The Final Milestone</h2>
                        <p className="text-zinc-100 text-lg font-medium">Plan for one of life's most beautiful celebrations.</p>
                      </div>
                      
                      {/* Wedding Toggle Pill Switch */}
                      <button 
                         onClick={() => setPlanWedding(!planWedding)}
                         className={cn(
                           "w-[60px] h-[32px] rounded-full relative transition-all duration-300",
                           planWedding ? "bg-purple-500" : "bg-zinc-800"
                         )}
                      >
                         <div className={cn(
                            "absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300",
                            planWedding ? "left-[30px]" : "left-1"
                         )} />
                      </button>
                    </div>

                    <div className={cn("space-y-10 transition-all duration-300", !planWedding ? "opacity-30 pointer-events-none" : "opacity-100")}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                  <HybridSlider label="Wedding Cost Today" value={weddingCostToday} min={500000} max={500000000} step={500000} onChange={setWeddingCostToday} formatDisplay={v => formatINR(v)} accentColor="purple" />
                                  <HybridSlider label="Marriage Age Goal" value={weddingAge} min={21} max={50} step={1} onChange={setWeddingAge} formatDisplay={v => `${v} Years`} accentColor="purple" />
                        </div>

                        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[16px] overflow-hidden">
                           <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-0">
                              <div className="p-4 space-y-6 md:border-r border-white/[0.06]">
                                 <p className="text-zinc-500 text-xs uppercase font-bold tracking-[0.2em]">Growth Plan</p>
                                 <div className="space-y-4 pr-0 md:pr-8">
                                    <div className="flex justify-between items-baseline py-2 border-b border-white/[0.04]">
                                       <span className="text-zinc-400 text-[13px] font-medium tracking-tight">Marriage Age Goal</span>
                                       <span className="text-white text-[15px] font-bold">{weddingAge} Years</span>
                                    </div>
                                    <div className="flex justify-between items-baseline py-2">
                                       <span className="text-zinc-400 text-[13px] font-medium tracking-tight">Future Cost</span>
                                       <span className="text-purple-500 text-[15px] font-bold">{formatINRFull(weddingModel.costFuture)}</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="p-8 flex flex-col items-center justify-center text-center space-y-2">
                                 <p className="text-zinc-500 text-xs uppercase font-bold tracking-[0.2em] mb-2">SIP C — Wedding Target Fund</p>
                                 <p className="text-purple-500 text-5xl font-black tracking-tight">{formatINRFull(weddingModel.sipC)}</p>
                              </div>
                           </div>
                           
                           {/* Collapsible Calculation */}
                           <div className="border-t border-white/[0.06] mt-0">
                              <button 
                                onClick={() => setOpenCalculationAge(openCalculationAge === 4 ? null : 4)}
                                className="w-full flex justify-between items-center py-4 px-6 text-zinc-400 text-[13px] font-bold uppercase tracking-widest hover:text-white transition-colors"
                              >
                                How is this calculated?
                                <ChevronDown className={cn("w-4 h-4 transition-transform", openCalculationAge === 4 ? "rotate-180" : "")} />
                              </button>
                              <AnimatePresence>
                                {openCalculationAge === 4 && (
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden bg-purple-500/[0.02] border-t border-white/[0.04]"
                                  >
                                    <div className="p-8 space-y-6">
                                       <p className="text-zinc-500 text-[10px] uppercase font-black tracking-[0.2em] text-center">Wedding Fund Summary</p>
                                       <div className="max-w-[400px] mx-auto space-y-6">
                                          <div className="space-y-3 pb-6 border-b border-white/5">
                                             <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-400">Wedding cost today</span>
                                                <span className="text-white font-bold">{formatINRFull(weddingCostToday)}</span>
                                             </div>
                                             <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-400">Inflation applied</span>
                                                <span className="text-amber-500 font-bold">{generalInflation}% per year</span>
                                             </div>
                                          </div>
                                          
                                          <div className="space-y-3">
                                             <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-400">Future cost at Age {weddingAge}</span>
                                                <span className="text-purple-400 font-black">{formatINRFull(weddingModel.costFuture)}</span>
                                             </div>
                                             <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-400">SIP C required</span>
                                                <span className="text-white font-bold">{formatINR(weddingModel.sipC)}/month</span>
                                             </div>
                                             <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-400">Total invested</span>
                                                <span className="text-white font-bold">
                                                   {formatINRFull(weddingModel.totalInvested)} 
                                                   <span className="text-zinc-500 text-[11px] ml-1.5 font-medium">({formatINR(weddingModel.sipC)} × {weddingModel.months} months)</span>
                                                </span>
                                             </div>
                                             <div className="flex justify-between items-center text-sm">
                                                <span className="text-zinc-400">Growth earned</span>
                                                <span className="text-blue-500 font-bold">+{formatINRFull(weddingModel.growthEarned)}</span>
                                             </div>
                                          </div>
                                       </div>
                                       
                                       <div className="pt-4 flex items-center justify-center gap-2 text-emerald-500 font-bold text-[14px]">
                                          <CheckCircle2 className="w-4 h-4" /> Wedding fully funded without post-marriage burden
                                       </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                           </div>
                        </div>
                    </div>

                    {/* Navigation inside card */}
                    <div className="flex justify-between items-center pt-8">
                      <button onClick={handleBack} className="text-zinc-500 hover:text-white px-4 py-3 font-bold text-[14px] flex items-center gap-2 transition-colors uppercase tracking-widest">
                        <ChevronLeft className="w-5 h-5" /> Back
                      </button>
                      <button onClick={handleNext} className="bg-amber-600 hover:bg-amber-700 text-zinc-950 px-10 py-3 rounded-xl font-black text-[15px] shadow-[0_0_24px_rgba(245,158,11,0.25)] hover:scale-[1.01] transition-all flex items-center justify-center gap-3 uppercase tracking-widest">
                         See Full Roadmap <ArrowUpRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
      <AIChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        messages={messages}
        input={chatInput}
        setInput={setChatInput}
        onSend={handleSendMessage}
        isLoading={isChatLoading}
        chips={aiChips}
        questionCount={questionCount}
        maxQuestions={MAX_QUESTIONS}
      />
    </div>
  );
}
