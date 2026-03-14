import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";
import '@testing-library/jest-dom';
import ProductsPage from "./products";

// 1. Mock de la imagen
vi.mock("../../assets/images.jpg", () => ({ default: "/mock-image.jpg" }));

// 2. Mock del SERVICIO (Corregido para exportación nombrada)
vi.mock("../../services/products.service", () => {
  const mockProducts = [
    { id: "1", nombre: "Space Marine Battle Sector", precio: 1200, categoria: "Wargames", popular: true, nuevo: true, imagen_url: "" },
    { id: "2", nombre: "Tyranid Prime", precio: 800, categoria: "Wargames", popular: true, nuevo: false, imagen_url: "" },
    { id: "3", nombre: "Roboute Guilliman", precio: 3500, categoria: "Wargames", popular: false, nuevo: false, imagen_url: "" },
    { id: "4", nombre: "Rey Silente", precio: 3500, categoria: "Wargames", popular: false, nuevo: false, imagen_url: "" },
  ];

  return {
    // IMPORTANTE: El error dice que falta "productsService"
    productsService: {
      getAllProducts: vi.fn(() => Promise.resolve(mockProducts)),
      // Agregamos getProductos por si acaso es el nombre que usa tu componente
      getProductos: vi.fn(() => Promise.resolve(mockProducts)),
    }
  };
});

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <ProductsPage />
    </MemoryRouter>,
  );
}

describe("ProductsPage", () => {
  it("renders the inventory section heading", () => {
    renderWithRouter();
    expect(
      screen.getByRole("heading", { name: /Nuestro inventario/i }),
    ).toBeInTheDocument();
  });

  it("renders all four products", async () => {
    renderWithRouter();
    // findByText es asíncrono, ideal para esperar al mock
    expect(await screen.findByText(/Space Marine Battle Sector/i)).toBeInTheDocument();
    expect(await screen.findByText(/Tyranid Prime/i)).toBeInTheDocument();
    expect(await screen.findByText(/Roboute Guilliman/i)).toBeInTheDocument();
    expect(await screen.findByText(/Rey Silente/i)).toBeInTheDocument();
  });

  it('shows "Popular" badge on popular products', async () => {
    renderWithRouter();
    // Usamos regex /Popular/i para evitar problemas de mayúsculas o espacios
    const popularBadges = await screen.findAllByText(/Popular/i);
    expect(popularBadges.length).toBeGreaterThan(0);
  });

  it('shows "Nuevo" badge on new products', async () => {
    renderWithRouter();
    expect(await screen.findByText(/Nuevo/i)).toBeInTheDocument();
  });

  it("renders category filter buttons", () => {
    renderWithRouter();
    expect(screen.getByRole("button", { name: /Wargames/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Juegos de rol/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Juegos de mesa/i })).toBeInTheDocument();
  });

it("renders product prices", async () => {
  renderWithRouter();
  
  // Para $1200 y $800 no hay problema porque son únicos
  expect(await screen.findByText(/\$1200/)).toBeInTheDocument();
  expect(await screen.findByText(/\$800/)).toBeInTheDocument();

  // Para $3500 usamos findAllByText porque hay dos
  const highPrices = await screen.findAllByText(/\$3500/);
  expect(highPrices.length).toBe(2); 
});

});