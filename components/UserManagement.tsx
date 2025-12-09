import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { UserPlus, Trash2, RefreshCw, Users, Shield, User as UserIcon, CheckCircle, X } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'user' as 'admin' | 'user'
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(authService.getUsers());
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      authService.createUser({
        ...formData,
        isFirstLogin: true,
        isActive: true
      });
      loadUsers();
      setIsAdding(false);
      setFormData({ name: '', username: '', password: '', role: 'user' });
      showSuccess('Usuário criado com sucesso!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        authService.deleteUser(id);
        loadUsers();
        showSuccess('Usuário excluído com sucesso.');
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleResetPassword = (id: string) => {
    if (confirm('Resetar senha para "123456" e forçar troca no próximo login?')) {
        authService.changePassword(id, '123456');
        const allUsers = authService.getUsers();
        const updated = allUsers.map(u => u.id === id ? { ...u, isFirstLogin: true } : u);
        authService.saveUsers(updated);
        loadUsers();
        showSuccess('Senha resetada para "123456" com sucesso.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in relative">
      
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300">
           <CheckCircle className="w-6 h-6" />
           <div>
             <h4 className="font-bold text-sm">Sucesso</h4>
             <p className="text-xs text-emerald-100">{successMessage}</p>
           </div>
           <button onClick={() => setSuccessMessage('')} className="ml-2 hover:bg-emerald-700 rounded-full p-1 transition-colors">
             <X className="w-4 h-4" />
           </button>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
           <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             <Users className="w-5 h-5 text-blue-600" />
             Base de Dados / RCM (Usuários)
           </h2>
           <p className="text-sm text-slate-500">Gerencie o acesso de colaboradores e administradores.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isAdding ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          <UserPlus className="w-4 h-4" />
          {isAdding ? 'Cancelar' : 'Novo Usuário'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 animate-in slide-in-from-top-4">
           <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                 <h3 className="font-semibold text-slate-700 mb-4">Cadastrar Novo Colaborador</h3>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Usuário (Login)</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Senha Inicial</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Perfil de Acesso</label>
                <select 
                   className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                   value={formData.role}
                   onChange={e => setFormData({...formData, role: e.target.value as 'admin' | 'user'})}
                >
                  <option value="user">Colaborador (Padrão)</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {error && (
                <div className="md:col-span-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="md:col-span-2 flex justify-end">
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Salvar Usuário
                </button>
              </div>
           </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
               <tr>
                  <th className="px-6 py-3">Colaborador</th>
                  <th className="px-6 py-3">Login</th>
                  <th className="px-6 py-3">Perfil</th>
                  <th className="px-6 py-3 text-center">Ações</th>
               </tr>
            </thead>
            <tbody>
               {users.map(user => (
                 <tr key={user.id} className="border-b hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                       <div className={`p-1.5 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                          {user.role === 'admin' ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                       </div>
                       {user.name}
                    </td>
                    <td className="px-6 py-4">{user.username}</td>
                    <td className="px-6 py-4">
                       <span className={`text-xs px-2 py-1 rounded border ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                         {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                       <button 
                         onClick={() => handleResetPassword(user.id)}
                         className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                         title="Resetar Senha"
                       >
                         <RefreshCw className="w-4 h-4" />
                       </button>
                       {user.username !== 'ADM' && (
                         <button 
                           onClick={() => handleDelete(user.id)}
                           className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                           title="Excluir"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       )}
                    </td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );
};
