
import { createClient } from '@supabase/supabase-js';

// Tenta obter as variáveis de ambiente de diferentes fontes (Vite ou Node/CRA)
const getEnvVar = (key: string, viteKey: string): string => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey]) {
    // @ts-ignore
    return import.meta.env[viteKey];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  return '';
};

// Configuração fornecida pelo usuário
const PROVIDED_URL = "https://xppbvxnzwrnonwfwbtda.supabase.co";
const PROVIDED_KEY = "sb_publishable_G5SMcF-Q47s-xmrg5k0h8w_NOeT6Riu";

// Prioriza variáveis de ambiente se existirem, senão usa as fornecidas
const SUPABASE_URL = getEnvVar('SUPABASE_URL', 'VITE_SUPABASE_URL') || PROVIDED_URL;
const SUPABASE_KEY = getEnvVar('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY') || PROVIDED_KEY;

export const isSupabaseConfigured = () => {
  return SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;
};

export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : ({} as any);

export const checkConnection = async (): Promise<{ connected: boolean; message: string }> => {
  if (!isSupabaseConfigured()) {
    return { connected: false, message: 'Supabase não configurado (Modo Local)' };
  }

  try {
    // Lista de tabelas críticas para verificar
    const tablesToCheck = ['app_users', 'settings', 'time_entries', 'expenses', 'advances'];
    
    // Verifica cada tabela tentando buscar 0 linhas (apenas head)
    for (const table of tablesToCheck) {
      const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      
      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01') {
           return { connected: false, message: `Falta tabela: ${table}` };
        }
        return { connected: false, message: `Erro na tabela ${table}: ${error.message}` };
      }
    }

    return { connected: true, message: 'Supabase Online (Integrado)' };
  } catch (err: any) {
    return { connected: false, message: 'Erro de rede ou configuração' };
  }
};
