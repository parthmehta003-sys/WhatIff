import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { ShieldCheck, Info, Share2, AlertCircle, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { GLOBAL_AI_INSTRUCTION } from '../../aiInsightPrompt';
import { calculateLoanAffordability } from '../../lib/calculators';
import { formatCurrency, cn, formatCompactNumber, formatIndianRupees } from '../../lib/utils';
import SaveScenarioButton from '../SaveScenarioButton';
import ShareVision from '../ShareVision';
import BrokerSection from '../BrokerSection';
import InfoBox, { RiskLevel } from '../InfoBox';
import { exportToExcel } from '../../lib/exportUtils';
import WhatiffInsights from '../WhatiffInsights';
import SliderWithInput from '../SliderWithInput';
import { ThemeContext } from '../../contexts/ThemeContext';

interface LoanAffordabilityProps {
  onBack: () => void;
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

export default function LoanAffordability({ onBack, onAskAI }: LoanAffordabilityProps) {
  const theme = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [monthlyIncome, setMonthlyIncome] = useState(100000);
  const [existingEMI, setExistingEMI] = useState(0);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setChartReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const result = useMemo(() => {
    return calculateLoanAffordability(monthlyIncome, existingEMI, interestRate, tenure);
  }, [monthlyIncome, existingEMI, interestRate, tenure]);

  const riskLevel = useMemo((): RiskLevel => {
    const totalEMI = existingEMI + result.availableEMI;
    const ratio = totalEMI / monthlyIncome;
    
    if (ratio > 0.5) return 'high';
    if (ratio >= 0.3) return 'moderate';
    return 'safe';
  }, [existingEMI, result.availableEMI, monthlyIncome]);

  const chartData = useMemo(() => {
    const totalEMI = existingEMI + result.availableEMI;
    const buffer = Math.max(0, monthlyIncome - totalEMI);
    
    return [
      { name: 'Existing EMIs', value: existingEMI },
      { name: 'New EMI Capacity', value: result.availableEMI },
      { name: 'Remaining Income', value: buffer }
    ];
  }, [existingEMI, result.availableEMI, monthlyIncome]);

  const safeBorrowingPct = Math.round(((existingEMI + result.availableEMI) / monthlyIncome) * 100);

  const aiData = useMemo(() => {
    const totalPayment = result.availableEMI * tenure * 12;
    const totalInterest = totalPayment - result.maxLoan;
    const interestToPrincipalRatio = result.maxLoan > 0 ? totalInterest / result.maxLoan : 0;
    const monthlyInterestCost = (result.maxLoan * (interestRate / 100)) / 12;
    const totalCostOfAsset = result.maxLoan + totalInterest;
    
    const inflationAdjustedPrincipal = result.maxLoan * Math.pow(1.06, tenure);
    const purchasingPowerLoss = inflationAdjustedPrincipal - result.maxLoan;
    const realSurplus = totalPayment - inflationAdjustedPrincipal;

    return {
      monthlyIncome,
      existingEMI,
      interestRate,
      tenure,
      maxLoan: result.maxLoan,
      availableEMI: result.availableEMI,
      totalInterest,
      totalPayment,
      interestToPrincipalRatio,
      monthlyInterestCost,
      totalCostOfAsset,
      inflationAdjustedPrincipal,
      purchasingPowerLoss,
      realSurplus
    };
  }, [monthlyIncome, existingEMI, interestRate, tenure, result]);

  const { insights, chips, systemPrompt } = useMemo(() => {
    const loanAmount = result.maxLoan;
    const emi = result.availableEMI;
    const totalPayment = emi * tenure * 12;
    const totalInterest = totalPayment - loanAmount;
    const emiPercent = ((emi + existingEMI) / monthlyIncome) * 100;
    const downPayment = loanAmount * 0.2;

    const insightsList = [
      `Based on your income, you can afford a loan of **${formatInsightValue(loanAmount)}** with an EMI of **${formatInsightValue(emi)}**.`,
      `Your total repayment will be **${formatInsightValue(totalPayment)}**, with **${formatInsightValue(totalInterest)}** going towards interest.`,
      `This loan will take up **${formatInsightValue(emiPercent, 'percent')}** of your monthly take-home pay.`,
      `To increase affordability, consider a longer tenure or a higher down payment of **${formatInsightValue(downPayment)}**.`
    ].filter(s => !s.includes('₹0') && !s.includes(' 0%'));

    const chipsList = [
      `How can I increase my loan eligibility?`,
      `What if my interest rate increases by 1%?`,
      `Show me the impact of a 5-year longer tenure.`,
      `Is a ${formatInsightValue(emiPercent, 'percent')} EMI-to-income ratio safe?`
    ];

    const prompt = `
      Analyze the loan affordability for a monthly income of **${formatInsightValue(monthlyIncome)}**.
      Explain that the maximum affordable loan is **${formatInsightValue(loanAmount)}** with an EMI of **${formatInsightValue(emi)}**.
      Highlight that this EMI is **${formatInsightValue(emiPercent, 'percent')}** of the user's monthly income.
    `.trim();

    return { insights: insightsList, chips: chipsList, systemPrompt: prompt };
  }, [monthlyIncome, existingEMI, tenure, result]);

  const handleExport = () => {
    exportToExcel(
      "Loan Affordability Analysis",
      `Max loan eligibility for income of ${formatCurrency(monthlyIncome)}`,
      { monthlyIncome, existingEMI, interestRate, tenure },
      "Max Loan Eligibility",
      result.maxLoan,
      [
        { label: 'Safe Monthly EMI', value: result.availableEMI },
        { label: 'Risk Level', value: result.riskLevel }
      ],
      `Based on your income, you can safely afford a loan of up to ${formatCurrency(result.maxLoan)}.`
    );
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Safe': return 'text-emerald-500';
      case 'Moderate': return 'text-yellow-500';
      case 'High': return 'text-red-500';
      default: return 'text-zinc-500';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'Safe': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'Moderate': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'High': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };


  return (
    <div className="space-y-8">
      <Helmet>
        <title>Loan Affordability Calculator — Check Your Borrowing Power | WhatIff</title>
        <meta name="description" content="Determine your loan affordability. Calculate maximum loan eligibility, safe EMI, and understand your borrowing capacity." />
        <link rel="canonical" href="https://whatiff.in/loan-affordability" />
      </Helmet>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className={cn("text-2xl font-bold flex items-center gap-2 transition-colors duration-300", isDark ? "text-white" : "text-zinc-900")}>
            <ShieldCheck className="w-6 h-6 text-purple-500" />
            Loan Affordability
          </h1>
          <p className="text-zinc-500 text-sm">Check if you can safely afford a new loan.</p>
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
            type="affordability" 
            inputs={{ monthlyIncome, existingEMI, interestRate, tenure }} 
            outputs={{ 
              ...result, 
              mainResult: isFinite(result.maxLoan) ? result.maxLoan : 0 
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
            label="Monthly Income"
            value={monthlyIncome}
            min={20000}
            max={1000000}
            step={5000}
            onChange={setMonthlyIncome}
            formatDisplay={(v) => formatCurrency(v)}
          />

          <SliderWithInput
            label="Existing EMIs"
            value={existingEMI}
            min={0}
            max={500000}
            step={1000}
            onChange={setExistingEMI}
            formatDisplay={(v) => formatCurrency(v)}
          />

          <SliderWithInput
            label="Interest Rate"
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
          "glass-card p-8 space-y-8 flex flex-col w-full h-full transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Max Loan Eligibility</p>
            <p className={cn("text-4xl font-bold transition-colors duration-300", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(result.maxLoan)}</p>
          </div>
          <div className={cn("grid grid-cols-2 gap-4 pt-6 border-t transition-colors duration-300", isDark ? "border-white/5" : "border-zinc-100")}>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Safe Monthly EMI</p>
              <p className={cn("text-lg font-bold transition-colors duration-300", isDark ? "text-white" : "text-zinc-900")}>{formatCurrency(result.availableEMI)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Risk Level</p>
              <div className="flex items-center gap-2">
                {getRiskIcon(result.riskLevel)}
                <p className={cn("text-lg font-bold", getRiskColor(result.riskLevel))}>{result.riskLevel}</p>
              </div>
            </div>
          </div>
          
          <InfoBox 
            level={riskLevel}
            message="Based on the 40% debt-to-income ratio rule. Lenders typically prefer total EMIs to be within 40-50% of your net income."
            className="w-full mt-auto"
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Donut Chart */}
        <div className={cn(
          "glass-card p-6 min-w-0 transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-6">Income Allocation</h3>
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
                    <Cell fill="#f59e0b" />
                    <Cell fill="#10b981" />
                    <Cell fill={isDark ? "#27272a" : "#e4e4e7"} />
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
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-3xl font-bold text-emerald-600">
                {safeBorrowingPct}%
              </p>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Total Debt Ratio</p>
            </div>
          </div>
          <div className="flex justify-center flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Existing EMIs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">New Capacity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-zinc-400" />
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Remaining</span>
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className={cn(
          "glass-card p-6 min-w-0 transition-colors duration-300",
          isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
        )}>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-6">EMI Obligations</h3>
          <div className="h-[300px] w-full" style={{ minWidth: 0, minHeight: 300 }}>
            {chartReady && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Current EMIs', value: existingEMI, color: '#f59e0b' },
                    { name: 'Max Safe EMI', value: monthlyIncome * 0.4, color: '#10b981' }
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
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
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Bar isAnimationActive={false} dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
                    <Cell fill="#f59e0b" />
                    <Cell fill="#10b981" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className={cn(
        "glass-card p-6 space-y-4 transition-colors duration-300",
        isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
      )}>
        <div className="flex items-center gap-2 text-purple-600">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-bold">Affordability Analysis</h3>
        </div>
        <p className={cn("text-sm leading-relaxed transition-colors duration-300", isDark ? "text-zinc-300" : "text-zinc-600")}>
          {result.riskLevel === 'Safe' ? 'You are well within safe borrowing limits. Lenders will likely approve your application quickly.' : 
           result.riskLevel === 'Moderate' ? 'Your debt levels are manageable but approach with caution. Consider a longer tenure.' : 
           'High debt-to-income ratio. Banks may reject your application or charge higher interest rates.'}
        </p>
      </div>

      <WhatiffInsights 
        calculatorType="loan-affordability" 
        insights={insights}
        chips={chips}
        systemPrompt={systemPrompt}
        results={result} 
        onAskAI={onAskAI}
      />

      <BrokerSection />

      <ShareVision 
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title="Borrowing Power Vision"
        description={`Based on your income of ${formatIndianRupees(monthlyIncome)}, you can safely afford a loan of up to ${formatIndianRupees(result.maxLoan)}.`}
        mainValue={result.maxLoan}
        mainLabel="Max Loan Eligibility"
        secondaryValues={[
          { label: 'Safe Monthly EMI', value: result.availableEMI },
          { label: 'Risk Level', value: result.riskLevel },
          { label: 'Monthly Income', value: monthlyIncome },
          { label: 'Existing EMIs', value: existingEMI }
        ]}
        insight={result.riskLevel === 'Safe' ? 'You are well within safe borrowing limits. Lenders will likely approve your application quickly.' : 'Your debt levels are manageable but approach with caution.'}
        category="borrow"
        inputs={{ monthlyIncome, existingEMI, interestRate, tenure, availableEMI: result.availableEMI, riskLevel: result.riskLevel, income: monthlyIncome }}
        onSave={() => setIsShareOpen(false)}
      />
    </div>
  );
}
