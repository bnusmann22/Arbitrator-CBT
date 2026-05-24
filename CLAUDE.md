# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Project Is

**Arbitrator CBT** — a Computer-Based Testing platform with two user types: **admins** (create exams, upload questions, manage candidates) and **candidates** (take randomised MCQ exams under anti-cheat controls). Current deployment: API on Railway (migrating from Fly.io), frontend on Vercel.

---

## Monorepo Structure

Turborepo + npm workspaces with three packages:

| Path | Name | Description |
|---|---|---|
| `apps/api` | `@arbitration/api` | NestJS 11 backend, port 4000 |
| `apps/web` | `@arbitration/web` | Next.js 15 frontend, port 3000 |
| `packages/types` | `@arbitration/types` | Shared TypeScript types (no enums — use `const` objects) |

`packages/types` must be built before `apps/api` and `apps/web` because both import from it.

---

## Commands

### Root (run from repo root via Turborepo)
```bash
npx turbo dev          # Start all apps in watch mode
npx turbo build        # Build all apps (types → api → web)
npx turbo lint         # Lint all apps
npx turbo clean        # Remove all build artifacts
```

### API only (from `apps/api/`)
```bash
npm run dev            # NestJS watch mode
npm run build          # Compile TypeScript → dist/
npm run start:prod     # Run compiled output (production)
npm run lint           # ESLint
npm run seed:admin     # Create the first admin account in Firestore (interactive)
```

### Web only (from `apps/web/`)
```bash
npm run dev            # Next.js dev server on :3000
npm run build          # Production build
npm run lint           # next lint
```

### Seed admin with env vars (non-interactive)
```bash
# Run from apps/api/
ADMIN_EMAIL=me@example.com ADMIN_PASSWORD=secret123 ADMIN_NAME="Jane Doe" npm run seed:admin
```

---

## Architecture

### API (NestJS)

Entry: `apps/api/src/app.module.ts`

Global setup applied at the module level:
- **ThrottlerGuard** — 60 req/min per IP applied globally
- **ScheduleModule** — required for the auto-submit cron in `ExamService`
- **FirebaseModule** — global, provides `FIRESTORE` and `FIREBASE_STORAGE` tokens
- **ConfigModule** — `isGlobal: true`, reads `.env`

Feature modules and their responsibilities:

| Module | Controller prefix | Key logic |
|---|---|---|
| `AuthModule` | `/auth` | JWT signing, admin + candidate login, httpOnly cookie management |
| `AdminModule` | `/admin` | Exam CRUD, dashboard stats, candidate result report (admin-visible correct answers) |
| `QuestionModule` | `/questions` | PDF/DOCX parsing, dual-file upload with OCR answer key, manual question creation |
| `CandidateModule` | `/candidate` | Candidate create/bulk-create/delete; 8-char unique exam codes |
| `ExamModule` | `/exam` | Session start/resume, answer persistence, tab-switch tracking, auto-submit cron |
| `HealthController` | `/health` | Liveness check — no auth |

**All API responses** are wrapped by `TransformInterceptor`:
```json
{ "success": true, "data": <payload>, "timestamp": "ISO string" }
```
The frontend's `api.ts` automatically unwraps this envelope.

### Authentication Flow

1. Login endpoint sets an **httpOnly cookie** named `auth_token` (JWT).
2. **Next.js Edge Middleware** (`apps/web/middleware.ts`) reads that cookie and verifies the JWT using `jose`. It enforces role-based access (`admin` vs `candidate`) before any route renders.
3. API guards (`JwtAuthGuard` + `RolesGuard`) re-verify the cookie on every backend request. The JWT strategy extracts the token from `req.cookies.auth_token`.

### Exam Session Lifecycle

```
Candidate logs in → POST /exam/start
  → creates exam_sessions/{candidateId} with shuffled question order + endTime
  → marks candidate status: IN_PROGRESS
  → returns questions (no correctAnswer) + endTime

During exam:
  → POST /exam/answer  — saves one answer via Firestore dot-notation update
  → POST /exam/tab-switch  — increments counter; disqualifies at ≥ 5
  → GET /exam/status  — time remaining, answered count

Submission:
  → POST /exam/submit (manual) OR auto-submit cron (every 30s)
  → scores by comparing session.answers to questions.correctAnswer
  → writes score/status atomically via Firestore batch

Resume (page refresh):
  → POST /exam/start detects IN_PROGRESS status → calls resumeSession()
  → returns original shuffled order + previously saved answers
```

### Firestore Collections

| Collection | Purpose |
|---|---|
| `admins` | Admin accounts (email, passwordHash, name) |
| `exams` | Exam metadata (status: draft/active/completed) |
| `exams/{id}/questions` | Sub-collection; contains `correctAnswer` (hidden from candidates) |
| `candidates` | Candidate records with examCode, status, score |
| `exam_sessions` | Active sessions keyed by `candidateId`; contains shuffled order + answers map |

### Frontend Route Groups

```
apps/web/src/app/
  (student)/          → candidate-facing routes, requires role: candidate
    login/            → exam code + email + name login
    exam/             → main exam page (ExamPage component)
    exam/complete/    → results after submission
  (admin)/            → admin routes, requires role: admin
    admin/login/      → admin email + password login
    dashboard/        → stats + exam list
    questions/        → upload questions, manage per exam
    candidates/       → manage candidate rosters
    results/          → view and export candidate results as PDF
```

Frontend anti-cheat measures in `ExamPage`:
- `useTabMonitor` — detects `visibilitychange` + `blur`, reports to `/exam/tab-switch`
- `useExamTimer` — client-side countdown from server-provided `endTime`
- `onContextMenu`, `onCopy`, `onCut`, `onPaste`, `onKeyDown` (blocks F12/DevTools shortcuts)
- `userSelect: none` on exam container

### Firebase Private Key Handling

The `FIREBASE_PRIVATE_KEY` must be stored **unquoted** in `.env` (literal `\n` sequences). Both `firebase.module.ts` and `seed-admin.ts` call a `normalizePrivateKey()` function that converts all `\n`, `\r\n`, and `\r` forms to plain LF before passing to OpenSSL. Do not wrap the key in quotes in any env file.

---

## Environment Variables

### `apps/api/.env`

| Variable | Purpose |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase project |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account key — unquoted, literal `\n` |
| `FIREBASE_STORAGE_BUCKET` | Storage bucket name |
| `JWT_SECRET` | Must match the value in `apps/web/.env` |
| `JWT_EXPIRATION` | Seconds (default 3600) |
| `CORS_ORIGIN` | Allowed frontend origin (e.g. `https://arbitrator-cbt.vercel.app`) |
| `PORT` | Runtime port (Railway injects this automatically; defaults to 4000) |

### `apps/web/.env`

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Full API URL with `/api` suffix (e.g. `https://your-api.railway.app/api`) |
| `JWT_SECRET` | Must match the API value (used by Edge Middleware for token verification) |

---

## Docker / Production

The `apps/api/Dockerfile` is a two-stage build:
1. **builder** — installs all deps (including devDeps), builds `packages/types` then `apps/api`
2. **runner** — production-only deps, copies compiled `dist/`, runs as non-root `appuser`

Start command: `node apps/api/dist/main.js`, exposes port 4000. Railway picks up the Dockerfile automatically when `apps/api/` is the root service directory.
