
import { User } from '../../types';
import { StorageProvider } from '../providers/StorageProvider';
import { DB_KEYS } from '../config/keys';
import { supabase, isSupabaseConfigured } from '../supabase/client';

export const UserRepository = {
  getAll: async (): Promise<User[]> => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('app_users').select('*');
      
      if (!error && data) {
        return data.map((u: any) => ({
          id: u.id,
          username: u.username,
          password: u.password,
          name: u.name,
          role: u.role,
          isFirstLogin: u.is_first_login,
          isActive: u.is_active
        }));
      }

      if (error) {
         // Se a tabela não existir (PGRST205), fazemos fallback para LocalStorage silenciosamente
         if (error.code === 'PGRST205' || error.code === '42P01') {
             console.warn('Supabase: Tabela "app_users" não encontrada. Usando LocalStorage.');
         } else {
             console.error('Supabase Error (getAll Users):', JSON.stringify(error, null, 2));
             return [];
         }
      }
    }
    return StorageProvider.get<User[]>(DB_KEYS.USERS, []);
  },

  getById: async (id: string): Promise<User | undefined> => {
    const users = await UserRepository.getAll();
    return users.find(u => u.id === id);
  },

  create: async (user: User): Promise<void> => {
    let successSupabase = false;

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('app_users').insert({
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        role: user.role,
        is_first_login: user.isFirstLogin,
        is_active: user.isActive
      });
      
      if (!error) {
        successSupabase = true;
      } else {
         if (error.code === 'PGRST205' || error.code === '42P01') {
             console.warn('Supabase: Falha ao criar usuário (Tabela inexistente). Usando LocalStorage.');
         } else {
             console.error('Supabase Error (Create User):', JSON.stringify(error, null, 2));
             return; // Erro real de API, aborta
         }
      }
    } 
    
    if (!successSupabase) {
      const users = StorageProvider.get<User[]>(DB_KEYS.USERS, []);
      users.push(user);
      StorageProvider.set(DB_KEYS.USERS, users);
    }
  },

  update: async (user: User): Promise<void> => {
    let successSupabase = false;

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('app_users').update({
        username: user.username,
        password: user.password,
        name: user.name,
        role: user.role,
        is_first_login: user.isFirstLogin,
        is_active: user.isActive
      }).eq('id', user.id);

      if (!error) {
        successSupabase = true;
      } else {
         if (error.code === 'PGRST205' || error.code === '42P01') {
            console.warn('Supabase: Falha ao atualizar (Tabela inexistente). Usando LocalStorage.');
         } else {
            console.error('Supabase Error (Update User):', JSON.stringify(error, null, 2));
            return;
         }
      }
    }
    
    if (!successSupabase) {
      const users = StorageProvider.get<User[]>(DB_KEYS.USERS, []);
      const index = users.findIndex(u => u.id === user.id);
      if (index !== -1) {
        users[index] = user;
        StorageProvider.set(DB_KEYS.USERS, users);
      }
    }
  },

  delete: async (id: string): Promise<void> => {
    let successSupabase = false;

    if (isSupabaseConfigured()) {
       const { error } = await supabase.from('app_users').delete().eq('id', id);
       if (!error) {
          successSupabase = true;
       } else {
          if (error.code === 'PGRST205' || error.code === '42P01') {
             console.warn('Supabase: Falha ao excluir (Tabela inexistente). Usando LocalStorage.');
          } else {
             console.error('Supabase Error (Delete User):', JSON.stringify(error, null, 2));
             return;
          }
       }
    }
    
    if (!successSupabase) {
      const users = StorageProvider.get<User[]>(DB_KEYS.USERS, []);
      const filtered = users.filter(u => u.id !== id);
      StorageProvider.set(DB_KEYS.USERS, filtered);
    }
  },
  
  getSession: (): User | null => {
    return StorageProvider.get<User | null>(DB_KEYS.SESSION, null);
  },

  setSession: (user: Omit<User, 'password'>): void => {
    StorageProvider.set(DB_KEYS.SESSION, user);
  },

  clearSession: (): void => {
    StorageProvider.remove(DB_KEYS.SESSION);
  }
};
