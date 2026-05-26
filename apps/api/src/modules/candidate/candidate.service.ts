import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CandidateStatus } from '@arbitration/types';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { BulkCreateCandidatesDto } from './dto/bulk-create-candidates.dto';

export interface CandidateDoc {
  id: string;
  name: string;
  email: string;
  examId: string;
  examCode: string;
  status: CandidateStatus;
  tabSwitchCount: number;
  score?: number;
  totalAnswered?: number;
  startedAt?: Date;
  submittedAt?: Date;
  createdAt: Date;
}

/** Unambiguous characters for exam codes (no 0/O, 1/I/L) */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

@Injectable()
export class CandidateService {
  private readonly logger = new Logger(CandidateService.name);

  constructor(
    @Inject('FIRESTORE') private readonly db: admin.firestore.Firestore,
  ) {}

  // ── Code Generation ───────────────────────────────────────────────────────

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return code;
  }

  /** Generates a code guaranteed unique in the `candidates` collection. */
  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.generateCode();
      const existing = await this.db
        .collection('candidates')
        .where('examCode', '==', code)
        .limit(1)
        .get();
      if (existing.empty) return code;
    }
    throw new Error('Could not generate a unique exam code after 10 attempts.');
  }

  // ── Single Create ─────────────────────────────────────────────────────────

  async createCandidate(dto: CreateCandidateDto): Promise<CandidateDoc> {
    // Check exam exists
    const examSnap = await this.db.collection('exams').doc(dto.examId).get();
    if (!examSnap.exists) {
      throw new NotFoundException(`Exam ${dto.examId} not found.`);
    }

    // Check for duplicate email in this exam
    const dup = await this.db
      .collection('candidates')
      .where('examId', '==', dto.examId)
      .where('email', '==', dto.email.toLowerCase())
      .limit(1)
      .get();

    if (!dup.empty) {
      throw new ConflictException(
        `A candidate with email "${dto.email}" already exists in this exam.`,
      );
    }

    const examCode = await this.uniqueCode();
    const now = admin.firestore.Timestamp.now();

    const data = {
      name: dto.name,
      email: dto.email.toLowerCase(),
      examId: dto.examId,
      examCode,
      status: CandidateStatus.REGISTERED,
      tabSwitchCount: 0,
      createdAt: now,
    };

    const ref = await this.db.collection('candidates').add(data);

    // Increment candidateCount on the exam document
    await this.db.collection('exams').doc(dto.examId).update({
      candidateCount: admin.firestore.FieldValue.increment(1),
    });

    this.logger.log(`Candidate created: ${ref.id} (${examCode}) for exam ${dto.examId}`);

    return this.docToCandidate(ref.id, data);
  }

  // ── Bulk Create ───────────────────────────────────────────────────────────

  async bulkCreateCandidates(
    dto: BulkCreateCandidatesDto,
  ): Promise<{ created: number; skipped: number; candidates: CandidateDoc[] }> {
    const examSnap = await this.db.collection('exams').doc(dto.examId).get();
    if (!examSnap.exists) {
      throw new NotFoundException(`Exam ${dto.examId} not found.`);
    }

    // Fetch existing emails for this exam to detect duplicates efficiently
    const existingSnap = await this.db
      .collection('candidates')
      .where('examId', '==', dto.examId)
      .get();

    const existingEmails = new Set(
      existingSnap.docs.map((d) => (d.data().email as string).toLowerCase()),
    );

    const now = admin.firestore.Timestamp.now();
    const results: CandidateDoc[] = [];
    let skipped = 0;

    // Chunk into batches of 490 (Firestore batch limit = 500)
    const CHUNK = 490;
    for (let i = 0; i < dto.candidates.length; i += CHUNK) {
      const chunk = dto.candidates.slice(i, i + CHUNK);
      const batch = this.db.batch();
      const chunkDocs: { ref: admin.firestore.DocumentReference; data: Record<string, unknown>; candidate: typeof chunk[0] }[] = [];

      for (const c of chunk) {
        const email = c.email.toLowerCase();
        if (existingEmails.has(email)) {
          skipped++;
          continue;
        }
        existingEmails.add(email); // prevent dupes within the batch itself

        const examCode = await this.uniqueCode();
        const data: Record<string, unknown> = {
          name: c.name,
          email,
          examId: dto.examId,
          examCode,
          status: CandidateStatus.REGISTERED,
          tabSwitchCount: 0,
          createdAt: now,
        };

        const ref = this.db.collection('candidates').doc();
        batch.set(ref, data);
        chunkDocs.push({ ref, data, candidate: c });
      }

      if (chunkDocs.length > 0) {
        await batch.commit();
        chunkDocs.forEach(({ ref, data }) => {
          results.push(this.docToCandidate(ref.id, data));
        });
      }
    }

    if (results.length > 0) {
      await this.db.collection('exams').doc(dto.examId).update({
        candidateCount: admin.firestore.FieldValue.increment(results.length),
      });
    }

    this.logger.log(
      `Bulk created ${results.length} candidates for exam ${dto.examId} (${skipped} skipped as duplicates)`,
    );

    return { created: results.length, skipped, candidates: results };
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async getCandidates(examId: string): Promise<CandidateDoc[]> {
    // NOTE: Combining where() + orderBy() on different fields needs a composite
    // Firestore index. Sort in memory instead so no index configuration is required.
    const snap = await this.db
      .collection('candidates')
      .where('examId', '==', examId)
      .get();

    const docs = snap.docs.map((d) => this.docToCandidate(d.id, d.data()));

    // Sort newest-first (mirrors the previous orderBy('createdAt', 'desc'))
    docs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return docs;
  }

  async getCandidate(id: string): Promise<CandidateDoc> {
    const snap = await this.db.collection('candidates').doc(id).get();
    if (!snap.exists) throw new NotFoundException(`Candidate ${id} not found.`);
    return this.docToCandidate(snap.id, snap.data()!);
  }

  async deleteCandidate(id: string): Promise<void> {
    const snap = await this.db.collection('candidates').doc(id).get();
    if (!snap.exists) throw new NotFoundException(`Candidate ${id} not found.`);

    const examId = snap.data()!.examId as string;

    // Delete candidate + orphaned exam session atomically so the auto-submit
    // cron never picks up a session whose candidate document no longer exists.
    const batch = this.db.batch();
    batch.delete(snap.ref);
    batch.delete(this.db.collection('exam_sessions').doc(id));
    await batch.commit();

    await this.db.collection('exams').doc(examId).update({
      candidateCount: admin.firestore.FieldValue.increment(-1),
    });

    this.logger.log(`Candidate ${id} deleted.`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private docToCandidate(
    id: string,
    data: admin.firestore.DocumentData,
  ): CandidateDoc {
    return {
      id,
      name: data.name,
      email: data.email,
      examId: data.examId,
      examCode: data.examCode,
      status: data.status,
      tabSwitchCount: data.tabSwitchCount ?? 0,
      score: data.score,
      totalAnswered: data.totalAnswered,
      startedAt: data.startedAt?.toDate?.(),
      submittedAt: data.submittedAt?.toDate?.(),
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    };
  }
}
