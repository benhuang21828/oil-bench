import fs from 'fs/promises';
import path from 'path';
import Leaderboard from '@/components/Leaderboard';
import PriceChart, { ChartDataPoint } from '@/components/PriceChart';
import { DailyPredictionOutput } from '@/lib/types';
import { Github } from 'lucide-react';

export default async function Home() {
  const model = process.env.LLM_MODEL_NAME || "google/gemini-2.5-flash";
  const dirModelName = model.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  const predictionsPath = path.join(process.cwd(), 'data', 'prediction', dirModelName, 'predictions.json');
  const pricesDir = path.join(process.cwd(), 'data', 'raw', 'prices');
  const newsDir = path.join(process.cwd(), 'data', 'raw', 'news');
  const fundamentalsDir = path.join(process.cwd(), 'data', 'raw', 'fundamentals');

  let rawPredictions: DailyPredictionOutput[] = [];
  try {
    const data = await fs.readFile(predictionsPath, 'utf8');
    rawPredictions = JSON.parse(data);
  } catch (e) {
    // No predictions available yet
  }

  // We only want to plot days where we have an actual_close
  // The evaluator populated actual_close meaning the true "N+1" day had happened!
  const validPredictions = rawPredictions.filter(p => p.actual_close !== undefined);
  
  // Format data for Recharts
  const chartData: ChartDataPoint[] = await Promise.all(validPredictions.map(async (p) => {
    const targetDate = p.targetDate; // Day N
    
    // Read context for Day N that the LLM used!
    let news: any[] = [];
    let eiaSummary = "";
    
    try {
      const newsPath = path.join(newsDir, `${targetDate}.json`);
      const newsJson = JSON.parse(await fs.readFile(newsPath, 'utf8'));
      news = newsJson.news;
    } catch(e) {}

    try {
      const fundPath = path.join(fundamentalsDir, `${targetDate}.json`);
      const fundJson = JSON.parse(await fs.readFile(fundPath, 'utf8'));
      eiaSummary = fundJson.eiaSummary;
    } catch(e) {}

    // Find the next available price date (Day N+1) which is exactly what we are evaluating!
    // Since we filtered by actual_close existing, we know we evaluated it. We'll plot the datapoint
    // AT Day N+1, because that's when the "Actual Settlement" occurred, and we are comparing the Target at N+1.
    
    // To find the N+1 date label
    const priceFiles = await fs.readdir(pricesDir);
    const sortedDates = priceFiles
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    const currentIndex = sortedDates.indexOf(targetDate);
    const nextDate = currentIndex > -1 && currentIndex < sortedDates.length - 1 ? sortedDates[currentIndex + 1] : targetDate;

    return {
      date: nextDate, // Plot this point on N+1's timeline!
      actual_close: p.actual_close as number,
      prediction: {
        model,
        predict_target_price: p.prediction.predict_target_price,
        portfolio_allocation: p.prediction.portfolio_allocation ?? 50,
        reasoning: p.prediction.reasoning,
        delta: p.delta as number,
      },
      news,
      eiaSummary
    };
  }));

  // Sort chronologically
  chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <main className="min-h-screen bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-black to-black text-slate-200 p-4 md:p-8 font-sans">
      
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row items-start md:items-baseline justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500 tracking-tighter">
                OilBench
              </h1>
              <a 
                href="https://github.com/benhuang21828/oil-bench" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors duration-200 mt-1"
                aria-label="GitHub Repository"
              >
                <Github size={20} />
                <span className="text-sm font-semibold tracking-wide">Repo</span>
              </a>
            </div>
            <p className="text-slate-400 mt-2 font-medium">LLM WTI Crude Prediction Benchmark</p>
          </div>
          <div className="flex flex-wrap gap-4 mt-4 md:mt-0">
            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-sm flex items-center">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-bold mr-2">Target Asset</span>
              <span className="text-sm font-semibold text-emerald-400 border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 rounded">CL=F (WTI)</span>
            </div>
          </div>
        </header>

        {/* Leaderboard Section */}
        <div className="w-full">
           <Leaderboard />
        </div>

        {/* Main Chart Area */}
        <div className="w-full mt-12 relative z-10">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2 text-white tracking-tight">Interactive Inference Timeline</h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
              The chart below overlays the actual official daily settlement price of WTI Crude on the NYMEX against the exact target price predicted by the LLM. 
              <strong className="text-emerald-400 font-medium ml-1">Hover over any day</strong> to view the contextual news, fundamentals, and economic reasoning the model generated to derive its prediction exactly 24 hours prior.
            </p>
          </div>
          <div className="h-[500px] w-full">
            {chartData.length > 0 ? (
              <PriceChart data={chartData} />
            ) : (
              <div className="w-full h-full bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-center">
                <p className="text-slate-500">No prediction data available. Run the backfill-inference script!</p>
              </div>
            )}
          </div>
        </div>

        {/* Metric Explanations */}
        <div className="w-full mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-xl">
            <h4 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
              Avg Daily Miss
              <span className="text-slate-500 text-[10px] bg-white/5 rounded-full px-1.5 border border-white/10 font-bold tracking-wider">(?)</span>
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Mean Absolute Error (MAE): The average dollar amount the model's prediction missed the actual closing price on any given day. <br/><span className="text-emerald-400/80 mt-2 block font-medium">Lower is better.</span>
            </p>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-xl">
            <h4 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
              Consistency Risk
              <span className="text-slate-500 text-[10px] bg-white/5 rounded-full px-1.5 border border-white/10 font-bold tracking-wider">(?)</span>
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Root Mean Square Error (RMSE): Penalizes larger misses more heavily. A higher risk means the model occasionally makes very wrong predictions.<br/><span className="text-emerald-400/80 mt-2 block font-medium">Lower is better.</span>
            </p>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-xl">
            <h4 className="text-slate-200 font-semibold mb-3 flex items-center gap-2">
              Simulated P&L
              <span className="text-slate-500 text-[10px] bg-white/5 rounded-full px-1.5 border border-white/10 font-bold tracking-wider">(?)</span>
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ending balance of a $10,000 algorithmic portfolio based entirely on the LLM's daily asset allocation decisions (0-100% Oil) over the benchmark period. <br/><span className="text-emerald-400/80 mt-2 block font-medium">Higher is better.</span>
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}
