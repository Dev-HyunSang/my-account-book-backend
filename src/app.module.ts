import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { appConfig } from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { typeOrmModuleOptions } from './config/typeorm.config';
import { HealthModule } from './health/health.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { BlacklistModule } from './blacklist/blacklist.module';
import { AuthModule } from './auth/auth.module';
import { IncomesModule } from './incomes/incomes.module';
import { ExpensesModule } from './expenses/expenses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema,
    }),
    TypeOrmModule.forRoot(typeOrmModuleOptions),
    ScheduleModule.forRoot(),
    RedisModule,
    HealthModule,
    UsersModule,
    AuditModule,
    BlacklistModule,
    AuthModule,
    IncomesModule,
    ExpensesModule,
    SchedulerModule,
  ],
})
export class AppModule {}
