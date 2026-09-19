import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GetAnalyticsUseCase } from '../../application/use-case/get-analytics.use-case';
import { Analytics } from '../../domain/entities/analytics.entity';
import { SupabaseAuthGuard } from '../../../supabase/guard/supabse-auth.guard';
import { RolesGuard } from '../../../supabase/guard/roles.guard';
import { Roles } from '../../../supabase/guard/roles.decorator';
import { RolUsuario } from '../../../supabase/domain/enums/user.enum';

@Controller('reports')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly getAnalyticsUseCase: GetAnalyticsUseCase) {}

  @Get('analytics')
  @Roles(RolUsuario.admin)
  async getAnalytics(
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ): Promise<Analytics> {
    return this.getAnalyticsUseCase.execute(desde, hasta);
  }
}
