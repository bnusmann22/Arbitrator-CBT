import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

const FIREBASE_APP = 'FIREBASE_APP';

/**
 * Converts the FIREBASE_PRIVATE_KEY env value to a properly-formatted PEM string.
 *
 * The key is stored WITHOUT surrounding quotes in .env so that dotenv/dotenvx
 * never auto-expands the \n sequences. This function handles every form of
 * newline that might reach us — literal backslash-n, CRLF (Windows), bare CR —
 * and normalises all of them to plain LF, which OpenSSL 3 requires.
 */
function normalizePrivateKey(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')   // literal \n  → LF
    .replace(/\r\n/g, '\n')  // CRLF        → LF
    .replace(/\r/g, '\n');   // bare CR     → LF
}

@Global()
@Module({
  providers: [
    {
      provide: FIREBASE_APP,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const projectId     = configService.get<string>('FIREBASE_PROJECT_ID');
        const clientEmail   = configService.get<string>('FIREBASE_CLIENT_EMAIL');
        const privateKey    = normalizePrivateKey(
          configService.get<string>('FIREBASE_PRIVATE_KEY', ''),
        );
        const storageBucket = configService.get<string>('FIREBASE_STORAGE_BUCKET');

        // Avoid re-initializing in hot-reload scenarios
        if (admin.apps.length > 0) {
          return admin.apps[0]!;
        }

        return admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          storageBucket,
        });
      },
    },
    {
      provide: 'FIRESTORE',
      inject: [FIREBASE_APP],
      useFactory: (app: admin.app.App) => app.firestore(),
    },
    {
      provide: 'FIREBASE_STORAGE',
      inject: [FIREBASE_APP],
      useFactory: (app: admin.app.App) => app.storage().bucket(),
    },
  ],
  exports: [FIREBASE_APP, 'FIRESTORE', 'FIREBASE_STORAGE'],
})
export class FirebaseModule {}
