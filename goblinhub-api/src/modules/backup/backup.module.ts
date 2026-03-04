import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupController } from './interfaces/backup.controller';
import { BackupScheduler } from './infrastructure/backup.scheduler';
import { SupabaseAuthModule } from '../supabase/supabase-auth.module';

@Module({
  imports: [
    SupabaseAuthModule, // para poder usar SupabaseAuthGuard en el controller
  ],
  controllers: [BackupController],
  providers: [BackupService, BackupScheduler],
})
export class BackupModule {}
