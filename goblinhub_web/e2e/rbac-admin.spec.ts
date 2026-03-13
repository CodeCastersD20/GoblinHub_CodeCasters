import { test, expect } from "@playwright/test";

test.describe("RBAC admin-side", () => {
  test("redirige a /login cuando no hay token y se intenta entrar a /admin", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("bloquea a jugador en /admin y redirige a /", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("token", "fake-token-jugador");
      localStorage.setItem("rol", "jugador");
    });

    await page.goto("/admin");
    await expect(page).toHaveURL("/");
  });
});
