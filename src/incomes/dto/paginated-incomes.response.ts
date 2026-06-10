import { ApiProperty } from '@nestjs/swagger';
import { IncomeResponseDto } from './income.response';

export class PaginatedIncomesResponseDto {
  @ApiProperty({
    type: [IncomeResponseDto],
    description: 'Income entries for the current page, newest income_date first.',
  })
  items!: IncomeResponseDto[];

  @ApiProperty({
    description: 'Total number of income entries owned by the user (ignores paging).',
    example: 137,
  })
  total!: number;

  @ApiProperty({ description: 'Offset that produced this page.', example: 0 })
  offset!: number;

  @ApiProperty({ description: 'Maximum number of items requested for this page.', example: 50 })
  limit!: number;
}
