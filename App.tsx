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
  User,
  FileDown
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

import { TimeEntry, ExpenseEntry, AdvanceEntry, AppSettings, Tab, Period } from './types';
import { generatePeriods, filterByPeriod, formatCurrency, calculateHoursBreakdown, formatNumber } from './utils/formatters';
import { SummaryCard } from './components/SummaryCard';
import { TimeSheet } from './components/TimeSheet';
import { ExpenseTracker } from './components/ExpenseTracker';
import { AiReport } from './components/AiReport';
import { exportToPDF } from './services/pdfExportService';

const DEFAULT_SETTINGS: AppSettings = {
  hourlyRate: 0, // Default to 0 as requested (only extras are paid)
  overtimeRate: 8, // Requested 8 euros for extra hours
  dailyLimit: 8,
  currency: 'EUR',
  userName: 'Colaborador',
  expenseFund: 0,
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('settings');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    // Ensure new fields exist for migrated data
    return { ...DEFAULT_SETTINGS, ...parsed };
  });
  
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => {
    const saved = localStorage.getItem('timeEntries');
    const parsed = saved ? JSON.parse(saved) : [];
    // Migration for old entries
    return parsed.map((e: any) => ({
      ...e,
      isHoliday: e.isHoliday || false, // Default for migration
      regularHours: e.regularHours ?? Math.min(e.totalHours, 8),
      overtimeHours: e.overtimeHours ?? Math.max(0, e.totalHours - 8)
    }));
  });

  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>(() => {
    const saved = localStorage.getItem('expenseEntries');
    return saved ? JSON.parse(saved) : [];
  });

  const [advances, setAdvances] = useState<AdvanceEntry[]>(() => {
    const saved = localStorage.getItem('advances');
    return saved ? JSON.parse(saved) : [];
  });

  const [periods] = useState<Period[]>(generatePeriods());
  
  const currentPeriodIndex = useMemo(() => {
    const now = new Date();
    const currentStr = now.toISOString().split('T')[0];
    const idx = periods.findIndex(p => currentStr >= p.startDate && currentStr <= p.endDate);
    return idx !== -1 ? idx : periods.length - 2;
  }, [periods]);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(periods[currentPeriodIndex]?.id);

  // Persistence
  useEffect(() => localStorage.setItem('settings', JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem('timeEntries', JSON.stringify(timeEntries)), [timeEntries]);
  useEffect(() => localStorage.setItem('expenseEntries', JSON.stringify(expenseEntries)), [expenseEntries]);
  useEffect(() => localStorage.setItem('advances', JSON.stringify(advances)), [advances]);

  // Derived Data
  const selectedPeriod = periods.find(p => p.id === selectedPeriodId) || periods[0];
  const filteredTime = useMemo(() => filterByPeriod(timeEntries, selectedPeriod), [timeEntries, selectedPeriod]);
  const filteredExpenses = useMemo(() => filterByPeriod(expenseEntries, selectedPeriod), [expenseEntries, selectedPeriod]);
  const filteredAdvances = useMemo(() => filterByPeriod(advances, selectedPeriod), [advances, selectedPeriod]);

  const totalHours = filteredTime.reduce((acc, curr) => acc + curr.totalHours, 0);
  const totalRegular = filteredTime.reduce((acc, curr) => acc + curr.regularHours, 0);
  const totalOvertime = filteredTime.reduce((acc, curr) => acc + curr.overtimeHours, 0);
  const totalEarnings = filteredTime.reduce((acc, curr) => acc + curr.earnings, 0);
  const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalAdvances = filteredAdvances.reduce((acc, curr) => acc + curr.amount, 0);
  
  // NEW LOGIC:
  // Total Fund = Base Setting (Fixed)
  const totalFund = settings.expenseFund;
  
  // Fund Balance = Fund - Expenses
  const fundBalance = totalFund - totalExpenses;

  // Net Receivable = Earnings (from extras) - Advances
  const netEarnings = totalEarnings - totalAdvances;

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
  const handleAddTime = (entry: TimeEntry) => setTimeEntries([...timeEntries, entry]);
  const handleDeleteTime = (id: string) => setTimeEntries(timeEntries.filter(e => e.id !== id));
  
  const handleAddExpense = (entry: ExpenseEntry) => setExpenseEntries([...expenseEntries, entry]);
  const handleDeleteExpense = (id: string) => setExpenseEntries(expenseEntries.filter(e => e.id !== id));

  const handleAddAdvance = (entry: AdvanceEntry) => setAdvances([...advances, entry]);
  const handleDeleteAdvance = (id: string) => setAdvances(advances.filter(a => a.id !== id));

  const updateRates = (regularRate: number, overtimeRate: number) => {
    setSettings({ ...settings, hourlyRate: regularRate, overtimeRate });
    
    // Recalculate earnings for ALL entries when rates change
    const updatedEntries = timeEntries.map(entry => {
      let regularHours, overtimeHours;
      
      // Respect Holiday Logic
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
    exportToPDF(filteredTime, filteredExpenses, filteredAdvances, selectedPeriod, settings);
  };

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
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1 block">Nome do Colaborador</label>
            <div className="relative">
               <span className="absolute left-3 top-2.5 text-slate-500">
                 <User className="w-4 h-4" />
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm">
           <span className="font-bold text-lg">QuinzenalPro</span>
           <div className="flex gap-2">
             <button onClick={() => setActiveTab(Tab.DASHBOARD)} className="p-2 bg-slate-100 rounded-lg"><LayoutDashboard size={20}/></button>
             <button onClick={() => setActiveTab(Tab.TIMESHEET)} className="p-2 bg-slate-100 rounded-lg"><Clock size={20}/></button>
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
            </h2>
            <p className="text-slate-500 text-sm">Controle de {settings.userName} (8h diárias + Extras).</p>
          </div>
          
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
        </div>

        {/* Dashboard Content */}
        {activeTab === Tab.DASHBOARD && (
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
                value={formatCurrency(netEarnings, settings.currency)} 
                icon={DollarSign} 
                colorClass="bg-emerald-500" 
                subValue={`Bruto: ${formatCurrency(totalEarnings, settings.currency)} - Adiant: ${formatCurrency(totalAdvances, settings.currency)}`}
              />
              <SummaryCard 
                title="Saldo Fundo Despesas" 
                value={formatCurrency(fundBalance, settings.currency)} 
                icon={Wallet} 
                colorClass={fundBalance >= 0 ? "bg-indigo-500" : "bg-red-500"}
                subValue={`Restante de ${formatCurrency(totalFund, settings.currency)}`}
              />
              <SummaryCard 
                title="Total Despesas" 
                value={formatCurrency(totalExpenses, settings.currency)} 
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
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value, settings.currency)} />
                    <Tooltip 
                      cursor={{fill: '#f1f5f9'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => formatCurrency(value, settings.currency)}
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
                      formatter={(value: number) => formatCurrency(value, settings.currency)}
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
        {activeTab === Tab.TIMESHEET && (
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

        {activeTab === Tab.EXPENSES && (
           <div className="animate-in slide-in-from-right-4 duration-300">
            <ExpenseTracker 
              expenses={filteredExpenses}
              advances={filteredAdvances}
              period={selectedPeriod}
              baseExpenseFund={settings.expenseFund}
              onUpdateBaseFund={(val) => setSettings(prev => ({ ...prev, expenseFund: val }))}
              currency={settings.currency}
              onAdd={handleAddExpense}
              onDelete={handleDeleteExpense}
              onAddAdvance={handleAddAdvance}
              onDeleteAdvance={handleDeleteAdvance}
              userName={settings.userName}
            />
          </div>
        )}

        {activeTab === Tab.AI_REPORT && (
          <div className="animate-in fade-in duration-500">
            <AiReport 
              period={selectedPeriod}
              entries={filteredTime}
              expenses={filteredExpenses}
              advances={filteredAdvances}
              totalEarnings={totalEarnings}
              totalExpenses={totalExpenses}
              hourlyRate={settings.hourlyRate} // Note: This might be 0, report will adapt
              userName={settings.userName}
              totalFund={totalFund}
            />
          </div>
        )}
      </main>
    </div>
  );
}