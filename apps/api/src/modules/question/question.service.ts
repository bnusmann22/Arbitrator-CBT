import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { extractTextFromPdf } from './parsers/pdf.parser';
import { extractTextFromDocx } from './parsers/docx.parser';
import { extractMcqQuestions, ParsedQuestion } from './parsers/mcq.extractor';
import { UpdateQuestionDto } from './dto/update-question.dto';

export interface QuestionDoc {
  id: string;
  examId: string;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  needsReview: boolean;
  order: number;
  sourceFile: string;
  createdAt: Date;
}

const ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

@Injectable()
export class QuestionService {
  private readonly logger = new Logger(QuestionService.name);

  constructor(
    @Inject('FIRESTORE') private readonly db: admin.firestore.Firestore,
    @Inject('FIREBASE_STORAGE')
    private readonly bucket: ReturnType<admin.storage.Storage['bucket']>,
  ) {}

  // ── Upload & Parse ────────────────────────────────────────────────────────

  async uploadAndParse(
    file: Express.Multer.File,
    examId: string,
  ): Promise<{ saved: number; needsReview: number; questions: QuestionDoc[] }> {
    // Validate MIME type
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only PDF and DOCX files are accepted.',
      );
    }

    // Verify exam exists
    const examSnap = await this.db.collection('exams').doc(examId).get();
    if (!examSnap.exists) {
      throw new NotFoundException(`Exam ${examId} not found.`);
    }

    // Upload raw file to Firebase Storage
    const storagePath = `question-files/${examId}/${Date.now()}-${file.originalname}`;
    const storageFile = this.bucket.file(storagePath);
    await storageFile.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });
    this.logger.log(`Uploaded source file: ${storagePath}`);

    // Extract text
    let rawText: string;
    if (file.mimetype === 'application/pdf') {
      rawText = await extractTextFromPdf(file.buffer);
    } else {
      rawText = await extractTextFromDocx(file.buffer);
    }

    if (!rawText.trim()) {
      throw new BadRequestException(
        'No readable text could be extracted from the file. Is the PDF image-based (scanned)?',
      );
    }

    // Parse MCQ questions
    const parsed: ParsedQuestion[] = extractMcqQuestions(rawText);

    if (parsed.length === 0) {
      throw new BadRequestException(
        'No MCQ questions were detected in the file. ' +
          'Please ensure questions are numbered and options are labelled A–D.',
      );
    }

    this.logger.log(
      `Parsed ${parsed.length} questions from "${file.originalname}" for exam ${examId}`,
    );

    // Batch write to Firestore: exams/{examId}/questions/{auto-id}
    const questionsRef = this.db
      .collection('exams')
      .doc(examId)
      .collection('questions');

    const now = admin.firestore.Timestamp.now();
    const batch = this.db.batch();
    const docRefs: admin.firestore.DocumentReference[] = [];

    for (const q of parsed) {
      const ref = questionsRef.doc();
      docRefs.push(ref);
      batch.set(ref, {
        examId,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        needsReview: q.needsReview,
        order: q.order,
        sourceFile: file.originalname,
        createdAt: now,
      });
    }

    // Update question count on exam document
    const examRef = this.db.collection('exams').doc(examId);
    batch.update(examRef, {
      questionCount: admin.firestore.FieldValue.increment(parsed.length),
      updatedAt: now,
    });

    await batch.commit();

    const savedDocs: QuestionDoc[] = parsed.map((q, idx) => ({
      id: docRefs[idx].id,
      examId,
      ...q,
      sourceFile: file.originalname,
      createdAt: new Date(),
    }));

    const needsReviewCount = parsed.filter((q) => q.needsReview).length;

    return {
      saved: parsed.length,
      needsReview: needsReviewCount,
      questions: savedDocs,
    };
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async getQuestions(examId: string): Promise<QuestionDoc[]> {
    const snap = await this.db
      .collection('exams')
      .doc(examId)
      .collection('questions')
      .orderBy('order', 'asc')
      .get();

    return snap.docs.map((d) => this.docToQuestion(d.id, examId, d.data()));
  }

  async getQuestion(examId: string, questionId: string): Promise<QuestionDoc> {
    const snap = await this.db
      .collection('exams')
      .doc(examId)
      .collection('questions')
      .doc(questionId)
      .get();

    if (!snap.exists) {
      throw new NotFoundException(`Question ${questionId} not found.`);
    }
    return this.docToQuestion(snap.id, examId, snap.data()!);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updateQuestion(
    examId: string,
    questionId: string,
    dto: UpdateQuestionDto,
  ): Promise<QuestionDoc> {
    const ref = this.db
      .collection('exams')
      .doc(examId)
      .collection('questions')
      .doc(questionId);

    const snap = await ref.get();
    if (!snap.exists) {
      throw new NotFoundException(`Question ${questionId} not found.`);
    }

    const updates: Record<string, unknown> = {};
    if (dto.questionText !== undefined) updates.questionText = dto.questionText;
    if (dto.options !== undefined) updates.options = dto.options;
    if (dto.correctAnswer !== undefined) {
      updates.correctAnswer = dto.correctAnswer;
      updates.needsReview = false; // admin has manually set the answer
    }

    await ref.update(updates);
    const updated = await ref.get();
    return this.docToQuestion(questionId, examId, updated.data()!);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async deleteQuestion(examId: string, questionId: string): Promise<void> {
    const ref = this.db
      .collection('exams')
      .doc(examId)
      .collection('questions')
      .doc(questionId);

    const snap = await ref.get();
    if (!snap.exists) {
      throw new NotFoundException(`Question ${questionId} not found.`);
    }

    const batch = this.db.batch();
    batch.delete(ref);
    batch.update(this.db.collection('exams').doc(examId), {
      questionCount: admin.firestore.FieldValue.increment(-1),
    });
    await batch.commit();

    this.logger.log(`Deleted question ${questionId} from exam ${examId}`);
  }

  async deleteAllQuestions(examId: string): Promise<number> {
    const snap = await this.db
      .collection('exams')
      .doc(examId)
      .collection('questions')
      .get();

    if (snap.empty) return 0;

    // Firestore batch max 500 ops; chunk if needed
    const CHUNK = 490;
    let deleted = 0;
    for (let i = 0; i < snap.docs.length; i += CHUNK) {
      const batch = this.db.batch();
      snap.docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted += Math.min(CHUNK, snap.docs.length - i);
    }

    await this.db.collection('exams').doc(examId).update({ questionCount: 0 });
    return deleted;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private docToQuestion(
    id: string,
    examId: string,
    data: admin.firestore.DocumentData,
  ): QuestionDoc {
    return {
      id,
      examId,
      questionText: data.questionText,
      options: data.options,
      correctAnswer: data.correctAnswer,
      needsReview: data.needsReview ?? false,
      order: data.order ?? 0,
      sourceFile: data.sourceFile ?? '',
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    };
  }
}
