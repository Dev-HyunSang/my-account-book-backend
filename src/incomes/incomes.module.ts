import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Income } from './income.entity';
import { IncomesController } from './incomes.controller';
import { IncomesRepository } from './incomes.repository';
import { IncomesService } from './incomes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Income]), AuthModule],
  controllers: [IncomesController],
  providers: [IncomesService, IncomesRepository],
  exports: [IncomesService],
})
export class IncomesModule {}
