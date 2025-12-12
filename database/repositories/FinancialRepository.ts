
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

// Helper to ensure we always work with arrays
const getSafeArray = <T>(key: string): T[] => {
  const data = StorageProvider.get<any>(key, []);
  if (Array.isArray(data)) {
    return data;
  }
  return [];
};

export const FinancialRepository = {
  // Settings
  getSettings: async (userId: string): Promise<AppSettings> => {
    if (isSupabaseConfigured()) {
       const { data, error } = await supabase.from('settings').select('*').eq('user_id', userId).limit(1).maybeSingle();
       
       if (!error && data) {
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

       if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01') {
              console.warn('Supabase: Tabela "settings" faltando. Fallback LocalStorage.');
          } else {
              console.error('Supabase Error (getSettings):', JSON.stringify(error, null, 2));
              // Se houver erro de conexão, tentamos retornar o default
              return { ...DEFAULT_SETTINGS, userId };
          }
       } else if (!data) {
           // No data found in Supabase (but table exists), return default
           return { ...DEFAULT_SETTINGS, userId };
       }
    }
    
    // LocalStorage Fallback
    const allSettings = getSafeArray<AppSettings>(DB_KEYS.SETTINGS);
    const userSettings = allSettings.find(s => s.userId === userId);
    
    return userSettings || { ...DEFAULT_SETTINGS, userId };
  },

  getAllSettings: async (): Promise<AppSettings[]> => {
    if (isSupabaseConfigured()) {
       const { data, error } = await supabase.from('settings').select('*');
       if (!error && data) {
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
       if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
           // Fallback
       } else if (error) {
           return [];
       }
    }
    return getSafeArray<AppSettings>(DB_KEYS.SETTINGS);
  },
  
  saveSettings: async (settings: AppSettings): Promise<void> => {
    let successSupabase = false;
    if (isSupabaseConfigured()) {
       // Check existence first
       const { data, error: fetchError } = await supabase.from('settings').select('id').eq('user_id', settings.userId).limit(1).maybeSingle();
       
       if (fetchError && (fetchError.code === 'PGRST205' || fetchError.code === '42P01')) {
          // Table missing, skip to fallback
       } else {
           const payload = {
              user_id: settings.userId,
              hourly_rate: settings.hourlyRate,
              overtime_rate: settings.overtimeRate,
              daily_limit: settings.dailyLimit,
              currency: settings.currency,
              user_name: settings.userName,
              expense_fund: settings.expenseFund
           };

           let saveError;
           if (data) {
              const { error } = await supabase.from('settings').update(payload).eq('id', data.id);
              saveError = error;
           } else {
              const { error } = await supabase.from('settings').insert(payload);
              saveError = error;
           }
           
           if (!saveError) {
              successSupabase = true;
           } else if (saveError.code !== 'PGRST205' && saveError.code !== '42P01') {
              console.error('Supabase Error (saveSettings):', JSON.stringify(saveError, null, 2));
           }
       }
    }

    if (!successSupabase) {
      const allSettings = getSafeArray<AppSettings>(DB_KEYS.SETTINGS);
      const otherSettings = allSettings.filter(s => s.userId !== settings.userId);
      StorageProvider.set(DB_KEYS.SETTINGS, [...otherSettings, settings]);
    }
  },

  // Time Entries
  getTimeEntries: async (userId: string): Promise<TimeEntry[]> => {
    if (isSupabaseConfigured()) {
       const { data, error } = await supabase.from('time_entries').select('*').eq('user_id', userId);
       
       if (!error && data) {
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

       if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
           console.warn('Supabase: Tabela "time_entries" faltando. Fallback LocalStorage.');
           // Fallback logic continues below
       } else if (error) {
           console.error('Supabase Error (getTimeEntries):', JSON.stringify(error, null, 2));
           return [];
       }
    }

    const allEntries = getSafeArray<TimeEntry>(DB_KEYS.TIME_ENTRIES);
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
       if (!error && data) {
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
       if (error && (error.code !== 'PGRST205' && error.code !== '42P01')) {
           return [];
       }
       // Fallback for missing table
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
    let successSupabase = false;
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
         const { error } = await supabase.from('time_entries').upsert(payload);
         if (!error) {
             successSupabase = true;
         } else if (error.code !== 'PGRST205' && error.code !== '42P01') {
             console.error('Supabase Error (saveTimeEntries):', JSON.stringify(error, null, 2));
         }
       } else {
         successSupabase = true; // Nothing to save is a success
       }
    }

    if (!successSupabase) {
      const allEntries = getSafeArray<TimeEntry>(DB_KEYS.TIME_ENTRIES);
      const otherUsersEntries = allEntries.filter(e => e.userId !== userId);
      const mergedEntries = [...otherUsersEntries, ...userEntries];
      StorageProvider.set(DB_KEYS.TIME_ENTRIES, mergedEntries);
    }
  },
  
  deleteTimeEntry: async (id: string): Promise<void> => {
      let successSupabase = false;
      if (isSupabaseConfigured()) {
          const { error } = await supabase.from('time_entries').delete().eq('id', id);
          if (!error) successSupabase = true;
      }
      
      if (!successSupabase) {
          const allEntries = getSafeArray<TimeEntry>(DB_KEYS.TIME_ENTRIES);
          const filtered = allEntries.filter(e => e.id !== id);
          StorageProvider.set(DB_KEYS.TIME_ENTRIES, filtered);
      }
  },

  // Expenses
  getExpenses: async (userId: string): Promise<ExpenseEntry[]> => {
    if (isSupabaseConfigured()) {
       const { data, error } = await supabase.from('expenses').select('*').eq('user_id', userId);
       if (!error && data) {
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
       if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
           console.warn('Supabase: Tabela "expenses" faltando. Fallback LocalStorage.');
       } else if (error) {
           return [];
       }
    }
    const allExpenses = getSafeArray<ExpenseEntry>(DB_KEYS.EXPENSES);
    return allExpenses.filter(e => e.userId === userId);
  },

  getAllExpenses: async (): Promise<ExpenseEntry[]> => {
    if (isSupabaseConfigured()) {
       const { data, error } = await supabase.from('expenses').select('*');
       if (!error && data) {
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
       if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
          return [];
       }
    }
    return getSafeArray<ExpenseEntry>(DB_KEYS.EXPENSES);
  },

  saveExpenses: async (userExpenses: ExpenseEntry[], userId: string): Promise<void> => {
    let successSupabase = false;
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
         const { error } = await supabase.from('expenses').upsert(payload);
         if (!error) successSupabase = true;
         else if (error.code !== 'PGRST205' && error.code !== '42P01') console.error('Supabase Error (saveExpenses):', JSON.stringify(error, null, 2));
       } else {
         successSupabase = true;
       }
    }
    
    if (!successSupabase) {
      const allExpenses = getSafeArray<ExpenseEntry>(DB_KEYS.EXPENSES);
      const otherUsersExpenses = allExpenses.filter(e => e.userId !== userId);
      StorageProvider.set(DB_KEYS.EXPENSES, [...otherUsersExpenses, ...userExpenses]);
    }
  },

  deleteExpense: async (id: string): Promise<void> => {
    let successSupabase = false;
    if (isSupabaseConfigured()) {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (!error) successSupabase = true;
    }
    
    if (!successSupabase) {
        const allExpenses = getSafeArray<ExpenseEntry>(DB_KEYS.EXPENSES);
        const filtered = allExpenses.filter(e => e.id !== id);
        StorageProvider.set(DB_KEYS.EXPENSES, filtered);
    }
  },

  // Advances
  getAdvances: async (userId: string): Promise<AdvanceEntry[]> => {
    if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('advances').select('*').eq('user_id', userId);
        if (!error && data) {
            return data.map((a: any) => ({
                ...a,
                userId: a.user_id
            }));
        }
        if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
            console.warn('Supabase: Tabela "advances" faltando. Fallback LocalStorage.');
        } else if (error) {
            return [];
        }
    }
    const allAdvances = getSafeArray<AdvanceEntry>(DB_KEYS.ADVANCES);
    return allAdvances.filter(a => a.userId === userId);
  },

  getAllAdvances: async (): Promise<AdvanceEntry[]> => {
    if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('advances').select('*');
        if (!error && data) {
            return data.map((a: any) => ({
                ...a,
                userId: a.user_id
            }));
        }
        if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
            return [];
        }
    }
    return getSafeArray<AdvanceEntry>(DB_KEYS.ADVANCES);
  },

  saveAdvances: async (userAdvances: AdvanceEntry[], userId: string): Promise<void> => {
    let successSupabase = false;
    if (isSupabaseConfigured()) {
        const payload = userAdvances.map(a => ({
            id: a.id,
            user_id: userId,
            date: a.date,
            amount: a.amount,
            description: a.description
        }));
        if (payload.length > 0) {
            const { error } = await supabase.from('advances').upsert(payload);
            if (!error) successSupabase = true;
            else if (error.code !== 'PGRST205' && error.code !== '42P01') console.error('Supabase Error (saveAdvances):', JSON.stringify(error, null, 2));
        } else {
            successSupabase = true;
        }
    }
    
    if (!successSupabase) {
        const allAdvances = getSafeArray<AdvanceEntry>(DB_KEYS.ADVANCES);
        const otherUsersAdvances = allAdvances.filter(a => a.userId !== userId);
        StorageProvider.set(DB_KEYS.ADVANCES, [...otherUsersAdvances, ...userAdvances]);
    }
  },

  deleteAdvance: async (id: string): Promise<void> => {
    let successSupabase = false;
    if (isSupabaseConfigured()) {
        const { error } = await supabase.from('advances').delete().eq('id', id);
        if (!error) successSupabase = true;
    }
    
    if (!successSupabase) {
        const allAdvances = getSafeArray<AdvanceEntry>(DB_KEYS.ADVANCES);
        const filtered = allAdvances.filter(a => a.id !== id);
        StorageProvider.set(DB_KEYS.ADVANCES, filtered);
    }
  }
};
