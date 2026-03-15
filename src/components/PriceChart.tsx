"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format } from 'date-fns';

export interface ChartDataPoint {
  date: string;
  actual_close: number;
  predictions: Record<string, {
    predict_target_price: number;
    portfolio_allocation: number;
    reasoning: string;
    delta: number;
  }>;
  news?: { title: string; snippet: string }[];
  eiaSummary?: string;
}

interface PriceChartProps {
  data: ChartDataPoint[];
  models: string[];
}

const COLORS = ['#fb7185', '#60a5fa', '#a78bfa', '#fbbf24', '#34d399'];

export default function PriceChart({ data, models }: PriceChartProps) {
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as ChartDataPoint;
      const fmtDate = format(new Date(dataPoint.date), 'MMM do, yyyy');

      return (
        <div className="bg-slate-900 border border-white/10 rounded-xl p-4 shadow-2xl max-w-md backdrop-blur-md relative z-[1000]">
          <p className="font-semibold text-slate-200 border-b border-white/10 pb-2 mb-3">
            {fmtDate}
          </p>
          
          <div className="flex flex-col gap-1 mb-4">
            <p className="text-sm">
              <span className="text-emerald-400 font-medium tracking-wide">Actual Close:</span> 
              <span className="text-white ml-2">${dataPoint.actual_close.toFixed(2)}</span>
            </p>
            {models.map((model, idx) => {
              const pred = dataPoint.predictions?.[model];
              if (!pred) return null;
              const color = COLORS[idx % COLORS.length]; 
              return (
                <div key={model} className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-sm font-semibold mb-1" style={{ color }}>{model}</p>
                  <p className="text-sm">
                    <span className="text-slate-400">Predicted Close:</span> 
                    <span className="text-white ml-2">${pred.predict_target_price.toFixed(2)}</span>
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-xs text-slate-400 font-medium">
                      Error: <span className={pred.delta > 0 ? "text-rose-400" : "text-emerald-400"}>
                        ${Math.abs(pred.delta).toFixed(2)}
                      </span>
                    </p>
                    <div className="h-3 w-px bg-white/20"></div>
                    <p className="text-xs text-slate-400 font-medium whitespace-nowrap">
                      Oil Exposure: <span className="text-emerald-400">{pred.portfolio_allocation}%</span>
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 italic leading-tight mt-2 line-clamp-2">
                    "{pred.reasoning}"
                  </p>
                </div>
              );
            })}
          </div>

          {dataPoint.eiaSummary && (
             <div className="mt-3 pt-3 border-t border-white/5">
               <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">EIA Data (Context fed to LLM)</p>
               <p className="text-xs text-slate-400">
                 {dataPoint.eiaSummary}
               </p>
             </div>
          )}

          {dataPoint.news && dataPoint.news.length > 0 && (
             <div className="mt-3 pt-3 border-t border-white/5">
               <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Top Headlines (Context fed to LLM)</p>
               <ul className="text-xs text-slate-400 list-disc pl-4 space-y-1">
                 {dataPoint.news.slice(0, 3).map((n, i) => (
                   <li key={i} className="line-clamp-2">{n.title}</li>
                 ))}
               </ul>
             </div>
          )}

        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 p-4 shadow-2xl flex flex-col">
      <div className="mb-4 px-2">
        <h2 className="text-white font-semibold text-lg tracking-tight">WTI Crude Tracking Benchmarks</h2>
        <p className="text-sm text-slate-400">Hover over the timeline to view predictions against actual settlements</p>
      </div>

      <div className="flex-1 min-h-0 min-w-0 -ml-6 sm:-ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(str) => format(new Date(str), 'MMM d')}
              stroke="rgba(255,255,255,0.2)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              domain={['auto', 'auto']}
              stroke="rgba(255,255,255,0.2)"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
              tickFormatter={(val) => `$${val}`}
              dx={-10}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              wrapperStyle={{ zIndex: 1000, outline: 'none' }} 
              allowEscapeViewBox={{ x: false, y: true }}
              position={{ y: -50 }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
            
            <Line 
              type="monotone" 
              name="Actual Settlement (CL=F)"
              dataKey="actual_close" 
              stroke="#34d399" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#064e3b', strokeWidth: 2, stroke: '#34d399' }}
              activeDot={{ r: 6, fill: '#34d399', strokeWidth: 0 }}
            />
            {models.map((m, idx) => (
              <Line 
                key={m}
                type="monotone" 
                name={`${m} Target`}
                dataKey={`predictions.${m}.predict_target_price`}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#1e293b', strokeWidth: 1, stroke: COLORS[idx % COLORS.length] }}
                activeDot={{ r: 5, fill: COLORS[idx % COLORS.length], strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
