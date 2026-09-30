import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RESULTADOS_AUDITORIA } from '../../domain/enums/resultado-auditoria.enum';

/**
 * Límites de `GET /audit-logs`, declarados una sola vez porque los reproduce el
 * mensaje de error, Swagger y la acotación: tres sitios que se desincronizan
 * dan un `400` que no coincide con lo que dice la documentación.
 */
export const LIMITES_AUDITORIA = {
  /** `limit` fuera de rango se acota en lugar de rechazarse. */
  LIMIT_MIN: 1,
  LIMIT_MAX: 200,
  LIMIT_POR_DEFECTO: 50,
  PAGE_MIN: 1,
  /** Un UUID completo mide 36; el tope deja margen para buscar por nombre. */
  ACTOR_MAX: 100,
  /** La columna `accion` es `VarChar(20)`. */
  ACCION_MAX: 20,
  /** La columna `recurso` es `VarChar(200)`. */
  RECURSO_MAX: 200,
} as const;

/**
 * Los parámetros de consulta llegan como cadenas, así que `limit=10` es `"10"`.
 * Sin esto, `@IsInt()` vería `"10"` y rechazaría una petición perfectamente
 * válida.
 */
const aEntero = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  return Number(value);
};

/**
 * Convierte a entero acotando. Devolver `NaN` para lo que no es número hace que
 * `@IsInt()` falle con el mensaje de «debe ser un número entero», que es más
 * útil que devolver un valor inventado.
 */
const acotarEntero = (valor: unknown, min: number, max: number): number => {
  const numero = typeof valor === 'number' ? valor : Number(valor);

  if (Number.isNaN(numero)) {
    return Number.NaN;
  }

  return Math.min(Math.max(Math.trunc(numero), min), max);
};

const aEnteroAcotado =
  (min: number, max: number) =>
  ({ value }: { value: unknown }): unknown => {
    if (value === undefined || value === null || value === '') {
      return value;
    }

    return acotarEntero(value, min, max);
  };

/**
 * `accion` se normaliza a mayúsculas porque así se guarda en la columna: una
 * búsqueda por `post` no encontraría nada si no se tradujera.
 */
const aMayusculas = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

/**
 * `includeTotal` llega como `"true"` o `"false"`. Se distingue del resto de
 * booleanos porque cualquier otra palabra es un error de quien llama, no un
 * `false` silencioso que devolvería un total inesperado.
 */
const aBooleano = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'boolean') {
    return value;
  }

  const texto = String(value).trim().toLowerCase();

  if (texto === 'true') return true;
  if (texto === 'false') return false;

  return value;
};

/**
 * Los cinco filtros del criterio 3 de #212 más la paginación.
 *
 * `actor` acepta el UUID exacto o parte del nombre, porque un administrador no
 * recuerda los UUID de memoria: el repositorio decide con qué comparar.
 */
export class GetAuditLogsQueryDto {
  @ApiPropertyOptional({
    description: 'Página solicitada. La primera es la 1.',
    minimum: LIMITES_AUDITORIA.PAGE_MIN,
    default: 1,
  })
  @IsOptional()
  @Transform(aEntero)
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(LIMITES_AUDITORIA.PAGE_MIN, {
    message: 'page debe ser mayor o igual a 1',
  })
  page: number = 1;

  @ApiPropertyOptional({
    description:
      'Cuántos registros por página. Fuera del rango se acota, no se rechaza.',
    minimum: LIMITES_AUDITORIA.LIMIT_MIN,
    maximum: LIMITES_AUDITORIA.LIMIT_MAX,
    default: LIMITES_AUDITORIA.LIMIT_POR_DEFECTO,
  })
  @IsOptional()
  @Transform(
    aEnteroAcotado(LIMITES_AUDITORIA.LIMIT_MIN, LIMITES_AUDITORIA.LIMIT_MAX),
  )
  @IsInt({ message: 'limit debe ser un número entero' })
  limit: number = LIMITES_AUDITORIA.LIMIT_POR_DEFECTO;

  @ApiPropertyOptional({
    description:
      'UUID exacto del actor o parte de su nombre o apellidos. Un valor que no sea un UUID solo se compara contra el nombre.',
    maxLength: LIMITES_AUDITORIA.ACTOR_MAX,
  })
  @IsOptional()
  @IsString({ message: 'actor debe ser texto' })
  @MaxLength(LIMITES_AUDITORIA.ACTOR_MAX, {
    message: `actor no debe ser más largo que ${LIMITES_AUDITORIA.ACTOR_MAX} caracteres`,
  })
  actor?: string;

  @ApiPropertyOptional({
    description: 'Acción ejecutada. Se normaliza a mayúsculas.',
    maxLength: LIMITES_AUDITORIA.ACCION_MAX,
  })
  @IsOptional()
  @Transform(aMayusculas)
  @IsString({ message: 'accion debe ser texto' })
  @MaxLength(LIMITES_AUDITORIA.ACCION_MAX, {
    message: `accion no debe ser más largo que ${LIMITES_AUDITORIA.ACCION_MAX} caracteres`,
  })
  accion?: string;

  @ApiPropertyOptional({
    description:
      'Fragmento del recurso, por ejemplo `/events`. Se compara contenido, no igualdad.',
    maxLength: LIMITES_AUDITORIA.RECURSO_MAX,
  })
  @IsOptional()
  @IsString({ message: 'recurso debe ser texto' })
  @MaxLength(LIMITES_AUDITORIA.RECURSO_MAX, {
    message: `recurso no debe ser más largo que ${LIMITES_AUDITORIA.RECURSO_MAX} caracteres`,
  })
  recurso?: string;

  @ApiPropertyOptional({
    description: 'Desenlace de la operación.',
    enum: RESULTADOS_AUDITORIA,
  })
  @IsOptional()
  @IsIn(RESULTADOS_AUDITORIA, {
    message: 'resultado debe ser exitoso, rechazado o fallido',
  })
  resultado?: (typeof RESULTADOS_AUDITORIA)[number];

  @ApiPropertyOptional({
    description:
      'Extremo izquierdo del rango, ISO 8601. Si es posterior a `hasta`, el resultado es una lista vacía.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'desde debe ser una fecha ISO 8601' })
  desde?: string;

  @ApiPropertyOptional({
    description: 'Extremo derecho del rango, ISO 8601.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'hasta debe ser una fecha ISO 8601' })
  hasta?: string;

  @ApiPropertyOptional({
    description:
      'Pedir el total de resultados. En tablas grandes el `COUNT` es la parte cara de la consulta, así que se puede omitir.',
    default: false,
  })
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean({ message: 'includeTotal debe ser un valor booleano' })
  includeTotal: boolean = false;
}
