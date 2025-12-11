import { User } from '../../types';
import { StorageProvider } from '../providers/StorageProvider';
import { DB_KEYS } from '../config/keys';
import { supabase, isSupabaseConfigured } from '../supabase/client';

export const UserRepository = {
  getAll: async (): Promise<User[]> => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('app_users').select('*');
      if (error) {
        console.error('Supabase Error:', error);
        return [];
      }
      // Mapear campos do banco (snake_case) para camelCase se necessário, 
      // mas neste caso ajustamos os tipos ou assumimos mapeamento direto.
      // O SQL foi criado para bater com os tipos exceto snake_case.
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
    return StorageProvider.get<User[]>(DB_KEYS.USERS, []);
  },

  getById: async (id: string): Promise<User | undefined> => {
    const users = await UserRepository.getAll();
    return users.find(u => u.id === id);
  },

  create: async (user: User): Promise<void> => {
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
      if (error) console.error('Error creating user:', error);
    } else {
      const users = StorageProvider.get<User[]>(DB_KEYS.USERS, []);
      users.push(user);
      StorageProvider.set(DB_KEYS.USERS, users);
    }
  },

  update: async (user: User): Promise<void> => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('app_users').update({
        username: user.username,
        password: user.password,
        name: user.name,
        role: user.role,
        is_first_login: user.isFirstLogin,
        is_active: user.isActive
      }).eq('id', user.id);
      if (error) console.error('Error updating user:', error);
    } else {
      const users = StorageProvider.get<User[]>(DB_KEYS.USERS, []);
      const index = users.findIndex(u => u.id === user.id);
      if (index !== -1) {
        users[index] = user;
        StorageProvider.set(DB_KEYS.USERS, users);
      }
    }
  },

  delete: async (id: string): Promise<void> => {
    if (isSupabaseConfigured()) {
       await supabase.from('app_users').delete().eq('id', id);
    } else {
      const users = StorageProvider.get<User[]>(DB_KEYS.USERS, []);
      const filtered = users.filter(u => u.id !== id);
      StorageProvider.set(DB_KEYS.USERS, filtered);
    }
  },
  
  // Session Management (Mantém LocalStorage pois é sessão local do navegador)
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