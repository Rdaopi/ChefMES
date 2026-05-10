'use client';
import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import RecipeBuilder from '@/components/RecipeBuilder';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function PreparationBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const [isSaving, setIsSaving] = useState(false);
  const [existingData, setExistingData] = useState(null);
  const [isLoading, setIsLoading] = useState(!!editId);

  useEffect(() => {
    if (!editId) return;
    const fetchPrep = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_URL}/api/preparations/${editId}`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        if (res.ok) setExistingData(await res.json());
      } catch (error) {
        console.error('Error loading preparation:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrep();
  }, [editId]);

  const handleSave = async (payload: any) => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        editId ? `${API_URL}/api/preparations/${editId}` : `${API_URL}/api/preparations`,
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
      router.push(editId ? `/preparations/${editId}` : '/preparations');
    } catch (error) {
      console.error('Save error:', error);
      alert('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <div className="p-8 text-center text-slate-400">
      <i className="fas fa-spinner fa-spin mr-2"></i> Caricamento...
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

export default function PreparationBuilderPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-slate-400">
        <i className="fas fa-spinner fa-spin mr-2"></i>
      </div>
    }>
      <PreparationBuilderContent />
    </Suspense>
  );
}