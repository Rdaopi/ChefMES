'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getTranslation, DEFAULT_LOCALE } from '@/lib/i18n';

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
  id: string;
  item_id: string;
  type: 'standard' | 'preparation';
  quantity_needed: number | string;
}

interface RecipeBuilderProps {
  mode: 'dish' | 'preparation';
  existingData?: any;
  onSave: (payload: any) => Promise<void>;
  isSaving: boolean;
}

export default function RecipeBuilder({ mode, existingData, onSave, isSaving }: RecipeBuilderProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [availableItems, setAvailableItems] = useState<IngredientOption[]>([]);
  const [locale, setLocale] = useState<'en' | 'it' | 'fr' | 'de'>(DEFAULT_LOCALE);
  const t = (key: string) => getTranslation(locale, key);

  useEffect(() => {
    const stored = localStorage.getItem('locale');
    if (stored) setLocale(stored as any);
  }, []);

  // Dish fields
  const [dishName, setDishName] = useState('');
  const [category, setCategory] = useState('Primi');
  const [sellingPrice, setSellingPrice] = useState<number | string>('');

  // Preparation fields
  const [yieldQuantity, setYieldQuantity] = useState<number | string>('');
  const [yieldUom, setYieldUom] = useState('KG');

  const [recipeItems, setRecipeItems] = useState<RecipeLine[]>([]);

  // Load available ingredients
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_URL}/api/builder/ingredients`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        const data = await res.json();
        const combined = [
          ...(data.ingredients || []).map((i: any) => ({ ...i, type: 'standard' as const })),
          // Only dishes can use preparations as ingredients
          ...(mode === 'dish'
            ? (data.preparations || []).map((p: any) => ({ ...p, type: 'preparation' as const }))
            : [])
        ];
        setAvailableItems(combined);
      } catch (error) {
        console.error('Error fetching ingredients:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIngredients();
  }, [mode]);

  // Pre-fill form when editing existing data
  useEffect(() => {
    if (!existingData) return;
    setDishName(existingData.name || '');
    if (mode === 'dish') {
      setCategory(existingData.category || 'Primi');
      setSellingPrice(existingData.sellingPrice || '');
    } else {
      setYieldQuantity(existingData.yieldQuantity || '');
      setYieldUom(existingData.yieldUom || 'KG');
    }
    setRecipeItems(
      (existingData.ingredients || []).map((ing: any) => ({
        id: `${Date.now()}-${Math.random()}`,
        item_id: ing.standard_id || ing.preparation_id || '',
        type: ing.standard_id ? 'standard' : 'preparation',
        quantity_needed: ing.quantity_needed
      }))
    );
  }, [existingData, mode]);

  const addRow = () => {
    setRecipeItems(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      item_id: '',
      type: 'standard',
      quantity_needed: ''
    }]);
  };

  const removeRow = (id: string) => {
    setRecipeItems(prev => prev.filter(item => item.id !== id));
  };

  const updateRow = (id: string, field: keyof RecipeLine, value: any) => {
    setRecipeItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (field === 'item_id') {
        const selected = availableItems.find(opt => opt.id === value);
        return { ...item, item_id: value, type: selected?.type || 'standard' };
      }
      return { ...item, [field]: value };
    }));
  };

  // Live cost preview
  const liveCost = recipeItems.reduce((sum, row) => {
    const option = availableItems.find(i => i.id === row.item_id);
    if (!option || !row.quantity_needed) return sum;
    return sum + Number(row.quantity_needed) * Number(option.current_price || 0);
  }, 0);

  const handleSave = async () => {
    if (!dishName.trim()) {
      alert(mode === 'dish' ? t('alertDishNameRequired') : t('alertPreparationNameRequired'));
      return;
    }
    if (mode === 'dish' && !sellingPrice) {
      alert(t('alertSellingPriceRequired'));
      return;
    }
    if (mode === 'preparation' && (!yieldQuantity || Number(yieldQuantity) <= 0)) {
      alert(t('alertYieldRequired'));
      return;
    }
    if (recipeItems.filter(r => r.item_id).length === 0) {
      alert(t('alertAtLeastOneIngredient'));
      return;
    }

    const payload = mode === 'dish'
      ? {
          name: dishName,
          category,
          sellingPrice: Number(sellingPrice),
          recipeItems: recipeItems
            .filter(r => r.item_id)
            .map(r => ({
              standard_id: r.type === 'standard' ? r.item_id : null,
              preparation_id: r.type === 'preparation' ? r.item_id : null,
              quantity_needed: Number(r.quantity_needed)
            }))
        }
      : {
          name: dishName,
          yieldQuantity: Number(yieldQuantity),
          yieldUom,
          ingredients: recipeItems
            .filter(r => r.item_id && r.type === 'standard')
            .map(r => ({
              standard_id: r.item_id,
              quantity_needed: Number(r.quantity_needed)
            }))
        };

    await onSave(payload);
  };

  if (isLoading) return (
    <div className="p-8 text-center text-slate-900">
      <i className="fas fa-spinner fa-spin mr-2"></i> {t('loadingBuilder')}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full p-8">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="text-slate-900 hover:text-slate-600 text-sm font-bold mb-2 flex items-center"
            >
              <i className="fas fa-arrow-left mr-2"></i> {t('back')}
            </button>
            <h1 className="text-3xl font-black text-slate-800 flex items-center">
              <i className={`fas ${mode === 'dish' ? 'fa-utensils' : 'fa-flask'} mr-3 text-indigo-500`}></i>
              {existingData
                ? (mode === 'dish' ? t('editDish') : t('editPreparation'))
                : (mode === 'dish' ? t('newDish') : t('newPreparationBuilder'))
              }
            </h1>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? t('savingEllipsis') : t('save')}
          </button>
        </div>

        {/* BASE DETAILS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">
            {t('baseDetails')}
          </h2>
          <div className="grid grid-cols-3 gap-6">

            <div className="col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {mode === 'dish' ? t('dishNameLabel') : t('preparationNameLabel')}
              </label>
              <input
                type="text"
                value={dishName}
                onChange={e => setDishName(e.target.value)}
                placeholder={mode === 'dish' ? t('dishNamePlaceholder') : t('preparationNamePlaceholder')}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {mode === 'dish' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t('category')}</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Antipasti">Antipasti</option>
                    <option value="Primi">Primi</option>
                    <option value="Secondi">Secondi</option>
                    <option value="Dessert">Dessert</option>
                    <option value="Bevande">Bevande</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t('sellingPriceLabel')}</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 font-bold text-emerald-600 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </>
            )}

            {mode === 'preparation' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t('yieldLabel')}</label>
                  <input
                    type="number"
                    value={yieldQuantity}
                    onChange={e => setYieldQuantity(e.target.value)}
                    placeholder="es. 3"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t('unitOfMeasureLabel')}</label>
                  <select
                    value={yieldUom}
                    onChange={e => setYieldUom(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="KG">KG</option>
                    <option value="L">L</option>
                    <option value="PZ">PZ</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RECIPE LINES */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              {mode === 'dish' ? t('recipeIngredientsLabel') : t('preparationIngredientsLabel')}
            </h2>
            <button
              type="button"
              onClick={addRow}
              className="text-indigo-600 font-bold hover:text-indigo-800 text-sm"
            >
              <i className="fas fa-plus mr-1"></i> {t('addIngredient')}
            </button>
          </div>

          <div className="space-y-3">
            {recipeItems.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-900">
                {t('noIngredientsAdded')}
              </div>
            ) : (
              recipeItems.map((item, index) => {
                const selected = availableItems.find(i => i.id === item.item_id);
                const uom = selected?.unit_of_measure || selected?.yield_uom || '--';
                const unitCost = Number(selected?.current_price || 0);
                const lineCost = item.quantity_needed ? Number(item.quantity_needed) * unitCost : 0;

                return (
                  <div key={item.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="w-8 text-center font-bold text-slate-900">{index + 1}</div>

                    <div className="flex-1">
                      <select
                        value={item.item_id}
                        onChange={e => updateRow(item.id, 'item_id', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 text-slate-900 font-medium"
                      >
                        <option value="">{t('selectIngredient')}</option>
                        <optgroup label={t('baseIngredientsGroup')}>
                          {availableItems.filter(i => i.type === 'standard').map(ing => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit_of_measure}) — €{Number(ing.current_price || 0).toFixed(4)}/{ing.unit_of_measure}
                            </option>
                          ))}
                        </optgroup>
                        {mode === 'dish' && availableItems.some(i => i.type === 'preparation') && (
                          <optgroup label={t('preparationsGroup')}>
                            {availableItems.filter(i => i.type === 'preparation').map(prep => (
                              <option key={prep.id} value={prep.id}>
                                [PREP] {prep.name} ({prep.yield_uom})
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    <div className="w-32">
                      <input
                        type="number"
                        placeholder={t('quantityPlaceholder')}
                        value={item.quantity_needed}
                        onChange={e => updateRow(item.id, 'quantity_needed', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 text-right text-slate-900"
                      />
                    </div>

                    <div className="w-12 text-sm font-bold text-slate-900 text-center">{uom}</div>

                    <div className="w-24 text-right">
                      <span className={`text-sm font-black ${lineCost > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {lineCost > 0 ? `€ ${lineCost.toFixed(3)}` : '—'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeRow(item.id)}
                      className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* COST SUMMARY */}
          {recipeItems.some(r => r.item_id) && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  {mode === 'dish' ? t('estimatedProductionCost') : `${t('estimatedTotalCost')} (${t('costPerUnit')} ${yieldQuantity || '?'} ${yieldUom})`}
                </span>
                <span className="text-2xl font-black text-slate-800">€ {liveCost.toFixed(3)}</span>
              </div>
              {mode === 'dish' && sellingPrice && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('estimatedMargin')}</span>
                  <span className={`text-xl font-black ${Number(sellingPrice) - liveCost > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    € {(Number(sellingPrice) - liveCost).toFixed(3)}
                  </span>
                </div>
              )}
              {mode === 'preparation' && yieldQuantity && Number(yieldQuantity) > 0 && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    {t('costPerUnit')} {yieldUom}
                  </span>
                  <span className="text-xl font-black text-indigo-600">
                    € {(liveCost / Number(yieldQuantity)).toFixed(4)} / {yieldUom}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}