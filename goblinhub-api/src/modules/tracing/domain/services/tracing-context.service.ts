import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/**
 * Publica el identificador de correlación de la petición en curso para que
 * cualquier módulo pueda leerlo sin que se lo pasen por parámetro (FR-004).
 *
 * Se apoya en `AsyncLocalStorage` porque el identificador tiene que sobrevivir a
 * los saltos de asincronía (promesas, `setTimeout`) y, al mismo tiempo, quedar
 * aislado entre dos peticiones simultáneas: una variable de módulo no cumpliría
 * ninguna de las dos cosas.
 */
@Injectable()
export class TracingContextService {
  private readonly almacenamiento = new AsyncLocalStorage<string>();

  /** Ejecuta `callback` con el identificador publicado y devuelve su resultado. */
  run<T>(correlationId: string, callback: () => T): T {
    return this.almacenamiento.run(correlationId, callback);
  }

  /** Identificador de la petición en curso, o `undefined` si no hay ninguna. */
  get(): string | undefined {
    return this.almacenamiento.getStore();
  }

  /**
   * Identificador de la petición en curso; si no hay ninguna, genera uno. Lo
   * usan las tareas programadas, que se ejecutan sin petición entrante pero
   * también deben ser rastreables.
   */
  getOrCreate(): string {
    return this.almacenamiento.getStore() ?? randomUUID();
  }
}
