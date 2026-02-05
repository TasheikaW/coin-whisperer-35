import * as XLSX from 'xlsx';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  direction: 'debit' | 'credit'; // Matches database constraint
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
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }
  
  // If it's a number (Excel date serial)
  if (typeof value === 'number') {
    // Excel date serial number (days since 1900-01-01)
    const excelDate = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(excelDate.getTime())) {
      return excelDate.toISOString().split('T')[0];
    }
  }
  
  // Try parsing string dates
  const str = String(value).trim();
  if (!str) return null;
  
  // Try multiple date patterns
  const patterns = [
    // ISO format: 2024-01-15
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // US format: 01/15/2024 or 1/15/2024
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // European format: 15-01-2024
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // With dots: 15.01.2024
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(str)) {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
  }
  
  // Fallback: try direct Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
    return parsed.toISOString().split('T')[0];
  }
  
  return null;
};

// Parse amount from various formats
const parseAmount = (value: string | number | undefined | null): number | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value;
  
  const str = String(value).trim();
  if (!str) return null;
  
  // Remove currency symbols, thousands separators, and spaces
  let cleaned = str
    .replace(/[$€£¥₹₽¥₩₪฿₫₴₸₺₼₾]/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();
  
  // Handle parentheses for negative numbers: (100.00) -> -100.00
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNegative) {
    cleaned = '-' + cleaned.slice(1, -1);
  }
  
  // Handle trailing minus: 100.00- -> -100.00
  if (cleaned.endsWith('-')) {
    cleaned = '-' + cleaned.slice(0, -1);
  }
  
  const amount = parseFloat(cleaned);
  
  if (isNaN(amount)) return null;
  
  return amount;
};

// Flexible column detection - handles many different header naming conventions
interface ColumnMapping {
  dateCol: number;
  descCol: number;
  amountCol: number;
  debitCol: number;
  creditCol: number;
  balanceCol: number;
  typeCol: number;
}

const detectColumns = (headers: string[]): ColumnMapping => {
  const lowerHeaders = headers.map(h => String(h || '').toLowerCase().trim());
  
  const findColumn = (keywords: string[], exclude: string[] = []): number => {
    return lowerHeaders.findIndex(h => 
      keywords.some(k => h.includes(k)) && 
      !exclude.some(e => h.includes(e))
    );
  };
  
  // Date column - many variations
  const dateKeywords = ['date', 'posted', 'trans', 'effective', 'value date', 'booking'];
  const dateCol = findColumn(dateKeywords);
  
  // Description column - many variations
  const descKeywords = ['description', 'memo', 'narrative', 'details', 'particular', 'payee', 'merchant', 'reference', 'remark', 'name', 'text'];
  let descCol = findColumn(descKeywords, ['date']);
  
  // If no description found, look for the longest text column later
  
  // Amount column (single column with positive/negative values)
  // Also check for currency codes like CAD$, USD$, EUR, GBP, etc.
  const amountKeywords = ['amount', 'sum', 'value', 'total', 'cad$', 'usd$', 'cad', 'usd', 'eur', 'gbp', 'aud', 'money', 'price'];
  const amountCol = findColumn(amountKeywords, ['debit', 'credit', 'balance', 'running']);
  
  // Separate debit/credit columns
  const debitKeywords = ['debit', 'withdrawal', 'out', 'dr', 'expense', 'payment', 'spent'];
  const creditKeywords = ['credit', 'deposit', 'in', 'cr', 'income', 'received'];
  const debitCol = findColumn(debitKeywords);
  const creditCol = findColumn(creditKeywords, ['debit']); // Exclude debit to avoid matching same column
  
  // Balance column (to exclude from amount detection)
  const balanceCol = findColumn(['balance', 'running', 'available']);
  
  // Type column (might indicate debit/credit)
  const typeCol = findColumn(['type', 'dr/cr', 'dc']);
  
  // Smart fallback: if no description column found, use column after date or column 1
  if (descCol < 0) {
    // Use the first text-heavy column that isn't date or amount
    descCol = dateCol >= 0 ? (dateCol === 0 ? 1 : 0) : 1;
  }
  
  return {
    dateCol: dateCol >= 0 ? dateCol : 0,
    descCol: descCol >= 0 ? descCol : 1,
    amountCol,
    debitCol,
    creditCol,
    balanceCol,
    typeCol,
  };
};

// Determine direction from a type indicator column
const parseDirectionFromType = (value: string | undefined | null): 'debit' | 'credit' | null => {
  if (!value) return null;
  const str = String(value).toLowerCase().trim();
  
  if (str === 'dr' || str === 'd' || str === 'debit' || str === 'withdrawal' || str === 'expense') {
    return 'debit';
  }
  if (str === 'cr' || str === 'c' || str === 'credit' || str === 'deposit' || str === 'income') {
    return 'credit';
  }
  return null;
};

