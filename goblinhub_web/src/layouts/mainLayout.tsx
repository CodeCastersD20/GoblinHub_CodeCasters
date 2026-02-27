import { Link, Outlet } from "react-router-dom";

function MainLayout() {
  return (
    <>
      <nav>
        <Link to="/eventos">Ir a Eventos</Link>
      </nav>
      <Outlet />
    </>
  );
}

export default MainLayout;