'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PrepIngredient {
  id: string;
  standard_id: string;
  name: string;
  uom: string;
  quantity_needed: number;
  unitCost: number;
  total: number;
}

interface PreparationDetail {
  id: string;
  name: string;
  yieldQuantity: number;
  yieldUom: string;
  totalCost: number;
  costPerUnit: number;
  ingredients: PrepIngredient[];
}

export default function PreparationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [prep, setPrep] = useState<PreparationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrep = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_URL}/api/preparations/${id}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        setPrep(await res.json());
      } catch (error) {
        console.error('Error fetching preparation:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchPrep();
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

  if (!prep) {
    return (
      <main className="p-8 max-w-4xl mx-auto text-center" role="alert">
        <div className="inline-flex items-center justify-center p-6 bg-red-50 text-red-600 rounded-xl">
          <i className="fas fa-exclamation-circle mr-3 text-xl"></i>
          <span className="font-medium">Preparazione non trovata</span>
        </div>
        <div className="mt-6">
          <Link href="/preparations" className="text-blue-600 hover:underline">
            Torna alle Preparazioni
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-8 max-w-4xl mx-auto">

      {/* NAVIGATION + EDIT BUTTON */}
      <div className="flex justify-between items-center mb-6">
        <Link
          href="/preparations"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Torna alle Preparazioni
        </Link>
        <button
          type="button"
          onClick={() => router.push(`/preparations/builder?id=${prep.id}`)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center"
        >
          <i className="fas fa-edit mr-2"></i> Modifica Preparazione
        </button>
      </div>

      <article className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* HEADER */}
        <header className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center">
              <i className="fas fa-flask mr-3 text-indigo-500"></i>
              {prep.name}
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Resa: <span className="font-bold text-slate-700">{prep.yieldQuantity} {prep.yieldUom}</span>
            </p>
          </div>
        </header>

        {/* SUMMARY CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-0 p-0 sm:p-6 bg-slate-50 border-b border-slate-100 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="text-center p-4 sm:p-0">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Costo Totale</p>
            <p className="text-2xl font-black text-red-600">€ {prep.totalCost.toFixed(3)}</p>
          </div>
          <div className="text-center p-4 sm:p-0">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Costo per {prep.yieldUom}</p>
            <p className="text-2xl font-black text-indigo-600">€ {prep.costPerUnit.toFixed(4)}</p>
          </div>
          <div className="text-center p-4 sm:p-0">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">N. Ingredienti</p>
            <p className="text-2xl font-black text-slate-800">{prep.ingredients.length}</p>
          </div>
        </section>

        {/* INGREDIENTS TABLE */}
        <section className="p-6">
          <h2 className="text-lg font-black text-slate-800 mb-4">Ingredienti</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="text-left py-3 px-4">Ingrediente</th>
                  <th scope="col" className="text-left py-3 px-4">UOM</th>
                  <th scope="col" className="text-right py-3 px-4">Quantità</th>
                  <th scope="col" className="text-right py-3 px-4">Costo Unit.</th>
                  <th scope="col" className="text-right py-3 px-4">Totale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {prep.ingredients.map((ing, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-800">{ing.name}</td>
                    <td className="py-4 px-4 text-slate-500">{ing.uom}</td>
                    <td className="py-4 px-4 text-right font-mono text-slate-700">{ing.quantity_needed}</td>
                    <td className="py-4 px-4 text-right text-slate-500">€ {ing.unitCost.toFixed(4)}</td>
                    <td className="py-4 px-4 text-right font-black text-slate-800">€ {ing.total.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-sm font-black text-slate-600 uppercase tracking-wider">
                    Costo Totale Preparazione
                  </td>
                  <td className="py-3 px-4 text-right font-black text-red-500 text-lg">
                    € {prep.totalCost.toFixed(3)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

      </article>
    </main>
  );
}