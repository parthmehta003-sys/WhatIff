import React from 'react';
import { cn } from '../lib/utils';

interface FooterProps {
  className?: string;
  onNavigate?: (screen: any) => void;
}

export default function Footer({ className, onNavigate }: FooterProps) {
  return (
    <footer className={cn("border-t border-white/5 py-12 px-6 text-center mt-auto", className)}>
      <div className="text-zinc-500 font-extrabold text-lg mb-4">WhatIff</div>
      <div className="flex justify-center gap-4 text-zinc-600 text-xs mb-4">
        <button 
          onClick={() => onNavigate?.('privacy')}
          className="hover:text-zinc-400 transition-colors"
        >
          Privacy Policy
        </button>
        <span>·</span>
        <button 
          onClick={() => onNavigate?.('terms')}
          className="hover:text-zinc-400 transition-colors"
        >
          Terms of Use
        </button>
      </div>
      <div className="mb-4">
        <a 
          href="mailto:hello.whatiff@gmail.com"
          className="text-zinc-500 text-xs font-medium hover:text-emerald-500 transition-colors"
        >
          Contact: hello.whatiff@gmail.com
        </a>
      </div>
      <p className="text-zinc-700 text-[11px] mb-2">© 2026 WhatIff. All rights reserved.</p>
      <p className="text-zinc-800 text-[10px] max-w-md mx-auto leading-relaxed">
        All calculations are for educational purposes only. Not financial advice. Not SEBI registered.
      </p>
    </footer>
  );
}
