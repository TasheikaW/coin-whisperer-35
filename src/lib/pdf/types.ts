import type { ParsedTransaction, ParseResult } from '../fileParser';

export type { ParsedTransaction };

export interface StatementMetadata {
  statementPeriodStart?: string;
  statementPeriodEnd?: string;
  statementDate?: string;
  accountName?: string;
  lastFourDigits?: string;
  newBalance?: number;
  minimumPayment?: number;
  dueDate?: string;
  institution?: string;
  currency?: string;
}

export interface PdfParseResult extends ParseResult {
  metadata: StatementMetadata;
  currency?: string;
}
