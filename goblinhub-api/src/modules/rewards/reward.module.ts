import { Module } from '@nestjs/common';
import { RewardController } from './interfaces/controllers/reward.controller';
import { CreateRewardUseCase } from './aplication/use-case/create-reward.use-case';
import { UpdateRewardUseCase } from './aplication/use-case/update-reward.use-case';
import { SoftDeleteRewardUseCase } from './aplication/use-case/sd-reward.use-case';
import { GetRewardUseCase } from './aplication/use-case/get-reward.use-case';
import { RewardRepository } from './domain/repositories/reward.repository';
import { RewardPrismaRepository } from './infrastructure/prisma/Reward.repository';
import { PrismaModule } from '../../connect/prisma.module';
import { SupabaseAuthModule } from '../supabase/supabase-auth.module';

@Module({
  controllers: [RewardController],
  providers: [
    CreateRewardUseCase,
    UpdateRewardUseCase,
    SoftDeleteRewardUseCase,
    GetRewardUseCase,
    {
      provide: RewardRepository,
      useClass: RewardPrismaRepository,
    },
  ],
  imports: [PrismaModule, SupabaseAuthModule],
})
export class RewardModule {}
