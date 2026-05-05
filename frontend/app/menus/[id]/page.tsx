"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from '@/components/LanguageProvider';
import { supabase } from '@/lib/supabase';

interface DishDetail {
  id: string;
  dishName: string;
  category: string;
  sellingPrice: number;
  totalCost: number;
  profitMargin: number;
  ingredients: { name: string; qty: number; unitCost: number; total: number }[];
  estimatedCosts?: { type: string; value: string; cost: number }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DishDetailPage() {
  const { id } = useParams();
  const [dish, setDish] = useState<DishDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslations();

  useEffect(() => {
    const fetchDishDetails = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch(`${API_URL}/api/menus/${id}`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Dish not found (Status: ${response.status})`);
        }
        
        const data = await response.json();
        setDish(data);
      } catch (error) {
        console.error("Error fetching dish:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchDishDetails();
  }, [id]);

  // Stato di caricamento accessibile
  if (isLoading) {
    return (
      <main className="p-8 max-w-4xl mx-auto" aria-busy="true" aria-live="polite">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 bg-slate-200 rounded"></div>
          <div className="h-40 bg-slate-100 rounded-2xl w-full"></div>
          <div className="h-64 bg-slate-100 rounded-2xl w-full"></div>
        </div>
        <span className="sr-only">{t('loadingRecipeData')}</span>
      </main>
    );
  }

  // Stato di errore o dato mancante
  if (!dish) {
    return (
      <main className="p-8 max-w-4xl mx-auto text-center" role="alert">
        <div className="inline-flex items-center justify-center p-6 bg-red-50 text-red-600 rounded-xl">
          <i className="fas fa-exclamation-circle mr-3 text-xl"></i>
          <span className="font-medium">{t('noDataAvailable')}</span>
        </div>
        <div className="mt-6">
          <Link href="/menus" className="text-blue-600 hover:underline">
            {t('backToMenuEngineering')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-8 max-w-4xl mx-auto">
      {/* Navigazione */}
      <nav aria-label="Breadcrumb">
        <Link 
          href="/menus" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium mb-6 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 px-2 py-1 -ml-2"
        >
          <i className="fas fa-arrow-left mr-2" aria-hidden="true"></i>
          {t('backToMenuEngineering')}
        </Link>
      </nav>

      <article className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Intestazione Piatto */}
        <header className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">{dish.dishName}</h1>
          <p className="text-slate-500 font-medium mt-1">{dish.category}</p>
        </header>

        {/* Sommario Finanziario */}
        <section aria-label="Financial Summary" className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-4 p-0 sm:p-6 bg-slate-50 border-b border-slate-100 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="text-center p-4 sm:p-0">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">{t('sellingPrice')}</p>
            <p className="text-2xl font-black text-slate-800">€{dish.sellingPrice.toFixed(2)}</p>
          </div>
          <div className="text-center p-4 sm:p-0">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">{t('totalCost')}</p>
            <p className="text-2xl font-black text-red-600">€{dish.totalCost.toFixed(2)}</p>
          </div>
          <div className="text-center p-4 sm:p-0">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">{t('grossMargin')}</p>
            <p className="text-2xl font-black text-emerald-600">€{dish.profitMargin.toFixed(2)}</p>
          </div>
        </section>

        {/* Tabella Ingredienti */}
        <section className="p-6">
          <h2 className="text-lg font-black text-slate-800 mb-4">{t('recipeBreakdown')}</h2>
          
          <div 
            className="overflow-x-auto rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500"
            tabIndex={0} 
            role="region" 
            aria-label="Ingredients table"
          >
            <table className="min-w-full divide-y divide-slate-200 text-sm sm:text-base">
              <thead className="bg-slate-50">
                <tr className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="text-left py-3 px-4">{t('ingredient')}</th>
                  <th scope="col" className="text-right py-3 px-4">{t('qty')}</th>
                  <th scope="col" className="text-right py-3 px-4">{t('costPerUnit')}</th>
                  <th scope="col" className="text-right py-3 px-4">{t('totalCost')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dish.ingredients?.map((ing, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-800">{ing.name}</td>
                    <td className="py-4 px-4 text-right text-slate-600">{ing.qty}</td>
                    <td className="py-4 px-4 text-right text-slate-600">€{ing.unitCost.toFixed(2)}</td>
                    <td className="py-4 px-4 text-right font-black text-slate-800">€{ing.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Costi Stimati (Se presenti) */}
        {dish.estimatedCosts && dish.estimatedCosts.length > 0 && (
          <section className="p-6 bg-blue-50 border-t border-blue-100" aria-label="Estimated Operating Costs">
            <h2 className="text-sm font-black text-blue-900 uppercase tracking-wider mb-4">Estimated Operating Costs</h2>
            <ul className="space-y-3">
              {dish.estimatedCosts.map((cost, i) => (
                <li key={i} className="flex flex-wrap sm:flex-nowrap justify-between items-center text-sm">
                  <span className="text-blue-800 font-medium mb-1 sm:mb-0">
                    <i className="fas fa-clock mr-2 text-blue-400" aria-hidden="true"></i>
                    {cost.type} <span className="text-blue-600/80">({cost.value})</span>
                  </span>
                  <span className="font-black text-blue-900">€{cost.cost.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </main>
  );
}