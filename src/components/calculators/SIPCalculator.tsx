import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, Info, Share2, Download, ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GLOBAL_AI_INSTRUCTION } from '../../aiInsightPrompt';
import { calculateSIP, INFLATION_RATE } from '../../lib/calculators';
import { formatCurrency, formatCompactNumber, cn, formatIndianRupees, formatIndianShort, formatCurrencyForAI } from '../../lib/utils';
import SaveScenarioButton from '../SaveScenarioButton';
import ShareVision from '../ShareVision';
import InvestmentBrokerSection from '../InvestmentBrokerSection';
import InfoBox, { RiskLevel } from '../InfoBox';
import { exportToExcel } from '../../lib/exportUtils';
import WhatiffInsights from '../WhatiffInsights';
import SliderWithInput from '../SliderWithInput';
import AIChat from '../AIChat';
import { Screen } from '../../App';
import { ThemeContext } from '../../contexts/ThemeContext';

interface SIPCalculatorProps {
  onBack: () => void;
  onNavigate: (screen: Screen, params?: any) => void;
  isEmbedded?: boolean;
  onValuesChange?: (values: { monthlyInvestment: number; annualRate: number; years: number; stepUp: number }) => void;
  onAskAI?: (context?: any, chips?: string[], systemPrompt?: string) => void;
}

const safeNum = (val: any, fallback = 0): number => {
  const num = Number(val);
  return isNaN(num) || !isFinite(num) ? fallback : num;
};

const formatInsightValue = (val: any, type = 'currency') => {
  const safe = safeNum(val)
  if (type === 'currency') {
    if (safe >= 10000000) return `₹${(safe/10000000).toFixed(2)}Cr`
    if (safe >= 100000) return `₹${(safe/100000).toFixed(2)}L`
    return `₹${Math.round(safe).toLocaleString('en-IN')}`
  }
  if (type === 'percent') return `${safeNum(val, 0).toFixed(2)}%`
  if (type === 'years') return `${Math.round(safeNum(val, 0))} years`
  if (type === 'months') return `${Math.round(safeNum(val, 0))} months`
  return String(safe)
}

