import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },

      // CSP básica para APIs
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", 'https:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },

      // Referrer policy (Observatory lo pide)
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

      // HSTS (solo en producción)
      strictTransportSecurity: {
        maxAge: 15552000,
        includeSubDomains: true,
        preload: false,
      },

      // Frame protection
      frameguard: { action: 'deny' },

      // MIME sniff protection
      noSniff: true,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? [],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina campos que no están en el DTO
      forbidNonWhitelisted: true, // lanza error si llegan campos extra
      transform: true, // convierte los tipos automáticamente
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
