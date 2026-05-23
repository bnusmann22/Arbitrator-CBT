import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

const FIREBASE_APP = 'FIREBASE_APP';

@Global()
@Module({
  providers: [
    {
      provide: FIREBASE_APP,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
        const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');
        const privateKey = configService
          .get<string>('FIREBASE_PRIVATE_KEY', '')
          .replace(/\\n/g, '\n');
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
