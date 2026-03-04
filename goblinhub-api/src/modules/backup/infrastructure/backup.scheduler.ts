import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BackupService } from '../backup.service';

@Injectable()
export class BackupScheduler {
  private readonly logger = new Logger(BackupScheduler.name);

  constructor(private readonly backupService: BackupService) {}

  /**
   * Ejecuta un respaldo automático cada 24 horas (todos los días a las 02:00 AM).
   * Usar EVERY_DAY_AT_2AM para producción minimiza impacto en horas pico.
   */
  @Cron('0 2 * * *', { name: 'daily-database-backup' })
  async handleDailyBackup(): Promise<void> {
    this.logger.log('⏰ Iniciando respaldo automático diario...');
    try {
      const result = await this.backupService.createBackup();
      this.logger.log(
        `✅ Respaldo automático completado: ${result.filename} (${result.sizeKb} KB)`,
      );
    } catch (error) {
      this.logger.error('❌ El respaldo automático diario falló', error);
    }
  }
}
