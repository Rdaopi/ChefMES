import { Response } from 'express';
import { supabase } from '../config/supabase.js';

export const getTerminalData = async (req: any, res: Response) => {
  const userId = req.user?.id;

  try {
    const { data: history, error } = await supabase
      .from('ingredient_price_history')
      .select('*')
      .eq('user_id', userId)
      .order('invoice_date', { ascending: true });

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