import { Module } from '@nestjs/common';
import { EventModule } from './modules/events/event.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseAuthModule } from './modules/supabase/supabase-auth.module';
import { BackupModule } from './modules/backup/backup.module';
import { RewardModule } from './modules/rewards/reward.module';
import { ProductoModule } from './modules/products/product.module';
import { UploadModule } from './modules/upload/upload.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LogsModule } from './modules/logs/logs.module';
import { PrismaModule } from './connect/prisma.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ActivityLogInterceptor } from './modules/logs/infrastructure/interceptors/activity-log.interceptor';

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
    LogsModule,
    SupabaseAuthModule,
    BackupModule,
    RewardModule,
    ProductoModule,
    UploadModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLogInterceptor,
    },
  ], // Aplica el guard de throttling globalmente
})
export class AppModule {}
