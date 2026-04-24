import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatCurrency, formatCompactNumber, cn } from '../../lib/utils';

interface SIPChartsProps {
  isDark: boolean;
  results: any;
  chartReady: boolean;
}

export default function SIPCharts({ isDark, results, chartReady }: SIPChartsProps) {
  if (!chartReady) return <div className="h-[300px] flex items-center justify-center text-zinc-500">Loading charts...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Growth Chart */}
      <div className={cn(
        "glass-card p-6 min-w-0 transition-colors duration-300",
        isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
      )}>
        <h3 className="text-sm font-semibold text-zinc-500 mb-6 uppercase tracking-widest">Growth Projection</h3>
        <div className="h-[300px] w-full" style={{ minWidth: 0, minHeight: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={results.yearlyData}>
              <defs>
                <linearGradient id="colorValueSIP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
              <XAxis 
                dataKey="year" 
                stroke="#a1a1aa" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                label={{ value: 'Years', position: 'insideBottom', offset: -5, fill: '#a1a1aa', fontSize: 10 }}
              />
              <YAxis 
                stroke="#a1a1aa" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => formatCompactNumber(val)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDark ? '#18181b' : '#ffffff', 
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e4e4e7', 
                  borderRadius: '8px',
                  color: isDark ? '#f4f4f5' : '#09090b'
                }}
                itemStyle={{ color: isDark ? '#f4f4f5' : '#09090b' }}
                formatter={(value: number, name: string) => {
                  const label = name === 'balance' ? 'Total Value' : 
                              name === 'investment' ? 'Invested Amount' : 
                              name === 'realBalance' ? "Real Value (Today's ₹)" : name;
                  return [formatCurrency(value), label];
                }}
                labelFormatter={(label) => `Year ${label}`}
              />
              <Area 
                isAnimationActive={false}
                type="monotone" 
                dataKey="balance" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValueSIP)" 
                name="balance"
              />
              <Area 
                isAnimationActive={false}
                type="monotone" 
                dataKey="realBalance" 
                stroke="#fbbf24" 
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="transparent"
                name="realBalance"
              />
              <Area 
                isAnimationActive={false}
                type="monotone" 
                dataKey="investment" 
                stroke="#a1a1aa" 
                strokeWidth={2}
                fill="transparent"
                name="investment"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut Chart */}
      <div className={cn(
        "glass-card p-6 min-w-0 transition-colors duration-300",
        isDark ? "bg-white/5" : "bg-white border-zinc-200 shadow-sm"
      )}>
        <h3 className="text-sm font-semibold text-zinc-500 mb-6 uppercase tracking-widest">Wealth Breakdown</h3>
        <div className="h-[300px] w-full relative flex items-center justify-center" style={{ minWidth: 0, minHeight: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Principal', value: results.totalInvested },
                  { name: 'Real Gain', value: Math.max(0, results.realWealthCreated) },
                  { name: 'Lost to Inflation', value: results.purchasingPowerLost }
                ]}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={isDark ? "#3f3f46" : "#e4e4e7"} />
                <Cell fill="#10b981" />
                <Cell fill="#fbbf24" />
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDark ? '#18181b' : '#ffffff', 
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e4e4e7', 
                  borderRadius: '8px' 
                }}
                itemStyle={{ color: isDark ? '#f4f4f5' : '#09090b' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className={cn("text-2xl font-bold", isDark ? "text-white" : "text-zinc-900")}>
              {formatCurrency(results.totalValue)}
            </p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Total Value</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4">
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", isDark ? "bg-zinc-600" : "bg-zinc-400")} />
            <span className="text-[11px] text-zinc-500">Principal: {formatCurrency(results.totalInvested)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-zinc-500">Real Gain: {formatCurrency(results.realWealthCreated)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-[11px] text-zinc-500">Lost to Inflation: {formatCurrency(results.purchasingPowerLost)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
