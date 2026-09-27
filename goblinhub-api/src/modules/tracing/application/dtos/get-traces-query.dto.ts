import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Rangos tomados de la tabla de parámetros de `data-model.md`. Se declaran una
 * sola vez aquí porque los reproduce el mensaje de error, Swagger y la
 * acotación: tres sitios que se desincronizan dan un `400` que no coincide con
 * lo que dice la documentación.
 */
export const LIMITES_TRACES = {
  /** `limit` fuera de rango se acota en lugar de rechazarse. */
  LIMIT_MIN: 1,
  LIMIT_MAX: 200,
  LIMIT_POR_DEFECTO: 50,
  PAGE_MIN: 1,
  RUTA_MAX: 200,
  METODO_MAX: 10,
  AMBIENTE_MAX: 20,
  CORRELATION_MAX: 64,
  ESTADO_MIN: 100,
  ESTADO_MAX: 599,
  DURACION_MIN: 0,
} as const;

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

const aEnteroAcotado =
  (min: number, max: number) =>
  ({ value }: { value: unknown }): unknown => {
    if (value === undefined || value === null || value === '') {
      return value;
    }

    return acotarEntero(value, min, max);
  };

/**
 * `metodo` se normaliza a mayúsculas porque en la base está siempre en
 * mayúsculas y una búsqueda por `get` no encontraría nada si no se tradujera.
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

export class GetTracesQueryDto {
  @ApiPropertyOptional({
    description: 'Página solicitada. La primera es la 1.',
    minimum: LIMITES_TRACES.PAGE_MIN,
    default: 1,
  })
  @IsOptional()
  @Transform(aEntero)
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(LIMITES_TRACES.PAGE_MIN, {
    message: 'page debe ser mayor o igual a 1',
  })
  page: number = 1;

  @ApiPropertyOptional({
    description:
      'Cuántas trazas por página. Fuera del rango se acota, no se rechaza.',
    minimum: LIMITES_TRACES.LIMIT_MIN,
    maximum: LIMITES_TRACES.LIMIT_MAX,
    default: LIMITES_TRACES.LIMIT_POR_DEFECTO,
  })
  @IsOptional()
  @Transform(aEnteroAcotado(LIMITES_TRACES.LIMIT_MIN, LIMITES_TRACES.LIMIT_MAX))
  @IsInt({ message: 'limit debe ser un número entero' })
  limit: number = LIMITES_TRACES.LIMIT_POR_DEFECTO;

  @ApiPropertyOptional({
    description: 'Verbo HTTP. Se normaliza a mayúsculas.',
    maxLength: LIMITES_TRACES.METODO_MAX,
  })
  @IsOptional()
  @Transform(aMayusculas)
  @IsString({ message: 'metodo debe ser texto' })
  @MaxLength(LIMITES_TRACES.METODO_MAX, {
    message: `metodo no debe ser más largo que ${LIMITES_TRACES.METODO_MAX} caracteres`,
  })
  metodo?: string;

  @ApiPropertyOptional({
    description:
      'Prefijo de la ruta ya normalizada, por ejemplo `/events/:id`.',
    maxLength: LIMITES_TRACES.RUTA_MAX,
  })
  @IsOptional()
  @IsString({ message: 'ruta debe ser texto' })
  @MaxLength(LIMITES_TRACES.RUTA_MAX, {
    message: `ruta no debe ser más larga que ${LIMITES_TRACES.RUTA_MAX} caracteres`,
  })
  ruta?: string;

  @ApiPropertyOptional({
    description:
      'Código de respuesta exacto, entre 100 y 599. Un 401 es información de diagnóstico, no ruido.',
    minimum: LIMITES_TRACES.ESTADO_MIN,
    maximum: LIMITES_TRACES.ESTADO_MAX,
  })
  @IsOptional()
  @Transform(aEntero)
  @IsInt({ message: 'estado debe ser un número entero' })
  @Min(LIMITES_TRACES.ESTADO_MIN, {
    message: `estado debe ser mayor o igual a ${LIMITES_TRACES.ESTADO_MIN}`,
  })
  @Max(LIMITES_TRACES.ESTADO_MAX, {
    message: `estado debe ser menor o igual a ${LIMITES_TRACES.ESTADO_MAX}`,
  })
  estado?: number;

  @ApiPropertyOptional({
    description:
      'Entorno de despliegue. Un valor fuera del catálogo devuelve la lista vacía, no un error.',
    maxLength: LIMITES_TRACES.AMBIENTE_MAX,
  })
  @IsOptional()
  @IsString({ message: 'ambiente debe ser texto' })
  @MaxLength(LIMITES_TRACES.AMBIENTE_MAX, {
    message: `ambiente no debe ser más largo que ${LIMITES_TRACES.AMBIENTE_MAX} caracteres`,
  })
  ambiente?: string;

  @ApiPropertyOptional({
    description: 'Correlación exacta de la traza.',
    maxLength: LIMITES_TRACES.CORRELATION_MAX,
  })
  @IsOptional()
  @IsString({ message: 'correlationId debe ser texto' })
  @MaxLength(LIMITES_TRACES.CORRELATION_MAX, {
    message: `correlationId no debe ser más largo que ${LIMITES_TRACES.CORRELATION_MAX} caracteres`,
  })
  correlationId?: string;

  @ApiPropertyOptional({ description: 'Usuario exacto, como UUID.' })
  @IsOptional()
  @IsUUID('4', { message: 'usuarioId debe ser un UUID' })
  usuarioId?: string;

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
    description: 'Duración mínima en milisegundos.',
    minimum: LIMITES_TRACES.DURACION_MIN,
  })
  @IsOptional()
  @Transform(aEntero)
  @IsInt({ message: 'minDuracion debe ser un número entero' })
  @Min(LIMITES_TRACES.DURACION_MIN, {
    message: 'minDuracion debe ser mayor o igual a 0',
  })
  minDuracion?: number;

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

/** Alias de solo tipo, para quien quiera el nombre que usa la spec. */
export type TracesQuery = GetTracesQueryDto;
