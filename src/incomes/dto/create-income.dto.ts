import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIncomeDto {
  @ApiProperty({
    description: 'Income date (ISO 8601, calendar-day only).',
    format: 'date',
    example: '2026-05-17',
  })
  @IsDateString({ strict: true })
  incomeDate!: string;

  @ApiProperty({
    description:
      'Income amount in whole won. Send as a decimal string to preserve precision beyond JS Number range.',
    example: '1500000',
  })
  @Transform(({ value }) => (typeof value === 'number' ? value.toString() : value))
  @IsNumberString({ no_symbols: true })
  amount!: string;

  @ApiProperty({
    description: 'Optional memo (max 500 chars).',
    example: '5월 월급',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;
}
