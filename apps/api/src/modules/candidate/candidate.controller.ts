import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CandidateService } from './candidate.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { BulkCreateCandidatesDto } from './dto/bulk-create-candidates.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@arbitration/types';

@Controller('candidates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  // ── GET /candidates?examId=xxx ────────────────────────────────────────────

  @Get()
  async getCandidates(@Query('examId') examId: string) {
    if (!examId) throw new BadRequestException('examId query parameter is required.');
    return this.candidateService.getCandidates(examId);
  }

  // ── GET /candidates/:id ───────────────────────────────────────────────────

  @Get(':id')
  async getCandidate(@Param('id') id: string) {
    return this.candidateService.getCandidate(id);
  }

  // ── POST /candidates ──────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCandidate(@Body() dto: CreateCandidateDto) {
    return this.candidateService.createCandidate(dto);
  }

  // ── POST /candidates/bulk ─────────────────────────────────────────────────

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkCreate(@Body() dto: BulkCreateCandidatesDto) {
    return this.candidateService.bulkCreateCandidates(dto);
  }

  // ── DELETE /candidates/:id ────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCandidate(@Param('id') id: string) {
    await this.candidateService.deleteCandidate(id);
  }
}
