import { Module } from '@nestjs/common';
import { LogController } from './interfaces/controllers/log.controller';
import { GetLogsUseCase } from './application/use-case/get-logs.use-case';
import { GetDashboardMetricsUseCase } from './application/use-case/get-dashboard-metrics.use-case';
import { PrismaLogRepository } from './infrastructure/prisma-log.repository';
import { LOG_REPOSITORY } from './domain/repositories/log.repository';

import { PrismaModule } from '../../connect/prisma.module';

import { SupabaseAuthModule } from '../supabase/supabase-auth.module';

@Module({
  imports: [PrismaModule, SupabaseAuthModule],
  controllers: [LogController],
  providers: [
    GetLogsUseCase,
    GetDashboardMetricsUseCase,
    {
      provide: LOG_REPOSITORY,
      useClass: PrismaLogRepository,
    },
  ],
  exports: [LOG_REPOSITORY],
})
export class LogsModule {}
