import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../services/auth.service", () => ({
  getMe: vi.fn(),
  logout: vi.fn(),
  uploadFotoPerfil: vi.fn(),
  updatePerfil: vi.fn(),
}));

vi.mock("../../assets/default_perfil.png", () => ({
  default: "/mock-perfil.png",
}));

import PerfilPage from "./PerfilPage";
import { getMe, logout, updatePerfil } from "../../services/auth.service";

const mockGetMe = vi.mocked(getMe);
const mockLogout = vi.mocked(logout);
const mockUpdatePerfil = vi.mocked(updatePerfil);

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  nombre: "Carlos",
  apellidos: "García",
  rol: "jugador" as const,
  nivel_experiencia: "novato" as const,
  foto_perfil_url: null,
  puntos_fidelidad: 50,
  telefono: "555-0001",
  fecha_nacimiento: "1990-06-15T00:00:00.000Z",
  bio: "Gamer apasionado",
};

describe("PerfilPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows loading state while fetching user", () => {
    mockGetMe.mockReturnValue(new Promise(() => {}) as never);
    render(<PerfilPage />);
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });

  it("shows error state when getMe fails", async () => {
    mockGetMe.mockRejectedValue(new Error("Unauthorized"));
    render(<PerfilPage />);
    await waitFor(() =>
      expect(
        screen.getByText(/No se pudo cargar el perfil/),
      ).toBeInTheDocument(),
    );
  });

  it("displays user name and role after successful getMe", async () => {
    mockGetMe.mockResolvedValue({ data: mockUser } as never);
    render(<PerfilPage />);
    await waitFor(() =>
      expect(screen.getByText("Carlos García")).toBeInTheDocument(),
    );
    expect(screen.getByText(/novato/i)).toBeInTheDocument();
  });

  it("calls logout and navigates to /login when logout button is clicked", async () => {
    mockGetMe.mockResolvedValue({ data: mockUser } as never);
    render(<PerfilPage />);
    await waitFor(() => screen.getByText("Carlos García"));
    fireEvent.click(screen.getByRole("button", { name: /cerrar sesión/i }));
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("enables edit mode when edit button is clicked", async () => {
    mockGetMe.mockResolvedValue({ data: mockUser } as never);
    render(<PerfilPage />);
    await waitFor(() => screen.getByText("Carlos García"));
    fireEvent.click(screen.getByRole("button", { name: /editar perfil/i }));
    expect(
      screen.getByRole("button", { name: /guardar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cancelar/i }),
    ).toBeInTheDocument();
  });

  it("cancels edit mode when cancel button is clicked", async () => {
    mockGetMe.mockResolvedValue({ data: mockUser } as never);
    render(<PerfilPage />);
    await waitFor(() => screen.getByText("Carlos García"));
    fireEvent.click(screen.getByRole("button", { name: /editar perfil/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(
      screen.queryByRole("button", { name: /guardar/i }),
    ).not.toBeInTheDocument();
  });

  it("calls updatePerfil when save button is clicked", async () => {
    mockGetMe.mockResolvedValue({ data: mockUser } as never);
    mockUpdatePerfil.mockResolvedValue({ data: mockUser } as never);
    render(<PerfilPage />);
    await waitFor(() => screen.getByText("Carlos García"));
    fireEvent.click(screen.getByRole("button", { name: /editar perfil/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));
    await waitFor(() => expect(mockUpdatePerfil).toHaveBeenCalled());
  });
});
