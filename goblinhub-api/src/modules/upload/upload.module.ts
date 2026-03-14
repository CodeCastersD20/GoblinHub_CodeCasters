import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { SupabaseAuthModule } from '../supabase/supabase-auth.module';
import { PrismaModule } from '../../connect/prisma.module';

@Module({
  imports: [SupabaseModule, SupabaseAuthModule, PrismaModule],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
