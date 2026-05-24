import { Module } from '@nestjs/common';
import { CandidateController } from './candidate.controller';
import { CandidateService } from './candidate.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CandidateController],
  providers: [CandidateService],
  exports: [CandidateService],
})
export class CandidateModule {}
