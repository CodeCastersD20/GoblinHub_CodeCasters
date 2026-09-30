import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupController } from './interfaces/backup.controller';
import { BackupScheduler } from './infrastructure/backup.scheduler';
import { SupabaseAuthModule } from '../supabase/supabase-auth.module';
import { PrismaModule } from '../../connect/prisma.module';
import { MetricsModule } from '../metrics/metrics.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    SupabaseAuthModule, // para poder usar SupabaseAuthGuard en el controller
    PrismaModule,
    MetricsModule, // publica la marca de tiempo del �ltimo respaldo (M-12)
    // Publica `AuditoriaService`: el respaldo diario deja constancia de su
    // ejecución en `logs_auditoria` (#212).
    AuditoriaModule,
  ],
  controllers: [BackupController],
  providers: [BackupService, BackupScheduler],
})
export class BackupModule {}
