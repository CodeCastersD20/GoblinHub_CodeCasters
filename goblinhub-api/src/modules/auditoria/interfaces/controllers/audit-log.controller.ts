import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../../supabase/guard/supabse-auth.guard';
import { RolesGuard } from '../../../supabase/guard/roles.guard';
import { Roles } from '../../../supabase/guard/roles.decorator';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';
import { GetAuditLogsQueryDto } from '../../application/dtos/get-audit-logs-query.dto';
import { GetAuditLogsUseCase } from '../../application/use-case/get-audit-logs.use-case';
import type { ListadoAuditoriaRespuesta } from '../../application/use-case/get-audit-logs.use-case';

class ActorAuditoriaDto {
  nombre!: string;
  apellidos!: string;
  rol!: string;
}

class RegistroAuditoriaDto {
  id_auditoria!: string;
  actor_tipo!: string;
  actor_id!: string | null;
  accion!: string;
  recurso!: string;
  resultado!: string;
  correlation_id!: string;
  fecha_hora!: Date;
  actor!: ActorAuditoriaDto | null;
}

class ListadoAuditoriaDto {
  data!: RegistroAuditoriaDto[];
  total!: number | null;
  page!: number;
  limit!: number;
}

/**
 * `GET /audit-logs` es **admin-only** y no una decisión de rendimiento: un
 * registro de auditoría dice quién hizo qué sobre qué recurso, y mostrarlo a
 * cualquier usuario autenticado publicaría la actividad de los demás. El
 * visor vive en el panel de administración, y la misma razón deja los permisos
 * en el controlador y no en cada método: una ruta nueva añadida mañana no
 * debería poder quedar sin proteger por olvido (Principio II).
 *
 * Solo existe una ruta de lectura. No hay endpoint de escritura, de edición ni
 * de borrado: la inmutabilidad la garantiza el repositorio, que solo expone
 * `create`.
 */
@ApiTags('Auditoría')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(RolUsuario.admin)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly getAuditLogsUseCase: GetAuditLogsUseCase) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar registros de auditoría con filtros (Admin)',
    description:
      'Ordena por fecha descendente. Un `desde` posterior a `hasta` devuelve una lista vacía con 200, no un 400. `actor` acepta el UUID exacto o parte del nombre.',
  })
  @ApiOkResponse({ type: ListadoAuditoriaDto })
  @ApiUnauthorizedResponse({ description: 'Falta el token.' })
  @ApiForbiddenResponse({ description: 'El rol no es admin.' })
  @ApiBadRequestResponse({ description: 'Parámetro de consulta inválido.' })
  async listar(
    @Query() consulta: GetAuditLogsQueryDto,
  ): Promise<ListadoAuditoriaRespuesta> {
    return await this.getAuditLogsUseCase.execute(consulta);
  }
}
