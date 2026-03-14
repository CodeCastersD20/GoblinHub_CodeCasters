import { test, expect } from "@playwright/test";

test.describe("Register flow", () => {
  test("register page renders step 1 form", async ({ page }) => {
    await page.goto("/register");

    await expect(page.getByText("Información personal")).toBeVisible();
    await expect(page.getByPlaceholder("Tu nombre")).toBeVisible();
    await expect(page.getByPlaceholder("Tu correo")).toBeVisible();
  });

  test("products page shows inventory heading", async ({ page }) => {
    await page.goto("/productos");

    await expect(
      page.getByRole("heading", { name: /nuestro inventario/i }),
    ).toBeVisible();
  });

  test("events page shows calendar heading", async ({ page }) => {
    await page.goto("/eventos");

    await expect(
      page.getByRole("heading", { name: /calendario de aventuras/i }),
    ).toBeVisible();
  });
});