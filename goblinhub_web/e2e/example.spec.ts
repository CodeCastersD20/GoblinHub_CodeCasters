import { test, expect } from "@playwright/test";

test.describe("Register flow", () => {
  
  test("register page renders step 1 form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Información personal")).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("Tu nombre")).toBeVisible({ timeout: 10000 });
  });

  test("products page shows inventory heading", async ({ page }) => {
    // 1. MOCK: Interceptamos la llamada a la API de productos
    // Ajusta la URL '/api/productos' a la que realmente use tu servicio
    await page.route('**/productos*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { 
            id: "1", 
            nombre: "Producto Mock", 
            precio: 100, 
            categoria: "Wargames", 
            descripcion: "test", 
            imagen_url: "", 
            stock: 5 
          }
        ]),
      });
    });

    await page.goto("/productos");

    // 2. Esperamos el heading. Al estar mockeado, debería ser instantáneo.
    // Usamos una expresión regular flexible por si el texto tiene mayúsculas o espacios
    const heading = page.getByRole("heading", { name: /inventario/i });
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test("events page shows calendar heading", async ({ page }) => {
    // Mock opcional también para eventos si falla
    await page.route('**/eventos*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });

    await page.goto("/eventos");
    await expect(
      page.getByRole("heading", { name: /calendario/i }),
    ).toBeVisible({ timeout: 15000 });
  });
});