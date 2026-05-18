import { Body, Controller, Post } from '@nestjs/common';
import { IsString } from 'class-validator';

class StubDto {
  @IsString()
  name!: string;
}

/**
 * Throwaway controller used only by the foundation e2e test to exercise
 * the global ValidationPipe's forbidNonWhitelisted behaviour.
 */
@Controller('_stub')
export class StubController {
  @Post()
  echo(@Body() dto: StubDto): StubDto {
    return dto;
  }
}
