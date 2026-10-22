import { createSupabaseClient } from './client';
import { supabaseConfig } from './config';

export const supabase = createSupabaseClient(supabaseConfig);
