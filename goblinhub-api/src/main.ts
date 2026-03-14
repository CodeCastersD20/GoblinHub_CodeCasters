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

  // --- CONFIGURACIÓN DE SEGURIDAD (HELMET) ---
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: [
            "'self'",
            'https:',
            'http://localhost:3000',
            'ws://localhost:3000',
          ],
          // Hemos expandido imgSrc para que no te bloquee las fotos de productos (Supabase, etc.)
          imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:3000', '*'],
          scriptSrc: isProduction
            ? ["'self'"]
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: isProduction
            ? ["'self'"]
            : ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          frameAncestors: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      strictTransportSecurity: {
        maxAge: 31536000,
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

  // --- MIDDLEWARE DE REDIRECCIÓN Y LOGS DE RUTA ---
  server.use((req: Request, res: Response, next: NextFunction) => {
    const path = req.path;

    // Log para saber qué está llegando al servidor
    if (path.includes('/productos')) {
      logger.log(
        `📥 API HIT: ${req.method} ${path} - Origin: ${req.headers.origin}`,
      );
    }

    // 1. Permitir Swagger y rutas raíz
    if (path.startsWith('/api/docs') || path === '/') {
      return next();
    }

    // 2. EXCEPCIÓN DE API: Dejar pasar estas rutas siempre al router de Nest
    const apiPaths = [
      '/productos',
      '/auth',
      '/events',
      '/rewards',
      '/logs',
      '/backup',
      '/upload',
    ];
    if (apiPaths.some((apiPath) => path.startsWith(apiPath))) {
      return next();
    }

    // 3. Filtro de seguridad para redirección al Frontend
    const hasOrigin = !!req.headers['origin'];
    const hasAuth = !!req.headers['authorization'];
    const isAjax = req.headers['x-requested-with'] === 'XMLHttpRequest';
    const acceptsJson = req.headers['accept']?.includes('application/json');

    if (hasOrigin || hasAuth || isAjax || acceptsJson) {
      return next();
    }

    // 4. Si es una carga directa de página en el navegador que no conocemos, al front
    return res.redirect(frontendUrl);
  });

  server.get('/', (_req: Request, res: Response) => {
    res.redirect(frontendUrl);
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 API corriendo en: http://localhost:3000`);
}
void bootstrap();
