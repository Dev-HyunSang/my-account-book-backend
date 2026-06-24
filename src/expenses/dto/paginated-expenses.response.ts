import { ApiProperty } from '@nestjs/swagger';
import { ExpenseResponseDto } from './expense.response';

export class PaginatedExpensesResponseDto {
  @ApiProperty({
    type: [ExpenseResponseDto],
    description: 'Expense entries for the current page, newest expense_date first.',
  })
  items!: ExpenseResponseDto[];

  @ApiProperty({
    description: 'Total number of expense entries owned by the user (ignores paging).',
    example: 137,
  })
  total!: number;

  @ApiProperty({ description: 'Offset that produced this page.', example: 0 })
  offset!: number;

  @ApiProperty({ description: 'Maximum number of items requested for this page.', example: 50 })
  limit!: number;
}
