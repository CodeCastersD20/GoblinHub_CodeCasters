import { Routes, Route } from "react-router-dom";
import Nav from "./layouts/navbar/navbar";

import Home from "./pages/Home";
import Products from "./pages/products/products";
import AboutUs from "./pages/aboutUs/aboutUs";
import CalendarioAventuras from "./pages/Events/main";
import Login from "./pages/login/Login";
import RegisterFlow from "./pages/register/RegisterFlow";
import MainLayout from "./layouts/mainLayout";
import AuthHome from "./pages/Home/Home";

function App() {
  return (
    <>
      <Nav />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth-home" element={<AuthHome />} />
        <Route path="/productos" element={<Products />} />
        <Route path="/contacto" element={<AboutUs />} />
        <Route element={<MainLayout />}>
          <Route path="/eventos" element={<CalendarioAventuras />} />
        </Route>
        <Route path="/register" element={<RegisterFlow />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}

export default App;
