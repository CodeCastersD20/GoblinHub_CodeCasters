import { Routes, Route } from "react-router-dom";
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


function App() {
  return (
    <>
      <Nav />

      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/productos" element={<Products />} />
        <Route path="/contacto" element={<AboutUs />} />
        <Route path="/eventos" element={<CalendarioAventuras />} />
        <Route path="/eventos/:id" element={<EventoDetalle />} />
        <Route path="/register" element={<RegisterFlow />} />
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas (requieren JWT) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/auth-home" element={<AuthHome />} />
          <Route path="/perfil" element={<PerfilPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
