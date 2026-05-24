import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { FirebaseModule } from './config/firebase.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { QuestionModule } from './modules/question/question.module';
import { CandidateModule } from './modules/candidate/candidate.module';
import { ExamModule } from './modules/exam/exam.module';

@Module({
  imports: [
    // Environment config — globally available
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting — 60 requests per minute
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),

    // Cron scheduler — required for auto-submit job in ExamService
    ScheduleModule.forRoot(),

    // Firebase (Firestore + Storage) — globally provided
    FirebaseModule,

    // Feature modules
    AuthModule,
    AdminModule,
    QuestionModule,
    CandidateModule,
    ExamModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
