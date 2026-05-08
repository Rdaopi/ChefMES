import { Response } from 'express';
import { supabase } from '../config/supabase.js';

// Helper: compute cost per yield unit for a preparation
function computePrepCostPerUnit(prepIngredients: any[], yieldQuantity: number): number {
  const totalCost = prepIngredients.reduce((sum: number, pi: any) => {
    // If ingredient is itself a preparation
    if (pi.preparation_id && pi.preparations) {
      const nestedCostPerUnit = computePrepCostPerUnit(
        pi.preparations.preparation_ingredients || [],
        pi.preparations.yield_quantity
      );
      return sum + Number(pi.quantity_needed) * nestedCostPerUnit;
    }
    // Standard ingredient
    return sum + Number(pi.quantity_needed) * Number(pi.standard_ingredients?.current_price || 0);
  }, 0);

  return yieldQuantity > 0 ? totalCost / yieldQuantity : 0;
}

// 1. List all preparations with computed cost per yield unit
export const getPreparations = async (req: any, res: Response) => {
  const userId = req.user?.id;

  try {
    const { data: preparations, error } = await supabase
      .from('preparations')
      .select(`
        id,
        name,
        yield_quantity,
        yield_uom,
        created_at,
        preparation_ingredients!prep_ingredients_prep_fkey (
          id,
          quantity_needed,
          standard_id,
          standard_ingredients (
            name,
            current_price,
            unit_of_measure
          )
        )
      `)
      .eq('user_id', userId)
      .order('name');

    if (error) throw error;

    const result = (preparations || []).map((prep: any) => {
      const totalCost = (prep.preparation_ingredients || []).reduce(
        (sum: number, pi: any) =>
          sum + Number(pi.quantity_needed) * Number(pi.standard_ingredients?.current_price || 0),
        0
      );
      const costPerUnit = prep.yield_quantity > 0 ? totalCost / prep.yield_quantity : 0;

      return {
        id: prep.id,
        name: prep.name,
        yieldQuantity: Number(prep.yield_quantity),
        yieldUom: prep.yield_uom,
        totalCost: parseFloat(totalCost.toFixed(4)),
        costPerUnit: parseFloat(costPerUnit.toFixed(4)),
        ingredientCount: (prep.preparation_ingredients || []).length,
        createdAt: prep.created_at
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching preparations:', error);
    res.status(500).json({ error: 'Failed to fetch preparations' });
  }
};

// 2. Single preparation detail with full ingredient breakdown
export const getPreparationById = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const prepId = req.params.id;

  try {
    const { data: prep, error } = await supabase
      .from('preparations')
      .select(`
        id,
        name,
        yield_quantity,
        yield_uom,
        preparation_ingredients (
          id,
          quantity_needed,
          standard_id,
          standard_ingredients (
            name,
            current_price,
            unit_of_measure
          )
        )
      `)
      .eq('id', prepId)
      .eq('user_id', userId)
      .single();

    if (error || !prep) {
      return res.status(404).json({ error: 'Preparation not found' });
    }

    let totalCost = 0;

    const ingredients = (prep.preparation_ingredients || []).map((pi: any) => {
      const qty = Number(pi.quantity_needed);
      const unitCost = Number(pi.standard_ingredients?.current_price || 0);
      const total = qty * unitCost;
      totalCost += total;

      return {
        id: pi.id,
        standard_id: pi.standard_id,
        name: pi.standard_ingredients?.name || 'Sconosciuto',
        uom: pi.standard_ingredients?.unit_of_measure || 'PZ',
        quantity_needed: qty,
        unitCost: parseFloat(unitCost.toFixed(4)),
        total: parseFloat(total.toFixed(4))
      };
    });

    const yieldQuantity = Number(prep.yield_quantity);
    const costPerUnit = yieldQuantity > 0 ? totalCost / yieldQuantity : 0;

    res.json({
      id: prep.id,
      name: prep.name,
      yieldQuantity,
      yieldUom: prep.yield_uom,
      totalCost: parseFloat(totalCost.toFixed(4)),
      costPerUnit: parseFloat(costPerUnit.toFixed(4)),
      ingredients
    });
  } catch (error) {
    console.error('Error fetching preparation:', error);
    res.status(500).json({ error: 'Failed to fetch preparation' });
  }
};

// 3. Create or update a preparation
export const savePreparation = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const prepId = req.params.id; // Only present on PUT
  const { name, yieldQuantity, yieldUom, ingredients } = req.body;
  // ingredients: [{ standard_id: "...", quantity_needed: 0.5 }]

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!yieldQuantity || Number(yieldQuantity) <= 0) {
    return res.status(400).json({ error: 'Yield quantity must be greater than 0' });
  }
  if (!ingredients?.length) {
    return res.status(400).json({ error: 'At least one ingredient is required' });
  }

  try {
    let currentPrepId = prepId;

    // Save or update preparation header
    if (currentPrepId) {
      const { error: updateErr } = await supabase
        .from('preparations')
        .update({ name, yield_quantity: yieldQuantity, yield_uom: yieldUom })
        .eq('id', currentPrepId)
        .eq('user_id', userId);
      if (updateErr) throw updateErr;
    } else {
      const { data: newPrep, error: insertErr } = await supabase
        .from('preparations')
        .insert({ user_id: userId, name, yield_quantity: yieldQuantity, yield_uom: yieldUom })
        .select('id')
        .single();
      if (insertErr) throw insertErr;
      currentPrepId = newPrep.id;
    }

    // Replace ingredient lines
    await supabase
      .from('preparation_ingredients')
      .delete()
      .eq('preparation_id', currentPrepId);

    const ingredientRows = ingredients.map((item: any) => ({
      preparation_id: currentPrepId,
      standard_id: item.standard_id,
      quantity_needed: item.quantity_needed
    }));

    const { error: ingErr } = await supabase
      .from('preparation_ingredients')
      .insert(ingredientRows);

    if (ingErr) throw ingErr;

    res.json({
      success: true,
      prepId: currentPrepId,
      message: prepId ? 'Preparation updated successfully' : 'Preparation created successfully'
    });
  } catch (error) {
    console.error('Error saving preparation:', error);
    res.status(500).json({ error: 'Failed to save preparation' });
  }
};

// 4. Delete a preparation
// Note: will fail if preparation is used in any recipe — handle this gracefully
export const deletePreparation = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const prepId = req.params.id;

  try {
    // Check if this preparation is used in any recipe
    const { data: usages } = await supabase
      .from('recipes')
      .select('id, dish_id')
      .eq('preparation_id', prepId);

    if (usages && usages.length > 0) {
      return res.status(409).json({
        error: `This preparation is used in ${usages.length} dish(es). Remove it from those recipes before deleting.`
      });
    }

    // Safe to delete — remove ingredients first, then the preparation
    await supabase
      .from('preparation_ingredients')
      .delete()
      .eq('preparation_id', prepId);

    const { error } = await supabase
      .from('preparations')
      .delete()
      .eq('id', prepId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true, message: 'Preparation deleted successfully' });
  } catch (error) {
    console.error('Error deleting preparation:', error);
    res.status(500).json({ error: 'Failed to delete preparation' });
  }
};