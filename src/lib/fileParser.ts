import * as XLSX from 'xlsx';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  direction: 'inflow' | 'outflow';
}

export interface ParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  error?: string;
}

// Common date formats to try parsing
const parseDate = (value: string | number | Date): string | null => {
  if (!value) return null;
  
  // If it's already a Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  // If it's a number (Excel date serial)
  if (typeof value === 'number') {
    const excelDate = new Date((value - 25569) * 86400 * 1000);
    return excelDate.toISOString().split('T')[0];
  }
  
  // Try parsing string dates
  const str = String(value).trim();
  
  // Common formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
  const patterns = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY
  ];
  
  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) {
      // Try parsing with Date constructor
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
  }
  
  // Fallback: try direct Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return null;
};

// Parse amount from various formats
const parseAmount = (value: string | number): number | null => {
  if (typeof value === 'number') return value;
  if (!value) return null;
  
  const str = String(value).trim();
  
  // Remove currency symbols and thousands separators
  const cleaned = str
    .replace(/[$€£¥]/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();
  
  // Handle parentheses for negative numbers
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  const finalStr = isNegative ? cleaned.slice(1, -1) : cleaned;
  
  const amount = parseFloat(finalStr);
  
  if (isNaN(amount)) return null;
  
  return isNegative ? -amount : amount;
};

// Find which columns contain date, description, and amount
const detectColumns = (headers: string[]): { dateCol: number; descCol: number; amountCol: number; debitCol: number; creditCol: number } => {
  const lowerHeaders = headers.map(h => String(h || '').toLowerCase().trim());
  
  // Date column detection
  const dateKeywords = ['date', 'transaction date', 'trans date', 'posted', 'posting date'];
  const dateCol = lowerHeaders.findIndex(h => dateKeywords.some(k => h.includes(k)));
  
  // Description column detection
  const descKeywords = ['description', 'memo', 'narrative', 'details', 'transaction', 'payee', 'merchant'];
  const descCol = lowerHeaders.findIndex(h => descKeywords.some(k => h.includes(k)));
  
  // Amount column detection (single column)
  const amountKeywords = ['amount', 'total', 'value'];
  const amountCol = lowerHeaders.findIndex(h => amountKeywords.some(k => h.includes(k)) && !h.includes('debit') && !h.includes('credit'));
  
  // Debit/Credit columns (separate columns)
  const debitCol = lowerHeaders.findIndex(h => h.includes('debit') || h.includes('withdrawal') || h.includes('out'));
  const creditCol = lowerHeaders.findIndex(h => h.includes('credit') || h.includes('deposit') || h.includes('in'));
  
  return {
    dateCol: dateCol >= 0 ? dateCol : 0,
    descCol: descCol >= 0 ? descCol : 1,
    amountCol,
    debitCol,
    creditCol,
  };
};

export const parseCSV = async (file: File): Promise<ParseResult> => {
  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return { success: false, transactions: [], error: 'File appears to be empty or has no data rows' };
    }
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const columns = detectColumns(headers);
    
    const transactions: ParsedTransaction[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Handle CSV with quoted fields containing commas
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const date = parseDate(values[columns.dateCol]);
      const description = values[columns.descCol]?.replace(/^"|"$/g, '') || '';
      
      let amount: number | null = null;
      let direction: 'inflow' | 'outflow' = 'outflow';
      
      if (columns.amountCol >= 0) {
        amount = parseAmount(values[columns.amountCol]);
        if (amount !== null) {
          direction = amount >= 0 ? 'inflow' : 'outflow';
          amount = Math.abs(amount);
        }
      } else if (columns.debitCol >= 0 || columns.creditCol >= 0) {
        const debit = columns.debitCol >= 0 ? parseAmount(values[columns.debitCol]) : null;
        const credit = columns.creditCol >= 0 ? parseAmount(values[columns.creditCol]) : null;
        
        if (debit && debit > 0) {
          amount = debit;
          direction = 'outflow';
        } else if (credit && credit > 0) {
          amount = credit;
          direction = 'inflow';
        }
      }
      
      if (date && description && amount !== null) {
        transactions.push({ date, description, amount, direction });
      }
    }
    
    return { success: true, transactions };
  } catch (error) {
    return { success: false, transactions: [], error: `Failed to parse CSV: ${error}` };
  }
};

export const parseXLSX = async (file: File): Promise<ParseResult> => {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1 }) as unknown[][];
    
    if (data.length < 2) {
      return { success: false, transactions: [], error: 'File appears to be empty or has no data rows' };
    }
    
    const headers = (data[0] || []).map(h => String(h || ''));
    const columns = detectColumns(headers);
    
    const transactions: ParsedTransaction[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as (string | number)[];
      if (!row || row.length === 0) continue;
      
      const date = parseDate(row[columns.dateCol]);
      const description = String(row[columns.descCol] || '');
      
      let amount: number | null = null;
      let direction: 'inflow' | 'outflow' = 'outflow';
      
      if (columns.amountCol >= 0) {
        amount = parseAmount(row[columns.amountCol]);
        if (amount !== null) {
          direction = amount >= 0 ? 'inflow' : 'outflow';
          amount = Math.abs(amount);
        }
      } else if (columns.debitCol >= 0 || columns.creditCol >= 0) {
        const debit = columns.debitCol >= 0 ? parseAmount(row[columns.debitCol]) : null;
        const credit = columns.creditCol >= 0 ? parseAmount(row[columns.creditCol]) : null;
        
        if (debit && debit > 0) {
          amount = debit;
          direction = 'outflow';
        } else if (credit && credit > 0) {
          amount = credit;
          direction = 'inflow';
        }
      }
      
      if (date && description && amount !== null) {
        transactions.push({ date, description, amount, direction });
      }
    }
    
    return { success: true, transactions };
  } catch (error) {
    return { success: false, transactions: [], error: `Failed to parse XLSX: ${error}` };
  }
};

export const parseFile = async (file: File): Promise<ParseResult> => {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.csv')) {
    return parseCSV(file);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseXLSX(file);
  } else if (fileName.endsWith('.pdf')) {
    return { success: false, transactions: [], error: 'PDF parsing is not yet supported. Please convert to CSV or XLSX.' };
  }
  
  return { success: false, transactions: [], error: 'Unsupported file format' };
};
