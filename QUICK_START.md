# Quick Start Guide — Arbitration Sandbox

## Prerequisites

- Node.js 18+ (with npm)
- Firebase project (free tier OK)
- Git

## Setup (5 minutes)

### 1. Clone & Install
```bash
cd Arbitration_Sandbox
npm install
```

### 2. Firebase Setup
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Enable Firestore Database (test mode for dev)
4. Enable Cloud Storage
5. Go to **Project Settings** → **Service Accounts** → **Generate New Private Key**
6. Save the JSON file (keep it secret!)

### 3. Configure Environment

**Backend (.env)**
```bash
cp .env.example apps/api/.env
```

Then edit `apps/api/.env` and fill in:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRATION=3600

PORT=4000
CORS_ORIGIN=http://localhost:3000
```

**Frontend (.env.local)**
```bash
cp .env.example apps/web/.env.local
```

Already configured, but verify:
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_APP_NAME=Arbitration Sandbox
```

### 4. Start Dev Servers
```bash
npm run dev
```

This starts:
- 🌐 **Frontend**: http://localhost:3000
- 🔌 **API**: http://localhost:4000

### 5. Create First Admin
In a **new terminal** (keep `npm run dev` running):
```bash
npm run seed:admin -- --email admin@test.com --password secret123
```

## Verification

### Health Check
```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "arbitration-sandbox-api",
    "timestamp": "2026-05-23T10:30:00.000Z"
  },
  "timestamp": "2026-05-23T10:30:00.000Z"
}
```

### Admin Login (Frontend)
1. Open http://localhost:3000/admin/login
2. Email: `admin@test.com`
3. Password: `secret123`

## Project Structure

```
apps/
├── api/              # NestJS backend
└── web/              # Next.js frontend

packages/
└── types/            # Shared TypeScript types

# Root commands (via npm workspaces)
npm run dev     # Start all dev servers
npm run build   # Build all apps
npm run lint    # Lint all apps
npm run clean   # Clean all build artifacts
```

## Common Commands

```bash
# Install new package in backend
npm install --workspace=@arbitration/api <package>

# Install in frontend
npm install --workspace=@arbitration/web <package>

# Run specific workspace script
npm run --workspace=@arbitration/api dev

# Lint
npm run lint

# Build for production
npm run build
```

## Troubleshooting

### **Port Already in Use**
Change in `apps/web/package.json`:
```json
"dev": "next dev --port 3001"
```
Or kill existing process:
```bash
# macOS/Linux
lsof -ti:4000,3000 | xargs kill -9

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process
```

### **Firebase Connection Failed**
- Verify credentials in `apps/api/.env`
- Check Firebase project is active
- Firestore should be in **test mode** (for dev)

### **Workspace not found**
```bash
# Regenerate lock file
rm package-lock.json
npm install
```

## Next Steps

1. ✅ Verify health check works
2. ✅ Create admin seed
3. 🔨 Start building Milestone 2 (Auth + Exam Management)

---

**Questions?** Check [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
