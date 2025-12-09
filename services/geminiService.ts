import { GoogleGenAI } from "@google/genai";
import { TimeEntry, ExpenseEntry, AdvanceEntry, Period } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatters';

export const generateReport = async (
  period: Period,
  entries: TimeEntry[],
  expenses: ExpenseEntry[],
  advances: AdvanceEntry[],
  totalEarnings: number,
  totalExpenses: number,
  hourlyRate: number,
  userName: string,
  totalFund: number
): Promise<string> => {
  
  if (!process.env.API_KEY) {
    return "API Key não configurada. Por favor, adicione sua chave de API.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Calculate totals for context
  const totalHours = entries.reduce((acc, curr) => acc + curr.totalHours, 0);
  const totalOvertime = entries.reduce((acc, curr) => acc + (curr.overtimeHours || 0), 0);
  const totalAdvances = advances.reduce((acc, curr) => acc + curr.amount, 0);
  
  // NEW LOGIC:
  const fundBalance = totalFund - totalExpenses; // Fixed Fund - Expenses
  const netEarnings = totalEarnings - totalAdvances; // Earnings - Advances

  const prompt = `
    Atue como um analista financeiro e de produtividade sênior.
    Analise os seguintes dados do colaborador "${userName}" (regime: 8h normais, paga-se apenas horas extras) para o período: ${period.label}.
    
    DADOS DE GANHOS E ADIANTAMENTOS:
    - O colaborador só recebe pagamento pelas HORAS EXTRAS (acima de 8h diárias).
    - EXCEÇÃO: Em Fins de Semana/Feriados, TODAS as horas são consideradas EXTRAS (Valor Inteiro).
    - Horas Totais Trabalhadas: ${formatNumber(totalHours)}h
    - Horas Extras Totais: ${formatNumber(totalOvertime)}h
    - Valor Bruto (Extras): ${formatCurrency(totalEarnings, 'EUR')}
    - (-) Total Adiantamentos: ${formatCurrency(totalAdvances, 'EUR')} (Descontados do salário)
    - (=) Valor Líquido a Receber: ${formatCurrency(netEarnings, 'EUR')}
    
    GESTAO DE FUNDO DE DESPESAS (Separado do Salário):
    - Fundo Fixo Disponível: ${formatCurrency(totalFund, 'EUR')}
    - Total de Despesas Realizadas: ${formatCurrency(totalExpenses, 'EUR')}
    - Saldo do Fundo (Fundo - Despesas): ${formatCurrency(fundBalance, 'EUR')}

    ADIANTAMENTOS (Impactam Salário):
    ${JSON.stringify(advances.map(a => ({ date: a.date, amount: a.amount, desc: a.description })))}

    REGISTROS DE TRABALHO:
    ${JSON.stringify(entries.map(e => ({ 
      date: e.date, 
      total: e.totalHours, 
      extra: e.overtimeHours,
      desc: e.description,
      isHoliday: e.isHoliday ? 'SIM (Feriado/FDS)' : 'Não'
    })))}

    DESPESAS (Impactam Fundo):
    ${JSON.stringify(expenses.map(e => ({ date: e.date, ag: e.agNumber, amount: e.amount, category: e.category, desc: e.description })))}

    Por favor, gere um relatório conciso em Markdown (português do Brasil) contendo:
    1. **Resumo Financeiro**: Confirme o valor líquido a receber (já descontando adiantamentos).
    2. **Análise do Fundo de Despesas**: Analise se o fundo fixo (${formatCurrency(totalFund, 'EUR')}) foi suficiente para cobrir os gastos.
    3. **Análise de Horas**: Breve comentário sobre a carga horária.
    4. **Dicas**: Sugestões financeiras.

    Mantenha o tom profissional e direto. Use emojis moderadamente.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar o relatório.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Ocorreu um erro ao conectar com a IA. Verifique sua chave de API e tente novamente.";
  }
};