import { Suspense, lazy } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Nav from "./layouts/navbar/navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";

// Páginas públicas (lazy)
const Products = lazy(() => import("./pages/products/products"));
const AboutUs = lazy(() => import("./pages/aboutUs/aboutUs"));
const CalendarioAventuras = lazy(() => import("./pages/Events/main"));
const EventoDetalle = lazy(
  () => import("./pages/Events/EventoDetalle/EventoDetalle"),
);
const Login = lazy(() => import("./pages/login/Login"));
const RegisterFlow = lazy(() => import("./pages/register/RegisterFlow"));
const PerfilPage = lazy(() => import("./pages/perfil/PerfilPage"));
const ProductosDetalle = lazy(
  () => import("./pages/products/ProductosDetalle/productsDetails"),
);
const ResetPassword = lazy(
  () => import("./pages/resetPassword/ResetPassword"),
);
const ConfirmAccount = lazy(
  () => import("./pages/confirmAccount/ConfirmAccount"),
);

// Páginas de administración (lazy)
const EventosAdmin = lazy(
  () => import("./pages/perfil/administracion/eventos/EventoAdmin"),
);
const VerEventoPage = lazy(
  () =>
    import(
      "./pages/perfil/administracion/eventos/verEvento/VerEvento"
    ),
);
const UsuariosAdmin = lazy(
  () => import("./pages/perfil/administracion/usuarios/UsuariosAdmin"),
);
const LogsAdmin = lazy(() => import("./pages/admin/logs/LogsAdmin"));
const Administracion = lazy(
  () => import("./pages/perfil/administracion/Administracion"),
);
const Reportes = lazy(
  () => import("./pages/perfil/administracion/reportes/Reportes"),
);
const CapacitacionNovatos = lazy(
  () => import("./pages/perfil/administracion/novatos/CapacitacionNovatos"),
);

function App() {
  const location = useLocation();
  const hideNav = ["/register", "/confirm-account", "/reset-password"].includes(
    location.pathname,
  );

  return (
    <>
      {!hideNav && <Nav />}

      <Suspense fallback={<div>Cargando...</div>}>
        <Routes>
          {/* PÚBLICAS */}
          <Route path="/" element={<Home />} />
          <Route path="/productos" element={<Products />} />
          <Route path="/productos/:id" element={<ProductosDetalle />} />
          <Route path="/contacto" element={<AboutUs />} />
          <Route path="/eventos" element={<CalendarioAventuras />} />
          <Route path="/eventos/:id" element={<EventoDetalle />} />
          <Route path="/register" element={<RegisterFlow />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/confirm-account" element={<ConfirmAccount />} />

          {/* Rutas protegidas (requieren sesión, cualquier rol) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/perfil" element={<PerfilPage />} />
            <Route path="/administration" element={<Administracion />} />
            <Route path="/admin/reportes" element={<Reportes />} />
            <Route path="/admin/novatos" element={<CapacitacionNovatos />} />
          </Route>

          {/* ADMIN (solo rol 'admin') — todo bajo /admin/* */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin" element={<Administracion />} />
            <Route path="/admin/logs" element={<LogsAdmin />} />
            <Route path="/admin/eventos" element={<EventosAdmin />} />
            <Route path="/admin/eventos/:id" element={<VerEventoPage />} />
            <Route path="/admin/usuarios" element={<UsuariosAdmin />} />
          </Route>

          {/* Cualquier ruta desconocida → inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;