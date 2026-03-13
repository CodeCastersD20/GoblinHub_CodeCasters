import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProductosDetalle from "./productsDetails";

function renderWithId(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/productos/${id}`]}>
      <Routes>
        <Route path="/productos/:id" element={<ProductosDetalle />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProductosDetalle", () => {
  it("renders the product detail heading", () => {
    renderWithId("5");
    expect(
      screen.getByRole("heading", { name: "Detalle del producto" }),
    ).toBeInTheDocument();
  });

  it("displays the product ID from the route param", () => {
    renderWithId("42");
    expect(screen.getByText(/ID del producto: 42/)).toBeInTheDocument();
  });
});
