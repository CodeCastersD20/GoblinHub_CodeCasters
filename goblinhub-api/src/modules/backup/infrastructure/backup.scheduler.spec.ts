import { Logger } from '@nestjs/common';
import { BackupScheduler } from './backup.scheduler';
import { BackupService } from '../backup.service';
import { AuditoriaService } from '../../auditoria/domain/services/auditoria.service';

/**
 * El respaldo diario es el proceso automático más delicado del sistema: si no
 * llega a ejecutarse o falla, la auditoría es donde tiene que quede constancia
 * de ello (#212).
 */
describe('BackupScheduler', () => {
  let backupService: { createBackup: jest.Mock };
  let auditoria: { registrarProceso: jest.Mock };
  let scheduler: BackupScheduler;

  beforeEach(() => {
    backupService = {
      createBackup: jest.fn().mockResolvedValue({
        filename: 'backup_2026-09-30_02-00-00.sql',
        sizeKb: 12,
      }),
    };
    auditoria = { registrarProceso: jest.fn().mockResolvedValue(undefined) };
    scheduler = new BackupScheduler(
      backupService as unknown as BackupService,
      auditoria as unknown as AuditoriaService,
    );
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deja constancia del respaldo completado', async () => {
    await scheduler.handleDailyBackup();

    expect(auditoria.registrarProceso).toHaveBeenCalledWith({
      accion: 'RESPALDO',
      recurso: 'backups',
      resultado: 'exitoso',
    });
  });

  it('deja constancia del respaldo fallido sin lanzar', async () => {
    backupService.createBackup.mockRejectedValue(new Error('sin disco'));

    await expect(scheduler.handleDailyBackup()).resolves.toBeUndefined();

    expect(auditoria.registrarProceso).toHaveBeenCalledWith({
      accion: 'RESPALDO',
      recurso: 'backups',
      resultado: 'fallido',
    });
  });
});
