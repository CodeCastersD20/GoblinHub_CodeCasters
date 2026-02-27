import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BackupService } from '../backup.service';
import { SupabaseAuthGuard } from '../../supabase/guard/supabse-auth.guard';
import { RestoreBackupDto } from '../dto/restore-backup.dto';

@Controller('backup')
@UseGuards(SupabaseAuthGuard) // Todas las rutas requieren autenticación
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /**
   * GET /backup
   * Lista todos los archivos de backup disponibles, ordenados del más reciente al más antiguo.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  listBackups() {
    const backups = this.backupService.listBackups();
    return {
      success: true,
      count: backups.length,
      backups,
    };
  }

  /**
   * POST /backup
   * Dispara un respaldo manual de forma inmediata.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBackup() {
    const result = await this.backupService.createBackup();
    return {
      success: true,
      message: 'Backup created successfully',
      ...result,
    };
  }

  /**
   * POST /backup/restore
   * Restaura la base de datos desde el archivo de backup indicado.
   * Body: { "filename": "backup_2026-02-27_02-00-00.sql" }
   *
   * ⚠️ Operación destructiva: sobreescribe los datos actuales.
   */
  @Post('restore')
  @HttpCode(HttpStatus.OK)
  async restoreBackup(@Body() dto: RestoreBackupDto) {
    return await this.backupService.restoreBackup(dto.filename);
  }
}
