import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  CreditCard, 
  Target, 
  Palmtree, 
  ShieldCheck,
  ArrowRight,
  Info,
  History,
  Trash2,
  BarChart3,
  CheckCircle2,
  Home,
  HelpCircle,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen } from '../App';
import { cn, formatCurrency } from '../lib/utils';
import { storage, SavedScenario } from '../lib/storage';
import DisclaimerModal from './DisclaimerModal';
import TypewriterText from './TypewriterText';
import InsightFeedback from './InsightFeedback';
import BackgroundAnimation from './BackgroundAnimation';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
  onCompare: (ids: string[]) => void;
}

const calculators = [
  {
    id: 'sip' as Screen,
    name: 'SIP Calculator',
    description: 'Plan your wealth growth with monthly investments.',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    tag: 'GROW',
  },
  {
    id: 'goal' as Screen,
    name: 'Goal Planner',
    description: 'Find out how much you need to save for your dreams.',
    icon: Target,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    tag: 'GROW',
  },
  {
    id: 'retirement' as Screen,
    name: 'Retirement',
    description: 'Ensure a comfortable future with corpus planning.',
    icon: Palmtree,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    tag: 'GROW',
  },
  {
    id: 'basic_fd' as Screen,
    name: 'Basic FD Calculator',
    description: 'Calculate your fixed deposit returns and tax impact.',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    tag: 'GROW',
  },
  {
    id: 'staggered_fd' as Screen,
    name: 'Staggered FD Planner',
    description: 'Optimize your emergency fund for liquidity and returns.',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    tag: 'GROW',
  },
  {
    id: 'emi' as Screen,
    name: 'EMI Calculator',
    description: 'Calculate monthly loan repayments and interest.',
    icon: CreditCard,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    tag: 'BORROW',
  },
  {
    id: 'affordability' as Screen,
    name: 'Loan Affordability',
    description: 'Check if you can safely afford a new loan.',
    icon: ShieldCheck,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    tag: 'BORROW',
  },
  {
    id: 'prepay_vs_invest' as Screen,
    name: 'Prepay vs Invest',
    description: 'Have a loan? should you invest this SIP or prepay your loan.',
    icon: ArrowUpRight,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    tag: 'BORROW',
  },
  {
    id: 'home_purchase' as Screen,
    name: 'Home Purchase',
    description: 'Can you buy that dream home? Check EMI and down payment readiness.',
    icon: Home,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    tag: 'BUY',
  },
  {
    id: 'buy_vs_rent' as Screen,
    name: 'Buy vs Rent',
    description: 'Is buying actually better than renting and investing the difference?',
    icon: BarChart3,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    tag: 'BUY',
  },
  {
    id: 'child_future_planner' as Screen,
    name: "Plan for Your Child's Future",
    description: "Plan your child's school fees, higher education, and wedding — with the SIP you need to start today.",
    icon: ArrowUpRight,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    tag: 'PLAN',
  },
];

const categories = [
  { id: 'GROW', name: 'GROW', sub: 'Build your wealth, one step at a time.', color: 'text-emerald-500' },
  { id: 'BORROW', name: 'BORROW', sub: 'Manage your debt with precision.', color: 'text-purple-500' },
  { id: 'BUY', name: 'BUY', sub: 'Big purchases, simplified.', color: 'text-blue-500' },
  { id: 'PLAN', name: 'PLAN', sub: 'Major life decisions, financially mapped.', color: 'text-amber-500' },
];

