import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EventoDetalle from "./EventoDetalle";

function renderWithId(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/eventos/${id}`]}>
      <Routes>
        <Route path="/eventos/:id" element={<EventoDetalle />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("EventoDetalle", () => {
  it("renders event detail heading with the route id", () => {
    renderWithId("123");
    expect(
      screen.getByRole("heading", { name: /Detalles del Evento 123/ }),
    ).toBeInTheDocument();
  });

  it("renders a link back to the events calendar", () => {
    renderWithId("456");
    expect(
      screen.getByRole("link", { name: /Volver al calendario/ }),
    ).toBeInTheDocument();
  });
});
