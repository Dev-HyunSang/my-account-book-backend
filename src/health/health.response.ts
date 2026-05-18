import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status!: 'ok';

  @ApiProperty({ enum: ['up'], example: 'up' })
  db!: 'up';

  @ApiProperty({ enum: ['up'], example: 'up' })
  redis!: 'up';
}
