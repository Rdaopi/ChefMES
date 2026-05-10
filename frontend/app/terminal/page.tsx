'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from '@/components/LanguageProvider';
import { supabase } from '@/lib/supabase';
import TerminalStats from '@/components/TerminalStats';
import DataTable from '@/components/DataTable';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine
} from 'recharts';

interface PricePoint {
  date: string;
  price: number;
  supplier: string;
}

interface TerminalItem {
  id: string;
  ingredient: string;
  supplier: string;
  uom: string;
  contractPrice: number;
  livePrice: number;
  trend: string;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercent: number;
  longTermPercent: number;
  totalDeltaSavings: number;
  status: 'Warning' | 'Opportunity' | 'Stable';
  lastUpdated: string;
  priceHistory: PricePoint[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function Sparkline({ data, trendDirection }: { data: PricePoint[], trendDirection: string }) {
  if (data.length < 2) return (
    <span className="text-xs text-slate-300 italic">—</span>
  );
  const color =
    trendDirection === 'up' ? '#ef4444' :
    trendDirection === 'down' ? '#10b981' :
    '#94a3b8';
  return (
    <ResponsiveContainer width={100} height={30}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="price" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PriceHistoryChart({ data, contractPrice, uom }: {
  data: PricePoint[];
  contractPrice: number;
  uom: string;
}) {
  if (data.length < 2) return (
    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-sm text-slate-400 italic">
      Storico insufficiente — carica più fatture per vedere il trend.
    </div>
  );
  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.2 || 0.5;

  return (
    <div className="px-6 py-5 bg-slate-50 border-t border-slate-100">
      <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
        Storico Prezzi ({data.length} rilevazioni)
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={d => new Date(d).toLocaleDateString('it-IT', {
              day: '2-digit', month: 'short'
            })}
          />
          <YAxis
            domain={[minPrice - padding, maxPrice + padding]}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={v => `€${v.toFixed(2)}`}
            width={55}
          />
          <Tooltip
            formatter={(value) => {
              const num = Number(value ?? 0);
              return [`€ ${num.toFixed(4)} / ${uom}`, 'Prezzo'];
            }}
            labelFormatter={(d) => new Date(d).toLocaleDateString('it-IT', {
              day: '2-digit', month: 'long', year: 'numeric'
            })}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid #e2e8f0'
            }}
          />
          <ReferenceLine
            y={contractPrice}
            stroke="#94a3b8"
            strokeDasharray="4 2"
            label={{
              value: 'Prezzo iniziale',
              position: 'insideTopRight',
              fontSize: 10,
              fill: '#94a3b8'
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#4f46e5' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function TradingTerminalPage() {
  const [items, setItems] = useState<TerminalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'Warning' | 'Opportunity' | 'Stable'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { t } = useTranslations();

  useEffect(() => {
    const fetchTerminalData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_URL}/api/terminal`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        console.log('Terminal sample:', data[0]);
        setItems(data);
      } catch (err) {
        console.error('Terminal fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTerminalData();
  }, []);

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  const columns = [
    {
      key: 'ingredient',
      header: 'Ingrediente',
      render: (row: TerminalItem) => (
        <div className="flex items-center gap-2">
          <i className={`fas fa-chevron-${expandedId === row.id ? 'down' : 'right'} text-xs text-slate-300`}></i>
          <div>
            <div className="font-bold text-slate-800">{row.ingredient}</div>
            <div className="text-xs text-slate-400">{row.uom}</div>
          </div>
        </div>
      )
    },
    {
      key: 'supplier',
      header: 'Fornitore',
      render: (row: TerminalItem) => (
        <span className="text-sm text-slate-500">{row.supplier}</span>
      )
    },
    {
      key: 'contractPrice',
      header: 'Prezzo Iniziale',
      align: 'right' as const,
      render: (row: TerminalItem) => (
        <span className="text-sm font-mono text-slate-500">
          € {Number(row.contractPrice ?? 0).toFixed(4)}
        </span>
      )
    },
    {
      key: 'livePrice',
      header: 'Prezzo Attuale',
      align: 'right' as const,
      render: (row: TerminalItem) => (
        <span className={`text-sm font-black font-mono ${
          row.trendDirection === 'up' ? 'text-red-600' :
          row.trendDirection === 'down' ? 'text-emerald-600' :
          'text-slate-700'
        }`}>
          € {Number(row.livePrice ?? 0).toFixed(4)}
        </span>
      )
    },
    {
      key: 'trend',
      header: 'Var. Recente',
      render: (row: TerminalItem) => (
        <span className={`inline-flex items-center font-bold px-2 py-1 rounded text-xs ${
          row.trendDirection === 'up' ? 'text-red-600 bg-red-50' :
          row.trendDirection === 'down' ? 'text-emerald-600 bg-emerald-50' :
          'text-slate-600 bg-slate-100'
        }`}>
          {row.trendDirection !== 'stable' && (
            <i className={`fas fa-arrow-${row.trendDirection} mr-1`}></i>
          )}
          {row.trend}
        </span>
      )
    },
    {
      key: 'priceHistory',
      header: 'Storico',
      render: (row: TerminalItem) => (
        <Sparkline data={row.priceHistory || []} trendDirection={row.trendDirection} />
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: TerminalItem) => (
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
          row.status === 'Opportunity' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
          row.status === 'Warning' ? 'bg-red-100 text-red-800 border-red-300' :
          'bg-slate-100 text-slate-600 border-slate-300'
        }`}>
          {row.status === 'Warning' && <i className="fas fa-exclamation-triangle mr-1"></i>}
          {row.status === 'Opportunity' && <i className="fas fa-arrow-down mr-1"></i>}
          {row.status}
        </span>
      )
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 p-4 md:p-8 overflow-y-auto">

      {/* HEADER */}
      <header className="mb-6 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {t('tradingTerminal')}
          </h2>
          <p className="text-slate-500 text-sm mt-1">{t('liveMarketMonitoring')}</p>
        </div>
        <span className="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-bold rounded-full animate-pulse border border-red-200">
          <i className="fas fa-circle text-[8px] mr-2"></i>LIVE
        </span>
      </header>

      {/* STATS STRIP */}
      <TerminalStats />

      {/* FILTER TABS */}
      <div className="flex gap-2 mb-4">
        {(['all', 'Warning', 'Opportunity', 'Stable'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f === 'all'
              ? `Tutti (${items.length})`
              : `${f} (${items.filter(i => i.status === f).length})`
            }
          </button>
        ))}
      </div>

      {/* TABLE */}
      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage="Nessun ingrediente trovato. Importa delle fatture per iniziare."
        emptyIcon="fa-chart-line"
        keyExtractor={row => row.id}
        onRowClick={row => setExpandedId(prev => prev === row.id ? null : row.id)}
        expandedId={expandedId}
        renderExpanded={row => (
          <PriceHistoryChart
            data={row.priceHistory || []}
            contractPrice={row.contractPrice}
            uom={row.uom}
          />
        )}
      />

    </div>
  );
}