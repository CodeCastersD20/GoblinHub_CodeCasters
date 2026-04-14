import { useEffect, useMemo, useState } from "react";
import "./Reportes.css";
import { useLogs } from "../../../../hooks/useLogs";
import type { GetLogsParams, TipoLog } from "../../../../services/logs.service";
import {
  getDashboardMetrics,
  type DashboardMetrics,
} from "../../../../services/reportes.service";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

const getIsoDate = (date: Date) => date.toISOString().split("T")[0];

const todayIso = getIsoDate(new Date());

const last30DaysIso = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return getIsoDate(d);
})();

export default function Reportes() {
  const [startDateInput, setStartDateInput] = useState(last30DaysIso);
  const [endDateInput, setEndDateInput] = useState(todayIso);
  const [logTypeInput, setLogTypeInput] = useState<TipoLog | "">("");
  const [logLimitInput, setLogLimitInput] = useState<"50" | "100" | "200">(
    "50",
  );

  const [startDate, setStartDate] = useState(last30DaysIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [logType, setLogType] = useState<TipoLog | "">("");
  const [logLimit, setLogLimit] = useState<50 | 100 | 200>(50);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const params = useMemo<GetLogsParams>(
    () => ({
      limit: logLimit,
      tipo: logType || undefined,
      desde: startDate || undefined,
      hasta: endDate || undefined,
      includeTotal: false,
    }),
    [logLimit, logType, startDate, endDate],
  );

  const { data, loading, error } = useLogs(params);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setMetricsLoading(true);
        const response = await getDashboardMetrics(6);
        setMetrics(response.data);
      } catch {
        setMetrics(null);
      } finally {
        setMetricsLoading(false);
      }
    };

    void fetchMetrics();
  }, []);

  const applyFilters = () => {
    setStartDate(startDateInput);
    setEndDate(endDateInput);
    setLogType(logTypeInput);
    setLogLimit(Number(logLimitInput) as 50 | 100 | 200);
  };

  const formatLogType = (tipo: TipoLog) =>
    ({ info: "Info", success: "Success", warning: "Warning", error: "Error" })[
      tipo
    ];

  const formatLogDate = (value: string) =>
    new Date(value).toLocaleString("es-CL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getLogActor = (log: {
    usuario?: { nombre: string; apellidos: string } | null;
    id_usuario?: string | null;
  }) => {
    if (log.usuario) return `${log.usuario.nombre} ${log.usuario.apellidos}`;
    if (log.id_usuario) return `Usuario ${log.id_usuario}`;
    return "Sistema";
  };

  const safeValue = (value?: number | null, suffix = "") => {
    if (value === null || value === undefined) return "--";
    return `${value}${suffix}`;
  };

  const growthChartData = useMemo(() => {
    const users = metrics?.crecimientoUsuarios ?? [];
    const events = metrics?.crecimientoEventos ?? [];
    return {
      labels: users.map((item) => item.label),
      datasets: [
        {
          label: "Usuarios",
          data: users.map((item) => item.value),
          borderColor: "#5E2B8E",
          backgroundColor: "rgba(94, 43, 142, 0.15)",
          tension: 0.35,
          fill: true,
          borderWidth: 3,
        },
        {
          label: "Eventos",
          data: events.map((item) => item.value),
          borderColor: "#B8D92A",
          backgroundColor: "rgba(184, 217, 42, 0.2)",
          tension: 0.35,
          fill: true,
          borderWidth: 3,
        },
      ],
    };
  }, [metrics]);

  const levelChartData = useMemo(() => {
    const levels = metrics?.distribucionNiveles ?? [];
    return {
      labels: levels.map((item) => item.label),
      datasets: [
        {
          data: levels.map((item) => item.value),
          backgroundColor: ["#5E2B8E", "#B8D92A", "#FF6B35", "#2563EB"],
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    };
  }, [metrics]);

  const eventTypeChartData = useMemo(() => {
    const eventsByType = metrics?.eventosPorTipo ?? [];
    return {
      labels: eventsByType.map((item) => item.label),
      datasets: [
        {
          label: "Eventos",
          data: eventsByType.map((item) => item.value),
          backgroundColor: [
            "#5E2B8E",
            "#B8D92A",
            "#FF6B35",
            "#2563EB",
            "#F59E0B",
          ],
          borderRadius: 8,
        },
      ],
    };
  }, [metrics]);

  const attendanceChartData = useMemo(() => {
    const attendance = metrics?.asistenciaPorMes ?? [];
    return {
      labels: attendance.map((item) => item.label),
      datasets: [
        {
          label: "Asistencias",
          data: attendance.map((item) => item.value),
          backgroundColor: "rgba(94, 43, 142, 0.75)",
          borderRadius: 8,
        },
      ],
    };
  }, [metrics]);

  const hasMetricsData = (metrics?.crecimientoUsuarios?.length ?? 0) > 0;
  const hasLevelsData = (metrics?.distribucionNiveles?.length ?? 0) > 0;
  const hasEventTypeData = (metrics?.eventosPorTipo?.length ?? 0) > 0;
  const hasAttendanceData = (metrics?.asistenciaPorMes?.length ?? 0) > 0;

  return (
    <div>
      <div className="dashboard-container">
        <div className="page-header">
          <div className="page-title-section">
            <h1>📊 Reportes y Analíticas</h1>
            <p className="page-subtitle">
              Dashboard completo de métricas y actividad del sistema
            </p>
          </div>
          <div className="date-range-selector">
            <input
              type="date"
              className="date-input"
              id="startDate"
              value={startDateInput}
              onChange={(e) => setStartDateInput(e.target.value)}
            />
            <span>hasta</span>
            <input
              type="date"
              className="date-input"
              id="endDate"
              value={endDateInput}
              onChange={(e) => setEndDateInput(e.target.value)}
            />
            <button className="btn btn-primary" onClick={applyFilters}>
              🔄 Actualizar
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Usuarios Activos</div>
                <div className="stat-value">
                  {safeValue(metrics?.summary.usuariosActivos)}
                </div>
              </div>
              <div className="stat-icon">👥</div>
            </div>
            <div className="stat-trend trend-up">Dato en tiempo real</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Eventos Realizados</div>
                <div className="stat-value">
                  {safeValue(metrics?.summary.eventosRealizados)}
                </div>
              </div>
              <div className="stat-icon">📅</div>
            </div>
            <div className="stat-trend trend-up">Dato en tiempo real</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Total Asistencias</div>
                <div className="stat-value">
                  {safeValue(metrics?.summary.totalAsistencias)}
                </div>
              </div>
              <div className="stat-icon">🎯</div>
            </div>
            <div className="stat-trend trend-up">Dato en tiempo real</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Tasa de Conversión</div>
                <div className="stat-value">
                  {safeValue(metrics?.summary.tasaConversion, "%")}
                </div>
              </div>
              <div className="stat-icon">📈</div>
            </div>
            <div className="stat-trend trend-up">Dato en tiempo real</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-header">
              <h2 className="chart-title">
                📈 Crecimiento de Usuarios y Eventos
              </h2>
            </div>
            <div className="chart-container large">
              {metricsLoading || !hasMetricsData ? (
                <p className="chart-fallback">--</p>
              ) : (
                <Line
                  data={growthChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              )}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h2 className="chart-title">🎯 Distribución por Nivel</h2>
            </div>
            <div className="chart-container">
              {metricsLoading || !hasLevelsData ? (
                <p className="chart-fallback">--</p>
              ) : (
                <Doughnut
                  data={levelChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="activity-grid">
          <div className="chart-card">
            <div className="chart-header">
              <h2 className="chart-title">📊 Eventos por Tipo</h2>
            </div>
            <div className="chart-container">
              {metricsLoading || !hasEventTypeData ? (
                <p className="chart-fallback">--</p>
              ) : (
                <Bar
                  data={eventTypeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              )}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h2 className="chart-title">👥 Asistencia por Mes</h2>
            </div>
            <div className="chart-container">
              {metricsLoading || !hasAttendanceData ? (
                <p className="chart-fallback">--</p>
              ) : (
                <Bar
                  data={attendanceChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="top-users-card">
          <div className="chart-header">
            <h2 className="chart-title">🏆 Top 10 Usuarios Más Activos</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ranking</th>
                  <th>Usuario</th>
                  <th>Eventos Asistidos</th>
                  <th>Puntos</th>
                  <th>Nivel</th>
                </tr>
              </thead>
              <tbody>
                {(metrics?.topUsuarios?.length ?? 0) === 0 && (
                  <tr>
                    <td>--</td>
                    <td>--</td>
                    <td>--</td>
                    <td>--</td>
                    <td>--</td>
                  </tr>
                )}
                {metrics?.topUsuarios?.map((user, index) => (
                  <tr key={user.id_usuario}>
                    <td>
                      <div className="rank-badge">{index + 1}</div>
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar-small">
                          {(user.nombre?.[0] ?? "-").toUpperCase()}
                        </div>
                        <span>
                          {user.nombre || "--"} {user.apellidos || ""}
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong>{safeValue(user.eventosAsistidos)}</strong>
                    </td>
                    <td>
                      <strong>{safeValue(user.puntos)}</strong>
                    </td>
                    <td>{user.nivel || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="export-section">
          <div className="chart-header">
            <h2 className="chart-title">💾 Exportar Reportes</h2>
          </div>
          <div className="export-options">
            <button className="btn-export">📄 Exportar a PDF</button>
            <button className="btn-export">📊 Exportar a Excel</button>
            <button className="btn-export">📋 Exportar a CSV</button>
            <button className="btn-export">💻 Exportar a JSON</button>
          </div>
        </div>

        <div className="logs-section">
          <div className="logs-header">
            <h2 className="logs-title">📋 Registro de Actividad (Logs)</h2>
            <div className="logs-filters">
              <select
                className="filter-select"
                id="logTypeFilter"
                value={logTypeInput}
                onChange={(e) =>
                  setLogTypeInput(e.target.value as TipoLog | "")
                }
              >
                <option value="">Todos los tipos</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
              <select
                className="filter-select"
                id="logLimitFilter"
                value={logLimitInput}
                onChange={(e) =>
                  setLogLimitInput(e.target.value as "50" | "100" | "200")
                }
              >
                <option value="50">Últimos 50</option>
                <option value="100">Últimos 100</option>
                <option value="200">Últimos 200</option>
              </select>
            </div>
          </div>
          <div className="logs-body" id="logsContainer">
            {loading && <p className="log-message">Cargando logs...</p>}
            {error && <p className="log-message">{error}</p>}

            {!loading && !error && (data?.data?.length ?? 0) === 0 && (
              <p className="log-message">
                No hay logs para los filtros seleccionados.
              </p>
            )}

            {!loading &&
              !error &&
              data?.data?.map((log) => (
                <article key={log.id_log} className={`log-entry ${log.tipo}`}>
                  <header className="log-header">
                    <span className={`log-type ${log.tipo}`}>
                      {formatLogType(log.tipo)}
                    </span>
                    <time className="log-time">
                      {formatLogDate(log.fecha_hora)}
                    </time>
                  </header>
                  <p className="log-message">{log.mensaje}</p>
                  <p className="log-details">
                    Accion: {log.accion} | Usuario: {getLogActor(log)}
                  </p>
                </article>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
