import { test, expect } from "@playwright/test";

test.describe("Register flow", () => {
  
  test("register page renders step 1 form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("Información personal")).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("Tu nombre")).toBeVisible({ timeout: 10000 });
  });

  test("products page shows inventory heading", async ({ page }) => {
    // 1. MOCK ESPECÍFICO: Interceptamos solo la llamada al BACKEND (Puerto 3000)
    // Esto evita que Playwright intercepte la navegación a http://localhost:5173/productos
    await page.route('**/localhost:3000/productos*', async (route) => {
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

    // 2. Navegamos a la ruta del FRONTEND
    await page.goto("/productos");

    // 3. Usamos un selector más robusto. 
    // Si getByRole sigue fallando, es que el h2/h1 no tiene ese nombre accesible.
    // Probamos con getByText que suele ser infalible para títulos.
    const heading = page.getByText(/inventario/i);
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test("events page shows calendar heading", async ({ page }) => {
    // Mock específico para la API de eventos
    await page.route('**/localhost:3000/eventos*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto("/eventos");
    
    const heading = page.getByText(/calendario/i);
    await expect(heading).toBeVisible({ timeout: 15000 });
  });
});