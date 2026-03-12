import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMe,
  logout,
  uploadFotoPerfil,
  updatePerfil,
} from "../../services/auth.service";
import "./PerfilPage.css";
import type { MeResponseDto, UpdatePerfilDto } from "../../types/auth.types";
import def from "../../assets/default_perfil.png";

type Section =
  | "personal"
  | "interests"
  | "achievements"
  | "activity"
  | "settings";

const PerfilPage = () => {
  const [user, setUser] = useState<MeResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UpdatePerfilDto>({});
  const [activeSection, setActiveSection] = useState<Section>("personal");
  const navigate = useNavigate();

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleEditStart = () => {
    if (!user) return;
    setFormData({
      nombre: user.nombre,
      apellidos: user.apellidos,
      telefono: user.telefono ?? "",
      fecha_nacimiento: user.fecha_nacimiento?.slice(0, 10) ?? "",
      nivel_experiencia: user.nivel_experiencia,
      bio: user.bio ?? "",
    });
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setFormData({});
  };

  const handleEditSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updatePerfil(formData);
      setUser({ ...user, ...formData });
      setIsEditing(false);
      setFormData({});
    } catch (err) {
      console.error("Error completo al guardar:", JSON.stringify(err), err);
      const axiosErr = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const msg =
        axiosErr?.response?.data?.message ??
        axiosErr?.message ??
        "Error desconocido";
      alert(
        `Error al guardar [${axiosErr?.response?.status ?? "sin status"}]: ${msg}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleField = (field: keyof UpdatePerfilDto, value: string) => {
    setFormData((prev: UpdatePerfilDto) => ({ ...prev, [field]: value }));
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const res = await uploadFotoPerfil(file);
      setUser({ ...user, foto_perfil_url: res.data.foto_perfil_url });
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? String(err);
      console.error("Error al subir foto:", msg, err);
      alert(`Error al subir la foto: ${msg}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (loading) return <p>Cargando...</p>;
  if (!user) return <p>No se pudo cargar el perfil.</p>;

  return (
    <div className="perfil-container">
      {/* Sidebar */}
      <aside className="profile-sidebar">
        <div className="profile-card">
          <div className="avatar-container">
            <img
              src={user.foto_perfil_url ?? def}
              alt="Foto de perfil"
              className="avatar"
            />
            <label
              className="avatar-upload"
              title={uploading ? "Subiendo..." : "Cambiar foto"}
            >
              {uploading ? "⏳" : "📷"}
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={handleFotoChange}
              />
            </label>
          </div>
          <h2 className="profile-name">
            {user.nombre} {user.apellidos}
          </h2>
          <div className="profile-level">
            ⚔️ Nivel: {user.nivel_experiencia}
          </div>
          <div className="profile-stats">
            <div className="stat-item">
              <div className="stat-value">—</div>
              <div className="stat-label">Eventos</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{user.puntos_fidelidad ?? 0}</div>
              <div className="stat-label">Puntos</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">—</div>
              <div className="stat-label">Torneos</div>
            </div>
          </div>
        </div>

        <nav className="menu-nav">
          {(
            [
              { key: "personal", icon: "👤", label: "Información Personal" },
              { key: "interests", icon: "🎮", label: "Intereses de Juego" },
              { key: "achievements", icon: "🏆", label: "Logros" },
              { key: "activity", icon: "📊", label: "Actividad" },
              { key: "settings", icon: "⚙️", label: "Configuración" },
            ] as { key: Section; icon: string; label: string }[]
          ).map((item) => (
            <div
              key={item.key}
              className={`menu-item${activeSection === item.key ? " active" : ""}`}
              onClick={() => setActiveSection(item.key)}
            >
              <span className="menu-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="profile-content">
        {/* Personal */}
        <section
          className={`content-section${activeSection === "personal" ? " active" : ""}`}
        >
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">Información Personal</h2>
              <p className="section-subtitle">
                Actualiza tus datos básicos y de contacto
              </p>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>
                  Nombre <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={isEditing ? (formData.nombre ?? "") : user.nombre}
                  readOnly={!isEditing}
                  onChange={(e) => handleField("nombre", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>
                  Apellidos <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={
                    isEditing ? (formData.apellidos ?? "") : user.apellidos
                  }
                  readOnly={!isEditing}
                  onChange={(e) => handleField("apellidos", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>
                  Email <span className="required">*</span>
                </label>
                <input type="email" value={user.email} readOnly />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  value={
                    isEditing
                      ? (formData.telefono ?? "")
                      : (user.telefono ?? "")
                  }
                  readOnly={!isEditing}
                  onChange={(e) => handleField("telefono", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={
                    isEditing
                      ? (formData.fecha_nacimiento ?? "")
                      : (user.fecha_nacimiento?.slice(0, 10) ?? "")
                  }
                  readOnly={!isEditing}
                  onChange={(e) =>
                    handleField("fecha_nacimiento", e.target.value)
                  }
                />
              </div>
              <div className="form-group">
                <label>Nivel de Experiencia</label>
                {isEditing ? (
                  <select
                    value={formData.nivel_experiencia ?? ""}
                    onChange={(e) =>
                      handleField("nivel_experiencia", e.target.value)
                    }
                  >
                    <option value="novato">Novato</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="veterano">Veterano</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={user.nivel_experiencia ?? ""}
                    readOnly
                  />
                )}
              </div>
              <div className="form-group full-width">
                <label>Bio</label>
                <textarea
                  value={isEditing ? (formData.bio ?? "") : (user.bio ?? "")}
                  placeholder="Cuéntanos sobre ti..."
                  readOnly={!isEditing}
                  onChange={(e) => handleField("bio", e.target.value)}
                />
              </div>
            </div>
            {isEditing ? (
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  className="btn-edit"
                  onClick={() => void handleEditSave()}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "💾 Guardar"}
                </button>
                <button
                  className="btn-logout"
                  onClick={handleEditCancel}
                  disabled={saving}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button className="btn-edit" onClick={handleEditStart}>
                ✏️ Editar Perfil
              </button>
            )}
          </div>
        </section>

        {/* Interests */}
        <section
          className={`content-section${activeSection === "interests" ? " active" : ""}`}
        >
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">Intereses de Juego</h2>
              <p className="section-subtitle">
                Selecciona tus áreas de interés para recibir recomendaciones
                personalizadas
              </p>
            </div>
            <div className="interests-grid">
              {[
                { id: "wargames", icon: "⚔️", label: "Wargames" },
                { id: "rol", icon: "📖", label: "Juegos de Rol" },
                { id: "mesa", icon: "🎲", label: "Juegos de Mesa" },
                { id: "pintura", icon: "🎨", label: "Pintura" },
                { id: "tcg", icon: "🃏", label: "TCG/CCG" },
                { id: "torneos", icon: "🏆", label: "Torneos" },
              ].map((interest) => (
                <div key={interest.id} className="interest-card">
                  <input type="checkbox" id={`int-${interest.id}`} />
                  <label
                    htmlFor={`int-${interest.id}`}
                    className="interest-label"
                  >
                    <span className="interest-icon">{interest.icon}</span>
                    {interest.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Achievements */}
        <section
          className={`content-section${activeSection === "achievements" ? " active" : ""}`}
        >
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">Mis Logros</h2>
              <p className="section-subtitle">
                Tus logros desbloqueados en la comunidad
              </p>
            </div>
            <div className="achievements-grid">
              {[
                {
                  icon: "🎖️",
                  name: "Primer Torneo",
                  desc: "Participaste en tu primer torneo",
                  unlocked: true,
                },
                {
                  icon: "🏆",
                  name: "Campeón",
                  desc: "Ganaste un torneo oficial",
                  unlocked: true,
                },
                {
                  icon: "🎨",
                  name: "Maestro Pintor",
                  desc: "Ganaste Best Painted",
                  unlocked: true,
                },
                {
                  icon: "👥",
                  name: "Veterano",
                  desc: "Asististe a 20+ eventos",
                  unlocked: true,
                },
                {
                  icon: "⭐",
                  name: "Coleccionista",
                  desc: "Acumulaste 1000+ puntos",
                  unlocked: true,
                },
                {
                  icon: "🔒",
                  name: "Legendario",
                  desc: "Gana 10 torneos oficiales",
                  unlocked: false,
                },
              ].map((a) => (
                <div
                  key={a.name}
                  className={`achievement-card ${a.unlocked ? "unlocked" : "locked"}`}
                >
                  <div className="achievement-icon">{a.icon}</div>
                  <div className="achievement-name">{a.name}</div>
                  <div className="achievement-desc">{a.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Activity */}
        <section
          className={`content-section${activeSection === "activity" ? " active" : ""}`}
        >
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">Historial de Actividad</h2>
              <p className="section-subtitle">
                Tus eventos y torneos recientes
              </p>
            </div>
            <div className="activity-list">
              {[
                {
                  icon: "🏆",
                  title: "Torneo Warhammer 40K",
                  desc: "2do Lugar - 15 participantes",
                  date: "Hace 1 semana",
                },
                {
                  icon: "🎨",
                  title: "Taller de Pintura Avanzada",
                  desc: "Técnicas de NMM y OSL",
                  date: "Hace 2 semanas",
                },
                {
                  icon: "📖",
                  title: "Sesión de D&D 5e",
                  desc: "Campaña: La Maldición de Strahd",
                  date: "Hace 3 semanas",
                },
                {
                  icon: "⚔️",
                  title: "Liga de Kill Team",
                  desc: "Victoria 3-1",
                  date: "Hace 1 mes",
                },
                {
                  icon: "🎲",
                  title: "Noche de Juegos de Mesa",
                  desc: "Wingspan y Catan",
                  date: "Hace 1 mes",
                },
              ].map((item) => (
                <div key={item.title} className="activity-item">
                  <div className="activity-icon">{item.icon}</div>
                  <div className="activity-details">
                    <div className="activity-title">{item.title}</div>
                    <div className="activity-desc">{item.desc}</div>
                  </div>
                  <div className="activity-date">{item.date}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Settings */}
        <section
          className={`content-section${activeSection === "settings" ? " active" : ""}`}
        >
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">Preferencias</h2>
              <p className="section-subtitle">
                Configura cómo quieres usar Goblin Hub
              </p>
            </div>
            <div className="settings-list">
              {[
                {
                  title: "Notificaciones por Email",
                  desc: "Recibe actualizaciones sobre eventos y torneos",
                  checked: true,
                },
                {
                  title: "Recordatorios de Eventos",
                  desc: "Notificación 24h antes del evento",
                  checked: true,
                },
                {
                  title: "Perfil Público",
                  desc: "Permite que otros jugadores vean tu perfil",
                  checked: true,
                },
                {
                  title: "Newsletter",
                  desc: "Recibe noticias mensuales de la comunidad",
                  checked: false,
                },
                {
                  title: "Promociones",
                  desc: "Ofertas especiales y descuentos",
                  checked: true,
                },
              ].map((s) => (
                <div key={s.title} className="setting-item">
                  <div className="setting-info">
                    <div className="setting-title">{s.title}</div>
                    <div className="setting-desc">{s.desc}</div>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked={s.checked} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">Seguridad</h2>
              <p className="section-subtitle">
                Gestiona tu contraseña y seguridad
              </p>
            </div>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Cambiar Contraseña</label>
                <input type="password" placeholder="Contraseña actual" />
              </div>
              <div className="form-group">
                <label>Nueva Contraseña</label>
                <input type="password" placeholder="Nueva contraseña" />
              </div>
              <div className="form-group">
                <label>Confirmar Contraseña</label>
                <input
                  type="password"
                  placeholder="Confirmar nueva contraseña"
                />
              </div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            🚪 Cerrar Sesión
          </button>
        </section>
      </main>
    </div>
  );
};

export default PerfilPage;
