import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'; // Importa Swagger
import helmet from 'helmet';
import type { Express } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProduction = process.env.NODE_ENV === 'production';

  const frontendUrl =
    process.env.CORS_ORIGIN?.split(',')[0] ?? 'http://localhost:5173';

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },

      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", 'https:'],
          imgSrc: isProduction
            ? ["'self'", 'data:']
            : ["'self'", 'data:', 'https:', 'https://validator.swagger.io'],
          scriptSrc: isProduction
            ? ["'self'"]
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe solo para Swagger en dev
          styleSrc: isProduction
            ? ["'self'"]
            : ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], // unsafe solo para Swagger en dev
          frameAncestors: ["'none'"], // Reemplaza X-Frame-Options
        },
      },

      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

      strictTransportSecurity: {
        maxAge: 31536000, // 1 año (requerido para HSTS preload)
        includeSubDomains: true,
        preload: true,
      },

      frameguard: { action: 'deny' },
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
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // --- CONFIGURACIÓN DE SWAGGER ---
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('GoblinHub API')
      .setDescription(
        'Documentación de la API para gestión de Eventos, Productos y Recompensas',
      )
      .setVersion('1.0')
      .addBearerAuth(
        // Habilita autenticación JWT en la UI
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Introduce tu token JWT de Supabase',
          in: 'header',
        },
        'access-token', // Nombre de referencia para los controladores
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    // URL: http://localhost:3000/api/docs
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true, // Mantiene el token aunque recargues la página
      },
    });
  }

  const server = app.getHttpAdapter().getInstance() as Express;
  server.get('/', (_req, res) => {
    res.redirect(frontendUrl);
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 API corriendo en: http://localhost:3000`);
  if (!isProduction) {
    console.log(`📑 Swagger disponible en: http://localhost:3000/api/docs`);
  }
}
void bootstrap();
