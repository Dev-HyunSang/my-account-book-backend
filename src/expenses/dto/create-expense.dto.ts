import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({
    description: 'Expense date (ISO 8601, calendar-day only).',
    format: 'date',
    example: '2026-05-17',
  })
  @IsDateString({ strict: true })
  expenseDate!: string;

  @ApiProperty({
    description:
      'Expense amount in whole won. Send as a decimal string to preserve precision beyond JS Number range.',
    example: '12000',
  })
  @Transform(({ value }) => (typeof value === 'number' ? value.toString() : value))
  @IsNumberString({ no_symbols: true })
  amount!: string;

  @ApiProperty({
    description: 'Optional memo (max 500 chars).',
    example: '점심 식대',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;
}
