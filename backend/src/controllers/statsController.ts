import { Response } from 'express';
import { supabase } from '../config/supabase.js';

export const getStats = async (req: any, res: Response) => {
  const userId = req.user?.id;

  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { data: invoices },
      { data: dishes },
      { data: recipes },
      { data: settings }
    ] = await Promise.all([
      // Monthly spend
      supabase
        .from('invoices_mvp')
        .select('total_amount')
        .eq('user_id', userId)
        .gte('invoice_date', firstOfMonth),

      // All dishes for margin calculation
      supabase
        .from('menu_dishes')
        .select('id, selling_price')
        .eq('user_id', userId),

      // All recipes with ingredient prices
      supabase
        .from('recipes')
        .select(`
          dish_id,
          quantity_needed,
          standard_ingredients ( current_price )
        `)
        .eq('user_id', userId),

      // User settings
      supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()
    ]);

    // Monthly spend
    const monthlySpend = (invoices || [])
      .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    // Current margin across all dishes
    let totalRevenue = 0;
    let totalCost = 0;
    let dogsCount = 0;

    const dishCosts = (dishes || []).map(dish => {
      const dishRecipes = (recipes || []).filter(r => r.dish_id === dish.id);
      const cost = dishRecipes.reduce(
        (sum, r) => sum + Number(r.quantity_needed) * Number(r.standard_ingredients?.current_price || 0),
        0
      );
      const sellingPrice = Number(dish.selling_price);
      const margin = sellingPrice > 0 ? ((sellingPrice - cost) / sellingPrice) * 100 : 0;
      if (margin < 30) dogsCount++;
      totalRevenue += sellingPrice;
      totalCost += cost;
      return { margin, sellingPrice, cost };
    });

    const currentMarginPercent = totalRevenue > 0
      ? ((totalRevenue - totalCost) / totalRevenue) * 100
      : 0;

    const avgFoodCostPercent = totalRevenue > 0
      ? (totalCost / totalRevenue) * 100
      : 0;

    // Settings with defaults
    const userSettings = settings || {
      target_margin_percent: 65,
      target_food_cost_percent: 30,
      monthly_spend_budget: null
    };

    res.json({
      monthlySpend: parseFloat(monthlySpend.toFixed(2)),
      monthlyBudget: userSettings.monthly_spend_budget,
      currentMarginPercent: parseFloat(currentMarginPercent.toFixed(1)),
      targetMarginPercent: userSettings.target_margin_percent,
      avgFoodCostPercent: parseFloat(avgFoodCostPercent.toFixed(1)),
      targetFoodCostPercent: userSettings.target_food_cost_percent,
      totalDishes: (dishes || []).length,
      dogsCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};