/**
 * image.parser.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Extracts text from image files (JPG, PNG, BMP, TIFF, GIF, WebP) using
 * Tesseract.js (WASM-based OCR — no system Tesseract install required).
 *
 * Language: English (downloaded on first use to the OS temp directory).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// tesseract.js v4 ships both CJS and ESM; the CJS path is used here.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Tesseract = require('tesseract.js') as typeof import('tesseract.js');

/** MIME types that are accepted as image answer-key files */
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/bmp',
  'image/tiff',
  'image/gif',
  'image/webp',
];

/**
 * Run OCR on an image buffer and return the extracted text.
 * Uses the English training data (downloaded once to the system temp folder).
 */
export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const { data } = await Tesseract.recognize(buffer, 'eng', {
    // Suppress verbose progress output in the server logs
    logger: () => { /* no-op */ },
  });
  return (data.text ?? '').trim();
}
