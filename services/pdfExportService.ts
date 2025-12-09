import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TimeEntry, ExpenseEntry, AdvanceEntry, Period, AppSettings } from '../types';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';

// PLACEHOLDER: Substitua a string abaixo pelo Base64 real do seu logo Agimus.
// Você pode gerar isso em sites como "base64-image.de" ou "imagetobase64.com".
// Exemplo curto apenas para não quebrar o código (é um pixel transparente):
const AGIMUS_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAADsQAAA7EAZUrDhsAAAAHSURBVFjD7cEBDQAAAMKg909tDwcFAAAAAAAA4GMq4AABW080hAAAAABJRU5ErkJggg==";

export const exportToPDF = (
  timeEntries: TimeEntry[], 
  expenseEntries: ExpenseEntry[],
  advanceEntries: AdvanceEntry[],
  period: Period, 
  settings: AppSettings
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // --- Header ---
  
  // 1. Header Background (Restored for white text visibility)
  doc.setFillColor(30, 41, 59); 
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // 2. Add Logo (Top Right)
  const logoWidth = 50;
  const logoHeight = 15;
  const logoX = pageWidth - 14 - logoWidth; // Right align: Page Width - Margin - Logo Width

  try {
    doc.addImage(AGIMUS_LOGO_BASE64, 'PNG', logoX, 10, logoWidth, logoHeight);
  } catch (e) {
    console.warn("Logo placeholder used or invalid base64");
  }

  // 3. Title (Top Left)
  doc.setTextColor(255, 255, 255); // White
  doc.setFontSize(22);
  // Aligned with the logo area
  doc.text('Relatório Quinzenal', 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255); // White
  doc.text(`${settings.userName} - ${period.label}`, 14, 28);

  // Adjust starting Y for content
  let currentY = 55;

  // --- Resumo Financeiro ---
  const totalRegular = timeEntries.reduce((acc, curr) => acc + curr.regularHours, 0);
  const totalOvertime = timeEntries.reduce((acc, curr) => acc + curr.overtimeHours, 0);
  const totalEarnings = timeEntries.reduce((acc, curr) => acc + curr.earnings, 0);
  const totalExpenses = expenseEntries.reduce((acc, curr) => acc + curr.amount, 0);
  const totalAdvances = advanceEntries.reduce((acc, curr) => acc + curr.amount, 0);
  
  // New Logic: 
  // 1. Net Earnings = Earnings - Advances
  // 2. Fund Balance = Fixed Fund - Expenses
  const netEarnings = totalEarnings - totalAdvances;
  const fixedFund = settings.expenseFund || 0;
  // const fundBalance = fixedFund - totalExpenses; // Not shown in table anymore

  // Sum required for column (Horas + Despesas)
  const grossPlusExpenses = totalEarnings + totalExpenses;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.text('Resumo Financeiro', 14, currentY);
  currentY += 10;

  // Combined Summary Table
  // Changed logic: Removed H. Extras, renamed columns as requested
  autoTable(doc, {
    startY: currentY,
    head: [['Horas', 'Despesas', 'Horas + Despesas', 'Adiantamentos']],
    body: [[
      formatCurrency(totalEarnings, settings.currency),
      formatCurrency(totalExpenses, settings.currency),
      formatCurrency(grossPlusExpenses, settings.currency),
      formatCurrency(totalAdvances, settings.currency)
    ]],
    theme: 'plain',
    headStyles: { 
      fillColor: [241, 245, 249], 
      textColor: [71, 85, 105], 
      fontStyle: 'bold', 
      halign: 'right',
      fontSize: 9 
    },
    bodyStyles: { halign: 'right', fontSize: 10 },
    columnStyles: {
      2: { fontStyle: 'bold', textColor: [16, 185, 129] }, // Green (Index shifted due to removal of H.Extras)
      3: { textColor: [234, 88, 12] } // Orange for Advances
    },
    styles: { cellPadding: 4 },
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 10;

  // Total Geral Calculation: A Receber + Despesas
  const totalGeneral = netEarnings + totalExpenses;

  // Visual Box for Total
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(14, currentY, pageWidth - 28, 12, 1, 1, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.setFont("helvetica", "bold");
  // Changed text as requested
  doc.text('TOTAL GERAL:', 18, currentY + 8);
  
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(formatCurrency(totalGeneral, settings.currency), pageWidth - 20, currentY + 8, { align: 'right' });
  doc.setFont("helvetica", "normal");

  currentY += 22;

  // --- Tabela de Horas ---
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Horas Efetuadas (Detalhes)', 14, currentY);
  currentY += 5;

  // Prepare footer data
  const timeTotalHours = timeEntries.reduce((acc, t) => acc + t.totalHours, 0);
  const timeTotalOvertime = timeEntries.reduce((acc, t) => acc + t.overtimeHours, 0);
  const timeTotalValue = timeEntries.reduce((acc, t) => acc + t.earnings, 0);

  const timeRows = timeEntries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(entry => {
      let timeString = `${entry.startTime} - ${entry.lunchStartTime || '?'}\nAlmoço\n${entry.lunchEndTime} - ${entry.endTime}`;
      if (entry.dinnerStartTime && entry.dinnerEndTime) {
        timeString = `${entry.startTime} - ${entry.lunchStartTime}\nAlmoço\n${entry.lunchEndTime} - ${entry.dinnerStartTime}\nJantar\n${entry.dinnerEndTime} - ${entry.endTime}`;
      }
      
      const dateLabel = entry.isHoliday 
        ? `${formatDate(entry.date)} (Feriado)` 
        : formatDate(entry.date);

      return [
        dateLabel,
        timeString,
        entry.description,
        formatNumber(entry.totalHours) + 'h',
        entry.overtimeHours > 0 ? `+${formatNumber(entry.overtimeHours)}h` : '-',
        formatCurrency(entry.earnings, settings.currency)
      ];
    });

  autoTable(doc, {
    startY: currentY,
    head: [['Data', 'Horários', 'Descrição', 'Total', 'Extras', 'Valor']],
    body: timeRows,
    foot: [[
      'TOTAIS', 
      '', 
      '', 
      formatNumber(timeTotalHours) + 'h', 
      timeTotalOvertime > 0 ? `+${formatNumber(timeTotalOvertime)}h` : '-', 
      formatCurrency(timeTotalValue, settings.currency)
    ]],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], textColor: 255 }, // blue-600
    footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', halign: 'right' }, // slate-100
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 35 },
      3: { halign: 'right' },
      4: { halign: 'right', textColor: [234, 88, 12] }, // orange-600
      5: { halign: 'right', textColor: [5, 150, 105] } // emerald-600
    },
    styles: { fontSize: 9, valign: 'middle' },
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 20;

  // --- Tabela de Adiantamentos (Se houver) ---
  if (advanceEntries.length > 0) {
    // Check if page break is needed
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Adiantamento (Detalhes)', 14, currentY);
    currentY += 5;

    const advRows = advanceEntries
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(entry => [
        formatDate(entry.date),
        entry.description || 'Adiantamento',
        formatCurrency(entry.amount, settings.currency)
      ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Data', 'Descrição', 'Valor (Desconto)']],
      body: advRows,
      foot: [[
        'Total Adiantamento', 
        '', 
        formatCurrency(totalAdvances, settings.currency)
      ]],
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12], textColor: 255 }, // orange-600
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', halign: 'right' },
      columnStyles: {
        2: { halign: 'right', textColor: [234, 88, 12] }
      },
      styles: { fontSize: 9 },
    });
     
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 20;
  }

  // --- Tabela de Despesas ---
  // Check if page break is needed
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text('Despesas (Detalhes)', 14, currentY);
  currentY += 5;

  const expenseRows = expenseEntries
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(entry => [
      formatDate(entry.date),
      entry.agNumber || '-',
      entry.category,
      entry.description,
      formatCurrency(entry.amount, settings.currency)
    ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Data', 'Nº AG', 'Categoria', 'Descrição', 'Valor']],
    body: expenseRows,
    foot: [[
      'TOTAL', 
      '', 
      '',
      '', 
      formatCurrency(totalExpenses, settings.currency)
    ]],
    theme: 'grid',
    headStyles: { fillColor: [225, 29, 72], textColor: 255 }, // rose-600
    footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', halign: 'right' },
    columnStyles: {
      4: { halign: 'right', textColor: [225, 29, 72] }
    },
    styles: { fontSize: 9 },
  });

  // Save the PDF
  doc.save(`relatorio_${period.id}_${settings.userName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};

export const exportFilteredExpensesToPDF = (
  expenses: ExpenseEntry[],
  period: Period,
  currency: string,
  userName: string,
  filters: { ag: string; category: string }
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header Background
  doc.setFillColor(225, 29, 72); // rose-600
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Logo
  const logoWidth = 50;
  const logoHeight = 15;
  const logoX = pageWidth - 14 - logoWidth;
  try {
    doc.addImage(AGIMUS_LOGO_BASE64, 'PNG', logoX, 10, logoWidth, logoHeight);
  } catch (e) {}

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('Relatório de Despesas', 14, 20);
  
  doc.setFontSize(12);
  doc.text(`${userName} - ${period.label}`, 14, 28);
  
  // Filter info
  let filterText = "Filtros aplicados: ";
  const parts = [];
  if (filters.ag) parts.push(`Nº AG: ${filters.ag}`);
  if (filters.category) parts.push(`Categoria: ${filters.category}`);
  if (parts.length === 0) filterText += "Nenhum (Todas as despesas)";
  else filterText += parts.join(' | ');

  doc.setFontSize(10);
  doc.text(filterText, 14, 36);

  let currentY = 55;

  const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const rows = expenses
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(entry => [
      formatDate(entry.date),
      entry.agNumber || '-',
      entry.category,
      entry.description,
      formatCurrency(entry.amount, currency)
    ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Data', 'Nº AG', 'Categoria', 'Descrição', 'Valor']],
    body: rows,
    foot: [[
      'TOTAL FILTRADO', 
      '', 
      '',
      '', 
      formatCurrency(total, currency)
    ]],
    theme: 'grid',
    headStyles: { fillColor: [225, 29, 72], textColor: 255 }, 
    footStyles: { fillColor: [255, 241, 242], textColor: [225, 29, 72], fontStyle: 'bold' },
    columnStyles: {
      4: { halign: 'right', textColor: [225, 29, 72] }
    },
    styles: { fontSize: 9 },
  });

  doc.save(`despesas_${period.id}_${filters.ag ? 'ag'+filters.ag : ''}.pdf`);
};