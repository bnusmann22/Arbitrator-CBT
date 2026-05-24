import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { QuestionService } from './question.service';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { CreateManualQuestionDto } from './dto/create-manual-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@arbitration/types';
import { IMAGE_MIME_TYPES } from './parsers/image.parser';

const FIFTY_MB = 50 * 1024 * 1024;

@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  // ── POST /questions/upload?examId=xxx ─────────────────────────────────────

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: FIFTY_MB },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF and DOCX files are accepted.'), false);
        }
      },
    }),
  )
  async uploadQuestions(
    @UploadedFile() file: Express.Multer.File,
    @Query('examId') examId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file was uploaded.');
    }
    if (!examId) {
      throw new BadRequestException('examId query parameter is required.');
    }

    return this.questionService.uploadAndParse(file, examId);
  }

  // ── POST /questions/manual?examId=xxx ────────────────────────────────────

  @Post('manual')
  async addManualQuestion(
    @Query('examId') examId: string,
    @Body() dto: CreateManualQuestionDto,
  ) {
    if (!examId) throw new BadRequestException('examId query parameter is required.');
    return this.questionService.createManualQuestion(examId, dto);
  }

  // ── POST /questions/upload-dual?examId=xxx ────────────────────────────────

  @Post('upload-dual')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'questionFile', maxCount: 1 },
        { name: 'answerFile', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: FIFTY_MB },
        fileFilter: (_req, file, cb) => {
          const allowed = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain',
            ...IMAGE_MIME_TYPES,
          ];
          if (allowed.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(
              new BadRequestException(
                `File type "${file.mimetype}" is not supported. Use PDF, DOCX, TXT, or an image.`,
              ),
              false,
            );
          }
        },
      },
    ),
  )
  async uploadDual(
    @UploadedFiles()
    files: {
      questionFile?: Express.Multer.File[];
      answerFile?: Express.Multer.File[];
    },
    @Query('examId') examId: string,
  ) {
    if (!examId) throw new BadRequestException('examId query parameter is required.');
    const questionFile = files?.questionFile?.[0];
    const answerFile = files?.answerFile?.[0];
    if (!questionFile) throw new BadRequestException('No question file was uploaded.');
    if (!answerFile) throw new BadRequestException('No answer key file was uploaded.');
    return this.questionService.uploadAndParseDual(questionFile, answerFile, examId);
  }

  // ── GET /questions?examId=xxx ─────────────────────────────────────────────

  @Get()
  async getQuestions(@Query('examId') examId: string) {
    if (!examId) throw new BadRequestException('examId query parameter is required.');
    return this.questionService.getQuestions(examId);
  }

  // ── PUT /questions/:examId/:questionId ────────────────────────────────────

  @Put(':examId/:questionId')
  async updateQuestion(
    @Param('examId') examId: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionService.updateQuestion(examId, questionId, dto);
  }

  // ── DELETE /questions/:examId/:questionId ─────────────────────────────────

  @Delete(':examId/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuestion(
    @Param('examId') examId: string,
    @Param('questionId') questionId: string,
  ) {
    await this.questionService.deleteQuestion(examId, questionId);
  }

  // ── DELETE /questions/:examId (delete all) ────────────────────────────────

  @Delete(':examId')
  @HttpCode(HttpStatus.OK)
  async deleteAllQuestions(@Param('examId') examId: string) {
    const deleted = await this.questionService.deleteAllQuestions(examId);
    return { deleted };
  }
}
