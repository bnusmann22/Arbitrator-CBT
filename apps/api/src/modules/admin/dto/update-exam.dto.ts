import { IsString, MinLength, MaxLength, IsInt, Min, Max, IsOptional, IsEnum } from 'class-validator';
import { ExamStatus } from '@arbitration/types';

export class UpdateExamDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  totalQuestions?: number;

  @IsOptional()
  @IsEnum(ExamStatus, { message: 'Status must be draft, active, or completed.' })
  status?: ExamStatus;
}
