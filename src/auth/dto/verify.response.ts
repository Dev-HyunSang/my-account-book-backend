import { ApiProperty } from '@nestjs/swagger';

export class VerifyResponseDto {
  @ApiProperty({
    description: 'Whether the bearer token has a valid signature and is not expired.',
    example: true,
  })
  valid!: boolean;

  @ApiProperty({
    description: 'Access token expiry as a Unix epoch (seconds). Null when the token is invalid.',
    example: 1761000000,
    nullable: true,
    type: Number,
  })
  expiresAt!: number | null;
}
