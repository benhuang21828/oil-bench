"use client";

import { useState } from 'react';
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
import { X } from 'lucide-react';

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
  const [selectedPoint, setSelectedPoint] = useState<ChartDataPoint | null>(null);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as ChartDataPoint;
      const fmtDate = format(new Date(dataPoint.date), 'MMM do, yyyy');

      return (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-lg py-2 px-4 shadow-2xl backdrop-blur-md relative z-[1000] text-center flex flex-col items-center gap-1 cursor-pointer">
          <p className="font-semibold text-slate-200 text-sm whitespace-nowrap">{fmtDate}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 animate-pulse whitespace-nowrap">
            Click for Details
          </p>
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
              wrapperStyle={{ zIndex: 100, outline: 'none' }} 
              allowEscapeViewBox={{ x: false, y: true }}
              position={{ y: -50 }}
              cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }} iconType="circle" />
            
            <Line 
              type="monotone" 
              name="Actual Settlement (CL=F)"
              dataKey="actual_close" 
              stroke="#34d399" 
              strokeWidth={3}
              activeDot={{ r: 8, fill: '#34d399', strokeWidth: 0, cursor: 'pointer', onClick: (dotProps: any) => setSelectedPoint(dotProps.payload) }}
              dot={false}
            />
            {models.map((m, idx) => (
              <Line 
                key={m}
                type="monotone" 
                name={`${m} Target`}
                dataKey={(row) => row.predictions?.[m]?.predict_target_price}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2}
                strokeDasharray="5 5"
                activeDot={{ r: 6, fill: COLORS[idx % COLORS.length], strokeWidth: 0, cursor: 'pointer', onClick: (dotProps: any) => setSelectedPoint(dotProps.payload) }}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detail Modal */}
      {selectedPoint && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
             onClick={() => setSelectedPoint(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
               onClick={e => e.stopPropagation()}>
            
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Detailed AI Reasoning
                </h3>
                <p className="text-emerald-400 font-medium mt-1">
                  Settlement Date: {format(new Date(selectedPoint.date), 'MMMM do, yyyy')} | Actual Close: ${selectedPoint.actual_close.toFixed(2)}
                </p>
              </div>
              <button 
                onClick={() => setSelectedPoint(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto overflow-x-hidden flex-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-2">
                {models.map((model, idx) => {
                  const pred = selectedPoint.predictions?.[model];
                  if (!pred) return null;
                  const color = COLORS[idx % COLORS.length]; 
                  return (
                    <div key={model} className="bg-black/20 rounded-xl p-5 border border-white/5 relative h-full flex flex-col">
                      <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
                        <p className="font-bold text-base" style={{ color }}>{model.split('/').pop() || model}</p>
                        <div className="text-right">
                          <p className="text-white font-mono text-sm">${pred.predict_target_price.toFixed(2)}</p>
                          <p className="text-xs text-slate-400">Target</p>
                        </div>
                      </div>
                      <div className="text-sm text-slate-300 italic leading-relaxed flex-1">
                        "{pred.reasoning}"
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
                        <span>Error: <span className={pred.delta > 0 ? "text-rose-400 font-medium" : "text-emerald-400 font-medium"}>${Math.abs(pred.delta).toFixed(2)}</span></span>
                        <span>Alloc: <span className="text-emerald-400 font-medium">{pred.portfolio_allocation}%</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(selectedPoint.eiaSummary || (selectedPoint.news && selectedPoint.news.length > 0)) && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-white/5 mx-2 mb-2">
                  <h4 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">Provided Context</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {selectedPoint.eiaSummary && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          EIA Supply Data
                        </p>
                        <p className="text-sm text-slate-300 leading-relaxed font-mono">
                          {selectedPoint.eiaSummary}
                        </p>
                      </div>
                    )}

                    {selectedPoint.news && selectedPoint.news.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          Financial News Headlines
                        </p>
                        <ul className="text-sm text-slate-300 space-y-4">
                          {selectedPoint.news.map((n, i) => (
                            <li key={i} className="bg-black/20 p-3 rounded-lg border border-white/5">
                              <p className="font-semibold text-white mb-1 line-clamp-2">{n.title}</p>
                              {n.snippet && n.snippet !== n.title && (
                                <p className="text-xs text-slate-400 line-clamp-3">{n.snippet}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
