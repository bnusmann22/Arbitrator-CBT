import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class SubmitAnswerDto {
  @IsNotEmpty()
  @IsString()
  questionId: string;

  /** null means the candidate cleared their previous answer */
  @IsIn(['A', 'B', 'C', 'D', null])
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
}
