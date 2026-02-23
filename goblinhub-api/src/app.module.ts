import { Module } from '@nestjs/common';
import { EventModule } from './modules/events/event.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // ← importante, lo hace disponible en toda la app
    }),
    EventModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
