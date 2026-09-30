import { Logger } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import type { RegistroAuditoria } from '../repositories/log-auditoria.repository';
import type { LogAuditoriaRepository } from '../repositories/log-auditoria.repository';

const CORRELACION = 'a1b2c3d4-1111-4222-8333-444455556666';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('AuditoriaService', () => {
  let repositorio: { registrar: jest.Mock<Promise<void>, [RegistroAuditoria]> };
  let servicio: AuditoriaService;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    repositorio = {
      registrar: jest
        .fn<Promise<void>, [RegistroAuditoria]>()
        .mockResolvedValue(undefined),
    };
    servicio = new AuditoriaService(
      repositorio as unknown as LogAuditoriaRepository,
    );
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
  });

  it('delega en el repositorio el registro recibido', async () => {
    const registro = {
      actor_tipo: 'usuario' as const,
      actor_id: '3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73',
      accion: 'POST',
      recurso: '/events',
      resultado: 'exitoso' as const,
      correlation_id: CORRELACION,
    };

    await servicio.registrar(registro);

    expect(repositorio.registrar).toHaveBeenCalledWith(registro);
  });

  it('no lanza cuando la base de datos no está disponible', async () => {
    repositorio.registrar.mockRejectedValue(new Error('sin conexion'));

    await expect(
      servicio.registrar({
        actor_tipo: 'anonimo',
        actor_id: null,
        accion: 'POST',
        recurso: '/auth/login',
        resultado: 'rechazado',
        correlation_id: CORRELACION,
      }),
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('sin conexion'));
  });

  it('marca como sistema y sin actor el registro de un proceso automático', async () => {
    await servicio.registrarProceso({
      accion: 'RESPALDO',
      recurso: 'backups',
      resultado: 'exitoso',
      correlation_id: CORRELACION,
    });

    expect(repositorio.registrar).toHaveBeenCalledWith({
      actor_tipo: 'sistema',
      actor_id: null,
      accion: 'RESPALDO',
      recurso: 'backups',
      resultado: 'exitoso',
      correlation_id: CORRELACION,
    });
  });

  it('genera un correlación propio cuando el proceso no trae uno', async () => {
    await servicio.registrarProceso({
      accion: 'EXPIRACION',
      recurso: 'eventos',
      resultado: 'fallido',
    });

    expect(repositorio.registrar.mock.calls[0][0].correlation_id).toMatch(
      UUID_V4,
    );
  });
});
