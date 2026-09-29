import { Injectable } from '@nestjs/common';
import {
  fechaDeVencimiento,
  resolverConfiguracionTracing,
  superaElNivelMinimo,
  type ConfiguracionTracing,
} from '../constants/tracing-config';
import type { NivelTraza } from '../enums/nivel-traza.enum';

/**
 * Envoltura inyectable de la configuración de trazabilidad.
 *
 * Existe para que el interceptor no lea `process.env` en cada petición: la
 * resolución ocurre una vez, al construir el módulo. La función pura que hay
 * detrás es la que se prueba, de modo que el comportamiento tolerante ante
 * valores inválidos se verifica sin levantar Nest.
 */
@Injectable()
export class TracingConfigService {
  private readonly configuracion: ConfiguracionTracing;

  constructor() {
    this.configuracion = resolverConfiguracionTracing();
  }

  get servicio(): string {
    return this.configuracion.servicio;
  }

  get ambiente(): string {
    return this.configuracion.ambiente;
  }

  get retencionDias(): number {
    return this.configuracion.retencionDias;
  }

  /** `true` si una traza de este nivel merece la pena guardarse. */
  guarda(nivel: NivelTraza): boolean {
    return superaElNivelMinimo(nivel, this.configuracion.nivelMinimo);
  }

  /** Momento a partir del cual una traza está vencida y debe purgarse. */
  instanteDeVencimiento(ahora: Date): Date {
    return fechaDeVencimiento(this.configuracion.retencionDias, ahora);
  }
}
