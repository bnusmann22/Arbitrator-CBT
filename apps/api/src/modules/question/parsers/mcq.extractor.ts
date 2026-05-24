/**
 * mcq.extractor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts plain text (from PDF/DOCX) into structured MCQ Question objects.
 *
 * Supported input formats:
 *
 * Format A — standard numbered:
 *   1. What is arbitration?
 *   A. A binding dispute resolution process outside the courts
 *   B. A form of mediation
 *   C. A court trial
 *   D. None of the above
 *
 * Format B — parenthesised options:
 *   1. What is arbitration?
 *   (A) A binding dispute resolution...
 *   (B) A form of mediation
 *
 * Format C — options on same line as question number (compact):
 *   1. What is arbitration?  A) Binding   B) Non-binding  C) Mediation  D) Litigation
 *
 * Format D — explicit answer line:
 *   Answer: B  /  Ans: B  /  Correct Answer: B
 *
 * Partial questions (missing some options) are kept with needsReview=true so
 * the admin can complete them in the UI instead of being silently dropped.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ParsedQuestion {
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  needsReview: boolean;
  order: number;
}

// ── Regex patterns ────────────────────────────────────────────────────────────

/** Question start: "1." | "1)" | "Q1." | "Question 1:" */
const RE_QUESTION_START =
  /^(?:Q(?:uestion)?\s*)?(\d+)\s*[.):\s]\s*(.{3,})/i;

/** Option line: "A." | "A)" | "(A)" | "A:" | "A-" | "A " (followed by enough text) */
const RE_OPTION_LINE =
  /^\s*(?:\(([A-D])\)|([A-D])\s*[.):\-]+)\s*(.+)/i;

/**
 * Loose option match — "A text..." where letter is followed by whitespace.
 * Only used as fallback when the strict pattern fails.
 */
const RE_OPTION_LOOSE =
  /^\s*([A-D])\s{1,4}(.{4,})/i;

/** Inline options on one line (Format C): "A) text  B) text  C) text  D) text" */
const RE_INLINE_OPTIONS =
  /\b([A-D])[.)]\s+(.+?)(?=\s+[A-D][.)]|$)/gi;

/** Answer declaration line */
const RE_ANSWER_LINE =
  /^(?:answer(?:\s+key)?|ans(?:wer)?|correct(?:\s+answer)?)\s*[:\-]\s*([A-D])/i;

/** Answer embedded in option with asterisk: "A. text *" or "* A. text" */
const RE_ASTERISK_CORRECT = /^\*\s*|\s*\*$/;

/** Lines to skip (page numbers, headers, etc.) */
const RE_SKIP_LINE =
  /^(?:page\s*\d+|\d+\s*of\s*\d+|chapter\s+\d+|section\s+\d+)$/i;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Try both strict and loose option patterns. Returns null if no match. */
function matchOption(line: string): { key: 'A' | 'B' | 'C' | 'D'; value: string } | null {
  const strict = RE_OPTION_LINE.exec(line);
  if (strict) {
    const key = (strict[1] || strict[2]).toUpperCase() as 'A' | 'B' | 'C' | 'D';
    let value = strict[3].trim();
    if (RE_ASTERISK_CORRECT.test(value)) {
      value = value.replace(RE_ASTERISK_CORRECT, '').trim();
    }
    return { key, value };
  }

  const loose = RE_OPTION_LOOSE.exec(line);
  if (loose) {
    const key = loose[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
    return { key, value: loose[2].trim() };
  }

  return null;
}

/** Check if a line looks like it could be an option (for lookahead) */
function isOptionLike(line: string): boolean {
  return RE_OPTION_LINE.test(line) || RE_OPTION_LOOSE.test(line);
}

/** Check if multiple options appear inline on one line */
function hasInlineOptions(line: string): boolean {
  return /\b[A-D][.)]\s+\S.+\b[A-D][.)]\s+\S/i.test(line);
}

// ── Main function ──────────────────────────────────────────────────────────────

