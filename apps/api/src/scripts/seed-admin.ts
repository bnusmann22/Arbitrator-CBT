/**
 * seed-admin.ts
 * ─────────────────────────────────────────────────────────────────
 * Creates the first admin account in Firestore.
 *
 * Usage (from apps/api directory):
 *   npm run seed:admin
 *
 * Or with custom credentials via env vars:
 *   ADMIN_EMAIL=me@example.com ADMIN_PASSWORD=secret123 ADMIN_NAME="Jane Doe" npm run seed:admin
 *
 * Required env vars in .env:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * ─────────────────────────────────────────────────────────────────
 */

import * as admin from 'firebase-admin';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

// ─── Load env ─────────────────────────────────────────────────────────────────
// override: true ensures this dotenv.config() wins over any tool (e.g. dotenvx)
// that may have pre-loaded env vars with expanded/CRLF-corrupted newlines.
dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
  override: true,
});

// ─── Private key normalisation ────────────────────────────────────────────────
// The key is stored as a single line with literal \n sequences (no surrounding
// quotes in .env so that dotenv/dotenvx never auto-expands them).
// We convert every form of escaped or system newline to a plain LF here.
function normalizeKey(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')   // literal backslash-n  → LF
    .replace(/\r\n/g, '\n')  // Windows CRLF         → LF
    .replace(/\r/g, '\n');   // bare CR               → LF
}

const privateKey = normalizeKey(process.env.FIREBASE_PRIVATE_KEY ?? '');

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
  console.error('\n❌  Firebase credentials are missing in .env\n');
  process.exit(1);
}

// ─── Firebase init ────────────────────────────────────────────────────────────

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

const db = admin.firestore();

// ─── Prompt helper ────────────────────────────────────────────────────────────

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seedAdmin() {
  console.log('\n🌱  Arbitration Sandbox — Admin Seed Script\n');

  const email    = process.env.ADMIN_EMAIL    || (await prompt('Admin email: '));
  const password = process.env.ADMIN_PASSWORD || (await prompt('Admin password (min 8 chars): '));
  const name     = process.env.ADMIN_NAME     || (await prompt('Admin display name: '));

  if (!email || !password || !name) {
    console.error('❌  All fields are required.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌  Password must be at least 8 characters.');
    process.exit(1);
  }

  // Check for existing admin with that email
  const existing = await db
    .collection('admins')
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();

  if (!existing.empty) {
    console.error(`❌  An admin with email "${email}" already exists.`);
    process.exit(1);
  }

  // Hash password
  const SALT_ROUNDS = 12;
  console.log('\n⏳  Hashing password…');
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Write to Firestore
  const docRef = await db.collection('admins').add({
    email: email.toLowerCase(),
    name,
    passwordHash,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`\n✅  Admin created successfully!`);
  console.log(`    ID    : ${docRef.id}`);
  console.log(`    Email : ${email.toLowerCase()}`);
  console.log(`    Name  : ${name}`);
  console.log('\n🔐  You can now log in at /admin/login\n');

  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('\n❌  Seed script failed:', err.message || err);
  process.exit(1);
});
