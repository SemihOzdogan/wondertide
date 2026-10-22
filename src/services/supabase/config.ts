import type { SupabaseConfig } from './client';

// Publishable keys are intended for mobile clients. Database access is limited
// by Row Level Security; never add a Supabase secret key to this repository.
export const supabaseConfig: SupabaseConfig = {
  url: 'https://udrugqdrrkfbkxavjtkc.supabase.co',
  publishableKey: 'sb_publishable_YlI7NbbXXWkM1BA4MTma8g_18j6rMq6',
};
