import { User } from '../../types';
import { StorageProvider } from '../providers/StorageProvider';
import { DB_KEYS } from '../config/keys';

export const UserRepository = {
  getAll: (): User[] => {
    return StorageProvider.get<User[]>(DB_KEYS.USERS, []);
  },

  saveAll: (users: User[]): void => {
    StorageProvider.set(DB_KEYS.USERS, users);
  },

  getById: (id: string): User | undefined => {
    const users = UserRepository.getAll();
    return users.find(u => u.id === id);
  },

  create: (user: User): void => {
    const users = UserRepository.getAll();
    users.push(user);
    UserRepository.saveAll(users);
  },

  update: (user: User): void => {
    const users = UserRepository.getAll();
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users[index] = user;
      UserRepository.saveAll(users);
    }
  },

  delete: (id: string): void => {
    const users = UserRepository.getAll();
    const filtered = users.filter(u => u.id !== id);
    UserRepository.saveAll(filtered);
  },
  
  // Session Management
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