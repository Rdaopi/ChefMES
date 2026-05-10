"use client";

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from '@/components/LanguageProvider';
import { supabase } from '@/lib/supabase';

interface HistoryEntry {
  recorded_at: string;
  production_cost: number;
  selling_price: number;
  profit_margin: number;
}

interface DishDetail {
  id: string;
  dishName: string;
  category: string;
  sellingPrice: number;
  totalCost: number;
  profitMargin: number;
  foodCostPercent: number;
  ingredients: { name: string; qty: number; unitCost: number; total: number }[];
  estimatedCosts?: { type: string; value: string; cost: number }[];
  history?: HistoryEntry[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function DishDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const [dish, setDish] = useState<DishDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslations();

  useEffect(() => {
    const fetchDishDetails = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${API_URL}/api/menus/${id}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        setDish(await response.json());
      } catch (error) {
        console.error("Error fetching dish:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchDishDetails();
  }, [id]);

  if (isLoading) {
    return (
      <main className="p-8 max-w-4xl mx-auto" aria-busy="true">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 bg-slate-200 rounded"></div>
          <div className="h-40 bg-slate-100 rounded-2xl w-full"></div>
          <div className="h-64 bg-slate-100 rounded-2xl w-full"></div>
        </div>
      </main>
    );
  }

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

  const history = dish.history || [];

  return (
    <main className="p-4 sm:p-8 max-w-4xl mx-auto">

      {/* NAVIGATION + EDIT BUTTON */}
      <div className="flex justify-between items-center mb-6">
        <Link
          href="/menus"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <i className="fas fa-arrow-left mr-2"></i>
          {t('backToMenuEngineering')}
        </Link>
        <button
          onClick={() => router.push(`/menus/builder?id=${dish.id}`)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center"
        >
          <i className="fas fa-edit mr-2"></i> Modifica Ricetta
        </button>
      </div>

      <article className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* HEADER */}
        <header className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{dish.dishName}</h1>
            <p className="text-slate-500 font-medium mt-1">{dish.category}</p>
          </div>
          {dish.foodCostPercent !== undefined && (
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Food Cost %</p>
              <p className={`text-2xl font-black ${dish.foodCostPercent > 35 ? 'text-red-500' : dish.foodCostPercent > 28 ? 'text-yellow-500' : 'text-emerald-600'}`}>
                {dish.foodCostPercent.toFixed(1)}%
              </p>
            </div>
          )}
        </header>

        {/* FINANCIAL SUMMARY */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-0 p-0 sm:p-6 bg-slate-50 border-b border-slate-100 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
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

        {/* INGREDIENTS TABLE */}
        <section className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-black text-slate-800 mb-4">{t('recipeBreakdown')}</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
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
                    <td className="py-4 px-4 text-right text-slate-600">€{ing.unitCost.toFixed(4)}</td>
                    <td className="py-4 px-4 text-right font-black text-slate-800">€{ing.total.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-sm font-black text-slate-600 uppercase tracking-wider">
                    Costo Totale Ingredienti
                  </td>
                  <td className="py-3 px-4 text-right font-black text-red-500">
                    € {dish.totalCost.toFixed(4)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* COST HISTORY */}
        {history.length > 0 && (
          <section className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-800 mb-4">
              Storico Margine
              <span className="ml-2 text-xs font-medium text-slate-400">({history.length} rilevazioni)</span>
            </h2>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    <th className="text-left py-3 px-4">Data</th>
                    <th className="text-right py-3 px-4">Prezzo Vendita</th>
                    <th className="text-right py-3 px-4">Costo Produzione</th>
                    <th className="text-right py-3 px-4">Margine %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {history.slice().reverse().map((entry, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(entry.recorded_at).toLocaleDateString('it-IT', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700">€ {Number(entry.selling_price).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-red-500">€ {Number(entry.production_cost).toFixed(4)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-black ${Number(entry.profit_margin) >= 70 ? 'text-emerald-600' : Number(entry.profit_margin) >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {Number(entry.profit_margin).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ESTIMATED COSTS */}
        {dish.estimatedCosts && dish.estimatedCosts.length > 0 && (
          <section className="p-6 bg-blue-50 border-t border-blue-100">
            <h2 className="text-sm font-black text-blue-900 uppercase tracking-wider mb-4">
              Costi Operativi Stimati
            </h2>
            <ul className="space-y-3">
              {dish.estimatedCosts.map((cost, i) => (
                <li key={i} className="flex justify-between items-center text-sm">
                  <span className="text-blue-800 font-medium">
                    <i className="fas fa-clock mr-2 text-blue-400"></i>
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

export default function DishDetailPage() {
  return (
    <Suspense fallback={
      <main className="p-8 max-w-4xl mx-auto" aria-busy="true">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 bg-slate-200 rounded"></div>
          <div className="h-40 bg-slate-100 rounded-2xl w-full"></div>
          <div className="h-64 bg-slate-100 rounded-2xl w-full"></div>
        </div>
      </main>
    }>
      <DishDetailContent />
    </Suspense>
  );
}