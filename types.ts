
export interface TimeEntry {
  id: string;
  userId: string; // Added for isolation
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  lunchStartTime?: string; // HH:mm
  lunchEndTime?: string; // HH:mm
  dinnerStartTime?: string; // HH:mm
  dinnerEndTime?: string; // HH:mm
  endTime: string; // HH:mm
  description: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  earnings: number;
  isHoliday?: boolean; 
}

export interface ExpenseEntry {
  id: string;
  userId: string; // Added for isolation
  date: string; // YYYY-MM-DD
  amount: number;
  category: string;
  description: string;
  agNumber?: string;
}

export interface AdvanceEntry {
  id: string;
  userId: string; // Added for isolation
  date: string; // YYYY-MM-DD
  amount: number;
  description?: string;
}

export interface AppSettings {
  userId: string; // Added for isolation
  hourlyRate: number; // Rate for first 8 hours (Normal)
  overtimeRate: number; // Rate for hours > 8 (Extra)
  dailyLimit: number; // Default 8
  currency: string;
  userName: string;
  expenseFund: number; // Monetary fund assigned for expenses (Base)
}

export type Period = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
};

export enum Tab {
  DASHBOARD = 'dashboard',
  TIMESHEET = 'timesheet',
  EXPENSES = 'expenses',
  SETTINGS = 'settings',
  AI_REPORT = 'ai_report',
  USERS = 'users' // New tab for RCM
}

// --- Auth Types ---

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  password?: string; // Optional when retrieving lists to not expose it
  name: string;
  role: UserRole;
  isFirstLogin: boolean;
  isActive: boolean;
}
