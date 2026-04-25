import React, { useState, useMemo, useRef, useEffect, useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import { TrendingUp, Share2, Download, ChevronDown, ArrowRight, Star, Info, ShieldCheck } from 'lucide-react';
import { GLOBAL_AI_INSTRUCTION } from '../../aiInsightPrompt';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  BarChart, 
  Bar,
  LabelList
} from 'recharts';
import { calculateBasicFD, INFLATION_RATE } from '../../lib/calculators';
import { formatCurrency, formatIndianRupees, cn } from '../../lib/utils';
import SaveScenarioButton from '../SaveScenarioButton';
import ShareVision from '../ShareVision';
import InfoBox from '../InfoBox';
import { exportToExcel } from '../../lib/exportUtils';
import WhatiffInsights from '../WhatiffInsights';
import SliderWithInput from '../SliderWithInput';
import { Screen } from '../../App';
import { ThemeContext } from '../../contexts/ThemeContext';
import AIChat from '../AIChat';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_QUESTIONS = 10;

interface BasicFDCalculatorProps {
  onBack: () => void;
  onNavigate: (screen: Screen, state?: any) => void;
  onAskAI?: (context?: any) => void;
  isEmbedded?: boolean;
  onValuesChange?: (values: { principal: number; fdRate: number; tenure: number; taxSlab: number }) => void;
}

const TOP_BANKS = [
  { name: 'HDFC Bank', rate: 7.4, rating: 4.8, tags: ["PRIVATE", "MOST TRUSTED"], domain: 'www.hdfcbank.com', url: 'https://www.hdfc.bank.in/fixed-deposit?icid=website_organic_breadcrumb:link:fixeddeposit' },
  { name: 'ICICI Bank', rate: 7.4, rating: 4.7, tags: ["PRIVATE", "DIGITAL FIRST"], domain: 'www.icicibank.com', url: 'https://www.icicibank.com/personal-banking/deposits/fixed-deposit' },
  { name: 'Axis Bank', rate: 7.6, rating: 4.5, tags: ["PRIVATE", "QUICK PROCESS"], domain: 'www.axisbank.com', url: 'https://www.axisbank.com/retail/deposits/fixed-deposits' },
  { name: 'Ujjivan SFB', rate: 8.25, rating: 4.5, tags: ["SMALL FINANCE", "HIGH RATES"], domain: 'www.ujjivansfb.in', url: 'https://www.ujjivansfb.in/personal/deposits/regular-fixed-deposits' },
  { name: 'Jana SFB', rate: 8.5, rating: 4.3, tags: ["SMALL FINANCE", "HIGHEST RATES"], domain: 'www.janabank.com', url: 'https://www.jana.bank.in/deposits/' },
  { name: 'Suryoday SFB', rate: 8.6, rating: 4.2, tags: ["SMALL FINANCE", "HIGHEST RATES"], domain: 'www.suryodaybank.com', url: 'https://suryoday.bank.in/personal/deposits/fixed-deposits/' },
];

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

