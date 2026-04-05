'use client';
import { useEffect, useState } from 'react';
import TerminalStats from '@/components/TerminalStats';
import { useTranslations } from '@/components/LanguageProvider';

interface TerminalItem {
  id: string;
  ingredient: string;
  supplier: string;
  contractPrice: number;
  livePrice: number;
  trend: string;
  trendDirection: 'up' | 'down' | 'stable';
  status: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function TradingTerminalPage() {
  const [items, setItems] = useState<TerminalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/terminal`)
      .then((res) => res.json())
      .then((data) => {
        setItems(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Connection error:", err);
        setIsLoading(false);
      });
  }, []);

  const handleAction = async (item: TerminalItem) => {
    if (item.status !== 'Opportunity' && item.status !== 'Warning') return;

    const actionType = item.status === 'Opportunity' ? 'buy-dip' : 'switch-vendor';
    const amount = item.status === 'Opportunity' ? 45.50 : 0;
    
    try {
      const res = await fetch(`${API_URL}/api/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType, amount, itemId: item.id }) 
      });

      if (res.ok) {
        window.location.reload(); 
      }
    } catch (err) {
      console.error("Action failed", err);
    }
  };

  const { t } = useTranslations();

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 p-4 md:p-8 overflow-y-auto">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('tradingTerminal')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('liveMarketMonitoring')}</p>
        </div>
        <span className="px-3 py-1.5 bg-red-100 text-red-600 text-xs font-bold rounded-full animate-pulse border border-red-200 shadow-sm">
          <i className="fas fa-circle text-[8px] mr-2"></i>{t('liveMarket')}
        </span>
      </header>
      
      {/* Cards Component */}
      <TerminalStats />

      {/* Table Container */}
      <div className="bg-white shadow-sm rounded-2xl border border-slate-200 flex flex-col w-full overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('ingredient')}</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('supplier')}</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('contractPrice')}</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('liveMarketPrice')}</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('trend')}</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('status')}</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                    <i className="fas fa-spinner fa-spin mr-2"></i>{t('loadingLiveMarketData')}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                    {t('noDataAvailable')}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5 font-bold text-slate-800">{item.ingredient}</td>
                    <td className="px-6 py-5 text-sm text-slate-500">{item.supplier}</td>
                    <td className="px-6 py-5 text-sm text-slate-500">€ {item.contractPrice.toFixed(2)}</td>
                    <td className={`px-6 py-5 text-sm font-black ${item.trendDirection === 'up' ? 'text-red-600' : item.trendDirection === 'down' ? 'text-emerald-600' : 'text-slate-600'}`}>
                      € {item.livePrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`font-bold px-2 py-1 rounded text-xs ${item.trendDirection === 'up' ? 'text-red-600 bg-red-50' : item.trendDirection === 'down' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 bg-slate-100'}`}>
                        {item.trendDirection !== 'stable' && <i className={`fas fa-arrow-${item.trendDirection} mr-1`}></i>}
                        {item.trend}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${item.status === 'Opportunity' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : item.status === 'Warning' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      
                      <button 
                        onClick={() => handleAction(item)}
                        disabled={item.status !== 'Opportunity' && item.status !== 'Warning'}
                        className={`text-white text-xs font-bold py-2 px-4 rounded-lg shadow-sm transition-all transform group-hover:-translate-y-0.5 ${item.status === 'Opportunity' ? 'bg-emerald-600 hover:bg-emerald-700' : item.status === 'Warning' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-400 cursor-not-allowed'}`}
                      >
                        <i className={`fas ${item.status === 'Opportunity' ? 'fa-shopping-cart' : item.status === 'Warning' ? 'fa-exchange-alt' : 'fa-minus'} mr-1`}></i>
                        {item.status === 'Opportunity' ? t('buyDip') : item.status === 'Warning' ? t('switchVendor') : t('hold')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}