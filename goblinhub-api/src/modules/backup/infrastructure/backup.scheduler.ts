import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BackupService } from '../backup.service';
import { AuditoriaService } from '../../auditoria/domain/services/auditoria.service';

@Injectable()
export class BackupScheduler {
  private readonly logger = new Logger(BackupScheduler.name);

  constructor(
    private readonly backupService: BackupService,
    private readonly auditoria: AuditoriaService,
  ) {}

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

      // Un respaldo diario es una operación relevante sobre el recurso más
      // sensible del sistema, y es exactamente el tipo de acción que el
      // alcance de #212 pide poder consultar cuando ocurrió y con qué
      // resultado. No se guarda el nombre del fichero: sería detalle que el
      // criterio no pide.
      await this.auditoria.registrarProceso({
        accion: 'RESPALDO',
        recurso: 'backups',
        resultado: 'exitoso',
      });
    } catch (error) {
      this.logger.error('❌ El respaldo automático diario falló', error);

      await this.auditoria.registrarProceso({
        accion: 'RESPALDO',
        recurso: 'backups',
        resultado: 'fallido',
      });
    }
  }
}
