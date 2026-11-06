import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && !SUPABASE_PUBLISHABLE_KEY.includes('PASTE_'));
export const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  global: { headers: { 'X-Client-Info': 'zune-premium-admin/1.0.0' } }
}) : null;