export default function SIPCalculator({ onBack, onNavigate, isEmbedded = false, onValuesChange, onAskAI }: SIPCalculatorProps) {
  const theme = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [monthlyInvestment, setMonthlyInvestment] = useState(5000);
  const [annualRate, setAnnualRate] = useState(12);
  const [years, setYears] = useState(10);
  const [stepUp, setStepUp] = useState(0);

  // AI Chat State (Isolated per calculator)
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));
  const MAX_QUESTIONS = 10;

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
          systemPrompt: `${GLOBAL_AI_INSTRUCTION}\n\nContext for this SIP calculation:\n${systemPrompt}`,
          context: { monthlyInvestment, annualRate, years, stepUp }
        }),
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

  useEffect(() => {
    if (onValuesChange) {
      onValuesChange({ monthlyInvestment, annualRate, years, stepUp });
    }
  }, [monthlyInvestment, annualRate, years, stepUp, onValuesChange]);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [showPreFillPill, setShowPreFillPill] = useState(false);

  useEffect(() => {
    const preFill = localStorage.getItem('sipPreFill');
    if (preFill) {
      try {
        const data = JSON.parse(preFill);
        if (data.source === 'landing') {
          setMonthlyInvestment(data.monthlyInvestment);
          setAnnualRate(data.expectedReturn);
          setYears(data.timePeriod);
          if (data.stepUp > 0) setStepUp(data.stepUp);
          setShowPreFillPill(true);
          localStorage.removeItem('sipPreFill');
          setTimeout(() => setShowPreFillPill(false), 3000);
        }
      } catch (e) {
        localStorage.removeItem('sipPreFill');
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setChartReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const riskLevel = useMemo((): RiskLevel => {
    if (annualRate > 15) return 'high';
    if (annualRate > 10) return 'moderate';
    return 'safe';
  }, [annualRate]);

  const handleExport = () => {
    exportToExcel(
      "SIP Calculation",
      `SIP of ${formatCurrency(monthlyInvestment)} at ${annualRate}% for ${years} years`,
      { monthlyInvestment, annualRate, years, stepUp },
      "Future Value",
      result.futureValue,
      [
        { label: 'Total Invested', value: result.totalInvestment },
        { label: 'Est. Returns', value: result.totalEarnings }
      ],
      `At ${annualRate}% returns, your wealth compounds significantly.`
    );
  };

  const { results, aiData, insights, chips, systemPrompt, ...result } = useMemo(() => {
    const res = calculateSIP(monthlyInvestment, annualRate, years, stepUp);
    const regularRes = stepUp > 0 ? calculateSIP(monthlyInvestment, annualRate, years, 0) : res;
    
    // Pre-calculations for AI
    const totalInvestment = res.totalInvestment;
    const tenureYears = years;
    const inflationAdjustedPrincipal = totalInvestment * Math.pow(1 + INFLATION_RATE / 100, tenureYears);
    const purchasingPowerLoss = inflationAdjustedPrincipal - totalInvestment;
    const realSurplus = res.futureValue - inflationAdjustedPrincipal;
    
    const realReturnRate = ((1 + annualRate / 100) / (1 + INFLATION_RATE / 100) - 1) * 100;
    const midpointYear = Math.floor(years / 2);
    const firstHalfWealth = years >= 2 
      ? res.yearlyData[midpointYear - 1].balance - res.yearlyData[midpointYear - 1].investment 
      : 0;
    const totalWealth = res.futureValue - totalInvestment;
    const secondHalfWealth = totalWealth - firstHalfWealth;
    
    const growthComparison = `The wealth created in the second half of your tenure (${formatIndianShort(secondHalfWealth)}) is ${secondHalfWealth > firstHalfWealth ? 'larger' : 'smaller'} than the wealth created in the first half (${formatIndianShort(firstHalfWealth)}).`;
    
    const monthlyRealGain = (res.realCorpus - totalInvestment) / (years * 12);
    const inflationErosionPercent = ((res.purchasingPowerLost / res.futureValue) * 100).toFixed(1);
    const realWealthCreated = res.realCorpus - totalInvestment;

    const results = {
      monthlyInvestment,
      annualRate,
      years,
      stepUp,
      totalValue: res.futureValue,
      totalInvested: totalInvestment,
      totalEarnings: res.totalEarnings,
      realCorpus: res.realCorpus,
      purchasingPowerLost: res.purchasingPowerLost,
      realReturnRate,
      firstHalfWealth,
      secondHalfWealth,
      monthlyRealGain,
      inflationAdjustedPrincipal,
      purchasingPowerLoss,
      realSurplus,
      inflationErosionPercent,
      realWealthCreated,
      growthComparison,
      yearlyData: res.yearlyData
    };

    const extraWealth = res.futureValue - regularRes.futureValue;

    const insights = stepUp > 0 ? [
      `By increasing your SIP by **${formatInsightValue(stepUp, 'percent')}** annually, you reach **${formatInsightValue(res.futureValue)}** in **${formatInsightValue(years, 'years')}**.`,
      `Your step-up strategy adds **${formatInsightValue(extraWealth)}** compared to a regular SIP.`,
      `You will invest a total of **${formatInsightValue(totalInvestment)}** and earn **${formatInsightValue(res.totalEarnings)}** in returns.`,
      `Inflation will erode **${formatInsightValue(res.purchasingPowerLost)}** of your value, leaving you with **${formatInsightValue(res.realCorpus)}** in today's terms.`
    ] : [
      `At **${formatInsightValue(annualRate, 'percent')}** returns, your wealth compounds to **${formatInsightValue(res.futureValue)}** in **${formatInsightValue(years, 'years')}**.`,
      `Inflation will erode **${formatInsightValue(res.purchasingPowerLost)}** of your value, leaving you with **${formatInsightValue(res.realCorpus)}** in today's terms.`,
      `Your real wealth (gain above inflation) is **${formatInsightValue(realWealthCreated)}**, after accounting for price rises.`,
      `Inflation will eat up **${formatInsightValue(inflationErosionPercent, 'percent')}** of your total maturity value over **${formatInsightValue(years, 'years')}**.`
    ];

    const chips = stepUp > 0 ? [
      "How much extra do I earn with step-up?",
      `What if I increase step-up to ${formatInsightValue(stepUp + 5, 'percent')}?`,
      "Show me the yearly investment growth.",
      `Is ${formatInsightValue(annualRate, 'percent')} return realistic for SIP?`
    ] : [
      `How does 6% inflation affect my ${formatInsightValue(res.futureValue)}?`,
      `What if I increase my SIP by 10% every year?`,
      `How much will my ${formatInsightValue(monthlyInvestment)} be worth in today's money?`,
      `Explain the gap between ${formatInsightValue(res.futureValue)} and ${formatInsightValue(res.realCorpus)}.`
    ];

    const systemPrompt = stepUp > 0 ? `
      Explain the power of Step-Up SIP for a starting monthly investment of **₹${formatInsightValue(monthlyInvestment)}**.
      Highlight that an annual increase of **${formatInsightValue(stepUp, 'percent')}** leads to a total wealth of **₹${formatInsightValue(res.futureValue)}**.
      Compare this to a regular SIP which would have resulted in **₹${formatInsightValue(regularRes.futureValue)}**.
      Current parameters:
      - Starting SIP: ₹${monthlyInvestment}
      - Step-up: ${stepUp}%
      - Tenure: ${years} years
      - Expected Return: ${annualRate}%
      - Total Invested: ₹${totalInvestment}
      - Total Wealth: ₹${res.futureValue}
      - Extra Wealth from Step-up: ₹${extraWealth}
    ` : `You are a financial explainer. Explain how a monthly SIP of **${formatInsightValue(monthlyInvestment)}** grows to **${formatInsightValue(res.futureValue)}** over **${formatInsightValue(years, 'years')}** at **${formatInsightValue(annualRate, 'percent')}**.
    Highlight that while the nominal value is **${formatInsightValue(res.futureValue)}**, its actual purchasing power in today's terms is **${formatInsightValue(res.realCorpus)}** due to inflation.
    Explain that inflation erodes **${formatInsightValue(res.purchasingPowerLost)}** (about **${formatInsightValue(inflationErosionPercent, 'percent')}**) of the wealth.
    
    Rules:
    - Use INR for all values.
    - Use bullet points.
    - No advice.
    - Bold all currency values.`;

    return {
      ...res,
      results,
      insights,
      chips,
      systemPrompt,
      aiData: {
        monthlyInvestment: formatCurrencyForAI(monthlyInvestment),
        annualRate: `${annualRate}%`,
        years,
        stepUp: `${stepUp}%`,
        totalValue: formatCurrencyForAI(res.futureValue),
        totalInvested: formatCurrencyForAI(totalInvestment),
        realCorpus: formatCurrencyForAI(res.realCorpus),
        purchasingPowerLost: formatCurrencyForAI(res.purchasingPowerLost),
        realWealthCreated: formatCurrencyForAI(realWealthCreated),
        inflationErosionPercent: `${inflationErosionPercent}%`,
        growthComparison
      }
    };
  }, [monthlyInvestment, annualRate, years, stepUp]);

  return (
    <div className={cn("space-y-8", isEmbedded && "space-y-6 p-0 m-0")}>
      <Helmet>
        <title>SIP Calculator — Plan Your Mutual Fund Returns | WhatIff</title>
        <meta name="description" content="Calculate SIP returns, maturity amount and wealth gained. Free, private, no login required." />
        <link rel="canonical" href="https://whatiff.in/sip-calculator" />
      </Helmet>
      {showPreFillPill && (
        <div 
          style={{ 
            background: 'rgba(16,185,129,0.1)', 
            border: '1px solid rgba(16,185,129,0.2)', 
            color: '#10b981', 
            borderRadius: '99px', 
            padding: '6px 14px', 
            fontSize: '11px', 
            fontWeight: 600, 
            textAlign: 'center', 
            marginBottom: '16px',
            opacity: 1,
            transition: 'opacity 0.5s'
          }}
        >
          ✦ Values carried over from your landing page session
        </div>
      )}
      {!isEmbedded && (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
              SIP Calculator
            </h1>
            <p className="text-zinc-500 text-sm">Systematic Investment Plan growth projection.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExport}
              className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors"
              title="Export to Excel"
            >
              <Download className="w-5 h-5" />
            </button>
            <SaveScenarioButton 
              type="sip" 
              inputs={{ monthlyInvestment, annualRate, years, stepUp }} 
              outputs={{ 
                ...result, 
                mainResult: isFinite(result.futureValue) ? result.futureValue : 0 
              }} 
            />
            <button 
              onClick={() => setIsShareOpen(true)}
              className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Controls */}
        <div className="space-y-6 w-full">
          <SliderWithInput
            label="Monthly Investment"
            value={monthlyInvestment}
            min={500}
            max={100000}
            step={500}
            onChange={setMonthlyInvestment}
            formatDisplay={(v) => formatCurrency(v)}
          />

          <SliderWithInput
            label="Expected Return Rate"
            value={annualRate}
            min={1}
            max={30}
            step={0.5}
            onChange={setAnnualRate}
            formatDisplay={(v) => `${v}%`}
          />

          <SliderWithInput
            label="Time Period"
            value={years}
            min={1}
            max={40}
            step={1}
            onChange={setYears}
            formatDisplay={(v) => `${v} Years`}
          />

          <SliderWithInput
            label="Annual Step-up"
            value={stepUp}
            min={0}
            max={50}
            step={1}
            onChange={setStepUp}
            formatDisplay={(v) => `${v}%`}
          />
        </div>

        {/* Results Section */}
        <div className="space-y-4 w-full h-full flex flex-col">
          {/* Nominal Results Card */}
          <div className={cn(
            "glass-card p-8 space-y-6 flex flex-col w-full relative transition-colors duration-300",
            isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
          )}>
            <div className="absolute top-4 right-6">
              <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">NOMINAL VALUE</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Invested Amount</p>
                <p className={cn("font-bold", isDark ? "text-white" : "text-zinc-900", isEmbedded ? "text-lg" : "text-xl")}>{formatCurrency(result.totalInvestment)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Est. Returns</p>
                <p className={cn("font-bold text-emerald-400", isEmbedded ? "text-lg" : "text-xl")}>+{formatCurrency(result.totalEarnings)}</p>
              </div>
            </div>
            <div className={cn("pt-6 border-t", isDark ? "border-white/5" : "border-zinc-100")}>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Total Value</p>
              <p className={cn("font-bold", isDark ? "text-white" : "text-zinc-900", isEmbedded ? "text-2xl" : "text-4xl")}>{formatCurrency(result.futureValue)}</p>
            </div>
          </div>

          {/* Real Results Card (Inflation Adjusted) */}
          <div className={cn(
            "p-8 space-y-6 flex flex-col w-full rounded-2xl border relative transition-colors duration-300",
            isDark ? "bg-amber-400/[0.03] border-amber-400/20" : "bg-amber-50/50 border-amber-200 shadow-sm"
          )}>
            <div className="absolute top-4 right-6">
              <p className="text-[10px] text-amber-400 uppercase font-bold tracking-widest">IN TODAY'S MONEY</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Purchasing Power Lost</p>
                <p className={cn("font-bold text-amber-400", isEmbedded ? "text-lg" : "text-xl")}>{formatCurrency(result.purchasingPowerLost)}</p>
                <p className="text-[10px] text-zinc-500">Eroded by 6% annual inflation</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Real Returns</p>
                <p className={cn("font-bold", result.realReturns >= 0 ? "text-emerald-400" : "text-red-400", isEmbedded ? "text-lg" : "text-xl")}>
                  {result.realReturns >= 0 ? '+' : ''}{formatCurrency(result.realReturns)}
                </p>
                <p className="text-[10px] text-zinc-500">Actual gain above inflation</p>
              </div>
            </div>
            <div className={cn("pt-6 border-t", isDark ? "border-amber-400/10" : "border-amber-200/50")}>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Real Corpus</p>
              <p className={cn("font-bold text-emerald-400", isEmbedded ? "text-2xl" : "text-4xl")}>{formatCurrency(result.realCorpus)}</p>
              <p className="text-[10px] text-zinc-500 mt-1">What {formatCurrency(result.futureValue)} will buy at today's prices</p>
            </div>
          </div>

          {!isEmbedded && (
            <>
              <p className="text-[11px] text-zinc-500 leading-relaxed px-2">
                Nominal value is the raw rupee amount. Real value is what that amount can actually buy at today's prices. Assumes 6% annual inflation — India's 10-year CPI average.
              </p>
              
              <InfoBox 
                level={riskLevel}
                message="Based on historical data, a diversified equity portfolio often yields 12-15% over long periods (10+ years)."
                className="w-full mt-auto"
              />
            </>
          )}
        </div>
      </div>

      {!isEmbedded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Growth Chart */}
          <div className={cn(
            "glass-card p-6 min-w-0 transition-colors duration-300",
            isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
          )}>
            <h3 className="text-sm font-semibold text-zinc-400 mb-6 uppercase tracking-widest">Growth Projection</h3>
            <div className="h-[300px] w-full" style={{ minWidth: 0, minHeight: 300 }}>
              {chartReady && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={results.yearlyData}>
                    <defs>
                      <linearGradient id="colorValueSIP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                    <XAxis 
                      dataKey="year" 
                      stroke={isDark ? "#52525b" : "#a1a1aa"} 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      label={{ value: 'Years', position: 'insideBottom', offset: -5, fill: isDark ? '#52525b' : '#a1a1aa', fontSize: 10 }}
                    />
                    <YAxis 
                      stroke={isDark ? "#52525b" : "#a1a1aa"} 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => formatCompactNumber(val)}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDark ? '#18181b' : '#ffffff', 
                        border: isDark ? '1px solid #3f3f46' : '1px solid #e4e4e7', 
                        borderRadius: '8px',
                        color: isDark ? '#ffffff' : '#09090b'
                      }}
                      itemStyle={{ color: isDark ? '#ffffff' : '#09090b' }}
                      formatter={(value: number, name: string) => {
                        const label = name === 'balance' ? 'Total Value' : 
                                    name === 'investment' ? 'Invested Amount' : 
                                    name === 'realBalance' ? "Real Value (Today's ₹)" : name;
                        return [formatCurrency(value), label];
                      }}
                      labelFormatter={(label) => `Year ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorValueSIP)" 
                      name="balance"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="realBalance" 
                      stroke="#fbbf24" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="transparent"
                      name="realBalance"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="investment" 
                      stroke="#3f3f46" 
                      strokeWidth={2}
                      fill="transparent"
                      name="investment"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Donut Chart */}
          <div className={cn(
            "glass-card p-6 min-w-0 transition-colors duration-300",
            isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
          )}>
            <h3 className="text-sm font-semibold text-zinc-400 mb-6 uppercase tracking-widest">Wealth Breakdown</h3>
            <div className="h-[300px] w-full relative flex items-center justify-center" style={{ minWidth: 0, minHeight: 300 }}>
              {chartReady && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Principal', value: results.totalInvested },
                        { name: 'Real Gain', value: Math.max(0, results.realWealthCreated) },
                        { name: 'Lost to Inflation', value: results.purchasingPowerLost }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill={isDark ? "#52525b" : "#e4e4e7"} />
                      <Cell fill="#10b981" />
                      <Cell fill="#fbbf24" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDark ? '#18181b' : '#ffffff', 
                        border: isDark ? '1px solid #3f3f46' : '1px solid #e4e4e7', 
                        borderRadius: '8px' 
                      }}
                      itemStyle={{ color: isDark ? '#ffffff' : '#09090b' }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-zinc-900")}>
                  {formatCurrency(results.totalValue)}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Total Value</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-600" />
                <span className="text-[11px] text-zinc-400">Principal: {formatCurrency(results.totalInvested)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-zinc-400">Real Gain: {formatCurrency(results.realWealthCreated)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-[11px] text-zinc-400">Lost to Inflation: {formatCurrency(results.purchasingPowerLost)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <WhatiffInsights 
        calculatorType="sip" 
        results={results} 
        onAskAI={handleAskAI}
        insights={insights}
        chips={chips}
        systemPrompt={systemPrompt}
      />


      {/* Local AI Chat Component */}
      <AIChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        messages={messages}
        input={chatInput}
        setInput={setChatInput}
        onSend={handleSendMessage}
        isLoading={isChatLoading}
        showChips={!hasUserInteracted}
        chips={chips}
        questionCount={questionCount}
        maxQuestions={MAX_QUESTIONS}
      />

      {/* Investment Platforms */}
      {!isEmbedded && <InvestmentBrokerSection />}

      {!isEmbedded && (
        <ShareVision 
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          title="Wealth Growth Vision"
          description={`Your SIP of ${formatCurrency(monthlyInvestment)} could grow to ${formatCurrency(result.futureValue)} in ${years} years.`}
          mainValue={result.futureValue}
          mainLabel="Future Value"
          secondaryValues={[
            { label: 'Total Invested', value: result.totalInvestment },
            { label: 'Real Corpus', value: result.realCorpus },
            { label: 'Power Lost', value: result.purchasingPowerLost },
            { label: 'Real Returns', value: result.realReturns }
          ]}
          insight={`At ${annualRate}% returns, your wealth compounds significantly. However, 6% inflation will erode ${formatCurrency(result.purchasingPowerLost)} of your purchasing power.`}
          category="grow"
          inputs={{ monthlyInvestment, annualRate, years, stepUp, realCorpus: result.realCorpus, purchasingPowerLost: result.purchasingPowerLost, realReturns: result.realReturns }}
          onSave={() => setIsShareOpen(false)}
        />
      )}
    </div>
  );
}
