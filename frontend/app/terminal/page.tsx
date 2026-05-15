'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from '@/components/LanguageProvider';
import { supabase } from '@/lib/supabase';
import TerminalStats from '@/components/TerminalStats';
import DataTable from '@/components/DataTable';
import ActionCenter from '@/components/ActionCenter';
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

interface SupplierStat {
  supplierId: string;
  supplierName: string;
  latestPrice: number;
  bestPrice: number;
  avgPrice: number;
  deliveries: number;
  lastDate: string;
  isCheapest: boolean;
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

function PriceHistoryContent({ data, contractPrice, uom }: {
  data: PricePoint[];
  contractPrice: number;
  uom: string;
}) {
  const { t } = useTranslations();
  if (data.length < 2) return (
    <div className="px-6 py-4 text-sm text-slate-400 italic">
      {t('insufficientPriceHistory')}
    </div>
  );
  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.2 || 0.5;

  return (
    <div className="px-6 py-5">
      <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
        {t('priceHistory')} ({data.length} {t('observations')})
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
              return [`€ ${num.toFixed(4)} / ${uom}`, t('price')];
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
              value: t('initialPrice'),
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

function SupplierComparisonContent({ data, isLoading, uom }: {
  data: SupplierStat[] | null;
  isLoading: boolean;
  uom: string;
}) {
  const { t } = useTranslations();

  if (isLoading) return (
    <div className="px-6 py-4 text-sm text-slate-400 italic">{t('loadingSupplierData')}</div>
  );
  if (!data?.length) return (
    <div className="px-6 py-4 text-sm text-slate-400 italic">{t('noSupplierData')}</div>
  );

  return (
    <div className="px-6 py-4">
      <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
        {t('supplierComparison')} ({data.length} {t('suppliers')})
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-200">
            <th className="text-left pb-2 font-semibold pr-4">{t('supplier')}</th>
            <th className="text-right pb-2 font-semibold pr-4">{t('livePrice')}</th>
            <th className="text-right pb-2 font-semibold pr-4">{t('bestPrice')}</th>
            <th className="text-right pb-2 font-semibold pr-4">{t('avgPrice')}</th>
            <th className="text-right pb-2 font-semibold pr-4">{t('deliveries')}</th>
            <th className="text-right pb-2 font-semibold">{t('date')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map(s => (
            <tr
              key={s.supplierId}
              className={`border-b border-slate-100 last:border-0 ${s.isCheapest ? 'bg-emerald-50' : ''}`}
            >
              <td className="py-2 pr-4">
                <span className="font-medium text-slate-700">{s.supplierName}</span>
                {s.isCheapest && (
                  <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded uppercase tracking-wide">
                    {t('bestLabel')}
                  </span>
                )}
              </td>
              <td className="py-2 pr-4 text-right font-mono text-slate-700">
                € {s.latestPrice.toFixed(4)} <span className="text-slate-400 text-xs">/{uom}</span>
              </td>
              <td className="py-2 pr-4 text-right font-mono text-emerald-600">
                € {s.bestPrice.toFixed(4)}
              </td>
              <td className="py-2 pr-4 text-right font-mono text-slate-500">
                € {s.avgPrice.toFixed(4)}
              </td>
              <td className="py-2 pr-4 text-right text-slate-500">{s.deliveries}</td>
              <td className="py-2 text-right text-slate-400 text-xs">
                {new Date(s.lastDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpandedRowPanel({ row }: { row: TerminalItem }) {
  const [activeTab, setActiveTab] = useState<'history' | 'suppliers'>('history');
  const [supplierData, setSupplierData] = useState<SupplierStat[] | null>(null);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const { t } = useTranslations();

  const loadSuppliers = async () => {
    if (supplierData !== null || isLoadingSuppliers) return;
    setIsLoadingSuppliers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/api/terminal/${row.id}/suppliers`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setSupplierData(await res.json());
    } catch (err) {
      console.error('Supplier comparison fetch error:', err);
      setSupplierData([]);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  const tabClass = (tab: 'history' | 'suppliers') =>
    `px-4 py-2 text-xs font-bold transition-colors border-b-2 -mb-px ${
      activeTab === tab
        ? 'border-indigo-500 text-indigo-600'
        : 'border-transparent text-slate-400 hover:text-slate-600'
    }`;

  return (
    <div className="bg-slate-50 border-t border-slate-100">
      <div className="flex px-6 border-b border-slate-200">
        <button type="button" className={tabClass('history')} onClick={() => setActiveTab('history')}>
          {t('priceHistory')}
        </button>
        <button
          type="button"
          className={tabClass('suppliers')}
          onClick={() => { setActiveTab('suppliers'); loadSuppliers(); }}
        >
          {t('supplierComparison')}
        </button>
      </div>
      {activeTab === 'history' ? (
        <PriceHistoryContent
          data={row.priceHistory || []}
          contractPrice={row.contractPrice}
          uom={row.uom}
        />
      ) : (
        <SupplierComparisonContent
          data={supplierData}
          isLoading={isLoadingSuppliers}
          uom={row.uom}
        />
      )}
    </div>
  );
}

export default function TradingTerminalPage() {
  const [items, setItems] = useState<TerminalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'Warning' | 'Opportunity' | 'Stable'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [daysFilter, setDaysFilter] = useState<0 | 30 | 60 | 90>(0);
  const { t } = useTranslations();

  const fetchTerminalData = async () => {
    setIsLoading(true);
    setExpandedId(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = daysFilter > 0
        ? `${API_URL}/api/terminal?days=${daysFilter}`
        : `${API_URL}/api/terminal`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setItems(await res.json());
    } catch (err) {
      console.error('Terminal fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminalData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysFilter]);

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  const columns = [
    {
      key: 'ingredient',
      header: t('ingredient'),
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
      header: t('supplier'),
      render: (row: TerminalItem) => (
        <span className="text-sm text-slate-500">{row.supplier}</span>
      )
    },
    {
      key: 'contractPrice',
      header: t('initialPrice'),
      align: 'right' as const,
      render: (row: TerminalItem) => (
        <span className="text-sm font-mono text-slate-500">
          € {Number(row.contractPrice ?? 0).toFixed(4)}
        </span>
      )
    },
    {
      key: 'livePrice',
      header: t('livePrice'),
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
      header: t('recentTrend'),
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
      header: t('priceHistory'),
      render: (row: TerminalItem) => (
        <Sparkline data={row.priceHistory || []} trendDirection={row.trendDirection} />
      )
    },
    {
      key: 'status',
      header: t('status'),
      render: (row: TerminalItem) => {
        const statusKey: Record<string, string> = {
          Warning: 'statusWarning',
          Opportunity: 'statusOpportunity',
          Stable: 'statusStable',
        };
        return (
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
            row.status === 'Opportunity' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
            row.status === 'Warning' ? 'bg-red-100 text-red-800 border-red-300' :
            'bg-slate-100 text-slate-600 border-slate-300'
          }`}>
            {row.status === 'Warning' && <i className="fas fa-exclamation-triangle mr-1"></i>}
            {row.status === 'Opportunity' && <i className="fas fa-arrow-down mr-1"></i>}
            {t(statusKey[row.status] ?? 'statusStable')}
          </span>
        );
      }
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
          <i className="fas fa-circle text-[8px] mr-2"></i>{t('live')}
        </span>
      </header>

      {/* STATS STRIP */}
      <TerminalStats />

      {/* ACTION CENTER */}
      <ActionCenter onPriceApplied={fetchTerminalData} />

      {/* FILTER TABS */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(['all', 'Warning', 'Opportunity', 'Stable'] as const).map(f => {
            const labelKey: Record<string, string> = {
              all: 'all',
              Warning: 'statusWarning',
              Opportunity: 'statusOpportunity',
              Stable: 'statusStable',
            };
            const count = f === 'all' ? items.length : items.filter(i => i.status === f).length;
            return (
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
                {t(labelKey[f])} ({count})
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 font-semibold mr-1">{t('period')}:</span>
          {([30, 60, 90, 0] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDaysFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                daysFilter === d
                  ? 'bg-slate-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {d === 0 ? t('all') : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        emptyMessage={t('noIngredientsFound')}
        emptyIcon="fa-chart-line"
        keyExtractor={row => row.id}
        onRowClick={row => setExpandedId(prev => prev === row.id ? null : row.id)}
        expandedId={expandedId}
        renderExpanded={row => <ExpandedRowPanel row={row} />}
      />

    </div>
  );
}