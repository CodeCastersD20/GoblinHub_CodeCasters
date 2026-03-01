import { Module } from '@nestjs/common';
import { EventModule } from './modules/events/event.module';
import { ConfigModule } from '@nestjs/config';
import { SupabaseAuthModule } from './modules/supabase/supabase-auth.module';
import { BackupModule } from './modules/backup/backup.module';
import { RewardModule } from './modules/rewards/event.module';
import { ProductoModule } from './modules/products/product.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // ← importante, lo hace disponible en toda la app
    }),
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
