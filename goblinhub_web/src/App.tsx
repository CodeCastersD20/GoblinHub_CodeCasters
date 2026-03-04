import { Routes, Route } from "react-router-dom";
import Nav from "./layouts/navbar/navbar";

import Home from "./pages/Home";
import Products from "./pages/products/products";
import AboutUs from "./pages/aboutUs/aboutUs";
import CalendarioAventuras from "./pages/Events/main";


function App() {
  return (
    <>
      <Nav />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/productos" element={<Products />} />
        <Route path="/contacto" element={<AboutUs />} />
        <Route path="/eventos" element={<CalendarioAventuras />} />
      </Routes>
    </>
  );
}

export default App;