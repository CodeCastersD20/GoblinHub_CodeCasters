import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupController } from './interfaces/backup.controller';
import { BackupScheduler } from './infrastructure/backup.scheduler';
import { SupabaseAuthModule } from '../supabase/supabase-auth.module';
import { PrismaModule } from '../../connect/prisma.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    SupabaseAuthModule, // para poder usar SupabaseAuthGuard en el controller
    PrismaModule,
    MetricsModule, // publica la marca de tiempo del último respaldo (M-12)
  ],
  controllers: [BackupController],
  providers: [BackupService, BackupScheduler],
})
export class BackupModule {}
