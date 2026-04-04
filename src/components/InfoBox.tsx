import React, { useContext } from 'react';
import { Info, AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { ThemeContext } from '../contexts/ThemeContext';

export type RiskLevel = 'safe' | 'moderate' | 'high';

interface InfoBoxProps {
  level: RiskLevel;
  message: string;
  className?: string;
}

export default function InfoBox({ level, message, className }: InfoBoxProps) {
  const theme = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const configs = {
    safe: {
      bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
      border: isDark ? 'border-emerald-500/20' : 'border-emerald-100',
      text: isDark ? 'text-emerald-200/70' : 'text-emerald-700',
      icon: ShieldCheck,
      iconColor: 'text-emerald-500'
    },
    moderate: {
      bg: isDark ? 'bg-yellow-500/10' : 'bg-yellow-50',
      border: isDark ? 'border-yellow-500/20' : 'border-yellow-100',
      text: isDark ? 'text-yellow-200/70' : 'text-yellow-700',
      icon: AlertTriangle,
      iconColor: 'text-yellow-500'
    },
    high: {
      bg: isDark ? 'bg-red-500/10' : 'bg-red-50',
      border: isDark ? 'border-red-500/20' : 'border-red-100',
      text: isDark ? 'text-red-200/70' : 'text-red-700',
      icon: AlertCircle,
      iconColor: 'text-red-500'
    }
  };

  const config = configs[level];
  const Icon = config.icon;

  return (
    <div className={cn("p-4 rounded-xl flex gap-3 items-start border transition-colors duration-300", config.bg, config.border, className)}>
      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", config.iconColor)} />
      <p className={cn("text-xs leading-relaxed", config.text)}>
        {message}
      </p>
    </div>
  );
}
