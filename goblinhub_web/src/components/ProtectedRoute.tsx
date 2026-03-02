import { Navigate, Outlet } from "react-router-dom";

/**
 * Protege rutas que requieren autenticación.
 * Si no hay token en localStorage redirige a /login.
 */
const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
