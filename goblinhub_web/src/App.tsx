import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Nav from "./layouts/navbar/navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Products from "./pages/products/products";
import AboutUs from "./pages/aboutUs/aboutUs";
import CalendarioAventuras from "./pages/Events/main";
import EventoDetalle from "./pages/Events/EventoDetalle/EventoDetalle";
import Login from "./pages/login/Login";
import RegisterFlow from "./pages/register/RegisterFlow";
import AuthHome from "./pages/Home/Home";
import PerfilPage from "./pages/perfil/PerfilPage";
import ProductosDetalle from "./pages/products/ProductosDetalle/productsDetails";
import ResetPassword from "./pages/resetPassword/ResetPassword";
import ConfirmAccount from "./pages/confirmAccount/ConfirmAccount";
import EventosAdmin from "./pages/perfil/administration/eventos/EventoAdmin";
import AdminDashboard from "./pages/perfil/administration/Administration";
import VerEventoPage from "./pages/perfil/administration/eventos/verEvento/VerEvento";
import UsuariosAdmin from "./pages/perfil/administration/usuarios/UsuariosAdmin";

function App() {
  const location = useLocation();
  const hideNav = ["/register", "/confirm-account", "/reset-password"].includes(
    location.pathname,
  );

  return (
    <>
      {!hideNav && <Nav />}

      <Routes>

        {/* PUBLICAS */}

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
        <Route path="/eventosAdmin" element={<EventosAdmin />} />
        <Route path="/verEvento/:id" element={<VerEventoPage />} />
        <Route path="/usuariosAdmin" element={<UsuariosAdmin />} />

        {/* Ruta protegidas (requieren JWT) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<AuthHome />} />
          <Route path="/perfil" element={<PerfilPage />} />
        </Route>

        {/* ADMIN */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Cualquier ruta desconocida → inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;