import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { GetLogsUseCase } from '../../application/use-case/get-logs.use-case';
import { GetDashboardMetricsUseCase } from '../../application/use-case/get-dashboard-metrics.use-case';
import { LogFilters } from '../../domain/repositories/log.repository';

import { SupabaseAuthGuard } from '../../../supabase/guard/supabse-auth.guard';
import { RolesGuard } from '../../../supabase/guard/roles.guard';
import { Roles } from '../../../supabase/guard/roles.decorator';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';

@Controller('logs')
@UseGuards(SupabaseAuthGuard, RolesGuard) // Protegemos todas las rutas de este controlador
export class LogController {
  constructor(
    private readonly getLogsUseCase: GetLogsUseCase,
    private readonly getDashboardMetricsUseCase: GetDashboardMetricsUseCase,
  ) {}

  @Get('dashboard/metrics')
  @Roles(RolUsuario.admin)
  async getDashboardMetrics(@Query('months') months?: string) {
    const parsedMonths = Number(months);
    const safeMonths = Number.isFinite(parsedMonths) ? parsedMonths : 6;
    return this.getDashboardMetricsUseCase.execute(safeMonths);
  }

  @Get('recent')
  @Roles(RolUsuario.admin)
  async getRecentLogs(
    @Query('limit') limit?: string,
    @Query('tipo') tipo?: string,
    @Query('accion') accion?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('includeTotal') includeTotal?: string,
  ) {
    const parsedLimit = Number(limit);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 200)
      : 50;

    const filters: LogFilters = {
      page: 1,
      limit: safeLimit,
      tipo: tipo as LogFilters['tipo'],
      accion,
      usuarioId,
      fechaDesde: desde,
      fechaHasta: hasta,
      includeTotal: includeTotal !== 'false',
    };

    const result = await this.getLogsUseCase.execute(filters);

    return {
      success: true,
      count: result.data.length,
      total: result.total,
      page: result.page,
      limit: result.limit,
      logs: result.data,
    };
  }

  @Get()
  @Roles(RolUsuario.admin) // Criterio: Solo rol admin
  async getLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tipo') tipo?: string,
    @Query('accion') accion?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('includeTotal') includeTotal?: string,
  ) {
    // Transformamos los strings de la URL a los tipos correctos
    const filters: LogFilters = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      tipo: tipo as LogFilters['tipo'],
      accion,
      usuarioId,
      fechaDesde: desde,
      fechaHasta: hasta,
      includeTotal: includeTotal !== 'false',
    };

    return this.getLogsUseCase.execute(filters);
  }

  @Get(':id')
  @Roles(RolUsuario.admin) // Criterio: Solo rol admin
  async getLogById(@Param('id') id: string) {
    return this.getLogsUseCase.getById(id);
  }
}
