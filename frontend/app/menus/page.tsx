'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/components/LanguageProvider';
import { supabase } from '@/lib/supabase'; // Aggiunto per il tokens

interface MenuItem {
  id: string;
  dishName: string;
  category: string;
  productionCost: number;
  sellingPrice: number;
  profitMargin: number;
  status: string;
  trend: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function MenuEngineeringPage() {
  const router = useRouter(); 
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslations();

  // Funzione per caricare i menu (estratta per poterla richiamare dopo un'eliminazione)
  const fetchMenus = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/api/menus`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      // 1. CONTROLLO DI SICUREZZA: Se la risposta non è OK (es. 404, 500)
      if (!res.ok) {
        // Leggiamo la risposta come testo (HTML) e stampiamola nella console
        const errorHtml = await res.text(); 
        console.error("L'API non ha restituito JSON! Status:", res.status, "HTML Ricevuto:", errorHtml.substring(0, 100));
        throw new Error(`Errore Server: ${res.status}`);
      }

      // 2. Solo se è andato tutto bene proviamo a fare il parse del JSON
      const data = await res.json();
      setMenuItems(Array.isArray(data) ? data : []);

    } catch (err) {
      console.error("Connection error:", err);
      setMenuItems([]); // Imposta array vuoto in caso di errore per evitare crash della tabella
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  // NUOVA FUNZIONE: Elimina piatto
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Evita che il click apra la pagina di dettaglio
    
    if (!window.confirm("Sei sicuro di voler eliminare questo piatto? Perderai anche lo storico dei costi.")) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/api/menus/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      if (res.ok) {
        // Rimuovi visivamente il piatto dalla tabella senza ricaricare la pagina
        setMenuItems(menuItems.filter(item => item.id !== id));
      } else {
        alert("Errore durante l'eliminazione.");
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Star': return 'bg-yellow-100 text-yellow-800 border-yellow-300'; 
      case 'Puzzle': return 'bg-blue-100 text-blue-800 border-blue-300';     
      case 'Plowhorse': return 'bg-purple-100 text-purple-800 border-purple-300'; 
      case 'Dog': return 'bg-red-100 text-red-800 border-red-300';           
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 p-8 overflow-y-auto">
      
      {/* HEADER AGGIORNATO CON PULSANTE "NUOVO PIATTO" */}
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('menuEngineering') || 'Menu Engineering'}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('realTimeDishProfitability') || 'Profittabilità dei piatti in tempo reale'}</p>
        </div>
        
        {/* IL PULSANTE MANCANTE! */}
        <button 
          onClick={() => router.push('/menus/builder')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center transform hover:-translate-y-0.5"
        >
          <i className="fas fa-plus mr-2"></i> {t('addNewDish') || 'Nuovo Piatto'}
        </button>
      </header>

      {/* STATISTICHE */}
      {(() => {
        const pricedItems = menuItems.filter(m => m.sellingPrice > 0);
        const avgFoodCost = pricedItems.length > 0
          ? pricedItems.reduce((sum, m) => sum + (m.productionCost / m.sellingPrice) * 100, 0) / pricedItems.length
          : null;
        const atRisk = menuItems.filter(m => m.status === 'Dog').length;

        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{t('avgFoodCost') || 'Food Cost Medio'}</p>
              <p className="text-2xl font-black text-slate-800">
                {isLoading
                  ? '—'
                  : avgFoodCost === null
                    ? '—'
                    : `${avgFoodCost.toFixed(1)}%`}
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{t('itemsAtRisk') || 'Piatti a rischio'}</p>
              <p className="text-2xl font-black text-red-600">{isLoading ? '—' : atRisk}</p>
            </div>
          </div>
        );
      })()}
      
      {/* TABELLA */}
      <div className="bg-white shadow-sm rounded-2xl border border-slate-200 flex flex-col w-full overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('dishName') || 'Piatto'}</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('category') || 'Categoria'}</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('sellingPrice') || 'Prezzo Vendita'}</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('liveFoodCost') || 'Costo Live'}</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('grossMargin') || 'Margine'}</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('matrixStatus') || 'Status'}</th>
                <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400 font-medium"><i className="fas fa-spinner fa-spin mr-2"></i>{t('calculatingLiveMargins') || 'Calcolo in corso...'}</td></tr>
              ) : menuItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <i className="fas fa-utensils text-4xl text-slate-300 mb-3 block"></i>
                    <p className="text-slate-500 font-medium">Nessun piatto nel menu. Clicca su "Nuovo Piatto" per iniziare.</p>
                  </td>
                </tr>
              ) : (
                menuItems.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => router.push(`/menus/${item.id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-5 font-bold text-slate-800">{item.dishName}</td>
                    <td className="px-6 py-5 text-sm text-slate-500">{item.category}</td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-700">€ {item.sellingPrice.toFixed(2)}</td>
                    <td className="px-6 py-5 text-sm font-black text-red-500">€ {item.productionCost.toFixed(2)}</td>
                    <td className="px-6 py-5 text-sm font-black text-emerald-600">€ {item.profitMargin.toFixed(2)}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${getStatusBadge(item.status)}`}>
                        {item.status === 'Star' && <i className="fas fa-star mr-1"></i>}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {/* Tasto Elimina che appare al passaggio del mouse */}
                      <button 
                        onClick={(e) => handleDelete(e, item.id)}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Elimina Piatto"
                      >
                        <i className="fas fa-trash"></i>
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