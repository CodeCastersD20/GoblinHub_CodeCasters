import { Module } from '@nestjs/common';
import { SupabaseAuthModule } from '../supabase/supabase-auth.module';
import { PrismaModule } from '../../connect/prisma.module';
import { AuditoriaModule } from './auditoria.module';
import { AuditLogController } from './interfaces/controllers/audit-log.controller';
import { GetAuditLogsUseCase } from './application/use-case/get-audit-logs.use-case';

/**
 * Superficie HTTP de consulta del visor de auditoría (#212).
 *
 * Vive en su propio módulo, y no dentro de `AuditoriaModule`, por una razón
 * que no es de orden: los guards de `@UseGuards` se construyen en el módulo
 * donde está el controlador, y `SupabaseAuthGuard` recibe `PrismaService` por
 * inyección. Separar la lectura de la escritura mantiene `AuditoriaModule`
 * importable desde cualquier módulo sin arrastrar la autenticación.
 *
 * El caso de uso se provee aquí y no en el módulo de escritura porque hablar
 * con la base de datos para responder a un administrador es responsabilidad de
 * esta capa, no de la que se encarga de registrar las operaciones.
 */
@Module({
  imports: [AuditoriaModule, SupabaseAuthModule, PrismaModule],
  controllers: [AuditLogController],
  providers: [GetAuditLogsUseCase],
})
export class AuditoriaConsultaModule {}
