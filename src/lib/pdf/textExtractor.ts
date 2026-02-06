import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * A single text segment with its horizontal position in PDF coordinates.
 */
export interface TextSegment {
  text: string;
  x: number;
  width: number;
}

/**
 * A reconstructed line that includes both the flattened string
 * and the raw segments with X positions for column detection.
 */
export interface StructuredLine {
  text: string;
  segments: TextSegment[];
}

/**
 * A page with both plain text and structured line data.
 */
export interface StructuredPage {
  text: string;
  lines: StructuredLine[];
}

/**
 * Extract all text content from a PDF file, page by page.
 * Reconstructs lines by grouping text items that share the same Y position.
 */
export async function extractTextFromPdf(file: File): Promise<string[]> {
  const structured = await extractStructuredTextFromPdf(file);
  return structured.map(p => p.text);
}

/**
 * Extract structured text with X-position data for column-aware parsing.
 */
export async function extractStructuredTextFromPdf(file: File): Promise<StructuredPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: StructuredPage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Group text items by Y position to reconstruct lines
    const lineMap = new Map<number, { x: number; text: string; width: number }[]>();

    for (const item of textContent.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]); // Y position
      const x = item.transform[4]; // X position
      const width = item.width ?? item.str.length * 5; // Use reported width or approximate
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ x, text: item.str, width });
    }

    // Sort lines top-to-bottom (higher Y = higher on page in PDF coords)
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    const structuredLines: StructuredLine[] = [];

    for (const y of sortedYs) {
      const items = lineMap.get(y)!.sort((a, b) => a.x - b.x);

      // Build segments array preserving X positions
      const segments: TextSegment[] = items.map(item => ({
        text: item.text,
        x: item.x,
        width: item.width,
      }));

      // Build flattened text line (same logic as before)
      let line = '';
      let lastX = -1;
      for (const item of items) {
        if (lastX >= 0 && item.x - lastX > 15) {
          line += '  '; // Column gap
        } else if (lastX >= 0 && item.x - lastX > 3) {
          line += ' ';
        }
        line += item.text;
        lastX = item.x + item.width;
      }

      const trimmed = line.trim();
      if (trimmed) {
        structuredLines.push({ text: trimmed, segments });
      }
    }

    pages.push({
      text: structuredLines.map(l => l.text).join('\n'),
      lines: structuredLines,
    });
  }

  return pages;
}
