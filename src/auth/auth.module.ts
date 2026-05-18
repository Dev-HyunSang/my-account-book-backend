import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordHasher } from './services/password-hasher';
import { TokenService } from './services/token.service';
import { TokenStore } from './services/token-store';

// JwtModule is imported with no defaults; TokenService passes per-call
// `{ secret, expiresIn, algorithm }` to keep access/refresh secrets separated.
@Module({
  imports: [UsersModule, JwtModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordHasher, TokenService, TokenStore, JwtAuthGuard],
  exports: [JwtAuthGuard, TokenService, TokenStore],
})
export class AuthModule {}
