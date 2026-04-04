"use client";

import { useState } from 'react';
import { MetricsSummary } from '@/lib/evaluation/types';
import InfoTooltip from './InfoTooltip';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

type SortField = 'rank' | 'model' | 'simulatedPnL' | 'mae' | 'rmse' | 'pnlSpread' | 'avgDailySpread';
type SortDirection = 'asc' | 'desc';

interface LeaderboardClientProps {
  metrics: MetricsSummary[];
  baselinePnL: number;
  startDate?: string;
  endDate?: string;
}

export default function LeaderboardClient({ metrics, baselinePnL, startDate, endDate }: LeaderboardClientProps) {
  // Pre-calculate base rank (based on default P&L sort) so "rank" is a consistent property if we want to sort by it
  const baseMetrics = [...metrics].sort((a, b) => (b.simulatedPnL || 0) - (a.simulatedPnL || 0)).map((m, idx) => ({
    ...m,
    rank: idx + 1
  }));

  const [sortField, setSortField] = useState<SortField>('simulatedPnL');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default to ascending for strings and errors, descending for money/numbers
      if (field === 'model' || field === 'mae' || field === 'rmse' || field === 'rank') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  const sortedMetrics = [...baseMetrics].sort((a, b) => {
    let aValue: any = a[sortField as keyof typeof a];
    let bValue: any = b[sortField as keyof typeof b];
    
    // Handle specific fields
    if (sortField === 'model') {
      aValue = aValue.split('/').pop() || aValue;
      bValue = bValue.split('/').pop() || bValue;
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    
    if (sortField === 'pnlSpread') {
      aValue = a.aggregateMetrics?.simulatedPnL ? (a.aggregateMetrics.simulatedPnL.max - a.aggregateMetrics.simulatedPnL.min) : 0;
      bValue = b.aggregateMetrics?.simulatedPnL ? (b.aggregateMetrics.simulatedPnL.max - b.aggregateMetrics.simulatedPnL.min) : 0;
    }
    
    if (sortField === 'avgDailySpread') {
      aValue = a.averageDailyTargetSpread || 0;
      bValue = b.averageDailyTargetSpread || 0;
    }
    
    // Numeric sorting
    const diff = (aValue as number) - (bValue as number);
    return sortDirection === 'asc' ? diff : -diff;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 text-slate-600 ml-1 inline-block" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-3 h-3 text-emerald-400 ml-1 inline-block" /> : 
      <ChevronDown className="w-3 h-3 text-emerald-400 ml-1 inline-block" />;
  };

  const getSubtext = () => {
    switch(sortField) {
      case 'simulatedPnL': return 'Ranking by Simulated P&L';
      case 'mae': return 'Ranking by Avg Daily Miss (MAE)';
      case 'rmse': return 'Ranking by Consistency Risk (RMSE)';
      case 'model': return 'Sorted by Model Name';
      case 'rank': return 'Ranking by default Performance Score';
      case 'pnlSpread': return 'Ranking by Model Inconsistency (Max PnL — Min PnL)';
      case 'avgDailySpread': return 'Ranking by Internal Determinism (Average Intra-Day Target Variance)';
      default: return 'Ranking custom';
    }
  };

  return (
    <div className="w-full h-full bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl">
      <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-900/40 to-transparent">
        <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
          Model Leaderboard
        </h2>
        <p className="text-sm text-slate-400 mt-1">{getSubtext()}</p>
        
        {/* Baseline Reference Row */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between bg-white/5 py-2 px-3 rounded-lg border border-white/5">
           <div>
             <span className="text-sm font-semibold text-slate-200">Baseline Target (Buy & Hold)</span>
             <p className="text-xs text-slate-400 mt-0.5">Holding $10,000 of WTI Crude from {startDate} to {endDate}</p>
           </div>
           <span className={`font-bold text-lg ${baselinePnL >= 10000 ? 'text-emerald-400' : 'text-rose-400'}`}>
             ${baselinePnL.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
           </span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto p-2">
        {sortedMetrics.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
            No evaluation metrics found yet.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-medium text-slate-400 border-b border-white/5 uppercase tracking-wider">
                <th 
                  className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-200 transition-colors select-none"
                  onClick={() => handleSort('rank')}
                >
                  Rank {getSortIcon('rank')}
                </th>
                <th 
                  className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-200 transition-colors select-none"
                  onClick={() => handleSort('model')}
                >
                  Model {getSortIcon('model')}
                </th>
                <th 
                  className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-200 transition-colors select-none"
                  onClick={() => handleSort('simulatedPnL')}
                >
                  <InfoTooltip 
                    label="Simulated P&L" 
                    content={<>Ending balance of a $10,000 algorithmic portfolio based entirely on the LLM's daily asset allocation decisions.</>}
                  />
                  {getSortIcon('simulatedPnL')}
                </th>
                <th 
                  className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-200 transition-colors select-none"
                  onClick={() => handleSort('mae')}
                >
                  <InfoTooltip 
                    label="Avg Daily Miss" 
                    content={<>Mean Absolute Error (MAE): The average dollar amount the model's prediction missed the actual closing price.</>}
                  />
                  {getSortIcon('mae')}
                </th>
                <th 
                  className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-200 transition-colors select-none"
                  onClick={() => handleSort('rmse')}
                >
                  <InfoTooltip 
                    label="Consistency Risk" 
                    content={<>Root Mean Square Error (RMSE): Penalizes larger misses more heavily. A higher risk means the model occasionally makes very wrong predictions.</>}
                  />
                  {getSortIcon('rmse')}
                </th>
                <th 
                  className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-200 transition-colors select-none"
                  onClick={() => handleSort('pnlSpread')}
                >
                  <InfoTooltip 
                    label="PnL Spread" 
                    content={<>The difference between the best and worst performing PnL run for this model. A higher spread indicates higher model unstability constraint boundaries.</>}
                  />
                  {getSortIcon('pnlSpread')}
                </th>
                <th 
                  className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-200 transition-colors select-none"
                  onClick={() => handleSort('avgDailySpread')}
                >
                  <InfoTooltip 
                    label="Internal Determinism" 
                    content={<>The average max-min spread of the target price strictly computed on an individual intra-day basis. Meaning, how wildly does the model change its mind when asked the same question on the same day?</>}
                  />
                  {getSortIcon('avgDailySpread')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedMetrics.map((m, idx) => (
                <tr 
                  key={m.model} 
                  className="text-sm hover:bg-white/5 transition-colors duration-200"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${m.rank === 1 ? 'bg-amber-500/20 text-amber-400 font-bold' : m.rank === 2 ? 'bg-slate-300/20 text-slate-300 font-bold' : m.rank === 3 ? 'bg-amber-700/20 text-amber-600 font-bold' : 'text-slate-400'}`}>
                      {m.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-200 whitespace-nowrap">
                    {m.model.split('/').pop() || m.model}
                    {m.runsCount && m.runsCount > 1 && (
                      <span className="ml-2 bg-white/10 text-[10px] uppercase text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-400/20">{m.runsCount}x</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 font-semibold whitespace-nowrap ${m.simulatedPnL >= 10000 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${m.simulatedPnL?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '10,000.00'}
                    {m.aggregateMetrics?.simulatedPnL?.stdDev ? (
                        <span className="text-[10px] text-slate-500 font-mono tracking-tighter block mt-0.5">±${m.aggregateMetrics.simulatedPnL.stdDev.toFixed(0)}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-medium whitespace-nowrap">
                    ${m.mae.toFixed(2)}
                    {m.aggregateMetrics?.mae?.stdDev ? (
                        <span className="text-[10px] text-slate-500 font-mono tracking-tighter block mt-0.5">±${m.aggregateMetrics.mae.stdDev.toFixed(3)}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                    ${m.rmse.toFixed(2)}
                    {m.aggregateMetrics?.rmse?.stdDev ? (
                        <span className="text-[10px] text-slate-500 font-mono tracking-tighter block mt-0.5">±${m.aggregateMetrics.rmse.stdDev.toFixed(3)}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {m.aggregateMetrics?.simulatedPnL ? (
                      <span className="text-rose-400 font-mono tracking-tighter block mt-0.5">${(m.aggregateMetrics.simulatedPnL.max - m.aggregateMetrics.simulatedPnL.min).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                    ) : <span className="text-slate-600">N/A</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm font-semibold whitespace-nowrap">
                    {m.averageDailyTargetSpread !== undefined ? (
                       <span className="text-amber-500 block">±${m.averageDailyTargetSpread.toFixed(2)}</span>
                    ) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
