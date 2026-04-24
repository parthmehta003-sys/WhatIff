import React from 'react';

interface Parameter {
  name: string;
  score: number; // 0–100
  max: 100;
  benchmark: string;
  interpretation: string;
}

interface ScoreReportProps {
  score?: number; // overall score, e.g. 69.5
  band?: string; // e.g. "Money Maestro"
  bandDescription?: string;
  generatedOn?: string; // e.g. "19 April 2026"
  parameters?: Parameter[];
}

const DEFAULT_PARAMETERS: Parameter[] = [
  { 
    name: "Emergency Preparedness", score: 100, max: 100,
    benchmark: "≥6 months of expenses in liquid reserves",
    interpretation: "Fully covered. Your liquidity buffer meets the 6-month benchmark." 
  },
  { 
    name: "Health Insurance", score: 100, max: 100,
    benchmark: "Family floater ≥₹10L sum insured",
    interpretation: "Strong coverage in place. Review annually as medical costs rise." 
  },
  { 
    name: "Tax Efficiency", score: 100, max: 100,
    benchmark: "≥80% of 80C / 80D / NPS limits utilised",
    interpretation: "You are maximising available deductions. No action needed." 
  },
  { 
    name: "Debt Management", score: 75, max: 100,
    benchmark: "Total EMI <30% of monthly income",
    interpretation: "EMI burden is within the safe range. Avoid adding new liabilities." 
  },
  { 
    name: "Life Insurance Awareness", score: 75, max: 100,
    benchmark: "Term cover ≥10× annual income",
    interpretation: "Adequate cover in place. Verify nominees and policy terms are current." 
  },
  { 
    name: "Savings Habits", score: 65, max: 100,
    benchmark: "≥30% monthly savings rate",
    interpretation: "You save consistently but have room to increase your rate toward 30%." 
  },
  { 
    name: "Retirement Readiness", score: 65, max: 100,
    benchmark: "≥80% of retirement corpus on track",
    interpretation: "Below the 80% readiness threshold. A step-up SIP review could close this gap." 
  },
  { 
    name: "Financial Goals Clarity", score: 50, max: 100,
    benchmark: "All goals mapped to a corpus amount and target year",
    interpretation: "Goals exist but lack specific corpus targets and timelines." 
  },
  { 
    name: "Investment Diversification", score: 40, max: 100,
    benchmark: "≥3 active asset classes in portfolio",
    interpretation: "Portfolio is concentrated. Each additional asset class improves this score." 
  },
  { 
    name: "Estate and Legacy", score: 25, max: 100,
    benchmark: "Will + nominees on all accounts + succession plan",
    interpretation: "No estate plan detected. This is your highest-risk gap." 
  }
];

