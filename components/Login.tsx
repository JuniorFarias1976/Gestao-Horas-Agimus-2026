import React, { useState } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { Lock, User as UserIcon, ArrowRight, ShieldCheck, Wallet, Loader2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [tempUser, setTempUser] = useState<User | null>(null);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.login(username, password);
      
      if (result.success && result.user) {
        if (result.user.isFirstLogin) {
          setIsFirstLogin(true);
          setTempUser(result.user);
        } else {
          onLoginSuccess(result.user);
        }
      } else {
        setError(result.error || 'Erro ao entrar.');
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (tempUser) {
      await authService.changePassword(tempUser.id, newPassword);
      const updatedUser = { ...tempUser, isFirstLogin: false };
      onLoginSuccess(updatedUser);
    }
    setLoading(false);
  };

  if (isFirstLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in fade-in zoom-in duration-300">
           <div className="text-center mb-8">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                 <ShieldCheck className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Troca de Senha</h2>
              <p className="text-slate-600 mt-2 text-sm">
                Por segurança, você deve alterar sua senha no primeiro acesso.
              </p>
           </div>

           <form onSubmit={handleChangePassword} className="space-y-4">
             <div>
               <label className="block text-sm font-bold text-slate-900 mb-1">Nova Senha</label>
               <input 
                 type="password"
                 className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-500 text-slate-900"
                 value={newPassword}
                 onChange={(e) => setNewPassword(e.target.value)}
                 required
               />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-900 mb-1">Confirmar Nova Senha</label>
               <input 
                 type="password"
                 className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-500 text-slate-900"
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
                 required
               />
             </div>

             {error && (
               <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                 {error}
               </div>
             )}

             <button 
               type="submit"
               disabled={loading}
               className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
             >
               {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <ArrowRight className="w-4 h-4" />}
               Salvar e Entrar
             </button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600 rounded-full blur-[120px]"></div>
      </div>

      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
           <div className="flex items-center justify-center gap-2 mb-2">
             <Wallet className="w-8 h-8 text-blue-600" />
             <h1 className="text-2xl font-bold text-slate-800">Quinzenal<span className="text-blue-600">Pro</span></h1>
           </div>
           <p className="text-slate-600 text-sm font-medium">Controle de Horas e Despesas</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
           <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-900 mb-1 ml-1">Usuário</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 transition-all text-slate-900 placeholder-slate-500 font-medium"
                    placeholder="Seu usuário de acesso"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-900 mb-1 ml-1">Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 transition-all text-slate-900 placeholder-slate-500 font-medium"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
           </div>

           {error && (
             <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-in fade-in">
               <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
               {error}
             </div>
           )}

           <button
             type="submit"
             disabled={loading}
             className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70"
           >
             {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <ArrowRight className="w-5 h-5" />}
             Acessar Sistema
           </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Acesso restrito para colaboradores autorizados.
          </p>
        </div>
      </div>
    </div>
  );
};