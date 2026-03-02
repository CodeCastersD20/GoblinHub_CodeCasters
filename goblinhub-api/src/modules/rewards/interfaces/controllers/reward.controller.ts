import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';

// --- Use Cases ---
import { CreateRewardUseCase } from '../../aplication/use-case/create-reward.use-case';
import { UpdateRewardUseCase } from '../../aplication/use-case/update-reward.use-case';
import { SoftDeleteRewardUseCase } from '../../aplication/use-case/sd-reward.use-case';
import { GetRewardUseCase } from '../../aplication/use-case/get-reward.use-case';

// --- DTOs y Entidad ---
import { Recompensa } from '../../domain/entities/reward.entity';
import { CreateRecompensaDto } from '../../aplication/dtos/create-reward.dto';
import { UpdateRecompensaDto } from '../../aplication/dtos/update-reward.dto';

// --- Auth ---
import { SupabaseAuthGuard } from '../../../supabase/guard/supabse-auth.guard';
import type { AuthenticatedRequest } from '../../../supabase/interfaces/types/authenticated-request.interface';

@Controller('rewards')
export class RewardController {
  constructor(
    private readonly getUseCase: GetRewardUseCase,
    private readonly createUseCase: CreateRewardUseCase,
    private readonly updateUseCase: UpdateRewardUseCase,
    private readonly deleteUseCase: SoftDeleteRewardUseCase,
  ) {}

  @Get()
  async getAll(@Query('name') name?: string): Promise<Recompensa | Recompensa[]> {
    if (name) {
      return await this.getUseCase.getByNameReward(name);
    }
    return await this.getUseCase.getAllRewards();
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number): Promise<Recompensa> {
    return await this.getUseCase.getByIdReward(id);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async createReward(
    @Body() createRewardDto: CreateRecompensaDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Recompensa> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    
    return await this.createUseCase.execute(createRewardDto, req.user.id);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard)
  async updateReward(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRewardDto: UpdateRecompensaDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<Recompensa> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    
    return await this.updateUseCase.updateReward(id, updateRewardDto);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  async deleteReward(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    
    await this.deleteUseCase.softDeleteReward(id);
  }
}