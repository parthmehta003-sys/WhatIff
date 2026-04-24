import React, { useState, useEffect, Suspense, lazy, createContext, useContext } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  CreditCard, 
  Target, 
  Palmtree, 
  ShieldCheck,
  ChevronLeft,
  Info,
  Lock,
  Home,
  BarChart2,
  Settings,
  User,
  Instagram,
  Twitter,
  Linkedin,
  Facebook
} from 'lucide-react';
import { GLOBAL_AI_INSTRUCTION } from './aiInsightPrompt';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { trackPageView } from './lib/analytics';
import AIChat from './components/AIChat';
import Footer from './components/Footer';
import { ThemeContext } from './contexts/ThemeContext';

// Core views (statistically imported for SEO and stability)
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

// Lazy loaded views
const SIPCalculator = lazy(() => import('./components/calculators/SIPCalculator'));
const EMICalculator = lazy(() => import('./components/calculators/EMICalculator'));
const GoalPlanner = lazy(() => import('./components/calculators/GoalPlanner'));
const RetirementCalculator = lazy(() => import('./components/calculators/RetirementCalculator'));
const LoanAffordability = lazy(() => import('./components/calculators/LoanAffordability'));
const HomePurchaseCalculator = lazy(() => import('./components/calculators/HomePurchaseCalculator'));
const StaggeredFDPlanner = lazy(() => import('./components/calculators/StaggeredFDPlanner'));
const BasicFDCalculator = lazy(() => import('./components/calculators/BasicFDCalculator'));
const BuyVsRentCalculator = lazy(() => import('./components/calculators/BuyVsRentCalculator'));
const PrepayVsInvest = lazy(() => import('./components/calculators/PrepayVsInvest'));
const ChildFuturePlanner = lazy(() => import('./components/calculators/ChildFuturePlanner'));
const FinancialAwarenessScore = lazy(() => import('./components/FinancialAwarenessScore'));
const ComparisonView = lazy(() => import('./components/ComparisonView'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const TermsOfUse = lazy(() => import('./components/TermsOfUse'));

export type Screen = 'landing' | 'dashboard' | 'sip' | 'emi' | 'goal' | 'retirement' | 'affordability' | 'home_purchase' | 'prepay_vs_invest' | 'staggered_fd' | 'basic_fd' | 'buy_vs_rent' | 'child_future_planner' | 'financial_awareness_score' | 'comparison' | 'privacy' | 'terms';

const screenToPath: Record<Screen, string> = {
  landing: '/',
  dashboard: '/dashboard',
  sip: '/sip-calculator',
  emi: '/emi-calculator',
  goal: '/goal-planner',
  retirement: '/retirement-calculator',
  affordability: '/loan-affordability',
  home_purchase: '/home-purchase',
  prepay_vs_invest: '/prepay-vs-invest',
  staggered_fd: '/staggered-fd-calculator',
  basic_fd: '/fd-calculator',
  buy_vs_rent: '/buy-vs-rent',
  child_future_planner: '/child-future-planner',
  financial_awareness_score: '/financial-awareness-score',
  comparison: '/comparison',
  privacy: '/privacy',
  terms: '/terms'
};

const pathToScreen: Record<string, Screen> = Object.entries(screenToPath).reduce((acc, [screen, path]) => {
  acc[path] = screen as Screen;
  return acc;
}, {} as Record<string, Screen>);

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentScreen = pathToScreen[location.pathname] || 'landing';

  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<any>(null);

  // Theme is always dark
  const theme = 'dark';
  const isDark = true;

  // Chat State (Global fallback for dashboard, but calculators will override)
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);

  useEffect(() => {
    trackPageView(currentScreen);
  }, [location.pathname]);

  const handleNavigate = (screen: Screen, state?: any) => {
    navigate(screenToPath[screen], { state });
  };

  const handleCompare = (ids: string[]) => {
    setSelectedScenarioIds(ids);
    navigate('/comparison');
  };

  const openChat = (context?: any, chips?: string[], systemPrompt?: string) => {
    setChatContext({ ...context, chips, systemPrompt });
    setIsChatOpen(true);
  };

  const MAX_QUESTIONS = 10;
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));

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
          systemPrompt: `${GLOBAL_AI_INSTRUCTION}\n\nContext:\n${chatContext?.systemPrompt || ''}`,
          context: chatContext?.aiData || {}
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

  return (
    <ThemeContext.Provider value={theme}>
      <div 
        className={cn(
          "min-h-screen flex flex-col transition-colors duration-300",
          isDark ? "bg-zinc-950 text-zinc-100" : "bg-[#f8f7f4] text-[#09090b]"
        )}
      >
        {/* Header */}
        {currentScreen !== 'landing' && currentScreen !== 'privacy' && currentScreen !== 'terms' && (
          <header 
            className={cn(
              "border-b backdrop-blur-xl sticky top-0 z-50 transition-colors duration-300",
              isDark ? "border-white/5 bg-zinc-900/50" : "border-[#e4e4e7] bg-white/70"
            )}
          >
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    if (currentScreen === 'dashboard') {
                      navigate('/');
                    } else {
                      navigate('/dashboard');
                    }
                  }}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isDark ? "hover:bg-white/5 text-zinc-100" : "hover:bg-black/5 text-[#09090b]"
                  )}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xl font-bold tracking-tight flex items-center gap-2">
                  WhatIff
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border transition-colors bg-emerald-500/10 border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Privacy First</span>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 w-full", 
          (currentScreen !== 'landing' && currentScreen !== 'privacy' && currentScreen !== 'terms') && "max-w-5xl mx-auto p-6"
        )}>
          <AnimatePresence mode="wait">
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<LandingPage onStart={() => navigate('/dashboard')} onNavigate={handleNavigate} />} />
                  <Route path="/dashboard" element={<Dashboard onNavigate={handleNavigate} onCompare={handleCompare} />} />
                  <Route path="/sip-calculator" element={<SIPCalculator onBack={() => navigate('/dashboard')} onNavigate={handleNavigate} onAskAI={openChat} />} />
                  <Route path="/emi-calculator" element={<EMICalculator onBack={() => navigate('/dashboard')} onNavigate={handleNavigate} onAskAI={openChat} />} />
                  <Route path="/goal-planner" element={<GoalPlanner onBack={() => navigate('/dashboard')} onNavigate={handleNavigate} initialData={location.state} onAskAI={openChat} />} />
                  <Route path="/retirement-calculator" element={<RetirementCalculator onBack={() => navigate('/dashboard')} onNavigate={handleNavigate} onAskAI={openChat} />} />
                  <Route path="/loan-affordability" element={<LoanAffordability onBack={() => navigate('/dashboard')} onAskAI={openChat} />} />
                  <Route path="/home-purchase" element={<HomePurchaseCalculator onBack={() => navigate('/dashboard')} onNavigate={handleNavigate} onAskAI={openChat} />} />
                  <Route path="/prepay-vs-invest" element={<PrepayVsInvest onBack={() => navigate('/dashboard')} onNavigate={handleNavigate} onAskAI={openChat} />} />
                  <Route path="/staggered-fd-calculator" element={<StaggeredFDPlanner onBack={() => navigate('/dashboard')} initialPrincipal={location.state?.principal} onAskAI={openChat} />} />
                  <Route path="/fd-calculator" element={<BasicFDCalculator onBack={() => navigate('/dashboard')} onNavigate={handleNavigate} onAskAI={openChat} />} />
                  <Route path="/buy-vs-rent" element={<BuyVsRentCalculator onBack={() => navigate('/dashboard')} initialData={location.state} onAskAI={openChat} />} />
                  <Route path="/child-future-planner" element={<ChildFuturePlanner onBack={() => navigate('/dashboard')} onNavigate={handleNavigate} onAskAI={openChat} />} />
                  <Route path="/financial-awareness-score" element={<FinancialAwarenessScore onBack={() => navigate('/dashboard')} onAskAI={openChat} />} />
                  <Route path="/comparison" element={<ComparisonView ids={selectedScenarioIds} onBack={() => navigate('/dashboard')} />} />
                  <Route path="/privacy" element={<PrivacyPolicy onBack={() => navigate(-1)} />} />
                  <Route path="/terms" element={<TermsOfUse onBack={() => navigate(-1)} />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </motion.div>
            </Suspense>
          </AnimatePresence>
          {currentScreen !== 'landing' && (
            <Footer onNavigate={handleNavigate} className="mt-20" />
          )}
        </main>

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
    </ThemeContext.Provider>
  );
}
