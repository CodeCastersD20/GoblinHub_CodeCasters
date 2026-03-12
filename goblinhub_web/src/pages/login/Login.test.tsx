import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

// Mock services
vi.mock("../../services/auth.service", () => ({
  login: vi.fn(),
  forgotPassword: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import {
  login,
  forgotPassword as forgotPasswordSvc,
} from "../../services/auth.service";

const loginMock = vi.mocked(login);
const forgotPasswordMock = vi.mocked(forgotPasswordSvc);

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderLogin = () =>
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

  it("muestra el formulario de login por defecto", () => {
    renderLogin();
    expect(
      screen.getByPlaceholderText(/correo electrónico/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("actualiza el campo de email al escribir", () => {
    renderLogin();
    const emailInput = screen.getByPlaceholderText(/correo electrónico/i);
    fireEvent.change(emailInput, { target: { value: "test@goblin.com" } });
    expect(emailInput).toHaveValue("test@goblin.com");
  });

  it("actualiza el campo de contraseña al escribir", () => {
    renderLogin();
    const passInput = screen.getByPlaceholderText(/contraseña/i);
    fireEvent.change(passInput, { target: { value: "SecretPass1" } });
    expect(passInput).toHaveValue("SecretPass1");
  });

  it("llama a login y navega a /auth-home en éxito", async () => {
    loginMock.mockResolvedValue({
      data: { access_token: "tok-123", refresh_token: "ref-456" },
    } as never);

    renderLogin();
    fireEvent.change(screen.getByPlaceholderText(/correo electrónico/i), {
      target: { value: "user@goblin.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña/i), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith("user@goblin.com", "Password1");
      expect(localStorage.getItem("token")).toBe("tok-123");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("muestra error cuando el login falla", async () => {
    loginMock.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: "Correo o contraseña incorrectos" } },
    });

    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/correo o contraseña incorrectos/i),
      ).toBeInTheDocument();
    });
  });

  it("muestra el formulario de recuperar contraseña al hacer click en ¿Olvidaste?", () => {
    renderLogin();
    fireEvent.click(screen.getByText(/olvidaste tu contraseña/i));
    expect(screen.getByText(/recuperar contraseña/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /enviar código/i }),
    ).toBeInTheDocument();
  });

  it('vuelve al login al pulsar "← Volver al login"', () => {
    renderLogin();
    fireEvent.click(screen.getByText(/olvidaste tu contraseña/i));
    fireEvent.click(screen.getByText(/← volver al login/i));
    expect(screen.getByPlaceholderText(/contraseña/i)).toBeInTheDocument();
  });

  it("envía forgot password y muestra confirmación", async () => {
    forgotPasswordMock.mockResolvedValue({ data: { message: "ok" } } as never);

    renderLogin();
    fireEvent.click(screen.getByText(/olvidaste tu contraseña/i));
    fireEvent.change(screen.getByPlaceholderText(/correo electrónico/i), {
      target: { value: "user@goblin.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar código/i }));

    await waitFor(() => {
      expect(forgotPasswordMock).toHaveBeenCalledWith("user@goblin.com");
      expect(screen.getByText(/revisa tu correo/i)).toBeInTheDocument();
    });
  });

  it("muestra error cuando forgot password falla", async () => {
    forgotPasswordMock.mockRejectedValue(new Error("network error"));

    renderLogin();
    fireEvent.click(screen.getByText(/olvidaste tu contraseña/i));
    fireEvent.click(screen.getByRole("button", { name: /enviar código/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/error al enviar el correo/i),
      ).toBeInTheDocument();
    });
  });
});
