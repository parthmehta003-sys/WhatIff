import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
  LineChart,
  Line,
  LabelList
} from 'recharts';
import { Palmtree, Info, Share2, AlertTriangle, Download, Baby, ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { GLOBAL_AI_INSTRUCTION } from '../../aiInsightPrompt';
import { calculateRetirement, calculateRequiredSIP } from '../../lib/calculators';
import { formatCurrency, formatCompactNumber, formatIndianRupees, formatIndianShort, formatCurrencyForAI, cn } from '../../lib/utils';
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

interface RetirementCalculatorProps {
  onBack: () => void;
  onNavigate: (screen: any) => void;
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

export default function RetirementCalculator({ onBack, onNavigate, onAskAI }: RetirementCalculatorProps) {
  const theme = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(60);
  const [monthlyExpense, setMonthlyExpense] = useState(50000);
  const [inflation, setInflation] = useState(6);
  const [returnPre, setReturnPre] = useState(12);
  const [returnPost, setReturnPost] = useState(8);
  const [currentSIP, setCurrentSIP] = useState(10000);
  const [existingNetWorth, setExistingNetWorth] = useState(0);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [chartReady, setChartReady] = useState(false);

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
          systemPrompt: `${GLOBAL_AI_INSTRUCTION}\n\nContext for this Retirement calculation:\n${chatContext?.systemPrompt || ''}`,
          context: { currentAge, retirementAge, monthlyExpense, inflation, returnPre, returnPost, currentSIP, existingNetWorth, lifeExpectancy }
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

  useEffect(() => {
    const timer = setTimeout(() => setChartReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const safeValue = (val: number) => (!isNaN(val) && isFinite(val) && val >= 0) ? val : 0;

  const { results, aiData, accumulationData, comparisonData } = useMemo(() => {
    const yearsToRetirement = retirementAge - currentAge;
    const yearsInRetirement = lifeExpectancy - retirementAge;
    
    const calcResult = calculateRetirement(
      currentAge,
      retirementAge,
      monthlyExpense,
      inflation,
      returnPre,
      returnPost,
      lifeExpectancy
    );

    const fvExistingNW = safeValue(existingNetWorth * Math.pow(1 + returnPre / 100, yearsToRetirement));
    const remainingNeeded = safeValue(calcResult.corpusRequired - fvExistingNW);
    
    const reqSIP = yearsToRetirement > 0 
      ? calculateRequiredSIP(remainingNeeded, returnPre, yearsToRetirement)
      : 0;

    const r = Math.pow(1 + returnPre / 100, 1 / 12) - 1;
    const n = yearsToRetirement * 12;
    const projectedSIPCorpus = n > 0 
      ? Math.round(safeValue(currentSIP * (((Math.pow(1 + r, n) - 1) / r) * (1 + r))))
      : 0;

    const totalAtRetirement = projectedSIPCorpus + fvExistingNW;
    const shortfall = Math.max(0, calcResult.corpusRequired - totalAtRetirement);

    const riskLevel: RiskLevel = reqSIP < 10000 ? 'safe' : reqSIP < 30000 ? 'moderate' : 'high';

    // Results object - Single Source of Truth
    const results = {
      currentAge,
      retirementAge,
      lifeExpectancy,
      monthlyExpense,
      inflation,
      returnPre,
      returnPost,
      existingNetWorth,
      currentSIP,
      yearsToRetirement,
      yearsInRetirement,
      futureMonthlyExpense: calcResult.futureMonthlyExpense,
      corpusRequired: calcResult.corpusRequired,
      projectedCorpus: projectedSIPCorpus,
      futureValueOfExistingNetWorth: fvExistingNW,
      totalAtRetirement,
      shortfall,
      requiredSIP: reqSIP,
      netWorthCoversPercent: (fvExistingNW / calcResult.corpusRequired) * 100,
      riskLevel
    };

    // AI Data - Formatted for consumption
    const aiData = {
      currentAge,
      retirementAge,
      yearsToRetirement,
      monthlyExpense: formatCurrencyForAI(monthlyExpense),
      futureMonthlyExpense: formatCurrencyForAI(calcResult.futureMonthlyExpense),
      corpusRequired: formatCurrencyForAI(calcResult.corpusRequired),
      projectedCorpus: formatCurrencyForAI(projectedSIPCorpus),
      totalAtRetirement: formatCurrencyForAI(totalAtRetirement),
      shortfall: formatCurrencyForAI(shortfall),
      requiredSIP: formatCurrencyForAI(reqSIP),
      existingNetWorth: formatCurrencyForAI(existingNetWorth),
      netWorthCoversPercent: results.netWorthCoversPercent.toFixed(1),
      totalCorpusAtRetirement: formatCurrencyForAI(totalAtRetirement)
    };

    // Accumulation Data for Chart
    const accData = Array.from({ length: yearsToRetirement + 1 }, (_, year) => {
      const sipCorpusAtYear = reqSIP > 0
        ? reqSIP * ((Math.pow(1 + r, year * 12) - 1) / r) * (1 + r)
        : 0;
      const netWorthAtYear = existingNetWorth * Math.pow(1 + returnPre / 100, year);
      return {
        year: new Date().getFullYear() + year,
        sipCorpus: Math.round(sipCorpusAtYear),
        netWorthGrowth: Math.round(netWorthAtYear),
        totalCorpus: Math.round(sipCorpusAtYear + netWorthAtYear)
      };
    });

    // Comparison Data for Chart
    const compData = [
      { name: 'Corpus Required', value: Math.round(results.corpusRequired), color: '#52525b' },
      { name: 'Existing Net Worth', value: Math.round(fvExistingNW), color: '#22d3ee' },
      { name: 'SIP Contribution', value: Math.round(results.corpusRequired - fvExistingNW), color: '#10b981' }
    ];

    return { results, aiData, accumulationData: accData, comparisonData: compData };
  }, [currentAge, retirementAge, lifeExpectancy, monthlyExpense, inflation, returnPre, returnPost, existingNetWorth, currentSIP]);

  const { insights, chips, systemPrompt } = useMemo(() => {
    const corpus = results.corpusRequired;
    const monthlyExpenseVal = results.futureMonthlyExpense;
    const sip = currentSIP;
    const projectedCorpus = results.projectedCorpus + results.futureValueOfExistingNetWorth;
    const gap = results.shortfall;
    const currentExpense = results.monthlyExpense;
    const futureExpense = results.futureMonthlyExpense;
    const sipIncrease = Math.max(0, results.requiredSIP - currentSIP);

    const insightsList = [
      `You need a corpus of **${formatInsightValue(corpus)}** to sustain a monthly lifestyle of **${formatInsightValue(monthlyExpenseVal)}** after retirement.`,
      `Your current SIP of **${formatInsightValue(sip)}** will grow to **${formatInsightValue(projectedCorpus)}**, leaving a **${formatInsightValue(gap)}** gap.`,
      `Inflation will increase your **${formatInsightValue(currentExpense)}** monthly expense to **${formatInsightValue(futureExpense)}** by the time you retire.`,
      gap > 0 ? `To bridge the gap, you need to increase your SIP by **${formatInsightValue(sipIncrease)}**.` : `You are on track to meet your retirement goal!`
    ].filter(s => !s.includes('₹0') && !s.includes(' 0%'));

    const chipsList = [
      `How was the ${formatInsightValue(corpus)} corpus calculated?`,
      `What if I reduce my post-retirement expenses by 20%?`,
      `How does a 2% higher return affect my corpus?`,
      `Show me the year-on-year withdrawal plan.`
    ];

    const prompt = `
      Analyze the retirement plan for a **${currentAge}** year old aiming to retire at **${retirementAge}**.
      Explain that the required corpus is **${formatInsightValue(corpus)}** to sustain a **${formatInsightValue(monthlyExpenseVal)}** lifestyle (inflation-adjusted).
      Highlight the gap of **${formatInsightValue(gap)}** and suggest ways to bridge it.
    `.trim();

    return { insights: insightsList, chips: chipsList, systemPrompt: prompt };
  }, [currentAge, retirementAge, results, currentSIP]);

  const handleExport = () => {
    exportToExcel(
      "Retirement Plan",
      `Corpus of ${formatCurrency(results.corpusRequired)} for ${results.yearsInRetirement} years`,
      { currentAge, retirementAge, monthlyExpense, inflation, returnPre, returnPost },
      "Target Corpus",
      results.corpusRequired,
      [
        { label: 'Required Monthly SIP', value: results.requiredSIP },
        { label: 'Future Monthly Expense', value: results.futureMonthlyExpense }
      ],
      `You need a corpus of ${formatCurrency(results.corpusRequired)} to sustain your lifestyle.`
    );
  };

  const handleSave = () => {
    setIsShareOpen(false);
  };

  return (
    <div className="space-y-8">
      <Helmet>
        <title>Retirement Calculator India — Plan Your Corpus | WhatIff</title>
        <meta name="description" content="Calculate your retirement corpus, future expenses, and required monthly SIP to achieve financial freedom in India." />
        <link rel="canonical" href="https://whatiff.in/retirement-calculator" />
      </Helmet>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className={cn("text-2xl font-bold flex items-center gap-2 transition-colors duration-300", isDark ? "text-white" : "text-zinc-900")}>
            <Palmtree className="w-6 h-6 text-emerald-500" />
            Retirement Planning
          </h1>
          <p className="text-zinc-300 text-sm">Plan your financial freedom.</p>
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
            type="retirement" 
            inputs={{ currentAge, retirementAge, monthlyExpense, inflation, returnPre, returnPost }} 
            outputs={{ 
              ...results, 
              requiredSIP: results.requiredSIP, 
              mainResult: isFinite(results.corpusRequired) ? results.corpusRequired : 0 
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
          <SliderWithInput
            label="Current Age"
            value={currentAge}
            min={18}
            max={retirementAge - 1}
            step={1}
            onChange={setCurrentAge}
            formatDisplay={(v) => `${v}`}
          />
          <SliderWithInput
            label="Retire Age"
            value={retirementAge}
            min={currentAge + 1}
            max={80}
            step={1}
            onChange={setRetirementAge}
            formatDisplay={(v) => `${v}`}
          />

          <SliderWithInput
            label="Life Expectancy"
            value={lifeExpectancy}
            min={retirementAge + 1}
            max={100}
            step={1}
            onChange={setLifeExpectancy}
            formatDisplay={(v) => `${v} Years`}
          />

          <SliderWithInput
            label="Monthly Expense"
            value={monthlyExpense}
            min={10000}
            max={500000}
            step={5000}
            onChange={setMonthlyExpense}
            formatDisplay={(v) => formatCurrency(v)}
          />

          <SliderWithInput
            label="Inflation (%)"
            value={inflation}
            min={1}
            max={15}
            step={0.5}
            onChange={setInflation}
            formatDisplay={(v) => `${v}%`}
          />

          <SliderWithInput
            label="Pre-Retire Return"
            value={returnPre}
            min={1}
            max={30}
            step={0.5}
            onChange={setReturnPre}
            formatDisplay={(v) => `${v}%`}
          />
          <SliderWithInput
            label="Post-Retire Return"
            value={returnPost}
            min={1}
            max={20}
            step={0.5}
            onChange={setReturnPost}
            formatDisplay={(v) => `${v}%`}
          />

          <SliderWithInput
            label="Current Monthly SIP"
            value={currentSIP}
            min={0}
            max={200000}
            step={1000}
            onChange={setCurrentSIP}
            formatDisplay={(v) => formatCurrency(v)}
          />

          <SliderWithInput
            label="Existing Net Worth"
            value={existingNetWorth}
            min={0}
            max={100000000}
            step={10000}
            onChange={setExistingNetWorth}
            formatDisplay={(v) => formatCurrency(v)}
            footerLabel="Total value of savings, investments, and assets you already have today"
          />
        </div>

        {/* Results Card */}
        <div className={cn(
          "glass-card p-8 space-y-8 flex flex-col w-full h-full transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Corpus Required</p>
            <p className={cn("text-4xl font-bold", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(safeValue(results.corpusRequired))}</p>
          </div>
          <div className={cn("grid grid-cols-2 gap-4 pt-6 border-t", isDark ? "border-white/5" : "border-zinc-100")}>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Future Monthly Exp.</p>
              <p className={cn("text-lg font-bold", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(safeValue(results.futureMonthlyExpense))}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Required Monthly SIP</p>
              {results.futureValueOfExistingNetWorth >= results.corpusRequired ? (
                <p className="text-lg font-bold text-emerald-500">₹0</p>
              ) : (
                <p className="text-lg font-bold text-emerald-500">{formatCurrency(safeValue(results.requiredSIP))}</p>
              )}
            </div>
          </div>

          {results.existingNetWorth > 0 && (
            <div className={cn("grid grid-cols-2 gap-4 pt-6 border-t", isDark ? "border-white/5" : "border-zinc-100")}>
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Your Net Worth Grows To</p>
                <p className="text-lg font-bold text-emerald-500">{formatCurrency(safeValue(results.futureValueOfExistingNetWorth))}</p>
                <p className="text-[10px] text-zinc-500">What your existing {formatCurrency(results.existingNetWorth)} becomes by retirement at {results.returnPre}% p.a.</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Corpus Still Needed</p>
                <p className="text-lg font-bold text-emerald-500">{formatCurrency(results.corpusRequired - results.futureValueOfExistingNetWorth)}</p>
                <p className="text-[10px] text-zinc-500">After your existing net worth, this is what your SIP needs to build</p>
              </div>
            </div>
          )}

          {results.futureValueOfExistingNetWorth >= results.corpusRequired && (
            <div className={cn("p-4 rounded-xl border shadow-sm transition-colors duration-300", isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200")}>
              <p className="text-sm text-emerald-600 leading-relaxed">
                Your existing net worth of {formatCurrency(results.existingNetWorth)} is on track to cover your full retirement corpus at {results.returnPre}% returns. No additional monthly investment is needed.
              </p>
            </div>
          )}
          
          <div className="pt-2">
            <InfoBox 
              level={results.riskLevel}
              message={`Assuming a life expectancy of ${results.lifeExpectancy} years, you will spend ${results.yearsInRetirement} years in retirement.`}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Accumulation Chart */}
        <div className={cn(
          "glass-card p-6 min-w-0 transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-6">Corpus Accumulation</h3>
          <div className="h-[300px] w-full" style={{ minWidth: 0, minHeight: 300 }}>
            {chartReady && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accumulationData} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                  <XAxis 
                    dataKey="year" 
                    stroke="#a1a1aa" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    label={{ value: 'Year', position: 'insideBottom', offset: -5, fill: '#a1a1aa', fontSize: 10 }}
                  />
                  <YAxis 
                    stroke="#a1a1aa" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => formatCompactNumber(val)}
                  />
                  <Tooltip 
                    cursor={false}
                    contentStyle={{ 
                      backgroundColor: isDark ? '#18181b' : '#ffffff', 
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e4e4e7', 
                      borderRadius: '8px',
                      color: isDark ? '#f4f4f5' : '#09090b'
                    }}
                    itemStyle={{ color: isDark ? '#f4f4f5' : '#09090b' }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    labelFormatter={(label) => `Year ${label}`}
                  />
                  <Legend verticalAlign="bottom" height={50} iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Line 
                    isAnimationActive={false}
                    type="monotone" 
                    dataKey="totalCorpus" 
                    name={results.existingNetWorth > 0 ? "Total Corpus" : "SIP Corpus Only"}
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={false}
                  />
                  {results.existingNetWorth > 0 && (
                    <>
                      <Line 
                        isAnimationActive={false}
                        type="monotone" 
                        dataKey="sipCorpus" 
                        name="SIP Corpus Only"
                        stroke="#a1a1aa" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                      <Line 
                        isAnimationActive={false}
                        type="monotone" 
                        dataKey="netWorthGrowth" 
                        name="Existing NW Growth"
                        stroke="#22d3ee" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Comparison Chart */}
        <div className={cn(
          "glass-card p-6 min-w-0 transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-6">Corpus Comparison</h3>
          <div className="h-[300px] w-full relative" style={{ minWidth: 0, minHeight: 300 }}>
            {chartReady && (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonData}
                    margin={{ top: 30, right: 30, left: 20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#a1a1aa', fontSize: 10 }}
                      interval={0}
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
                        borderRadius: '8px' 
                      }}
                      itemStyle={{ color: isDark ? '#f4f4f5' : '#09090b' }}
                      cursor={{ fill: 'transparent' }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    />
                    <Bar 
                      isAnimationActive={false}
                      dataKey="value" 
                      radius={[4, 4, 0, 0]} 
                      barSize={60}
                    >
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList 
                        dataKey="value" 
                        position="top" 
                        formatter={(val: number) => formatIndianShort(val).replace('₹', '')}
                        fill="#71717a"
                        fontSize={10}
                        offset={8}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 mt-4 text-center transition-colors duration-300">
            Assumes {results.returnPre}% annual returns over {results.yearsToRetirement} years.
          </p>
        </div>
      </div>

      <div className={cn(
        "glass-card p-6 space-y-4 transition-colors duration-300",
        isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
      )}>
        <div className="flex items-center gap-2 text-emerald-500">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-bold">Important Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Years to Retirement</p>
            <p className={cn("text-xl font-bold", isDark ? "text-white" : "text-zinc-900")}>{results.yearsToRetirement} Years</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Years in Retirement</p>
            <p className={cn("text-xl font-bold", isDark ? "text-white" : "text-zinc-900")}>{results.yearsInRetirement} Years</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Months to Sustain</p>
            <p className={cn("text-xl font-bold", isDark ? "text-white" : "text-zinc-900")}>{results.yearsInRetirement * 12} Months</p>
          </div>
        </div>
      </div>

      <WhatiffInsights 
        calculatorType="retirement" 
        insights={insights}
        chips={chips}
        systemPrompt={systemPrompt}
        results={results} 
        onAskAI={handleAskAI}
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

      <InvestmentBrokerSection />

      <ShareVision 
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title="Retirement Vision"
        description={`To retire at ${retirementAge} with ${formatCurrency(results.monthlyExpense)}/month in today's money.`}
        mainValue={results.corpusRequired}
        mainLabel="Target Corpus"
        secondaryValues={[
          { label: 'Monthly SIP', value: results.requiredSIP },
          { label: 'Future Expense', value: results.futureMonthlyExpense },
          { label: 'Years to Retire', value: results.yearsToRetirement },
          { label: 'Retire Age', value: retirementAge },
          { label: 'Inflation (%)', value: results.inflation },
          { label: 'Pre-Retire Return (%)', value: results.returnPre },
          { label: 'Post-Retire Return (%)', value: results.returnPost },
          { label: 'Existing NW', value: results.existingNetWorth }
        ]}
        insight={`To reach your goal, start a SIP of ${formatIndianRupees(results.requiredSIP)} today. Every year you delay increases this requirement by ~15%.`}
        category="grow"
        inputs={{ 
          currentAge, 
          retirementAge, 
          monthlyExpense: results.monthlyExpense, 
          inflation: results.inflation, 
          returnPre: results.returnPre, 
          returnPost: results.returnPost, 
          requiredSIP: results.requiredSIP,
          corpusRequired: results.corpusRequired
        }}
        onSave={handleSave}
      />

      <footer className="py-12 flex justify-center">
        <InsightFeedback 
          calculator="RetirementCalculator" 
        />
      </footer>
    </div>
  );
}
