/**
 * Universal PDF bank-statement parser.
 *
 * Strategy 1: Column-based — detects Credit/Debit/Balance header columns
 *             and assigns amounts by X-position proximity.
 * Strategy 2: Line-based — extracts amounts from line text using regex patterns.
 *
 * Supports many international formats including Scotiabank (Jamaica),
 * American Express, generic credit cards with reference-prefixed lines,
 * and standard North-American / Australian / European layouts.
 */
export { parsePdf } from './parser';
export type { PdfParseResult, StatementMetadata, ParsedTransaction } from './types';
