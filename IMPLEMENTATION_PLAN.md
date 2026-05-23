# Arbitration Sandbox — Implementation Plan (Revised)

> MCQ Examination Platform · Next.js + NestJS + Firebase (Firestore only)

---

## Tech Stack (Finalized)

| Layer | Tech |
|:---|:---|
| Frontend | Next.js 15 (TypeScript, App Router) |
| Backend | NestJS (TypeScript) |
| Database | Firebase Firestore (only) |
| File Storage | Firebase Storage |
| Auth | JWT (`jose` + `@nestjs/jwt`) |
| Doc Parsing | `pdf-parse`, `mammoth` (regex-based) |
| PDF Export | `jspdf` + `jspdf-autotable` |
| Monorepo | npm workspaces |

---

## 🎯 IMPORTANT Questions — ANSWERED

### 1. **📄 Question Format** → **Option A (Standard Numbered)**
- Uploaded PDFs/DOCX must follow format:
  ```
  1. What is arbitration?
  A) A binding dispute resolution process
  B) A court proceeding
  C) A negotiation tactic
  D) None of the above
  Answer: A
  ```
- Use **regex-based parsing** (no LLM/Gemini needed)
- Parsing rules: extract numbered questions, A-D options, marked correct answer

### 2. **🗄️ Database Strategy** → **Firestore Only**
- No PostgreSQL needed
- All data in Firestore Firestore collections:
  - `admins` — email, passwordHash, name
  - `exams` — title, duration, totalQuestions, status
  - `questions` — questionText, options, correctAnswer, order
  - `candidates` — name, email, examCode, examId, status
  - `sessions` — candidateId, examId, answers, status, timestamps
  - `results` — candidateId, examId, score, answers, submittedAt
- File uploads → Firebase Storage

### 3. **⚡ Redis Hosting** → **Skip Redis**
- **Not needed** — use Firestore for session state
- Exam sessions stored in Firestore `sessions` collection
- Simpler infrastructure, acceptable performance
- Removed: RedisModule, ioredis dependency

### 4. **👤 First Admin Creation** → **CLI Seed Command**
- CLI script: `npm run seed:admin -- --email admin@test.com --password secret`
- Run once locally, then in production
- No self-registration/invite code page needed

### 5. **⏱️ Exam Configuration** → **Fixed Duration (per exam)**
- **Duration**: Set by admin when creating exam (e.g., 60 minutes)
- **Question Count**: Admin chooses total questions to show
  - Option 1: Show all questions from exam (e.g., all 100)
  - Option 2: Show subset (e.g., 30 random out of 100)
- Question shuffling: Each candidate gets same order (seeded randomness for reproducibility)

### 6. **📧 Result Delivery** → **Admin Manual**
- Admin logs in → Views candidate results
- Admin downloads PDF report (with all answers + score)
- Admin manually emails PDF to candidate
- No auto-email service (SendGrid, Resend, etc.)

### 7. **🚀 Deployment Target** → **Decide Later**
- Build for **local development first**
- Deployment strategy: TBD (Vercel + Cloud Run, single VPS, etc.)

---

# 🏁 Milestone 1 — Project Foundation (UPDATED)

**Goal**: Monorepo scaffolded, Firebase connected, apps running locally.

## ✅ Status: Complete

### 1A. Root Monorepo Setup
- [x] `package.json` with npm workspaces (`"workspaces": ["apps/*", "packages/*"]`)
- [x] `turbo.json` with dev, build, lint, clean tasks
- [x] `.gitignore` (node_modules, .env, dist, .next, firebase keys, package-lock.json)
- [x] `.env.example` with required variables (Firebase only, no Redis)
- [x] ~~pnpm-workspace.yaml~~ **REMOVED** (using npm workspaces instead)

### 1B. Shared Types Package (`packages/types/`)
- [x] `package.json`, `tsconfig.json`, `src/index.ts`
- [x] **Enums**: UserRole, ExamStatus, CandidateStatus, QuestionStatus
- [x] **Interfaces**: Admin, Exam, Question, Candidate, Answer, ExamSession, Result
- [x] **DTOs**: Login, CreateExam, BulkCreateCandidates, SubmitAnswer, AuthResponse

