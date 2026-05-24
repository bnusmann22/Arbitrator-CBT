import { IsString, IsNotEmpty } from 'class-validator';

export class UploadQuestionsDto {
  @IsString()
  @IsNotEmpty({ message: 'examId is required.' })
  examId: string;
}
