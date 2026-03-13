import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ConfirmAccount from "./ConfirmAccount";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

describe("ConfirmAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.location.hash = "";
  });

  const renderConfirm = () =>
    render(
      <MemoryRouter>
        <ConfirmAccount />
      </MemoryRouter>,
    );

  it("muestra la confirmación exitosa en modo DEV (import.meta.env.DEV = true)", () => {
    // En el entorno de tests Vite siempre tiene DEV=true por defecto
    renderConfirm();
    expect(screen.getByText(/¡cuenta confirmada!/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ir al login/i }),
    ).toBeInTheDocument();
  });

  it('navega a /login al pulsar "Ir al Login"', () => {
    renderConfirm();
    fireEvent.click(screen.getByRole("button", { name: /ir al login/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("muestra el contenido principal de la página de confirmación", () => {
    // DEV siempre es true en el entorno de tests — valida el flujo de éxito
    renderConfirm();
    expect(screen.getByText(/¡cuenta confirmada!/i)).toBeInTheDocument();
    expect(screen.getByText(/ya puedes iniciar sesión/i)).toBeInTheDocument();
  });

  it("el icono ✓ está presente cuando la cuenta es válida", () => {
    renderConfirm();
    const icon = screen.getByText("✓");
    expect(icon).toBeInTheDocument();
  });
});
