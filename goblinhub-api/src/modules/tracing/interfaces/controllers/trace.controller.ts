import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../../supabase/guard/supabse-auth.guard';
import { RolesGuard } from '../../../supabase/guard/roles.guard';
import { Roles } from '../../../supabase/guard/roles.decorator';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { GetTracesQueryDto } from '../../application/dtos/get-traces-query.dto';
import { GetTracesUseCase } from '../../application/use-case/get-traces.use-case';
import { GetTraceUseCase } from '../../application/use-case/get-trace.use-case';
import type { DetalleTraza } from '../../application/use-case/get-trace.use-case';
import type { ListadoTrazasRespuesta } from '../../application/use-case/get-traces.use-case';

class TrazaResumenDto {
  id_traza!: string;
  correlation_id!: string;
  metodo!: string;
  ruta!: string;
  estado_http!: number;
  duracion_ms!: number;
  ambiente!: string;
  id_usuario!: string | null;
  error!: string | null;
  fecha_inicio!: Date;
  fecha_fin!: Date;
}

class ListadoTrazasDto {
  data!: TrazaResumenDto[];
  total!: number | null;
  page!: number;
  limit!: number;
}

class NodoSpanDto {
  id_span!: string;
  parent_id!: string | null;
  nombre!: string;
  tipo!: string;
  duracion_ms!: number;
  estado!: string;
  atributos!: Record<string, unknown> | null;
  fecha_inicio!: Date;
  hijos!: NodoSpanDto[];
}

class DetalleTrazaDto {
  traza!: TrazaResumenDto;
  pasos!: NodoSpanDto[];
}

/**
 * `GET /traces` es **admin-only** por decisión de `T036`, no por necesidad técnica:
 * una traza lleva la ruta, el usuario que la hizo y los errores de la petición,
 * y el visor está pensado para el panel de administración (Principio II). Dejarlo
 * abierto a cualquier usuario autenticado publicaría el historial de actividad de
 * los demás.
 *
 * Los guards van en el controlador y no en cada método: las dos rutas son
 * igualmente sensibles y olvidarse de proteger una al añadirla sería un fallo de
 * autorización por omisión.
 */
@ApiTags('Trazabilidad')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(RolUsuario.admin)
@Controller('traces')
export class TrazaController {
  constructor(
    private readonly getTracesUseCase: GetTracesUseCase,
    private readonly getTraceUseCase: GetTraceUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar trazas con filtros y paginación (Admin)',
    description:
      'Ordena por fecha de inicio descendente. Un `desde` posterior a `hasta` devuelve una lista vacía con 200, no un 400.',
  })
  @ApiOkResponse({ type: ListadoTrazasDto })
  @ApiUnauthorizedResponse({ description: 'Falta el token.' })
  @ApiForbiddenResponse({ description: 'El rol no es admin.' })
  @ApiBadRequestResponse({ description: 'Parámetro de consulta inválido.' })
  async listar(
    @Query() consulta: GetTracesQueryDto,
  ): Promise<ListadoTrazasRespuesta> {
    return await this.getTracesUseCase.execute(consulta);
  }

  @Get(':correlationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Detalle de una traza con sus pasos en árbol (Admin)',
  })
  @ApiParam({
    name: 'correlationId',
    description: 'Identificador de correlación de la traza.',
  })
  @ApiOkResponse({ type: DetalleTrazaDto })
  @ApiUnauthorizedResponse({ description: 'Falta el token.' })
  @ApiForbiddenResponse({ description: 'El rol no es admin.' })
  @ApiNotFoundResponse({ description: 'No existe esa traza.' })
  async detalle(
    @Param('correlationId') correlationId: string,
  ): Promise<DetalleTraza> {
    return await this.getTraceUseCase.execute(correlationId);
  }
}
