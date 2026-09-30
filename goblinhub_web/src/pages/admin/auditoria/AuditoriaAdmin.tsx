import { useCallback, useMemo, useState } from "react";
import { useAuditoria } from "../../../hooks/useAuditoria";
import { RESULTADOS_AUDITORIA } from "../../../services/auditoria.service";
import type {
  GetAuditLogsParams,
  LogAuditoria,
} from "../../../services/auditoria.service";
import "./AuditoriaAdmin.css";

/** `datetime-local` no lleva zona: se convierte a ISO para que la API lo acepte. */
const aIso = (valor: string): string | undefined =>
  valor === "" ? undefined : new Date(valor).toISOString();

const claseResultado = (resultado: string): string =>
  `auditoria-resultado auditoria-resultado--${resultado}`;

const nombreResultado: Record<string, string> = {
  exitoso: "Exitoso",
  rechazado: "Rechazado",
  fallido: "Fallido",
};

/**
 * Quién hizo la operación. Con sesión se muestra el nombre resuelto por
 * lectura; sin ella, el tipo de actor, porque ahí no hay nombre que mostrar y
 * el UUID no diría nada a quien lee la tabla.
 */
function CeldaActor({ log }: { log: LogAuditoria }) {
  if (log.actor) {
    return (
      <>
        {log.actor.nombre} {log.actor.apellidos}{" "}
        <span className="badge">{log.actor.rol}</span>
      </>
    );
  }

  if (log.actor_tipo === "anonimo") {
    return <span className="auditoria-anonimo">Sin sesión</span>;
  }

  if (log.actor_tipo === "sistema") {
    return <span className="auditoria-sistema">Proceso automático</span>;
  }

  return <span className="font-mono">{log.actor_id}</span>;
}

function AuditoriaAdmin() {
  const [actor, setActor] = useState("");
  const [accion, setAccion] = useState("");
  const [recurso, setRecurso] = useState("");
  const [resultado, setResultado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);

  const params = useMemo<GetAuditLogsParams>(
    () => ({
      page,
      limit: 50,
      includeTotal: true,
      actor: actor || undefined,
      accion: accion || undefined,
      recurso: recurso || undefined,
      resultado: (resultado || undefined) as GetAuditLogsParams["resultado"],
      desde: aIso(desde),
      hasta: aIso(hasta),
    }),
    [page, actor, accion, recurso, resultado, desde, hasta],
  );

  const { data, loading, error } = useAuditoria(params);

  /** Cambiar un filtro vuelve a la primera página: la 7 con un filtro nuevo no
   *  existe, y buscaría una página vacía sin avisar. */
  const cambiarFiltro = useCallback((cambiar: () => void) => {
    setPage(1);
    cambiar();
  }, []);

  const total = data?.total ?? 0;
  const ultimaPagina = Math.max(1, Math.ceil(total / (data?.limit ?? 50)));

  return (
    <div className="logs-admin-container">
      <div className="logs-admin-header">
        <h1 className="logs-admin-title">Visor de Auditoría</h1>
        <p className="logs-admin-subtitle">
          Quién hizo qué, sobre qué recurso, cuándo y con qué resultado. Los
          registros no se pueden editar ni borrar: son solo lectura.
        </p>
      </div>

      <div className="logs-admin-filters">
        <div className="filter-group">
          <label className="filter-label" htmlFor="auditoria-actor">
            Actor
          </label>
          <input
            id="auditoria-actor"
            className="filter-input"
            value={actor}
            placeholder="Ana o 3f8c1e2a..."
            onChange={(e) => cambiarFiltro(() => setActor(e.target.value))}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="auditoria-accion">
            Acción
          </label>
          <input
            id="auditoria-accion"
            className="filter-input"
            value={accion}
            placeholder="POST"
            onChange={(e) => cambiarFiltro(() => setAccion(e.target.value))}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="auditoria-recurso">
            Recurso
          </label>
          <input
            id="auditoria-recurso"
            className="filter-input"
            value={recurso}
            placeholder="/events"
            onChange={(e) => cambiarFiltro(() => setRecurso(e.target.value))}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="auditoria-resultado">
            Resultado
          </label>
          <select
            id="auditoria-resultado"
            className="filter-input"
            value={resultado}
            onChange={(e) => cambiarFiltro(() => setResultado(e.target.value))}
          >
            <option value="">Todas</option>
            {RESULTADOS_AUDITORIA.map((r) => (
              <option key={r} value={r}>
                {nombreResultado[r]}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="auditoria-desde">
            Desde
          </label>
          <input
            id="auditoria-desde"
            className="filter-input"
            type="datetime-local"
            value={desde}
            onChange={(e) => cambiarFiltro(() => setDesde(e.target.value))}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="auditoria-hasta">
            Hasta
          </label>
          <input
            id="auditoria-hasta"
            className="filter-input"
            type="datetime-local"
            value={hasta}
            onChange={(e) => cambiarFiltro(() => setHasta(e.target.value))}
          />
        </div>
      </div>

      {loading && <p className="logs-admin-state">Cargando registros...</p>}

      {error && (
        <div className="logs-admin-error">
          <span className="error-title">
            No se pudieron cargar los registros
          </span>
          <span className="error-message">{error}</span>
        </div>
      )}

      {!loading && !error && data?.data.length === 0 && (
        <p className="logs-admin-state">
          Ningún registro cumple los filtros indicados.
        </p>
      )}

      {!loading && !error && data && data.data.length > 0 && (
        <>
          <div className="logs-admin-table-wrapper">
            <table className="logs-admin-table">
              <thead>
                <tr className="table-header-row">
                  <th className="table-header-cell">Fecha y hora</th>
                  <th className="table-header-cell">Actor</th>
                  <th className="table-header-cell">Acción</th>
                  <th className="table-header-cell">Recurso</th>
                  <th className="table-header-cell">Resultado</th>
                  <th className="table-header-cell">Correlación</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((log) => (
                  <tr key={log.id_auditoria} className="table-body-row">
                    <td className="table-cell text-sm text-gray-700">
                      {new Date(log.fecha_hora).toLocaleString()}
                    </td>
                    <td className="table-cell text-sm">
                      <CeldaActor log={log} />
                    </td>
                    <td className="table-cell font-mono">{log.accion}</td>
                    <td className="table-cell font-mono">{log.recurso}</td>
                    <td className={claseResultado(log.resultado)}>
                      {nombreResultado[log.resultado] ?? log.resultado}
                    </td>
                    <td className="table-cell font-mono auditoria-correlacion">
                      {log.correlation_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="logs-admin-filters">
            <button
              type="button"
              className="filter-input"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <span className="filter-hint">
              Página {page} de {ultimaPagina} · {total}{" "}
              {total === 1 ? "registro" : "registros"}
            </span>
            <button
              type="button"
              className="filter-input"
              disabled={page >= ultimaPagina}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AuditoriaAdmin;
