# Arbitration Sandbox — Secure MCQ Examination Platform

A full-stack examination system: admins create exams and add candidates, candidates take timed MCQ tests in a secure browser environment, and admins view/export results as formatted PDFs.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, CSS Modules |
| **Backend** | NestJS 11, TypeScript |
| **Database** | Firebase Firestore (NoSQL) |
| **Auth** | JWT in httpOnly cookies |
| **PDF** | jsPDF + jsPDF-AutoTable (client-side) |
| **OCR** | Tesseract.js (server-side, for image answer keys) |
| **Monorepo** | Turborepo + npm workspaces |

---

## Project Structure

```
Arbitration_Sandbox/
├── apps/
│   ├── api/            ← NestJS backend (port 4000)
│   └── web/            ← Next.js frontend (port 3000)
├── packages/
│   └── types/          ← Shared TypeScript types
├── fly.toml            ← Fly.io deployment config (API)
└── .env.example        ← Environment variable template
```

---

## Local Development

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- A Firebase project with Firestore enabled (Native mode)

### 1. Clone & Install

```bash
git clone <repo-url>
cd Arbitration_Sandbox
npm install
```

### 2. Configure Environment Variables

**API** (`apps/api/.env`):
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
JWT_SECRET=<64-char random hex>
JWT_EXPIRATION=3600
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

**Web** (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_APP_NAME=Arbitration Sandbox
JWT_SECRET=<same value as API JWT_SECRET>
```

> **Firebase private key:** Do NOT wrap the key value in quotes in the `.env` file.
> Leave it as a bare value — the loader converts `\n` escape sequences correctly.

### 3. Seed the Admin Account

```bash
cd apps/api
npx ts-node src/scripts/seed-admin.ts
```

### 4. Run Dev Servers

```bash
# From repo root — starts API (4000) and Web (3000) concurrently
npm run dev
```

Or individually:
```bash
cd apps/api && npm run dev
cd apps/web && npm run dev
```

---

## Deployment

### Recommended: Fly.io (API) + Vercel (Web)

#### Step 1 — Deploy the API to Fly.io

```bash
# Install flyctl
# macOS/Linux:  curl -L https://fly.io/install.sh | sh
# Windows:      iwr https://fly.io/install.ps1 -useb | iex

# Authenticate
flyctl auth login

# Create the app (first time only)
flyctl apps create arbitration-sandbox-api

# Set all secrets (run from repo root)
flyctl secrets set \
  FIREBASE_PROJECT_ID="your-project-id" \
  FIREBASE_CLIENT_EMAIL="your-sa@your-project.iam.gserviceaccount.com" \
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n" \
  FIREBASE_STORAGE_BUCKET="your-project.appspot.com" \
  JWT_SECRET="your-64-char-hex-secret" \
  JWT_EXPIRATION="3600" \
  CORS_ORIGIN="https://your-vercel-app.vercel.app"

# Deploy
flyctl deploy --config fly.toml

# Get your API URL
flyctl info --config fly.toml
# → https://arbitration-sandbox-api.fly.dev
```

#### Step 2 — Deploy the Web to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# From the web app directory
cd apps/web
vercel

# Set production environment variables in Vercel dashboard or CLI:
vercel env add NEXT_PUBLIC_API_URL
# → https://arbitration-sandbox-api.fly.dev/api

vercel env add JWT_SECRET
# → same value as API JWT_SECRET (used by edge middleware)

# Deploy to production
vercel --prod
```

#### Step 3 — Update CORS origin

After Vercel deployment, update the API's `CORS_ORIGIN` secret:
```bash
flyctl secrets set CORS_ORIGIN="https://your-actual-vercel-url.vercel.app"
flyctl deploy --config fly.toml
```

---

### Alternative: Cloud Run (GCP) + Vercel

If you prefer to keep everything in GCP (same project as Firebase):

```bash
# Build and push the container
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/arbitration-api \
  --dockerfile=apps/api/Dockerfile .

# Deploy to Cloud Run
gcloud run deploy arbitration-sandbox-api \
  --image gcr.io/YOUR_PROJECT_ID/arbitration-api \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets FIREBASE_PRIVATE_KEY=firebase-private-key:latest,JWT_SECRET=jwt-secret:latest
```

Deploy web to Vercel as in Step 2 above.

---

## Environment Variable Reference

| Variable | Where | Description |
|---|---|---|
| `FIREBASE_PROJECT_ID` | API | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | API | Service account email |
| `FIREBASE_PRIVATE_KEY` | API | Service account private key (bare, no quotes) |
| `FIREBASE_STORAGE_BUCKET` | API | Storage bucket name |
| `JWT_SECRET` | API + Web | Must match exactly in both apps |
| `JWT_EXPIRATION` | API | Token lifetime in seconds (default: 3600) |
| `PORT` | API | Server port (default: 4000) |
| `CORS_ORIGIN` | API | Frontend URL (e.g. `https://your-app.vercel.app`) |
| `NEXT_PUBLIC_API_URL` | Web | Full API base URL including `/api` |
| `NEXT_PUBLIC_APP_NAME` | Web | App name shown in UI |

---

## Firestore Collections

```
admins/                     { email, passwordHash, name }
exams/                      { title, durationMinutes, totalQuestions, status, ... }
  └── questions/            { questionText, options{A,B,C,D}, correctAnswer, order }
candidates/                 { name, email, examCode, examId, status, score, ... }
exam_sessions/              { candidateId, examId, answers{}, submitted, endTime }
```

---

## Security Notes

- JWT stored in httpOnly, SameSite=Lax cookies — not accessible from JavaScript
- All admin routes protected by `JwtAuthGuard` + `RolesGuard`
- Global rate limiting: 60 requests per minute per IP via `@nestjs/throttler`
- Helmet middleware sets security headers on every response
- Input validation via NestJS `ValidationPipe` (`whitelist: true`)
- Candidate answers stored server-side; correct answers never sent to the browser
- Tab-switch monitoring with automatic disqualification after threshold

---

## License

MIT
