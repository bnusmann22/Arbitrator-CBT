import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class CandidateLoginDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @Matches(/^[A-Z0-9]{6,12}$/, {
    message: 'Exam code must be 6–12 uppercase letters/numbers',
  })
  examCode: string;
}
