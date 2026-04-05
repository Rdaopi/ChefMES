'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from '@/components/LanguageProvider';

// TypeScript interfaces
interface Order {
  id: string;
  status: string;
  title: string;
  amount: number;
  supplier: string;
  action: string;
}

interface OrdersPipeline {
  pending: Order[];
  approved: Order[];
}


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrdersPipeline>({ pending: [], approved: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data from the backend API
  useEffect(() => {

    fetch(`${API_URL}/api/orders`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setIsLoading(false);
      })
      .catch((err) => console.error("Connection error:", err));
  }, []);

  const { t } = useTranslations();

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
        <h2 className="text-lg font-bold text-slate-800">{t('liveOrdersPipeline')}</h2>
      </header>
      
      <main className="flex-1 overflow-x-auto p-8 flex gap-6">
        
        {/* Column 1: Pending / Drafts */}
        <div className="w-80 flex flex-col shrink-0">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">{t('draftsChefRequests')}</h3>
          {isLoading ? <p className="text-sm text-slate-400 font-medium">{t('loadingPipeline')}</p> : 
            orders.pending.map((order) => (
              <div key={order.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-amber-400 mb-4 transition-transform hover:-translate-y-1">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-400">{order.id}</span>
                  <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded font-bold">{order.status}</span>
                </div>
                <h4 className="font-bold text-slate-800">{order.title}</h4>
                <p className="text-sm text-slate-500 mt-1">€ {order.amount.toFixed(2)} • {order.supplier}</p>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-amber-600 font-medium">
                  <i className="fas fa-spinner fa-spin mr-1"></i> {order.action}
                </div>
              </div>
            ))
          }
        </div>

        {/* Column 2: Auto-Approved */}
        <div className="w-80 flex flex-col shrink-0">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">{t('autoRoutedByAI')}</h3>
          {isLoading ? <p className="text-sm text-slate-400 font-medium">{t('loadingPipeline')}</p> : 
            orders?.approved.map((order) => (
              <div key={order.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-blue-500 mb-4 transition-transform hover:-translate-y-1">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-400">{order.id}</span>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-bold">{order.status}</span>
                </div>
                <h4 className="font-bold text-slate-800">{order.title}</h4>
                <p className="text-sm text-slate-500 mt-1">€ {order.amount.toFixed(2)} • {order.supplier}</p>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-blue-600 font-medium">
                  <i className="fas fa-robot mr-1"></i> {order.action}
                </div>
              </div>
            ))
          }
        </div>

      </main>
    </div>
  );
}