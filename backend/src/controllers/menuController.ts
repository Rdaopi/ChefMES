import { Response } from 'express';
import { supabase } from '../config/supabase.js';

// Helper: compute production cost from recipe rows
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

// Helper: classify dish using contribution margin vs average across all dishes
function classifyDish(contributionMargin: number, avgContributionMargin: number): string {
  if (contributionMargin >= avgContributionMargin) return 'Star';
  return 'Dog';
  // Future when popularity (times_sold) is added:
  // if (CM >= avg && popularity >= avg) return 'Star'
  // if (CM >= avg && popularity < avg)  return 'Puzzle'
  // if (CM < avg  && popularity >= avg) return 'Plowhorse'
  // if (CM < avg  && popularity < avg)  return 'Dog'
}

// Helper: compute trend from last 2 history log entries
function computeTrend(history: any[]): 'Up' | 'Down' | 'Stable' {
  if (history.length < 2) return 'Stable';
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const diff = last.profit_margin - prev.profit_margin;
  if (diff > 1) return 'Up';
  if (diff < -1) return 'Down';
  return 'Stable';
}

// 1. Menu list with live food cost + real trend + proper classification
export const getMenus = async (req: any, res: Response) => {
  const userId = req.user?.id;

  try {
    const { data: dishes, error: dishesErr } = await supabase
      .from('menu_dishes')
      .select('id, name, category, selling_price')
      .eq('user_id', userId);

    if (dishesErr) throw dishesErr;

    const [{ data: recipes, error: recipeErr }, { data: historyLogs }] = await Promise.all([
      supabase
        .from('recipes')
        .select(`
          dish_id,
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
        .eq('user_id', userId),
      supabase
        .from('dish_history_logs')
        .select('dish_id, recorded_at, profit_margin')
        .in('dish_id', (dishes || []).map((d: any) => d.id))
        .order('recorded_at', { ascending: true })
    ]);

    if (recipeErr) throw recipeErr;

    // Compute contribution margin for every dish
    const dishData = (dishes || []).map(dish => {
      const dishRecipes = (recipes || []).filter((r: any) => r.dish_id === dish.id);
      const productionCost = computeProductionCost(dishRecipes);
      const sellingPrice = Number(dish.selling_price) || 0;
      const contributionMargin = sellingPrice - productionCost;
      return { dish, productionCost, sellingPrice, contributionMargin };
    });

    // Average contribution margin across all dishes
    const avgCM = dishData.length > 0
      ? dishData.reduce((sum, d) => sum + d.contributionMargin, 0) / dishData.length
      : 0;

    // Build history map: dish_id -> sorted logs
    const historyMap = new Map<string, any[]>();
    (historyLogs || []).forEach((log: any) => {
      if (!historyMap.has(log.dish_id)) historyMap.set(log.dish_id, []);
      historyMap.get(log.dish_id)!.push(log);
    });

    const menuItems = dishData.map(({ dish, productionCost, sellingPrice, contributionMargin }) => {
      const history = historyMap.get(dish.id) || [];
      const trend = computeTrend(history);
      const status = classifyDish(contributionMargin, avgCM);

      return {
        id: dish.id,
        dishName: dish.name,
        category: dish.category || 'Uncategorized',
        productionCost: parseFloat(productionCost.toFixed(4)),
        sellingPrice,
        profitMargin: parseFloat(contributionMargin.toFixed(4)),
        contributionMargin: parseFloat(contributionMargin.toFixed(4)),
        status,
        trend
      };
    });

    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menus:', error);
    res.status(500).json([]);
  }
};

// 2. Dish detail with ingredients breakdown + history
export const getMenuById = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const dishId = req.params.id;

  try {
    const [
      { data: dish, error: dishErr },
      { data: recipes, error: recipeErr },
      { data: history }
    ] = await Promise.all([
      supabase
        .from('menu_dishes')
        .select('*')
        .eq('user_id', userId)
        .eq('id', dishId)
        .single(),
      supabase
        .from('recipes')
        .select(`
          quantity_needed,
          standard_id,
          preparation_id,
          standard_ingredients (
            name,
            current_price,
            unit_of_measure
          ),
          preparations (
            name,
            yield_quantity,
            preparation_ingredients!prep_ingredients_prep_fkey (
              quantity_needed,
              standard_ingredients ( current_price )
            )
          )
        `)
        .eq('dish_id', dishId)
        .eq('user_id', userId),
      supabase
        .from('dish_history_logs')
        .select('recorded_at, production_cost, selling_price, profit_margin')
        .eq('dish_id', dishId)
        .order('recorded_at', { ascending: true })
    ]);

    if (dishErr || !dish) {
      return res.status(404).json({ error: 'Dish not found' });
    }
    if (recipeErr) throw recipeErr;

    let totalCost = 0;

    const ingredientsList = (recipes || []).map((ing: any) => {

      // Case 1: preparation
      if (ing.preparations) {
        const prepCost = (ing.preparations.preparation_ingredients || [])
          .reduce((sum: number, pi: any) =>
            sum + Number(pi.quantity_needed) * Number(pi.standard_ingredients?.current_price || 0), 0
          );
        const costPerUnit = ing.preparations.yield_quantity > 0
          ? prepCost / ing.preparations.yield_quantity
          : 0;
        const total = Number(ing.quantity_needed) * costPerUnit;
        totalCost += total;
        return {
          standard_id: null,
          preparation_id: ing.preparation_id,
          name: `${ing.preparations.name} (prep)`,
          qty: Number(ing.quantity_needed),
          unitCost: parseFloat(costPerUnit.toFixed(4)),
          total: parseFloat(total.toFixed(4))
        };
      }

      // Case 2: standard ingredient
      const name = ing.standard_ingredients?.name || 'Unknown Ingredient';
      const uom = ing.standard_ingredients?.unit_of_measure || 'PZ';
      const qty = Number(ing.quantity_needed);
      const unitCost = Number(ing.standard_ingredients?.current_price || 0);
      const total = qty * unitCost;
      totalCost += total;
      return {
        standard_id: ing.standard_id,
        preparation_id: null,
        name: `${name} (${uom})`,
        qty,
        unitCost: parseFloat(unitCost.toFixed(4)),
        total: parseFloat(total.toFixed(4))
      };
    }); 
    const sellingPrice = Number(dish.selling_price) || 0;
    const profitMargin = sellingPrice - totalCost;
    const foodCostPercent = sellingPrice > 0
      ? parseFloat(((totalCost / sellingPrice) * 100).toFixed(2))
      : 0;

    res.json({
      id: dish.id,
      dishName: dish.name,
      category: dish.category || 'Uncategorized',
      sellingPrice,
      totalCost: parseFloat(totalCost.toFixed(4)),
      profitMargin: parseFloat(profitMargin.toFixed(4)),
      foodCostPercent,
      ingredients: ingredientsList,
      history: history || [],
      estimatedCosts: [
        { type: 'Labor Cost', value: '15 min', cost: 3.50 },
        { type: 'Operational/Fixed Costs', value: 'Approx.', cost: 1.20 }
      ]
    });
  } catch (error) {
    console.error('Error fetching dish details:', error);
    res.status(500).json({ error: 'Failed to fetch dish details' });
  }
};

// 3. Available ingredients and preparations for recipe builder
export const getAvailableIngredients = async (req: any, res: Response) => {
  const userId = req.user?.id;

  try {
    const [
      { data: ingredients, error: ingErr },
      { data: preparations, error: prepErr }
    ] = await Promise.all([
      supabase
        .from('standard_ingredients')
        .select('id, name, unit_of_measure, current_price')
        .eq('user_id', userId)
        .order('name'),
      supabase
        .from('preparations')
        .select('id, name, yield_uom')
        .eq('user_id', userId)
        .order('name')
    ]);

    if (ingErr) throw ingErr;
    if (prepErr) throw prepErr;

    res.json({
      ingredients: ingredients || [],
      preparations: preparations || []
    });
  } catch (error) {
    console.error('Error fetching available ingredients:', error);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
};

// 4. Save or update a dish recipe + log history snapshot
export const saveDishRecipe = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { name, category, sellingPrice, recipeItems } = req.body;
  const dishId = req.params.id || req.body.dishId;


  try {
    let currentDishId = dishId;

    // Save or update dish header
    if (currentDishId) {
      const { error: updateErr } = await supabase
        .from('menu_dishes')
        .update({ name, category, selling_price: sellingPrice })
        .eq('id', currentDishId)
        .eq('user_id', userId);
      if (updateErr) throw updateErr;
    } else {
      const { data: newDish, error: insertErr } = await supabase
        .from('menu_dishes')
        .insert({ user_id: userId, name, category, selling_price: sellingPrice })
        .select('id')
        .single();
      if (insertErr) throw insertErr;
      currentDishId = newDish.id;
    }

    // Replace recipe lines
    await supabase.from('recipes').delete().eq('dish_id', currentDishId);

    if (recipeItems?.length > 0) {
      const formattedRecipes = recipeItems.map((item: any) => ({
        user_id: userId,
        dish_id: currentDishId,
        standard_id: item.standard_id || null,
        preparation_id: item.preparation_id || null,
        quantity_needed: item.quantity_needed
      }));

      const { error: recipeErr } = await supabase
        .from('recipes')
        .insert(formattedRecipes);
      if (recipeErr) throw recipeErr;
    }

    // Log history snapshot after saving
    const { data: newRecipes } = await supabase
      .from('recipes')
      .select(`
        quantity_needed,
        standard_ingredients ( current_price ),
        preparations (
          yield_quantity,
          preparation_ingredients (
            quantity_needed,
            standard_ingredients ( current_price )
          )
        )
      `)
      .eq('dish_id', currentDishId)
      .eq('user_id', userId);

    if (newRecipes) {
      const productionCost = computeProductionCost(newRecipes);
      const sp = Number(sellingPrice);
      const profitMargin = sp > 0
        ? ((sp - productionCost) / sp) * 100
        : 0;

      await supabase.from('dish_history_logs').insert({
        dish_id: currentDishId,
        production_cost: parseFloat(productionCost.toFixed(4)),
        selling_price: sp,
        profit_margin: parseFloat(profitMargin.toFixed(2))
      });
    }

    res.json({ success: true, dishId: currentDishId, message: 'Recipe saved successfully!' });
  } catch (error) {
    console.error('Error saving dish:', error);
    res.status(500).json({ error: 'Failed to save the dish and recipe' });
  }
};

// 5. Delete dish and all related data
export const deleteDish = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const dishId = req.params.id;

  try {
    await Promise.all([
      supabase.from('recipes').delete().eq('dish_id', dishId),
      supabase.from('dish_history_logs').delete().eq('dish_id', dishId)
    ]);

    const { error } = await supabase
      .from('menu_dishes')
      .delete()
      .eq('id', dishId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true, message: 'Dish deleted successfully!' });
  } catch (error) {
    console.error('Error deleting dish:', error);
    res.status(500).json({ error: 'Failed to delete the dish' });
  }
};