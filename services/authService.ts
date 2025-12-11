import { User } from '../types';
import { UserRepository } from '../database/repositories/UserRepository';

// Initialize default admin if not exists
const initializeAuth = () => {
  const users = UserRepository.getAll();
  if (users.length === 0) {
    const defaultAdmin: User = {
      id: '1',
      username: 'ADM',
      password: '123456', // In a real app, this should be hashed
      name: 'Administrador',
      role: 'admin',
      isFirstLogin: true,
      isActive: true
    };
    UserRepository.create(defaultAdmin);
  }
};

initializeAuth();

export const authService = {
  getUsers: (): User[] => {
    return UserRepository.getAll();
  },

  saveUsers: (users: User[]) => {
    UserRepository.saveAll(users);
  },

  login: (username: string, password: string): { success: boolean; user?: User; error?: string } => {
    const users = UserRepository.getAll();
    const user = users.find(u => u.username.toUpperCase() === username.toUpperCase() && u.isActive);

    if (user && user.password === password) {
      const { password, ...safeUser } = user; // Remove password from session
      UserRepository.setSession(safeUser);
      return { success: true, user: user };
    }

    return { success: false, error: 'Usuário ou senha inválidos.' };
  },

  logout: () => {
    UserRepository.clearSession();
  },

  getCurrentUser: (): User | null => {
    return UserRepository.getSession();
  },

  changePassword: (userId: string, newPassword: string) => {
    const users = UserRepository.getAll();
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, password: newPassword, isFirstLogin: false };
      }
      return u;
    });
    UserRepository.saveAll(updatedUsers);
    
    // Update session if it's the current user
    const currentUser = UserRepository.getSession();
    if (currentUser && currentUser.id === userId) {
        UserRepository.setSession({ ...currentUser, isFirstLogin: false });
    }
  },

  createUser: (user: Omit<User, 'id'>) => {
    const users = UserRepository.getAll();
    if (users.some(u => u.username.toUpperCase() === user.username.toUpperCase())) {
      throw new Error('Nome de usuário já existe.');
    }
    const newUser: User = { ...user, id: crypto.randomUUID() };
    UserRepository.create(newUser);
  },

  updateUser: (user: User) => {
    UserRepository.update(user);
  },

  deleteUser: (id: string) => {
    const userToDelete = UserRepository.getById(id);
    if (userToDelete?.username === 'ADM') {
        throw new Error('Não é possível excluir o administrador padrão.');
    }
    UserRepository.delete(id);
  }
};