### 1C. NestJS Backend Scaffold (`apps/api/`)
- [x] NestJS v11.0.0 initialized
- [x] `config/firebase.module.ts` — Firestore + Storage provider
- [x] ~~config/redis.module.ts~~ **REMOVED** (no longer needed)
- [x] `common/filters/http-exception.filter.ts` — Global exception handler
- [x] `common/interceptors/transform.interceptor.ts` — Response wrapper
- [x] `health.controller.ts` — Returns `{ status: "ok", service, timestamp }`
- [x] `main.ts` — CORS, validation, error handling configured
- [x] ConfigModule.forRoot() — .env loading
- [x] Dependencies: firebase-admin, bcrypt, jwt, passport ✅
- [x] ~~ioredis~~ **REMOVED** from package.json

### 1D. Next.js Frontend Scaffold (`apps/web/`)
- [x] Next.js v15.3.0 with App Router, TypeScript
- [x] `styles/globals.css` — Design system (dark theme, colors, typography)
- [x] `lib/api.ts` — Axios client with JWT interceptors
- [x] `components/ui/` — Button, Input, Modal, Card primitives
- [x] Google Fonts: Inter + JetBrains Mono

### ✅ Milestone 1 Checkpoint
- [x] `npm dev` starts both apps (web on :3000, api on :4000)
- [x] Backend health endpoint returns `{ status: "ok" }`
- [x] Firestore connection module ready
- [x] ~~Redis connection module~~ **REMOVED** (not needed)

---

## 📦 Migration Summary

### What Changed
- ✅ **pnpm → npm workspaces**
  - Removed `pnpm-workspace.yaml`
  - Updated `package.json` with `"workspaces": []`
  - Removed `packageManager` field

- ✅ **Removed Redis**
  - Deleted `apps/api/src/config/redis.module.ts`
  - Removed `ioredis` dependency
  - Removed RedisModule from AppModule imports
  - Removed Redis env vars from .env.example

- ✅ **Updated `.gitignore`**
  - Removed `.pnpm-store/`
  - Removed `pnpm-debug.log*`
  - Added `package-lock.json`

---

# 🔨 Milestone 2 — Authentication & Admin Dashboard

### 2A. Admin Authentication
- [ ] `AuthModule` with JWT strategy
- [ ] `/api/auth/admin/login` — email + password
- [ ] JWT token generation (3600s expiry)
- [ ] Admin guard for protected routes
- [ ] Seed script: `npm run seed:admin -- --email admin@test.com --password secret`

### 2B. Admin Dashboard (Frontend)
- [ ] Admin layout/navigation
- [ ] Login page
- [ ] Dashboard home
- [ ] Admin protected routes with redirect

### 2C. Exam Management (Backend)
- [ ] `ExamService` — CRUD operations
- [ ] `ExamController` — POST /exams, GET /exams, GET /exams/:id, PUT /exams/:id
- [ ] Firestore collection: `exams`
- [ ] Schema: title, description, durationMinutes, totalQuestions, createdBy, status, createdAt

### 2D. Question Upload & Parsing (Backend)
- [ ] `QuestionService` — PDF/DOCX parsing
- [ ] Regex-based extraction (numbered format A-D)
- [ ] `DocumentParser` — handles pdf-parse, mammoth output
- [ ] POST /exams/:id/upload — multipart file upload
- [ ] Batch insert questions into Firestore `questions` collection
- [ ] Schema: questionText, options (A,B,C,D), correctAnswer, examId, order, createdAt

---

# 🎯 Milestone 3 — Exam Execution & Proctoring

### 3A. Candidate Portal (Frontend)
- [ ] Candidate login page (name, email, exam code)
- [ ] Exam start screen (instructions, duration timer)
- [ ] Question display (with question number, options A-D, "Mark for Review")
- [ ] Navigation: Previous, Next, End Exam
- [ ] Progress bar (3 of 30 answered)
- [ ] Timer display (59:45 remaining)
- [ ] Anti-cheat warnings (tab switch detection)

