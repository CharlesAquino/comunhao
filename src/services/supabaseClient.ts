import { createClient } from '@supabase/supabase-js';

// As chaves são lidas das variáveis de ambiente do Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ERRO: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas no arquivo .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
