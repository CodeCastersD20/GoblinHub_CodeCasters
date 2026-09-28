import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import TrazasAdmin from "./TrazasAdmin";
import { getTraces, getTraceByCorrelationId } from "../../../services/traces.service";
import type { PaginatedTraces, TraceDetail, Traza } from "../../../services/traces.service";

vi.mock("../../../services/traces.service", () => ({
  getTraces: vi.fn(),
  getTraceByCorrelationId: vi.fn(),
}));

const getTracesMock = vi.mocked(getTraces);
const getDetalleMock = vi.mocked(getTraceByCorrelationId);

const traza = (sobre: Partial<Traza> = {}): Traza => ({
  id_traza: "traza-1",
  correlation_id: "corr-1",
  servicio: "goblinhub-api",
  metodo: "GET",
  ruta: "/events/:id",
  estado_http: 200,
  nivel: "info",
  duracion_ms: 120,
  ambiente: "development",
  id_usuario: null,
  error: null,
  fecha_inicio: "2026-01-01T10:00:00.000Z",
  fecha_fin: "2026-01-01T10:00:00.120Z",
  ...sobre,
});

const listado = (data: Traza[], total = data.length): PaginatedTraces => ({
  data,
  total,
  page: 1,
  limit: 50,
});

const detalle = (sobre: Partial<TraceDetail> = {}): TraceDetail => ({
  traza: traza(),
  pasos: [],
  ...sobre,
});

const renderVisor = () =>
  render(
    <MemoryRouter>
      <TrazasAdmin />
    </MemoryRouter>,
  );

describe("TrazasAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTracesMock.mockResolvedValue({ data: listado([traza()]) });
  });

  it("pide la primera página con el total, para poder paginar", async () => {
    renderVisor();

    await waitFor(() => expect(getTracesMock).toHaveBeenCalled());
    expect(getTracesMock.mock.calls[0][0]).toMatchObject({
      page: 1,
      limit: 50,
      includeTotal: true,
    });
  });

  it("lista las trazas con su operación, su estado y su despliegue", async () => {
    getTracesMock.mockResolvedValue({
      data: listado([
        traza(),
        traza({
          id_traza: "traza-2",
          correlation_id: "corr-2",
          metodo: "POST",
          ruta: "/users",
          estado_http: 500,
          nivel: "error",
          duracion_ms: 4300,
          ambiente: "production",
          error: "boom",
        }),
      ]),
    });

    renderVisor();

    expect(await screen.findByText("GET /events/:id")).toBeInTheDocument();
    expect(screen.getByText("POST /users")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    // Acotado a la tabla: «production» también es una opción del desplegable de
    // despliegue, y la aserción no distinguiría una de otra.
    const tabla = screen.getByRole("table");
    expect(within(tabla).getByText("production")).toBeInTheDocument();
    expect(within(tabla).getByText("120 ms")).toBeInTheDocument();
    expect(within(tabla).getByText("4300 ms")).toBeInTheDocument();
  });

  it("muestra un estado vacío explicativo, no una tabla en blanco", async () => {
    getTracesMock.mockResolvedValue({ data: listado([]) });

    renderVisor();

    expect(
      await screen.findByText(/Ninguna traza cumple los filtros/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("muestra el error si la consulta falla", async () => {
    getTracesMock.mockRejectedValue(new Error("sin permiso"));

    renderVisor();

    expect(
      await screen.findByText("No se pudieron cargar las trazas"),
    ).toBeInTheDocument();
  });

  it("envía el filtro por servicio, que es el primero del alcance", async () => {
    renderVisor();
    await waitFor(() => expect(getTracesMock).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText("Servicio"), "api");

    await waitFor(() =>
      expect(getTracesMock.mock.calls.at(-1)?.[0]).toMatchObject({
        servicio: "api",
        page: 1,
      }),
    );
  });

  it.each([
    ["Estado", "500", { estado: 500 }, "type"],
    ["Ruta", "/events", { ruta: "/events" }, "type"],
    ["Despliegue", "production", { ambiente: "production" }, "select"],
  ])("envía el filtro por %s", async (etiqueta, valor, esperado, modo) => {
    renderVisor();
    await waitFor(() => expect(getTracesMock).toHaveBeenCalled());

    // «Despliegue» es un desplegable, no un campo de texto: escribir en él no
    // cambiaría su valor y la prueba pasaría sin comprobar nada.
    const control = screen.getByLabelText(etiqueta);
    if (modo === "select") {
      await userEvent.selectOptions(control, valor);
    } else {
      await userEvent.type(control, valor);
    }

    await waitFor(() =>
      expect(getTracesMock.mock.calls.at(-1)?.[0]).toMatchObject(esperado),
    );
  });

  it("vuelve a la primera página al cambiar un filtro", async () => {
    getTracesMock.mockResolvedValue({
      data: listado([traza()], 200),
    });
    renderVisor();
    await waitFor(() => expect(getTracesMock).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() =>
      expect(getTracesMock.mock.calls.at(-1)?.[0]).toMatchObject({ page: 2 }),
    );

    await userEvent.type(screen.getByLabelText("Servicio"), "api");

    await waitFor(() =>
      expect(getTracesMock.mock.calls.at(-1)?.[0]).toMatchObject({ page: 1 }),
    );
  });

  it("abre el detalle de la traza y muestra sus pasos", async () => {
    getDetalleMock.mockResolvedValue({
      data: detalle({
        pasos: [
          {
            id_span: "span-1",
            parent_id: null,
            nombre: "consultar evento",
            tipo: "prisma",
            duracion_ms: 80,
            estado: "ok",
            atributos: { total: 1 },
            fecha_inicio: "2026-01-01T10:00:00.010Z",
            hijos: [],
          },
        ],
      }),
    });
    renderVisor();
    await userEvent.click(await screen.findByRole("button", { name: "Ver" }));

    expect(await screen.findByText("consultar evento")).toBeInTheDocument();
    expect(getDetalleMock).toHaveBeenCalledWith("corr-1");
    expect(screen.getByText(/80 ms/)).toBeInTheDocument();
  });

  it("explica cuando una traza no tiene pasos desglosados", async () => {
    getDetalleMock.mockResolvedValue({ data: detalle({ pasos: [] }) });
    renderVisor();
    await userEvent.click(await screen.findByRole("button", { name: "Ver" }));

    expect(
      await screen.findByText(/no tiene pasos desglosados/),
    ).toBeInTheDocument();
  });

  it("navega entre páginas sin repetir la consulta inicial", async () => {
    getTracesMock.mockResolvedValue({ data: listado([traza()], 120) });
    renderVisor();
    const primera = getTracesMock.mock.calls.length;

    await userEvent.click(await screen.findByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(getTracesMock.mock.calls.length).toBeGreaterThan(primera));

    const tabla = screen.getByRole("table");
    expect(within(tabla).getByText("GET /events/:id")).toBeInTheDocument();
  });
});