### 3B. Exam Session Management (Backend)
- [ ] `CandidateService` — candidate registration, login
- [ ] `SessionService` — start exam, track answers, monitor tab switches
- [ ] Firestore `sessions` collection — real-time answer tracking
- [ ] Firestore `results` collection — final score calculation
- [ ] Schema:
  ```
  sessions: { candidateId, examId, answers: {questionId: answer}, status, startTime, tabSwitchCount }
  results: { candidateId, examId, score, totalCorrect, totalAnswered, submittedAt }
  ```

### 3C. Answer Submission & Scoring
- [ ] POST /exams/:id/submit — candidate submits answers
- [ ] Score calculation logic (correct answers / total)
- [ ] Result stored in `results` collection
- [ ] Response with score, breakdown, review mode

---

# 📊 Milestone 4 — Results & Reports

### 4A. Admin Results Dashboard
- [ ] List all candidates for an exam
- [ ] View individual candidate results (score, time taken, answers)
- [ ] Download PDF report (with questions, candidate answers, correct answers, marked answers)
- [ ] CSV export (score per candidate)

### 4B. PDF Generation
- [ ] `ReportService` using jspdf + jspdf-autotable
- [ ] Report format:
  - Header (exam name, date, candidate name)
  - Question-by-question breakdown
  - Candidate answer vs correct answer vs marked answer
  - Score summary
  - Admin notes section (for manual feedback)

### 4C. Candidate Result Page
- [ ] Candidate views their score
- [ ] Download receipt PDF
- [ ] View review (questions + answers only, no correct answers marked)

---

# 🚀 Running Locally (npm)

```bash
# 1. Install dependencies
npm install

# 2. Set up Firebase
# - Create Firebase project at console.firebase.google.com
# - Download service account JSON
# - Copy .env.example → apps/api/.env
# - Fill in Firebase credentials

# 3. Copy frontend env
cp .env.example apps/web/.env.local

# 4. Start dev servers (both web + api)
npm run dev

# 5. Verify health check
curl http://localhost:4000/api/health

# 6. Create first admin (in another terminal)
npm run seed:admin -- --email admin@test.com --password secret123
```

---

## Project Structure

```
arbitration-sandbox/
├── apps/
│   ├── api/                          # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/                 # Authentication (Milestone 2)
│   │   │   ├── exams/                # Exam management (Milestone 2)
│   │   │   ├── questions/            # Question parsing (Milestone 2)
│   │   │   ├── candidates/           # Candidate management (Milestone 3)
│   │   │   ├── sessions/             # Exam sessions (Milestone 3)
│   │   │   ├── results/              # Score & reports (Milestone 4)
│   │   │   ├── config/               # Firebase config
│   │   │   ├── common/               # Filters, interceptors
│   │   │   ├── health.controller.ts
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts
│   │   │   └── scripts/
│   │   │       └── seed-admin.ts
│   │   └── package.json
│   └── web/                          # Next.js frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── admin/            # Admin pages
│       │   │   ├── exam/             # Exam execution
│       │   │   └── page.tsx
│       │   ├── components/
│       │   │   ├── ui/               # Primitives
│       │   │   ├── admin/            # Admin-specific
│       │   │   └── exam/             # Exam-specific
│       │   ├── lib/
│       │   │   ├── api.ts
│       │   │   └── auth.ts
│       │   └── styles/
│       └── package.json
├── packages/
│   └── types/                        # Shared TypeScript types
│       ├── src/index.ts
│       └── package.json
├── .env.example
├── .gitignore
├── package.json                      # npm workspaces
├── turbo.json
└── README.md (TBD)
```

---

## Next Steps

✅ **Milestone 1**: Foundation complete (npm, Firebase, no Redis)
→ **Milestone 2**: Build authentication and exam management
→ **Milestone 3**: Exam execution and proctoring
→ **Milestone 4**: Results dashboard and PDF reports

Ready to start **Milestone 2**? 🚀
