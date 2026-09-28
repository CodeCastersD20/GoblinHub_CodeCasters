import { Module } from '@nestjs/common';
import { PrismaModule } from '../../connect/prisma.module';
import { RedactionService } from './domain/services/redaction.service';
import { TracingContextService } from './domain/services/tracing-context.service';
import { PathNormalizerService } from './domain/services/path-normalizer.service';
import { RelojSistema } from './domain/services/reloj';
import { TracingConfigService } from './domain/services/tracing-config.service';
import { PurgeTracesUseCase } from './application/use-case/purge-traces.use-case';
import { TRAZA_REPOSITORY } from './domain/repositories/traza.repository';
import { TrazaRepositoryPrisma } from './infrastructure/prisma/prisma-traza.repository';
import { TracingInterceptor } from './infrastructure/interceptors/tracing.interceptor';
import { TracesRetentionScheduler } from './infrastructure/scheduler/traces-retention.scheduler';

/**
 * Infraestructura de la instrumentación: escribe las trazas y publica el
 * contexto de correlación. No declara ningún controlador, y esa es la razón de
 * que exista un módulo aparte para la consulta.
 *
 * `SupabaseAuthGuard` necesita `TracingContextService`, así que este módulo ya no
 * puede importar `SupabaseAuthModule` sin cerrar un ciclo. Declarar aquí el
 * controlador obligaría a hacerlo, porque Nest construye los guards de
 * `@UseGuards` en el módulo donde vive el controlador y no los encuentra sin
 * importarlos.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    TracingContextService,
    RedactionService,
    PathNormalizerService,
    TracingConfigService,
    { provide: TRAZA_REPOSITORY, useClass: TrazaRepositoryPrisma },
    { provide: RelojSistema, useFactory: () => new RelojSistema() },
    PurgeTracesUseCase,
    TracesRetentionScheduler,
    TracingInterceptor,
  ],
  exports: [
    TracingContextService,
    RedactionService,
    PathNormalizerService,
    TracingConfigService,
    TRAZA_REPOSITORY,
    TracingInterceptor,
  ],
})
export class TracingModule {}
