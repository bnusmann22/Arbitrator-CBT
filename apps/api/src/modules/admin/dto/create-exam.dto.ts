import {
  IsString,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateExamDto {
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters.' })
  @MaxLength(200, { message: 'Title must be at most 200 characters.' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsInt({ message: 'Duration must be a whole number of minutes.' })
  @Min(5, { message: 'Duration must be at least 5 minutes.' })
  @Max(480, { message: 'Duration cannot exceed 8 hours.' })
  durationMinutes: number;

  @IsInt()
  @Min(1, { message: 'Exam must have at least 1 question.' })
  @Max(500)
  totalQuestions: number;
}
