import { Routes, Route, Link } from "react-router-dom";
import CalendarioAventuras from "./pages/Events/main";

function App() {
  return (
    <>
      <nav>
        <Link to="/eventos">Ir a Eventos</Link>
      </nav>

      <Routes>
        <Route path="/eventos" element={<CalendarioAventuras />} />
      </Routes>
    </>
  );
}

export default App;