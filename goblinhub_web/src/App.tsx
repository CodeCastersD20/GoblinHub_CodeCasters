import { Routes, Route, Link } from "react-router-dom";
import CalendarioAventuras from "./pages/Events/main";
import Login from "./pages/login/Login";
import RegisterFlow from "./pages/register/RegisterFlow";
import MainLayout from "./layouts/mainLayout";

function App() {
  return (
    <>
      <nav>
        <Link to="/eventos">Ir a Eventos</Link>
      </nav>

      <Routes>
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