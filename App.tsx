import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Clock, 
  Receipt, 
  Sparkles, 
  Wallet, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  User as UserIcon,
  FileDown,
  LogOut,
  Users,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { TimeEntry, ExpenseEntry, AdvanceEntry, AppSettings, Tab, Period, User } from './types';
import { generatePeriods, filterByPeriod, formatCurrency, calculateHoursBreakdown, formatNumber } from './utils/formatters';
import { authService } from './services/authService';
import { FinancialRepository } from './database/repositories/FinancialRepository';
import { SummaryCard } from './components/SummaryCard';
import { TimeSheet } from './components/TimeSheet';
import { ExpenseTracker } from './components/ExpenseTracker';
import { AiReport } from './components/AiReport';
import { UserManagement } from './components/UserManagement';
import { Login } from './components/Login';
import { exportToPDF } from './services/pdfExportService';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export default function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initialize auth
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // App State
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  
  // Data State - Now initialized empty
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [advances, setAdvances] = useState<AdvanceEntry[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);

  const [periods] = useState<Period[]>(generatePeriods());
  
  const currentPeriodIndex = useMemo(() => {
    const now = new Date();
    const currentStr = now.toISOString().split('T')[0];
    const idx = periods.findIndex(p => currentStr >= p.startDate && currentStr <= p.endDate);
    return idx !== -1 ? idx : periods.length - 2;
  }, [periods]);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(periods[currentPeriodIndex]?.id);

  // Load Data Async on Mount (or when user changes)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const loadedSettings = await FinancialRepository.getSettings();
        const loadedTime = await FinancialRepository.getTimeEntries();
        const loadedExpenses = await FinancialRepository.getExpenses();
        const loadedAdvances = await FinancialRepository.getAdvances();
        
        setSettings(loadedSettings);
        setTimeEntries(loadedTime);
        setExpenseEntries(loadedExpenses);
        setAdvances(loadedAdvances);
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (currentUser) {
       loadData();
    }
  }, [currentUser]);

  // Persistence logic - We wrap these to ensure we don't save null/empty states during load
  // IMPORTANT: For Supabase, auto-save on every state change can be heavy (too many requests).
  // Ideally we should use explicit save actions, but to keep app structure we'll debounce or just allow it for now.
  useEffect(() => {
    if (!isLoading && settings) FinancialRepository.saveSettings(settings);
  }, [settings, isLoading]);

  useEffect(() => {
    if (!isLoading && timeEntries.length > 0) FinancialRepository.saveTimeEntries(timeEntries);
  }, [timeEntries, isLoading]);

  useEffect(() => {
    if (!isLoading && expenseEntries.length > 0) FinancialRepository.saveExpenses(expenseEntries);
  }, [expenseEntries, isLoading]);

  useEffect(() => {
    if (!isLoading && advances.length > 0) FinancialRepository.saveAdvances(advances);
  }, [advances, isLoading]);

  // Sync Logged User Name with Settings
  useEffect(() => {
    if (currentUser && settings && currentUser.name !== settings.userName) {
      setSettings(prev => prev ? ({ ...prev, userName: currentUser.name }) : null);
    }
  }, [currentUser, settings?.userName]); // added settings?.userName check to avoid loop

  // Derived Data
  const selectedPeriod = periods.find(p => p.id === selectedPeriodId) || periods[0];
  const filteredTime = useMemo(() => filterByPeriod(timeEntries, selectedPeriod), [timeEntries, selectedPeriod]);
  const filteredExpenses = useMemo(() => filterByPeriod(expenseEntries, selectedPeriod), [expenseEntries, selectedPeriod]);
  const filteredAdvances = useMemo(() => filterByPeriod(advances, selectedPeriod), [advances, selectedPeriod]);

  const totalHours = filteredTime.reduce((acc, curr) => acc + curr.totalHours, 0);
  // const totalRegular = filteredTime.reduce((acc, curr) => acc + curr.regularHours, 0);
  const totalOvertime = filteredTime.reduce((acc, curr) => acc + curr.overtimeHours, 0);
  const totalEarnings = filteredTime.reduce((acc, curr) => acc + curr.earnings, 0);
  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalAdvances = filteredAdvances.reduce((acc, curr) => acc + curr.amount, 0);
  
  // Safe access for settings
  const totalFund = settings?.expenseFund || 0;
  const fundBalance = totalFund - totalExpenses;
  const netEarnings = totalEarnings - totalAdvances;
  const currentCurrency = settings?.currency || 'EUR';
  const currentUserName = settings?.userName || 'User';

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const days = new Map<string, { name: string; ganhos: number; despesas: number }>();
    
    filteredTime.forEach(t => {
      const day = t.date.split('-')[2];
      if (!days.has(day)) days.set(day, { name: day, ganhos: 0, despesas: 0 });
      days.get(day)!.ganhos += t.earnings;
    });

    filteredExpenses.forEach(e => {
       const day = e.date.split('-')[2];
       if (!days.has(day)) days.set(day, { name: day, ganhos: 0, despesas: 0 });
       days.get(day)!.despesas += e.amount;
    });

    return Array.from(days.values()).sort((a,b) => Number(a.name) - Number(b.name));
  }, [filteredTime, filteredExpenses]);

  const pieChartData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    filteredExpenses.forEach(e => {
      const current = categoryMap.get(e.category) || 0;
      categoryMap.set(e.category, current + e.amount);
    });
    
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab(Tab.DASHBOARD);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setSettings(null);
    setTimeEntries([]);
    setExpenseEntries([]);
    setAdvances([]);
  };

  const handleAddTime = (entry: TimeEntry) => {
    setTimeEntries(prev => [...prev, entry]);
    // Also explicitly save/add to DB could happen here, but useEffect handles "saveTimeEntries"
  };
  const handleDeleteTime = (id: string) => {
    setTimeEntries(prev => prev.filter(e => e.id !== id));
    FinancialRepository.deleteTimeEntry(id); // Explicit delete needed for Supabase
  };
  
  const handleAddExpense = (entry: ExpenseEntry) => setExpenseEntries(prev => [...prev, entry]);
  const handleDeleteExpense = (id: string) => {
    setExpenseEntries(prev => prev.filter(e => e.id !== id));
    FinancialRepository.deleteExpense(id);
  };

  const handleAddAdvance = (entry: AdvanceEntry) => setAdvances(prev => [...prev, entry]);
  const handleDeleteAdvance = (id: string) => {
    setAdvances(prev => prev.filter(a => a.id !== id));
    FinancialRepository.deleteAdvance(id);
  };

  const updateRates = (regularRate: number, overtimeRate: number) => {
    if (!settings) return;
    setSettings({ ...settings, hourlyRate: regularRate, overtimeRate });
    const updatedEntries = timeEntries.map(entry => {
      let regularHours, overtimeHours;
      if (entry.isHoliday) {
        regularHours = 0;
        overtimeHours = entry.totalHours;
      } else {
        const breakdown = calculateHoursBreakdown(entry.totalHours, 8);
        regularHours = breakdown.regularHours;
        overtimeHours = breakdown.overtimeHours;
      }
      return {
        ...entry,
        regularHours,
        overtimeHours,
        earnings: (regularHours * regularRate) + (overtimeHours * overtimeRate)
      };
    });
    setTimeEntries(updatedEntries);
  };

  const handleExportPDF = () => {
    if(settings) exportToPDF(filteredTime, filteredExpenses, filteredAdvances, selectedPeriod, settings);
  };

  // --- RENDER LOGIN IF NOT AUTHENTICATED ---
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // --- RENDER LOADING ---
  if (isLoading || !settings) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
           <div className="text-center">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Carregando dados...</p>
           </div>
        </div>
     );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-slate-300 hidden md:flex flex-col fixed h-full shadow-xl z-20">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-blue-500" />
            Quinzenal<span className="text-blue-500">Pro</span>
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab(Tab.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === Tab.DASHBOARD ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-700'}`}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab(Tab.TIMESHEET)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === Tab.TIMESHEET ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-700'}`}
          >
            <Clock size={20} /> Horas
          </button>
          <button 
            onClick={() => setActiveTab(Tab.EXPENSES)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === Tab.EXPENSES ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-700'}`}
          >
            <Receipt size={20} /> Despesas
          </button>
           <button 
            onClick={() => setActiveTab(Tab.AI_REPORT)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === Tab.AI_REPORT ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' : 'hover:bg-slate-700'}`}
          >
            <Sparkles size={20} /> Gemini Report
          </button>

          {currentUser.role === 'admin' && (
             <button 
               onClick={() => setActiveTab(Tab.USERS)}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === Tab.USERS ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-700'}`}
             >
               <Users size={20} /> Introdução de User
             </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-4">
          <div className="flex items-center gap-3 mb-2 px-2">
             <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold">
               {currentUser.name.charAt(0)}
             </div>
             <div className="overflow-hidden">
               <p className="text-sm font-semibold text-white truncate">{currentUser.name}</p>
               <p className="text-xs text-slate-400 capitalize">{currentUser.role === 'admin' ? 'Administrador' : 'Colaborador'}</p>
             </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors text-sm"
          >
            <LogOut size={16} /> Sair
          </button>

          {/* Configuration Inputs */}
          {settings && (
            <div className="pt-4 border-t border-slate-700 space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1 block">Nome do Colaborador (Relatório)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input 
                    type="text" 
                    value={settings.userName}
                    onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1 block">Valor Hora Normal (8h)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500">€</span>
                  <input 
                    type="number" 
                    value={settings.hourlyRate}
                    onChange={(e) => updateRates(Number(e.target.value), settings.overtimeRate)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-orange-400 mb-1 block">Valor Hora Extra</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500">€</span>
                  <input 
                    type="number" 
                    value={settings.overtimeRate}
                    onChange={(e) => updateRates(settings.hourlyRate, Number(e.target.value))}
                    className="w-full bg-slate-700 border border-orange-900/50 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 mb-1 block">Fundo Fixo (Base)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500">€</span>
                  <input 
                    type="number" 
                    value={settings.expenseFund}
                    onChange={(e) => setSettings({ ...settings, expenseFund: Number(e.target.value) })}
                    className="w-full bg-slate-700 border border-indigo-900/50 rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm">
           <span className="font-bold text-lg">QuinzenalPro</span>
           <div className="flex gap-2">
             <button onClick={() => setActiveTab(Tab.DASHBOARD)} className="p-2 bg-slate-100 rounded-lg"><LayoutDashboard size={20}/></button>
             <button onClick={() => setActiveTab(Tab.TIMESHEET)} className="p-2 bg-slate-100 rounded-lg"><Clock size={20}/></button>
             <button onClick={handleLogout} className="p-2 bg-slate-100 rounded-lg text-red-500"><LogOut size={20}/></button>
           </div>
        </div>

        {/* Top Bar / Period Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {activeTab === Tab.DASHBOARD && 'Visão Geral'}
              {activeTab === Tab.TIMESHEET && 'Controle de Horas'}
              {activeTab === Tab.EXPENSES && 'Gestão de Despesas'}
              {activeTab === Tab.AI_REPORT && 'Inteligência Financeira'}
              {activeTab === Tab.USERS && 'Introdução de User'}
            </h2>
            <p className="text-slate-500 text-sm">Controle de {currentUserName} (8h diárias + Extras).</p>
          </div>
          
          {activeTab !== Tab.USERS && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium"
                title="Exportar PDF"
              >
                <FileDown className="w-4 h-4 text-red-600" />
                <span className="hidden md:inline">Exportar PDF</span>
              </button>
              
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                <Calendar className="w-4 h-4 text-slate-400" />
                <select 
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
                >
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Content */}
        {activeTab === Tab.DASHBOARD && settings && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard 
                title="Horas Extras" 
                value={`${formatNumber(totalOvertime)}h`} 
                icon={Clock} 
                colorClass="bg-orange-500" 
                subValue={`De ${formatNumber(totalHours)}h totais`}
              />
              <SummaryCard 
                title="A Receber (Líquido)" 
                value={formatCurrency(netEarnings, currentCurrency)} 
                icon={DollarSign} 
                colorClass="bg-emerald-500" 
                subValue={`Bruto: ${formatCurrency(totalEarnings, currentCurrency)} - Adiant: ${formatCurrency(totalAdvances, currentCurrency)}`}
              />
              <SummaryCard 
                title="Saldo Fundo Despesas" 
                value={formatCurrency(fundBalance, currentCurrency)} 
                icon={Wallet} 
                colorClass={fundBalance >= 0 ? "bg-indigo-500" : "bg-red-500"}
                subValue={`Restante de ${formatCurrency(totalFund, currentCurrency)}`}
              />
              <SummaryCard 
                title="Total Despesas" 
                value={formatCurrency(totalExpenses, currentCurrency)} 
                icon={TrendingDown} 
                colorClass="bg-rose-500" 
                subValue="Gastos do Período"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96 relative">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Fluxo Financeiro Diário</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value, currentCurrency)} />
                    <Tooltip 
                      cursor={{fill: '#f1f5f9'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => formatCurrency(value, currentCurrency)}
                    />
                    <Legend />
                    <Bar dataKey="ganhos" name="Valor (Extras)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="despesas" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
                {chartData.length === 0 && (
                   <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-white/50">
                      Sem dados para exibir no gráfico
                   </div>
                )}
              </div>

              {/* Pie Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96 relative">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Despesas por Categoria</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value, currentCurrency)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                  </PieChart>
                </ResponsiveContainer>
                {pieChartData.length === 0 && (
                   <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-white/50">
                      Sem despesas para exibir
                   </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Other Tabs */}
        {activeTab === Tab.TIMESHEET && settings && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <TimeSheet 
              entries={filteredTime} 
              period={selectedPeriod} 
              hourlyRate={settings.hourlyRate}
              overtimeRate={settings.overtimeRate}
              currency={settings.currency}
              onAdd={handleAddTime}
              onDelete={handleDeleteTime}
            />
          </div>
        )}

        {activeTab === Tab.EXPENSES && settings && (
           <div className="animate-in slide-in-from-right-4 duration-300">
            <ExpenseTracker 
              expenses={filteredExpenses}
              advances={filteredAdvances}
              period={selectedPeriod}
              baseExpenseFund={settings.expenseFund}
              onUpdateBaseFund={(val) => setSettings(prev => prev ? ({ ...prev, expenseFund: val }) : null)}
              currency={settings.currency}
              onAdd={handleAddExpense}
              onDelete={handleDeleteExpense}
              onAddAdvance={handleAddAdvance}
              onDeleteAdvance={handleDeleteAdvance}
              userName={settings.userName}
            />
          </div>
        )}

        {activeTab === Tab.AI_REPORT && settings && (
          <div className="animate-in fade-in duration-500">
            <AiReport 
              period={selectedPeriod}
              entries={filteredTime}
              expenses={filteredExpenses}
              advances={filteredAdvances}
              totalEarnings={totalEarnings}
              totalExpenses={totalExpenses}
              hourlyRate={settings.hourlyRate}
              userName={settings.userName}
              totalFund={totalFund}
            />
          </div>
        )}

        {activeTab === Tab.USERS && currentUser.role === 'admin' && (
           <div className="animate-in fade-in duration-500">
             <UserManagement />
           </div>
        )}

      </main>
    </div>
  );
}