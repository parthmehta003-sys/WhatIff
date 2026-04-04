import React, { useState, useContext } from 'react';
import { Sparkles, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ThemeContext } from '../contexts/ThemeContext';

interface WhatiffInsightsProps {
  calculatorType: 'retirement' | 'sip' | 'emi' | 'goal' | 'fd' | 'staggered-fd' | 'loan-affordability' | 'home-purchase' | 'buy-vs-rent' | 'prepay-vs-invest';
  results: any;
  onAskAI?: (context?: any, chips?: string[], systemPrompt?: string) => void;
  insights?: string[];
  chips?: string[];
  systemPrompt?: string;
  hideBullets?: boolean;
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

export default function WhatiffInsights({ 
  calculatorType, 
  results, 
  onAskAI,
  insights: propsInsights,
  chips,
  systemPrompt,
  hideBullets = false
}: WhatiffInsightsProps) {
  const theme = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  const generateWhatiffInsights = () => {
    if (propsInsights) return propsInsights;
    if (!results) return [];

    const format = (val: number) => {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
      return `₹${val.toLocaleString('en-IN')}`;
    };

    switch (calculatorType) {
      case 'retirement': {
        const coverage = results.netWorthCoversPercent || 0;
        const shortfallPercent = results.corpusRequired > 0 ? (results.shortfall / results.corpusRequired) * 100 : 0;
        return [
          `Your current net worth covers ~${coverage.toFixed(1)}% of your target ${format(results.corpusRequired)} corpus.`,
          `Inflation at ${results.inflation}% means your ${format(results.monthlyExpense)} today will feel like ${format(results.futureMonthlyExpense)} by retirement.`,
          shortfallPercent > 0 
            ? `There is a ${shortfallPercent.toFixed(1)}% gap in your retirement fund that requires a ${format(results.requiredSIP)} monthly SIP to bridge.`
            : "Your existing assets are mathematically sufficient to sustain your lifestyle without additional monthly savings."
        ];
      }
      case 'sip': {
        const returnsRatio = results.totalValue > 0 ? (results.totalEarnings / results.totalValue) * 100 : 0;
        const inflationErosion = results.inflationErosionPercent || 0;
        return [
          `Estimated returns account for ~${returnsRatio.toFixed(1)}% of your final ${format(results.totalValue)} wealth.`,
          `Inflation will erode ~${inflationErosion}% of your future corpus's purchasing power over ${results.years} years.`,
          `Your real wealth (inflation-adjusted) is projected to be ${format(results.realCorpus)}, which is ${format(results.realWealthCreated)} more than your investment.`
        ];
      }
      case 'emi': {
        const interestRatio = results.totalPayment > 0 ? (results.totalInterest / results.totalPayment) * 100 : 0;
        const interestMultiple = results.loanAmount > 0 ? (results.totalInterest / results.loanAmount).toFixed(2) : '0';
        return [
          `Interest costs represent ~${interestRatio.toFixed(1)}% of your total loan repayment of ${format(results.totalPayment)}.`,
          `You are paying back ~${interestMultiple}x the original ${format(results.loanAmount)} borrowed in interest alone.`,
          `The effective cost of your purchase increases significantly over ${results.tenure} years due to the ${results.interestRate}% interest rate.`
        ];
      }
      case 'goal': {
        const coverage = results.targetAmount > 0 ? ((results.targetAmount - (results.shortfall || 0)) / results.targetAmount) * 100 : 0;
        const wealthGain = results.totalEarnings || 0;
        return [
          `Your current plan covers ~${coverage.toFixed(1)}% of your ${format(results.targetAmount)} goal.`,
          `Compounding is expected to add ${format(wealthGain)} to your total investment of ${format(results.totalInvestment)}.`,
          `To reach the target, you need to generate a ${results.requiredReturn}% return on a ${format(results.monthlySIP)} monthly investment.`
        ];
      }
      case 'fd': {
        const realReturn = results.interestRate - 6; // Assuming 6% inflation
        return [
          `Your ${format(results.principal)} investment will generate ${format(results.totalInterest)} in interest over ${results.tenure / 12} years.`,
          `With inflation at ~6%, your real (inflation-adjusted) return is approximately ${realReturn.toFixed(1)}% per year.`,
          `Traditional deposits prioritize safety, but the ${format(results.maturityAmount)} maturity value may have lower purchasing power in the future.`
        ];
      }
      case 'staggered-fd': {
        const interval = results.interval || 3;
        return [
          `Your staggered strategy creates a recurring liquidity event every ${interval} months across ${results.staggeredCount || results.fdData?.length || 0} deposits.`,
          `The laddering approach reduces interest rate risk by spreading your ${format(results.totalPrincipal || results.amountPerFD * results.fdData?.length)} principal across multiple maturity dates.`,
          `This strategy ensures you never lock all your capital into a single rate, providing flexibility for future rate hikes.`
        ];
      }
      case 'loan-affordability': {
        const dti = results.ratio || 0;
        return [
          `Lenders typically cap your total debt-to-income ratio at 40-50%; your current profile suggests a ${dti}% ratio.`,
          `Based on your inputs, a safe EMI is ${format(results.availableEMI)}, supporting a ${format(results.maxLoan)} loan.`,
          `Your ${results.riskLevel} risk rating reflects the balance between your existing obligations and new borrowing capacity.`
        ];
      }
      case 'home-purchase': {
        const emiToIncome = results.salary > 0 ? (results.monthlyEMI / results.salary) * 100 : 0;
        return [
          `Your monthly EMI of ${format(results.monthlyEMI)} would consume ~${emiToIncome.toFixed(1)}% of your ${format(results.salary)} monthly salary.`,
          `A down payment of ${format(results.downPayment)} is required to secure the ${format(results.propertyPrice)} property.`,
          `The minimum recommended salary for this purchase is ${format(results.minSalary)}, ensuring you aren't "house poor" after the buy.`
        ];
      }
      case 'buy-vs-rent': {
        const diff = results.netWorthBuy - results.netWorthRent;
        const isBuyBetter = diff > 0;
        return [
          `${isBuyBetter ? 'Buying' : 'Renting'} is projected to leave you with ${format(Math.abs(diff))} more wealth after ${results.tenureYears || results.tenure} years.`,
          `The total cost of ownership (including interest and maintenance) is estimated at ${format(results.totalPaidBuy)}.`,
          `Renting and investing the difference could build a corpus of ${format(results.netWorthRent)} over the same period.`
        ];
      }
      default:
        return [
          "Your financial numbers show a clear relationship between time and growth potential.",
          "Consistent contributions are the primary driver of long-term wealth accumulation.",
          "Understanding the impact of inflation is crucial for maintaining your future purchasing power."
        ];
    }
  };

  const renderBold = (text: string) => {
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-emerald-600 font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const insights = generateWhatiffInsights();

  return (
    <div className="space-y-6">
      <div className={cn(
        "glass-card p-6 border-l-4 border-emerald-500 transition-colors duration-300",
        isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
      )}>
        <button 
          onClick={() => setIsInsightsOpen(!isInsightsOpen)}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h3 className={cn("text-lg font-bold transition-colors duration-300", isDark ? "text-white" : "text-black")}>Whatiff Insights</h3>
          </div>
          <div className={cn("flex items-center gap-2 transition-colors duration-300", isDark ? "text-zinc-500 group-hover:text-white" : "text-zinc-500 group-hover:text-black")}>
            <span className="text-xs font-bold uppercase tracking-wider">
              {isInsightsOpen ? 'Hide' : 'View'} Insights
            </span>
            {isInsightsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
        
        <AnimatePresence>
          {isInsightsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div key={index} className="flex gap-3">
                    {!hideBullets && <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                    <p className={cn("leading-relaxed transition-colors duration-300", isDark ? "text-zinc-300" : "text-zinc-700")}>{renderBold(insight)}</p>
                  </div>
                ))}
              </div>

              {onAskAI && (
                <button
                  onClick={() => onAskAI({ ...results, calculatorType }, chips, systemPrompt)}
                  className={cn(
                    "mt-8 w-full py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                    isDark ? "bg-white text-zinc-950 hover:bg-zinc-200" : "bg-black text-white hover:bg-zinc-800"
                  )}
                >
                  <MessageSquare className="w-5 h-5" />
                  Ask anything about these numbers
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
