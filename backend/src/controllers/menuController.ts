import { Response } from 'express';
import { supabase } from '../config/supabase.js';

// 1. Recupera la lista dei Menu con Food Cost Live
export const getMenus = async (req: any, res: Response) => {
  const userId = req.user?.id;

  try {
    // A. Prendi tutti i piatti dell'utente dalla tabella corretta (menu_dishes)
    const { data: dishes, error: dishesErr } = await supabase
      .from('menu_dishes')
      .select('id, name, category, selling_price')
      .eq('user_id', userId);

    if (dishesErr) throw dishesErr;

    // B. Prendi tutte le ricette (distinta base) per calcolare i costi
    const { data: recipes, error: recipeErr } = await supabase
      .from('recipes')
      .select(`
        dish_id,
        quantity_needed,
        standard_ingredients (
          current_price
        )
      `)
      .eq('user_id', userId);

    if (recipeErr) throw recipeErr;

    // C. Calcola i costi in tempo reale per ogni piatto
    const menuItems = (dishes || []).map(dish => {
      // Filtra gli ingredienti che appartengono a questo piatto specifico
      const dishIngredients = (recipes || []).filter(r => r.dish_id === dish.id);
      
      let productionCost = 0;

      // Somma (Quantità necessaria * Prezzo Live Ingrediente)
      dishIngredients.forEach(ing => {
        // Se l'ingrediente è collegato a un semilavorato (preparation) per ora non ha standard_ingredients,
        // ma la logica copre perfettamente gli ingredienti standard.
        const livePrice = ing.standard_ingredients?.current_price || 0;
        productionCost += (Number(ing.quantity_needed) * Number(livePrice));
      });

      const sellingPrice = Number(dish.selling_price) || 0;
      const profitMargin = sellingPrice - productionCost;
      
      // Calcolo percentuale margine per assegnare lo status (Matrice di Boston simulata)
      const marginPercent = sellingPrice > 0 ? (profitMargin / sellingPrice) * 100 : 0;

      let status = 'Puzzle'; 
      if (marginPercent >= 70) status = 'Star';
      else if (marginPercent >= 50) status = 'Plowhorse';
      else if (marginPercent < 30) status = 'Dog';

      return {
        id: dish.id,
        dishName: dish.name,
        category: dish.category || 'Nessuna',
        productionCost,
        sellingPrice,
        profitMargin,
        status,
        trend: 'Up' // Placeholder grafico
      };
    });

    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menus:', error);
    res.status(500).json([]);
  }
};

