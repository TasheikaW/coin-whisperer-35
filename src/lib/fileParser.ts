import * as XLSX from 'xlsx';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  direction: 'debit' | 'credit';
}

export interface ParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  error?: string;
  currency?: string;
}

const parseDate = (value: string | number | Date): string | null => {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().split('T')[0];
  if (typeof value === 'number') {
    const excelDate = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(excelDate.getTime())) return excelDate.toISOString().split('T')[0];
  }
  const str = String(value).trim();
  if (!str) return null;
  const patterns = [
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
  ];
  for (const pattern of patterns) {
    if (pattern.test(str)) {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    }
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) return parsed.toISOString().split('T')[0];
  return null;
};

const parseAmount = (value: string | number | undefined | null): number | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  if (!str) return null;
  let cleaned = str.replace(/[$€£¥₹₽¥₩₪฿₫₴₸₺₼₾]/g, '').replace(/,/g, '').replace(/\s/g, '').trim();
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNegative) cleaned = '-' + cleaned.slice(1, -1);
  if (cleaned.endsWith('-')) cleaned = '-' + cleaned.slice(0, -1);
  const amount = parseFloat(cleaned);
  if (isNaN(amount)) return null;
  return amount;
};

interface ColumnMapping {
  dateCol: number;
  descCol: number;
  amountCol: number;
  debitCol: number;
  creditCol: number;
  balanceCol: number;
  typeCol: number;
  accountTypeCol: number;
}

const detectColumns = (headers: string[]): ColumnMapping => {
  const lowerHeaders = headers.map(h => String(h || '').toLowerCase().trim());
  
  const findColumn = (keywords: string[], exclude: string[] = []): number => {
    return lowerHeaders.findIndex(h => 
      keywords.some(k => h.includes(k)) && 
      !exclude.some(e => h.includes(e))
    );
  };
  
  const dateCol = findColumn(['date', 'posted', 'trans', 'effective', 'value date', 'booking']);
  const descKeywords = ['description', 'memo', 'narrative', 'details', 'particular', 'payee', 'merchant', 'reference', 'remark', 'name', 'text'];
  let descCol = findColumn(descKeywords, ['date']);
  
  // Single amount column
  const amountKeywords = ['amount', 'sum', 'value', 'total', 'cad$', 'usd$', 'cad', 'usd', 'eur', 'gbp', 'aud', 'money', 'price'];
  const amountCol = findColumn(amountKeywords, ['debit', 'credit', 'balance', 'running', 'withdrawal', 'deposit']);
  
  // Separate debit/credit columns (TD, RBC, Scotiabank, Chase, etc.)
  const debitCol = findColumn(['withdrawal', 'debit', 'debit amount', 'withdrawals'], ['credit']);
  const creditCol = findColumn(['deposit', 'credit', 'credit amount', 'deposits'], ['debit']);
  
  const balanceCol = findColumn(['balance', 'running', 'available']);
  const typeCol = findColumn(['type', 'dr/cr', 'dc'], ['account', 'file', 'content', 'mime']);
  const accountTypeCol = findColumn(['account type', 'account']);
  
  if (descCol < 0) {
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
    accountTypeCol,
  };
};

const parseDirectionFromType = (value: string | undefined | null): 'debit' | 'credit' | null => {
  if (!value) return null;
  const str = String(value).toLowerCase().trim();
  if (str === 'dr' || str === 'd' || str === 'debit' || str === 'withdrawal' || str === 'expense') return 'debit';
  if (str === 'cr' || str === 'c' || str === 'credit' || str === 'deposit' || str === 'income') return 'credit';
  return null;
};

const MAX_TRANSACTIONS = 10000;
const MAX_DESCRIPTION_LENGTH = 500;

