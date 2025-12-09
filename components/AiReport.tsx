import React, { useState } from 'react';
import { generateReport } from '../services/geminiService';
import { TimeEntry, ExpenseEntry, AdvanceEntry, Period } from '../types';
import { Sparkles, Loader2, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AiReportProps {
  period: Period;
  entries: TimeEntry[];
  expenses: ExpenseEntry[];
  advances: AdvanceEntry[];
  totalEarnings: number;
  totalExpenses: number;
  hourlyRate: number;
  userName: string;
  totalFund: number;
}

export const AiReport: React.FC<AiReportProps> = ({
  period,
  entries,
  expenses,
  advances,
  totalEarnings,
  totalExpenses,
  hourlyRate,
  userName,
  totalFund
}) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    const result = await generateReport(
      period,
      entries,
      expenses,
      advances,
      totalEarnings,
      totalExpenses,
      hourlyRate,
      userName,
      totalFund
    );
    setReport(result);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              Relatório Inteligente Gemini
            </h2>
            <p className="mt-2 text-indigo-100 max-w-xl">
              Utilize inteligência artificial para analisar sua quinzena. Receba insights sobre produtividade,
              saúde financeira e análise do fundo de despesas.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? 'Analisando...' : 'Gerar Relatório'}
          </button>
        </div>
      </div>

      {report && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
           <div className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </div>
      )}

      {!report && !loading && (
         <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
            <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-500">Nenhum relatório gerado ainda</h3>
            <p className="text-slate-400">Clique no botão acima para iniciar a análise.</p>
         </div>
      )}
    </div>
  );
};