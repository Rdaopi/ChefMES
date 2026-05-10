import { Response } from 'express';
import { supabase } from '../config/supabase.js';

export const getSettings = async (req: any, res: Response) => {
  const userId = req.user?.id;
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No settings yet — return defaults
      return res.json({
        target_margin_percent: 65,
        target_food_cost_percent: 30,
        monthly_spend_budget: null
      });
    }
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const { target_margin_percent, target_food_cost_percent, monthly_spend_budget } = req.body;

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        target_margin_percent,
        target_food_cost_percent,
        monthly_spend_budget,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};