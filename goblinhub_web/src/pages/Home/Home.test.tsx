import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../services/auth.service", () => ({
  getMe: vi.fn(),
}));

vi.mock("@react-google-maps/api", () => ({
  useJsApiLoader: vi.fn(() => ({ isLoaded: false })),
  GoogleMap: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="google-map">{children}</div>
  ),
  Marker: () => <div data-testid="map-marker" />,
}));

import Home from "./Home";
import { getMe } from "../../services/auth.service";
import { useJsApiLoader } from "@react-google-maps/api";

const mockGetMe = vi.mocked(getMe);
const mockUseJsApiLoader = vi.mocked(useJsApiLoader);

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("redirects to /login when there is no token", () => {
    render(<Home />);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("shows loading state while fetching user data", () => {
    localStorage.setItem("token", "test-token");
    mockGetMe.mockReturnValue(new Promise(() => {}) as never);
    mockUseJsApiLoader.mockReturnValue({
      isLoaded: false,
      loadError: undefined,
    });
    render(<Home />);
    expect(screen.getByText("Cargando...")).toBeInTheDocument();
  });

  it("displays welcome message with user name after successful getMe", async () => {
    localStorage.setItem("token", "test-token");
    mockGetMe.mockResolvedValue({
      data: { nombre: "Carlos", rol: "jugador" },
    } as never);
    mockUseJsApiLoader.mockReturnValue({
      isLoaded: false,
      loadError: undefined,
    });
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByText(/Bienvenido, Carlos/i)).toBeInTheDocument(),
    );
  });

  it("displays the user rol label as Administrador", async () => {
    localStorage.setItem("token", "test-token");
    mockGetMe.mockResolvedValue({
      data: { nombre: "Admin", rol: "admin" },
    } as never);
    mockUseJsApiLoader.mockReturnValue({
      isLoaded: false,
      loadError: undefined,
    });
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByText("Administrador")).toBeInTheDocument(),
    );
  });

  it("displays the user rol label as Empleado", async () => {
    localStorage.setItem("token", "test-token");
    mockGetMe.mockResolvedValue({
      data: { nombre: "Maria", rol: "empleado" },
    } as never);
    mockUseJsApiLoader.mockReturnValue({
      isLoaded: false,
      loadError: undefined,
    });
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByText("Empleado")).toBeInTheDocument(),
    );
  });

  it("navigates to /login when getMe fails", async () => {
    localStorage.setItem("token", "bad-token");
    mockGetMe.mockRejectedValue(new Error("Unauthorized"));
    render(<Home />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  });

  it('shows "Cargando mapa..." when Google Maps API is not loaded', async () => {
    localStorage.setItem("token", "test-token");
    mockGetMe.mockResolvedValue({
      data: { nombre: "Maria", rol: "empleado" },
    } as never);
    mockUseJsApiLoader.mockReturnValue({
      isLoaded: false,
      loadError: undefined,
    });
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByText("Cargando mapa...")).toBeInTheDocument(),
    );
  });

  it("renders GoogleMap component when API is loaded", async () => {
    localStorage.setItem("token", "test-token");
    mockGetMe.mockResolvedValue({
      data: { nombre: "Maria", rol: "jugador" },
    } as never);
    mockUseJsApiLoader.mockReturnValue({
      isLoaded: true,
      loadError: undefined,
    });
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByTestId("google-map")).toBeInTheDocument(),
    );
  });
});
