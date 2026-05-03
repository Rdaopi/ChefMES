import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Missing Token' });

  // Token validation with Supabase Auth
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) return res.status(401).json({ error: 'Invalid session' });

  req.user = user; // Saving the user to use it the queries
  next();
};