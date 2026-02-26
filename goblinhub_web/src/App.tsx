import { Routes, Route, Link } from "react-router-dom";
import CalendarioAventuras from "./pages/Events/main";
import Login from "./pages/login/Login";

function App() {
  return (
    <>
      <nav>
        <Link to="/eventos">Ir a Eventos</Link>
      </nav>

      <Routes>
        <Route path="/eventos" element={<CalendarioAventuras />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}

export default App;