import { test, expect } from "@playwright/test";

test.describe("Tour guiado (driver.js) — espec 002", () => {
  test("el botón flotante de la guía se muestra en la página de inicio", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Mostrar guía de la plataforma" }),
    ).toBeVisible();
  });

  test("la guía se oculta en rutas de autenticación", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("button", { name: "Mostrar guía de la plataforma" }),
    ).toHaveCount(0);
  });
});