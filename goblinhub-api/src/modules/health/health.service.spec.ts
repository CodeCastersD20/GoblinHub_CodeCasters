import { HealthService } from './health.service';
import { PrismaService } from '../../connect/prisma.service';

const mockPing = jest.fn();

jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => ({ ping: mockPing })),
}));

describe('HealthService', () => {
  const ORIGINAL_ENV = process.env;

  let prisma: { $queryRaw: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, REDIS_URL: 'redis://localhost:6379' };
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    mockPing.mockResolvedValue('PONG');
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('liveness', () => {
    it('reporta el proceso vivo sin consultar dependencias', () => {
      const service = new HealthService(prisma as unknown as PrismaService);

      const resultado = service.liveness();

      expect(resultado.estado).toBe('ok');
      expect(resultado.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(new Date(resultado.timestamp).toString()).not.toBe('Invalid Date');
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(mockPing).not.toHaveBeenCalled();
    });
  });

  describe('readiness', () => {
    it('reporta ok cuando PostgreSQL y Redis responden', async () => {
      const service = new HealthService(prisma as unknown as PrismaService);

      const reporte = await service.readiness();

      expect(reporte.estado).toBe('ok');
      expect(reporte.dependencias.postgres.estado).toBe('up');
      expect(reporte.dependencias.redis.estado).toBe('up');
      expect(reporte.dependencias.postgres.latenciaMs).toBeGreaterThanOrEqual(
        0,
      );
    });

    it('reporta degraded y detalle cuando PostgreSQL falla', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
      const service = new HealthService(prisma as unknown as PrismaService);

      const reporte = await service.readiness();

      expect(reporte.estado).toBe('degraded');
      expect(reporte.dependencias.postgres.estado).toBe('down');
      expect(reporte.dependencias.postgres.detalle).toContain(
        'connection refused',
      );
      expect(reporte.dependencias.redis.estado).toBe('up');
    });

    it('reporta degraded y detalle cuando Redis falla', async () => {
      mockPing.mockRejectedValue(new Error('READONLY You cannot write'));
      const service = new HealthService(prisma as unknown as PrismaService);

      const reporte = await service.readiness();

      expect(reporte.estado).toBe('degraded');
      expect(reporte.dependencias.redis.estado).toBe('down');
      expect(reporte.dependencias.redis.detalle).toContain('READONLY');
      expect(reporte.dependencias.postgres.estado).toBe('up');
    });

    it('reporta degraded si Redis responde algo distinto de PONG', async () => {
      mockPing.mockResolvedValue('OK');
      const service = new HealthService(prisma as unknown as PrismaService);

      const reporte = await service.readiness();

      expect(reporte.dependencias.redis.estado).toBe('down');
      expect(reporte.dependencias.redis.detalle).toContain(
        'respuesta inesperada',
      );
    });

    it('reporta degraded sin tocar Redis si REDIS_URL no está configurada', async () => {
      delete process.env.REDIS_URL;
      const service = new HealthService(prisma as unknown as PrismaService);

      const reporte = await service.readiness();

      expect(reporte.estado).toBe('degraded');
      expect(reporte.dependencias.redis).toEqual({
        estado: 'down',
        latenciaMs: 0,
        detalle: 'REDIS_URL no configurado',
      });
      expect(mockPing).not.toHaveBeenCalled();
    });

    it('marca down la dependencia que excede el presupuesto de tiempo', async () => {
      prisma.$queryRaw.mockImplementation(() => new Promise(() => {}));
      const service = new HealthService(prisma as unknown as PrismaService, 10);

      const reporte = await service.readiness();

      expect(reporte.dependencias.postgres.estado).toBe('down');
      expect(reporte.dependencias.postgres.detalle).toContain(
        'timeout tras 10 ms',
      );
    });
  });
});
