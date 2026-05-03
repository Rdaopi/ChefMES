import { Response } from 'express';
import { supabase } from '../config/supabase.js';
import { normalizeInvoiceLinesWithAI } from '../services/aiParser.js';
import dotenv from 'dotenv';

dotenv.config();

export const uploadInvoice = async (req: any, res: Response) => {
  const { 
    invoiceNumber, 
    supplier: rawSupplier, 
    lines, 
    fileName, 
    totalAmount, 
    invoiceDate 
  } = req.body;
  const userId = req.user.id;

  try {
    // 0. Pre-fetch of categories to minimize DB calls inside the loop
    const { data: categoriesData } = await supabase.from('ingredient_categories').select('id, name');
    
    // 1. Calling Gemini BEFORE saving the invoice to get the clean supplier and mapped items with UOM and conversion factors
    const aiResult = await normalizeInvoiceLinesWithAI(lines, rawSupplier);
    const cleanSupplier = aiResult.cleanSupplier;
    const mappedItems = aiResult.items;

    // 2. handling supplier (Find or Create)
    let supplierId;
    let { data: existingSupplier } = await supabase
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
        .insert({ user_id: userId, name: cleanSupplier })
        .select('id').single();
      
      if (suppErr) throw suppErr;
      supplierId = newSupplier.id;
    }

    // 3. Saving the invoice with the clean supplier and other details (without lines for now)
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
      .select('id').single();

    if (invErr) throw invErr;

    // 4. Saving lines and updating ingredient database
    for (const line of lines) {
      const match = mappedItems.find((r: any) => r.original_desc === line.description);
      
      const standardName = match ? match.standard_name : line.description;
      const categoryName = match ? match.category : "Other";
      const standardUOM = match ? match.standard_uom : (line.unit || "PZ");
      const conversionFactor = match ? match.conversion_factor : 1;

      // Find the category ID (fallback to "Other" if not found)
      const categoryId = categoriesData?.find(c => c.name.toLowerCase() === categoryName.toLowerCase())?.id 
        || categoriesData?.find(c => c.name.toLowerCase() === "Other")?.id;

      // Calclate the real cost per unit (e.g., cost per KG)
      const usableUnitPrice = (line.unitPrice && conversionFactor > 0) 
        ? parseFloat((line.unitPrice / conversionFactor).toFixed(4)) 
        : line.unitPrice;

      // A. Upsert Standard Ingredient
      let { data: standardIng, error: ingErr } = await supabase.from('standard_ingredients')
        .upsert(
          { 
            user_id: userId, 
            name: standardName, 
            category_id: categoryId, 
            unit_of_measure: standardUOM,
            current_price: usableUnitPrice 
          },
          { onConflict: 'name, user_id' }
        ).select('id').single();

      if (ingErr || !standardIng) {
        console.error("Ingredient Insert Error:", ingErr);
        continue;
      }

      // B. Upsert Mapping
      await supabase.from('ingredient_mappings')
        .upsert(
          { 
            user_id: userId, 
            supplier_id: supplierId, 
            raw_description: line.description, 
            standard_id: standardIng.id,
            standard_uom: standardUOM,
            conversion_factor: conversionFactor
          },
          { onConflict: 'supplier_id, raw_description, user_id' }
        );

      // C. Inserting Invoice Line
      await supabase.from('invoice_lines').insert({
        user_id: userId,
        invoice_id: invoice.id,
        standard_id: standardIng.id,
        raw_description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unit_price: line.unitPrice,
        standard_uom: standardUOM,
        conversion_factor: conversionFactor,
        calculated_unit_price: usableUnitPrice
      });
    }

    res.json({ success: true, message: 'Invoice processed with success!' });
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

      // CORREZIONE QUI SOTTO: (inv: any) racchiuso tra parentesi
      const formattedInvoices = data?.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        supplier: inv.suppliers?.name || "Unknown",
        amount: inv.total_amount,
        date: inv.invoice_date,
        fileName: inv.file_name
       })) || [];
      
       // NOTA IMPORTANTE: Il backend ora invia { invoices: [...] } invece di un array diretto.
       // Se il tuo frontend si aspetta un array diretto, usa `res.json(formattedInvoices);`
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