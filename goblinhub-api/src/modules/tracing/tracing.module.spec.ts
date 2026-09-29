import { Test, type TestingModule } from '@nestjs/testing';
import { TracingModule } from './tracing.module';
import { RedactionService } from './domain/services/redaction.service';
import { TracingContextService } from './domain/services/tracing-context.service';

describe('TracingModule', () => {
  let modulo: TestingModule;

  beforeEach(async () => {
    modulo = await Test.createTestingModule({
      imports: [TracingModule],
    }).compile();
  });

  it('resuelve el servicio de contexto', () => {
    expect(modulo.get(TracingContextService)).toBeInstanceOf(
      TracingContextService,
    );
  });

  it('resuelve el servicio de redacción', () => {
    expect(modulo.get(RedactionService)).toBeInstanceOf(RedactionService);
  });

  it('entrega la misma instancia del contexto a quien la pide', () => {
    // Si no fuera singleton, la petición publicaría el identificador en un
    // almacén y el interceptor lo leería de otro.
    expect(modulo.get(TracingContextService)).toBe(
      modulo.get(TracingContextService),
    );
  });
});
