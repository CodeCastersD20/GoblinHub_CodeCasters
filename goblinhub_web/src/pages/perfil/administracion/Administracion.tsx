import React from "react";
import "./Administracion.css";

const Administracion: React.FC = () => {
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
                <div className="stat-value">248</div>
              </div>
              <div className="stat-icon">👥</div>
            </div>
            <div className="stat-trend trend-up">↑ +23 este mes</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Eventos Activos</div>
                <div className="stat-value">18</div>
              </div>
              <div className="stat-icon">📅</div>
            </div>
            <div className="stat-trend trend-up">↑ +3 esta semana</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Participaciones</div>
                <div className="stat-value">342</div>
              </div>
              <div className="stat-icon">🎮</div>
            </div>
            <div className="stat-trend trend-up">↑ +18% vs mes anterior</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Novatos Captados</div>
                <div className="stat-value">34</div>
              </div>
              <div className="stat-icon">🌱</div>
            </div>
            <div className="stat-trend trend-up">↑ Meta: 5/mes alcanzada</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Tasa Conversión</div>
                <div className="stat-value">68%</div>
              </div>
              <div className="stat-icon">📈</div>
            </div>
            <div className="stat-trend trend-up">↑ +5% este mes</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Satisfacción</div>
                <div className="stat-value">4.6</div>
              </div>
              <div className="stat-icon">⭐</div>
            </div>
            <div className="stat-trend">De 5.0 estrellas</div>
          </div>
        </div>

        <h2 className="section-title">🎛️ Módulos de Gestión</h2>
        <div className="modules-grid">
          <a href="admin-usuarios.html" className="module-card">
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
                  <div className="module-stat-value">248</div>
                  <div className="module-stat-label">Total</div>
                </div>
                <div className="module-stat">
                  <div className="module-stat-value">187</div>
                  <div className="module-stat-label">Activos</div>
                </div>
              </div>
            </div>
          </a>

          <a href="admin-eventos-crud.html" className="module-card">
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
                  <div className="module-stat-value">18</div>
                  <div className="module-stat-label">Eventos</div>
                </div>
                <div className="module-stat">
                  <div className="module-stat-value">6</div>
                  <div className="module-stat-label">Próximos</div>
                </div>
              </div>
            </div>
          </a>

          <a href="capacitacion-novatos.html" className="module-card">
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
                  <div className="module-stat-value">34</div>
                  <div className="module-stat-label">Novatos</div>
                </div>
                <div className="module-stat">
                  <div className="module-stat-value">68%</div>
                  <div className="module-stat-label">Conversión</div>
                </div>
              </div>
            </div>
          </a>

          <a href="admin-reportes.html" className="module-card">
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
                  <div className="module-stat-value">342</div>
                  <div className="module-stat-label">Asistencias</div>
                </div>
                <div className="module-stat">
                  <div className="module-stat-value">87%</div>
                  <div className="module-stat-label">Ocupación</div>
                </div>
              </div>
            </div>
          </a>

          <a className="module-card">
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
          </a>
        </div>

        <div className="charts-section">
          <h2 className="section-title">📈 Métricas Generales</h2>
          <div className="charts-grid">
            <div>
              <h3 className="title-metricas">Crecimiento de Usuarios</h3>
              <div className="chart-container">
                <canvas id="usersChart"></canvas>
              </div>
            </div>
            <div>
              <h3 className="distribucion-eventos">Distribución de Eventos</h3>
              <div className="chart-container">
                <canvas id="eventsChart"></canvas>
              </div>
            </div>
          </div>
        </div>

          <div className="activity-section">
            <h2 className="section-title">🔔 Actividad Reciente</h2>
            <div className="activity-list">
                <div className="activity-item">
                    <div className="activity-icon">👤</div>
                    <div className="activity-content">
                        <div className="activity-text">Nuevo usuario registrado: Diego Morales</div>
                        <div className="activity-time">Hace 15 minutos</div>
                    </div>
                </div>
                <div className="activity-item">
                    <div className="activity-icon">🏆</div>
                    <div className="activity-content">
                        <div className="activity-text">Evento completado: Torneo Age of Sigmar</div>
                        <div className="activity-time">Hace 2 horas</div>
                    </div>
                </div>
                <div className="activity-item">
                    <div className="activity-icon">📝</div>
                    <div className="activity-content">
                        <div className="activity-text">Nueva encuesta recibida de Valentina Cruz</div>
                        <div className="activity-time">Hace 3 horas</div>
                    </div>
                </div>
                <div className="activity-item">
                    <div className="activity-icon">🌱</div>
                    <div className="activity-content">
                        <div className="activity-text">3 novatos registrados en sesión de iniciación</div>
                        <div className="activity-time">Ayer a las 16:30</div>
                    </div>
                </div>
                <div className="activity-item">
                    <div className="activity-icon">📅</div>
                    <div className="activity-content">
                        <div className="activity-text">Evento creado: Taller de Pintura Avanzada</div>
                        <div className="activity-time">Ayer a las 10:15</div>
                    </div>
                </div>
            </div>
        </div>
        
      </div>
    </div>
  );
};

export default Administracion;
