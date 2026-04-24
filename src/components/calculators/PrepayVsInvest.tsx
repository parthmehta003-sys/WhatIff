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
  LineChart,
  Line
} from 'recharts';
import { 
  ArrowUpRight, 
  Info, 
  Share2, 
  Download, 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GLOBAL_AI_INSTRUCTION } from '../../aiInsightPrompt';
import { calculatePrepayVsInvest } from '../../lib/calculators';
import { formatCurrency, formatCompactNumber, formatIndianRupees, formatIndianShort, cn } from '../../lib/utils';
import SaveScenarioButton from '../SaveScenarioButton';
import ShareVision from '../ShareVision';
import InfoBox from '../InfoBox';
import InvestmentBrokerSection from '../InvestmentBrokerSection';
import { exportToExcel } from '../../lib/exportUtils';
import WhatiffInsights from '../WhatiffInsights';
import SliderWithInput from '../SliderWithInput';
import AIChat from '../AIChat';
import InsightFeedback from '../InsightFeedback';
import { Screen } from '../../App';
import { ThemeContext } from '../../contexts/ThemeContext';

interface PrepayVsInvestProps {
  onBack: () => void;
  onNavigate: (screen: Screen, params?: any) => void;
  onAskAI?: (context?: any) => void;
}

const STEPS = [
  { id: 'loan', title: 'Loan Details', icon: CreditCard },
  { id: 'extra', title: 'Extra Amount', icon: ArrowUpRight },
  { id: 'returns', title: 'Return Expectations', icon: TrendingUp },
  { id: 'results', title: 'Results', icon: Target }
];

