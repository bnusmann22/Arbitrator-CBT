import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UserRole } from '@arbitration/types';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Stats ─────────────────────────────────────────────────────────────────

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  // ── Exams ─────────────────────────────────────────────────────────────────

  @Get('exams')
  async listExams() {
    return this.adminService.listExams();
  }

  @Get('exams/:id')
  async getExam(@Param('id') id: string) {
    return this.adminService.getExam(id);
  }

  @Post('exams')
  @HttpCode(HttpStatus.CREATED)
  async createExam(
    @Body() dto: CreateExamDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.createExam(dto, user.sub);
  }

  @Put('exams/:id')
  async updateExam(
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.adminService.updateExam(id, dto);
  }

  @Delete('exams/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteExam(@Param('id') id: string) {
    await this.adminService.deleteExam(id);
  }

  // ── Candidate Result Report ───────────────────────────────────────────────

  @Get('results/:candidateId')
  async getCandidateResult(@Param('candidateId') candidateId: string) {
    return this.adminService.getCandidateResult(candidateId);
  }
}
