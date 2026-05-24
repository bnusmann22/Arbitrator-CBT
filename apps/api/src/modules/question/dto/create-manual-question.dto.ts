import { IsString, IsIn, IsObject, ValidateNested, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

class OptionsDto {
  @IsString()
  @MinLength(1)
  A: string;

  @IsString()
  @MinLength(1)
  B: string;

  @IsString()
  @MinLength(1)
  C: string;

  @IsString()
  @MinLength(1)
  D: string;
}

export class CreateManualQuestionDto {
  @IsString()
  @MinLength(5, { message: 'Question text must be at least 5 characters.' })
  questionText: string;

  @IsObject()
  @ValidateNested()
  @Type(() => OptionsDto)
  options: OptionsDto;

  @IsIn(['A', 'B', 'C', 'D'], { message: 'correctAnswer must be A, B, C, or D.' })
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}
