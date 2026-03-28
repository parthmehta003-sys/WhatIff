import React, { useEffect, useRef, useContext } from 'react';
import { X, Send, Loader2, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';
import { ThemeContext } from '../contexts/ThemeContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  onSend: (content: string) => void;
  isLoading: boolean;
  showChips?: boolean;
  chips?: string[];
  questionCount: number;
  maxQuestions: number;
}

export default function AIChat({ 
  isOpen, 
  onClose, 
  messages,
  input,
  setInput,
  onSend,
  isLoading,
  showChips = true,
  chips = [],
  questionCount,
  maxQuestions
}: AIChatProps) {
  const theme = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLimitReached = questionCount >= maxQuestions;

  const renderBold = (text: string) => {
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-emerald-400 font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderMessage = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    return (
      <div className="space-y-4">
        {lines.map((line, i) => {
          if (line.trim().startsWith('-')) {
            return (
              <div key={i} className="flex gap-3 items-start group">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0 group-hover:scale-125 transition-transform" />
                <p className={cn(
                  "text-sm leading-relaxed flex-1 italic",
                  isDark ? "text-zinc-300" : "text-zinc-600"
                )}>
                  {renderBold(line.replace(/^-/, '').trim())}
                </p>
              </div>
            );
          }
          return (
            <p key={i} className={cn(
              "text-sm leading-relaxed",
              isDark ? "text-zinc-300" : "text-zinc-600"
            )}>
              {renderBold(line)}
            </p>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !isLimitReached) {
      onSend(input);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "relative w-full max-w-md h-full border-l shadow-2xl flex flex-col overflow-hidden transition-colors duration-300",
              isDark ? "bg-zinc-900 border-white/10" : "bg-white border-zinc-200"
            )}
          >
            {/* Header */}
            <div className={cn(
              "p-6 border-b flex items-center justify-between backdrop-blur-md sticky top-0 z-10 transition-colors duration-300",
              isDark ? "bg-zinc-900/50 border-white/5" : "bg-white/80 border-zinc-100"
            )}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className={cn("font-bold text-lg", isDark ? "text-white" : "text-zinc-900")}>Whatiff</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">AI Assistant</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {!isLimitReached && (
                  <span className="text-[11px] font-medium text-zinc-500">
                    {questionCount} of {maxQuestions}
                  </span>
                )}
                <button
                  onClick={onClose}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isDark ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-black/5 text-zinc-500 hover:text-zinc-900"
                  )}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3 max-w-[90%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center mt-1",
                    msg.role === 'user' ? (isDark ? "bg-zinc-800" : "bg-zinc-100") : "bg-emerald-500/10"
                  )}>
                    {msg.role === 'user' ? <MessageSquare className="w-4 h-4 text-zinc-400" /> : <Sparkles className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-emerald-600 text-white rounded-tr-none" 
                      : cn(
                          "rounded-tl-none border transition-colors duration-300",
                          isDark ? "bg-white/5 text-zinc-300 border-white/5" : "bg-zinc-50 text-zinc-700 border-zinc-100"
                        )
                  )}>
                    {msg.role === 'assistant' ? (
                      <div className="max-w-none">
                        {renderMessage(msg.content)}
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 mr-auto max-w-[90%]">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mt-1">
                    <div style={{ display: 'flex', gap: 4, padding: '12px 0' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: 6, height: 6,
                          background: '#10b981',
                          borderRadius: '50%',
                          animation: `bounce 1s ease infinite`,
                          animationDelay: `${i * 0.2}s`
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className={cn(
              "p-6 border-t space-y-4 transition-colors duration-300",
              isDark ? "bg-zinc-900/50 border-white/5" : "bg-zinc-50/50 border-zinc-100"
            )}>
              {isLimitReached ? (
                <div className={cn(
                  "p-4 rounded-xl border text-center transition-colors duration-300",
                  isDark ? "bg-zinc-800/50 border-white/5" : "bg-white border-zinc-200 shadow-sm"
                )}>
                  <p className="text-[12px] text-zinc-400">
                    You have reached the limit for this session. Open a new calculator session to continue exploring.
                  </p>
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    {showChips && chips.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-wrap gap-2 mb-4"
                      >
                        {chips.map((chip: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => onSend(chip)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg border text-[11px] transition-all text-left",
                              isDark 
                                ? "bg-white/5 border-white/10 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/5" 
                                : "bg-white border-zinc-200 text-zinc-600 hover:text-emerald-600 hover:border-emerald-500/30 hover:bg-emerald-50"
                            )}
                          >
                            {chip}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form
                    onSubmit={handleSubmit}
                    className="relative"
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything about these numbers..."
                      className={cn(
                        "w-full border rounded-xl py-4 pl-4 pr-14 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                        isDark 
                          ? "bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600" 
                          : "bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400"
                      )}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 top-2 bottom-2 w-10 rounded-lg bg-emerald-500 text-zinc-950 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </>
              )}
              <p className="text-[10px] text-center text-zinc-500 leading-tight">
                I can help explain the numbers or compare scenarios, but I’m not able to provide financial advice.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
