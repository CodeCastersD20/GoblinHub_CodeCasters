import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import '@testing-library/jest-dom';
import { productsService } from "../../../services/products.service";
import ProductosDetalle from "./productsDetails";

// 1. Mockear el servicio (Asegúrate de que la ruta sea idéntica a la del componente)
vi.mock("../../../services/products.service", () => ({
  productsService: {
    getProductById: vi.fn()
  }
}));

const renderWithId = (id: string) => {
  render(
    <MemoryRouter initialEntries={[`/productos/${id}`]}>
      <Routes>
        <Route path="/productos/:id" element={<ProductosDetalle />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("ProductosDetalle", () => {
  
  beforeEach(() => {
    vi.clearAllMocks(); // Limpiamos mocks entre tests
  });

  it("renders the product detail heading", async () => {
    // 2. Configuramos el mock para que responda con éxito
    vi.mocked(productsService.getProductById).mockResolvedValue({
      id: "5",
      nombre: "Producto de Prueba",
      precio: 500,
      categoria: "Wargames",
      descripcion: "Descripción épica",
      imagen_url: "/test.jpg",
      stock: 10
    });

    renderWithId("5");

    // 3. USAMOS findBy (Asíncrono) para esperar a que el 'loading' desaparezca
    const heading = await screen.findByRole("heading", { name: /Detalle del producto/i });
    expect(heading).toBeInTheDocument();
  });

  it("displays the product ID from the route param", async () => {
    vi.mocked(productsService.getProductById).mockResolvedValue({
      id: "42",
      nombre: "Ultra Item",
      precio: 100,
      categoria: "Accesorios",
      descripcion: "Descripción 42",
      imagen_url: "/test.jpg",
      stock: 5
    });

    renderWithId("42");

    // Esperamos a que el texto del ID aparezca
    const idText = await screen.findByText(/ID del producto: 42/i);
    expect(idText).toBeInTheDocument();
  });
});