import { TimeEntry, ExpenseEntry, Period } from '../types';

export const formatCurrency = (value: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('pt-BR').format(date);
};

export const calculateDuration = (start: string, end: string): number => {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  const startDate = new Date(0, 0, 0, startH, startM, 0);
  const endDate = new Date(0, 0, 0, endH, endM, 0);
  
  let diff = endDate.getTime() - startDate.getTime();
  if (diff < 0) diff = 0; 
  
  return diff / 1000 / 60 / 60; // Returns hours
};

export const calculateNetDuration = (
  start: string, 
  lunchStart: string, 
  lunchEnd: string, 
  dinnerStart: string | undefined, 
  dinnerEnd: string | undefined, 
  end: string
): number => {
  const getMinutes = (time: string | undefined) => {
    if (!time) return null;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const startM = getMinutes(start);
  const lunchStartM = getMinutes(lunchStart);
  const lunchEndM = getMinutes(lunchEnd);
  const dinnerStartM = getMinutes(dinnerStart);
  const dinnerEndM = getMinutes(dinnerEnd);
  const endM = getMinutes(end);

  // Basic validation: Start, Lunch times and End are generally required based on UI, 
  // but we can be robust. Assuming Lunch is required as per previous UI.
  if (startM === null || lunchStartM === null || lunchEndM === null || endM === null) {
    return 0;
  }

  // Validate Start -> Lunch
  if (lunchStartM < startM || lunchEndM < lunchStartM) {
    return 0;
  }

  let totalMinutes = 0;
  
  // Morning block
  totalMinutes += (lunchStartM - startM);

  // Afternoon/Evening block handling
  if (dinnerStartM !== null && dinnerEndM !== null) {
    // With Dinner: LunchEnd -> DinnerStart AND DinnerEnd -> End
    // Validate order: LunchEnd < DinnerStart < DinnerEnd < End
    if (dinnerStartM < lunchEndM || dinnerEndM < dinnerStartM || endM < dinnerEndM) {
      return 0;
    }
    totalMinutes += (dinnerStartM - lunchEndM);
    totalMinutes += (endM - dinnerEndM);
  } else {
    // No Dinner: LunchEnd -> End
    if (endM < lunchEndM) {
      return 0;
    }
    totalMinutes += (endM - lunchEndM);
  }

  return totalMinutes / 60;
};

export const calculateHoursBreakdown = (totalHours: number, limit: number = 8) => {
  const regularHours = Math.min(totalHours, limit);
  const overtimeHours = Math.max(0, totalHours - limit);
  return { regularHours, overtimeHours };
};

export const generatePeriods = (): Period[] => {
  const periods: Period[] = [];
  const startYear = 2025;
  const endYear = 2026;
  
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 0; month < 12; month++) {
      const d = new Date(year, month, 1);
      const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(d);
      
      // 1st Fortnight: 1-15
      periods.push({
        id: `${year}-${month + 1}-1`,
        label: `1ª Quinzena ${monthName}/${year}`,
        startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        endDate: `${year}-${String(month + 1).padStart(2, '0')}-15`,
      });

      // 2nd Fortnight: 16-End
      const lastDay = new Date(year, month + 1, 0).getDate();
      periods.push({
        id: `${year}-${month + 1}-2`,
        label: `2ª Quinzena ${monthName}/${year}`,
        startDate: `${year}-${String(month + 1).padStart(2, '0')}-16`,
        endDate: `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`,
      });
    }
  }
  return periods;
};

export const filterByPeriod = <T extends { date: string }>(items: T[], period: Period): T[] => {
  return items.filter(item => {
    return item.date >= period.startDate && item.date <= period.endDate;
  });
};