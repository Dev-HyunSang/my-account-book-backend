import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../services/token.service';
import { TokenStore } from '../services/token-store';
import { AccessClaims, AuthenticatedUser } from '../types';

interface RequestLike {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly tokenStore: TokenStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestLike>();
    const token = this.extractBearer(req);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }
    let claims: AccessClaims;
    try {
      claims = await this.tokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    if (await this.tokenStore.isAccessBlacklisted(claims.jti)) {
      this.logger.warn(`Blacklisted access token used: user=${claims.sub} jti=${claims.jti}`);
      throw new UnauthorizedException('Access token has been revoked');
    }
    req.user = {
      userId: claims.sub,
      accessJti: claims.jti,
      refreshJti: claims.refreshJti,
      accessExpEpoch: claims.exp,
    };
    return true;
  }

  private extractBearer(req: RequestLike): string | null {
    const header = req.headers.authorization;
    if (!header) return null;
    const [scheme, value] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
    return value.trim();
  }
}
