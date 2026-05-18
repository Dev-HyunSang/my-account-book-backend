import { ApiProperty } from '@nestjs/swagger';

export class IncomeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date', example: '2026-05-17' })
  incomeDate!: string;

  @ApiProperty({
    description: 'Amount in whole won, serialized as a string (bigint-safe).',
    example: '1500000',
  })
  amount!: string;

  @ApiProperty({ nullable: true, example: '5월 월급' })
  memo!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
