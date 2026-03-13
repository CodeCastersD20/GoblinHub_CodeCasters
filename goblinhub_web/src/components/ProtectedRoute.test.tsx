import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import ProtectedRoute from "./ProtectedRoute";

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redirige a login cuando no hay token", () => {
    render(
      <MemoryRouter initialEntries={["/perfil"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/perfil" element={<div>Perfil</div>} />
          </Route>
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login")).toBeTruthy();
  });

  it("permite acceso con token para rutas protegidas sin rol", () => {
    localStorage.setItem("token", "token-valido");

    render(
      <MemoryRouter initialEntries={["/perfil"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/perfil" element={<div>Perfil</div>} />
          </Route>
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Perfil")).toBeTruthy();
  });

  it("permite acceso cuando el rol esta autorizado", () => {
    localStorage.setItem("token", "token-valido");
    localStorage.setItem("rol", "admin");

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route
            element={<ProtectedRoute allowedRoles={["admin", "empleado"]} />}
          >
            <Route path="/admin" element={<div>Admin</div>} />
          </Route>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Admin")).toBeTruthy();
  });

  it("bloquea acceso cuando el rol no esta autorizado", () => {
    localStorage.setItem("token", "token-valido");
    localStorage.setItem("rol", "jugador");

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route
            element={<ProtectedRoute allowedRoles={["admin", "empleado"]} />}
          >
            <Route path="/admin" element={<div>Admin</div>} />
          </Route>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Home")).toBeTruthy();
  });
});
