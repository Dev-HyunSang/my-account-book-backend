import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Number of items to skip before the page starts.',
    minimum: 0,
    default: 0,
    example: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

  @ApiPropertyOptional({
    description: 'Maximum number of items to return (1–200).',
    minimum: 1,
    maximum: 200,
    default: 50,
    example: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;
}
