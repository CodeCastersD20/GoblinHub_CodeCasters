import { Module } from '@nestjs/common';
import { EventModule } from './modules/events/event.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseAuthModule } from './modules/supabase/supabase-auth.module';
import { BackupModule } from './modules/backup/backup.module';
import { RewardModule } from './modules/rewards/event.module';
import { ProductoModule } from './modules/products/product.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    EventModule,
    SupabaseAuthModule,
    BackupModule,
    RewardModule,
    ProductoModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
