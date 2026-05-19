
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Fix your .env file before deploying.');
}

export const supabase = createClient(
  supabaseUrl || 'https://yjmuhcglmhvbsogzrfuy.supabase.co',
  supabaseAnonKey || 'sb_publishable_zVwpacFU6xhqeK53gKDFrQ_swCkZ1qs'
);
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
