import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../src/auth/types';

@Controller('_protected')
@UseGuards(JwtAuthGuard)
export class ProtectedController {
  @Get()
  whoAmI(@CurrentUser() user: AuthenticatedUser): { userId: string } {
    return { userId: user.userId };
  }
}