export default function PrepayVsInvest({ onBack, onNavigate, onAskAI }: PrepayVsInvestProps) {
  const theme = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  const [currentStep, setCurrentStep] = useState(0);
  
  // Inputs
  const [outstanding, setOutstanding] = useState(4000000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);
  const [extra, setExtra] = useState(10000);
  const [sipReturn, setSipReturn] = useState(12);
  const [taxBracket, setTaxBracket] = useState(30);
  const [isOldRegime, setIsOldRegime] = useState(true);
  const [isELSS, setIsELSS] = useState(false);
  const [is80CUsed, setIs80CUsed] = useState(false);
  const [reinvestTaxSavings, setReinvestTaxSavings] = useState(true);

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
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));
  const MAX_QUESTIONS = 10;

  useEffect(() => {
    const timer = setTimeout(() => setChartReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const result = useMemo(() => {
    return calculatePrepayVsInvest(
      outstanding, 
      rate, 
      tenure, 
      extra, 
      sipReturn, 
      taxBracket, 
      isOldRegime, 
      isELSS, 
      is80CUsed,
      reinvestTaxSavings
    );
  }, [outstanding, rate, tenure, extra, sipReturn, taxBracket, isOldRegime, isELSS, is80CUsed, reinvestTaxSavings]);

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
          systemPrompt: `${GLOBAL_AI_INSTRUCTION}\n\nContext for this Prepay vs Invest calculation:\n${chatContext?.systemPrompt || ''}`,
          context: { outstanding, rate, tenure, extra, sipReturn, taxBracket, result }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to get AI response');
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const { insights, chips, systemPrompt } = useMemo(() => {
    const formatValue = (amount: number) => {
      const rounded = Math.round(amount);
      const abs = Math.abs(rounded);
      if (abs >= 10000000) {
        return (rounded / 10000000).toFixed(2) + 'Cr';
      }
      if (abs >= 100000) {
        return (rounded / 100000).toFixed(2) + 'L';
      }
      return rounded.toLocaleString('en-IN');
    };

    const tenureYears = tenure.toFixed(1);
    const netAdvantageVal = formatValue(result.netAdvantage);
    const spreadVal = (sipReturn - rate).toFixed(1);
    const expectedReturnVal = sipReturn.toFixed(1);
    const loanRateVal = rate.toFixed(1);
    const yearsSavedVal = result.yearsSaved.toFixed(1);
    const interestSavedVal = formatValue(result.scenarioA.interestSaved);
    const monthlyExtraVal = formatValue(extra);
    const sipCorpusVal = formatValue(result.scenarioB.fvSIP);
    const taxValueVal = formatValue(result.scenarioB.taxSaved);
    const taxLabelVal = reinvestTaxSavings ? "reinvested tax savings" : "tax savings";

    const insight1 = `Over a ${tenureYears}-year period, the investing approach results in ₹${netAdvantageVal} higher total wealth compared to prepayment.`;
    
    let insight2 = `The difference is driven by a ${spreadVal}% return spread (${expectedReturnVal}% vs ${loanRateVal}%), compounded over ${tenureYears} years.`;
    if (sipReturn - rate <= 0) {
      insight2 = `The expected return (${expectedReturnVal}%) is lower than or equal to the loan rate (${loanRateVal}%), which limits the impact of compounding.`;
    }

    const insight3 = `Prepayment reduces your loan tenure by ${yearsSavedVal} years and saves ₹${interestSavedVal} in interest, but shifts most of the wealth creation to the later years when EMI outflows stop.`;

    let insight4 = `Investing ₹${monthlyExtraVal}/month allows compounding to run for the full tenure, resulting in ₹${sipCorpusVal} from SIP and ₹${taxValueVal} from ${taxLabelVal}.`;
    if (result.scenarioB.taxSaved <= 0) {
      insight4 = `Investing ₹${monthlyExtraVal}/month allows compounding to run for the full tenure, resulting in ₹${sipCorpusVal} from SIP over the full tenure.`;
    }

    const insightsList = [insight1, insight2, insight3, insight4];

    const chipsList = [
      `Why is ${result.winner} better for me?`,
      `How does the EMI reinvestment work?`,
      `What if my home loan rate increases to ${rate + 1}%?`,
      `Explain the tax impact of ${isOldRegime ? 'Old' : 'New'} regime.`
    ];

    const prompt = `
      Analyze the Prepay vs Invest scenario for a loan of **${formatIndianShort(outstanding)}** at **${rate}%**.
      The user has a monthly extra of **${formatIndianShort(extra)}**.
      Explain why **${result.winner === 'prepay' ? 'Prepaying your loan' : 'Investing the extra amount'}** wins by **${formatIndianShort(Math.abs(result.netAdvantage))}**.
      Comparison period is the full **${tenure} years**.
    `.trim();

    return { insights: insightsList, chips: chipsList, systemPrompt: prompt };
  }, [outstanding, rate, tenure, extra, sipReturn, taxBracket, result, isOldRegime, reinvestTaxSavings]);


  const handleExport = () => {
    exportToExcel(
      "Prepay vs Invest Analysis",
      `Loan: ${formatCurrency(outstanding)} @ ${rate}%. Extra: ${formatCurrency(extra)}`,
      { outstanding, rate, tenure, extra, sipReturn, taxBracket },
      "Wealth (Scenario A)",
      result.scenarioA.wealth,
      [
        { label: 'Winner', value: result.winner === 'prepay' ? "Prepay" : "Invest" },
        { label: 'Invest Wealth', value: result.scenarioB.wealth },
        { label: 'Net Advantage', value: formatIndianShort(result.netAdvantage) }
      ],
      `Investing creates ${formatIndianShort(result.netAdvantage)} more wealth over ${tenure} years.`
    );
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const chartData = [
    { name: 'Prepay Path', value: result.scenarioA.wealth, color: '#10b981' },
    { name: 'Invest Path', value: result.scenarioB.wealth, color: '#8b5cf6' }
  ];

  return (
    <div className="space-y-8 w-full">
      <Helmet>
        <title>Prepay vs Invest Calculator — Should You Pay Off Your Loan? | WhatIff</title>
        <meta name="description" content="Decide whether to prepay your home loan or invest the extra money. Compare interest savings vs investment growth with tax benefits." />
      </Helmet>

      <button 
        onClick={currentStep > 0 ? prevStep : onBack} 
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-2 group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium uppercase tracking-widest">
          {currentStep > 0 ? 'Back to Inputs' : 'Back to Calculators'}
        </span>
      </button>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowUpRight className="w-6 h-6 text-purple-500" />
            Prepay vs Invest
          </h1>
          <p className="text-zinc-500 text-sm">Should you kill the debt or grow the wealth?</p>
        </div>
              <div className="flex items-center gap-2">
                {currentStep === 3 && (
                  <>
                    <button onClick={handleExport} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                    <SaveScenarioButton 
                      type="prepay_vs_invest" 
                      inputs={{ outstanding, rate, tenure, extra, sipReturn, taxBracket, isOldRegime, isELSS, is80CUsed, reinvestTaxSavings }} 
                      outputs={{ 
                        ...result, 
                        mainResult: result.netAdvantage 
                      }} 
                    />
                    <button onClick={() => setIsShareOpen(true)} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between px-2">
        {STEPS.map((step, idx) => (
          <div key={step.id} className="flex flex-col items-center gap-2 relative">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 z-10",
              idx <= currentStep ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-500"
            )}>
              <step.icon className="w-5 h-5" />
            </div>
            <span className={cn(
              "text-[10px] uppercase font-bold tracking-widest",
              idx <= currentStep ? "text-purple-400" : "text-zinc-600"
            )}>
              {step.title}
            </span>
            {idx < STEPS.length - 1 && (
              <div className={cn(
                "absolute top-5 left-10 w-[calc(100vw/4)] h-[2px] -z-0",
                idx < currentStep ? "bg-purple-500" : "bg-zinc-800"
              )} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="min-h-[400px]"
        >
          {currentStep === 0 && (
            <div className="glass-card p-8 space-y-8">
              <SliderWithInput
                label="Outstanding Loan Amount"
                value={outstanding}
                min={100000}
                max={50000000}
                step={100000}
                onChange={setOutstanding}
                formatDisplay={(v) => formatCurrency(v)}
                accentColor="purple"
              />
              <SliderWithInput
                label="Interest Rate (p.a)"
                value={rate}
                min={5}
                max={15}
                step={0.1}
                onChange={setRate}
                formatDisplay={(v) => `${v}%`}
                accentColor="purple"
              />
              <SliderWithInput
                label="Remaining Tenure"
                value={tenure}
                min={1}
                max={30}
                step={1}
                onChange={setTenure}
                formatDisplay={(v) => `${v} Years`}
                accentColor="purple"
              />
              <div className="flex justify-end pt-4">
                <button onClick={nextStep} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
                  Next Step <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="glass-card p-8 space-y-8">
              <SliderWithInput
                label="Monthly Extra Amount"
                value={extra}
                min={1000}
                max={outstanding / 10}
                step={1000}
                onChange={setExtra}
                formatDisplay={(v) => formatCurrency(v)}
                accentColor="purple"
              />
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm text-zinc-300">
                  This is the monthly extra amount you can afford. We will compare prepaying this against your loan vs investing it in a monthly SIP over the same period.
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={nextStep} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
                  Next Step <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="glass-card p-8 space-y-8">
              <SliderWithInput
                label="Expected Investment Return (p.a)"
                value={sipReturn}
                min={5}
                max={25}
                step={0.5}
                onChange={setSipReturn}
                formatDisplay={(v) => `${v}%`}
                accentColor="purple"
              />

              <div className="space-y-6 pt-4 border-t border-white/5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Tax Regime</label>
                    <div className="flex p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                      <button
                        onClick={() => setIsOldRegime(true)}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                          isOldRegime ? "bg-purple-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        Old
                      </button>
                      <button
                        onClick={() => setIsOldRegime(false)}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                          !isOldRegime ? "bg-purple-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        New
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Investment Type</label>
                    <div className="flex p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                      <button
                        onClick={() => setIsELSS(true)}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                          isELSS ? "bg-purple-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        ELSS
                      </button>
                      <button
                        onClick={() => setIsELSS(false)}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                          !isELSS ? "bg-purple-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        Other
                      </button>
                    </div>
                  </div>
                </div>

                {isELSS && isOldRegime && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <input
                        type="checkbox"
                        id="80c-used"
                        checked={is80CUsed}
                        onChange={(e) => setIs80CUsed(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-purple-600 focus:ring-purple-500"
                      />
                      <label htmlFor="80c-used" className="text-sm text-zinc-300 cursor-pointer">
                        I have already utilized my ₹1.5L Section 80C limit elsewhere
                      </label>
                    </div>

                    <div className={cn(
                      "p-4 rounded-xl border transition-all space-y-3",
                      (!isOldRegime || !isELSS || is80CUsed) 
                        ? "bg-zinc-900/50 border-zinc-800 opacity-60" 
                        : "bg-purple-500/5 border-purple-500/20"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-sm font-bold text-white flex items-center gap-2">
                            Reinvest tax savings?
                            <span title="If enabled, your annual tax savings will be invested at the same return rate.">
                              <Info className="w-3 h-3 text-zinc-500 cursor-help" />
                            </span>
                          </label>
                          <p className="text-[10px] text-zinc-500">If enabled, your annual tax savings will be invested at the same return rate.</p>
                        </div>
                        <div className="flex p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                          <button
                            disabled={!isOldRegime || !isELSS || is80CUsed}
                            onClick={() => setReinvestTaxSavings(true)}
                            className={cn(
                              "px-4 py-1.5 text-[10px] font-bold rounded-md transition-all",
                              reinvestTaxSavings && isOldRegime && isELSS && !is80CUsed ? "bg-purple-600 text-white" : "text-zinc-500"
                            )}
                          >
                            YES
                          </button>
                          <button
                            disabled={!isOldRegime || !isELSS || is80CUsed}
                            onClick={() => setReinvestTaxSavings(false)}
                            className={cn(
                              "px-4 py-1.5 text-[10px] font-bold rounded-md transition-all",
                              (!reinvestTaxSavings || !isOldRegime || !isELSS || is80CUsed) ? "bg-zinc-700 text-white" : "text-zinc-500"
                            )}
                          >
                            NO
                          </button>
                        </div>
                      </div>
                      {(!isOldRegime || !isELSS || is80CUsed) && (
                        <p className="text-[10px] text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Tax benefits not applicable
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <SliderWithInput
                label="Your Income Tax Bracket"
                value={taxBracket}
                min={0}
                max={45}
                step={5}
                onChange={setTaxBracket}
                formatDisplay={(v) => `${v}%`}
                accentColor="purple"
              />
              <div className="flex justify-end pt-4">
                <button onClick={nextStep} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
                  Show Results <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-8">
              {result.monthsSaved === 0 && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm text-zinc-300">
                    Your prepayment amount is too small to reduce the loan tenure. Try increasing the extra amount.
                  </p>
                </div>
              )}

              {/* Winner Banner */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "p-6 rounded-2xl border-2 flex flex-col md:flex-row items-center justify-between gap-6",
                  result.winner === 'prepay' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-purple-500/10 border-purple-500/20"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center",
                    result.winner === 'prepay' ? "bg-emerald-500/20" : "bg-purple-500/20"
                  )}>
                    {result.winner === 'prepay' ? <CheckCircle2 className="w-8 h-8 text-emerald-500" /> : <TrendingUp className="w-8 h-8 text-purple-500" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {result.winner === 'prepay' ? 'Prepay is Better!' : 'Invest is Better!'}
                    </h2>
                    <p className="text-zinc-400 text-sm">
                      {result.winner === 'prepay' 
                        ? `Prepaying creates ${formatIndianShort(Math.abs(result.netAdvantage))} more wealth.` 
                        : `Investing creates ${formatIndianShort(Math.abs(result.netAdvantage))} more wealth.`}
                    </p>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Net Advantage</p>
                  <p className="text-3xl font-bold text-white">{formatIndianShort(Math.abs(result.netAdvantage))}</p>
                  <p className="text-[10px] text-zinc-500">Over {tenure} years</p>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Prepay Card */}
                <div className="glass-card p-6 space-y-6 border-t-4 border-t-emerald-500">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-white">Scenario A: Prepay</h3>
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded uppercase tracking-wider">Debt Free Early</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-500">Interest Saved</span>
                        <span title="The total interest you avoid paying by closing the loan early.">
                          <Info className="w-3 h-3 text-zinc-500 cursor-help" />
                        </span>
                      </div>
                      <span className="text-emerald-400 font-bold">+{formatIndianShort(result.scenarioA.interestSaved)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-500">EMI Reinvestment</span>
                        <span title={`After the loan closes in ${result.newTenureYears.toFixed(1)} years, you invest your EMI (${formatCurrency(result.emi)}) for the remaining ${result.yearsSaved.toFixed(1)} years.`}>
                          <Info className="w-3 h-3 text-zinc-500 cursor-help" />
                        </span>
                      </div>
                      <span className="text-white font-bold">+{formatIndianShort(result.scenarioA.fvEMI)}</span>
                    </div>
                    
                    {isOldRegime && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-500">Tax Benefit Lost</span>
                          <span title="Tax loss considers ₹2L/year deduction cap under Section 24. Since the loan closes early, you lose the tax deduction on the interest you saved.">
                            <Info className="w-3 h-3 text-zinc-500 cursor-help" />
                          </span>
                        </div>
                        <span className="text-red-400 font-bold">−{formatIndianShort(result.scenarioA.taxLost)}</span>
                      </div>
                    )}

                    <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Total Wealth</p>
                        <p className="text-2xl font-bold text-white">{formatIndianShort(result.scenarioA.wealth)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Loan Closes In</p>
                        <p className="text-sm font-bold text-white">{result.newTenureYears.toFixed(1)} Years</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">Years Saved</p>
                        <p className="text-sm font-bold text-emerald-400">{result.yearsSaved.toFixed(1)} Years</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invest Card */}
                <div className="glass-card p-6 space-y-6 border-t-4 border-t-purple-500">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-white">Scenario B: Invest</h3>
                    <span className="px-2 py-1 bg-purple-500/10 text-purple-500 text-[10px] font-bold rounded uppercase tracking-wider">Wealth Growth</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">SIP Corpus ({tenure} years)</span>
                      <span className="text-purple-400 font-bold">+{formatIndianShort(result.scenarioB.fvSIP)}</span>
                    </div>

                    {result.scenarioB.taxSaved > 0 && (
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-zinc-500">
                            {result.scenarioB.isTaxReinvested ? "Tax Savings Invested" : "Tax Saved"}
                          </span>
                          <span title={result.scenarioB.isTaxReinvested ? "Future value of annual tax savings reinvested at the return rate." : "Total tax saved over the tenure by investing in ELSS."}>
                            <Info className="w-3 h-3 text-zinc-500 cursor-help" />
                          </span>
                        </div>
                        <span className="text-white font-bold">+{formatIndianShort(result.scenarioB.taxSaved)}</span>
                      </div>
                    )}

                    <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Total Wealth</p>
                        <p className="text-2xl font-bold text-white">{formatIndianShort(result.scenarioB.wealth)}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-white/5 mt-auto">
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        In this scenario, you continue paying your EMI for the full {tenure} years while your SIP grows in parallel.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comparison Period & Assumptions Info */}
              <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-yellow-500 shrink-0" />
                  <div className="text-xs text-zinc-400 space-y-2">
                    <p className="font-bold text-zinc-200">Comparison Period & Assumptions</p>
                    <p>
                      Both scenarios are compared over the full original tenure of {tenure} years. In the prepayment scenario, once the loan is closed, the EMI amount is assumed to be invested for the remaining months to ensure a symmetric comparison.
                    </p>
                    <p className="text-zinc-500 italic">
                      Monthly prepayment reduces principal directly with EMI unchanged. SIP returns are pre-tax. Section 24b tax impact is calculated on interest saved, accounting for the ₹2L/year deduction cap. Section 80C applies only if ELSS is selected, Old Regime is active, and headroom is available. Assumes no prior 80C investments unless specified. This is not financial advice.
                    </p>
                  </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-zinc-400 mb-6 uppercase tracking-widest">Net Gain Comparison</h3>
                <div className="h-[300px] w-full">
                  {chartReady && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
                        <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => formatCompactNumber(val)} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                          formatter={(value: number) => [formatCurrency(value), 'Net Benefit']}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={80}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <WhatiffInsights 
                calculatorType="prepay-vs-invest" 
                insights={insights}
                chips={chips}
                systemPrompt={systemPrompt}
                results={result} 
                onAskAI={handleAskAI}
                hideBullets={true}
              />

              <div className="flex justify-end pt-4">
                <button onClick={() => setCurrentStep(0)} className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
                  Recalculate from start <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {result.winner === 'invest' && <InvestmentBrokerSection />}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {currentStep === 3 && (
        <>
        </>
      )}

      {/* Local AI Chat */}
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

      <ShareVision 
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title="Prepay vs Invest Vision"
        description={`Analysis for a ${formatCurrency(outstanding)} loan. Prepaying vs Investing an extra ${formatCurrency(extra)}.`}
        mainValue={Math.abs(result.netAdvantage)}
        mainLabel="Net Advantage"
        secondaryValues={[
          { label: 'Years Saved', value: `${result.yearsSaved.toFixed(1)} Yrs` },
          { label: 'Winner', value: result.winner === 'prepay' ? 'Prepay' : 'Invest' }
        ]}

        insight={`Investing creates ${formatIndianShort(Math.abs(result.netAdvantage))} more wealth over ${tenure} years.`}
        category="borrow"
        inputs={{ 
          outstanding, 
          rate, 
          tenure, 
          extra, 
          sipReturn, 
          taxBracket, 
          isOldRegime, 
          isELSS, 
          is80CUsed, 
          reinvestTaxSavings,
          calculatorType: 'prepay-vs-invest',
          result
        }}
        onSave={() => setIsShareOpen(false)}
      />

      {currentStep === STEPS.length - 1 && (
        <footer className="py-12 flex justify-center">
          <InsightFeedback 
            calculator="PrepayVsInvest" 
          />
        </footer>
      )}
    </div>
  );
}
