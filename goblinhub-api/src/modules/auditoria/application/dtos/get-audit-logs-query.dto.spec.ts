import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetAuditLogsQueryDto } from './get-audit-logs-query.dto';

/**
 * Las mismas opciones que el `ValidationPipe` global de `main.ts`. Se repiten
 * a propósito: si el pipe global cambiara, esta prueba dejaría de comprobar lo
 * que la API hace y empezaría a comprobar lo que la prueba dice.
 */
const OPCIONES_PIPE = {
  whitelist: true,
  forbidNonWhitelisted: true,
} as const;

const consultar = async (consulta: Record<string, unknown>) => {
  const dto = plainToInstance(GetAuditLogsQueryDto, consulta);
  const errores = await validate(dto, OPCIONES_PIPE);

  return { dto, errores };
};

const mensajesDe = (errores: { constraints?: Record<string, string> }[]) =>
  errores.flatMap((e) => Object.values(e.constraints ?? {}));

describe('GetAuditLogsQueryDto', () => {
  it('devuelve la primera página con cincuenta registros y sin contar el total', async () => {
    const { dto, errores } = await consultar({});

    expect(errores).toEqual([]);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(50);
    expect(dto.includeTotal).toBe(false);
  });

  it('rechaza un parámetro que no está declarado', async () => {
    const { errores } = await consultar({ page: '1', inventado: 'x' });

    expect(mensajesDe(errores).join(' ')).toContain('inventado');
  });

  it('acota el limit en lugar de rechazarlo', async () => {
    expect((await consultar({ limit: '5000' })).dto.limit).toBe(200);
    expect((await consultar({ limit: '0' })).dto.limit).toBe(1);
  });

  it('convierte el limit que llega como cadena a entero', async () => {
    const { dto, errores } = await consultar({ limit: '25' });

    expect(errores).toEqual([]);
    expect(dto.limit).toBe(25);
  });

  it('rechaza un limit que no es número', async () => {
    const { errores } = await consultar({ limit: 'veinticinco' });

    expect(mensajesDe(errores).join(' ')).toContain('entero');
  });

  it('normaliza la acción a mayúsculas', async () => {
    const { dto, errores } = await consultar({ accion: ' post ' });

    expect(errores).toEqual([]);
    expect(dto.accion).toBe('POST');
  });

  it('acepta los tres resultados del catálogo', async () => {
    for (const resultado of ['exitoso', 'rechazado', 'fallido']) {
      const { dto, errores } = await consultar({ resultado });
      expect(errores).toEqual([]);
      expect(dto.resultado).toBe(resultado);
    }
  });

  it('rechaza un resultado fuera del catálogo', async () => {
    const { errores } = await consultar({ resultado: 'pendiente' });

    expect(mensajesDe(errores).join(' ')).toContain(
      'exitoso, rechazado o fallido',
    );
  });

  it('rechaza una fecha que no es ISO 8601', async () => {
    const { errores } = await consultar({ desde: 'ayer' });

    expect(mensajesDe(errores).join(' ')).toContain('ISO 8601');
  });

  it('acepta el rango completo de fechas', async () => {
    const { dto, errores } = await consultar({
      desde: '2026-01-01T00:00:00.000Z',
      hasta: '2026-01-31T23:59:59.999Z',
    });

    expect(errores).toEqual([]);
    expect(dto.desde).toBe('2026-01-01T00:00:00.000Z');
    expect(dto.hasta).toBe('2026-01-31T23:59:59.999Z');
  });

  it('acota actor, acción y recurso a los anchos de sus columnas', async () => {
    const { errores } = await consultar({
      actor: 'a'.repeat(101),
      accion: 'a'.repeat(21),
      recurso: 'a'.repeat(201),
    });

    expect(mensajesDe(errores)).toHaveLength(3);
  });

  it('interpreta includeTotal como booleano', async () => {
    expect((await consultar({ includeTotal: 'true' })).dto.includeTotal).toBe(
      true,
    );
    expect((await consultar({ includeTotal: 'quizá' })).errores).not.toEqual(
      [],
    );
  });
});
