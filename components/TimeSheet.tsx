
import React, { useState, useEffect, useMemo } from 'react';
import { TimeEntry, Period } from '../types';
import { Plus, Trash2, Clock, AlertCircle, CalendarDays, BarChart3, List, Utensils, FileDown } from 'lucide-react';
import { calculateNetDuration, calculateHoursBreakdown, formatCurrency, formatDate, formatNumber } from '../utils/formatters';
import { exportToCSV } from '../services/csvExportService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

interface TimeSheetProps {
  entries: TimeEntry[];
  period: Period;
  hourlyRate: number;
  overtimeRate: number;
  currency: string;
  userId: string;
  onAdd: (entry: TimeEntry) => void;
  onDelete: (id: string) => void;
}

export const TimeSheet: React.FC<TimeSheetProps> = ({ entries, period, hourlyRate, overtimeRate, currency, userId, onAdd, onDelete }) => {
  const [date, setDate] = useState('');
  const [start, setStart] = useState('10:00');
  const [lunchStart, setLunchStart] = useState('12:00');
  const [lunchEnd, setLunchEnd] = useState('13:00');
  const [dinnerStart, setDinnerStart] = useState('');
  const [dinnerEnd, setDinnerEnd] = useState('');
  const [end, setEnd] = useState('19:00');
  const [description, setDescription] = useState('');
  const [isHoliday, setIsHoliday] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);

  // Auto-detect weekend when date changes
  useEffect(() => {
    if (date) {
      const dayOfWeek = new Date(date).getDay();
      // 0 is Sunday, 6 is Saturday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        setIsHoliday(true);
      } else {
        setIsHoliday(false);
      }
    }
  }, [date]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date) return;
    
    // Check for duplicates
    if (entries.some(entry => entry.date === date)) {
      setError('Já existe um registro para esta data. Exclua o anterior para inserir um novo.');
      return;
    }

    const totalHours = calculateNetDuration(
      start, 
      lunchStart, 
      lunchEnd, 
      dinnerStart || undefined, 
      dinnerEnd || undefined, 
      end
    );
    
    if (totalHours <= 0) {
      setError('Horários inválidos. Verifique a sequência: Início < Almoço < Jantar < Fim.');
      return;
    }

    let regularHours = 0;
    let overtimeHours = 0;

    if (isHoliday) {
       // If it is a holiday/weekend, ALL hours are treated as "Extra" (Full Value)
       // Meaning no 8h deduction.
       regularHours = 0;
       overtimeHours = totalHours;
    } else {
       // Normal day: 8h limit
       const breakdown = calculateHoursBreakdown(totalHours, 8);
       regularHours = breakdown.regularHours;
       overtimeHours = breakdown.overtimeHours;
    }
    
    // Earnings: Regular Rate * Regular Hours + Overtime Rate * Overtime Hours
    const earnings = (regularHours * hourlyRate) + (overtimeHours * overtimeRate);

    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      userId,
      date,
      startTime: start,
      lunchStartTime: lunchStart,
      lunchEndTime: lunchEnd,
      dinnerStartTime: dinnerStart || undefined,
      dinnerEndTime: dinnerEnd || undefined,
      endTime: end,
      description,
      totalHours: Number(totalHours.toFixed(2)),
      regularHours: Number(regularHours.toFixed(2)),
      overtimeHours: Number(overtimeHours.toFixed(2)),
      earnings: Number(earnings.toFixed(2)),
      isHoliday,
    };

    onAdd(newEntry);
    setDescription('');
    // Keep times for easier entry
  };

  const fillDinnerHours = (e: React.MouseEvent) => {
    e.preventDefault();
    setDinnerStart('20:00');
    setDinnerEnd('21:00');
  };

  const handleExportCSV = () => {
    const dataToExport = entries.map(e => ({
      Data: e.date,
      Entrada: e.startTime,
      SaidaAlmoco: e.lunchStartTime,
      VoltaAlmoco: e.lunchEndTime,
      SaidaJantar: e.dinnerStartTime || '',
      VoltaJantar: e.dinnerEndTime || '',
      Saida: e.endTime,
      TotalHoras: e.totalHours,
      HorasNormais: e.regularHours,
      HorasExtras: e.overtimeHours,
      ValorGanho: e.earnings,
      FeriadoFDS: e.isHoliday ? 'SIM' : 'NAO',
      Descricao: e.description
    }));
    exportToCSV(dataToExport, `horas_${period.id}.csv`);
  };

  // Calculate totals
  const totals = entries.reduce((acc, curr) => ({
    hours: acc.hours + curr.totalHours,
    overtime: acc.overtime + curr.overtimeHours,
    earnings: acc.earnings + curr.earnings
  }), { hours: 0, overtime: 0, earnings: 0 });

  // Chart Data
  const chartData = useMemo(() => {
    return [...entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(entry => ({
        name: formatDate(entry.date).split('/')[0], // Day only
        fullDate: formatDate(entry.date),
        regular: entry.regularHours,
        overtime: entry.overtimeHours,
        total: entry.totalHours
      }));
  }, [entries]);

  // Common input class for dark theme inputs
  const inputClass = "w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400";

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Registrar Horas
          </h3>
          <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>Base: 8h diárias (excl. almoço/jantar). Feriados/Fim de semana = Valor Inteiro.</span>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
            <input
              type="date"
              required
              min={period.startDate}
              max={period.endDate}
              className={`${inputClass} [color-scheme:dark]`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          
          <div className="md:col-span-2 flex items-center h-[38px] pb-1">
             <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={isHoliday}
                  onChange={(e) => setIsHoliday(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-slate-500 bg-slate-700 focus:ring-purple-500"
                />
                <span className={`text-xs font-medium ${isHoliday ? 'text-purple-600 font-bold' : 'text-slate-500'}`}>
                   Fim de Semana / Feriado
                </span>
             </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Entrada</label>
            <input
              type="time"
              required
              className={`${inputClass} [color-scheme:dark]`}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Saída Almoço</label>
            <input
              type="time"
              required
              className={`${inputClass} [color-scheme:dark]`}
              value={lunchStart}
              onChange={(e) => setLunchStart(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Volta Almoço</label>
            <input
              type="time"
              required
              className={`${inputClass} [color-scheme:dark]`}
              value={lunchEnd}
              onChange={(e) => setLunchEnd(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Saída</label>
            <input
              type="time"
              required
              className={`${inputClass} [color-scheme:dark]`}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          
          <div className="md:col-span-1 flex items-end">
             <button
               onClick={fillDinnerHours}
               className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 p-2 rounded-lg flex items-center justify-center transition-colors h-[38px] mb-[1px]"
               title="Preencher Jantar (20:00 - 21:00)"
             >
               <Utensils className="w-4 h-4" />
             </button>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Saída Jantar</label>
            <input
              type="time"
              className={`${inputClass} [color-scheme:dark]`}
              value={dinnerStart}
              onChange={(e) => setDinnerStart(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Volta Jantar</label>
            <input
              type="time"
              className={`${inputClass} [color-scheme:dark]`}
              value={dinnerEnd}
              onChange={(e) => setDinnerEnd(e.target.value)}
            />
          </div>
          
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label>
            <input
              type="text"
              placeholder="Ex: Trabalho..."
              required
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors shadow-lg shadow-blue-900/20 h-[38px]"
              title="Adicionar"
            >
              <Plus className="w-5 h-5 mr-1" /> Registrar
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header Toggle */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">
             Registros do Período
           </h4>
           <div className="flex gap-2">
             <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 text-xs font-medium bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                title="Exportar CSV"
             >
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline">CSV</span>
             </button>

             <button 
               onClick={() => setShowChart(!showChart)}
               className="flex items-center gap-2 text-xs font-medium bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
             >
               {showChart ? <List className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
               {showChart ? 'Ver Lista' : 'Ver Gráfico'}
             </button>
           </div>
        </div>

        {showChart ? (
          <div className="p-6 h-80 animate-in fade-in duration-300">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(label, payload) => payload[0]?.payload.fullDate || label}
                    formatter={(value: number) => [`${formatNumber(value)}h`, '']}
                  />
                  <Legend />
                  <Bar dataKey="regular" name="Horas Normais (8h)" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={30} />
                  <Bar dataKey="overtime" name="Horas Extras" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
             </ResponsiveContainer>
             {chartData.length === 0 && (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                   Sem dados para exibir
                </div>
             )}
          </div>
        ) : (
          <div className="overflow-x-auto animate-in fade-in duration-300">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                <tr>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Horários</th>
                  <th className="px-6 py-3">Descrição</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-right text-orange-600">Extras</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                  <th className="px-6 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      Nenhum registro encontrado nesta quinzena.
                    </td>
                  </tr>
                ) : (
                  entries.sort((a,b) => b.date.localeCompare(a.date)).map((entry) => (
                    <tr key={entry.id} className={`bg-white border-b hover:bg-slate-50 ${entry.isHoliday ? 'bg-purple-50/30' : ''}`}>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {formatDate(entry.date)}
                        {entry.isHoliday && (
                          <span className="block text-[10px] text-purple-600 font-bold uppercase mt-1 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> Feriado/FDS
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                          <div className="flex flex-col text-xs space-y-1">
                             <div>
                               <span className="font-medium text-slate-700">{entry.startTime} - {entry.lunchStartTime || '?'}</span>
                             </div>
                             <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-wider">
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span> Almoço
                             </div>
                             {entry.dinnerStartTime && entry.dinnerEndTime ? (
                               <>
                                 <div>
                                   <span className="font-medium text-slate-700">{entry.lunchEndTime} - {entry.dinnerStartTime}</span>
                                 </div>
                                 <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-wider">
                                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span> Jantar
                                 </div>
                                 <div>
                                    <span className="font-medium text-slate-700">{entry.dinnerEndTime} - {entry.endTime}</span>
                                 </div>
                               </>
                             ) : (
                               <div>
                                 <span className="font-medium text-slate-700">{entry.lunchEndTime} - {entry.endTime}</span>
                               </div>
                             )}
                          </div>
                      </td>
                      <td className="px-6 py-4">{entry.description}</td>
                      <td className="px-6 py-4 text-right">{formatNumber(entry.totalHours)}h</td>
                      <td className="px-6 py-4 text-right font-medium text-orange-600">
                        {entry.overtimeHours > 0 ? `+${formatNumber(entry.overtimeHours)}h` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600">
                        {formatCurrency(entry.earnings, currency)}
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
              {entries.length > 0 && (
                <tfoot className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-right">Totais do Período:</td>
                    <td className="px-6 py-4 text-right">{formatNumber(totals.hours)}h</td>
                    <td className="px-6 py-4 text-right text-orange-600">{totals.overtime > 0 ? `+${formatNumber(totals.overtime)}h` : '-'}</td>
                    <td className="px-6 py-4 text-right text-emerald-600">{formatCurrency(totals.earnings, currency)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
