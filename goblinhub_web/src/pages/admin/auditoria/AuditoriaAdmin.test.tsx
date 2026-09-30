import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AuditoriaAdmin from "./AuditoriaAdmin";
import { getAuditLogs } from "../../../services/auditoria.service";
import type {
  LogAuditoria,
  PaginatedAuditLogs,
} from "../../../services/auditoria.service";

vi.mock("../../../services/auditoria.service", () => ({
  getAuditLogs: vi.fn(),
  RESULTADOS_AUDITORIA: ["exitoso", "rechazado", "fallido"],
}));

const getAuditLogsMock = vi.mocked(getAuditLogs);

const registro = (sobre: Partial<LogAuditoria> = {}): LogAuditoria => ({
  id_auditoria: "1",
  actor_tipo: "usuario",
  actor_id: "3f8c1e2a-9b4d-4c7e-8a1f-2d6b5e0c9a73",
  accion: "POST",
  recurso: "/events",
  resultado: "exitoso",
  correlation_id: "a1b2c3d4-1111-4222-8333-444455556666",
  fecha_hora: "2026-01-01T10:00:00.000Z",
  actor: { nombre: "Ana", apellidos: "Torres", rol: "admin" },
  ...sobre,
});

const listado = (
  data: LogAuditoria[],
  total = data.length,
): PaginatedAuditLogs => ({
  data,
  total,
  page: 1,
  limit: 50,
});

const renderVisor = () => render(<AuditoriaAdmin />);

