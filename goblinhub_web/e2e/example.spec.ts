import { test, expect } from "@playwright/test";

test.describe("Register flow", () => {
  
  test("register page renders step 1 form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText(/Información personal/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder(/Tu nombre/i)).toBeVisible({ timeout: 10000 });
  });

  test("products page shows inventory heading", async ({ page }) => {
    // 1. MOCK DE API: Corregido el acceso a la URL
    // Usamos url.href para obtener el string completo de la dirección
    await page.route((url) => url.href.includes('productos') && !url.href.includes('5173'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { 
            id: "1", 
            nombre: "Producto Mock CI", 
            precio: 100, 
            categoria: "Wargames", 
            descripcion: "Descripción para test", 
            imagen_url: "", 
            stock: 5 
          }
        ]),
      });
    });

    await page.goto("/productos");

    const heading = page.getByText(/inventario/i);
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test("events page shows calendar heading", async ({ page }) => {
    // 2. MOCK DE API: Corregido el acceso a la URL
    await page.route((url) => url.href.includes('eventos') && !url.href.includes('5173'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: "1",
            titulo: "Evento Mock",
            fecha: "2026-12-31",
            descripcion: "Diversión en el CI"
          }
        ]),
      });
    });

    await page.goto("/eventos");
    
    const heading = page.getByText(/calendario/i);
    await expect(heading).toBeVisible({ timeout: 15000 });
  });
});