import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ExamStatus } from '@arbitration/types';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

export interface ExamDoc {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  totalQuestions: number;
  createdBy: string;
  status: ExamStatus;
  questionCount: number;
  candidateCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @Inject('FIRESTORE') private readonly db: admin.firestore.Firestore,
  ) {}

  // ── Exam CRUD ─────────────────────────────────────────────────────────────

  async createExam(dto: CreateExamDto, adminId: string): Promise<ExamDoc> {
    const now = admin.firestore.Timestamp.now();
    const data = {
      title: dto.title,
      description: dto.description ?? '',
      durationMinutes: dto.durationMinutes,
      totalQuestions: dto.totalQuestions,
      createdBy: adminId,
      status: ExamStatus.DRAFT,
      questionCount: 0,
      candidateCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await this.db.collection('exams').add(data);
    this.logger.log(`Exam created: ${ref.id} by admin ${adminId}`);

    return this.docToExam(ref.id, data);
  }

  async updateExam(id: string, dto: UpdateExamDto): Promise<ExamDoc> {
    const ref = this.db.collection('exams').doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      throw new NotFoundException(`Exam ${id} not found.`);
    }

    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.Timestamp.now(),
    };
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.durationMinutes !== undefined) updates.durationMinutes = dto.durationMinutes;
    if (dto.totalQuestions !== undefined) updates.totalQuestions = dto.totalQuestions;
    if (dto.status !== undefined) updates.status = dto.status;

    await ref.update(updates);

    const updated = await ref.get();
    return this.docToExam(id, updated.data()!);
  }

  async listExams(): Promise<ExamDoc[]> {
    const snap = await this.db
      .collection('exams')
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs.map((d) => this.docToExam(d.id, d.data()));
  }

  async getExam(id: string): Promise<ExamDoc> {
    const snap = await this.db.collection('exams').doc(id).get();
    if (!snap.exists) throw new NotFoundException(`Exam ${id} not found.`);
    return this.docToExam(snap.id, snap.data()!);
  }

  async deleteExam(id: string): Promise<void> {
    const ref = this.db.collection('exams').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException(`Exam ${id} not found.`);
    await ref.delete();
    this.logger.log(`Exam deleted: ${id}`);
  }

  // ── Dashboard Stats ───────────────────────────────────────────────────────

  async getStats(): Promise<{
    totalExams: number;
    activeExams: number;
    totalCandidates: number;
    avgScore: number | null;
    recentExams: ExamDoc[];
  }> {
    const [examsSnap, candidatesSnap] = await Promise.all([
      this.db.collection('exams').get(),
      this.db.collection('candidates').get(),
    ]);

    const exams = examsSnap.docs.map((d) => this.docToExam(d.id, d.data()));
    const activeExams = exams.filter((e) => e.status === ExamStatus.ACTIVE).length;

    const candidates = candidatesSnap.docs.map((d) => d.data());
    const submitted = candidates.filter((c) => c.score != null);
    const avgScore =
      submitted.length > 0
        ? Math.round(
            submitted.reduce((sum, c) => sum + (c.score as number), 0) /
              submitted.length,
          )
        : null;

    return {
      totalExams: exams.length,
      activeExams,
      totalCandidates: candidates.length,
      avgScore,
      recentExams: exams.slice(0, 5),
    };
  }

  // ── Candidate Result Report ───────────────────────────────────────────────
  //    Returns everything needed to generate the admin PDF result sheet.

  async getCandidateResult(candidateId: string) {
    // 1. Candidate doc
    const candSnap = await this.db.collection('candidates').doc(candidateId).get();
    if (!candSnap.exists) {
      throw new NotFoundException(`Candidate ${candidateId} not found.`);
    }
    const cand = candSnap.data()!;

    // 2. Session doc (contains the per-question answers)
    const sessionSnap = await this.db
      .collection('exam_sessions')
      .doc(candidateId)
      .get();

    const answers: Record<string, string | null> = sessionSnap.exists
      ? (sessionSnap.data()!.answers ?? {})
      : {};

    // 3. Exam doc
    const examId = cand.examId as string;
    const examSnap = await this.db.collection('exams').doc(examId).get();
    const exam = examSnap.exists ? examSnap.data()! : {};

    // 4. Questions (with correct answers — admin only)
    const questionsSnap = await this.db
      .collection('exams')
      .doc(examId)
      .collection('questions')
      .get();

    const questions = questionsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((q: any, idx: number) => {
        const candidateAnswer = answers[q.id] ?? null;
        return {
          number:          idx + 1,
          questionText:    q.questionText as string,
          options:         q.options as Record<string, string>,
          correctAnswer:   q.correctAnswer as string,
          candidateAnswer,
          isCorrect:       candidateAnswer !== null && candidateAnswer === q.correctAnswer,
        };
      });

    return {
      candidate: {
        id:             candidateId,
        name:           cand.name,
        email:          cand.email,
        examCode:       cand.examCode,
        status:         cand.status,
        score:          cand.score ?? 0,
        totalAnswered:  cand.totalAnswered ?? 0,
        tabSwitchCount: cand.tabSwitchCount ?? 0,
        startedAt:      cand.startedAt?.toDate?.()?.toISOString() ?? null,
        submittedAt:    cand.submittedAt?.toDate?.()?.toISOString() ?? null,
      },
      exam: {
        id:              examId,
        title:           exam.title ?? 'Exam',
        durationMinutes: exam.durationMinutes ?? 0,
        totalQuestions:  questionsSnap.docs.length,
      },
      questions,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private docToExam(id: string, data: admin.firestore.DocumentData): ExamDoc {
    return {
      id,
      title: data.title,
      description: data.description,
      durationMinutes: data.durationMinutes,
      totalQuestions: data.totalQuestions,
      createdBy: data.createdBy,
      status: data.status,
      questionCount: data.questionCount ?? 0,
      candidateCount: data.candidateCount ?? 0,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    };
  }
}
