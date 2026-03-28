import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { trackEvent } from '../lib/analytics';

interface AIInsightSectionProps {
  title: string;
  description: string;
  mainValue: number;
  mainLabel: string;
  secondaryValues: { label: string; value: string | number }[];
  category: 'grow' | 'buy' | 'borrow';
  inputs: any;
  customPrompt?: string;
  isComparison?: boolean;
  onInsightGenerated?: (insight: string) => void;
  fallback?: string;
}

import { renderInsight } from '../renderInsight';
import InsightFeedback from './InsightFeedback';

export default function AIInsightSection({
  title,
  description,
  mainValue,
  mainLabel,
  secondaryValues,
  category,
  inputs,
  customPrompt,
  isComparison = false,
  onInsightGenerated,
  fallback
}: AIInsightSectionProps) {
  const [insight, setInsight] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const validateInsight = (text: string, allowedValues: string[]): boolean => {
    // Extract all numbers and currency-like patterns
    // This matches: ₹10.5 L, 10.5, 10, ₹1.2 Cr, 12%, 15 years, etc.
    const numberRegex = /(?:₹?\s*[\d,]+(?:\.\d+)?\s*(?:L|Cr|lakh|crore|%|years|yr)?)/gi;
    const foundValues = text.match(numberRegex) || [];
    
    if (foundValues.length === 0) return true;

    // Helper to parse values into a common number format for comparison
    const parseValue = (v: string): number | null => {
      const clean = v.replace(/[₹%,\s]/g, '').toLowerCase();
      let multiplier = 1;
      let valStr = clean;

      if (clean.endsWith('cr') || clean.endsWith('crore')) {
        multiplier = 10000000;
        valStr = clean.replace(/cr|crore/g, '');
      } else if (clean.endsWith('l') || clean.endsWith('lakh')) {
        multiplier = 100000;
        valStr = clean.replace(/l|lakh/g, '');
      } else if (clean.endsWith('yr') || clean.endsWith('years') || clean.endsWith('year')) {
        valStr = clean.replace(/yr|years|year/g, '');
      }

      const num = parseFloat(valStr);
      return isNaN(num) ? null : num * multiplier;
    };

    // Benchmarks from the prompt that are allowed
    const benchmarks = [
      15, 25, 8, 12, 3, 5, 20000, 30000, 
      1500000, 2500000, 800000, 1200000, 300000, 500000,
      4 // for "4-year degree"
    ];

    const parsedAllowed = [
      ...benchmarks,
      ...allowedValues.map(v => parseValue(v)).filter((v): v is number => v !== null)
    ];

    for (const found of foundValues) {
      const parsedFound = parseValue(found);
      if (parsedFound === null) continue;

      // Skip very small numbers like 1, 2, 3 which might be part of sentences (e.g., "3 sentences")
      // But keep them if they have a unit like ₹ or % or L/Cr
      const isSmallNumber = parsedFound < 10;
      const hasUnit = /[₹%]|l|cr|yr|year|lakh|crore/i.test(found);
      
      if (isSmallNumber && !hasUnit) continue;

      // Check if the found number exists in allowed values (with some tolerance for rounding)
      const isAllowed = parsedAllowed.some(allowed => {
        if (allowed === 0) return parsedFound === 0;
        const diff = Math.abs(parsedFound - allowed);
        const relDiff = diff / Math.max(Math.abs(parsedFound), Math.abs(allowed));
        // Allow 1% difference for rounding or small variations
        return relDiff < 0.01 || diff < 0.1;
      });

      if (!isAllowed) {
        console.warn('AI Hallucination Detected:', { found, parsedFound, allowedValues });
        return false;
      }
    }
    return true;
  };

  const extractAllValues = (obj: any): string[] => {
    const values: Set<string> = new Set();
    const recurse = (item: any) => {
      if (item === null || item === undefined) return;
      if (Array.isArray(item)) {
        item.forEach(recurse);
      } else if (typeof item === 'object') {
        Object.values(item).forEach(recurse);
      } else {
        values.add(String(item));
      }
    };
    recurse(obj);
    return Array.from(values);
  };

  const generateAIInsight = async (retryCount = 0) => {
    if (inputs?.isOverInvesting || cooldown > 0) return;

    setIsGenerating(true);
    const globalInstruction = `
      You are a smart, warm friend who is good with numbers. You are not a financial advisor. You are not telling anyone what to do. You are simply showing people what their own numbers mean — in plain, everyday language that anyone can understand.
      HARD RULES — these override everything:

      Never tell the user what to do
      Never use: should, consider, recommend, try, could, might want to
      Never mention specific financial products or investment instruments
      Never promise or imply a future outcome
      Every number you reference must come directly from the user's inputs and outputs — never invent figures
      Any external benchmark used must be clearly labelled as an approximate benchmark — never stated as a fact about the user personally
      Write like you are explaining something to a smart friend who has never studied finance — no jargon, no technical terms, no complex sentences
      If you must use a financial term explain it immediately in plain language in the same sentence
      
      LANGUAGE RULES:

      Use short sentences. One idea per sentence.
      Use everyday words. Not 'nominal value' — say 'raw rupee amount'. Not 'purchasing power erosion' — say 'what your money can actually buy'. Not 'corpus' — say 'total amount'. Not 'outflow' — say 'what you pay out'. Not 'DTI ratio' — say 'how much of your salary goes to loan repayments'.
      If a number is large, translate it — not just '₹24.3L' but '₹24.3L — that is roughly 24 lakh rupees'
      Avoid passive voice. Say 'inflation eats ₹3L of your returns' not '₹3L is eroded by inflation'

      FACTUAL RULES:

      Only state what the numbers show — nothing more
      Flag when a value exceeds or falls below a standard benchmark — clearly label it as a benchmark, not a rule
      Show the mathematical consequence of the inputs without telling the user how to respond to it

      MAKE IT HUMAN:
      Anchor numbers to real life so they feel tangible. Use these approximate Indian benchmarks — always label them as approximate:

      A child's 4-year private engineering degree costs roughly ₹15–25L today
      An entry-level car costs roughly ₹8–12L today
      An average urban Indian household earns roughly ₹3–5L per year
      A 1BHK in a metro costs roughly ₹20,000–30,000 per month in rent

      Always use the user's own numbers first before reaching for external benchmarks. If the user's income, principal, or tenure already tells the story — use that. Only bring in an external benchmark when it adds something the user's own numbers cannot show.
      When numbers are stark or surprising — let them land. Do not soften the truth. Do not cushion it. Just say it plainly.
      STRUCTURE — every insight must follow this exact arc in three short paragraphs:
      Paragraph 1 — What the numbers show:
      State the key output plainly using the user's own numbers. One or two sentences maximum. Simple language. No jargon.
      Paragraph 2 — What it means in real life:
      Take one number from the output and translate it into something a person can picture. Use the user's own data first. Use an external benchmark only if it adds something new. Keep it to two sentences maximum.
      Paragraph 3 — The one thing they did not know:
      This is the most important part. State one mathematical fact derived from the user's numbers that they would be unlikely to have calculated themselves. Something that makes them stop and think. It must be a fact — not a suggestion, not advice, not a recommendation. No action words. No instruments. If the first two paragraphs covered the obvious, go deeper — look at ratios, crossover points, compounding effects, or relationships between two output numbers the user has not directly compared. This paragraph must always be present. Never skip it.
      
      The insight must feel like a smart friend just explained your own numbers back to you in a way that finally made sense. Not a warning. Not a sales pitch. Just the truth, plainly told.
      
      AI insights must be strictly factual and number-based. They must never constitute financial advice, investment recommendations, or financial planning guidance.`;

      const promptMap = {
        grow: `${globalInstruction}
          Analyze these "grow" figures:
          - Main Value (${mainLabel}): ${mainValue}
          - Context: ${description}
          - Inputs: ${JSON.stringify(inputs)}`,
        buy: `${globalInstruction}
          Analyze these "buy" figures:
          - Main Value (${mainLabel}): ${mainValue}
          - Context: ${description}
          - Inputs: ${JSON.stringify(inputs)}`,
        borrow: `${globalInstruction}
          Analyze these "borrow" figures:
          - Main Value (${mainLabel}): ${mainValue}
          - Context: ${description}
          - Inputs: ${JSON.stringify(inputs)}`
      };

      const currencyFormattingInstruction = `
      
      IMPORTANT: Always format Indian currency figures in the Indian numbering system using lakhs (L) and crores (Cr) notation.
      - Values ≥ 1,00,00,000 → display as Cr (e.g., ₹1.82 Cr)
      - Values ≥ 1,00,000 and < 1,00,00,000 → display as L (e.g., ₹91.95 L)
      - Round to 2 decimal places.
      - Always prefix with ₹.
      - Never display raw whole numbers for currency.`;

      const basePrompt = (customPrompt || promptMap[category]) + currencyFormattingInstruction;
      const systemInstruction = `CRITICAL INSTRUCTION: You are a pure number formatter. You do not calculate anything. You do not derive anything. You do not infer anything. Every single number you write must be copied exactly from the data provided below. If a number is not explicitly in the data, do not use it. Do not round numbers differently than they appear in the data. Do not combine numbers unless the combined value is also explicitly in the data. If you are unsure whether a number came from the data, do not include it.`;
      const finalPrompt = `${systemInstruction}\n\n${basePrompt}\n\nProvide 3 distinct insights based on the data above.`;
      
      try {
        let text = '';
        
        // Always use backend for Groq to keep API key secure
        const response = await fetch(
          `/api/ai/insight`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              prompt: finalPrompt
            })
          }
        );

        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          let errorData: any = {};
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json().catch(() => ({}));
          } else {
            const text = await response.text().catch(() => '');
            console.error('Non-JSON error response:', text);
            throw new Error("Backend returned an error. Please try again.");
          }
          throw new Error(errorData.error || errorData.message || `Backend returned ${response.status}`);
        }

        const data = await response.json();
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!text || text.trim().length < 20) {
          throw new Error("No insight generated or too short");
        }

        // Cleanup: Strip markdown code blocks if present
        text = text.trim();
        if (text.startsWith('```')) {
          text = text.replace(/^```[a-z]*\n/i, '').replace(/\n```$/m, '').trim();
        }

        // Clean up common markdown/formatting before validation
        text = text
          .replace(/\*\*/g, '')         // Bold markdown
          .replace(/\*/g, '')           // Italic markdown
          .replace(/^[\*\-•–—]\s*/gm, '') // Bullet points at start of lines
          .replace(/^\d+[\.\)]\s*/gm, ''); // Numbered lists at start of lines

        // Strip common AI intro phrases
        text = text.replace(/^(Here is an insight|Here is a breakdown|Based on the figures provided|Analyzing your numbers|Here is what your numbers show|Based on the data|The analysis shows):?\s*/i, '');

        // Normalize whitespace and remove invisible characters
        text = text.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\n{2,}/g, '\n').trim();
        
        // Split by newline and filter out empty lines
        let paragraphs = text.split(/\r?\n/).filter(p => p.trim().length > 0);
        
        // If the AI didn't use newlines, try to split by sentences (aware of currency decimals)
        if (paragraphs.length < 3 && text.includes('.')) {
          // Split by punctuation followed by space or newline, but ignore decimals like 1.5
          const sentences = text.match(/[^.!?]+[.!?]+(?=\s|$)/g);
          if (sentences && sentences.length >= 3) {
            // Group sentences into 3 paragraphs if possible
            paragraphs = [
              sentences[0].trim(),
              sentences[1].trim(),
              sentences.slice(2).join(' ').trim()
            ];
          }
        }
        
        // Detailed validation logging
        const isTooShort = text.trim().length < 20;
        const endsWithColon = text.endsWith(':');
        const missingPunctuation = !/[.!?]["')]*$/.test(text);
        const tooFewParagraphs = paragraphs.length < 1; // Relaxed from 3 to 1

        if (isTooShort || endsWithColon || missingPunctuation || tooFewParagraphs) {
          console.warn('AI Insight Validation Failed:', {
            isTooShort,
            endsWithColon,
            missingPunctuation,
            tooFewParagraphs,
            paragraphCount: paragraphs.length,
            text: text.substring(0, 100) + '...'
          });
          
          // Retry logic
          if (retryCount < 3) {
            console.log(`Retrying insight generation... (Attempt ${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return generateAIInsight(retryCount + 1);
          }
          
          throw new Error("The AI generated an incomplete response. Please try again.");
        }

        // Re-join as newlines for the renderer
        let finalInsight = paragraphs.slice(0, 3).map(p => p.trim()).join('\n');

        // Final validation for hallucinations
        if (inputs) {
          // Include all values from inputs, including percentages and years
          // Also include secondary values and main value
          const allowedValues = [
            ...extractAllValues(inputs),
            ...secondaryValues.map(sv => String(sv.value)),
            String(mainValue)
          ];
          
          if (!validateInsight(finalInsight, allowedValues)) {
            if (fallback) {
              finalInsight = fallback;
            } else {
              // Retry if no fallback provided
              if (retryCount < 2) {
                console.log(`Retrying due to hallucination... (Attempt ${retryCount + 1}/2)`);
                return generateAIInsight(retryCount + 1);
              }
              throw new Error("The AI generated inconsistent numbers. Please try again.");
            }
          }
        }

        setInsight(finalInsight);
        setCooldown(30);
        trackEvent('AI Insight Generated', {
          'Category': category,
          'Title': title,
          'Is Comparison': isComparison
        });
        if (onInsightGenerated) onInsightGenerated(text);
      } catch (error: any) {
        console.error('AI Insight Error:', error);
        
        // Only show error if we're done retrying
        if (retryCount >= 3 || (error.message !== "The AI generated an incomplete response. Please try again." && error.message !== "Incomplete insight generated")) {
          const errorMsg = "Unable to generate insight at the moment. Please try again.";
          let displayError = error.message && error.message.length > 10 && error.message.length < 200
            ? error.message 
            : errorMsg;
            
          if (error.name === 'AbortError') {
            displayError = "The request timed out. Please try again.";
          } else if (error.message === 'Failed to fetch') {
            displayError = "Connection error. The server might be restarting. Please try again in a few seconds.";
          } else if (error.message === "The AI generated an incomplete response. Please try again." || error.message === "Incomplete insight generated") {
            displayError = "The AI generated an incomplete response. Please try again in a moment.";
          }
            
          setInsight(displayError);
          if (onInsightGenerated) onInsightGenerated(displayError);
        }
      } finally {
        setIsGenerating(false);
      }
  };

  const sentences = insight.split('\n').filter(s => s.trim().length > 0);

  return (
    <div className="space-y-4">
      <div className="relative group">
        <div className={cn(
          "p-6 rounded-2xl bg-zinc-900 border-l-4 transition-all duration-300",
          "border-emerald-500 shadow-xl",
          !insight && "border-l-emerald-500/20 bg-zinc-900/50"
        )}>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
                WHATIFF AI
              </p>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {insight 
                  ? (isComparison ? "Comparison Analysis Ready" : title) 
                  : (isComparison ? "Get AI Comparison Insight" : "Generate AI Insights")
                }
                {!insight && <ArrowRight className="w-4 h-4 text-emerald-500" />}
              </h3>
            </div>
            
            <button
              onClick={() => generateAIInsight()}
              disabled={isGenerating || cooldown > 0}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg",
                "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                "shadow-emerald-500/20 hover:shadow-emerald-500/40"
              )}
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : cooldown > 0 ? (
                <span className="text-xs font-bold">{cooldown}s</span>
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {insight && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 pt-4 border-t border-white/5">
                  {renderInsight(insight)}
                  <div className="pt-4 border-t border-white/5">
                    <InsightFeedback 
                      calculator={title} 
                      insight={insight} 
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
