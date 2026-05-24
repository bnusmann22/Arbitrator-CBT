import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as admin from 'firebase-admin';
import { CandidateStatus, ExamStatus } from '@arbitration/types';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

// ── Firestore document shape for an active exam session ───────────────────────

interface SessionDoc {
  candidateId: string;
  examId: string;
  startTime: admin.firestore.Timestamp;
  endTime: admin.firestore.Timestamp;
  questionOrder: string[];           // shuffled question IDs
  tabSwitches: number;
  submitted: boolean;
  submittedAt?: admin.firestore.Timestamp;
  answers: Record<string, 'A' | 'B' | 'C' | 'D' | null>;
}

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);

  constructor(
    @Inject('FIRESTORE') private readonly db: admin.firestore.Firestore,
  ) {}

  // ── Fisher-Yates in-place shuffle ─────────────────────────────────────────

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Strip correctAnswer before sending to candidate ───────────────────────

  private sanitizeQuestion(id: string, data: admin.firestore.DocumentData) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { correctAnswer, ...safe } = data;
    return { id, ...safe };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // START EXAM
  // ─────────────────────────────────────────────────────────────────────────

  async startExam(candidateId: string) {
    // 1. Load candidate
    const candidateSnap = await this.db
      .collection('candidates')
      .doc(candidateId)
      .get();

    if (!candidateSnap.exists) {
      throw new NotFoundException('Candidate not found.');
    }

    const candidate = candidateSnap.data()!;

    // 2. Guard: already finished?
    if (candidate.status === CandidateStatus.SUBMITTED) {
      throw new BadRequestException('You have already submitted this exam.');
    }
    if (candidate.status === CandidateStatus.DISQUALIFIED) {
      throw new BadRequestException('You have been disqualified from this exam.');
    }

    // 3. Resume if in-progress
    if (candidate.status === CandidateStatus.IN_PROGRESS) {
      return this.resumeSession(candidateId, candidate.examId as string);
    }

    // 4. Load exam
    const examId = candidate.examId as string;
    const examSnap = await this.db.collection('exams').doc(examId).get();

    if (!examSnap.exists) {
      throw new NotFoundException('Exam not found.');
    }

    const exam = examSnap.data()!;

    if (exam.status !== ExamStatus.ACTIVE) {
      throw new BadRequestException('This exam is not currently active.');
    }

    // 5. Load questions
    const questionsSnap = await this.db
      .collection('exams')
      .doc(examId)
      .collection('questions')
      .get();

    if (questionsSnap.empty) {
      throw new BadRequestException('This exam has no questions uploaded yet.');
    }

    // 6. Fisher-Yates shuffle of question IDs
    const questionIds = questionsSnap.docs.map((d) => d.id);
    const shuffledIds = this.shuffle(questionIds);

    // 7. Create session document keyed by candidateId
    const now = admin.firestore.Timestamp.now();
    const durationMs = (exam.durationMinutes as number) * 60 * 1000;
    const endTime = admin.firestore.Timestamp.fromMillis(now.toMillis() + durationMs);

    const sessionData: SessionDoc = {
      candidateId,
      examId,
      startTime: now,
      endTime,
      questionOrder: shuffledIds,
      tabSwitches: 0,
      submitted: false,
      answers: {},
    };

    await this.db.collection('exam_sessions').doc(candidateId).set(sessionData);

    // 8. Mark candidate as in-progress
    await this.db.collection('candidates').doc(candidateId).update({
      status: CandidateStatus.IN_PROGRESS,
      startedAt: now,
    });

    // 9. Build response — questions in shuffled order, correctAnswer omitted
    const qMap = new Map(
      questionsSnap.docs.map((d) => [d.id, d.data()]),
    );

    const questions = shuffledIds.map((id) =>
      this.sanitizeQuestion(id, qMap.get(id)!),
    );

    this.logger.log(
      `Exam started: candidate=${candidateId}, exam=${examId}, questions=${questions.length}`,
    );

    return {
      sessionId: candidateId,
      questions,
      durationMinutes: exam.durationMinutes,
      startTime: now.toDate().toISOString(),
      endTime: endTime.toDate().toISOString(),
      answers: {} as Record<string, string | null>,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESUME SESSION  (candidate refreshes mid-exam)
  // ─────────────────────────────────────────────────────────────────────────

  private async resumeSession(candidateId: string, examId: string) {
    const sessionSnap = await this.db
      .collection('exam_sessions')
      .doc(candidateId)
      .get();

    if (!sessionSnap.exists) {
      throw new BadRequestException(
        'Session data not found. Please contact the exam administrator.',
      );
    }

    const session = sessionSnap.data() as SessionDoc;

    if (session.submitted) {
      throw new BadRequestException('You have already submitted this exam.');
    }

    const [examSnap, questionsSnap] = await Promise.all([
      this.db.collection('exams').doc(examId).get(),
      this.db.collection('exams').doc(examId).collection('questions').get(),
    ]);

    const exam = examSnap.data()!;

    const qMap = new Map(
      questionsSnap.docs.map((d) => [d.id, d.data()]),
    );

    // Restore original shuffled order (so answers map to the right indices)
    const questions = session.questionOrder
      .map((id) => {
        const data = qMap.get(id);
        return data ? this.sanitizeQuestion(id, data) : null;
      })
      .filter(Boolean);

    this.logger.log(`Session resumed: candidate=${candidateId}`);

    return {
      sessionId: candidateId,
      questions,
      durationMinutes: exam.durationMinutes,
      startTime: session.startTime.toDate().toISOString(),
      endTime: session.endTime.toDate().toISOString(),
      answers: session.answers,   // restore previous selections
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE ANSWER
  // ─────────────────────────────────────────────────────────────────────────

  async saveAnswer(candidateId: string, dto: SubmitAnswerDto) {
    const sessionRef = this.db.collection('exam_sessions').doc(candidateId);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      throw new NotFoundException(
        'Exam session not found. Please start the exam first.',
      );
    }

    const session = sessionSnap.data() as SessionDoc;

    if (session.submitted) {
      throw new BadRequestException('Exam already submitted.');
    }

    // Check expiry
    const now = admin.firestore.Timestamp.now();
    if (now.toMillis() > session.endTime.toMillis()) {
      await this.submitExam(candidateId, 'auto');
      throw new BadRequestException(
        'Exam time has expired. Your answers have been submitted automatically.',
      );
    }

    // Guard: question must be part of this exam session
    if (!session.questionOrder.includes(dto.questionId)) {
      throw new BadRequestException(
        'This question does not belong to your current exam session.',
      );
    }

    // Partial update using Firestore dot-notation — only touches this one field
    await sessionRef.update({
      [`answers.${dto.questionId}`]: dto.selectedOption,
    });

    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUBMIT EXAM
  // ─────────────────────────────────────────────────────────────────────────

  async submitExam(
    candidateId: string,
    reason: 'manual' | 'auto' | 'disqualified' = 'manual',
  ) {
    const sessionRef = this.db.collection('exam_sessions').doc(candidateId);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      throw new NotFoundException('Exam session not found.');
    }

    const session = sessionSnap.data() as SessionDoc;

    // Idempotent: already submitted → return cached result
    if (session.submitted) {
      const cSnap = await this.db
        .collection('candidates')
        .doc(candidateId)
        .get();
      const c = cSnap.data()!;
      return {
        score: c.score ?? 0,
        totalQuestions: session.questionOrder.length,
        totalAnswered: c.totalAnswered ?? 0,
        percentage: c.score ?? 0,
      };
    }

    // Load questions WITH correctAnswer for scoring
    const questionsSnap = await this.db
      .collection('exams')
      .doc(session.examId)
      .collection('questions')
      .get();

    let totalCorrect = 0;
    let totalAnswered = 0;
    const totalQuestions = questionsSnap.docs.length;

    for (const doc of questionsSnap.docs) {
      const q = doc.data();
      const selected = session.answers[doc.id];

      if (selected !== undefined && selected !== null) {
        totalAnswered++;
        if (selected === q.correctAnswer) {
          totalCorrect++;
        }
      }
    }

    const percentage =
      totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;

    const now = admin.firestore.Timestamp.now();
    const finalStatus =
      reason === 'disqualified'
        ? CandidateStatus.DISQUALIFIED
        : CandidateStatus.SUBMITTED;

    // Write session + candidate atomically
    const batch = this.db.batch();
    batch.update(sessionRef, { submitted: true, submittedAt: now });
    batch.update(this.db.collection('candidates').doc(candidateId), {
      status: finalStatus,
      score: percentage,
      totalAnswered,
      submittedAt: now,
    });
    await batch.commit();

    this.logger.log(
      `Exam submitted [${reason}]: candidate=${candidateId}, ` +
        `score=${percentage}% (${totalCorrect}/${totalQuestions} correct)`,
    );

    return { score: totalCorrect, totalQuestions, totalAnswered, percentage };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RECORD TAB SWITCH
  // ─────────────────────────────────────────────────────────────────────────

  async recordTabSwitch(candidateId: string) {
    const sessionRef = this.db.collection('exam_sessions').doc(candidateId);
    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
      throw new NotFoundException('Exam session not found.');
    }

    const session = sessionSnap.data() as SessionDoc;

    if (session.submitted) {
      return { tabSwitches: session.tabSwitches, disqualified: false };
    }

    const newCount = (session.tabSwitches ?? 0) + 1;
    const disqualified = newCount >= 5;

    // Increment both session and candidate counters atomically
    const batch = this.db.batch();
    batch.update(sessionRef, {
      tabSwitches: admin.firestore.FieldValue.increment(1),
    });
    batch.update(this.db.collection('candidates').doc(candidateId), {
      tabSwitchCount: admin.firestore.FieldValue.increment(1),
    });
    await batch.commit();

    if (disqualified) {
      await this.submitExam(candidateId, 'disqualified');
      this.logger.warn(
        `Candidate ${candidateId} DISQUALIFIED after ${newCount} tab switches.`,
      );
    }

    return { tabSwitches: newCount, disqualified };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET STATUS
  // ─────────────────────────────────────────────────────────────────────────

  async getStatus(candidateId: string) {
    const sessionSnap = await this.db
      .collection('exam_sessions')
      .doc(candidateId)
      .get();

    if (!sessionSnap.exists) {
      throw new NotFoundException('Exam session not found.');
    }

    const session = sessionSnap.data() as SessionDoc;

    const nowMs = Date.now();
    const endMs = session.endTime.toMillis();
    const timeRemainingSeconds = Math.max(0, Math.round((endMs - nowMs) / 1000));

    const answeredCount = Object.values(session.answers).filter(
      (v) => v !== null && v !== undefined,
    ).length;

    return {
      timeRemainingSeconds,
      answeredCount,
      totalQuestions: session.questionOrder.length,
      tabSwitchCount: session.tabSwitches,
      submitted: session.submitted,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AUTO-SUBMIT CRON  (every 30 seconds)
  // ─────────────────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_30_SECONDS)
  async autoSubmitExpired() {
    const now = admin.firestore.Timestamp.now();

    const expiredSnap = await this.db
      .collection('exam_sessions')
      .where('submitted', '==', false)
      .where('endTime', '<=', now)
      .get();

    if (expiredSnap.empty) return;

    this.logger.log(
      `Auto-submit cron: ${expiredSnap.docs.length} expired session(s) found.`,
    );

    const results = await Promise.allSettled(
      expiredSnap.docs.map(async (doc) => {
        const { candidateId } = doc.data() as SessionDoc;
        await this.submitExam(candidateId, 'auto');
      }),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      this.logger.error(`Auto-submit: ${failed} session(s) failed to submit.`);
    }
  }
}
