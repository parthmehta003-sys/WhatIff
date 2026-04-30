import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Target, Info, Share2, Download, Instagram, MessageCircle, Linkedin, Baby, ArrowRight, ArrowUpRight, ChevronDown } from 'lucide-react';
import { GLOBAL_AI_INSTRUCTION } from '../../aiInsightPrompt';
import { INFLATION_RATE } from '../../lib/calculators';
import { formatCurrency, cn, formatCompactNumber, formatIndianRupees, formatIndianShort, formatCurrencyForAI } from '../../lib/utils';
import SaveScenarioButton from '../SaveScenarioButton';
import ShareVision from '../ShareVision';
import InvestmentBrokerSection from '../InvestmentBrokerSection';
import InfoBox, { RiskLevel } from '../InfoBox';
import { exportToExcel } from '../../lib/exportUtils';
import SliderWithInput from '../SliderWithInput';
import WhatiffInsights from '../WhatiffInsights';
import AIChat from '../AIChat';
import InsightFeedback from '../InsightFeedback';
import { ThemeContext } from '../../contexts/ThemeContext';

interface GoalPlannerProps {
  onBack: () => void;
  onNavigate: (screen: any) => void;
  initialData?: {
    targetAmount?: number;
  };
  onAskAI?: (context?: any) => void;
}

const safeNum = (val: any, fallback = 0): number => {
  const num = Number(val);
  return isNaN(num) || !isFinite(num) ? fallback : num;
};

const formatInsightValue = (val: number, type: 'currency' | 'percent' | 'years' | 'months' = 'currency') => {
  const safe = safeNum(val);
  if (type === 'currency') {
    if (safe >= 10000000) return `₹${(safe / 10000000).toFixed(2)}Cr`;
    if (safe >= 100000) return `₹${(safe / 100000).toFixed(2)}L`;
    return `₹${Math.round(safe).toLocaleString('en-IN')}`;
  }
  if (type === 'percent') return `${safe.toFixed(2)}%`;
  if (type === 'years') return `${safe.toFixed(1)} years`;
  if (type === 'months') return `${Math.round(safe)} months`;
  return safe.toString();
};

