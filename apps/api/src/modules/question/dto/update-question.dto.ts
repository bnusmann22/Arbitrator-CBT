import { IsString, IsOptional, IsEnum, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OptionsDto {
  @IsString() A: string;
  @IsString() B: string;
  @IsString() C: string;
  @IsString() D: string;
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  questionText?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OptionsDto)
  options?: OptionsDto;

  @IsOptional()
  @IsEnum(['A', 'B', 'C', 'D'], { message: 'correctAnswer must be A, B, C, or D.' })
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
}
