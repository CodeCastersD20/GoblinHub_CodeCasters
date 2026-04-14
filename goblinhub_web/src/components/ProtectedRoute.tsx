import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  const rol = localStorage.getItem("rol")?.toLowerCase();
  const normalizedAllowedRoles = allowedRoles?.map((role) =>
    role.toLowerCase(),
  );

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (normalizedAllowedRoles && !rol) {
    return <Navigate to="/" replace />;
  }

  if (normalizedAllowedRoles && !normalizedAllowedRoles.includes(rol || "")) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
