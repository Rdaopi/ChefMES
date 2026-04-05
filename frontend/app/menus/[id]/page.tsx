"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from '@/components/LanguageProvider';

export default function DishDetailPage() {
  const { id } = useParams();
  const [dish, setDish] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslations();

  useEffect(() => {
    const fetchDishDetails = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/menus/${id}`);
        if (!response.ok) throw new Error('Dish not found');
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

  if (isLoading) return <div className="p-8 text-slate-500 font-medium"><i className="fas fa-spinner fa-spin mr-2"></i>{t('loadingRecipeData')}</div>;
  if (!dish) return <div className="p-8 text-red-500">{t('noDataAvailable')}</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/menus" className="text-blue-600 hover:text-blue-800 font-medium mb-6 inline-block transition-colors">
        <i className="fas fa-arrow-left mr-2"></i>{t('backToMenuEngineering')}
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h1 className="text-3xl font-black text-slate-900">{dish.dishName}</h1>
          <p className="text-slate-500 font-medium mt-1">{dish.category}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 p-6 bg-slate-50 border-b border-slate-100">
          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">{t('sellingPrice')}</p>
            <p className="text-2xl font-black text-slate-800">€{dish.sellingPrice.toFixed(2)}</p>
          </div>
          <div className="text-center border-x border-slate-200">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">{t('totalCost')}</p>
            <p className="text-2xl font-black text-red-500">€{dish.totalCost.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">{t('grossMargin')}</p>
            <p className="text-2xl font-black text-emerald-600">€{dish.profitMargin.toFixed(2)}</p>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-black text-slate-800 mb-4">{t('recipeBreakdown')}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-200">
                  <th className="text-left pb-3">{t('ingredient')}</th>
                  <th className="text-right pb-3">{t('qty')}</th>
                  <th className="text-right pb-3">{t('costPerUnit')}</th>
                  <th className="text-right pb-3">{t('totalCost')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dish.ingredients?.map((ing: { name: string; qty: number; unitCost: number; total: number }, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-bold text-slate-700">{ing.name}</td>
                    <td className="py-4 text-right text-sm text-slate-500">{ing.qty}</td>
                    <td className="py-4 text-right text-sm text-slate-500">€{ing.unitCost.toFixed(2)}</td>
                    <td className="py-4 text-right text-sm font-black text-slate-800">€{ing.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {dish.estimatedCosts && (
          <div className="p-6 bg-blue-50/50 border-t border-blue-100">
            <h2 className="text-sm font-black text-blue-900 uppercase tracking-wider mb-4">Estimated Operating Costs</h2>
            <div className="space-y-3">
              {dish.estimatedCosts.map((cost: { type: string; value: string; cost: number }, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-blue-800 font-medium"><i className="fas fa-clock mr-2 text-blue-400"></i>{cost.type} ({cost.value})</span>
                  <span className="font-black text-blue-900">€{cost.cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}