export const ScoreReport: React.FC<ScoreReportProps> = ({
  score = 69.5,
  band = "Money Maestro",
  bandDescription = "Exceptional financial clarity. You have mastered the fundamentals and are building wealth with strategic precision.",
  generatedOn = "19 April 2026",
  parameters = DEFAULT_PARAMETERS,
}) => {
  const getStatusColor = (s: number) => {
    if (s >= 75) return "#10b981"; // Emerald
    if (s >= 50) return "#f59e0b"; // Amber
    return "#ef4444"; // Red
  };

  const getStatusLabel = (s: number) => {
    if (s >= 75) return "Optimal";
    if (s >= 50) return "Review";
    return "Needs Work";
  };

  const bCount = parameters.filter(p => p.score < 75).length;
  const factualDescription = score <= 30 
    ? `Your score of ${score}/100 places you in the lowest awareness band. ${bCount} of 10 parameters are measured as below benchmark.`
    : score <= 50
    ? `Your score of ${score}/100 places you in the second awareness band. The majority of parameters are measured below benchmark.`
    : score <= 65
    ? `Your score of ${score}/100 places you in the middle awareness band. More than half of parameters meet or approach benchmark.`
    : score <= 80
    ? `Your score of ${score}/100 places you in the fourth awareness band. Most parameters meet benchmark thresholds.`
    : `Your score of ${score}/100 places you in the highest awareness band. The majority of parameters meet or exceed benchmark thresholds.`;

  const optimalCount = parameters.filter(p => p.score >= 75).length;
  const reviewCount = parameters.filter(p => p.score >= 50 && p.score < 75).length;
  const needsWorkCount = parameters.filter(p => p.score < 50).length;

  const sortedParameters = [...parameters].map(p => ({
    ...p,
    benchmark: p.benchmark === "Standard Heuristic Benchmark" 
      ? DEFAULT_PARAMETERS.find(dp => dp.name === p.name)?.benchmark || p.benchmark 
      : p.benchmark
  })).sort((a, b) => b.score - a.score);

  const priorityAreas = [...parameters].map(p => ({
    ...p,
    benchmark: p.benchmark === "Standard Heuristic Benchmark" 
      ? DEFAULT_PARAMETERS.find(dp => dp.name === p.name)?.benchmark || p.benchmark 
      : p.benchmark
  })).filter(p => p.score < 75)
    .sort((a, b) => a.score - b.score);

  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference * 0.25 + (circumference * (1 - (score / 100)));

  const bands = [
    { name: "Wealth Architect", range: "81–100" },
    { name: "Money Maestro", range: "66–80" },
    { name: "Aware Achiever", range: "51–65" },
    { name: "Steady Planner", range: "31–50" },
    { name: "Novice Navigator", range: "0–30" },
  ];

  return (
    <div 
      id="score-report-pdf" 
      className="w-[794px] bg-white p-[40px_48px] font-sans text-[#1c1c1e] antialiased"
      style={{ fontFamily: "'DM Sans', sans-serif", height: 'auto', paddingBottom: '16px' }}
    >
      {/* SECTION 1: HEADER */}
      <header className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-[20px] font-bold text-[#10b981] leading-none">WhatIff</h1>
          <p className="text-[12px] text-[#a1a1aa] mt-[2px]">Financial Awareness Report</p>
        </div>
        <div className="text-right">
          <div className="inline-block bg-[#f5f3ff] text-[#6d28d9] border border-[#ddd6fe] text-[10px] uppercase font-bold tracking-[0.06em] px-[10px] py-[3.5px] rounded-full" style={{ whiteSpace: 'nowrap' }}>
            {band}
          </div>
          <p className="text-[11px] text-[#a1a1aa] mt-1">Generated: {generatedOn}</p>
        </div>
      </header>
      <div className="h-[1px] bg-[#e4e4e7] mb-8" />

      <div className="space-y-[32px]">
        {/* SECTION 2: SCORE HERO */}
        <div className="flex items-center gap-[32px]">
          {/* COL 1: Gauge */}
          <div className="w-[180px] flex-shrink-0 flex justify-center">
            <div className="relative w-[160px] h-[160px]">
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke="#f4f4f5"
                  strokeWidth="12"
                />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={getStatusColor(score)}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                  style={{
                    strokeDashoffset: circumference * (1 - score / 100),
                    transition: 'stroke-dashoffset 0.5s ease',
                    transform: 'rotate(-90deg)',
                    transformOrigin: '80px 80px'
                  }}
                />
                <text x="80" y="72" textAnchor="middle" 
                  style={{fontSize:'28px', fontWeight:700, fill:'#1c1c1e', 
                  writingMode:'horizontal-tb'}}>
                  {score}
                </text>
                <text x="80" y="90" textAnchor="middle"
                  style={{fontSize:'12px', fill:'#a1a1aa', writingMode:'horizontal-tb'}}>
                  / 100
                </text>
                <text x="80" y="106" textAnchor="middle"
                  style={{fontSize:'9px', fontWeight:700, fill:'#10b981', 
                  writingMode:'horizontal-tb', textTransform:'uppercase', 
                  letterSpacing:'0.06em'}}>
                  {band}
                </text>
              </svg>
            </div>
          </div>

          {/* COL 2: Description */}
          <div className="flex-1">
            <h2 className="text-[20px] font-bold mb-[6px] text-[#1c1c1e]">{band}</h2>
            <p className="text-[13px] text-[#71717a] leading-[1.6] mb-[14px]">
              {factualDescription}
            </p>
            <div className="flex gap-[8px]">
              <span className="bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] text-[11px] font-bold px-[10px] py-[3px] rounded-full">
                {optimalCount} Optimal
              </span>
              <span className="bg-[#fffbeb] text-[#92400e] border border-[#fde68a] text-[11px] font-bold px-[10px] py-[3px] rounded-full">
                {reviewCount} Review
              </span>
              <span className="bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] text-[11px] font-bold px-[10px] py-[3px] rounded-full">
                {needsWorkCount} Needs Work
              </span>
            </div>
          </div>

          {/* COL 3: Band Ladder */}
          <div className="w-[155px] flex-shrink-0 space-y-0.5">
            {bands.map((b) => (
              <div
                key={b.name}
                className={`flex justify-between items-center px-[8px] py-[5px] rounded-[6px] text-[11px] ${
                  b.name === band
                    ? 'bg-[#f5f3ff] border-l-2 border-[#8b5cf6] text-[#6d28d9] font-bold shadow-sm'
                    : 'text-[#71717a]'
                }`}
              >
                <span style={{ whiteSpace: 'nowrap' }}>{b.name}</span>
                <span style={{ whiteSpace: 'nowrap' }} className="ml-2">{b.range}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: PARAMETER TABLE */}
        <div>
          <h3 className="text-[10px] uppercase text-[#a1a1aa] tracking-[0.08em] mb-[12px]">Score Breakdown</h3>
          <div className="border border-[#e4e4e7] rounded-[8px] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f9f9f9] border-b border-[#e4e4e7]">
                  <th className="w-[30%] text-left text-[10px] uppercase text-[#a1a1aa] p-[10px_12px] font-bold">Parameter</th>
                  <th className="w-[34%] text-left text-[10px] uppercase text-[#a1a1aa] p-[10px_12px] font-bold">Benchmark</th>
                  <th className="w-[20%] text-left text-[10px] uppercase text-[#a1a1aa] p-[10px_12px] font-bold">Progress</th>
                  <th className="w-[8%] text-center text-[10px] uppercase text-[#a1a1aa] p-[10px_12px] font-bold">Score</th>
                  <th className="w-[8%] text-center text-[10px] uppercase text-[#a1a1aa] p-[10px_12px] font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedParameters.map((p, i) => (
                  <tr key={i} className="border-b border-[#f4f4f5] last:border-0 h-[44px]">
                    <td className="text-[13px] font-medium text-[#1c1c1e] p-[0_12px]">{p.name}</td>
                    <td className="text-[12px] text-[#71717a] p-[0_12px]">{p.benchmark}</td>
                    <td className="p-[0_12px]">
                      <div className="w-full h-[6px] bg-[#f4f4f5] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${p.score}%`,
                            backgroundColor: getStatusColor(p.score),
                          }}
                        />
                      </div>
                    </td>
                    <td className="text-[13px] font-bold text-center p-[0_12px]" style={{ color: getStatusColor(p.score) }}>
                      {Number(p.score)}
                    </td>
                    <td className="text-center p-[0_12px]">
                      <span
                        className="inline-block text-[10px] font-bold px-[8px] py-[2px] rounded-full"
                        style={{
                          backgroundColor: p.score >= 75 ? "#f0fdf4" : p.score >= 50 ? "#fffbeb" : "#fef2f2",
                          color: p.score >= 75 ? "#15803d" : p.score >= 50 ? "#92400e" : "#991b1b",
                        }}
                      >
                        {getStatusLabel(p.score)}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#f9f9f9] font-bold border-t border-[#e4e4e7]">
                  <td className="text-[13px] p-[12px] text-[#1c1c1e]">Total Score</td>
                  <td className="p-[12px]"></td>
                  <td className="p-[12px]"></td>
                  <td className="text-[14px] text-center p-[12px] text-[#1c1c1e]">{Number(score)} / 100</td>
                  <td className="text-center p-[12px] min-w-[100px] whitespace-nowrap">
                    <span className="bg-[#f5f3ff] text-[#6d28d9] text-[10px] font-bold px-[8px] py-[2px] rounded-full uppercase">
                      {band}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 4: PRIORITY FOCUS AREAS */}
        <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
          <h3 className="text-[10px] uppercase text-[#a1a1aa] tracking-[0.08em] mb-[12px]" style={{ pageBreakAfter: 'avoid', breakAfter: 'avoid' }}>Where to focus next</h3>
          <div className="border border-[#e4e4e7] rounded-[8px] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f9f9f9] border-b border-[#e4e4e7]">
                  <th className="w-[28%] text-left text-[10px] uppercase text-[#a1a1aa] p-[10px_12px] font-bold">Parameter</th>
                  <th className="w-[12%] text-left text-[10px] uppercase text-[#a1a1aa] p-[10px_12px] font-bold">Score</th>
                  <th className="w-[15%] text-left text-[10px] uppercase text-[#a1a1aa] p-[10px_12px] font-bold">Gap</th>
                  <th className="w-[45%] text-left text-[10px] uppercase text-[#a1a1aa] p-[10px_12px] font-bold">Benchmark</th>
                </tr>
              </thead>
              <tbody>
                {priorityAreas.map((p, i) => (
                  <tr key={i} className="border-b border-[#f4f4f5] last:border-0 h-[44px] border-l-[3px]" style={{ borderLeftColor: getStatusColor(p.score) }}>
                    <td className="text-[13px] font-medium text-[#1c1c1e] p-[0_12px]">{p.name}</td>
                    <td className="p-[0_12px]">
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-bold" style={{ color: getStatusColor(p.score) }}>{Number(p.score)}</span>
                        <div className="w-[40px] h-[4px] bg-[#f4f4f5] rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: p.score > 0 ? `${p.score}%` : '4px', 
                              minWidth: p.score > 0 && p.score < 8 ? '8px' : undefined,
                              height: '4px',
                              borderRadius: '99px',
                              backgroundColor: getStatusColor(p.score) 
                            }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="text-[12px] font-bold text-[#10b981] p-[0_12px]">+{100 - Number(p.score)}</td>
                    <td className="text-[12px] text-[#71717a] p-[0_12px] leading-tight">{p.benchmark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 5: ANNEXURE */}
        <div style={{ pageBreakBefore: 'always', marginTop: '40px' }} className="pt-10 border-t border-[#e4e4e7]">
          <h3 className="text-[14px] font-bold text-[#1c1c1e] mb-[16px] uppercase tracking-wider">Annexure: Methodology & Benchmarks</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-[12px] font-bold text-[#1c1c1e] mb-2 uppercase tracking-tight">Scoring Engine</h4>
              <p className="text-[12px] text-[#71717a] leading-relaxed">
                The WhatIff Scorecard evaluates financial health across 10 critical dimensions. Each dimension is tested via targeted questions mapped to widely accepted financial planning 'Heuristics' (Thumb Rules). Each dimension receives a score from 0-10, calculated as the average of two related behavioral or factual questions. Your final score (0-100) is the sum of these 10 dimension scores.
              </p>
            </div>

            <div>
              <h4 className="text-[12px] font-bold text-[#1c1c1e] mb-3 uppercase tracking-tight">Dimensions & Benchmarks</h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { name: "Savings Habits", benchmark: "≥30% monthly savings rate" },
                  { name: "Emergency Preparedness", benchmark: "≥6 months of expenses in liquid reserves" },
                  { name: "Retirement Readiness", benchmark: "≥80% of retirement corpus on track" },
                  { name: "Life Insurance Awareness", benchmark: "Term cover ≥10× annual income" },
                  { name: "Health Insurance", benchmark: "Family floater of ≥₹10L sum insured" },
                  { name: "Investment Diversification", benchmark: "≥3 active asset classes" },
                  { name: "Estate and Legacy", benchmark: "Will, Nominees & Succession plan in place" },
                  { name: "Financial Goals Clarity", benchmark: "All goals mapped to corpus & target year" },
                  { name: "Tax Efficiency", benchmark: "≥80% utilisation of 80C/80D/NPS limits" },
                  { name: "Debt Management", benchmark: "Total EMI <30% of monthly income" }
                ].map((d, i) => (
                  <div key={i} className="space-y-0.5">
                    <p className="text-[11px] font-bold text-[#1c1c1e]">{d.name}</p>
                    <p className="text-[10px] text-[#71717a]">{d.benchmark}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#f9f9f9] p-4 rounded-[6px] border border-[#e4e4e7]">
              <h4 className="text-[12px] font-bold text-[#1c1c1e] mb-2 uppercase tracking-tight">Band Definitions</h4>
              <div className="space-y-2">
                {[
                  { range: "81–100", name: "Wealth Architect", desc: "Score places user in the top awareness band across all 10 parameters." },
                  { range: "66–80", name: "Money Maestro", desc: "Score places user in the fourth awareness band. Most parameters are at or above benchmark." },
                  { range: "51–65", name: "Aware Achiever", desc: "Score places user in the middle awareness band. A mix of parameters above and below benchmark." },
                  { range: "31–50", name: "Steady Planner", desc: "Score places user in the second awareness band. The majority of parameters are below benchmark." },
                  { range: "0–30", name: "Novice Navigator", desc: "Score places user in the lowest awareness band. Most parameters are measured below benchmark thresholds." }
                ].map((b, i) => (
                  <div key={i} className="flex gap-4 text-[11px]">
                    <span className="font-bold text-[#1c1c1e] w-[60px] flex-shrink-0">{b.range}</span>
                    <span className="font-bold text-[#10b981] w-[130px] flex-shrink-0">{b.name}</span>
                    <span className="text-[#a1a1aa] leading-tight">{b.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 6: FOOTER */}
        <footer className="border-t border-[#e4e4e7] pt-[16px] mt-[24px] text-center">
          <p className="text-[10px] text-[#a1a1aa] leading-[1.8]">
            WhatIff · whatiff.in<br />
            This report is for educational purposes only and does not constitute financial, investment, or legal advice. Consult a SEBI-registered advisor for personalised guidance.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ScoreReport;
