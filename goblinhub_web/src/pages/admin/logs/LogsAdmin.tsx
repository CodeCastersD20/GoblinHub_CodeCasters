import { useMemo, useState } from "react";
import { useLogs } from "../../../hooks/useLogs";
import type { TipoLog } from "../../../services/logs.service";

function LogsAdmin() {
  const [tipo, setTipo] = useState<TipoLog | "">("");

  const params = useMemo(() => {
    if (!tipo) return undefined;
    return { tipo };
  }, [tipo]);

  const { data, loading, error } = useLogs(params);

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Registros de Actividad</h1>
      <p>Monitorea acciones recientes del sistema.</p>

      <div style={{ margin: "1rem 0" }}>
        <label htmlFor="log-tipo">Filtrar por tipo: </label>
        <select
          id="log-tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoLog | "")}
        >
          <option value="">Todos</option>
          <option value="success">success</option>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="error">error</option>
        </select>
      </div>

      {loading && <p>Cargando logs...</p>}
      {error && <p>{error}</p>}

      {!loading && !error && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Tipo</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Accion</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Mensaje</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {data?.data?.map((log) => (
              <tr key={log.id_log}>
                <td style={{ padding: "0.5rem" }}>{log.tipo}</td>
                <td style={{ padding: "0.5rem" }}>{log.accion}</td>
                <td style={{ padding: "0.5rem" }}>{log.mensaje}</td>
                <td style={{ padding: "0.5rem" }}>
                  {new Date(log.fecha_hora).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default LogsAdmin;