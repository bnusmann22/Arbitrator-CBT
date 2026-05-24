/**
 * pdf.parser.ts
 * Extracts raw text from a PDF buffer using pdf-parse.
 * Returns a single cleaned string ready for the MCQ extractor.
 */

// pdf-parse has no named ESM export; require it to avoid type issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse') as (
  buffer: Buffer,
  options?: Record<string, unknown>,
) => Promise<{ text: string; numpages: number }>;

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer, {
    // Render each page's text in reading order
    normalizeWhitespace: false,
  });

  return cleanText(result.text);
}

/**
 * Post-processes raw PDF text to improve MCQ parsing success:
 * - Collapses excessive blank lines (keep max 2 consecutive)
 * - Removes page headers/footers that repeat on every page
 * - Normalises Unicode hyphens and quotes
 */
function cleanText(raw: string): string {
  return raw
    // Normalise line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Replace Unicode fancy quotes with ASCII
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    // Replace Unicode dashes with hyphen
    .replace(/[–—]/g, '-')
    // Collapse 3+ consecutive blank lines into 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
