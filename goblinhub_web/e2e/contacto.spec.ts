import { test, expect } from "@playwright/test";

test.describe("Página de Contáctanos (/contacto)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/contacto");
  });

  test("muestra el heading principal", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("muestra la sección de dirección con Hermosillo", async ({ page }) => {
    const card = page.locator("[data-testid='contact-address']");
    await expect(card).toBeVisible();
    await expect(card.getByText(/Hermosillo/i)).toBeVisible();
  });

  test("muestra la sección de horario", async ({ page }) => {
    await expect(page.locator("[data-testid='contact-hours']")).toBeVisible();
    await expect(page.getByText(/Horario/i)).toBeVisible();
  });

  test("muestra la sección de información de contacto", async ({ page }) => {
    await expect(page.locator("[data-testid='contact-info']")).toBeVisible();
  });

  test("no requiere autenticación (permanece en /contacto)", async ({
    page,
  }) => {
    await expect(page).toHaveURL("/contacto");
  });
});
