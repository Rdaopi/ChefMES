import { Response } from 'express';
import { supabase } from '../config/supabase.js';

export const getIngredientSuppliers = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { ingredientId } = req.params;

  try {
    const { data: lines, error: linesError } = await supabase
      .from('invoice_lines')
      .select('calculated_unit_price, invoice_id')
      .eq('standard_id', ingredientId)
      .eq('user_id', userId)
      .not('calculated_unit_price', 'is', null);

    if (linesError) throw linesError;
    if (!lines?.length) return res.json([]);

    const invoiceIds = [...new Set(lines.map((l: any) => l.invoice_id))];

    const { data: invoices, error: invError } = await supabase
      .from('invoices_mvp')
      .select('id, invoice_date, suppliers ( id, name )')
      .in('id', invoiceIds);

    if (invError) throw invError;

    const invoiceMap = new Map((invoices || []).map((inv: any) => [inv.id, inv]));

    // Group prices by supplier
    const supplierMap = new Map<string, {
      supplierId: string;
      supplierName: string;
      entries: Array<{ price: number; date: string }>;
    }>();

    for (const line of lines) {
      const invoice = invoiceMap.get(line.invoice_id) as any;
      if (!invoice?.suppliers) continue;

      const supplier = invoice.suppliers;
      const price = Number(line.calculated_unit_price);
      const date: string = invoice.invoice_date;

      if (!supplierMap.has(supplier.id)) {
        supplierMap.set(supplier.id, {
          supplierId: supplier.id,
          supplierName: supplier.name,
          entries: []
        });
      }
      supplierMap.get(supplier.id)!.entries.push({ price, date });
    }

    const results = Array.from(supplierMap.values()).map(s => {
      s.entries.sort((a, b) => a.date.localeCompare(b.date));
      const prices = s.entries.map(e => e.price);
      const latestPrice = s.entries[s.entries.length - 1].price;
      const bestPrice = Math.min(...prices);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const lastDate = s.entries[s.entries.length - 1].date;

      return {
        supplierId: s.supplierId,
        supplierName: s.supplierName,
        latestPrice: parseFloat(latestPrice.toFixed(4)),
        bestPrice: parseFloat(bestPrice.toFixed(4)),
        avgPrice: parseFloat(avgPrice.toFixed(4)),
        deliveries: prices.length,
        lastDate,
        isCheapest: false
      };
    });

    // Mark cheapest by current (latest) price
    const minLatest = Math.min(...results.map(r => r.latestPrice));
    results.forEach(r => { r.isCheapest = r.latestPrice === minLatest; });
    results.sort((a, b) => a.latestPrice - b.latestPrice);

    res.json(results);
  } catch (error) {
    console.error('Error fetching ingredient suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch supplier comparison' });
  }
};

export const getTerminalData = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const days = Number(req.query.days) || 0;

  try {
    let query = supabase
      .from('ingredient_price_history')
      .select('*')
      .eq('user_id', userId)
      .order('invoice_date', { ascending: true });

    if (days > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      query = query.gte('invoice_date', cutoff.toISOString().split('T')[0]);
    }

    const { data: history, error } = await query;

    if (error) throw error;
    if (!history?.length) return res.json([]);

    // Group by standard_id
    const grouped = new Map<string, any[]>();
    history.forEach(row => {
      if (!grouped.has(row.standard_id)) grouped.set(row.standard_id, []);
      grouped.get(row.standard_id)!.push(row);
    });

    const terminalItems = Array.from(grouped.entries()).map(([standardId, rows]) => {
      const first = rows[0];                        // oldest invoice — contract price
      const last = rows[rows.length - 1];           // most recent invoice
      const previous = rows.length > 1
        ? rows[rows.length - 2]
        : rows[0];                                  // second-to-last for short-term trend

      const contractPrice = Number(first.price);    // oldest known price
      const livePrice = Number(last.target_price);  // current_price from standard_ingredients
      const prevPrice = Number(previous.price);     // previous invoice price

      // Long-term trend: contract → live (for status classification)
      const longTermPercent = contractPrice > 0
        ? ((livePrice - contractPrice) / contractPrice) * 100
        : 0;

      // Short-term trend: previous invoice → latest invoice (for trend badge)
      const shortTermPercent = prevPrice > 0
        ? ((Number(last.price) - prevPrice) / prevPrice) * 100
        : 0;

      const trendDirection =
        shortTermPercent > 1 ? 'up' :
        shortTermPercent < -1 ? 'down' : 'stable';

      // Status based on long-term trend
      const status =
        longTermPercent > 5 ? 'Warning' :
        longTermPercent < -5 ? 'Opportunity' : 'Stable';

      // Total delta savings across all invoices
      const totalDeltaSavings = rows.reduce(
        (sum, r) => sum + Number(r.delta_savings || 0), 0
      );

      return {
        id: standardId,
        ingredient: last.ingredient_name,
        uom: last.unit_of_measure,
        supplier: last.supplier_name,

        contractPrice: parseFloat(contractPrice.toFixed(4)),
        livePrice: parseFloat(livePrice.toFixed(4)),

        // Short-term trend badge
        trend: `${shortTermPercent > 0 ? '+' : ''}${shortTermPercent.toFixed(1)}%`,
        trendPercent: parseFloat(shortTermPercent.toFixed(2)),
        trendDirection,

        // Long-term classification
        longTermPercent: parseFloat(longTermPercent.toFixed(2)),
        status,

        // Savings tracking
        totalDeltaSavings: parseFloat(totalDeltaSavings.toFixed(2)),

        lastUpdated: last.invoice_date,
        priceHistory: rows.map(r => ({
          date: r.invoice_date,
          price: Number(r.price),
          supplier: r.supplier_name
        }))
      };
    });

    terminalItems.sort((a, b) => {
      const order: Record<string, number> = { Warning: 0, Opportunity: 1, Stable: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });

    res.json(terminalItems);
  } catch (error) {
    console.error('Error fetching terminal data:', error);
    res.status(500).json({ error: 'Failed to fetch terminal data' });
  }
};