
import { TimeEntry, ExpenseEntry, AdvanceEntry, AppSettings } from '../../types';
import { StorageProvider } from '../providers/StorageProvider';
import { DB_KEYS } from '../config/keys';
import { supabase, isSupabaseConfigured } from '../supabase/client';

const DEFAULT_SETTINGS: Omit<AppSettings, 'userId'> = {
  hourlyRate: 0,
  overtimeRate: 8,
  dailyLimit: 8,
  currency: 'EUR',
  userName: 'Colaborador',
  expenseFund: 0,
};

// Helper to ensure we always work with arrays, even if legacy data is malformed or an object
const getSafeArray = <T>(key: string): T[] => {
  const data = StorageProvider.get<any>(key, []);
  if (Array.isArray(data)) {
    return data;
  }
  // If we found a legacy object (non-array) where an array is expected, 
  // we return an empty array to prevent crashes.
  return [];
};

export const FinancialRepository = {
  // Settings
  getSettings: async (userId: string): Promise<AppSettings> => {
    if (isSupabaseConfigured()) {
       const { data } = await supabase.from('settings').select('*').eq('user_id', userId).limit(1).single();
       if (data) {
         return {
           userId: data.user_id,
           hourlyRate: data.hourly_rate,
           overtimeRate: data.overtime_rate,
           dailyLimit: data.daily_limit,
           currency: data.currency,
           userName: data.user_name,
           expenseFund: data.expense_fund
         };
       }
       return { ...DEFAULT_SETTINGS, userId };
    }
    
    // LocalStorage
    const allSettings = getSafeArray<AppSettings>(DB_KEYS.SETTINGS);
    const userSettings = allSettings.find(s => s.userId === userId);
    
    return userSettings || { ...DEFAULT_SETTINGS, userId };
  },

  getAllSettings: async (): Promise<AppSettings[]> => {
    if (isSupabaseConfigured()) {
       const { data } = await supabase.from('settings').select('*');
       if (data) {
         return data.map((d: any) => ({
           userId: d.user_id,
           hourlyRate: d.hourly_rate,
           overtimeRate: d.overtime_rate,
           dailyLimit: d.daily_limit,
           currency: d.currency,
           userName: d.user_name,
           expenseFund: d.expense_fund
         }));
       }
       return [];
    }
    return getSafeArray<AppSettings>(DB_KEYS.SETTINGS);
  },
  
  saveSettings: async (settings: AppSettings): Promise<void> => {
    if (isSupabaseConfigured()) {
       const { data } = await supabase.from('settings').select('id').eq('user_id', settings.userId).limit(1);
       const payload = {
          user_id: settings.userId,
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
      // LocalStorage
      const allSettings = getSafeArray<AppSettings>(DB_KEYS.SETTINGS);
      const otherSettings = allSettings.filter(s => s.userId !== settings.userId);
      StorageProvider.set(DB_KEYS.SETTINGS, [...otherSettings, settings]);
    }
  },

  // Time Entries
  getTimeEntries: async (userId: string): Promise<TimeEntry[]> => {
    if (isSupabaseConfigured()) {
       const { data, error } = await supabase.from('time_entries').select('*').eq('user_id', userId);
       if (error) return [];
       return data.map((e: any) => ({
         id: e.id,
         userId: e.user_id,
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
    const allEntries = getSafeArray<TimeEntry>(DB_KEYS.TIME_ENTRIES);
    // Filter for current user
    const userEntries = allEntries.filter((e: any) => e.userId === userId);
    
    return userEntries.map((e: any) => ({
      ...e,
      isHoliday: e.isHoliday || false,
      regularHours: e.regularHours ?? Math.min(e.totalHours, 8),
      overtimeHours: e.overtimeHours ?? Math.max(0, e.totalHours - 8)
    }));
  },

  getAllTimeEntries: async (): Promise<TimeEntry[]> => {
    if (isSupabaseConfigured()) {
       const { data, error } = await supabase.from('time_entries').select('*');
       if (error) return [];
       return data.map((e: any) => ({
         id: e.id,
         userId: e.user_id,
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
    const allEntries = getSafeArray<TimeEntry>(DB_KEYS.TIME_ENTRIES);
    return allEntries.map((e: any) => ({
      ...e,
      isHoliday: e.isHoliday || false,
      regularHours: e.regularHours ?? Math.min(e.totalHours, 8),
      overtimeHours: e.overtimeHours ?? Math.max(0, e.totalHours - 8)
    }));
  },

  saveTimeEntries: async (userEntries: TimeEntry[], userId: string): Promise<void> => {
    if (isSupabaseConfigured()) {
       const payload = userEntries.map(e => ({
         id: e.id,
         user_id: userId,
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
       
       if (payload.length > 0) {
         await supabase.from('time_entries').upsert(payload);
       }
    } else {
      // LocalStorage: Merge strategy
      const allEntries = getSafeArray<TimeEntry>(DB_KEYS.TIME_ENTRIES);
      // Keep entries from OTHER users
      const otherUsersEntries = allEntries.filter(e => e.userId !== userId);
      // Combine with NEW state for THIS user
      const mergedEntries = [...otherUsersEntries, ...userEntries];
      
      StorageProvider.set(DB_KEYS.TIME_ENTRIES, mergedEntries);
    }
  },
  
  deleteTimeEntry: async (id: string): Promise<void> => {
      if (isSupabaseConfigured()) {
          await supabase.from('time_entries').delete().eq('id', id);
      } else {
          const allEntries = getSafeArray<TimeEntry>(DB_KEYS.TIME_ENTRIES);
          const filtered = allEntries.filter(e => e.id !== id);
          StorageProvider.set(DB_KEYS.TIME_ENTRIES, filtered);
      }
  },

  // Expenses
  getExpenses: async (userId: string): Promise<ExpenseEntry[]> => {
    if (isSupabaseConfigured()) {
       const { data, error } = await supabase.from('expenses').select('*').eq('user_id', userId);
       if (error) return [];
       return data.map((e: any) => ({
          id: e.id,
          userId: e.user_id,
          date: e.date,
          amount: e.amount,
          category: e.category,
          description: e.description,
          agNumber: e.ag_number
       }));
    }
    const allExpenses = getSafeArray<ExpenseEntry>(DB_KEYS.EXPENSES);
    return allExpenses.filter(e => e.userId === userId);
  },

  getAllExpenses: async (): Promise<ExpenseEntry[]> => {
    if (isSupabaseConfigured()) {
       const { data, error } = await supabase.from('expenses').select('*');
       if (error) return [];
       return data.map((e: any) => ({
          id: e.id,
          userId: e.user_id,
          date: e.date,
          amount: e.amount,
          category: e.category,
          description: e.description,
          agNumber: e.ag_number
       }));
    }
    return getSafeArray<ExpenseEntry>(DB_KEYS.EXPENSES);
  },

  saveExpenses: async (userExpenses: ExpenseEntry[], userId: string): Promise<void> => {
    if (isSupabaseConfigured()) {
       const payload = userExpenses.map(e => ({
          id: e.id,
          user_id: userId,
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
      const allExpenses = getSafeArray<ExpenseEntry>(DB_KEYS.EXPENSES);
      const otherUsersExpenses = allExpenses.filter(e => e.userId !== userId);
      StorageProvider.set(DB_KEYS.EXPENSES, [...otherUsersExpenses, ...userExpenses]);
    }
  },

  deleteExpense: async (id: string): Promise<void> => {
    if (isSupabaseConfigured()) {
        await supabase.from('expenses').delete().eq('id', id);
    } else {
        const allExpenses = getSafeArray<ExpenseEntry>(DB_KEYS.EXPENSES);
        const filtered = allExpenses.filter(e => e.id !== id);
        StorageProvider.set(DB_KEYS.EXPENSES, filtered);
    }
  },

  // Advances
  getAdvances: async (userId: string): Promise<AdvanceEntry[]> => {
    if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('advances').select('*').eq('user_id', userId);
        if (error) return [];
        return data.map((a: any) => ({
            ...a,
            userId: a.user_id
        }));
    }
    const allAdvances = getSafeArray<AdvanceEntry>(DB_KEYS.ADVANCES);
    return allAdvances.filter(a => a.userId === userId);
  },

  getAllAdvances: async (): Promise<AdvanceEntry[]> => {
    if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('advances').select('*');
        if (error) return [];
        return data.map((a: any) => ({
            ...a,
            userId: a.user_id
        }));
    }
    return getSafeArray<AdvanceEntry>(DB_KEYS.ADVANCES);
  },

  saveAdvances: async (userAdvances: AdvanceEntry[], userId: string): Promise<void> => {
    if (isSupabaseConfigured()) {
        const payload = userAdvances.map(a => ({
            id: a.id,
            user_id: userId,
            date: a.date,
            amount: a.amount,
            description: a.description
        }));
        if (payload.length > 0) {
            await supabase.from('advances').upsert(payload);
        }
    } else {
        const allAdvances = getSafeArray<AdvanceEntry>(DB_KEYS.ADVANCES);
        const otherUsersAdvances = allAdvances.filter(a => a.userId !== userId);
        StorageProvider.set(DB_KEYS.ADVANCES, [...otherUsersAdvances, ...userAdvances]);
    }
  },

  deleteAdvance: async (id: string): Promise<void> => {
    if (isSupabaseConfigured()) {
        await supabase.from('advances').delete().eq('id', id);
    } else {
        const allAdvances = getSafeArray<AdvanceEntry>(DB_KEYS.ADVANCES);
        const filtered = allAdvances.filter(a => a.id !== id);
        StorageProvider.set(DB_KEYS.ADVANCES, filtered);
    }
  }
};
