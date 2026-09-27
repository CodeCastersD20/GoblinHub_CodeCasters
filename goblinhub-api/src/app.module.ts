import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
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
import { ReportsModule } from './modules/reports/reports.module';
import { PrismaModule } from './connect/prisma.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ActivityLogInterceptor } from './modules/logs/infrastructure/interceptors/activity-log.interceptor';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { MetricsInterceptor } from './modules/metrics/infrastructure/interceptors/metrics.interceptor';
import { CorrelationIdMiddleware } from './modules/tracing/infrastructure/middleware/correlation-id.middleware';
import { TracingModule } from './modules/tracing/tracing.module';
import { TracingInterceptor } from './modules/tracing/infrastructure/interceptors/tracing.interceptor';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? 60000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 10),
      },
    ]), // Limita a 10 solicitudes por minuto/IP por defecto; configurable por env
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
    ReportsModule,
    PrismaModule,
    HealthModule,
    MetricsModule,
    TracingModule,
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
    {
      // Se registra después de ActivityLogInterceptor para que la métrica de
      // latencia cubra también el trabajo de la auditoría (spec 005, T012).
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      // El más interno de los tres: la escritura de la traza es lo último que
      // ocurre dentro de la petición, y para que la latencia que publica
      // `MetricsInterceptor` la incluya tiene que medirla por fuera. Por eso va
      // el último (spec 006, T026).
      provide: APP_INTERCEPTOR,
      useExisting: TracingInterceptor,
    },
  ], // Aplica el guard de throttling globalmente
})
export class AppModule implements NestModule {
  /**
   * El middleware va con `'*'` y no con una lista de rutas porque debe excluir
   * el identificador también de las peticiones que no llegan a ningún
   * controlador, y porque así el orden respecto a los interceptores es siempre el
   * mismo: el middleware corre antes que el guard y que el interceptor.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
