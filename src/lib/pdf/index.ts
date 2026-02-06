/**
 * Universal PDF bank-statement parser.
 *
 * Supports many international formats including Scotiabank (Jamaica),
 * American Express, generic credit cards with reference-prefixed lines,
 * statements with separate debit/credit columns,
 * and standard North-American / Australian / European layouts.
 */
export { parsePdf } from './parser';
export type { PdfParseResult, StatementMetadata, ParsedTransaction } from './types';
export type { ColumnLayout } from './columnDetector';
