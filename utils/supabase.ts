import { createClient } from '@supabase/supabase-js';

// We pull the keys from your hidden .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// We export this 'supabase' variable so we can use it anywhere in the app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);