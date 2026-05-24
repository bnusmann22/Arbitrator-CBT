import {
  IsArray,
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class CandidateItemDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;
}

export class BulkCreateCandidatesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one candidate is required.' })
  @ArrayMaxSize(500, { message: 'Cannot add more than 500 candidates at once.' })
  @ValidateNested({ each: true })
  @Type(() => CandidateItemDto)
  candidates: CandidateItemDto[];

  @IsString()
  @IsNotEmpty({ message: 'examId is required.' })
  examId: string;
}
