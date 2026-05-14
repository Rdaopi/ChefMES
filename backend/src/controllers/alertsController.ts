import { Response } from 'express';
import { supabase } from '../config/supabase.js';

function computeProductionCost(recipes: any[]): number {
  return recipes.reduce((sum: number, r: any) => {
    if (r.preparations) {
      const prepCost = (r.preparations.preparation_ingredients || [])
        .reduce((s: number, pi: any) =>
          s + Number(pi.quantity_needed) * Number(pi.standard_ingredients?.current_price || 0), 0
        );
      const costPerUnit = r.preparations.yield_quantity > 0
        ? prepCost / r.preparations.yield_quantity
        : 0;
      return sum + Number(r.quantity_needed) * costPerUnit;
    }
    return sum + Number(r.quantity_needed) * Number(r.standard_ingredients?.current_price || 0);
  }, 0);
}

function suggestedPrice(productionCost: number, targetMargin: number, targetFoodCost: number): number {
  const forMargin = productionCost / (1 - targetMargin / 100);
  const forFoodCost = productionCost / (targetFoodCost / 100);
  const raw = Math.max(forMargin, forFoodCost);
  return Math.ceil(raw * 2) / 2;
}

export const getAlerts = async (req: any, res: Response) => {
  const userId = req.user?.id;

  try {
    // 1. Fetch user settings
    const { data: settingsRow } = await supabase
      .from('user_settings')
      .select('target_margin_percent, target_food_cost_percent, dismissed_alert_ids')
      .eq('user_id', userId)
      .single();

    const targetMargin: number = settingsRow?.target_margin_percent ?? 65;
    const targetFoodCost: number = settingsRow?.target_food_cost_percent ?? 30;
    const dismissed: string[] = settingsRow?.dismissed_alert_ids ?? [];

    // 2. Fetch all dishes
    const { data: dishes, error: dishErr } = await supabase
      .from('menu_dishes')
      .select('id, name, selling_price')
      .eq('user_id', userId);

    if (dishErr) throw dishErr;
    if (!dishes || dishes.length === 0) return res.json([]);

    // 3. Fetch recipes with ingredient prices
    const { data: recipes, error: recipeErr } = await supabase
      .from('recipes')
      .select(`
        dish_id,
        quantity_needed,
        standard_id,
        standard_ingredients ( name, current_price, unit_of_measure ),
        preparations (
          yield_quantity,
          preparation_ingredients!prep_ingredients_prep_fkey (
            quantity_needed,
            standard_ingredients ( current_price )
          )
        )
      `)
      .eq('user_id', userId);

    if (recipeErr) throw recipeErr;

    const alerts: any[] = [];

    for (const dish of dishes) {
      const dishRecipes = (recipes || []).filter((r: any) => r.dish_id === dish.id);
      if (dishRecipes.length === 0) continue;

      const productionCost = computeProductionCost(dishRecipes);
      const sellingPrice = Number(dish.selling_price) || 0;
      if (sellingPrice <= 0 || productionCost <= 0) continue;

      const marginPct = ((sellingPrice - productionCost) / sellingPrice) * 100;
      const foodCostPct = (productionCost / sellingPrice) * 100;

      // Find most expensive direct ingredient (for cost driver label)
      let maxCost = 0;
      let mainDriver = '';
      for (const r of dishRecipes) {
        if (!r.preparations && r.standard_ingredients) {
          const lineCost = Number(r.quantity_needed) * Number(r.standard_ingredients.current_price || 0);
          if (lineCost > maxCost) {
            maxCost = lineCost;
            const uom = r.standard_ingredients.unit_of_measure || '';
            const price = Number(r.standard_ingredients.current_price || 0);
            mainDriver = `${r.standard_ingredients.name} (€${price.toFixed(2)}/${uom})`;
          }
        }
      }

      const recommended = suggestedPrice(productionCost, targetMargin, targetFoodCost);

      // Type 1: margin below target (critical if margin < 0.5 * target, else warning)
      if (marginPct < targetMargin) {
        const alertId = `${dish.id}_margin`;
        if (!dismissed.includes(alertId)) {
          alerts.push({
            id: alertId,
            type: 'margin',
            severity: marginPct < targetMargin * 0.5 ? 'critical' : 'warning',
            dishId: dish.id,
            dishName: dish.name,
            sellingPrice,
            productionCost: parseFloat(productionCost.toFixed(4)),
            currentMetric: parseFloat(marginPct.toFixed(1)),
            targetMetric: targetMargin,
            suggestedPrice: recommended,
            mainCostDriver: mainDriver || null,
          });
        }
      }

      // Type 2: food cost over target (only emit if margin alert not already firing for same dish,
      // or if food cost is the dominant breach — emit both independently since they're distinct actions)
      if (foodCostPct > targetFoodCost) {
        const alertId = `${dish.id}_foodcost`;
        if (!dismissed.includes(alertId)) {
          alerts.push({
            id: alertId,
            type: 'foodcost',
            severity: 'warning',
            dishId: dish.id,
            dishName: dish.name,
            sellingPrice,
            productionCost: parseFloat(productionCost.toFixed(4)),
            currentMetric: parseFloat(foodCostPct.toFixed(1)),
            targetMetric: targetFoodCost,
            suggestedPrice: recommended,
            mainCostDriver: mainDriver || null,
          });
        }
      }
    }

    // 3. Type 3: price spike alerts from terminal data (ingredient_price_history view)
    // Only fires when there is more than one invoice entry for the same ingredient
    const { data: terminalRows } = await supabase
      .from('ingredient_price_history')
      .select('standard_id, ingredient_name, invoice_date, unit_price')
      .eq('user_id', userId)
      .order('invoice_date', { ascending: true });

    if (terminalRows && terminalRows.length > 0) {
      // Group by standard_id
      const byIngredient = new Map<string, any[]>();
      for (const row of terminalRows) {
        if (!byIngredient.has(row.standard_id)) byIngredient.set(row.standard_id, []);
        byIngredient.get(row.standard_id)!.push(row);
      }

      for (const [stdId, rows] of byIngredient.entries()) {
        if (rows.length < 2) continue;
        const firstPrice = Number(rows[0].unit_price);
        const lastPrice = Number(rows[rows.length - 1].unit_price);
        if (firstPrice <= 0) continue;
        const changePct = ((lastPrice - firstPrice) / firstPrice) * 100;
        if (changePct < 10) continue; // only spike if >= 10% increase

        const alertId = `${stdId}_spike`;
        if (dismissed.includes(alertId)) continue;

        // Find dishes affected by this ingredient
        const affectedDishes = dishes
          .filter(d => (recipes || []).some((r: any) =>
            r.dish_id === d.id && r.standard_id === stdId
          ))
          .map((d: any) => d.name);

        alerts.push({
          id: alertId,
          type: 'price_spike',
          severity: 'warning',
          affectedIngredient: rows[0].ingredient_name,
          priceChangePercent: parseFloat(changePct.toFixed(1)),
          currentMetric: parseFloat(changePct.toFixed(1)),
          targetMetric: 10,
          affectedDishes,
        });
      }
    }

    // Sort: critical first, then warning
    alerts.sort((a, b) => {
      if (a.severity === b.severity) return 0;
      return a.severity === 'critical' ? -1 : 1;
    });

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

export const applyPrice = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { dishId, newPrice } = req.body;

  if (!dishId || newPrice == null) {
    return res.status(400).json({ error: 'dishId and newPrice are required' });
  }

  try {
    // Fetch current dish to get name/category for saveDishRecipe-style update
    const { data: dish, error: dishErr } = await supabase
      .from('menu_dishes')
      .select('id, name, category')
      .eq('id', dishId)
      .eq('user_id', userId)
      .single();

    if (dishErr || !dish) return res.status(404).json({ error: 'Dish not found' });

    // Update selling price
    const { error: updateErr } = await supabase
      .from('menu_dishes')
      .update({ selling_price: newPrice })
      .eq('id', dishId)
      .eq('user_id', userId);

    if (updateErr) throw updateErr;

    // Fetch recipes to compute production cost for history log
    const { data: recipes } = await supabase
      .from('recipes')
      .select(`
        quantity_needed,
        standard_ingredients ( current_price ),
        preparations (
          yield_quantity,
          preparation_ingredients!prep_ingredients_prep_fkey (
            quantity_needed,
            standard_ingredients ( current_price )
          )
        )
      `)
      .eq('dish_id', dishId)
      .eq('user_id', userId);

    if (recipes && recipes.length > 0) {
      const productionCost = recipes.reduce((sum: number, r: any) => {
        if (r.preparations) {
          const prepCost = (r.preparations.preparation_ingredients || [])
            .reduce((s: number, pi: any) =>
              s + Number(pi.quantity_needed) * Number(pi.standard_ingredients?.current_price || 0), 0
            );
          const costPerUnit = r.preparations.yield_quantity > 0
            ? prepCost / r.preparations.yield_quantity
            : 0;
          return sum + Number(r.quantity_needed) * costPerUnit;
        }
        return sum + Number(r.quantity_needed) * Number(r.standard_ingredients?.current_price || 0);
      }, 0);

      const sp = Number(newPrice);
      const profitMargin = sp > 0 ? ((sp - productionCost) / sp) * 100 : 0;

      await supabase.from('dish_history_logs').insert({
        dish_id: dishId,
        production_cost: parseFloat(productionCost.toFixed(4)),
        selling_price: sp,
        profit_margin: parseFloat(profitMargin.toFixed(2)),
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error applying price:', error);
    res.status(500).json({ error: 'Failed to apply price' });
  }
};

export const dismissAlert = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { alertId } = req.body;

  if (!alertId) return res.status(400).json({ error: 'alertId is required' });

  try {
    // Ensure user_settings row exists
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id, dismissed_alert_ids')
      .eq('user_id', userId)
      .single();

    if (existing) {
      const current: string[] = existing.dismissed_alert_ids ?? [];
      if (!current.includes(alertId)) {
        await supabase
          .from('user_settings')
          .update({ dismissed_alert_ids: [...current, alertId] })
          .eq('user_id', userId);
      }
    } else {
      await supabase
        .from('user_settings')
        .insert({ user_id: userId, dismissed_alert_ids: [alertId] });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error dismissing alert:', error);
    res.status(500).json({ error: 'Failed to dismiss alert' });
  }
};
