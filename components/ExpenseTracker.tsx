import React, { useState } from 'react';
import { ExpenseEntry, AdvanceEntry, Period } from '../types';
import { Plus, Trash2, Receipt, PiggyBank, ArrowDownCircle, AlertCircle, Search, Filter, FileText } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportFilteredExpensesToPDF } from '../services/pdfExportService';

interface ExpenseTrackerProps {
  expenses: ExpenseEntry[];
  advances: AdvanceEntry[];
  period: Period;
  baseExpenseFund: number;
  onUpdateBaseFund: (value: number) => void;
  currency: string;
  onAdd: (entry: ExpenseEntry) => void;
  onDelete: (id: string) => void;
  onAddAdvance: (entry: AdvanceEntry) => void;
  onDeleteAdvance: (id: string) => void;
  userName: string;
}

// Updated categories as requested
const CATEGORIES = [
  'Pequeno Almoço',
  'Almoço',
  'Jantar',
  'Combustível',
  'Transporte',
  'Diversos'
];

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({ 
  expenses, 
  advances,
  period, 
  baseExpenseFund,
  onUpdateBaseFund,
  currency,
  onAdd, 
  onDelete,
  onAddAdvance,
  onDeleteAdvance,
  userName
}) => {
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [agNumber, setAgNumber] = useState('');

  // Advance state
  const [advDate, setAdvDate] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advDesc, setAdvDesc] = useState('');

  // Filter state
  const [filterAg, setFilterAg] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amount) return;

    const newEntry: ExpenseEntry = {
      id: crypto.randomUUID(),
      date,
      amount: parseFloat(amount),
      category,
      description,
      agNumber,
    };

    onAdd(newEntry);
    setAmount('');
    setDescription('');
    setAgNumber('');
  };

  const handleAdvanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advDate || !advAmount) return;

    const newAdvance: AdvanceEntry = {
      id: crypto.randomUUID(),
      date: advDate,
      amount: parseFloat(advAmount),
      description: advDesc
    };

    onAddAdvance(newAdvance);
    setAdvAmount('');
    setAdvDesc('');
  };

  // Fund Logic: Base Fund - Expenses
  const totalFund = baseExpenseFund;
  const totalUsed = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining = totalFund - totalUsed;
  const isOverBudget = remaining < 0;

  // Filter Logic
  const filteredExpensesList = expenses.filter(entry => {
    const matchesAg = filterAg === '' || (entry.agNumber && entry.agNumber.toLowerCase().includes(filterAg.toLowerCase()));
    const matchesCategory = filterCategory === '' || entry.category === filterCategory;
    return matchesAg && matchesCategory;
  });

  const filteredTotal = filteredExpensesList.reduce((acc, curr) => acc + curr.amount, 0);

  const handleExportFiltered = () => {
    exportFilteredExpensesToPDF(
      filteredExpensesList,
      period,
      currency,
      userName,
      { ag: filterAg, category: filterCategory }
    );
  };

  // Common styles for dark inputs
  const inputBaseClass = "w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-white text-sm outline-none placeholder-slate-400";

  return (
    <div className="space-y-6">
      
      {/* Fund Management Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
               <PiggyBank className="w-6 h-6" />
            </div>
            <div>
               <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Fundo de Despesas</h3>
               <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-800">
                    {formatCurrency(totalFund, currency)}
                  </span>
               </div>
               <div className="text-xs text-slate-400 mt-1">
                 Valor fixo quinzenal (Base)
               </div>
            </div>
         </div>
         
         <div className="flex gap-8 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8 w-full md:w-auto justify-around md:justify-start">
            <div>
               <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Utilizado</p>
               <p className="text-lg font-semibold text-rose-600">{formatCurrency(totalUsed, currency)}</p>
            </div>
            <div>
               <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">Restante</p>
               <p className={`text-lg font-semibold ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                 {formatCurrency(remaining, currency)}
               </p>
            </div>
         </div>
      </div>

      {/* Advance Management Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start mb-4">
           <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <ArrowDownCircle className="w-5 h-5 text-orange-600" />
            Adiantamentos de Salário
          </h3>
          <div className="text-xs text-slate-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 flex items-center gap-1">
             <AlertCircle className="w-3 h-3 text-orange-600" />
             <span className="text-orange-700 font-medium">Descontados do Valor a Receber</span>
          </div>
        </div>
        
        {/* Form */}
        <form onSubmit={handleAdvanceSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
            <input
              type="date"
              required
              min={period.startDate}
              max={period.endDate}
              className={`${inputBaseClass} focus:ring-2 focus:ring-orange-500 [color-scheme:dark]`}
              value={advDate}
              onChange={(e) => setAdvDate(e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">Valor (€)</label>
            <input
              type="number"
              step="0.01"
              required
              className={`${inputBaseClass} focus:ring-2 focus:ring-orange-500`}
              value={advAmount}
              onChange={(e) => setAdvAmount(e.target.value)}
            />
          </div>
          <div className="md:col-span-5">
             <label className="block text-xs font-medium text-slate-500 mb-1">Descrição (Opcional)</label>
             <input
              type="text"
              className={`${inputBaseClass} focus:ring-2 focus:ring-orange-500`}
              value={advDesc}
              onChange={(e) => setAdvDesc(e.target.value)}
            />
          </div>
          <div className="md:col-span-1">
             <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors shadow-lg shadow-orange-900/20"
              title="Registrar Adiantamento"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* List of Advances */}
        {advances.length > 0 && (
          <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold">
                <tr>
                   <th className="px-4 py-2">Data</th>
                   <th className="px-4 py-2">Descrição</th>
                   <th className="px-4 py-2 text-right">Valor</th>
                   <th className="px-4 py-2 text-center">Ação</th>
                </tr>
              </thead>
              <tbody>
                 {advances.sort((a,b) => b.date.localeCompare(a.date)).map(adv => (
                    <tr key={adv.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-100">
                       <td className="px-4 py-2 font-medium">{formatDate(adv.date)}</td>
                       <td className="px-4 py-2">{adv.description || '-'}</td>
                       <td className="px-4 py-2 text-right font-medium text-orange-600">-{formatCurrency(adv.amount, currency)}</td>
                       <td className="px-4 py-2 text-center">
                          <button onClick={() => onDeleteAdvance(adv.id)} className="text-red-400 hover:text-red-600 transition-colors">
                             <Trash2 className="w-3 h-3" />
                          </button>
                       </td>
                    </tr>
                 ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expense Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-rose-600" />
          Registrar Despesa / Saída
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
            <input
              type="date"
              required
              min={period.startDate}
              max={period.endDate}
              className={`${inputBaseClass} focus:ring-2 focus:ring-rose-500 [color-scheme:dark]`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Valor (€)</label>
            <input
              type="number"
              step="0.01"
              required
              className={`${inputBaseClass} focus:ring-2 focus:ring-rose-500`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Nº AG</label>
            <input
              type="text"
              placeholder="Ex: 123"
              className={`${inputBaseClass} focus:ring-2 focus:ring-rose-500`}
              value={agNumber}
              onChange={(e) => setAgNumber(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
            <select
              className={`${inputBaseClass} focus:ring-2 focus:ring-rose-500`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label>
            <input
              type="text"
              placeholder="Opcional"
              className={`${inputBaseClass} focus:ring-2 focus:ring-rose-500`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="md:col-span-1">
            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors shadow-lg shadow-rose-900/20"
              title="Adicionar"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-4">
           <div className="flex items-center gap-2 text-slate-500">
              <Filter className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Filtros</span>
           </div>
           
           <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input 
                type="text" 
                placeholder="Nº AG..." 
                className="pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none w-32 md:w-48 text-slate-700 bg-white"
                value={filterAg}
                onChange={(e) => setFilterAg(e.target.value)}
              />
           </div>

           <select
              className="py-1.5 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none w-40 md:w-56 text-slate-700 bg-white"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
           >
              <option value="">Todas as Categorias</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
           </select>

           {(filterAg || filterCategory) && (
             <button 
               onClick={() => { setFilterAg(''); setFilterCategory(''); }}
               className="ml-auto text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline"
             >
               Limpar Filtros
             </button>
           )}
        </div>

        {/* Total Summary Row */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex justify-end items-center gap-3">
          <button
            onClick={handleExportFiltered}
            disabled={filteredExpensesList.length === 0}
            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors mr-auto disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar Lista Filtrada (PDF)"
          >
            <FileText className="w-4 h-4" />
            Exportar Lista
          </button>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Filtrado</span>
          <span className="text-lg font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">
            {formatCurrency(filteredTotal, currency)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
              <tr>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Nº AG</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3 text-right">Valor</th>
                <th className="px-6 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpensesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    {expenses.length === 0 
                      ? "Nenhuma despesa registrada nesta quinzena." 
                      : "Nenhuma despesa encontrada com os filtros selecionados."}
                  </td>
                </tr>
              ) : (
                filteredExpensesList.sort((a,b) => b.date.localeCompare(a.date)).map((entry) => (
                  <tr key={entry.id} className="bg-white border-b hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{formatDate(entry.date)}</td>
                    <td className="px-6 py-4">{entry.agNumber || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-800 text-xs font-medium px-2.5 py-0.5 rounded border border-slate-200">
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">{entry.description}</td>
                    <td className="px-6 py-4 text-right font-medium text-rose-600">
                      {formatCurrency(entry.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
