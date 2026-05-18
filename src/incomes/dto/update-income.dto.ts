import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateIncomeDto {
  @ApiProperty({ format: 'date', required: false, example: '2026-05-17' })
  @IsOptional()
  @IsDateString({ strict: true })
  incomeDate?: string;

  @ApiProperty({ required: false, example: '1500000' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'number' ? value.toString() : value))
  @IsNumberString({ no_symbols: true })
  amount?: string;

  @ApiProperty({ required: false, nullable: true, maxLength: 500, example: '5월 월급' })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  @MaxLength(500)
  memo?: string | null;
}
