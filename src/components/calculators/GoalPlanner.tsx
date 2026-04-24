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
import { Target, Info, Share2, Download, Instagram, MessageCircle, Linkedin, Baby, ArrowRight, ArrowUpRight } from 'lucide-react';
import { GLOBAL_AI_INSTRUCTION } from '../../aiInsightPrompt';
import { INFLATION_RATE } from '../../lib/calculators';
import { formatCurrency, cn, formatCompactNumber, formatIndianRupees, formatIndianShort, formatCurrencyForAI } from '../../lib/utils';
import SaveScenarioButton from '../SaveScenarioButton';
import ShareVision from '../ShareVision';
import InvestmentBrokerSection from '../InvestmentBrokerSection';
import InfoBox, { RiskLevel } from '../InfoBox';
import { exportToExcel } from '../../lib/exportUtils';
import WhatiffInsights from '../WhatiffInsights';
import SliderWithInput from '../SliderWithInput';
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
          systemPrompt: `${GLOBAL_AI_INSTRUCTION}\n\nContext for this Goal calculation:\n${chatContext?.systemPrompt || ''}`,
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

  const { isOverInvesting, simpleMonthlyNeeded } = useMemo(() => {
    const tenureMonths = years * 12;
    const needed = targetAmount / tenureMonths;
    return {
      isOverInvesting: monthlySIP > needed,
      simpleMonthlyNeeded: Math.round(needed)
    };
  }, [targetAmount, years, monthlySIP]);

  const requiredReturn = useMemo(() => {
    if (isOverInvesting) return 0;
    let low = 0;
    let high = 2; // 200% annual return
    const n = years * 12;

    for (let i = 0; i < 100; i++) {
      const r = (low + high) / 2;
      const monthlyRate = Math.pow(1 + r, 1 / 12) - 1;
      let fv = 0;
      if (monthlyRate === 0) {
        fv = monthlySIP * n;
      } else {
        fv = monthlySIP * ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate) * (1 + monthlyRate);
      }

      if (fv < targetAmount) {
        low = r;
      } else {
        high = r;
      }
    }
    return Math.round(low * 1000) / 10;
  }, [targetAmount, years, monthlySIP]);

  const totalInvestment = monthlySIP * years * 12;
  const totalEarnings = isOverInvesting ? 0 : targetAmount - totalInvestment;
  const wealthGainPercent = isOverInvesting ? 0 : Math.round((totalEarnings / targetAmount) * 100);
  const finalCorpus = isOverInvesting ? totalInvestment : targetAmount;

  const yearlyData = useMemo(() => {
    const data = [];
    const monthlyRate = Math.pow(1 + requiredReturn / 100, 1 / 12) - 1;
    const n = years * 12;
    let balance = 0;
    let investment = 0;

    for (let m = 1; m <= n; m++) {
      balance = (balance + monthlySIP) * (1 + monthlyRate);
      investment += monthlySIP;

      if (m % 12 === 0) {
        data.push({
          year: m / 12,
          balance: Math.round(balance),
          investment: Math.round(investment),
        });
      }
    }
    return data;
  }, [requiredReturn, years, monthlySIP]);

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

  const { results, aiData, insights, chips, systemPrompt } = useMemo(() => {
    const totalInvested = monthlySIP * years * 12;
    const inflationAdjustedPrincipal = totalInvested * Math.pow(1 + INFLATION_RATE / 100, years);
    const purchasingPowerLoss = inflationAdjustedPrincipal - totalInvested;
    const realSurplus = targetAmount - inflationAdjustedPrincipal;
    
    const realReturnRate = ((1 + requiredReturn / 100) / (1 + INFLATION_RATE / 100) - 1) * 100;
    const monthlyRealRate = Math.pow(1 + realReturnRate / 100, 1 / 12) - 1;
    const n = years * 12;
    let realCorpus = 0;
    for (let m = 1; m <= n; m++) {
      realCorpus = (realCorpus + monthlySIP) * (1 + monthlyRealRate);
    }
    const monthlyRealGain = (realCorpus - totalInvested) / n;

    // Pre-calculated strings for AI to prevent hallucination
    const principalToGoalRatio = ((totalInvested / targetAmount) * 100).toFixed(1);
    const growthToGoalRatio = (100 - parseFloat(principalToGoalRatio)).toFixed(1);
    const formattedTotalInvested = formatIndianShort(totalInvested);
    const formattedTargetAmount = formatIndianShort(targetAmount);
    const formattedInflationAdjustedPrincipal = formatIndianShort(inflationAdjustedPrincipal);
    const formattedPurchasingPowerLoss = formatIndianShort(purchasingPowerLoss);
    const formattedRealSurplus = formatIndianShort(realSurplus);

    const totalEarnings = isOverInvesting ? 0 : targetAmount - totalInvested;
    const wealthGainPercent = isOverInvesting ? 0 : Math.round((totalEarnings / targetAmount) * 100);

    const yearlyData = [];
    const monthlyRate = Math.pow(1 + requiredReturn / 100, 1 / 12) - 1;
    let balance = 0;
    let investment = 0;

    for (let m = 1; m <= n; m++) {
      balance = (balance + monthlySIP) * (1 + monthlyRate);
      investment += monthlySIP;

      if (m % 12 === 0) {
        yearlyData.push({
          year: m / 12,
          balance: Math.round(balance),
          investment: Math.round(investment),
        });
      }
    }

    const results = {
      goalName,
      targetAmount,
      years,
      monthlySIP,
      requiredReturn,
      totalInvested,
      inflationAdjustedPrincipal,
      purchasingPowerLoss,
      realSurplus,
      realReturnRate,
      realCorpus,
      monthlyRealGain,
      principalToGoalRatio,
      growthToGoalRatio,
      formattedTotalInvested,
      formattedTargetAmount,
      formattedInflationAdjustedPrincipal,
      formattedPurchasingPowerLoss,
      formattedRealSurplus,
      totalEarnings,
      wealthGainPercent,
      yearlyData
    };

    const target = targetAmount;
    const wealthGain = target - totalInvested;
    const principalPercent = (totalInvested / target) * 100;
    const growthPercent = 100 - principalPercent;
    const realValue = target / Math.pow(1 + INFLATION_RATE / 100, years);

    const insightsList = [
      `To reach **${formatInsightValue(target)}** in **${formatInsightValue(years, 'years')}**, you need a **${formatInsightValue(requiredReturn, 'percent')}** annual return.`,
      `Your total investment of **${formatInsightValue(totalInvested)}** will grow by **${formatInsightValue(wealthGain)}** to meet your goal.`,
      `Inflation will make your **${formatInsightValue(target)}** goal feel like **${formatInsightValue(realValue)}** in today's terms.`,
      `You are contributing **${formatInsightValue(principalPercent, 'percent')}** of the goal, while market growth provides **${formatInsightValue(growthPercent, 'percent')}**.`
    ].filter(s => !s.includes('₹0') && !s.includes(' 0%'));

    const chipsList = [
      `Is a ${formatInsightValue(requiredReturn, 'percent')} return realistic?`,
      `What if I increase my SIP by ₹5,000?`,
      `How does inflation affect my ${formatInsightValue(target)} goal?`,
      `Show me the asset allocation for this goal.`
    ];

    const prompt = `
      Explain the plan to reach a **${formatInsightValue(target)}** goal in **${formatInsightValue(years, 'years')}** with a **${formatInsightValue(monthlySIP)}** SIP.
      Highlight that the required return is **${formatInsightValue(requiredReturn, 'percent')}**.
      Explain that the total investment is **${formatInsightValue(totalInvested)}** and the wealth gain is **${formatInsightValue(wealthGain)}**.
    `.trim();

    return {
      results,
      insights: insightsList,
      chips: chipsList,
      systemPrompt: prompt,
      aiData: {
        goalName,
        targetAmount: formatCurrencyForAI(targetAmount),
        years,
        monthlySIP: formatCurrencyForAI(monthlySIP),
        requiredReturn: `${requiredReturn}%`,
        totalInvested: formatCurrencyForAI(totalInvested),
        realCorpus: formatCurrencyForAI(realCorpus),
        principalToGoalRatio: `${principalToGoalRatio}%`,
        growthToGoalRatio: `${growthToGoalRatio}%`,
        formattedTotalInvested,
        formattedTargetAmount,
        formattedRealSurplus
      }
    };
  }, [goalName, targetAmount, years, monthlySIP, requiredReturn]);

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
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-amber-600">
                <Info className="w-4 h-4" />
                <p className="text-sm font-bold uppercase tracking-wider">Over-Investing Detected</p>
              </div>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Your monthly SIP of <span className="text-zinc-900 font-medium">{formatCurrency(monthlySIP)}</span> already covers this goal without any market returns. 
                You only need <span className="text-zinc-900 font-medium">{formatIndianRupees(simpleMonthlyNeeded)}</span> per month to reach <span className="text-zinc-900 font-medium">{formatCurrency(targetAmount)}</span> in {years} years. 
                Consider reducing your SIP or setting a bigger goal.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500">What's your goal?</label>
            <input 
              type="text" 
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="e.g. Retirement, Dream Home, World Tour"
              className={cn(
                "w-full border rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-all shadow-sm",
                isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-zinc-200 text-zinc-900"
              )}
            />
          </div>

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
            label="Monthly SIP"
            value={monthlySIP}
            min={500}
            max={200000}
            step={500}
            onChange={setMonthlySIP}
            formatDisplay={(v) => formatCurrency(v)}
          />
        </div>

        {/* Results Card */}
        <div className={cn(
          "glass-card p-8 space-y-8 flex flex-col w-full h-full transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Monthly SIP</p>
              <p className={cn("text-xl font-bold", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(monthlySIP)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Required Return Rate</p>
              <p className={cn("text-xl font-bold", requiredReturn > 15 ? "text-red-500" : "text-emerald-500")}>
                {requiredReturn}% <span className="text-[10px] uppercase">p.a</span>
              </p>
              {isOverInvesting && (
                <p className="text-[10px] text-zinc-500 leading-tight mt-1">
                  No market returns needed — your monthly SIP contributions alone exceed this goal.
                </p>
              )}
            </div>
          </div>
          <div className={cn("grid grid-cols-2 gap-4 pt-6 border-t", isDark ? "border-white/5" : "border-zinc-100")}>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Invested</p>
              <p className={cn("text-lg font-bold", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(totalInvestment)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Wealth Gain</p>
              <p className={cn("text-lg font-bold", isOverInvesting ? "text-zinc-500" : "text-emerald-500")}>
                +{formatCurrency(totalEarnings)}
              </p>
            </div>
          </div>
          
          {!isOverInvesting && (
            <InfoBox 
              level={requiredReturn > 15 ? 'high' : requiredReturn > 12 ? 'moderate' : 'safe'}
              message={requiredReturn > 15 
                ? "This goal requires extremely high returns. Consider increasing your SIP or timeline."
                : `To reach ${formatCurrency(targetAmount)} in ${years} years with ${formatCurrency(monthlySIP)} SIP, you need a ${requiredReturn}% annual return.`}
              className="w-full mt-auto"
            />
          )}
        </div>
      </div>

      {isOverInvesting && (
        <div className={cn(
          "p-6 rounded-2xl border-l-4 border-emerald-500 shadow-xl space-y-2 transition-colors duration-300",
          isDark ? "bg-zinc-900" : "bg-white border-zinc-200"
        )}>
          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
            WHATIFF INSIGHT
          </p>
          <p className={cn("text-sm leading-relaxed transition-colors duration-300", isDark ? "text-zinc-300" : "text-zinc-600")}>
            With <span className={cn("font-medium", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(monthlySIP)}</span> per month for {years} years you will accumulate <span className={cn("font-medium", isDark ? "text-white" : "text-zinc-900")}>{formatIndianRupees(finalCorpus)}</span> — <span className={cn("font-medium", isDark ? "text-white" : "text-zinc-900")}>{formatIndianRupees(finalCorpus - targetAmount)}</span> more than your <span className={cn("font-medium", isDark ? "text-white" : "text-zinc-900")}>{formatIndianRupees(targetAmount)}</span> goal. 
            Reduce your SIP to <span className={cn("font-medium", isDark ? "text-white" : "text-zinc-900")}>{formatIndianRupees(simpleMonthlyNeeded)}</span> and redirect the <span className={cn("font-medium", isDark ? "text-white" : "text-zinc-900")}>{formatIndianRupees(monthlySIP - simpleMonthlyNeeded)}</span> difference to a higher-growth instrument, or set a bigger goal that puts this capital to work.
          </p>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Donut Chart */}
        <div className={cn(
          "glass-card p-6 min-w-0 transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-6">Wealth Breakdown</h3>
          <div className="h-[300px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Principal', value: results.totalInvested },
                    { name: 'Wealth Gain', value: Math.max(0, results.totalEarnings) }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#d1d5db" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#18181b' : '#ffffff', 
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e4e4e7', 
                    borderRadius: '8px' 
                  }}
                  itemStyle={{ color: isDark ? '#f4f4f5' : '#09090b' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
              </PieChart>
            </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className={cn("text-3xl font-bold", isDark ? "text-emerald-500" : "text-emerald-600")}>
                  {results.wealthGainPercent}%
                </p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Wealth Gain</p>
              </div>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-zinc-400" />
              <span className="text-xs text-zinc-500">Principal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-500">Wealth Gain</span>
            </div>
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
              <AreaChart data={results.yearlyData}>
                <defs>
                  <linearGradient id="colorValueGoal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                  tickFormatter={(val) => formatCompactNumber(val)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#18181b' : '#ffffff', 
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e4e4e7', 
                    borderRadius: '8px',
                    color: isDark ? '#f4f4f5' : '#09090b'
                  }}
                  itemStyle={{ color: isDark ? '#f4f4f5' : '#09090b' }}
                  formatter={(value: number) => [formatCurrency(value), 'Value']}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValueGoal)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="investment" 
                  stroke="#3f3f46" 
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Asset Allocation Section */}
      {!isOverInvesting && (
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
                  onClick={() => setMonthlySIP(prev => Math.min(prev + 5000, 200000))}
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


      {!isOverInvesting && (
        <WhatiffInsights 
          calculatorType="goal" 
          insights={insights}
          chips={chips}
          systemPrompt={systemPrompt}
          results={results} 
          onAskAI={handleAskAI}
        />
      )}

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
        chips={chatContext?.chips}
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
