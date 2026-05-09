'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import RecipeBuilder from '@/components/RecipeBuilder';
import { getTranslation, DEFAULT_LOCALE } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DishBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const [isSaving, setIsSaving] = useState(false);
  const [existingData, setExistingData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!!editId);
  const [locale, setLocale] = useState<'en' | 'it' | 'fr' | 'de'>(DEFAULT_LOCALE);
  const t = (key: string) => getTranslation(locale, key);

  useEffect(() => {
    const stored = localStorage.getItem('locale');
    if (stored) setLocale(stored as any);
  }, []);

  useEffect(() => {
    if (!editId) return;
    const fetchDish = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_URL}/api/menus/${editId}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (res.ok) {
          const data = await res.json();
          console.log('Existing dish data:', JSON.stringify(data, null, 2));
          setExistingData(data);
        }
      } catch (error) {
        console.error('Error loading dish:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDish();
  }, [editId]);

  const handleSave = async (payload: any) => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        editId ? `${API_URL}/api/menus/${editId}` : `${API_URL}/api/menus`,
        {
          method: editId ? 'PUT' : 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );
      if (!res.ok) throw new Error('Save failed');
      router.push(editId ? `/menus/${editId}` : '/menus');
    } catch (error) {
      console.error('Save error:', error);
      alert(t('errorSaving'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <div className="p-8 text-center text-slate-400">
      <i className="fas fa-spinner fa-spin mr-2"></i> {t('loadingBuilder')}
    </div>
  );

  return (
    <RecipeBuilder
      mode="dish"
      existingData={existingData}
      onSave={handleSave}
      isSaving={isSaving}
    />
  );
}