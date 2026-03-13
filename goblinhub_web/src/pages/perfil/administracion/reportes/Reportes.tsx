import "./Reportes.css";

export default function Reportes() {
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
              value="2026-02-01"
            />
            <span>hasta</span>
            <input
              type="date"
              className="date-input"
              id="endDate"
              value="2026-02-16"
            />
            <button className="btn btn-primary">🔄 Actualizar</button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Usuarios Activos</div>
                <div className="stat-value">187</div>
              </div>
              <div className="stat-icon">👥</div>
            </div>
            <div className="stat-trend trend-up">
              ↑ +12% vs periodo anterior
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Eventos Realizados</div>
                <div className="stat-value">18</div>
              </div>
              <div className="stat-icon">📅</div>
            </div>
            <div className="stat-trend trend-up">↑ +3 eventos este periodo</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Total Asistencias</div>
                <div className="stat-value">342</div>
              </div>
              <div className="stat-icon">🎯</div>
            </div>
            <div className="stat-trend trend-up">↑ +18% participación</div>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <div>
                <div className="stat-label">Tasa de Conversión</div>
                <div className="stat-value">68%</div>
              </div>
              <div className="stat-icon">📈</div>
            </div>
            <div className="stat-trend trend-up">↑ +5% este periodo</div>
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
              <canvas id="mainChart"></canvas>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h2 className="chart-title">🎯 Distribución por Nivel</h2>
            </div>
            <div className="chart-container">
              <canvas id="levelChart"></canvas>
            </div>
          </div>
        </div>

        <div className="activity-grid">
          <div className="chart-card">
            <div className="chart-header">
              <h2 className="chart-title">📊 Eventos por Tipo</h2>
            </div>
            <div className="chart-container">
              <canvas id="eventsChart"></canvas>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h2 className="chart-title">👥 Asistencia por Mes</h2>
            </div>
            <div className="chart-container">
              <canvas id="attendanceChart"></canvas>
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
                <tr>
                  <td>
                    <div className="rank-badge first">1</div>
                  </td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar-small">S</div>
                      <span>Sadrach García</span>
                    </div>
                  </td>
                  <td>
                    <strong>23</strong>
                  </td>
                  <td>
                    <strong>1,450</strong>
                  </td>
                  <td>Veterano</td>
                </tr>
                <tr>
                  <td>
                    <div className="rank-badge second">2</div>
                  </td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar-small">J</div>
                      <span>Jesús Martínez</span>
                    </div>
                  </td>
                  <td>
                    <strong>21</strong>
                  </td>
                  <td>
                    <strong>1,320</strong>
                  </td>
                  <td>Veterano</td>
                </tr>
                <tr>
                  <td>
                    <div className="rank-badge third">3</div>
                  </td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar-small">M</div>
                      <span>Miguel Sánchez</span>
                    </div>
                  </td>
                  <td>
                    <strong>19</strong>
                  </td>
                  <td>
                    <strong>1,180</strong>
                  </td>
                  <td>Veterano</td>
                </tr>
                <tr>
                  <td>
                    <div className="rank-badge">4</div>
                  </td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar-small">P</div>
                      <span>Patricia Díaz</span>
                    </div>
                  </td>
                  <td>
                    <strong>17</strong>
                  </td>
                  <td>
                    <strong>1,050</strong>
                  </td>
                  <td>Intermedio</td>
                </tr>
                <tr>
                  <td>
                    <div className="rank-badge">5</div>
                  </td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar-small">E</div>
                      <span>Erick Arvayo</span>
                    </div>
                  </td>
                  <td>
                    <strong>15</strong>
                  </td>
                  <td>
                    <strong>920</strong>
                  </td>
                  <td>Intermedio</td>
                </tr>
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
              <select className="filter-select" id="logTypeFilter">
                <option value="">Todos los tipos</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
              <select className="filter-select" id="logLimitFilter">
                <option value="50">Últimos 50</option>
                <option value="100">Últimos 100</option>
                <option value="200">Últimos 200</option>
              </select>
            </div>
          </div>
          <div className="logs-body" id="logsContainer"></div>
        </div>
      </div>
    </div>
  );
}
