import { Module } from '@nestjs/common';
import { ReportsController } from './interfaces/controllers/reports.controller';
import { GetAnalyticsUseCase } from './application/use-case/get-analytics.use-case';
import { PrismaModule } from '../../connect/prisma.module';
import { SupabaseAuthModule } from '../supabase/supabase-auth.module';

@Module({
  imports: [PrismaModule, SupabaseAuthModule],
  controllers: [ReportsController],
  providers: [GetAnalyticsUseCase],
  exports: [GetAnalyticsUseCase],
})
export class ReportsModule {}