export function extractMcqQuestions(text: string): ParsedQuestion[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !RE_SKIP_LINE.test(l));

  const questions: ParsedQuestion[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Detect question start ──────────────────────────────────────────────
    const qMatch = RE_QUESTION_START.exec(line);
    if (!qMatch) {
      i++;
      continue;
    }

    let questionText = qMatch[2].trim();
    i++;

    // Accumulate multi-line question text until an option or new question appears
    while (i < lines.length) {
      const next = lines[i];
      if (
        isOptionLike(next) ||
        RE_QUESTION_START.test(next) ||
        RE_ANSWER_LINE.test(next) ||
        hasInlineOptions(next)
      ) {
        break;
      }
      questionText += ' ' + next;
      i++;
    }
    questionText = questionText.replace(/\s+/g, ' ').trim();

    // ── Detect options ─────────────────────────────────────────────────────
    const options: Partial<{ A: string; B: string; C: string; D: string }> = {};
    let correctAnswer: 'A' | 'B' | 'C' | 'D' | null = null;
    let needsReview = false;

    // Check for inline options (all on one line)
    if (i < lines.length && hasInlineOptions(lines[i])) {
      const inlineLine = lines[i];
      i++;
      let m: RegExpExecArray | null;
      RE_INLINE_OPTIONS.lastIndex = 0;
      while ((m = RE_INLINE_OPTIONS.exec(inlineLine)) !== null) {
        const key = m[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        const rawVal = m[2].trim();
        if (RE_ASTERISK_CORRECT.test(rawVal)) {
          correctAnswer = key;
        }
        options[key] = rawVal.replace(RE_ASTERISK_CORRECT, '').trim();
      }
    } else {
      // Standard multi-line options
      while (i < lines.length) {
        const optLine = lines[i];

        // Stop if we hit a new question
        if (RE_QUESTION_START.test(optLine) && Object.keys(options).length >= 2) {
          break;
        }

        // Check for answer declaration
        const ansMatch = RE_ANSWER_LINE.exec(optLine);
        if (ansMatch) {
          correctAnswer = ansMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
          i++;
          continue;
        }

        const optResult = matchOption(optLine);
        if (!optResult) {
          // Not an option line; could be a continuation of the previous option
          // (multi-line option text) — only append if we already have options
          if (Object.keys(options).length > 0) {
            const lastKey = ['D', 'C', 'B', 'A'].find((k) => options[k as 'A' | 'B' | 'C' | 'D']);
            if (lastKey && optLine.length < 200) {
              options[lastKey as 'A' | 'B' | 'C' | 'D'] += ' ' + optLine;
              i++;
              continue;
            }
          }
          break; // Unknown line — stop collecting options for this question
        }

        // Detect asterisk-marked correct answer
        if (RE_ASTERISK_CORRECT.test(options[optResult.key] ?? '')) {
          correctAnswer = optResult.key;
        }
        options[optResult.key] = optResult.value;
        i++;

        // All 4 options collected — look ahead for answer line
        if (Object.keys(options).length === 4) {
          if (i < lines.length && RE_ANSWER_LINE.test(lines[i])) {
            const ansMatch = RE_ANSWER_LINE.exec(lines[i])!;
            correctAnswer = ansMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
            i++;
          }
          break;
        }
      }

      // Answer line may follow options (if not already found)
      if (!correctAnswer && i < lines.length && RE_ANSWER_LINE.test(lines[i])) {
        const ansMatch = RE_ANSWER_LINE.exec(lines[i])!;
        correctAnswer = ansMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        i++;
      }
    }

    // ── Validate and collect ───────────────────────────────────────────────
    if (!questionText) continue;

    // Require at least A and B to be a valid MCQ
    if (!options.A && !options.B) continue;

    // Fill any missing options with placeholder and flag for review
    const PLACEHOLDER = '[Option not provided]';
    if (!options.A) { options.A = PLACEHOLDER; needsReview = true; }
    if (!options.B) { options.B = PLACEHOLDER; needsReview = true; }
    if (!options.C) { options.C = PLACEHOLDER; needsReview = true; }
    if (!options.D) { options.D = PLACEHOLDER; needsReview = true; }

    if (!correctAnswer) {
      correctAnswer = 'A';
      needsReview = true;
    }

    questions.push({
      questionText,
      options: {
        A: options.A!,
        B: options.B!,
        C: options.C!,
        D: options.D!,
      },
      correctAnswer,
      needsReview,
      order: questions.length + 1,
    });
  }

  return questions;
}
