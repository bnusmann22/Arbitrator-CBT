// ============================================
// Arbitration Sandbox — Shared Type Definitions
// ============================================

// ---- Enums ----

export enum UserRole {
  ADMIN = 'admin',
  CANDIDATE = 'candidate',
}

export enum ExamStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export enum CandidateStatus {
  REGISTERED = 'registered',
  IN_PROGRESS = 'in-progress',
  SUBMITTED = 'submitted',
  DISQUALIFIED = 'disqualified',
}

export enum QuestionStatus {
  NOT_VISITED = 'not-visited',
  CURRENT = 'current',
  ANSWERED = 'answered',
  MARKED = 'marked',
  NOT_ANSWERED = 'not-answered',
}

// ---- Data Models ----

export interface Admin {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  totalQuestions: number;
  createdBy: string;
  status: ExamStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  questionText: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  sourceFile?: string;
  order?: number;
  createdAt: Date;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  examCode: string;
  examId: string;
  status: CandidateStatus;
  tabSwitchCount: number;
  startedAt?: Date;
  submittedAt?: Date;
  score?: number;
  totalAnswered?: number;
  createdAt: Date;
}

export interface ExamSession {
  candidateId: string;
  examId: string;
  startTime: Date;
  questionOrder: string[];
  status: 'active' | 'submitted' | 'expired' | 'disqualified';
}

export interface Answer {
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  answeredAt: Date;
}

// ---- API DTOs ----

export interface AdminLoginDto {
  email: string;
  password: string;
}

export interface CandidateLoginDto {
  name: string;
  email: string;
  examCode: string;
}

export interface CreateExamDto {
  title: string;
  description?: string;
  durationMinutes: number;
  totalQuestions: number;
}

export interface CreateCandidateDto {
  name: string;
  email: string;
  examId: string;
}

export interface BulkCreateCandidatesDto {
  candidates: { name: string; email: string }[];
  examId: string;
}

export interface SubmitAnswerDto {
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
}

// ---- API Responses ----

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export interface ExamStartResponse {
  sessionId: string;
  questions: Omit<Question, 'correctAnswer'>[];
  durationMinutes: number;
  startTime: string;
}

export interface ExamStatusResponse {
  timeRemainingSeconds: number;
  answeredCount: number;
  totalQuestions: number;
  tabSwitchCount: number;
}

export interface ExamSubmitResponse {
  score: number;
  totalQuestions: number;
  totalAnswered: number;
  percentage: number;
}

export interface CandidateResult {
  candidateId: string;
  name: string;
  email: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  status: CandidateStatus;
  timeTaken?: number;
  submittedAt?: Date;
}
