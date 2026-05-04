import { Response } from 'express';
import { supabase } from '../config/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

export const getSuppliers = async (req: any, res: Response) => {
  const userId = req.user.id;
  try {
    const { data: suppliers, error: supError } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('user_id', userId);

    if (supError) throw supError;

    const { data: invoices, error: invError } = await supabase
      .from('invoices_mvp')
      .select('supplier_id, total_amount, invoice_date')
      .eq('user_id', userId);

    if (invError) throw invError;

    const suppliersWithStats = (suppliers || []).map(supplier => {
      const supplierInvoices = (invoices || []).filter(inv => inv.supplier_id === supplier.id);
      
      const totalSpent = supplierInvoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
      const invoiceCount = supplierInvoices.length;
      
      const dates = supplierInvoices
        .map(inv => new Date(inv.invoice_date).getTime())
        .filter(time => !isNaN(time));
        
      const lastOrderDate = dates.length > 0 
        ? new Date(Math.max(...dates)).toISOString() 
        : null;

      return {
        id: supplier.id,
        name: supplier.name,
        totalSpent,
        invoiceCount,
        lastOrderDate
      };
    });

    suppliersWithStats.sort((a, b) => b.totalSpent - a.totalSpent);

    res.json(suppliersWithStats);

  } catch (error) {
    console.error('Error fetching suppliers with stats:', error);
    res.status(500).json([]);
  }
};

export const getInvoicesBySupplier = async (req: any, res: Response) => {
    const userId = req.user.id;
    const supplierId = req.params.supplierId;

    try {
        const { data: invoices, error } = await supabase
            .from('invoices_mvp')
            .select('id, invoice_number, total_amount, file_name, invoice_date')
            .eq('user_id', userId)
            .eq('supplier_id', supplierId);

        if (error) throw error;
        res.json(invoices || []);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json([]); 
    }
};