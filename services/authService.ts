
import { User } from '../types';
import { UserRepository } from '../database/repositories/UserRepository';

// Initialize default admin if not exists
const initializeAuth = async () => {
  try {
    const users = await UserRepository.getAll();
    if (users.length === 0) {
      const defaultAdmin: User = {
        id: crypto.randomUUID(), // Ensure unique ID generation
        username: 'ADM',
        password: '123456', 
        name: 'Administrador',
        role: 'admin',
        isFirstLogin: true,
        isActive: true
      };
      
      try {
         await UserRepository.create(defaultAdmin);
         console.log('Default Admin user created successfully.');
      } catch (createError) {
         console.error('Failed to create default admin:', createError);
      }
    }
  } catch (err) {
    console.error('Auth Service Initialization Error:', err);
  }
};

// Não podemos usar await no top-level em todos os ambientes, então chamamos sem await
initializeAuth();

export const authService = {
  getUsers: async (): Promise<User[]> => {
    return UserRepository.getAll();
  },

  saveUsers: async (users: User[]) => {
    // Em modo Supabase, saveAll não é eficiente, ideal seria updates individuais
    // Mas para manter compatibilidade com LocalStorage:
    for (const u of users) {
        await UserRepository.update(u); 
    }
  },

  login: async (username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const users = await UserRepository.getAll();
      const user = users.find(u => u.username.toUpperCase() === username.toUpperCase() && u.isActive);

      if (user && user.password === password) {
        const { password, ...safeUser } = user;
        UserRepository.setSession(safeUser);
        return { success: true, user: user };
      }

      return { success: false, error: 'Usuário ou senha inválidos.' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erro de conexão com o servidor.' };
    }
  },

  logout: () => {
    UserRepository.clearSession();
  },

  getCurrentUser: (): User | null => {
    return UserRepository.getSession();
  },

  changePassword: async (userId: string, newPassword: string) => {
    const users = await UserRepository.getAll();
    const user = users.find(u => u.id === userId);
    if (user) {
        const updatedUser = { ...user, password: newPassword, isFirstLogin: false };
        await UserRepository.update(updatedUser);
        
        // Update session if it's the current user
        const currentUser = UserRepository.getSession();
        if (currentUser && currentUser.id === userId) {
            UserRepository.setSession({ ...currentUser, isFirstLogin: false });
        }
    }
  },

  createUser: async (user: Omit<User, 'id'>) => {
    const users = await UserRepository.getAll();
    if (users.some(u => u.username.toUpperCase() === user.username.toUpperCase())) {
      throw new Error('Nome de usuário já existe.');
    }
    const newUser: User = { ...user, id: crypto.randomUUID() };
    await UserRepository.create(newUser);
  },

  updateUser: async (user: User) => {
    await UserRepository.update(user);
  },

  deleteUser: async (id: string) => {
    const userToDelete = await UserRepository.getById(id);
    if (userToDelete?.username === 'ADM') {
        throw new Error('Não é possível excluir o administrador padrão.');
    }
    await UserRepository.delete(id);
  }
};
