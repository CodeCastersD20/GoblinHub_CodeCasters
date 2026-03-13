import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { GetLogsUseCase } from '../../application/use-case/get-logs.use-case';
import { LogFilters } from '../../domain/repositories/log.repository';

import { SupabaseAuthGuard } from '../../../supabase/guard/supabse-auth.guard';
import { RolesGuard } from '../../../supabase/guard/roles.guard';
import { Roles } from '../../../supabase/guard/roles.decorator';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';

@Controller('logs')
@UseGuards(SupabaseAuthGuard, RolesGuard) // Protegemos todas las rutas de este controlador
export class LogController {
  constructor(private readonly getLogsUseCase: GetLogsUseCase) {}

  @Get()
  @Roles(RolUsuario.admin) // Criterio: Solo rol admin
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tipo') tipo?: any,
    @Query('accion') accion?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    // Transformamos los strings de la URL a los tipos correctos
    const filters: LogFilters = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      tipo,
      accion,
      usuarioId,
      fechaDesde: desde,
      fechaHasta: hasta,
    };

    return this.getLogsUseCase.execute(filters);
  }

  @Get(':id')
  @Roles(RolUsuario.admin) // Criterio: Solo rol admin
  async getLogById(@Param('id') id: string) {
    return this.getLogsUseCase.getById(id);
  }
}