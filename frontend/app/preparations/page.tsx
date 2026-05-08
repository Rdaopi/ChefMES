'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/components/LanguageProvider';
import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Preparation {
  id: string;
  name: string;
  yieldQuantity: number;
  yieldUom: string;
  totalCost: number;
  costPerUnit: number;
  ingredientCount: number;
}

export default function PreparationsPage() {
  const router = useRouter();
  const { t } = useTranslations();
  const [preparations, setPreparations] = useState<Preparation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPreparations = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/api/preparations`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setPreparations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching preparations:', err);
      setPreparations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPreparations(); }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm(t('confirmDeletePreparation'))) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/api/preparations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (res.ok) {
        setPreparations(prev => prev.filter(p => p.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || t('deleteError'));
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 p-8 overflow-y-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            <i className="fas fa-flask mr-2 text-indigo-500"></i>
            {t('preparations')}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {t('preparationDescription')}
          </p>
        </div>
        <button
          onClick={() => router.push('/preparations/builder')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center"
        >
          <i className="fas fa-plus mr-2"></i> {t('newPreparation')}
        </button>
      </header>

      <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('name')}</th>
              <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('yield')}</th>
              <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('ingredientCount')}</th>
              <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('totalCost')}</th>
              <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">{t('costPerUnit')}</th>
              <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-wider">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  <i className="fas fa-spinner fa-spin mr-2"></i> {t('loading')}
                </td>
              </tr>
            ) : preparations.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <i className="fas fa-flask text-4xl text-slate-300 mb-3 block"></i>
                  <p className="text-slate-500 font-medium">{t('noPreparationsInfo')}</p>
                </td>
              </tr>
            ) : (
              preparations.map(prep => (
                <tr
                  key={prep.id}
                  onClick={() => router.push(`/preparations/${prep.id}`)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 font-bold text-slate-800">{prep.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {prep.yieldQuantity} {prep.yieldUom}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{prep.ingredientCount}</td>
                  <td className="px-6 py-4 text-sm font-bold text-red-500">
                    € {prep.totalCost.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-indigo-600">
                    € {prep.costPerUnit.toFixed(4)} / {prep.yieldUom}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={e => handleDelete(e, prep.id)}
                      className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title={t('deletePreparation')}
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
  );
}