function resolveAmountAndDirection(
  values: (string | number | undefined | null)[],
  columns: ColumnMapping
): { amount: number | null; direction: 'debit' | 'credit' } {
  let amount: number | null = null;
  let direction: 'debit' | 'credit' = 'debit';

  // Try type column first
  if (columns.typeCol >= 0) {
    const typeDirection = parseDirectionFromType(values[columns.typeCol] as string);
    if (typeDirection) direction = typeDirection;
  }

  // Method 1: Separate debit/credit columns
  if (columns.debitCol >= 0 && columns.creditCol >= 0) {
    const debitAmount = parseAmount(values[columns.debitCol]);
    const creditAmount = parseAmount(values[columns.creditCol]);
    if (debitAmount !== null && debitAmount !== 0) {
      amount = Math.abs(debitAmount);
      direction = 'debit';
    } else if (creditAmount !== null && creditAmount !== 0) {
      amount = Math.abs(creditAmount);
      direction = 'credit';
    }
    if (amount !== null) return { amount, direction };
  }

  // Method 2: Single amount column
  if (columns.amountCol >= 0) {
    const rawAmount = parseAmount(values[columns.amountCol]);
    if (rawAmount !== null) {
      if (columns.typeCol < 0) direction = rawAmount < 0 ? 'debit' : 'credit';
      amount = Math.abs(rawAmount);
    }
  }
  
  // Method 3: Fallback — find any numeric column
  if (amount === null) {
    for (let j = 0; j < values.length; j++) {
      if (j !== columns.dateCol && j !== columns.balanceCol && j !== columns.debitCol && j !== columns.creditCol) {
        const parsedAmount = parseAmount(values[j]);
        if (parsedAmount !== null && parsedAmount !== 0) {
          amount = Math.abs(parsedAmount);
          direction = parsedAmount < 0 ? 'debit' : 'credit';
          break;
        }
      }
    }
  }

  return { amount, direction };
}

export const parseCSV = async (file: File): Promise<ParseResult> => {
  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) return { success: false, transactions: [], error: 'File appears to be empty or has no data rows' };
    if (lines.length - 1 > MAX_TRANSACTIONS) return { success: false, transactions: [], error: `File exceeds maximum of ${MAX_TRANSACTIONS} transactions` };
    
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    const columns = detectColumns(headers);
    
    const transactions: ParsedTransaction[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = parseCSVLine(line);
      const date = parseDate(values[columns.dateCol]);
      let description = values[columns.descCol]?.replace(/^"|"$/g, '').trim().substring(0, MAX_DESCRIPTION_LENGTH) || '';
      
      if (!description) {
        for (let j = 0; j < values.length; j++) {
          if (j !== columns.dateCol && j !== columns.amountCol && j !== columns.balanceCol && j !== columns.debitCol && j !== columns.creditCol) {
            const val = values[j]?.trim();
            if (val && val.length > 3 && isNaN(parseFloat(val))) { description = val; break; }
          }
        }
      }
      
      const { amount, direction } = resolveAmountAndDirection(values, columns);
      
      if (date && description && amount !== null && amount > 0) {
        transactions.push({ date, description, amount, direction });
      }
    }
    
    if (transactions.length === 0) return { success: false, transactions: [], error: 'Could not parse any transactions. Please check the file format.' };
    return { success: true, transactions };
  } catch (error) {
    return { success: false, transactions: [], error: `Failed to parse CSV: ${error}` };
  }
};

const parseCSVLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
    else current += char;
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
    
    if (data.length < 2) return { success: false, transactions: [], error: 'File appears to be empty or has no data rows' };
    if (data.length - 1 > MAX_TRANSACTIONS) return { success: false, transactions: [], error: `File exceeds maximum of ${MAX_TRANSACTIONS} transactions` };
    
    const headers = (data[0] || []).map(h => String(h || ''));
    const columns = detectColumns(headers);
    
    const transactions: ParsedTransaction[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as (string | number | Date)[];
      if (!row || row.length === 0 || row.every(cell => !cell)) continue;
      
      const date = parseDate(row[columns.dateCol]);
      let description = String(row[columns.descCol] || '').trim().substring(0, MAX_DESCRIPTION_LENGTH);
      
      if (!description) {
        for (let j = 0; j < row.length; j++) {
          if (j !== columns.dateCol && j !== columns.amountCol && j !== columns.balanceCol && j !== columns.debitCol && j !== columns.creditCol) {
            const val = String(row[j] || '').trim();
            if (val && val.length > 3 && isNaN(parseFloat(val))) { description = val; break; }
          }
        }
      }
      
      const { amount, direction } = resolveAmountAndDirection(row as (string | number | undefined | null)[], columns);
      
      if (date && description && amount !== null && amount > 0) {
        transactions.push({ date, description, amount, direction });
      }
    }
    
    if (transactions.length === 0) return { success: false, transactions: [], error: 'Could not parse any transactions. Please check the file format.' };
    return { success: true, transactions };
  } catch (error) {
    return { success: false, transactions: [], error: `Failed to parse XLSX: ${error}` };
  }
};

export const parseFile = async (file: File): Promise<ParseResult> => {
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.csv')) return parseCSV(file);
  else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return parseXLSX(file);
  else if (fileName.endsWith('.pdf')) { const { parsePdf } = await import('./pdf'); return parsePdf(file); }
  return { success: false, transactions: [], error: 'Unsupported file format' };
};
