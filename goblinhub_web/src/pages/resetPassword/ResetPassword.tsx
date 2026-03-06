import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../../lib/api";

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Supabase redirige con el token en el hash de la URL:
  // /reset-password#access_token=TOKEN&type=recovery
  const hash = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hash.get("access_token");
  const type = hash.get("type");

  if (!accessToken || type !== "recovery") {
    return <p>Enlace inválido o expirado. Solicita uno nuevo.</p>;
  }

  const handleSubmit = async () => {
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      setError(
        "La contraseña debe tener al menos una minúscula, una mayúscula y un número",
      );
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        accessToken,
        newPassword,
        confirmPassword,
      });
      navigate("/login");
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? "Error al cambiar la contraseña")
        : "Error al cambiar la contraseña";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Nueva contraseña</h2>

      <input
        type="password"
        placeholder="Nueva contraseña"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />

      <input
        type="password"
        placeholder="Confirmar contraseña"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <ul style={{ fontSize: "13px", marginTop: "8px", paddingLeft: "18px" }}>
        <li style={{ color: newPassword.length >= 8 ? "green" : "gray" }}>
          Mínimo 8 caracteres
        </li>
        <li style={{ color: /[a-z]/.test(newPassword) ? "green" : "gray" }}>
          Al menos una minúscula
        </li>
        <li style={{ color: /[A-Z]/.test(newPassword) ? "green" : "gray" }}>
          Al menos una mayúscula
        </li>
        <li style={{ color: /[0-9]/.test(newPassword) ? "green" : "gray" }}>
          Al menos un número
        </li>
      </ul>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </div>
  );
};

export default ResetPassword;
