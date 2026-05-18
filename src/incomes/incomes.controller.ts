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
import { CreateIncomeDto } from './dto/create-income.dto';
import { IncomeResponseDto } from './dto/income.response';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { IncomesService } from './incomes.service';

@ApiTags('incomes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomes: IncomesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a new income entry for the authenticated user' })
  @ApiResponse({ status: 201, description: 'Created.', type: IncomeResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateIncomeDto,
  ): Promise<IncomeResponseDto> {
    return this.incomes.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List the authenticated user's income entries, newest income_date first",
  })
  @ApiResponse({ status: 200, description: 'Page of incomes.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
  ): Promise<{ items: IncomeResponseDto[]; total: number; offset: number; limit: number }> {
    return this.incomes.list(user.userId, {
      offset: pagination.offset,
      limit: pagination.limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a single income entry owned by the authenticated user' })
  @ApiResponse({ status: 200, description: 'Income.', type: IncomeResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 404, description: 'Income not found.' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<IncomeResponseDto> {
    return this.incomes.findOne(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update fields on an income entry owned by the authenticated user' })
  @ApiResponse({ status: 200, description: 'Updated.', type: IncomeResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 404, description: 'Income not found.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateIncomeDto,
  ): Promise<IncomeResponseDto> {
    return this.incomes.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an income entry owned by the authenticated user' })
  @ApiResponse({ status: 204, description: 'Deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({ status: 404, description: 'Income not found.' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.incomes.remove(user.userId, id);
  }
}
