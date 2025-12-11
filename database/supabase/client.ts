import { createClient } from '@supabase/supabase-js';

// Substitua estas variáveis pelas suas credenciais do Supabase ou use process.env se configurado
const SUPABASE_URL = process.env.SUPABASE_URL || ''; 
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;
};

// Evita o crash "supabaseUrl is required" retornando um objeto vazio se não configurado.
// A lógica da aplicação verifica isSupabaseConfigured() antes de usar a variável supabase.
export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : ({} as any);
