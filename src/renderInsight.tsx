import React from 'react';
import { cn } from './lib/utils';

export const renderInsight = (text: string) => {
  if (!text) return null;
  
  // Split by newline and filter out empty lines
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return lines.map((line, i) => {
    // Clean up various bullet point formats and markdown
    const cleanedLine = line
      .replace(/^[\*\-•–—]\s*/, '') // Symbols at start
      .replace(/^\d+[\.\)]\s*/, '') // Numbered: 1. or 1) at start
      .replace(/\*\*/g, '')         // Bold markdown
      .replace(/\*/g, '')           // Italic markdown
      .replace(/^#+\s*/, '')        // Headers
      .replace(/:\s*$/, '')         // Trailing colons
      .trim();

    if (!cleanedLine) return null;

    return (
      <div key={i} className="flex gap-4 items-start mb-4 last:mb-0">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2.5 shrink-0" />
        <p className={cn(
          "leading-relaxed text-[15px]",
          i === 0 && "text-white font-normal",
          i === 1 && "text-zinc-300 font-normal",
          i === 2 && "text-emerald-400 font-bold",
          i > 2 && "text-zinc-400 font-normal"
        )}>
          {cleanedLine}
        </p>
      </div>
    );
  });
};
