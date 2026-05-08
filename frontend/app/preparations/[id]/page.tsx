'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getTranslation, DEFAULT_LOCALE } from '@/lib/i18n';
import RecipeBuilder from '@/components/RecipeBuilder';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function EditPreparationPage() {
  const router = useRouter();
  const { id } = useParams();
  const [existingData, setExistingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [locale, setLocale] = useState<'en' | 'fr' | 'it' | 'de'>(DEFAULT_LOCALE);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const storedLocale = localStorage.getItem('locale') as 'en' | 'fr' | 'it' | 'de' || DEFAULT_LOCALE;
      setLocale(storedLocale);
      const res = await window.fetch(`${API_URL}/api/preparations/${id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) setExistingData(await res.json());
      setIsLoading(false);
    };
    fetch();
  }, [id]);

  const handleSave = async (payload: any) => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await window.fetch(`${API_URL}/api/preparations/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Save failed');
      router.push(`/preparations/${id}`);
    } catch (error) {
      console.error('Save error:', error);
      alert(getTranslation(locale, 'saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <div className="p-8 text-center text-slate-400">
      <i className="fas fa-spinner fa-spin mr-2"></i> {getTranslation(locale, 'loading')}
    </div>
  );

  return (
    <RecipeBuilder
      mode="preparation"
      existingData={existingData}
      onSave={handleSave}
      isSaving={isSaving}
    />
  );
}