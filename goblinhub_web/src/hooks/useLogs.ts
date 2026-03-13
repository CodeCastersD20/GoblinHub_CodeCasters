import { useEffect, useState } from "react";
import { getLogs } from "../services/logs.service";
import type {
  PaginatedLogs,
  GetLogsParams,
  TipoLog,
} from "../services/logs.service";

interface UseLogsState {
  data: PaginatedLogs | null;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook para manejar la fetcha de logs con manejo de estados
 */
export function useLogs(params?: GetLogsParams) {
  const [state, setState] = useState<UseLogsState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await getLogs(params);
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
            err instanceof Error ? err.message : "Error al cargar los logs",
        });
      }
    };

    fetchLogs();
  }, [
    params?.page,
    params?.limit,
    params?.tipo,
    params?.accion,
    params?.usuarioId,
    params?.desde,
    params?.hasta,
  ]);

  return state;
}
