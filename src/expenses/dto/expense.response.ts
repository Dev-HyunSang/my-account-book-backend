import { ApiProperty } from '@nestjs/swagger';

export class ExpenseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date', example: '2026-05-17' })
  expenseDate!: string;

  @ApiProperty({
    description: 'Amount in whole won, serialized as a string (bigint-safe).',
    example: '12000',
  })
  amount!: string;

  @ApiProperty({ nullable: true, example: '점심 식대' })
  memo!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
