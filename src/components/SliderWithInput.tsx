import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { ThemeContext } from '../contexts/ThemeContext';

interface SliderWithInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatDisplay: (value: number) => string;
  className?: string;
  accentColor?: 'emerald' | 'blue' | 'purple' | 'amber' | 'red';
  footerLabel?: string;
  tag?: string;
  tooltip?: string;
}

export default function SliderWithInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatDisplay,
  className,
  accentColor = 'emerald',
  footerLabel,
  tag,
  tooltip
}: SliderWithInputProps) {
  const theme = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const [isEditing, setIsEditing] = useState(false);
  const [displayValue, setDisplayValue] = useState(value.toString());
  const [shouldShake, setShouldShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accentClasses = {
    emerald: 'text-emerald-500 accent-emerald-500 border-emerald-500',
    blue: 'text-blue-500 accent-blue-500 border-blue-500',
    purple: 'text-purple-500 accent-purple-500 border-purple-500',
    amber: 'text-amber-500 accent-amber-500 border-amber-500',
    red: 'text-red-500 accent-red-500 border-red-500',
  };

  const currentAccent = accentClasses[accentColor];
  const accentText = currentAccent.split(' ')[0];
  const accentRange = currentAccent.split(' ')[1];
  const accentBorder = currentAccent.split(' ')[2];

  // Sync display value when numeric value changes from outside (e.g. slider)
  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(value.toString());
    }
  }, [value, isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    
    // Remove commas for parsing
    const clean = raw.replace(/,/g, '');
    const num = parseFloat(clean);
    
    if (!isNaN(num)) {
      // Clamp to min and max as requested, but don't round to step
      const clamped = Math.min(Math.max(num, min), max);
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    const clean = displayValue.replace(/,/g, '');
    let num = parseFloat(clean);
    
    if (isNaN(num)) {
      num = value;
    }

    let clamped = num;
    let shook = false;
    if (num < min) {
      clamped = min;
      shook = true;
    } else if (num > max) {
      clamped = max;
      shook = true;
    }

    if (shook) {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
    }

    // Update with clamped value, NO ROUNDING to step
    onChange(clamped);
    
    // Format the display value on blur with Indian number formatting
    setDisplayValue(clamped.toLocaleString('en-IN'));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setDisplayValue(value.toString());
      setIsEditing(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <label className={cn("text-sm font-medium transition-colors duration-300", isDark ? "text-zinc-400" : "text-zinc-600")}>{label}</label>
          {tooltip && (
            <span title={tooltip}>
              <Info className="w-3.5 h-3.5 text-zinc-600 cursor-help" />
            </span>
          )}
          {tag && (
            <span className={cn(
              "px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider transition-colors duration-300",
              isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-emerald-50 border-emerald-100 text-emerald-600"
            )}>
              {tag}
            </span>
          )}
        </div>
        <div className="relative min-w-[120px] flex justify-end">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.input
                key="input"
                ref={inputRef}
                autoFocus
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ 
                  opacity: 1,
                  scale: 1,
                  x: shouldShake ? [-4, 4, -4, 4, 0] : 0 
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: shouldShake ? 0.4 : 0.2 }}
                className={cn(
                  "font-bold text-right border-[1.5px] rounded-[6px] px-2 py-1 focus:outline-none w-full transition-colors duration-300",
                  isDark ? "bg-zinc-900" : "bg-white",
                  accentText,
                  accentBorder
                )}
              />
            ) : (
              <motion.span
                key="text"
                onClick={() => {
                  setIsEditing(true);
                  // When starting to edit, show the raw number without formatting for easier editing
                  // or keep it as is if it's already formatted.
                  // The user pattern suggests formatting on blur.
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "font-bold cursor-pointer transition-all border-b border-transparent",
                  accentText
                )}
              >
                {formatDisplay(value)}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step}
        value={value}
        onChange={(e) => {
          const val = Number(e.target.value);
          onChange(val);
          setDisplayValue(val.toString());
        }}
        className={cn("input-slider", accentRange)}
      />
      {footerLabel && (
        <p className={cn("text-[11px] transition-colors duration-300", isDark ? "text-zinc-400" : "text-zinc-500")}>{footerLabel}</p>
      )}
    </div>
  );
}
