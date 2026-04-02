import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Helmet } from 'react-helmet-async';
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
import { CreditCard, Info, Share2, Download, Sparkles, ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GLOBAL_AI_INSTRUCTION } from '../../aiInsightPrompt';
import { calculateEMI } from '../../lib/calculators';
import { formatCurrency, formatCompactNumber, formatIndianRupees, cn } from '../../lib/utils';
import SaveScenarioButton from '../SaveScenarioButton';
import ShareVision from '../ShareVision';
import BrokerSection from '../BrokerSection';
import InfoBox, { RiskLevel } from '../InfoBox';
import { exportToExcel } from '../../lib/exportUtils';
import WhatiffInsights from '../WhatiffInsights';
import SliderWithInput from '../SliderWithInput';
import AIChat from '../AIChat';
import { Screen } from '../../App';
import { ThemeContext } from '../../contexts/ThemeContext';

interface EMICalculatorProps {
  onBack: () => void;
  onNavigate: (screen: Screen, params?: any) => void;
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

export default function EMICalculator({ onBack, onNavigate, onAskAI }: EMICalculatorProps) {
  const theme = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [loanAmount, setLoanAmount] = useState(1000000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenure, setTenure] = useState(10);
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
          systemPrompt: `${GLOBAL_AI_INSTRUCTION}\n\nContext for this EMI calculation:\n${systemPrompt}`,
          context: { loanAmount, interestRate, tenure }
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

  const result = useMemo(() => {
    return calculateEMI(loanAmount, interestRate, tenure);
  }, [loanAmount, interestRate, tenure]);

  const riskLevel = useMemo((): RiskLevel => {
    if (result.monthlyEMI < 15000) return 'safe';
    if (result.monthlyEMI < 25000) return 'moderate';
    return 'high';
  }, [result.monthlyEMI]);

  const chartData = [
    { name: 'Principal', value: loanAmount, color: '#10b981' },
    { name: 'Interest', value: result.totalInterest, color: '#f87171' },
  ];

  const amortizationData = useMemo(() => {
    return result.amortization.map(item => ({
      year: item.month / 12,
      balance: item.balance
    }));
  }, [result.amortization]);

  const aiData = useMemo(() => {
    const interestToPrincipalRatio = result.totalInterest / loanAmount;
    const monthlyInterestCost = (loanAmount * (interestRate / 100)) / 12;
    const totalCostOfAsset = loanAmount + result.totalInterest;
    
    const inflationAdjustedPrincipal = loanAmount * Math.pow(1.06, tenure);
    const purchasingPowerLoss = inflationAdjustedPrincipal - loanAmount;
    const realSurplus = result.totalPayment - inflationAdjustedPrincipal;

    return {
      loanAmount,
      interestRate,
      tenure,
      monthlyEMI: result.monthlyEMI,
      totalInterest: result.totalInterest,
      totalPayment: result.totalPayment,
      interestToPrincipalRatio,
      monthlyInterestCost,
      totalCostOfAsset,
      inflationAdjustedPrincipal,
      purchasingPowerLoss,
      realSurplus
    };
  }, [loanAmount, interestRate, tenure, result]);

  const handleExport = () => {
    exportToExcel(
      "EMI Calculation",
      `Loan of ${formatCurrency(loanAmount)} at ${interestRate}% for ${tenure} years`,
      { loanAmount, interestRate, tenure },
      "Monthly EMI",
      result.monthlyEMI,
      [
        { label: 'Total Interest', value: result.totalInterest },
        { label: 'Total Payment', value: result.totalPayment }
      ],
      `Your total interest cost is ${formatCurrency(result.totalInterest)}.`
    );
  };

  const { insights, chips, systemPrompt } = useMemo(() => {
    const emi = result.monthlyEMI;
    const principal = loanAmount;
    const totalInterest = result.totalInterest;
    const totalPayment = result.totalPayment;
    const interestPercent = (totalInterest / totalPayment) * 100;
    const repaymentRatio = totalPayment / principal;

    const insightsList = [
      `Your monthly EMI will be **${formatInsightValue(emi)}** for a loan of **${formatInsightValue(principal)}**.`,
      `You will pay **${formatInsightValue(totalInterest)}** in interest, which is **${formatInsightValue(interestPercent, 'percent')}** of your total payment.`,
      `Your total repayment will be **${formatInsightValue(totalPayment)}** over **${formatInsightValue(tenure, 'years')}**.`,
      `For every ₹1 you borrow, you are paying back **${repaymentRatio.toFixed(2)}** times.`
    ].filter(s => !s.includes('₹0') && !s.includes(' 0%'));

    const chipsList = [
      `How much total interest will I pay?`,
      `What if I increase my EMI by 10%?`,
      `How does a 1% rate hike affect my EMI?`,
      `Show me the interest vs principal split.`
    ];

    const prompt = `
      Explain the EMI structure for a loan of **${formatInsightValue(principal)}** at **${interestRate}%** for **${formatInsightValue(tenure, 'years')}**.
      Highlight that the total interest is **${formatInsightValue(totalInterest)}**, making the total repayment **${formatInsightValue(totalPayment)}**.
      Explain that for every ₹1 borrowed, the user pays back **₹${repaymentRatio.toFixed(2)}**.
    `.trim();

    return { insights: insightsList, chips: chipsList, systemPrompt: prompt };
  }, [loanAmount, interestRate, tenure, result]);

  return (
    <div className="space-y-8 w-full">
      <Helmet>
        <title>EMI Calculator — Monthly Loan Payment Calculator | WhatIff</title>
        <meta name="description" content="Calculate your monthly EMI for home, car or personal loans instantly." />
        <link rel="canonical" href="https://whatiff.in/emi-calculator" />
      </Helmet>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-500" />
            EMI Calculator
          </h1>
          <p className="text-zinc-500 text-sm">Calculate your monthly loan installments.</p>
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
            type="emi" 
            inputs={{ loanAmount, interestRate, tenure }} 
            outputs={{ 
              ...result, 
              mainResult: isFinite(result.monthlyEMI) ? result.monthlyEMI : 0 
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full items-stretch">
        {/* Controls */}
        <div className="space-y-6 w-full">
          <SliderWithInput
            label="Loan Amount"
            value={loanAmount}
            min={100000}
            max={10000000}
            step={50000}
            onChange={setLoanAmount}
            formatDisplay={(v) => formatCurrency(v)}
          />

          <SliderWithInput
            label="Interest Rate (p.a)"
            value={interestRate}
            min={5}
            max={25}
            step={0.1}
            onChange={setInterestRate}
            formatDisplay={(v) => `${v}%`}
          />

          <SliderWithInput
            label="Tenure"
            value={tenure}
            min={1}
            max={30}
            step={1}
            onChange={setTenure}
            formatDisplay={(v) => `${v} Years`}
          />
        </div>

        {/* Results Card */}
        <div className={cn(
          "glass-card p-6 space-y-6 flex flex-col w-full h-full transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Monthly EMI</p>
            <p className={cn("text-4xl font-bold", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(result.monthlyEMI)}</p>
          </div>
          <div className={cn("grid grid-cols-2 gap-4 pt-4 border-t", isDark ? "border-white/5" : "border-zinc-100")}>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Principal</p>
              <p className={cn("text-lg font-bold", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(loanAmount)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Interest</p>
              <p className="text-lg font-bold text-red-400">{formatCurrency(result.totalInterest)}</p>
            </div>
          </div>
          <div className="pt-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Total Payment</p>
            <p className={cn("text-xl font-bold", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(result.totalPayment)}</p>
          </div>

          <div className="mt-auto pt-2">
            <InfoBox 
              level={riskLevel}
              message="A healthy EMI should not exceed 30-40% of your monthly income. The EMI is calculated based on reducing balance method."
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Donut Chart */}
        <div className={cn(
          "glass-card p-6 min-w-0 transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          <h3 className="text-sm font-semibold text-zinc-400 mb-6 uppercase tracking-widest">Breakdown</h3>
          <div className="h-[300px] w-full relative flex items-center justify-center" style={{ minWidth: 0, minHeight: 300 }}>
            {chartReady && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#18181b' : '#ffffff', 
                      border: isDark ? '1px solid #3f3f46' : '1px solid #e4e4e7', 
                      borderRadius: '8px' 
                    }}
                    itemStyle={{ color: isDark ? '#ffffff' : '#09090b' }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className={cn("text-3xl font-bold", isDark ? "text-white" : "text-zinc-900")}>
                {Math.round((loanAmount / result.totalPayment) * 100)}%
              </p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Principal</p>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-400">Principal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-xs text-zinc-400">Interest</span>
            </div>
          </div>
        </div>

        {/* Balance Chart */}
        <div className={cn(
          "glass-card p-6 min-w-0 transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          <h3 className="text-sm font-semibold text-zinc-400 mb-6 uppercase tracking-widest">Loan Balance Projection</h3>
          <div className="h-[300px] w-full" style={{ minWidth: 0, minHeight: 300 }}>
            {chartReady && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={amortizationData}>
                  <defs>
                    <linearGradient id="colorValueEMI" x1="0" y1="0" x2="0" y2="1">
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
                    formatter={(value: number) => [formatCurrency(value), 'Balance']}
                    labelFormatter={(label) => `Year ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValueEMI)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <WhatiffInsights 
        calculatorType="emi" 
        insights={insights}
        chips={chips}
        systemPrompt={systemPrompt}
        results={aiData} 
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
        chips={chips}
        questionCount={questionCount}
        maxQuestions={MAX_QUESTIONS}
      />

      <BrokerSection />

      <ShareVision 
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title="Smart Borrowing Vision"
        description={`Your monthly EMI for a loan of ${formatCurrency(loanAmount)} at ${interestRate}% for ${tenure} years is ${formatCurrency(result.monthlyEMI)}.`}
        mainValue={result.monthlyEMI}
        mainLabel="Monthly EMI"
        secondaryValues={[
          { label: 'Total Interest', value: result.totalInterest },
          { label: 'Total Payment', value: result.totalPayment },
          { label: 'Loan Amount', value: loanAmount },
          { label: 'Tenure', value: `${tenure} Years` }
        ]}
        insight={`Your total interest cost is ${formatIndianRupees(result.totalInterest)}. Consider a shorter tenure to save on interest if your budget allows.`}
        category="borrow"
        inputs={{ loanAmount, interestRate, tenure, totalInterest: result.totalInterest, totalPayment: result.totalPayment }}
        onSave={() => setIsShareOpen(false)}
      />
    </div>
  );
}
