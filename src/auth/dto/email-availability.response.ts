import { ApiProperty } from '@nestjs/swagger';

export class EmailAvailabilityResponseDto {
  @ApiProperty({
    description:
      'Whether the email can be used to register. `true` means it is not yet registered (and not blacklisted) so signup will succeed; `false` means it is already taken or otherwise unavailable.',
    example: true,
  })
  available!: boolean;
}
