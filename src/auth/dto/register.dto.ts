import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Account email address. Stored in lowercase; comparisons are case-insensitive.',
    format: 'email',
    example: 'alice@example.com',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Account password (minimum 8 characters).',
    minLength: 8,
    example: 'pa55word!',
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    description: 'Display nickname (1–50 characters).',
    minLength: 1,
    maxLength: 50,
    example: 'Alice',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nickname!: string;

  @ApiProperty({
    description: 'Agreement to the Terms of Service (서비스 이용약관). Must be true to register.',
    example: true,
  })
  @IsBoolean()
  @Equals(true, { message: 'You must agree to the Terms of Service.' })
  agreeTerms!: boolean;

  @ApiProperty({
    description:
      'Consent to personal information collection & use (개인정보 수집·이용 동의). Must be true to register.',
    example: true,
  })
  @IsBoolean()
  @Equals(true, { message: 'You must consent to the collection and use of personal information.' })
  agreePrivacy!: boolean;
}
