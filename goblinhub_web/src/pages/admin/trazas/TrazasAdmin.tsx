import { useCallback, useEffect, useMemo, useState } from "react";
import { useTraces } from "../../../hooks/useTraces";
import { getTraceByCorrelationId } from "../../../services/traces.service";
import type {
  GetTracesParams,
  Span,
  Traza,
} from "../../../services/traces.service";
import "./TrazasAdmin.css";

const METODOS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const AMBIENTES = ["development", "staging", "production"] as const;

/** `datetime-local` no lleva zona: se convierte a ISO para que la API lo acepte. */
const aIso = (valor: string): string | undefined =>
  valor === "" ? undefined : new Date(valor).toISOString();

const claseEstado = (estado: number): string =>
  estado >= 500
    ? "trazas-estado trazas-estado--error"
    : estado >= 400
      ? "trazas-estado trazas-estado--warn"
      : "trazas-estado trazas-estado--ok";

/**
 * Pasos recursivos.
 *
 * Se anida en una lista en lugar de en un diagrama: lo que el administrador
 * necesita de un paso es su nombre, cuánto tardó y si falló, y una tabla
 * anidada dice lo mismo sin calcular posiciones ni añadir una dependencia de
 * visualisation que el repositorio no tiene.
 */
function Pasos({ pasos }: { pasos: Span[] }) {
  if (pasos.length === 0) {
    return <p className="text-gray-400">Esta traza no tiene pasos desglosados.</p>;
  }

  return (
    <ul className="trazas-pasos">
      {pasos.map((paso) => (
        <li key={paso.id_span} className="trazas-paso">
          <div>
            <strong>{paso.nombre}</strong>{" "}
            <span className="badge">{paso.tipo}</span>{" "}
            <span>{paso.duracion_ms} ms</span>{" "}
            <span
              className={
                paso.estado === "error"
                  ? "trazas-estado trazas-estado--error"
                  : "trazas-estado trazas-estado--ok"
              }
            >
              {paso.estado}
            </span>
          </div>
          {/*
            Los atributos llegan ya redactados desde la API: la redacción ocurre
            antes de escribir, no al leer. Lo que se muestra aquí no puede
            contener un secreto, y el comentario está para que nadie asuma lo
            contrario y añada aquí un segundo enmascarado innecesario.
          */}
          {paso.atributos && (
            <pre className="trazos-atributos">
              {JSON.stringify(paso.atributos, null, 2)}
            </pre>
          )}
          {paso.hijos.length > 0 && <Pasos pasos={paso.hijos} />}
        </li>
      ))}
    </ul>
  );
}

function DetalleTraza({ correlationId }: { correlationId: string }) {
  const [traza, setTraza] = useState<Traza | null>(null);
  const [pasos, setPasos] = useState<Span[]>([]);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">(
    "cargando",
  );

  useEffect(() => {
    let vigente = true;

    getTraceByCorrelationId(correlationId)
      .then((detalle) => {
        // La respuesta puede llegar después de que el administrador haya abierto
        // otra traza: sin esta guarda, la anterior se pintaría encima de la
        // nueva.
        if (!vigente) return;
        setTraza(detalle.data.traza);
        setPasos(detalle.data.pasos);
        setEstado("listo");
      })
      .catch(() => {
        if (vigente) setEstado("error");
      });

    return () => {
      vigente = false;
    };
  }, [correlationId]);

  if (estado === "cargando") {
    return <p className="logs-admin-state">Cargando traza...</p>;
  }

  if (estado === "error" || !traza) {
    return (
      <p className="logs-admin-error">
        <span className="error-title">No se pudo cargar la traza</span>
      </p>
    );
  }

  return (
    <div className="logs-admin-table-wrapper">
      <p>
        <strong>
          {traza.metodo} {traza.ruta}
        </strong>{" "}
        → <span className={claseEstado(traza.estado_http)}>{traza.estado_http}</span>{" "}
        en {traza.duracion_ms} ms · {traza.servicio} · {traza.ambiente}
      </p>
      <p className="trazas-correlacion">{traza.correlation_id}</p>
      {traza.error && <p className="trazas-estado trazas-estado--error">{traza.error}</p>}
      <Pasos pasos={pasos} />
    </div>
  );
}

