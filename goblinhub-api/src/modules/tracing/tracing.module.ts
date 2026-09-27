import { Module } from '@nestjs/common';
import { RedactionService } from './domain/services/redaction.service';
import { TracingContextService } from './domain/services/tracing-context.service';

@Module({
  providers: [TracingContextService, RedactionService],
  exports: [TracingContextService, RedactionService],
})
export class TracingModule {}
