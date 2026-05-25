import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { extractTextFromPdf } from './parsers/pdf.parser';
import { extractTextFromDocx } from './parsers/docx.parser';
import { extractMcqQuestions, ParsedQuestion } from './parsers/mcq.extractor';
import { extractAnswerKey } from './parsers/answer-key.extractor';
import { extractTextFromImage, IMAGE_MIME_TYPES } from './parsers/image.parser';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { CreateManualQuestionDto } from './dto/create-manual-question.dto';

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

    // Upload raw file to Firebase Storage (best-effort — won't block parsing
    // if the Storage bucket hasn't been provisioned yet).
    const storagePath = `question-files/${examId}/${Date.now()}-${file.originalname}`;
    try {
      const storageFile = this.bucket.file(storagePath);
      await storageFile.save(file.buffer, {
        metadata: { contentType: file.mimetype },
      });
      this.logger.log(`Uploaded source file: ${storagePath}`);
    } catch (storageErr) {
      this.logger.warn(
        `Storage upload skipped (bucket not available): ${(storageErr as Error).message}`,
      );
    }

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

  // ── Manual Question Add ───────────────────────────────────────────────────

  async createManualQuestion(
    examId: string,
    dto: CreateManualQuestionDto,
  ): Promise<QuestionDoc> {
    const examSnap = await this.db.collection('exams').doc(examId).get();
    if (!examSnap.exists) {
      throw new NotFoundException(`Exam ${examId} not found.`);
    }

    const questionsRef = this.db
      .collection('exams')
      .doc(examId)
      .collection('questions');

    // ── Determine next order number ───────────────────────────────────────
    // Use count() aggregation — no index required, works on empty collections.
    // Falls back to orderBy if count() is unavailable, then to Date.now() as
    // a last resort so the question always gets saved with a unique order.
    let nextOrder: number;
    try {
      const countSnap = await questionsRef.count().get();
      nextOrder = (countSnap.data().count ?? 0) + 1;
    } catch (countErr) {
      this.logger.warn(
        `count() failed for exam ${examId}, trying orderBy: ${(countErr as Error).message}`,
      );
      try {
        const snap = await questionsRef.orderBy('order', 'desc').limit(1).get();
        nextOrder = snap.empty ? 1 : ((snap.docs[0].data().order as number) ?? 0) + 1;
      } catch (orderErr) {
        this.logger.warn(
          `orderBy also failed for exam ${examId}, using timestamp: ${(orderErr as Error).message}`,
        );
        nextOrder = Date.now(); // unique, always > sequential numbers
      }
    }

    const now = admin.firestore.Timestamp.now();
    const ref = questionsRef.doc();

    const data = {
      examId,
      questionText: dto.questionText,
      options: {
        A: String(dto.options?.A ?? ''),
        B: String(dto.options?.B ?? ''),
        C: String(dto.options?.C ?? ''),
        D: String(dto.options?.D ?? ''),
      },
      correctAnswer: dto.correctAnswer,
      needsReview: false,
      order: nextOrder,
      sourceFile: 'manual',
      createdAt: now,
    };

    // ── Write to Firestore ────────────────────────────────────────────────
    try {
      const batch = this.db.batch();
      batch.set(ref, data);
      batch.update(this.db.collection('exams').doc(examId), {
        questionCount: admin.firestore.FieldValue.increment(1),
        updatedAt: now,
      });
      await batch.commit();
    } catch (batchErr) {
      const msg = (batchErr as Error).message ?? 'Unknown Firestore error';
      this.logger.error(`Batch commit failed for exam ${examId}: ${msg}`, (batchErr as Error).stack);
      throw new InternalServerErrorException(`Failed to save question: ${msg}`);
    }

    this.logger.log(`Manual question added to exam ${examId}: ${ref.id}`);
    return this.docToQuestion(ref.id, examId, data);
  }

  // ── Dual-File Upload (question file + answer key file) ────────────────────

  async uploadAndParseDual(
    questionFile: Express.Multer.File,
    answerFile: Express.Multer.File,
    examId: string,
  ): Promise<{
    saved: number;
    needsReview: number;
    matched: number;
    questions: QuestionDoc[];
  }> {
    const examSnap = await this.db.collection('exams').doc(examId).get();
    if (!examSnap.exists) {
      throw new NotFoundException(`Exam ${examId} not found.`);
    }

    // ── Extract question text ─────────────────────────────────────────────
    let questionText: string;
    if (questionFile.mimetype === 'application/pdf') {
      questionText = await extractTextFromPdf(questionFile.buffer);
    } else if (
      questionFile.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      questionFile.mimetype === 'application/msword'
    ) {
      questionText = await extractTextFromDocx(questionFile.buffer);
    } else {
      throw new BadRequestException(
        'Question file must be PDF or DOCX.',
      );
    }

    if (!questionText.trim()) {
      throw new BadRequestException(
        'No text could be extracted from the question file.',
      );
    }

    // ── Extract answer key text ───────────────────────────────────────────
    let answerText: string;

    if (answerFile.mimetype === 'application/pdf') {
      answerText = await extractTextFromPdf(answerFile.buffer);
    } else if (
      answerFile.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      answerFile.mimetype === 'application/msword'
    ) {
      answerText = await extractTextFromDocx(answerFile.buffer);
    } else if (answerFile.mimetype === 'text/plain') {
      answerText = answerFile.buffer.toString('utf-8');
    } else if (IMAGE_MIME_TYPES.includes(answerFile.mimetype)) {
      this.logger.log(`Running OCR on answer key image: ${answerFile.originalname}`);
      try {
        answerText = await extractTextFromImage(answerFile.buffer);
      } catch (ocrErr) {
        throw new BadRequestException(
          `OCR failed on answer key image: ${(ocrErr as Error).message}`,
        );
      }
    } else {
      throw new BadRequestException(
        'Answer file must be PDF, DOCX, TXT, or an image (JPG, PNG, BMP, TIFF, WebP).',
      );
    }

    if (!answerText.trim()) {
      throw new BadRequestException(
        'No text could be extracted from the answer key file.',
      );
    }

    // ── Parse questions ────────────────────────────────────────────────────
    const parsedQuestions = extractMcqQuestions(questionText);
    if (parsedQuestions.length === 0) {
      throw new BadRequestException(
        'No MCQ questions detected in the question file.',
      );
    }

    // ── Parse answer key ───────────────────────────────────────────────────
    const answerKey = extractAnswerKey(answerText);
    this.logger.log(
      `Answer key extracted: ${Object.keys(answerKey).length} answers for ${parsedQuestions.length} questions`,
    );

    // ── Map answers to questions ───────────────────────────────────────────
    let matched = 0;
    const finalQuestions: ParsedQuestion[] = parsedQuestions.map((q) => {
      const answer = answerKey[q.order];
      if (answer) {
        matched++;
        return { ...q, correctAnswer: answer, needsReview: false };
      }
      return { ...q, needsReview: true };
    });

    // ── Batch write to Firestore ───────────────────────────────────────────
    const questionsRef = this.db
      .collection('exams')
      .doc(examId)
      .collection('questions');

    const now = admin.firestore.Timestamp.now();
    const sourceLabel = `${questionFile.originalname} + ${answerFile.originalname}`;
    const batch = this.db.batch();
    const docRefs: admin.firestore.DocumentReference[] = [];

    for (const q of finalQuestions) {
      const ref = questionsRef.doc();
      docRefs.push(ref);
      batch.set(ref, {
        examId,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        needsReview: q.needsReview,
        order: q.order,
        sourceFile: sourceLabel,
        createdAt: now,
      });
    }

    batch.update(this.db.collection('exams').doc(examId), {
      questionCount: admin.firestore.FieldValue.increment(finalQuestions.length),
      updatedAt: now,
    });

    await batch.commit();
    this.logger.log(
      `Dual upload: ${finalQuestions.length} questions saved, ${matched} answers matched for exam ${examId}`,
    );

    const savedDocs: QuestionDoc[] = finalQuestions.map((q, idx) => ({
      id: docRefs[idx].id,
      examId,
      ...q,
      sourceFile: sourceLabel,
      createdAt: new Date(),
    }));

    return {
      saved: finalQuestions.length,
      needsReview: finalQuestions.filter((q) => q.needsReview).length,
      matched,
      questions: savedDocs,
    };
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