function TrazasAdmin() {
  const [servicio, setServicio] = useState("");
  const [metodo, setMetodo] = useState("");
  const [ruta, setRuta] = useState("");
  const [estado, setEstado] = useState("");
  const [ambiente, setAmbiente] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);
  const [correlacionAbierta, setCorrelacionAbierta] = useState<string | null>(
    null,
  );

  const params = useMemo<GetTracesParams>(
    () => ({
      page,
      limit: 50,
      includeTotal: true,
      servicio: servicio || undefined,
      metodo: metodo || undefined,
      ruta: ruta || undefined,
      estado: estado === "" ? undefined : Number(estado),
      ambiente: ambiente || undefined,
      desde: aIso(desde),
      hasta: aIso(hasta),
    }),
    [page, servicio, metodo, ruta, estado, ambiente, desde, hasta],
  );

  const { data, loading, error } = useTraces(params);

  /** Cambiar un filtro vuelve a la primera página: la 7 con un filtro nuevo no
   *  existe, y buscaría una página vacía sin avisar. */
  const cambiarFiltro = useCallback((cambiar: () => void) => {
    setPage(1);
    setCorrelacionAbierta(null);
    cambiar();
  }, []);

  const total = data?.total ?? 0;
  const ultimaPagina = Math.max(1, Math.ceil(total / (data?.limit ?? 50)));

  return (
    <div className="logs-admin-container">
      <div className="logs-admin-header">
        <h1 className="logs-admin-title">Visor de Trazas</h1>
        <p className="logs-admin-subtitle">
          Localiza una petición por su servicio, su endpoint, su estado y su
          periodo. Cada fila trae el identificador de correlación que devuelve
          la respuesta de la petición.
        </p>
      </div>

      <div className="logs-admin-filters">
        <div className="filter-group">
          <label className="filter-label" htmlFor="traza-servicio">
            Servicio
          </label>
          <input
            id="traza-servicio"
            className="filter-input"
            value={servicio}
            placeholder="goblinhub-api"
            onChange={(e) => cambiarFiltro(() => setServicio(e.target.value))}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="traza-metodo">
            Método
          </label>
          <select
            id="traza-metodo"
            className="filter-input"
            value={metodo}
            onChange={(e) => cambiarFiltro(() => setMetodo(e.target.value))}
          >
            <option value="">Todos</option>
            {METODOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="traza-ruta">
            Ruta
          </label>
          <input
            id="traza-ruta"
            className="filter-input"
            value={ruta}
            placeholder="/events"
            onChange={(e) => cambiarFiltro(() => setRuta(e.target.value))}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="traza-estado">
            Estado
          </label>
          <input
            id="traza-estado"
            className="filter-input"
            value={estado}
            placeholder="500"
            inputMode="numeric"
            onChange={(e) => cambiarFiltro(() => setEstado(e.target.value))}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="traza-ambiente">
            Despliegue
          </label>
          <select
            id="traza-ambiente"
            className="filter-input"
            value={ambiente}
            onChange={(e) => cambiarFiltro(() => setAmbiente(e.target.value))}
          >
            <option value="">Todos</option>
            {AMBIENTES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="traza-desde">
            Desde
          </label>
          <input
            id="traza-desde"
            className="filter-input"
            type="datetime-local"
            value={desde}
            onChange={(e) => cambiarFiltro(() => setDesde(e.target.value))}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="traza-hasta">
            Hasta
          </label>
          <input
            id="traza-hasta"
            className="filter-input"
            type="datetime-local"
            value={hasta}
            onChange={(e) => cambiarFiltro(() => setHasta(e.target.value))}
          />
        </div>
      </div>

      {loading && <p className="logs-admin-state">Cargando trazas...</p>}

      {error && (
        <div className="logs-admin-error">
          <span className="error-title">No se pudieron cargar las trazas</span>
          <span className="error-message">{error}</span>
        </div>
      )}

      {!loading && !error && data?.data.length === 0 && (
        <p className="logs-admin-state">
          Ninguna traza cumple los filtros indicados.
        </p>
      )}

      {!loading && !error && data && data.data.length > 0 && (
        <>
          <div className="logs-admin-table-wrapper">
            <table className="logs-admin-table">
              <thead>
                <tr className="table-header-row">
                  <th className="table-header-cell">Inicio</th>
                  <th className="table-header-cell">Servicio</th>
                  <th className="table-header-cell">Operación</th>
                  <th className="table-header-cell">Estado</th>
                  <th className="table-header-cell">Duración</th>
                  <th className="table-header-cell">Despliegue</th>
                  <th className="table-header-cell">Pasos</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((traza) => (
                  <tr key={traza.id_traza} className="table-body-row">
                    <td className="table-cell text-sm text-gray-700">
                      {new Date(traza.fecha_inicio).toLocaleString()}
                    </td>
                    <td className="table-cell text-sm">{traza.servicio}</td>
                    <td className="table-cell font-mono">
                      {traza.metodo} {traza.ruta}
                    </td>
                    <td className={claseEstado(traza.estado_http)}>
                      {traza.estado_http}
                    </td>
                    <td className="table-cell text-sm">
                      {traza.duracion_ms} ms
                    </td>
                    <td className="table-cell text-sm">{traza.ambiente}</td>
                    <td className="table-cell">
                      <button
                        type="button"
                        className="expand-button"
                        aria-expanded={correlacionAbierta === traza.correlation_id}
                        onClick={() =>
                          setCorrelacionAbierta(
                            correlacionAbierta === traza.correlation_id
                              ? null
                              : traza.correlation_id,
                          )
                        }
                      >
                        {correlacionAbierta === traza.correlation_id
                          ? "Ocultar"
                          : "Ver"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {correlacionAbierta && (
            <DetalleTraza correlationId={correlacionAbierta} />
          )}

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
              {total === 1 ? "traza" : "trazas"}
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

export default TrazasAdmin;
