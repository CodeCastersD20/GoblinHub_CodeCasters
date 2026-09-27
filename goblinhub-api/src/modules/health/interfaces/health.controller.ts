import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService, ReporteReadiness } from '../health.service';

/**
 * Rutas de salud del servicio.
 *
 * Se liberan del throttling global (10 req/min por IP) porque las sondean
 * sondas externas y tableros de estado; un 429 aquí se confundiría con una
 * caída real.
 *
 * - `GET /healthz` (liveness): el proceso vive. Es la ruta que consulta Render
 *   (`health_check_path` en `infra/terraform/main.tf`).
 * - `GET /health` (readiness): el proceso además puede atender tráfico porque
 *   PostgreSQL y Redis responden. Responde 503 si alguna no responde.
 */
@Controller()
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('healthz')
  @HttpCode(HttpStatus.OK)
  liveness() {
    return this.healthService.liveness();
  }

  /**
   * `GET /health` y `GET /health/ready` son la misma comprobación con dos
   * nombres: `/health` es el que ya conocían el runbook de despliegue y
   * `scripts/deploy/healthcheck.sh`, y `/health/ready` es el nombre que fija la
   * spec 005 (FR-007). Se sirven ambos para no obligar a cambiar nada de lo
   * existente.
   */
  @Get(['health', 'health/ready'])
  @HttpCode(HttpStatus.OK)
  async readiness(): Promise<ReporteReadiness> {
    const reporte = await this.healthService.readiness();

    if (reporte.estado !== 'ok') {
      throw new ServiceUnavailableException(reporte);
    }

    return reporte;
  }
}
