import { Logger } from '@nestjs/common';
import { EventExpirationScheduler } from './event-expiration.scheduler';
import { ExpireEventsUseCase } from '../../application/use-case/expire-events.use-case';
import { AuditoriaService } from '../../../auditoria/domain/services/auditoria.service';

/**
 * El cron corre cada minuto: registrar una fila por ejecución llenaría la
 * tabla con 1.440 registros diarios que no dicen nada. Estas pruebas fijan que
 * solo se audita cuando el proceso ha hecho algo y también cuando ha fallado.
 */
describe('EventExpirationScheduler', () => {
  let useCase: { expireAndSoftDeleteEvents: jest.Mock };
  let auditoria: { registrarProceso: jest.Mock };
  let scheduler: EventExpirationScheduler;
  let error: jest.SpyInstance;

  beforeEach(() => {
    useCase = { expireAndSoftDeleteEvents: jest.fn().mockResolvedValue(3) };
    auditoria = { registrarProceso: jest.fn().mockResolvedValue(undefined) };
    scheduler = new EventExpirationScheduler(
      useCase as unknown as ExpireEventsUseCase,
      auditoria as unknown as AuditoriaService,
    );
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deja constancia cuando ha caducado algún evento', async () => {
    await scheduler.handleExpiredEvents();

    expect(auditoria.registrarProceso).toHaveBeenCalledWith({
      accion: 'EXPIRACION',
      recurso: 'eventos',
      resultado: 'exitoso',
    });
  });

  it('no deja constancia cuando no ha caducado nada', async () => {
    useCase.expireAndSoftDeleteEvents.mockResolvedValue(0);

    await scheduler.handleExpiredEvents();

    expect(auditoria.registrarProceso).not.toHaveBeenCalled();
  });

  it('deja constancia de la falla si el proceso se rompe', async () => {
    useCase.expireAndSoftDeleteEvents.mockRejectedValue(new Error('caido'));

    await scheduler.handleExpiredEvents();

    expect(error).toHaveBeenCalled();
    expect(auditoria.registrarProceso).toHaveBeenCalledWith({
      accion: 'EXPIRACION',
      recurso: 'eventos',
      resultado: 'fallido',
    });
  });
});
