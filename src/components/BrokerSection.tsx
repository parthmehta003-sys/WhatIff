import React, { useContext } from 'react';
import { ExternalLink, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { ThemeContext } from '../contexts/ThemeContext';

interface BrokerSectionProps {
  type?: 'home' | 'general';
}

const BROKERS = {
  home: [
    {
      name: 'HDFC Bank',
      logo: 'https://www.google.com/s2/favicons?domain=hdfcbank.com&sz=64',
      rate: '8.45%',
      rating: 4.8,
      tags: ['Fast Approval', 'Digital Process'],
      url: 'https://www.hdfcbank.com/personal/borrow/popular-loans/home-loan'
    },
    {
      name: 'ICICI Bank',
      logo: 'https://www.google.com/s2/favicons?domain=icicibank.com&sz=64',
      rate: '8.60%',
      rating: 4.7,
      tags: ['Low Processing Fee'],
      url: 'https://www.icicibank.com/personal-banking/loans/home-loan'
    },
    {
      name: 'SBI',
      logo: 'https://www.google.com/s2/favicons?domain=onlinesbi.sbi&sz=64',
      rate: '8.40%',
      rating: 4.6,
      tags: ['Trusted', 'Wide Network'],
      url: 'https://homeloans.sbi/'
    },
    {
      name: 'Axis Bank',
      logo: 'https://www.google.com/s2/favicons?domain=axisbank.com&sz=64',
      rate: '8.75%',
      rating: 4.5,
      tags: ['Flexible Tenure'],
      url: 'https://www.axisbank.com/retail/loans/home-loan'
    }
  ],
  general: [
    {
      name: 'HDFC Bank',
      logo: 'https://www.google.com/s2/favicons?domain=hdfcbank.com&sz=64',
      rate: '10.5%',
      rating: 4.8,
      tags: ['All Loan Types', 'Digital'],
      url: 'https://www.hdfcbank.com/personal/borrow/popular-loans'
    },
    {
      name: 'ICICI Bank',
      logo: 'https://www.google.com/s2/favicons?domain=icicibank.com&sz=64',
      rate: '10.75%',
      rating: 4.7,
      tags: ['Personal & Auto', 'Easy'],
      url: 'https://www.icicibank.com/personal-banking/loans'
    },
    {
      name: 'SBI',
      logo: 'https://www.google.com/s2/favicons?domain=onlinesbi.sbi&sz=64',
      rate: '10.25%',
      rating: 4.6,
      tags: ['Government Trusted'],
      url: 'https://bank.sbi/web/personal-banking/loans'
    },
    {
      name: 'Axis Bank',
      logo: 'https://www.google.com/s2/favicons?domain=axisbank.com&sz=64',
      rate: '10.99%',
      rating: 4.5,
      tags: ['Quick Disbursal'],
      url: 'https://www.axisbank.com/retail/loans'
    }
  ]
};

export default function BrokerSection({ type = 'general' }: BrokerSectionProps) {
  const theme = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const brokers = BROKERS[type];

  return (
    <div className={cn("space-y-6 pt-8 border-t transition-colors duration-300", isDark ? "border-white/5" : "border-zinc-200")}>
      <div className="flex items-center justify-between">
        <h3 className={cn("text-xl font-bold transition-colors duration-300", isDark ? "text-white" : "text-zinc-900")}>Top Lenders</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {brokers.map((broker, i) => (
          <motion.a 
            key={broker.name}
            href={broker.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "glass-card p-5 transition-all group cursor-pointer border block",
              isDark 
                ? "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20" 
                : "bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 shadow-sm"
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-white p-1.5 flex items-center justify-center shadow-sm border border-zinc-100">
                <img 
                  src={broker.logo} 
                  alt={broker.name} 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  width="40"
                  height="40"
                />
              </div>
              <div className="flex items-center gap-1 bg-yellow-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-500">
                <Star className="w-2.5 h-2.5 fill-current" />
                {broker.rating}
              </div>
            </div>
            
            <div className="space-y-1 mb-4">
              <h4 className={cn("font-bold transition-colors duration-300 group-hover:text-purple-500", isDark ? "text-white group-hover:text-purple-400" : "text-zinc-900")}>{broker.name}</h4>
              <p className="text-xs text-zinc-500">Starting at <span className={cn("font-semibold", isDark ? "text-white" : "text-zinc-900")}>{broker.rate}</span></p>
            </div>
            
            <div className="flex flex-wrap gap-1.5 mb-4">
              {broker.tags.map(tag => (
                <span key={tag} className={cn(
                  "text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                  isDark ? "text-zinc-400 bg-white/5" : "text-zinc-500 bg-zinc-100"
                )}>
                  {tag}
                </span>
              ))}
            </div>
            
            <div className={cn(
              "flex items-center justify-between text-[10px] font-bold uppercase tracking-widest pt-3 border-t transition-colors duration-300",
              isDark ? "text-purple-400 border-white/5" : "text-purple-600 border-zinc-100"
            )}>
              Check Eligibility
              <ExternalLink className="w-3 h-3" />
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
