import { Module } from '@nestjs/common';
import { SupabaseAuthModule } from '../supabase/supabase-auth.module';
import { TracingModule } from './tracing.module';
import { TrazaController } from './interfaces/controllers/trace.controller';
import { GetTracesUseCase } from './application/use-case/get-traces.use-case';
import { GetTraceUseCase } from './application/use-case/get-trace.use-case';

/**
 * Superficie HTTP de consulta para el visor de administración.
 *
 * Vive en su propio módulo, y no dentro de `TracingModule`, por una razón que no
 * es de orden: `SupabaseAuthGuard` depende de `TracingContextService`, que exporta
 * `TracingModule`, así que declarar el controlador allí obligaría a que
 * `TracingModule` importara a su vez `SupabaseAuthModule` para obtener los guards
 * —un ciclo que Nest no resuelve sin `forwardRef`. Separar la lectura de la
 * escritura mantiene `TracingModule` importable desde cualquier módulo, que es lo
 * que necesita `EventModule`, sin arrastrar a la autenticación.
 *
 * Los casos de uso se proveen aquí y no en `TracingModule` porque hablar con la
 * base de datos para responder a un administrador es responsabilidad de esta capa,
 * no de la que se encarga de instrumentar las peticiones.
 */
@Module({
  imports: [TracingModule, SupabaseAuthModule],
  controllers: [TrazaController],
  providers: [GetTracesUseCase, GetTraceUseCase],
})
export class TrazasModule {}
