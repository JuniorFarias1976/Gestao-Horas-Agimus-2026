import { UserRepository } from '../database/repositories/UserRepository';
import { FinancialRepository } from '../database/repositories/FinancialRepository';

/**
 * Converts an array of objects to a CSV string.
 */
const convertToCSV = (data: any[]): string => {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV header row
  const headerRow = headers.join(',');

  // Create rows
  const rows = data.map(row => {
    return headers.map(fieldName => {
      const val = row[fieldName];
      // Handle null/undefined
      if (val === null || val === undefined) return '';
      // Handle strings that might contain commas or newlines
      const stringVal = String(val);
      if (stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('"')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    }).join(',');
  });

  return [headerRow, ...rows].join('\n');
};

/**
 * Triggers a browser download for a specific text content.
 */
const downloadFile = (content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') => {
  if (!content) return;
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper to pause execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generic helper to export any data array to CSV.
 */
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert("Sem dados para exportar.");
    return;
  }
  const content = convertToCSV(data);
  downloadFile(content, filename);
};

/**
 * Exports all database tables to individual CSV files.
 */
export const exportDatabaseToCSV = async () => {
  try {
    // 1. Fetch all data
    const users = await UserRepository.getAll();
    const settings = await FinancialRepository.getSettings();
    const timeEntries = await FinancialRepository.getTimeEntries();
    const expenses = await FinancialRepository.getExpenses();
    const advances = await FinancialRepository.getAdvances();

    // 2. Prepare Data (Clean up passwords or sensitive data if necessary)
    const safeUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      isActive: u.isActive,
      isFirstLogin: u.isFirstLogin
      // Password excluded
    }));

    // 3. Convert and Download
    // We add a small delay between downloads to ensure the browser handles multiple file requests
    
    if (safeUsers.length > 0) {
      downloadFile(convertToCSV(safeUsers), 'db_users.csv');
      await sleep(500);
    }

    // Settings is a single object, wrap in array
    if (settings) {
      downloadFile(convertToCSV([settings]), 'db_settings.csv');
      await sleep(500);
    }

    if (timeEntries.length > 0) {
      downloadFile(convertToCSV(timeEntries), 'db_time_entries.csv');
      await sleep(500);
    }

    if (expenses.length > 0) {
      downloadFile(convertToCSV(expenses), 'db_expenses.csv');
      await sleep(500);
    }

    if (advances.length > 0) {
      downloadFile(convertToCSV(advances), 'db_advances.csv');
      await sleep(500);
    }

    return true;
  } catch (error) {
    console.error("Error exporting database:", error);
    throw new Error("Falha ao exportar banco de dados.");
  }
};