export const parseCSV = async (file: File): Promise<ParseResult> => {
  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      return { success: false, transactions: [], error: 'File appears to be empty or has no data rows' };
    }
    
    // Parse headers - handle quoted headers
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    const columns = detectColumns(headers);
    
    console.log('Detected columns:', { headers, columns });
    
    const transactions: ParsedTransaction[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      
      const date = parseDate(values[columns.dateCol]);
      let description = values[columns.descCol]?.replace(/^"|"$/g, '').trim() || '';
      
      // If description is empty, try to find any non-empty text field
      if (!description) {
        for (let j = 0; j < values.length; j++) {
          if (j !== columns.dateCol && j !== columns.amountCol && 
              j !== columns.debitCol && j !== columns.creditCol && 
              j !== columns.balanceCol) {
            const val = values[j]?.trim();
            if (val && val.length > 3 && isNaN(parseFloat(val))) {
              description = val;
              break;
            }
          }
        }
      }
      
      let amount: number | null = null;
      let direction: 'debit' | 'credit' = 'debit';
      
      // Try to get direction from type column first
      if (columns.typeCol >= 0) {
        const typeDirection = parseDirectionFromType(values[columns.typeCol]);
        if (typeDirection) direction = typeDirection;
      }
      
      // Method 1: Single amount column
      if (columns.amountCol >= 0) {
        amount = parseAmount(values[columns.amountCol]);
        if (amount !== null) {
          // For bank statements: positive amount typically = spending (debit)
          // Negative amount = refund/income (credit)
          // Only override if we didn't already get direction from type column
          if (columns.typeCol < 0) {
            direction = amount >= 0 ? 'debit' : 'credit';
          }
          amount = Math.abs(amount);
        }
      }
      
      // Method 2: Separate debit/credit columns
      if (amount === null && (columns.debitCol >= 0 || columns.creditCol >= 0)) {
        const debit = columns.debitCol >= 0 ? parseAmount(values[columns.debitCol]) : null;
        const credit = columns.creditCol >= 0 ? parseAmount(values[columns.creditCol]) : null;
        
        if (debit !== null && debit !== 0) {
          amount = Math.abs(debit);
          direction = 'debit';
        } else if (credit !== null && credit !== 0) {
          amount = Math.abs(credit);
          direction = 'credit';
        }
      }
      
      // Method 3: Fallback - try to find any numeric column
      if (amount === null) {
        for (let j = 0; j < values.length; j++) {
          if (j !== columns.dateCol && j !== columns.balanceCol) {
            const parsedAmount = parseAmount(values[j]);
            if (parsedAmount !== null && parsedAmount !== 0) {
              amount = Math.abs(parsedAmount);
              direction = parsedAmount < 0 ? 'debit' : 'credit';
              break;
            }
          }
        }
      }
      
      if (date && description && amount !== null && amount > 0) {
        transactions.push({ date, description, amount, direction });
      }
    }
    
    if (transactions.length === 0) {
      return { success: false, transactions: [], error: 'Could not parse any transactions. Please check the file format.' };
    }
    
    return { success: true, transactions };
  } catch (error) {
    console.error('CSV parse error:', error);
    return { success: false, transactions: [], error: `Failed to parse CSV: ${error}` };
  }
};

// Proper CSV line parser that handles quoted fields
const parseCSVLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  return values;
};

export const parseXLSX = async (file: File): Promise<ParseResult> => {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }) as unknown[][];
    
    if (data.length < 2) {
      return { success: false, transactions: [], error: 'File appears to be empty or has no data rows' };
    }
    
    const headers = (data[0] || []).map(h => String(h || ''));
    const columns = detectColumns(headers);
    
    console.log('XLSX Detected columns:', { headers, columns });
    
    const transactions: ParsedTransaction[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as (string | number | Date)[];
      if (!row || row.length === 0 || row.every(cell => !cell)) continue;
      
      const date = parseDate(row[columns.dateCol]);
      let description = String(row[columns.descCol] || '').trim();
      
      // If description is empty, try to find any non-empty text field
      if (!description) {
        for (let j = 0; j < row.length; j++) {
          if (j !== columns.dateCol && j !== columns.amountCol && 
              j !== columns.debitCol && j !== columns.creditCol && 
              j !== columns.balanceCol) {
            const val = String(row[j] || '').trim();
            if (val && val.length > 3 && isNaN(parseFloat(val))) {
              description = val;
              break;
            }
          }
        }
      }
      
      let amount: number | null = null;
      let direction: 'debit' | 'credit' = 'debit';
      
      // Try to get direction from type column first
      if (columns.typeCol >= 0) {
        const typeDirection = parseDirectionFromType(String(row[columns.typeCol]));
        if (typeDirection) direction = typeDirection;
      }
      
      // Method 1: Single amount column
      if (columns.amountCol >= 0) {
        amount = parseAmount(row[columns.amountCol] as string | number);
        if (amount !== null) {
          // For bank statements: positive amount typically = spending (debit)
          if (columns.typeCol < 0) {
            direction = amount >= 0 ? 'debit' : 'credit';
          }
          amount = Math.abs(amount);
        }
      }
      
      // Method 2: Separate debit/credit columns
      if (amount === null && (columns.debitCol >= 0 || columns.creditCol >= 0)) {
        const debit = columns.debitCol >= 0 ? parseAmount(row[columns.debitCol] as string | number) : null;
        const credit = columns.creditCol >= 0 ? parseAmount(row[columns.creditCol] as string | number) : null;
        
        if (debit !== null && debit !== 0) {
          amount = Math.abs(debit);
          direction = 'debit';
        } else if (credit !== null && credit !== 0) {
          amount = Math.abs(credit);
          direction = 'credit';
        }
      }
      
      // Method 3: Fallback - try to find any numeric column
      if (amount === null) {
        for (let j = 0; j < row.length; j++) {
          if (j !== columns.dateCol && j !== columns.balanceCol) {
            const parsedAmount = parseAmount(row[j] as string | number);
            if (parsedAmount !== null && parsedAmount !== 0) {
              amount = Math.abs(parsedAmount);
              direction = parsedAmount < 0 ? 'debit' : 'credit';
              break;
            }
          }
        }
      }
      
      if (date && description && amount !== null && amount > 0) {
        transactions.push({ date, description, amount, direction });
      }
    }
    
    if (transactions.length === 0) {
      return { success: false, transactions: [], error: 'Could not parse any transactions. Please check the file format.' };
    }
    
    return { success: true, transactions };
  } catch (error) {
    console.error('XLSX parse error:', error);
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
