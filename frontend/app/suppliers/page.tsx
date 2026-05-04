'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from '@/components/LanguageProvider';
import { supabase } from '@/lib/supabase';

interface Supplier {
  id: string;
  name: string;
  totalSpent: number;
  invoiceCount: number;
  lastOrderDate: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslations();

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${API_URL}/api/suppliers`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        setSuppliers(Array.isArray(data) ? data : []);

      } catch (error) {
        console.error("Connection error:", error);
        setSuppliers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
        <h2 className="text-lg font-bold text-slate-800">
          <i className="fas fa-truck-loading mr-2 text-indigo-500"></i>
          {t('aiVendorManagement') || 'Gestione Fornitori'}
        </h2>
      </header>
      
      <main className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {isLoading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <i className="fas fa-circle-notch fa-spin text-4xl mb-4 text-indigo-300"></i>
              <p className="font-bold uppercase tracking-widest text-xs">
                {t('loadingVendorScores') || 'Caricamento metriche fornitori...'}
              </p>
            </div>
          ) : Array.isArray(suppliers) && suppliers.length > 0 ? (
            suppliers.map((supplier) => (
              <div 
                key={supplier.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col overflow-hidden"
              >
                {/* Header Card */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight line-clamp-1" title={supplier.name}>
                      {supplier.name}
                    </h3>
                  </div>
                  <div className="bg-indigo-100 text-indigo-700 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                    <i className="fas fa-building text-sm"></i>
                  </div>
                </div>

                {/* Metriche Card */}
                <div className="p-5 flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {t('monthlySpend') || 'Spesa Totale'}
                    </p>
                    <p className="text-xl font-black text-slate-900">
                      € {supplier.totalSpent.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {t('registeredInvoices') || 'Fatture Registrate'}
                    </p>
                    <p className="text-xl font-bold text-indigo-600">
                      {supplier.invoiceCount} <span className="text-sm font-medium text-slate-400">doc</span>
                    </p>
                  </div>
                </div>

                {/* Footer Card */}
                <div className="px-5 py-3 bg-slate-50 text-xs flex justify-between items-center border-t border-slate-100">
                  <span className="text-slate-500 font-medium">{t('lastOrder') || 'Ultimo Ordine'}:</span>
                  <span className="font-bold text-slate-700">
                    {supplier.lastOrderDate 
                      ? new Date(supplier.lastOrderDate).toLocaleDateString() 
                      : 'Nessun dato'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <i className="fas fa-box-open text-4xl text-slate-300 mb-3"></i>
              <p className="text-slate-500 font-medium">{t('noSuppliersFound') || 'Nessun fornitore trovato. Inizia caricando delle fatture!'}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}