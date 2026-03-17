import fs from 'fs/promises';
import path from 'path';
import { MetricsSummary } from '@/lib/evaluation/types';
import InfoTooltip from './InfoTooltip';

export default async function Leaderboard() {
  const summaryPath = path.join(process.cwd(), 'data', 'benchmarks', 'metrics_summary.json');
  
  let metrics: MetricsSummary[] = [];
  try {
    const data = await fs.readFile(summaryPath, 'utf8');
    metrics = JSON.parse(data);
  } catch (e) {
    // If no evaluation has happened yet
    metrics = [];
  }

  // Sort by highest Simulated P&L
  metrics.sort((a, b) => (b.simulatedPnL || 0) - (a.simulatedPnL || 0));

  return (
    <div className="w-full h-full bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl">
      <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-900/40 to-transparent">
        <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
          Model Leaderboard
        </h2>
        <p className="text-sm text-slate-400 mt-1">Ranking by Simulated P&L</p>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto p-2">
        {metrics.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
            No evaluation metrics found yet.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-medium text-slate-400 border-b border-white/5 uppercase tracking-wider">
                <th className="px-4 py-3 whitespace-nowrap">Rank</th>
                <th className="px-4 py-3 whitespace-nowrap">Model</th>
                <th className="px-4 py-3 whitespace-nowrap">
                  <InfoTooltip 
                    label="Simulated P&L" 
                    content={<>Ending balance of a $10,000 algorithmic portfolio based entirely on the LLM's daily asset allocation decisions.</>}
                  />
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  <InfoTooltip 
                    label="Avg Daily Miss" 
                    content={<>Mean Absolute Error (MAE): The average dollar amount the model's prediction missed the actual closing price.</>}
                  />
                </th>
                <th className="px-4 py-3 whitespace-nowrap">
                  <InfoTooltip 
                    label="Consistency Risk" 
                    content={<>Root Mean Square Error (RMSE): Penalizes larger misses more heavily. A higher risk means the model occasionally makes very wrong predictions.</>}
                  />
                </th>
                <th className="px-4 py-3 whitespace-nowrap">Inferences</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {metrics.map((m, idx) => (
                <tr 
                  key={m.model} 
                  className="text-sm hover:bg-white/5 transition-colors duration-200"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${idx === 0 ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400'}`}>
                      {idx + 1}
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
