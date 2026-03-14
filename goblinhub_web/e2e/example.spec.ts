import { test, expect } from "@playwright/test";

test.describe("Register flow", () => {
  test("register page renders step 1 form", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByText("Información personal")).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("Tu nombre")).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("Tu correo")).toBeVisible({ timeout: 10000 });
  });

  test("products page shows inventory heading", async ({ page }) => {
    await page.goto("/productos");

    // Espera a que termine la carga de la página (útil en CI)
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /nuestro inventario/i }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("events page shows calendar heading", async ({ page }) => {
    await page.goto("/eventos");

    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /calendario de aventuras/i }),
    ).toBeVisible({ timeout: 15000 });
  });
});