import { useEffect, useState } from "react";
import { getTraces } from "../services/traces.service";
import type { PaginatedTraces, GetTracesParams } from "../services/traces.service";

interface UseTracesState {
  data: PaginatedTraces | null;
  loading: boolean;
  error: string | null;
}

/**
 * Specie de `useLogs`, con la misma forma de estado para que las dos vistas de
 * observabilidad se lean igual. Los filtros se comparan uno a uno en el
 * `useEffect` en lugar de en el array de dependencias porque `params` es un
 * objeto nuevo en cada render y eso recargaría la lista en cada pintada.
 */
export function useTraces(params?: GetTracesParams) {
  const [state, setState] = useState<UseTracesState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchTraces = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await getTraces(params);
        setState({
          data: response.data,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState({
          data: null,
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al cargar las trazas",
        });
      }
    };

    fetchTraces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params?.page,
    params?.limit,
    params?.servicio,
    params?.metodo,
    params?.ruta,
    params?.estado,
    params?.ambiente,
    params?.desde,
    params?.hasta,
  ]);

  return state;
}
