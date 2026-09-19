import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../connect/prisma.service';
import { GetAnalyticsUseCase } from './get-analytics.use-case';

describe('GetAnalyticsUseCase', () => {
  let useCase: GetAnalyticsUseCase;
  let prisma: jest.Mocked<PrismaService>;

  const emptyMonthlyRows = () => [];

  beforeEach(() => {
    prisma = {
      usuario: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      evento: {
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      inscripcion: {
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      $queryRaw: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    (prisma.$queryRaw as jest.Mock).mockResolvedValue(emptyMonthlyRows());

    (prisma.usuario.count as jest.Mock).mockResolvedValue(187);
    (prisma.evento.count as jest.Mock).mockResolvedValue(18);
    (prisma.inscripcion.count as jest.Mock).mockResolvedValue(342);
    (prisma.usuario.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.evento.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.usuario.findMany as jest.Mock).mockResolvedValue([]);

    useCase = new GetAnalyticsUseCase(prisma);
  });

  it('debe retornar todas las estadísticas sin rango de fechas', async () => {
    const result = await useCase.execute();

    expect(result.usuariosActivos).toBe(187);
    expect(result.eventosRealizados).toBe(18);
    expect(result.totalAsistencias).toBe(342);
    expect(result.tasaConversion).toBe(100);
    expect(result.crecimientoMensual).toHaveLength(6);
    expect(result.asistenciaMensual).toHaveLength(6);
    expect(result.distribucionNivel).toEqual({
      novato: 0,
      intermedio: 0,
      veterano: 0,
    });
    expect(result.eventosPorTipo).toEqual([]);
    expect(result.topUsuarios).toEqual([]);
  });

  it('debe calcular la tasa de conversión sobre el rango', async () => {
    (prisma.inscripcion.count as jest.Mock)
      .mockResolvedValueOnce(68)
      .mockResolvedValueOnce(100);

    const result = await useCase.execute('2026-01-01', '2026-03-31');

    expect(result.totalAsistencias).toBe(68);
    expect(result.tasaConversion).toBe(68);
  });

  it('debe aplicar el filtro de rango en las estadísticas generales', async () => {
    await useCase.execute('2026-02-01', '2026-02-28');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prisma.usuario.count).toHaveBeenCalledWith({
      where: {
        activo: true,
        deleted_at: null,
        created_at: {
          gte: new Date('2026-02-01T00:00:00.000Z'),
          lte: new Date('2026-02-28T23:59:59.999Z'),
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prisma.evento.count).toHaveBeenCalledWith({
      where: {
        deleted_at: null,
        fecha: {
          gte: new Date('2026-02-01T00:00:00.000Z'),
          lte: new Date('2026-02-28T23:59:59.999Z'),
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prisma.inscripcion.count).toHaveBeenCalledWith({
      where: {
        asistio: true,
        deleted_at: null,
        created_at: {
          gte: new Date('2026-02-01T00:00:00.000Z'),
          lte: new Date('2026-02-28T23:59:59.999Z'),
        },
      },
    });
  });

  it('debe lanzar BadRequestException si el formato de fecha es inválido', async () => {
    await expect(useCase.execute('01/01/2026')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('debe lanzar BadRequestException si desde es posterior a hasta', async () => {
    await expect(useCase.execute('2026-06-01', '2026-01-01')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('debe mapear la distribución por nivel de experiencia', async () => {
    (prisma.usuario.groupBy as jest.Mock).mockResolvedValue([
      { nivel_experiencia: 'novato', _count: { _all: 92 } },
      { nivel_experiencia: 'intermedio', _count: { _all: 100 } },
      { nivel_experiencia: 'veterano', _count: { _all: 56 } },
    ]);

    const result = await useCase.execute();

    expect(result.distribucionNivel).toEqual({
      novato: 92,
      intermedio: 100,
      veterano: 56,
    });
  });

  it('debe mapear los eventos por tipo', async () => {
    (prisma.evento.groupBy as jest.Mock).mockResolvedValue([
      { tipo_evento: 'torneo', _count: { _all: 8 } },
      { tipo_evento: 'taller', _count: { _all: 5 } },
    ]);

    const result = await useCase.execute();

    expect(result.eventosPorTipo).toEqual([
      { tipo: 'torneo', cantidad: 8 },
      { tipo: 'taller', cantidad: 5 },
    ]);
  });

  it('debe retornar el top 10 por puntos de fidelidad con asistencias', async () => {
    (prisma.usuario.findMany as jest.Mock).mockResolvedValue([
      {
        id_usuario: 'u-1',
        nombre: 'Goblin',
        apellidos: 'Verde',
        puntos_fidelidad: 1450,
        nivel_experiencia: 'veterano',
      },
    ]);
    (prisma.inscripcion.groupBy as jest.Mock).mockResolvedValue([
      { id_usuario: 'u-1', _count: { _all: 23 } },
    ]);

    const result = await useCase.execute();

    expect(result.topUsuarios).toEqual([
      {
        nombre: 'Goblin',
        apellidos: 'Verde',
        eventosAsistidos: 23,
        puntos_fidelidad: 1450,
        nivel_experiencia: 'veterano',
      },
    ]);
  });

  it('debe llenar los buckets mensuales de crecimiento con las filas crudas', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      { month: new Date('2026-01-01'), count: 3n },
      { month: new Date('2026-02-01'), count: 4n },
    ]);

    const result = await useCase.execute('2026-01-01', '2026-02-28');

    expect(result.crecimientoMensual).toHaveLength(2);
    expect(result.crecimientoMensual[0].mes).toBe('enero');
    expect(result.crecimientoMensual[0].usuarios).toBe(3);
    expect(result.crecimientoMensual[1].mes).toBe('febrero');
    expect(result.crecimientoMensual[1].eventos).toBe(4);
    expect(result.asistenciaMensual[0].asistentes).toBe(3);
  });
});
