'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/components/LanguageProvider';
import { supabase } from '@/lib/supabase';
import RecipeBuilder from '@/components/RecipeBuilder';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function NewPreparationPage() {
  const router = useRouter();
  const { t } = useTranslations();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (payload: any) => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}/api/preparations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Save failed');
      router.push('/preparations');
    } catch (error) {
      console.error('Save error:', error);
      alert(t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RecipeBuilder
      mode="preparation"
      onSave={handleSave}
      isSaving={isSaving}
    />
  );
}