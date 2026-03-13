import { test, expect } from "@playwright/test";

test.describe("RBAC admin-side", () => {
  test("redirige a /login cuando no hay token y se intenta entrar a /admin", async ({ page }) => {
    await page.goto("/admin");
    // Esperamos explícitamente a que la URL cambie a login
    await page.waitForURL(/\/login$/); 
    await expect(page).toHaveURL(/\/login$/);
  });

  test("bloquea a jugador en /admin y redirige a /", async ({ page }) => {
    // IMPORTANTE: El script debe correr antes de navegar
    await page.addInitScript(() => {
      window.localStorage.setItem("token", "fake-token-jugador");
      window.localStorage.setItem("rol", "jugador");
    });

    await page.goto("/admin");
    await page.waitForURL("**/"); // Espera a que vuelva a la raíz
    await expect(page).toHaveURL("http://localhost:5173/");
  });
});