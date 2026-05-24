/**
 * answer-key.extractor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Parses a plain-text answer key into a map of question-number → correct letter.
 *
 * Supported formats:
 *
 *   1. B          (one answer per line)
 *   1) B
 *   1: B
 *   1 - B
 *   1 B           (space-separated, single letter on same line)
 *
 *   1.B 2.C 3.A   (inline, comma-/space-separated)
 *   1-B, 2-C, 3-A
 *
 *   Table format:
 *   | 1 | B |    (Markdown / ASCII table)
 *
 *   Answer key header lines (e.g. "Answer Key:", "Answers:") are skipped.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type AnswerKey = Record<number, 'A' | 'B' | 'C' | 'D'>;

/** Single answer per line: "1. B" | "1) B" | "1: B" | "1 - B" | "1 B" */
const RE_SINGLE_LINE = /^\s*(\d{1,3})\s*[.):\-\s]\s*([A-D])\s*$/i;

/** Inline multiple answers: "1.B" "2-C" "3:A" etc. */
const RE_INLINE = /\b(\d{1,3})\s*[.):\-]\s*([A-D])\b/gi;

/** Markdown/ASCII table cell: "| 1 | B |" */
const RE_TABLE_CELL = /\|\s*(\d{1,3})\s*\|\s*([A-D])\s*\|/gi;

/** Lines to skip: headers, blank, separators */
const RE_SKIP = /^(?:answer(?:\s+key)?s?|ans(?:wers?)?|correct\s+answers?|key)\s*:?\s*$/i;

export function extractAnswerKey(text: string): AnswerKey {
  const map: AnswerKey = {};

  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    // Skip header/separator lines
    if (RE_SKIP.test(line) || /^[-=|+]+$/.test(line)) continue;

    // Try table format first
    let tableMatch: RegExpExecArray | null;
    RE_TABLE_CELL.lastIndex = 0;
    let foundTable = false;
    while ((tableMatch = RE_TABLE_CELL.exec(line)) !== null) {
      map[parseInt(tableMatch[1])] =
        tableMatch[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      foundTable = true;
    }
    if (foundTable) continue;

    // Try single-answer-per-line
    const singleMatch = RE_SINGLE_LINE.exec(line);
    if (singleMatch) {
      map[parseInt(singleMatch[1])] =
        singleMatch[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      continue;
    }

    // Try inline multiple answers (e.g., "1.B 2.C 3.A")
    let inlineMatch: RegExpExecArray | null;
    RE_INLINE.lastIndex = 0;
    while ((inlineMatch = RE_INLINE.exec(line)) !== null) {
      map[parseInt(inlineMatch[1])] =
        inlineMatch[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
    }
  }

  return map;
}
