import { TimeEntry, ExpenseEntry, AdvanceEntry, AppSettings } from '../../types';
import { StorageProvider } from '../providers/StorageProvider';
import { DB_KEYS } from '../config/keys';
import { supabase, isSupabaseConfigured } from '../supabase/client';

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
  getSettings: async (): Promise<AppSettings> => {
    if (isSupabaseConfigured()) {
       const { data } = await supabase.from('settings').select('*').limit(1).single();
       if (data) {
         return {
           hourlyRate: data.hourly_rate,
           overtimeRate: data.overtime_rate,
           dailyLimit: data.daily_limit,
           currency: data.currency,
           userName: data.user_name,
           expenseFund: data.expense_fund
         };
       }
       return DEFAULT_SETTINGS;
    }
    const settings = StorageProvider.get<AppSettings>(DB_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...settings };
  },
  
  saveSettings: async (settings: AppSettings): Promise<void> => {
    if (isSupabaseConfigured()) {
       // Tenta pegar o ID primeiro ou assume que só tem 1 linha
       const { data } = await supabase.from('settings').select('id').limit(1);
       const payload = {
          hourly_rate: settings.hourlyRate,
          overtime_rate: settings.overtimeRate,
          daily_limit: settings.dailyLimit,
          currency: settings.currency,
          user_name: settings.userName,
          expense_fund: settings.expenseFund
       };

       if (data && data.length > 0) {
          await supabase.from('settings').update(payload).eq('id', data[0].id);
       } else {
          await supabase.from('settings').insert(payload);
       }
    } else {
      StorageProvider.set(DB_KEYS.SETTINGS, settings);
    }
  },

  // Time Entries
  getTimeEntries: async (): Promise<TimeEntry[]> => {
    if (isSupabaseConfigured()) {
       const { data, error } = await supabase.from('time_entries').select('*');
       if (error) return [];
       return data.map((e: any) => ({
         id: e.id,
         date: e.date,
         startTime: e.start_time,
         lunchStartTime: e.lunch_start_time,
         lunchEndTime: e.lunch_end_time,
         dinnerStartTime: e.dinner_start_time,
         dinnerEndTime: e.dinner_end_time,
         endTime: e.end_time,
         description: e.description,
         totalHours: e.total_hours,
         regularHours: e.regular_hours,
         overtimeHours: e.overtime_hours,
         earnings: e.earnings,
         isHoliday: e.is_holiday
       }));
    }
    const entries = StorageProvider.get<TimeEntry[]>(DB_KEYS.TIME_ENTRIES, []);
    return entries.map((e: any) => ({
      ...e,
      isHoliday: e.isHoliday || false,
      regularHours: e.regularHours ?? Math.min(e.totalHours, 8),
      overtimeHours: e.overtimeHours ?? Math.max(0, e.totalHours - 8)
    }));
  },

  // Save All logic (Full Sync for simplicity in migration)
  // Warning: In a real large app, you would use upsert individually
  saveTimeEntries: async (entries: TimeEntry[]): Promise<void> => {
    if (isSupabaseConfigured()) {
       // Strategy: Upsert all.
       const payload = entries.map(e => ({
         id: e.id,
         date: e.date,
         start_time: e.startTime,
         lunch_start_time: e.lunchStartTime,
         lunch_end_time: e.lunchEndTime,
         dinner_start_time: e.dinnerStartTime,
         dinner_end_time: e.dinnerEndTime,
         end_time: e.endTime,
         description: e.description,
         total_hours: e.totalHours,
         regular_hours: e.regularHours,
         overtime_hours: e.overtimeHours,
         earnings: e.earnings,
         is_holiday: e.isHoliday
       }));
       
       // Note: This does not delete removed entries if using "Save All" logic from App.tsx
       // For a perfect sync, we would delete entries not in this list, but that's risky without transactions.
       // We will rely on upsert. If an item is deleted in UI, we should call delete explicitly.
       if (payload.length > 0) {
         await supabase.from('time_entries').upsert(payload);
       }
    } else {
      StorageProvider.set(DB_KEYS.TIME_ENTRIES, entries);
    }
  },
  
  // Explicit delete for Supabase
  deleteTimeEntry: async (id: string): Promise<void> => {
      if (isSupabaseConfigured()) {
          await supabase.from('time_entries').delete().eq('id', id);
      }
      // Local storage handled by saveTimeEntries rewriting the array
  },

  // Expenses
  getExpenses: async (): Promise<ExpenseEntry[]> => {
    if (isSupabaseConfigured()) {
       const { data, error } = await supabase.from('expenses').select('*');
       if (error) return [];
       return data.map((e: any) => ({
          id: e.id,
          date: e.date,
          amount: e.amount,
          category: e.category,
          description: e.description,
          agNumber: e.ag_number
       }));
    }
    return StorageProvider.get<ExpenseEntry[]>(DB_KEYS.EXPENSES, []);
  },

  saveExpenses: async (expenses: ExpenseEntry[]): Promise<void> => {
    if (isSupabaseConfigured()) {
       const payload = expenses.map(e => ({
          id: e.id,
          date: e.date,
          amount: e.amount,
          category: e.category,
          description: e.description,
          ag_number: e.agNumber
       }));
       if (payload.length > 0) {
         await supabase.from('expenses').upsert(payload);
       }
    } else {
      StorageProvider.set(DB_KEYS.EXPENSES, expenses);
    }
  },

  deleteExpense: async (id: string): Promise<void> => {
    if (isSupabaseConfigured()) {
        await supabase.from('expenses').delete().eq('id', id);
    }
  },

  // Advances
  getAdvances: async (): Promise<AdvanceEntry[]> => {
    if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('advances').select('*');
        if (error) return [];
        return data;
    }
    return StorageProvider.get<AdvanceEntry[]>(DB_KEYS.ADVANCES, []);
  },

  saveAdvances: async (advances: AdvanceEntry[]): Promise<void> => {
    if (isSupabaseConfigured()) {
        const payload = advances.map(a => ({
            id: a.id,
            date: a.date,
            amount: a.amount,
            description: a.description
        }));
        if (payload.length > 0) {
            await supabase.from('advances').upsert(payload);
        }
    } else {
      StorageProvider.set(DB_KEYS.ADVANCES, advances);
    }
  },

  deleteAdvance: async (id: string): Promise<void> => {
    if (isSupabaseConfigured()) {
        await supabase.from('advances').delete().eq('id', id);
    }
  }
};