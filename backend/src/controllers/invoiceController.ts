import { Response } from 'express';
import { supabase } from '../config/supabase.js';
import { normalizeInvoiceLinesWithAI } from '../services/aiParser.js';
import dotenv from 'dotenv';

dotenv.config();

export const uploadInvoice = async (req: any, res: Response) => {
  const { invoiceNumber, supplier: rawSupplier, lines, fileName, totalAmount, invoiceDate } = req.body;
  const userId = req.user.id;

  if (!lines?.length) {
    return res.status(400).json({ error: "Invoice has no lines" });
  }

  try {
    // 1. Duplicate file check
    const { data: existingInvoice } = await supabase
      .from('invoices_mvp')
      .select('id')
      .eq('file_name', fileName)
      .eq('user_id', userId)
      .single();

    if (existingInvoice) {
      return res.status(409).json({ error: "This invoice has already been imported." });
    }

    // 2. Pre-fetch categories
    const { data: categoriesData } = await supabase
      .from('ingredient_categories')
      .select('id, name');

    // 3. AI normalization — must happen before supplier resolution
    const aiResult = await normalizeInvoiceLinesWithAI(lines, rawSupplier);
    const cleanSupplier = aiResult.cleanSupplier;
    const mappedItems = aiResult.items;

    if (mappedItems.length !== lines.length) {
      console.error(`AI length mismatch: ${lines.length} sent, ${mappedItems.length} received`);
      return res.status(500).json({ error: "AI processing failed, please retry" });
    }

    // 4. Find or create supplier
    let supplierId: string;
    const { data: existingSupplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('name', cleanSupplier)
      .eq('user_id', userId)
      .single();

    if (existingSupplier) {
      supplierId = existingSupplier.id;
    } else {
      const { data: newSupplier, error: suppErr } = await supabase
        .from('suppliers')
        .insert({ user_id: userId, name: cleanSupplier, raw_name: rawSupplier })
        .select('id')
        .single();
      if (suppErr) throw suppErr;
      supplierId = newSupplier!.id;
    }

    // 5. Fetch existing mappings — filtered by supplier_id + user_id
    const { data: existingMappings } = await supabase
      .from('ingredient_mappings')
      .select('raw_description, standard_id, standard_uom, conversion_factor')
      .eq('user_id', userId)
      .eq('supplier_id', supplierId)
      .in('raw_description', lines.map((l: any) => l.description));

    const mappingCache = new Map(
      (existingMappings || []).map(m => [m.raw_description, m])
    );

    // 6. Save invoice header
    const { data: invoice, error: invErr } = await supabase
      .from('invoices_mvp')
      .insert({
        user_id: userId,
        invoice_number: invoiceNumber,
        supplier_id: supplierId,
        total_amount: totalAmount,
        file_name: fileName,
        invoice_date: invoiceDate
      })
      .select('id')
      .single();

    if (invErr) throw invErr;

    // 7. Separate cached lines from new lines
    const linesToCreate: any[] = [];
    const resolvedLines: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = mappedItems[i];
      const cached = mappingCache.get(line.description);

      if (cached) {
        resolvedLines.push({
          line,
          standardId: cached.standard_id,
          standardUOM: cached.standard_uom,
          conversionFactor: Number(cached.conversion_factor)
        });
      } else {
        linesToCreate.push({ line, match });
      }
    }

    // 8. Process new lines
    if (linesToCreate.length > 0) {

      // Split real ingredients from admin/fee lines
      const ingredientLines = linesToCreate.filter(
        ({ match }) => match.category !== 'Other' && match.standard_name?.trim()
      );
      const adminLines = linesToCreate.filter(
        ({ match }) => match.category === 'Other' || !match.standard_name?.trim()
      );

      // Admin lines pass through with no standard_id
      adminLines.forEach(({ line, match }) => {
        resolvedLines.push({
          line,
          standardId: null,
          standardUOM: match.standard_uom || 'PZ',
          conversionFactor: match.conversion_factor || 1
        });
      });

      // 8. For ingredient lines, upsert any new ingredients and then create mappings
      if (ingredientLines.length > 0) {
        const ingredientsToUpsert = ingredientLines.map(({ match }) => ({
          user_id: userId,
          name: match.standard_name,
          category_id:
            categoriesData?.find(c => c.name.toLowerCase() === match.category.toLowerCase())?.id ??
            categoriesData?.find(c => c.name.toLowerCase() === 'other')?.id,
          unit_of_measure: match.standard_uom
        }));

        // Deduplicate by name before sending to DB
        const seen = new Set<string>();
        const deduplicatedIngredients = ingredientsToUpsert.filter(({ name, unit_of_measure }) => {
          const key = `${name.toLowerCase().trim()}|${unit_of_measure}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const sentNames = deduplicatedIngredients.map(i => i.name);

        // Upsert ingredients
        const { error: ingErr } = await supabase
          .from('standard_ingredients')
          .upsert(deduplicatedIngredients, { onConflict: 'name, user_id' });

        if (ingErr) throw ingErr;

        // ALWAYS fetch after upsert — Supabase may return empty on conflict
        const { data: resolvedIngredients, error: fetchErr } = await supabase
          .from('standard_ingredients')
          .select('id, name')
          .eq('user_id', userId)
          .in('name', sentNames);

        if (fetchErr) throw fetchErr;

        const ingMap = new Map(
          (resolvedIngredients || []).map(i => [i.name.toLowerCase().trim(), i.id])
        );

        // Build mappings
        const mappingsToUpsert = ingredientLines.map(({ line, match }) => ({
          user_id: userId,
          supplier_id: supplierId,
          raw_description: line.description,
          standard_id: ingMap.get(match.standard_name.toLowerCase().trim()),
          standard_uom: match.standard_uom,
          conversion_factor: match.conversion_factor,
          suggested_name: match.standard_name,
          suggested_category: match.category,
          pieces_per_invoice_unit: match.pieces_per_invoice_unit,
          capacity_per_piece: match.capacity_per_piece,
          ai_confidence: 'high'
        }));

        // Log any unmapped to catch issues
        const unmapped = mappingsToUpsert.filter(m => !m.standard_id);
        if (unmapped.length > 0) {
          console.warn('Warning: these lines have no standard_id:', unmapped.map(m => m.raw_description));
        }

        const seenDescriptions = new Set<string>();
        const deduplicatedMappings = mappingsToUpsert
          .filter(m => m.standard_id != null)
          .filter(m => {
            const key = m.raw_description.toLowerCase().trim();
            if (seenDescriptions.has(key)) return false;
            seenDescriptions.add(key);
            return true;
          });

        const { error: mappingErr } = await supabase
          .from('ingredient_mappings')
          .upsert(deduplicatedMappings, 
            { onConflict: 'supplier_id, raw_description, user_id' });

        if (mappingErr) {
          console.error('Mapping upsert error:', mappingErr);
          throw mappingErr;
        }

        ingredientLines.forEach(({ line, match }) => {
          resolvedLines.push({
            line,
            standardId: ingMap.get(match.standard_name.toLowerCase().trim()),
            standardUOM: match.standard_uom,
            conversionFactor: match.conversion_factor
          });
        });
      }
    }

    // 9. Update prices — only if this invoice is the most recent
    const priceUpdates = resolvedLines
      .filter(r => r.standardId != null && r.line.unitPrice && r.conversionFactor > 0)
      .map(r => ({
        id: r.standardId,
        current_price: parseFloat((r.line.unitPrice / r.conversionFactor).toFixed(4)),
        last_updated: invoiceDate
      }));

    for (const update of priceUpdates) {
      await supabase
        .from('standard_ingredients')
        .update({ current_price: update.current_price, last_updated: update.last_updated })
        .eq('id', update.id)
        .eq('user_id', userId)
        .lte('last_updated', update.last_updated);
    }

    // 10. Insert invoice lines
    const invoiceLinesToInsert = resolvedLines.map(r => ({
      user_id: userId,
      invoice_id: invoice!.id,
      standard_id: r.standardId,
      raw_description: r.line.description,
      quantity: r.line.quantity,
      unit: r.line.unit,
      unit_price: r.line.unitPrice,
      standard_uom: r.standardUOM,
      conversion_factor: r.conversionFactor
    }));

    const { error: linesErr } = await supabase
      .from('invoice_lines')
      .insert(invoiceLinesToInsert);

    if (linesErr) throw linesErr;

    // 11. Log dish history for any dish affected by updated prices
    const updatedIngredientIds = priceUpdates.map(u => u.id);

    if (updatedIngredientIds.length > 0) {
      const { data: affectedRecipes } = await supabase
        .from('recipes')
        .select('dish_id')
        .eq('user_id', userId)
        .in('standard_id', updatedIngredientIds);

      const affectedDishIds = [...new Set((affectedRecipes || []).map((r: any) => r.dish_id))];

      if (affectedDishIds.length > 0) {
        const [{ data: affectedDishes }, { data: allDishRecipes }] = await Promise.all([
          supabase
            .from('menu_dishes')
            .select('id, selling_price')
            .eq('user_id', userId)
            .in('id', affectedDishIds),
          supabase
            .from('recipes')
            .select('dish_id, quantity_needed, standard_ingredients(current_price)')
            .eq('user_id', userId)
            .in('dish_id', affectedDishIds)
        ]);

        const historyLogs = (affectedDishes || []).map((dish: any) => {
          const dishLines = (allDishRecipes || []).filter((r: any) => r.dish_id === dish.id);
          const productionCost = dishLines.reduce(
            (sum: number, r: any) =>
              sum + Number(r.quantity_needed) * Number(r.standard_ingredients?.current_price || 0),
            0
          );
          const sellingPrice = Number(dish.selling_price);
          const profitMargin = sellingPrice > 0
            ? ((sellingPrice - productionCost) / sellingPrice) * 100
            : 0;

          return {
            dish_id: dish.id,
            production_cost: parseFloat(productionCost.toFixed(4)),
            selling_price: sellingPrice,
            profit_margin: parseFloat(profitMargin.toFixed(2))
          };
        });

        if (historyLogs.length > 0) {
          await supabase.from('dish_history_logs').insert(historyLogs);
        }
      }
    }

    res.json({ success: true, message: 'Invoice processed successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error processing the invoice" });
  }
};

export const getInvoices = async (req: any, res: Response) => {
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('invoices_mvp')
      .select(`
        id,
        invoice_number,
        total_amount,
        file_name,
        invoice_date,
        suppliers ( name )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedInvoices = data?.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      supplier: inv.suppliers?.name || "Unknown",
      amount: inv.total_amount,
      date: inv.invoice_date,
      fileName: inv.file_name
    })) || [];

    res.json(formattedInvoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Error fetching invoices" });
  }
};

export const getInvoiceDetails = async (req: any, res: Response) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('invoice_lines')
      .select(`
        id,
        raw_description,
        quantity,
        unit,
        unit_price,
        total_price,
        calculated_unit_price,
        standard_uom,
        standard_ingredients ( name )
      `)
      .eq('invoice_id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Error fetching invoice details:", error);
    res.status(500).json({ error: "Error fetching invoice details" });
  }
};

export const deleteInvoice = async (req: any, res: Response) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const { error: lineErr } = await supabase
      .from('invoice_lines')
      .delete()
      .eq('invoice_id', id)
      .eq('user_id', userId);

    if (lineErr) throw lineErr;

    const { error: invoiceErr } = await supabase
      .from('invoices_mvp')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (invoiceErr) throw invoiceErr;

    console.warn(`Invoice ${id} deleted. Prices may be stale for affected ingredients.`);

    res.json({ success: true, message: 'Invoice deleted successfully!' });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ error: "Error deleting invoice" });
  }
};