/**
 * docx.parser.ts
 * Extracts raw text from a DOCX buffer using mammoth.
 */

import * as mammoth from 'mammoth';

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });

  if (result.messages.length > 0) {
    const warnings = result.messages.filter((m) => m.type === 'warning');
    if (warnings.length > 0) {
      console.warn('[docx.parser] Mammoth warnings:', warnings.map((w) => w.message));
    }
  }

  return cleanText(result.value);
}

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Normalise Unicode quotes & dashes
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[–—]/g, '-')
    // Collapse excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
