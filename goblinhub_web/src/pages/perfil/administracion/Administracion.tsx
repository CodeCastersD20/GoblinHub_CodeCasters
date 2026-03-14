import React, { useEffect, useMemo, useState } from "react";
import "./Administracion.css";
import { useNavigate } from "react-router-dom";
import { useLogs } from "../../../hooks/useLogs";
import {
  getDashboardMetrics,
  type DashboardMetrics,
} from "../../../services/reportes.service";
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

const Administracion: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error } = useLogs({ limit: 5, includeTotal: false });
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await getDashboardMetrics(6);
        setMetrics(response.data);
      } catch {
        setMetrics(null);
      }
    };

    void fetchMetrics();
  }, []);

  const formatDate = (value?: string) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const getNavigableCardProps = (path: string) => ({
    className: "module-card",
    role: "button" as const,
    tabIndex: 0,
    style: { cursor: "pointer" },
    onClick: () => navigate(path),
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate(path);
      }
    },
  });

  const safeValue = (value?: number | null, suffix = "") => {
    if (value === null || value === undefined) return "--";
    return `${value}${suffix}`;
  };

  const userGrowthChartData = useMemo(() => {
    const growth = metrics?.crecimientoUsuarios ?? [];
    return {
      labels: growth.map((item) => item.label),
      datasets: [
        {
          label: "Nuevos usuarios",
          data: growth.map((item) => item.value),
          borderColor: "#5E2B8E",
          backgroundColor: "rgba(94, 43, 142, 0.2)",
          tension: 0.35,
          fill: true,
          borderWidth: 3,
        },
      ],
    };
  }, [metrics]);

  const generalDistributionChartData = useMemo(() => {
    const summary = metrics?.summary;
    return {
      labels: [
        "Usuarios",
        "Productos",
        "Eventos",
        "Participaciones",
        "Novatos",
      ],
      datasets: [
        {
          data: [
            summary?.totalUsuarios ?? 0,
            summary?.totalProductos ?? 0,
            summary?.eventosRealizados ?? 0,
            summary?.totalAsistencias ?? 0,
            summary?.totalNovatos ?? 0,
          ],
          backgroundColor: [
            "#5E2B8E",
            "#B8D92A",
            "#FF6B35",
            "#2563EB",
            "#F59E0B",
          ],
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    };
  }, [metrics]);

  const hasUserGrowthData = (metrics?.crecimientoUsuarios?.length ?? 0) > 0;
  const hasGeneralDistributionData =
    !!metrics &&
    [
      metrics.summary.totalUsuarios,
      metrics.summary.totalProductos,
      metrics.summary.eventosRealizados,
      metrics.summary.totalAsistencias,
      metrics.summary.totalNovatos,
    ].some((value) => value > 0);

  return (
    <div className="base-welcome">
      <div className="container">
        <div className="welcome-section">
          <h1 className="welcome-title">Panel de Administración</h1>
          <p className="welcome-subtitle">
            Bienvenido al centro de control de Goblin Hub
          </p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Total Usuarios</div>
                <div className="stat-value">
                  {safeValue(metrics?.summary.totalUsuarios)}
                </div>
              </div>
              <div className="stat-icon">👥</div>
            </div>
            <div className="stat-trend trend-up">Dato en tiempo real</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Eventos Activos</div>
                <div className="stat-value">
                  {safeValue(metrics?.summary.eventosProximos)}
                </div>
              </div>
              <div className="stat-icon">📅</div>
            </div>
            <div className="stat-trend trend-up">Dato en tiempo real</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Participaciones</div>
                <div className="stat-value">
                  {safeValue(metrics?.summary.totalAsistencias)}
                </div>
              </div>
              <div className="stat-icon">🎮</div>
            </div>
            <div className="stat-trend trend-up">Dato en tiempo real</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Novatos Captados</div>
                <div className="stat-value">
                  {safeValue(metrics?.summary.totalNovatos)}
                </div>
              </div>
              <div className="stat-icon">🌱</div>
            </div>
            <div className="stat-trend trend-up">Dato en tiempo real</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Tasa Conversión</div>
                <div className="stat-value">
                  {safeValue(metrics?.summary.tasaConversion, "%")}
                </div>
              </div>
              <div className="stat-icon">📈</div>
            </div>
            <div className="stat-trend trend-up">Dato en tiempo real</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Satisfacción</div>
                <div className="stat-value">--</div>
              </div>
              <div className="stat-icon">⭐</div>
            </div>
            <div className="stat-trend">Pendiente de integrar</div>
          </div>
        </div>

        <h2 className="section-title">🎛️ Módulos de Gestión</h2>
        <div className="modules-grid">
          <div {...getNavigableCardProps("/usuariosAdmin")}>
            <div className="module-header">
              <div className="module-icon">👥</div>
              <h3 className="module-title">Usuarios</h3>
              <p className="module-subtitle">Gestión de usuarios y perfiles</p>
            </div>
            <div className="module-body">
              <p className="module-description">
                Administra todos los usuarios registrados, edita perfiles,
                asigna roles y gestiona niveles de experiencia.
              </p>
              <div className="module-stats">
                <div className="module-stat">
                  <div className="module-stat-value">
                    {safeValue(metrics?.summary.totalUsuarios)}
                  </div>
                  <div className="module-stat-label">Total</div>
                </div>
                <div className="module-stat">
                  <div className="module-stat-value">
                    {safeValue(metrics?.summary.usuariosActivos)}
                  </div>
                  <div className="module-stat-label">Activos</div>
                </div>
              </div>
            </div>
          </div>

          <div {...getNavigableCardProps("/eventosAdmin")}>
            <div className="module-header">
              <div className="module-icon">📅</div>
              <h3 className="module-title">Eventos</h3>
              <p className="module-subtitle">Crear y gestionar eventos</p>
            </div>
            <div className="module-body">
              <p className="module-description">
                Crea, edita y elimina eventos. Gestiona torneos, talleres,
                sesiones de iniciación y eventos casuales.
              </p>
              <div className="module-stats">
                <div className="module-stat">
                  <div className="module-stat-value">
                    {safeValue(metrics?.summary.eventosRealizados)}
                  </div>
                  <div className="module-stat-label">Eventos</div>
                </div>
                <div className="module-stat">
                  <div className="module-stat-value">
                    {safeValue(metrics?.summary.eventosProximos)}
                  </div>
                  <div className="module-stat-label">Próximos</div>
                </div>
              </div>
            </div>
          </div>

          <div {...getNavigableCardProps("/admin/novatos")}>
            <div className="module-header">
              <div className="module-icon">🌱</div>
              <h3 className="module-title">Captación de Novatos</h3>
              <p className="module-subtitle">Seguimiento de nuevos jugadores</p>
            </div>
            <div className="module-body">
              <p className="module-description">
                Registra novatos, gestiona encuestas de experiencia, analiza
                canales de captación y conversión.
              </p>
              <div className="module-stats">
                <div className="module-stat">
                  <div className="module-stat-value">
                    {safeValue(metrics?.summary.totalNovatos)}
                  </div>
                  <div className="module-stat-label">Novatos</div>
                </div>
                <div className="module-stat">
                  <div className="module-stat-value">
                    {safeValue(metrics?.summary.tasaConversion, "%")}
                  </div>
                  <div className="module-stat-label">Conversión</div>
                </div>
              </div>
            </div>
          </div>

          <div {...getNavigableCardProps("/admin/reportes")}>
            <div className="module-header">
              <div className="module-icon">📊</div>
              <h3 className="module-title">Reportes & Analytics</h3>
              <p className="module-subtitle">Estadísticas y análisis</p>
            </div>
            <div className="module-body">
              <p className="module-description">
                Visualiza métricas clave, genera reportes, analiza tendencias y
                revisa logs del sistema.
              </p>
              <div className="module-stats">
                <div className="module-stat">
                  <div className="module-stat-value">
                    {safeValue(metrics?.summary.totalAsistencias)}
                  </div>
                  <div className="module-stat-label">Asistencias</div>
                </div>
                <div className="module-stat">
                  <div className="module-stat-value">
                    {safeValue(metrics?.summary.ocupacion, "%")}
                  </div>
                  <div className="module-stat-label">Ocupación</div>
                </div>
              </div>
            </div>
          </div>

          <div {...getNavigableCardProps("/productos")}>
            <div className="module-header">
              <div className="module-icon">📦</div>
              <h3 className="module-title">Productos</h3>
              <p className="module-subtitle">Próximamente</p>
            </div>
            <div className="module-body">
              <p className="module-description">
                Gestión de inventario, catálogo de productos, precios y
                categorías.
              </p>
              <div className="module-stats">
                <div className="module-stat">
                  <div className="module-stat-value">---</div>
                  <div className="module-stat-label">Próximamente</div>
                </div>
                <div className="module-stat">
                  <div className="module-stat-value">---</div>
                  <div className="module-stat-label">En desarrollo</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="charts-section">
          <h2 className="section-title">📈 Métricas Generales</h2>
          <div className="charts-grid">
            <div>
              <h3 className="title-metricas">Crecimiento de Usuarios</h3>
              <div className="chart-container">
                {!hasUserGrowthData ? (
                  <p>--</p>
                ) : (
                  <Line
                    data={userGrowthChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                    }}
                  />
                )}
              </div>
            </div>
            <div>
              <h3 className="distribucion-eventos">Distribución General</h3>
              <div className="chart-container">
                {!hasGeneralDistributionData ? (
                  <p>--</p>
                ) : (
                  <Doughnut
                    data={generalDistributionChartData}
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
        </div>

        <div className="activity-section">
          <h2 className="section-title">🔔 Actividad Reciente</h2>
          <div className="activity-list">
            {loading && (
              <div className="activity-item">
                <div className="activity-icon">⏳</div>
                <div className="activity-content">
                  <div className="activity-text">Cargando actividad...</div>
                  <div className="activity-time">--</div>
                </div>
              </div>
            )}

            {!loading && error && (
              <div className="activity-item">
                <div className="activity-icon">⚠️</div>
                <div className="activity-content">
                  <div className="activity-text">
                    No se pudo cargar la actividad
                  </div>
                  <div className="activity-time">--</div>
                </div>
              </div>
            )}

            {!loading && !error && (data?.data?.length ?? 0) === 0 && (
              <div className="activity-item">
                <div className="activity-icon">📭</div>
                <div className="activity-content">
                  <div className="activity-text">No hay actividad reciente</div>
                  <div className="activity-time">--</div>
                </div>
              </div>
            )}

            {!loading &&
              !error &&
              data?.data?.map((log) => (
                <div className="activity-item" key={log.id_log}>
                  <div className="activity-icon">📝</div>
                  <div className="activity-content">
                    <div className="activity-text">{log.mensaje || "--"}</div>
                    <div className="activity-time">
                      {log.accion || "--"} | {formatDate(log.fecha_hora)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Administracion;
