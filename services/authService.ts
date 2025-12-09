import { User } from '../types';

const USERS_KEY = 'app_users';
const SESSION_KEY = 'app_session';

// Initialize default admin if not exists
const initializeAuth = () => {
  const users = localStorage.getItem(USERS_KEY);
  if (!users) {
    const defaultAdmin: User = {
      id: '1',
      username: 'ADM',
      password: '123456', // In a real app, this should be hashed
      name: 'Administrador',
      role: 'admin',
      isFirstLogin: true,
      isActive: true
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([defaultAdmin]));
  }
};

initializeAuth();

export const authService = {
  getUsers: (): User[] => {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
  },

  saveUsers: (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  login: (username: string, password: string): { success: boolean; user?: User; error?: string } => {
    const users = authService.getUsers();
    const user = users.find(u => u.username.toUpperCase() === username.toUpperCase() && u.isActive);

    if (user && user.password === password) {
      const { password, ...safeUser } = user; // Remove password from session
      localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
      return { success: true, user: user }; // Return full user (with isFirstLogin check)
    }

    return { success: false, error: 'Usuário ou senha inválidos.' };
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  changePassword: (userId: string, newPassword: string) => {
    const users = authService.getUsers();
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return { ...u, password: newPassword, isFirstLogin: false };
      }
      return u;
    });
    authService.saveUsers(updatedUsers);
    
    // Update session if it's the current user
    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...currentUser, isFirstLogin: false }));
    }
  },

  createUser: (user: Omit<User, 'id'>) => {
    const users = authService.getUsers();
    if (users.some(u => u.username.toUpperCase() === user.username.toUpperCase())) {
      throw new Error('Nome de usuário já existe.');
    }
    const newUser: User = { ...user, id: crypto.randomUUID() };
    users.push(newUser);
    authService.saveUsers(users);
  },

  updateUser: (user: User) => {
    const users = authService.getUsers();
    const updatedUsers = users.map(u => u.id === user.id ? user : u);
    authService.saveUsers(updatedUsers);
  },

  deleteUser: (id: string) => {
    let users = authService.getUsers();
    // Prevent deleting the last admin
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete?.username === 'ADM') {
        throw new Error('Não é possível excluir o administrador padrão.');
    }
    users = users.filter(u => u.id !== id);
    authService.saveUsers(users);
  }
};
