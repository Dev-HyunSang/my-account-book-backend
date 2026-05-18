import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenPairResponseDto } from './dto/token-pair.response';
import { VerifyResponseDto } from './dto/verify.response';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TokenService } from './services/token.service';
import { AuthenticatedUser, IssuedTokens, RequestContext } from './types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify an access token signature and expiry',
    description:
      'Lightweight polling endpoint. Validates JWT signature and exp only — does not consult the revocation list or database. Always returns 200; check the `valid` field.',
  })
  @ApiResponse({ status: 200, description: 'Verification result.', type: VerifyResponseDto })
  async verify(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<VerifyResponseDto> {
    const token = this.extractBearer(authorization);
    if (!token) {
      return { valid: false, expiresAt: null };
    }
    try {
      const claims = await this.tokenService.verifyAccessToken(token);
      return { valid: true, expiresAt: claims.exp };
    } catch {
      return { valid: false, expiresAt: null };
    }
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user and issue a token pair' })
  @ApiResponse({ status: 201, description: 'Account created.', type: TokenPairResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed (bad email, weak password, etc.).' })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
  ): Promise<IssuedTokens> {
    return this.authService.register(dto, this.ctx(ip, userAgent));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with email + password and issue a token pair' })
  @ApiResponse({ status: 200, description: 'Authenticated.', type: TokenPairResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
  ): Promise<IssuedTokens> {
    return this.authService.login(dto, this.ctx(ip, userAgent));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate the refresh token and receive a new access/refresh pair',
    description:
      'Refresh tokens are single-use. Submitting a previously-rotated refresh returns 401 and invalidates the chain.',
  })
  @ApiResponse({ status: 200, description: 'Rotated.', type: TokenPairResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (missing or malformed refresh token).',
  })
  @ApiResponse({ status: 401, description: 'Refresh token invalid, expired, or already consumed.' })
  refresh(
    @Body() dto: RefreshDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
  ): Promise<IssuedTokens> {
    return this.authService.refresh(dto, this.ctx(ip, userAgent));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current access + refresh token pair' })
  @ApiResponse({ status: 204, description: 'Session revoked.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
  ): Promise<void> {
    await this.authService.logout(
      {
        userId: user.userId,
        accessJti: user.accessJti,
        refreshJti: user.refreshJti,
        accessExpEpoch: user.accessExpEpoch,
      },
      this.ctx(ip, userAgent),
    );
  }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete the authenticated user account',
    description:
      'Blacklists the email (preventing re-registration), removes the user row, and revokes the active session.',
  })
  @ApiResponse({ status: 204, description: 'Account deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
  ): Promise<void> {
    await this.authService.deleteAccount(
      {
        userId: user.userId,
        accessJti: user.accessJti,
        refreshJti: user.refreshJti,
        accessExpEpoch: user.accessExpEpoch,
      },
      this.ctx(ip, userAgent),
    );
  }

  private ctx(ip: string, userAgent: string | undefined): RequestContext {
    return { ip, userAgent: userAgent ?? null };
  }

  private extractBearer(header: string | undefined): string | null {
    if (!header) return null;
    const [scheme, value] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
