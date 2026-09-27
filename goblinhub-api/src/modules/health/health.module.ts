import { Module } from '@nestjs/common';
import { HealthController } from './interfaces/health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '../../connect/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
