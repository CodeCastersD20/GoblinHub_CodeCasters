import { Module } from '@nestjs/common';
import { PrismaModule } from '../../connect/prisma.module';
import { RedactionService } from './domain/services/redaction.service';
import { TracingContextService } from './domain/services/tracing-context.service';
import { PathNormalizerService } from './domain/services/path-normalizer.service';
import { RelojSistema } from './domain/services/reloj';
import { TRAZA_REPOSITORY } from './domain/repositories/traza.repository';
import { TrazaRepositoryPrisma } from './infrastructure/prisma/prisma-traza.repository';
import { TracingInterceptor } from './infrastructure/interceptors/tracing.interceptor';

@Module({
  imports: [PrismaModule],
  providers: [
    TracingContextService,
    RedactionService,
    PathNormalizerService,
    { provide: TRAZA_REPOSITORY, useClass: TrazaRepositoryPrisma },
    { provide: RelojSistema, useFactory: () => new RelojSistema() },
    TracingInterceptor,
  ],
  exports: [
    TracingContextService,
    RedactionService,
    PathNormalizerService,
    TRAZA_REPOSITORY,
    TracingInterceptor,
  ],
})
export class TracingModule {}
