// SSR-safe wrapper for Supabase client
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Create a storage adapter that works in SSR
const createStorageAdapter = () => {
  if (typeof window === 'undefined') {
    // Server-side: use a no-op storage
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  // Client-side: use localStorage
  return localStorage;
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: createStorageAdapter(),
    persistSession: true,
    autoRefreshToken: true,
  }
});
