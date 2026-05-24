import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ResultData {
  candidate: {
    id: string;
    name: string;
    email: string;
    examCode: string;
    status: string;
    score: number;
    totalAnswered: number;
    tabSwitchCount: number;
    startedAt: string | null;
    submittedAt: string | null;
  };
  exam: {
    id: string;
    title: string;
    durationMinutes: number;
    totalQuestions: number;
  };
  questions: {
    number: number;
    questionText: string;
    options: Record<string, string>;
    correctAnswer: string;
    candidateAnswer: string | null;
    isCorrect: boolean;
  }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function truncate(text: string, max = 120): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

// ── Main export ────────────────────────────────────────────────────────────────

export function generateResultPdf(data: ResultData): void {
  const { candidate, exam, questions } = data;
  const passed = candidate.status !== 'disqualified' && candidate.score >= 50;
  const correct = questions.filter((q) => q.isCorrect).length;

  // ── Page setup ──────────────────────────────────────────────────────────────
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = doc.internal.pageSize.getWidth();   // 210 mm
  const MARGIN = 18;
  let y = 0;

  // ── Colour palette ──────────────────────────────────────────────────────────
  const INDIGO  = [79,  70,  229] as [number, number, number];
  const GREEN   = [16, 185, 129] as [number, number, number];
  const RED     = [220,  38,  38] as [number, number, number];
  const AMBER   = [217, 119,   6] as [number, number, number];
  const DARK    = [15,  23,  42]  as [number, number, number];
  const LIGHT   = [241, 245, 249] as [number, number, number];
  const MUTED   = [100, 116, 139] as [number, number, number];

  const STATUS_COLOUR = candidate.status === 'disqualified' ? RED : passed ? GREEN : AMBER;
  const STATUS_LABEL  = candidate.status === 'disqualified' ? 'DISQUALIFIED' : passed ? 'PASS' : 'FAIL';

  // ─────────────────────────────────────────────────────────────────────────────
  // HEADER BAND
  // ─────────────────────────────────────────────────────────────────────────────

  // Dark navy band
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 42, 'F');

  // Indigo accent strip
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, W, 5, 'F');

  // Organisation name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('ARBITRATION SANDBOX', MARGIN, 16);

  // Exam title
  doc.setFontSize(16);
  doc.setTextColor(241, 245, 249);
  doc.text(exam.title, MARGIN, 26);

  // "Examination Result" label (right-aligned)
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('EXAMINATION RESULT', W - MARGIN, 16, { align: 'right' });

  // Generated date
  doc.setFontSize(7.5);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`, W - MARGIN, 22, { align: 'right' });

  y = 50;

  // ─────────────────────────────────────────────────────────────────────────────
  // CANDIDATE INFO + SCORE PANEL  (two-column layout)
  // ─────────────────────────────────────────────────────────────────────────────

  const LEFT_COL  = MARGIN;
  const RIGHT_COL = W / 2 + 6;
  const COL_W     = W / 2 - MARGIN - 6;

  // Left column — candidate details
  doc.setFillColor(...LIGHT);
  doc.roundedRect(LEFT_COL, y, COL_W, 52, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text('CANDIDATE INFORMATION', LEFT_COL + 6, y + 8);

  const info: [string, string][] = [
    ['Name',       candidate.name],
    ['Email',      candidate.email],
    ['Exam Code',  candidate.examCode],
    ['Started',    fmt(candidate.startedAt)],
    ['Submitted',  fmt(candidate.submittedAt)],
  ];

  let iy = y + 14;
  for (const [label, value] of info) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label + ':', LEFT_COL + 6, iy);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(value, LEFT_COL + 28, iy);
    iy += 7.5;
  }

  // Right column — score summary box
  doc.setFillColor(...DARK);
  doc.roundedRect(RIGHT_COL, y, COL_W, 52, 3, 3, 'F');

  // Status badge
  doc.setFillColor(...STATUS_COLOUR);
  doc.roundedRect(RIGHT_COL + 6, y + 6, 28, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(STATUS_LABEL, RIGHT_COL + 20, y + 13, { align: 'center' });

  // Big score
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...STATUS_COLOUR);
  doc.text(`${candidate.score}%`, RIGHT_COL + COL_W / 2, y + 32, { align: 'center' });

  // Score sub-labels
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${correct} / ${exam.totalQuestions} correct`, RIGHT_COL + COL_W / 2, y + 39, { align: 'center' });
  doc.text(`${candidate.totalAnswered} answered  ·  ${candidate.tabSwitchCount} tab switch${candidate.tabSwitchCount === 1 ? '' : 'es'}`, RIGHT_COL + COL_W / 2, y + 45, { align: 'center' });

  y += 60;

  // ─────────────────────────────────────────────────────────────────────────────
  // SCORE PROGRESS BAR
  // ─────────────────────────────────────────────────────────────────────────────

  doc.setFillColor(226, 232, 240);
  doc.roundedRect(MARGIN, y, W - MARGIN * 2, 6, 3, 3, 'F');

  const barFill = ((candidate.score / 100) * (W - MARGIN * 2));
  doc.setFillColor(...STATUS_COLOUR);
  doc.roundedRect(MARGIN, y, barFill, 6, 3, 3, 'F');

  // Threshold marker at 50%
  const midX = MARGIN + (W - MARGIN * 2) / 2;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(midX, y - 1, midX, y + 7);
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text('50% threshold', midX + 1, y - 2);

  y += 12;

  // ─────────────────────────────────────────────────────────────────────────────
  // QUESTION BREAKDOWN TABLE
  // ─────────────────────────────────────────────────────────────────────────────

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text('Question Breakdown', MARGIN, y);
  y += 5;

  // Legend chips
  const legendY = y;
  doc.setFillColor(...GREEN);
  doc.roundedRect(MARGIN, legendY, 12, 5, 1.5, 1.5, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('✓', MARGIN + 6, legendY + 3.6, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Correct', MARGIN + 14, legendY + 3.8);

  doc.setFillColor(...RED);
  doc.roundedRect(MARGIN + 32, legendY, 12, 5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('✗', MARGIN + 38, legendY + 3.6, { align: 'center' });

  doc.setTextColor(...MUTED);
  doc.text('Incorrect', MARGIN + 46, legendY + 3.8);

  doc.setFillColor(226, 232, 240);
  doc.roundedRect(MARGIN + 70, legendY, 12, 5, 1.5, 1.5, 'F');
  doc.setTextColor(100, 116, 139);
  doc.text('—', MARGIN + 76, legendY + 3.6, { align: 'center' });

  doc.setTextColor(...MUTED);
  doc.text('Not answered', MARGIN + 84, legendY + 3.8);

  y += 10;

  // Table rows
  const rows = questions.map((q) => {
    const icon = q.candidateAnswer === null ? '—' : q.isCorrect ? '✓' : '✗';
    const optText = (key: string | null) => {
      if (!key) return '—';
      const text = q.options[key] ?? '';
      return `${key}. ${truncate(text, 55)}`;
    };

    return [
      String(q.number),
      truncate(q.questionText, 80),
      optText(q.candidateAnswer),
      optText(q.correctAnswer),
      icon,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Question', 'Your Answer', 'Correct Answer', 'Result']],
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      font: 'helvetica',
      textColor: DARK,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: DARK,
      textColor: [241, 245, 249],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 68 },
      2: { cellWidth: 38 },
      3: { cellWidth: 38 },
      4: { cellWidth: 12, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell(data) {
      // Colour the Result column cell
      if (data.column.index === 4 && data.section === 'body') {
        const val = data.cell.raw as string;
        if (val === '✓') {
          data.cell.styles.textColor = GREEN;
          data.cell.styles.fontStyle = 'bold';
        } else if (val === '✗') {
          data.cell.styles.textColor = RED;
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = MUTED;
        }
      }
      // Colour wrong answers in "Your Answer" column
      if (data.column.index === 2 && data.section === 'body') {
        const rowIndex = data.row.index;
        const q = questions[rowIndex];
        if (q && q.candidateAnswer !== null && !q.isCorrect) {
          data.cell.styles.textColor = RED;
        }
      }
      // Correct answer always green
      if (data.column.index === 3 && data.section === 'body') {
        data.cell.styles.textColor = GREEN;
      }
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FOOTER on every page
  // ─────────────────────────────────────────────────────────────────────────────

  const pageCount = (doc.internal as unknown as { getNumberOfPages(): number }).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 10;

    doc.setFillColor(226, 232, 240);
    doc.rect(0, footerY - 3, W, 14, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(
      `Arbitration Sandbox — Confidential Result Document · ${exam.title}`,
      MARGIN,
      footerY + 3,
    );
    doc.text(`Page ${i} of ${pageCount}`, W - MARGIN, footerY + 3, { align: 'right' });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SAVE
  // ─────────────────────────────────────────────────────────────────────────────

  const safeName = candidate.name.replace(/\s+/g, '_');
  doc.save(`${safeName}_${exam.title.replace(/\s+/g, '_')}_Result.pdf`);
}
