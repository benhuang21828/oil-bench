"use client";

import { useState } from 'react';
import { MetricsSummary } from '@/lib/evaluation/types';
import InfoTooltip from './InfoTooltip';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

type SortField = 'rank' | 'model' | 'simulatedPnL' | 'mae' | 'rmse' | 'totalPredictions';
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
      case 'totalPredictions': return 'Ranking by Total Inferences';
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
                  onClick={() => handleSort('totalPredictions')}
                >
                  Inferences {getSortIcon('totalPredictions')}
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
                  <td className="px-4 py-3 font-medium text-slate-200 whitespace-nowrap">{m.model.split('/').pop() || m.model}</td>
                  <td className={`px-4 py-3 font-semibold whitespace-nowrap ${m.simulatedPnL >= 10000 ? 'text-emerald-400' : 'text-rose-400'}`}>${m.simulatedPnL?.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '10,000.00'}</td>
                  <td className="px-4 py-3 text-slate-300 font-medium whitespace-nowrap">${m.mae.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">${m.rmse.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{m.totalPredictions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
