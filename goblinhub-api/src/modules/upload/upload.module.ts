import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { SupabaseAuthModule } from '../supabase/supabase-auth.module';

@Module({
  imports: [SupabaseModule, SupabaseAuthModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
