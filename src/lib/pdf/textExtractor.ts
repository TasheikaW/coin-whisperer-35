import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Extract all text content from a PDF file, page by page.
 * Reconstructs lines by grouping text items that share the same Y position.
 */
export async function extractTextFromPdf(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Group text items by Y position to reconstruct lines
    const lineMap = new Map<number, { x: number; text: string }[]>();

    for (const item of textContent.items) {
      if (!('str' in item)) continue;
      const y = Math.round(item.transform[5]); // Y position
      const x = item.transform[4]; // X position
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ x, text: item.str });
    }

    // Sort lines top-to-bottom (higher Y = higher on page in PDF coords)
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    const pageLines: string[] = [];

    for (const y of sortedYs) {
      const items = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      let line = '';
      let lastX = -1;
      for (const item of items) {
        if (lastX >= 0 && item.x - lastX > 15) {
          line += '  '; // Column gap
        } else if (lastX >= 0 && item.x - lastX > 3) {
          line += ' ';
        }
        line += item.text;
        lastX = item.x + item.text.length * 5; // Approximate end position
      }
      if (line.trim()) pageLines.push(line.trim());
    }

    pages.push(pageLines.join('\n'));
  }

  return pages;
}
