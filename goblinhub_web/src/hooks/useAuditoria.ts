import { useEffect, useState } from "react";
import { getAuditLogs } from "../services/auditoria.service";
import type {
  GetAuditLogsParams,
  PaginatedAuditLogs,
} from "../services/auditoria.service";

interface UseAuditoriaState {
  data: PaginatedAuditLogs | null;
  loading: boolean;
  error: string | null;
}

/**
 * Misma forma de estado que `useTraces` y `useLogs` para que las tres vistas de
 * observabilidad se lean igual. Los filtros se comparan uno a uno en el
 * `useEffect` en lugar de en el array de dependencias porque `params` es un
 * objeto nuevo en cada render y eso recargaría la lista en cada pintada.
 */
export function useAuditoria(params?: GetAuditLogsParams) {
  const [state, setState] = useState<UseAuditoriaState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchAuditoria = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await getAuditLogs(params);
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
              : "Error al cargar los registros",
        });
      }
    };

    fetchAuditoria();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params?.page,
    params?.limit,
    params?.actor,
    params?.accion,
    params?.recurso,
    params?.resultado,
    params?.desde,
    params?.hasta,
  ]);

  return state;
}
