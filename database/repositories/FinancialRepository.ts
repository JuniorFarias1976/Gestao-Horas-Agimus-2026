import { TimeEntry, ExpenseEntry, AdvanceEntry, AppSettings } from '../../types';
import { StorageProvider } from '../providers/StorageProvider';
import { DB_KEYS } from '../config/keys';

const DEFAULT_SETTINGS: AppSettings = {
  hourlyRate: 0,
  overtimeRate: 8,
  dailyLimit: 8,
  currency: 'EUR',
  userName: 'Colaborador',
  expenseFund: 0,
};

export const FinancialRepository = {
  // Settings
  getSettings: (): AppSettings => {
    const settings = StorageProvider.get<AppSettings>(DB_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...settings };
  },
  
  saveSettings: (settings: AppSettings): void => {
    StorageProvider.set(DB_KEYS.SETTINGS, settings);
  },

  // Time Entries
  getTimeEntries: (): TimeEntry[] => {
    const entries = StorageProvider.get<TimeEntry[]>(DB_KEYS.TIME_ENTRIES, []);
    // Garantir integridade dos tipos ao carregar do JSON
    return entries.map((e: any) => ({
      ...e,
      isHoliday: e.isHoliday || false,
      regularHours: e.regularHours ?? Math.min(e.totalHours, 8),
      overtimeHours: e.overtimeHours ?? Math.max(0, e.totalHours - 8)
    }));
  },

  saveTimeEntries: (entries: TimeEntry[]): void => {
    StorageProvider.set(DB_KEYS.TIME_ENTRIES, entries);
  },

  // Expenses
  getExpenses: (): ExpenseEntry[] => {
    return StorageProvider.get<ExpenseEntry[]>(DB_KEYS.EXPENSES, []);
  },

  saveExpenses: (expenses: ExpenseEntry[]): void => {
    StorageProvider.set(DB_KEYS.EXPENSES, expenses);
  },

  // Advances
  getAdvances: (): AdvanceEntry[] => {
    return StorageProvider.get<AdvanceEntry[]>(DB_KEYS.ADVANCES, []);
  },

  saveAdvances: (advances: AdvanceEntry[]): void => {
    StorageProvider.set(DB_KEYS.ADVANCES, advances);
  }
};