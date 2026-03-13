import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

vi.mock("../../assets/images.jpg", () => ({ default: "/mock-image.jpg" }));

import ProductsPage from "./products";

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
      screen.getByRole("heading", { name: "Nuestro inventario" }),
    ).toBeInTheDocument();
  });

  it("renders all four products", () => {
    renderWithRouter();
    expect(screen.getByText("Space Marine Battle Sector")).toBeInTheDocument();
    expect(screen.getByText("Tyranid Prime")).toBeInTheDocument();
    expect(screen.getByText("Roboute Guilliman")).toBeInTheDocument();
    expect(screen.getByText("Rey Silente")).toBeInTheDocument();
  });

  it('shows "Popular" badge on popular products', () => {
    renderWithRouter();
    const popularBadges = screen.getAllByText("Popular");
    expect(popularBadges.length).toBeGreaterThan(0);
  });

  it('shows "Nuevo" badge on new products', () => {
    renderWithRouter();
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
  });

  it("renders category filter buttons", () => {
    renderWithRouter();
    expect(
      screen.getByRole("button", { name: "Wargames" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Juegos de rol" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Juegos de mesa" }),
    ).toBeInTheDocument();
  });

  it("renders product prices", () => {
    renderWithRouter();
    expect(screen.getAllByText("$1200").length).toBeGreaterThan(0);
    expect(screen.getByText("$800")).toBeInTheDocument();
    expect(screen.getByText("$3500")).toBeInTheDocument();
  });

  it("renders product links to detail pages", () => {
    renderWithRouter();
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(4);
  });
});
