'use client';
import { useEffect, useState } from 'react';

export default function TerminalStats() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/stats')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  if (!stats) return <div className="grid grid-cols-4 gap-6 mb-8 animate-pulse">
    {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>)}
  </div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Monthly Spend */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
        <p className="text-sm text-slate-500 font-semibold mb-1">Monthly F&B Spend</p>
        <h3 className="text-3xl font-black text-slate-800">€{stats.monthlySpend.toLocaleString()}</h3>
        <p className="text-xs text-green-600 mt-2 font-medium">
          <i className="fas fa-arrow-down mr-1"></i>{Math.abs(stats.spendTrend)}% vs last month
        </p>
      </div>

      {/* Target Margin */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
        <p className="text-sm text-slate-500 font-semibold mb-1">Target Margin</p>
        <h3 className="text-3xl font-black text-slate-800">{stats.targetMargin.toFixed(1)}%</h3>
        <p className="text-xs text-slate-400 mt-2">Set by Ownership</p>
      </div>

      {/* Current Margin */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between border-l-4 border-l-amber-400">
        <p className="text-sm text-slate-500 font-semibold mb-1">Current Margin (Live)</p>
        <h3 className="text-3xl font-black text-amber-500">{stats.currentMargin.toFixed(1)}%</h3>
        <p className="text-xs text-amber-600 mt-2 font-medium">
          <i className="fas fa-exclamation-triangle mr-1"></i> Below Target!
        </p>
      </div>

      {/* Cash Recovered */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 rounded-2xl shadow-lg shadow-emerald-500/30 flex flex-col justify-between text-white relative">
        <p className="text-sm text-emerald-100 font-bold mb-1 tracking-wide">CASH RECOVERED TODAY</p>
        <h3 className="text-4xl font-black tracking-tighter">€{stats.cashRecovered.toFixed(2)}</h3>
        <p className="text-xs text-emerald-200 mt-2 font-medium bg-emerald-800/40 inline-block px-2 py-1 rounded w-max">
          Active Clawbacks
        </p>
      </div>
    </div>
  );
}