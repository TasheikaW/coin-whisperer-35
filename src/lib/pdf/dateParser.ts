const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Parse a date string from the beginning of a line, using statement year context.
 * Supports many international formats:
 *   Jan 15, JAN 15, 15JUL, 05JUL24, 01/15/2024, 01/15/24, 01/15,
 *   2024-01-15, 15-Jan-2024, 27 Apr 2018, 01/20/06*
 */
export function parseDateFromLine(
  text: string,
  contextYear?: number,
): { date: string; rest: string } | null {
  const trimmed = text.trim();
  const year = contextYear || new Date().getFullYear();
  let match: RegExpMatchArray | null;

  // ── Pattern: DDMMMYY  e.g. 05JUL24, 01AUG24 ──
  match = trimmed.match(/^(\d{2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\d{2})\b/i);
  if (match) {
    const day = match[1];
    const month = MONTH_MAP[match[2].toLowerCase()];
    const y = (parseInt(match[3]) > 50 ? '19' : '20') + match[3];
    const rest = trimmed.slice(match[0].length).trim();
    return { date: `${y}-${month}-${day}`, rest };
  }

  // ── Pattern: DDMMM  e.g. 15JUL, 05AUG ──
  match = trimmed.match(/^(\d{2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i);
  if (match) {
    const day = match[1];
    const month = MONTH_MAP[match[2].toLowerCase()];
    const rest = trimmed.slice(match[0].length).trim();
    return { date: `${year}-${month}-${day}`, rest };
  }

  // ── Pattern: Jan 15  or  JAN 15  or  Jan. 15 ──
  match = trimmed.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[.\s]+(\d{1,2})/i);
  if (match) {
    const month = MONTH_MAP[match[1].toLowerCase()];
    const day = match[2].padStart(2, '0');
    const rest = trimmed.slice(match[0].length).trim();
    return { date: `${year}-${month}-${day}`, rest };
  }

  // ── Pattern: DD Mon YYYY  e.g. 27 Apr 2018 ──
  match = trimmed.match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = MONTH_MAP[match[2].toLowerCase()];
    const rest = trimmed.slice(match[0].length).trim();
    return { date: `${match[3]}-${month}-${day}`, rest };
  }

  // ── Pattern: MM/DD/YYYY or MM/DD/YY  (strip trailing asterisk) ──
  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\*?/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    let y = match[3];
    if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
    const rest = trimmed.slice(match[0].length).trim();
    return { date: `${y}-${month}-${day}`, rest };
  }

  // ── Pattern: MM/DD  (no year, strip trailing asterisk) ──
  match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\*?(?!\d)/);
  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    const rest = trimmed.slice(match[0].length).trim();
    return { date: `${year}-${month}-${day}`, rest };
  }

  // ── Pattern: YYYY-MM-DD ──
  match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const rest = trimmed.slice(match[0].length).trim();
    return {
      date: `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`,
      rest,
    };
  }

  // ── Pattern: 15-Jan-2024 ──
  match = trimmed.match(/^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2,4})/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = MONTH_MAP[match[2].toLowerCase()];
    let y = match[3];
    if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
    const rest = trimmed.slice(match[0].length).trim();
    return { date: `${y}-${month}-${day}`, rest };
  }

  return null;
}
