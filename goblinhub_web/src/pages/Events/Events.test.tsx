import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../lib/api", () => ({
  default: { get: vi.fn() },
}));

vi.mock("../../components/button/button", () => ({
  default: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

import CalendarioAventuras from "./main";
import api from "../../lib/api";

const mockGet = vi.mocked(api.get);

const mockApiEvents = [
  {
    id: "evt-1",
    titulo: "Gran Torneo Warhammer",
    descripcion: "Torneo oficial de Warhammer 40K.",
    tipo_evento: "torneo",
    fecha: "2026-02-15",
    hora_inicio: "10:00:00",
    hora_fin: "18:00:00",
    lugar: "GoblinHub",
    costo: 100,
    cupo_maximo: 20,
  },
];

describe("CalendarioAventuras (Events)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows loading state while fetching events", () => {
    mockGet.mockReturnValue(new Promise(() => {}) as never);
    render(<CalendarioAventuras />);
    expect(screen.getByText(/Cargando eventos/)).toBeInTheDocument();
  });

  it("shows error message when API call fails", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));
    render(<CalendarioAventuras />);
    await waitFor(() =>
      expect(
        screen.getByText(/No se pudieron cargar los eventos/),
      ).toBeInTheDocument(),
    );
  });

  it("shows empty state when there are no events", async () => {
    mockGet.mockResolvedValue({ data: [] } as never);
    render(<CalendarioAventuras />);
    await waitFor(() =>
      expect(
        screen.getByText(/No hay eventos programados/),
      ).toBeInTheDocument(),
    );
  });

  it("renders the page title", () => {
    mockGet.mockReturnValue(new Promise(() => {}) as never);
    render(<CalendarioAventuras />);
    expect(
      screen.getByRole("heading", { name: /Calendario de Aventuras/ }),
    ).toBeInTheDocument();
  });

  it("renders event cards when API returns data", async () => {
    mockGet.mockResolvedValue({ data: mockApiEvents } as never);
    render(<CalendarioAventuras />);
    await waitFor(() =>
      expect(screen.getByText("Gran Torneo Warhammer")).toBeInTheDocument(),
    );
    expect(screen.getByText(/GoblinHub/)).toBeInTheDocument();
  });

  it("navigates to /login when Inscribirse is clicked with no token", async () => {
    mockGet.mockResolvedValue({ data: mockApiEvents } as never);
    render(<CalendarioAventuras />);
    await waitFor(() => screen.getByText("Gran Torneo Warhammer"));
    fireEvent.click(screen.getByRole("button", { name: /Inscribirse/ }));
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("navigates to event detail when Inscribirse is clicked with token", async () => {
    localStorage.setItem("token", "test-token");
    mockGet.mockResolvedValue({ data: mockApiEvents } as never);
    render(<CalendarioAventuras />);
    await waitFor(() => screen.getByText("Gran Torneo Warhammer"));
    fireEvent.click(screen.getByRole("button", { name: /Inscribirse/ }));
    expect(mockNavigate).toHaveBeenCalledWith("/eventos/evt-1");
  });
});
