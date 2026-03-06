import { Module } from '@nestjs/common';
import { EventModule } from './modules/events/event.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseAuthModule } from './modules/supabase/supabase-auth.module';
import { BackupModule } from './modules/backup/backup.module';
import { RewardModule } from './modules/rewards/reward.module';
import { ProductoModule } from './modules/products/product.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]), // Limita a 10 solicitudes por minuto
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    EventModule,
    SupabaseAuthModule,
    BackupModule,
    RewardModule,
    ProductoModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ], // Aplica el guard de throttling globalmente
})
export class AppModule {}
