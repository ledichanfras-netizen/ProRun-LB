
import { createClient } from '@supabase/supabase-js';

// Fallback to provided keys if environment variables are not set
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yjmuhcglmhvbsogzrfuy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_zVwpacFU6xhqeK53gKDFrQ_swCkZ1qs';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables are missing. Using provided fallback keys.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
