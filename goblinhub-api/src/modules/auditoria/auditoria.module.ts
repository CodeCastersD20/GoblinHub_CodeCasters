import { Module } from '@nestjs/common';
import { PrismaModule } from '../../connect/prisma.module';
import { AuditoriaService } from './domain/services/auditoria.service';
import { AUDITORIA_REPOSITORY } from './domain/repositories/log-auditoria.repository';
import { PrismaLogAuditoriaRepository } from './infrastructure/prisma/prisma-log-auditoria.repository';

/**
 * Escritura de la auditoría (#212).
 *
 * No declara ningún controlador: aquí solo se registra quién hizo qué. La
 * consulta vive en `AuditoriaConsultaModule` por la misma razón que la de
 * trazas vive en su propio módulo —la lectura necesita los guards de
 * autenticación y esta no—, y porque separarlas deja esta parte importable
 * desde `EventModule` y `BackupModule`, que son los que registran sus
 * procesos automáticos, sin arrastrar la autenticación con ellas.
 *
 * El middleware de peticiones se aplica desde `AppModule`, que es quien
 * importa este módulo y quien lo puede declarar sobre `'*'`.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    AuditoriaService,
    {
      provide: AUDITORIA_REPOSITORY,
      useClass: PrismaLogAuditoriaRepository,
    },
  ],
  exports: [AuditoriaService, AUDITORIA_REPOSITORY],
})
export class AuditoriaModule {}
