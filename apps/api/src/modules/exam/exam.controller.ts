import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExamService } from './exam.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UserRole } from '@arbitration/types';

@Controller('exam')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CANDIDATE)
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  /**
   * POST /exam/start
   * Starts a new exam session or resumes an in-progress one.
   * Returns shuffled questions (no correctAnswer) + timing info.
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  start(@CurrentUser() user: JwtPayload) {
    return this.examService.startExam(user.sub);
  }

  /**
   * POST /exam/answer
   * Saves (or updates) a single answer. Safe to call on every option click.
   */
  @Post('answer')
  @HttpCode(HttpStatus.OK)
  saveAnswer(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.examService.saveAnswer(user.sub, dto);
  }

  /**
   * POST /exam/submit
   * Manual submission by the candidate.
   */
  @Post('submit')
  @HttpCode(HttpStatus.OK)
  submit(@CurrentUser() user: JwtPayload) {
    return this.examService.submitExam(user.sub, 'manual');
  }

  /**
   * POST /exam/tab-switch
   * Records a focus-loss event. Disqualifies at ≥ 5 switches.
   */
  @Post('tab-switch')
  @HttpCode(HttpStatus.OK)
  tabSwitch(@CurrentUser() user: JwtPayload) {
    return this.examService.recordTabSwitch(user.sub);
  }

  /**
   * GET /exam/status
   * Returns time remaining, answered count, and tab switch count.
   */
  @Get('status')
  getStatus(@CurrentUser() user: JwtPayload) {
    return this.examService.getStatus(user.sub);
  }
}
