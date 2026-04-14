import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Express, Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

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

  // --- CONFIGURACIÓN DE CORS ---
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // --- SWAGGER ---
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('GoblinHub API')
      .setDescription(
        'Documentación de la API para gestión de Eventos, Productos y Recompensas',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Introduce tu token JWT de Supabase',
          in: 'header',
        },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const server = app.getHttpAdapter().getInstance() as Express;

  // Redirige al frontend si alguien accede directo desde el navegador
  // Las peticiones AJAX/fetch del frontend traen headers como Origin, X-Requested-With o Authorization
  server.use((req: Request, res: Response, next: NextFunction) => {
    // Permitir Swagger en desarrollo
    if (!isProduction && req.path.startsWith('/api/docs')) {
      return next();
    }

    // Permitir la ruta raíz (ya tiene su propio redirect)
    if (req.path === '/') {
      return next();
    }

    // Si la petición trae Origin, Authorization o X-Requested-With, es del frontend/API client
    const hasOrigin = !!req.headers['origin'];
    const hasAuth = !!req.headers['authorization'];
    const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest';
    const acceptsJson =
      req.headers['accept']?.includes('application/json') ?? false;

    if (hasOrigin || hasAuth || isAjax || acceptsJson) {
      return next();
    }

    // Si es una petición directa del navegador (sin los headers anteriores), redirige al frontend
    return res.redirect(frontendUrl);
  });

  server.get('/', (_req: Request, res: Response) => {
    res.redirect(frontendUrl);
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 API corriendo en: http://localhost:3000`);
}
void bootstrap();
