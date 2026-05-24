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
 * When no correct answer is detected, it defaults to 'A' and sets
 * `needsReview: true` so the admin can correct it in the UI.
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
  /^(?:Q(?:uestion)?\s*)?(\d+)[.):\s]+\s*(.+)/i;

/** Option line: "A." | "A)" | "(A)" | "A:" */
const RE_OPTION_LINE =
  /^\s*(?:\(([A-D])\)|([A-D])[.):\s]+)\s*(.+)/i;

/** Inline options on one line (Format C): "A) text  B) text  C) text  D) text" */
const RE_INLINE_OPTIONS =
  /\b([A-D])[.)]\s+(.+?)(?=\s+[A-D][.)]|$)/gi;

/** Answer declaration line */
const RE_ANSWER_LINE =
  /^(?:answer(?:\s+key)?|ans(?:wer)?|correct(?:\s+answer)?)\s*[:\-]\s*([A-D])/i;

/** Answer embedded in option with asterisk: "A. text *" or "* A. text" */
const RE_ASTERISK_CORRECT = /^\*\s*|\s*\*$/;

// ── Main function ──────────────────────────────────────────────────────────────

export function extractMcqQuestions(text: string): ParsedQuestion[] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

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

    // Accumulate multi-line question text until an option line appears
    while (
      i < lines.length &&
      !RE_OPTION_LINE.test(lines[i]) &&
      !RE_QUESTION_START.test(lines[i]) &&
      !RE_ANSWER_LINE.test(lines[i])
    ) {
      // Stop if this line looks like inline options (A) ... B) ... C) ... D))
      if (/\b[A-D][.)]\s+\S.+\b[A-D][.)]\s+\S/.test(lines[i])) break;
      questionText += ' ' + lines[i];
      i++;
    }
    questionText = questionText.replace(/\s+/g, ' ').trim();

    // ── Detect options ─────────────────────────────────────────────────────
    const options: Partial<{ A: string; B: string; C: string; D: string }> = {};
    let correctAnswer: 'A' | 'B' | 'C' | 'D' | null = null;
    let needsReview = false;

    // Check for inline options (all on one line)
    if (
      i < lines.length &&
      /\b[A-D][.)]\s+\S.+\b[A-D][.)]\s+\S/.test(lines[i])
    ) {
      const inlineLine = lines[i];
      i++;
      let m: RegExpExecArray | null;
      RE_INLINE_OPTIONS.lastIndex = 0;
      while ((m = RE_INLINE_OPTIONS.exec(inlineLine)) !== null) {
        const key = m[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        options[key] = m[2].trim().replace(RE_ASTERISK_CORRECT, '');
        if (RE_ASTERISK_CORRECT.test(m[2].trim())) {
          correctAnswer = key;
        }
      }
    } else {
      // Standard multi-line options
      while (i < lines.length && Object.keys(options).length < 4) {
        const optLine = lines[i];

        // Check for answer declaration
        const ansMatch = RE_ANSWER_LINE.exec(optLine);
        if (ansMatch) {
          correctAnswer = ansMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
          i++;
          continue;
        }

        const optMatch = RE_OPTION_LINE.exec(optLine);
        if (!optMatch) break;

        const key = (optMatch[1] || optMatch[2]).toUpperCase() as 'A' | 'B' | 'C' | 'D';
        let value = optMatch[3].trim();

        // Asterisk marking correct
        if (RE_ASTERISK_CORRECT.test(value)) {
          correctAnswer = key;
          value = value.replace(RE_ASTERISK_CORRECT, '').trim();
        }

        options[key] = value;
        i++;
      }

      // Answer line may follow options
      if (i < lines.length && RE_ANSWER_LINE.test(lines[i])) {
        const ansMatch = RE_ANSWER_LINE.exec(lines[i])!;
        correctAnswer = ansMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        i++;
      }
    }

    // ── Validate and collect ───────────────────────────────────────────────
    const hasAllOptions =
      options.A && options.B && options.C && options.D;

    if (!questionText || !hasAllOptions) continue; // skip malformed

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
