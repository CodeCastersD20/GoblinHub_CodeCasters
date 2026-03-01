import { Module } from '@nestjs/common';
import { EventModule } from './modules/events/event.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseAuthModule } from './modules/supabase/supabase-auth.module';
import { BackupModule } from './modules/backup/backup.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    EventModule,
    SupabaseAuthModule,
    BackupModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