export default function GoalPlanner({ onBack, onNavigate, initialData, onAskAI }: GoalPlannerProps) {
  const theme = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState(initialData?.targetAmount || 5000000);
  const [years, setYears] = useState(10);
  const [monthlySIP, setMonthlySIP] = useState(15000);
  const [inflationRate, setInflationRate] = useState(0);
  const [accountForLTCG, setAccountForLTCG] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCalculationExplainer, setShowCalculationExplainer] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // AI Chat State (Isolated per calculator)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const MAX_QUESTIONS = 10;
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));

  useEffect(() => {
    setMessages([]);
    setChatInput('');
    setIsChatLoading(false);
    setHasUserInteracted(false);
    setQuestionCount(0);
  }, []);

  const handleAskAI = (context?: any, chips?: string[], systemPrompt?: string) => {
    setChatContext({ ...context, chips, systemPrompt });
    setIsChatOpen(true);
  };

  const handleSendMessage = async (content: string) => {
    if (questionCount >= MAX_QUESTIONS) return;

    const userMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);
    setHasUserInteracted(true);
    setQuestionCount(prev => prev + 1);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          sessionId,
          systemPrompt: `${GLOBAL_AI_INSTRUCTION}\n\nContext for this Goal calculation:\n${chatContext?.systemPrompt || aiChatData.systemPrompt}`,
          context: { targetAmount, years, monthlySIP }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to get AI response');
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I'm sorry, I encountered an error: ${error.message}. Please try again.` 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const { 
    inflationAdjustedTarget, 
    grossCorpusNeeded, 
    monthlySIPNeeded, 
    actualCorpusGross: _, // Unused in this scope but keeping structure
    adjustedInvested,
    adjustedGains,
    isOverInvesting,
    isUnderInvesting,
    // Add new reality check values
    goalInTodaysMoney,
    postTaxOnStatedGoal,
    realValuePostTax,
    trueTargetGross,
    trueSIPNeeded,
    trueLTCGTax,
    sipGap,
    sipReturn,
    inflationAdjustedGoal
  } = useMemo(() => {
    const sipReturn = 12; // Static base for SIP needed calculation
    const r = sipReturn / 100 / 12; // Monthly return rate (12% base for "Needed" calculation)
    const n = years * 12;
    const ltcgRate = 0.125;
    const ltcgExemption = 125000;

    // 1. What the stated goal is actually worth today (purchasing power)
    const goalInTodaysMoney = targetAmount / Math.pow(1 + inflationRate / 100, years);

    // 2. Post-tax take-home if user hits their stated goal exactly
    // Principal matches user's affordable SIP baseline
    const investedForStatedGoal = monthlySIP * n; 
    const gainsOnStatedGoal = targetAmount - investedForStatedGoal;
    const taxOnStatedGoal = accountForLTCG
      ? Math.max(0, gainsOnStatedGoal - ltcgExemption) * ltcgRate
      : 0;
    const postTaxOnStatedGoal = targetAmount - taxOnStatedGoal;
    const realValuePostTax = postTaxOnStatedGoal / Math.pow(1 + inflationRate / 100, years);

    // 3. What the user SHOULD target to get ₹[targetAmount] in today's money, post-tax
    const inflationAdjustedGoal = targetAmount * Math.pow(1 + inflationRate / 100, years);

    // Gross up for LTCG: find corpus where post-tax = inflationAdjustedGoal
    const findGrossCorpus = (postTaxNeeded: number) => {
      let lo = postTaxNeeded, hi = postTaxNeeded * 4;
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        const sip_temp = mid / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
        const inv = sip_temp * n;
        const g = mid - inv;
        const t = accountForLTCG ? Math.max(0, g - ltcgExemption) * ltcgRate : 0;
        if (mid - t > postTaxNeeded) hi = mid;
        else lo = mid;
      }
      return (lo + hi) / 2;
    };

    const trueTargetGross = accountForLTCG || inflationRate > 0
      ? findGrossCorpus(inflationAdjustedGoal)
      : targetAmount;

    const trueSIPNeeded = trueTargetGross / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    const trueLTCGTax = accountForLTCG
      ? Math.max(0, (trueTargetGross - trueSIPNeeded * n) - ltcgExemption) * ltcgRate
      : 0;

    const sipGap = trueSIPNeeded - monthlySIP; 

    return {
      inflationAdjustedTarget: inflationAdjustedGoal,
      grossCorpusNeeded: targetAmount,
      monthlySIPNeeded: trueSIPNeeded,
      actualCorpusGross: 0,
      adjustedInvested: trueSIPNeeded * n,
      adjustedGains: trueTargetGross - (trueSIPNeeded * n),
      isOverInvesting: monthlySIP > trueSIPNeeded,
      isUnderInvesting: monthlySIP < trueSIPNeeded,
      goalInTodaysMoney,
      postTaxOnStatedGoal,
      realValuePostTax,
      trueTargetGross,
      trueSIPNeeded,
      trueLTCGTax,
      sipGap,
      sipReturn,
      inflationAdjustedGoal
    };
  }, [targetAmount, years, inflationRate, accountForLTCG, monthlySIP]);

  const requiredReturn = useMemo(() => {
    let low = 0;
    let high = 5; // Up to 500% annual return
    const n = years * 12;
    // We target trueTargetGross so the chart line reaches the adjusted goal
    const target = trueTargetGross;

    for (let i = 0; i < 100; i++) {
      const r = (low + high) / 2;
      const monthlyRate = r / 12;
      let fv = 0;
      if (monthlyRate === 0) {
        fv = monthlySIP * n;
      } else {
        fv = monthlySIP * ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate) * (1 + monthlyRate);
      }

      if (fv < target) {
        low = r;
      } else {
        high = r;
      }
    }
    return Math.round(low * 1000) / 10;
  }, [trueTargetGross, years, monthlySIP]);

  const {
    currentActualCorpusGross,
    currentActualGains,
    currentActualLTCGTax,
    currentActualCorpusPostTax,
    currentActualCorpusRealValue
  } = useMemo(() => {
    const r = requiredReturn / 100 / 12;
    const n = years * 12;
    const ltcgRate = 0.125;
    const ltcgExemption = 125000;

    const actualCorpusGross = monthlySIP * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    const actualInvestedValue = monthlySIP * n;
    const actualGainsValue = actualCorpusGross - actualInvestedValue;
    const actualTax = accountForLTCG
      ? Math.max(0, actualGainsValue - ltcgExemption) * ltcgRate
      : 0;
    const actualPostTax = actualCorpusGross - actualTax;
    const actualRealValue = actualPostTax / Math.pow(1 + inflationRate / 100, years);

    return {
      currentActualCorpusGross: actualCorpusGross,
      currentActualGains: actualGainsValue,
      currentActualLTCGTax: actualTax,
      currentActualCorpusPostTax: actualPostTax,
      currentActualCorpusRealValue: actualRealValue
    };
  }, [monthlySIP, years, requiredReturn, accountForLTCG, inflationRate]);

  const totalInvestment = monthlySIP * years * 12;
  const totalEarnings = requiredReturn <= 0 ? 0 : currentActualCorpusGross - totalInvestment;
  const wealthGainPercent = requiredReturn <= 0 ? 0 : Math.round((totalEarnings / currentActualCorpusGross) * 100);
  const finalCorpus = requiredReturn <= 0 ? totalInvestment : currentActualCorpusGross;

  const isAdjusted = inflationRate > 0 || accountForLTCG;

  const {
    chartPrincipal,
    chartLTCGTax,
    chartMarketReturns,
    chartNominalCorpus
  } = useMemo(() => {
    // Donut chart segments should be consistent with Output Card
    const isAdjusted = inflationRate > 0 || accountForLTCG;
    const nominalCorpus = trueTargetGross;
    const principal = isAdjusted ? adjustedInvested : (monthlySIP * 12 * years);
    const ltcg = isAdjusted ? trueLTCGTax : 0;
    const returns = Math.max(0, nominalCorpus - principal - ltcg);

    return {
      chartPrincipal: principal,
      chartLTCGTax: ltcg,
      chartMarketReturns: returns,
      chartNominalCorpus: nominalCorpus
    };
  }, [trueTargetGross, adjustedInvested, trueLTCGTax, monthlySIP, years, inflationRate, accountForLTCG]);

  const yearlyData = useMemo(() => {
    const data = [];
    const isAdjusted = inflationRate > 0 || accountForLTCG;
    
    // Choose SIP and rate based on whether we are showing the "Needed" (Block 2) stats
    // This ensures the chart depicts the journey to the "True Target Corpus"
    const sip = isAdjusted ? trueSIPNeeded : monthlySIP;
    const annualRate = isAdjusted ? sipReturn : requiredReturn;
    const monthlyRate = annualRate / 100 / 12;
    const n = years * 12;
    let balance = 0;
    let investment = 0;

    for (let m = 1; m <= n; m++) {
      balance = (balance + sip) * (1 + monthlyRate);
      investment += sip;

      if (m % 12 === 0 || m === n) {
        const year = m / 12;
        const inflationFactor = Math.pow(1 + inflationRate / 100, year);
        
        // Accurate real value must account for the estimated LTCG tax liability at year t
        const gainsAtT = Math.max(0, balance - investment);
        const ltcgAtT = accountForLTCG 
          ? Math.max(0, gainsAtT - 125000) * 0.125 
          : 0;
        const realVal = (balance - ltcgAtT) / inflationFactor;

        data.push({
          year: parseFloat(year.toFixed(1)),
          balance: Math.round(balance),
          investment: Math.round(investment),
          returns: Math.round(balance - investment),
          realValue: Math.round(realVal)
        });
      }
    }

    // Validation Check: At the final year, the balance must match trueTargetGross (our nominal target)
    const finalBalance = data[data.length - 1]?.balance || 0;
    if (Math.abs(finalBalance - trueTargetGross) > 100 && trueTargetGross > 0) {
      console.warn(`Chart/Calculated Mismatch: Chart=${finalBalance}, Expected=${trueTargetGross}`);
    }

    return data;
  }, [monthlySIP, trueSIPNeeded, requiredReturn, sipReturn, years, inflationRate, accountForLTCG, trueTargetGross]);

  const breakdownData = useMemo(() => {
    return [
      { name: 'Principal', value: chartPrincipal, color: isDark ? '#3f3f46' : '#d1d5db' },
      { name: 'Market Returns', value: chartMarketReturns, color: '#10b981' },
      { name: 'LTCG Tax', value: chartLTCGTax, color: '#ef4444', isToggleOff: !accountForLTCG },
    ];
  }, [chartPrincipal, chartMarketReturns, chartLTCGTax, accountForLTCG, isDark]);

  const allocation = useMemo(() => {
    if (requiredReturn < 7) {
      return { 
        label: 'Conservative', 
        equity: 0, debt: 80, gold: 10, liquid: 10,
        note: 'Focuses on capital protection with minimal equity exposure.'
      };
    } else if (requiredReturn < 9) {
      return { 
        label: 'Moderate', 
        equity: 30, debt: 55, gold: 10, liquid: 5,
        note: 'A balanced mix of stability and growth potential.'
      };
    } else if (requiredReturn < 12) {
      return { 
        label: 'Growth', 
        equity: 70, debt: 20, gold: 10, liquid: 0,
        note: 'Equity-heavy to maximize compounding over the long term.'
      };
    } else if (requiredReturn <= 15) {
      return { 
        label: 'Aggressive', 
        equity: 85, debt: 10, gold: 5, liquid: 0,
        note: 'High-risk, high-reward strategy for ambitious goals.'
      };
    } else {
      return { 
        label: 'Unrealistic', 
        equity: 0, debt: 0, gold: 0, liquid: 0,
        note: "This goal isn't achievable at this SIP and timeline. Try increasing your monthly SIP or extending your timeline."
      };
    }
  }, [requiredReturn]);

  const staticInsights = useMemo(() => {
    const n = years * 12;
    const sip = monthlySIP;
    const r = requiredReturn / 1200;
    const annualR = requiredReturn / 100;

    // --- SCENARIO 1 Calculations ---
    const lastYears = Math.ceil(years / 3);
    const firstYears = years - lastYears;
    
    // Corpus after firstYears
    const nFirst = firstYears * 12;
    const corpusAtFoundation = sip * ((Math.pow(1 + r, nFirst) - 1) / r) * (1 + r);
    const foundationPercent = (corpusAtFoundation / trueTargetGross) * 100;
    
    // Break-even Year
    let breakEvenYear = years;
    for (let y = 1; y <= years; y++) {
      const n_prev = (y - 1) * 12;
      const n_curr = y * 12;
      const c_prev = sip * ((Math.pow(1 + r, n_prev) - 1) / r) * (1 + r);
      const c_curr = sip * ((Math.pow(1 + r, n_curr) - 1) / r) * (1 + r);
      if ((c_curr - c_prev) > (sip * 12)) {
        breakEvenYear = y;
        break;
      }
    }

    // Cost of Delay
    const nDelay = (years - 1) * 12;
    const extraSipNeeded = nDelay > 0 
      ? trueTargetGross / (((Math.pow(1 + r, nDelay) - 1) / r) * (1 + r)) - trueSIPNeeded
      : 0;

    // Rule of 72
    const doublingTime = requiredReturn > 0 ? Math.floor(72 / requiredReturn) : 0;
    const doublingFreq = doublingTime > 0 ? Math.floor(years / doublingTime) : 0;

    // --- SCENARIO 2 Calculations ---
    const i = inflationRate / 100;
    const inflationCostYear1 = targetAmount * (Math.pow(1 + i, 1) - 1);
    const inflationCostLastYear = targetAmount * (Math.pow(1 + i, years) - Math.pow(1 + i, years - 1));
    const inflationDelta = trueTargetGross - targetAmount;
    const genuineWealth = trueTargetGross - adjustedInvested - inflationDelta;
    
    // Breakeven Inflation (binary search)
    let breakEvenI: number | null = null;
    if (years > 0) {
      const affordableSIP = monthlySIP;
      const r_sip = 12 / 1200; // Using 12% benchmark for SIP needed
      const ltcgRate = 0.125;
      const ltcgExemption = 125000;

      const getSipNeededForI = (inf: number) => {
        const i_adj_goal = targetAmount * Math.pow(1 + inf / 100, years);
        // Gross up logic
        let loC = i_adj_goal, hiC = i_adj_goal * 4;
        for (let j = 0; j < 50; j++) {
          const midC = (loC + hiC) / 2;
          const s_t = midC / (((Math.pow(1 + r_sip, n) - 1) / r_sip) * (1 + r_sip));
          const i_t = s_t * n;
          const g_t = midC - i_t;
          const t_t = accountForLTCG ? Math.max(0, g_t - ltcgExemption) * ltcgRate : 0;
          if (midC - t_t > i_adj_goal) hiC = midC;
          else loC = midC;
        }
        const grossTarget = (loC + hiC) / 2;
        return grossTarget / (((Math.pow(1 + r_sip, n) - 1) / r_sip) * (1 + r_sip));
      };

      if (getSipNeededForI(0) <= affordableSIP) {
        let lowI = 0, highI = inflationRate;
        for (let i = 0; i < 50; i++) {
          const midI = (lowI + highI) / 2;
          if (getSipNeededForI(midI) <= affordableSIP) {
            breakEvenI = midI;
            lowI = midI;
          } else {
            highI = midI;
          }
        }
      }

      if (breakEvenI !== null && breakEvenI >= inflationRate - 0.01) {
        breakEvenI = null;
      }
    }

    // Cost per 0.5% inflation
    const getSipForI = (inf: number) => {
      const target = targetAmount * Math.pow(1 + inf / 100, years);
      return target / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    };
    const costPer05 = getSipForI(inflationRate + 0.5) - getSipForI(inflationRate);

    // --- SCENARIO 3 Calculations ---
    const effectiveRealReturn = ((1 + (requiredReturn / 100 * 0.875)) / (1 + inflationRate / 100) - 1) * 100;
    const gains = trueTargetGross - adjustedInvested;
    const exemptionCoverage = gains > 0 ? Math.floor((125000 / gains) * 100) : 0;
    
    // Step-up SIP (10% annual)
    let sumFactor = 0;
    for (let y = 0; y < years; y++) {
      const yearStartSipFactor = Math.pow(1.1, y);
      const fvOfYearlySip = ((Math.pow(1 + r, 12) - 1) / r) * (1 + r);
      const remainingYears = years - 1 - y;
      sumFactor += yearStartSipFactor * fvOfYearlySip * Math.pow(1 + annualR, remainingYears);
    }
    const stepUpSip = trueTargetGross / sumFactor;

    const totalLeakage = trueLTCGTax + (trueTargetGross - targetAmount);
    const leakagePercent = trueTargetGross > 0 ? Math.floor((totalLeakage / trueTargetGross) * 100) : 0;

    return {
      scenario1: {
        lastYears,
        firstYears,
        compoundingFact: 100 - foundationPercent,
        breakEvenYear,
        extraSip: extraSipNeeded,
        doublingTime,
        doublingFreq
      },
      scenario2: {
        realReturn: requiredReturn - inflationRate,
        inflationCostYear1,
        inflationCostLastYear,
        inflationDelta,
        genuineWealth,
        breakEvenI,
        costPer05
      },
      scenario3: {
        effectiveRealReturn,
        exemptionCoverage,
        stepUpSip,
        totalLeakage,
        leakagePercent
      }
    };
  }, [years, monthlySIP, requiredReturn, trueTargetGross, trueSIPNeeded, targetAmount, inflationRate, adjustedInvested, trueLTCGTax, accountForLTCG]);

  const activeScenario = (inflationRate === 0 && !accountForLTCG) ? 1 : (inflationRate > 0 && !accountForLTCG) ? 2 : 3;

  const aiChatData = useMemo(() => {
    // 1. CHIPS
    let chips: string[] = [];
    if (activeScenario === 1) {
      chips = [
        "What year does my corpus growth exceed my SIP contribution?",
        `How much of my ${formatInsightValue(trueTargetGross)} comes from returns vs what I invested?`,
        "What happens to my corpus if I increase my SIP by ₹5,000?",
        "How does starting 1 year later change my required SIP?"
      ];
    } else if (activeScenario === 2) {
      chips = [
        `Why is my real target ${formatInsightValue(trueTargetGross)} instead of ${formatInsightValue(targetAmount)}?`,
        `How much of my corpus is just keeping up with ${inflationRate}% inflation?`,
        "What is my real return after adjusting for inflation?",
        "How does changing inflation to 8% affect my SIP requirement?"
      ];
    } else {
      const totalLeakage = trueLTCGTax + (trueTargetGross - targetAmount);
      chips = [
        `How was the LTCG tax of ${formatInsightValue(trueLTCGTax)} calculated?`,
        `Why do tax and inflation together cost ${formatInsightValue(totalLeakage)}?`,
        "What is my effective real post-tax return?",
        "How much less would I need to invest if LTCG tax didn't exist?"
      ];
    }

    // 2. SYSTEM PROMPT
    const ltcgGrossUp = trueTargetGross - inflationAdjustedGoal;
    const inflationDelta = inflationAdjustedGoal - targetAmount;
    
    // todaysValue: real value of post-tax corpus
    const todaysValue = currentActualCorpusRealValue;
    const postTaxValue = currentActualCorpusPostTax;

    const contextObject = {
      targetAmount: formatCurrencyForAI(targetAmount),
      years,
      monthlySIP: formatCurrencyForAI(monthlySIP),
      sipNeeded: formatCurrencyForAI(trueSIPNeeded),
      nominalCorpus: formatCurrencyForAI(targetAmount),
      adjustedCorpus: formatCurrencyForAI(trueTargetGross),
      totalInvested: formatCurrencyForAI(adjustedInvested),
      ltcgTax: formatCurrencyForAI(trueLTCGTax),
      inflationDelta: formatCurrencyForAI(inflationDelta),
      ltcgGrossUp: formatCurrencyForAI(ltcgGrossUp),
      requiredReturn: `${requiredReturn}%`,
      inflationRate: `${inflationRate}%`,
      todaysValue: formatCurrencyForAI(todaysValue),
      postTaxValue: formatCurrencyForAI(postTaxValue)
    };

    const systemPrompt = `
You are a calculator assistant for WhatIff Goal Planner. You can only explain how the numbers shown were calculated or show the mathematical impact of changing inputs. You must not give any financial advice, investment recommendations, or suggest what the user should do. If asked for advice or recommendations, respond: 'I can only explain the numbers — for personalised advice, consult a financial advisor.'

Current Data Context:
${Object.entries(contextObject).map(([key, val]) => `- ${key}: ${val}`).join('\n')}
`.trim();

    return { chips, systemPrompt };
  }, [
    activeScenario, targetAmount, years, monthlySIP, trueTargetGross, 
    trueSIPNeeded, trueLTCGTax, inflationRate, inflationAdjustedGoal, 
    adjustedInvested, requiredReturn, currentActualCorpusRealValue, 
    currentActualCorpusPostTax
  ]);

  const handleExport = () => {
    exportToExcel(
      `${goalName} Goal Plan`,
      `Target of ${formatCurrency(targetAmount)} in ${years} years`,
      { targetAmount, years, monthlySIP },
      "Required Return Rate",
      requiredReturn,
      [
        { label: 'Total Principal', value: totalInvestment },
        { label: 'Wealth Gain', value: totalEarnings }
      ],
      `To reach your goal, you need a return rate of ${requiredReturn}% p.a.`
    );
  };

  return (
    <div className="space-y-8">
      <Helmet>
        <title>Goal Planner — Plan Your Financial Goals | WhatIff</title>
        <meta name="description" content="Reverse engineer your financial dreams. Calculate the required monthly SIP and return rate to reach your target corpus for any goal." />
        <link rel="canonical" href="https://whatiff.in/goal-planner" />
      </Helmet>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className={cn("text-2xl font-bold flex items-center gap-2 transition-colors duration-300", isDark ? "text-white" : "text-zinc-900")}>
            <Target className="w-6 h-6 text-emerald-500" />
            Goal Planner
          </h1>
          <p className="text-zinc-300 text-sm">Reverse engineer your financial dreams.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExport}
            className={cn("p-2 rounded-full transition-colors", isDark ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-500 hover:text-zinc-900")}
            title="Export to Excel"
          >
            <Download className="w-5 h-5" />
          </button>
          <SaveScenarioButton 
            type="goal" 
            inputs={{ targetAmount, years, monthlySIP }} 
            outputs={{ 
              requiredReturn, 
              totalInvestment, 
              totalEarnings,
              mainResult: isFinite(monthlySIP) ? monthlySIP : 0
            }} 
          />
          <button 
            onClick={() => setIsShareOpen(true)}
            className={cn("p-2 rounded-full transition-colors", isDark ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-500 hover:text-zinc-900")}
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Controls */}
        <div className="space-y-6 w-full">
          {isOverInvesting && (
            <div className={cn(
              "p-4 border rounded-xl space-y-2 shadow-sm",
              isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
            )}>
              <div className="flex items-center gap-2 text-emerald-500">
                <Info className="w-4 h-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Over-Investing Detected</p>
              </div>
              <p className={cn("text-xs leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-zinc-600")}>
                Your affordable SIP of <span className={cn("font-bold", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(monthlySIP)}</span> exceeds the required <span className={cn("font-bold", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(trueSIPNeeded)}/month</span> for this goal. You have <span className="text-emerald-500 font-bold">{formatCurrency(monthlySIP - trueSIPNeeded)}</span> extra per month — consider increasing your target or shortening your timeline.
              </p>
            </div>
          )}

          {isUnderInvesting && (
            <div className={cn(
              "p-4 border rounded-xl space-y-2 shadow-sm",
              isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200"
            )}>
              <div className="flex items-center gap-2 text-amber-500">
                <Info className="w-4 h-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Under-Investing Nudge</p>
              </div>
              <p className={cn("text-xs leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-zinc-600")}>
                Your affordable SIP of <span className={cn("font-bold", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(monthlySIP)}</span> is <span className="text-amber-500 font-bold">{formatCurrency(trueSIPNeeded - monthlySIP)}</span> short of the <span className={cn("font-bold", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(trueSIPNeeded)}/month</span> needed. This requires a <span className="text-amber-500 font-bold">{requiredReturn}%</span> annual return to bridge the gap.
              </p>
            </div>
          )}
          <SliderWithInput
            label="Target Amount"
            value={targetAmount}
            min={100000}
            max={1000000000}
            step={500000}
            onChange={setTargetAmount}
            formatDisplay={(v) => formatCurrency(v)}
          />

          <SliderWithInput
            label="Years"
            value={years}
            min={1}
            max={40}
            step={1}
            onChange={setYears}
            formatDisplay={(v) => `${v} Years`}
          />

          <SliderWithInput
            label="My Affordable SIP"
            value={monthlySIP}
            min={500}
            max={1000000}
            step={500}
            onChange={setMonthlySIP}
            formatDisplay={(v) => formatCurrency(v)}
            footerLabel="Used to calculate the required return rate"
          />

          <div className="pt-2">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-300 font-semibold text-[13px] transition-colors duration-200"
            >
              <motion.span
                animate={{ rotate: showAdvanced ? 180 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.span>
              Adjust for inflation and tax
            </button>

            <motion.div
              initial={false}
              animate={{ 
                height: showAdvanced ? 'auto' : 0,
                opacity: showAdvanced ? 1 : 0,
                marginTop: showAdvanced ? 24 : 0
              }}
              style={{ overflow: 'hidden' }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="space-y-6"
            >
              <SliderWithInput
                label="Inflation rate"
                value={inflationRate}
                min={0}
                max={10}
                step={0.5}
                onChange={setInflationRate}
                formatDisplay={(v) => `${v}%`}
                accentColor="emerald"
                tooltip="6% is India's long-run average CPI. Set to 0% to ignore inflation."
              />

              <div className="flex items-center justify-between py-2 border-t border-white/5">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                    Account for LTCG tax (12.5%)
                  </label>
                  {accountForLTCG && (
                    <p className="text-zinc-500 text-[11px] leading-tight font-medium">
                      12.5% on equity fund gains above ₹1.25L (Budget 2024)
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => setAccountForLTCG(!accountForLTCG)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative border", 
                    accountForLTCG ? "bg-emerald-500 border-emerald-400" : "bg-zinc-800 border-zinc-700"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md",
                    accountForLTCG ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              <p className="text-zinc-600 text-[11px] leading-relaxed pt-2 border-t border-white/5">
                When enabled, results adjust to show the SIP and return rate required to reach your real goal after inflation and tax.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Results Card */}
        <div className={cn(
          "glass-card p-8 space-y-6 flex flex-col w-full h-full transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          {/* Result States with smooth transitions */}
          <div className="relative">
            {/* Context for result states */}
            {(() => {
              const isAdjusted = inflationRate > 0 || accountForLTCG;
              const returnColor = requiredReturn < 10 ? '#10b981' : requiredReturn < 15 ? '#f59e0b' : '#f87171';
              const returnLabel = requiredReturn < 10 ? 'Achievable' : requiredReturn < 15 ? 'Stretching' : 'Very high';
              
              const contextLine = !isAdjusted 
                ? "Showing nominal returns without inflation or tax. Real returns will be lower."
                : (inflationRate > 0 && !accountForLTCG)
                ? `Adjusted for ${inflationRate}% inflation. Your ${formatIndianRupees(targetAmount)} goal needs ${formatIndianRupees(inflationAdjustedGoal)} in ${years} years.`
                : (!inflationRate && accountForLTCG)
                ? `After 12.5% LTCG tax, you need ${formatIndianRupees(trueTargetGross)} gross corpus to take home ${formatIndianRupees(targetAmount)}.`
                : `To have ${formatIndianRupees(targetAmount)} purchasing power after ${years} years and tax, your real target is ${formatIndianRupees(trueTargetGross)}.`;

              return (
                <>
                  <div className="space-y-6">
                    {/* Default State (Inflation & LTCG OFF) */}
                    <motion.div
                      animate={{ 
                        opacity: isAdjusted ? 0 : 1,
                        scale: isAdjusted ? 0.95 : 1,
                        display: isAdjusted ? 'none' : 'grid'
                      }}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                    >
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                        <div>
                          <p className="text-zinc-500 text-[9px] font-bold tracking-widest uppercase mb-1.5">Required Return</p>
                          <p style={{ color: returnColor }} className="text-2xl font-black">{requiredReturn}%<span className="text-xs ml-0.5 opacity-70">p.a</span></p>
                          <p style={{ color: returnColor }} className="text-[10px] font-bold mt-1 uppercase tracking-wider">{returnLabel}</p>
                        </div>
                        <p className="text-zinc-500 text-[10px] mt-4 font-medium">at {formatIndianRupees(monthlySIP)}/month</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                        <div>
                          <p className="text-zinc-500 text-[9px] font-bold tracking-widest uppercase mb-1.5">Total Invested</p>
                          <p className="text-white text-2xl font-black">{formatIndianRupees(totalInvestment)}</p>
                        </div>
                        <p className="text-zinc-500 text-[10px] mt-4 font-medium">over {years} years</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                        <div>
                          <p className="text-zinc-500 text-[9px] font-bold tracking-widest uppercase mb-1.5">Wealth Gain</p>
                          <p className="text-emerald-500 text-2xl font-black">+{formatIndianRupees(currentActualGains)}</p>
                        </div>
                        <p className="text-zinc-500 text-[10px] mt-4 font-medium">before tax</p>
                      </div>
                    </motion.div>

                    {/* Adjusted State (Inflation or LTCG ON) */}
                    <motion.div
                      animate={{ 
                        opacity: isAdjusted ? 1 : 0,
                        scale: isAdjusted ? 1 : 0.95,
                        display: isAdjusted ? 'flex' : 'none'
                      }}
                      className="flex flex-col gap-3"
                    >
                      {/* Row 1: Two wide tiles */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col justify-between">
                          <div>
                            <p className="text-zinc-500 text-[9px] font-bold tracking-widest uppercase mb-1.5">SIP NEEDED (ADJUSTED)</p>
                            <p className="text-amber-500 text-2xl font-black">{formatIndianRupees(trueSIPNeeded)}<span className="text-xs ml-0.5 opacity-70">/mo</span></p>
                          </div>
                          <p className="text-zinc-500 text-[10px] mt-4 font-medium">to reach real {formatIndianRupees(targetAmount)}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col justify-between">
                          <div>
                            <p className="text-zinc-500 text-[9px] font-bold tracking-widest uppercase mb-1.5">TRUE TARGET CORPUS</p>
                            <p className="text-white text-2xl font-black">{formatIndianRupees(trueTargetGross)}</p>
                          </div>
                          <p className="text-zinc-500 text-[10px] mt-4 font-medium">gross, before LTCG tax</p>
                        </div>
                      </div>
                      
                      {/* Row 2: Three tiles */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                          <div>
                            <p className="text-zinc-500 text-[9px] font-bold tracking-widest uppercase mb-1.5">Required Return</p>
                            <p style={{ color: returnColor }} className="text-xl font-black">{requiredReturn}%<span className="text-[10px] ml-0.5 opacity-70">p.a</span></p>
                            <p style={{ color: returnColor }} className="text-[9px] font-bold mt-1 uppercase tracking-wider">{returnLabel}</p>
                          </div>
                          <p className="text-zinc-500 text-[10px] mt-4 font-medium">adjusted</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                          <div>
                            <p className="text-zinc-500 text-[9px] font-bold tracking-widest uppercase mb-1.5">Total Invested</p>
                            <p className="text-white text-xl font-black">{formatIndianRupees(adjustedInvested)}</p>
                          </div>
                          <p className="text-zinc-500 text-[10px] mt-4 font-medium">over {years} yrs</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                          <div>
                            <p className="text-zinc-500 text-[9px] font-bold tracking-widest uppercase mb-1.5">LTCG Tax</p>
                            <p className="text-red-400 text-xl font-black">{formatIndianRupees(trueLTCGTax)}</p>
                          </div>
                          <p className="text-zinc-500 text-[10px] mt-4 font-medium">on redemption</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Contextual line */}
                    <div className="bg-white/[0.02] border-l-2 border-amber-500/30 rounded-lg p-[10px] px-[14px]">
                      <p className="text-zinc-500 text-xs leading-[1.6]">
                        {contextLine}
                      </p>
                    </div>

                    {/* High Return Warning */}
                    {requiredReturn > 15 && (
                      <div className="bg-red-400/5 border border-red-400/20 rounded-[10px] p-3 px-4 mt-3">
                        <p className="text-[13px] text-zinc-400">
                          This goal requires <span className="text-red-400 font-bold">{requiredReturn}%</span> annual returns — historically above long-run equity averages.
                          Increase your monthly SIP or extend your timeline to bring this number down.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
          
          <div className="mt-auto pt-4 border-t border-white/5">
            <p className="text-zinc-500 text-[11px] leading-relaxed italic opacity-80">
              LTCG calculation assumes redemption at end of tenure as a single event. Actual tax liability depends on redemption timing, units held, and annual exemption utilisation. Indexation benefit is not available on equity funds post Budget 2024. Consult a tax advisor for your specific situation.
            </p>
          </div>
        </div>
      </div>

      {/* Full-width Reality Check Section */}
      {(() => {
        const isAdjusted = (inflationRate > 0 || accountForLTCG);
        return (
          <motion.div
            initial={false}
            animate={{ 
              height: isAdjusted ? 'auto' : 0,
              opacity: isAdjusted ? 1 : 0,
              marginBottom: isAdjusted ? 40 : 0
            }}
            className="overflow-hidden"
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <div 
              className={cn(
                "rounded-2xl p-8 border shadow-2xl transition-all duration-300 relative overflow-hidden",
                isDark ? "bg-zinc-900 border-amber-500/30" : "bg-white border-amber-500/20"
              )}
            >
              {/* Background accent */}
              <div className={cn(
                "absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 rounded-full -mr-16 -mt-16",
                sipGap <= 0 ? "bg-emerald-500" : "bg-amber-500"
              )} />

              <div className="flex items-center gap-3 mb-8">
                <div>
                  <p className={cn(
                    "text-[10px] font-black tracking-[0.2em] uppercase",
                    sipGap <= 0 ? "text-emerald-500" : "text-amber-500"
                  )}>
                    {sipGap <= 0 ? "Target Strategy" : "Reality Check"}
                  </p>
                  <h3 className={cn("text-lg font-bold transition-all duration-300", isDark ? "text-white" : "text-zinc-900")}>
                    {sipGap <= 0 ? "Your current plan is on track" : "Closing the purchasing power gap"}
                  </h3>
                </div>
              </div>

              {sipGap <= 0 ? (
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                  <div className="space-y-1">
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">
                      Great news! Your monthly SIP of <span className="text-white font-bold">{formatCurrency(monthlySIP)}</span> is sufficient to cover your goal of <span className="text-white font-bold">{formatCurrency(targetAmount)}</span> even after accounting for <span className="text-amber-500 font-semibold">{inflationRate}% inflation</span> and <span className="text-amber-500 font-semibold">LTCG tax</span>.
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-center min-w-[180px]">
                    <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider mb-1">Surplus Margin</p>
                    <p className="text-2xl font-black text-emerald-400">+{formatIndianShort(Math.abs(sipGap))}<span className="text-xs ml-1 opacity-70">/mo</span></p>
                  </div>
                </div>
              ) : (
                <div className="space-y-12">
                  {/* BLOCK 1: IF YOU ONLY HIT YOUR STATED GOAL */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">IF YOU ONLY HIT YOUR STATED GOAL</h4>
                    <div className={cn(
                      "rounded-2xl border overflow-hidden",
                      isDark ? "bg-zinc-950 border-zinc-800/80" : "bg-white border-zinc-200"
                    )}>
                      <table className="w-full text-left">
                        <thead>
                          <tr className={cn("border-b", isDark ? "border-zinc-800/80 bg-zinc-950" : "border-zinc-100 bg-zinc-50")}>
                            <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-zinc-500 w-16">STEP</th>
                            <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-zinc-500">DESCRIPTION</th>
                            <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-zinc-500 text-right">AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody className={cn("divide-y", isDark ? "divide-zinc-800/50" : "divide-zinc-100")}>
                          <tr className={isDark ? "bg-zinc-950/50" : "bg-white"}>
                            <td className="px-6 py-3.5 text-xs font-bold text-zinc-500">1</td>
                            <td className={cn("px-6 py-3.5 text-xs font-medium", isDark ? "text-white" : "text-zinc-700")}>Stated goal (gross corpus)</td>
                            <td className={cn("px-6 py-3.5 text-xs font-bold text-right", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(targetAmount)}</td>
                          </tr>
                          <tr className={isDark ? "bg-zinc-950/50" : "bg-white"}>
                            <td className="px-6 py-3.5 text-xs font-bold text-zinc-500">−</td>
                            <td className={cn("px-6 py-3.5 text-xs font-medium", isDark ? "text-zinc-400" : "text-zinc-500")}>LTCG tax (12.5% on gains above ₹1.25L)</td>
                            <td className="px-6 py-3.5 text-xs font-bold text-red-500 text-right">− {formatCurrency(targetAmount - postTaxOnStatedGoal)}</td>
                          </tr>
                          <tr className={cn("border-t border-zinc-800/80", isDark ? "bg-zinc-900/40" : "bg-zinc-50")}>
                            <td className="px-6 py-3.5 text-xs font-bold text-zinc-500">=</td>
                            <td className={cn("px-6 py-3.5 text-xs font-medium", isDark ? "text-zinc-400" : "text-zinc-600")}>Post-tax take-home</td>
                            <td className={cn("px-6 py-3.5 text-xs font-bold text-right", isDark ? "text-zinc-400" : "text-zinc-600")}>{formatCurrency(postTaxOnStatedGoal)}</td>
                          </tr>
                          <tr className={isDark ? "bg-zinc-950/50" : "bg-white"}>
                            <td className="px-6 py-3.5 text-xs font-bold text-zinc-500">−</td>
                            <td className={cn("px-6 py-3.5 text-xs font-medium", isDark ? "text-zinc-400" : "text-zinc-500")}>Inflation erosion ({inflationRate}% over {years} yrs)</td>
                            <td className="px-6 py-3.5 text-xs font-bold text-red-500 text-right">− {formatCurrency(postTaxOnStatedGoal - realValuePostTax)}</td>
                          </tr>
                          <tr className={cn("border-t-2", isDark ? "bg-amber-500/5 border-zinc-800" : "bg-amber-50/30 border-amber-100")}>
                            <td className="px-6 py-4 text-xs font-bold text-amber-500">=</td>
                            <td className={cn("px-6 py-4 text-xs font-bold", isDark ? "text-white" : "text-zinc-800")}>Real value in today's money</td>
                            <td className="px-6 py-4 text-xs font-bold text-amber-500 text-right">{formatCurrency(realValuePostTax)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-zinc-500 px-1 leading-relaxed">
                      Hitting <span className="font-bold text-zinc-400">{formatCurrency(targetAmount)}</span> gross still leaves you with only <span className="font-bold text-amber-500">{formatCurrency(realValuePostTax)}</span> of real purchasing power today.
                    </p>
                  </div>

                  {/* BLOCK 2: WHAT YOU ACTUALLY NEED TO TARGET */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">WHAT YOU ACTUALLY NEED TO TARGET</h4>
                    <div className={cn(
                      "rounded-2xl border overflow-hidden",
                      isDark ? "bg-zinc-950 border-zinc-800/80" : "bg-white border-zinc-200"
                    )}>
                      <table className="w-full text-left">
                        <thead>
                          <tr className={cn("border-b", isDark ? "border-zinc-800/80 bg-zinc-950" : "border-zinc-100 bg-zinc-50")}>
                            <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-zinc-500 w-16">STEP</th>
                            <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-zinc-500">DESCRIPTION</th>
                            <th className="px-6 py-3 text-[9px] font-bold uppercase tracking-widest text-zinc-500 text-right">AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody className={cn("divide-y", isDark ? "divide-zinc-800/50" : "divide-zinc-100")}>
                          <tr className={isDark ? "bg-zinc-950/50" : "bg-white"}>
                            <td className="px-6 py-3.5 text-xs font-bold text-zinc-500">1</td>
                            <td className={cn("px-6 py-3.5 text-xs font-medium", isDark ? "text-white" : "text-zinc-700")}>Your goal in today's money</td>
                            <td className={cn("px-6 py-3.5 text-xs font-bold text-right", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(targetAmount)}</td>
                          </tr>
                          <tr className={isDark ? "bg-zinc-950/50" : "bg-white"}>
                            <td className="px-6 py-3.5 text-xs font-bold text-zinc-500">+</td>
                            <td className={cn("px-6 py-3.5 text-xs font-medium", isDark ? "text-zinc-400" : "text-zinc-500")}>Inflation gross-up ({inflationRate}% over {years} yrs)</td>
                            <td className="px-6 py-3.5 text-xs font-bold text-amber-500 text-right">+ {formatCurrency(inflationAdjustedGoal - targetAmount)}</td>
                          </tr>
                          <tr className={cn("border-t border-zinc-800/80", isDark ? "bg-zinc-900/40" : "bg-zinc-50")}>
                            <td className="px-6 py-3.5 text-xs font-bold text-zinc-500">=</td>
                            <td className={cn("px-6 py-3.5 text-xs font-medium", isDark ? "text-zinc-400" : "text-zinc-600")}>Inflation-adjusted future target</td>
                            <td className={cn("px-6 py-3.5 text-xs font-bold text-right", isDark ? "text-zinc-400" : "text-zinc-600")}>{formatCurrency(inflationAdjustedGoal)}</td>
                          </tr>
                          <tr className={isDark ? "bg-zinc-950/50" : "bg-white"}>
                            <td className="px-6 py-3.5 text-xs font-bold text-zinc-500">+</td>
                            <td className={cn("px-6 py-3.5 text-xs font-medium", isDark ? "text-zinc-400" : "text-zinc-500")}>LTCG gross-up (to cover tax on gains)</td>
                            <td className="px-6 py-4 text-xs font-bold text-red-500 text-right">+ {formatCurrency(trueTargetGross - inflationAdjustedGoal)}</td>
                          </tr>
                          <tr className={cn("border-t-2", isDark ? "bg-emerald-500/5 border-zinc-800" : "bg-emerald-50/30 border-emerald-100")}>
                            <td className="px-6 py-5 text-xs font-bold text-emerald-500">=</td>
                            <td className={cn("px-6 py-5 text-sm font-bold", isDark ? "text-white" : "text-zinc-900")}>Gross corpus to target</td>
                            <td className="px-6 py-5 text-xs font-bold text-emerald-500 text-right">{formatCurrency(trueTargetGross)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-zinc-500 px-1 leading-relaxed">
                      Your monthly SIP of <span className="font-bold text-zinc-400">{formatCurrency(trueSIPNeeded)}</span> at {sipReturn}% expected returns targets this gross corpus.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        );
      })()}

      {/* How this is calculated - Collapsible Explainer */}
      <div className="mb-10 border-t border-white/[0.06] mt-4">
        <button 
          onClick={() => setShowCalculationExplainer(!showCalculationExplainer)}
          className={cn(
            "w-full flex justify-between items-center py-4 text-[13px] font-bold uppercase tracking-widest transition-colors duration-200",
            isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
          )}
        >
          How is this calculated?
          <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", showCalculationExplainer ? "rotate-180" : "")} />
        </button>

        <motion.div
          initial={false}
          animate={{ 
            height: showCalculationExplainer ? 'auto' : 0,
            opacity: showCalculationExplainer ? 1 : 0,
            marginTop: showCalculationExplainer ? 8 : 0
          }}
          className="overflow-hidden"
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 p-6 rounded-2xl bg-zinc-900/10 border border-white/5">
            {/* Block A: LTCG TAX */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">A — LTCG TAX</span>
                <span className="text-sm font-bold text-red-500">{formatCurrency(targetAmount - postTaxOnStatedGoal)}</span>
              </div>
              <div className="space-y-2 text-[11px] text-zinc-400 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                <p>Total invested = {formatCurrency(monthlySIP)} × 12 × {years} years = {formatCurrency(monthlySIP * 12 * years)}</p>
                <p>Gains = {formatCurrency(targetAmount)} − {formatCurrency(monthlySIP * 12 * years)} = {formatCurrency(targetAmount - (monthlySIP * 12 * years))}</p>
                <p>Taxable gains = {formatCurrency(Math.max(0, targetAmount - (monthlySIP * 12 * years)))} − ₹1,25,000 exemption = {formatCurrency(Math.max(0, targetAmount - (monthlySIP * 12 * years) - 125000))}</p>
                <p>LTCG tax = {formatCurrency(Math.max(0, targetAmount - (monthlySIP * 12 * years) - 125000))} × 12.5% = {formatCurrency(targetAmount - postTaxOnStatedGoal)}</p>
              </div>
            </div>

            {/* Block B: INFLATION EROSION */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">B — INFLATION EROSION</span>
                <span className="text-sm font-bold text-red-500">{formatCurrency(postTaxOnStatedGoal - realValuePostTax)}</span>
              </div>
              <div className="space-y-2 text-[11px] text-zinc-400 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                <p>Real value = {formatCurrency(postTaxOnStatedGoal)} ÷ (1 + {inflationRate/100})^{years} = {formatCurrency(realValuePostTax)}</p>
                <p>Erosion = {formatCurrency(postTaxOnStatedGoal)} − {formatCurrency(realValuePostTax)} = {formatCurrency(postTaxOnStatedGoal - realValuePostTax)}</p>
              </div>
            </div>

            {/* Block C: INFLATION GROSS-UP */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">C — INFLATION GROSS-UP</span>
                <span className="text-sm font-bold text-amber-500">{formatCurrency(inflationAdjustedGoal - targetAmount)}</span>
              </div>
              <div className="space-y-2 text-[11px] text-zinc-400 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                <p>Inflation-adj. target = {formatCurrency(targetAmount)} × (1 + {inflationRate/100})^{years} = {formatCurrency(inflationAdjustedGoal)}</p>
                <p>Gross-up added = {formatCurrency(inflationAdjustedGoal)} − {formatCurrency(targetAmount)} = {formatCurrency(inflationAdjustedGoal - targetAmount)}</p>
              </div>
            </div>

            {/* Block D: LTCG GROSS-UP */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">D — LTCG GROSS-UP</span>
                <span className="text-sm font-bold text-emerald-500">{formatCurrency(trueTargetGross - inflationAdjustedGoal)}</span>
              </div>
              <div className="space-y-2 text-[11px] text-zinc-400 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                <p>To net {formatCurrency(inflationAdjustedGoal)} after 12.5% tax on gains:</p>
                <p>Gross-up = {formatCurrency(trueTargetGross)} − {formatCurrency(inflationAdjustedGoal)} ≈ {formatCurrency(trueTargetGross - inflationAdjustedGoal)}</p>
                <p>Gross corpus = {formatCurrency(inflationAdjustedGoal)} + {formatCurrency(trueTargetGross - inflationAdjustedGoal)} = {formatCurrency(trueTargetGross)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="space-y-4">
        {/* Banner Section - Removed as per instructions */}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Donut Chart */}
        <div className={cn(
          "glass-card p-8 min-w-0 transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="mb-8">
            <h3 className={cn("text-lg font-bold uppercase tracking-tight", isDark ? "text-white" : "text-zinc-900")}>
              WHERE DOES YOUR MONEY GO?
            </h3>
            <p className="text-zinc-500 text-xs mt-1">Of every ₹100 your corpus grows to, here's the split.</p>
          </div>
          <div className="h-[280px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={85}
                  outerRadius={105}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  animationDuration={1000}
                >
                  {breakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} opacity={entry.value === 0 ? 0 : 1} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#18181b' : '#ffffff', 
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e4e4e7', 
                    borderRadius: '12px',
                    padding: '12px'
                  }}
                  itemStyle={{ color: isDark ? '#f4f4f5' : '#09090b', fontSize: '13px', fontWeight: '600' }}
                  formatter={(value: number, name: string) => [
                    `${formatCurrency(value)} (${((value / chartNominalCorpus) * 100).toFixed(0)}% of gross corpus)`,
                    name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className={cn("text-2xl font-black", isDark ? "text-white" : "text-zinc-900")}>{formatIndianShort(chartNominalCorpus)}</p>
                <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em] mt-1">Gross Corpus</p>
              </div>
          </div>
          
          <div className="mt-8 grid grid-cols-1 gap-y-3">
            {breakdownData.map((entry, index) => (
              <div key={index} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400 group-hover:text-white" : "text-zinc-500 group-hover:text-zinc-900")}>
                    {entry.name}
                    {entry.name === 'Market Returns' && <span className="text-[10px] lowercase font-medium opacity-60 ml-1">(market growth)</span>}
                    {entry.isToggleOff && <span className="text-[10px] lowercase font-medium opacity-60"> — toggle on to see impact</span>}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn("text-xs font-mono font-bold", isDark ? "text-zinc-300" : "text-zinc-700")}>
                    {formatCurrency(entry.value)}
                  </span>
                  <span className="text-[10px] font-black text-zinc-500 w-8 text-right">
                    {Math.round((entry.value / chartNominalCorpus) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Chart */}
        <div className={cn(
          "glass-card p-6 min-w-0 transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-6">Growth Projection</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearlyData}>
                <defs>
                  <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3f3f46" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3f3f46" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                <XAxis 
                  dataKey="year" 
                  stroke="#a1a1aa" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  label={{ value: 'Years', position: 'insideBottom', offset: -5, fill: '#a1a1aa', fontSize: 10 }}
                />
                <YAxis 
                  stroke="#a1a1aa" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => formatIndianShort(val).replace('₹', '')}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className={cn(
                          "glass-card p-3 border shadow-xl",
                          isDark ? "bg-zinc-900 border-zinc-700" : "bg-white border-zinc-200"
                        )}>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Year {label}</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-8">
                              <span className="text-[11px] text-zinc-400">Total Corpus</span>
                              <span className={cn("text-[11px] font-bold", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(data.balance)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-8">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                                <span className="text-[11px] text-zinc-400">Invested</span>
                              </div>
                              <span className={cn("text-[11px] font-bold", isDark ? "text-zinc-300" : "text-zinc-700")}>{formatCurrency(data.investment)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-8">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[11px] text-zinc-400">Returns</span>
                              </div>
                              <span className={cn("text-[11px] font-bold", isDark ? "text-emerald-400" : "text-emerald-600")}>{formatCurrency(data.returns)}</span>
                            </div>
                            {inflationRate > 0 && (
                              <div className="flex items-center justify-between gap-8 pt-1.5 border-t border-white/5">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 border border-amber-500 rounded-px" />
                                  <span className="text-[11px] text-zinc-400">Real Value</span>
                                </div>
                                <span className="text-[11px] font-bold text-amber-500">{formatCurrency(data.realValue)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '10px', paddingTop: '20px', fontFamily: '"DM Sans", sans-serif' }}
                  formatter={(value) => {
                    if (value === 'Total Invested') {
                      return <span className={cn(isDark ? "text-white" : "text-zinc-900", "font-black")}>{value}</span>;
                    }
                    return <span className={cn(isDark ? "text-white" : "text-zinc-900", "font-medium")}>{value}</span>;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="investment" 
                  stackId="1"
                  name="Total Invested"
                  stroke="#3f3f46" 
                  strokeWidth={2}
                  fill="url(#colorInvestment)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="returns" 
                  stackId="1"
                  name="Returns"
                  stroke="#10b981" 
                  strokeWidth={2}
                  fill="url(#colorReturns)" 
                />
                {inflationRate > 0 && (
                  <Area 
                    type="monotone" 
                    dataKey="realValue" 
                    name="Real Value (Today's Money)"
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    fill="transparent"
                    strokeDasharray="5 5"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Asset Allocation Section */}
      {requiredReturn > 0 && (
        <div className={cn(
          "glass-card p-6 space-y-6 transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-zinc-900")}>How Investors Typically Achieve {requiredReturn.toFixed(1)}% Returns</h3>
              <p className="text-zinc-500 text-[11px]">Based on historical asset class performance. Not a recommendation.</p>
            </div>
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
              requiredReturn < 7 ? "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20" :
              requiredReturn < 9 ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
              requiredReturn < 12 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
              requiredReturn <= 15 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
              "bg-red-500/10 text-red-500 border border-red-500/20"
            )}>
              {allocation.label}
            </span>
          </div>

          {requiredReturn > 15 ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-500 font-medium">{allocation.note}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setMonthlySIP(prev => Math.min(prev + 5000, 1000000))}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-all"
                >
                  Increase SIP by ₹5,000
                </button>
                <button 
                  onClick={() => setYears(prev => Math.min(prev + 2, 40))}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-all"
                >
                  Extend by 2 years
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stacked Bar */}
              <div className="h-4 w-full flex rounded-full overflow-hidden bg-zinc-800">
                {allocation.equity > 0 && (
                  <div 
                    style={{ width: `${allocation.equity}%` }} 
                    className="bg-emerald-500 h-full flex items-center justify-center"
                  >
                    <span className="text-[8px] font-bold text-white">{allocation.equity}%</span>
                  </div>
                )}
                {allocation.debt > 0 && (
                  <div 
                    style={{ width: `${allocation.debt}%` }} 
                    className="bg-blue-500 h-full flex items-center justify-center"
                  >
                    <span className="text-[8px] font-bold text-white">{allocation.debt}%</span>
                  </div>
                )}
                {allocation.gold > 0 && (
                  <div 
                    style={{ width: `${allocation.gold}%` }} 
                    className="bg-amber-500 h-full flex items-center justify-center"
                  >
                    <span className="text-[8px] font-bold text-white">{allocation.gold}%</span>
                  </div>
                )}
                {allocation.liquid > 0 && (
                  <div 
                    style={{ width: `${allocation.liquid}%` }} 
                    className="bg-zinc-500 h-full flex items-center justify-center"
                  >
                    <span className="text-[8px] font-bold text-white">{allocation.liquid}%</span>
                  </div>
                )}
              </div>

              {/* Pills */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Equity {allocation.equity}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Debt {allocation.debt}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Gold {allocation.gold}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-500" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Liquid {allocation.liquid}%</span>
                </div>
              </div>

              <p className="text-xs text-zinc-500 italic">
                {allocation.note}
              </p>
            </div>
          )}
        </div>
      )}


      {/* WhatIff Insights Section */}
      {requiredReturn > 0 && (
        <WhatiffInsights
          calculatorType="goal"
          results={{ 
            targetAmount, 
            years, 
            monthlySIP, 
            requiredReturn, 
            totalInvestment, 
            totalEarnings,
            trueTargetGross,
            trueSIPNeeded,
            trueLTCGTax,
            inflationRate,
            accountForLTCG
          }}
          onAskAI={handleAskAI}
          chips={aiChatData.chips}
          systemPrompt={aiChatData.systemPrompt}
          insights={(() => {
            if (activeScenario === 1) {
              return [
                `More than 50% of your **${formatCurrency(trueTargetGross)}** is built in the last **${staticInsights.scenario1.lastYears} years** of your ${years}-year journey. The first ${staticInsights.scenario1.firstYears} years just lay the foundation.`,
                `At **year ${staticInsights.scenario1.breakEvenYear}**, your annual corpus growth overtakes your annual SIP contribution — from that point, the market is adding more than you are.`,
                `Starting just 1 year later means you'd need **${formatCurrency(staticInsights.scenario1.extraSip)}/month** more to hit the same target — that's **${formatCurrency(staticInsights.scenario1.extraSip * 12)}** extra per year for doing nothing differently.`,
                `At ${requiredReturn}%, your money doubles every **${staticInsights.scenario1.doublingTime} years**. Your ${formatCurrency(monthlySIP * 12 * years)} in principal doubles **${staticInsights.scenario1.doublingFreq} times** before maturity.`
              ];
            }
            if (activeScenario === 2) {
              return [
                `Your nominal target return is ${requiredReturn}% — but after ${inflationRate}% inflation, your real return is only **${staticInsights.scenario2.realReturn.toFixed(1)}%**. That's the rate your actual purchasing power grows.`,
                `Inflation doesn't erode linearly. At ${inflationRate}%, your target grows by **${formatCurrency(staticInsights.scenario2.inflationCostYear1)}** in year 1 but **${formatCurrency(staticInsights.scenario2.inflationCostLastYear)}** in year ${years}. The goalpost keeps moving faster.`,
                `**${formatCurrency(staticInsights.scenario2.inflationDelta)}** of your gross corpus isn't wealth — it's just keeping up with price rises. Only **${formatCurrency(staticInsights.scenario2.genuineWealth)}** is genuine new purchasing power.`,
                ...(staticInsights.scenario2.breakEvenI !== null ? [
                  `If inflation were **${staticInsights.scenario2.breakEvenI.toFixed(1)}%** instead of ${inflationRate}%, your affordable SIP of ${formatCurrency(monthlySIP)} would already be sufficient. Every 0.5% above **${staticInsights.scenario2.breakEvenI.toFixed(1)}%** costs you **${formatCurrency(staticInsights.scenario2.costPer05)}/month**.`
                ] : [])
              ];
            }
            return [
              `You need ${requiredReturn}% nominal returns. After ${inflationRate}% inflation and 12.5% LTCG, your effective real post-tax return is only **${staticInsights.scenario3.effectiveRealReturn.toFixed(1)}%** — less than half the headline number.`,
              `The ₹1.25L LTCG exemption covers only **${staticInsights.scenario3.exemptionCoverage}%** of your ${formatCurrency(trueTargetGross - adjustedInvested)} in gains — it saves you just ₹15,625 on a ${formatCurrency(trueLTCGTax)} tax bill. Its value shrinks as your corpus grows.`,
              `If you increase your SIP by 10% every year instead of keeping it flat at ${formatCurrency(trueSIPNeeded)}, you can hit the same ${formatCurrency(trueTargetGross)} target starting at just **${formatCurrency(staticInsights.scenario3.stepUpSip)}/month**.`,
              `Tax and inflation together consume **${formatCurrency(staticInsights.scenario3.totalLeakage)}** — **${staticInsights.scenario3.leakagePercent}%** of your gross corpus. You're effectively building two goals: one for yourself, one for time and the government.`
            ];
          })()}
        />
      )}

      {/* Local AI Chat Component and other UI remains below */}
      <AIChat 
        isOpen={isChatOpen} 
        onClose={() => {
          setIsChatOpen(false);
          setChatContext(null);
          setHasUserInteracted(false);
          setMessages([]);
        }}
        messages={messages}
        input={chatInput}
        setInput={setChatInput}
        onSend={handleSendMessage}
        isLoading={isChatLoading}
        showChips={!hasUserInteracted}
        chips={chatContext?.chips || aiChatData.chips}
        questionCount={questionCount}
        maxQuestions={MAX_QUESTIONS}
      />

      {/* Nudge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={cn(
            "glass-card p-6 cursor-pointer group transition-all duration-300 border-l-4 border-l-amber-500",
            isDark ? "bg-white/5 hover:bg-white/10 border-white/5" : "bg-white hover:bg-zinc-50 border-zinc-200 shadow-sm"
          )}
          onClick={() => onNavigate('child_future_planner')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", isDark ? "bg-amber-500/10" : "bg-amber-100")}>
                <Baby className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className={cn("font-bold transition-colors", isDark ? "text-white group-hover:text-amber-400" : "text-zinc-900 group-hover:text-amber-600")}>👶 Planning for your child?</h3>
                <p className="text-xs text-zinc-500">See the true inflation-adjusted cost of raising a child in India.</p>
              </div>
            </div>
            <ArrowRight className={cn("w-5 h-5 transition-all", isDark ? "text-zinc-600 group-hover:text-zinc-300" : "text-zinc-400 group-hover:text-zinc-900")} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={cn(
            "glass-card p-6 cursor-pointer group transition-all duration-300 border-l-4 border-l-purple-500",
            isDark ? "bg-white/5 hover:bg-white/10 border-white/5" : "bg-white hover:bg-zinc-50 border-zinc-200 shadow-sm"
          )}
          onClick={() => onNavigate('prepay_vs_invest')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", isDark ? "bg-purple-500/10" : "bg-purple-100")}>
                <ArrowUpRight className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className={cn("font-bold transition-colors", isDark ? "text-white group-hover:text-purple-400" : "text-zinc-900 group-hover:text-purple-600")}>💡 Prepay vs Invest</h3>
                <p className="text-xs text-zinc-500">Have a loan? See if you should invest this SIP or prepay your loan.</p>
              </div>
            </div>
            <ArrowRight className={cn("w-5 h-5 transition-all", isDark ? "text-zinc-600 group-hover:text-zinc-300" : "text-zinc-400 group-hover:text-zinc-900")} />
          </div>
        </motion.div>
      </div>

      {/* Investment Platforms */}
      <InvestmentBrokerSection />

      <ShareVision 
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title={`${goalName} Vision`}
        description={`To reach ${formatIndianRupees(targetAmount)} in ${years} years.`}
        mainValue={monthlySIP}
        mainLabel="Monthly SIP"
        secondaryValues={[
          { label: 'Monthly SIP', value: monthlySIP },
          { label: 'Required Return', value: `${requiredReturn}%` }
        ]}
        insight={requiredReturn <= 12 ? "Achievable — This goal is well within historical market returns." : "Aggressive — Requires high equity exposure and risk tolerance."}
        category="grow"
        inputs={{ targetAmount, years, monthlySIP, requiredReturn }}
        onSave={() => setIsShareOpen(false)}
      />

      <footer className="py-12 flex justify-center">
        <InsightFeedback 
          calculator="GoalPlanner" 
        />
      </footer>
    </div>
  );
}
