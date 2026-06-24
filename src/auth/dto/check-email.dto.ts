import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class CheckEmailDto {
  @ApiProperty({
    description:
      'Email address to check for availability. Trimmed and lowercased; comparisons are case-insensitive.',
    format: 'email',
    example: 'alice@example.com',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;
}