describe("AuditoriaAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuditLogsMock.mockResolvedValue({ data: listado([registro()]) });
  });

  it("pide la primera página con el total, para poder paginar", async () => {
    renderVisor();

    await waitFor(() => expect(getAuditLogsMock).toHaveBeenCalled());
    expect(getAuditLogsMock.mock.calls[0][0]).toMatchObject({
      page: 1,
      limit: 50,
      includeTotal: true,
    });
  });

  it("lista los seis campos que el criterio 6 de #212 pide mostrar", async () => {
    getAuditLogsMock.mockResolvedValue({ data: listado([registro()]) });

    renderVisor();

    expect(await screen.findByText("POST")).toBeInTheDocument();
    expect(screen.getByText("/events")).toBeInTheDocument();
    expect(screen.getByText(/Ana Torres/)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(
      screen.getByText("a1b2c3d4-1111-4222-8333-444455556666"),
    ).toBeInTheDocument();
    // Acotado a la tabla: «Exitoso» también es una opción del desplegable de
    // resultado, y la aserción no distinguiría una de otra.
    const tabla = screen.getByRole("table");
    expect(within(tabla).getByText("Exitoso")).toBeInTheDocument();
  });

  it("distingue al actor sin sesión y al proceso automático del usuario con nombre", async () => {
    getAuditLogsMock.mockResolvedValue({
      data: listado([
        registro({ id_auditoria: "1", actor_tipo: "anonimo", actor: null }),
        registro({
          id_auditoria: "2",
          actor_tipo: "sistema",
          actor_id: null,
          accion: "EXPIRACION",
          recurso: "eventos",
          actor: null,
        }),
        registro({ id_auditoria: "3" }),
      ]),
    });

    renderVisor();

    expect(await screen.findByText("Sin sesión")).toBeInTheDocument();
    expect(screen.getByText("Proceso automático")).toBeInTheDocument();
    expect(screen.getByText(/Ana Torres/)).toBeInTheDocument();
  });

  it("marca el rechazo y el fallo de forma distinguible", async () => {
    getAuditLogsMock.mockResolvedValue({
      data: listado([
        registro({ id_auditoria: "1", resultado: "rechazado" }),
        registro({ id_auditoria: "2", resultado: "fallido" }),
      ]),
    });

    renderVisor();

    expect(await screen.findByRole("table")).toBeInTheDocument();
    const tabla = screen.getByRole("table");
    expect(within(tabla).getByText("Fallido")).toBeInTheDocument();
    expect(within(tabla).getByText("Rechazado").className).toContain(
      "auditoria-resultado--rechazado",
    );
    expect(within(tabla).getByText("Fallido").className).toContain(
      "auditoria-resultado--fallido",
    );
  });

  it("muestra un estado vacío explicativo, no una tabla en blanco", async () => {
    getAuditLogsMock.mockResolvedValue({ data: listado([]) });

    renderVisor();

    expect(
      await screen.findByText(/Ningún registro cumple los filtros/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("muestra el error si la consulta falla", async () => {
    getAuditLogsMock.mockRejectedValue(new Error("403"));

    renderVisor();

    expect(
      await screen.findByText("No se pudieron cargar los registros"),
    ).toBeInTheDocument();
  });

  it("envía el filtro por actor", async () => {
    renderVisor();
    await waitFor(() => expect(getAuditLogsMock).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText("Actor"), "ana");

    await waitFor(() =>
      expect(getAuditLogsMock.mock.calls.at(-1)?.[0]).toMatchObject({
        actor: "ana",
        page: 1,
      }),
    );
  });

  it("envía el filtro por recurso", async () => {
    renderVisor();
    await waitFor(() => expect(getAuditLogsMock).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText("Recurso"), "/events");

    await waitFor(() =>
      expect(getAuditLogsMock.mock.calls.at(-1)?.[0]).toMatchObject({
        recurso: "/events",
      }),
    );
  });

  it("envía el filtro por acción", async () => {
    renderVisor();
    await waitFor(() => expect(getAuditLogsMock).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText("Acción"), "post");

    await waitFor(() =>
      expect(getAuditLogsMock.mock.calls.at(-1)?.[0]).toMatchObject({
        accion: "post",
      }),
    );
  });

  it("envía el filtro por resultado", async () => {
    renderVisor();
    await waitFor(() => expect(getAuditLogsMock).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText("Resultado"), "fallido");

    await waitFor(() =>
      expect(getAuditLogsMock.mock.calls.at(-1)?.[0]).toMatchObject({
        resultado: "fallido",
      }),
    );
  });

  it("envía el rango de fechas en ISO, que es lo que la API acepta", async () => {
    renderVisor();
    await waitFor(() => expect(getAuditLogsMock).toHaveBeenCalled());

    await userEvent.type(
      screen.getByLabelText("Desde"),
      "2026-01-01T10:00",
    );

    await waitFor(() =>
      expect(getAuditLogsMock.mock.calls.at(-1)?.[0]).toMatchObject({
        // El cálculo va en la prueba y no en una cadena fija: `datetime-local`
        // no lleva zona horaria y la conversión depende de la que tenga la
        // máquina que ejecuta los tests.
        desde: new Date("2026-01-01T10:00").toISOString(),
      }),
    );
  });

  it("vuelve a la primera página al cambiar un filtro", async () => {
    getAuditLogsMock.mockResolvedValue({ data: listado([registro()], 200) });
    renderVisor();
    await waitFor(() => expect(getAuditLogsMock).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() =>
      expect(getAuditLogsMock.mock.calls.at(-1)?.[0]).toMatchObject({ page: 2 }),
    );

    await userEvent.type(screen.getByLabelText("Actor"), "ana");

    await waitFor(() =>
      expect(getAuditLogsMock.mock.calls.at(-1)?.[0]).toMatchObject({
        page: 1,
      }),
    );
  });

  it("navega entre páginas sin repetir la consulta inicial", async () => {
    getAuditLogsMock.mockResolvedValue({ data: listado([registro()], 120) });
    renderVisor();
    const primera = getAuditLogsMock.mock.calls.length;

    await userEvent.click(
      await screen.findByRole("button", { name: "Siguiente" }),
    );
    await waitFor(() =>
      expect(getAuditLogsMock.mock.calls.length).toBeGreaterThan(primera),
    );

    const tabla = screen.getByRole("table");
    expect(within(tabla).getByText("/events")).toBeInTheDocument();
  });
});
