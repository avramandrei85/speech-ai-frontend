import { createClient } from '@supabase/supabase-js';

// Accessing variables the Vite way
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Safety check: ensure the variables are actually loaded
if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables are missing! Check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);