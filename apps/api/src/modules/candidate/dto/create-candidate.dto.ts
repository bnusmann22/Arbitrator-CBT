import { IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateCandidateDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'examId is required.' })
  examId: string;
}