// 2. Recupera il Dettaglio della Ricetta (Ingredienti e Costi)
export const getMenuById = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const dishId = req.params.id;

  try {
    const { data: dish, error: dishErr } = await supabase
      .from('menu_dishes')
      .select('*')
      .eq('user_id', userId)
      .eq('id', dishId)
      .single();

    if (dishErr || !dish) {
      return res.status(404).json({ error: 'Piatto non trovato' });
    }

    const { data: recipes, error: recipeErr } = await supabase
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
          yield_uom,
          preparation_ingredients (
            quantity_needed,
            standard_ingredients (
              current_price
            )
          )
        )
      `)
      .eq('dish_id', dishId)
      .eq('user_id', userId);

    if (recipeErr) throw recipeErr;

    let totalCost = 0;

    // Single map — handles both standard ingredients and preparations
    const ingredientsList = (recipes || []).map((ing: any) => {
      
      // Case 1: linked to a preparation (semilavorato)
      if (ing.preparations) {
        const prepCost = (ing.preparations.preparation_ingredients || [])
          .reduce((sum: number, pi: any) =>
            sum + (Number(pi.quantity_needed) * Number(pi.standard_ingredients?.current_price || 0)), 0
          );
        const costPerUnit = ing.preparations.yield_quantity > 0
          ? prepCost / ing.preparations.yield_quantity
          : 0;
        const total = Number(ing.quantity_needed) * costPerUnit;
        totalCost += total;
        return {
          name: `${ing.preparations.name} (prep)`,
          qty: Number(ing.quantity_needed),
          unitCost: costPerUnit,
          total
        };
      }

      // Case 2: standard ingredient
      const name = ing.standard_ingredients?.name || 'Sconosciuto';
      const uom = ing.standard_ingredients?.unit_of_measure || 'PZ';
      const qty = Number(ing.quantity_needed);
      const unitCost = Number(ing.standard_ingredients?.current_price || 0);
      const total = qty * unitCost;
      totalCost += total;
      return {
        name: `${name} (${uom})`,
        qty,
        unitCost,
        total
      };
    });

    const sellingPrice = Number(dish.selling_price) || 0;
    const profitMargin = sellingPrice - totalCost;

    res.json({
      id: dish.id,
      dishName: dish.name,
      category: dish.category,
      sellingPrice,
      totalCost,
      profitMargin,
      ingredients: ingredientsList,
      estimatedCosts: [
        { type: 'Costo del Lavoro', value: '15 min', cost: 3.50 },
        { type: 'Costi Operativi/Fissi', value: 'Appross.', cost: 1.20 }
      ]
    });

  } catch (error) {
    console.error('Error fetching dish details:', error);
    res.status(500).json({ error: 'Failed to fetch dish details' });
  }
};

export const getAvailableIngredients = async (req: any, res: Response) => {
  const userId = req.user?.id;

  try {
    // Estrai gli ingredienti base (aggiornati dalle fatture)
    const { data: ingredients, error: ingErr } = await supabase
      .from('standard_ingredients')
      .select('id, name, unit_of_measure, current_price')
      .eq('user_id', userId)
      .order('name');

    if (ingErr) throw ingErr;

    // Estrai i semilavorati (preparations)
    const { data: preparations, error: prepErr } = await supabase
      .from('preparations')
      .select('id, name, yield_uom')
      .eq('user_id', userId)
      .order('name');

    if (prepErr) throw prepErr;

    // Restituisci entrambi al frontend
    res.json({
      ingredients: ingredients || [],
      preparations: preparations || []
    });
  } catch (error) {
    console.error('Error fetching available ingredients:', error);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
};

// 4. Salva o Aggiorna una Ricetta (Piatto + Ingredienti)
export const saveDishRecipe = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { dishId, name, category, sellingPrice, recipeItems } = req.body;
  // recipeItems sarà un array tipo: [{ standard_id: "...", quantity_needed: 0.2 }, { preparation_id: "...", quantity_needed: 1 }]

  try {
    let currentDishId = dishId;

    // STEP A: Salva o Aggiorna la testata del Piatto (menu_dishes)
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

    // STEP B: Aggiorna la distinta base (recipes)
    // 1. Elimina i vecchi ingredienti associati a questo piatto (pulizia)
    await supabase.from('recipes').delete().eq('dish_id', currentDishId);

    // 2. Inserisci i nuovi ingredienti scelti dall'utente
    if (recipeItems && recipeItems.length > 0) {
      const formattedRecipes = recipeItems.map((item: any) => ({
        user_id: userId,
        dish_id: currentDishId,
        standard_id: item.standard_id || null, // Se è un ingrediente base
        preparation_id: item.preparation_id || null, // Se è un semilavorato
        quantity_needed: item.quantity_needed
      }));

      const { error: recipeErr } = await supabase
        .from('recipes')
        .insert(formattedRecipes);
        
      if (recipeErr) throw recipeErr;
    }

    res.json({ success: true, dishId: currentDishId, message: 'Ricetta salvata con successo!' });

  } catch (error) {
    console.error('Error saving dish:', error);
    res.status(500).json({ error: 'Failed to save the dish and recipe' });
  }
};

// 5. Elimina un piatto e le sue ricette associate
export const deleteDish = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const dishId = req.params.id;

  try {
    // 1. Eliminiamo prima le dipendenze nella tabella recipes
    await supabase.from('recipes').delete().eq('dish_id', dishId);
    
    // Siccome abbiamo creato la tabella dish_history_logs, eliminiamo anche quello storico:
    await supabase.from('dish_history_logs').delete().eq('dish_id', dishId);

    // 2. Eliminiamo il piatto principale
    const { error } = await supabase
      .from('menu_dishes')
      .delete()
      .eq('id', dishId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true, message: 'Piatto eliminato correttamente' });
  } catch (error) {
    console.error('Error deleting dish:', error);
    res.status(500).json({ error: 'Failed to delete the dish' });
  }
};