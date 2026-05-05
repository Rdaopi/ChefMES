'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/components/LanguageProvider';
import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface IngredientOption {
  id: string;
  name: string;
  unit_of_measure?: string;
  yield_uom?: string;
  current_price?: number;
  type: 'standard' | 'preparation';
}

interface RecipeLine {
  id: string; // id temporaneo per l'interfaccia
  item_id: string;
  type: 'standard' | 'preparation';
  quantity_needed: number | string;
}

export default function RecipeBuilderPage() {
  const router = useRouter();
  const { t } = useTranslations();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Opzioni dal database
  const [availableItems, setAvailableItems] = useState<IngredientOption[]>([]);

  // Stato del form
  const [dishName, setDishName] = useState('');
  const [category, setCategory] = useState('Primi');
  const [sellingPrice, setSellingPrice] = useState<number | string>('');
  
  // Linee della ricetta
  const [recipeItems, setRecipeItems] = useState<RecipeLine[]>([]);

  // 1. Carica gli ingredienti disponibili al montaggio
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${API_URL}/api/builder/ingredients`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        const data = await response.json();
        
        // Combina ingredienti standard e semilavorati in un'unica lista
        const combined = [
          ...(data.ingredients || []).map((i: any) => ({ ...i, type: 'standard' })),
          ...(data.preparations || []).map((p: any) => ({ ...p, type: 'preparation' }))
        ];
        
        setAvailableItems(combined);
      } catch (error) {
        console.error("Error fetching available items:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIngredients();
  }, []);

  // 2. Aggiungi riga vuota
  const addRow = () => {
    setRecipeItems([...recipeItems, { id: Date.now().toString(), item_id: '', type: 'standard', quantity_needed: '' }]);
  };

  // 3. Rimuovi riga
  const removeRow = (id: string) => {
    setRecipeItems(recipeItems.filter(item => item.id !== id));
  };

  // 4. Aggiorna riga
  const updateRow = (id: string, field: keyof RecipeLine, value: any) => {
    setRecipeItems(recipeItems.map(item => {
      if (item.id === id) {
        // Se cambiamo l'item, dobbiamo anche capire se è uno standard o una prep
        if (field === 'item_id') {
          const selectedOption = availableItems.find(opt => opt.id === value);
          return { ...item, item_id: value, type: selectedOption?.type || 'standard' };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // 5. Salva la Ricetta
  const handleSave = async () => {
    if (!dishName || !sellingPrice || recipeItems.length === 0) {
      alert("Inserisci nome, prezzo e almeno un ingrediente!");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Formatta per il backend
      const formattedLines = recipeItems.filter(r => r.item_id).map(r => ({
        standard_id: r.type === 'standard' ? r.item_id : null,
        preparation_id: r.type === 'preparation' ? r.item_id : null,
        quantity_needed: Number(r.quantity_needed)
      }));

      const payload = {
        name: dishName,
        category,
        sellingPrice: Number(sellingPrice),
        recipeItems: formattedLines
      };

      const response = await fetch(`${API_URL}/api/menus`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Errore durante il salvataggio");
      
      // Se salvato con successo, torna alla lista dei menu
      router.push('/menus');
      
    } catch (error) {
      console.error("Save error:", error);
      alert("Errore durante il salvataggio");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-400">Caricamento builder...</div>;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 flex items-center">
            <i className="fas fa-utensils mr-3 text-indigo-500"></i>
            Nuovo Piatto
          </h1>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? 'Salvataggio...' : 'Salva Piatto'}
          </button>
        </div>

        {/* DETTAGLI BASE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Dettagli Base</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Nome Piatto *</label>
              <input 
                type="text" 
                value={dishName}
                onChange={e => setDishName(e.target.value)}
                placeholder="es. Spaghetti alla Carbonara"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Categoria</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Antipasti">Antipasti</option>
                <option value="Primi">Primi</option>
                <option value="Secondi">Secondi</option>
                <option value="Dessert">Dessert</option>
                <option value="Bevande">Bevande</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Prezzo di Vendita (€) *</label>
              <input 
                type="number" 
                value={sellingPrice}
                onChange={e => setSellingPrice(e.target.value)}
                placeholder="0.00"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 font-bold text-emerald-600 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* DISTINTA BASE (RICETTA) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Ingredienti della Ricetta</h2>
            <button onClick={addRow} className="text-indigo-600 font-bold hover:text-indigo-800 text-sm">
              <i className="fas fa-plus mr-1"></i> Aggiungi Ingrediente
            </button>
          </div>

          <div className="space-y-3">
            {recipeItems.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
                Nessun ingrediente inserito. Clicca su "Aggiungi Ingrediente" per iniziare.
              </div>
            ) : (
              recipeItems.map((item, index) => (
                <div key={item.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="w-8 text-center font-bold text-slate-400">{index + 1}</div>
                  
                  {/* Selezione Ingrediente */}
                  <div className="flex-1">
                    <select 
                      value={item.item_id}
                      onChange={(e) => updateRow(item.id, 'item_id', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 font-medium"
                    >
                      <option value="">-- Seleziona ingrediente --</option>
                      <optgroup label="Ingredienti Base">
                        {availableItems.filter(i => i.type === 'standard').map(ing => (
                          <option key={ing.id} value={ing.id}>{ing.name} (Acquistato in {ing.unit_of_measure})</option>
                        ))}
                      </optgroup>
                      <optgroup label="Semilavorati (Preparazioni)">
                        {availableItems.filter(i => i.type === 'preparation').map(prep => (
                          <option key={prep.id} value={prep.id}>[PREP] {prep.name} ({prep.yield_uom})</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Quantità */}
                  <div className="w-32">
                    <input 
                      type="number" 
                      placeholder="Quantità"
                      value={item.quantity_needed}
                      onChange={(e) => updateRow(item.id, 'quantity_needed', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2 text-right"
                    />
                  </div>

                  {/* Unità di misura indicativa */}
                  <div className="w-16 text-sm font-bold text-slate-400">
                    {availableItems.find(i => i.id === item.item_id)?.unit_of_measure || 
                     availableItems.find(i => i.id === item.item_id)?.yield_uom || 
                     '--'}
                  </div>

                  {/* Elimina */}
                  <button onClick={() => removeRow(item.id)} className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}