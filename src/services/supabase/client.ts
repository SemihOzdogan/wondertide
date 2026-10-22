import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

/**
 * Keep the publishable key in the app configuration, never the service-role key.
 * The user/session is enforced by Row Level Security in the database.
 */
export function createSupabaseClient(config: SupabaseConfig) {
  return createClient(config.url, config.publishableKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}