export default function BasicFDCalculator({ onBack, onNavigate, onAskAI, isEmbedded = false, onValuesChange }: BasicFDCalculatorProps) {
  const theme = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [principal, setPrincipal] = useState(100000);
  const [fdRate, setFdRate] = useState(6.5);
  const [tenure, setTenure] = useState(12);
  const [isTaxExpanded, setIsTaxExpanded] = useState(false);
  const [citizenType, setCitizenType] = useState<'Regular' | 'Senior'>('Regular');
  const [taxSlab, setTaxSlab] = useState(20);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [barPositions, setBarPositions] = useState<{ x: number; width: number; label: string; index: number }[]>([]);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const preFill = localStorage.getItem('fdPreFill');
    if (preFill) {
      try {
        const data = JSON.parse(preFill);
        if (data.source === 'landing') {
          setPrincipal(data.principal);
          setFdRate(data.fdRate);
          setTenure(data.tenure);
          setTaxSlab(data.taxSlab);
          if (data.taxSlab > 0) setIsTaxExpanded(true);
          localStorage.removeItem('fdPreFill');
        }
      } catch (e) {
        localStorage.removeItem('fdPreFill');
      }
    }
  }, []);

  useEffect(() => {
    if (onValuesChange) {
      onValuesChange({ principal, fdRate, tenure, taxSlab });
    }
  }, [principal, fdRate, tenure, taxSlab, onValuesChange]);

  // AI Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showChatChips, setShowChatChips] = useState(true);
  const [questionCount, setQuestionCount] = useState(0);

  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));

  // Reset chat on mount
  useEffect(() => {
    setMessages([]);
    setChatInput('');
    setIsChatLoading(false);
    setShowChatChips(true);
    setQuestionCount(0);
  }, []);

  const barLabels = {
    principal: "Principal",
    interest: "Interest Earned",
    inflation: "Lost to Inflation",
    tax: "Tax Payable",
    realValue: isTaxExpanded && taxSlab > 0 ? "Real Value at Maturity (Post-Tax)" : "Real Value at Maturity"
  };

  // Clear bar positions when data structure changes to avoid stale labels
  useEffect(() => {
    setBarPositions([]);
  }, [isTaxExpanded, taxSlab]);

  const result = useMemo(() => {
    return calculateBasicFD(principal, fdRate, tenure);
  }, [principal, fdRate, tenure]);

  const realMaturityValue = useMemo(() => {
    return result.maturityAmount / Math.pow(1 + INFLATION_RATE / 100, tenure / 12);
  }, [result.maturityAmount, tenure]);

  const realGain = useMemo(() => {
    return realMaturityValue - principal;
  }, [realMaturityValue, principal]);

  const sipCorpus = useMemo(() => {
    const r = 0.12 / 12;
    const n = tenure;
    const p = principal;
    return p * Math.pow(1 + r, n);
  }, [principal, tenure]);

  const taxDetails = useMemo(() => {
    const threshold = citizenType === 'Senior' ? 50000 : 40000;
    const annualInterest = result.grossInterest * (12 / tenure);
    const tdsDeducted = annualInterest > threshold ? result.grossInterest * 0.1 : 0;
    const totalTax = result.grossInterest * (taxSlab / 100);
    const taxPayable = Math.max(0, totalTax - tdsDeducted);
    const postTaxInterest = result.grossInterest - totalTax;
    const postTaxMaturity = principal + postTaxInterest;
    const tenureYears = tenure / 12;
    const realValue = postTaxMaturity / Math.pow(1 + INFLATION_RATE / 100, tenureYears);
    let postTaxRealReturn = ((realValue / principal) - 1) * 100;

    // Safety check requested: ensure return is negative if real value is below principal
    if (realValue < principal && postTaxRealReturn > 0) {
      postTaxRealReturn = -postTaxRealReturn;
    }

    return {
      tdsDeducted: Math.round(tdsDeducted),
      taxPayable: Math.round(taxPayable),
      postTaxInterest: Math.round(postTaxInterest),
      postTaxMaturityAmount: Math.round(result.maturityAmount - totalTax),
      postTaxRate: Math.round((postTaxInterest / principal) * (12 / tenure) * 100 * 100) / 100,
      postTaxRealReturn: Math.round(postTaxRealReturn * 100) / 100,
      isTDSApplicable: annualInterest > threshold,
      threshold,
      annualInterest
    };
  }, [result.grossInterest, tenure, citizenType, taxSlab, principal]);

  const aiData = useMemo(() => {
    const tenureYears = tenure / 12;
    const inflationAdjustedPrincipal = principal * Math.pow(1 + INFLATION_RATE / 100, tenureYears);
    const purchasingPowerLoss = inflationAdjustedPrincipal - principal;
    const realSurplus = result.maturityAmount - inflationAdjustedPrincipal;
    const postTaxMaturity = principal + (result.grossInterest * (1 - taxSlab / 100));
    const realValue = postTaxMaturity / Math.pow(1 + INFLATION_RATE / 100, tenureYears);
    const realReturnRate = ((realValue / principal) - 1) * 100;
    const threshold = citizenType === 'Senior' ? 50000 : 40000;
    const annualInterest = result.grossInterest * (12 / tenure);

    return {
      principal,
      fdRate,
      tenureMonths: tenure,
      maturityAmount: result.maturityAmount,
      grossInterest: result.grossInterest,
      taxSlab,
      postTaxMaturity,
      realReturnRate,
      inflationAdjustedPrincipal,
      purchasingPowerLoss,
      realSurplus,
      tdsThreshold: threshold,
      isTDSApplicable: annualInterest > threshold
    };
  }, [principal, fdRate, tenure, result, taxSlab, citizenType]);

  const handleExport = () => {
    exportToExcel(
      "Basic FD Calculation",
      `FD of ${formatCurrency(principal)} at ${fdRate}% for ${tenure} months`,
      { principal, fdRate, tenure, citizenType, taxSlab },
      "Maturity Amount",
      result.maturityAmount,
      [
        { label: 'Gross Interest', value: result.grossInterest },
        { label: 'Real Return', value: `${result.realReturn}%` },
        { label: 'Post-Tax Interest', value: taxDetails.postTaxInterest }
      ],
      `Your FD effectively earns ${taxDetails.postTaxRate}% post-tax at your slab.`
    );
  };

  const lineChartData = useMemo(() => {
    const data = [];
    const r = fdRate / 100;
    const n = 4; // Quarterly compounding
    const inflationRate = INFLATION_RATE / 100;
    
    for (let m = 0; m <= tenure; m++) {
      const t = m / 12;
      const nominalValue = Math.round(principal * Math.pow(1 + r/n, n * t));
      const realValue = Math.round(nominalValue / Math.pow(1 + inflationRate, t));
      
      const item: any = {
        month: m,
        nominal: nominalValue,
        real: realValue,
      };
      
      if (isTaxExpanded && taxSlab > 0) {
        const interest = nominalValue - principal;
        const postTaxInterest = interest * (1 - taxSlab / 100);
        const postTaxValue = principal + postTaxInterest;
        item.postTaxReal = Math.round(postTaxValue / Math.pow(1 + inflationRate, t));
      }
      
      data.push(item);
    }
    return data;
  }, [principal, fdRate, tenure, isTaxExpanded, taxSlab]);

  const donutData = useMemo(() => {
    const base = [
      { name: barLabels.principal, value: principal, color: '#52525b' }, // zinc-600
    ];
    
    if (isTaxExpanded && taxSlab > 0) {
      const taxAmount = result.grossInterest * (taxSlab / 100);
      const postTaxInterest = result.grossInterest - taxAmount;
      base.push({ name: barLabels.interest, value: postTaxInterest, color: '#10b981' }); // emerald-500
      base.push({ name: barLabels.tax, value: taxAmount, color: '#f87171' }); // red-400
    } else {
      base.push({ name: barLabels.interest, value: result.grossInterest, color: '#10b981' });
    }
    return base;
  }, [principal, result.grossInterest, isTaxExpanded, taxSlab, barLabels]);

  const waterfallData = useMemo(() => {
    const tenureYears = tenure / 12;
    const inflationRate = INFLATION_RATE / 100;
    const maturityAmount = result.maturityAmount;
    const grossInterest = result.grossInterest;
    
    let inflationErosion;
    let finalRealValue;

    if (isTaxExpanded && taxSlab > 0) {
      const taxAmount = grossInterest * (taxSlab / 100);
      const postTaxMaturity = maturityAmount - taxAmount;
      const postTaxRealMaturityValue = postTaxMaturity / Math.pow(1 + inflationRate, tenureYears);
      inflationErosion = postTaxMaturity - postTaxRealMaturityValue;
      finalRealValue = postTaxRealMaturityValue;
    } else {
      const realMaturityValue = maturityAmount / Math.pow(1 + inflationRate, tenureYears);
      inflationErosion = maturityAmount - realMaturityValue;
      finalRealValue = realMaturityValue;
    }
    
    const data = [
      { name: barLabels.principal, value: principal, fill: '#52525b', label: barLabels.principal }, // zinc-600
      { name: barLabels.interest, value: grossInterest, fill: '#10b981', label: barLabels.interest }, // emerald-500
      { name: barLabels.inflation, value: Math.round(inflationErosion), fill: '#f87171', label: barLabels.inflation }, // red-400
    ];

    if (isTaxExpanded && taxSlab > 0) {
      const taxAmount = grossInterest * (taxSlab / 100);
      data.push({ name: barLabels.tax, value: Math.round(taxAmount), fill: '#fbbf24', label: barLabels.tax }); // amber-400
    }

    const isNegativeReturn = inflationErosion > grossInterest;
    data.push({ 
      name: barLabels.realValue, 
      value: Math.round(finalRealValue), 
      fill: isNegativeReturn ? '#f87171' : '#10b981',
      label: barLabels.realValue
    });

    return data;
  }, [principal, result.grossInterest, result.maturityAmount, tenure, isTaxExpanded, taxSlab]);

  const effectivePostTaxRate = (fdRate * (1 - taxSlab / 100)).toFixed(2);

  const CustomBar = (props: any) => {
    const { x, width, payload, fill, y, height, index } = props;
    
    useEffect(() => {
      setBarPositions(prev => {
        const existing = prev.find(p => p.index === index);
        if (existing && existing.x === x && existing.width === width && existing.label === payload.label) return prev;
        const updated = [...prev.filter(p => p.index !== index), { x, width, label: payload.label, index }].sort((a, b) => a.index - b.index);
        return updated;
      });
    }, [x, width, index, payload.label]);

    return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />;
  };

  const fallbackInsightData = useMemo(() => {
    const tenureYears = tenure / 12;
    const realMaturityValue = result.maturityAmount / Math.pow(1.06, tenureYears);
    const inflationErosion = result.maturityAmount - realMaturityValue;
    const realGain = realMaturityValue - principal;
    
    // SIP comparison (Equity 12%)
    const monthlyRate = 0.12 / 12;
    const sipCorpus = principal * Math.pow(1 + monthlyRate, tenure);
    const sipGain = sipCorpus - principal;
    const opportunityCost = sipGain - result.grossInterest;

    const postTaxRealGain = taxDetails.postTaxInterest / Math.pow(1.06, tenureYears) - principal;

    return {
      realMaturityValue,
      inflationErosion,
      realGain,
      sipCorpus,
      sipGain,
      opportunityCost,
      postTaxRealGain
    };
  }, [principal, tenure, result.maturityAmount, result.grossInterest, taxDetails.postTaxInterest]);

  const { insights, chips, systemPrompt } = useMemo(() => {
    const tenureYears = tenure / 12;
    const maturityValue = result.maturityAmount;
    const realMaturityValue = maturityValue / Math.pow(1 + INFLATION_RATE / 100, tenureYears);
    const purchasingPowerLost = maturityValue - realMaturityValue;
    const realWealthCreated = realMaturityValue - principal;
    const inflationErosionPercent = (purchasingPowerLost / maturityValue) * 100;

    const insightsList = [
      `Your investment of **${formatInsightValue(principal)}** will grow to **${formatInsightValue(maturityValue)}** in **${formatInsightValue(tenureYears, 'years')}**.`,
      `Inflation will erode **${formatInsightValue(purchasingPowerLost)}** of your value, leaving you with **${formatInsightValue(realMaturityValue)}** in today's terms.`,
      `Your real wealth (gain above inflation) is **${formatInsightValue(realWealthCreated)}**, after accounting for price rises.`,
      `Inflation will eat up **${formatInsightValue(inflationErosionPercent, 'percent')}** of your total maturity value over **${formatInsightValue(tenureYears, 'years')}**.`
    ].filter(s => !s.includes('₹0') && !s.includes(' 0%'));

    const chipsList = [
      `How does 6% inflation affect my ${formatInsightValue(maturityValue)}?`,
      `What if I reinvest the interest instead?`,
      `How much will my ${formatInsightValue(principal)} be worth in today's money?`,
      `Explain the gap between ${formatInsightValue(maturityValue)} and ${formatInsightValue(realMaturityValue)}.`
    ];

    const prompt = `
      Explain how an FD of **${formatInsightValue(principal)}** grows to **${formatInsightValue(maturityValue)}** over **${formatInsightValue(tenureYears, 'years')}** at **${fdRate}%**.
      Highlight that while the nominal value is **${formatInsightValue(maturityValue)}**, its actual purchasing power in today's terms is **${formatInsightValue(realMaturityValue)}** due to inflation.
      Explain that inflation erodes **${formatInsightValue(purchasingPowerLost)}** (about **${formatInsightValue(inflationErosionPercent, 'percent')}**) of the wealth.
    `.trim();

    return { insights: insightsList, chips: chipsList, systemPrompt: prompt };
  }, [principal, fdRate, tenure, result]);

  const handleSendMessage = async (content: string) => {
    if (questionCount >= MAX_QUESTIONS) return;

    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);
    setShowChatChips(false);
    setQuestionCount(prev => prev + 1);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          sessionId,
          systemPrompt: `${GLOBAL_AI_INSTRUCTION}\n\nContext for this Basic FD calculation:\n${systemPrompt}`,
          context: { principal, fdRate, tenure, citizenType, taxSlab }
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to get AI response');
      }
      
      const assistantMessage: Message = { role: 'assistant', content: data.content };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('AI Chat Error:', error);
      const errorMessage: Message = { 
        role: 'assistant', 
        content: `I'm sorry, I encountered an error: ${error.message}. Please try again.` 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className={cn(
      "space-y-8 transition-colors duration-300",
      theme === 'dark' ? "text-white" : "text-zinc-900",
      isEmbedded ? "p-0" : "p-4 md:p-8 min-h-screen",
      isEmbedded && (theme === 'dark' ? "bg-transparent" : "bg-transparent")
    )}>
      {!isEmbedded && (
        <Helmet>
          <title>FD Calculator — Fixed Deposit Returns Calculator | WhatIff</title>
          <meta name="description" content="Calculate maturity amount and interest earned on your fixed deposit." />
          <link rel="canonical" href="https://whatiff.in/fd-calculator" />
        </Helmet>
      )}
      {/* Header */}
      {!isEmbedded && (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className={cn("text-2xl font-bold flex items-center gap-2 transition-colors duration-300", theme === 'dark' ? "text-white" : "text-zinc-900")}>
              <TrendingUp className="w-6 h-6 text-emerald-500" />
              Basic FD Calculator
            </h1>
            <p className={cn(
              "text-sm transition-colors duration-300",
              theme === 'dark' ? "text-zinc-300" : "text-zinc-600"
            )}>Calculate your fixed deposit returns and tax impact.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExport}
              className={cn("p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-500 hover:text-zinc-900")}
              title="Export to Excel"
            >
              <Download className="w-5 h-5" />
            </button>
            <SaveScenarioButton 
              type="basic_fd" 
              defaultName={`FD — ₹${formatIndianRupees(principal)} at ${fdRate}%`}
              inputs={{ principal, fdRate, tenure, citizenType, taxSlab }} 
              outputs={{ 
                mainResult: taxDetails.postTaxInterest ?? result.grossInterest ?? 0,
                principal: principal ?? 0,
                fdRate: fdRate ?? 0,
                tenure: tenure ?? 0,
                grossInterest: result.grossInterest ?? 0,
                maturityAmount: result.maturityAmount ?? 0,
                realMaturityValue: fallbackInsightData.realMaturityValue ?? 0,
                realReturn: result.realReturn ?? 0,
                realGain: fallbackInsightData.realGain ?? 0,
                inflationErosion: fallbackInsightData.inflationErosion ?? 0,
                tdsDeducted: taxDetails.tdsDeducted ?? 0,
                taxPayable: taxDetails.taxPayable ?? 0,
                postTaxInterest: taxDetails.postTaxInterest ?? result.grossInterest ?? 0,
                postTaxMaturityAmount: taxDetails.postTaxMaturityAmount ?? result.maturityAmount ?? 0,
                postTaxRealReturn: taxDetails.postTaxRealReturn ?? result.realReturn ?? 0,
                effectiveTaxRate: taxSlab ?? 0,
                citizenType: citizenType ?? 'Regular',
                isTaxExpanded: isTaxExpanded ?? false,
                sipCorpus: fallbackInsightData.sipCorpus ?? 0,
                opportunityCost: fallbackInsightData.opportunityCost ?? 0,
              }} 
              onBeforeSave={(outputs) => console.log('Saving Basic FD scenario:', outputs)}
            />
            <button 
              onClick={() => setIsShareOpen(true)}
              className={cn("p-2 rounded-full transition-colors", theme === 'dark' ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-500 hover:text-zinc-900")}
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Controls */}
        <div className="space-y-6 w-full" ref={sliderRef}>
          <SliderWithInput
            label="Principal Amount"
            value={principal}
            min={10000}
            max={5000000}
            step={10000}
            onChange={setPrincipal}
            formatDisplay={(v) => formatCurrency(v)}
          />

          <SliderWithInput
            label="FD Interest Rate"
            value={fdRate}
            min={2.5}
            max={9.5}
            step={0.25}
            onChange={setFdRate}
            formatDisplay={(v) => `${v}%`}
            footerLabel="Public sector banks: 2.5–7% · Small finance banks: up to 9.5%"
          />

          <SliderWithInput
            label="Tenure"
            value={tenure}
            min={3}
            max={60}
            step={3}
            onChange={setTenure}
            formatDisplay={(v) => `${v} Months`}
            footerLabel="Best rates typically between 12–36 months"
          />

          <div className={cn("pt-4 border-t space-y-6 transition-colors duration-300", theme === 'dark' ? "border-white/5" : "border-zinc-100")}>
            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Citizen Type</label>
              <div className="flex gap-2">
                {['Regular', 'Senior'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setCitizenType(type as any)}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-xl text-xs font-bold border transition-all",
                      citizenType === type 
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" 
                        : (theme === 'dark' ? "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300")
                    )}
                  >
                    {type === 'Senior' ? 'Senior Citizen 60+' : 'Regular'}
                  </button>
                ))}
              </div>
            </div>

            <div className={cn("pt-4 border-t transition-colors duration-300", theme === 'dark' ? "border-white/5" : "border-zinc-100")}>
              <button 
                onClick={() => setIsTaxExpanded(!isTaxExpanded)}
                className={cn("flex items-center gap-2 transition-colors text-[13px] font-medium", theme === 'dark' ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-900")}
              >
                Personalise for my tax situation
                <ChevronDown className={cn("w-4 h-4 transition-transform", isTaxExpanded && "rotate-180")} />
              </button>
              
              <AnimatePresence>
                {isTaxExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-6 space-y-6">
                      <SliderWithInput
                        label="Effective Tax Rate"
                        value={taxSlab}
                        min={0}
                        max={30}
                        step={1}
                        onChange={setTaxSlab}
                        formatDisplay={(v) => `${v}%`}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div className={cn(
          "p-8 space-y-8 flex flex-col w-full h-full transition-all duration-300",
          theme === 'dark' ? "glass-card" : "bg-white border border-zinc-200 shadow-sm rounded-2xl"
        )}>
          {/* TDS Warning Box */}
          <div>
            {taxDetails.isTDSApplicable ? (
              <div className={cn(
                "p-3 border rounded-lg flex gap-2 items-start transition-colors duration-300",
                theme === 'dark' ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-100"
              )}>
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className={cn(
                  "text-[11px] leading-relaxed transition-colors duration-300",
                  theme === 'dark' ? "text-amber-200/80" : "text-amber-800"
                )}>
                  Your annualized interest of {formatCurrency(taxDetails.annualInterest)} exceeds the {formatCurrency(taxDetails.threshold)} TDS threshold for {citizenType === 'Senior' ? 'Senior Citizen' : 'Regular Citizen'} — your bank will deduct TDS at 10%.
                  {isTaxExpanded && taxSlab > 0 && (
                    <> TDS is deducted on gross interest before your income tax calculation. Your post-tax interest after your {taxSlab}% slab is {formatCurrency(taxDetails.postTaxInterest)}.</>
                  )}
                </p>
              </div>
            ) : (
              <div className={cn(
                "p-3 border rounded-lg flex gap-2 items-start transition-colors duration-300",
                theme === 'dark' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100"
              )}>
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className={cn(
                  "text-[11px] leading-relaxed transition-colors duration-300",
                  theme === 'dark' ? "text-emerald-200/80" : "text-emerald-800"
                )}>
                  Your annualized interest of {formatCurrency(taxDetails.annualInterest)} is below the {formatCurrency(taxDetails.threshold)} TDS threshold for {citizenType === 'Senior' ? 'Senior Citizen' : 'Regular Citizen'} — no TDS will be deducted by your bank.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className={cn(
                "text-xs uppercase tracking-wider font-semibold",
                theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
              )}>Gross Interest</p>
              <p className={cn(
                "text-xl font-bold",
                theme === 'dark' ? "text-white" : "text-zinc-900"
              )}>{formatCurrency(result.grossInterest)}</p>
            </div>
            <div className="space-y-1">
              <p className={cn(
                "text-xs uppercase tracking-wider font-semibold",
                theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
              )}>Real Return</p>
              <p className={cn(
                "text-xl font-bold",
                theme === 'dark' ? "text-white" : "text-zinc-900"
              )}>{result.realReturn}%</p>
              <p className={cn(
                "text-[10px]",
                theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
              )}>
                In today's money your {formatIndianRupees(result.maturityAmount)} will be worth {formatIndianRupees(realMaturityValue)}
              </p>
            </div>
          </div>

          <div className={cn(
            "pt-6 border-t",
            theme === 'dark' ? "border-white/5" : "border-zinc-100"
          )}>
            <p className={cn(
              "text-xs uppercase tracking-wider font-semibold mb-1",
              theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
            )}>Maturity Amount</p>
            <p className={cn(
              "text-4xl font-bold",
              theme === 'dark' ? "text-white" : "text-zinc-900"
            )}>{formatCurrency(result.maturityAmount)}</p>
          </div>

          <AnimatePresence>
            {isTaxExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "pt-6 border-t space-y-4",
                  theme === 'dark' ? "border-white/5" : "border-zinc-100"
                )}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className={cn(
                      "text-xs uppercase tracking-wider font-semibold",
                      theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
                    )}>TDS Deducted</p>
                    <p className="text-lg font-bold text-red-500">{formatCurrency(taxDetails.tdsDeducted)}</p>
                    <p className={cn(
                      "text-[10px]",
                      theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
                    )}>
                      {taxDetails.isTDSApplicable 
                        ? "Submit Form 15G/15H if total income is below taxable limit" 
                        : "Below TDS threshold — no TDS deducted"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className={cn(
                      "text-xs uppercase tracking-wider font-semibold",
                      theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
                    )}>Tax Payable at Slab</p>
                    <p className="text-lg font-bold text-red-500">{formatCurrency(taxDetails.taxPayable)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className={cn(
                      "text-xs uppercase tracking-wider font-semibold",
                      theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
                    )}>Post-Tax Interest</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(taxDetails.postTaxInterest)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className={cn(
                      "text-xs uppercase tracking-wider font-semibold",
                      theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
                    )}>Post-Tax Real Return</p>
                    <p className={cn(
                      "text-lg font-bold",
                      theme === 'dark' ? "text-white" : "text-zinc-900"
                    )}>{taxDetails.postTaxRealReturn}%</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <p className={cn(
            "text-[11px] leading-relaxed px-2 mt-4",
            theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
          )}>
            Assumes 6% annual inflation — India's 10-year CPI average.
          </p>
          
          <InfoBox 
            level={result.realReturn > 1 ? 'safe' : (result.realReturn >= 0 ? 'moderate' : 'high')}
            message={
              result.realReturn > 1 
                ? "A healthy real return for a risk-free instrument. Your emergency fund is holding its value." 
                : result.realReturn >= 0 
                  ? "Inflation is quietly eating your savings. FD preserves wealth — it does not build it." 
                  : "Every year this money sits in an FD it buys less than it did before. This is the silent cost of playing it too safe."
            }
            className="w-full mt-auto"
          />
        </div>
      </div>

      {/* Charts Section */}
      {!isEmbedded && (
        <div className="grid grid-cols-1 lg:grid-cols-[35fr_65fr] gap-8 my-12">
          {/* Chart 1: Donut */}
          <div className={cn(
            "p-6 min-w-0 transition-all duration-300",
            theme === 'dark' ? "glass-card" : "bg-white border border-zinc-200 shadow-sm rounded-2xl"
          )}>
            <h3 className={cn(
              "text-sm font-semibold mb-6 uppercase tracking-widest",
              theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
            )}>YOUR MONEY SPLIT</h3>
            <div className="h-[300px] w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    cursor={false}
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', 
                      border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e4e4e7', 
                      borderRadius: '8px', 
                      color: theme === 'dark' ? '#f4f4f5' : '#09090b' 
                    }}
                    itemStyle={{ color: theme === 'dark' ? '#f4f4f5' : '#09090b' }}
                    formatter={(value: number) => [formatIndianRupees(value), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className={cn(
                  "text-xl md:text-2xl font-bold text-center px-4",
                  theme === 'dark' ? "text-white" : "text-zinc-900"
                )}>
                  {formatIndianRupees(isTaxExpanded && taxSlab > 0 ? taxDetails.postTaxMaturityAmount : result.maturityAmount)}
                </p>
                {isTaxExpanded && taxSlab > 0 && (
                  <p className={cn(
                    "text-[10px] font-medium uppercase tracking-widest mt-0.5",
                    theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
                  )}>post-tax</p>
                )}
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", theme === 'dark' ? "bg-zinc-600" : "bg-zinc-400")} />
                <span className={cn(
                  "text-xs",
                  theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
                )}>Principal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className={cn(
                  "text-xs",
                  theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
                )}>Interest</span>
              </div>
              {isTaxExpanded && taxSlab > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className={cn(
                    "text-xs",
                    theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
                  )}>Tax</span>
                </div>
              )}
            </div>
          </div>
  
          <div key={isTaxExpanded && taxSlab > 0 ? "tax-on" : "tax-off"} className={cn(
            "p-6 min-w-0 transition-all duration-300",
            theme === 'dark' ? "glass-card" : "bg-white border border-zinc-200 shadow-sm rounded-2xl"
          )}>
            <h3 className={cn(
              "text-sm font-semibold mb-6 uppercase tracking-widest",
              theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
            )}>WHERE YOUR MONEY GOES</h3>
            <div className="flex flex-col gap-0">
              <div className="h-[300px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={waterfallData} 
                    margin={{ top: 30, right: 20, bottom: 100, left: 20 }}
                    barSize={48}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={false}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke={theme === 'dark' ? "#52525b" : "#71717a"} 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => `₹${(val/100000).toFixed(2)}L`}
                    />
                    <RechartsTooltip 
                      cursor={false}
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? '#18181b' : '#fff', 
                        border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e4e4e7', 
                        borderRadius: '8px', 
                        color: theme === 'dark' ? '#fff' : '#18181b' 
                      }}
                      itemStyle={{ color: theme === 'dark' ? '#fff' : '#18181b' }}
                      formatter={(value: number) => [formatIndianRupees(value), '']}
                    />
                    <Bar 
                      key={`bar-${isTaxExpanded}-${taxSlab}`}
                      dataKey="value" 
                      radius={[4, 4, 0, 0]}
                      shape={<CustomBar />}
                    >
                      {waterfallData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                        <LabelList 
                          dataKey="value" 
                          position="top"
                          offset={8}
                          formatter={(val: number) => {
                            if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
                            if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
                            return formatIndianRupees(val);
                          }}
                          fill={theme === 'dark' ? "#a1a1aa" : "#71717a"}
                          fontSize={10}
                          fontWeight="bold"
                        />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
  
                {/* Absolutely Positioned Labels Row */}
                <div key={`labels-${isTaxExpanded}-${taxSlab}`} className="absolute bottom-[100px] md:bottom-[80px] left-0 w-full pointer-events-none h-0">
                  {barPositions
                    .filter(pos => pos.index < waterfallData.length)
                    .map((pos, idx) => {
                      const isInflation = pos.label === barLabels.inflation;
                      const isRealValue = pos.label === barLabels.realValue;
                      const isPostTax = pos.label.includes('(Post-Tax)');
  
                      return (
                        <div 
                          key={idx} 
                          className="absolute flex flex-col items-center min-w-[100px]"
                          style={{ 
                            left: pos.x + pos.width / 2, 
                            transform: 'translateX(-50%)',
                            top: '12px'
                          }}
                        >
                          <div className="md:rotate-0 -rotate-90 md:origin-center origin-center whitespace-nowrap md:whitespace-normal">
                            <span className={cn(
                              "text-[10px] text-center leading-tight",
                              theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
                            )}>
                              {isInflation ? (
                                <>
                                  <span className="hidden md:block">{pos.label.split(' ').slice(0, 2).join(' ')}</span>
                                  <span className="hidden md:block">{pos.label.split(' ').slice(2).join(' ')}</span>
                                  <span className="md:hidden">{pos.label}</span>
                                </>
                              ) : isRealValue ? (
                                <>
                                  <span className="hidden md:block">{barLabels.realValue.split(' ').slice(0, 2).join(' ')}</span>
                                  <span className="hidden md:block">{barLabels.realValue.split(' ').slice(2, 4).join(' ')}</span>
                                  {isPostTax && <span className="hidden md:block">(Post-Tax)</span>}
                                  <span className="md:hidden">{pos.label}</span>
                                </>
                              ) : (
                                pos.label
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
              {isTaxExpanded && taxSlab > 0 && (
                <p className={cn(
                  "text-[11px] mt-3 italic",
                  theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
                )}>
                  Real value shown after income tax at {taxSlab}% and adjusted for {INFLATION_RATE}% inflation.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <WhatiffInsights 
        calculatorType="fd" 
        insights={insights}
        chips={chips}
        systemPrompt={systemPrompt}
        results={{ ...result, totalInterest: result.grossInterest, principal, interestRate: fdRate }} 
        onAskAI={onAskAI}
      />

      <AIChat 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        input={chatInput}
        setInput={setChatInput}
        onSend={handleSendMessage}
        isLoading={isChatLoading}
        showChips={showChatChips}
        chips={chips}
        questionCount={questionCount}
        maxQuestions={MAX_QUESTIONS}
      />

      {/* Nudge Card */}
      {!isEmbedded && (
        <div className={cn(
          "p-6 border-l-4 border-emerald-500 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300",
          theme === 'dark' ? "glass-card" : "bg-white border border-zinc-200 shadow-sm rounded-2xl"
        )}>
          <div className="space-y-2">
            <p className={cn(
              "font-medium",
              theme === 'dark' ? "text-white" : "text-zinc-900"
            )}>
              💡 What if you staggered this FD?
            </p>
            <p className={cn(
              "text-sm max-w-xl",
              theme === 'dark' ? "text-zinc-400" : "text-zinc-600"
            )}>
              Splitting {formatCurrency(principal)} into multiple FDs maturing every few months gives you liquidity without sacrificing returns.
            </p>
          </div>
          <button 
            onClick={() => onNavigate('staggered_fd', { principal })}
            className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold text-sm transition-colors whitespace-nowrap"
          >
            See Staggered FD <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banks Section */}
      {!isEmbedded && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={cn(
              "text-sm font-bold uppercase tracking-widest",
              theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
            )}>Top Banks</h3>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
            {TOP_BANKS.map((bank) => (
              <div 
                key={bank.name} 
                className={cn(
                  "flex-shrink-0 w-[160px] p-4 space-y-4 border rounded-[12px] transition-all group relative",
                  theme === 'dark' 
                    ? "bg-zinc-800 border-zinc-700 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                    : "bg-white border-zinc-200 hover:shadow-md"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-lg bg-white p-1.5 flex items-center justify-center overflow-hidden">
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${bank.domain}&sz=64`} 
                      alt={bank.name} 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-400 font-bold text-xl">${bank.name[0]}</div>`;
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    {bank.rating}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm truncate">{bank.name}</h4>
                  <p className="text-xs text-zinc-400">Up to <span className="text-white font-bold">{bank.rate}%</span></p>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {bank.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-bold text-zinc-400 bg-zinc-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <button 
                  onClick={() => {
                    setFdRate(bank.rate);
                    sliderRef.current?.scrollIntoView({ behavior: 'smooth' });
                    window.open(bank.url, '_blank');
                  }}
                  className="w-full py-2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/5 transition-all"
                >
                  Use this rate <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-500">
            Rates are indicative for general public, tenure 1–3 years. Verify current rates on the bank's official website.
          </p>
        </div>
      )}

      <ShareVision 
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title="Basic FD Strategy Vision"
        description={`Your FD of ${formatCurrency(principal)} at ${fdRate}% will grow to ${formatCurrency(result.maturityAmount)}.`}
        mainValue={result.realReturn}
        mainLabel="Real Return"
        secondaryValues={[
          { label: 'Gross Interest', value: result.grossInterest },
          { label: 'Real Return', value: `${result.realReturn}%` },
          { label: 'Tenure', value: `${tenure} Months` },
          { label: 'Post-Tax Interest', value: taxDetails.postTaxInterest }
        ]}
        insight={isTaxExpanded && taxSlab > 0
          ? `After ${taxSlab}% tax your FD earns ₹${taxDetails.postTaxInterest} — a post-tax real return of ${taxDetails.postTaxRealReturn}% after ${INFLATION_RATE}% inflation. The same amount in an equity mutual fund at 12% historical returns would have grown to ${formatCurrency(sipCorpus)} over the same period.`
          : `Your ${formatCurrency(principal)} FD earns ${formatCurrency(result.grossInterest)} at ${fdRate}% — but after ${INFLATION_RATE}% inflation your money is worth only ${formatCurrency(realMaturityValue)} in today's purchasing power. You lost ${formatCurrency(Math.abs(realGain))} in real terms.`}
        category="grow"
        inputs={{ 
          principal, 
          fdRate, 
          tenure, 
          citizenType, 
          taxSlab, 
          grossInterest: result.grossInterest,
          realReturn: result.realReturn,
          isTaxExpanded,
          ...fallbackInsightData
        }}
        onSave={() => setIsShareOpen(false)}
      />
    </div>
  );
}
