import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlacklistService } from './blacklist.service';
import { EmailBlacklist } from './email-blacklist.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([EmailBlacklist])],
  providers: [BlacklistService],
  exports: [BlacklistService],
})
export class BlacklistModule {}
