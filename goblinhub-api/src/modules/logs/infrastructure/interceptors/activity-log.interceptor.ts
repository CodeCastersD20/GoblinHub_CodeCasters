import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../connect/prisma.service';
import type { TipoLog } from '../../domain/entities/log.entity';
import { TipoLog as TipoLogEnum } from '../../domain/entities/log.entity';

type RequestWithUser = Request & {
  user?: {
    id?: string;
  };
};

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();

    const method = request.method.toUpperCase();
    const path = this.getPath(request);

    if (!this.shouldLog(method, path)) {
      return next.handle();
    }

    const action = `${method} ${path}`;
    const userId = request.user?.id;
    const ipAddress = this.getIp(request);
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap(() => {
        void this.writeLog({
          tipo: TipoLogEnum.SUCCESS,
          accion: action,
          mensaje: `Operacion completada: ${action}`,
          id_usuario: userId,
          ip_address: ipAddress,
          datos_extra: {
            statusCode: response.statusCode,
            userAgent,
          },
        });
      }),
      catchError((error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'Error no identificado';

        void this.writeLog({
          tipo: TipoLogEnum.ERROR,
          accion: action,
          mensaje: `Operacion fallida: ${action} - ${errorMessage}`,
          id_usuario: userId,
          ip_address: ipAddress,
          datos_extra: {
            statusCode: this.getStatusCode(error),
            userAgent,
          },
        });

        return throwError(() => error);
      }),
    );
  }

  private shouldLog(method: string, path: string): boolean {
    const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
    if (!mutatingMethods.has(method)) {
      return false;
    }

    // Evita recursividad y ruido sobre el endpoint de lectura de logs
    if (path.startsWith('/logs')) {
      return false;
    }

    return true;
  }

  private getPath(request: Request): string {
    const rawPath = request.originalUrl || request.url || '/';
    return rawPath.split('?')[0] || '/';
  }

  private getIp(request: Request): string | null {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }

    return request.ip ?? null;
  }

  private getStatusCode(error: unknown): number {
    if (error instanceof HttpException) {
      return error.getStatus();
    }

    return 500;
  }

  private async writeLog(log: {
    tipo: TipoLog;
    accion: string;
    mensaje: string;
    id_usuario?: string;
    ip_address?: string | null;
    datos_extra?: Prisma.InputJsonValue;
  }): Promise<void> {
    try {
      await this.prisma.logs_Actividad.create({
        data: {
          tipo: log.tipo,
          accion: log.accion,
          mensaje: log.mensaje,
          id_usuario: log.id_usuario,
          ip_address: log.ip_address,
          datos_extra: log.datos_extra,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`No se pudo guardar log de actividad: ${message}`);
    }
  }
}
