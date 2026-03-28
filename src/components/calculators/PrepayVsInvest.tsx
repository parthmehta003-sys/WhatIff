import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
  ReferenceLine
} from 'recharts';
import { CreditCard, Info, Share2, Download, Sparkles, ArrowUpRight, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { GLOBAL_AI_INSTRUCTION } from '../../aiInsightPrompt';
import { calculatePrepayVsInvest } from '../../lib/calculators';
import { formatCurrency, formatCompactNumber, formatIndianRupees, cn, formatIndianShort, formatCurrencyForAI } from '../../lib/utils';
import SaveScenarioButton from '../SaveScenarioButton';
import ShareVision from '../ShareVision';
import InfoBox from '../InfoBox';
import { exportToExcel } from '../../lib/exportUtils';
import WhatiffInsights from '../WhatiffInsights';
import SliderWithInput from '../SliderWithInput';
import AIChat from '../AIChat';
import InvestmentBrokerSection from '../InvestmentBrokerSection';
import { Screen } from '../../App';
import { ThemeContext } from '../../contexts/ThemeContext';
import { CalculatorType } from '../../lib/storage';
import { motion, AnimatePresence } from 'motion/react';

interface PrepayVsInvestProps {
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

export default function PrepayVsInvest({ onBack, onNavigate, onAskAI }: PrepayVsInvestProps) {
  const theme = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  // Inputs
  const [loanAmount, setLoanAmount] = useState(4000000);
  const [loanRate, setLoanRate] = useState(8.5);
  const [remainingTenure, setRemainingTenure] = useState(20);
  
  const [mode, setMode] = useState<'extra' | 'full_emi'>('extra');
  const [extraAmount, setExtraAmount] = useState(10000);
  const [frequency, setFrequency] = useState<'monthly' | 'annual'>('monthly');
  
  const [sipReturn, setSipReturn] = useState(12);
  
  const [showTax, setShowTax] = useState(false);
  const [taxBracket, setTaxBracket] = useState(30);
  const [section24bOn, setSection24bOn] = useState(true);
  const [section80COn, setSection80COn] = useState(true);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  // AI Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const MAX_QUESTIONS = 10;

  useEffect(() => {
    const timer = setTimeout(() => setChartReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const result = useMemo(() => {
    return calculatePrepayVsInvest(
      loanAmount,
      loanRate,
      remainingTenure,
      extraAmount,
      sipReturn,
      mode,
      frequency,
      taxBracket,
      section24bOn,
      section80COn
    );
  }, [loanAmount, loanRate, remainingTenure, extraAmount, sipReturn, mode, frequency, taxBracket, section24bOn, section80COn]);

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
          context: chatContext,
          history: messages,
          systemInstruction: chatContext?.systemPrompt || GLOBAL_AI_INSTRUCTION
        })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleExport = () => {
    const inputs = {
      'Loan Amount': formatCurrency(loanAmount),
      'Loan Rate': `${loanRate}%`,
      'Remaining Tenure': `${remainingTenure} years`,
      'Extra Amount Mode': mode === 'extra' ? 'Extra Monthly Amount' : 'Full EMI in SIP',
      'Extra Amount': formatCurrency(mode === 'extra' ? extraAmount : result.emi),
      'Frequency': frequency,
      'Expected SIP Return': `${sipReturn}%`,
      'Tax Bracket': `${taxBracket}%`,
      'Section 24b': section24bOn ? 'On' : 'Off',
      'Section 80C': section80COn ? 'On' : 'Off'
    };

    const secondaryValues = [
      { label: 'Winner', value: result.winner === 'invest' ? 'Investing' : 'Prepaying' },
      { label: 'Margin', value: formatCurrency(result.margin) },
      { label: 'Interest Saved (Prepay)', value: formatCurrency(result.interestSaved) },
      { label: 'SIP Corpus (Invest)', value: formatCurrency(result.sipCorpus) },
      { label: 'Break-even Rate', value: `${result.breakEvenRate}%` }
    ];

    exportToExcel(
      'Prepay vs Invest Analysis',
      'Should you prepay your home loan or invest the extra money?',
      inputs,
      'Net Benefit Margin',
      result.margin,
      secondaryValues,
      `Choosing to ${result.winner === 'invest' ? 'invest' : 'prepay'} results in a net benefit of ${formatCurrency(result.margin)} over the other option.`
    );
  };

  const aiData = useMemo(() => {
    const monthsToClose = result.monthsToClose;
    const totalExtra = (mode === 'full_emi' ? result.emi : extraAmount) * monthsToClose;
    return {
      loanAmount: formatCurrencyForAI(loanAmount),
      loanRate: `${loanRate}%`,
      remainingTenure: `${remainingTenure} years`,
      extraAmount: formatCurrencyForAI(mode === 'full_emi' ? result.emi : extraAmount),
      sipReturn: `${sipReturn}%`,
      interestSaved: formatCurrencyForAI(result.interestSaved),
      sipCorpus: formatCurrencyForAI(result.sipCorpus),
      winner: result.winner,
      margin: formatCurrencyForAI(result.margin),
      breakEvenRate: `${result.breakEvenRate}%`,
      monthsClosedEarly: (remainingTenure * 12) - result.monthsToClose,
      interestSavedPerRupee: (result.interestSaved / totalExtra).toFixed(2),
      sipCorpusPerRupee: (result.sipCorpus / totalExtra).toFixed(2),
      taxSaved24b: section24bOn ? result.taxSaved24b : 0,
      taxSaved80C: section80COn ? result.taxSaved80C : 0,
      effectiveLoanRate: (loanRate - (result.taxSaved24b / loanAmount * 100)).toFixed(2),
    };
  }, [loanAmount, loanRate, remainingTenure, extraAmount, sipReturn, result, mode, section24bOn, section80COn]);

  const { insights, chips, systemPrompt } = useMemo(() => {
    const iSavedPerR = aiData.interestSavedPerRupee;
    const sCorpusPerR = aiData.sipCorpusPerRupee;
    const beRate = result.breakEvenRate;
    const closedEarly = (remainingTenure * 12) - result.monthsToClose;
    
    const insightsList = [
      `For every ₹1 of extra money, prepaying saves **₹${iSavedPerR}** in interest, while investing generates **₹${sCorpusPerR}** in corpus.`,
      `Your SIP needs to return at least **${beRate}% p.a.** to beat the financial benefit of prepaying your loan.`,
      `Prepaying your loan buys you **${closedEarly} months** of debt freedom, but tax benefits like Section 24b actually make prepaying slightly less attractive than it appears.`
    ];

    const chipsList = [
      "Why does 24b reduce prepay benefit?",
      "Is 12% SIP return realistic?",
      "Should I prepay if I'm in 30% bracket?",
      "What if I increase my extra amount?"
    ];

    const prompt = `
      You are a personal finance expert in India. Analyze this Prepay vs Invest scenario:
      - Loan: ${aiData.loanAmount} at ${aiData.loanRate} for ${aiData.remainingTenure}
      - Extra: ${aiData.extraAmount} monthly
      - SIP Return: ${aiData.sipReturn}
      - Winner: ${result.winner} by ${aiData.margin}
      - Break-even Rate: ${aiData.breakEvenRate}
      - Tax Bracket: ${taxBracket}%
      
      Provide a deep mathematical analysis. Explain how Section 24b and 80C affect the outcome.
    `;

    return { insights: insightsList, chips: chipsList, systemPrompt: prompt };
  }, [aiData, result, taxBracket]);

  return (
    <div className="space-y-8">
      <Helmet>
        <title>Prepay vs Invest Calculator — Home Loan Prepayment | WhatIff</title>
        <meta name="description" content="Decide whether to prepay your home loan or invest the extra money in a SIP. Compare interest savings vs investment growth with tax benefits." />
        <link rel="canonical" href="https://whatiff.in/prepay-vs-invest" />
      </Helmet>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowUpRight className="w-6 h-6 text-purple-500" />
            Prepay vs Invest
          </h1>
          <p className="text-zinc-500 text-sm">Should you close your loan early or build wealth via SIP?</p>
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
            type="prepay_vs_invest" 
            defaultName={`Prepay vs Invest — ${formatIndianShort(loanAmount)} loan`}
            inputs={{ loanAmount, extraAmount, sipReturn, loanRate, remainingTenure, mode, frequency, taxBracket, section24bOn, section80COn }} 
            outputs={{ 
              winner: result.winner,
              margin: result.margin,
              interestSaved: result.interestSaved,
              sipCorpus: result.sipCorpus,
              breakEvenRate: result.breakEvenRate,
              emi: result.emi,
              monthsToClose: result.monthsToClose
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 space-y-6">
            {/* Group 1: Loan Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Loan Details</h3>
              <SliderWithInput
                label="Outstanding Loan"
                value={loanAmount}
                onChange={setLoanAmount}
                min={100000}
                max={50000000}
                step={100000}
                formatDisplay={(v) => formatCurrency(v)}
              />
              <SliderWithInput
                label="Interest Rate"
                value={loanRate}
                onChange={setLoanRate}
                min={5}
                max={15}
                step={0.1}
                formatDisplay={(v) => `${v}%`}
              />
              <SliderWithInput
                label="Remaining Tenure"
                value={remainingTenure}
                onChange={setRemainingTenure}
                min={1}
                max={30}
                step={1}
                formatDisplay={(v) => `${v} Yrs`}
              />
            </div>

            {/* Group 2: Extra Amount Mode */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Extra Amount Mode</h3>
              <div className="flex p-1 bg-zinc-900/50 rounded-lg border border-white/5">
                <button
                  onClick={() => setMode('extra')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                    mode === 'extra' ? "bg-purple-500 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Extra Monthly
                </button>
                <button
                  onClick={() => setMode('full_emi')}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                    mode === 'full_emi' ? "bg-purple-500 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Full EMI in SIP
                </button>
              </div>

              {mode === 'extra' ? (
                <div className="space-y-4">
                  <SliderWithInput
                    label="Extra Amount per Month"
                    value={extraAmount}
                    onChange={setExtraAmount}
                    min={1000}
                    max={500000}
                    step={1000}
                    formatDisplay={(v) => formatCurrency(v)}
                  />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-zinc-400">Prepayment Frequency</p>
                    <div className="flex p-1 bg-zinc-900/50 rounded-lg border border-white/5">
                      <button
                        onClick={() => setFrequency('monthly')}
                        className={cn(
                          "flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all",
                          frequency === 'monthly' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setFrequency('annual')}
                        className={cn(
                          "flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all",
                          frequency === 'annual' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        Annual Lumpsum
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-zinc-900/30 rounded-lg border border-dashed border-white/10">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    This compares taking the loan vs investing the EMI amount (₹{result.emi.toLocaleString('en-IN')}) in SIP from day one.
                  </p>
                </div>
              )}
            </div>

            {/* Group 3: Investment Details */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Investment Details</h3>
              <SliderWithInput
                label="Expected SIP Return"
                value={sipReturn}
                onChange={setSipReturn}
                min={5}
                max={25}
                step={0.5}
                formatDisplay={(v) => `${v}%`}
              />
              <p className="text-[10px] text-zinc-500 italic">
                Nifty 50 has delivered approximately 12% CAGR over the last 20 years.
              </p>
            </div>

            {/* Group 4: Tax Benefits */}
            <div className="pt-4 border-t border-white/5">
              <button 
                onClick={() => setShowTax(!showTax)}
                className="w-full flex items-center justify-between group"
              >
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-300 transition-colors">
                  Tax Benefits
                </h3>
                {showTax ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
              </button>
              
              <AnimatePresence>
                {showTax && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-6 pt-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-zinc-400">Tax Bracket</p>
                        <div className="flex p-1 bg-zinc-900/50 rounded-lg border border-white/5">
                          {[5, 10, 20, 30].map(bracket => (
                            <button
                              key={bracket}
                              onClick={() => setTaxBracket(bracket)}
                              className={cn(
                                "flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all",
                                taxBracket === bracket ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                              )}
                            >
                              {bracket}%
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-white">Section 24b</p>
                            <p className="text-[10px] text-zinc-500">Interest deduction up to ₹2L/yr</p>
                          </div>
                          <button 
                            onClick={() => setSection24bOn(!section24bOn)}
                            className={cn(
                              "w-10 h-5 rounded-full transition-colors relative",
                              section24bOn ? "bg-purple-500" : "bg-zinc-700"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                              section24bOn ? "right-1" : "left-1"
                            )} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-white">Section 80C</p>
                            <p className="text-[10px] text-zinc-500">ELSS SIP deduction up to ₹1.5L/yr</p>
                          </div>
                          <button 
                            onClick={() => setSection80COn(!section80COn)}
                            className={cn(
                              "w-10 h-5 rounded-full transition-colors relative",
                              section80COn ? "bg-purple-500" : "bg-zinc-700"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                              section80COn ? "right-1" : "left-1"
                            )} />
                          </button>
                        </div>
                      </div>

                      <p className="text-[10px] text-zinc-500 italic leading-relaxed">
                        Tax benefits reduce the effective cost of your loan and increase the effective return of your SIP.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <InfoBox 
            level="moderate" 
            message="Tax benefits are calculated based on current Indian Income Tax laws (Section 24b and 80C). Actual benefits may vary based on your specific tax situation and the new vs old tax regime."
          />
        </div>

        {/* Results */}
        <div className="lg:col-span-8 space-y-8">
          {/* Results Card */}
          <div className="glass-card p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 hidden md:block" />
              
              {/* Prepay Column */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Prepay</h4>
                  <div className="px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-500 text-[10px] font-bold uppercase">Scenario A</div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-sm text-zinc-400">Interest Saved</p>
                    <p className="text-xl font-bold text-white">{formatIndianRupees(result.interestSaved)}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-sm text-zinc-400">Loan Closes In</p>
                    <p className="text-xl font-bold text-white">{(result.monthsToClose / 12).toFixed(1)} Yrs</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-sm text-zinc-400">Tax Saved (24b)</p>
                    <p className="text-xl font-bold text-amber-500">{formatIndianRupees(result.taxSaved24b)}</p>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                    <p className="text-sm font-bold text-zinc-300">Net Benefit</p>
                    <p className="text-2xl font-bold text-white">{formatIndianRupees(result.prepayNetBenefit)}</p>
                  </div>
                </div>
              </div>

              {/* Invest Column */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Invest in SIP</h4>
                  <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">Scenario B</div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-sm text-zinc-400">SIP Corpus</p>
                    <p className="text-xl font-bold text-white">{formatIndianRupees(result.sipCorpus)}</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-sm text-zinc-400">Tenure</p>
                    <p className="text-xl font-bold text-white">{(result.monthsToClose / 12).toFixed(1)} Yrs</p>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-sm text-zinc-400">Tax Saved (80C)</p>
                    <p className="text-xl font-bold text-amber-500">{formatIndianRupees(result.taxSaved80C)}</p>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                    <p className="text-sm font-bold text-zinc-300">Net Benefit</p>
                    <p className="text-2xl font-bold text-white">{formatIndianRupees(result.investNetBenefit)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Winner Banner */}
            {result.margin > 10000 && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-lg font-bold text-emerald-500 flex items-center justify-center gap-2">
                  {result.winner === 'invest' ? '📈 Investing' : '🏠 Prepaying'} wins by {formatIndianRupees(result.margin)}
                </p>
              </div>
            )}

            {/* Break-even Rate */}
            <div className="text-center">
              <p className="text-xs text-zinc-500">
                SIP needs to return <span className="text-zinc-300 font-bold">{result.breakEvenRate}% p.a.</span> for investing to beat prepaying
              </p>
              {showTax && (
                <p className="text-[10px] text-zinc-600 mt-2">
                  Tax benefits calculated at {taxBracket}% bracket. Section 24b reduces effective loan cost. Section 80C increases effective SIP return.
                </p>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-8">
            {/* Chart 1: Net Worth Over Time */}
            <div className="glass-card p-6 space-y-6">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Net Worth Over Time</h3>
              <div className="h-64 w-full" style={{ minWidth: 0 }}>
                {chartReady && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis 
                        dataKey="year" 
                        stroke="#71717a" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        label={{ value: 'Years', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#71717a' }}
                      />
                      <YAxis 
                        stroke="#71717a" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(val) => `₹${formatCompactNumber(val)}`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px' }}
                        formatter={(val: number) => [formatIndianRupees(val), '']}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="prepayNetWorth" 
                        name="Prepay Path" 
                        stroke="#71717a" 
                        strokeWidth={2} 
                        dot={false} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="investNetWorth" 
                        name="Invest Path" 
                        stroke="#10b981" 
                        strokeWidth={2} 
                        dot={false} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Chart 2: Side by Side Comparison */}
              <div className="glass-card p-6 space-y-6">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Prepay vs Invest Comparison</h3>
                <div className="h-64 w-full" style={{ minWidth: 0 }}>
                  {chartReady && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Interest Saved', value: result.interestSaved, fill: '#71717a' },
                        ...(showTax && section24bOn ? [{ name: 'Tax 24b', value: result.taxSaved24b, fill: '#f59e0b' }] : []),
                        { name: 'SIP Corpus', value: result.sipCorpus, fill: '#10b981' },
                        ...(showTax && section80COn ? [{ name: 'Tax 80C', value: result.taxSaved80C, fill: '#f59e0b' }] : [])
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="name" stroke="#71717a" fontSize={8} tickLine={false} axisLine={false} />
                        <YAxis hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                          formatter={(val: number) => [formatIndianRupees(val), '']}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          { [0, 1, 2, 3].map((entry, index) => (
                            <Cell key={`cell-${index}`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart 3: Break-even Analysis */}
              <div className="glass-card p-6 space-y-6">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Break-even Analysis</h3>
                <div className="h-64 flex flex-col items-center justify-center space-y-6">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke="#ffffff05"
                        strokeWidth="12"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke={sipReturn >= result.breakEvenRate ? "#10b981" : "#ef4444"}
                        strokeWidth="12"
                        strokeDasharray={440}
                        strokeDashoffset={440 - (440 * Math.min(sipReturn, 30) / 30)}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-3xl font-bold text-white">{sipReturn}%</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Current Return</p>
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className={cn(
                      "text-sm font-bold",
                      sipReturn >= result.breakEvenRate ? "text-emerald-500" : "text-red-500"
                    )}>
                      {sipReturn >= result.breakEvenRate ? "Investing beats prepaying" : "Prepaying beats investing"}
                    </p>
                    <p className="text-[10px] text-zinc-500">Break-even at {result.breakEvenRate}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* AI Insights */}
      <WhatiffInsights 
        insights={insights} 
        chips={chips}
        onAskAI={() => handleAskAI(aiData, chips, systemPrompt)}
        calculatorType="home-purchase"
        results={aiData}
      />

      {/* Lenders Section */}
      <div id="top-lenders">
        <InvestmentBrokerSection />
      </div>

      {/* Modals & Chat */}
      <ShareVision 
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            title="Prepay vs Invest Analysis"
            description={`Should you prepay your loan or invest in SIP?`}
            mainValue={result.margin}
            mainLabel="Net Benefit Margin"
            secondaryValues={[
              { label: 'Winner', value: result.winner === 'invest' ? 'Investing' : 'Prepaying' },
              { label: 'Interest Saved', value: formatCurrency(result.interestSaved) },
              { label: 'SIP Corpus', value: formatCurrency(result.sipCorpus) },
              { label: 'Break-even Rate', value: `${result.breakEvenRate}%` }
            ]}
            insight={`Choosing to ${result.winner === 'invest' ? 'invest' : 'prepay'} results in a net benefit of ${formatCurrency(result.margin)} over the other option.`}
            category="borrow"
            inputs={{ loanAmount, loanRate, remainingTenure, extraAmount, sipReturn, mode, frequency, taxBracket, section24bOn, section80COn }}
            onSave={() => setIsShareOpen(false)}
          />

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
    </div>
  );
}
