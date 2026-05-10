'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Stats {
  monthlySpend: number;
  monthlyBudget: number | null;
  currentMarginPercent: number;
  targetMarginPercent: number;
  avgFoodCostPercent: number;
  targetFoodCostPercent: number;
  totalDishes: number;
  dogsCount: number;
}

interface EditingField {
  key: 'targetMarginPercent' | 'targetFoodCostPercent' | 'monthlyBudget';
  value: string;
}

export default function TerminalStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [editing, setEditing] = useState<EditingField | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/api/stats`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleEdit = (key: EditingField['key'], currentValue: number | null) => {
    setEditing({ key, value: String(currentValue ?? '') });
  };

  const handleSave = async () => {
    if (!editing || !stats) return;
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const payload: any = {
        target_margin_percent: stats.targetMarginPercent,
        target_food_cost_percent: stats.targetFoodCostPercent,
        monthly_spend_budget: stats.monthlyBudget
      };

      // Map frontend key to API key
      const keyMap: Record<EditingField['key'], string> = {
        targetMarginPercent: 'target_margin_percent',
        targetFoodCostPercent: 'target_food_cost_percent',
        monthlyBudget: 'monthly_spend_budget'
      };
      payload[keyMap[editing.key]] = Number(editing.value) || null;

      await fetch(`${API_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      setEditing(null);
      fetchStats(); // Refresh
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!stats) return (
    <div className="flex gap-4 mb-6 animate-pulse">
      {[1,2,3,4].map(i => (
        <div key={i} className="h-14 bg-slate-200 rounded-xl flex-1"></div>
      ))}
    </div>
  );

const currentMargin = Number(stats.currentMarginPercent ?? 0);
const targetMargin = Number(stats.targetMarginPercent ?? 65);
const avgFoodCost = Number(stats.avgFoodCostPercent ?? 0);
const targetFoodCost = Number(stats.targetFoodCostPercent ?? 30);
const monthlySpend = Number(stats.monthlySpend ?? 0);
const marginDiff = currentMargin - targetMargin;
const foodCostDiff = avgFoodCost - targetFoodCost;

  return (
    <div className="flex flex-wrap gap-3 mb-6">

      {/* Monthly Spend */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex-1 min-w-[180px]">
        <i className="fas fa-receipt text-slate-400 text-sm"></i>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spesa Mensile</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-slate-800">
              € {monthlySpend.toLocaleString('it-IT', { minimumFractionDigits: 0 })}
            </span>
            {stats.monthlyBudget && (
              <span className={`text-xs font-bold ${
                monthlySpend > stats.monthlyBudget ? 'text-red-500' : 'text-emerald-500'
              }`}>
                / € {Number(stats.monthlyBudget).toLocaleString('it-IT')}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleEdit('monthlyBudget', stats.monthlyBudget)}
              className="text-slate-300 hover:text-indigo-500 transition-colors"
              title="Modifica budget"
            >
              <i className="fas fa-pen text-[10px]"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Current Margin */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex-1 min-w-[180px]">
        <i className={`fas fa-chart-line text-sm ${marginDiff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}></i>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Margine Attuale</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-lg font-black ${marginDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {currentMargin.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400">target:</span>
            {editing?.key === 'targetMarginPercent' ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={editing.value}
                  onChange={e => setEditing({ ...editing, value: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') setEditing(null);
                  }}
                  autoFocus
                  className="w-14 text-xs border border-indigo-300 rounded px-1 py-0.5 font-bold text-indigo-600"
                />
                <button type="button" onClick={handleSave} disabled={isSaving}
                  className="text-emerald-500 hover:text-emerald-700">
                  <i className="fas fa-check text-[10px]"></i>
                </button>
                <button type="button" onClick={() => setEditing(null)}
                  className="text-slate-400 hover:text-slate-600">
                  <i className="fas fa-times text-[10px]"></i>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleEdit('targetMarginPercent', targetMargin)}
                className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
              >
                {targetMargin}%
                <i className="fas fa-pen text-[10px]"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Food Cost % */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex-1 min-w-[180px]">
        <i className={`fas fa-utensils text-sm ${foodCostDiff <= 0 ? 'text-emerald-500' : 'text-red-500'}`}></i>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Food Cost</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-lg font-black ${foodCostDiff <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {avgFoodCost.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400">max:</span>
            {editing?.key === 'targetFoodCostPercent' ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={editing.value}
                  onChange={e => setEditing({ ...editing, value: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') setEditing(null);
                  }}
                  autoFocus
                  className="w-14 text-xs border border-indigo-300 rounded px-1 py-0.5 font-bold text-indigo-600"
                />
                <button type="button" onClick={handleSave} disabled={isSaving}
                  className="text-emerald-500 hover:text-emerald-700">
                  <i className="fas fa-check text-[10px]"></i>
                </button>
                <button type="button" onClick={() => setEditing(null)}
                  className="text-slate-400 hover:text-slate-600">
                  <i className="fas fa-times text-[10px]"></i>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleEdit('targetFoodCostPercent', targetFoodCost)}
                className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
              >
                {targetFoodCost}%
                <i className="fas fa-pen text-[10px]"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dishes at risk */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex-1 min-w-[180px]">
        <i className={`fas fa-exclamation-triangle text-sm ${
          stats.dogsCount > 0 ? 'text-red-500' : 'text-slate-300'
        }`}></i>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Piatti a Rischio</p>
          <span className={`text-lg font-black ${
            stats.dogsCount > 0 ? 'text-red-600' : 'text-emerald-600'
          }`}>
            {stats.dogsCount ?? 0}
          </span>
          <span className="text-xs text-slate-400 ml-1">/ {stats.totalDishes ?? 0} piatti</span>
        </div>
      </div>

    </div>
  );
}