export default function Dashboard({ onNavigate, onCompare }: DashboardProps) {
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [showPills, setShowPills] = useState(false);
  const [lastFasScore, setLastFasScore] = useState<number | null>(null);

  useEffect(() => {
    setSavedScenarios(storage.getScenarios());
    const saved = localStorage.getItem('whatiff_fas_result');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.score <= 100) {
          setLastFasScore(parsed.score);
        }
      } catch (e) {
        console.error("Failed to parse scorecard result", e);
      }
    }
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.deleteScenario(id);
    setSavedScenarios(storage.getScenarios());
    setSelectedIds(prev => prev.filter(i => i !== id));
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="relative min-h-screen">
      <BackgroundAnimation />
      <div className="relative z-10 space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-2 pt-8 pb-12 relative">
        <div className="space-y-10">
          <TypewriterText 
            text1="Know your numbers." 
            text2="Own your future." 
            onComplete={() => setShowPills(true)}
          />
        </div>
      </section>

      {/* Featured Awareness Score */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
        <button 
          onClick={() => onNavigate('financial_awareness_score')}
          className="w-full text-left group relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-amber-500/[0.03] to-transparent p-8 transition-all hover:border-amber-500/40 hover:bg-amber-500/[0.12] active:scale-[0.99]"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 max-w-xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500/80">Independent Assessment</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white tracking-tight leading-tight group-hover:text-amber-500 transition-colors">Financial Awareness Score</h2>
                <p className="text-white text-sm leading-relaxed">
                  20 questions. 3 minutes. Discover how financially aware you really are across 10 key areas including Emergency funds, Retirement, and Insurance.
                </p>
              </div>
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-500 uppercase tracking-widest">
                  {lastFasScore !== null ? 'Retake Assessment' : 'Start Now'} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
                <div className="h-4 w-[1px] bg-white/10" />
                <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex gap-4">
                  <span>20 Questions</span>
                  <span>3 Mins</span>
                </div>
              </div>
            </div>

            {/* Score Preview */}
            <div className="relative shrink-0 flex items-center justify-center w-36 h-36 md:w-44 md:h-44">
               <div className="absolute inset-0 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors" />
               <div className="relative z-10 flex flex-col items-center">
                  <span className={cn(
                    "font-black tracking-tighter leading-none transition-all duration-500",
                    lastFasScore !== null ? "text-5xl md:text-6xl text-amber-500" : "text-4xl md:text-5xl text-zinc-800"
                  )}>
                    {lastFasScore !== null ? lastFasScore : '???'}
                  </span>
                  <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                    {lastFasScore !== null ? 'YOUR SCORE' : 'DISCOVER SCORE'}
                  </span>
               </div>
               
               {/* Visual decorative ring */}
               <svg className="absolute inset-0 w-full h-full p-2 -rotate-90">
                 <circle cx="50%" cy="50%" r="42%" fill="none" stroke="currentColor" className="text-white/[0.03]" strokeWidth="2" strokeDasharray="4 4" />
                 {lastFasScore !== null && (
                   <motion.circle 
                     cx="50%" cy="50%" r="42%" 
                     fill="none" stroke="currentColor" 
                     className="text-amber-500/40" 
                     strokeWidth="4"
                     strokeDasharray="100 100"
                     initial={{ strokeDashoffset: 100 }}
                     animate={{ strokeDashoffset: 100 - lastFasScore }}
                     transition={{ duration: 1.5, ease: "easeOut" }}
                   />
                 )}
               </svg>
            </div>
          </div>
          
          {/* Background pattern */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
        </button>
      </section>

      {/* Calculators Grid */}
      <div className="space-y-12">
        {categories.map((category) => (
          <div key={category.id} className="space-y-6">
            <div className="flex flex-col gap-1">
              <h2 className={cn("text-xl font-black tracking-tighter", category.color)}>{category.name}</h2>
              <p className="text-xs text-zinc-500 font-medium">{category.sub}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {calculators
                .filter(calc => calc.tag === category.id)
                .map((calc, index) => (
                  <motion.div
                    key={calc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onNavigate(calc.id)}
                    className="group glass-card p-6 text-left hover:bg-white/5 transition-all duration-300 flex flex-col justify-between h-48 cursor-pointer relative"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", calc.bg)}>
                          <calc.icon className={cn("w-6 h-6", calc.color)} />
                        </div>
                        <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider", calc.bg, calc.color)}>
                          {calc.tag}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg text-white group-hover:text-teal-400 transition-colors">{calc.name}</h3>
                        <p className="text-xs text-zinc-500 line-clamp-2">{calc.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 group-hover:text-white transition-colors">
                        Open Calculator <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                    <button
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        setIsDisclaimerOpen(true);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDisclaimerOpen(true);
                      }}
                      className="absolute bottom-4 right-4 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <DisclaimerModal 
        isOpen={isDisclaimerOpen} 
        onClose={() => setIsDisclaimerOpen(false)} 
      />

      {/* Saved Scenarios */}
      {savedScenarios.length > 0 && (
        <section className="space-y-6 pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-zinc-500" />
              <h3 className="text-xl font-bold text-white">Recent Scenarios</h3>
            </div>
            {selectedIds.length >= 2 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => onCompare(selectedIds)}
                className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-teal-500/20"
              >
                <BarChart3 className="w-4 h-4" />
                Compare {selectedIds.length}
              </motion.button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence>
              {savedScenarios.map((scenario) => {
                const isSelected = selectedIds.includes(scenario.id);
                return (
                  <motion.div
                    key={scenario.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onClick={(e) => toggleSelect(scenario.id, e)}
                    className={cn(
                      "glass-card p-4 flex items-center justify-between cursor-pointer transition-all group",
                      isSelected ? "bg-teal-500/10 border-teal-500/30" : "hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                        isSelected ? "bg-teal-500 border-teal-500" : "border-zinc-700 group-hover:border-zinc-500"
                      )}>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{scenario.name}</h4>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                          {scenario.type.replace('_', ' ')} • {new Date(scenario.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-0.5">Result</p>
                        <p className="text-sm font-bold text-white">
                          {(() => {
                            const val = scenario.outputs.mainResult ?? scenario.outputs.futureValue ?? scenario.outputs.monthlyEMI ?? scenario.outputs.corpusRequired ?? scenario.outputs.maxLoan;
                            return (val !== undefined && val !== null && isFinite(val)) ? formatCurrency(val) : "—";
                          })()}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => handleDelete(scenario.id, e)}
                        className="p-2 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          {selectedIds.length < 2 && (
            <p className="text-[10px] text-zinc-600 text-center uppercase font-bold tracking-widest">Select 2+ scenarios to compare</p>
          )}
        </section>
      )}
      
      </div>
      
      {/* Footer Feedback */}
      <footer className="relative z-10 py-12 flex justify-center">
        <InsightFeedback 
          calculator="Dashboard" 
          isDashboard={true} 
        />
      </footer>
    </div>
  );
}
