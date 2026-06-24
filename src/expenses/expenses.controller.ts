import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types';
import { PaginationDto } from '../common/pagination.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseResponseDto } from './dto/expense.response';
import { PaginatedExpensesResponseDto } from './dto/paginated-expenses.response';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a new expense entry for the authenticated user' })
  @ApiResponse({ status: 201, description: 'Created.', type: ExpenseResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expenses.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List the authenticated user's expense entries, newest expense_date first",
  })
  @ApiResponse({
    status: 200,
    description: 'Page of expenses.',
    type: PaginatedExpensesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedExpensesResponseDto> {
    return this.expenses.list(user.userId, {
      offset: pagination.offset,
      limit: pagination.limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a single expense entry owned by the authenticated user' })
  @ApiResponse({ status: 200, description: 'Expense.', type: ExpenseResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 404, description: 'Expense not found.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ExpenseResponseDto> {
    return this.expenses.findOne(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update fields on an expense entry owned by the authenticated user' })
  @ApiResponse({ status: 200, description: 'Updated.', type: ExpenseResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 404, description: 'Expense not found.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expenses.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an expense entry owned by the authenticated user' })
  @ApiResponse({ status: 204, description: 'Deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 404, description: 'Expense not found.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.expenses.remove(user.userId, id);
  }
}
