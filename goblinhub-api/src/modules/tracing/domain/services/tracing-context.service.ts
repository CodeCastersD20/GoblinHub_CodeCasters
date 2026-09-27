import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { SpanCollector } from './span-collector';
import { EstadoSpan, TipoSpan } from '../enums/tipo-span.enum';
import { RelojSistema, type Reloj } from './reloj';
import type { Json } from './redaction.service';

/** Lo que hay vivo mientras se atiende una petición. */
type PeticionActiva = {
  correlationId: string;
  colector: SpanCollector;
};

/**
 * Publica el identificador de correlación de la petición en curso y el colector
 * de sus pasos internos, para que cualquier módulo los lea sin que se los pasen
 * por parámetro (FR-004).
 *
 * Se apoya en `AsyncLocalStorage` porque el contexto tiene que sobrevivir a los
 * saltos de asincronía (promesas, `setTimeout`) y quedar al mismo tiempo aislado
 * entre dos peticiones simultáneas: una variable de módulo no cumpliría ninguna
 * de las dos cosas.
 *
 * El colector se crea dentro de `run` y no antes a propósito: si se compartiera
 * una instancia, los spans de dos peticiones simultáneas se mezclarían en el
 * mismo árbol.
 */
@Injectable()
export class TracingContextService {
  private readonly almacenamiento = new AsyncLocalStorage<PeticionActiva>();

  /**
   * Ejecuta `callback` con el contexto publicado y devuelve su resultado.
   *
   * El `idTraza` se genera aquí y no en el interceptor porque los spans lo
   * necesitan desde que se abren: el identificador de la traza tiene que existir
   * antes de saber si la petición terminó bien o mal.
   */
  run<T>(
    correlationId: string,
    callback: () => T,
    reloj: Reloj = new RelojSistema(),
  ): T {
    return this.almacenamiento.run(
      { correlationId, colector: new SpanCollector(randomUUID(), reloj) },
      callback,
    );
  }

  /** Identificador de la petición en curso, o `undefined` si no hay ninguna. */
  get(): string | undefined {
    return this.almacenamiento.getStore()?.correlationId;
  }

  /**
   * Identificador de la petición en curso; si no hay ninguna, genera uno. Lo
   * usan las tareas programadas, que se ejecutan sin petición entrante pero
   * también deben ser rastreables.
   */
  getOrCreate(): string {
    return this.almacenamiento.getStore()?.correlationId ?? randomUUID();
  }

  /** Identificador de traza de la petición en curso, para colgarle spans. */
  getIdTraza(): string | undefined {
    return this.almacenamiento.getStore()?.colector.idTraza();
  }

  /**
   * Colector de la petición en curso. Devuelve uno vacío fuera de una petición,
   * para que un paso registrado por una tarea programada se descarte en lugar de
   * lanzar.
   */
  getColector(): SpanCollector {
    return (
      this.almacenamiento.getStore()?.colector ??
      new SpanCollector(randomUUID(), new RelojSistema())
    );
  }

  /**
   * Mide una operación y la registra como span. Es la forma que quiere usar el
   * código de negocio, porque no obliga a acordarse de cerrar el span.
   *
   * `operacion` recibe el identificador del span para que un padre pueda colgar
   * de él los hijos, que es como se construye el árbol de pasos internos.
   */
  async registrarSpan<T>(
    nombre: string,
    tipo: TipoSpan,
    operacion: (idSpan: string) => Promise<T>,
    opciones: { padre?: string | null; atributos?: Record<string, Json> } = {},
  ): Promise<T> {
    const colector = this.getColector();
    const id = colector.iniciar(nombre, tipo, opciones.padre);

    try {
      const resultado = await operacion(id);
      colector.cerrar(id, EstadoSpan.ok, opciones.atributos);
      return resultado;
    } catch (error) {
      colector.cerrar(id, EstadoSpan.error, {
        ...opciones.atributos,
        error: error instanceof Error ? error.message : 'Error no identificado',
      });
      throw error;
    }
  }
}
